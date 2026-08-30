import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, apiResponse, apiError } from '@/lib/api-helpers'
import { DepositMethod, TransactionStatus } from '@prisma/client'

export async function GET() {
  try {
    const user = await requireAuth()

    const deposits = await db.deposit.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    })

    return apiResponse(deposits)
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return apiError('Unauthorized', 401)
    }
    console.error('Get deposits error:', error)
    return apiError('Internal server error', 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const { method, amount, txHash, walletAddr, screenshot, giftCardCode } = body

    if (!method || !amount) {
      return apiError('Deposit method and amount are required')
    }

    const validMethods = Object.values(DepositMethod)
    if (!validMethods.includes(method)) {
      return apiError('Invalid deposit method')
    }

    if (amount <= 0) {
      return apiError('Amount must be greater than zero')
    }

    if (method === 'GIFT_CARD') {
      if (!giftCardCode) {
        return apiError('Gift card code is required for gift card deposits')
      }
    } else {
      if (!txHash && !walletAddr) {
        return apiError('Transaction hash or wallet address is required')
      }
    }

    const wallet = await db.wallet.findFirst({
      where: { userId: user.id, isDemo: false },
    })

    if (!wallet) {
      return apiError('Wallet not found', 404)
    }

    const deposit = await db.deposit.create({
      data: {
        userId: user.id,
        walletId: wallet.id,
        method,
        amount: parseFloat(amount),
        txHash: txHash || null,
        walletAddr: walletAddr || null,
        screenshot: screenshot || null,
        giftCardCode: giftCardCode || null,
        status: TransactionStatus.PENDING,
      },
    })

    await db.notification.create({
      data: {
        userId: user.id,
        type: 'DEPOSIT',
        title: 'Deposit Submitted',
        message: `Your ${method} deposit of $${parseFloat(amount).toFixed(2)} has been submitted and is pending review.`,
      },
    })

    return apiResponse(deposit, 201)
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return apiError('Unauthorized', 401)
    }
    console.error('Create deposit error:', error)
    return apiError('Internal server error', 500)
  }
}