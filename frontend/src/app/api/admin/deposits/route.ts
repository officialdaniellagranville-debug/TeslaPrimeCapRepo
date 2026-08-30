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
    const method = searchParams.get('method') || ''

    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}
    if (status) {
      where.status = status
    }
    if (method) {
      where.method = method
    }

    const [deposits, total] = await Promise.all([
      db.deposit.findMany({
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
      db.deposit.count({ where }),
    ])

    return apiResponse({
      deposits,
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
    console.error('Get admin deposits error:', error)
    return apiError('Internal server error', 500)
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const adminUser = await requireRole('ADMIN', 'SUPER_ADMIN')

    const body = await request.json()
    const { depositId, action } = body

    if (!depositId || !action) {
      return apiError('Deposit ID and action are required')
    }

    const deposit = await db.deposit.findUnique({
      where: { id: depositId },
      include: { user: true },
    })

    if (!deposit) {
      return apiError('Deposit not found', 404)
    }

    if (deposit.status !== 'PENDING') {
      return apiError('This deposit has already been reviewed')
    }

    if (action === 'approve') {
      await db.$transaction(async (tx) => {
        await tx.deposit.update({
          where: { id: depositId },
          data: {
            status: TransactionStatus.APPROVED,
            reviewedBy: adminUser.id,
            reviewedAt: new Date(),
          },
        })

        await tx.wallet.update({
          where: { id: deposit.walletId },
          data: { balance: { increment: deposit.amount } },
        })

        await tx.transaction.create({
          data: {
            userId: deposit.userId,
            walletId: deposit.walletId,
            type: 'DEPOSIT',
            status: TransactionStatus.COMPLETED,
            amount: deposit.amount,
            description: `Deposit via ${deposit.method} approved`,
            reference: deposit.id,
          },
        })

        await tx.notification.create({
          data: {
            userId: deposit.userId,
            type: 'DEPOSIT',
            title: 'Deposit Approved',
            message: `Your deposit of $${deposit.amount.toFixed(2)} via ${deposit.method} has been approved and credited to your wallet.`,
          },
        })
      })

      return apiResponse({ message: 'Deposit approved successfully' })
    }

    if (action === 'reject') {
      await db.deposit.update({
        where: { id: depositId },
        data: {
          status: TransactionStatus.REJECTED,
          reviewedBy: adminUser.id,
          reviewedAt: new Date(),
        },
      })

      await db.notification.create({
        data: {
          userId: deposit.userId,
          type: 'DEPOSIT',
          title: 'Deposit Rejected',
          message: `Your deposit of $${deposit.amount.toFixed(2)} via ${deposit.method} has been rejected. Please contact support for details.`,
        },
      })

      return apiResponse({ message: 'Deposit rejected successfully' })
    }

    return apiError('Invalid action. Use "approve" or "reject"')
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return apiError('Unauthorized', 401)
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return apiError('Forbidden', 403)
    }
    console.error('Update admin deposit error:', error)
    return apiError('Internal server error', 500)
  }
}