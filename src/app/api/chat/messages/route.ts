import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, requireRole, apiResponse, apiError } from '@/lib/api-helpers';
import { rateLimit } from '@/lib/rate-limit';
import { z } from 'zod';

// ── USER: Send a message ──
const sendMessageSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty').max(2000, 'Message too long'),
});

async function postHandler(request: NextRequest, _context: any, user: any) {
  const rl = rateLimit(request, true);
  if (!rl.success) {
    return apiError('Too many requests. Please try again later.', 'TOO_MANY_REQUESTS', 429);
  }
  try {
    const body = await request.json();
    const parsed = sendMessageSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0].message, 'VALIDATION_ERROR', 400);
    }

    const chatMessage = await db.chatMessage.create({
      data: {
        userId: user.id,
        senderType: 'user',
        message: parsed.data.message,
      },
    });

    return apiResponse(chatMessage, 201);
  } catch (error) {
    console.error('Chat send error:', error);
    return apiError('Internal server error', 'INTERNAL_ERROR', 500);
  }
}

// ── USER: Get their chat messages ──
async function getHandler(request: NextRequest, _context: any, user: any) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50') || 50));
    const before = searchParams.get('before'); // cursor for pagination

    const where: any = { userId: user.id };
    if (before) where.createdAt = { lt: new Date(before) };

    // Mark unread admin messages as read
    await db.chatMessage.updateMany({
      where: { userId: user.id, senderType: 'admin', isRead: false },
      data: { isRead: true, readAt: new Date() },
    });

    const messages = await db.chatMessage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return apiResponse({
      messages: messages.reverse(), // oldest first for display
    });
  } catch (error) {
    console.error('Chat get error:', error);
    return apiError('Internal server error', 'INTERNAL_ERROR', 500);
  }
}

export const POST = requireAuth(postHandler);
export const GET = requireAuth(getHandler);
