import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';

// Railway internal connections don't use SSL.
// If DATABASE_URL has no sslmode param, default to disable for Railway/Docker.
function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL || '';
  if (url && !url.includes('sslmode=')) {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}sslmode=disable`;
  }
  return url;
}

// Override before PrismaClient reads it
const resolvedUrl = getDatabaseUrl();
process.env.DATABASE_URL = resolvedUrl;
logger.info(`Database URL resolved (sslmode=${resolvedUrl.includes('sslmode=') ? resolvedUrl.match(/sslmode=(\w+)/)?.[1] : 'default'})`);

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

export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    logger.info('Database connected successfully');
  } catch (error) {
    logger.error('Failed to connect to database:', error);
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  logger.info('Database disconnected');
}
