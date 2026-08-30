import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, apiResponse, apiError } from '@/lib/api-helpers'

export async function GET() {
  try {
    const user = await requireAuth()

    const notifications = await db.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    })

    const unreadCount = notifications.filter((n) => !n.isRead).length

    return apiResponse({
      notifications,
      unreadCount,
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return apiError('Unauthorized', 401)
    }
    console.error('Get notifications error:', error)
    return apiError('Internal server error', 500)
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const { id, markAll } = body

    if (markAll) {
      await db.notification.updateMany({
        where: { userId: user.id, isRead: false },
        data: { isRead: true },
      })

      return apiResponse({ message: 'All notifications marked as read' })
    }

    if (!id) {
      return apiError('Notification ID is required')
    }

    const notification = await db.notification.findFirst({
      where: { id, userId: user.id },
    })

    if (!notification) {
      return apiError('Notification not found', 404)
    }

    await db.notification.update({
      where: { id },
      data: { isRead: true },
    })

    return apiResponse({ message: 'Notification marked as read' })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return apiError('Unauthorized', 401)
    }
    console.error('Update notification error:', error)
    return apiError('Internal server error', 500)
  }
}