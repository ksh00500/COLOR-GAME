import { createAdminStoreFromEnv } from "../admin-store.js";

const email = process.env.ADMIN_EMAIL?.trim();
const password = process.env.ADMIN_PASSWORD;

if (!email || !password) {
  console.error("ADMIN_EMAIL and ADMIN_PASSWORD are required.");
  process.exit(1);
}
if (password.length < 12) {
  console.error("ADMIN_PASSWORD must be at least 12 characters.");
  process.exit(1);
}

const store = createAdminStoreFromEnv();
if (!store.enabled) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

try {
  const admin = await store.upsertBootstrapAdmin(email, password);
  console.log(`Admin account ready: ${admin.email}`);
} finally {
  await store.close();
}
