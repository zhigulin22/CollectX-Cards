import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { Decimal } from 'decimal.js';
import { SwapSchema, getSwapConfig } from './schemas.js';
import { AppError } from '../../utils/errors.js';
import { rateLimiters } from '../../middleware/rateLimit.js';
import {
  getWalletWithLock,
  checkUserNotBlockedTx,
  updateWalletBalance,
  createTransactionRecord,
  executeFinancialTransaction,
  deductBalance,
} from '../../services/wallet.js';

export async function swapRoutes(app: FastifyInstance) {
  // FIX: Added rate limiting for financial operation
  app.post('/swap', {
    preHandler: [app.authenticate, rateLimiters.financial],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.user as { userId: string };

    try {
      const { amount: amountStr, direction } = SwapSchema.parse(request.body);
      const amount = new Decimal(amountStr);

      // Get dynamic config from settings
      const { feePercent, rate, minSwapUsdt } = await getSwapConfig();

      // Validate minimum amount (M11 fix)
      const minAmount = direction === 'usdt_to_x' ? minSwapUsdt : minSwapUsdt * rate;
      if (amount.lt(minAmount)) {
        return reply.status(400).send({ 
          error: `Minimum swap amount is ${minAmount} ${direction === 'usdt_to_x' ? 'USDT' : '$X'}` 
        });
      }

      const result = await executeFinancialTransaction(async (tx) => {
        // Check if user is blocked (inside transaction)
        await checkUserNotBlockedTx(tx, userId);

        // Get wallet with pessimistic lock (C1 fix)
        const wallet = await getWalletWithLock(tx, userId);

        let newBalanceUsdt: Decimal;
        let newBalanceX: Decimal;
        let fee: Decimal;
        let received: Decimal;
        let description: string;

        if (direction === 'usdt_to_x') {
          // USDT → $X
          newBalanceUsdt = deductBalance(wallet.balanceUsdt, amount, 'USDT');
          
          fee = amount.mul(feePercent).div(100);
          const netAmount = amount.minus(fee);
          received = netAmount.mul(rate);
          
          newBalanceX = wallet.balanceX.plus(received);
          description = `Swap ${amount} USDT → ${received.toFixed(2)} $X`;

          // Create USDT debit transaction
          await createTransactionRecord(tx, {
            walletId: wallet.id,
            type: 'swap',
            currency: 'USDT',
            amount: amount.neg(),
            balanceAfter: newBalanceUsdt,
            fee: fee,
            description,
          });

          // Create $X credit transaction
          await createTransactionRecord(tx, {
            walletId: wallet.id,
            type: 'swap',
            currency: 'X',
            amount: received,
            balanceAfter: newBalanceX,
            description,
          });
        } else {
          // $X → USDT
          newBalanceX = deductBalance(wallet.balanceX, amount, 'X');
          
          const usdtAmount = amount.div(rate);
          fee = usdtAmount.mul(feePercent).div(100);
          received = usdtAmount.minus(fee);
          
          newBalanceUsdt = wallet.balanceUsdt.plus(received);
          description = `Swap ${amount} $X → ${received.toFixed(6)} USDT`;

          // Create $X debit transaction
          await createTransactionRecord(tx, {
            walletId: wallet.id,
            type: 'swap',
            currency: 'X',
            amount: amount.neg(),
            balanceAfter: newBalanceX,
            description,
          });

          // Create USDT credit transaction
          await createTransactionRecord(tx, {
            walletId: wallet.id,
            type: 'swap',
            currency: 'USDT',
            amount: received,
            balanceAfter: newBalanceUsdt,
            fee: fee,
            description,
          });
        }

        // Update wallet balances (C6 fix - proper Decimal handling)
        await updateWalletBalance(tx, wallet.id, {
          balanceUsdt: newBalanceUsdt,
          balanceX: newBalanceX,
        });

        return {
          success: true,
          direction,
          swapped: amount.toString(),
          fee: fee.toString(),
          received: received.toString(),
          balanceUsdt: newBalanceUsdt.toString(),
          balanceX: newBalanceX.toFixed(2),
        };
      });

      return result;
    } catch (error: any) {
      // Re-throw AppError to be handled by errorHandler
      if (error instanceof AppError) {
        throw error;
      }
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: error.errors[0].message });
      }
      app.log.error(error);
      return reply.status(500).send({ error: 'Swap failed' });
    }
  });
}
