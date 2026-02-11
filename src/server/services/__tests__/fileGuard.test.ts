import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FileGuardService } from '../fileGuard.js';

vi.mock('../../config/database.js', () => ({
  prisma: {
    fileAuditLog: {
      create: vi.fn().mockResolvedValue({}),
      findFirst: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
    },
  },
}));

vi.mock('../../config/env.js', () => ({
  env: {
    FILE_GUARD_ENABLED: true,
    FILE_GUARD_STRICT_MODE: true,
  },
}));

vi.mock('../../utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('FileGuardService', () => {
  let guard: FileGuardService;

  beforeEach(async () => {
    guard = new FileGuardService();
    vi.clearAllMocks();
    const { prisma } = await import('../../config/database.js');
    (prisma.fileAuditLog.create as ReturnType<typeof vi.fn>).mockResolvedValue({});
    (prisma.fileAuditLog.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (prisma.fileAuditLog.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);
  });

  describe('recordRead', () => {
    it('creates an audit log entry for file reads', async () => {
      const { prisma } = await import('../../config/database.js');

      await guard.recordRead({
        userId: 'user-1',
        filePath: 'src/index.ts',
        content: 'console.log("hello")',
      });

      expect(prisma.fileAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          filePath: 'src/index.ts',
          action: 'read',
          wasReadFirst: true,
          guardPassed: true,
        }),
      });
    });
  });

  describe('checkWritePermission', () => {
    it('allows write after read in same session', async () => {
      await guard.recordRead({
        userId: 'user-1',
        filePath: 'src/index.ts',
        content: 'hello',
        taskId: 'task-1',
      });

      const allowed = await guard.checkWritePermission({
        userId: 'user-1',
        filePath: 'src/index.ts',
        taskId: 'task-1',
      });

      expect(allowed).toBe(true);
    });

    it('throws FileGuardError for write without read in strict mode', async () => {
      await expect(
        guard.checkWritePermission({
          userId: 'user-2',
          filePath: 'src/new-file.ts',
          taskId: 'task-2',
        }),
      ).rejects.toThrow();
    });
  });

  describe('guardedWrite', () => {
    it('allows guarded write after read', async () => {
      await guard.recordRead({
        userId: 'user-1',
        filePath: 'src/test.ts',
        content: 'old content',
        taskId: 'task-1',
      });

      await expect(
        guard.guardedWrite({
          userId: 'user-1',
          filePath: 'src/test.ts',
          newContent: 'new content',
          taskId: 'task-1',
        }),
      ).resolves.not.toThrow();
    });
  });

  describe('clearSession', () => {
    it('clears the read cache for a session', async () => {
      await guard.recordRead({
        userId: 'user-1',
        filePath: 'src/test.ts',
        content: 'content',
        taskId: 'task-1',
      });

      guard.clearSession('user-1', 'task-1');

      await expect(
        guard.checkWritePermission({
          userId: 'user-1',
          filePath: 'src/test.ts',
          taskId: 'task-1',
        }),
      ).rejects.toThrow();
    });
  });

  describe('getViolationStats', () => {
    it('returns stats with zero violations', async () => {
      const { prisma } = await import('../../config/database.js');
      (prisma.fileAuditLog.count as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(10) // total writes
        .mockResolvedValueOnce(0); // violations

      const stats = await guard.getViolationStats('user-1');

      expect(stats).toEqual({
        totalWrites: 10,
        passed: 10,
        violations: 0,
        complianceRate: '100.0',
      });
    });
  });
});
