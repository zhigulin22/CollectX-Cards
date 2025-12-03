import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import crypto from 'crypto';
import { db } from '../db.js';
import { env } from '../config/env.js';
import { ForbiddenError } from '../utils/errors.js';
import { secureCompare } from '../utils/crypto.js';

const AuthSchema = z.object({
  initData: z.string().min(1),
});

export async function authRoutes(app: FastifyInstance) {
  // Telegram WebApp Auth
  app.post('/telegram', async (request, reply) => {
    try {
      const { initData } = AuthSchema.parse(request.body);
      
      const parsed = parseTelegramData(initData);
      if (!parsed) {
        return reply.status(401).send({ error: 'Invalid auth data' });
      }

      const { user, authDate } = parsed;

      // H3 FIX: Always validate Telegram hash (except explicit dev bypass)
      const skipValidation = env.NODE_ENV === 'development' && 
                            process.env.SKIP_TELEGRAM_VALIDATION === 'true';
      
      if (!skipValidation) {
        // FIX: Validate auth_date to prevent replay attacks
        if (!isAuthDateValid(authDate)) {
          app.log.warn({ telegramId: user.id, authDate }, 'Expired auth data');
          return reply.status(401).send({ error: 'Auth data expired' });
        }

        if (!validateTelegramHash(initData)) {
          app.log.warn({ telegramId: user.id }, 'Invalid Telegram signature');
          return reply.status(401).send({ error: 'Invalid signature' });
        }
      }

      // Find or create user
      let dbUser = await db.user.findUnique({
        where: { telegramId: BigInt(user.id) },
        include: { wallet: true },
      });

      if (!dbUser) {
        dbUser = await db.user.create({
          data: {
            telegramId: BigInt(user.id),
            username: user.username,
            firstName: user.first_name,
            wallet: { create: {} },
          },
          include: { wallet: true },
        });
      }

      // H5 FIX: Check if user is blocked
      if (dbUser.isBlocked) {
        app.log.info({ userId: dbUser.id }, 'Blocked user attempted login');
        throw new ForbiddenError(dbUser.blockReason || 'Your account is blocked');
      }

      // Generate token
      const token = app.jwt.sign({ userId: dbUser.id }, { expiresIn: '30d' });

      return {
        token,
        user: {
          id: dbUser.id,
          telegramId: dbUser.telegramId.toString(),
          username: dbUser.username,
          firstName: dbUser.firstName,
        },
        wallet: dbUser.wallet ? {
          balanceUsdt: dbUser.wallet.balanceUsdt.toString(),
          balanceX: dbUser.wallet.balanceX.toString(),
        } : null,
      };
    } catch (error: any) {
      if (error instanceof ForbiddenError) {
        throw error;
      }
      app.log.error(error);
      return reply.status(500).send({ error: 'Auth failed' });
    }
  });

  // Dev: Mock auth (only in development)
  app.post('/dev', async (request, reply) => {
    if (env.NODE_ENV === 'production') {
      return reply.status(404).send({ error: 'Not found' });
    }

    const { telegramId } = request.body as { telegramId?: number };
    const tgId = telegramId || 123456789;

    let user = await db.user.findUnique({
      where: { telegramId: BigInt(tgId) },
      include: { wallet: true },
    });

    if (!user) {
      user = await db.user.create({
        data: {
          telegramId: BigInt(tgId),
          username: 'dev_user',
          firstName: 'Dev',
          wallet: { create: {} },
        },
        include: { wallet: true },
      });
    }

    // H5 FIX: Check if user is blocked even in dev mode
    if (user.isBlocked) {
      throw new ForbiddenError(user.blockReason || 'Your account is blocked');
    }

    const token = app.jwt.sign({ userId: user.id }, { expiresIn: '30d' });

    return {
      token,
      user: {
        id: user.id,
        telegramId: user.telegramId.toString(),
        username: user.username,
        firstName: user.firstName,
      },
      wallet: user.wallet ? {
        balanceUsdt: user.wallet.balanceUsdt.toString(),
        balanceX: user.wallet.balanceX.toString(),
      } : null,
    };
  });

  // Get current user
  app.get('/me', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { userId } = request.user as { userId: string };

    const user = await db.user.findUnique({
      where: { id: userId },
      include: { wallet: true },
    });

    if (!user) {
      return reply.status(404).send({ error: 'User not found' });
    }

    // H5 FIX: Check if user is blocked
    if (user.isBlocked) {
      throw new ForbiddenError(user.blockReason || 'Your account is blocked');
    }

    return {
      user: {
        id: user.id,
        telegramId: user.telegramId.toString(),
        username: user.username,
        firstName: user.firstName,
      },
      wallet: user.wallet ? {
        balanceUsdt: user.wallet.balanceUsdt.toString(),
        balanceX: user.wallet.balanceX.toString(),
      } : null,
    };
  });
}

// Helpers
interface ParsedTelegramData {
  user: TelegramUser;
  authDate: number;
}

function parseTelegramData(initData: string): ParsedTelegramData | null {
  try {
    const params = new URLSearchParams(initData);
    const userStr = params.get('user');
    const authDateStr = params.get('auth_date');
    
    if (!userStr) return null;
    
    const user = JSON.parse(userStr);
    const authDate = authDateStr ? parseInt(authDateStr, 10) : 0;
    
    return { user, authDate };
  } catch {
    return null;
  }
}

// FIX: Validate auth_date to prevent replay attacks
const MAX_AUTH_AGE_SECONDS = 24 * 60 * 60; // 24 hours

function isAuthDateValid(authDate: number): boolean {
  if (!authDate || authDate <= 0) return false;
  
  const now = Math.floor(Date.now() / 1000);
  const age = now - authDate;
  
  return age >= 0 && age <= MAX_AUTH_AGE_SECONDS;
}

function validateTelegramHash(initData: string): boolean {
  const botToken = env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    // FIX: Always fail if bot token not configured (even in dev)
    // This prevents auth bypass by simply not setting the token
    return false;
  }

  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return false;
    
    params.delete('hash');

    const dataCheck = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('\n');

    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    const calculated = crypto.createHmac('sha256', secretKey).update(dataCheck).digest('hex');

    // Use timing-safe comparison
    return secureCompare(calculated, hash);
  } catch {
    return false;
  }
}

interface TelegramUser {
  id: number;
  username?: string;
  first_name?: string;
}
