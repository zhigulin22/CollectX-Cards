// Security Middleware
import { get, run } from '../db/database.js';
import crypto from 'crypto';

const RATE_LIMIT = 50; // actions per minute (strict for security)
const RATE_WINDOW = 60; // seconds

// Rate limiting
export function rateLimit(req, res, next) {
  // Get identifier from various sources
  const userId = String(req.body?.userId || req.body?.telegramId || req.query?.userId || req.params?.id || 'anon');
  
  const now = Math.floor(Date.now() / 1000);
  
  try {
    let limit = get('SELECT * FROM rate_limits WHERE user_id = ?', [userId]);
    
    if (!limit) {
      run('INSERT OR REPLACE INTO rate_limits (user_id, action_count, window_start) VALUES (?, 1, ?)', [userId, now]);
      return next();
    }
    
    // Reset window if expired
    if (now - limit.window_start > RATE_WINDOW) {
      run('UPDATE rate_limits SET action_count = 1, window_start = ? WHERE user_id = ?', [now, userId]);
      return next();
    }
    
    // Check limit
    if (limit.action_count >= RATE_LIMIT) {
      logAction(userId, 'RATE_LIMITED', { count: limit.action_count });
      return res.status(429).json({ error: 'Too many requests. Please slow down.' });
    }
    
    // Increment counter
    run('UPDATE rate_limits SET action_count = action_count + 1 WHERE user_id = ?', [userId]);
    next();
  } catch (e) {
    // If rate limiting fails, allow request but log error
    console.error('Rate limit error:', e);
    next();
  }
}

// Input validation
export function validateInput(schema) {
  return (req, res, next) => {
    for (const [field, rules] of Object.entries(schema)) {
      const value = req.body?.[field] || req.query?.[field];
      
      if (rules.required && (value === undefined || value === null || value === '')) {
        return res.status(400).json({ error: `${field} is required` });
      }
      
      if (value !== undefined) {
        if (rules.type === 'number' && isNaN(Number(value))) {
          return res.status(400).json({ error: `${field} must be a number` });
        }
        if (rules.type === 'string' && typeof value !== 'string') {
          return res.status(400).json({ error: `${field} must be a string` });
        }
        if (rules.maxLength && String(value).length > rules.maxLength) {
          return res.status(400).json({ error: `${field} is too long` });
        }
        if (rules.enum && !rules.enum.includes(value)) {
          return res.status(400).json({ error: `${field} must be one of: ${rules.enum.join(', ')}` });
        }
      }
    }
    next();
  };
}

// Log actions for security audit
export function logAction(userId, action, details = {}) {
  try {
    run('INSERT INTO action_logs (user_id, action, details) VALUES (?, ?, ?)',
      [userId, action, JSON.stringify(details)]);
  } catch (e) {
    console.error('Failed to log action:', e);
  }
}

// Hash sensitive data
export function hashData(data) {
  return crypto.createHash('sha256').update(String(data)).digest('hex').slice(0, 16);
}

// Sanitize user input
export function sanitize(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/[<>\"\'&]/g, '').trim().slice(0, 500);
}

// Verify Telegram WebApp data (production)
export function verifyTelegramAuth(initData, botToken) {
  if (!initData || !botToken) return false;
  
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    params.delete('hash');
    
    const dataCheckString = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('\n');
    
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    const checkHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
    
    return hash === checkHash;
  } catch {
    return false;
  }
}

// Anti-cheat: detect suspicious patterns
export function detectSuspiciousActivity(userId) {
  const now = Math.floor(Date.now() / 1000);
  const fiveMinAgo = now - 300;
  
  const recentActions = get(`
    SELECT COUNT(*) as count FROM action_logs 
    WHERE user_id = ? AND timestamp > ? AND action = 'BOX_OPENED'
  `, [userId, fiveMinAgo]);
  
  // More than 50 boxes in 5 minutes is suspicious
  if (recentActions?.count > 50) {
    logAction(userId, 'SUSPICIOUS_ACTIVITY', { reason: 'Too many boxes opened', count: recentActions.count });
    return true;
  }
  
  return false;
}

