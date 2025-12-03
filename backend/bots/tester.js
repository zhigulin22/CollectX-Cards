// Bot Tester System - Automated testing with random actions
import { run, get, all, genId } from '../db/database.js';

const BOT_ACTIONS = [
  'AUTH', 'VIEW_COLLECTIONS', 'VIEW_COLLECTION', 'VIEW_INVENTORY',
  'OPEN_FREE_BOX', 'OPEN_PAID_BOX', 'VIEW_CARD', 'FILTER_CARDS'
];

const API_BASE = 'http://localhost:3001/api';

class BotTester {
  constructor(botId, telegramId) {
    this.botId = botId;
    this.telegramId = telegramId;
    this.userId = null;
    this.errors = [];
    this.actions = 0;
    this.successfulActions = 0;
  }

  async init() {
    const result = await this.api('/users/auth', 'POST', {
      telegramId: this.telegramId,
      username: `bot_${this.botId}`
    });
    
    if (result.user) {
      this.userId = result.user.id;
      console.log(`🤖 Bot ${this.botId} initialized (user: ${this.userId})`);
      return true;
    }
    
    this.logError('AUTH', 'Failed to initialize');
    return false;
  }

  async performRandomAction() {
    const action = BOT_ACTIONS[Math.floor(Math.random() * BOT_ACTIONS.length)];
    this.actions++;
    
    try {
      let result;
      
      switch (action) {
        case 'AUTH':
          result = await this.api('/users/auth', 'POST', {
            telegramId: this.telegramId,
            username: `bot_${this.botId}`
          });
          this.validate(result, 'user', action);
          break;
          
        case 'VIEW_COLLECTIONS':
          result = await this.api('/collections');
          this.validateArray(result, action);
          break;
          
        case 'VIEW_COLLECTION':
          const cols = await this.api('/collections');
          if (cols.length > 0) {
            const col = cols[Math.floor(Math.random() * cols.length)];
            result = await this.api(`/collections/${col.id}`);
            this.validate(result, 'id', action);
          }
          break;
          
        case 'VIEW_INVENTORY':
          result = await this.api(`/users/${this.userId}/inventory`);
          this.validateArray(result, action);
          break;
          
        case 'OPEN_FREE_BOX':
          const freeStatus = await this.api(`/users/${this.userId}/free-box`);
          if (freeStatus.available) {
            const boxes = await this.api('/boxes');
            const freeBox = boxes.find(b => b.price === 0);
            if (freeBox) {
              result = await this.api(`/boxes/${freeBox.id}/open`, 'POST', {
                userId: this.userId, isFree: true
              });
              this.validate(result, 'success', action);
            }
          }
          break;
          
        case 'OPEN_PAID_BOX':
          const user = await this.api(`/users/${this.userId}`);
          if (user.user?.coins >= 50) {
            const boxes = await this.api('/boxes');
            const paidBox = boxes.find(b => b.price > 0 && b.price <= user.user.coins);
            if (paidBox) {
              result = await this.api(`/boxes/${paidBox.id}/open`, 'POST', {
                userId: this.userId, isFree: false
              });
              this.validate(result, 'success', action);
            }
          }
          break;
          
        case 'VIEW_CARD':
          const inv = await this.api(`/users/${this.userId}/inventory`);
          if (inv.length > 0) {
            const card = inv[Math.floor(Math.random() * inv.length)];
            result = await this.api(`/cards/${card.card_id || card.id}`);
            this.validate(result, 'id', action);
          }
          break;
          
        case 'FILTER_CARDS':
          const rarities = ['common', 'rare', 'epic', 'legendary'];
          const rarity = rarities[Math.floor(Math.random() * rarities.length)];
          result = await this.api(`/users/${this.userId}/inventory?rarity=${rarity}`);
          this.validateArray(result, action);
          break;
      }
      
      this.successfulActions++;
      return { action, success: true };
    } catch (e) {
      this.logError(action, e.message);
      return { action, success: false, error: e.message };
    }
  }

  async api(endpoint, method = 'GET', body = null) {
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) opts.body = JSON.stringify(body);
    
    const response = await fetch(API_BASE + endpoint, opts);
    return response.json();
  }

  validate(result, field, action) {
    if (!result || result.error) {
      throw new Error(`${action}: ${result?.error || 'No result'}`);
    }
    if (field && !result[field]) {
      throw new Error(`${action}: Missing field '${field}'`);
    }
  }

  validateArray(result, action) {
    if (!Array.isArray(result)) {
      throw new Error(`${action}: Expected array, got ${typeof result}`);
    }
  }

  logError(action, message) {
    this.errors.push({ action, message, time: new Date().toISOString() });
    console.error(`❌ Bot ${this.botId} - ${action}: ${message}`);
  }

  getReport() {
    return {
      botId: this.botId,
      userId: this.userId,
      totalActions: this.actions,
      successfulActions: this.successfulActions,
      errorRate: this.actions > 0 ? ((this.actions - this.successfulActions) / this.actions * 100).toFixed(2) + '%' : '0%',
      errors: this.errors
    };
  }
}

// Run multiple bots
export async function runBotTests(numBots = 5, actionsPerBot = 20) {
  console.log(`\n🚀 Starting bot tests: ${numBots} bots, ${actionsPerBot} actions each\n`);
  
  const bots = [];
  const startTime = Date.now();
  
  // Initialize bots
  for (let i = 0; i < numBots; i++) {
    const bot = new BotTester(i + 1, 200000001 + i);
    await bot.init();
    bots.push(bot);
  }
  
  // Run actions in parallel
  const actionPromises = [];
  for (const bot of bots) {
    for (let i = 0; i < actionsPerBot; i++) {
      actionPromises.push(
        new Promise(resolve => {
          setTimeout(async () => {
            const result = await bot.performRandomAction();
            resolve(result);
          }, Math.random() * 1000); // Random delay up to 1 second
        })
      );
    }
  }
  
  await Promise.all(actionPromises);
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  
  // Generate report
  console.log('\n' + '═'.repeat(50));
  console.log('📊 BOT TEST REPORT');
  console.log('═'.repeat(50));
  console.log(`Duration: ${duration}s`);
  console.log(`Total bots: ${numBots}`);
  console.log(`Actions per bot: ${actionsPerBot}`);
  console.log('');
  
  let totalErrors = 0;
  for (const bot of bots) {
    const report = bot.getReport();
    totalErrors += report.errors.length;
    console.log(`Bot ${report.botId}: ${report.successfulActions}/${report.totalActions} successful (${report.errorRate} errors)`);
  }
  
  console.log('');
  console.log(`Total errors: ${totalErrors}`);
  console.log('═'.repeat(50) + '\n');
  
  return bots.map(b => b.getReport());
}

export { BotTester };

