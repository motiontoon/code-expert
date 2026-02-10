import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  SERVER_URL: z.string().default('http://localhost:3000'),
  CLIENT_URL: z.string().default('http://localhost:5173'),
  DATABASE_URL: z.string().default('file:./dev.db'),
  SESSION_SECRET: z.string().default('dev-session-secret'),
  JWT_SECRET: z.string().default('dev-jwt-secret'),
  JWT_EXPIRATION: z.string().default('7d'),
  GITHUB_CLIENT_ID: z.string().default(''),
  GITHUB_CLIENT_SECRET: z.string().default(''),
  GITHUB_CALLBACK_URL: z.string().default('http://localhost:3000/api/auth/github/callback'),
  AI_PROVIDER: z.string().default('anthropic'),
  ANTHROPIC_API_KEY: z.string().default(''),
  AI_MODEL: z.string().default('claude-sonnet-4-5-20250929'),
  AI_MAX_TOKENS: z.coerce.number().default(8192),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  FILE_GUARD_ENABLED: z.coerce.boolean().default(true),
  FILE_GUARD_STRICT_MODE: z.coerce.boolean().default(true),
  LOG_LEVEL: z.string().default('debug'),
});

export const env = envSchema.parse(process.env);
export type Env = z.infer<typeof envSchema>;
