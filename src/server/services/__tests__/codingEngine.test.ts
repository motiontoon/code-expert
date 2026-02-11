import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CodingEngine } from '../codingEngine.js';

// Mock all dependencies
vi.mock('../../config/database.js', () => ({
  prisma: {
    codingTask: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue({
        id: 'task-1',
        userId: 'user-1',
        title: 'Test task',
        description: 'Test description',
        taskType: 'feature',
        status: 'reading',
        repository: null,
        project: null,
        retryCount: 0,
        maxRetries: 3,
      }),
    },
    taskStep: {
      create: vi.fn().mockResolvedValue({ id: 'step-1' }),
      update: vi.fn().mockResolvedValue({}),
    },
    notification: {
      create: vi.fn().mockResolvedValue({}),
    },
  },
}));

vi.mock('../../config/env.js', () => ({
  env: {
    ANTHROPIC_API_KEY: '',
    AI_MODEL: 'claude-sonnet-4-5-20250929',
    AI_MAX_TOKENS: 4096,
    NODE_ENV: 'test',
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

vi.mock('../fileGuard.js', () => ({
  fileGuard: {
    recordRead: vi.fn().mockResolvedValue(undefined),
    guardedWrite: vi.fn().mockResolvedValue(undefined),
    clearSession: vi.fn(),
  },
}));

vi.mock('../githubService.js', () => ({
  githubService: {
    getTree: vi.fn().mockResolvedValue({ tree: [] }),
    getFileContent: vi.fn().mockResolvedValue({ type: 'file', content: '' }),
    createBranch: vi.fn().mockResolvedValue({}),
    writeFile: vi.fn().mockResolvedValue({}),
    createPullRequest: vi.fn().mockResolvedValue({ html_url: 'https://github.com/test/pr/1' }),
  },
}));

vi.mock('../aiService.js', () => ({
  aiService: {
    isConfigured: false,
    analyzeCode: vi.fn(),
    createPlan: vi.fn(),
    generateCode: vi.fn(),
    reviewCode: vi.fn(),
    generatePRDescription: vi.fn(),
    generateCommitMessage: vi.fn(),
    estimateCost: vi.fn().mockReturnValue(0),
  },
}));

describe('CodingEngine', () => {
  let engine: CodingEngine;

  beforeEach(() => {
    engine = new CodingEngine();
    vi.clearAllMocks();
  });

  describe('getStatus', () => {
    it('returns correct initial status', () => {
      const status = engine.getStatus();
      expect(status).toEqual({
        isRunning: false,
        activeTasks: 0,
        maxConcurrent: 3,
        aiConfigured: false,
      });
    });

    it('shows running after start', () => {
      engine.start();
      expect(engine.getStatus().isRunning).toBe(true);
      engine.stop();
    });

    it('shows stopped after stop', () => {
      engine.start();
      engine.stop();
      expect(engine.getStatus().isRunning).toBe(false);
    });
  });

  describe('start/stop', () => {
    it('starts polling for tasks', () => {
      engine.start();
      expect(engine.getStatus().isRunning).toBe(true);
      engine.stop();
    });

    it('stops polling', () => {
      engine.start();
      engine.stop();
      expect(engine.getStatus().isRunning).toBe(false);
    });

    it('warns on double start', () => {
      engine.start();
      engine.start(); // Should warn but not throw
      expect(engine.getStatus().isRunning).toBe(true);
      engine.stop();
    });
  });

  describe('setIO', () => {
    it('accepts a Socket.IO instance', () => {
      const mockIO = {
        to: vi.fn().mockReturnValue({ emit: vi.fn() }),
      };
      engine.setIO(mockIO);
      // No throw = success
    });
  });
});
