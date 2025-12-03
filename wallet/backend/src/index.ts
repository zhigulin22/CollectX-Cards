import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

import { env, validateProductionEnv, getAllowedOrigins } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { rateLimitPlugin } from './middleware/rateLimit.js';
import { authRoutes } from './routes/auth.js';
import { walletRoutes } from './routes/wallet/index.js';
import { adminRoutes } from './routes/admin.js';
import { webhookRoutes } from './routes/webhook.js';
import { db } from './db.js';
import { setLogger } from './utils/logger.js';
import { settingsService } from './services/settings.js';

// Validate production environment
validateProductionEnv();

// Create Fastify instance
const app = Fastify({ 
  logger: {
    level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  },
  trustProxy: true, // Для корректного определения IP за reverse proxy
});

// Set global logger for services
setLogger(app.log);

// ============ PLUGINS ============

// CORS - в production только разрешённые origins
await app.register(cors, { 
  origin: getAllowedOrigins(),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
});

// JWT
await app.register(jwt, { 
  secret: env.JWT_SECRET,
  sign: { expiresIn: '30d' },
});

// Swagger Documentation
const swaggerServers = env.NODE_ENV === 'production'
  ? [{ url: '/api/v1', description: 'Production API v1' }]
  : [
      { url: `http://localhost:${env.PORT}/api/v1`, description: 'Development' },
      { url: '/api/v1', description: 'Relative path' },
    ];

await app.register(swagger, {
  openapi: {
    info: {
      title: 'CollectX Wallet API',
      description: 'API for CollectX Wallet - Telegram Mini App',
      version: '1.0.0',
    },
    servers: swaggerServers,
    tags: [
      { name: 'Auth', description: 'Authentication endpoints' },
      { name: 'Wallet', description: 'Wallet operations' },
      { name: 'Admin', description: 'Admin endpoints (requires API key)' },
      { name: 'Webhook', description: 'Webhook endpoints for external services' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
        adminApiKey: {
          type: 'apiKey',
          in: 'header',
          name: 'X-Admin-Key',
        },
      },
    },
  },
});

await app.register(swaggerUi, {
  routePrefix: '/docs',
  uiConfig: {
    docExpansion: 'list',
    deepLinking: true,
  },
});

// Rate Limiting (global)
await app.register(rateLimitPlugin);

// ============ AUTH DECORATOR ============

app.decorate('authenticate', async function (request: any, reply: any) {
  try {
    await request.jwtVerify();
  } catch {
    reply.status(401).send({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
  }
});

// ============ ERROR HANDLERS ============

app.setErrorHandler(errorHandler);
app.setNotFoundHandler(notFoundHandler);

// ============ ROUTES ============

// Health check (no auth required)
app.get('/health', async () => ({
  status: 'ok',
  timestamp: new Date().toISOString(),
  uptime: process.uptime(),
  environment: env.NODE_ENV,
}));

// API v1 routes
app.register(authRoutes, { prefix: '/api/v1/auth' });
app.register(walletRoutes, { prefix: '/api/v1/wallet' });
app.register(adminRoutes, { prefix: '/api/v1/admin' });
app.register(webhookRoutes, { prefix: '/api/v1/webhook' });

// Legacy routes (без версии) - для обратной совместимости
app.register(authRoutes, { prefix: '/api/auth' });
app.register(walletRoutes, { prefix: '/api/wallet' });
app.register(adminRoutes, { prefix: '/api/admin' });
app.register(webhookRoutes, { prefix: '/api/webhook' });

// ============ GRACEFUL SHUTDOWN ============

const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];

async function gracefulShutdown(signal: NodeJS.Signals) {
  app.log.info(`Received ${signal}, starting graceful shutdown...`);

  // Stop accepting new connections
  try {
    await app.close();
    app.log.info('HTTP server closed');
  } catch (err) {
    app.log.error({ err }, 'Error closing HTTP server');
  }

  // Close database connection
  try {
    await db.$disconnect();
    app.log.info('Database connection closed');
  } catch (err) {
    app.log.error({ err }, 'Error closing database');
  }

  app.log.info('Graceful shutdown complete');
  process.exit(0);
}

signals.forEach((signal) => {
  process.on(signal, () => gracefulShutdown(signal));
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  app.log.fatal({ err: error }, 'Uncaught exception');
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  app.log.fatal({ err: reason }, 'Unhandled rejection');
  process.exit(1);
});

// ============ START SERVER ============

async function start() {
  try {
    // Test database connection
    await db.$connect();
    app.log.info('Database connected');

    // Pre-load settings cache
    await settingsService.refreshCache();
    app.log.info('Settings loaded');

    // Start server
    await app.listen({ port: env.PORT, host: '0.0.0.0' });

    console.log(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   🚀 CollectX Wallet API                              ║
║                                                       ║
║   Server:  http://localhost:${env.PORT}                    ║
║   Docs:    http://localhost:${env.PORT}/docs               ║
║   Health:  http://localhost:${env.PORT}/health             ║
║   Env:     ${env.NODE_ENV.padEnd(11)}                         ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
    `);
  } catch (err) {
    app.log.fatal({ err }, 'Error starting server');
    process.exit(1);
  }
}

start();

// ============ TYPES ============

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: any, reply: any) => Promise<void>;
  }
}
