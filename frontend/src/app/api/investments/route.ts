import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, apiResponse, apiError } from '@/lib/api-helpers'
import { InvestmentStatus, TransactionStatus } from '@prisma/client'

export async function GET() {
  try {
    const user = await requireAuth()

    const investments = await db.userInvestment.findMany({
      where: { userId: user.id },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    })

    return apiResponse(investments)
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return apiError('Unauthorized', 401)
    }
    console.error('Get investments error:', error)
    return apiError('Internal server error', 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const { planId, amount } = body

    if (!planId || !amount) {
      return apiError('Plan ID and amount are required')
    }

    const investmentAmount = parseFloat(amount)
    if (investmentAmount <= 0) {
      return apiError('Amount must be greater than zero')
    }

    const plan = await db.investmentPlan.findUnique({
      where: { id: planId },
    })

    if (!plan || !plan.isActive) {
      return apiError('Investment plan not found or inactive')
    }

    if (investmentAmount < plan.minAmount) {
      return apiError(`Minimum investment amount is $${plan.minAmount}`)
    }

    if (investmentAmount > plan.maxAmount) {
      return apiError(`Maximum investment amount is $${plan.maxAmount}`)
    }

    const wallet = await db.wallet.findFirst({
      where: { userId: user.id, isDemo: false },
    })

    if (!wallet) {
      return apiError('Wallet not found', 404)
    }

    if (wallet.balance < investmentAmount) {
      return apiError('Insufficient balance')
    }

    const dailyReturn = investmentAmount * (plan.dailyRate / 100)
    const endDate = new Date()
    endDate.setDate(endDate.getDate() + plan.duration)

    const investment = await db.$transaction(async (tx) => {
      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { decrement: investmentAmount } },
      })

      if (updatedWallet.balance < 0) {
        throw new Error('Insufficient balance after deduction')
      }

      const newInvestment = await tx.userInvestment.create({
        data: {
          userId: user.id,
          planId: plan.id,
          walletId: wallet.id,
          amount: investmentAmount,
          dailyReturn,
          status: InvestmentStatus.ACTIVE,
          startDate: new Date(),
          endDate,
        },
      })

      await tx.transaction.create({
        data: {
          userId: user.id,
          walletId: wallet.id,
          type: 'INVESTMENT',
          status: TransactionStatus.COMPLETED,
          amount: investmentAmount,
          description: `Investment in ${plan.name} plan - $${investmentAmount.toFixed(2)}`,
          reference: newInvestment.id,
        },
      })

      return newInvestment
    })

    await db.notification.create({
      data: {
        userId: user.id,
        type: 'INVESTMENT',
        title: 'Investment Created',
        message: `Your investment of $${investmentAmount.toFixed(2)} in the ${plan.name} plan has been activated. Expected daily return: $${dailyReturn.toFixed(2)}.`,
      },
    })

    return apiResponse(investment, 201)
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return apiError('Unauthorized', 401)
    }
    if (error instanceof Error && error.message === 'Insufficient balance after deduction') {
      return apiError('Insufficient balance')
    }
    console.error('Create investment error:', error)
    return apiError('Internal server error', 500)
  }
}