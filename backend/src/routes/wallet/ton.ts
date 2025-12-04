import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../../db.js';
import { isValidTonAddress } from '../../utils/ton.js';

interface LinkTonBody {
  address: string;
}

export async function tonRoutes(app: FastifyInstance) {
  app.post(
    '/wallet/ton/link',
    {
      preHandler: [app.authenticate],
    },
    async (request: FastifyRequest<{ Body: LinkTonBody }>, reply: FastifyReply) => {
      const { userId } = request.user as { userId: string };
      const { address } = request.body || {};

      if (!address || typeof address !== 'string') {
        return reply.status(400).send({ error: 'TON address is required' });
      }

      if (!isValidTonAddress(address, { allowTestnet: true })) {
        return reply.status(400).send({ error: 'Invalid TON address' });
      }

      await db.user.update({
        where: { id: userId },
        data: { tonAddress: address },
      });

      return { success: true };
    }
  );
}


