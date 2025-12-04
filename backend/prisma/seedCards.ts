import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

// ============ COLLECTIONS ============
const COLLECTIONS = [
  { 
    name: 'Crypto Legends', 
    icon: '🚀', 
    description: 'Legendary figures of the crypto world',
    sortOrder: 1
  },
  { 
    name: 'DeFi Heroes', 
    icon: '🦸', 
    description: 'Champions of decentralized finance',
    sortOrder: 2
  },
  { 
    name: 'NFT Icons', 
    icon: '🎨', 
    description: 'Famous NFT artworks and collections',
    sortOrder: 3
  },
  { 
    name: 'Meme Coins', 
    icon: '🐕', 
    description: 'The most viral meme tokens',
    sortOrder: 4
  },
];

// ============ CARD TEMPLATES ============
const CARDS = {
  'Crypto Legends': [
    { name: 'Satoshi Nakamoto', emoji: '👤', rarity: 'LEGENDARY', sellUsdt: 50, sellX: 5000, description: 'The mysterious creator of Bitcoin' },
    { name: 'Vitalik Buterin', emoji: '🦄', rarity: 'LEGENDARY', sellUsdt: 40, sellX: 4000, description: 'Ethereum co-founder and visionary' },
    { name: 'CZ', emoji: '🔶', rarity: 'EPIC', sellUsdt: 15, sellX: 1500, description: 'Binance founder' },
    { name: 'Do Kwon', emoji: '🌙', rarity: 'RARE', sellUsdt: 5, sellX: 500, description: 'The fallen Luna king' },
    { name: 'Elon Musk', emoji: '🚀', rarity: 'EPIC', sellUsdt: 20, sellX: 2000, description: 'The Doge Father' },
  ],
  'DeFi Heroes': [
    { name: 'Yield Farmer', emoji: '🌾', rarity: 'COMMON', sellUsdt: 1, sellX: 100, description: 'Master of APY hunting' },
    { name: 'Liquidity Whale', emoji: '🐋', rarity: 'RARE', sellUsdt: 5, sellX: 500, description: 'Provider of deep liquidity' },
    { name: 'Flash Loan Master', emoji: '⚡', rarity: 'EPIC', sellUsdt: 15, sellX: 1500, description: 'Arbitrage in one block' },
    { name: 'Governance King', emoji: '👑', rarity: 'LEGENDARY', sellUsdt: 35, sellX: 3500, description: 'Controls the DAOs' },
  ],
  'NFT Icons': [
    { name: 'Bored Ape', emoji: '🦍', rarity: 'LEGENDARY', sellUsdt: 45, sellX: 4500, description: 'The most exclusive club in crypto' },
    { name: 'CryptoPunk', emoji: '👾', rarity: 'EPIC', sellUsdt: 20, sellX: 2000, description: 'OG pixel art NFT' },
    { name: 'Doodle', emoji: '🌈', rarity: 'RARE', sellUsdt: 8, sellX: 800, description: 'Colorful community art' },
    { name: 'Azuki', emoji: '⛩️', rarity: 'EPIC', sellUsdt: 18, sellX: 1800, description: 'Anime style NFT' },
  ],
  'Meme Coins': [
    { name: 'Doge', emoji: '🐕', rarity: 'RARE', sellUsdt: 3, sellX: 300, description: 'Much wow, very coin' },
    { name: 'Shiba Inu', emoji: '🐕‍🦺', rarity: 'RARE', sellUsdt: 3, sellX: 300, description: 'The Doge killer' },
    { name: 'Pepe', emoji: '🐸', rarity: 'EPIC', sellUsdt: 10, sellX: 1000, description: 'Feels good man' },
    { name: 'Wojak', emoji: '😢', rarity: 'COMMON', sellUsdt: 1, sellX: 100, description: 'The feel guy' },
    { name: 'Moon Rocket', emoji: '🚀', rarity: 'COMMON', sellUsdt: 1, sellX: 100, description: 'To the moon!' },
    { name: 'Diamond Hands', emoji: '💎', rarity: 'RARE', sellUsdt: 5, sellX: 500, description: 'Never selling' },
  ],
};

// ============ PACKS ============
const PACKS = [
  {
    name: 'Daily Pack',
    description: 'Free pack every 24 hours',
    icon: '🎁',
    cardsCount: 3,
    cooldownSeconds: 86400, // 24 hours
    gradient: 'from-emerald-500 to-teal-600',
    sortOrder: 1,
  },
  {
    name: 'Starter Pack',
    description: '5 cards with 1 guaranteed rare',
    icon: '📦',
    priceUsdt: 2,
    priceX: 200,
    cardsCount: 5,
    guaranteedRarity: 'RARE',
    gradient: 'from-blue-500 to-cyan-600',
    sortOrder: 2,
  },
  {
    name: 'Premium Pack',
    description: '5 cards with 1 guaranteed epic',
    icon: '💎',
    priceUsdt: 10,
    priceX: 1000,
    cardsCount: 5,
    guaranteedRarity: 'EPIC',
    gradient: 'from-purple-500 to-violet-600',
    sortOrder: 3,
  },
  {
    name: 'Legendary Pack',
    description: '5 cards with 1 guaranteed legendary!',
    icon: '👑',
    priceUsdt: 50,
    priceX: 5000,
    cardsCount: 5,
    guaranteedRarity: 'LEGENDARY',
    gradient: 'from-amber-500 to-orange-600',
    sortOrder: 4,
  },
];

async function main() {
  console.log('🎴 Seeding cards data...\n');

  // Clear existing card data
  console.log('🗑️  Clearing existing card data...');
  await db.packOpening.deleteMany();
  await db.userCard.deleteMany();
  await db.cardTemplate.deleteMany();
  await db.cardPack.deleteMany();
  await db.cardCollection.deleteMany();

  // Create collections
  console.log('📁 Creating collections...');
  const collectionMap: Record<string, string> = {};
  
  for (const col of COLLECTIONS) {
    const created = await db.cardCollection.create({
      data: col,
    });
    collectionMap[col.name] = created.id;
    console.log(`   ✓ ${col.name}`);
  }

  // Create card templates
  console.log('\n🃏 Creating card templates...');
  let totalCards = 0;
  
  for (const [collectionName, cards] of Object.entries(CARDS)) {
    const collectionId = collectionMap[collectionName];
    
    for (const card of cards) {
      await db.cardTemplate.create({
        data: {
          collectionId,
          name: card.name,
          emoji: card.emoji,
          description: card.description,
          rarity: card.rarity as any,
          sellPriceUsdt: card.sellUsdt,
          sellPriceX: card.sellX,
          dropWeight: card.rarity === 'LEGENDARY' ? 3 : card.rarity === 'EPIC' ? 12 : card.rarity === 'RARE' ? 25 : 60,
        },
      });
      totalCards++;
    }
    console.log(`   ✓ ${collectionName}: ${cards.length} cards`);
  }

  // Create packs
  console.log('\n📦 Creating packs...');
  for (const pack of PACKS) {
    await db.cardPack.create({
      data: {
        name: pack.name,
        description: pack.description,
        icon: pack.icon,
        priceUsdt: pack.priceUsdt || null,
        priceX: pack.priceX || null,
        cardsCount: pack.cardsCount,
        guaranteedRarity: pack.guaranteedRarity as any || null,
        cooldownSeconds: pack.cooldownSeconds || null,
        gradient: pack.gradient,
        sortOrder: pack.sortOrder,
      },
    });
    console.log(`   ✓ ${pack.name}`);
  }

  // Summary
  console.log('\n═══════════════════════════════════════════');
  console.log('✅ CARDS SEED COMPLETE!');
  console.log('═══════════════════════════════════════════');
  console.log(`   📁 Collections: ${COLLECTIONS.length}`);
  console.log(`   🃏 Card Templates: ${totalCards}`);
  console.log(`   📦 Packs: ${PACKS.length}`);
  console.log('═══════════════════════════════════════════\n');
}

main()
  .catch((e) => {
    console.error('❌ Cards seed failed:', e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());

