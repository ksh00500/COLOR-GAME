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
  type CraftCategory,
  type EconomyStore,
  seoulDayKey,
  type TileLoadout,
  type TileLoadoutSlot,
  type StyleLoadoutSlot,
} from "./economy-store.js";
import {
  NullAdminStore,
  createAdminToken,
  verifyAdminToken,
  type AdminStore,
} from "./admin-store.js";
import {
  NullGoogleTokenVerifier,
  type GoogleTokenVerifier,
} from "./google-auth.js";
import {
  gameMoveSchema,
  gameRematchSchema,
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
  adminStore?: AdminStore;
  googleTokenVerifier?: GoogleTokenVerifier;
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
  password: z.string().min(8).max(128).optional(),
  confirmation: z.literal("DELETE").optional(),
});

const googleAuthSchema = z.object({
  idToken: z.string().min(100).max(10_000),
  displayName: z.string().trim().min(2).max(24).optional(),
  avatarId: z.string().trim().min(1).max(32).optional().default("orbit"),
});

const googleLinkSchema = z.object({
  idToken: z.string().min(100).max(10_000),
  password: z.string().min(8).max(128),
});

const profileUpdateSchema = z.object({
  displayName: z.string().trim().min(2).max(24),
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

const tileLoadoutSchema = z.object({
  colorA: z.string().trim().min(1).max(80).nullable().optional(),
  colorB: z.string().trim().min(1).max(80).nullable().optional(),
  colorC: z.string().trim().min(1).max(80).nullable().optional(),
}).strict();

const tileBatchEquipSchema = z.object({
  loadout: tileLoadoutSchema,
  allowSimilar: z.boolean().optional().default(false),
});

const tilePaletteParamsSchema = z.object({
  slotIndex: z.coerce.number().int().min(1).max(3),
});

const tilePaletteSaveSchema = tileBatchEquipSchema.extend({
  name: z.string().trim().min(1).max(24).nullable().optional().default(null),
});

const normalizeTileLoadout = (
  loadout: z.infer<typeof tileLoadoutSchema>,
): TileLoadout => Object.fromEntries(
  Object.entries(loadout).filter((entry): entry is [TileLoadoutSlot, string] => typeof entry[1] === "string"),
) as TileLoadout;

const fragmentCombineSchema = z.object({
  rarity: z.enum(["common", "rare", "epic", "legendary"]),
  category: z.enum(["tile_color", "board_theme", "placement_effect", "score_effect", "victory_effect"]).optional().default("tile_color"),
});

const cosmeticCategorySchema = z.enum(["tile_color", "board_theme", "placement_effect", "score_effect", "victory_effect"]);
const boxOpenSchema = z.object({ category: cosmeticCategorySchema.optional().default("tile_color") });
const atelierCraftSchema = z.object({
  mode: z.enum(["random", "targeted"]),
  category: cosmeticCategorySchema,
  rarity: z.enum(["common", "rare", "epic", "legendary"]),
  cosmeticId: z.string().trim().min(1).max(80).optional(),
}).refine((value) => value.mode === "random" || value.cosmeticId !== undefined, {
  message: "Targeted crafting requires cosmeticId.",
});
const styleLoadoutParamsSchema = z.object({
  slot: z.enum(["boardTheme", "placementEffect", "scoreEffect", "victoryEffect"]),
});
const styleEquipSchema = z.object({ cosmeticId: z.string().trim().min(1).max(80).nullable() });
const wishlistSchema = z.object({ wished: z.boolean() });

const progressQuestParamsSchema = z.object({
  quest: z.enum([
    "daily-complete",
    "weekly-attendance",
    "weekly-matches",
    "weekly-wins",
    "weekly-complete",
  ]),
});

const couponRewardSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("color_chips"), amount: z.number().int().min(1).max(1_000_000) }),
  z.object({ type: z.literal("palette_box_ticket"), amount: z.number().int().min(1).max(1_000) }),
  z.object({
    type: z.literal("fragments"),
    rarity: z.enum(["common", "rare", "epic", "legendary"]),
    amount: z.number().int().min(1).max(10_000),
  }),
  z.object({ type: z.literal("cosmetic"), cosmeticId: z.string().trim().min(1).max(80) }),
  z.object({
    type: z.literal("random_cosmetic"),
    cosmeticIds: z.array(z.string().trim().min(1).max(80)).min(1).max(100),
    pickCount: z.number().int().min(1).max(20),
  }).refine((value) => value.pickCount <= new Set(value.cosmeticIds).size, {
    message: "pickCount cannot exceed the number of unique cosmetic candidates.",
  }),
  z.object({ type: z.literal("entitlement"), entitlement: z.literal("premium") }),
]);

const couponInputSchema = z.object({
  code: z.string().trim().min(3).max(40).regex(/^[A-Za-z0-9_-]+$/),
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(500).optional().default(""),
  rewards: z.array(couponRewardSchema).min(1).max(20),
  startsAt: z.string().datetime().nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  maxRedemptions: z.number().int().positive().max(10_000_000).nullable().optional(),
  active: z.boolean().optional().default(true),
}).refine(
  (value) => !value.startsAt || !value.expiresAt || new Date(value.expiresAt) > new Date(value.startsAt),
  { message: "expiresAt must be later than startsAt." },
);

const couponIdParamsSchema = z.object({ couponId: z.string().uuid() });
const accountIdParamsSchema = z.object({ accountId: z.string().min(1).max(80) });

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
    || code === "WISHLIST_LIMIT_REACHED"
    || code === "COSMETIC_NOT_CRAFTABLE"
  ) {
    return { status: 409, code };
  }
  if (
    code === "COSMETIC_NOT_IN_WEEKLY_STORE"
    || code === "COSMETIC_NOT_OWNED"
    || code === "ATTENDANCE_REQUIRED"
    || code === "COSMETIC_NOT_FOUND"
    || code === "COSMETIC_REQUIRED"
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
  casualWins: account.casualWins,
  casualLosses: account.casualLosses,
  casualDraws: account.casualDraws,
  matchStats: {
    casual: {
      wins: account.casualWins,
      losses: account.casualLosses,
      draws: account.casualDraws,
    },
    ranked: {
      wins: account.rankedWins,
      losses: account.rankedLosses,
      draws: account.rankedDraws,
    },
    all: {
      wins: account.casualWins + account.rankedWins,
      losses: account.casualLosses + account.rankedLosses,
      draws: account.casualDraws + account.rankedDraws,
    },
  },
  displayNameChangedAt: account.displayNameChangedAt,
  displayNameChangeAvailableAt: account.displayNameChangedAt === null
    ? null
    : new Date(new Date(account.displayNameChangedAt).getTime() + 14 * 86_400_000).toISOString(),
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
  const adminStore = options.adminStore ?? new NullAdminStore();
  const googleTokenVerifier = options.googleTokenVerifier ?? new NullGoogleTokenVerifier();
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
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
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

  const authenticateAdmin = async (token: string | null) => {
    if (token === null || !adminStore.enabled) return null;
    const payload = verifyAdminToken(token, authSecret);
    if (payload === null) return null;
    return adminStore.getAdminForSession(payload.adminId, payload.sessionId);
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

  const accountProfile = async (
    player: z.infer<typeof playerProfileSchema>,
    socketId: string,
    account: AccountSummary | null,
    guestId: string | null,
  ): Promise<PlayerProfile> => {
    if (account !== null) {
      const cosmetics = economyStore.enabled
        ? await economyStore.getMatchCosmetics(account.id)
        : undefined;
      return {
        accountId: account.id,
        nickname: account.displayName,
        avatarId: account.avatarId,
        isGuest: false,
        socketId,
        ...(cosmetics === undefined ? {} : { cosmetics }),
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

  app.post("/auth/google", async (request, reply) => {
    if (!accountStore.enabled) {
      return reply.code(503).send({ code: "DATABASE_DISABLED" });
    }
    if (!googleTokenVerifier.enabled) {
      return reply.code(503).send({ code: "GOOGLE_AUTH_DISABLED" });
    }
    const parsed = googleAuthSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.code(400).send({ code: "INVALID_REQUEST", details: parsed.error.flatten() });
    }
    const identity = await googleTokenVerifier.verify(parsed.data.idToken);
    if (identity === null) {
      return reply.code(401).send({ code: "INVALID_GOOGLE_TOKEN" });
    }

    const linked = await accountStore.getAccountByGoogleSubject(identity.subject);
    if (linked !== null) {
      const token = await issueAuthToken(linked);
      if (token === null) return reply.code(500).send({ code: "SESSION_CREATE_FAILED" });
      return { token, account: publicAccount(linked) };
    }

    const existingEmailAccount = await accountStore.getAccountByEmail(identity.email);
    if (existingEmailAccount !== null) {
      return reply.code(409).send({
        code: "GOOGLE_LINK_REQUIRED",
        email: identity.email,
        message: "Confirm the existing Tango password to connect Google.",
      });
    }

    if (parsed.data.displayName === undefined) {
      return reply.code(428).send({
        code: "GOOGLE_REGISTRATION_REQUIRED",
        email: identity.email,
        suggestedDisplayName: identity.name?.trim().slice(0, 24) || "",
      });
    }

    try {
      const account = await accountStore.registerGoogle({
        identity,
        displayName: parsed.data.displayName,
        avatarId: parsed.data.avatarId,
      });
      const token = await issueAuthToken(account);
      if (token === null) return reply.code(500).send({ code: "SESSION_CREATE_FAILED" });
      return { token, account: publicAccount(account) };
    } catch (error) {
      app.log.warn({ err: error }, "Google registration failed");
      return reply.code(409).send({ code: "ACCOUNT_EXISTS" });
    }
  });

  app.post("/auth/google/link", async (request, reply) => {
    if (!accountStore.enabled || !googleTokenVerifier.enabled) {
      return reply.code(503).send({ code: "GOOGLE_AUTH_DISABLED" });
    }
    const parsed = googleLinkSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.code(400).send({ code: "INVALID_REQUEST", details: parsed.error.flatten() });
    }
    const identity = await googleTokenVerifier.verify(parsed.data.idToken);
    if (identity === null) {
      return reply.code(401).send({ code: "INVALID_GOOGLE_TOKEN" });
    }
    const alreadyLinked = await accountStore.getAccountByGoogleSubject(identity.subject);
    if (alreadyLinked !== null) {
      return reply.code(409).send({ code: "GOOGLE_ALREADY_LINKED" });
    }
    const account = await accountStore.authenticate(identity.email, parsed.data.password);
    if (account === null) {
      return reply.code(403).send({ code: "INVALID_PASSWORD" });
    }
    try {
      await accountStore.linkGoogle(account.id, identity);
    } catch (error) {
      app.log.warn({ err: error }, "Google account linking failed");
      return reply.code(409).send({ code: "GOOGLE_ALREADY_LINKED" });
    }
    const token = await issueAuthToken(account);
    if (token === null) return reply.code(500).send({ code: "SESSION_CREATE_FAILED" });
    return { token, account: publicAccount(account) };
  });

  app.get("/auth/me", async (request, reply) => {
    const account = await authenticateToken(bearerToken(request.headers.authorization));
    if (account === null) {
      return reply.code(401).send({ code: "UNAUTHORIZED", message: "Sign in is required." });
    }
    return { account: publicAccount(account) };
  });

  app.patch("/auth/profile", async (request, reply) => {
    const account = await authenticateToken(bearerToken(request.headers.authorization));
    if (account === null || !accountStore.enabled) {
      return reply.code(401).send({ code: "UNAUTHORIZED" });
    }
    const parsed = profileUpdateSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.code(400).send({ code: "INVALID_REQUEST", details: parsed.error.flatten() });
    }
    if (parsed.data.displayName === account.displayName) {
      return { account: publicAccount(account) };
    }
    const availableAt = account.displayNameChangedAt === null
      ? null
      : new Date(new Date(account.displayNameChangedAt).getTime() + 14 * 86_400_000);
    if (availableAt !== null && availableAt.getTime() > Date.now()) {
      return reply.code(409).send({
        code: "NICKNAME_CHANGE_COOLDOWN",
        availableAt: availableAt.toISOString(),
      });
    }
    const updated = await accountStore.updateDisplayName(account.id, parsed.data.displayName);
    if (updated === null) return reply.code(404).send({ code: "PROFILE_NOT_FOUND" });
    return { account: publicAccount(updated) };
  });

  app.get("/auth/methods", async (request, reply) => {
    const account = await authenticateToken(bearerToken(request.headers.authorization));
    if (account === null) {
      return reply.code(401).send({ code: "UNAUTHORIZED" });
    }
    return { methods: await accountStore.getAuthMethods(account.id) };
  });

  app.delete("/auth/google", async (request, reply) => {
    const account = await authenticateToken(bearerToken(request.headers.authorization));
    if (account === null) {
      return reply.code(401).send({ code: "UNAUTHORIZED" });
    }
    const methods = await accountStore.getAuthMethods(account.id);
    if (!methods.google) return reply.code(404).send({ code: "GOOGLE_NOT_LINKED" });
    if (!methods.password) {
      return reply.code(409).send({ code: "LAST_AUTH_METHOD" });
    }
    await accountStore.unlinkGoogle(account.id);
    return reply.code(204).send();
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

    const methods = await accountStore.getAuthMethods(account.id);
    if (methods.password) {
      if (parsed.data.password === undefined) {
        return reply.code(400).send({ code: "PASSWORD_REQUIRED" });
      }
      const verified = await accountStore.authenticate(account.email, parsed.data.password);
      if (verified?.id !== account.id) {
        return reply.code(403).send({ code: "INVALID_PASSWORD", message: "Password is invalid." });
      }
    } else if (parsed.data.confirmation !== "DELETE") {
      return reply.code(400).send({ code: "DELETE_CONFIRMATION_REQUIRED" });
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

  app.post("/admin/auth/login", async (request, reply) => {
    if (!adminStore.enabled) {
      return reply.code(503).send({ code: "DATABASE_DISABLED" });
    }
    const parsed = authSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.code(400).send({ code: "INVALID_REQUEST", details: parsed.error.flatten() });
    }
    const admin = await adminStore.authenticate(parsed.data.email, parsed.data.password);
    if (admin === null) {
      return reply.code(401).send({ code: "INVALID_CREDENTIALS" });
    }
    const sessionId = await adminStore.rotateSession(admin.id);
    if (sessionId === null) return reply.code(500).send({ code: "SESSION_CREATE_FAILED" });
    return {
      token: createAdminToken(admin.id, sessionId, authSecret, 60 * 60 * 12),
      admin,
    };
  });

  app.get("/admin/auth/me", async (request, reply) => {
    const admin = await authenticateAdmin(bearerToken(request.headers.authorization));
    if (admin === null) return reply.code(401).send({ code: "UNAUTHORIZED" });
    return { admin };
  });

  app.get("/admin/catalog", async (request, reply) => {
    const admin = await authenticateAdmin(bearerToken(request.headers.authorization));
    if (admin === null) return reply.code(401).send({ code: "UNAUTHORIZED" });
    return { catalog: await adminStore.listCatalog() };
  });

  app.get("/admin/coupons", async (request, reply) => {
    const admin = await authenticateAdmin(bearerToken(request.headers.authorization));
    if (admin === null) return reply.code(401).send({ code: "UNAUTHORIZED" });
    return { coupons: await adminStore.listCoupons() };
  });

  app.post("/admin/coupons", async (request, reply) => {
    const admin = await authenticateAdmin(bearerToken(request.headers.authorization));
    if (admin === null) return reply.code(401).send({ code: "UNAUTHORIZED" });
    const parsed = couponInputSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.code(400).send({ code: "INVALID_REQUEST", details: parsed.error.flatten() });
    }
    try {
      return reply.code(201).send({ coupon: await adminStore.createCoupon(admin.id, parsed.data) });
    } catch (error) {
      app.log.warn({ err: error }, "Coupon creation failed");
      return reply.code(409).send({ code: "COUPON_CODE_EXISTS" });
    }
  });

  app.put("/admin/coupons/:couponId", async (request, reply) => {
    const admin = await authenticateAdmin(bearerToken(request.headers.authorization));
    if (admin === null) return reply.code(401).send({ code: "UNAUTHORIZED" });
    const params = couponIdParamsSchema.safeParse(request.params);
    const body = couponInputSchema.safeParse(request.body ?? {});
    if (!params.success || !body.success) return reply.code(400).send({ code: "INVALID_REQUEST" });
    try {
      const coupon = await adminStore.updateCoupon(admin.id, params.data.couponId, body.data);
      return coupon === null
        ? reply.code(404).send({ code: "COUPON_NOT_FOUND" })
        : { coupon };
    } catch (error) {
      app.log.warn({ err: error }, "Coupon update failed");
      return reply.code(409).send({ code: "COUPON_UPDATE_CONFLICT" });
    }
  });

  app.delete("/admin/coupons/:couponId", async (request, reply) => {
    const admin = await authenticateAdmin(bearerToken(request.headers.authorization));
    if (admin === null) return reply.code(401).send({ code: "UNAUTHORIZED" });
    const params = couponIdParamsSchema.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ code: "INVALID_REQUEST" });
    return (await adminStore.deleteCoupon(admin.id, params.data.couponId))
      ? reply.code(204).send()
      : reply.code(404).send({ code: "COUPON_NOT_FOUND" });
  });

  app.get("/admin/users", async (request, reply) => {
    const admin = await authenticateAdmin(bearerToken(request.headers.authorization));
    if (admin === null) return reply.code(401).send({ code: "UNAUTHORIZED" });
    const parsed = z.object({
      query: z.string().trim().max(120).default(""),
      limit: z.coerce.number().int().min(1).max(100).default(50),
    }).safeParse(request.query ?? {});
    if (!parsed.success) return reply.code(400).send({ code: "INVALID_REQUEST" });
    return { users: await adminStore.listUsers(parsed.data.query, parsed.data.limit) };
  });

  app.post("/admin/users/:accountId/chips", async (request, reply) => {
    const admin = await authenticateAdmin(bearerToken(request.headers.authorization));
    if (admin === null) return reply.code(401).send({ code: "UNAUTHORIZED" });
    const params = accountIdParamsSchema.safeParse(request.params);
    const body = z.object({
      delta: z.number().int().min(-1_000_000).max(1_000_000).refine((value) => value !== 0),
      reason: z.string().trim().min(2).max(200),
    }).safeParse(request.body ?? {});
    if (!params.success || !body.success) return reply.code(400).send({ code: "INVALID_REQUEST" });
    try {
      const user = await adminStore.adjustUserChips(
        admin.id,
        params.data.accountId,
        body.data.delta,
        body.data.reason,
      );
      return user === null ? reply.code(404).send({ code: "PROFILE_NOT_FOUND" }) : { user };
    } catch {
      return reply.code(409).send({ code: "ADMIN_CHIP_ADJUSTMENT_FAILED" });
    }
  });

  app.post("/admin/users/:accountId/cosmetics", async (request, reply) => {
    const admin = await authenticateAdmin(bearerToken(request.headers.authorization));
    if (admin === null) return reply.code(401).send({ code: "UNAUTHORIZED" });
    const params = accountIdParamsSchema.safeParse(request.params);
    const body = z.object({
      cosmeticId: z.string().trim().min(1).max(80),
      reason: z.string().trim().min(2).max(200),
    }).safeParse(request.body ?? {});
    if (!params.success || !body.success) return reply.code(400).send({ code: "INVALID_REQUEST" });
    const granted = await adminStore.grantUserCosmetic(
      admin.id,
      params.data.accountId,
      body.data.cosmeticId,
      body.data.reason,
    );
    return { granted };
  });

  app.post("/admin/users/:accountId/cosmetics/batch", async (request, reply) => {
    const admin = await authenticateAdmin(bearerToken(request.headers.authorization));
    if (admin === null) return reply.code(401).send({ code: "UNAUTHORIZED" });
    const params = accountIdParamsSchema.safeParse(request.params);
    const body = z.object({
      cosmeticIds: z.array(z.string().trim().min(1).max(80)).min(1).max(100).optional(),
      rarity: z.enum(["common", "rare", "epic", "legendary"]).optional(),
      reason: z.string().trim().min(2).max(200),
    }).refine((value) => value.rarity !== undefined || value.cosmeticIds !== undefined, {
      message: "A rarity or cosmeticIds selection is required.",
    }).safeParse(request.body ?? {});
    if (!params.success || !body.success) return reply.code(400).send({ code: "INVALID_REQUEST" });
    const selection: { cosmeticIds?: string[]; rarity?: CosmeticRarity } = {};
    if (body.data.cosmeticIds !== undefined) selection.cosmeticIds = body.data.cosmeticIds;
    if (body.data.rarity !== undefined) selection.rarity = body.data.rarity;
    return {
      granted: await adminStore.grantUserCosmetics(
        admin.id,
        params.data.accountId,
        selection,
        body.data.reason,
      ),
    };
  });

  app.put("/admin/users/:accountId/suspension", async (request, reply) => {
    const admin = await authenticateAdmin(bearerToken(request.headers.authorization));
    if (admin === null) return reply.code(401).send({ code: "UNAUTHORIZED" });
    const params = accountIdParamsSchema.safeParse(request.params);
    const body = z.object({
      suspended: z.boolean(),
      reason: z.string().trim().max(200).default(""),
    }).safeParse(request.body ?? {});
    if (!params.success || !body.success) return reply.code(400).send({ code: "INVALID_REQUEST" });
    const updated = await adminStore.setUserSuspension(
      admin.id,
      params.data.accountId,
      body.data.suspended,
      body.data.reason,
    );
    return updated ? { updated: true } : reply.code(404).send({ code: "PROFILE_NOT_FOUND" });
  });

  app.get("/admin/audit", async (request, reply) => {
    const admin = await authenticateAdmin(bearerToken(request.headers.authorization));
    if (admin === null) return reply.code(401).send({ code: "UNAUTHORIZED" });
    const parsed = z.object({
      limit: z.coerce.number().int().min(1).max(200).default(100),
    }).safeParse(request.query ?? {});
    if (!parsed.success) return reply.code(400).send({ code: "INVALID_REQUEST" });
    return { entries: await adminStore.listAudit(parsed.data.limit) };
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
    const query = z.object({
      limit: z.coerce.number().int().min(1).max(100).default(20),
      offset: z.coerce.number().int().min(0).max(10_000).default(0),
      mode: z.enum(["casual", "ranked"]).nullable().optional(),
    }).parse(request.query);
    return {
      matches: await accountStore.getMatchHistory(
        params.accountId,
        query.limit,
        query.mode ?? null,
        query.offset,
      ),
    };
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

  app.post("/coupons/redeem", async (request, reply) => {
    const account = await authenticateToken(bearerToken(request.headers.authorization));
    if (account === null) return reply.code(401).send({ code: "UNAUTHORIZED" });
    if (!adminStore.enabled || !economyStore.enabled) {
      return reply.code(503).send({ code: "DATABASE_DISABLED" });
    }
    const parsed = z.object({
      code: z.string().trim().min(3).max(40),
    }).safeParse(request.body ?? {});
    if (!parsed.success) return reply.code(400).send({ code: "INVALID_REQUEST" });
    try {
      return {
        redemption: await adminStore.redeemCoupon(account.id, parsed.data.code),
        economy: await economyStore.getOverview(account.id, account.attendanceStreak),
      };
    } catch (error) {
      const code = error instanceof Error ? error.message : "COUPON_REDEEM_FAILED";
      const status = code === "COUPON_NOT_FOUND" ? 404
        : code === "COUPON_ALREADY_REDEEMED"
          || code === "COUPON_EXPIRED"
          || code === "COUPON_INACTIVE"
          || code === "COUPON_NOT_STARTED"
          || code === "COUPON_LIMIT_REACHED"
          ? 409
          : 500;
      return reply.code(status).send({ code });
    }
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

  app.post("/economy/quests/progress/:quest/claim", async (request, reply) => {
    const account = await authenticateToken(bearerToken(request.headers.authorization));
    if (account === null || !economyStore.enabled) {
      return reply.code(401).send({ code: "UNAUTHORIZED" });
    }
    const params = progressQuestParamsSchema.safeParse(request.params);
    const body = economyTimeZoneSchema.safeParse(request.body ?? {});
    if (!params.success || !body.success) {
      return reply.code(400).send({ code: "INVALID_REQUEST" });
    }
    const questKey = params.data.quest.replaceAll("-", "_") as
      | "daily_complete"
      | "weekly_attendance"
      | "weekly_matches"
      | "weekly_wins"
      | "weekly_complete";
    try {
      return {
        economy: await economyStore.claimProgressQuest(
          account.id,
          questKey,
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
    const parsed = boxOpenSchema.merge(economyTimeZoneSchema).safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.code(400).send({ code: "INVALID_REQUEST" });
    }
    try {
      return {
        outcome: await economyStore.openBox(
          account.id,
          parsed.data.category as CraftCategory,
          account.attendanceStreak,
        ),
      };
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
          parsed.data.category as CraftCategory,
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

  app.post("/economy/mixer/open", async (request, reply) => {
    const account = await authenticateToken(bearerToken(request.headers.authorization));
    if (account === null || !economyStore.enabled) {
      return reply.code(401).send({ code: "UNAUTHORIZED", message: "Sign in is required." });
    }
    const parsed = boxOpenSchema.merge(economyTimeZoneSchema).safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.code(400).send({ code: "INVALID_REQUEST" });
    }
    try {
      return {
        outcome: await economyStore.openBox(
          account.id,
          parsed.data.category as CraftCategory,
          account.attendanceStreak,
        ),
      };
    } catch (error) {
      const mapped = economyErrorStatus(error);
      return reply.code(mapped.status).send({ code: mapped.code });
    }
  });

  app.post("/economy/atelier/craft", async (request, reply) => {
    const account = await authenticateToken(bearerToken(request.headers.authorization));
    if (account === null || !economyStore.enabled) {
      return reply.code(401).send({ code: "UNAUTHORIZED", message: "Sign in is required." });
    }
    const parsed = atelierCraftSchema.merge(economyTimeZoneSchema).safeParse(request.body ?? {});
    if (!parsed.success) return reply.code(400).send({ code: "INVALID_REQUEST" });
    try {
      return {
        outcome: await economyStore.craftCosmetic(
          account.id,
          parsed.data.mode,
          parsed.data.category as CraftCategory,
          parsed.data.rarity as CosmeticRarity,
          parsed.data.cosmeticId,
          account.attendanceStreak,
        ),
      };
    } catch (error) {
      const mapped = economyErrorStatus(error);
      return reply.code(mapped.status).send({ code: mapped.code });
    }
  });

  app.put("/economy/loadout/style/:slot", async (request, reply) => {
    const account = await authenticateToken(bearerToken(request.headers.authorization));
    if (account === null || !economyStore.enabled) {
      return reply.code(401).send({ code: "UNAUTHORIZED", message: "Sign in is required." });
    }
    const params = styleLoadoutParamsSchema.safeParse(request.params);
    const body = styleEquipSchema.merge(economyTimeZoneSchema).safeParse(request.body ?? {});
    if (!params.success || !body.success) return reply.code(400).send({ code: "INVALID_REQUEST" });
    try {
      return {
        economy: await economyStore.equipStyleCosmetic(
          account.id,
          params.data.slot as StyleLoadoutSlot,
          body.data.cosmeticId,
          account.attendanceStreak,
        ),
      };
    } catch (error) {
      const mapped = economyErrorStatus(error);
      return reply.code(mapped.status).send({ code: mapped.code });
    }
  });

  app.put("/economy/wishlist/:cosmeticId", async (request, reply) => {
    const account = await authenticateToken(bearerToken(request.headers.authorization));
    if (account === null || !economyStore.enabled) {
      return reply.code(401).send({ code: "UNAUTHORIZED", message: "Sign in is required." });
    }
    const params = cosmeticIdSchema.safeParse(request.params);
    const body = wishlistSchema.merge(economyTimeZoneSchema).safeParse(request.body ?? {});
    if (!params.success || !body.success) return reply.code(400).send({ code: "INVALID_REQUEST" });
    try {
      return {
        economy: await economyStore.setWishlist(
          account.id,
          params.data.cosmeticId,
          body.data.wished,
          account.attendanceStreak,
        ),
      };
    } catch (error) {
      const mapped = economyErrorStatus(error);
      return reply.code(mapped.status).send({ code: mapped.code });
    }
  });

  app.put("/economy/loadout/tiles", async (request, reply) => {
    const account = await authenticateToken(bearerToken(request.headers.authorization));
    if (account === null || !economyStore.enabled) {
      return reply.code(401).send({ code: "UNAUTHORIZED", message: "Sign in is required." });
    }
    const parsed = tileBatchEquipSchema.merge(economyTimeZoneSchema).safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.code(400).send({ code: "INVALID_REQUEST" });
    }
    try {
      return {
        economy: await economyStore.equipTileLoadout(
          account.id,
          normalizeTileLoadout(parsed.data.loadout),
          parsed.data.allowSimilar,
          account.attendanceStreak,
        ),
      };
    } catch (error) {
      if (error instanceof TileColorSimilarityError) {
        return reply.code(409).send({ code: error.code, conflicts: error.conflicts });
      }
      const mapped = economyErrorStatus(error);
      return reply.code(mapped.status).send({ code: mapped.code });
    }
  });

  app.put("/economy/tile-palettes/:slotIndex", async (request, reply) => {
    const account = await authenticateToken(bearerToken(request.headers.authorization));
    if (account === null || !economyStore.enabled) {
      return reply.code(401).send({ code: "UNAUTHORIZED", message: "Sign in is required." });
    }
    const params = tilePaletteParamsSchema.safeParse(request.params);
    const body = tilePaletteSaveSchema.merge(economyTimeZoneSchema).safeParse(request.body ?? {});
    if (!params.success || !body.success) {
      return reply.code(400).send({ code: "INVALID_REQUEST" });
    }
    try {
      return {
        economy: await economyStore.saveTilePalette(
          account.id,
          params.data.slotIndex,
          body.data.name,
          normalizeTileLoadout(body.data.loadout),
          body.data.allowSimilar,
          account.attendanceStreak,
        ),
      };
    } catch (error) {
      if (error instanceof TileColorSimilarityError) {
        return reply.code(409).send({ code: error.code, conflicts: error.conflicts });
      }
      const mapped = economyErrorStatus(error);
      return reply.code(mapped.status).send({ code: mapped.code });
    }
  });

  app.delete("/economy/tile-palettes/:slotIndex", async (request, reply) => {
    const account = await authenticateToken(bearerToken(request.headers.authorization));
    if (account === null || !economyStore.enabled) {
      return reply.code(401).send({ code: "UNAUTHORIZED", message: "Sign in is required." });
    }
    const params = tilePaletteParamsSchema.safeParse(request.params);
    const body = economyTimeZoneSchema.safeParse(request.body ?? {});
    if (!params.success || !body.success) {
      return reply.code(400).send({ code: "INVALID_REQUEST" });
    }
    try {
      return {
        economy: await economyStore.deleteTilePalette(
          account.id,
          params.data.slotIndex,
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
          await accountProfile(
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

    socket.on("room:join", async (payload, callback?: (response: unknown) => void) => {
      const parsed = roomJoinSchema.safeParse(payload ?? {});
      if (!parsed.success) {
        callback?.({ ok: false, error: parsed.error.flatten() });
        return;
      }

      const player = playerProfileSchema.parse(parsed.data.player ?? {});
      const result = roomService.joinRoom(parsed.data.code, {
        ...await accountProfile(
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

    socket.on("game:rematch:request", (payload, callback?: (response: unknown) => void) => {
      const parsed = gameRematchSchema.safeParse(payload ?? {});
      if (!parsed.success) {
        callback?.({ ok: false, error: parsed.error.flatten() });
        return;
      }
      if (rejectPlayerMismatch(parsed.data.playerId, callback)) return;
      const result = roomService.requestRematch(parsed.data.code, parsed.data.playerId);
      if (!result.ok) {
        callback?.({ ok: false, error: toClientError(result.error) });
        return;
      }
      persistRoomLater(result.value, "Failed to persist rematch state");
      io.to(result.value.code).emit("game:state", result.value);
      callback?.({ ok: true, room: result.value });
    });

    socket.on("game:rematch:decline", (payload, callback?: (response: unknown) => void) => {
      const parsed = gameRematchSchema.safeParse(payload ?? {});
      if (!parsed.success) {
        callback?.({ ok: false, error: parsed.error.flatten() });
        return;
      }
      if (rejectPlayerMismatch(parsed.data.playerId, callback)) return;
      const result = roomService.declineRematch(parsed.data.code, parsed.data.playerId);
      if (!result.ok) {
        callback?.({ ok: false, error: toClientError(result.error) });
        return;
      }
      persistRoomLater(result.value, "Failed to persist declined rematch");
      io.to(result.value.code).emit("game:state", result.value);
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
          profile: await accountProfile(
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
    for (const room of roomService.expireRematchRequests()) {
      persistRoomLater(room, "Failed to persist expired rematch");
      io.to(room.code).emit("game:state", room);
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
    await adminStore.close();
    await analyticsStore.close();
    await matchmakingWaitStore.close();
  });

  return { app, io, roomService };
};
