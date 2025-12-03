// Database Schema - Production Ready
export const schema = `
-- Collections
CREATE TABLE IF NOT EXISTS collections (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  symbol TEXT NOT NULL UNIQUE,
  description TEXT,
  cover_url TEXT,
  floor_price INTEGER DEFAULT 100,
  total_cards INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Cards with full metadata
CREATE TABLE IF NOT EXISTS cards (
  id TEXT PRIMARY KEY,
  collection_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  rarity TEXT DEFAULT 'common' CHECK(rarity IN ('common','rare','epic','legendary')),
  total_supply INTEGER DEFAULT 0,
  minted_count INTEGER DEFAULT 0,
  base_value INTEGER DEFAULT 10,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE
);

-- Users with security
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  telegram_id INTEGER UNIQUE NOT NULL,
  username TEXT,
  coins INTEGER DEFAULT 100 CHECK(coins >= 0),
  xp INTEGER DEFAULT 0 CHECK(xp >= 0),
  rank TEXT DEFAULT 'bronze',
  is_admin INTEGER DEFAULT 0,
  is_bot INTEGER DEFAULT 0,
  last_free_box INTEGER DEFAULT 0,
  total_boxes_opened INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  last_action INTEGER DEFAULT 0
);

-- Inventory with serial numbers
CREATE TABLE IF NOT EXISTS inventory (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  card_id TEXT NOT NULL,
  serial_number INTEGER NOT NULL,
  obtained_at INTEGER DEFAULT (strftime('%s', 'now')),
  obtained_from TEXT DEFAULT 'box',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE,
  UNIQUE(card_id, serial_number)
);

-- Boxes
CREATE TABLE IF NOT EXISTS boxes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price INTEGER DEFAULT 0 CHECK(price >= 0),
  cards_count INTEGER DEFAULT 3,
  rarity_weights TEXT DEFAULT '{"common":70,"rare":20,"epic":8,"legendary":2}',
  is_active INTEGER DEFAULT 1,
  times_opened INTEGER DEFAULT 0
);

-- Action logs for security
CREATE TABLE IF NOT EXISTS action_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT,
  action TEXT NOT NULL,
  details TEXT,
  ip_hash TEXT,
  timestamp INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Rate limiting
CREATE TABLE IF NOT EXISTS rate_limits (
  user_id TEXT PRIMARY KEY,
  action_count INTEGER DEFAULT 0,
  window_start INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_inventory_user ON inventory(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_card ON inventory(card_id);
CREATE INDEX IF NOT EXISTS idx_cards_collection ON cards(collection_id);
CREATE INDEX IF NOT EXISTS idx_cards_rarity ON cards(rarity);
CREATE INDEX IF NOT EXISTS idx_users_telegram ON users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_logs_user ON action_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_logs_time ON action_logs(timestamp);
`;

// Rank System
export const RANKS = {
  bronze:   { min: 0,     color: '#cd7f32', glow: 'rgba(205,127,50,0.5)' },
  silver:   { min: 100,   color: '#c0c0c0', glow: 'rgba(192,192,192,0.5)' },
  gold:     { min: 500,   color: '#ffd700', glow: 'rgba(255,215,0,0.5)' },
  platinum: { min: 1500,  color: '#e5e4e2', glow: 'rgba(229,228,226,0.6)' },
  diamond:  { min: 5000,  color: '#b9f2ff', glow: 'rgba(185,242,255,0.6)' },
  master:   { min: 15000, color: '#9b59b6', glow: 'rgba(155,89,182,0.6)' },
  legend:   { min: 50000, color: '#f39c12', glow: 'rgba(243,156,18,0.7)' }
};

// Rarity multipliers for value calculation
export const RARITY_VALUES = {
  common: 1,
  rare: 5,
  epic: 20,
  legendary: 100
};

export function calculateRank(xp) {
  let rank = 'bronze';
  for (const [r, data] of Object.entries(RANKS)) {
    if (xp >= data.min) rank = r;
  }
  return rank;
}

export function calculateCardValue(card, serialNumber) {
  const baseValue = card.base_value || 10;
  const rarityMult = RARITY_VALUES[card.rarity] || 1;
  // First 10 serials are worth 2x, first 100 worth 1.5x
  const serialMult = serialNumber <= 10 ? 2 : serialNumber <= 100 ? 1.5 : 1;
  return Math.round(baseValue * rarityMult * serialMult);
}
