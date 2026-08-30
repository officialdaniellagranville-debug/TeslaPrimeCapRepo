// One-off script to migrate existing admin emails to new TeslaPrime branding
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Update admin@tesla.com -> admin@teslaprime.com
  const a1 = await prisma.user.updateMany({
    where: { email: 'admin@tesla.com' },
    data: { email: 'admin@teslaprime.com' },
  });
  console.log('Updated admin@tesla.com ->', a1.count, 'rows');

  // Update deyoungsltd@gmail.com -> teslaequit.support@gmail.com
  const a2 = await prisma.user.updateMany({
    where: { email: 'deyoungsltd@gmail.com' },
    data: { email: 'teslaequit.support@gmail.com' },
  });
  console.log('Updated deyoungsltd@gmail.com ->', a2.count, 'rows');

  // Now run the seed again to fill any gaps
  const bcrypt = require('bcryptjs');
  const hash = await bcrypt.hash('Admin@123', 12);

  // Ensure admin@teslaprime.com exists with correct password
  const admin = await prisma.user.upsert({
    where: { email: 'admin@teslaprime.com' },
    update: { passwordHash: hash, status: 'active', emailVerified: true, activeMode: 'live' },
    create: {
      email: 'admin@teslaprime.com',
      passwordHash: hash,
      status: 'active',
      emailVerified: true,
      referralCode: 'ADMIN001',
      activeMode: 'live',
    },
  });
  console.log('Admin user ready:', admin.email);

  // Ensure teslaequit.support@gmail.com exists with correct password
  const support = await prisma.user.upsert({
    where: { email: 'teslaequit.support@gmail.com' },
    update: { passwordHash: hash, status: 'active', emailVerified: true, activeMode: 'live' },
    create: {
      email: 'teslaequit.support@gmail.com',
      passwordHash: hash,
      status: 'active',
      emailVerified: true,
      referralCode: 'DYADMIN01',
      activeMode: 'live',
    },
  });
  console.log('Support admin user ready:', support.email);

  // Ensure both have profiles
  for (const u of [admin, support]) {
    await prisma.profile.upsert({
      where: { userId: u.id },
      update: {},
      create: { userId: u.id, firstName: 'Admin', lastName: 'TeslaPrime' },
    });
    await prisma.admin.upsert({
      where: { userId: u.id },
      update: {},
      create: { userId: u.id, role: 'SUPER_ADMIN', isSuperAdmin: true },
    });
    await prisma.wallet.upsert({
      where: { userId_type: { userId: u.id, type: 'demo' } },
      update: {},
      create: { userId: u.id, type: 'demo', balance: 0, availableBalance: 0, lockedBalance: 0 },
    });
    await prisma.wallet.upsert({
      where: { userId_type: { userId: u.id, type: 'live' } },
      update: {},
      create: { userId: u.id, type: 'live', balance: 0, availableBalance: 0, lockedBalance: 0 },
    });
  }

  // Site settings
  await prisma.siteSettings.upsert({
    where: { id: 'main' },
    update: {},
    create: { id: 'main' },
  });

  // Payment addresses (only if none exist)
  const existingAddresses = await prisma.paymentAddress.count();
  if (existingAddresses === 0) {
    await prisma.paymentAddress.createMany({
      data: [
        { label: 'Main Bitcoin Wallet', currency: 'BTC', network: 'Bitcoin', address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh', isActive: true, sortOrder: 0 },
        { label: 'Main Ethereum Wallet', currency: 'ETH', network: 'ERC-20', address: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F', isActive: true, sortOrder: 1 },
        { label: 'USDT (TRC-20)', currency: 'USDT', network: 'TRC-20', address: 'TN2Y13RDMBCAZQQVYRDMBCAZQQVY4RZHXTM5E5RSTBBBR', isActive: true, sortOrder: 2 },
        { label: 'USDT (ERC-20)', currency: 'USDT', network: 'ERC-20', address: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F', isActive: true, sortOrder: 3 },
      ],
      skipDuplicates: true,
    });
    console.log('Default payment addresses seeded.');
  }

  console.log('========================================');
  console.log('Database ready!');
  console.log('Admin login: admin@teslaprime.com / Admin@123');
  console.log('Admin login: teslaequit.support@gmail.com / Admin@123');
  console.log('========================================');
}

main().catch(console.error).finally(() => prisma.$disconnect());
