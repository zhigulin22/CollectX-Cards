# CollectX - NFT Card Collection Mini App

> 🎴 Telegram Mini App for collecting, trading, and showcasing NFT cards

## Features

- 📦 **Pack Opening** - Open free daily packs or buy premium boxes
- 🎴 **Card Collection** - Collect cards across multiple NFT collections
- 🏆 **Ranking System** - Level up from Bronze to Legend
- 📊 **Card Details** - View market value, uniqueness, serial numbers
- 👨‍💼 **Admin Panel** - Create collections and cards with image upload
- 🔒 **Security** - Rate limiting, input validation, anti-cheat

## Tech Stack

- **Backend**: Node.js, Express.js, SQLite
- **Frontend**: Vanilla JS, CSS3
- **Database**: SQLite with sql.js

## Quick Start

```bash
# Install dependencies
cd backend
npm install

# Seed database with test data
npm run seed

# Start server
npm start
```

Open http://localhost:3001 in browser.

## XP & Ranking System

| Rank | Required XP |
|------|-------------|
| Bronze | 0 |
| Silver | 100 |
| Gold | 500 |
| Platinum | 1,500 |
| Diamond | 5,000 |
| Master | 15,000 |
| Legend | 50,000 |

### XP Rewards
- Common card: **5 XP**
- Rare card: **15 XP**
- Epic card: **50 XP**
- Legendary card: **200 XP**

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/users/auth | Authenticate user |
| GET | /api/collections | Get all collections |
| GET | /api/collections/:id | Get collection details |
| GET | /api/users/:id/inventory | Get user's cards |
| GET | /api/boxes | Get available boxes |
| POST | /api/boxes/:id/open | Open a box |
| GET | /api/cards/:id | Get card details |
| POST | /api/uploads/image | Upload image |

## Admin Panel

Access at http://localhost:3001/admin

Features:
- Create/edit collections
- Add cards with images
- Manage boxes
- View user statistics

## Project Structure

```
collectx-cards/
├── backend/
│   ├── db/
│   │   ├── database.js   # SQLite connection
│   │   └── schema.js     # DB schema & ranks
│   ├── middleware/
│   │   └── security.js   # Rate limiting, validation
│   ├── routes/
│   │   ├── users.js      # User endpoints
│   │   ├── collections.js
│   │   ├── cards.js
│   │   ├── boxes.js
│   │   └── uploads.js    # Image upload
│   ├── tests/
│   │   └── api.test.js   # API tests
│   ├── index.js          # Express server
│   ├── seed.js           # Database seeder
│   └── package.json
├── frontend/
│   ├── css/
│   │   └── app.css       # Styles
│   ├── js/
│   │   ├── api.js        # API client
│   │   └── app.js        # Main app
│   ├── admin/
│   │   └── index.html    # Admin panel
│   └── index.html        # Main app
├── uploads/              # User uploads
├── .gitignore
└── README.md
```

## Environment Variables

```env
PORT=3001
NODE_ENV=development
BOT_TOKEN=your_telegram_bot_token
```

## License

MIT
