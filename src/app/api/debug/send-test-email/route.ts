import { NextRequest, NextResponse } from 'next/server';
import { sendVerificationEmail } from '@/lib/email';
import { generateOtpCode } from '@/lib/auth';

/**
 * GET /api/debug/send-test-email?email=user@example.com
 *
 * PUBLIC endpoint (no auth required) — used during email setup
 * to verify Gmail API is actually delivering to inboxes.
 *
 * Returns the OTP in the response so you can verify it matches
 * what arrives in your inbox.
 *
 * SAFE to expose publicly because:
 * - Rate-limited (in-memory, 1 request per 10 seconds globally)
 * - Only sends a verification email to the address you specify
 * - No secrets exposed
 */

const LAST_SEND: { time: number; email: string } = { time: 0, email: '' };

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');

  if (!email) {
    return NextResponse.json(
      { success: false, error: 'Missing "email" query parameter. Example: /api/debug/send-test-email?email=you@example.com' },
      { status: 400 }
    );
  }

  // Simple email validation
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { success: false, error: 'Invalid email address' },
      { status: 400 }
    );
  }

  // Rate limit: 1 send per 10 seconds (global, to prevent abuse)
  const now = Date.now();
  if (LAST_SEND.time && now - LAST_SEND.time < 10000) {
    const waitMs = 10000 - (now - LAST_SEND.time);
    return NextResponse.json(
      { success: false, error: `Rate limited. Try again in ${Math.ceil(waitMs / 1000)} seconds.` },
      { status: 429 }
    );
  }
  LAST_SEND.time = now;
  LAST_SEND.email = email;

  const otp = generateOtpCode();
  console.log(`[DEBUG-EMAIL-TEST] Sending test OTP ${otp} to ${email}`);

  try {
    // Pass undefined as name — email template will say "Hello" instead of "Hi Test User"
    const result = await sendVerificationEmail(email, otp, undefined);
    console.log(`[DEBUG-EMAIL-TEST] Result:`, result);

    return NextResponse.json({
      success: result.success,
      provider: result.provider,
      messageId: result.messageId,
      error: result.error,
      attempts: result.attempts, // ← Detailed errors from each provider
      otp: result.success ? otp : undefined,
      email,
      message: result.success
        ? `Test OTP sent to ${email} via ${result.provider}. Check your inbox (and spam folder).`
        : `Failed to send. See "attempts" array for per-provider errors.`,
    });
  } catch (error: any) {
    console.error('[DEBUG-EMAIL-TEST] Error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || String(error) },
      { status: 500 }
    );
  }
}
