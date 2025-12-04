import { z } from 'zod';
import { settingsService } from '../../services/settings.js';

// ============ DEFAULTS (fallback) ============
// Real values are fetched from settingsService

export const DEFAULTS = {
  SWAP_FEE_PERCENT: 2,
  USDT_TO_X_RATE: 100,
  MIN_SWAP_USDT: 0.1,
  MIN_SEND: 1,
} as const;

// ============ ASYNC CONFIG GETTERS ============

export async function getSwapConfig() {
  return settingsService.getSwapConfig();
}

export async function getSendConfig() {
  return settingsService.getSendConfig();
}

export async function getWithdrawConfig() {
  return settingsService.getWithdrawConfig();
}

// ============ SCHEMAS ============
// Note: Zod schemas use default values for basic validation
// Dynamic limits are checked in route handlers

export const SwapSchema = z.object({
  amount: z.string().refine(
    (v) => !isNaN(parseFloat(v)) && parseFloat(v) > 0,
    'Amount must be positive'
  ),
  direction: z.enum(['usdt_to_x', 'x_to_usdt']).default('usdt_to_x'),
});

export const SendSchema = z.object({
  toUserId: z.string().uuid('Invalid user ID'),
  amount: z.string().refine(
    (v) => !isNaN(parseFloat(v)) && parseFloat(v) >= DEFAULTS.MIN_SEND,
    `Minimum ${DEFAULTS.MIN_SEND} $X`
  ),
});

export const WithdrawSchema = z.object({
  amount: z.string().refine(
    (v) => !isNaN(parseFloat(v)) && parseFloat(v) > 0,
    'Amount must be positive'
  ),
  toAddress: z.string().min(10, 'Invalid address'),
});

export const HistorySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(20),
  currency: z.enum(['all', 'USDT', 'X']).default('all'),
  type: z.enum(['all', 'deposit', 'withdraw', 'swap', 'send', 'receive']).default('all'),
});

export const SearchUserSchema = z.object({
  query: z.string().min(1).max(100),
});

// ============ TYPES ============

export type SwapInput = z.infer<typeof SwapSchema>;
export type SendInput = z.infer<typeof SendSchema>;
export type WithdrawInput = z.infer<typeof WithdrawSchema>;
export type HistoryInput = z.infer<typeof HistorySchema>;
export type SearchUserInput = z.infer<typeof SearchUserSchema>;

