import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';

/**
 * Build the database URL with appropriate SSL settings.
 * - Railway internal (.railway.internal) or local: sslmode=disable
 * - Railway proxy / external: no sslmode (Prisma uses SSL by default)
 * - If connection fails, adds connect_timeout for faster retries
 */
export function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL || '';
  if (!url) {
    logger.warn('DATABASE_URL is not set!');
    return url;
  }

  logger.info(`Database host: ${(() => { try { return new URL(url).hostname; } catch { return 'parse-error'; } })()}`);

  if (url.includes('sslmode=')) return url;

  try {
    const host = new URL(url).hostname;
    const isLocal =
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host.endsWith('.railway.internal') ||
      !host.includes('.');
    if (isLocal) {
      const sep = url.includes('?') ? '&' : '?';
      return `${url}${sep}sslmode=disable&connect_timeout=10`;
    }
  } catch {
    // leave as-is
  }

  // External connection: add connect_timeout only
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}connect_timeout=10`;
}

const resolvedUrl = getDatabaseUrl();

const prisma = new PrismaClient({
  datasources: {
    db: { url: resolvedUrl },
  },
  log: [
    { emit: 'event', level: 'error' },
    { emit: 'event', level: 'warn' },
  ],
});

prisma.$on('error', (e) => {
  logger.error('Prisma error:', e);
});

prisma.$on('warn', (e) => {
  logger.warn('Prisma warning:', e);
});

export { prisma };

export async function connectDatabase(retries = 5, delay = 2000): Promise<void> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await prisma.$connect();
      logger.info('Database connected successfully');
      return;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error(`DB connection attempt ${attempt}/${retries} failed: ${msg}`);
      if (attempt === retries) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay = Math.min(delay * 2, 10000);
    }
  }
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  logger.info('Database disconnected');
}
