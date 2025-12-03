// Card routes with full details
import { Router } from 'express';
import { run, get, all, genId } from '../db/database.js';
import { calculateCardValue, RARITY_VALUES } from '../db/schema.js';

const router = Router();

// Get card with full details
router.get('/:id', (req, res) => {
  try {
    const card = get(`
      SELECT c.*, col.name as collection_name, col.symbol as collection_symbol, col.floor_price
      FROM cards c
      JOIN collections col ON c.collection_id = col.id
      WHERE c.id = ?
    `, [req.params.id]);
    
    if (!card) return res.status(404).json({ error: 'Card not found' });
    
    // Get ownership stats
    const owners = get('SELECT COUNT(DISTINCT user_id) as c FROM inventory WHERE card_id = ?', [req.params.id])?.c || 0;
    const minted = get('SELECT COUNT(*) as c FROM inventory WHERE card_id = ?', [req.params.id])?.c || 0;
    
    // Calculate market value
    const baseValue = card.base_value || 10;
    const rarityMult = RARITY_VALUES[card.rarity] || 1;
    const scarcityMult = card.total_supply > 0 
      ? Math.max(1, 2 - (minted / card.total_supply)) 
      : 1;
    const marketValue = Math.round(baseValue * rarityMult * scarcityMult);
    
    // Get recent owners
    const recentOwners = all(`
      SELECT u.username, i.serial_number, i.obtained_at
      FROM inventory i
      JOIN users u ON i.user_id = u.id
      WHERE i.card_id = ?
      ORDER BY i.serial_number ASC
      LIMIT 10
    `, [req.params.id]);
    
    // Uniqueness score (based on supply and owners)
    const uniqueness = card.total_supply > 0 
      ? Math.round(100 - (minted / card.total_supply * 50) - (owners / Math.max(1, minted) * 50))
      : Math.max(10, 100 - owners * 2);
    
    res.json({
      ...card,
      owners,
      minted,
      remaining: card.total_supply > 0 ? Math.max(0, card.total_supply - minted) : null,
      marketValue,
      uniqueness: Math.max(0, Math.min(100, uniqueness)),
      recentOwners,
      rarityRank: { common: 4, rare: 3, epic: 2, legendary: 1 }[card.rarity]
    });
  } catch (e) {
    console.error('Card error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: create card
router.post('/', (req, res) => {
  const { collectionId, name, description, imageUrl, rarity, totalSupply, baseValue } = req.body;
  if (!collectionId || !name) return res.status(400).json({ error: 'collectionId and name required' });
  
  const id = genId();
  run(`INSERT INTO cards (id, collection_id, name, description, image_url, rarity, total_supply, base_value)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, collectionId, name, description || '', imageUrl || '', rarity || 'common', totalSupply || 0, baseValue || 10]);
  
  // Update collection card count
  run('UPDATE collections SET total_cards = (SELECT COUNT(*) FROM cards WHERE collection_id = ?) WHERE id = ?',
    [collectionId, collectionId]);
  
  res.status(201).json(get('SELECT * FROM cards WHERE id = ?', [id]));
});

// Admin: update card
router.put('/:id', (req, res) => {
  const { name, description, imageUrl, rarity, totalSupply, baseValue } = req.body;
  run(`UPDATE cards SET name = ?, description = ?, image_url = ?, rarity = ?, total_supply = ?, base_value = ? WHERE id = ?`,
    [name, description, imageUrl, rarity, totalSupply, baseValue, req.params.id]);
  res.json(get('SELECT * FROM cards WHERE id = ?', [req.params.id]));
});

// Admin: delete card
router.delete('/:id', (req, res) => {
  const card = get('SELECT collection_id FROM cards WHERE id = ?', [req.params.id]);
  run('DELETE FROM inventory WHERE card_id = ?', [req.params.id]);
  run('DELETE FROM cards WHERE id = ?', [req.params.id]);
  if (card) {
    run('UPDATE collections SET total_cards = (SELECT COUNT(*) FROM cards WHERE collection_id = ?) WHERE id = ?',
      [card.collection_id, card.collection_id]);
  }
  res.json({ success: true });
});

export default router;
