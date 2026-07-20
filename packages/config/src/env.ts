import { z } from 'zod';

const emptyToUndefined = (value: unknown) =>
  value === '' || value === undefined || value === null ? undefined : value;

export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    DATABASE_URL: z.string().min(1),
    REDIS_URL: z.string().min(1),
    API_PORT: z.coerce.number().int().positive().default(3001),
    API_CORS_ORIGINS: z.string().default('http://localhost:3000'),
    WEB_URL: z.string().url().default('http://localhost:3000'),
    ADMIN_URL: z.string().url().default('http://localhost:3002'),
    MCP_GATEWAY_PORT: z.coerce.number().int().positive().default(3003),
    MCP_GATEWAY_AUTH_TOKEN: z.string().min(1),
    SESSION_SECRET: z.string().min(32),
    JWT_ISSUER: z.string().default('onecare'),
    JWT_AUDIENCE: z.string().default('onecare-api'),
    ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(900),
    REFRESH_TOKEN_TTL_SECONDS: z.coerce
      .number()
      .int()
      .positive()
      .default(60 * 60 * 24 * 14),
    SESSION_IDLE_TIMEOUT_SECONDS: z.coerce
      .number()
      .int()
      .positive()
      .default(60 * 30),
    SESSION_ABSOLUTE_TIMEOUT_SECONDS: z.coerce
      .number()
      .int()
      .positive()
      .default(60 * 60 * 12),
    SESSION_REMEMBER_ME_TTL_SECONDS: z.coerce
      .number()
      .int()
      .positive()
      .default(60 * 60 * 24 * 30),
    AUTH_MODE: z.enum(['development', 'entra']).default('development'),
    AUTH_COOKIE_NAME: z.string().default('oc_access'),
    REFRESH_COOKIE_NAME: z.string().default('oc_refresh'),
    CSRF_COOKIE_NAME: z.string().default('oc_csrf'),
    COOKIE_SECURE: z
      .preprocess(
        (v) => (v === undefined || v === '' ? undefined : v === 'true' || v === true),
        z.boolean(),
      )
      .optional(),
    RATE_LIMIT_TTL_SECONDS: z.coerce.number().int().positive().default(60),
    RATE_LIMIT_LIMIT: z.coerce.number().int().positive().default(120),
    AUTH_RATE_LIMIT_LIMIT: z.coerce.number().int().positive().default(20),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
    ENTRA_TENANT_ID: z.preprocess(emptyToUndefined, z.string().optional()),
    ENTRA_CLIENT_ID: z.preprocess(emptyToUndefined, z.string().optional()),
    ENTRA_CLIENT_SECRET: z.preprocess(emptyToUndefined, z.string().optional()),
    ENTRA_REDIRECT_URI: z.preprocess(emptyToUndefined, z.string().url().optional()),
    ENTRA_SCOPES: z.string().default('openid profile email offline_access'),
    OTEL_EXPORTER_OTLP_ENDPOINT: z.preprocess(emptyToUndefined, z.string().url().optional()),
    AI_PROVIDER: z.enum(['mock', 'openai', 'azure-openai', 'anthropic']).default('mock'),
    AI_DEFAULT_MODEL: z.string().default('mock-onecare-v1'),
    AI_MAX_TOKENS: z.coerce.number().int().positive().default(1024),
    AI_TEMPERATURE: z.coerce.number().min(0).max(2).default(0.2),
    AI_STREAM_CHUNK_DELAY_MS: z.coerce.number().int().nonnegative().default(8),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === 'production' && env.AUTH_MODE === 'development') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['AUTH_MODE'],
        message: 'AUTH_MODE=development is forbidden when NODE_ENV=production',
      });
    }
    if (env.AUTH_MODE === 'entra') {
      for (const key of [
        'ENTRA_TENANT_ID',
        'ENTRA_CLIENT_ID',
        'ENTRA_CLIENT_SECRET',
        'ENTRA_REDIRECT_URI',
      ] as const) {
        if (!env[key]) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [key],
            message: `${key} is required when AUTH_MODE=entra`,
          });
        }
      }
    }
  });

export type OneCareEnv = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): OneCareEnv {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid environment configuration: ${details}`);
  }
  return parsed.data;
}

export function parseCorsOrigins(value: string): string[] {
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

export function isCookieSecure(env: OneCareEnv): boolean {
  if (env.COOKIE_SECURE !== undefined) {
    return env.COOKIE_SECURE;
  }
  return env.NODE_ENV === 'production';
}
