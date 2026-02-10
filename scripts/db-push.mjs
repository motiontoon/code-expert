#!/usr/bin/env node
/**
 * Wrapper for `prisma db push` that ensures sslmode=disable
 * for Railway/Docker internal PostgreSQL connections.
 *
 * Prisma CLI reads DATABASE_URL directly from the environment,
 * so the runtime fix in src/server/config/database.ts doesn't apply.
 */
import { execSync } from 'child_process';

const url = process.env.DATABASE_URL || '';
if (url && !url.includes('sslmode=')) {
  const sep = url.includes('?') ? '&' : '?';
  process.env.DATABASE_URL = `${url}${sep}sslmode=disable`;
}

execSync('npx prisma db push --skip-generate', {
  stdio: 'inherit',
  env: process.env,
});
