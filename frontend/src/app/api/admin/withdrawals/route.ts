import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, apiResponse, apiError } from '@/lib/api-helpers'
import { TransactionStatus } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    await requireRole('ADMIN', 'SUPER_ADMIN')

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const status = searchParams.get('status') || ''

    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}
    if (status) {
      where.status = status
    }

    const [withdrawals, total] = await Promise.all([
      db.withdrawal.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              profile: { select: { firstName: true, lastName: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.withdrawal.count({ where }),
    ])

    return apiResponse({
      withdrawals,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return apiError('Unauthorized', 401)
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return apiError('Forbidden', 403)
    }
    console.error('Get admin withdrawals error:', error)
    return apiError('Internal server error', 500)
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const adminUser = await requireRole('ADMIN', 'SUPER_ADMIN')

    const body = await request.json()
    const { withdrawalId, action } = body

    if (!withdrawalId || !action) {
      return apiError('Withdrawal ID and action are required')
    }

    const withdrawal = await db.withdrawal.findUnique({
      where: { id: withdrawalId },
    })

    if (!withdrawal) {
      return apiError('Withdrawal not found', 404)
    }

    if (withdrawal.status !== 'PENDING') {
      return apiError('This withdrawal has already been reviewed')
    }

    if (action === 'approve') {
      await db.$transaction(async (tx) => {
        await tx.withdrawal.update({
          where: { id: withdrawalId },
          data: {
            status: TransactionStatus.APPROVED,
            reviewedBy: adminUser.id,
            reviewedAt: new Date(),
          },
        })

        await tx.transaction.updateMany({
          where: { reference: withdrawalId, type: 'WITHDRAWAL' },
          data: { status: TransactionStatus.COMPLETED },
        })

        await tx.notification.create({
          data: {
            userId: withdrawal.userId,
            type: 'WITHDRAWAL',
            title: 'Withdrawal Approved',
            message: `Your withdrawal of $${withdrawal.amount.toFixed(2)} (net: $${withdrawal.netAmount.toFixed(2)}) has been approved and is being processed.`,
          },
        })
      })

      return apiResponse({ message: 'Withdrawal approved successfully' })
    }

    if (action === 'reject') {
      await db.$transaction(async (tx) => {
        await tx.withdrawal.update({
          where: { id: withdrawalId },
          data: {
            status: TransactionStatus.REJECTED,
            reviewedBy: adminUser.id,
            reviewedAt: new Date(),
          },
        })

        await tx.wallet.update({
          where: { id: withdrawal.walletId },
          data: { balance: { increment: withdrawal.amount } },
        })

        await tx.transaction.updateMany({
          where: { reference: withdrawalId, type: 'WITHDRAWAL' },
          data: { status: TransactionStatus.FAILED },
        })

        await tx.notification.create({
          data: {
            userId: withdrawal.userId,
            type: 'WITHDRAWAL',
            title: 'Withdrawal Rejected',
            message: `Your withdrawal of $${withdrawal.amount.toFixed(2)} has been rejected. The full amount has been refunded to your wallet.`,
          },
        })
      })

      return apiResponse({ message: 'Withdrawal rejected and refunded successfully' })
    }

    return apiError('Invalid action. Use "approve" or "reject"')
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return apiError('Unauthorized', 401)
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return apiError('Forbidden', 403)
    }
    console.error('Update admin withdrawal error:', error)
    return apiError('Internal server error', 500)
  }
}