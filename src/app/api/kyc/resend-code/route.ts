import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, apiResponse, apiError } from '@/lib/api-helpers';
import { sendKycCodeDeliveredEmail } from '@/lib/email';

async function handler(request: NextRequest, _context: any, user: any) {
  try {
    if (!user.kycVerificationCode) {
      return apiError('No active verification code found. Please contact admin to get a code.', 'NO_CODE', 404);
    }

    if (user.kycCodeExpiresAt && new Date(user.kycCodeExpiresAt) < new Date()) {
      return apiError('Your code has expired. Please contact admin to request a new one.', 'CODE_EXPIRED', 403);
    }

    const fullName = user.profile
      ? `${user.profile.firstName || ''} ${user.profile.lastName || ''}`.trim()
      : '';

    try {
      await sendKycCodeDeliveredEmail(user.email, fullName, {
        code: user.kycVerificationCode,
      });
      return apiResponse({ message: 'Verification code has been resent to your email.' });
    } catch (emailErr: any) {
      console.error('KYC resend email failed:', emailErr?.message);
      // Still return the code in bootstrap mode when email fails
      return apiResponse({
        message: 'Email could not be sent, but your code is shown below.',
        emailSent: false,
        code: user.kycVerificationCode,
      });
    }
  } catch (error) {
    console.error('Resend KYC code error:', error);
    return apiError('Failed to resend code', 'RESEND_ERROR', 500);
  }
}

export const POST = requireAuth(handler);
