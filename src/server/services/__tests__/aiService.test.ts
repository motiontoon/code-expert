import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AIService } from '../aiService.js';

// Mock the env module
vi.mock('../../config/env.js', () => ({
  env: {
    ANTHROPIC_API_KEY: 'test-api-key',
    AI_MODEL: 'claude-sonnet-4-5-20250929',
    AI_MAX_TOKENS: 4096,
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

describe('AIService', () => {
  let service: AIService;

  beforeEach(() => {
    service = new AIService();
    vi.restoreAllMocks();
  });

  describe('isConfigured', () => {
    it('returns true when API key is set', () => {
      expect(service.isConfigured).toBe(true);
    });
  });

  describe('estimateCost', () => {
    it('calculates cost correctly', () => {
      const cost = service.estimateCost(1000, 1000);
      // 1000/1000 * 0.003 + 1000/1000 * 0.015 = 0.003 + 0.015 = 0.018
      expect(cost).toBeCloseTo(0.018);
    });

    it('returns 0 for zero tokens', () => {
      const cost = service.estimateCost(0, 0);
      expect(cost).toBe(0);
    });
  });

  describe('chat', () => {
    it('sends correct request structure', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          content: [{ type: 'text', text: 'response' }],
          usage: { input_tokens: 5, output_tokens: 3 },
          model: 'claude-sonnet-4-5-20250929',
        }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const result = await service.chat({
        system: 'You are helpful',
        messages: [{ role: 'user', content: 'Hi' }],
        temperature: 0.5,
      });

      expect(result.content).toBe('response');
      const body = JSON.parse((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
      expect(body.system).toBe('You are helpful');
      expect(body.temperature).toBe(0.5);
    });

    it('calls the Anthropic API with correct parameters', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          content: [{ type: 'text', text: 'Hello world' }],
          usage: { input_tokens: 10, output_tokens: 5 },
          model: 'claude-sonnet-4-5-20250929',
        }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const result = await service.chat({
        messages: [{ role: 'user', content: 'Hello' }],
      });

      expect(result.content).toBe('Hello world');
      expect(result.inputTokens).toBe(10);
      expect(result.outputTokens).toBe(5);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.anthropic.com/v1/messages',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'x-api-key': 'test-api-key',
            'anthropic-version': '2023-06-01',
          }),
        }),
      );
    });

    it('throws on API error', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      });

      await expect(
        service.chat({ messages: [{ role: 'user', content: 'test' }] }),
      ).rejects.toThrow('Anthropic API error: 401');
    });
  });

  describe('analyzeCode', () => {
    it('sends file contents to the API', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [{ type: 'text', text: 'Analysis result' }],
          usage: { input_tokens: 100, output_tokens: 50 },
          model: 'claude-sonnet-4-5-20250929',
        }),
      });

      const result = await service.analyzeCode({
        taskDescription: 'Add a login page',
        files: [{ path: 'src/App.tsx', content: 'export default function App() {}' }],
      });

      expect(result.content).toBe('Analysis result');
      const fetchCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.messages[0].content).toContain('Add a login page');
      expect(body.messages[0].content).toContain('src/App.tsx');
    });
  });
});
