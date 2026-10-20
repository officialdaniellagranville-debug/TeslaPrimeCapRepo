import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireRole, apiResponse, apiError } from '@/lib/api-helpers';
import { rateLimit } from '@/lib/rate-limit';
import { z } from 'zod';

// ── ADMIN: List all conversations (with last message + unread count) ──
async function getHandler(request: NextRequest, _context: any, user: any) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';

    // Get all users who have chat messages, with their last message and unread counts
    const conversations = await db.chatMessage.groupBy({
      by: ['userId'],
      _max: { createdAt: true },
      _count: { id: true },
      orderBy: { _max: { createdAt: 'desc' } },
    });

    // Enrich with user info and unread counts
    const enriched = await Promise.all(
      conversations.map(async (conv) => {
        const userInfo = await db.user.findUnique({
          where: { id: conv.userId },
          include: { profile: true },
          select: { id: true, email: true, profile: { select: { firstName: true, lastName: true } } },
        });

        // Skip if search doesn't match
        if (search && userInfo) {
          const name = `${userInfo.profile?.firstName || ''} ${userInfo.profile?.lastName || ''}`.trim().toLowerCase();
          const email = userInfo.email.toLowerCase();
          if (!name.includes(search.toLowerCase()) && !email.includes(search.toLowerCase())) {
            return null;
          }
        }

        const lastMessage = await db.chatMessage.findFirst({
          where: { userId: conv.userId },
          orderBy: { createdAt: 'desc' },
        });

        const unreadAdmin = await db.chatMessage.count({
          where: { userId: conv.userId, senderType: 'user', isRead: false },
        });

        const unreadUser = await db.chatMessage.count({
          where: { userId: conv.userId, senderType: 'admin', isRead: false },
        });

        return {
          userId: conv.userId,
          user: userInfo,
          lastMessage: lastMessage ? {
            id: lastMessage.id,
            message: lastMessage.message.substring(0, 100),
            senderType: lastMessage.senderType,
            createdAt: lastMessage.createdAt,
          } : null,
          totalMessages: conv._count.id,
          unreadByAdmin: unreadAdmin,   // messages from user that admin hasn't read
          unreadByUser: unreadUser,     // messages from admin that user hasn't read
        };
      })
    );

    return apiResponse({
      conversations: enriched.filter(Boolean),
    });
  } catch (error) {
    console.error('Admin chat list error:', error);
    return apiError('Internal server error', 'INTERNAL_ERROR', 500);
  }
}

// ── ADMIN: Send a message as support ──
const adminSendSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  message: z.string().min(1, 'Message cannot be empty').max(2000, 'Message too long'),
});

async function postHandler(request: NextRequest, _context: any, adminUser: any) {
  const rl = rateLimit(request, true);
  if (!rl.success) {
    return apiError('Too many requests.', 'TOO_MANY_REQUESTS', 429);
  }
  try {
    const body = await request.json();
    const parsed = adminSendSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0].message, 'VALIDATION_ERROR', 400);
    }

    const { userId, message } = parsed.data;

    // Verify the target user exists
    const targetUser = await db.user.findUnique({ where: { id: userId } });
    if (!targetUser) {
      return apiError('User not found', 'NOT_FOUND', 404);
    }

    const chatMessage = await db.chatMessage.create({
      data: {
        userId,
        senderType: 'admin',
        senderId: adminUser.id,
        message,
      },
    });

    // Also create an in-app notification for the user
    await db.notification.create({
      data: {
        userId,
        type: 'custom',
        title: 'Support Message',
        message: `Tesla Support: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`,
      },
    });

    return apiResponse(chatMessage, 201);
  } catch (error) {
    console.error('Admin chat send error:', error);
    return apiError('Internal server error', 'INTERNAL_ERROR', 500);
  }
}

export const GET = requireRole('SUPPORT', 'COMPLIANCE', 'ADMIN', 'SUPER_ADMIN')(getHandler);
export const POST = requireRole('SUPPORT', 'COMPLIANCE', 'ADMIN', 'SUPER_ADMIN')(postHandler);
