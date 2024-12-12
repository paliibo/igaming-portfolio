import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';
import { z } from 'zod';

loadEnv({ path: resolve(import.meta.dirname, '../../../../.env'), quiet: true });

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    API_PORT: z.coerce.number().int().default(4000),
    DATABASE_URL: z.string().url(),
    TEST_DATABASE_URL: z.string().url().optional(),
    REDIS_URL: z.string().url().default('redis://localhost:6380'),
    JWT_SECRET: z.string().min(16).optional(),
    SESSION_COOKIE_NAME: z.string().default('igaming_session'),
    SESSION_TTL_HOURS: z.coerce.number().int().min(1).max(168).default(12),
    CORS_ORIGINS: z
      .string()
      .default('http://localhost:3000,http://localhost:3001,http://localhost:3002'),
    DEMO_PLAYER_EMAIL: z.string().email().default('player@demo.local'),
    DEMO_PLAYER_PASSWORD: z.string().min(8).default('Player123!'),
    DEMO_OPERATOR_EMAIL: z.string().email().default('operator@demo.local'),
    DEMO_OPERATOR_PASSWORD: z.string().min(8).default('Operator123!'),
    DEMO_ADMIN_EMAIL: z.string().email().default('admin@demo.local'),
    DEMO_ADMIN_PASSWORD: z.string().min(8).default('Admin123!'),
    DEMO_RESET_ENABLED: z
      .string()
      .default('false')
      .transform((v) => v === 'true' || v === '1'),
    SIMULATOR_ENABLED: z
      .string()
      .default('true')
      .transform((v) => v === 'true' || v === '1'),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === 'production') {
      if (!env.JWT_SECRET || env.JWT_SECRET.length < 32) {
        ctx.addIssue({
          code: 'custom',
          path: ['JWT_SECRET'],
          message: 'JWT_SECRET of at least 32 characters is required in production',
        });
      }
      if (env.DEMO_RESET_ENABLED) {
        ctx.addIssue({
          code: 'custom',
          path: ['DEMO_RESET_ENABLED'],
          message: 'demo reset must be disabled in production',
        });
      }
    }
  });

export type Env = z.infer<typeof envSchema> & {
  jwtSecret: string;
  corsOrigins: string[];
  isProduction: boolean;
  isTest: boolean;
  demoResetEnabled: boolean;
};

export function loadEnvConfig(overrides: Partial<Record<string, string>> = {}): Env {
  const parsed = envSchema.safeParse({ ...process.env, ...overrides });
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Invalid environment configuration: ${issues}`);
  }
  const env = parsed.data;
  const isTest = env.NODE_ENV === 'test';
  return {
    ...env,
    DATABASE_URL: isTest && env.TEST_DATABASE_URL ? env.TEST_DATABASE_URL : env.DATABASE_URL,
    jwtSecret: env.JWT_SECRET ?? 'development-only-secret-do-not-use-in-production',
    corsOrigins: env.CORS_ORIGINS.split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    isProduction: env.NODE_ENV === 'production',
    isTest,
    demoResetEnabled: env.DEMO_RESET_ENABLED && env.NODE_ENV !== 'production',
  };
}

export const ENV = Symbol('ENV');
