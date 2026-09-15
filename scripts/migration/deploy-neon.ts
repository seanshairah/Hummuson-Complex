/**
 * Applies prisma/migrations to a Neon database over the serverless driver
 * (WebSocket, port 443) — for environments where outbound Postgres (5432)
 * is blocked. Bookkeeping matches `prisma migrate deploy`: applied
 * migrations are recorded in _prisma_migrations with their sha256
 * checksums, so the standard CLI recognises them later.
 *
 *   DATABASE_URL=postgresql://…neon.tech/db npx tsx scripts/migration/deploy-neon.ts
 */
import { createHash, randomUUID } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { neonConfig, Pool } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const connectionString = process.env.DATABASE_URL;
if (!connectionString || !/neon\.tech/.test(connectionString)) {
  console.error("Set DATABASE_URL to the Neon connection string.");
  process.exit(1);
}

const MIGRATIONS_DIR = path.join(process.cwd(), "prisma", "migrations");

async function main() {
  const pool = new Pool({ connectionString });
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
      "id" VARCHAR(36) PRIMARY KEY,
      "checksum" VARCHAR(64) NOT NULL,
      "finished_at" TIMESTAMPTZ,
      "migration_name" VARCHAR(255) NOT NULL,
      "logs" TEXT,
      "rolled_back_at" TIMESTAMPTZ,
      "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "applied_steps_count" INTEGER NOT NULL DEFAULT 0
    )`);

    const applied = new Set(
      (await pool.query(`SELECT migration_name FROM "_prisma_migrations" WHERE rolled_back_at IS NULL`)).rows.map(
        (row: { migration_name: string }) => row.migration_name,
      ),
    );

    const folders = readdirSync(MIGRATIONS_DIR)
      .filter((name) => statSync(path.join(MIGRATIONS_DIR, name)).isDirectory())
      .sort();

    for (const name of folders) {
      if (applied.has(name)) {
        console.log(`↷ ${name} (already applied)`);
        continue;
      }
      const sql = readFileSync(path.join(MIGRATIONS_DIR, name, "migration.sql"), "utf8");
      const checksum = createHash("sha256").update(sql).digest("hex");
      console.log(`▶ applying ${name} …`);
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query(sql);
        await client.query(
          `INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, started_at, applied_steps_count)
           VALUES ($1, $2, now(), $3, now(), 1)`,
          [randomUUID(), checksum, name],
        );
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK").catch(() => {});
        throw error;
      } finally {
        client.release();
      }
      console.log(`✓ ${name}`);
    }
    console.log("── migrations up to date ──");
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
