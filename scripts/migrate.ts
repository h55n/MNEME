#!/usr/bin/env tsx
/**
 * MNEME Database Migration Runner
 *
 * Applies all SQL migration files in apps/api/src/db/migrations/ in numeric order.
 * Tracks applied migrations in a `schema_migrations` table (idempotent — safe to re-run).
 *
 * Usage:
 *   npx tsx scripts/migrate.ts
 *   npm run db:migrate:run --workspace=apps/api
 */

import 'dotenv/config';
import { readdir, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import postgres from 'postgres';

const __dirname = dirname(fileURLToPath(import.meta.url));

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌  DATABASE_URL is not set. Cannot run migrations.');
  process.exit(1);
}

const MIGRATIONS_DIR = join(__dirname, '../apps/api/src/db/migrations');

// ── Bootstrap ─────────────────────────────────────────────────────────────────

async function main() {
  const sql = postgres(DATABASE_URL!, { max: 1, onnotice: () => {} });

  try {
    // Ensure tracking table exists
    await sql`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename   TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    // Read all .sql files in numeric order
    const files = (await readdir(MIGRATIONS_DIR))
      .filter(f => f.endsWith('.sql'))
      .sort(); // 0001_init.sql, 0002_classifier_recall.sql, ...

    console.log(`\n[MNEME Migrate] Found ${files.length} migration file(s) in ${MIGRATIONS_DIR}\n`);

    let applied = 0;
    let skipped = 0;

    for (const filename of files) {
      // Check if already applied
      const [row] = await sql`
        SELECT filename FROM schema_migrations WHERE filename = ${filename}
      `;

      if (row) {
        console.log(`  ⏭  ${filename} — already applied`);
        skipped++;
        continue;
      }

      // Read and execute
      const filepath = join(MIGRATIONS_DIR, filename);
      const sqlContent = await readFile(filepath, 'utf-8');

      console.log(`  ⬆  ${filename} — applying...`);

      // Run migration in a transaction
      await sql.begin(async (tx) => {
        // Split on semicolons to handle multi-statement migrations
        // Filter empty statements
        const statements = sqlContent
          .split(';')
          .map(s => {
            return s.split('\n').filter(line => !line.trim().startsWith('--')).join('\n').trim();
          })
          .filter(s => s.length > 0);

        for (const statement of statements) {
          await tx.unsafe(statement);
        }

        // Record as applied
        await tx`
          INSERT INTO schema_migrations (filename) VALUES (${filename})
        `;
      });

      console.log(`  ✓  ${filename} — applied`);
      applied++;
    }

    console.log(`\n[MNEME Migrate] Done — ${applied} applied, ${skipped} skipped.\n`);

  } catch (err) {
    console.error('\n❌  Migration failed:\n', err);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
