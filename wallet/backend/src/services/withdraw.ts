import { Decimal } from 'decimal.js';
import { Prisma, WithdrawStatus } from '@prisma/client';
import { db } from '../db.js';
import { notificationService } from './notification.js';
import { settingsService } from './settings.js';
import { createServiceLogger } from '../utils/logger.js';
import { isValidTonAddress, getTonAddressInfo } from '../utils/ton.js';
import { 
  InsufficientBalanceError, 
  MinimumAmountError, 
  BadRequestError,
  WalletNotFoundError,
  NotFoundError,
} from '../utils/errors.js';
import {
  executeFinancialTransaction,
  getWalletWithLock,
  updateWalletBalance,
  createTransactionRecord,
  checkUserNotBlockedTx,
  deductBalance,
} from './wallet.js';

const logger = createServiceLogger('Withdraw');

// H7 FIX: Maximum pending withdrawals per user
const MAX_PENDING_WITHDRAWALS = 3;

interface WithdrawRequest {
  userId: string;
  amount: string;
  toAddress: string;
}

interface WithdrawResult {
  id: string;
  status: WithdrawStatus;
  amount: string;
  fee: string;
  netAmount: string;
  toAddress: string;
}

class WithdrawService {
  /**
   * Create withdrawal request with proper locking
   */
  async createWithdrawRequest(request: WithdrawRequest): Promise<WithdrawResult> {
    const { userId, amount: amountStr, toAddress } = request;

    // FIX: Validate address with proper checksum verification
    if (!isValidTonAddress(toAddress)) {
      const info = getTonAddressInfo(toAddress);
      logger.warn('Invalid TON address', { toAddress, info });
      throw new BadRequestError('Invalid TON address. Please check the address format and checksum.');
    }

    // Log address info for debugging
    const addressInfo = getTonAddressInfo(toAddress);
    if (addressInfo.isTestOnly) {
      logger.warn('Testnet address used for withdrawal', { toAddress, userId });
      throw new BadRequestError('Testnet addresses are not allowed for withdrawals');
    }

    const amount = new Decimal(amountStr);

    // Get dynamic config from settings
    const config = await settingsService.getWithdrawConfig();

    // Validate minimum amount
    if (amount.lt(config.minAmount)) {
      throw new MinimumAmountError(config.minAmount, 'USDT');
    }

    // Validate maximum amount
    if (amount.gt(config.maxAmount)) {
      throw new BadRequestError(`Maximum withdrawal is ${config.maxAmount} USDT`);
    }

    // Calculate fee and net amount
    const fee = new Decimal(config.fee);
    const netAmount = amount.minus(fee);

    if (netAmount.lte(0)) {
      throw new BadRequestError('Amount must be greater than fee');
    }

    const result = await executeFinancialTransaction(async (tx) => {
      // Check if user is blocked
      await checkUserNotBlockedTx(tx, userId);

      // H7 FIX: Check pending withdrawal limit
      const pendingCount = await tx.withdrawRequest.count({
        where: { 
          userId, 
          status: { in: ['PENDING', 'PROCESSING'] }
        },
      });

      if (pendingCount >= MAX_PENDING_WITHDRAWALS) {
        throw new BadRequestError(
          `Maximum ${MAX_PENDING_WITHDRAWALS} pending withdrawals allowed. ` +
          'Please wait for current withdrawals to complete.'
        );
      }

      // C1 FIX: Get wallet with pessimistic lock
      const wallet = await getWalletWithLock(tx, userId);

      // Check balance with deduction
      const newBalance = deductBalance(wallet.balanceUsdt, amount, 'USDT');

      // C6 FIX: Update balance with proper Decimal handling
      await updateWalletBalance(tx, wallet.id, {
        balanceUsdt: newBalance,
      });

      // Create transaction record
      const transaction = await createTransactionRecord(tx, {
        walletId: wallet.id,
        type: 'withdraw',
        currency: 'USDT',
        amount: amount.neg(),
        balanceAfter: newBalance,
        fee: fee,
        description: `Withdraw to ${toAddress.slice(0, 8)}...`,
      });

      // Create withdrawal request
      const withdrawRequest = await tx.withdrawRequest.create({
        data: {
          userId,
          amount: new Prisma.Decimal(amount.toString()),
          fee: new Prisma.Decimal(fee.toString()),
          netAmount: new Prisma.Decimal(netAmount.toString()),
          toAddress,
          status: 'PENDING',
          transactionId: transaction.id,
        },
      });

      return {
        id: withdrawRequest.id,
        transactionId: transaction.id,
        newBalance,
      };
    });

    // Notify user (outside transaction)
    const user = await db.user.findUnique({ 
      where: { id: userId },
      select: { telegramId: true },
    });
    
    if (user) {
      await notificationService.notifyWithdraw(
        user.telegramId.toString(),
        netAmount.toString(),
        toAddress,
        'pending'
      );
    }

    return {
      id: result.id,
      status: 'PENDING',
      amount: amount.toString(),
      fee: fee.toString(),
      netAmount: netAmount.toString(),
      toAddress,
    };
  }

  /**
   * Update withdrawal status (called by admin)
   */
  async updateWithdrawStatus(
    withdrawId: string, 
    status: WithdrawStatus,
    txHash?: string,
    failReason?: string
  ): Promise<void> {
    const withdrawRequest = await db.withdrawRequest.findUnique({
      where: { id: withdrawId },
      include: { 
        user: { select: { id: true, telegramId: true } },
        transaction: true,
      },
    });

    if (!withdrawRequest) {
      throw new NotFoundError('Withdraw request not found');
    }

    // FIX: Check previous status to prevent double refund
    const previousStatus = withdrawRequest.status;
    const alreadyRefunded = previousStatus === 'FAILED' || previousStatus === 'CANCELLED';

    // If failed/cancelled — refund funds (only if not already refunded)
    if (status === 'FAILED' || status === 'CANCELLED') {
      if (alreadyRefunded) {
        logger.warn('Withdraw already refunded, skipping', { withdrawId, previousStatus, newStatus: status });
        throw new BadRequestError('Withdrawal already processed with refund');
      }

      // FIX: Only refund if previous status was PENDING or PROCESSING
      if (previousStatus !== 'PENDING' && previousStatus !== 'PROCESSING') {
        throw new BadRequestError(`Cannot change status from ${previousStatus} to ${status}`);
      }

      await executeFinancialTransaction(async (tx) => {
        // FIX: Use getWalletWithLock for safe refund
        const wallet = await getWalletWithLock(tx, withdrawRequest.userId);
        const newBalance = wallet.balanceUsdt.plus(new Decimal(withdrawRequest.amount.toString()));

        await updateWalletBalance(tx, wallet.id, {
          balanceUsdt: newBalance,
        });

        // Update request
        await tx.withdrawRequest.update({
          where: { id: withdrawId },
          data: {
            status,
            failReason,
            processedAt: new Date(),
          },
        });

        // Create refund transaction record
        await createTransactionRecord(tx, {
          walletId: wallet.id,
          type: 'deposit',
          currency: 'USDT',
          amount: new Decimal(withdrawRequest.amount.toString()),
          balanceAfter: newBalance,
          description: `Withdraw ${status.toLowerCase()} - refunded`,
        });
      });
    } else {
      // Update request
      await db.withdrawRequest.update({
        where: { id: withdrawId },
        data: {
          status,
          txHash: status === 'COMPLETED' ? txHash : undefined,
          processedAt: status === 'COMPLETED' ? new Date() : undefined,
        },
      });

      // Update transaction description
      if (withdrawRequest.transactionId && txHash) {
        await db.transaction.update({
          where: { id: withdrawRequest.transactionId },
          data: {
            description: `Withdraw completed | TX: ${txHash}`,
          },
        });
      }
    }

    // Notify user
    if (withdrawRequest.user) {
      const notifyStatus = status === 'COMPLETED' ? 'completed' : 'failed';
      await notificationService.notifyWithdraw(
        withdrawRequest.user.telegramId.toString(),
        withdrawRequest.netAmount.toString(),
        withdrawRequest.toAddress,
        notifyStatus
      );
    }
  }

  /**
   * Get user's withdrawal history
   */
  async getWithdrawHistory(userId: string) {
    const withdrawals = await db.withdrawRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return withdrawals.map((w) => ({
      id: w.id,
      amount: w.amount.toString(),
      fee: w.fee.toString(),
      netAmount: w.netAmount.toString(),
      toAddress: w.toAddress,
      status: w.status.toLowerCase(),
      txHash: w.txHash,
      failReason: w.failReason,
      createdAt: w.createdAt.toISOString(),
      processedAt: w.processedAt?.toISOString() || null,
    }));
  }

  /**
   * Get pending withdrawals for admin
   */
  async getPendingWithdrawals() {
    const withdrawals = await db.withdrawRequest.findMany({
      where: {
        status: { in: ['PENDING', 'PROCESSING'] },
      },
      include: {
        user: {
          select: { id: true, username: true, firstName: true, telegramId: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return withdrawals.map((w) => ({
      id: w.id,
      amount: w.amount.toString(),
      fee: w.fee.toString(),
      netAmount: w.netAmount.toString(),
      toAddress: w.toAddress,
      status: w.status.toLowerCase(),
      txHash: w.txHash,
      user: w.user ? {
        id: w.user.id,
        username: w.user.username,
        firstName: w.user.firstName,
        telegramId: w.user.telegramId.toString(),
      } : null,
      createdAt: w.createdAt.toISOString(),
    }));
  }

  /**
   * Get withdrawal info for API
   */
  async getWithdrawInfo() {
    const config = await settingsService.getWithdrawConfig();
    return {
      minAmount: config.minAmount,
      maxAmount: config.maxAmount,
      fee: config.fee,
      currency: 'USDT',
      network: 'TON',
      maxPending: MAX_PENDING_WITHDRAWALS,
    };
  }
}

export const withdrawService = new WithdrawService();
