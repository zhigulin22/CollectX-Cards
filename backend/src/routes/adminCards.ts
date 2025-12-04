import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../db.js';
import { env } from '../config/env.js';
import { secureCompare } from '../utils/crypto.js';
import { auditService } from '../services/audit.js';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

// ============ SCHEMAS ============

const CollectionSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  icon: z.string().max(10).default('🃏'),
  isActive: z.boolean().default(true),
  sortOrder: z.number().default(0),
});

const CardTemplateSchema = z.object({
  collectionId: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  emoji: z.string().max(10).default('🃏'),
  rarity: z.enum(['COMMON', 'RARE', 'EPIC', 'LEGENDARY']).default('COMMON'),
  sellPriceUsdt: z.number().min(0).default(0),
  sellPriceX: z.number().min(0).default(0),
  dropWeight: z.number().min(1).default(100),
  isActive: z.boolean().default(true),
  maxSupply: z.number().optional(),
});

const PackSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  icon: z.string().max(10).default('📦'),
  priceUsdt: z.number().min(0).optional(),
  priceX: z.number().min(0).optional(),
  cardsCount: z.number().min(1).max(10).default(3),
  guaranteedRarity: z.enum(['COMMON', 'RARE', 'EPIC', 'LEGENDARY']).optional(),
  cooldownSeconds: z.number().optional(),
  gradient: z.string().default('from-violet-500 to-purple-600'),
  isActive: z.boolean().default(true),
  sortOrder: z.number().default(0),
});

// ============ ADMIN AUTH MIDDLEWARE ============

async function adminAuth(request: any, reply: any) {
  const apiKey = request.headers['x-admin-key'];
  
  if (!apiKey || !env.ADMIN_API_KEY) {
    return reply.status(401).send({ error: 'Unauthorized' });
  }

  if (!secureCompare(apiKey, env.ADMIN_API_KEY)) {
    return reply.status(401).send({ error: 'Invalid API key' });
  }
}

// ============ IMAGE HANDLING ============

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

async function ensureUploadsDir() {
  try {
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
  } catch (e) {
    // Directory exists
  }
}

function generateImageFilename(originalName: string): string {
  const ext = path.extname(originalName).toLowerCase() || '.jpg';
  const hash = crypto.randomBytes(16).toString('hex');
  return `${hash}${ext}`;
}

// ============ ROUTES ============

export async function adminCardsRoutes(app: FastifyInstance) {
  // Ensure uploads directory exists
  await ensureUploadsDir();

  // ============ COLLECTIONS ============

  // List all collections
  app.get('/collections', { preHandler: adminAuth }, async () => {
    const collections = await db.cardCollection.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: { select: { cardTemplates: true } },
      },
    });

    return {
      collections: collections.map(c => ({
        ...c,
        totalCards: c._count.cardTemplates,
      })),
    };
  });

  // Create collection
  app.post('/collections', { preHandler: adminAuth }, async (request, reply) => {
    const data = CollectionSchema.parse(request.body);

    const collection = await db.cardCollection.create({
      data,
    });

    await auditService.log({
      actor: 'admin',
      action: 'COLLECTION_CREATE',
      targetType: 'collection',
      targetId: collection.id,
      details: { name: data.name },
      ipAddress: request.ip,
    });

    return collection;
  });

  // Update collection
  app.put('/collections/:id', { preHandler: adminAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = CollectionSchema.partial().parse(request.body);

    const collection = await db.cardCollection.update({
      where: { id },
      data,
    });

    await auditService.log({
      actor: 'admin',
      action: 'COLLECTION_UPDATE',
      targetType: 'collection',
      targetId: id,
      details: data,
      ipAddress: request.ip,
    });

    return collection;
  });

  // Delete collection
  app.delete('/collections/:id', { preHandler: adminAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };

    // Check if collection has cards owned by users
    const userCardsCount = await db.userCard.count({
      where: { template: { collectionId: id } },
    });

    if (userCardsCount > 0) {
      return reply.status(400).send({ 
        error: 'Cannot delete collection with owned cards',
        userCardsCount,
      });
    }

    await db.cardCollection.delete({ where: { id } });

    await auditService.log({
      actor: 'admin',
      action: 'COLLECTION_DELETE',
      targetType: 'collection',
      targetId: id,
      ipAddress: request.ip,
    });

    return { success: true };
  });

  // Upload collection image
  app.post('/collections/:id/image', { preHandler: adminAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = await request.file();

    if (!data) {
      return reply.status(400).send({ error: 'No file uploaded' });
    }

    const buffer = await data.toBuffer();
    if (buffer.length > MAX_IMAGE_SIZE) {
      return reply.status(400).send({ error: 'File too large (max 5MB)' });
    }

    const filename = generateImageFilename(data.filename);
    const filepath = path.join(UPLOADS_DIR, filename);
    await fs.writeFile(filepath, buffer);

    const imageUrl = `/uploads/${filename}`;

    await db.cardCollection.update({
      where: { id },
      data: { imageUrl },
    });

    return { imageUrl };
  });

  // ============ CARD TEMPLATES ============

  // List cards (with filters)
  app.get('/cards', { preHandler: adminAuth }, async (request) => {
    const { collectionId, rarity, page = '1', limit = '50' } = request.query as any;

    const where: any = {};
    if (collectionId) where.collectionId = collectionId;
    if (rarity) where.rarity = rarity;

    const [cards, total] = await Promise.all([
      db.cardTemplate.findMany({
        where,
        include: { collection: true },
        orderBy: [{ collection: { sortOrder: 'asc' } }, { rarity: 'desc' }, { name: 'asc' }],
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
      }),
      db.cardTemplate.count({ where }),
    ]);

    return {
      cards: cards.map(c => ({
        ...c,
        sellPriceUsdt: c.sellPriceUsdt.toString(),
        sellPriceX: c.sellPriceX.toString(),
        collectionName: c.collection.name,
      })),
      total,
      page: parseInt(page),
      limit: parseInt(limit),
    };
  });

  // Create card
  app.post('/cards', { preHandler: adminAuth }, async (request) => {
    const data = CardTemplateSchema.parse(request.body);

    const card = await db.cardTemplate.create({
      data: {
        ...data,
        sellPriceUsdt: data.sellPriceUsdt,
        sellPriceX: data.sellPriceX,
      },
      include: { collection: true },
    });

    await auditService.log({
      actor: 'admin',
      action: 'CARD_CREATE',
      targetType: 'card',
      targetId: card.id,
      details: { name: data.name, rarity: data.rarity },
      ipAddress: (request as any).ip,
    });

    return {
      ...card,
      sellPriceUsdt: card.sellPriceUsdt.toString(),
      sellPriceX: card.sellPriceX.toString(),
    };
  });

  // Update card
  app.put('/cards/:id', { preHandler: adminAuth }, async (request) => {
    const { id } = request.params as { id: string };
    const data = CardTemplateSchema.partial().parse(request.body);

    const card = await db.cardTemplate.update({
      where: { id },
      data: {
        ...data,
        sellPriceUsdt: data.sellPriceUsdt,
        sellPriceX: data.sellPriceX,
      },
    });

    await auditService.log({
      actor: 'admin',
      action: 'CARD_UPDATE',
      targetType: 'card',
      targetId: id,
      details: data,
      ipAddress: (request as any).ip,
    });

    return {
      ...card,
      sellPriceUsdt: card.sellPriceUsdt.toString(),
      sellPriceX: card.sellPriceX.toString(),
    };
  });

  // Delete card
  app.delete('/cards/:id', { preHandler: adminAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };

    // Check if card is owned by users
    const userCardsCount = await db.userCard.count({
      where: { templateId: id },
    });

    if (userCardsCount > 0) {
      return reply.status(400).send({ 
        error: 'Cannot delete card owned by users',
        userCardsCount,
      });
    }

    await db.cardTemplate.delete({ where: { id } });

    await auditService.log({
      actor: 'admin',
      action: 'CARD_DELETE',
      targetType: 'card',
      targetId: id,
      ipAddress: (request as any).ip,
    });

    return { success: true };
  });

  // Upload card image
  app.post('/cards/:id/image', { preHandler: adminAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = await request.file();

    if (!data) {
      return reply.status(400).send({ error: 'No file uploaded' });
    }

    const buffer = await data.toBuffer();
    if (buffer.length > MAX_IMAGE_SIZE) {
      return reply.status(400).send({ error: 'File too large (max 5MB)' });
    }

    const filename = generateImageFilename(data.filename);
    const filepath = path.join(UPLOADS_DIR, filename);
    await fs.writeFile(filepath, buffer);

    const imageUrl = `/uploads/${filename}`;

    // TODO: Generate thumbnail (imageThumb) using sharp for memory optimization

    await db.cardTemplate.update({
      where: { id },
      data: { imageUrl },
    });

    return { imageUrl };
  });

  // ============ PACKS ============

  // List packs
  app.get('/packs', { preHandler: adminAuth }, async () => {
    const packs = await db.cardPack.findMany({
      orderBy: { sortOrder: 'asc' },
    });

    return {
      packs: packs.map(p => ({
        ...p,
        priceUsdt: p.priceUsdt?.toString() || null,
        priceX: p.priceX?.toString() || null,
      })),
    };
  });

  // Create pack
  app.post('/packs', { preHandler: adminAuth }, async (request) => {
    const data = PackSchema.parse(request.body);

    const pack = await db.cardPack.create({
      data: {
        ...data,
        priceUsdt: data.priceUsdt || null,
        priceX: data.priceX || null,
      },
    });

    await auditService.log({
      actor: 'admin',
      action: 'PACK_CREATE',
      targetType: 'pack',
      targetId: pack.id,
      details: { name: data.name },
      ipAddress: (request as any).ip,
    });

    return {
      ...pack,
      priceUsdt: pack.priceUsdt?.toString() || null,
      priceX: pack.priceX?.toString() || null,
    };
  });

  // Update pack
  app.put('/packs/:id', { preHandler: adminAuth }, async (request) => {
    const { id } = request.params as { id: string };
    const data = PackSchema.partial().parse(request.body);

    const pack = await db.cardPack.update({
      where: { id },
      data: {
        ...data,
        priceUsdt: data.priceUsdt !== undefined ? data.priceUsdt || null : undefined,
        priceX: data.priceX !== undefined ? data.priceX || null : undefined,
      },
    });

    await auditService.log({
      actor: 'admin',
      action: 'PACK_UPDATE',
      targetType: 'pack',
      targetId: id,
      details: data,
      ipAddress: (request as any).ip,
    });

    return {
      ...pack,
      priceUsdt: pack.priceUsdt?.toString() || null,
      priceX: pack.priceX?.toString() || null,
    };
  });

  // Delete pack
  app.delete('/packs/:id', { preHandler: adminAuth }, async (request) => {
    const { id } = request.params as { id: string };

    await db.cardPack.delete({ where: { id } });

    await auditService.log({
      actor: 'admin',
      action: 'PACK_DELETE',
      targetType: 'pack',
      targetId: id,
      ipAddress: (request as any).ip,
    });

    return { success: true };
  });

  // ============ STATS ============

  app.get('/stats', { preHandler: adminAuth }, async () => {
    const [
      collectionsCount,
      cardsCount,
      packsCount,
      userCardsCount,
      packOpeningsCount,
    ] = await Promise.all([
      db.cardCollection.count(),
      db.cardTemplate.count(),
      db.cardPack.count(),
      db.userCard.count(),
      db.packOpening.count(),
    ]);

    const recentOpenings = await db.packOpening.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
    });

    return {
      collections: collectionsCount,
      cardTemplates: cardsCount,
      packs: packsCount,
      userCards: userCardsCount,
      packOpenings: packOpeningsCount,
      recentOpenings,
    };
  });
}

