import { Decimal } from 'decimal.js';
import { Prisma } from '@prisma/client';
import { db } from '../db.js';
import { notificationService } from './notification.js';
import { createServiceLogger } from '../utils/logger.js';
import { 
  executeFinancialTransaction,
  getWalletWithLock,
  updateWalletBalance,
  createTransactionRecord,
} from './wallet.js';

const logger = createServiceLogger('Deposit');

interface DepositPayload {
  txHash: string;
  fromAddress: string;
  amount: string;  // В USDT
  memo: string;    // Telegram ID пользователя
}

interface DepositResult {
  success: boolean;
  error?: string;
  alreadyProcessed?: boolean;
}

class DepositService {
  /**
   * Process incoming deposit with idempotency
   * Called by webhook upon payment receipt
   * 
   * C2 FIX: Uses unique txHash constraint for idempotency
   */
  async processDeposit(payload: DepositPayload): Promise<DepositResult> {
    const { txHash, fromAddress, amount, memo } = payload;

    // Validate txHash format
    if (!txHash || txHash.length < 10) {
      logger.warn('Invalid txHash received', { txHash });
      return { success: false, error: 'Invalid transaction hash' };
    }

    // Check idempotency BEFORE transaction (fast path)
    // This uses the unique index on externalTxHash
    const existingTx = await db.transaction.findFirst({
      where: { externalTxHash: txHash },
      select: { id: true },
    });

    if (existingTx) {
      logger.info('Transaction already processed (idempotent)', { txHash });
      return { success: true, alreadyProcessed: true };
    }

    // Parse memo to get telegramId
    const telegramId = this.parseMemo(memo);
    if (!telegramId) {
      logger.warn('Invalid memo received', { memo });
      return { success: false, error: 'Invalid memo - cannot identify user' };
    }

    // Find user
    const user = await db.user.findUnique({
      where: { telegramId },
      select: { id: true, telegramId: true, isBlocked: true },
    });

    if (!user) {
      logger.warn('User not found for deposit', { telegramId: telegramId.toString() });
      return { success: false, error: 'User not found' };
    }

    // Don't process deposits for blocked users
    if (user.isBlocked) {
      logger.warn('Deposit attempted for blocked user', { userId: user.id, txHash });
      return { success: false, error: 'User account is blocked' };
    }

    try {
      const depositAmount = new Decimal(amount);
      
      // Validate amount
      if (depositAmount.lte(0)) {
        return { success: false, error: 'Invalid deposit amount' };
      }

      await executeFinancialTransaction(async (tx) => {
        // Get wallet with lock for atomic update
        const wallet = await getWalletWithLock(tx, user.id);
        
        const newBalance = wallet.balanceUsdt.plus(depositAmount);

        // Update balance
        await updateWalletBalance(tx, wallet.id, {
          balanceUsdt: newBalance,
        });

        // Create transaction with externalTxHash for idempotency
        // If txHash already exists, this will throw unique constraint error
        await createTransactionRecord(tx, {
          walletId: wallet.id,
          type: 'deposit',
          currency: 'USDT',
          amount: depositAmount,
          balanceAfter: newBalance,
          description: `Deposit from ${fromAddress.slice(0, 8)}...`,
          externalTxHash: txHash, // C2 FIX: Unique constraint ensures idempotency
        });
      });

      // Send notification (outside transaction)
      await notificationService.notifyDeposit(
        user.telegramId.toString(),
        amount,
        'USDT'
      );

      logger.info('Deposit processed', { amount, userId: user.id, txHash });
      return { success: true };

    } catch (error: any) {
      // Handle unique constraint violation (duplicate txHash)
      if (error.code === 'P2002' && error.meta?.target?.includes('external_tx_hash')) {
        logger.info('Transaction already processed (constraint)', { txHash });
        return { success: true, alreadyProcessed: true };
      }

      logger.error('Failed to process deposit', error, { txHash });
      return { success: false, error: 'Failed to process deposit' };
    }
  }

  /**
   * Parse memo (can be telegramId or other format)
   */
  private parseMemo(memo: string): bigint | null {
    try {
      const cleaned = memo.trim();
      if (/^\d+$/.test(cleaned)) {
        return BigInt(cleaned);
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Get deposit information
   */
  getDepositInfo(telegramId: string) {
    return {
      address: process.env.DEPOSIT_ADDRESS || 'EQxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      memo: telegramId,
      currency: 'USDT',
      network: 'TON',
      minAmount: '1',
      note: 'Always include your Telegram ID as memo when sending!',
    };
  }
}

export const depositService = new DepositService();
