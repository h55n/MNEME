/**
 * MNEME Database Migration Runner
 *
 * Applies all SQL migration files in the migrations directory in numeric order.
 * Tracks applied migrations in a `schema_migrations` table — fully idempotent,
 * safe to run on every container start.
 *
 * This file lives in apps/api/src/ so it compiles to apps/api/dist/migrate.js
 * and is executed by the Docker entrypoint before the API process starts.
 */

import 'dotenv/config';
import { readdir, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import postgres from 'postgres';

// In compiled ESM output this resolves correctly
const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌  DATABASE_URL is not set. Cannot run migrations.');
  process.exit(1);
}

// migrations/ lives next to migrate.js after compilation
const MIGRATIONS_DIR = join(__dirname, 'db', 'migrations');

async function main() {
  const sql = postgres(DATABASE_URL!, {
    max: 1,
    onnotice: () => {}, // suppress NOTICE messages
    connect_timeout: 30,
  });

  try {
    // Ensure tracking table exists (idempotent)
    await sql`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename   TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    // Discover migrations in sort order: 0001_init.sql, 0002_*, ...
    let files: string[] = [];
    try {
      files = (await readdir(MIGRATIONS_DIR))
        .filter(f => f.endsWith('.sql'))
        .sort();
    } catch {
      console.warn(`[migrate] No migrations directory found at ${MIGRATIONS_DIR} — skipping`);
      return;
    }

    if (files.length === 0) {
      console.log('[migrate] No migration files found — nothing to do.');
      return;
    }

    console.log(`[migrate] Found ${files.length} migration file(s)`);

    let applied = 0;
    let skipped = 0;

    for (const filename of files) {
      // Check if already applied
      const [row] = await sql`
        SELECT filename FROM schema_migrations WHERE filename = ${filename}
      `;

      if (row) {
        console.log(`[migrate] ⏭  ${filename} — already applied`);
        skipped++;
        continue;
      }

      const filepath = join(MIGRATIONS_DIR, filename);
      const sqlContent = await readFile(filepath, 'utf-8');

      console.log(`[migrate] ⬆  ${filename} — applying...`);

      // Run in a transaction so a partial failure doesn't corrupt state
      await sql.begin(async (tx) => {
        // Execute each non-empty statement individually
        const statements = sqlContent
          .split(';')
          .map(s => {
            return s.split('\n').filter(line => !line.trim().startsWith('--')).join('\n').trim();
          })
          .filter(s => s.length > 0);

        for (const statement of statements) {
          await tx.unsafe(statement);
        }

        // Record as successfully applied
        await tx`
          INSERT INTO schema_migrations (filename) VALUES (${filename})
          ON CONFLICT (filename) DO NOTHING
        `;
      });

      console.log(`[migrate] ✓  ${filename} — applied`);
      applied++;
    }

    console.log(`[migrate] Done — ${applied} applied, ${skipped} already up to date.`);

  } catch (err) {
    console.error('[migrate] ❌  Migration failed:', err);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
