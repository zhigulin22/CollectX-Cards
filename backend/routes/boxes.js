// Box routes with security
import { Router } from 'express';
import { run, get, all, genId } from '../db/database.js';
import { calculateRank } from '../db/schema.js';
import { logAction, detectSuspiciousActivity } from '../middleware/security.js';

const router = Router();
const COOLDOWN = 86400;

// Get all boxes
router.get('/', (req, res) => {
  res.json(all('SELECT * FROM boxes WHERE is_active = 1 ORDER BY price ASC'));
});

// Open box with security checks
router.post('/:id/open', async (req, res) => {
  try {
    const { userId, isFree } = req.body;
    if (!userId) return res.status(400).json({ success: false, error: 'userId required' });
    
    const box = get('SELECT * FROM boxes WHERE id = ?', [req.params.id]);
    const user = get('SELECT * FROM users WHERE id = ?', [userId]);
    
    if (!box) return res.json({ success: false, error: 'Box not found' });
    if (!user) return res.json({ success: false, error: 'User not found' });
    
    // Security check
    if (detectSuspiciousActivity(userId)) {
      return res.json({ success: false, error: 'Suspicious activity detected. Please try again later.' });
    }
    
    const now = Math.floor(Date.now() / 1000);
    
    // Free box check
    if (isFree) {
      if (now - (user.last_free_box || 0) < COOLDOWN) {
        return res.json({ success: false, error: 'Free box not available yet' });
      }
    } else if (box.price > 0) {
      if (user.coins < box.price) {
        return res.json({ success: false, error: 'Not enough coins' });
      }
      // Deduct coins
      run('UPDATE users SET coins = coins - ? WHERE id = ?', [box.price, userId]);
    }
    
    // Roll cards
    const weights = JSON.parse(box.rarity_weights || '{"common":70,"rare":20,"epic":8,"legendary":2}');
    const cards = [];
    
    for (let i = 0; i < box.cards_count; i++) {
      const card = rollCard(weights, userId);
      if (card) {
        cards.push(card);
        // Add XP for getting card
        const xpGain = { common: 5, rare: 15, epic: 50, legendary: 200 }[card.rarity] || 5;
        run('UPDATE users SET xp = xp + ? WHERE id = ?', [xpGain, userId]);
      }
    }
    
    // Update user stats
    if (isFree) {
      run('UPDATE users SET last_free_box = ?, total_boxes_opened = total_boxes_opened + 1 WHERE id = ?', [now, userId]);
    } else {
      run('UPDATE users SET total_boxes_opened = total_boxes_opened + 1 WHERE id = ?', [userId]);
    }
    
    // Recalculate and update rank
    const updatedUser = get('SELECT xp FROM users WHERE id = ?', [userId]);
    const newRank = calculateRank(updatedUser?.xp || 0);
    run('UPDATE users SET rank = ? WHERE id = ?', [newRank, userId]);
    
    // Update box stats
    run('UPDATE boxes SET times_opened = times_opened + 1 WHERE id = ?', [req.params.id]);
    
    // Log action
    logAction(userId, 'BOX_OPENED', { 
      boxId: req.params.id, 
      isFree, 
      cardsReceived: cards.length,
      rarities: cards.map(c => c.rarity)
    });
    
    res.json({ success: true, cards });
  } catch (e) {
    console.error('Box open error:', e);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

function rollCard(weights, userId) {
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;
  let rarity = 'common';
  
  for (const [r, w] of Object.entries(weights)) {
    roll -= w;
    if (roll <= 0) { rarity = r; break; }
  }
  
  // Prioritize cards user doesn't have
  let card = get(`
    SELECT c.* FROM cards c
    WHERE c.rarity = ?
    AND c.id NOT IN (SELECT card_id FROM inventory WHERE user_id = ?)
    AND (c.total_supply = 0 OR c.minted_count < c.total_supply)
    ORDER BY RANDOM() LIMIT 1
  `, [rarity, userId]);
  
  // Fallback to any card of this rarity
  if (!card) {
    card = get(`
      SELECT * FROM cards 
      WHERE rarity = ? AND (total_supply = 0 OR minted_count < total_supply)
      ORDER BY RANDOM() LIMIT 1
    `, [rarity]);
  }
  
  // Ultimate fallback
  if (!card) {
    card = get(`SELECT * FROM cards WHERE (total_supply = 0 OR minted_count < total_supply) ORDER BY RANDOM() LIMIT 1`);
  }
  
  if (!card) return null;
  
  // Mint the card
  const serial = (card.minted_count || 0) + 1;
  const invId = genId();
  
  run('INSERT INTO inventory (id, user_id, card_id, serial_number, obtained_from) VALUES (?, ?, ?, ?, ?)',
    [invId, userId, card.id, serial, 'box']);
  run('UPDATE cards SET minted_count = minted_count + 1 WHERE id = ?', [card.id]);
  
  return { ...card, serial_number: serial };
}

// Admin routes
router.post('/', (req, res) => {
  const { name, description, price, cardsCount, rarityWeights } = req.body;
  const id = genId();
  run(`INSERT INTO boxes (id, name, description, price, cards_count, rarity_weights) VALUES (?, ?, ?, ?, ?, ?)`,
    [id, name, description || '', price || 0, cardsCount || 3, JSON.stringify(rarityWeights || {})]);
  res.status(201).json(get('SELECT * FROM boxes WHERE id = ?', [id]));
});

export default router;
