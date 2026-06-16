import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Pool, type PoolConfig } from "pg";

const connectionString = process.env.DATABASE_URL;
if (connectionString === undefined || connectionString.trim() === "") {
  throw new Error("DATABASE_URL is required to run migrations.");
}

const config: PoolConfig = { connectionString };
if (process.env.DATABASE_SSL === "true") {
  config.ssl = { rejectUnauthorized: false };
}

const pool = new Pool(config);
const currentDir = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(currentDir, "..", "..", "db", "migrations");

const ensureMigrationTable = async (): Promise<void> => {
  await pool.query(`
    create table if not exists schema_migrations (
      id text primary key,
      applied_at timestamptz not null default now()
    )
  `);
};

try {
  await ensureMigrationTable();
  const files = (await readdir(migrationsDir))
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const applied = await pool.query(
      "select 1 from schema_migrations where id = $1",
      [file],
    );
    if (applied.rowCount !== null && applied.rowCount > 0) {
      console.log(`Skipping ${file}`);
      continue;
    }

    const sql = await readFile(join(migrationsDir, file), "utf8");
    const client = await pool.connect();
    try {
      await client.query("begin");
      await client.query(sql);
      await client.query(
        "insert into schema_migrations (id) values ($1)",
        [file],
      );
      await client.query("commit");
      console.log(`Applied ${file}`);
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }
} finally {
  await pool.end();
}
