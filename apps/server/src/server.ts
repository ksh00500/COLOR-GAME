import { readFile } from "node:fs/promises";
import cors from "@fastify/cors";
import Fastify from "fastify";
import { Server, type Socket } from "socket.io";
import { z } from "zod";
import type { GameMode, Move, RoomSnapshot } from "@color-game/shared-types";
import {
  NullAccountStore,
  createAuthToken,
  verifyAuthToken,
  type AccountStore,
  type AccountSummary,
} from "./auth-store.js";
import {
  NullAnalyticsStore,
  type AnalyticsStore,
} from "./analytics-store.js";
import { GameRoomService, type PlayerProfile, type RoomError } from "./game-room-service.js";
import { NullGameHistoryStore, type GameHistoryStore } from "./history-store.js";
import { ServerMetrics } from "./metrics.js";
import { attendanceDateFor } from "./attendance.js";
import { RoomPersistenceCoordinator } from "./room-persistence.js";
import { DisconnectGracePeriod } from "./disconnect-grace.js";
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
  accountStore?: AccountStore;
  analyticsStore?: AnalyticsStore;
  authSecret?: string;
  tokenTtlSeconds?: number;
  requireDatabaseHealth?: boolean;
}

type MatchmakingMode = Extract<GameMode, "casual" | "ranked">;

interface QueuedPlayer {
  socketId: string;
  accountId: string | null;
  profile: PlayerProfile;
  queuedAt: number;
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

const authSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(128),
});

const registerSchema = authSchema.extend({
  displayName: z.string().trim().min(2).max(24),
  avatarId: z.string().trim().min(1).max(32).default("orbit"),
});

const matchmakingSchema = z.object({
  mode: z.enum(["casual", "ranked"]),
  player: playerProfileSchema.optional(),
});

const analyticsHeartbeatSchema = z.object({
  visitorId: z.string().trim().min(8).max(128),
  path: z.string().trim().max(256).optional().default("/"),
});

const attendanceCheckInSchema = z.object({
  timeZone: z.string().trim().max(120).optional(),
});

let cachedWebIndexHtml: string | null | undefined;
const webIndexUrl = new URL("../../web/dist/index.html", import.meta.url);

const acceptsHtml = (accept: unknown) =>
  typeof accept === "string" && accept.toLowerCase().includes("text/html");

const readWebIndexHtml = async () => {
  if (cachedWebIndexHtml !== undefined) {
    return cachedWebIndexHtml;
  }

  try {
    cachedWebIndexHtml = await readFile(webIndexUrl, "utf8");
  } catch {
    cachedWebIndexHtml = null;
  }
  return cachedWebIndexHtml;
};

const bearerToken = (authorization: unknown): string | null => {
  if (typeof authorization !== "string") return null;
  const [scheme, token] = authorization.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || token === undefined || token === "") {
    return null;
  }
  return token;
};

const publicAccount = (account: AccountSummary) => ({
  id: account.id,
  email: account.email,
  displayName: account.displayName,
  avatarId: account.avatarId,
  rating: account.rating,
  gamesPlayed: account.gamesPlayed,
  rankedWins: account.rankedWins,
  rankedLosses: account.rankedLosses,
  rankedDraws: account.rankedDraws,
  attendanceStreak: account.attendanceStreak,
  longestAttendanceStreak: account.longestAttendanceStreak,
  lastAttendanceDate: account.lastAttendanceDate,
  createdAt: account.createdAt,
});

export const createServer = (options: ServerOptions = {}) => {
  const app = Fastify({ logger: true });
  const roomService = options.roomService ?? new GameRoomService();
  const historyStore = options.historyStore ?? new NullGameHistoryStore();
  const accountStore = options.accountStore ?? new NullAccountStore();
  const analyticsStore = options.analyticsStore ?? new NullAnalyticsStore();
  const metrics = new ServerMetrics();
  const authSecret = options.authSecret ?? "dev-only-color-game-secret-for-local-development";
  const tokenTtlSeconds = options.tokenTtlSeconds ?? 60 * 60 * 24 * 30;
  const matchmakingQueues: Record<MatchmakingMode, QueuedPlayer[]> = {
    casual: [],
    ranked: [],
  };
  const matchmakingWaitSamples: Record<MatchmakingMode, number[]> = {
    casual: [],
    ranked: [],
  };
  const roomPersistence = new RoomPersistenceCoordinator(historyStore);
  const io = new Server(app.server, {
    cors: {
      origin: options.corsOrigin ?? true,
    },
  });

  void app.register(cors, {
    origin: options.corsOrigin ?? true,
  });

  const recordFinishedRoom = async (room: RoomSnapshot): Promise<void> => {
    if (room.game?.status !== "finished") return;
    metrics.gameFinished();
    if (!accountStore.enabled) return;
    await accountStore.recordFinishedRoom(room);
  };

  const persistRoomLater = (room: RoomSnapshot, context: string): void => {
    void roomPersistence.enqueue(room).catch((error: unknown) => {
      app.log.error({ err: error, roomCode: room.code }, context);
    });
  };

  const persistMoveApplicationLater = (
    room: RoomSnapshot,
    move: Move | null,
    context: string,
  ): void => {
    void roomPersistence.enqueue(room, move).catch((error: unknown) => {
      app.log.error(
        { err: error, roomCode: room.code, gameId: room.game?.id, turnNumber: move?.turnNumber },
        context,
      );
    });
  };

  const persistFinishedRoomLater = (
    room: RoomSnapshot,
    move: Move | null,
    context: string,
  ): void => {
    void roomPersistence.enqueue(room, move, recordFinishedRoom).catch((error: unknown) => {
      app.log.error(
        { err: error, roomCode: room.code, gameId: room.game?.id },
        context,
      );
    });
  };

  let closing = false;
  const disconnectGrace = new DisconnectGracePeriod(5_000, (playerId) => {
    const rooms = roomService.markDisconnected(playerId);
    for (const room of rooms) {
      persistRoomLater(room, "Failed to persist disconnected room");
      io.to(room.code).emit("game:state", room);
    }
  });

  const authenticateToken = async (token: string | null): Promise<AccountSummary | null> => {
    if (token === null || !accountStore.enabled) return null;
    const payload = verifyAuthToken(token, authSecret);
    if (payload === null) return null;
    return accountStore.getAccount(payload.accountId);
  };

  const accountProfile = (
    player: z.infer<typeof playerProfileSchema>,
    socketId: string,
    account: AccountSummary | null,
  ): PlayerProfile => {
    if (account !== null) {
      return {
        accountId: account.id,
        nickname: account.displayName,
        avatarId: account.avatarId,
        isGuest: false,
        socketId,
      };
    }

    return { ...player, accountId: null, socketId };
  };

  const removeFromMatchmaking = (socketId: string): void => {
    for (const mode of ["casual", "ranked"] as const) {
      matchmakingQueues[mode] = matchmakingQueues[mode].filter(
        (queued) => queued.socketId !== socketId,
      );
      metrics.setQueueDepth(mode, matchmakingQueues[mode].length);
    }
  };

  const estimatedWaitSeconds = (mode: MatchmakingMode): number => {
    const samples = matchmakingWaitSamples[mode];
    if (samples.length === 0) {
      return mode === "casual" ? 20 : 30;
    }
    const sorted = [...samples].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)] ?? 20;
    return Math.max(5, Math.min(120, Math.round(median / 1_000)));
  };

  const getSocketAccount = (socket: Socket): AccountSummary | null => {
    const account = socket.data.account;
    return account === undefined ? null : account as AccountSummary;
  };

  const emitMatch = (
    mode: MatchmakingMode,
    first: QueuedPlayer,
    second: QueuedPlayer,
  ): void => {
    const firstSocket = io.sockets.sockets.get(first.socketId);
    const secondSocket = io.sockets.sockets.get(second.socketId);
    if (firstSocket === undefined || secondSocket === undefined) {
      return;
    }

    const room = roomService.createMatchedRoom(first.profile, second.profile, mode);
    const firstPlayer = room.players[0];
    const secondPlayer = room.players[1];
    if (secondPlayer === null) return;

    firstSocket.data.playerId = firstPlayer.id;
    secondSocket.data.playerId = secondPlayer.id;
    firstSocket.join(room.code);
    secondSocket.join(room.code);

    metrics.matchStarted();
    const matchedAt = Date.now();
    matchmakingWaitSamples[mode].push(
      matchedAt - first.queuedAt,
      matchedAt - second.queuedAt,
    );
    if (matchmakingWaitSamples[mode].length > 40) {
      matchmakingWaitSamples[mode].splice(0, matchmakingWaitSamples[mode].length - 40);
    }
    persistRoomLater(room, "Failed to persist matched room");
    firstSocket.emit("matchmaking:matched", { ok: true, room, playerId: firstPlayer.id });
    secondSocket.emit("matchmaking:matched", { ok: true, room, playerId: secondPlayer.id });
    io.to(room.code).emit("game:state", room);
  };

  io.use((socket, next) => {
    void (async () => {
      const auth = socket.handshake.auth as { token?: unknown };
      const token = typeof auth.token === "string" ? auth.token : null;
      const account = await authenticateToken(token);
      if (account !== null) {
        socket.data.account = account;
      }
      next();
    })().catch(next);
  });

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

  app.get("/livez", async () => ({ ok: true }));

  app.get("/readyz", async (_request, reply) => {
    const database = await historyStore.health();
    const ok = database.ok || options.requireDatabaseHealth !== true;
    if (!ok) {
      return reply.code(503).send({ ok, database });
    }
    return { ok, database };
  });

  app.get("/metrics", async (_request, reply) =>
    reply
      .header("content-type", "text/plain; version=0.0.4")
      .send(metrics.renderPrometheus()),
  );

  app.post("/analytics/heartbeat", async (request, reply) => {
    const parsed = analyticsHeartbeatSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.code(400).send({ code: "INVALID_REQUEST", details: parsed.error.flatten() });
    }

    const userAgentHeader = request.headers["user-agent"];
    const userAgent = typeof userAgentHeader === "string"
      ? userAgentHeader.slice(0, 512)
      : null;

    await analyticsStore.recordHeartbeat({
      visitorId: parsed.data.visitorId,
      path: parsed.data.path,
      userAgent,
    });

    return { ok: true, visitors: await analyticsStore.getVisitorCounts() };
  });

  app.get("/analytics/visitors", async () => ({
    visitors: await analyticsStore.getVisitorCounts(),
  }));

  app.post("/auth/register", async (request, reply) => {
    if (!accountStore.enabled) {
      return reply.code(503).send({ code: "DATABASE_DISABLED", message: "Account database is not configured." });
    }

    const parsed = registerSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.code(400).send({ code: "INVALID_REQUEST", details: parsed.error.flatten() });
    }

    try {
      const account = await accountStore.register(parsed.data);
      const token = createAuthToken(account.id, authSecret, tokenTtlSeconds);
      return { token, account: publicAccount(account) };
    } catch (error) {
      app.log.warn({ err: error }, "Registration failed");
      return reply.code(409).send({ code: "ACCOUNT_EXISTS", message: "Email is already registered." });
    }
  });

  app.post("/auth/login", async (request, reply) => {
    if (!accountStore.enabled) {
      return reply.code(503).send({ code: "DATABASE_DISABLED", message: "Account database is not configured." });
    }

    const parsed = authSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.code(400).send({ code: "INVALID_REQUEST", details: parsed.error.flatten() });
    }

    const account = await accountStore.authenticate(parsed.data.email, parsed.data.password);
    if (account === null) {
      return reply.code(401).send({ code: "INVALID_CREDENTIALS", message: "Email or password is invalid." });
    }

    const token = createAuthToken(account.id, authSecret, tokenTtlSeconds);
    return { token, account: publicAccount(account) };
  });

  app.get("/auth/me", async (request, reply) => {
    const account = await authenticateToken(bearerToken(request.headers.authorization));
    if (account === null) {
      return reply.code(401).send({ code: "UNAUTHORIZED", message: "Sign in is required." });
    }
    return { account: publicAccount(account) };
  });

  app.get("/leaderboard", async (request, reply) => {
    if (acceptsHtml(request.headers.accept)) {
      const indexHtml = await readWebIndexHtml();
      if (indexHtml !== null) {
        return reply.type("text/html; charset=utf-8").send(indexHtml);
      }
    }

    if (!accountStore.enabled) {
      return reply.code(503).send({ code: "DATABASE_DISABLED", message: "Account database is not configured." });
    }

    const query = z.object({ limit: z.coerce.number().int().min(1).max(100).default(20) }).parse(request.query);
    return { players: await accountStore.getLeaderboard(query.limit) };
  });

  app.get("/profiles/:accountId", async (request, reply) => {
    if (!accountStore.enabled) {
      return reply.code(503).send({ code: "DATABASE_DISABLED", message: "Account database is not configured." });
    }

    const params = z.object({ accountId: z.string().min(1) }).parse(request.params);
    const profile = await accountStore.getPublicProfile(params.accountId);
    if (profile === null) {
      return reply.code(404).send({ code: "PROFILE_NOT_FOUND", message: "Profile was not found." });
    }
    return { profile };
  });

  app.get("/profiles/:accountId/matches", async (request, reply) => {
    if (!accountStore.enabled) {
      return reply.code(503).send({ code: "DATABASE_DISABLED", message: "Account database is not configured." });
    }

    const params = z.object({ accountId: z.string().min(1) }).parse(request.params);
    const query = z.object({ limit: z.coerce.number().int().min(1).max(100).default(20) }).parse(request.query);
    return { matches: await accountStore.getMatchHistory(params.accountId, query.limit) };
  });

  app.post("/attendance/check-in", async (request, reply) => {
    const account = await authenticateToken(bearerToken(request.headers.authorization));
    if (account === null || !accountStore.enabled) {
      return reply.code(401).send({ code: "UNAUTHORIZED", message: "Sign in is required." });
    }
    const parsed = attendanceCheckInSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.code(400).send({ code: "INVALID_REQUEST", details: parsed.error.flatten() });
    }
    const attendedOn = attendanceDateFor(parsed.data.timeZone);
    const updated = await accountStore.checkInAttendance(account.id, attendedOn);
    if (updated === null) {
      return reply.code(404).send({ code: "PROFILE_NOT_FOUND", message: "Profile was not found." });
    }
    return { account: publicAccount(updated) };
  });

  app.get("/replays/:gameId", async (request, reply) => {
    if (!historyStore.enabled) {
      return reply.code(503).send({ code: "DATABASE_DISABLED", message: "Replay database is not configured." });
    }
    const params = z.object({ gameId: z.string().min(1).max(160) }).parse(request.params);
    const replay = await historyStore.getReplay(params.gameId);
    if (replay === null) {
      return reply.code(404).send({ code: "REPLAY_NOT_FOUND", message: "Replay was not found." });
    }
    return { replay };
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
    metrics.socketConnected();

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
      const room = roomService.createRoom(
        accountProfile(player, socket.id, getSocketAccount(socket)),
      );
      const host = room.players[0];
      socket.data.playerId = host.id;
      socket.join(room.code);
      metrics.roomCreated();
      persistRoomLater(room, "Failed to persist created room");
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
        ...accountProfile(player, socket.id, getSocketAccount(socket)),
      });
      if (!result.ok) {
        callback?.({ ok: false, error: toClientError(result.error) });
        return;
      }

      const joinedPlayer = result.value.players[1];
      socket.data.playerId = joinedPlayer?.id;
      socket.join(result.value.code);
      persistRoomLater(result.value, "Failed to persist joined room");
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

      persistRoomLater(result.value, "Failed to persist ready state");
      io.to(result.value.code).emit("game:state", result.value);
      callback?.({ ok: true, room: result.value });
    });

    socket.on("room:spectate", (payload, callback?: (response: unknown) => void) => {
      const parsed = z.object({ code: z.string().trim().toUpperCase().min(4).max(12) }).safeParse(payload ?? {});
      if (!parsed.success) {
        callback?.({ ok: false, error: parsed.error.flatten() });
        return;
      }
      const result = roomService.getRoom(parsed.data.code);
      if (!result.ok) {
        callback?.({ ok: false, error: toClientError(result.error) });
        return;
      }
      socket.join(result.value.code);
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

      if (result.value.move !== null) {
        metrics.moveAccepted();
      }
      if (result.value.room.game?.status === "finished") {
        persistFinishedRoomLater(
          result.value.room,
          result.value.move,
          "Failed to persist finished move",
        );
      } else {
        persistMoveApplicationLater(
          result.value.room,
          result.value.move,
          "Failed to persist move application",
        );
      }
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

      persistFinishedRoomLater(result.value, null, "Failed to persist resigned room");
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

      disconnectGrace.cancel(parsed.data.playerId);
      socket.data.playerId = parsed.data.playerId;
      socket.join(result.value.code);
      persistRoomLater(result.value, "Failed to persist reconnected room");
      io.to(result.value.code).emit("game:state", result.value);
      callback?.({ ok: true, room: result.value });
    });

    socket.on("matchmaking:join", (payload, callback?: (response: unknown) => void) => {
      const parsed = matchmakingSchema.safeParse(payload ?? {});
      if (!parsed.success) {
        callback?.({ ok: false, error: parsed.error.flatten() });
        return;
      }

      const account = getSocketAccount(socket);
      if (parsed.data.mode === "ranked" && account === null) {
        callback?.({
          ok: false,
          error: {
            code: "LOGIN_REQUIRED",
            message: "Ranked matchmaking requires an account.",
            gameErrorCode: null,
          },
        });
        return;
      }

      removeFromMatchmaking(socket.id);
      const player = playerProfileSchema.parse(parsed.data.player ?? {});
      const queued: QueuedPlayer = {
        socketId: socket.id,
        accountId: account?.id ?? null,
        profile: accountProfile(player, socket.id, account),
        queuedAt: Date.now(),
      };

      const queue = matchmakingQueues[parsed.data.mode];
      const opponent = queue.shift();
      metrics.setQueueDepth(parsed.data.mode, queue.length);

      if (opponent === undefined) {
        queue.push(queued);
        metrics.setQueueDepth(parsed.data.mode, queue.length);
        const estimate = estimatedWaitSeconds(parsed.data.mode);
        callback?.({ ok: true, status: "queued", mode: parsed.data.mode, estimatedWaitSeconds: estimate });
        socket.emit("matchmaking:queued", { mode: parsed.data.mode, estimatedWaitSeconds: estimate });
        return;
      }

      callback?.({ ok: true, status: "matched", mode: parsed.data.mode });
      emitMatch(parsed.data.mode, opponent, queued);
    });

    socket.on("matchmaking:leave", (payloadOrCallback, callback?: (response: unknown) => void) => {
      const ack = typeof payloadOrCallback === "function"
        ? payloadOrCallback as (response: unknown) => void
        : callback;
      removeFromMatchmaking(socket.id);
      ack?.({ ok: true });
    });

    socket.on("disconnect", () => {
      metrics.socketDisconnected();
      removeFromMatchmaking(socket.id);
      if (!closing && typeof socket.data.playerId === "string") {
        disconnectGrace.schedule(socket.data.playerId);
      }
    });
  });

  const turnTimer = setInterval(() => {
    const rooms = roomService.expireActiveTurns();
    for (const room of rooms) {
      persistFinishedRoomLater(room, null, "Failed to persist expired room");
      io.to(room.code).emit("game:state", room);
      io.to(room.code).emit("game:finished", room.game);
    }
  }, 1_000);

  app.addHook("onClose", async () => {
    closing = true;
    clearInterval(turnTimer);
    disconnectGrace.clear();
    await io.close();
    await roomPersistence.drain();
    await historyStore.close();
    await accountStore.close();
    await analyticsStore.close();
  });

  return { app, io, roomService };
};
