import { db } from '@/lib/db'
import { requireRole, apiResponse, apiError } from '@/lib/api-helpers'

export async function GET() {
  try {
    await requireRole('SUPER_ADMIN', 'ADMIN')

    const [
      totalUsers,
      totalDepositsResult,
      totalWithdrawalsResult,
      activeInvestments,
      pendingKYC,
      pendingDeposits,
      pendingWithdrawals,
    ] = await Promise.all([
      db.user.count(),
      db.deposit.aggregate({
        where: { status: 'APPROVED' },
        _sum: { amount: true },
      }),
      db.withdrawal.aggregate({
        where: { status: 'APPROVED' },
        _sum: { amount: true },
      }),
      db.userInvestment.count({
        where: { status: 'ACTIVE' },
      }),
      db.kYCDocument.count({
        where: { status: 'PENDING' },
      }),
      db.deposit.count({
        where: { status: 'PENDING' },
      }),
      db.withdrawal.count({
        where: { status: 'PENDING' },
      }),
    ])

    const totalInvestedResult = await db.userInvestment.aggregate({
      _sum: { amount: true },
    })

    return apiResponse({
      totalUsers,
      totalDeposits: totalDepositsResult._sum.amount || 0,
      totalWithdrawals: totalWithdrawalsResult._sum.amount || 0,
      totalInvested: totalInvestedResult._sum.amount || 0,
      activeInvestments,
      pendingKYC,
      pendingDeposits,
      pendingWithdrawals,
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return apiError('Unauthorized', 401)
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return apiError('Forbidden', 403)
    }
    console.error('Get admin stats error:', error)
    return apiError('Internal server error', 500)
  }
}