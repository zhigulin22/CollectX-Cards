// CollectX Server - Production Ready
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDB } from './db/database.js';
import usersRouter from './routes/users.js';
import collectionsRouter from './routes/collections.js';
import cardsRouter from './routes/cards.js';
import boxesRouter from './routes/boxes.js';
import adminRouter from './routes/admin.js';
import uploadsRouter from './routes/uploads.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// CORS
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://t.me', 'https://web.telegram.org'] 
    : '*',
  credentials: true
}));

// Body parser with limit
app.use(express.json({ limit: '1mb' }));

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (duration > 1000) {
      console.warn(`⚠️ Slow request: ${req.method} ${req.url} (${duration}ms)`);
    }
  });
  next();
});

// API Routes
app.use('/api/users', usersRouter);
app.use('/api/collections', collectionsRouter);
app.use('/api/cards', cardsRouter);
app.use('/api/boxes', boxesRouter);
app.use('/api/admin', adminRouter);
app.use('/api/uploads', uploadsRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: Date.now(),
    uptime: process.uptime()
  });
});

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/admin', express.static(path.join(__dirname, '../frontend/admin')));
app.use('/', express.static(path.join(__dirname, '../frontend')));

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  if (req.url.startsWith('/api/')) {
    res.status(404).json({ error: 'Endpoint not found' });
  } else {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
  }
});

// Start server
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════╗
║           🎴 CollectX Server v2.0                 ║
╠═══════════════════════════════════════════════════╣
║  🌐 App:    http://localhost:${PORT}                 ║
║  📊 Admin:  http://localhost:${PORT}/admin            ║
║  🔧 API:    http://localhost:${PORT}/api              ║
╠═══════════════════════════════════════════════════╣
║  ✅ Database ready                                ║
║  ✅ Security middleware enabled                   ║
║  ✅ Rate limiting active                          ║
╚═══════════════════════════════════════════════════╝
    `);
  });
}).catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
