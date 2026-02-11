#!/usr/bin/env node
/**
 * Wrapper for `prisma db push` that adds sslmode=disable ONLY for
 * local/Docker/internal connections. External Railway URLs go through
 * a TLS proxy and must NOT have sslmode=disable.
 */
import { execSync } from 'child_process';

const url = process.env.DATABASE_URL || '';
if (url && !url.includes('sslmode=')) {
  try {
    const host = new URL(url).hostname;
    const isLocal =
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host.endsWith('.railway.internal') ||
      !host.includes('.');
    if (isLocal) {
      const sep = url.includes('?') ? '&' : '?';
      process.env.DATABASE_URL = `${url}${sep}sslmode=disable`;
    }
  } catch {
    // leave URL as-is
  }
}

execSync('npx prisma db push --skip-generate', {
  stdio: 'inherit',
  env: process.env,
});
