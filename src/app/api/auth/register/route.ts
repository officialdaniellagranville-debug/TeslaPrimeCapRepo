import { NextRequest, NextResponse } from 'next/server';
import { db, ensureSchema } from '@/lib/db';
import { hashPassword, generateReferralCode, generateOtpCode } from '@/lib/auth';
import { apiResponse, apiError } from '@/lib/api-helpers';
import { rateLimit } from '@/lib/rate-limit';
import { sendVerificationEmail } from '@/lib/email';
import { verifyCaptcha, isCaptchaConfigured } from '@/lib/captcha';
import { z } from 'zod';

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1, 'First name is required').optional(),
  lastName: z.string().min(1, 'Last name is required').optional(),
  referralCode: z.string().optional(),
});

export async function POST(request: NextRequest) {
  // Ensure schema columns exist before querying (safety-net for missing columns)
  await ensureSchema();

  const rl = rateLimit(request, true);
  if (!rl.success) {
    return NextResponse.json(
      { success: false, error: { code: 'TOO_MANY_REQUESTS', message: 'Too many registration attempts. Try again in 1 minute.' } },
      { status: 429, headers: { 'Retry-After': '60' } }
    );
  }
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(parsed.error.issues[0].message, 'VALIDATION_ERROR', 400);
    }

    const captchaToken = body.captchaToken as string | undefined;
    const { email: rawEmail, password, firstName, lastName, referralCode } = parsed.data;
    const email = rawEmail.toLowerCase().trim();

    // Verify CAPTCHA if configured
    if (isCaptchaConfigured()) {
      if (!captchaToken) {
        return apiError('CAPTCHA verification required', 'CAPTCHA_REQUIRED', 400);
      }
      const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined;
      const captchaResult = await verifyCaptcha(captchaToken, ip);
      if (!captchaResult.success) {
        return apiError(captchaResult.error || 'CAPTCHA verification failed', 'CAPTCHA_FAILED', 400);
      }
    }

    // Check if email already exists
    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
      return apiError('Email already registered. Please sign in instead.', 'EMAIL_EXISTS', 409);
    }

    // Validate referral code if provided
    let referredById: string | undefined;
    if (referralCode) {
      const referrer = await db.user.findUnique({
        where: { referralCode: referralCode.toUpperCase() },
      });
      if (!referrer) {
        return apiError('Invalid referral code', 'INVALID_REFERRAL_CODE', 400);
      }
      referredById = referrer.id;
    }

    const passwordHash = await hashPassword(password);
    const newReferralCode = generateReferralCode();
    const fullName = `${firstName || ''} ${lastName || ''}`.trim() || undefined;

    const otp = generateOtpCode();

    const user = await db.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email,
          passwordHash,
          referralCode: newReferralCode,
          referredById,
          status: 'pending_verification',
          emailVerified: false,
          verificationCode: otp,
          verificationCodeExpires: new Date(Date.now() + 10 * 60 * 1000),
        },
      });

      await tx.profile.create({
        data: { userId: newUser.id, firstName: firstName || null, lastName: lastName || null },
      });

      await tx.wallet.create({
        data: { userId: newUser.id, type: 'live', balance: 0, availableBalance: 0, lockedBalance: 0 },
      });
      await tx.wallet.create({
        data: { userId: newUser.id, type: 'demo', balance: 0, availableBalance: 0, lockedBalance: 0 },
      });

      if (referredById) {
        await tx.referral.create({
          data: { referrerId: referredById, referredId: newUser.id, code: referralCode!.toUpperCase() },
        });
      }

      return newUser;
    });

    // Send verification OTP email — now throws on failure
    let emailSent = false;
    let emailError: string | undefined;
    try {
      const result = await sendVerificationEmail(email, otp, fullName);
      emailSent = true;
      console.log(`[REGISTER] OTP email sent to ${email} via ${result.provider}, id: ${result.messageId}`);
    } catch (err: any) {
      emailError = err?.message || String(err);
      console.error(`[REGISTER] Verification email FAILED for ${email}:`, emailError);
    }

    return apiResponse(
      {
        user: {
          id: user.id,
          email: user.email,
          status: user.status,
          referralCode: user.referralCode,
          activeMode: user.activeMode,
          kycLevel: user.kycLevel,
          emailVerified: false,
          createdAt: user.createdAt,
        },
        message: emailSent
          ? 'Account created. Please check your email for a verification code.'
          : `Account created, but we had trouble sending your verification email. Use "Resend Code" on the verification page. (${emailError || 'unknown error'})`,
        requiresVerification: true,
        emailSent,
        emailError: emailError || undefined,
        // Bootstrap mode: return OTP when email fails so frontend can display it
        ...(emailSent ? {} : { verificationCode: otp }),
      },
      201
    );
  } catch (error: any) {
    console.error('Registration error:', error);
    if (error.code === 'P2002') {
      return apiError('Email already registered. Please sign in instead.', 'EMAIL_EXISTS', 409);
    }
    return apiError('Internal server error', 'INTERNAL_ERROR', 500);
  }
}
