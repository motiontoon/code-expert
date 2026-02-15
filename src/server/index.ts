import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

import { env } from './config/env.js';
import { connectDatabase } from './config/database.js';
import { logger } from './utils/logger.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { codingEngine } from './services/codingEngine.js';

// Routes
import authRoutes from './routes/auth.js';
import projectRoutes from './routes/projects.js';
import taskRoutes from './routes/tasks.js';
import githubRoutes from './routes/github.js';
import fileGuardRoutes from './routes/fileGuard.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Track database readiness
let dbReady = false;

async function bootstrap() {
  const app = express();
  const httpServer = createServer(app);

  // ============================================
  // Socket.IO for real-time task updates
  // ============================================
  const io = new SocketServer(httpServer, {
    cors: {
      origin: [env.SERVER_URL, env.CLIENT_URL].filter(Boolean),
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    logger.debug(`WebSocket connected: ${socket.id}`);

    socket.on('subscribe:tasks', (userId: string) => {
      socket.join(`user:${userId}`);
    });

    socket.on('disconnect', () => {
      logger.debug(`WebSocket disconnected: ${socket.id}`);
    });
  });

  // Make io available to routes and coding engine
  app.set('io', io);
  codingEngine.setIO(io);

  // ============================================
  // Middleware
  // ============================================
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:", "blob:"],
        connectSrc: ["'self'", "wss:", "ws:"],
      },
    },
  }));
  app.use(compression());
  app.use(cors({
    origin: env.NODE_ENV === 'production'
      ? [env.SERVER_URL, env.CLIENT_URL].filter(Boolean)
      : [env.CLIENT_URL, env.SERVER_URL],
    credentials: true,
  }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(morgan('short', {
    stream: { write: (msg: string) => logger.http(msg.trim()) },
  }));

  // Rate limiting
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: { code: 'RATE_LIMIT', message: 'Too many requests' } },
  });
  app.use('/api/', apiLimiter);

  // ============================================
  // Health check (always responds, even before DB is ready)
  // ============================================
  app.get('/api/health', (_req, res) => {
    res.json({
      success: true,
      data: {
        status: dbReady ? 'healthy' : 'starting',
        dbReady,
        version: '1.0.0',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      },
    });
  });

  // ============================================
  // API Routes
  // ============================================
  app.use('/api/auth', authRoutes);
  app.use('/api/projects', projectRoutes);
  app.use('/api/tasks', taskRoutes);
  app.use('/api/github', githubRoutes);
  app.use('/api/file-guard', fileGuardRoutes);

  // ============================================
  // Error handling (API only)
  // ============================================
  app.use('/api', notFoundHandler);
  app.use(errorHandler);

  // ============================================
  // Static files & SPA fallback
  // ============================================
  const clientPath = path.resolve(__dirname, '../client');
  app.use(express.static(clientPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientPath, 'index.html'));
  });

  // ============================================
  // Start listening FIRST (so healthcheck passes immediately)
  // ============================================
  await new Promise<void>((resolve) => {
    httpServer.listen(env.PORT, () => {
      logger.info(`Server listening on port ${env.PORT}`);
      resolve();
    });
  });

  // ============================================
  // Database setup (AFTER server is listening)
  // ============================================
  try {
    // Run prisma db push to sync schema
    logger.info('Running database schema sync...');
    runDbPush();
    logger.info('Database schema synced');
  } catch (err) {
    logger.error('Database schema sync failed (will retry on connect):', err);
  }

  await connectDatabase();
  dbReady = true;

  // Start coding engine
  codingEngine.start();

  logger.info(`
╔══════════════════════════════════════════════════╗
║                                                  ║
║          ⚡ CODEX FORGE v1.0.0 ⚡               ║
║     Advanced AI-Powered Coding Automation        ║
║                                                  ║
║  Server:  ${env.SERVER_URL.padEnd(38)}║
║  Client:  ${env.CLIENT_URL.padEnd(38)}║
║  Engine:  ${codingEngine.getStatus().isRunning ? 'RUNNING ✓' : 'STOPPED ✗'}${''.padEnd(29)}║
║  Env:     ${env.NODE_ENV.padEnd(38)}║
║                                                  ║
╚══════════════════════════════════════════════════╝
  `);

  // Graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down gracefully...');
    codingEngine.stop();
    httpServer.close();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

/**
 * Run prisma db push inline (no separate process needed).
 * Adds sslmode=disable only for local/internal connections.
 */
function runDbPush(): void {
  const url = process.env.DATABASE_URL || '';
  const execEnv = { ...process.env };

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
        execEnv.DATABASE_URL = `${url}${sep}sslmode=disable`;
      }
    } catch {
      // leave URL as-is
    }
  }

  execSync('npx prisma db push --skip-generate --accept-data-loss', {
    stdio: 'inherit',
    env: execEnv,
    timeout: 30000, // 30s max
  });
}

bootstrap().catch((err) => {
  logger.error('Failed to start server:', err);
  process.exit(1);
});
