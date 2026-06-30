import { readFile } from "node:fs/promises";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import cors from "@fastify/cors";
import Fastify from "fastify";
import { Server, type Socket } from "socket.io";
import { z } from "zod";
import { getMatchmakingSegment, type MatchmakingSegment, type Move, type RoomSnapshot } from "@color-game/shared-types";
import { DEFAULT_GAME_CONFIG } from "@color-game/game-core";
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
import { RoomPersistenceCoordinator } from "./room-persistence.js";
import { DisconnectGracePeriod } from "./disconnect-grace.js";
import {
  NullMatchmakingWaitStore,
  type MatchmakingMode,
  type MatchmakingWaitStore,
  type WaitEstimateBasis,
} from "./matchmaking-wait-store.js";
import {
  NullEconomyStore,
  TileColorSimilarityError,
  type CosmeticRarity,
  type EconomyStore,
  seoulDayKey,
  type TileLoadoutSlot,
} from "./economy-store.js";
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
  matchmakingWaitStore?: MatchmakingWaitStore;
  economyStore?: EconomyStore;
  authSecret?: string;
  tokenTtlSeconds?: number;
  requireDatabaseHealth?: boolean;
}

interface QueuedPlayer {
  socketId: string;
  accountId: string | null;
  profile: PlayerProfile;
  queuedAt: number;
  segment: MatchmakingSegment;
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

const deleteAccountSchema = z.object({
  password: z.string().min(8).max(128),
});

const attendanceCheckInSchema = z.object({
  timeZone: z.string().trim().max(120).optional(),
});

const economyTimeZoneSchema = z.object({
  timeZone: z.string().trim().max(120).optional(),
});

const cosmeticIdSchema = z.object({
  cosmeticId: z.string().trim().min(1).max(80),
});

const tileEquipSchema = cosmeticIdSchema.extend({
  allowSimilar: z.boolean().optional().default(false),
});

const tileLoadoutParamsSchema = z.object({
  slot: z.enum(["colorA", "colorB", "colorC"]),
});

const fragmentCombineSchema = z.object({
  rarity: z.enum(["common", "rare", "epic", "legendary"]),
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

const economyErrorStatus = (error: unknown): { status: number; code: string } => {
  const code = error instanceof Error ? error.message : "ECONOMY_REQUEST_FAILED";
  if (code === "INSUFFICIENT_CHIPS" || code === "NOT_ENOUGH_FRAGMENTS") {
    return { status: 409, code };
  }
  if (
    code === "QUEST_ALREADY_CLAIMED"
    || code === "QUEST_NOT_CLAIMABLE"
    || code === "COSMETIC_ALREADY_OWNED"
    || code === "NO_UNOWNED_COSMETICS"
    || code === "DUPLICATE_TILE_COLOR"
    || code === "TILE_COLORS_TOO_SIMILAR"
  ) {
    return { status: 409, code };
  }
  if (
    code === "COSMETIC_NOT_IN_WEEKLY_STORE"
    || code === "COSMETIC_NOT_OWNED"
    || code === "ATTENDANCE_REQUIRED"
  ) {
    return { status: 400, code };
  }
  return { status: 500, code: "ECONOMY_REQUEST_FAILED" };
};

export const createGuestToken = (guestId: string, secret: string): string => {
  const signature = createHmac("sha256", secret).update(guestId).digest("base64url");
  return `${guestId}.${signature}`;
};

export const verifyGuestToken = (token: string, secret: string): string | null => {
  const separator = token.lastIndexOf(".");
  if (separator <= 0) return null;
  const guestId = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  if (!/^[0-9a-f-]{36}$/i.test(guestId) || signature === "") return null;
  const expected = createHmac("sha256", secret).update(guestId).digest("base64url");
  const actualBytes = Buffer.from(signature);
  const expectedBytes = Buffer.from(expected);
  if (actualBytes.length !== expectedBytes.length) return null;
  return timingSafeEqual(actualBytes, expectedBytes) ? guestId : null;
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
  const matchmakingWaitStore = options.matchmakingWaitStore ?? new NullMatchmakingWaitStore();
  const economyStore = options.economyStore ?? new NullEconomyStore();
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
    methods: ["GET", "HEAD", "POST", "PUT", "DELETE", "OPTIONS"],
  });

  const recordFinishedRoom = async (room: RoomSnapshot): Promise<void> => {
    if (room.game?.status !== "finished") return;
    metrics.gameFinished();
    if (!accountStore.enabled) return;
    await accountStore.recordFinishedRoom(room);
    if (economyStore.enabled) {
      await economyStore.recordFinishedRoom(
        room,
        roomService.getRewardIdentities(room.code),
      );
    }
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
    return accountStore.getAccountForSession(payload.accountId, payload.sessionId);
  };

  const disconnectAccountSockets = (accountId: string): void => {
    for (const socket of io.sockets.sockets.values()) {
      const account = getSocketAccount(socket);
      if (account?.id === accountId) {
        socket.emit("auth:session-replaced", {
          code: "SESSION_REPLACED",
          message: "This account signed in somewhere else.",
        });
        socket.disconnect(true);
      }
    }
  };

  const issueAuthToken = async (account: AccountSummary): Promise<string | null> => {
    const sessionId = await accountStore.rotateSession(account.id);
    if (sessionId === null) return null;
    disconnectAccountSockets(account.id);
    return createAuthToken(account.id, sessionId, authSecret, tokenTtlSeconds);
  };

  const accountProfile = (
    player: z.infer<typeof playerProfileSchema>,
    socketId: string,
    account: AccountSummary | null,
    guestId: string | null,
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

    return { ...player, accountId: null, guestId, socketId };
  };

  const removeFromMatchmaking = (socketId: string): void => {
    for (const mode of ["casual", "ranked"] as const) {
      matchmakingQueues[mode] = matchmakingQueues[mode].filter(
        (queued) => queued.socketId !== socketId,
      );
      metrics.setQueueDepth(mode, matchmakingQueues[mode].length);
    }
  };

  const clampWaitSeconds = (waitMs: number): number =>
    Math.max(5, Math.min(120, Math.round(waitMs / 1_000)));

  const estimatedWait = async (
    mode: MatchmakingMode,
    segment: MatchmakingSegment,
  ): Promise<{
    estimatedWaitSeconds: number;
    estimateBasis: WaitEstimateBasis;
    estimateSegment: MatchmakingSegment;
    estimateSampleCount: number;
  }> => {
    if (matchmakingWaitStore.enabled) {
      try {
        const estimate = await matchmakingWaitStore.getEstimate(mode, segment);
        if (estimate.waitMs !== null) {
          return {
            estimatedWaitSeconds: clampWaitSeconds(estimate.waitMs),
            estimateBasis: estimate.basis,
            estimateSegment: segment,
            estimateSampleCount: estimate.sampleCount,
          };
        }
      } catch (error) {
        app.log.warn({ err: error, mode, segment }, "Failed to load matchmaking wait estimate");
      }
    }

    const samples = matchmakingWaitSamples[mode];
    if (samples.length > 0) {
      const sorted = [...samples].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)] ?? 20_000;
      return {
        estimatedWaitSeconds: clampWaitSeconds(median),
        estimateBasis: "mode",
        estimateSegment: segment,
        estimateSampleCount: samples.length,
      };
    }
    return {
      estimatedWaitSeconds: mode === "casual" ? 20 : 30,
      estimateBasis: "default",
      estimateSegment: segment,
      estimateSampleCount: 0,
    };
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
    if (matchmakingWaitStore.enabled) {
      void matchmakingWaitStore.recordSamples([
        {
          mode,
          segment: first.segment,
          accountId: first.accountId,
          waitMs: matchedAt - first.queuedAt,
          matchedAt: new Date(matchedAt),
        },
        {
          mode,
          segment: second.segment,
          accountId: second.accountId,
          waitMs: matchedAt - second.queuedAt,
          matchedAt: new Date(matchedAt),
        },
      ]).catch((error: unknown) => {
        app.log.error({ err: error, mode }, "Failed to persist matchmaking wait samples");
      });
    }
    persistRoomLater(room, "Failed to persist matched room");
    firstSocket.emit("matchmaking:matched", { ok: true, room, playerId: firstPlayer.id });
    secondSocket.emit("matchmaking:matched", { ok: true, room, playerId: secondPlayer.id });
    io.to(room.code).emit("game:state", room);
  };

  io.use((socket, next) => {
    void (async () => {
      const auth = socket.handshake.auth as { token?: unknown; guestToken?: unknown };
      const token = typeof auth.token === "string" ? auth.token : null;
      const account = await authenticateToken(token);
      if (token !== null && accountStore.enabled && account === null) {
        next(new Error("UNAUTHORIZED"));
        return;
      }
      if (account !== null) {
        socket.data.account = account;
      }
      const suppliedGuestToken = typeof auth.guestToken === "string" ? auth.guestToken : null;
      const verifiedGuestId = suppliedGuestToken === null
        ? null
        : verifyGuestToken(suppliedGuestToken, authSecret);
      const guestId = verifiedGuestId ?? randomUUID();
      socket.data.guestId = guestId;
      socket.data.guestToken = verifiedGuestId === null
        ? createGuestToken(guestId, authSecret)
        : suppliedGuestToken;
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

  app.post("/auth/guest", async (request) => {
    const parsed = z.object({ token: z.string().max(256).optional() }).safeParse(request.body ?? {});
    const supplied = parsed.success ? parsed.data.token ?? null : null;
    const verified = supplied === null ? null : verifyGuestToken(supplied, authSecret);
    const guestId = verified ?? randomUUID();
    return { token: verified === null ? createGuestToken(guestId, authSecret) : supplied };
  });

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
      const token = await issueAuthToken(account);
      if (token === null) {
        return reply.code(500).send({ code: "SESSION_CREATE_FAILED", message: "Could not create a sign-in session." });
      }
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

    const token = await issueAuthToken(account);
    if (token === null) {
      return reply.code(500).send({ code: "SESSION_CREATE_FAILED", message: "Could not create a sign-in session." });
    }
    return { token, account: publicAccount(account) };
  });

  app.get("/auth/me", async (request, reply) => {
    const account = await authenticateToken(bearerToken(request.headers.authorization));
    if (account === null) {
      return reply.code(401).send({ code: "UNAUTHORIZED", message: "Sign in is required." });
    }
    return { account: publicAccount(account) };
  });

  app.delete("/auth/account", async (request, reply) => {
    const account = await authenticateToken(bearerToken(request.headers.authorization));
    if (account === null || !accountStore.enabled) {
      return reply.code(401).send({ code: "UNAUTHORIZED", message: "Sign in is required." });
    }

    const parsed = deleteAccountSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.code(400).send({ code: "INVALID_REQUEST", details: parsed.error.flatten() });
    }

    const verified = await accountStore.authenticate(account.email, parsed.data.password);
    if (verified?.id !== account.id) {
      return reply.code(403).send({ code: "INVALID_PASSWORD", message: "Password is invalid." });
    }

    const activeGameSocket = [...io.sockets.sockets.values()].some((socket) => {
      const socketAccount = getSocketAccount(socket);
      return socketAccount?.id === account.id && typeof socket.data.playerId === "string";
    });
    if (activeGameSocket) {
      return reply.code(409).send({
        code: "ACCOUNT_IN_ACTIVE_MATCH",
        message: "Leave the active match before deleting this account.",
      });
    }

    const deleted = await accountStore.deleteAccount(account.id);
    if (!deleted) {
      return reply.code(404).send({ code: "PROFILE_NOT_FOUND", message: "Profile was not found." });
    }

    for (const socket of io.sockets.sockets.values()) {
      const socketAccount = getSocketAccount(socket);
      if (socketAccount?.id === account.id) {
        socket.emit("auth:session-replaced", {
          code: "ACCOUNT_DELETED",
          message: "This account was deleted.",
        });
        socket.disconnect(true);
      }
    }

    return reply.code(204).send();
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
    const attendedOn = seoulDayKey();
    const updated = await accountStore.checkInAttendance(account.id, attendedOn);
    if (updated === null) {
      return reply.code(404).send({ code: "PROFILE_NOT_FOUND", message: "Profile was not found." });
    }
    return { account: publicAccount(updated) };
  });

  app.get("/economy/overview", async (request, reply) => {
    const account = await authenticateToken(bearerToken(request.headers.authorization));
    if (account === null) {
      return reply.code(401).send({ code: "UNAUTHORIZED", message: "Sign in is required." });
    }
    if (!economyStore.enabled) {
      return reply.code(503).send({ code: "DATABASE_DISABLED", message: "Economy database is not configured." });
    }
    const parsed = economyTimeZoneSchema.safeParse(request.query ?? {});
    if (!parsed.success) {
      return reply.code(400).send({ code: "INVALID_REQUEST", details: parsed.error.flatten() });
    }
    return { economy: await economyStore.getOverview(account.id, account.attendanceStreak) };
  });

  app.post("/economy/quests/welcome/claim", async (request, reply) => {
    const account = await authenticateToken(bearerToken(request.headers.authorization));
    if (account === null || !economyStore.enabled) {
      return reply.code(401).send({ code: "UNAUTHORIZED", message: "Sign in is required." });
    }
    const parsed = economyTimeZoneSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.code(400).send({ code: "INVALID_REQUEST", details: parsed.error.flatten() });
    }
    try {
      return { economy: await economyStore.claimWelcome(account.id, account.attendanceStreak) };
    } catch (error) {
      const mapped = economyErrorStatus(error);
      return reply.code(mapped.status).send({ code: mapped.code });
    }
  });

  app.post("/economy/quests/attendance/claim", async (request, reply) => {
    const account = await authenticateToken(bearerToken(request.headers.authorization));
    if (account === null || !economyStore.enabled || !accountStore.enabled) {
      return reply.code(401).send({ code: "UNAUTHORIZED", message: "Sign in is required." });
    }
    const parsed = economyTimeZoneSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.code(400).send({ code: "INVALID_REQUEST", details: parsed.error.flatten() });
    }
    try {
      const attendedOn = seoulDayKey();
      const updated = await accountStore.checkInAttendance(account.id, attendedOn);
      if (updated === null) {
        return reply.code(404).send({ code: "PROFILE_NOT_FOUND" });
      }
      return {
        account: publicAccount(updated),
        economy: await economyStore.claimAttendance(
          account.id,
          attendedOn,
          updated.attendanceStreak,
        ),
      };
    } catch (error) {
      const mapped = economyErrorStatus(error);
      return reply.code(mapped.status).send({ code: mapped.code });
    }
  });

  app.post("/economy/quests/attendance-streak/claim", async (request, reply) => {
    const account = await authenticateToken(bearerToken(request.headers.authorization));
    if (account === null || !economyStore.enabled) {
      return reply.code(401).send({ code: "UNAUTHORIZED", message: "Sign in is required." });
    }
    const parsed = economyTimeZoneSchema.safeParse(request.body ?? {});
    if (!parsed.success) return reply.code(400).send({ code: "INVALID_REQUEST" });
    try {
      return {
        economy: await economyStore.claimUnlockedQuest(
          account.id,
          "attendance_streak",
          account.attendanceStreak,
        ),
      };
    } catch (error) {
      const mapped = economyErrorStatus(error);
      return reply.code(mapped.status).send({ code: mapped.code });
    }
  });

  app.post("/economy/quests/first-online-win/claim", async (request, reply) => {
    const account = await authenticateToken(bearerToken(request.headers.authorization));
    if (account === null || !economyStore.enabled) {
      return reply.code(401).send({ code: "UNAUTHORIZED", message: "Sign in is required." });
    }
    const parsed = economyTimeZoneSchema.safeParse(request.body ?? {});
    if (!parsed.success) return reply.code(400).send({ code: "INVALID_REQUEST" });
    try {
      return {
        economy: await economyStore.claimUnlockedQuest(
          account.id,
          "first_online_win",
          account.attendanceStreak,
        ),
      };
    } catch (error) {
      const mapped = economyErrorStatus(error);
      return reply.code(mapped.status).send({ code: mapped.code });
    }
  });

  app.post("/economy/store/:cosmeticId/purchase", async (request, reply) => {
    const account = await authenticateToken(bearerToken(request.headers.authorization));
    if (account === null || !economyStore.enabled) {
      return reply.code(401).send({ code: "UNAUTHORIZED", message: "Sign in is required." });
    }
    const params = cosmeticIdSchema.safeParse(request.params);
    const body = economyTimeZoneSchema.safeParse(request.body ?? {});
    if (!params.success || !body.success) {
      return reply.code(400).send({ code: "INVALID_REQUEST" });
    }
    try {
      return {
        economy: await economyStore.purchaseWeeklyCosmetic(
          account.id,
          params.data.cosmeticId,
          account.attendanceStreak,
        ),
      };
    } catch (error) {
      const mapped = economyErrorStatus(error);
      return reply.code(mapped.status).send({ code: mapped.code });
    }
  });

  app.post("/economy/box/open", async (request, reply) => {
    const account = await authenticateToken(bearerToken(request.headers.authorization));
    if (account === null || !economyStore.enabled) {
      return reply.code(401).send({ code: "UNAUTHORIZED", message: "Sign in is required." });
    }
    const parsed = economyTimeZoneSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.code(400).send({ code: "INVALID_REQUEST" });
    }
    try {
      return { outcome: await economyStore.openBox(account.id, account.attendanceStreak) };
    } catch (error) {
      const mapped = economyErrorStatus(error);
      return reply.code(mapped.status).send({ code: mapped.code });
    }
  });

  app.post("/economy/fragments/combine", async (request, reply) => {
    const account = await authenticateToken(bearerToken(request.headers.authorization));
    if (account === null || !economyStore.enabled) {
      return reply.code(401).send({ code: "UNAUTHORIZED", message: "Sign in is required." });
    }
    const parsed = fragmentCombineSchema.merge(economyTimeZoneSchema).safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.code(400).send({ code: "INVALID_REQUEST" });
    }
    try {
      return {
        outcome: await economyStore.combineFragments(
          account.id,
          parsed.data.rarity as CosmeticRarity,
          account.attendanceStreak,
        ),
      };
    } catch (error) {
      const mapped = economyErrorStatus(error);
      return reply.code(mapped.status).send({ code: mapped.code });
    }
  });

  app.put("/economy/loadout/tile/:slot", async (request, reply) => {
    const account = await authenticateToken(bearerToken(request.headers.authorization));
    if (account === null || !economyStore.enabled) {
      return reply.code(401).send({ code: "UNAUTHORIZED", message: "Sign in is required." });
    }
    const params = tileLoadoutParamsSchema.safeParse(request.params);
    const body = tileEquipSchema.merge(economyTimeZoneSchema).safeParse(request.body ?? {});
    if (!params.success || !body.success) {
      return reply.code(400).send({ code: "INVALID_REQUEST" });
    }
    try {
      return {
        economy: await economyStore.equipTileColor(
          account.id,
          params.data.slot as TileLoadoutSlot,
          body.data.cosmeticId,
          body.data.allowSimilar,
          account.attendanceStreak,
        ),
      };
    } catch (error) {
      if (error instanceof TileColorSimilarityError) {
        return reply.code(409).send({
          code: error.code,
          conflicts: error.conflicts,
        });
      }
      const mapped = economyErrorStatus(error);
      return reply.code(mapped.status).send({ code: mapped.code });
    }
  });

  app.delete("/economy/loadout/tile/:slot", async (request, reply) => {
    const account = await authenticateToken(bearerToken(request.headers.authorization));
    if (account === null || !economyStore.enabled) {
      return reply.code(401).send({ code: "UNAUTHORIZED", message: "Sign in is required." });
    }
    const params = tileLoadoutParamsSchema.safeParse(request.params);
    const body = economyTimeZoneSchema.safeParse(request.body ?? {});
    if (!params.success || !body.success) {
      return reply.code(400).send({ code: "INVALID_REQUEST" });
    }
    try {
      return {
        economy: await economyStore.resetTileColor(
          account.id,
          params.data.slot as TileLoadoutSlot,
          account.attendanceStreak,
        ),
      };
    } catch (error) {
      const mapped = economyErrorStatus(error);
      return reply.code(mapped.status).send({ code: mapped.code });
    }
  });

  app.post("/ads/reward/session", async (request, reply) => {
    const account = await authenticateToken(bearerToken(request.headers.authorization));
    if (account === null || !economyStore.enabled) {
      return reply.code(401).send({ code: "UNAUTHORIZED", message: "Sign in is required." });
    }
    const parsed = economyTimeZoneSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.code(400).send({ code: "INVALID_REQUEST" });
    }
    const overview = await economyStore.getOverview(account.id, account.attendanceStreak);
    if (overview.monetization.rewardAds.status !== "available") {
      return reply.code(423).send({
        code: "FEATURE_LOCKED",
        message: "Reward ads will unlock at official launch.",
      });
    }
    return reply.code(503).send({
      code: "ADMOB_NOT_CONFIGURED",
      message: "AdMob production credentials are not configured.",
    });
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
    if (typeof socket.data.guestToken === "string") {
      socket.emit("guest:token", { token: socket.data.guestToken });
    }

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
      void (async () => {
        const parsed = roomCreateSchema.safeParse(payload ?? {});
        if (!parsed.success) {
          callback?.({ ok: false, error: parsed.error.flatten() });
          return;
        }

        const account = getSocketAccount(socket);
        if (parsed.data.settings !== undefined) {
          const premium = account !== null
            && economyStore.enabled
            && await economyStore.hasEntitlement(account.id, "premium");
          if (!premium) {
            callback?.({
              ok: false,
              error: {
                code: "PREMIUM_REQUIRED",
                message: "Custom room settings require Premium.",
              },
            });
            return;
          }
        }

        const player = playerProfileSchema.parse(parsed.data.player ?? {});
        const config = parsed.data.settings === undefined
          ? DEFAULT_GAME_CONFIG
          : {
              ...DEFAULT_GAME_CONFIG,
              colors: [...DEFAULT_GAME_CONFIG.colors],
              scoreRules: { ...DEFAULT_GAME_CONFIG.scoreRules },
              targetScore: parsed.data.settings.targetScore,
              turnTimeLimitSeconds: parsed.data.settings.turnTimeLimitSeconds,
            };
        const room = roomService.createRoom(
          accountProfile(
            player,
            socket.id,
            account,
            typeof socket.data.guestId === "string" ? socket.data.guestId : null,
          ),
          "private",
          config,
          parsed.data.settings?.spectatorsAllowed ?? true,
        );
        const host = room.players[0];
        socket.data.playerId = host.id;
        socket.join(room.code);
        metrics.roomCreated();
        persistRoomLater(room, "Failed to persist created room");
        io.to(room.code).emit("game:state", room);
        callback?.({ ok: true, room, playerId: host.id });
      })().catch((error: unknown) => {
        app.log.error({ err: error }, "Failed to create room");
        callback?.({ ok: false, error: { code: "ROOM_CREATE_FAILED" } });
      });
    });

    socket.on("room:join", (payload, callback?: (response: unknown) => void) => {
      const parsed = roomJoinSchema.safeParse(payload ?? {});
      if (!parsed.success) {
        callback?.({ ok: false, error: parsed.error.flatten() });
        return;
      }

      const player = playerProfileSchema.parse(parsed.data.player ?? {});
      const result = roomService.joinRoom(parsed.data.code, {
        ...accountProfile(
          player,
          socket.id,
          getSocketAccount(socket),
          typeof socket.data.guestId === "string" ? socket.data.guestId : null,
        ),
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
      if (!result.value.spectatorsAllowed) {
        callback?.({
          ok: false,
          error: {
            code: "SPECTATING_DISABLED",
            message: "The host disabled spectating for this room.",
          },
        });
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
      void (async () => {
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
          profile: accountProfile(
            player,
            socket.id,
            account,
            typeof socket.data.guestId === "string" ? socket.data.guestId : null,
          ),
          queuedAt: Date.now(),
          segment: getMatchmakingSegment(account?.rating ?? null),
        };

        const queue = matchmakingQueues[parsed.data.mode];
        let opponent = queue.shift();
        metrics.setQueueDepth(parsed.data.mode, queue.length);

        if (opponent === undefined) {
          const estimate = await estimatedWait(parsed.data.mode, queued.segment);

          // Another join may have completed while the database estimate was loading.
          // Recheck the queue so two concurrent players cannot both be left waiting.
          opponent = queue.shift();
          if (opponent === undefined) {
            queue.push(queued);
            metrics.setQueueDepth(parsed.data.mode, queue.length);
            const response = { ok: true, status: "queued", mode: parsed.data.mode, ...estimate };
            callback?.(response);
            socket.emit("matchmaking:queued", { mode: parsed.data.mode, ...estimate });
            return;
          }
        }

        callback?.({ ok: true, status: "matched", mode: parsed.data.mode });
        emitMatch(parsed.data.mode, opponent, queued);
      })().catch((error: unknown) => {
        app.log.error({ err: error }, "Failed to join matchmaking queue");
        callback?.({ ok: false, error: { code: "MATCHMAKING_FAILED" } });
      });
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
    await economyStore.close();
    await analyticsStore.close();
    await matchmakingWaitStore.close();
  });

  return { app, io, roomService };
};
