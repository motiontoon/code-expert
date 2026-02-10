import { prisma } from '../config/database.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { fileGuard } from './fileGuard.js';
import { githubService } from './githubService.js';

/**
 * Coding Engine - The AI-Powered Autonomous Coding Agent
 * ========================================================
 * Processes coding tasks 24/7 using an AI model.
 * Enforces the File Guard policy: always read before write.
 *
 * Task lifecycle:
 * 1. QUEUED    → Task is waiting in the queue
 * 2. READING   → Agent is reading and analyzing existing code
 * 3. CODING    → Agent is writing code changes
 * 4. TESTING   → Agent is running tests
 * 5. REVIEWING → Agent is reviewing its own changes
 * 6. COMPLETED → Task finished successfully
 * 7. FAILED    → Task encountered an unrecoverable error
 */

export interface TaskContext {
  taskId: string;
  userId: string;
  repositoryOwner: string;
  repositoryName: string;
  branch: string;
  targetBranch: string;
}

export interface CodingStep {
  action: 'read' | 'analyze' | 'plan' | 'write' | 'test' | 'commit' | 'push';
  description: string;
  filePath?: string;
  content?: string;
}

export class CodingEngine {
  private activeTaskCount = 0;
  private maxConcurrentTasks = 3;
  private isRunning = false;
  private pollInterval: ReturnType<typeof setInterval> | null = null;

  /**
   * Start the engine - begins polling for queued tasks
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('Coding engine is already running');
      return;
    }

    this.isRunning = true;
    logger.info('Coding Engine started - polling for tasks...');

    // Poll every 5 seconds
    this.pollInterval = setInterval(() => this.pollForTasks(), 5000);
    this.pollForTasks(); // Run immediately
  }

  /**
   * Stop the engine gracefully
   */
  stop(): void {
    this.isRunning = false;
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    logger.info('Coding Engine stopped');
  }

  /**
   * Poll for new tasks in the queue
   */
  private async pollForTasks(): Promise<void> {
    if (this.activeTaskCount >= this.maxConcurrentTasks) return;

    try {
      const tasks = await prisma.codingTask.findMany({
        where: { status: 'queued' },
        orderBy: [
          { priority: 'asc' }, // critical < high < medium < low
          { createdAt: 'asc' },
        ],
        take: this.maxConcurrentTasks - this.activeTaskCount,
      });

      for (const task of tasks) {
        this.processTask(task.id).catch((err) => {
          logger.error(`Task ${task.id} processing failed:`, err);
        });
      }
    } catch (error) {
      logger.error('Error polling for tasks:', error);
    }
  }

  /**
   * Process a single coding task through its lifecycle
   */
  async processTask(taskId: string): Promise<void> {
    this.activeTaskCount++;
    const startTime = Date.now();

    try {
      // Mark as started
      const task = await prisma.codingTask.update({
        where: { id: taskId },
        data: {
          status: 'reading',
          startedAt: new Date(),
        },
        include: {
          repository: true,
          project: true,
        },
      });

      logger.info(`Processing task ${taskId}: "${task.title}" [${task.taskType}]`);

      // Step 1: READING - Analyze the repository and understand context
      await this.executeStep(taskId, 1, 'read', 'Reading repository structure and relevant files');
      await this.updateStatus(taskId, 'reading');

      if (task.repository) {
        // Read repo tree to understand structure
        const tree = await githubService.getTree(
          task.userId,
          task.repository.owner,
          task.repository.name,
          task.branch || task.repository.defaultBranch,
        );

        // Record all file reads through File Guard
        const relevantFiles = this.identifyRelevantFiles(tree.tree, task.description);
        for (const file of relevantFiles.slice(0, 20)) {
          try {
            const content = await githubService.getFileContent(
              task.userId,
              task.repository.owner,
              task.repository.name,
              file.path!,
              task.branch || undefined,
            );
            if (content.type === 'file') {
              await fileGuard.recordRead({
                userId: task.userId,
                filePath: file.path!,
                content: content.content,
                taskId,
                projectId: task.projectId || undefined,
                repositoryId: task.repositoryId || undefined,
              });
            }
          } catch (err) {
            logger.debug(`Skipping unreadable file: ${file.path}`);
          }
        }
      }

      // Step 2: CODING - Generate code changes
      await this.executeStep(taskId, 2, 'analyze', 'Analyzing task requirements and planning changes');
      await this.updateStatus(taskId, 'coding');

      // Step 3: Plan the changes
      await this.executeStep(taskId, 3, 'plan', 'Creating implementation plan');

      // Step 4: Write code (File Guard enforced)
      await this.executeStep(taskId, 4, 'write', 'Writing code changes with File Guard enforcement');

      // Step 5: TESTING
      await this.executeStep(taskId, 5, 'test', 'Running tests and validation');
      await this.updateStatus(taskId, 'testing');

      // Step 6: REVIEWING
      await this.executeStep(taskId, 6, 'commit', 'Reviewing and committing changes');
      await this.updateStatus(taskId, 'reviewing');

      // Step 7: Complete
      const duration = Date.now() - startTime;
      await prisma.codingTask.update({
        where: { id: taskId },
        data: {
          status: 'completed',
          completedAt: new Date(),
        },
      });

      // Clean up File Guard session
      fileGuard.clearSession(task.userId, taskId);

      logger.info(`Task ${taskId} completed in ${(duration / 1000).toFixed(1)}s`);

      // Send notification
      await prisma.notification.create({
        data: {
          userId: task.userId,
          type: 'task_completed',
          title: 'Task Completed',
          message: `"${task.title}" has been completed successfully.`,
          data: JSON.stringify({ taskId, duration }),
        },
      });
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Task ${taskId} failed:`, error);

      const task = await prisma.codingTask.findUnique({ where: { id: taskId } });

      // Check if we should retry
      if (task && task.retryCount < task.maxRetries) {
        await prisma.codingTask.update({
          where: { id: taskId },
          data: {
            status: 'queued',
            retryCount: { increment: 1 },
            errorMessage: errMsg,
          },
        });
        logger.info(`Task ${taskId} re-queued for retry (${task.retryCount + 1}/${task.maxRetries})`);
      } else {
        await prisma.codingTask.update({
          where: { id: taskId },
          data: {
            status: 'failed',
            failedAt: new Date(),
            errorMessage: errMsg,
          },
        });

        if (task) {
          await prisma.notification.create({
            data: {
              userId: task.userId,
              type: 'task_failed',
              title: 'Task Failed',
              message: `"${task.title}" failed: ${errMsg}`,
              data: JSON.stringify({ taskId, error: errMsg }),
            },
          });
        }
      }
    } finally {
      this.activeTaskCount--;
    }
  }

  private identifyRelevantFiles(
    tree: Array<{ path?: string; type?: string }>,
    description: string,
  ): Array<{ path?: string }> {
    const codeExtensions = ['.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.rs', '.java', '.rb', '.vue', '.svelte'];
    const configFiles = ['package.json', 'tsconfig.json', 'Cargo.toml', 'go.mod', 'requirements.txt', 'Gemfile'];
    const keywords = description.toLowerCase().split(/\s+/);

    return tree
      .filter((item) => {
        if (!item.path || item.type !== 'blob') return false;
        const isCode = codeExtensions.some((ext) => item.path!.endsWith(ext));
        const isConfig = configFiles.some((cfg) => item.path!.endsWith(cfg));
        const matchesKeyword = keywords.some((kw) => item.path!.toLowerCase().includes(kw));
        return isConfig || (isCode && matchesKeyword) || (isCode && !item.path!.includes('node_modules'));
      })
      .slice(0, 50);
  }

  private async executeStep(
    taskId: string,
    stepNumber: number,
    action: string,
    description: string,
  ): Promise<void> {
    const step = await prisma.taskStep.create({
      data: {
        taskId,
        stepNumber,
        action,
        description,
        status: 'in_progress',
        startedAt: new Date(),
      },
    });

    // Simulate step execution time for now
    // In production, this calls the AI API
    await new Promise((resolve) => setTimeout(resolve, 100));

    await prisma.taskStep.update({
      where: { id: step.id },
      data: {
        status: 'completed',
        completedAt: new Date(),
        duration: 100,
      },
    });
  }

  private async updateStatus(taskId: string, status: string): Promise<void> {
    await prisma.codingTask.update({
      where: { id: taskId },
      data: { status },
    });
  }

  /**
   * Get engine status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      activeTasks: this.activeTaskCount,
      maxConcurrent: this.maxConcurrentTasks,
    };
  }
}

export const codingEngine = new CodingEngine();
