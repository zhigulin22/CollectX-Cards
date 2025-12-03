import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { env } from '../config/env.js';
import { RateLimitError } from '../utils/errors.js';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// ⚠️ WARNING: In-memory store - NOT suitable for horizontal scaling!
// For production with multiple instances, use Redis:
// - @fastify/rate-limit with Redis store
// - ioredis for connection
// 
// TODO: Implement Redis-based rate limiting before scaling beyond single instance
if (env.NODE_ENV === 'production') {
  console.warn(
    '⚠️  Rate limiter using in-memory store. ' +
    'This will NOT work correctly with multiple server instances. ' +
    'Consider using Redis for production.'
  );
}

const store = new Map<string, RateLimitEntry>();

// Очистка старых записей каждые 5 минут
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt < now) {
      store.delete(key);
    }
  }
}, 5 * 60 * 1000);

interface RateLimitConfig {
  max: number;        // Максимум запросов
  windowMs: number;   // Окно времени в мс
  keyGenerator?: (request: FastifyRequest) => string;
}

export function createRateLimiter(config: Partial<RateLimitConfig> = {}) {
  const { 
    max = env.RATE_LIMIT_MAX, 
    windowMs = env.RATE_LIMIT_WINDOW_MS,
    keyGenerator = defaultKeyGenerator,
  } = config;

  return async (request: FastifyRequest, reply: FastifyReply) => {
    const key = keyGenerator(request);
    const now = Date.now();

    let entry = store.get(key);

    if (!entry || entry.resetAt < now) {
      // Новое окно
      entry = { count: 1, resetAt: now + windowMs };
      store.set(key, entry);
    } else {
      entry.count++;
    }

    // Установка заголовков
    const remaining = Math.max(0, max - entry.count);
    const resetInSeconds = Math.ceil((entry.resetAt - now) / 1000);

    reply.header('X-RateLimit-Limit', max);
    reply.header('X-RateLimit-Remaining', remaining);
    reply.header('X-RateLimit-Reset', resetInSeconds);

    // Проверка лимита
    if (entry.count > max) {
      reply.header('Retry-After', resetInSeconds);
      throw new RateLimitError();
    }
  };
}

function defaultKeyGenerator(request: FastifyRequest): string {
  // Используем userId если авторизован, иначе IP
  const user = request.user as { userId?: string } | undefined;
  if (user?.userId) {
    return `user:${user.userId}`;
  }
  return `ip:${request.ip}`;
}

// Preset limiters
export const rateLimiters = {
  // Стандартный лимит (100 req/min)
  standard: createRateLimiter(),

  // Строгий лимит для auth (10 req/min)
  auth: createRateLimiter({ max: 10, windowMs: 60 * 1000 }),

  // Строгий лимит для финансовых операций (20 req/min)
  financial: createRateLimiter({ max: 20, windowMs: 60 * 1000 }),

  // Лимит для поиска (30 req/min)
  search: createRateLimiter({ max: 30, windowMs: 60 * 1000 }),

  // Admin API (50 req/min)
  admin: createRateLimiter({ max: 50, windowMs: 60 * 1000 }),
};

// Plugin для регистрации rate limit на все роуты
export async function rateLimitPlugin(app: FastifyInstance) {
  app.addHook('onRequest', rateLimiters.standard);
}


