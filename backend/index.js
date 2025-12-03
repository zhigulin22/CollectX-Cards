// CollectX Server - Production Ready
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { initDB } from './db/database.js';
import usersRouter from './routes/users.js';
import collectionsRouter from './routes/collections.js';
import cardsRouter from './routes/cards.js';
import boxesRouter from './routes/boxes.js';
import adminRouter from './routes/admin.js';
import uploadsRouter from './routes/uploads.js';
import walletRouter from './routes/wallet.js';

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
app.use(express.json({ limit: '5mb' }));

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
app.use('/api/wallet', walletRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: Date.now(),
    uptime: process.uptime()
  });
});

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('📁 Created uploads directory');
}

// Static files
app.use('/uploads', express.static(uploadsDir, { maxAge: '1d' }));
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
║        🎴 CollectX Server v2.1                    ║
╠═══════════════════════════════════════════════════╣
║  🌐 App:    http://localhost:${PORT}                 ║
║  📊 Admin:  http://localhost:${PORT}/admin            ║
║  🔧 API:    http://localhost:${PORT}/api              ║
║  👛 Wallet: http://localhost:${PORT}/api/wallet       ║
╠═══════════════════════════════════════════════════╣
║  ✅ Database ready                                ║
║  ✅ Cards + Wallet integrated                     ║
║  ✅ Security middleware enabled                   ║
╚═══════════════════════════════════════════════════╝
    `);
  });
}).catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
