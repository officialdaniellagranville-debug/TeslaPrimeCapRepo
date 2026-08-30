const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function backfillWallets() {
  // Find users who don't have a demo wallet
  const users = await prisma.user.findMany({
    select: { id: true },
    where: { deletedAt: null },
  });

  let created = 0;
  for (const user of users) {
    const existing = await prisma.wallet.findFirst({
      where: { userId: user.id, type: 'demo' },
    });
    if (!existing) {
      await prisma.wallet.create({
        data: { userId: user.id, type: 'demo', balance: 0, availableBalance: 0, lockedBalance: 0 },
      });
      created++;
    }
    // Also check for live wallet
    const liveExists = await prisma.wallet.findFirst({
      where: { userId: user.id, type: 'live' },
    });
    if (!liveExists) {
      await prisma.wallet.create({
        data: { userId: user.id, type: 'live', balance: 0, availableBalance: 0, lockedBalance: 0 },
      });
      created++;
    }
  }
  console.log(`Backfilled ${created} wallets across ${users.length} users`);
  await prisma.$disconnect();
}

backfillWallets().catch(console.error);
