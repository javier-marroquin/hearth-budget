import './load-env.js';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().min(1),
  AUTH_SECRET: z.string().min(16),
  APP_URL: z.string().url().default('http://localhost:5173'),
  API_URL: z.string().url().default('http://localhost:3000'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  SESSION_DAYS: z.coerce.number().default(30),
  COOKIE_SECURE: z
    .string()
    .optional()
    .transform((v) => v === 'true' || v === '1'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),
  SMTP_SECURE: z
    .string()
    .optional()
    .transform((v) => v === 'true' || v === '1'),
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().optional(),
  SEED_DEMO_USER: z
    .string()
    .optional()
    .transform((v) => v !== 'false' && v !== '0'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const root = process.cwd().includes('server') ? '..' : '.';
  console.error('[config] Invalid environment:', parsed.error.flatten().fieldErrors);
  console.error(
    `[config] Crea ${root}/.env desde .env.example (cp .env.example .env) y define DATABASE_URL + AUTH_SECRET.`,
  );
  process.exit(1);
}

export const config = {
  ...parsed.data,
  cookieSecure:
    parsed.data.COOKIE_SECURE ?? parsed.data.NODE_ENV === 'production',
  sessionMs: parsed.data.SESSION_DAYS * 24 * 60 * 60 * 1000,
};

export type AppConfig = typeof config;
