import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import pg from 'pg';
import { config } from '../config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.resolve(__dirname, '../../../db/migrations');

export async function runMigrations(connectionString = config.DATABASE_URL) {
  const pool = new pg.Pool({ connectionString, max: 1 });
  const client = await pool.connect();

  try {
    await client.query(`
      CREATE SCHEMA IF NOT EXISTS app;
      CREATE TABLE IF NOT EXISTS app.schema_migrations (
        filename text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    const files = (await readdir(MIGRATIONS_DIR))
      .filter((f) => f.endsWith('.sql'))
      .sort();

    const { rows: appliedRows } = await client.query<{ filename: string }>(
      'SELECT filename FROM app.schema_migrations',
    );
    const applied = new Set(appliedRows.map((r) => r.filename));

    for (const file of files) {
      if (applied.has(file)) {
        console.log(`[migrate] skip ${file}`);
        continue;
      }

      const sql = await readFile(path.join(MIGRATIONS_DIR, file), 'utf8');
      console.log(`[migrate] apply ${file}`);
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO app.schema_migrations (filename) VALUES ($1)',
          [file],
        );
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }
    }

    console.log('[migrate] done');
  } finally {
    client.release();
    await pool.end();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((err: unknown) => {
      const pgErr = err as { code?: string; message?: string };
      if (pgErr.code === '28000' || pgErr.message?.includes('does not exist')) {
        console.error('[migrate] failed:', pgErr.message);
        console.error('');
        console.error('  El usuario de Postgres en DATABASE_URL no existe.');
        console.error('  Sin Docker, ejecuta:  npm run db:setup-local');
        console.error('  Con Docker:           docker compose up -d db');
      } else if (pgErr.code === 'ECONNREFUSED') {
        console.error('[migrate] failed: no hay Postgres en localhost.');
        console.error('  brew services start postgresql@16');
        console.error('  o: docker compose up -d db');
      } else {
        console.error('[migrate] failed', err);
      }
      process.exit(1);
    });
}
