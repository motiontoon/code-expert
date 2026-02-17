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
import { exec } from 'child_process';
import { promisify } from 'util';

import { env } from './config/env.js';
import { connectDatabase } from './config/database.js';
import { logger } from './utils/logger.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { codingEngine } from './services/codingEngine.js';

const execAsync = promisify(exec);

// Routes
import authRoutes from './routes/auth.js';
import projectRoutes from './routes/projects.js';
import taskRoutes from './routes/tasks.js';
import githubRoutes from './routes/github.js';
import fileGuardRoutes from './routes/fileGuard.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let dbReady = false;
let dbError: string | null = null;

const app = express();
const httpServer = createServer(app);

// Trust Railway/Render reverse proxy (required for secure cookies over HTTPS)
app.set('trust proxy', 1);

// ============================================
// Socket.IO
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
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMIT', message: 'Too many requests' } },
}));

// ============================================
// Health check - ALWAYS responds, no DB dependency
// ============================================
app.get('/api/health', (_req, res) => {
  const dbHost = (() => {
    try { return new URL(process.env.DATABASE_URL || '').hostname; } catch { return 'not-set'; }
  })();
  res.json({
    success: true,
    data: {
      status: dbReady ? 'healthy' : (dbError ? 'db_error' : 'starting'),
      dbReady,
      dbHost,
      dbError,
      version: '1.0.0',
      uptime: process.uptime(),
    },
  });
});

// ============================================
// DB readiness guard - returns clear error if DB not ready
// ============================================
app.use('/api', (req, res, next) => {
  if (req.path === '/health') return next();
  if (!dbReady) {
    res.status(503).json({
      success: false,
      error: {
        code: 'DB_NOT_READY',
        message: dbError
          ? `Database error: ${dbError}`
          : 'Server is starting up, please try again in a few seconds',
      },
    });
    return;
  }
  next();
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
// Start listening IMMEDIATELY - no blocking
// ============================================
httpServer.listen(env.PORT, () => {
  logger.info(`Server listening on port ${env.PORT}`);

  // Database init runs in the background AFTER listen
  // Uses only async operations - never blocks the event loop
  initDatabase();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down...');
  codingEngine.stop();
  httpServer.close();
  process.exit(0);
});
process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down...');
  codingEngine.stop();
  httpServer.close();
  process.exit(0);
});

/**
 * Initialize database in the background:
 * 1. Push schema (creates/updates tables) - async, non-blocking
 * 2. Connect Prisma client
 * 3. Start coding engine
 * NEVER blocks the event loop. NEVER kills the process on failure.
 */
async function initDatabase(): Promise<void> {
  try {
    // Step 1: Push schema to create/update tables
    logger.info('Pushing database schema...');
    try {
      const { stdout, stderr } = await execAsync(
        'npx prisma db push --skip-generate --accept-data-loss',
        { timeout: 30000 },
      );
      if (stdout) logger.info(`Schema push output: ${stdout.trim()}`);
      if (stderr) logger.warn(`Schema push stderr: ${stderr.trim()}`);
      logger.info('Database schema pushed successfully');
    } catch (pushErr) {
      const msg = pushErr instanceof Error ? pushErr.message : String(pushErr);
      logger.warn(`Schema push warning (tables may already exist): ${msg}`);
      // Don't throw - tables might already exist from a previous deployment
    }

    // Step 2: Connect Prisma client
    await connectDatabase();
    dbReady = true;

    // Step 3: Start coding engine
    codingEngine.start();
    logger.info(`
╔══════════════════════════════════════════════════╗
║          CODEX FORGE v1.0.0                      ║
║     AI-Powered Coding Automation - READY         ║
║  Port:    ${String(env.PORT).padEnd(38)}║
║  Env:     ${env.NODE_ENV.padEnd(38)}║
║  DB:      connected                              ║
╚══════════════════════════════════════════════════╝
    `);
  } catch (err) {
    dbError = err instanceof Error ? err.message : String(err);
    logger.error('Database init failed. Server running but DB-dependent routes will fail:', err);
    // DO NOT process.exit() - keep serving healthcheck and static files
  }
}
