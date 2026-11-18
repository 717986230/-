import { z } from 'zod';

const ttl = z.string().regex(/^\d+[smhd]$/, '格式如 15m、2h、7d');

export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(3000),
    CORS_ORIGINS: z.string().default('http://localhost:5173'),
    DATABASE_URL: z.string().url(),
    JWT_ACCESS_SECRET: z.string().min(32),
    JWT_REFRESH_SECRET: z.string().min(32),
    JWT_ACCESS_TTL: ttl.default('2h'),
    JWT_REFRESH_TTL: ttl.default('7d'),
    UPLOAD_DIR: z.string().default('./uploads'),
    PUBLIC_UPLOAD_BASE: z.string().default('/uploads'),
    UPLOAD_MAX_MB: z.coerce.number().positive().max(50).default(15),
    ADMIN_USERNAME: z.string().min(3).optional(),
    ADMIN_PASSWORD: z.string().min(8).optional(),
  })
  .refine((e) => e.NODE_ENV !== 'production' || !e.JWT_ACCESS_SECRET.startsWith('change-me'), {
    message: '生产环境必须替换 JWT_ACCESS_SECRET',
    path: ['JWT_ACCESS_SECRET'],
  })
  .refine((e) => e.NODE_ENV !== 'production' || !e.JWT_REFRESH_SECRET.startsWith('change-me'), {
    message: '生产环境必须替换 JWT_REFRESH_SECRET',
    path: ['JWT_REFRESH_SECRET'],
  });

export type Env = z.infer<typeof envSchema>;

/** 启动时校验环境变量，配置错误直接失败，避免带病运行 */
export function validateEnv(raw: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    const detail = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`环境变量校验失败：\n${detail}`);
  }
  return parsed.data;
}
