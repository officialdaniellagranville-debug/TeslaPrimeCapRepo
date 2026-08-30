import { db } from '@/lib/db'
import { requireAuth, apiResponse, apiError } from '@/lib/api-helpers'

export async function GET() {
  try {
    const user = await requireAuth()

    const referral = await db.referral.findFirst({
      where: { referrerId: user.id },
    })

    const referredUsers = await db.user.findMany({
      where: { referredBy: user.referralCode },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        createdAt: true,
        profile: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    const totalCommissions = await db.referralCommission.aggregate({
      where: { referrerId: user.id },
      _sum: { amount: true },
    })

    const activeReferrals = referredUsers.filter((u) => u.id !== user.id).length

    return apiResponse({
      referralCode: user.referralCode,
      totalReferrals: referral?.uses || 0,
      activeReferrals,
      totalCommissions: totalCommissions._sum.amount || 0,
      referredUsers,
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return apiError('Unauthorized', 401)
    }
    console.error('Get referral error:', error)
    return apiError('Internal server error', 500)
  }
}