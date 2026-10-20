import { NextRequest } from 'next/server';
import { requireAuth, apiResponse, apiError } from '@/lib/api-helpers';
import { rateLimit } from '@/lib/rate-limit';
import { z } from 'zod';

const confirmSchema = z.object({
  email: z.string().email(),
  action: z.string().min(1),
  otp: z.string().length(6),
});

// Global shared OTP store (shared with /api/auth/verify-action via globalThis)
const globalOtpStore = (globalThis as any).__verifyActionOtpStore || new Map<string, { otp: string; expiresAt: number }>();
(globalThis as any).__verifyActionOtpStore = globalOtpStore;

async function postHandler(request: NextRequest, _context: any, user: any) {
  // Rate limit to prevent OTP brute-force
  const rateLimitResult = await rateLimit(request, true);
  if (rateLimitResult) return rateLimitResult;

  try {
    const body = await request.json();
    const parsed = confirmSchema.safeParse(body);

    if (!parsed.success) {
      return apiError('Invalid request', 'VALIDATION_ERROR', 400);
    }

    const { email, action, otp } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();

    // Verify the email belongs to the authenticated user
    if (normalizedEmail !== user.email) {
      return apiError('Email does not match your account', 'FORBIDDEN', 403);
    }

    const storeKey = `${normalizedEmail}:${action}`;
    const stored = globalOtpStore.get(storeKey);

    if (!stored) {
      return apiError('No verification code found. Please request a new one.', 'NO_OTP', 400);
    }

    if (stored.expiresAt < Date.now()) {
      globalOtpStore.delete(storeKey);
      return apiError('Verification code has expired. Please request a new one.', 'OTP_EXPIRED', 400);
    }

    if (stored.otp !== otp.trim()) {
      return apiError('Invalid verification code', 'INVALID_OTP', 400);
    }

    // OTP verified — consume it
    globalOtpStore.delete(storeKey);

    return apiResponse({ verified: true, message: 'Action verified successfully' });
  } catch (error: any) {
    console.error('[VERIFY-ACTION-CONFIRM] Error:', error);
    return apiError('Internal server error', 'INTERNAL_ERROR', 500);
  }
}

export const POST = requireAuth(postHandler);
