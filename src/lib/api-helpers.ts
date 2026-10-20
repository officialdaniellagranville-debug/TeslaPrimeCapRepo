import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, verifyPassword } from '@/lib/auth';
import { db, ensureSchema } from '@/lib/db';
import { serializeDecimals } from '@/lib/serialize';

export async function getSessionUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.split(' ')[1];
  const payload = verifyToken(token);
  if (!payload) return null;

  // Ensure schema columns exist before querying (safety-net for missing columns)
  await ensureSchema();

  const user = await db.user.findUnique({
    where: { id: payload.userId },
    include: { profile: true, adminRecord: true, wallets: true },
  });

  if (!user || user.deletedAt || user.status === 'banned') return null;
  return user;
}

export function requireAuth(handler: (request: NextRequest, context: any, user: any) => Promise<NextResponse>) {
  return async (request: NextRequest, context: any) => {
    try {
      const user = await getSessionUser(request);
      if (!user) {
        return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }, { status: 401 });
      }
      return await handler(request, context, user);
    } catch (error) {
      console.error('[requireAuth] Unhandled error:', error);
      return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } }, { status: 500 });
    }
  };
}

const ROLE_HIERARCHY: Record<string, number> = {
  'SUPPORT': 1,
  'COMPLIANCE': 2,
  'ADMIN': 3,
  'SUPER_ADMIN': 4,
};

export function requireRole(...roles: string[]) {
  return (handler: (request: NextRequest, context: any, user: any) => Promise<NextResponse>) => {
    return async (request: NextRequest, context: any) => {
      try {
        const user = await getSessionUser(request);
        if (!user) {
          return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }, { status: 401 });
        }
        if (user.adminRecord) {
          const userLevel = ROLE_HIERARCHY[user.adminRecord.role] || 0;
          const requiredLevel = Math.max(...roles.map(r => ROLE_HIERARCHY[r] || 0));
          if (userLevel < requiredLevel) {
            return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } }, { status: 403 });
          }
        } else {
          if (roles.length > 0) {
            return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } }, { status: 403 });
          }
        }
        return await handler(request, context, user);
      } catch (error) {
        console.error('[requireRole] Unhandled error:', error);
        return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } }, { status: 500 });
      }
    };
  };
}

export async function apiResponse(data: any, status = 200) {
  return NextResponse.json({ success: true, data: serializeDecimals(data) }, { status });
}

export function apiError(message: string, code: string, status = 400) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}
