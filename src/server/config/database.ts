import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';

// Only add sslmode=disable for local/Docker connections (localhost, 127.0.0.1,
// Docker service names, or Railway internal network). External Railway URLs go
// through a TLS-terminating proxy and MUST use SSL (Prisma's default).
function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL || '';
  if (!url || url.includes('sslmode=')) return url;

  try {
    const parsed = new URL(url);
    const host = parsed.hostname;
    const isLocal =
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host.endsWith('.railway.internal') ||
      // Docker service names (no dots = not a real hostname)
      !host.includes('.');
    if (isLocal) {
      const separator = url.includes('?') ? '&' : '?';
      return `${url}${separator}sslmode=disable`;
    }
  } catch {
    // If URL parsing fails, don't modify it
  }
  return url;
}

// Override before PrismaClient reads it
const resolvedUrl = getDatabaseUrl();

const prisma = new PrismaClient({
  datasources: {
    db: { url: resolvedUrl },
  },
  log: [
    { emit: 'event', level: 'query' },
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

export async function connectDatabase(retries = 5, delay = 3000): Promise<void> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await prisma.$connect();
      logger.info('Database connected successfully');
      return;
    } catch (error) {
      logger.error(`Database connection attempt ${attempt}/${retries} failed:`, error);
      if (attempt === retries) {
        throw error;
      }
      logger.info(`Retrying in ${delay / 1000}s...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2; // exponential backoff
    }
  }
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  logger.info('Database disconnected');
}
