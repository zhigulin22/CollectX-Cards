import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { withdrawService } from '../../services/withdraw.js';
import { rateLimiters } from '../../middleware/rateLimit.js';
import { WithdrawSchema } from './schemas.js';
import { AppError } from '../../utils/errors.js';

export async function withdrawRoutes(app: FastifyInstance) {
  // -------- WITHDRAW INFO --------
  app.get('/withdraw/info', {
    preHandler: [app.authenticate],
  }, async () => {
    return await withdrawService.getWithdrawInfo();
  });

  // -------- CREATE WITHDRAW --------
  app.post('/withdraw', {
    preHandler: [app.authenticate, rateLimiters.financial],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.user as { userId: string };

    try {
      const { amount, toAddress } = WithdrawSchema.parse(request.body);
      
      // withdrawService handles all validation and locking internally
      const result = await withdrawService.createWithdrawRequest({
        userId,
        amount,
        toAddress,
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
      throw error;
    }
  });

  // -------- WITHDRAW HISTORY --------
  app.get('/withdraw/history', {
    preHandler: [app.authenticate],
  }, async (request: FastifyRequest) => {
    const { userId } = request.user as { userId: string };
    return withdrawService.getWithdrawHistory(userId);
  });
}
