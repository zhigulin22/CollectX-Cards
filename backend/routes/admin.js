// Admin routes
import { Router } from 'express';
import { run, get, all, genId } from '../db/database.js';

const router = Router();

// Middleware to check admin
function requireAdmin(req, res, next) {
    const { adminId } = req.query;
    if (!adminId) return res.status(401).json({ error: 'Admin ID required' });
    
    const admin = get('SELECT * FROM users WHERE id = ? AND is_admin = 1', [adminId]);
    if (!admin) return res.status(403).json({ error: 'Access denied' });
    
    req.admin = admin;
    next();
}

// Get all admin data
router.get('/dashboard', requireAdmin, (req, res) => {
    const collections = all('SELECT * FROM collections ORDER BY created_at DESC');
    const cards = all(`SELECT c.*, col.name as collection_name FROM cards c 
                       JOIN collections col ON c.collection_id = col.id ORDER BY c.collection_id, c.rarity DESC`);
    const boxes = all('SELECT * FROM boxes ORDER BY price ASC');
    const users = all('SELECT id, telegram_id, username, coins, xp, rank, is_admin, created_at FROM users ORDER BY xp DESC');
    
    const stats = {
        totalUsers: users.length,
        totalCards: cards.length,
        totalCollections: collections.length,
        totalMinted: get('SELECT COUNT(*) as c FROM inventory')?.c || 0
    };
    
    res.json({ collections, cards, boxes, users, stats });
});

// Create collection
router.post('/collections', requireAdmin, (req, res) => {
    const { name, symbol, description, coverUrl } = req.body;
    if (!name || !symbol) return res.status(400).json({ error: 'name and symbol required' });
    
    const id = genId();
    run('INSERT INTO collections (id, name, symbol, description, cover_url) VALUES (?, ?, ?, ?, ?)',
        [id, name, symbol.toUpperCase(), description || '', coverUrl || '']);
    res.status(201).json(get('SELECT * FROM collections WHERE id = ?', [id]));
});

// Update collection
router.put('/collections/:id', requireAdmin, (req, res) => {
    const { name, symbol, description, coverUrl } = req.body;
    run('UPDATE collections SET name = ?, symbol = ?, description = ?, cover_url = ? WHERE id = ?',
        [name, symbol, description, coverUrl, req.params.id]);
    res.json(get('SELECT * FROM collections WHERE id = ?', [req.params.id]));
});

// Delete collection
router.delete('/collections/:id', requireAdmin, (req, res) => {
    run('DELETE FROM inventory WHERE card_id IN (SELECT id FROM cards WHERE collection_id = ?)', [req.params.id]);
    run('DELETE FROM cards WHERE collection_id = ?', [req.params.id]);
    run('DELETE FROM collections WHERE id = ?', [req.params.id]);
    res.json({ success: true });
});

// Create card
router.post('/cards', requireAdmin, (req, res) => {
    const { collectionId, name, imageUrl, rarity, totalSupply } = req.body;
    if (!collectionId || !name) return res.status(400).json({ error: 'collectionId and name required' });
    
    const id = genId();
    run('INSERT INTO cards (id, collection_id, name, image_url, rarity, total_supply) VALUES (?, ?, ?, ?, ?, ?)',
        [id, collectionId, name, imageUrl || '', rarity || 'common', totalSupply || 0]);
    res.status(201).json(get('SELECT * FROM cards WHERE id = ?', [id]));
});

// Update card
router.put('/cards/:id', requireAdmin, (req, res) => {
    const { name, imageUrl, rarity, totalSupply } = req.body;
    run('UPDATE cards SET name = ?, image_url = ?, rarity = ?, total_supply = ? WHERE id = ?',
        [name, imageUrl, rarity, totalSupply, req.params.id]);
    res.json(get('SELECT * FROM cards WHERE id = ?', [req.params.id]));
});

// Delete card
router.delete('/cards/:id', requireAdmin, (req, res) => {
    run('DELETE FROM inventory WHERE card_id = ?', [req.params.id]);
    run('DELETE FROM cards WHERE id = ?', [req.params.id]);
    res.json({ success: true });
});

// Create box
router.post('/boxes', requireAdmin, (req, res) => {
    const { name, description, price, cardsCount, rarityWeights } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });
    
    const id = genId();
    run('INSERT INTO boxes (id, name, description, price, cards_count, rarity_weights) VALUES (?, ?, ?, ?, ?, ?)',
        [id, name, description || '', price || 0, cardsCount || 3, JSON.stringify(rarityWeights || {})]);
    res.status(201).json(get('SELECT * FROM boxes WHERE id = ?', [id]));
});

// Toggle user admin status
router.post('/users/:id/admin', requireAdmin, (req, res) => {
    const { isAdmin } = req.body;
    run('UPDATE users SET is_admin = ? WHERE id = ?', [isAdmin ? 1 : 0, req.params.id]);
    res.json(get('SELECT id, username, is_admin FROM users WHERE id = ?', [req.params.id]));
});

// Give coins to user
router.post('/users/:id/coins', requireAdmin, (req, res) => {
    const { amount } = req.body;
    run('UPDATE users SET coins = coins + ? WHERE id = ?', [amount || 0, req.params.id]);
    res.json(get('SELECT id, username, coins FROM users WHERE id = ?', [req.params.id]));
});

// Give XP to user
router.post('/users/:id/xp', requireAdmin, (req, res) => {
    const { amount } = req.body;
    const user = get('SELECT * FROM users WHERE id = ?', [req.params.id]);
    const newXp = (user.xp || 0) + (amount || 0);
    run('UPDATE users SET xp = ? WHERE id = ?', [newXp, req.params.id]);
    res.json(get('SELECT id, username, xp, rank FROM users WHERE id = ?', [req.params.id]));
});

export default router;

