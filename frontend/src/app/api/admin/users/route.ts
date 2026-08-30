import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, apiResponse, apiError } from '@/lib/api-helpers'

export async function GET(request: NextRequest) {
  try {
    await requireRole('ADMIN', 'SUPER_ADMIN')

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''

    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}
    if (search) {
      where.OR = [
        { email: { contains: search } },
        { profile: { firstName: { contains: search } } },
        { profile: { lastName: { contains: search } } },
      ]
    }
    if (status === 'active') {
      where.isActive = true
    } else if (status === 'suspended') {
      where.isActive = false
    }

    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        include: {
          profile: {
            select: { firstName: true, lastName: true },
          },
          wallets: {
            select: { balance: true, currency: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.user.count({ where }),
    ])

    return apiResponse({
      users,
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
    console.error('Get admin users error:', error)
    return apiError('Internal server error', 500)
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireRole('ADMIN', 'SUPER_ADMIN')

    const body = await request.json()
    const { userId, action } = body

    if (!userId || !action) {
      return apiError('User ID and action are required')
    }

    const targetUser = await db.user.findUnique({
      where: { id: userId },
    })

    if (!targetUser) {
      return apiError('User not found', 404)
    }

    if (action === 'suspend') {
      if (!targetUser.isActive) {
        return apiError('User is already suspended')
      }

      await db.user.update({
        where: { id: userId },
        data: { isActive: false },
      })

      await db.notification.create({
        data: {
          userId,
          type: 'SECURITY',
          title: 'Account Suspended',
          message: 'Your account has been suspended by an administrator. Please contact support for more information.',
        },
      })

      return apiResponse({ message: 'User suspended successfully' })
    }

    if (action === 'activate') {
      if (targetUser.isActive) {
        return apiError('User is already active')
      }

      await db.user.update({
        where: { id: userId },
        data: { isActive: true },
      })

      await db.notification.create({
        data: {
          userId,
          type: 'SYSTEM',
          title: 'Account Activated',
          message: 'Your account has been reactivated. You can now log in and use all features.',
        },
      })

      return apiResponse({ message: 'User activated successfully' })
    }

    return apiError('Invalid action. Use "suspend" or "activate"')
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return apiError('Unauthorized', 401)
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return apiError('Forbidden', 403)
    }
    console.error('Update admin user error:', error)
    return apiError('Internal server error', 500)
  }
}