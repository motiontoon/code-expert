import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

export interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AIResponse {
  content: string;
  inputTokens: number;
  outputTokens: number;
  model: string;
}

/**
 * AI Service - Anthropic Claude API Integration
 * ================================================
 * Provides code generation, analysis, and planning
 * capabilities through the Claude API.
 */
export class AIService {
  private baseUrl = 'https://api.anthropic.com/v1/messages';
  private apiVersion = '2023-06-01';

  private get apiKey(): string {
    return env.ANTHROPIC_API_KEY;
  }

  private get model(): string {
    return env.AI_MODEL;
  }

  private get maxTokens(): number {
    return env.AI_MAX_TOKENS;
  }

  get isConfigured(): boolean {
    return !!this.apiKey && this.apiKey.length > 0;
  }

  /**
   * Send a message to Claude and get a response.
   */
  async chat(params: {
    system?: string;
    messages: AIMessage[];
    maxTokens?: number;
    temperature?: number;
  }): Promise<AIResponse> {
    if (!this.isConfigured) {
      throw new Error('Anthropic API key not configured. Set ANTHROPIC_API_KEY environment variable.');
    }

    const body: Record<string, unknown> = {
      model: this.model,
      max_tokens: params.maxTokens || this.maxTokens,
      messages: params.messages,
    };

    if (params.system) {
      body.system = params.system;
    }

    if (params.temperature !== undefined) {
      body.temperature = params.temperature;
    }

    logger.debug(`AI request: model=${this.model}, messages=${params.messages.length}`);

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': this.apiVersion,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      logger.error(`Anthropic API error (${response.status}): ${errorBody}`);
      throw new Error(`Anthropic API error: ${response.status} - ${errorBody}`);
    }

    const data = await response.json() as {
      content: Array<{ type: string; text: string }>;
      usage: { input_tokens: number; output_tokens: number };
      model: string;
    };

    const text = data.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('');

    logger.debug(`AI response: ${data.usage.input_tokens} in / ${data.usage.output_tokens} out tokens`);

    return {
      content: text,
      inputTokens: data.usage.input_tokens,
      outputTokens: data.usage.output_tokens,
      model: data.model,
    };
  }

  /**
   * Analyze code files and understand their structure.
   */
  async analyzeCode(params: {
    taskDescription: string;
    files: Array<{ path: string; content: string }>;
  }): Promise<AIResponse> {
    const fileContents = params.files
      .map((f) => `--- ${f.path} ---\n${f.content}`)
      .join('\n\n');

    return this.chat({
      system: `You are an expert code analyst. Analyze the provided code files and understand their structure, patterns, and relationships. Provide a concise analysis focused on what's relevant to the task.`,
      messages: [
        {
          role: 'user',
          content: `Task: ${params.taskDescription}\n\nFiles:\n${fileContents}\n\nProvide a concise analysis of these files relevant to the task. Identify key patterns, dependencies, and areas that will need changes.`,
        },
      ],
      temperature: 0.2,
    });
  }

  /**
   * Create an implementation plan for a coding task.
   */
  async createPlan(params: {
    taskDescription: string;
    taskType: string;
    analysis: string;
    files: Array<{ path: string; content: string }>;
  }): Promise<AIResponse> {
    const fileList = params.files.map((f) => f.path).join('\n');

    return this.chat({
      system: `You are an expert software architect. Create a detailed implementation plan for the given task. Output a JSON array of steps, where each step has: {"file": "path", "action": "create|modify|delete", "description": "what to do"}`,
      messages: [
        {
          role: 'user',
          content: `Task type: ${params.taskType}\nTask: ${params.taskDescription}\n\nAnalysis:\n${params.analysis}\n\nAvailable files:\n${fileList}\n\nCreate a step-by-step implementation plan as a JSON array.`,
        },
      ],
      temperature: 0.3,
    });
  }

  /**
   * Generate code changes for a specific file.
   */
  async generateCode(params: {
    taskDescription: string;
    plan: string;
    currentStep: string;
    filePath: string;
    existingContent?: string;
    contextFiles?: Array<{ path: string; content: string }>;
  }): Promise<AIResponse> {
    const contextStr = params.contextFiles
      ?.map((f) => `--- ${f.path} ---\n${f.content}`)
      .join('\n\n') || '';

    const prompt = params.existingContent
      ? `Modify the existing file "${params.filePath}" according to the plan step.\n\nExisting content:\n\`\`\`\n${params.existingContent}\n\`\`\`\n\nOutput ONLY the complete new file content, no explanations.`
      : `Create a new file "${params.filePath}" according to the plan step.\n\nOutput ONLY the complete file content, no explanations.`;

    return this.chat({
      system: `You are an expert software developer. Generate clean, production-quality code. Output ONLY the file content, no markdown fences, no explanations. Follow existing code patterns and conventions visible in the context files.`,
      messages: [
        {
          role: 'user',
          content: `Task: ${params.taskDescription}\n\nPlan:\n${params.plan}\n\nCurrent step: ${params.currentStep}\n\n${contextStr ? `Context files:\n${contextStr}\n\n` : ''}${prompt}`,
        },
      ],
      temperature: 0.2,
    });
  }

  /**
   * Review code changes and suggest improvements.
   */
  async reviewCode(params: {
    taskDescription: string;
    changes: Array<{ path: string; content: string }>;
  }): Promise<AIResponse> {
    const changesStr = params.changes
      .map((f) => `--- ${f.path} ---\n${f.content}`)
      .join('\n\n');

    return this.chat({
      system: `You are an expert code reviewer. Review the changes for correctness, security, performance, and adherence to best practices. Output a JSON object: {"approved": boolean, "summary": "string", "issues": [{"severity": "error|warning|info", "file": "path", "description": "string"}]}`,
      messages: [
        {
          role: 'user',
          content: `Task: ${params.taskDescription}\n\nChanges:\n${changesStr}\n\nReview these changes and provide your assessment as JSON.`,
        },
      ],
      temperature: 0.1,
    });
  }

  /**
   * Generate a commit message for changes.
   */
  async generateCommitMessage(params: {
    taskDescription: string;
    taskType: string;
    changedFiles: string[];
  }): Promise<AIResponse> {
    return this.chat({
      system: `You are a git commit message generator. Output ONLY the commit message, nothing else. Use conventional commits format (feat:, fix:, refactor:, test:, docs:). Keep the first line under 72 characters.`,
      messages: [
        {
          role: 'user',
          content: `Task type: ${params.taskType}\nTask: ${params.taskDescription}\nChanged files: ${params.changedFiles.join(', ')}\n\nGenerate a commit message.`,
        },
      ],
      temperature: 0.3,
      maxTokens: 256,
    });
  }

  /**
   * Generate a pull request description.
   */
  async generatePRDescription(params: {
    taskDescription: string;
    taskType: string;
    commitMessage: string;
    changedFiles: string[];
  }): Promise<AIResponse> {
    return this.chat({
      system: `You are a pull request description generator. Output a well-formatted PR description in markdown with: ## Summary, ## Changes, ## Testing sections. Be concise but thorough.`,
      messages: [
        {
          role: 'user',
          content: `Task type: ${params.taskType}\nTask: ${params.taskDescription}\nCommit: ${params.commitMessage}\nChanged files: ${params.changedFiles.join(', ')}\n\nGenerate a PR description.`,
        },
      ],
      temperature: 0.4,
      maxTokens: 1024,
    });
  }

  /**
   * Estimate cost based on token usage.
   * Pricing is approximate and based on Claude Sonnet 4.5.
   */
  estimateCost(inputTokens: number, outputTokens: number): number {
    const inputCostPer1k = 0.003;
    const outputCostPer1k = 0.015;
    return (inputTokens / 1000) * inputCostPer1k + (outputTokens / 1000) * outputCostPer1k;
  }
}

export const aiService = new AIService();
