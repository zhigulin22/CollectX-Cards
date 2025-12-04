import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../db.js';
import { env } from '../config/env.js';
import { Decimal } from 'decimal.js';

// ============ SCHEMAS ============

const PaginationSchema = z.object({
  page: z.string().default('1').transform(Number),
  limit: z.string().default('20').transform(Number),
});

// ============ PUBLIC ROUTES ============

export async function cardsRoutes(app: FastifyInstance) {
  // Get all collections
  app.get('/collections', async (request) => {
    const collections = await db.cardCollection.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: { select: { cardTemplates: { where: { isActive: true } } } },
      },
    });

    return {
      collections: collections.map(c => ({
        id: c.id,
        name: c.name,
        description: c.description,
        imageUrl: c.imageUrl,
        icon: c.icon,
        totalCards: c._count.cardTemplates,
      })),
    };
  });

  // Get collection details with cards
  app.get('/collections/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const collection = await db.cardCollection.findUnique({
      where: { id },
      include: {
        cardTemplates: {
          where: { isActive: true },
          orderBy: { rarity: 'desc' },
        },
      },
    });

    if (!collection) {
      return reply.status(404).send({ error: 'Collection not found' });
    }

    return {
      ...collection,
      cardTemplates: collection.cardTemplates.map(t => ({
        ...t,
        sellPriceUsdt: t.sellPriceUsdt.toString(),
        sellPriceX: t.sellPriceX.toString(),
      })),
    };
  });

  // Get available packs
  app.get('/packs', async () => {
    const packs = await db.cardPack.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    return {
      packs: packs.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        imageUrl: p.imageUrl,
        icon: p.icon,
        priceUsdt: p.priceUsdt?.toString() || null,
        priceX: p.priceX?.toString() || null,
        cardsCount: p.cardsCount,
        guaranteedRarity: p.guaranteedRarity?.toLowerCase() || null,
        cooldownSeconds: p.cooldownSeconds,
        gradient: p.gradient,
      })),
    };
  });

  // ============ AUTHENTICATED ROUTES ============

  // Get user's cards
  app.get('/inventory', { preHandler: [app.authenticate] }, async (request) => {
    const { userId } = request.user as { userId: string };
    const { page, limit } = PaginationSchema.parse(request.query);

    const [cards, total] = await Promise.all([
      db.userCard.findMany({
        where: { userId },
        include: {
          template: {
            include: { collection: true },
          },
        },
        orderBy: { mintedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.userCard.count({ where: { userId } }),
    ]);

    return {
      items: cards.map(c => ({
        id: c.id,
        templateId: c.templateId,
        name: c.template.name,
        description: c.template.description,
        imageUrl: c.template.imageUrl,
        imageThumb: c.template.imageThumb,
        emoji: c.template.emoji,
        rarity: c.template.rarity.toLowerCase(),
        collectionId: c.template.collectionId,
        collectionName: c.template.collection.name,
        serialNumber: c.serialNumber,
        mintedAt: c.mintedAt.toISOString(),
        sellPrice: {
          usdt: parseFloat(c.template.sellPriceUsdt.toString()),
          x: parseFloat(c.template.sellPriceX.toString()),
        },
        isListed: c.isListed,
        listPrice: c.listPrice?.toString() || null,
      })),
      page,
      limit,
      total,
      hasMore: page * limit < total,
    };
  });

  // Open a pack
  app.post('/packs/:id/open', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { userId } = request.user as { userId: string };
    const { id: packId } = request.params as { id: string };
    const { payWith } = z.object({ payWith: z.enum(['usdt', 'x']).optional() }).parse(request.body);

    const pack = await db.cardPack.findUnique({ where: { id: packId } });
    if (!pack || !pack.isActive) {
      return reply.status(404).send({ error: 'Pack not found' });
    }

    const wallet = await db.wallet.findUnique({ where: { userId } });
    if (!wallet) {
      return reply.status(400).send({ error: 'Wallet not found' });
    }

    // Check if it's a free pack with cooldown
    if (!pack.priceUsdt && !pack.priceX && pack.cooldownSeconds) {
      const lastOpening = await db.packOpening.findFirst({
        where: { userId, packId },
        orderBy: { createdAt: 'desc' },
      });

      if (lastOpening) {
        const cooldownEnd = new Date(lastOpening.createdAt.getTime() + pack.cooldownSeconds * 1000);
        if (cooldownEnd > new Date()) {
          const remaining = Math.ceil((cooldownEnd.getTime() - Date.now()) / 1000);
          return reply.status(400).send({ 
            error: 'Pack on cooldown', 
            remainingSeconds: remaining 
          });
        }
      }
    }

    // Check balance for paid packs
    let currency: string | null = null;
    let price = new Decimal(0);

    if (pack.priceUsdt || pack.priceX) {
      currency = payWith || 'x';
      price = currency === 'usdt' 
        ? new Decimal(pack.priceUsdt || 0)
        : new Decimal(pack.priceX || 0);

      const balance = currency === 'usdt' ? wallet.balanceUsdt : wallet.balanceX;
      if (new Decimal(balance).lt(price)) {
        return reply.status(400).send({ error: 'Insufficient balance' });
      }
    }

    // Get available card templates (with rarity weighting)
    const templates = await db.cardTemplate.findMany({
      where: { isActive: true },
    });

    if (templates.length === 0) {
      return reply.status(400).send({ error: 'No cards available' });
    }

    // Group by rarity
    const byRarity: Record<string, typeof templates> = {
      COMMON: templates.filter(t => t.rarity === 'COMMON'),
      RARE: templates.filter(t => t.rarity === 'RARE'),
      EPIC: templates.filter(t => t.rarity === 'EPIC'),
      LEGENDARY: templates.filter(t => t.rarity === 'LEGENDARY'),
    };

    const rarityWeights = {
      COMMON: 60,
      RARE: 25,
      EPIC: 12,
      LEGENDARY: 3,
    };

    function getRandomRarity(): string {
      const total = Object.values(rarityWeights).reduce((a, b) => a + b, 0);
      let random = Math.random() * total;
      for (const [rarity, weight] of Object.entries(rarityWeights)) {
        random -= weight;
        if (random <= 0) return rarity;
      }
      return 'COMMON';
    }

    function getRandomTemplate(rarity?: string) {
      const r = rarity || getRandomRarity();
      const pool = byRarity[r];
      if (!pool || pool.length === 0) {
        // Fallback to any rarity
        return templates[Math.floor(Math.random() * templates.length)];
      }
      return pool[Math.floor(Math.random() * pool.length)];
    }

    // Generate cards
    const cardTemplates: typeof templates = [];
    
    // Guaranteed rarity first
    if (pack.guaranteedRarity) {
      cardTemplates.push(getRandomTemplate(pack.guaranteedRarity));
    }

    // Fill rest
    while (cardTemplates.length < pack.cardsCount) {
      cardTemplates.push(getRandomTemplate());
    }

    // Shuffle
    cardTemplates.sort(() => Math.random() - 0.5);

    // Create cards in transaction
    const result = await db.$transaction(async (tx) => {
      // Deduct balance if paid pack
      if (price.gt(0) && currency) {
        const field = currency === 'usdt' ? 'balanceUsdt' : 'balanceX';
        await tx.wallet.update({
          where: { userId },
          data: { [field]: { decrement: price } },
        });
      }

      // Create user cards
      const userCards = [];
      for (const template of cardTemplates) {
        // Get next serial number
        const lastCard = await tx.userCard.findFirst({
          where: { templateId: template.id },
          orderBy: { serialNumber: 'desc' },
        });
        const serialNumber = (lastCard?.serialNumber || 0) + 1;

        const card = await tx.userCard.create({
          data: {
            userId,
            templateId: template.id,
            serialNumber,
          },
          include: {
            template: { include: { collection: true } },
          },
        });

        // Update total minted
        await tx.cardTemplate.update({
          where: { id: template.id },
          data: { totalMinted: { increment: 1 } },
        });

        userCards.push(card);
      }

      // Record pack opening
      await tx.packOpening.create({
        data: {
          userId,
          packId,
          cardIds: userCards.map(c => c.id),
          paidWith: currency,
          paidAmount: price.gt(0) ? price : null,
        },
      });

      return userCards;
    });

    return {
      success: true,
      cards: result.map(c => ({
        id: c.id,
        templateId: c.templateId,
        name: c.template.name,
        description: c.template.description,
        imageUrl: c.template.imageUrl,
        emoji: c.template.emoji,
        rarity: c.template.rarity.toLowerCase(),
        collectionId: c.template.collectionId,
        collectionName: c.template.collection.name,
        serialNumber: c.serialNumber,
        mintedAt: c.mintedAt.toISOString(),
        sellPrice: {
          usdt: parseFloat(c.template.sellPriceUsdt.toString()),
          x: parseFloat(c.template.sellPriceX.toString()),
        },
      })),
    };
  });

  // Sell a card
  app.post('/cards/:id/sell', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { userId } = request.user as { userId: string };
    const { id: cardId } = request.params as { id: string };
    const { currency } = z.object({ currency: z.enum(['usdt', 'x']) }).parse(request.body);

    const card = await db.userCard.findUnique({
      where: { id: cardId },
      include: { template: true },
    });

    if (!card || card.userId !== userId) {
      return reply.status(404).send({ error: 'Card not found' });
    }

    const sellPrice = currency === 'usdt' 
      ? new Decimal(card.template.sellPriceUsdt)
      : new Decimal(card.template.sellPriceX);

    await db.$transaction(async (tx) => {
      // Add balance
      const field = currency === 'usdt' ? 'balanceUsdt' : 'balanceX';
      await tx.wallet.update({
        where: { userId },
        data: { [field]: { increment: sellPrice } },
      });

      // Delete card
      await tx.userCard.delete({ where: { id: cardId } });

      // Create transaction record
      const wallet = await tx.wallet.findUnique({ where: { userId } });
      await tx.transaction.create({
        data: {
          walletId: wallet!.id,
          type: 'card_sale',
          currency: currency.toUpperCase(),
          amount: sellPrice,
          balanceAfter: currency === 'usdt' ? wallet!.balanceUsdt : wallet!.balanceX,
          description: `Sold ${card.template.name} #${card.serialNumber}`,
        },
      });
    });

    // Get updated balance
    const wallet = await db.wallet.findUnique({ where: { userId } });

    return {
      success: true,
      soldFor: sellPrice.toString(),
      currency,
      balanceUsdt: wallet!.balanceUsdt.toString(),
      balanceX: wallet!.balanceX.toString(),
    };
  });
}

