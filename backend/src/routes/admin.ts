import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { Decimal } from 'decimal.js';
import { Prisma, WithdrawStatus } from '@prisma/client';
import { db } from '../db.js';
import { env } from '../config/env.js';
import { withdrawService } from '../services/withdraw.js';
import { auditService } from '../services/audit.js';
import { rateLimiters } from '../middleware/rateLimit.js';
import { UnauthorizedError, BadRequestError } from '../utils/errors.js';
import { secureCompare } from '../utils/crypto.js';
import { settingsService } from '../services/settings.js';
import { 
  executeFinancialTransaction, 
  getWalletWithLock,
  createTransactionRecord,
} from '../services/wallet.js';

// ============ SCHEMAS ============

const UpdateBalanceSchema = z.object({
  userId: z.string().uuid(),
  currency: z.enum(['USDT', 'X']),
  amount: z.string().refine((v) => !isNaN(parseFloat(v)), 'Invalid amount'),
  reason: z.string().min(1).max(255),
});

const UpdateWithdrawSchema = z.object({
  withdrawId: z.string().uuid(),
  status: z.enum(['PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED']),
  txHash: z.string().optional(),
  failReason: z.string().max(255).optional(),
});

const ListUsersSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
});

const AuditLogSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
  action: z.string().optional(),
});

// ============ AUTH MIDDLEWARE ============

async function adminAuth(request: FastifyRequest, reply: FastifyReply) {
  const apiKey = request.headers['x-admin-key'];
  
  if (!env.ADMIN_API_KEY) {
    throw new UnauthorizedError('Admin API not configured');
  }

  // C5 FIX: Use timing-safe comparison to prevent timing attacks
  if (!apiKey || typeof apiKey !== 'string' || !secureCompare(apiKey, env.ADMIN_API_KEY)) {
    // Log failed attempt for security monitoring
    request.log.warn({ 
      ip: request.ip, 
      path: request.url 
    }, 'Failed admin auth attempt');
    throw new UnauthorizedError('Invalid admin API key');
  }
}

// ============ ROUTES ============

export async function adminRoutes(app: FastifyInstance) {
  // Все роуты требуют admin auth и rate limit
  app.addHook('onRequest', adminAuth);
  app.addHook('onRequest', rateLimiters.admin);

  // -------- STATS --------
  app.get('/stats', async () => {
    const [totalUsers, totalWallets, totalTransactions, pendingWithdraws] = await Promise.all([
      db.user.count(),
      db.wallet.count(),
      db.transaction.count(),
      db.withdrawRequest.count({ where: { status: 'PENDING' } }),
    ]);

    // Суммарные балансы
    const walletSums = await db.wallet.aggregate({
      _sum: {
        balanceUsdt: true,
        balanceX: true,
      },
    });

    // Транзакции по типам
    const txByType = await db.transaction.groupBy({
      by: ['type'],
      _count: true,
      _sum: { amount: true },
    });

    return {
      users: { total: totalUsers },
      wallets: { 
        total: totalWallets,
        totalUsdt: walletSums._sum.balanceUsdt?.toString() || '0',
        totalX: walletSums._sum.balanceX?.toString() || '0',
      },
      transactions: {
        total: totalTransactions,
        byType: txByType.map((t) => ({
          type: t.type,
          count: t._count,
          sum: t._sum.amount?.toString() || '0',
        })),
      },
      withdrawals: {
        pending: pendingWithdraws,
      },
    };
  });

  // -------- REVENUE (Заработок на комиссиях) --------
  app.get('/revenue', async () => {
    // Используем findMany для более надёжного подсчёта комиссий
    
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);

    // Получаем ВСЕ транзакции нужных типов (включая с fee = null/0)
    const [swapTxs, sendTxs, withdrawReqs, totalSendCount] = await Promise.all([
      // Swap transactions (комиссия в USDT)
      db.transaction.findMany({
        where: { type: 'swap' },
        select: { fee: true, createdAt: true },
      }),
      
      // Send transactions (комиссия в $X)
      db.transaction.findMany({
        where: { type: 'send' },
        select: { fee: true, createdAt: true },
      }),
      
      // Completed withdrawals (комиссия в USDT)
      db.withdrawRequest.findMany({
        where: { status: 'COMPLETED' },
        select: { fee: true, createdAt: true },
      }),

      // Для диагностики: общее количество send транзакций
      db.transaction.count({ where: { type: 'send' } }),
    ]);

    // Подсчёт swap fees
    let swapFeesTotal = 0;
    let swapFeesToday = 0;
    let swapFeesWeek = 0;
    let swapWithFeeCount = 0;
    
    for (const tx of swapTxs) {
      const feeValue = tx.fee;
      if (feeValue !== null && feeValue !== undefined) {
        const fee = parseFloat(feeValue.toString());
        if (fee > 0) {
          swapFeesTotal += fee;
          swapWithFeeCount++;
          if (tx.createdAt >= todayStart) swapFeesToday += fee;
          if (tx.createdAt >= weekStart) swapFeesWeek += fee;
        }
      }
    }

    // Подсчёт send fees (в $X)
    let sendFeesXTotal = 0;
    let sendFeesXToday = 0;
    let sendFeesXWeek = 0;
    let sendWithFeeCount = 0;
    
    for (const tx of sendTxs) {
      const feeValue = tx.fee;
      // Проверяем что fee существует и > 0
      if (feeValue !== null && feeValue !== undefined) {
        const fee = parseFloat(feeValue.toString());
        if (fee > 0) {
          sendFeesXTotal += fee;
          sendWithFeeCount++;
          if (tx.createdAt >= todayStart) sendFeesXToday += fee;
          if (tx.createdAt >= weekStart) sendFeesXWeek += fee;
        }
      }
    }

    // Подсчёт withdraw fees
    let withdrawFeesTotal = 0;
    for (const req of withdrawReqs) {
      withdrawFeesTotal += parseFloat(req.fee?.toString() || '0');
    }

    // Конвертация $X → USDT
    const rateSetting = await db.settings.findUnique({ where: { key: 'usdt_to_x_rate' } });
    const xToUsdtRate = 1 / parseFloat(rateSetting?.value || '100');

    const sendFeesUsdtTotal = sendFeesXTotal * xToUsdtRate;
    const sendFeesUsdtToday = sendFeesXToday * xToUsdtRate;
    const sendFeesUsdtWeek = sendFeesXWeek * xToUsdtRate;

    // Итоги (swap + send, withdraw отдельно как сетевые расходы)
    const totalUsdt = swapFeesTotal + sendFeesUsdtTotal;
    const todayUsdt = swapFeesToday + sendFeesUsdtToday;
    const weekUsdt = swapFeesWeek + sendFeesUsdtWeek;

    return {
      total: {
        usdt: totalUsdt.toFixed(4),
        breakdown: {
          swap: {
            usdt: swapFeesTotal.toFixed(4),
            count: swapWithFeeCount,
            totalTxs: swapTxs.length, // Для диагностики
          },
          send: {
            x: sendFeesXTotal.toFixed(2),
            usdt: sendFeesUsdtTotal.toFixed(4),
            count: sendWithFeeCount,
            totalTxs: totalSendCount, // Для диагностики: сколько всего send в БД
          },
          withdraw: {
            usdt: withdrawFeesTotal.toFixed(4),
            count: withdrawReqs.length,
            note: 'Network fees (may not be pure profit)',
          },
        },
      },
      today: {
        usdt: todayUsdt.toFixed(4),
      },
      week: {
        usdt: weekUsdt.toFixed(4),
      },
      rate: {
        xToUsdt: xToUsdtRate,
      },
    };
  });

  // -------- LIST USERS --------
  app.get('/users', async (request: FastifyRequest) => {
    const { page, limit, search } = ListUsersSchema.parse(request.query);

    const where = search ? {
      OR: [
        { username: { contains: search, mode: 'insensitive' as const } },
        { firstName: { contains: search, mode: 'insensitive' as const } },
      ],
    } : {};

    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        include: { wallet: true },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      db.user.count({ where }),
    ]);

    return {
      items: users.map((u) => ({
        id: u.id,
        telegramId: u.telegramId.toString(),
        username: u.username,
        firstName: u.firstName,
        isBlocked: u.isBlocked,
        balanceUsdt: u.wallet?.balanceUsdt.toString() || '0',
        balanceX: u.wallet?.balanceX.toString() || '0',
        createdAt: u.createdAt.toISOString(),
      })),
      page,
      limit,
      total,
      hasMore: page * limit < total,
    };
  });

  // -------- GET USER --------
  app.get('/users/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    const user = await db.user.findUnique({
      where: { id },
      include: { 
        wallet: true,
        withdrawRequests: { 
          take: 10, 
          orderBy: { createdAt: 'desc' } 
        },
      },
    });

    if (!user) {
      return reply.status(404).send({ error: 'User not found' });
    }

    // Записываем в аудит-лог
    await auditService.log({
      actor: 'admin',
      action: 'USER_VIEW',
      targetType: 'user',
      targetId: id,
      ipAddress: request.ip,
    });

    return {
      id: user.id,
      telegramId: user.telegramId.toString(),
      username: user.username,
      firstName: user.firstName,
      isBlocked: user.isBlocked,
      blockReason: user.blockReason,
      adminNotes: user.adminNotes,
      wallet: user.wallet ? {
        balanceUsdt: user.wallet.balanceUsdt.toString(),
        balanceX: user.wallet.balanceX.toString(),
      } : null,
      recentWithdrawals: user.withdrawRequests.map((w) => ({
        id: w.id,
        amount: w.amount.toString(),
        status: w.status.toLowerCase(),
        createdAt: w.createdAt.toISOString(),
      })),
      createdAt: user.createdAt.toISOString(),
    };
  });

  // -------- USER ACTIVITY HISTORY --------
  const UserActivitySchema = z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(50),
    type: z.enum(['all', 'deposit', 'withdraw', 'swap', 'send', 'receive']).default('all'),
  });

  app.get('/users/:id/activity', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const { page, limit, type } = UserActivitySchema.parse(request.query);

    // Получаем юзера с кошельком
    const user = await db.user.findUnique({
      where: { id },
      include: { wallet: true },
    });

    if (!user) {
      return reply.status(404).send({ error: 'User not found' });
    }

    if (!user.wallet) {
      return { items: [], page, limit, total: 0, hasMore: false };
    }

    // Фильтр по типу
    const where: any = { walletId: user.wallet.id };
    if (type !== 'all') {
      where.type = type;
    }

    // Получаем транзакции
    const [transactions, total] = await Promise.all([
      db.transaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          relatedUser: { select: { id: true, username: true, firstName: true } },
        },
      }),
      db.transaction.count({ where }),
    ]);

    // Получаем статистику по типам
    const typeStats = await db.transaction.groupBy({
      by: ['type'],
      where: { walletId: user.wallet.id },
      _count: true,
      _sum: { amount: true },
    });

    return {
      items: transactions.map((tx) => ({
        id: tx.id,
        type: tx.type,
        currency: tx.currency,
        amount: tx.amount.toString(),
        balanceAfter: tx.balanceAfter.toString(),
        fee: tx.fee?.toString() || null,
        description: tx.description,
        relatedUser: tx.relatedUser,
        createdAt: tx.createdAt.toISOString(),
      })),
      stats: typeStats.map((s) => ({
        type: s.type,
        count: s._count,
        totalAmount: s._sum.amount?.toString() || '0',
      })),
      page,
      limit,
      total,
      hasMore: page * limit < total,
    };
  });

  // -------- BLOCK/UNBLOCK USER --------
  const BlockUserSchema = z.object({
    userId: z.string().uuid(),
    blocked: z.boolean(),
    reason: z.string().max(255).optional(),
  });

  app.post('/users/block', async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId, blocked, reason } = BlockUserSchema.parse(request.body);

    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      return reply.status(404).send({ error: 'User not found' });
    }

    await db.user.update({
      where: { id: userId },
      data: {
        isBlocked: blocked,
        blockReason: blocked ? (reason || 'Blocked by admin') : null,
      },
    });

    // Записываем в аудит-лог
    await auditService.log({
      actor: 'admin',
      action: blocked ? 'USER_BLOCK' : 'USER_UNBLOCK',
      targetType: 'user',
      targetId: userId,
      details: { blocked, reason },
      ipAddress: request.ip,
    });

    return { success: true, userId, blocked };
  });

  // -------- UPDATE USER NOTES --------
  const UpdateNotesSchema = z.object({
    userId: z.string().uuid(),
    notes: z.string().max(2000),
  });

  app.post('/users/notes', async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId, notes } = UpdateNotesSchema.parse(request.body);

    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      return reply.status(404).send({ error: 'User not found' });
    }

    await db.user.update({
      where: { id: userId },
      data: { adminNotes: notes || null },
    });

    return { success: true, userId };
  });

  // -------- UPDATE BALANCE --------
  app.post('/balance/adjust', async (request: FastifyRequest) => {
    const { userId, currency, amount: amountStr, reason } = UpdateBalanceSchema.parse(request.body);
    const amount = new Decimal(amountStr);

    // FIX: Use executeFinancialTransaction with proper locking
    const result = await executeFinancialTransaction(async (tx) => {
      // FIX: Use getWalletWithLock to prevent race conditions
      const wallet = await getWalletWithLock(tx, userId);

      const currentBalance = currency === 'USDT' ? wallet.balanceUsdt : wallet.balanceX;
      const newBalance = currentBalance.plus(amount);

      if (newBalance.lt(0)) {
        throw new BadRequestError('Resulting balance cannot be negative');
      }

      // Update balance with proper field
      const updateData = currency === 'USDT' 
        ? { balanceUsdt: newBalance }
        : { balanceX: newBalance };

      await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balanceUsdt: updateData.balanceUsdt 
            ? new Prisma.Decimal(updateData.balanceUsdt.toString()) 
            : undefined,
          balanceX: updateData.balanceX 
            ? new Prisma.Decimal(updateData.balanceX.toString()) 
            : undefined,
        },
      });

      // FIX: Use createTransactionRecord with proper Decimal handling
      await createTransactionRecord(tx, {
        walletId: wallet.id,
        type: amount.gte(0) ? 'deposit' : 'withdraw',
        currency,
        amount: amount,
        balanceAfter: newBalance,
        description: `Admin adjustment: ${reason}`,
      });

      return { newBalance: newBalance.toString() };
    });

    // Записываем в аудит-лог
    await auditService.log({
      actor: 'admin',
      action: 'BALANCE_ADJUST',
      targetType: 'user',
      targetId: userId,
      details: { currency, amount: amountStr, reason, newBalance: result.newBalance },
      ipAddress: request.ip,
    });

    return {
      success: true,
      userId,
      currency,
      adjustment: amountStr,
      newBalance: result.newBalance,
      reason,
    };
  });

  // -------- PENDING WITHDRAWALS --------
  app.get('/withdrawals/pending', async () => {
    return withdrawService.getPendingWithdrawals();
  });

  // -------- UPDATE WITHDRAWAL STATUS --------
  app.post('/withdrawals/update', async (request: FastifyRequest) => {
    const { withdrawId, status, txHash, failReason } = UpdateWithdrawSchema.parse(request.body);
    
    await withdrawService.updateWithdrawStatus(
      withdrawId, 
      status as WithdrawStatus, 
      txHash,
      failReason
    );

    // Записываем в аудит-лог
    const auditAction = (status === 'COMPLETED' || status === 'PROCESSING') 
      ? 'WITHDRAW_APPROVE' 
      : 'WITHDRAW_REJECT';
      
    await auditService.log({
      actor: 'admin',
      action: auditAction,
      targetType: 'withdraw',
      targetId: withdrawId,
      details: { status, txHash, failReason },
      ipAddress: request.ip,
    });

    return { success: true, withdrawId, status };
  });

  // -------- SYSTEM SETTINGS --------
  app.get('/settings', async () => {
    const settings = await db.settings.findMany();
    return settings.reduce((acc, s) => {
      acc[s.key] = s.value;
      return acc;
    }, {} as Record<string, string>);
  });

  app.post('/settings', async (request: FastifyRequest) => {
    const { key, value } = z.object({
      key: z.string().min(1).max(50),
      value: z.string(),
    }).parse(request.body);

    // Use settingsService to properly invalidate cache!
    await settingsService.set(key, value);

    // Записываем в аудит-лог
    await auditService.log({
      actor: 'admin',
      action: 'SETTINGS_UPDATE',
      targetType: 'settings',
      targetId: key,
      details: { value },
      ipAddress: request.ip,
    });

    return { success: true, key, value };
  });

  // -------- AUDIT LOG --------
  app.get('/audit', async (request: FastifyRequest) => {
    const { page, limit, action } = AuditLogSchema.parse(request.query);
    
    const result = await auditService.getEntries({
      action,
      limit,
      offset: (page - 1) * limit,
    });

    return {
      ...result,
      page,
      limit,
      hasMore: page * limit < result.total,
    };
  });
}
