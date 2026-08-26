import path from 'node:path';
import dotenv from 'dotenv';
import { z } from 'zod';

const booleanString = z
  .enum(['0', '1', 'true', 'false'])
  .default('0')
  .transform((value) => value === '1' || value === 'true');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().int().min(1).max(65535).default(3306),
  DB_NAME: z.string().min(1),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string(),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_ISSUER: z.string().min(1).default('home-assistant'),
  JWT_AUDIENCE: z.string().min(1).default('home-assistant-clients'),
  CORS_ORIGINS: z.string().default('https://meiji3d.com,https://www.meiji3d.com'),
  LOG_LEVEL: z.string().default('info'),
  ALLOW_LEGACY_RESET: booleanString,
});

export type AppConfig = {
  nodeEnv: 'development' | 'test' | 'production';
  port: number;
  database: {
    host: string;
    port: number;
    name: string;
    user: string;
    password: string;
  };
  jwt: {
    accessSecret: string;
    issuer: string;
    audience: string;
    accessExpiresInSeconds: number;
    refreshExpiresInSeconds: number;
  };
  corsOrigins: string[];
  logLevel: string;
  allowLegacyReset: boolean;
};

export function loadConfig(environment: NodeJS.ProcessEnv = process.env): AppConfig {
  const envPath = environment.ENV_FILE ?? path.resolve(process.cwd(), '.env');
  dotenv.config({ path: envPath, override: false, quiet: true });
  const parsed = envSchema.safeParse(environment);

  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ');
    throw new Error(`环境配置无效: ${details}`);
  }

  return {
    nodeEnv: parsed.data.NODE_ENV,
    port: parsed.data.PORT,
    database: {
      host: parsed.data.DB_HOST,
      port: parsed.data.DB_PORT,
      name: parsed.data.DB_NAME,
      user: parsed.data.DB_USER,
      password: parsed.data.DB_PASSWORD,
    },
    jwt: {
      accessSecret: parsed.data.JWT_ACCESS_SECRET,
      issuer: parsed.data.JWT_ISSUER,
      audience: parsed.data.JWT_AUDIENCE,
      accessExpiresInSeconds: 15 * 60,
      refreshExpiresInSeconds: 30 * 24 * 60 * 60,
    },
    corsOrigins: parsed.data.CORS_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean),
    logLevel: parsed.data.LOG_LEVEL,
    allowLegacyReset: parsed.data.ALLOW_LEGACY_RESET,
  };
}
