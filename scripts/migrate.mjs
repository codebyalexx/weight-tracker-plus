/**
 * Lightweight migration runner — no Prisma CLI required at runtime.
 *
 * Reads every prisma/migrations/<name>/migration.sql in order, checks the
 * standard _prisma_migrations table, and applies any pending ones via the
 * pg driver (which supports multi-statement queries natively).
 */

import { createHash, randomUUID } from "crypto";
import { readFileSync, readdirSync, statSync } from "fs";
import { join, resolve, dirname } from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = resolve(__dirname, "../prisma/migrations");

async function main() {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    // Ensure the tracking table exists (safe to run every boot)
    await client.query(`
      CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
        "id"                  VARCHAR(36)  NOT NULL PRIMARY KEY,
        "checksum"            VARCHAR(64)  NOT NULL,
        "finished_at"         TIMESTAMPTZ,
        "migration_name"      VARCHAR(255) NOT NULL UNIQUE,
        "logs"                TEXT,
        "rolled_back_at"      TIMESTAMPTZ,
        "started_at"          TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "applied_steps_count" INTEGER      NOT NULL DEFAULT 0
      )
    `);

    const dirs = readdirSync(MIGRATIONS_DIR)
      .filter((name) => statSync(join(MIGRATIONS_DIR, name)).isDirectory())
      .sort();

    for (const name of dirs) {
      const sqlPath = join(MIGRATIONS_DIR, name, "migration.sql");

      let sql;
      try {
        sql = readFileSync(sqlPath, "utf-8");
      } catch {
        continue;
      }

      const { rows } = await client.query(
        `SELECT id FROM "_prisma_migrations" WHERE migration_name = $1`,
        [name]
      );

      if (rows.length > 0) {
        console.log(`  ✓ ${name} (already applied)`);
        continue;
      }

      console.log(`  → Applying ${name}…`);
      const checksum = createHash("sha256").update(sql).digest("hex").slice(0, 64);

      await client.query(sql);

      await client.query(
        `INSERT INTO "_prisma_migrations"
           (id, checksum, migration_name, finished_at, applied_steps_count)
         VALUES ($1, $2, $3, now(), 1)`,
        [randomUUID(), checksum, name]
      );

      console.log(`  ✓ ${name} applied`);
    }

    console.log("Migrations complete.");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
