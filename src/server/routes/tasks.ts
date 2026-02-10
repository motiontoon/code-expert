import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import { NotFoundError, ForbiddenError } from '../utils/errors.js';
import { codingEngine } from '../services/codingEngine.js';

const router = Router();
router.use(authenticate);

// ============================================
// Create Task
// ============================================

const createTaskSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(200),
    description: z.string().min(1).max(10000),
    taskType: z.enum(['feature', 'bugfix', 'refactor', 'test', 'docs', 'review', 'custom']),
    priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
    projectId: z.string().uuid().optional(),
    repositoryId: z.string().optional(),
    branch: z.string().optional(),
    targetBranch: z.string().optional(),
  }),
});

router.post('/', validate(createTaskSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, description, taskType, priority, projectId, repositoryId, branch, targetBranch } = req.body;

    const task = await prisma.codingTask.create({
      data: {
        userId: req.user!.id,
        title,
        description,
        taskType,
        priority,
        projectId,
        repositoryId,
        branch: branch || `codex-forge/${taskType}/${Date.now()}`,
        targetBranch: targetBranch || 'main',
        status: 'queued',
      },
      include: {
        repository: { select: { fullName: true, name: true, owner: true } },
        project: { select: { name: true } },
      },
    });

    res.status(201).json({ success: true, data: { task } });
  } catch (error) {
    next(error);
  }
});

// ============================================
// List Tasks
// ============================================

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, taskType, projectId, page = '1', limit = '20' } = req.query;

    const where: Record<string, unknown> = { userId: req.user!.id };
    if (status) where.status = status;
    if (taskType) where.taskType = taskType;
    if (projectId) where.projectId = projectId;

    const skip = (Number(page) - 1) * Number(limit);

    const [tasks, total] = await Promise.all([
      prisma.codingTask.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
        include: {
          repository: { select: { fullName: true, name: true } },
          project: { select: { name: true } },
          _count: { select: { steps: true } },
        },
      }),
      prisma.codingTask.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        tasks,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Get Task Details
// ============================================

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const task = await prisma.codingTask.findUnique({
      where: { id: req.params.id },
      include: {
        repository: true,
        project: true,
        steps: { orderBy: { stepNumber: 'asc' } },
      },
    });

    if (!task) throw new NotFoundError('Task not found');
    if (task.userId !== req.user!.id) throw new ForbiddenError();

    res.json({ success: true, data: { task } });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Cancel Task
// ============================================

router.post('/:id/cancel', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const task = await prisma.codingTask.findUnique({ where: { id: req.params.id } });
    if (!task) throw new NotFoundError('Task not found');
    if (task.userId !== req.user!.id) throw new ForbiddenError();

    if (['completed', 'failed', 'cancelled'].includes(task.status)) {
      res.json({ success: false, error: { message: 'Task is already in a terminal state' } });
      return;
    }

    const updated = await prisma.codingTask.update({
      where: { id: req.params.id },
      data: { status: 'cancelled' },
    });

    res.json({ success: true, data: { task: updated } });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Retry Failed Task
// ============================================

router.post('/:id/retry', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const task = await prisma.codingTask.findUnique({ where: { id: req.params.id } });
    if (!task) throw new NotFoundError('Task not found');
    if (task.userId !== req.user!.id) throw new ForbiddenError();

    if (task.status !== 'failed') {
      res.json({ success: false, error: { message: 'Only failed tasks can be retried' } });
      return;
    }

    const updated = await prisma.codingTask.update({
      where: { id: req.params.id },
      data: {
        status: 'queued',
        retryCount: 0,
        errorMessage: null,
        failedAt: null,
      },
    });

    res.json({ success: true, data: { task: updated } });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Task Statistics
// ============================================

router.get('/stats/overview', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    const [total, completed, failed, active, queued] = await Promise.all([
      prisma.codingTask.count({ where: { userId } }),
      prisma.codingTask.count({ where: { userId, status: 'completed' } }),
      prisma.codingTask.count({ where: { userId, status: 'failed' } }),
      prisma.codingTask.count({
        where: { userId, status: { in: ['reading', 'coding', 'testing', 'reviewing'] } },
      }),
      prisma.codingTask.count({ where: { userId, status: 'queued' } }),
    ]);

    res.json({
      success: true,
      data: {
        stats: { total, completed, failed, active, queued, successRate: total > 0 ? ((completed / total) * 100).toFixed(1) : '0' },
      },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Engine Status
// ============================================

router.get('/engine/status', async (_req: Request, res: Response) => {
  res.json({ success: true, data: { engine: codingEngine.getStatus() } });
});

export default router;
