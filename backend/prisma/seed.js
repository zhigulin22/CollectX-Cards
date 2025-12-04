import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();
async function main() {
    console.log('🌱 Seeding...');
    // Settings
    await db.settings.upsert({
        where: { key: 'swap_fee_percent' },
        update: { value: '2' },
        create: { key: 'swap_fee_percent', value: '2' },
    });
    await db.settings.upsert({
        where: { key: 'usdt_to_x_rate' },
        update: { value: '100' },
        create: { key: 'usdt_to_x_rate', value: '100' },
    });
    // Dev user with test balance
    const devUser = await db.user.upsert({
        where: { telegramId: BigInt(123456789) },
        update: {},
        create: {
            telegramId: BigInt(123456789),
            username: 'test_user',
            firstName: 'Test',
            wallet: {
                create: {
                    balanceUsdt: 100, // 100 USDT
                    balanceX: 500, // 500 $X
                },
            },
        },
        include: { wallet: true },
    });
    console.log('✅ Dev user:', devUser.id);
    // Test transaction history
    if (devUser.wallet) {
        await db.transaction.createMany({
            data: [
                {
                    walletId: devUser.wallet.id,
                    type: 'deposit',
                    currency: 'USDT',
                    amount: 100,
                    balanceAfter: 100,
                    description: 'Initial deposit',
                },
                {
                    walletId: devUser.wallet.id,
                    type: 'swap',
                    currency: 'USDT',
                    amount: -50,
                    balanceAfter: 50,
                    fee: 1,
                    description: 'Swap 50 USDT → 4900 $X',
                },
                {
                    walletId: devUser.wallet.id,
                    type: 'swap',
                    currency: 'X',
                    amount: 4900,
                    balanceAfter: 4900,
                    description: 'Swap 50 USDT → 4900 $X',
                },
            ],
        });
        console.log('✅ Test transactions created');
    }
    console.log('🎉 Done!');
}
main()
    .catch(console.error)
    .finally(() => db.$disconnect());
