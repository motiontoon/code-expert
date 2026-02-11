import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import { NotFoundError, ForbiddenError } from '../utils/errors.js';

const router = Router();
router.use(authenticate);

// ============================================
// Create Project
// ============================================

const createProjectSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100),
    description: z.string().max(1000).optional(),
    language: z.string().max(50).optional(),
    framework: z.string().max(50).optional(),
  }),
});

router.post('/', validate(createProjectSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description, language, framework } = req.body;

    const project = await prisma.project.create({
      data: {
        userId: req.user!.id,
        name,
        description,
        language,
        framework,
      },
    });

    res.status(201).json({ success: true, data: { project } });
  } catch (error) {
    next(error);
  }
});

// ============================================
// List Projects
// ============================================

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projects = await prisma.project.findMany({
      where: { userId: req.user!.id, status: { not: 'deleted' } },
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: { select: { tasks: true, repositories: true } },
      },
    });

    res.json({ success: true, data: { projects } });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Get Project
// ============================================

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        repositories: { select: { id: true, fullName: true, language: true } },
        tasks: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: { id: true, title: true, status: true, taskType: true, createdAt: true },
        },
        _count: { select: { tasks: true, repositories: true, fileAudits: true } },
      },
    });

    if (!project) throw new NotFoundError('Project not found');
    if (project.userId !== req.user!.id) throw new ForbiddenError();

    res.json({ success: true, data: { project } });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Update Project
// ============================================

const updateProjectSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(1000).optional(),
    language: z.string().max(50).optional(),
    framework: z.string().max(50).optional(),
    status: z.enum(['active', 'archived']).optional(),
  }),
});

router.patch('/:id', validate(updateProjectSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const project = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!project) throw new NotFoundError('Project not found');
    if (project.userId !== req.user!.id) throw new ForbiddenError();

    const { name, description, language, framework, status } = req.body;

    const updated = await prisma.project.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(language !== undefined && { language }),
        ...(framework !== undefined && { framework }),
        ...(status !== undefined && { status }),
      },
    });

    res.json({ success: true, data: { project: updated } });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Delete Project (soft delete)
// ============================================

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const project = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!project) throw new NotFoundError('Project not found');
    if (project.userId !== req.user!.id) throw new ForbiddenError();

    await prisma.project.update({
      where: { id: req.params.id },
      data: { status: 'deleted' },
    });

    res.json({ success: true, message: 'Project deleted' });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Link Repository to Project
// ============================================

router.post('/:id/repositories', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const project = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!project) throw new NotFoundError('Project not found');
    if (project.userId !== req.user!.id) throw new ForbiddenError();

    const { repositoryId } = req.body;

    await prisma.repository.update({
      where: { id: repositoryId },
      data: { projectId: project.id },
    });

    res.json({ success: true, message: 'Repository linked to project' });
  } catch (error) {
    next(error);
  }
});

export default router;
