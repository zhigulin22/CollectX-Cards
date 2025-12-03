import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../../db.js';
import { getSwapConfig } from './schemas.js';

export async function balanceRoutes(app: FastifyInstance) {
  // -------- GET BALANCE --------
  app.get('/balance', {
    preHandler: [app.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.user as { userId: string };

    const wallet = await db.wallet.findUnique({ where: { userId } });
    if (!wallet) {
      return reply.status(404).send({ error: 'Wallet not found' });
    }

    const swapConfig = await getSwapConfig();

    return {
      balanceUsdt: wallet.balanceUsdt.toString(),
      balanceX: wallet.balanceX.toString(),
      rate: swapConfig.rate,
      swapFee: swapConfig.feePercent,
    };
  });

  // -------- DEPOSIT INFO --------
  app.get('/deposit', {
    preHandler: [app.authenticate],
  }, async (request: FastifyRequest) => {
    const { userId } = request.user as { userId: string };
    
    const user = await db.user.findUnique({ where: { id: userId } });

    return {
      address: process.env.DEPOSIT_ADDRESS || 'EQ...your-deposit-address',
      memo: user?.telegramId.toString() || '',
      currency: 'USDT',
      network: 'TON',
      note: 'Include your Telegram ID as memo when sending',
    };
  });
}

