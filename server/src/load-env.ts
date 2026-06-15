import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as dotenvConfig } from 'dotenv';

/** Repo root (household-budget/), one level above server/. */
export function getRepoRoot(): string {
  const serverDir = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '..',
  );
  return path.resolve(serverDir, '..');
}

/**
 * Load .env from the repo root (and server/). npm workspaces run scripts with
 * cwd = server/, so dotenv/config alone never sees the root .env file.
 */
export function loadEnvFiles(): void {
  const root = getRepoRoot();
  const serverDir = path.join(root, 'server');

  const pairs: Array<{ path: string; override: boolean }> = [
    { path: path.join(root, '.env'), override: false },
    { path: path.join(root, '.env.local'), override: true },
    { path: path.join(serverDir, '.env'), override: true },
    { path: path.join(serverDir, '.env.local'), override: true },
  ];

  for (const { path: file, override } of pairs) {
    if (existsSync(file)) {
      dotenvConfig({ path: file, override });
    }
  }

  // Build DATABASE_URL from POSTGRES_* when only split vars are set
  if (!process.env.DATABASE_URL?.trim()) {
    const password = process.env.DB_PASSWORD;
    if (password) {
      const user = process.env.POSTGRES_USER ?? 'app';
      const host = process.env.POSTGRES_HOST ?? 'localhost';
      const port = process.env.POSTGRES_PORT ?? '5432';
      const db = process.env.POSTGRES_DB ?? 'household_budget';
      process.env.DATABASE_URL = `postgres://${user}:${encodeURIComponent(password)}@${host}:${port}/${db}`;
    }
  }
}

// Side effect on import — must run before config validation
loadEnvFiles();
