import { createAccountStoreFromEnv } from "./auth-store.js";
import { createAnalyticsStoreFromEnv } from "./analytics-store.js";
import { GameRoomService } from "./game-room-service.js";
import { createGameHistoryStoreFromEnv } from "./history-store.js";
import { createServer, type ServerOptions } from "./server.js";

const port = Number.parseInt(process.env.PORT ?? "8080", 10);
const host = process.env.HOST ?? "0.0.0.0";
const corsOrigin = process.env.CORS_ORIGIN?.split(",").map((origin) => origin.trim());
const databaseRequired = process.env.DATABASE_REQUIRED === "true";
const authSecret = process.env.AUTH_SECRET
  ?? (process.env.NODE_ENV === "production" ? undefined : "dev-only-color-game-secret-for-local-development");
const requireDatabaseHealth =
  databaseRequired || process.env.HEALTHCHECK_REQUIRE_DB === "true";
const historyStore = createGameHistoryStoreFromEnv();
const accountStore = createAccountStoreFromEnv();
const analyticsStore = createAnalyticsStoreFromEnv();

if (databaseRequired && !historyStore.enabled) {
  console.error("DATABASE_REQUIRED=true but DATABASE_URL is not set.");
  process.exit(1);
}

if (authSecret === undefined || authSecret.length < 32) {
  console.error("AUTH_SECRET must be at least 32 characters in production.");
  process.exit(1);
}

const roomService = new GameRoomService();
const serverOptions: ServerOptions = {
  roomService,
  historyStore,
  accountStore,
  analyticsStore,
  authSecret,
  requireDatabaseHealth,
};

if (corsOrigin !== undefined) {
  serverOptions.corsOrigin = corsOrigin;
}

const { app } = createServer(serverOptions);

try {
  const restoredRooms = await historyStore.loadActiveRooms();
  for (const room of restoredRooms) {
    roomService.restoreRoom(room);
  }
  if (restoredRooms.length > 0) {
    app.log.info({ count: restoredRooms.length }, "Restored active rooms from database");
  }

  await app.listen({ port, host });
} catch (error) {
  app.log.error(error);
  await historyStore.close();
  await accountStore.close();
  await analyticsStore.close();
  process.exit(1);
}
