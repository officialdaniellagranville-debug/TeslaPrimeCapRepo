import { NextRequest } from 'next/server'
import { hashPassword, generateReferralCode } from '@/lib/auth'
import { apiResponse, apiError } from '@/lib/api-helpers'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { firstName, lastName, email, password, confirmPassword, referralCode } = body

    if (!firstName?.trim() || !lastName?.trim()) {
      return apiError('First name and last name are required')
    }

    if (!email?.trim()) {
      return apiError('Email address is required')
    }

    const normalizedEmail = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return apiError('Please enter a valid email address')
    }

    if (!password) {
      return apiError('Password is required')
    }

    if (password.length < 8) {
      return apiError('Password must be at least 8 characters')
    }

    if (password !== confirmPassword) {
      return apiError('Passwords do not match')
    }

    const existingUser = await db.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (existingUser) {
      return apiError('An account with this email already exists')
    }

    let referredBy: string | undefined

    if (referralCode?.trim()) {
      const code = referralCode.trim().toUpperCase()
      const referral = await db.referral.findUnique({
        where: { code },
      })

      if (!referral || !referral.isActive) {
        return apiError('Invalid referral code')
      }

      referredBy = referral.referrerId
    }

    const hashedPassword = await hashPassword(password)
    const userReferralCode = generateReferralCode()

    const user = await db.user.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        referralCode: userReferralCode,
        referredBy,
        profile: {
          create: {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
          },
        },
        wallets: {
          create: {
            currency: 'USD',
            isDemo: false,
          },
        },
      },
    })

    if (referralCode?.trim()) {
      const code = referralCode.trim().toUpperCase()
      await db.referral.update({
        where: { code },
        data: { uses: { increment: 1 } },
      })
    }

    await db.referral.create({
      data: {
        referrerId: user.id,
        code: userReferralCode,
      },
    })

    return apiResponse({
      message: 'Account created successfully',
      userId: user.id,
    })
  } catch (error) {
    console.error('Register error:', error)
    return apiError('Internal server error', 500)
  }
}