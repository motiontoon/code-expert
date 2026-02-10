import crypto from 'crypto';
import { prisma } from '../config/database.js';
import { env } from '../config/env.js';
import { FileGuardError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

/**
 * File Guard Service
 * ===================
 * Enforces the read-before-write policy:
 * Every file MUST be read before it can be modified.
 * This prevents blind overwrites and ensures the AI agent
 * always understands existing code before changing it.
 */

interface FileReadRecord {
  filePath: string;
  readAt: Date;
  contentHash: string;
}

// In-memory cache for file reads during a task session
const readCache = new Map<string, Map<string, FileReadRecord>>();

function getCacheKey(userId: string, taskId?: string): string {
  return taskId ? `${userId}:${taskId}` : userId;
}

function hashContent(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

export class FileGuardService {
  /**
   * Record that a file has been read.
   * Must be called before any write operation on the same file.
   */
  async recordRead(params: {
    userId: string;
    filePath: string;
    content: string;
    taskId?: string;
    projectId?: string;
    repositoryId?: string;
  }): Promise<void> {
    const { userId, filePath, content, taskId, projectId, repositoryId } = params;
    const cacheKey = getCacheKey(userId, taskId);
    const contentHash = hashContent(content);

    // Update in-memory cache
    if (!readCache.has(cacheKey)) {
      readCache.set(cacheKey, new Map());
    }
    readCache.get(cacheKey)!.set(filePath, {
      filePath,
      readAt: new Date(),
      contentHash,
    });

    // Persist audit log
    await prisma.fileAuditLog.create({
      data: {
        userId,
        projectId,
        repositoryId,
        taskId,
        filePath,
        action: 'read',
        wasReadFirst: true,
        readAt: new Date(),
        guardPassed: true,
        contentBefore: contentHash,
        guardMessage: 'File read recorded successfully',
      },
    });

    logger.debug(`FileGuard: Read recorded for "${filePath}" [task: ${taskId || 'none'}]`);
  }

  /**
   * Check if a file can be written to.
   * Returns true if the file was read first, throws FileGuardError otherwise.
   */
  async checkWritePermission(params: {
    userId: string;
    filePath: string;
    taskId?: string;
  }): Promise<boolean> {
    if (!env.FILE_GUARD_ENABLED) {
      return true;
    }

    const { userId, filePath, taskId } = params;
    const cacheKey = getCacheKey(userId, taskId);

    // Check in-memory cache first (fast path)
    const sessionReads = readCache.get(cacheKey);
    if (sessionReads?.has(filePath)) {
      return true;
    }

    // Check database for recent reads (within last hour)
    const recentRead = await prisma.fileAuditLog.findFirst({
      where: {
        userId,
        filePath,
        action: 'read',
        taskId: taskId || undefined,
        createdAt: { gte: new Date(Date.now() - 3600000) },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (recentRead) {
      return true;
    }

    // In strict mode, always throw
    if (env.FILE_GUARD_STRICT_MODE) {
      logger.warn(`FileGuard VIOLATION: Attempted write to "${filePath}" without reading first [user: ${userId}]`);

      // Log the violation
      await prisma.fileAuditLog.create({
        data: {
          userId,
          taskId,
          filePath,
          action: 'write',
          wasReadFirst: false,
          guardPassed: false,
          guardMessage: 'VIOLATION: Write attempted without prior read',
        },
      });

      throw new FileGuardError(filePath);
    }

    // Non-strict mode: log warning but allow
    logger.warn(`FileGuard WARNING: Write to "${filePath}" without reading first (non-strict mode) [user: ${userId}]`);
    return true;
  }

  /**
   * Record a write operation after guard check passes.
   */
  async recordWrite(params: {
    userId: string;
    filePath: string;
    newContent: string;
    taskId?: string;
    projectId?: string;
    repositoryId?: string;
  }): Promise<void> {
    const { userId, filePath, newContent, taskId, projectId, repositoryId } = params;
    const cacheKey = getCacheKey(userId, taskId);
    const contentHash = hashContent(newContent);

    // Get the read record for diff tracking
    const readRecord = readCache.get(cacheKey)?.get(filePath);

    await prisma.fileAuditLog.create({
      data: {
        userId,
        projectId,
        repositoryId,
        taskId,
        filePath,
        action: 'write',
        wasReadFirst: !!readRecord,
        readAt: readRecord?.readAt,
        writeAt: new Date(),
        guardPassed: true,
        contentBefore: readRecord?.contentHash,
        contentAfter: contentHash,
        guardMessage: 'Write operation completed after read verification',
      },
    });

    logger.debug(`FileGuard: Write recorded for "${filePath}" [task: ${taskId || 'none'}]`);
  }

  /**
   * Perform a guarded write: checks read first, then records write.
   */
  async guardedWrite(params: {
    userId: string;
    filePath: string;
    newContent: string;
    taskId?: string;
    projectId?: string;
    repositoryId?: string;
  }): Promise<void> {
    // Step 1: Check write permission (throws if file wasn't read)
    await this.checkWritePermission({
      userId: params.userId,
      filePath: params.filePath,
      taskId: params.taskId,
    });

    // Step 2: Record the write
    await this.recordWrite(params);
  }

  /**
   * Clear the read cache for a task session (call when task completes)
   */
  clearSession(userId: string, taskId?: string): void {
    const cacheKey = getCacheKey(userId, taskId);
    readCache.delete(cacheKey);
    logger.debug(`FileGuard: Session cache cleared [key: ${cacheKey}]`);
  }

  /**
   * Get audit history for a file or user
   */
  async getAuditLog(params: {
    userId?: string;
    taskId?: string;
    filePath?: string;
    limit?: number;
  }) {
    return prisma.fileAuditLog.findMany({
      where: {
        userId: params.userId,
        taskId: params.taskId || undefined,
        filePath: params.filePath,
      },
      orderBy: { createdAt: 'desc' },
      take: params.limit || 50,
    });
  }

  /**
   * Get violation statistics
   */
  async getViolationStats(userId: string) {
    const total = await prisma.fileAuditLog.count({
      where: { userId, action: 'write' },
    });
    const violations = await prisma.fileAuditLog.count({
      where: { userId, action: 'write', guardPassed: false },
    });
    const passed = total - violations;

    return {
      totalWrites: total,
      passed,
      violations,
      complianceRate: total > 0 ? ((passed / total) * 100).toFixed(1) : '100.0',
    };
  }
}

export const fileGuard = new FileGuardService();
