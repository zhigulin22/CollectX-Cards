## CollectX Wallet 💰

A secure Telegram Mini App wallet for USDT and $X token management.

## 🔒 Security Features

This application is built with **banking-grade security** in mind:

### Financial Operations Security
- **Pessimistic Locking** - All balance operations use `SELECT FOR UPDATE` to prevent race conditions
- **Idempotent Deposits** - Unique transaction hash constraint prevents double-processing
- **Precision Handling** - Uses `Decimal.js` and `Prisma.Decimal` to prevent floating-point errors
- **Transaction Isolation** - Serializable isolation level for all financial transactions
- **Transfer Confirmation** - Two-step send flow with preview and confirmation tokens

### Authentication & Authorization
- **Telegram WebApp Validation** - Cryptographic verification of Telegram `initData`
- **Auth Date Validation** - Prevents replay attacks by checking `auth_date` freshness (24h max)
- **Timing-Safe Comparisons** - All secret comparisons use constant-time algorithms
- **JWT Tokens** - 30-day expiry with user blocking support
- **Admin API Key Protection** - Secure comparison prevents timing attacks

### Input Validation
- **Zod Schemas** - Runtime type validation on all endpoints
- **Rate Limiting** - Per-user and per-IP limits for all operations (⚠️ in-memory, use Redis for scaling)
- **Blocked User Checks** - Enforced on all protected endpoints
- **TON Address Validation** - Full checksum verification for withdrawal addresses

### Webhook Security
- **Mandatory Signature Verification** - HMAC-SHA256 required in all environments
- **Address Validation** - Only processes deposits to configured address

## 🆕 Recent Updates (v1.1.0)

### Security Fixes
- ✅ Fixed race condition in admin balance adjustment (now uses `getWalletWithLock`)
- ✅ Fixed Decimal precision loss in admin transactions
- ✅ Added rate limiting to `/swap` endpoint
- ✅ Fixed double refund vulnerability in withdraw cancellation
- ✅ Added `auth_date` validation to prevent replay attacks
- ✅ Fixed dev mode Telegram validation bypass
- ✅ Fixed webhook accepting requests without signature in dev mode
- ✅ Added TON address checksum validation (CRC16-CCITT)
- ✅ Fixed Prisma schema `relatedUser` relations

### New Features
- 🎉 **Transfer Confirmation Flow** - Users must confirm transfers before execution
  - `POST /send/preview` - Creates preview with fee calculation, returns confirmation token
  - `POST /send/confirm` - Executes transfer with valid token (5 min expiry)
- 🔔 **Transfer Notifications** - Both sender and receiver get Telegram notifications
- ⚠️ **Rate Limiter Warning** - Production warning about in-memory store limitations

## 🏗 Architecture

```
├── backend/
│   ├── src/
│   │   ├── config/         # Environment & configuration
│   │   ├── middleware/     # Auth, rate limiting, error handling
│   │   ├── routes/         # API endpoints (modular)
│   │   │   ├── wallet/     # Financial operations
│   │   │   ├── admin.ts    # Admin panel API
│   │   │   └── webhook.ts  # External integrations
│   │   ├── services/       # Business logic
│   │   │   ├── wallet.ts   # Secure financial operations
│   │   │   ├── deposit.ts  # Deposit processing
│   │   │   └── withdraw.ts # Withdrawal processing
│   │   └── utils/          # Helpers & crypto utilities
│   │       ├── crypto.ts   # Timing-safe comparisons, HMAC
│   │       └── ton.ts      # TON address validation
│   └── prisma/             # Database schema
│
└── frontend/
    ├── src/
    │   ├── admin/          # Admin dashboard
    │   ├── components/     # UI components
    │   ├── views/          # Main screens
    │   └── api.ts          # API client
    └── ...
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 15+
- pnpm

### Installation

```bash
# Install dependencies
pnpm install

# Setup database
cd backend
cp .env.example .env
# Edit .env with your settings

# Run migrations
pnpm prisma migrate dev

# Seed initial data (optional - creates 30 test users)
pnpm prisma db seed

# Start development
pnpm dev
```

### Local Development Setup (macOS)

If you're setting up locally for the first time:

```bash
# 1. Install PostgreSQL 16
brew install postgresql@16

# 2. Start PostgreSQL service
brew services start postgresql@16

# 3. Add PostgreSQL to PATH (add to ~/.zshrc)
echo 'export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# 4. Create database
createdb collectx

# 5. Configure backend/.env
# Set DATABASE_URL=postgresql://$(whoami)@localhost:5432/collectx
# Set JWT_SECRET to a random 32+ character string

# 6. Run migrations
cd backend
npx prisma migrate deploy

# 7. (Optional) Seed test data
npm run db:seed

# 8. Start backend
npm run dev

# 9. In another terminal, start frontend
cd frontend
npm run dev
```

**Note:** The seed script creates 30 test users with transactions. To clear test data:
```bash
psql -d collectx -c "DELETE FROM audit_logs; DELETE FROM withdraw_requests; DELETE FROM transactions; DELETE FROM wallets; DELETE FROM users;"
```

### Environment Variables

```env
# Required
DATABASE_URL=postgresql://user:pass@localhost:5432/collectx
JWT_SECRET=your-32-character-secret-minimum

# Production Required
TELEGRAM_BOT_TOKEN=your-bot-token
ADMIN_API_KEY=your-secure-admin-key
DEPOSIT_ADDRESS=your-ton-deposit-address
ALLOWED_ORIGINS=https://your-domain.com
WEBHOOK_SECRET=your-webhook-secret

# Optional
NODE_ENV=production
PORT=3001
RATE_LIMIT_MAX=100
```

## 📊 API Documentation

- Development: `http://localhost:3001/docs`
- Production: `/api/v1/docs` (protected)

### Main Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/auth/telegram` | POST | Authenticate via Telegram |
| `/api/v1/wallet/balance` | GET | Get wallet balance |
| `/api/v1/wallet/swap` | POST | Swap USDT ↔ $X |
| `/api/v1/wallet/send/preview` | POST | Preview transfer (get confirmation token) |
| `/api/v1/wallet/send/confirm` | POST | Confirm and execute transfer |
| `/api/v1/wallet/withdraw` | POST | Withdraw USDT |

### Transfer Flow Example

```typescript
// Step 1: Create preview
const preview = await api.sendPreview(userId, "100");
// Returns: { confirmationToken, preview: { amount, fee, total, receiverName, expiresIn } }

// Step 2: User confirms in UI
// Step 3: Execute transfer
const result = await api.sendConfirm(preview.confirmationToken);
// Returns: { success, sent, fee, total, newBalance, recipient }
```

## 🔐 Admin Panel

Access at `/admin` with your admin API key.

Features:
- User management (view, block, adjust balance)
- Withdrawal processing
- Revenue tracking
- System settings
- Audit log

## 📝 Audit Trail

All admin actions are logged:
- Balance adjustments
- User blocking/unblocking
- Withdrawal approvals/rejections
- Settings changes

## 🧪 Testing

```bash
cd backend
pnpm test        # Unit tests
pnpm test:watch  # Watch mode
```

## 📦 Deployment

### Database Migration

```bash
cd backend
pnpm prisma migrate deploy
```

### Build

```bash
pnpm build
```

### Start Production

```bash
pnpm start
```

## 🛡 Security Checklist

Before going to production:

- [ ] Set strong `JWT_SECRET` (32+ chars)
- [ ] Set strong `ADMIN_API_KEY` (16+ chars)
- [ ] Configure `WEBHOOK_SECRET`
- [ ] Set `ALLOWED_ORIGINS` for CORS
- [ ] Configure `TELEGRAM_BOT_TOKEN`
- [ ] Set `DEPOSIT_ADDRESS`
- [ ] Enable HTTPS
- [ ] Configure rate limits appropriately
- [ ] **Consider Redis for rate limiting** (required for horizontal scaling)
- [ ] Set up monitoring and alerting
- [ ] Enable database backups

## ⚠️ Known Limitations

1. **Rate Limiter** - Uses in-memory store. For multiple server instances, implement Redis-based rate limiting.
2. **JWT Storage** - Frontend uses localStorage which is vulnerable to XSS. Consider httpOnly cookies for higher security.
3. **JWT Expiry** - 30 days is long for financial apps. Consider shorter expiry with refresh tokens.

## 📄 License

Private - All rights reserved.

## 🤝 Support

For issues or questions, contact the development team.

## 🔗 TON Wallet Connectivity (non-custodial)

CollectX now supports basic connection of an external TON wallet:

- Frontend uses **TON Connect** (`@tonconnect/ui-react`, `@tonconnect/sdk`).
- Users connect their own wallet (Tonkeeper, TON Wallet, etc.), and the public address is sent to the backend.
- Backend stores this address in `User.tonAddress` and validates it using `utils/ton.ts`.

### Backend route

- `POST /api/v1/wallet/ton/link`
  - Body: `{ "address": "EQ..." }`
  - Requires JWT auth
  - On success stores the address in the current user record.

### TON Connect manifest

Frontend expects TON Connect manifest at:

`/tonconnect-manifest.json`

Create `frontend/public/tonconnect-manifest.json` with at least:

```json
{
  "url": "https://your-domain.example",
  "name": "CollectX",
  "iconUrl": "https://your-domain.example/icon.png"
}
```

For local development you can use your dev URL and a temporary icon, or a placeholder URL if you are just testing integration.
