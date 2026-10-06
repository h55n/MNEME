import { describe, it, expect } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { uuid_ossp } from '@electric-sql/pglite/contrib/uuid_ossp';
import { vector } from '@electric-sql/pglite-pgvector';
import { readdir, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { splitStatements } from '../db/split-sql.js';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'db', 'migrations');

describe('SQL migrations (real Postgres engine with pgvector)', () => {
  it('apply in order, and leave 384-dim vectors with a working HNSW index', async () => {
    const db = new PGlite({ extensions: { vector, uuid_ossp } });
    const files = (await readdir(dir)).filter(f => f.endsWith('.sql')).sort();
    expect(files[0]).toBe('0001_init.sql');
    // Run each file the way migrate.ts does: one statement at a time.
    for (const f of files) {
      for (const stmt of splitStatements(await readFile(join(dir, f), 'utf8'))) await db.query(stmt);
    }

    const cols = await db.query<{ column_name: string }>(
      "SELECT column_name FROM information_schema.columns WHERE table_name='memories' AND column_name IN ('embedding','embedder_id')");
    expect(cols.rows.map(r => r.column_name).sort()).toEqual(['embedder_id', 'embedding']);

    const idx = await db.query<{ indexdef: string }>(
      "SELECT indexdef FROM pg_indexes WHERE indexname='memories_embedding_idx'");
    expect(idx.rows[0].indexdef).toContain('hnsw');

    const v = (n: number) => `[${Array.from({ length: 384 }, (_, i) => (i === n ? 1 : 0)).join(',')}]`;
    await expect(db.query(`SELECT '${v(0)}'::vector(384) <=> '${v(1)}'::vector(384) AS d`)).resolves.toBeTruthy();
    await expect(db.query("SELECT '[1,2,3]'::vector(384)")).rejects.toThrow();
  }, 120_000);
});

describe('splitStatements', () => {
  it('ignores semicolons inside comments', () => {
    expect(splitStatements('-- a; b\nSELECT 1;\n-- c; d\nSELECT 2;')).toEqual(['SELECT 1', 'SELECT 2']);
  });
  it('keeps $$ bodies whole and handles a missing final semicolon', () => {
    const fn = 'CREATE FUNCTION f() RETURNS int AS $$ BEGIN RETURN 1; END; $$ LANGUAGE plpgsql';
    expect(splitStatements(`${fn};\nSELECT 1`)).toEqual([fn, 'SELECT 1']);
  });
});
