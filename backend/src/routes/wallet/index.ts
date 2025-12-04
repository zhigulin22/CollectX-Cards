import { FastifyInstance } from 'fastify';
import { balanceRoutes } from './balance.js';
import { swapRoutes } from './swap.js';
import { sendRoutes } from './send.js';
import { withdrawRoutes } from './withdraw.js';
import { historyRoutes } from './history.js';
import { tonRoutes } from './ton.js';

/**
 * Wallet routes - разбиты на модули для читаемости
 * 
 * - balance.ts  → GET /balance, GET /deposit
 * - swap.ts     → POST /swap
 * - send.ts     → POST /send, GET /users/search
 * - withdraw.ts → GET /withdraw/info, POST /withdraw, GET /withdraw/history
 * - history.ts  → GET /history
 */
export async function walletRoutes(app: FastifyInstance) {
  await app.register(balanceRoutes);
  await app.register(swapRoutes);
  await app.register(sendRoutes);
  await app.register(withdrawRoutes);
  await app.register(historyRoutes);
  await app.register(tonRoutes);
}

