import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, apiResponse, apiError } from '@/lib/api-helpers'

export async function GET() {
  try {
    const user = await requireAuth()

    const tickets = await db.supportTicket.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    })

    return apiResponse(tickets)
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return apiError('Unauthorized', 401)
    }
    console.error('Get support tickets error:', error)
    return apiError('Internal server error', 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const { subject, priority, message } = body

    if (!subject || !message) {
      return apiError('Subject and message are required')
    }

    const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']
    const ticketPriority = priority && validPriorities.includes(priority) ? priority : 'MEDIUM'

    const ticket = await db.supportTicket.create({
      data: {
        userId: user.id,
        subject,
        message,
        priority: ticketPriority,
        status: 'OPEN',
      },
    })

    return apiResponse(ticket, 201)
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return apiError('Unauthorized', 401)
    }
    console.error('Create support ticket error:', error)
    return apiError('Internal server error', 500)
  }
}