import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, apiResponse, apiError } from '@/lib/api-helpers'
import { TransactionStatus } from '@prisma/client'

const WITHDRAWAL_FEE_RATE = 0.21

export async function GET() {
  try {
    const user = await requireAuth()

    const withdrawals = await db.withdrawal.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    })

    return apiResponse(withdrawals)
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return apiError('Unauthorized', 401)
    }
    console.error('Get withdrawals error:', error)
    return apiError('Internal server error', 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const { amount, walletAddr } = body

    if (!amount || !walletAddr) {
      return apiError('Amount and wallet address are required')
    }

    const withdrawalAmount = parseFloat(amount)
    if (withdrawalAmount <= 0) {
      return apiError('Amount must be greater than zero')
    }

    const wallet = await db.wallet.findFirst({
      where: { userId: user.id, isDemo: false },
    })

    if (!wallet) {
      return apiError('Wallet not found', 404)
    }

    const fee = withdrawalAmount * WITHDRAWAL_FEE_RATE
    const netAmount = withdrawalAmount - fee

    if (wallet.balance < withdrawalAmount) {
      return apiError('Insufficient balance')
    }

    const withdrawal = await db.$transaction(async (tx) => {
      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { decrement: withdrawalAmount } },
      })

      if (updatedWallet.balance < 0) {
        throw new Error('Insufficient balance after deduction')
      }

      const newWithdrawal = await tx.withdrawal.create({
        data: {
          userId: user.id,
          walletId: wallet.id,
          amount: withdrawalAmount,
          fee,
          netAmount,
          walletAddr,
          status: TransactionStatus.PENDING,
        },
      })

      await tx.transaction.create({
        data: {
          userId: user.id,
          walletId: wallet.id,
          type: 'WITHDRAWAL',
          status: TransactionStatus.PENDING,
          amount: withdrawalAmount,
          description: `Withdrawal of $${withdrawalAmount.toFixed(2)} to ${walletAddr}`,
          reference: newWithdrawal.id,
        },
      })

      return newWithdrawal
    })

    await db.notification.create({
      data: {
        userId: user.id,
        type: 'WITHDRAWAL',
        title: 'Withdrawal Submitted',
        message: `Your withdrawal of $${withdrawalAmount.toFixed(2)} (fee: $${fee.toFixed(2)}, net: $${netAmount.toFixed(2)}) has been submitted and is pending review.`,
      },
    })

    return apiResponse(withdrawal, 201)
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return apiError('Unauthorized', 401)
    }
    if (error instanceof Error && error.message === 'Insufficient balance') {
      return apiError('Insufficient balance')
    }
    console.error('Create withdrawal error:', error)
    return apiError('Internal server error', 500)
  }
}