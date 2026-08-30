import { NextResponse } from 'next/server';

/**
 * GET /api/debug/email-html
 *
 * PUBLIC endpoint — returns the EXACT HTML that gets sent in verification emails.
 * Use this to verify the logo URL, colors, and template structure being sent.
 *
 * Does NOT send an actual email.
 */
export async function GET() {
  const { sendVerificationEmail } = await import('@/lib/email');

  // Monkey-patch fetch to capture the raw HTTP body sent to Gmail API
  // without actually sending the email.
  const originalFetch = globalThis.fetch;
  let capturedHtml: string | null = null;

  const patchedFetch: typeof fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : (input as Request)?.url;
    if (url?.includes('gmail.googleapis.com') && init?.body) {
      try {
        const body = JSON.parse(init.body as string);
        if (body.raw) {
          const raw = Buffer.from(body.raw, 'base64url').toString('utf-8');
          const htmlStart = raw.indexOf('\r\n\r\n');
          if (htmlStart > -1) {
            capturedHtml = raw.substring(htmlStart + 4);
          }
        }
      } catch {
        // ignore parse errors
      }
      // Return fake success — don't actually send
      return new Response(JSON.stringify({ id: 'DEBUG-CAPTURED-NOT-SENT' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    // Allow token refresh and other calls through
    return originalFetch(input, init);
  };

  globalThis.fetch = patchedFetch;

  try {
    await sendVerificationEmail('debug@example.com', '123456', 'Test User');
  } finally {
    globalThis.fetch = originalFetch;
  }

  if (!capturedHtml) {
    return NextResponse.json(
      { success: false, error: 'Could not capture HTML — provider may not be Gmail API.' },
      { status: 500 }
    );
  }

  return new NextResponse(capturedHtml, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}
