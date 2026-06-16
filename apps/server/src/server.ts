import Fastify from "fastify";
import { Server } from "socket.io";
import { z } from "zod";
import type { Move, RoomSnapshot } from "@color-game/shared-types";
import { GameRoomService, type RoomError } from "./game-room-service.js";
import { NullGameHistoryStore, type GameHistoryStore } from "./history-store.js";
import {
  gameMoveSchema,
  gameResignSchema,
  playerProfileSchema,
  roomCreateSchema,
  roomJoinSchema,
  roomReadySchema,
} from "./schemas.js";

export interface ServerOptions {
  corsOrigin?: string | string[];
  roomService?: GameRoomService;
  historyStore?: GameHistoryStore;
  requireDatabaseHealth?: boolean;
}

const toClientError = (error: RoomError) => ({
  code: error.code,
  message: error.message,
  gameErrorCode: error.gameErrorCode ?? null,
});

const socketPlayerMismatchError = {
  code: "PLAYER_NOT_IN_ROOM",
  message: "Socket is not authenticated as this player.",
  gameErrorCode: null,
};

export const createServer = (options: ServerOptions = {}) => {
  const app = Fastify({ logger: true });
  const roomService = options.roomService ?? new GameRoomService();
  const historyStore = options.historyStore ?? new NullGameHistoryStore();
  const io = new Server(app.server, {
    cors: {
      origin: options.corsOrigin ?? true,
    },
  });

  const persistRoom = (room: RoomSnapshot): void => {
    if (!historyStore.enabled) return;
    void historyStore.recordRoomSnapshot(room).catch((error: unknown) => {
      app.log.error({ err: error, roomCode: room.code }, "Failed to persist room snapshot");
    });
  };

  const persistMoveApplication = (room: RoomSnapshot, move: Move | null): void => {
    if (!historyStore.enabled) return;
    void (async () => {
      await historyStore.recordRoomSnapshot(room);
      if (move !== null) {
        await historyStore.recordMove(room, move);
      }
    })().catch((error: unknown) => {
      app.log.error(
        { err: error, roomCode: room.code, gameId: room.game?.id, turnNumber: move?.turnNumber },
        "Failed to persist move application",
      );
    });
  };

  app.get("/health", async (_request, reply) => {
    const database = await historyStore.health();
    const ok = database.ok || options.requireDatabaseHealth !== true;
    const payload = {
      ok,
      service: "color-game-server",
      database,
    };

    if (!ok) {
      return reply.code(503).send(payload);
    }

    return payload;
  });

  app.get("/rooms/:code", async (request, reply) => {
    const params = z.object({ code: z.string().toUpperCase() }).parse(request.params);
    const result = roomService.getRoom(params.code);
    if (!result.ok) {
      return reply.code(404).send(toClientError(result.error));
    }
    return result.value;
  });

  io.on("connection", (socket) => {
    const rejectPlayerMismatch = (
      playerId: string,
      callback?: (response: unknown) => void,
    ): boolean => {
      if (socket.data.playerId === playerId) {
        return false;
      }

      socket.emit("game:error", socketPlayerMismatchError);
      callback?.({ ok: false, error: socketPlayerMismatchError });
      return true;
    };

    socket.on("room:create", (payload, callback?: (response: unknown) => void) => {
      const parsed = roomCreateSchema.safeParse(payload ?? {});
      if (!parsed.success) {
        callback?.({ ok: false, error: parsed.error.flatten() });
        return;
      }

      const player = playerProfileSchema.parse(parsed.data.player ?? {});
      const room = roomService.createRoom({ ...player, socketId: socket.id });
      const host = room.players[0];
      socket.data.playerId = host.id;
      socket.join(room.code);
      persistRoom(room);
      io.to(room.code).emit("game:state", room);
      callback?.({ ok: true, room, playerId: host.id });
    });

    socket.on("room:join", (payload, callback?: (response: unknown) => void) => {
      const parsed = roomJoinSchema.safeParse(payload ?? {});
      if (!parsed.success) {
        callback?.({ ok: false, error: parsed.error.flatten() });
        return;
      }

      const player = playerProfileSchema.parse(parsed.data.player ?? {});
      const result = roomService.joinRoom(parsed.data.code, {
        ...player,
        socketId: socket.id,
      });
      if (!result.ok) {
        callback?.({ ok: false, error: toClientError(result.error) });
        return;
      }

      const joinedPlayer = result.value.players[1];
      socket.data.playerId = joinedPlayer?.id;
      socket.join(result.value.code);
      persistRoom(result.value);
      io.to(result.value.code).emit("game:state", result.value);
      callback?.({ ok: true, room: result.value, playerId: joinedPlayer?.id });
    });

    socket.on("room:ready", (payload, callback?: (response: unknown) => void) => {
      const parsed = roomReadySchema.safeParse(payload ?? {});
      if (!parsed.success) {
        callback?.({ ok: false, error: parsed.error.flatten() });
        return;
      }
      if (rejectPlayerMismatch(parsed.data.playerId, callback)) return;

      const result = roomService.setReady(
        parsed.data.code,
        parsed.data.playerId,
        parsed.data.ready,
      );
      if (!result.ok) {
        callback?.({ ok: false, error: toClientError(result.error) });
        return;
      }

      persistRoom(result.value);
      io.to(result.value.code).emit("game:state", result.value);
      callback?.({ ok: true, room: result.value });
    });

    socket.on("game:move", (payload, callback?: (response: unknown) => void) => {
      const parsed = gameMoveSchema.safeParse(payload ?? {});
      if (!parsed.success) {
        callback?.({ ok: false, error: parsed.error.flatten() });
        return;
      }
      if (rejectPlayerMismatch(parsed.data.playerId, callback)) return;

      const result = roomService.applyMove(
        parsed.data.code,
        parsed.data.playerId,
        parsed.data.row,
        parsed.data.col,
        parsed.data.color,
      );
      if (!result.ok) {
        socket.emit("game:error", toClientError(result.error));
        callback?.({ ok: false, error: toClientError(result.error) });
        return;
      }

      persistMoveApplication(result.value.room, result.value.move);
      io.to(result.value.room.code).emit("game:state", result.value.room);
      if (result.value.move !== null) {
        io.to(result.value.room.code).emit("game:move:accepted", result.value.move);
      }
      callback?.({ ok: true, ...result.value });
    });

    socket.on("game:resign", (payload, callback?: (response: unknown) => void) => {
      const parsed = gameResignSchema.safeParse(payload ?? {});
      if (!parsed.success) {
        callback?.({ ok: false, error: parsed.error.flatten() });
        return;
      }
      if (rejectPlayerMismatch(parsed.data.playerId, callback)) return;

      const result = roomService.resign(parsed.data.code, parsed.data.playerId);
      if (!result.ok) {
        callback?.({ ok: false, error: toClientError(result.error) });
        return;
      }

      persistRoom(result.value);
      io.to(result.value.code).emit("game:state", result.value);
      io.to(result.value.code).emit("game:finished", result.value.game);
      callback?.({ ok: true, room: result.value });
    });

    socket.on("game:reconnect", (payload, callback?: (response: unknown) => void) => {
      const parsed = z
        .object({ code: z.string().toUpperCase(), playerId: z.string().min(1) })
        .safeParse(payload ?? {});
      if (!parsed.success) {
        callback?.({ ok: false, error: parsed.error.flatten() });
        return;
      }

      const result = roomService.reconnect(parsed.data.code, parsed.data.playerId, socket.id);
      if (!result.ok) {
        callback?.({ ok: false, error: toClientError(result.error) });
        return;
      }

      socket.data.playerId = parsed.data.playerId;
      socket.join(result.value.code);
      persistRoom(result.value);
      io.to(result.value.code).emit("game:state", result.value);
      callback?.({ ok: true, room: result.value });
    });

    socket.on("disconnect", () => {
      if (typeof socket.data.playerId !== "string") return;
      const rooms = roomService.markDisconnected(socket.data.playerId);
      for (const room of rooms) {
        persistRoom(room);
        io.to(room.code).emit("game:state", room);
      }
    });
  });

  const turnTimer = setInterval(() => {
    const rooms = roomService.expireActiveTurns();
    for (const room of rooms) {
      persistRoom(room);
      io.to(room.code).emit("game:state", room);
      io.to(room.code).emit("game:finished", room.game);
    }
  }, 1_000);

  app.addHook("onClose", async () => {
    clearInterval(turnTimer);
    await io.close();
    await historyStore.close();
  });

  return { app, io, roomService };
};
