import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { Decimal } from 'decimal.js';
import { Prisma } from '@prisma/client';
import crypto from 'crypto';
import { db } from '../../db.js';
import { rateLimiters } from '../../middleware/rateLimit.js';
import { SendSchema, SearchUserSchema, getSendConfig } from './schemas.js';
import { isNumeric, isUUID } from './helpers.js';
import { AppError, BadRequestError } from '../../utils/errors.js';
import { notificationService } from '../../services/notification.js';
import {
  getWalletWithLock,
  checkUserNotBlockedTx,
  updateWalletBalance,
  createTransactionRecord,
  executeFinancialTransaction,
  deductBalance,
} from '../../services/wallet.js';

// ============ CONFIRMATION TOKEN STORE ============
// In-memory store for pending transfers (TTL: 5 minutes)
// For production with multiple instances, use Redis
interface PendingTransfer {
  senderId: string;
  toUserId: string;
  amount: string;
  fee: string;
  total: string;
  receiverName: string;
  createdAt: number;
}

const pendingTransfers = new Map<string, PendingTransfer>();
const CONFIRMATION_TTL = 5 * 60 * 1000; // 5 minutes

// Cleanup expired tokens every minute
setInterval(() => {
  const now = Date.now();
  for (const [token, transfer] of pendingTransfers.entries()) {
    if (now - transfer.createdAt > CONFIRMATION_TTL) {
      pendingTransfers.delete(token);
    }
  }
}, 60 * 1000);

// ============ SCHEMAS ============
const SendPreviewSchema = z.object({
  toUserId: z.string().uuid('Invalid user ID'),
  amount: z.string().refine(
    (v) => !isNaN(parseFloat(v)) && parseFloat(v) > 0,
    'Amount must be positive'
  ),
});

const SendConfirmSchema = z.object({
  confirmationToken: z.string().min(32, 'Invalid confirmation token'),
});

export async function sendRoutes(app: FastifyInstance) {
  // -------- SEND INFO (fee, limits) --------
  app.get('/send/info', {
    preHandler: [app.authenticate],
  }, async () => {
    const config = await getSendConfig();
    return {
      minAmount: config.minAmount,
      fee: config.fee,
      currency: 'X',
    };
  });

  // -------- SEND PREVIEW (Step 1: Calculate & get confirmation token) --------
  app.post('/send/preview', {
    preHandler: [app.authenticate, rateLimiters.financial],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.user as { userId: string };

    try {
      const { toUserId, amount: amountStr } = SendPreviewSchema.parse(request.body);
      
      if (userId === toUserId) {
        return reply.status(400).send({ error: 'Cannot send to yourself' });
      }

      const amount = new Decimal(amountStr);
      const { minAmount, fee: feeAmount } = await getSendConfig();
      const fee = new Decimal(feeAmount);

      if (amount.lt(minAmount)) {
        return reply.status(400).send({ error: `Minimum amount is ${minAmount} $X` });
      }

      const totalDeduct = amount.plus(fee);

      // Check sender has enough balance (read-only check)
      const senderWallet = await db.wallet.findUnique({ where: { userId } });
      if (!senderWallet) {
        return reply.status(404).send({ error: 'Wallet not found' });
      }

      const senderBalance = new Decimal(senderWallet.balanceX.toString());
      if (senderBalance.lt(totalDeduct)) {
        return reply.status(400).send({ 
          error: 'Insufficient balance',
          code: 'INSUFFICIENT_BALANCE',
          required: totalDeduct.toFixed(2),
          available: senderBalance.toFixed(2),
        });
      }

      // Get receiver info
      const receiver = await db.user.findUnique({
        where: { id: toUserId },
        select: { id: true, username: true, firstName: true, isBlocked: true },
      });

      if (!receiver) {
        return reply.status(404).send({ error: 'Recipient not found' });
      }

      if (receiver.isBlocked) {
        return reply.status(400).send({ error: 'Cannot send to blocked user' });
      }

      // Generate confirmation token
      const confirmationToken = crypto.randomBytes(32).toString('hex');
      const receiverName = receiver.username || receiver.firstName || 'User';

      // Store pending transfer
      pendingTransfers.set(confirmationToken, {
        senderId: userId,
        toUserId,
        amount: amount.toString(),
        fee: fee.toString(),
        total: totalDeduct.toString(),
        receiverName,
        createdAt: Date.now(),
      });

      return {
        confirmationToken,
        preview: {
          toUserId,
          receiverName,
          receiverUsername: receiver.username,
          amount: amount.toFixed(2),
          fee: fee.toFixed(2),
          total: totalDeduct.toFixed(2),
          currency: 'X',
          expiresIn: CONFIRMATION_TTL / 1000, // seconds
        },
      };
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: error.errors[0].message });
      }
      app.log.error(error);
      return reply.status(500).send({ error: 'Preview failed' });
    }
  });

  // -------- SEND CONFIRM (Step 2: Execute transfer) --------
  app.post('/send/confirm', {
    preHandler: [app.authenticate, rateLimiters.financial],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.user as { userId: string };

    try {
      const { confirmationToken } = SendConfirmSchema.parse(request.body);

      // Get and validate pending transfer
      const pending = pendingTransfers.get(confirmationToken);
      
      if (!pending) {
        return reply.status(400).send({ 
          error: 'Invalid or expired confirmation token',
          code: 'INVALID_TOKEN',
        });
      }

      // Check token belongs to this user
      if (pending.senderId !== userId) {
        return reply.status(403).send({ error: 'Token does not belong to you' });
      }

      // Check not expired
      if (Date.now() - pending.createdAt > CONFIRMATION_TTL) {
        pendingTransfers.delete(confirmationToken);
        return reply.status(400).send({ 
          error: 'Confirmation token expired. Please create a new transfer.',
          code: 'TOKEN_EXPIRED',
        });
      }

      // Delete token immediately to prevent double-spend
      pendingTransfers.delete(confirmationToken);

      const amount = new Decimal(pending.amount);
      const fee = new Decimal(pending.fee);
      const totalDeduct = new Decimal(pending.total);
      const toUserId = pending.toUserId;

      // Execute transfer
      const result = await executeFinancialTransaction(async (tx) => {
        // Check if sender is blocked (inside transaction)
        await checkUserNotBlockedTx(tx, userId);

        // Check if receiver is blocked
        await checkUserNotBlockedTx(tx, toUserId);

        // Get sender wallet with lock
        const senderWallet = await getWalletWithLock(tx, userId);
        
        // Check balance with deduction
        const senderNewBalance = deductBalance(
          senderWallet.balanceX,
          totalDeduct,
          'X'
        );

        // Get receiver wallet with lock
        const receiverWallet = await getWalletWithLock(tx, toUserId);
        const receiverNewBalance = receiverWallet.balanceX.plus(amount);

        // Update sender balance
        await updateWalletBalance(tx, senderWallet.id, {
          balanceX: senderNewBalance,
        });

        // Update receiver balance
        await updateWalletBalance(tx, receiverWallet.id, {
          balanceX: receiverNewBalance,
        });

        // Create sender transaction record
        await createTransactionRecord(tx, {
          walletId: senderWallet.id,
          type: 'send',
          currency: 'X',
          amount: totalDeduct.neg(),
          balanceAfter: senderNewBalance,
          fee: fee,
          relatedUserId: toUserId,
          description: `Sent ${amount.toFixed(2)} $X (fee: ${fee.toFixed(2)})`,
        });

        // Create receiver transaction record
        await createTransactionRecord(tx, {
          walletId: receiverWallet.id,
          type: 'receive',
          currency: 'X',
          amount: amount,
          balanceAfter: receiverNewBalance,
          relatedUserId: userId,
          description: 'Received $X',
        });

        return {
          senderNewBalance,
          receiverNewBalance,
        };
      });

      // FIX: Send notifications AFTER successful transfer
      try {
        // Get user info for notifications
        const [sender, receiver] = await Promise.all([
          db.user.findUnique({ 
            where: { id: userId }, 
            select: { username: true, firstName: true, telegramId: true } 
          }),
          db.user.findUnique({ 
            where: { id: toUserId }, 
            select: { telegramId: true } 
          }),
        ]);

        const senderName = sender?.username || sender?.firstName || 'Someone';

        // Notify sender
        if (sender?.telegramId) {
          await notificationService.notifySent(
            sender.telegramId.toString(),
            amount.toFixed(2),
            pending.receiverName
          );
        }

        // Notify receiver
        if (receiver?.telegramId) {
          await notificationService.notifyReceived(
            receiver.telegramId.toString(),
            amount.toFixed(2),
            senderName
          );
        }
      } catch (notifyError) {
        // Don't fail the transfer if notification fails
        app.log.error(notifyError, 'Failed to send transfer notifications');
      }

      return {
        success: true,
        sent: amount.toFixed(2),
        fee: fee.toFixed(2),
        total: totalDeduct.toFixed(2),
        newBalance: result.senderNewBalance.toFixed(2),
        recipient: pending.receiverName,
      };
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: error.errors[0].message });
      }
      app.log.error(error);
      return reply.status(500).send({ error: 'Send failed' });
    }
  });

  // -------- LEGACY: Direct send (deprecated, redirects to preview flow) --------
  app.post('/send', {
    preHandler: [app.authenticate, rateLimiters.financial],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    // Return error prompting to use new flow
    return reply.status(400).send({ 
      error: 'Direct send is disabled. Please use /send/preview and /send/confirm flow.',
      code: 'USE_CONFIRMATION_FLOW',
      hint: 'POST /send/preview first, then POST /send/confirm with the token',
    });
  });

  // -------- SEARCH USERS --------
  app.get('/users/search', {
    preHandler: [app.authenticate, rateLimiters.search],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.user as { userId: string };

    try {
      const { query } = SearchUserSchema.parse(request.query);
      const trimmedQuery = query.trim();

      // Build search conditions
      const searchConditions: Prisma.UserWhereInput[] = [
        { username: { contains: trimmedQuery, mode: 'insensitive' } },
        { firstName: { contains: trimmedQuery, mode: 'insensitive' } },
      ];

      // If query looks like UUID - search by id
      if (isUUID(trimmedQuery)) {
        searchConditions.push({ id: trimmedQuery });
      }

      // If query is numeric - search by telegramId
      if (isNumeric(trimmedQuery)) {
        try {
          searchConditions.push({ telegramId: BigInt(trimmedQuery) });
        } catch {
          // Ignore if BigInt fails
        }
      }

      const users = await db.user.findMany({
        where: {
          AND: [
            { id: { not: userId } }, // Exclude self
            { isBlocked: false },    // Exclude blocked users
            { OR: searchConditions },
          ],
        },
        select: {
          id: true,
          username: true,
          firstName: true,
          telegramId: true,
        },
        take: 10,
      });

      return {
        users: users.map((u) => ({
          id: u.id,
          username: u.username,
          firstName: u.firstName,
          telegramId: u.telegramId.toString(),
        })),
      };
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: error.errors[0].message });
      }
      app.log.error(error);
      return reply.status(500).send({ error: 'Search failed' });
    }
  });
}
