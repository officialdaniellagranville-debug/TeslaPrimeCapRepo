import { NextRequest } from 'next/server'
import { verifyPassword, generateToken } from '@/lib/auth'
import { apiResponse, apiError } from '@/lib/api-helpers'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return apiError('Email and password are required')
    }

    const normalizedEmail = email.trim().toLowerCase()

    const user = await db.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        profile: true,
        wallets: {
          where: { isDemo: false },
          take: 1,
        },
      },
    })

    if (!user) {
      return apiError('Invalid email or password')
    }

    if (!user.isActive) {
      return apiError('This account has been suspended. Please contact support.')
    }

    const isValid = await verifyPassword(password, user.password)
    if (!isValid) {
      return apiError('Invalid email or password')
    }

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    })

    const safeUser = {
      id: user.id,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      isDemo: user.isDemo,
      referralCode: user.referralCode,
      referredBy: user.referredBy,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      profile: user.profile,
      wallets: user.wallets.map((w) => ({
        id: w.id,
        balance: w.balance,
        isDemo: w.isDemo,
      })),
    }

    return apiResponse({
      token,
      user: safeUser,
    })
  } catch (error) {
    console.error('Login error:', error)
    return apiError('Internal server error', 500)
  }
}