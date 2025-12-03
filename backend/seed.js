// Production Seed Script
import { initDB, run, get, all, genId } from './db/database.js';

async function seed() {
  await initDB();
  console.log('\n🌱 Seeding production database...\n');
  
  // Clear all data
  run('DELETE FROM action_logs');
  run('DELETE FROM rate_limits');
  run('DELETE FROM inventory');
  run('DELETE FROM cards');
  run('DELETE FROM collections');
  run('DELETE FROM boxes');
  run('DELETE FROM users');
  
  // === COLLECTIONS ===
  const collections = [
    { 
      name: 'Bored Ape Yacht Club', symbol: 'BAYC', 
      desc: 'The legendary collection of 10,000 unique Bored Apes', 
      floor: 500 
    },
    { 
      name: 'Azuki', symbol: 'AZUKI', 
      desc: 'Anime-inspired avatars taking the metaverse by storm', 
      floor: 350 
    },
    { 
      name: 'Pudgy Penguins', symbol: 'PPG', 
      desc: 'Adorable penguins spreading good vibes on the blockchain', 
      floor: 200 
    },
    { 
      name: 'Doodles', symbol: 'DOODLE', 
      desc: 'Colorful hand-drawn collectibles by Burnt Toast', 
      floor: 300 
    },
    { 
      name: 'CryptoPunks', symbol: 'PUNK', 
      desc: 'The OG NFT collection that started it all', 
      floor: 1000 
    },
  ];
  
  const cardTemplates = {
    BAYC: ['Golden Fur', 'Zombie Eyes', 'Laser Eyes', 'Rainbow Fur', 'Solid Gold', 'Trippy Ape'],
    AZUKI: ['Spirit', 'Blue Flame', 'Red Dragon', 'Golden Samurai', 'Cyber Ronin', 'Ghost'],
    PPG: ['Emperor', 'Pirate', 'Astronaut', 'King', 'Wizard', 'Robot'],
    DOODLE: ['Rainbow', 'Alien', 'Skeleton', 'Gold Chain', 'Holographic', 'Gradient'],
    PUNK: ['Alien', 'Ape', 'Zombie', 'Hoodie', 'Pilot', 'Gold']
  };
  
  const rarityDistribution = ['common', 'common', 'rare', 'rare', 'epic', 'legendary'];
  const baseValues = { common: 10, rare: 25, epic: 75, legendary: 250 };
  
  for (const col of collections) {
    const colId = genId();
    run(`INSERT INTO collections (id, name, symbol, description, floor_price, total_cards) 
         VALUES (?, ?, ?, ?, ?, ?)`,
      [colId, col.name, col.symbol, col.desc, col.floor, 6]);
    
    const templates = cardTemplates[col.symbol] || [];
    templates.forEach((name, i) => {
      const rarity = rarityDistribution[i];
      const cardId = `${colId}-${i + 1000 + Math.floor(Math.random() * 9000)}`;
      run(`INSERT INTO cards (id, collection_id, name, description, rarity, total_supply, base_value)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [genId(), colId, `${col.symbol} #${1000 + Math.floor(Math.random() * 9000)} - ${name}`, 
         `A unique ${name} from the ${col.name} collection`, rarity,
         rarity === 'legendary' ? 50 : rarity === 'epic' ? 200 : 0, baseValues[rarity]]);
    });
    
    console.log(`✅ Created ${col.name} with 6 cards`);
  }
  
  // === BOXES ===
  const boxes = [
    { 
      name: 'Free Daily Pack', 
      desc: 'Open once every 24 hours - your daily dose of NFTs!', 
      price: 0, cards: 1, 
      weights: { common: 75, rare: 18, epic: 5, legendary: 2 }
    },
    { 
      name: 'Starter Pack', 
      desc: '3 random NFTs to kickstart your collection', 
      price: 50, cards: 3, 
      weights: { common: 65, rare: 25, epic: 8, legendary: 2 }
    },
    { 
      name: 'Collector Pack', 
      desc: '5 NFTs with improved odds for rare finds', 
      price: 150, cards: 5, 
      weights: { common: 50, rare: 30, epic: 15, legendary: 5 }
    },
    { 
      name: 'Premium Pack', 
      desc: 'High-value pack with guaranteed rare or better!', 
      price: 400, cards: 4, 
      weights: { common: 20, rare: 40, epic: 30, legendary: 10 }
    },
    { 
      name: 'Legendary Chest', 
      desc: 'The ultimate pack - significantly higher legendary odds!', 
      price: 1000, cards: 5, 
      weights: { common: 0, rare: 30, epic: 45, legendary: 25 }
    },
  ];
  
  for (const box of boxes) {
    run(`INSERT INTO boxes (id, name, description, price, cards_count, rarity_weights) 
         VALUES (?, ?, ?, ?, ?, ?)`,
      [genId(), box.name, box.desc, box.price, box.cards, JSON.stringify(box.weights)]);
  }
  console.log(`✅ Created ${boxes.length} box types`);
  
  // === ADMIN USER ===
  const adminId = genId();
  run(`INSERT INTO users (id, telegram_id, username, coins, xp, rank, is_admin) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [adminId, 123456789, 'admin', 50000, 10000, 'diamond', 1]);
  
  // Give admin some cards
  const allCards = all('SELECT id FROM cards ORDER BY RANDOM() LIMIT 10');
  allCards.forEach((card, i) => {
    run(`INSERT INTO inventory (id, user_id, card_id, serial_number, obtained_from) 
         VALUES (?, ?, ?, ?, ?)`,
      [genId(), adminId, card.id, i + 1, 'seed']);
    run('UPDATE cards SET minted_count = minted_count + 1 WHERE id = ?', [card.id]);
  });
  
  console.log(`✅ Admin created (telegram_id: 123456789)`);
  
  // === TEST USERS ===
  const testUsers = [
    { name: 'alice', xp: 50, coins: 300, rank: 'bronze' },
    { name: 'bob', xp: 150, coins: 500, rank: 'silver' },
    { name: 'carol', xp: 600, coins: 800, rank: 'gold' },
    { name: 'dave', xp: 2000, coins: 1500, rank: 'platinum' },
    { name: 'eve', xp: 6000, coins: 3000, rank: 'diamond' },
  ];
  
  for (let i = 0; i < testUsers.length; i++) {
    const u = testUsers[i];
    run(`INSERT INTO users (id, telegram_id, username, coins, xp, rank, is_admin) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [genId(), 100000001 + i, `tester_${u.name}`, u.coins, u.xp, u.rank, 0]);
  }
  console.log(`✅ Created ${testUsers.length} test users`);
  
  // === BOT TESTERS ===
  for (let i = 0; i < 10; i++) {
    run(`INSERT INTO users (id, telegram_id, username, coins, xp, rank, is_bot) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [genId(), 200000001 + i, `bot_tester_${i + 1}`, 1000, 0, 'bronze', 1]);
  }
  console.log(`✅ Created 10 bot testers`);
  
  // Summary
  console.log('\n' + '═'.repeat(50));
  console.log('📊 SEED COMPLETE');
  console.log('═'.repeat(50));
  console.log(`  📚 ${collections.length} collections`);
  console.log(`  🎴 ${collections.length * 6} cards`);
  console.log(`  📦 ${boxes.length} box types`);
  console.log(`  👑 1 admin`);
  console.log(`  👥 ${testUsers.length} test users`);
  console.log(`  🤖 10 bot testers`);
  console.log('═'.repeat(50));
  console.log('\n🚀 Ready to launch!\n');
}

seed().catch(console.error);
