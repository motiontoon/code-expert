import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
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

async function bootstrap() {
  const app = express();
  const httpServer = createServer(app);

  // ============================================
  // Socket.IO for real-time task updates
  // ============================================
  const io = new SocketServer(httpServer, {
    cors: {
      origin: env.CLIENT_URL,
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

  // Make io available to routes
  app.set('io', io);

  // ============================================
  // Middleware
  // ============================================
  app.use(helmet({
    contentSecurityPolicy: env.NODE_ENV === 'production' ? undefined : false,
  }));
  app.use(compression());
  app.use(cors({
    origin: env.NODE_ENV === 'production' ? env.SERVER_URL : [env.CLIENT_URL, env.SERVER_URL],
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
  // API Routes
  // ============================================
  app.use('/api/auth', authRoutes);
  app.use('/api/projects', projectRoutes);
  app.use('/api/tasks', taskRoutes);
  app.use('/api/github', githubRoutes);
  app.use('/api/file-guard', fileGuardRoutes);

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({
      success: true,
      data: {
        status: 'healthy',
        version: '1.0.0',
        engine: codingEngine.getStatus(),
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      },
    });
  });

  // ============================================
  // Static files (production)
  // ============================================
  if (env.NODE_ENV === 'production') {
    const clientPath = path.resolve(__dirname, '../../dist/client');
    app.use(express.static(clientPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(clientPath, 'index.html'));
    });
  }

  // ============================================
  // Error handling
  // ============================================
  app.use(notFoundHandler);
  app.use(errorHandler);

  // ============================================
  // Start
  // ============================================
  await connectDatabase();

  // Start coding engine
  codingEngine.start();

  httpServer.listen(env.PORT, () => {
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
  });

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

bootstrap().catch((err) => {
  logger.error('Failed to start server:', err);
  process.exit(1);
});
