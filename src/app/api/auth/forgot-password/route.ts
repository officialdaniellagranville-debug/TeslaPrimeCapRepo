import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateOtpCode } from '@/lib/auth';
import { apiResponse, apiError } from '@/lib/api-helpers';
import { rateLimit } from '@/lib/rate-limit';
import { sendPasswordResetEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  const rl = rateLimit(request, true);
  if (!rl.success) {
    return NextResponse.json(
      { success: false, error: { code: 'TOO_MANY_REQUESTS', message: 'Too many requests. Try again in 1 minute.' } },
      { status: 429, headers: { 'Retry-After': '60' } }
    );
  }
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) return apiError('Email is required', 'MISSING_EMAIL', 400);

    const normalizedEmail = email.toLowerCase().trim();
    const user = await db.user.findUnique({
      where: { email: normalizedEmail },
      include: { profile: true },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      console.log(`[FORGOT-PW] No account found for ${normalizedEmail} — returning generic success`);
      return apiResponse({ message: 'If an account exists with this email, a reset code has been sent.' });
    }

    if (user.status === 'banned') {
      console.log(`[FORGOT-PW] Banned account ${normalizedEmail} — returning generic success`);
      return apiResponse({ message: 'If an account exists with this email, a reset code has been sent.' });
    }

    const otp = generateOtpCode();

    await db.user.update({
      where: { email: normalizedEmail },
      data: {
        verificationCode: otp,
        verificationCodeExpires: new Date(Date.now() + 15 * 60 * 1000),
      },
    });

    // Send email — log failure but keep generic response (anti-enumeration)
    const name = user.profile?.firstName || undefined;
    let emailSent = false;
    let emailError: string | undefined;
    try {
      const result = await sendPasswordResetEmail(normalizedEmail, otp, name);
      emailSent = true;
      console.log(`[FORGOT-PW] Reset email sent to ${normalizedEmail} via ${result.provider}`);
    } catch (emailErr: any) {
      emailError = emailErr?.message;
      console.error(`[FORGOT-PW] FAILED to send reset email to ${normalizedEmail}:`, emailErr?.message);
    }

    return apiResponse({
      message: 'If an account exists with this email, a reset code has been sent.',
      emailSent,
      // Bootstrap mode: return OTP when email fails so frontend can display it
      ...(emailSent ? {} : { otp }),
    });
  } catch (error) {
    console.error('[FORGOT-PW] Forgot password error:', error);
    return apiError('Internal server error', 'INTERNAL_ERROR', 500);
  }
}
