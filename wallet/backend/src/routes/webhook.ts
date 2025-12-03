import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { depositService } from '../services/deposit.js';
import { env } from '../config/env.js';
import { verifyHmacSignature } from '../utils/crypto.js';
import { UnauthorizedError } from '../utils/errors.js';

// Schema for TON webhook (format depends on provider)
const TonDepositSchema = z.object({
  txHash: z.string().min(10, 'Invalid transaction hash'),
  fromAddress: z.string().min(10, 'Invalid from address'),
  toAddress: z.string().min(10, 'Invalid to address'),
  amount: z.string().refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) > 0, 'Invalid amount'),
  memo: z.string().optional().default(''),
  timestamp: z.number().optional(),
});

export async function webhookRoutes(app: FastifyInstance) {
  // -------- TON DEPOSIT WEBHOOK --------
  // This endpoint is called by your provider upon payment receipt
  app.post('/ton/deposit', async (request: FastifyRequest, reply: FastifyReply) => {
    const webhookSecret = process.env.WEBHOOK_SECRET;
    
    // C3 FIX: Webhook signature verification is now MANDATORY in production
    if (env.NODE_ENV === 'production') {
      if (!webhookSecret) {
        app.log.error('[Webhook] WEBHOOK_SECRET not configured in production!');
        throw new UnauthorizedError('Webhook not configured');
      }

      const signature = request.headers['x-webhook-signature'] as string;
      
      if (!signature) {
        app.log.warn('[Webhook] Missing signature header');
        throw new UnauthorizedError('Missing signature');
      }

      // C4 FIX: Use timing-safe comparison
      const rawBody = JSON.stringify(request.body);
      if (!verifyHmacSignature(rawBody, signature, webhookSecret)) {
        app.log.warn('[Webhook] Invalid signature');
        throw new UnauthorizedError('Invalid signature');
      }
    } else if (webhookSecret) {
      // FIX: In development with secret configured, ALWAYS verify signature
      const signature = request.headers['x-webhook-signature'] as string;
      
      if (!signature) {
        app.log.warn('[Webhook] Missing signature header in dev mode');
        return reply.status(401).send({ error: 'Missing signature' });
      }

      const rawBody = JSON.stringify(request.body);
      if (!verifyHmacSignature(rawBody, signature, webhookSecret)) {
        app.log.warn('[Webhook] Invalid signature in dev mode');
        return reply.status(401).send({ error: 'Invalid signature' });
      }
    }

    try {
      const data = TonDepositSchema.parse(request.body);

      // Verify destination address is ours
      if (env.DEPOSIT_ADDRESS && data.toAddress !== env.DEPOSIT_ADDRESS) {
        app.log.warn(`[Webhook] Deposit to wrong address: ${data.toAddress}`);
        return reply.status(400).send({ error: 'Invalid deposit address' });
      }

      // Process deposit with idempotency
      const result = await depositService.processDeposit({
        txHash: data.txHash,
        fromAddress: data.fromAddress,
        amount: data.amount,
        memo: data.memo,
      });

      if (!result.success) {
        app.log.warn(`[Webhook] Deposit failed: ${result.error}`);
        return reply.status(400).send({ error: result.error });
      }

      if (result.alreadyProcessed) {
        app.log.info(`[Webhook] Duplicate webhook (idempotent): ${data.txHash}`);
      }

      return { success: true, txHash: data.txHash };
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        app.log.warn('[Webhook] Invalid payload:', error.errors);
        return reply.status(400).send({ error: 'Invalid payload' });
      }
      app.log.error(`[Webhook] Error processing deposit:`, error);
      return reply.status(500).send({ error: 'Failed to process deposit' });
    }
  });

  // -------- MANUAL DEPOSIT (for testing) --------
  // ONLY in development!
  if (env.NODE_ENV === 'development') {
    app.post('/test/deposit', async (request: FastifyRequest, reply: FastifyReply) => {
      const schema = z.object({
        telegramId: z.string().min(1),
        amount: z.string().refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) > 0),
      });

      try {
        const { telegramId, amount } = schema.parse(request.body);

        const result = await depositService.processDeposit({
          txHash: `test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          fromAddress: 'EQTestAddress',
          amount,
          memo: telegramId,
        });

        if (!result.success) {
          return reply.status(400).send({ error: result.error });
        }

        return { success: true, message: `Deposited ${amount} USDT` };
      } catch (error: any) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({ error: error.errors[0].message });
        }
        return reply.status(500).send({ error: error.message });
      }
    });
  }

  // -------- HEALTH CHECK for webhook provider --------
  app.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });
}
