import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateOtpCode } from '@/lib/auth';
import { sendVerificationEmail, sendWelcomeEmail } from '@/lib/email';
import { apiResponse, apiError } from '@/lib/api-helpers';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  const rl = rateLimit(request, true);
  if (!rl.success) {
    return NextResponse.json(
      { success: false, error: { code: 'TOO_MANY_REQUESTS', message: 'Too many verification attempts. Try again in 1 minute.' } },
      { status: 429, headers: { 'Retry-After': '60' } }
    );
  }
  try {
    const body = await request.json();
    const { email, code, action, name } = body;

    if (!email) return apiError('Email is required', 'MISSING_EMAIL', 400);

    const normalizedEmail = email.toLowerCase().trim();
    const user = await db.user.findUnique({
      where: { email: normalizedEmail },
      include: { profile: true },
    });
    if (!user) return apiError('Account not found', 'USER_NOT_FOUND', 404);

    if (action === 'send' || action === 'resend') {
      // Rate limit: 60 seconds between sends
      if (action === 'resend' && user.verificationCodeExpires) {
        const codeCreatedAt = new Date(user.verificationCodeExpires).getTime() - 10 * 60 * 1000;
        if (Date.now() - codeCreatedAt < 60000) {
          return apiError('Please wait 60 seconds before requesting a new code', 'RATE_LIMITED', 429);
        }
      }

      const otp = generateOtpCode();
      await db.user.update({
        where: { email: normalizedEmail },
        data: {
          verificationCode: otp,
          verificationCodeExpires: new Date(Date.now() + 10 * 60 * 1000),
        },
      });

      // Send email — await and surface errors to user
      let emailSent = false;
      try {
        const result = await sendVerificationEmail(normalizedEmail, otp, name || user.profile?.firstName);
        emailSent = true;
        console.log(`[VERIFY-EMAIL] OTP sent to ${normalizedEmail} via ${result.provider}`);
      } catch (emailErr: any) {
        console.error('[VERIFY-EMAIL] Failed to send verification email:', emailErr?.message);
        // Bootstrap mode: return OTP when email fails so frontend can display it
        return apiResponse({
          message: `Verification code generated but email delivery failed: ${emailErr?.message || 'email not configured'}`,
          emailSent: false,
          verificationCode: otp,
          otp,
        });
      }

      return apiResponse({ message: 'Verification code sent to your email', emailSent: true });
    }

    if (action === 'verify') {
      if (!code) return apiError('Verification code is required', 'MISSING_CODE', 400);

      if (!user.verificationCode) {
        return apiError('No verification code found. Please request a new one.', 'NO_OTP', 400);
      }

      if (user.verificationCodeExpires && new Date(user.verificationCodeExpires) < new Date()) {
        await db.user.update({
          where: { email: normalizedEmail },
          data: { verificationCode: null, verificationCodeExpires: null },
        });
        return apiError('Verification code has expired. Please request a new one.', 'OTP_EXPIRED', 400);
      }

      if (user.verificationCode !== code.trim()) {
        return apiError('Invalid verification code', 'INVALID_OTP', 400);
      }

      await db.user.update({
        where: { email: normalizedEmail },
        data: {
          emailVerified: true,
          emailVerifiedAt: new Date(),
          status: 'active',
          verificationCode: null,
          verificationCodeExpires: null,
        },
      });

      // Send welcome email after successful verification (non-blocking — always try)
      const name = user.profile?.firstName || undefined;
      sendWelcomeEmail(normalizedEmail, name).catch((err) => {
        console.error('[VERIFY-EMAIL] Welcome email failed (non-blocking):', err);
      });

      return apiResponse({ message: 'Email verified successfully', verified: true });
    }

    return apiError('Invalid action', 'INVALID_ACTION', 400);
  } catch (error: any) {
    console.error('[VERIFY-EMAIL] Email verification error:', error);
    return apiError('Failed to process verification', 'INTERNAL_ERROR', 500);
  }
}
