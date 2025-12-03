// Wallet routes - CollectX Token ($X) and USDT
import { Router } from 'express';
import { run, get, all, genId } from '../db/database.js';
import { logAction } from '../middleware/security.js';

const router = Router();

// Settings
const RATE = 100; // 100 $X = 1 USDT
const SWAP_FEE = 2; // 2%
const SEND_FEE = 1; // 1%
const MIN_SEND = 1;
const MIN_WITHDRAW = 10;

// Get balance
router.get('/balance/:userId', (req, res) => {
  try {
    const user = get('SELECT * FROM users WHERE id = ?', [req.params.userId]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const wallet = get('SELECT * FROM wallets WHERE user_id = ?', [user.id]);
    
    res.json({
      balanceUsdt: wallet?.balance_usdt || '0.00',
      balanceX: String(user.coins || 0),
      rate: RATE,
      swapFee: SWAP_FEE
    });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Swap USDT <-> $X
router.post('/swap', (req, res) => {
  try {
    const { userId, amount, direction = 'usdt_to_x' } = req.body;
    if (!userId || !amount) return res.status(400).json({ error: 'userId and amount required' });
    
    const amountNum = parseFloat(amount);
    if (amountNum <= 0) return res.status(400).json({ error: 'Amount must be positive' });
    
    const user = get('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    let wallet = get('SELECT * FROM wallets WHERE user_id = ?', [userId]);
    if (!wallet) {
      run('INSERT INTO wallets (id, user_id, balance_usdt) VALUES (?, ?, ?)', [genId(), userId, '0.00']);
      wallet = get('SELECT * FROM wallets WHERE user_id = ?', [userId]);
    }
    
    const fee = amountNum * (SWAP_FEE / 100);
    const netAmount = amountNum - fee;
    
    if (direction === 'usdt_to_x') {
      // USDT -> $X
      const usdtBalance = parseFloat(wallet.balance_usdt || 0);
      if (usdtBalance < amountNum) {
        return res.status(400).json({ error: 'Insufficient USDT balance' });
      }
      
      const xReceived = Math.floor(netAmount * RATE);
      const newUsdt = (usdtBalance - amountNum).toFixed(2);
      
      run('UPDATE wallets SET balance_usdt = ? WHERE user_id = ?', [newUsdt, userId]);
      run('UPDATE users SET coins = coins + ? WHERE id = ?', [xReceived, userId]);
      
      // Log transaction
      logWalletTx(userId, 'swap', 'USDT', `-${amountNum}`, newUsdt, `Swapped to ${xReceived} $X`);
      logWalletTx(userId, 'swap', 'X', `+${xReceived}`, String(user.coins + xReceived), `Swapped from ${amountNum} USDT`);
      
      res.json({
        success: true,
        direction,
        swapped: amount,
        fee: fee.toFixed(2),
        received: String(xReceived),
        balanceUsdt: newUsdt,
        balanceX: String(user.coins + xReceived)
      });
      
    } else {
      // $X -> USDT
      const xBalance = user.coins || 0;
      const xAmount = Math.floor(amountNum);
      
      if (xBalance < xAmount) {
        return res.status(400).json({ error: 'Insufficient $X balance' });
      }
      
      const usdtReceived = (netAmount / RATE).toFixed(2);
      const newUsdt = (parseFloat(wallet.balance_usdt || 0) + parseFloat(usdtReceived)).toFixed(2);
      const newX = xBalance - xAmount;
      
      run('UPDATE wallets SET balance_usdt = ? WHERE user_id = ?', [newUsdt, userId]);
      run('UPDATE users SET coins = ? WHERE id = ?', [newX, userId]);
      
      logWalletTx(userId, 'swap', 'X', `-${xAmount}`, String(newX), `Swapped to ${usdtReceived} USDT`);
      logWalletTx(userId, 'swap', 'USDT', `+${usdtReceived}`, newUsdt, `Swapped from ${xAmount} $X`);
      
      res.json({
        success: true,
        direction,
        swapped: String(xAmount),
        fee: (xAmount * SWAP_FEE / 100).toFixed(0),
        received: usdtReceived,
        balanceUsdt: newUsdt,
        balanceX: String(newX)
      });
    }
    
  } catch (e) {
    console.error('Swap error:', e);
    res.status(500).json({ error: 'Swap failed' });
  }
});

// Send $X to another user
router.post('/send', (req, res) => {
  try {
    const { fromUserId, toUsername, amount } = req.body;
    if (!fromUserId || !toUsername || !amount) {
      return res.status(400).json({ error: 'fromUserId, toUsername, and amount required' });
    }
    
    const amountNum = parseInt(amount);
    if (amountNum < MIN_SEND) {
      return res.status(400).json({ error: `Minimum send is ${MIN_SEND} $X` });
    }
    
    const sender = get('SELECT * FROM users WHERE id = ?', [fromUserId]);
    if (!sender) return res.status(404).json({ error: 'Sender not found' });
    
    const receiver = get('SELECT * FROM users WHERE username = ? OR telegram_id = ?', [toUsername, toUsername]);
    if (!receiver) return res.status(404).json({ error: 'Receiver not found' });
    
    if (sender.id === receiver.id) {
      return res.status(400).json({ error: 'Cannot send to yourself' });
    }
    
    const fee = Math.ceil(amountNum * (SEND_FEE / 100));
    const total = amountNum + fee;
    
    if (sender.coins < total) {
      return res.status(400).json({ error: 'Insufficient balance (including fee)' });
    }
    
    // Transfer
    run('UPDATE users SET coins = coins - ? WHERE id = ?', [total, sender.id]);
    run('UPDATE users SET coins = coins + ? WHERE id = ?', [amountNum, receiver.id]);
    
    const newSenderBalance = sender.coins - total;
    const newReceiverBalance = (receiver.coins || 0) + amountNum;
    
    // Log transactions
    logWalletTx(sender.id, 'send', 'X', `-${total}`, String(newSenderBalance), `Sent ${amountNum} to @${receiver.username}`, receiver.id);
    logWalletTx(receiver.id, 'receive', 'X', `+${amountNum}`, String(newReceiverBalance), `Received from @${sender.username}`, sender.id);
    
    logAction(sender.id, 'SEND_X', { amount: amountNum, to: receiver.id, fee });
    
    res.json({
      success: true,
      sent: String(amountNum),
      fee: String(fee),
      total: String(total),
      newBalance: String(newSenderBalance),
      recipient: receiver.username || receiver.id
    });
    
  } catch (e) {
    console.error('Send error:', e);
    res.status(500).json({ error: 'Send failed' });
  }
});

// Search users for sending
router.get('/users/search', (req, res) => {
  const { query } = req.query;
  if (!query || query.length < 2) {
    return res.json({ users: [] });
  }
  
  const users = all(`
    SELECT id, username, telegram_id as telegramId 
    FROM users 
    WHERE username LIKE ? OR CAST(telegram_id AS TEXT) LIKE ?
    LIMIT 10
  `, [`%${query}%`, `%${query}%`]);
  
  res.json({ users });
});

// Get transaction history
router.get('/history/:userId', (req, res) => {
  try {
    const { page = 1, limit = 20, currency = 'all', type = 'all' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    let sql = 'SELECT * FROM wallet_transactions WHERE user_id = ?';
    const params = [req.params.userId];
    
    if (currency !== 'all') {
      sql += ' AND currency = ?';
      params.push(currency.toUpperCase());
    }
    
    if (type !== 'all') {
      sql += ' AND type = ?';
      params.push(type);
    }
    
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);
    
    const items = all(sql, params);
    const total = get('SELECT COUNT(*) as c FROM wallet_transactions WHERE user_id = ?', [req.params.userId])?.c || 0;
    
    // Enrich with related user info
    const enrichedItems = items.map(tx => {
      let relatedUser = null;
      if (tx.related_user_id) {
        const user = get('SELECT id, username FROM users WHERE id = ?', [tx.related_user_id]);
        if (user) relatedUser = { id: user.id, username: user.username };
      }
      return { ...tx, relatedUser };
    });
    
    res.json({
      items: enrichedItems,
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      hasMore: offset + items.length < total
    });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Deposit address (for USDT)
router.get('/deposit/:userId', (req, res) => {
  // In production, generate unique deposit addresses
  // For now, return a placeholder
  res.json({
    address: 'UQBvW8Z5huBkMJYdnfAEM5JqTNLFK1plCxJLBfgN_J4nHNmc',
    memo: req.params.userId.slice(0, 8),
    currency: 'USDT',
    network: 'TON',
    note: 'Send only USDT (TON network) to this address'
  });
});

// Admin: Add USDT to user (for testing)
router.post('/admin/credit', (req, res) => {
  try {
    const { userId, amount, currency = 'USDT' } = req.body;
    if (!userId || !amount) return res.status(400).json({ error: 'userId and amount required' });
    
    const user = get('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    if (currency === 'USDT') {
      let wallet = get('SELECT * FROM wallets WHERE user_id = ?', [userId]);
      if (!wallet) {
        run('INSERT INTO wallets (id, user_id, balance_usdt) VALUES (?, ?, ?)', [genId(), userId, '0.00']);
        wallet = { balance_usdt: '0.00' };
      }
      
      const newBalance = (parseFloat(wallet.balance_usdt) + parseFloat(amount)).toFixed(2);
      run('UPDATE wallets SET balance_usdt = ? WHERE user_id = ?', [newBalance, userId]);
      
      logWalletTx(userId, 'deposit', 'USDT', `+${amount}`, newBalance, 'Admin credit');
      
      res.json({ success: true, newBalance, currency: 'USDT' });
    } else {
      // $X
      run('UPDATE users SET coins = coins + ? WHERE id = ?', [parseInt(amount), userId]);
      const newBalance = (user.coins || 0) + parseInt(amount);
      
      logWalletTx(userId, 'deposit', 'X', `+${amount}`, String(newBalance), 'Admin credit');
      
      res.json({ success: true, newBalance: String(newBalance), currency: 'X' });
    }
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Helper to log wallet transactions
function logWalletTx(userId, type, currency, amount, balanceAfter, description, relatedUserId = null) {
  run(`INSERT INTO wallet_transactions (id, user_id, type, currency, amount, balance_after, description, related_user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [genId(), userId, type, currency, amount, balanceAfter, description, relatedUserId]);
}

export default router;
