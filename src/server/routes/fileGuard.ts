import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth.js';
import { fileGuard } from '../services/fileGuard.js';

const router = Router();
router.use(authenticate);

// ============================================
// Get File Guard Audit Log
// ============================================

router.get('/audit', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { taskId, filePath, limit } = req.query;

    const logs = await fileGuard.getAuditLog({
      userId: req.user!.id,
      taskId: taskId as string,
      filePath: filePath as string,
      limit: limit ? Number(limit) : 50,
    });

    res.json({ success: true, data: { logs } });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Get Violation Statistics
// ============================================

router.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await fileGuard.getViolationStats(req.user!.id);
    res.json({ success: true, data: { stats } });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Manual Read Registration (for external tools)
// ============================================

router.post('/read', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { filePath, content, taskId, projectId, repositoryId } = req.body;

    await fileGuard.recordRead({
      userId: req.user!.id,
      filePath,
      content,
      taskId,
      projectId,
      repositoryId,
    });

    res.json({ success: true, message: 'File read registered' });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Check Write Permission
// ============================================

router.post('/check-write', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { filePath, taskId } = req.body;

    const allowed = await fileGuard.checkWritePermission({
      userId: req.user!.id,
      filePath,
      taskId,
    });

    res.json({ success: true, data: { allowed } });
  } catch (error) {
    next(error);
  }
});

export default router;
