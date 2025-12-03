// User routes with security
import { Router } from 'express';
import { run, get, all, genId } from '../db/database.js';
import { RANKS, calculateRank } from '../db/schema.js';
import { rateLimit, logAction, sanitize } from '../middleware/security.js';

const router = Router();
const COOLDOWN = 86400; // 24 hours

router.use(rateLimit);

// Auth user
router.post('/auth', (req, res) => {
  try {
    let { telegramId, username } = req.body;
    if (!telegramId) return res.status(400).json({ error: 'telegramId required' });
    
    telegramId = Number(telegramId);
    username = sanitize(username) || 'user';
    
    let user = get('SELECT * FROM users WHERE telegram_id = ?', [telegramId]);
    
    if (!user) {
      const id = genId();
      const isAdmin = telegramId === 123456789 ? 1 : 0;
      run(`INSERT INTO users (id, telegram_id, username, coins, xp, rank, is_admin) 
           VALUES (?, ?, ?, 500, 0, 'bronze', ?)`, [id, telegramId, username, isAdmin]);
      user = get('SELECT * FROM users WHERE id = ?', [id]);
      logAction(id, 'USER_CREATED', { telegramId });
    } else {
      // Update last action
      run('UPDATE users SET last_action = ? WHERE id = ?', [Math.floor(Date.now()/1000), user.id]);
    }
    
    // Update rank
    const newRank = calculateRank(user.xp || 0);
    if (newRank !== user.rank) {
      run('UPDATE users SET rank = ? WHERE id = ?', [newRank, user.id]);
      user.rank = newRank;
    }
    
    // Get stats
    const stats = getUserStats(user.id);
    user.rankInfo = RANKS[user.rank] || RANKS.bronze;
    
    res.json({ user, stats, ranks: RANKS });
  } catch (e) {
    console.error('Auth error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user inventory with filters
router.get('/:id/inventory', (req, res) => {
  try {
    const { collection, rarity, sort = 'newest' } = req.query;
    let sql = `SELECT i.*, c.*, col.name as collection_name, col.symbol as collection_symbol,
               col.floor_price FROM inventory i
               JOIN cards c ON i.card_id = c.id 
               JOIN collections col ON c.collection_id = col.id
               WHERE i.user_id = ?`;
    const params = [req.params.id];
    
    if (collection) { sql += ' AND c.collection_id = ?'; params.push(collection); }
    if (rarity) { sql += ' AND c.rarity = ?'; params.push(rarity); }
    
    // Sorting
    switch(sort) {
      case 'rarity': sql += ' ORDER BY CASE c.rarity WHEN "legendary" THEN 1 WHEN "epic" THEN 2 WHEN "rare" THEN 3 ELSE 4 END'; break;
      case 'oldest': sql += ' ORDER BY i.obtained_at ASC'; break;
      case 'value': sql += ' ORDER BY c.base_value DESC'; break;
      default: sql += ' ORDER BY i.obtained_at DESC';
    }
    
    res.json(all(sql, params));
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get free box status
router.get('/:id/free-box', (req, res) => {
  const user = get('SELECT * FROM users WHERE id = ?', [req.params.id]);
  if (!user) return res.status(404).json({ error: 'User not found' });
  
  const now = Math.floor(Date.now() / 1000);
  const available = now - (user.last_free_box || 0) >= COOLDOWN;
  const remaining = available ? 0 : COOLDOWN - (now - (user.last_free_box || 0));
  
  res.json({ available, remaining });
});

// Get user profile
router.get('/:id', (req, res) => {
  const user = get('SELECT * FROM users WHERE id = ?', [req.params.id]);
  if (!user) return res.status(404).json({ error: 'User not found' });
  
  user.rankInfo = RANKS[user.rank] || RANKS.bronze;
  const stats = getUserStats(user.id);
  
  res.json({ user, stats });
});

function getUserStats(userId) {
  const total = get('SELECT COUNT(*) as c FROM inventory WHERE user_id = ?', [userId])?.c || 0;
  
  const byRarity = all(`SELECT c.rarity, COUNT(*) as count FROM inventory i
    JOIN cards c ON i.card_id = c.id WHERE i.user_id = ? GROUP BY c.rarity`, [userId]);
  
  const collections = all(`
    SELECT col.id, col.name, col.symbol, col.total_cards,
           COUNT(DISTINCT i.card_id) as owned
    FROM collections col
    LEFT JOIN cards c ON c.collection_id = col.id
    LEFT JOIN inventory i ON i.card_id = c.id AND i.user_id = ?
    GROUP BY col.id
  `, [userId]);
  
  const totalValue = get(`
    SELECT SUM(c.base_value * CASE c.rarity 
      WHEN 'legendary' THEN 100 WHEN 'epic' THEN 20 WHEN 'rare' THEN 5 ELSE 1 END) as v
    FROM inventory i JOIN cards c ON i.card_id = c.id WHERE i.user_id = ?
  `, [userId])?.v || 0;
  
  return { total, byRarity, collections, totalValue };
}

export default router;
