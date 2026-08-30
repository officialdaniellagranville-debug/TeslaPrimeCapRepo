import { PrismaClient } from '@prisma/client'
import { hashPassword, generateReferralCode } from '../src/lib/auth'

const prisma = new PrismaClient()

async function main() {
  // Create super admin
  const hashedPassword = await hashPassword('Admin@123')
  await prisma.user.upsert({
    where: { email: 'admin@teslaprimecapital.com' },
    update: {},
    create: {
      email: 'admin@teslaprimecapital.com',
      password: hashedPassword,
      role: 'SUPER_ADMIN',
      referralCode: generateReferralCode(),
      profile: {
        create: {
          firstName: 'Super',
          lastName: 'Admin',
          kycLevel: 'ADVANCED',
        }
      },
      wallets: {
        create: {
          balance: 0,
          isDemo: false,
        }
      }
    }
  })

  // Create investment plans
  const plans = [
    { name: 'Basic', minAmount: 200, maxAmount: 4999, dailyRate: 0.5, duration: 30, sortOrder: 1 },
    { name: 'Silver', minAmount: 5000, maxAmount: 9999, dailyRate: 0.8, duration: 21, sortOrder: 2 },
    { name: 'Gold', minAmount: 10000, maxAmount: 49999, dailyRate: 1.2, duration: 14, sortOrder: 3 },
    { name: 'Platinum', minAmount: 50000, maxAmount: 100000, dailyRate: 1.8, duration: 7, sortOrder: 4 },
  ]

  for (const plan of plans) {
    await prisma.investmentPlan.upsert({
      where: { id: plan.name.toLowerCase() },
      update: {},
      create: plan
    })
  }

  console.log('Seed completed successfully')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())