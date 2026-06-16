import { createGameHistoryStoreFromEnv } from "../history-store.js";

const store = createGameHistoryStoreFromEnv();

try {
  const health = await store.health();
  console.log(JSON.stringify(health, null, 2));
  if (!health.ok) {
    process.exitCode = 1;
  }
} finally {
  await store.close();
}
