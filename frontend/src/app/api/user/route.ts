import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, apiResponse, apiError } from '@/lib/api-helpers'
import { verifyPassword, hashPassword, generateToken } from '@/lib/auth'

export async function GET() {
  try {
    const user = await requireAuth()

    return apiResponse({
      id: user.id,
      email: user.email,
      role: user.role,
      referralCode: user.referralCode,
      isDemo: user.isDemo,
      isActive: user.isActive,
      createdAt: user.createdAt,
      profile: user.profile,
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return apiError('Unauthorized', 401)
    }
    console.error('Get user profile error:', error)
    return apiError('Internal server error', 500)
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const { firstName, lastName, phone, country, address, city, state, zipCode } = body

    if (!user.profile) {
      return apiError('Profile not found', 404)
    }

    const updateData: Record<string, unknown> = {}
    if (firstName !== undefined) updateData.firstName = firstName
    if (lastName !== undefined) updateData.lastName = lastName
    if (phone !== undefined) updateData.phone = phone
    if (country !== undefined) updateData.country = country
    if (address !== undefined) updateData.address = address
    if (city !== undefined) updateData.city = city
    if (state !== undefined) updateData.state = state
    if (zipCode !== undefined) updateData.zipCode = zipCode

    const updatedProfile = await db.profile.update({
      where: { userId: user.id },
      data: updateData,
    })

    return apiResponse(updatedProfile)
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return apiError('Unauthorized', 401)
    }
    console.error('Update profile error:', error)
    return apiError('Internal server error', 500)
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const { currentPassword, newPassword } = body

    if (!currentPassword || !newPassword) {
      return apiError('Current password and new password are required')
    }

    if (newPassword.length < 8) {
      return apiError('New password must be at least 8 characters long')
    }

    const isCurrentValid = await verifyPassword(currentPassword, user.password)
    if (!isCurrentValid) {
      return apiError('Current password is incorrect')
    }

    const hashedNewPassword = await hashPassword(newPassword)

    await db.user.update({
      where: { id: user.id },
      data: { password: hashedNewPassword },
    })

    const token = generateToken({ userId: user.id, email: user.email, role: user.role })

    const response = NextResponse.json({ message: 'Password changed successfully' })

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })

    return response
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return apiError('Unauthorized', 401)
    }
    console.error('Change password error:', error)
    return apiError('Internal server error', 500)
  }
}