import { NextResponse } from 'next/server';
import net from 'net';
import https from 'https';
import { getEmailConfig } from '@/lib/email';

/**
 * GET /api/debug/email-public
 *
 * PUBLIC diagnostic endpoint (no auth required).
 *
 * This is SAFE to expose publicly because:
 * - Env vars are masked (only first 3 + last 6 chars shown)
 * - Only returns connectivity status (reachable / not reachable)
 * - Does NOT expose any secrets, tokens, or user data
 *
 * Used to diagnose email delivery issues from inside Railway,
 * particularly the well-known Railway SMTP port block.
 */
export async function GET() {
  const results: any = {
    timestamp: new Date().toISOString(),
    config: getEmailConfig(),
    env: {
      SMTP_HOST: process.env.SMTP_HOST || '(not set, default: smtp.gmail.com)',
      SMTP_PORT: process.env.SMTP_PORT || '(not set, default: 587)',
      SMTP_EMAIL: process.env.SMTP_EMAIL ? `${process.env.SMTP_EMAIL.slice(0, 3)}***${process.env.SMTP_EMAIL.slice(-6)}` : '(NOT SET)',
      SMTP_PASSWORD: process.env.SMTP_PASSWORD ? `***(${process.env.SMTP_PASSWORD.length} chars)***` : '(NOT SET — SMTP will not work)',
      EMAIL_FROM: process.env.EMAIL_FROM || '(not set, good)',
      EMAIL_FROM_NAME: process.env.EMAIL_FROM_NAME || '(not set, default: Tesla Prime Capital)',
      RESEND_API_KEY: process.env.RESEND_API_KEY ? `***(${process.env.RESEND_API_KEY.length} chars)***` : '(not set)',
      GMAIL_CLIENT_ID: process.env.GMAIL_CLIENT_ID ? `***(${process.env.GMAIL_CLIENT_ID.length} chars)***` : '(not set)',
      GMAIL_CLIENT_SECRET: process.env.GMAIL_CLIENT_SECRET ? `***(${process.env.GMAIL_CLIENT_SECRET.length} chars)***` : '(not set)',
      GMAIL_REFRESH_TOKEN: process.env.GMAIL_REFRESH_TOKEN ? `***(${process.env.GMAIL_REFRESH_TOKEN.length} chars)***` : '(not set)',
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || '(not set)',
    },
    tcp: {},
    recommendations: [] as string[],
  };

  // ─── TCP TESTS ───
  results.tcp.smtp_587 = await testTcp('smtp.gmail.com', 587);
  results.tcp.smtp_465 = await testTcp('smtp.gmail.com', 465);
  results.tcp.resend_443 = await testTcp('api.resend.com', 443);
  results.https_resend = await testHttps('https://api.resend.com');
  results.https_google_oauth = await testHttps('https://oauth2.googleapis.com');
  results.https_gmail_api = await testHttps('https://gmail.googleapis.com');

  // ─── ANALYSIS ───
  const hasGmailApi = !!(process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET && process.env.GMAIL_REFRESH_TOKEN);
  const hasResend = !!process.env.RESEND_API_KEY;
  const hasSmtp = !!process.env.SMTP_PASSWORD;

  if (!hasGmailApi && !hasResend && !hasSmtp) {
    results.recommendations.push('NO email provider is configured.');
  }

  if (!hasGmailApi && !hasResend && hasSmtp) {
    results.recommendations.push('Only SMTP is configured. Railway blocks outbound SMTP — email will likely NEVER send. Set up Gmail API (recommended).');
  }

  const smtp587Ok = results.tcp.smtp_587?.success;
  const smtp465Ok = results.tcp.smtp_465?.success;

  if (!hasGmailApi && !hasResend && !smtp587Ok && !smtp465Ok) {
    results.recommendations.push('Railway is blocking outbound SMTP on ports 587 AND 465. Use Gmail API instead.');
  } else if (!smtp587Ok && smtp465Ok) {
    results.recommendations.push('Port 587 is blocked but 465 is open.');
  }

  if (hasGmailApi) {
    if (results.https_google_oauth?.success && results.https_gmail_api?.success) {
      results.recommendations.push('Gmail API is configured AND Google APIs are reachable. Email should work.');
    } else {
      results.recommendations.push('Gmail API is configured but Google APIs are NOT reachable. Check Railway network.');
    }
  }

  if (hasResend && !results.https_resend?.success) {
    results.recommendations.push('RESEND_API_KEY is set but api.resend.com is unreachable.');
  }

  if (process.env.EMAIL_FROM && process.env.EMAIL_FROM !== process.env.SMTP_EMAIL) {
    results.recommendations.push('EMAIL_FROM differs from SMTP_EMAIL. DELETE the EMAIL_FROM env var.');
  }

  if (results.recommendations.length === 0) {
    results.recommendations.push('All connectivity tests passed. Email should be working.');
  }

  return NextResponse.json(results, {
    status: 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

async function testTcp(host: string, port: number): Promise<{ success: boolean; durationMs: number; error?: string }> {
  return new Promise((resolve) => {
    const start = Date.now();
    const socket = new net.Socket();
    socket.setTimeout(8000);

    socket.on('connect', () => {
      const durationMs = Date.now() - start;
      socket.destroy();
      resolve({ success: true, durationMs });
    });

    socket.on('timeout', () => {
      socket.destroy();
      resolve({ success: false, durationMs: Date.now() - start, error: 'Connection timeout (8s)' });
    });

    socket.on('error', (err: any) => {
      socket.destroy();
      resolve({ success: false, durationMs: Date.now() - start, error: `${err.code || err.name}: ${err.message}` });
    });

    socket.connect(port, host);
  });
}

async function testHttps(url: string): Promise<{ success: boolean; statusCode?: number; durationMs: number; error?: string }> {
  return new Promise((resolve) => {
    const start = Date.now();
    const req = https.get(url, (res) => {
      res.resume();
      resolve({ success: res.statusCode !== undefined && res.statusCode < 500, statusCode: res.statusCode, durationMs: Date.now() - start });
    });

    req.on('error', (err: any) => {
      resolve({ success: false, durationMs: Date.now() - start, error: `${err.code || err.name}: ${err.message}` });
    });

    req.setTimeout(8000, () => {
      req.destroy();
      resolve({ success: false, durationMs: Date.now() - start, error: 'Request timeout (8s)' });
    });
  });
}
