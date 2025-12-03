import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { db } from '../../db.js';
import { HistorySchema } from './schemas.js';

export async function historyRoutes(app: FastifyInstance) {
  app.get('/history', {
    preHandler: [app.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.user as { userId: string };

    try {
      const { page, limit, currency, type } = HistorySchema.parse(request.query);

      const wallet = await db.wallet.findUnique({ where: { userId } });
      if (!wallet) {
        return reply.status(404).send({ error: 'Wallet not found' });
      }

      const where: any = { walletId: wallet.id };
      if (currency !== 'all') {
        where.currency = currency;
      }
      if (type !== 'all') {
        where.type = type;
      }

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
        page,
        limit,
        total,
        hasMore: page * limit < total,
      };
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: error.errors[0].message });
      }
      app.log.error(error);
      return reply.status(500).send({ error: 'Failed to get history' });
    }
  });
}

