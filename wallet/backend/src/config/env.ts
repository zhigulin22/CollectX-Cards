import { z } from 'zod';

// Схема валидации окружения
const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3001').transform(Number),

  // Database
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),

  // JWT
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),

  // Telegram
  TELEGRAM_BOT_TOKEN: z.string().optional(),

  // Deposit/Withdraw (TON)
  DEPOSIT_ADDRESS: z.string().optional(),
  WITHDRAW_MNEMONIC: z.string().optional(), // Для отправки USDT
  
  // Admin
  ADMIN_API_KEY: z.string().min(16, 'ADMIN_API_KEY must be at least 16 characters').optional(),

  // Rate limiting
  RATE_LIMIT_MAX: z.string().default('100').transform(Number),
  RATE_LIMIT_WINDOW_MS: z.string().default('60000').transform(Number), // 1 minute

  // CORS - разрешённые origins (через запятую)
  ALLOWED_ORIGINS: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

// Валидация и экспорт конфига
function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('❌ Invalid environment variables:');
    console.error(result.error.format());
    process.exit(1);
  }

  return result.data;
}

export const env = validateEnv();

// Проверка обязательных переменных для production
export function validateProductionEnv(): void {
  if (env.NODE_ENV !== 'production') return;

  const required = [
    ['TELEGRAM_BOT_TOKEN', env.TELEGRAM_BOT_TOKEN],
    ['ADMIN_API_KEY', env.ADMIN_API_KEY],
    ['DEPOSIT_ADDRESS', env.DEPOSIT_ADDRESS],
    ['ALLOWED_ORIGINS', env.ALLOWED_ORIGINS],
  ] as const;

  const missing = required.filter(([, value]) => !value).map(([key]) => key);

  if (missing.length > 0) {
    console.error(`❌ Missing required env vars for production: ${missing.join(', ')}`);
    process.exit(1);
  }
}

// Получить список разрешённых origins для CORS
export function getAllowedOrigins(): string[] | true {
  if (env.NODE_ENV !== 'production') {
    return true; // В dev режиме разрешаем всё
  }
  
  if (!env.ALLOWED_ORIGINS) {
    return ['https://t.me']; // Дефолт для Telegram Mini Apps
  }
  
  return env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim());
}


