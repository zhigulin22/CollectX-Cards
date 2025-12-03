/**
 * Wallet Service - Secure financial operations
 * CRITICAL: All balance modifications MUST go through this service
 * 
 * Uses pessimistic locking (SELECT FOR UPDATE) to prevent race conditions
 */

import { Prisma, PrismaClient } from '@prisma/client';
import { Decimal } from 'decimal.js';
import { db } from '../db.js';
import { 
  InsufficientBalanceError, 
  WalletNotFoundError,
  ForbiddenError,
} from '../utils/errors.js';

// Transaction client type
type TxClient = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

interface WalletWithLock {
  id: string;
  userId: string;
  balanceUsdt: Decimal;
  balanceX: Decimal;
}

/**
 * Get wallet with pessimistic lock (SELECT FOR UPDATE)
 * MUST be called within a transaction!
 */
export async function getWalletWithLock(
  tx: TxClient,
  userId: string
): Promise<WalletWithLock> {
  // Use raw query for FOR UPDATE - Prisma doesn't support it natively
  const wallets = await tx.$queryRaw<Array<{
    id: string;
    user_id: string;
    balance_usdt: Prisma.Decimal;
    balance_x: Prisma.Decimal;
  }>>`
    SELECT id, user_id, balance_usdt, balance_x 
    FROM wallets 
    WHERE user_id = ${userId}
    FOR UPDATE
  `;

  if (!wallets || wallets.length === 0) {
    throw new WalletNotFoundError();
  }

  const wallet = wallets[0];
  return {
    id: wallet.id,
    userId: wallet.user_id,
    balanceUsdt: new Decimal(wallet.balance_usdt.toString()),
    balanceX: new Decimal(wallet.balance_x.toString()),
  };
}

/**
 * Check if user is blocked
 * Throws ForbiddenError if blocked
 */
export async function checkUserNotBlockedTx(
  tx: TxClient,
  userId: string
): Promise<void> {
  const user = await tx.user.findUnique({
    where: { id: userId },
    select: { isBlocked: true, blockReason: true },
  });

  if (user?.isBlocked) {
    throw new ForbiddenError(user.blockReason || 'Your account is blocked');
  }
}

/**
 * Update wallet balance atomically
 * Uses Prisma Decimal to prevent precision loss
 */
export async function updateWalletBalance(
  tx: TxClient,
  walletId: string,
  updates: {
    balanceUsdt?: Decimal;
    balanceX?: Decimal;
  }
): Promise<void> {
  const data: Prisma.WalletUpdateInput = {};
  
  if (updates.balanceUsdt !== undefined) {
    // Convert to string then to Prisma Decimal to preserve precision
    data.balanceUsdt = new Prisma.Decimal(updates.balanceUsdt.toString());
  }
  
  if (updates.balanceX !== undefined) {
    data.balanceX = new Prisma.Decimal(updates.balanceX.toString());
  }

  await tx.wallet.update({
    where: { id: walletId },
    data,
  });
}

/**
 * Deduct from balance with check
 * Returns new balance or throws InsufficientBalanceError
 */
export function deductBalance(
  currentBalance: Decimal,
  amount: Decimal,
  currency: 'USDT' | 'X'
): Decimal {
  if (currentBalance.lt(amount)) {
    throw new InsufficientBalanceError(currency);
  }
  return currentBalance.minus(amount);
}

/**
 * Create transaction record with proper Decimal handling
 */
export async function createTransactionRecord(
  tx: TxClient,
  data: {
    walletId: string;
    type: 'deposit' | 'withdraw' | 'swap' | 'send' | 'receive';
    currency: 'USDT' | 'X';
    amount: Decimal;
    balanceAfter: Decimal;
    fee?: Decimal;
    relatedUserId?: string;
    description?: string;
    externalTxHash?: string;
  }
): Promise<{ id: string }> {
  return tx.transaction.create({
    data: {
      walletId: data.walletId,
      type: data.type,
      currency: data.currency,
      amount: new Prisma.Decimal(data.amount.toString()),
      balanceAfter: new Prisma.Decimal(data.balanceAfter.toString()),
      fee: data.fee ? new Prisma.Decimal(data.fee.toString()) : null,
      relatedUserId: data.relatedUserId,
      description: data.description,
      externalTxHash: data.externalTxHash,
    },
    select: { id: true },
  });
}

/**
 * Execute financial transaction with proper isolation and locking
 */
export async function executeFinancialTransaction<T>(
  operation: (tx: TxClient) => Promise<T>
): Promise<T> {
  return db.$transaction(operation, {
    isolationLevel: 'Serializable',
    timeout: 10000, // 10 second timeout
  });
}

