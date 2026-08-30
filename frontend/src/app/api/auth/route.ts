import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { verifyPassword, generateToken } from '@/lib/auth'
import { apiResponse, apiError } from '@/lib/api-helpers'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return apiError('Email and password are required')
    }

    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { profile: true, wallets: true },
    })

    if (!user) {
      return apiError('Invalid email or password', 401)
    }

    if (!user.isActive) {
      return apiError('Account has been suspended. Please contact support.', 403)
    }

    const isValid = await verifyPassword(password, user.password)
    if (!isValid) {
      return apiError('Invalid email or password', 401)
    }

    const token = generateToken({ userId: user.id, email: user.email, role: user.role })

    const response = apiResponse({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        referralCode: user.referralCode,
        isDemo: user.isDemo,
        createdAt: user.createdAt,
        profile: user.profile,
        wallets: user.wallets,
      },
      token,
    })

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Login error:', error)
    return apiError('Internal server error', 500)
  }
}