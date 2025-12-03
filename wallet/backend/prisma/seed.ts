import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

// ============ TEST DATA CONFIG ============

const TEST_USERS_COUNT = 30;

// Realistic Telegram usernames
const USERNAMES = [
  'alex_crypto', 'maria_trade', 'john_invest', 'emma_wallet', 'david_hodl',
  'sofia_defi', 'mike_btc', 'anna_ton', 'chris_web3', 'lisa_nft',
  'tom_trader', 'kate_swap', 'james_earn', 'olivia_stake', 'ryan_yield',
  'sarah_farm', 'nick_moon', 'julia_gem', 'max_alpha', 'emily_beta',
  'dan_whale', 'amy_diamond', 'paul_rocket', 'nina_star', 'leo_fire',
  'mia_gold', 'sam_silver', 'zoe_platinum', 'ben_legend', 'ivy_elite',
];

const FIRST_NAMES = [
  'Alex', 'Maria', 'John', 'Emma', 'David',
  'Sofia', 'Mike', 'Anna', 'Chris', 'Lisa',
  'Tom', 'Kate', 'James', 'Olivia', 'Ryan',
  'Sarah', 'Nick', 'Julia', 'Max', 'Emily',
  'Dan', 'Amy', 'Paul', 'Nina', 'Leo',
  'Mia', 'Sam', 'Zoe', 'Ben', 'Ivy',
];

// Default settings
const DEFAULT_SETTINGS = [
  { key: 'swap_fee_percent', value: '2' },
  { key: 'usdt_to_x_rate', value: '100' },
  { key: 'min_swap_usdt', value: '0.1' },
  { key: 'min_send_x', value: '1' },
  { key: 'send_fee_x', value: '0.5' },     // 0.5 $X fee (~$0.005)
  { key: 'min_withdraw_usdt', value: '5' },
  { key: 'max_withdraw_usdt', value: '10000' },
  { key: 'withdraw_fee_usdt', value: '1' },
];

// ============ HELPERS ============

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDecimal(min: number, max: number, decimals: number = 2): number {
  const value = Math.random() * (max - min) + min;
  return parseFloat(value.toFixed(decimals));
}

function randomDate(daysAgo: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - randomBetween(0, daysAgo));
  date.setHours(randomBetween(0, 23), randomBetween(0, 59), randomBetween(0, 59));
  return date;
}

function generateTonAddress(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';
  let address = Math.random() > 0.5 ? 'EQ' : 'UQ';
  for (let i = 0; i < 46; i++) {
    address += chars[Math.floor(Math.random() * chars.length)];
  }
  return address;
}

function generateTonTxHash(): string {
  // TON transaction hash format: 64 hex characters
  const hexChars = '0123456789abcdef';
  let hash = '';
  for (let i = 0; i < 64; i++) {
    hash += hexChars[Math.floor(Math.random() * hexChars.length)];
  }
  return hash;
}

// ============ MAIN SEED ============

async function main() {
  console.log('🌱 Starting seed...\n');

  // 1. Clear existing data
  console.log('🗑️  Clearing existing data...');
  await db.auditLog.deleteMany();
  await db.withdrawRequest.deleteMany();
  await db.transaction.deleteMany();
  await db.wallet.deleteMany();
  await db.user.deleteMany();
  await db.settings.deleteMany();

  // 2. Create settings
  console.log('⚙️  Creating settings...');
  for (const setting of DEFAULT_SETTINGS) {
    await db.settings.create({ data: setting });
  }

  // 3. Create users with wallets
  console.log(`👥 Creating ${TEST_USERS_COUNT} test users...`);
  
  const users: Array<{ id: string; walletId: string; telegramId: bigint }> = [];
  
  for (let i = 0; i < TEST_USERS_COUNT; i++) {
    const telegramId = BigInt(100000000 + i);
    const balanceUsdt = randomDecimal(0, 500, 2);
    const balanceX = randomDecimal(0, 5000, 0);
    
    const user = await db.user.create({
      data: {
        telegramId,
        username: USERNAMES[i],
        firstName: FIRST_NAMES[i],
        createdAt: randomDate(60), // Registered within last 60 days
        wallet: {
          create: {
            balanceUsdt,
            balanceX,
          },
        },
      },
      include: { wallet: true },
    });
    
    users.push({
      id: user.id,
      walletId: user.wallet!.id,
      telegramId: user.telegramId,
    });
    
    process.stdout.write(`\r   Created user ${i + 1}/${TEST_USERS_COUNT}`);
  }
  console.log('\n');

  // 4. Create transactions
  console.log('💰 Creating transactions...');
  
  let txCount = 0;
  
  for (const user of users) {
    // Each user gets 3-10 transactions
    const txNum = randomBetween(3, 10);
    
    for (let t = 0; t < txNum; t++) {
      const txType = ['deposit', 'swap', 'send', 'receive', 'withdraw'][randomBetween(0, 4)];
      const createdAt = randomDate(30);
      
      switch (txType) {
        case 'deposit':
          await db.transaction.create({
            data: {
              walletId: user.walletId,
              type: 'deposit',
              currency: 'USDT',
              amount: randomDecimal(10, 200, 2),
              balanceAfter: randomDecimal(50, 500, 2),
              description: `Deposit from ${generateTonAddress().slice(0, 8)}...`,
              createdAt,
            },
          });
          break;
          
        case 'swap':
          const direction = Math.random() > 0.5;
          if (direction) {
            // USDT → $X
            const swapAmount = randomDecimal(5, 100, 2);
            const fee = swapAmount * 0.02;
            const received = (swapAmount - fee) * 100;
            
            await db.transaction.create({
              data: {
                walletId: user.walletId,
                type: 'swap',
                currency: 'USDT',
                amount: -swapAmount,
                balanceAfter: randomDecimal(0, 400, 2),
                fee,
                description: `Swap ${swapAmount} USDT → ${received.toFixed(0)} $X`,
                createdAt,
              },
            });
            
            await db.transaction.create({
              data: {
                walletId: user.walletId,
                type: 'swap',
                currency: 'X',
                amount: received,
                balanceAfter: randomDecimal(100, 5000, 0),
                description: `Swap ${swapAmount} USDT → ${received.toFixed(0)} $X`,
                createdAt,
              },
            });
          } else {
            // $X → USDT
            const xAmount = randomDecimal(100, 1000, 0);
            const usdtAmount = xAmount / 100;
            const fee = usdtAmount * 0.02;
            
            await db.transaction.create({
              data: {
                walletId: user.walletId,
                type: 'swap',
                currency: 'X',
                amount: -xAmount,
                balanceAfter: randomDecimal(0, 4000, 0),
                description: `Swap ${xAmount} $X → ${(usdtAmount - fee).toFixed(2)} USDT`,
                createdAt,
              },
            });
            
            await db.transaction.create({
              data: {
                walletId: user.walletId,
                type: 'swap',
                currency: 'USDT',
                amount: usdtAmount - fee,
                balanceAfter: randomDecimal(50, 500, 2),
                fee,
                description: `Swap ${xAmount} $X → ${(usdtAmount - fee).toFixed(2)} USDT`,
                createdAt,
              },
            });
          }
          break;
          
        case 'send':
          const recipient = users[randomBetween(0, users.length - 1)];
          if (recipient.id !== user.id) {
            const sendAmount = randomDecimal(10, 500, 0);
            
            await db.transaction.create({
              data: {
                walletId: user.walletId,
                type: 'send',
                currency: 'X',
                amount: -sendAmount,
                balanceAfter: randomDecimal(0, 4000, 0),
                relatedUserId: recipient.id,
                description: 'Sent $X',
                createdAt,
              },
            });
            
            // Create receive transaction for recipient
            await db.transaction.create({
              data: {
                walletId: recipient.walletId,
                type: 'receive',
                currency: 'X',
                amount: sendAmount,
                balanceAfter: randomDecimal(100, 5000, 0),
                relatedUserId: user.id,
                description: 'Received $X',
                createdAt,
              },
            });
          }
          break;
          
        case 'withdraw':
          const withdrawAmount = randomDecimal(10, 100, 2);
          const withdrawFee = 1;
          
          await db.transaction.create({
            data: {
              walletId: user.walletId,
              type: 'withdraw',
              currency: 'USDT',
              amount: -withdrawAmount,
              balanceAfter: randomDecimal(0, 400, 2),
              fee: withdrawFee,
              description: `Withdraw to ${generateTonAddress().slice(0, 8)}...`,
              createdAt,
            },
          });
          break;
      }
      
      txCount++;
    }
    
    process.stdout.write(`\r   Created ${txCount} transactions...`);
  }
  console.log('\n');

  // 5. Create withdraw requests (some pending for admin to review)
  console.log('💸 Creating withdraw requests...');
  
  const statuses = ['PENDING', 'PENDING', 'PENDING', 'PROCESSING', 'COMPLETED', 'COMPLETED', 'FAILED'];
  
  for (let i = 0; i < 15; i++) {
    const user = users[randomBetween(0, users.length - 1)];
    const amount = randomDecimal(10, 200, 2);
    const fee = 1;
    const status = statuses[randomBetween(0, statuses.length - 1)] as any;
    
    await db.withdrawRequest.create({
      data: {
        userId: user.id,
        amount,
        fee,
        netAmount: amount - fee,
        toAddress: generateTonAddress(),
        status,
        txHash: status === 'COMPLETED' ? generateTonTxHash() : null,
        failReason: status === 'FAILED' ? 'Invalid address' : null,
        createdAt: randomDate(14),
        processedAt: ['COMPLETED', 'FAILED'].includes(status) ? randomDate(7) : null,
      },
    });
  }
  console.log('   Created 15 withdraw requests (including pending ones)\n');

  // 6. Create audit log entries
  console.log('📋 Creating audit log entries...');
  
  const auditActions = [
    { action: 'USER_VIEW', targetType: 'user' },
    { action: 'BALANCE_ADJUST', targetType: 'user' },
    { action: 'WITHDRAW_APPROVE', targetType: 'withdraw' },
    { action: 'WITHDRAW_REJECT', targetType: 'withdraw' },
    { action: 'SETTINGS_UPDATE', targetType: 'settings' },
  ];
  
  for (let i = 0; i < 20; i++) {
    const action = auditActions[randomBetween(0, auditActions.length - 1)];
    const targetUser = users[randomBetween(0, users.length - 1)];
    
    await db.auditLog.create({
      data: {
        actor: 'admin',
        action: action.action,
        targetType: action.targetType,
        targetId: targetUser.id,
        details: JSON.stringify({
          reason: 'Test action',
          amount: action.action === 'BALANCE_ADJUST' ? randomDecimal(10, 100, 2) : undefined,
        }),
        ipAddress: '127.0.0.1',
        createdAt: randomDate(14),
      },
    });
  }
  console.log('   Created 20 audit log entries\n');

  // 7. Summary
  const stats = await Promise.all([
    db.user.count(),
    db.wallet.count(),
    db.transaction.count(),
    db.withdrawRequest.count(),
    db.withdrawRequest.count({ where: { status: 'PENDING' } }),
    db.auditLog.count(),
  ]);

  console.log('═══════════════════════════════════════════');
  console.log('✅ SEED COMPLETE!');
  console.log('═══════════════════════════════════════════');
  console.log(`   👥 Users:              ${stats[0]}`);
  console.log(`   💰 Wallets:            ${stats[1]}`);
  console.log(`   📊 Transactions:       ${stats[2]}`);
  console.log(`   💸 Withdraw Requests:  ${stats[3]} (${stats[4]} pending)`);
  console.log(`   📋 Audit Logs:         ${stats[5]}`);
  console.log('═══════════════════════════════════════════\n');
  
  console.log('🔑 Test Admin Key: Check your .env ADMIN_API_KEY');
  console.log('🌐 Admin Panel:    http://localhost:3000/admin');
  console.log('📖 API Docs:       http://localhost:3001/docs\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
