#!/usr/bin/env node
/**
 * Wrapper for `prisma db push` with retry logic and SSL handling.
 * Adds sslmode=disable ONLY for local/Docker/internal connections.
 * External Railway URLs go through a TLS proxy and must NOT have sslmode=disable.
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

const MAX_RETRIES = 5;
const INITIAL_DELAY = 3000;

for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
  try {
    console.log(`[db-push] Attempt ${attempt}/${MAX_RETRIES}...`);
    execSync('npx prisma db push --skip-generate', {
      stdio: 'inherit',
      env: process.env,
    });
    console.log('[db-push] Schema pushed successfully');
    process.exit(0);
  } catch (err) {
    console.error(`[db-push] Attempt ${attempt} failed:`, err.message);
    if (attempt === MAX_RETRIES) {
      console.error('[db-push] All retries exhausted, exiting');
      process.exit(1);
    }
    const delay = INITIAL_DELAY * Math.pow(2, attempt - 1);
    console.log(`[db-push] Retrying in ${delay / 1000}s...`);
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
}
