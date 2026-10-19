import { NextRequest, NextResponse } from 'next/server';
import { db, ensureSchema } from '@/lib/db';
import { verifyPassword, generateToken } from '@/lib/auth';
import { apiResponse, apiError } from '@/lib/api-helpers';
import { rateLimit } from '@/lib/rate-limit';
import { verifyCaptcha, isCaptchaConfigured } from '@/lib/captcha';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 30;

export async function POST(request: NextRequest) {
  // Ensure schema columns exist before querying (safety-net for missing columns)
  await ensureSchema();

  const rl = rateLimit(request, true);
  if (!rl.success) {
    return NextResponse.json({ success: false, error: { code: 'TOO_MANY_REQUESTS', message: 'Too many login attempts. Try again in 1 minute.' } }, { status: 429, headers: { 'Retry-After': '60', 'X-RateLimit-Remaining': '0' } });
  }
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(parsed.error.issues[0].message, 'VALIDATION_ERROR', 400);
    }

    // Verify CAPTCHA if configured
    if (isCaptchaConfigured()) {
      const captchaToken = body.captchaToken as string | undefined;
      if (!captchaToken) {
        return apiError('CAPTCHA verification required', 'CAPTCHA_REQUIRED', 400);
      }
      const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined;
      const captchaResult = await verifyCaptcha(captchaToken, ip);
      if (!captchaResult.success) {
        return apiError(captchaResult.error || 'CAPTCHA verification failed', 'CAPTCHA_FAILED', 400);
      }
    }

    const { email: rawEmail, password } = parsed.data;
    const email = rawEmail.toLowerCase().trim();

    const user = await db.user.findUnique({
      where: { email },
      include: { profile: true, adminRecord: true, wallets: true },
    });

    if (!user) {
      return apiError('Invalid email or password', 'INVALID_CREDENTIALS', 401);
    }

    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      const remainingMinutes = Math.ceil(
        (new Date(user.lockedUntil).getTime() - Date.now()) / 60000
      );
      return apiError(
        `Account is locked. Try again in ${remainingMinutes} minutes.`,
        'ACCOUNT_LOCKED',
        423
      );
    }

    if (user.status === 'banned') {
      return apiError('Account has been banned', 'ACCOUNT_BANNED', 403);
    }

    // Block login for unverified users
    if (!user.emailVerified && user.status === 'pending_verification') {
      return NextResponse.json({
        success: false,
        error: {
          code: 'EMAIL_NOT_VERIFIED',
          message: 'Please verify your email before signing in. Check your inbox for a verification code.',
          email: user.email,
        },
      }, { status: 403 });
    }

    const isPasswordValid = await verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      const newAttemptCount = user.loginAttemptCount + 1;
      const shouldLock = newAttemptCount >= MAX_LOGIN_ATTEMPTS;
      const lockedUntil = shouldLock
        ? new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000)
        : null;

      await db.user.update({
        where: { id: user.id },
        data: {
          loginAttemptCount: newAttemptCount,
          lockedUntil,
        },
      });

      if (shouldLock) {
        return apiError(
          `Too many failed attempts. Account locked for ${LOCK_DURATION_MINUTES} minutes.`,
          'ACCOUNT_LOCKED',
          423
        );
      }

      return apiError('Invalid email or password', 'INVALID_CREDENTIALS', 401);
    }

    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    await db.user.update({
      where: { id: user.id },
      data: {
        loginAttemptCount: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
        lastLoginIp: ip,
      },
    });

    // ── 2FA Check: Skip for admin users, they login directly ──
    if (user.twoFactorEnabled && !user.adminRecord) {
      // Generate a short-lived pending token (5 minutes) that only identifies the user
      const pendingToken = generateToken({ userId: user.id, email: user.email }, '5m');

      return apiResponse({
        requires2FA: true,
        pendingToken,
        email: user.email,
      });
    }

    const token = generateToken({ userId: user.id, email: user.email });

    return apiResponse({
      token,
      user: {
        id: user.id,
        email: user.email,
        status: user.status,
        referralCode: user.referralCode,
        activeMode: user.activeMode,
        kycLevel: user.kycLevel,
        emailVerified: user.emailVerified,
        twoFactorEnabled: user.twoFactorEnabled,
        adminRecord: user.adminRecord ? {
          role: user.adminRecord.role,
          isSuperAdmin: user.adminRecord.isSuperAdmin,
        } : null,
        wallets: user.wallets?.map(w => ({
          id: w.id,
          type: w.type,
          balance: w.balance,
          availableBalance: w.availableBalance,
          lockedBalance: w.lockedBalance,
        })) || [],
        profile: user.profile
          ? {
              firstName: user.profile.firstName,
              lastName: user.profile.lastName,
              avatarUrl: user.profile.avatarUrl,
            }
          : null,
        createdAt: user.createdAt,
      },
    });
  } catch (error: any) {
    console.error('[LOGIN] Full error:', error);
    console.error('[LOGIN] Error code:', error?.code);
    console.error('[LOGIN] Error message:', error?.message);
    console.error('[LOGIN] DATABASE_URL set:', !!process.env.DATABASE_URL);
    console.error('[LOGIN] JWT_SECRET set:', !!process.env.JWT_SECRET);
    if (!process.env.JWT_SECRET) {
      return apiError('Server is not configured properly. Please contact support.', 'SERVER_MISCONFIGURED', 500);
    }
    if (error?.code === 'P1001') {
      return apiError('Database connection failed. Please try again in a moment.', 'DB_CONNECTION', 503);
    }
    if (error?.code === 'P1008' || error?.code === 'P2025') {
      return apiError('Invalid email or password', 'INVALID_CREDENTIALS', 401);
    }
    if (error?.message?.includes('ECONNREFUSED') || error?.message?.includes('connect') || error?.message?.includes('timeout') || error?.message?.includes('ETIMEDOUT')) {
      return apiError('Service temporarily unavailable. Please try again.', 'DB_UNREACHABLE', 503);
    }
    return apiError(`Internal server error: ${error?.code || ''} ${error?.message?.substring(0, 100) || ''}`, 'INTERNAL_ERROR', 500);
  }
}
