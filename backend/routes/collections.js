// Collection routes
import { Router } from 'express';
import { run, get, all, genId } from '../db/database.js';
import { calculateCardValue, RARITY_VALUES } from '../db/schema.js';

const router = Router();

// Get all collections with stats
router.get('/', (req, res) => {
  try {
    const cols = all(`
      SELECT c.*, 
        (SELECT COUNT(*) FROM cards WHERE collection_id = c.id) as total_cards,
        (SELECT COUNT(*) FROM cards WHERE collection_id = c.id AND rarity = 'legendary') as legendary_count,
        (SELECT COUNT(*) FROM cards WHERE collection_id = c.id AND rarity = 'epic') as epic_count
      FROM collections c ORDER BY created_at DESC
    `);
    res.json(cols);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get collection detail (album view)
router.get('/:id', (req, res) => {
  try {
    const col = get('SELECT * FROM collections WHERE id = ?', [req.params.id]);
    if (!col) return res.status(404).json({ error: 'Collection not found' });
    
    // Get all cards in collection
    col.cards = all(`
      SELECT c.*, 
        (SELECT COUNT(*) FROM inventory WHERE card_id = c.id) as total_minted,
        (SELECT COUNT(DISTINCT user_id) FROM inventory WHERE card_id = c.id) as unique_owners
      FROM cards c WHERE c.collection_id = ? 
      ORDER BY CASE c.rarity WHEN 'legendary' THEN 1 WHEN 'epic' THEN 2 WHEN 'rare' THEN 3 ELSE 4 END, c.name
    `, [req.params.id]);
    
    // Collection stats
    col.stats = {
      total_cards: col.cards.length,
      total_minted: col.cards.reduce((sum, c) => sum + (c.total_minted || 0), 0),
      floor_price: col.floor_price || 100,
      by_rarity: {
        common: col.cards.filter(c => c.rarity === 'common').length,
        rare: col.cards.filter(c => c.rarity === 'rare').length,
        epic: col.cards.filter(c => c.rarity === 'epic').length,
        legendary: col.cards.filter(c => c.rarity === 'legendary').length
      }
    };
    
    res.json(col);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get collection progress for user
router.get('/:id/progress/:userId', (req, res) => {
  try {
    const { id, userId } = req.params;
    
    const total = get('SELECT COUNT(*) as c FROM cards WHERE collection_id = ?', [id])?.c || 0;
    const owned = get(`
      SELECT COUNT(DISTINCT i.card_id) as c FROM inventory i
      JOIN cards c ON i.card_id = c.id
      WHERE c.collection_id = ? AND i.user_id = ?
    `, [id, userId])?.c || 0;
    
    const ownedCards = all(`
      SELECT c.id, c.name, c.rarity FROM inventory i
      JOIN cards c ON i.card_id = c.id
      WHERE c.collection_id = ? AND i.user_id = ?
    `, [id, userId]);
    
    const missingCards = all(`
      SELECT c.id, c.name, c.rarity FROM cards c
      WHERE c.collection_id = ? AND c.id NOT IN (
        SELECT card_id FROM inventory WHERE user_id = ?
      )
    `, [id, userId]);
    
    res.json({
      total,
      owned,
      progress: total > 0 ? Math.round((owned / total) * 100) : 0,
      ownedCards,
      missingCards,
      isComplete: owned === total && total > 0
    });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin routes
router.post('/', (req, res) => {
  const { name, symbol, description, coverUrl, floorPrice } = req.body;
  if (!name || !symbol) return res.status(400).json({ error: 'name and symbol required' });
  
  const id = genId();
  run(`INSERT INTO collections (id, name, symbol, description, cover_url, floor_price) 
       VALUES (?, ?, ?, ?, ?, ?)`,
    [id, name, symbol.toUpperCase(), description || '', coverUrl || '', floorPrice || 100]);
  res.status(201).json(get('SELECT * FROM collections WHERE id = ?', [id]));
});

router.put('/:id', (req, res) => {
  const { name, symbol, description, coverUrl, floorPrice } = req.body;
  run(`UPDATE collections SET name = ?, symbol = ?, description = ?, cover_url = ?, floor_price = ? WHERE id = ?`,
    [name, symbol, description, coverUrl, floorPrice || 100, req.params.id]);
  res.json(get('SELECT * FROM collections WHERE id = ?', [req.params.id]));
});

router.delete('/:id', (req, res) => {
  run('DELETE FROM inventory WHERE card_id IN (SELECT id FROM cards WHERE collection_id = ?)', [req.params.id]);
  run('DELETE FROM cards WHERE collection_id = ?', [req.params.id]);
  run('DELETE FROM collections WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

export default router;
