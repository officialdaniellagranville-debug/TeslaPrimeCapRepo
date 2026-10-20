import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireRole, apiResponse, apiError } from '@/lib/api-helpers';

// ── ADMIN: Get all messages for a specific user conversation ──
async function getHandler(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
  _user: any
) {
  const { userId } = await params;

  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '100') || 100));

    // Mark user messages as read by admin
    await db.chatMessage.updateMany({
      where: { userId, senderType: 'user', isRead: false },
      data: { isRead: true, readAt: new Date() },
    });

    const messages = await db.chatMessage.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });

    return apiResponse({ messages });
  } catch (error) {
    console.error('Admin chat get messages error:', error);
    return apiError('Internal server error', 'INTERNAL_ERROR', 500);
  }
}

export const GET = requireRole('SUPPORT', 'COMPLIANCE', 'ADMIN', 'SUPER_ADMIN')(
  getHandler as any
);
