import { Resend } from 'resend';
import * as crypto from 'crypto';
import nodemailer from 'nodemailer';
import { RESEND_KEY } from './resend-key';

// ─── CONFIGURATION ───
// Provider priority (highest first):
//   1a. Gmail API via Service Account (HTTPS) — set GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY
//   1b. Gmail API via OAuth2 refresh token   — set GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN
//   2. Resend (HTTPS API)                    — set RESEND_API_KEY
//   3. Gmail SMTP (fallback)                  — set SMTP_EMAIL + SMTP_PASSWORD
//
// Note: SMTP is a fallback. Gmail API and Resend use HTTPS and work everywhere.
// SMTP may be blocked on Railway/cloud, but works on VPS and local servers.
const SMTP_EMAIL = process.env.SMTP_EMAIL || 'teslaprimesupportt@gmail.com';
const SMTP_PASSWORD = process.env.SMTP_PASSWORD || '';
const FROM_NAME = process.env.EMAIL_FROM_NAME || 'TeslaPrime Support';
const RESEND_API_KEY = process.env.RESEND_API_KEY || RESEND_KEY;
// When using Resend without a custom verified domain, fall back to Resend's default sender.
// To use your own domain, verify it at resend.com/domains and set EMAIL_FROM=you@yourdomain.com
const RESEND_DEFAULT_FROM = 'TeslaPrime Support <onboarding@resend.dev>';
// Use custom domain if EMAIL_FROM is set, otherwise fall back to onboarding@resend.dev
// This allows the app to work immediately with onboarding@resend.dev while domain verification is pending
const _customFrom = process.env.EMAIL_FROM || '';
const FROM_EMAIL = _customFrom && _customFrom !== 'onboarding@resend.dev' ? _customFrom : (RESEND_API_KEY ? 'onboarding@resend.dev' : SMTP_EMAIL);

// ─── SMTP Fallback ───
// Gmail SMTP works on VPS/local servers (port 587 with TLS).
// Blocked on Railway/cloud but useful as a last resort.
const USE_SMTP = !!(SMTP_EMAIL && SMTP_PASSWORD);

// ─── Gmail API Method A: Service Account (JWT) ───
// Uses a Google Cloud service account to obtain access tokens via JWT assertion.
// Requires: GOOGLE_CLIENT_EMAIL (service account email) + GOOGLE_PRIVATE_KEY (PEM key)
// Optional: GMAIL_IMPERSONATE_USER (email to send as — defaults to SMTP_EMAIL)
// NOTE: Domain-wide delegation must be enabled in Google Workspace admin console.
const GOOGLE_CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL || '';
const GOOGLE_PRIVATE_KEY = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
const GMAIL_IMPERSONATE_USER = process.env.GMAIL_IMPERSONATE_USER || SMTP_EMAIL;

// ─── Gmail API Method B: OAuth2 Refresh Token ───
// Uses OAuth2 user credentials (from Google Cloud OAuth consent flow).
// Requires: GMAIL_CLIENT_ID + GMAIL_CLIENT_SECRET + GMAIL_REFRESH_TOKEN
const GMAIL_CLIENT_ID = process.env.GMAIL_CLIENT_ID || '';
const GMAIL_CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET || '';
const GMAIL_REFRESH_TOKEN = process.env.GMAIL_REFRESH_TOKEN || '';

// Determine provider — priority: Service Account > OAuth2 Refresh > Resend > SMTP
const USE_SERVICE_ACCOUNT = !!(GOOGLE_CLIENT_EMAIL && GOOGLE_PRIVATE_KEY);
const USE_OAUTH_REFRESH = !USE_SERVICE_ACCOUNT && !!(GMAIL_CLIENT_ID && GMAIL_CLIENT_SECRET && GMAIL_REFRESH_TOKEN);
const USE_GMAIL_API = USE_SERVICE_ACCOUNT || USE_OAUTH_REFRESH;
const USE_RESEND = !USE_GMAIL_API && !!RESEND_API_KEY;
// SMTP is always available as last-resort fallback when SMTP_PASSWORD is set
const USE_SMTP_FALLBACK = USE_SMTP;

if (USE_SERVICE_ACCOUNT) {
  console.log(`[EMAIL] Using Gmail API via Service Account: ${GOOGLE_CLIENT_EMAIL}, sending as: ${GMAIL_IMPERSONATE_USER}`);
} else if (USE_OAUTH_REFRESH) {
  console.log(`[EMAIL] Using Gmail API via OAuth2 refresh token (from: ${SMTP_EMAIL})`);
} else if (USE_RESEND) {
  console.log(`[EMAIL] Using Resend API${USE_SMTP ? ' + SMTP fallback' : ''}`);
} else if (USE_SMTP_FALLBACK) {
  console.log(`[EMAIL] Using Gmail SMTP fallback (from: ${SMTP_EMAIL})`);
} else {
  console.error('');
  console.error('╔══════════════════════════════════════════════════════════════════════╗');
  console.error('║  ❌ EMAIL IS NOT CONFIGURED — ALL EMAILS WILL FAIL               ║');
  console.error('╠══════════════════════════════════════════════════════════════════════╣');
  console.error('║  Set ONE of these in env variables:                              ║');
  console.error('║                                                                ║');
  console.error('║  Option A (recommended): Resend API                              ║');
  console.error('║    RESEND_API_KEY (get one at resend.com)                        ║');
  console.error('║                                                                ║');
  console.error('║  Option B: Gmail API OAuth2                                      ║');
  console.error('║    GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN     ║');
  console.error('║                                                                ║');
  console.error('║  Option C: Gmail SMTP (fallback for VPS/local)                   ║');
  console.error('║    SMTP_EMAIL + SMTP_PASSWORD (Gmail app password)               ║');
  console.error('╚══════════════════════════════════════════════════════════════════════╝');
  console.error('');
}

// ── Startup health check: validate OAuth token on first import ──
// This runs once when the server starts. If the token is expired,
// you'll see the big red box in Railway logs immediately.
if (USE_OAUTH_REFRESH) {
  (async () => {
    try {
      const checkRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: GMAIL_CLIENT_ID,
          client_secret: GMAIL_CLIENT_SECRET,
          refresh_token: GMAIL_REFRESH_TOKEN,
          grant_type: 'refresh_token',
        }).toString(),
      });
      if (checkRes.ok) {
        const d = await checkRes.json() as { expires_in: number };
        console.log(`[EMAIL] ✅ Startup health check PASSED — OAuth token valid (expires in ${d.expires_in}s)`);
      } else {
        const errText = await checkRes.text();
        console.error('');
        console.error('╔══════════════════════════════════════════════════════════════╗');
        console.error('║  ❌ EMAIL STARTUP CHECK FAILED — TOKEN EXPIRED            ║');
        console.error('╠══════════════════════════════════════════════════════════════╣');
        console.error('║  The Gmail OAuth refresh token is dead.                  ║');
        console.error('║  Every email (OTP, welcome, resets) will FAIL until     ║');
        console.error('║  you generate a new token. See scripts/ folder.           ║');
        console.error(`║  Error: ${checkRes.status} — ${errText.slice(0, 40)}`.padEnd(58) + '║');
        console.error('╚══════════════════════════════════════════════════════════════╝');
        console.error('');
      }
    } catch (e: any) {
      console.error('[EMAIL] Startup health check could not reach Google:', e.message);
    }
  })();
}

const SAFE_FROM_EMAIL = FROM_EMAIL;

let _resendClient: Resend | null = null;

function getResendClient(): Resend {
  if (!_resendClient) {
    _resendClient = new Resend(RESEND_API_KEY);
  }
  return _resendClient;
}

export function getEmailConfig() {
  let provider = 'none';
  let hasConfig = false;
  if (USE_SERVICE_ACCOUNT) {
    provider = 'gmail-api-service-account';
    hasConfig = !!(GOOGLE_CLIENT_EMAIL && GOOGLE_PRIVATE_KEY);
  } else if (USE_OAUTH_REFRESH) {
    provider = 'gmail-api-oauth';
    hasConfig = !!(GMAIL_CLIENT_ID && GMAIL_CLIENT_SECRET && GMAIL_REFRESH_TOKEN);
  } else if (USE_RESEND) {
    provider = 'resend';
    hasConfig = !!RESEND_API_KEY;
  } else if (USE_SMTP_FALLBACK) {
    provider = 'smtp';
    hasConfig = USE_SMTP;
  }
  return {
    fromEmail: SAFE_FROM_EMAIL,
    provider,
    hasConfig,
    hasSmtpFallback: USE_SMTP,
    serviceAccount: USE_SERVICE_ACCOUNT ? {
      clientEmail: GOOGLE_CLIENT_EMAIL,
      impersonateUser: GMAIL_IMPERSONATE_USER,
      hasPrivateKey: !!GOOGLE_PRIVATE_KEY,
      privateKeyLength: GOOGLE_PRIVATE_KEY.length,
    } : undefined,
    oauth: USE_OAUTH_REFRESH ? {
      hasClientId: !!GMAIL_CLIENT_ID,
      hasClientSecret: !!GMAIL_CLIENT_SECRET,
      hasRefreshToken: !!GMAIL_REFRESH_TOKEN,
    } : undefined,
    smtp: USE_SMTP_FALLBACK ? {
      email: SMTP_EMAIL,
      hasPassword: !!SMTP_PASSWORD,
    } : undefined,
  };
}

// ─── HELPER: Send email via chosen provider ───
// Priority: Gmail API (HTTPS) → Resend (HTTPS) → SMTP (fallback)
// Returns errors from ALL attempted providers so callers can see what failed.
async function sendEmail(to: string, subject: string, html: string): Promise<{ success: boolean; messageId?: string; error?: string; provider?: string; attempts?: Array<{ provider: string; success: boolean; error?: string }> }> {
  const attempts: Array<{ provider: string; success: boolean; error?: string }> = [];

  // 1) Try Gmail API (HTTPS — bypasses Railway SMTP block)
  //    Supports two auth methods: Service Account (JWT) or OAuth2 refresh token
  if (USE_GMAIL_API) {
    const gmailLabel = USE_SERVICE_ACCOUNT ? 'gmail-api-svc-acct' : 'gmail-api-oauth';
    try {
      const result = await sendViaGmailApi(to, subject, html);
      if (result.success) {
        console.log(`[EMAIL/${gmailLabel}] Sent to ${to}: "${subject}" — id: ${result.messageId}`);
        attempts.push({ provider: gmailLabel, success: true });
        return { success: true, messageId: result.messageId, provider: gmailLabel, attempts };
      }
      console.error(`[EMAIL/${gmailLabel}] Failed for ${to}: ${result.error}. Falling back to Resend...`);
      attempts.push({ provider: gmailLabel, success: false, error: result.error });
    } catch (error: any) {
      console.error(`[EMAIL/${gmailLabel}] Threw for ${to}: ${error?.message || error}. Falling back...`);
      attempts.push({ provider: gmailLabel, success: false, error: error?.message || String(error) });
    }
  }

  // 2) Try Resend (HTTPS API) — tries custom domain first, falls back to onboarding@resend.dev
  if (USE_RESEND) {
    const sendFromAddresses = [SAFE_FROM_EMAIL];
    // If using a custom domain, also try onboarding@resend.dev as fallback
    if (SAFE_FROM_EMAIL !== 'onboarding@resend.dev') {
      sendFromAddresses.push('onboarding@resend.dev');
    }

    for (const fromEmail of sendFromAddresses) {
      try {
        const client = getResendClient();
        const { data, error } = await client.emails.send({
          from: `"${FROM_NAME}" <${fromEmail}>`,
          to: [to],
          subject,
          html,
        }) as { data: { id?: string } | null; error: { message?: string; name?: string } | null };

        if (error) {
          console.error(`[EMAIL/RESEND] ${fromEmail} failed for ${to}: ${error.name} — ${(error.message || '').substring(0, 100)}`);
          attempts.push({ provider: `resend-${fromEmail}`, success: false, error: `${error.name}: ${(error.message || '').substring(0, 100)}` });
          continue; // Try next from address
        } else if (data?.id) {
          console.log(`[EMAIL/RESEND] Sent to ${to} from ${fromEmail}: "${subject}" — id: ${data.id}`);
          attempts.push({ provider: 'resend', success: true });
          return { success: true, messageId: data.id, provider: 'resend', attempts };
        } else {
          console.error(`[EMAIL/RESEND] Unexpected response for ${to}: ${JSON.stringify(data)}`);
          attempts.push({ provider: `resend-${fromEmail}`, success: false, error: 'Unexpected response' });
          continue;
        }
      } catch (error: any) {
        console.error(`[EMAIL/RESEND] ${fromEmail} threw for ${to}: ${(error?.message || '').substring(0, 100)}`);
        attempts.push({ provider: `resend-${fromEmail}`, success: false, error: (error?.message || '').substring(0, 100) || String(error) });
      }
    }
  }

  // 3) Try SMTP fallback (Gmail SMTP on port 587)
  //    Works on VPS/local servers. May be blocked on Railway/cloud.
  if (USE_SMTP_FALLBACK) {
    try {
      const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: { user: SMTP_EMAIL, pass: SMTP_PASSWORD },
      });
      const result = await transporter.sendMail({
        from: `"${FROM_NAME}" <${SMTP_EMAIL}>`,
        to,
        subject,
        html,
      });
      console.log(`[EMAIL/SMTP] Sent to ${to}: "${subject}" — id: ${result.messageId}`);
      attempts.push({ provider: 'smtp', success: true });
      return { success: true, messageId: result.messageId, provider: 'smtp', attempts };
    } catch (error: any) {
      console.error(`[EMAIL/SMTP] Failed for ${to}: ${error?.message || error}`);
      attempts.push({ provider: 'smtp', success: false, error: error?.message || String(error) });
    }
  }

  // All providers failed
  console.error('');
  console.error('EMAIL FAILED - ALL PROVIDERS FAILED');
  console.error('Tried: ' + attempts.map(a => `${a.provider}(${a.success ? 'ok' : 'fail'})`).join(', '));
  console.error('');

  return {
    success: false,
    error: `No email provider succeeded. Tried: ${attempts.map(a => a.provider).join(', ') || 'none configured'}. Set RESEND_API_KEY, Gmail API credentials, or SMTP_EMAIL+SMTP_PASSWORD.`,
    provider: 'none',
    attempts,
  };
}


// ─── GMAIL API (HTTPS) — bypasses Railway SMTP block ───
// Supports TWO authentication methods:
//   A) Service Account (JWT assertion) — GOOGLE_CLIENT_EMAIL + GOOGLE_PRIVATE_KEY
//   B) OAuth2 refresh token          — GMAIL_CLIENT_ID + GMAIL_CLIENT_SECRET + GMAIL_REFRESH_TOKEN
let _cachedAccessToken: { token: string; expiresAt: number } | null = null;

/**
 * Create a JWT assertion signed with the service account's RSA private key.
 * This is used to obtain an OAuth2 access token without user interaction.
 */
function createServiceAccountJwt(): string {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    iss: GOOGLE_CLIENT_EMAIL,
    scope: 'https://mail.google.com/',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
    sub: GMAIL_IMPERSONATE_USER, // Required for domain-wide delegation
  })).toString('base64url');

  const signatureInput = `${header}.${payload}`;
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(signatureInput);
  const signature = sign.sign(GOOGLE_PRIVATE_KEY, 'base64url');

  return `${signatureInput}.${signature}`;
}

async function getGmailAccessToken(): Promise<string> {
  // Return cached token if still valid (with 60s buffer)
  if (_cachedAccessToken && _cachedAccessToken.expiresAt > Date.now() + 60000) {
    return _cachedAccessToken.token;
  }

  let requestBody: string;
  let methodLabel: string;

  if (USE_SERVICE_ACCOUNT) {
    // Method A: Service Account JWT assertion
    methodLabel = 'Service Account JWT';
    const jwt = createServiceAccountJwt();
    requestBody = new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }).toString();
  } else {
    // Method B: OAuth2 refresh token
    methodLabel = 'OAuth2 refresh token';
    requestBody = new URLSearchParams({
      client_id: GMAIL_CLIENT_ID,
      client_secret: GMAIL_CLIENT_SECRET,
      refresh_token: GMAIL_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }).toString();
  }

  console.log(`[EMAIL] Obtaining Gmail API access token via ${methodLabel}...`);

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: requestBody,
  });

  if (!res.ok) {
    const text = await res.text();
    const isInvalidGrant = text.includes('invalid_grant');
    if (isInvalidGrant) {
      console.error('');
      console.error('╔══════════════════════════════════════════════════════════════╗');
      console.error('║  ⚠️  EMAIL IS BROKEN — GMAIL OAUTH REFRESH TOKEN EXPIRED   ║');
      console.error('╠══════════════════════════════════════════════════════════════╣');
      console.error('║  The refresh token is expired or revoked.                  ║');
      console.error('║  NO emails (OTP, welcome, password reset) will be sent.    ║');
      console.error('║                                                            ║');
      console.error('║  FIX: Re-authorize and get a new refresh token:            ║');
      console.error('║    1. GMAIL_CLIENT_ID=<id> node scripts/gen-oauth-url.js   ║');
      console.error('║    2. Open URL, authorize, copy redirect URL               ║');
      console.error('║    3. GMAIL_CLIENT_ID=<id> GMAIL_CLIENT_SECRET=<s> \       ║');
      console.error('║       node scripts/exchange-oauth-code.js <code>           ║');
      console.error('║    4. Update GMAIL_REFRESH_TOKEN in Railway env vars        ║');
      console.error('║                                                            ║');
      console.error(`║  Provider: ${methodLabel}                                   `.slice(0, 58) + '║');
      console.error('╚══════════════════════════════════════════════════════════════╝');
      console.error('');
    }
    throw new Error(`Gmail API token request failed (${res.status}) via ${methodLabel}: ${text}`);
  }

  const data = await res.json() as { access_token: string; expires_in: number };
  _cachedAccessToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in * 1000),
  };
  console.log(`[EMAIL] Gmail API access token obtained via ${methodLabel}, expires in ${data.expires_in}s`);
  return data.access_token;
}

async function sendViaGmailApi(to: string, subject: string, html: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const accessToken = await getGmailAccessToken();

  // Build a plain-text fallback from the HTML (strips tags).
  // Gmail's spam filter penalizes HTML-only emails — having a text/plain
  // alternative significantly improves inbox placement.
  const plainText = html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

  // Build a proper multipart/alternative MIME message.
  // Headers designed to maximize inbox placement:
  //   - List-Unsubscribe + List-Unsubscribe-Post: Gmail shows "Unsubscribe"
  //     button in inbox preview → signals legitimate sender → better placement
  //   - X-Entity-ID + X-Priority: signals transactional email
  //   - multipart/alternative with text/plain + text/html: avoids spam penalty
  //     for HTML-only messages
  const boundary = '----=_TeslaPrime_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
  const fromHeader = `From: "${FROM_NAME}" <${SMTP_EMAIL}>`;
  const toHeader = `To: ${to}`;
  const subjectHeader = `Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`;
  const mimeVersion = 'MIME-Version: 1.0';
  const contentType = `Content-Type: multipart/alternative; boundary="${boundary}"`;
  const listUnsubscribe = `List-Unsubscribe: <mailto:${SMTP_EMAIL}?subject=Unsubscribe>`;
  const listUnsubscribePost = 'List-Unsubscribe-Post: List-Unsubscribe=One-Click';
  const xEntityId = 'X-Entity-ID: TeslaPrime/Transactional';
  const xPriority = 'X-Priority: 1';
  const xAutoResponseSuppress = 'X-Auto-Response-Suppress: All';

  const textPart = `--${boundary}\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: 7bit\r\n\r\n${plainText}`;
  const htmlPart = `--${boundary}\r\nContent-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n${Buffer.from(html).toString('base64')}`;
  const closing = `--${boundary}--`;

  const rawMessage = [
    fromHeader, toHeader, subjectHeader, mimeVersion, contentType,
    listUnsubscribe, listUnsubscribePost, xEntityId, xPriority, xAutoResponseSuppress,
    '', textPart, '', htmlPart, '', closing,
  ].join('\r\n');

  const raw = Buffer.from(rawMessage).toString('base64url');

  // When using a service account, we must specify the user to send as
  // (domain-wide delegation). For OAuth2 refresh token, 'me' refers to the
  // authorized user automatically.
  const gmailUser = USE_SERVICE_ACCOUNT ? GMAIL_IMPERSONATE_USER : 'me';

  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/${encodeURIComponent(gmailUser)}/messages/send`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw }),
  });

  if (!res.ok) {
    const text = await res.text();
    return { success: false, error: `Gmail API ${res.status}: ${text}` };
  }

  const data = await res.json() as { id: string };
  return { success: true, messageId: data.id };
}

// ─── PRE-LOAD LOGO ───
// NOTE: Gmail (and most modern email clients) silently strips base64-embedded
// images for security reasons. We must use a publicly-accessible HTTPS URL
// for the logo instead.
//
// DOMAIN: teslaprime.com (live and verified serving the Next.js app)
// Logo loads from your custom domain — looks professional, no Railway URL
// visible in email image sources.
//
// LOGO STRATEGY (Gmail-friendly):
//   - Use optimized PNG (192x192, ~25KB) — small enough for Gmail's image proxy
//   - Filename `email-logo-v2.png` is fresh (busts Gmail's cached failed fetch
//     from when we served a 1024x1024 JPG)
//   - Per-send timestamp nonce guarantees Gmail never serves a cached image
//   - Alt text is EMPTY so a failed image load shows nothing (the styled brand
//     text below the image carries the brand identity regardless)
// DOMAIN: Will be set to your TeslaPrime domain once purchased.
// For now, uses NEXT_PUBLIC_APP_URL env var (Railway will set this).
// Falls back to placeholder if env var not set.
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://teslaprimecap.com';
// Logo URL — no query string (some email proxies mishandle ?param=value)
// Path-based versioning via filename `email-logo-v2.png` is sufficient.
// If we need to bust cache in the future, rename to v3.png.
function getLogoUrl(): string {
  return `${APP_URL}/email-logo-v2.png`;
}

// ============================================================
// SHARED TEMPLATE BUILDERS — Premium Tesla-branded design
// Color system:
//   Brand red: #B91C1C (deep crimson — looks sophisticated, not orange)
//   Background: pure black #000000 → #0a0a0a
//   Text: #FFFFFF / #888888 / #555555 / #333333
//   All gradients removed — Gmail renders them as orange-tinted
// ============================================================

function logoHtml(): string {
  // PURE HTML/CSS LOGO MARK
  // Premium Tesla T shield with subtle inner glow effect
  return `<table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto 20px"><tr><td style="width:72px;height:72px;background:linear-gradient(135deg,#0a0a0a 0%,#111111 100%);border:2px solid #B91C1C;border-radius:18px;text-align:center;vertical-align:middle;line-height:72px;font-size:40px;font-weight:900;color:#CC0000;font-family:'Helvetica Neue',Arial,sans-serif;letter-spacing:-2px;box-shadow:0 0 20px rgba(185,28,28,0.15),inset 0 0 12px rgba(0,0,0,0.3)">T</td></tr></table>`;
}

function headerBlock(): string {
  // Premium header with:
  //   1. CSS logo mark (Tesla T shield)
  //   2. Brand wordmark "TESLA PRIME"
  //   3. Subtle accent line
  return `
    <div style="background-color:#000000;padding:48px 32px 36px;text-align:center;border-bottom:2px solid #B91C1C">
      ${logoHtml()}
      <h1 style="color:#ffffff;margin:0;font-size:18px;font-weight:700;letter-spacing:5px;font-family:'Helvetica Neue',Arial,sans-serif">TESLA PRIME</h1>
      <p style="color:#B91C1C;margin:10px 0 0;font-size:9px;letter-spacing:5px;text-transform:uppercase;font-weight:600;font-family:'Helvetica Neue',Arial,sans-serif">Support</p>
      <div style="width:40px;height:2px;background-color:#B91C1C;margin:16px auto 0;border-radius:1px"></div>
    </div>`;
}

function otpBlock(otp: string, expiresIn: string): string {
  // Premium card with shield icon, refined red accent, monospace OTP
  return `
    <div style="background-color:#0a0a0a;border:1px solid #1f1f1f;border-left:3px solid #B91C1C;border-radius:6px;padding:32px 28px;text-align:center;margin:32px 0">
      <div style="margin:0 0 20px;display:inline-block">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align:middle">
          <path d="M12 2L3 7v5c0 5.5 3.8 10.7 9 12 5.2-1.3 9-6.5 9-12V7l-9-5z" stroke="#B91C1C" stroke-width="1.5" stroke-linejoin="round"/>
          <path d="M9 12l2 2 4-4" stroke="#B91C1C" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <p style="color:#888888;font-size:10px;text-transform:uppercase;letter-spacing:3px;margin:0 0 20px;font-weight:600;font-family:'Helvetica Neue',Arial,sans-serif">Your Verification Code</p>
      <div style="font-size:34px;font-weight:700;color:#ffffff;letter-spacing:14px;font-family:'SF Mono',Monaco,'Cascadia Code','Roboto Mono',Menlo,monospace;display:block;padding:0 0 4px;text-indent:14px">${otp}</div>
      <div style="width:80px;height:1px;background-color:#1a1a1a;margin:20px auto"></div>
      <p style="color:#B91C1C;font-size:10px;margin:0;font-weight:600;letter-spacing:1px;text-transform:uppercase;font-family:'Helvetica Neue',Arial,sans-serif">Expires in ${expiresIn}</p>
    </div>`;
}

function ctaButton(text: string, url: string): string {
  return `
    <div style="text-align:center;margin:32px 0">
      <a href="${url}" style="display:inline-block;background-color:#B91C1C;color:#ffffff;padding:16px 44px;border-radius:4px;text-decoration:none;font-weight:700;font-size:13px;letter-spacing:2px;text-transform:uppercase;font-family:'Helvetica Neue',Arial,sans-serif">${text}</a>
    </div>`;
}

function footerBlock(): string {
  const year = new Date().getFullYear();
  return `
    <div style="background-color:#000000;padding:32px 32px 28px;text-align:center;border-top:1px solid #1a1a1a">
      <p style="color:#666666;font-size:11px;margin:0 0 10px;font-weight:700;letter-spacing:3px;font-family:'Helvetica Neue',Arial,sans-serif">TESLA PRIME</p>
      <div style="width:24px;height:2px;background-color:#B91C1C;margin:0 auto 14px;border-radius:1px"></div>
      <p style="color:#555555;font-size:10px;margin:0 0 16px;line-height:1.7;letter-spacing:0.5px">
        Premium investment platform<br>
        Daily returns up to 1.8%
      </p>
      <p style="color:#333333;font-size:9px;margin:0;line-height:1.6;letter-spacing:0.5px">
        &copy; ${year} TeslaPrime Support. All rights reserved.<br>
        This is an automated message. Please do not reply.
      </p>
    </div>`;
}

function emailWrapper(innerHtml: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="x-apple-disable-message-reformatting"></head>
    <body style="margin:0;padding:0;background-color:#000000;font-family:'Helvetica Neue','Segoe UI',Arial,Helvetica,sans-serif;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#000000;min-height:100vh">
        <tr><td align="center" style="padding:32px 16px">
          <table role="presentation" width="540" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;border-radius:8px;overflow:hidden;border:1px solid #1a1a1a;box-shadow:0 4px 32px rgba(0,0,0,0.5)">
            ${innerHtml}
          </table>
          <p style="color:#1a1a1a;font-size:9px;margin:20px 0 0;text-align:center;letter-spacing:2px;text-transform:uppercase">TeslaPrime // Invest with Confidence</p>
        </td></tr>
      </table>
    </body>
    </html>`;
}

function contentArea(bodyHtml: string): string {
  return `<div style="padding:36px 32px">${bodyHtml}</div>`;
}

// ─── WRAPPER: throws on failure (for callers that need real error handling) ───
// Most exported functions just return the sendEmail() result (success/failure object).
// This wrapper THROWS when delivery fails, so callers that await get a real exception.
// Used by: verify-email, forgot-password, verify-action, kyc/resend-code, admin kyc-code
async function sendEmailOrThrow(to: string, subject: string, html: string): Promise<{ success: true; messageId: string; provider: string }> {
  const result = await sendEmail(to, subject, html);
  if (!result.success) {
    const errMsg = result.error || 'Unknown email error';
    console.error(`[EMAIL] FAILED to send to ${to}: "${subject}" — provider: ${result.provider}, error: ${errMsg}`);
    throw new Error(`Email delivery failed: ${errMsg} (provider: ${result.provider || 'none'})`);
  }
  return result as { success: true; messageId: string; provider: string };
}

// ============================================================
// EMAIL FUNCTIONS
// ============================================================

export async function sendVerificationEmail(to: string, otp: string, name?: string) {
  const greeting = name ? `Hello ${name}` : 'Hello';
  console.log(`[EMAIL] Sending verification OTP to ${to}, from: ${SAFE_FROM_EMAIL}`);

  const body = contentArea(`
    <p style="color:#ffffff;font-size:14px;margin:0 0 16px;font-weight:500;letter-spacing:0.5px">${greeting},</p>
    <p style="color:#888888;font-size:13px;margin:0 0 4px;line-height:1.8;letter-spacing:0.3px">Thank you for opening an account with TeslaPrime. To complete your registration and activate your investment portfolio, please enter the verification code below:</p>
    ${otpBlock(otp, '10 minutes')}
    <p style="color:#555555;font-size:11px;margin:0;line-height:1.8;letter-spacing:0.3px">Enter this code on the verification page to activate your account. If you did not request this account, you can safely ignore this email. No action is required.</p>
  `);

  const html = emailWrapper(headerBlock() + body + footerBlock());
  return sendEmailOrThrow(to, 'Your Verification Code | TeslaPrime Support', html);
}

export async function sendPasswordResetEmail(to: string, otp: string, name?: string) {
  const greeting = name ? `Hello ${name}` : 'Hello';
  console.log(`[EMAIL] Sending password reset OTP to ${to}, from: ${SAFE_FROM_EMAIL}`);

  const body = contentArea(`
    <p style="color:#ffffff;font-size:14px;margin:0 0 16px;font-weight:500;letter-spacing:0.5px">${greeting},</p>
    <p style="color:#888888;font-size:13px;margin:0 0 4px;line-height:1.8;letter-spacing:0.3px">We received a request to reset the password on your TeslaPrime account. Use the verification code below to set a new password:</p>
    ${otpBlock(otp, '15 minutes')}
    <p style="color:#555555;font-size:11px;margin:0;line-height:1.8;letter-spacing:0.3px">If you did not request a password reset, please ignore this email. Your password will remain unchanged and your account is secure.</p>
  `);

  const html = emailWrapper(headerBlock() + body + footerBlock());
  return sendEmailOrThrow(to, 'Password Reset Code | TeslaPrime Support', html);
}

export async function sendWelcomeEmail(to: string, name?: string) {
  const greeting = name ? `Dear ${name}` : 'Welcome';
  console.log(`[EMAIL] Sending welcome email to ${to}, from: ${SAFE_FROM_EMAIL}`);
  // Use custom domain for all links
  const appUrl = APP_URL;

  const body = contentArea(`
    <p style="color:#ffffff;font-size:14px;margin:0 0 16px;font-weight:500;letter-spacing:0.5px">${greeting},</p>
    <p style="color:#888888;font-size:13px;margin:0 0 24px;line-height:1.8;letter-spacing:0.3px">Your TeslaPrime account has been successfully created and verified. Welcome to a premium investment experience built around transparency, performance, and security.</p>
    <div style="background-color:#0a0a0a;border:1px solid #1a1a1a;border-left:3px solid #B91C1C;border-radius:6px;padding:24px 28px;margin:0 0 28px">
      <p style="color:#B91C1C;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:2px;margin:0 0 16px;font-family:'Helvetica Neue',Arial,sans-serif">What's Next?</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:6px 0;color:#666666;font-size:12px;width:24px;vertical-align:top">01</td>
          <td style="padding:6px 0;color:#cccccc;font-size:13px;line-height:1.6;letter-spacing:0.3px">Choose an investment plan matched to your financial goals</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#666666;font-size:12px;vertical-align:top">02</td>
          <td style="padding:6px 0;color:#cccccc;font-size:13px;line-height:1.6;letter-spacing:0.3px">Fund your account via crypto transfer or bank wire</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#666666;font-size:12px;vertical-align:top">03</td>
          <td style="padding:6px 0;color:#cccccc;font-size:13px;line-height:1.6;letter-spacing:0.3px">Watch your capital grow with daily returns, paid in real time</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#666666;font-size:12px;vertical-align:top">04</td>
          <td style="padding:6px 0;color:#cccccc;font-size:13px;line-height:1.6;letter-spacing:0.3px">Withdraw your profits on demand, processed within minutes</td>
        </tr>
      </table>
    </div>
    ${ctaButton('Sign In to Your Account', `${appUrl}/login`)}
    <p style="color:#555555;font-size:11px;margin:20px 0 0;line-height:1.7;letter-spacing:0.3px">If you have any questions, our client services team is available 24/7 through the platform.</p>
  `);

  const html = emailWrapper(headerBlock() + body + footerBlock());
  return sendEmail(to, 'Welcome to TeslaPrime | Account Activated', html);
}

export async function sendAdminNotificationEmail(to: string, name: string, options: {
  type: 'kyc_approved' | 'kyc_rejected' | 'deposit_confirmed' | 'deposit_rejected' | 'withdrawal_approved' | 'withdrawal_rejected';
  title: string;
  message: string;
  amount?: string;
  adminMessage?: string;
  attachmentUrl?: string;
}) {
  const { type, title, message, amount, adminMessage, attachmentUrl } = options;
  const greeting = name ? `Hi ${name}` : 'Hello';

  const typeConfig: Record<string, { color: string; bgColor: string; icon: string; label: string }> = {
    kyc_approved: { color: '#22C55E', bgColor: '#0a1f0f', icon: '&#10003;', label: 'APPROVED' },
    kyc_rejected: { color: '#EF4444', bgColor: '#1f0a0a', icon: '&#10007;', label: 'REJECTED' },
    deposit_confirmed: { color: '#22C55E', bgColor: '#0a1f0f', icon: '&#10003;', label: 'CONFIRMED' },
    deposit_rejected: { color: '#EF4444', bgColor: '#1f0a0a', icon: '&#10007;', label: 'REJECTED' },
    withdrawal_approved: { color: '#22C55E', bgColor: '#0a1f0f', icon: '&#10003;', label: 'APPROVED' },
    withdrawal_rejected: { color: '#EF4444', bgColor: '#1f0a0a', icon: '&#10007;', label: 'REJECTED' },
  };
  const cfg = typeConfig[type] || { color: '#CC0000', bgColor: '#1f0a0a', icon: '&#9733;', label: 'NOTICE' };

  const body = contentArea(`
    <p style="color:#ffffff;font-size:14px;margin:0 0 24px;font-weight:500;letter-spacing:0.5px">${greeting},</p>
    <div style="text-align:center;margin:0 0 24px">
      <div style="display:inline-block;width:56px;height:56px;border-radius:50%;background:${cfg.bgColor};border:1px solid ${cfg.color};text-align:center;line-height:54px;font-size:24px;color:${cfg.color};box-shadow:0 0 0 4px rgba(204,0,0,0.05)">${cfg.icon}</div>
    </div>
    <div style="text-align:center;margin:0 0 24px">
      <span style="display:inline-block;color:${cfg.color};font-size:9px;font-weight:700;letter-spacing:3px;padding:6px 14px;border:1px solid ${cfg.color};border-radius:3px;text-transform:uppercase;font-family:'Helvetica Neue',Arial,sans-serif">${cfg.label}</span>
    </div>
    <h2 style="color:#ffffff;text-align:center;font-size:18px;margin:0 0 16px;font-weight:700;letter-spacing:0.5px;font-family:'Helvetica Neue',Arial,sans-serif">${title}</h2>
    <p style="color:#888888;font-size:13px;margin:0 0 24px;line-height:1.8;text-align:center;letter-spacing:0.3px">${message}</p>
    ${amount ? `<div style="background:#0a0a0a;border:1px solid #1a1a1a;border-left:3px solid ${cfg.color};border-radius:8px;padding:24px;text-align:center;margin:0 0 24px">
      <p style="color:#666666;font-size:9px;text-transform:uppercase;letter-spacing:3px;margin:0 0 12px;font-weight:600;font-family:'Helvetica Neue',Arial,sans-serif">Amount</p>
      <span style="font-size:28px;font-weight:700;color:#ffffff;font-family:'Helvetica Neue',Arial,sans-serif;letter-spacing:1px">${amount}</span>
    </div>` : ''}
    ${adminMessage ? `<div style="background:#0a0a0a;border:1px solid #1a1a1a;border-left:3px solid #F59E0B;border-radius:8px;padding:20px 24px;margin:0 0 24px">
      <p style="color:#F59E0B;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:2px;margin:0 0 10px;font-family:'Helvetica Neue',Arial,sans-serif">Message from TeslaPrime</p>
      <p style="color:#cccccc;font-size:13px;margin:0;line-height:1.8;letter-spacing:0.3px">${adminMessage}</p>
    </div>` : ''}
    ${attachmentUrl ? ctaButton('View Attachment', attachmentUrl) : ''}
    <p style="color:#555555;font-size:11px;margin:20px 0 0;line-height:1.7;text-align:center;letter-spacing:0.3px">If you have any questions, contact our client services team or visit your dashboard for more details.</p>
  `);

  const html = emailWrapper(headerBlock() + body + footerBlock());
  return sendEmail(to, `${title} | TeslaPrime Support`, html);
}

// ── KYC Verification Code Required Email ──
export async function sendKycCodeRequiredEmail(to: string, name: string, options: {
  adminMessage?: string;
}) {
  const { adminMessage } = options;
  const greeting = name ? `Hello ${name}` : 'Hello';

  const body = contentArea(`
    <p style="color:#ffffff;font-size:14px;margin:0 0 24px;font-weight:500;letter-spacing:0.5px">${greeting},</p>
    <div style="text-align:center;margin:0 0 24px">
      <div style="display:inline-block;width:56px;height:56px;border-radius:50%;background:#1f0a0a;border:1px solid #CC0000;text-align:center;line-height:54px;font-size:24px;color:#CC0000;box-shadow:0 0 0 4px rgba(204,0,0,0.05)">&#9733;</div>
    </div>
    <div style="text-align:center;margin:0 0 24px">
      <span style="display:inline-block;color:#CC0000;font-size:9px;font-weight:700;letter-spacing:3px;padding:6px 14px;border:1px solid #CC0000;border-radius:3px;text-transform:uppercase;font-family:'Helvetica Neue',Arial,sans-serif">ACTION REQUIRED</span>
    </div>
    <h2 style="color:#ffffff;text-align:center;font-size:18px;margin:0 0 16px;font-weight:700;letter-spacing:0.5px;font-family:'Helvetica Neue',Arial,sans-serif">KYC Verification Code Required</h2>
    <p style="color:#888888;font-size:13px;margin:0 0 24px;line-height:1.8;text-align:center;letter-spacing:0.3px">
      To proceed with your KYC verification, you are required to obtain a KYC Verification Code from our administration team.
    </p>
    <div style="background:#0a0a0a;border:1px solid #1a1a1a;border-left:3px solid #CC0000;border-radius:8px;padding:24px;margin:0 0 24px">
      <p style="color:#CC0000;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:2px;margin:0 0 12px;font-family:'Helvetica Neue',Arial,sans-serif">How to Get Your Code</p>
      <p style="color:#cccccc;font-size:13px;margin:0 0 12px;line-height:1.8;letter-spacing:0.3px">
        Contact our support team through either of the following channels:
      </p>
      <ul style="color:#cccccc;font-size:13px;margin:0;padding:0 0 0 20px;line-height:2;letter-spacing:0.3px">
        <li><strong style="color:#ffffff">Live Chat:</strong> Use the chat widget on your dashboard</li>
        <li><strong style="color:#ffffff">Email:</strong> ${SAFE_FROM_EMAIL}</li>
      </ul>
    </div>
    <div style="background:#0a0a0a;border:1px solid #1a1a1a;border-left:3px solid #F59E0B;border-radius:8px;padding:20px 24px;margin:0 0 24px">
      <p style="color:#F59E0B;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:2px;margin:0 0 10px;font-family:'Helvetica Neue',Arial,sans-serif">Important</p>
      <p style="color:#cccccc;font-size:13px;margin:0;line-height:1.8;letter-spacing:0.3px">
        You will not be able to submit KYC documents until you enter a valid verification code. This is a mandatory step to ensure the security and integrity of your account verification process.
      </p>
    </div>
    ${adminMessage ? `<div style="background:#0a0a0a;border:1px solid #1a1a1a;border-left:3px solid #22C55E;border-radius:8px;padding:20px 24px;margin:0 0 24px">
      <p style="color:#22C55E;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:2px;margin:0 0 10px;font-family:'Helvetica Neue',Arial,sans-serif">Message from Support</p>
      <p style="color:#cccccc;font-size:13px;margin:0;line-height:1.8;letter-spacing:0.3px">${adminMessage}</p>
    </div>` : ''}
    <p style="color:#555555;font-size:11px;margin:20px 0 0;line-height:1.7;text-align:center;letter-spacing:0.3px">If you have any questions, our support team is available 24/7 to assist you.</p>
  `);

  const html = emailWrapper(headerBlock() + body + footerBlock());
  return sendEmailOrThrow(to, 'KYC Verification Code Required | TeslaPrime Support', html);
}

// ── KYC Verification Code Delivered Email ──
export async function sendKycCodeDeliveredEmail(to: string, name: string, options: {
  code: string;
  adminMessage?: string;
}) {
  const { code, adminMessage } = options;
  const greeting = name ? `Hello ${name}` : 'Hello';

  const body = contentArea(`
    <p style="color:#ffffff;font-size:14px;margin:0 0 24px;font-weight:500;letter-spacing:0.5px">${greeting},</p>
    <div style="text-align:center;margin:0 0 24px">
      <div style="display:inline-block;width:56px;height:56px;border-radius:50%;background:#0a1a0a;border:1px solid #22C55E;text-align:center;line-height:54px;font-size:24px;color:#22C55E;box-shadow:0 0 0 4px rgba(34,197,94,0.05)">&#10003;</div>
    </div>
    <div style="text-align:center;margin:0 0 24px">
      <span style="display:inline-block;color:#22C55E;font-size:9px;font-weight:700;letter-spacing:3px;padding:6px 14px;border:1px solid #22C55E;border-radius:3px;text-transform:uppercase;font-family:'Helvetica Neue',Arial,sans-serif">CODE ISSUED</span>
    </div>
    <h2 style="color:#ffffff;text-align:center;font-size:18px;margin:0 0 16px;font-weight:700;letter-spacing:0.5px;font-family:'Helvetica Neue',Arial,sans-serif">Your KYC Verification Code</h2>
    <p style="color:#888888;font-size:13px;margin:0 0 24px;line-height:1.8;text-align:center;letter-spacing:0.3px">
      Your KYC Verification Code has been issued by our admin team. Please use this code to complete your Level 1 KYC verification on the platform.
    </p>
    <div style="background:#0a0a0a;border:2px solid #22C55E;border-radius:12px;padding:28px;margin:0 0 24px;text-align:center">
      <p style="color:#22C55E;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:2px;margin:0 0 16px;font-family:'Helvetica Neue',Arial,sans-serif">Your Verification Code</p>
      <p style="color:#ffffff;font-size:28px;font-weight:700;letter-spacing:6px;margin:0;font-family:'Courier New',monospace">${code}</p>
    </div>
    <div style="background:#0a0a0a;border:1px solid #1a1a1a;border-left:3px solid #3B82F6;border-radius:8px;padding:20px 24px;margin:0 0 24px">
      <p style="color:#3B82F6;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:2px;margin:0 0 10px;font-family:'Helvetica Neue',Arial,sans-serif">How to Use This Code</p>
      <ol style="color:#cccccc;font-size:13px;margin:0;padding:0 0 0 20px;line-height:2.2;letter-spacing:0.3px">
        <li>Go to the <strong style="color:#ffffff">KYC Verification</strong> page on your dashboard</li>
        <li>Upload your ID documents (front and back)</li>
        <li>Enter this code when prompted</li>
        <li>Submit your documents for review</li>
      </ol>
    </div>
    ${adminMessage ? `<div style="background:#0a0a0a;border:1px solid #1a1a1a;border-left:3px solid #CC0000;border-radius:8px;padding:20px 24px;margin:0 0 24px">
      <p style="color:#CC0000;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:2px;margin:0 0 10px;font-family:'Helvetica Neue',Arial,sans-serif">Message from Admin</p>
      <p style="color:#cccccc;font-size:13px;margin:0;line-height:1.8;letter-spacing:0.3px">${adminMessage}</p>
    </div>` : ''}
    <div style="background:#0a0a0a;border:1px solid #1a1a1a;border-left:3px solid #F59E0B;border-radius:8px;padding:20px 24px;margin:0 0 24px">
      <p style="color:#F59E0B;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:2px;margin:0 0 10px;font-family:'Helvetica Neue',Arial,sans-serif">Security Notice</p>
      <p style="color:#cccccc;font-size:13px;margin:0;line-height:1.8;letter-spacing:0.3px">
        This code is for your use only. Do not share it with anyone. If you did not request this code, please contact support immediately.
      </p>
    </div>
    <p style="color:#555555;font-size:11px;margin:20px 0 0;line-height:1.7;text-align:center;letter-spacing:0.3px">If you have any questions, our support team is available 24/7 to assist you.</p>
  `);

  const html = emailWrapper(headerBlock() + body + footerBlock());
  return sendEmailOrThrow(to, 'Your KYC Verification Code | TeslaPrime Support', html);
}

// ── Vehicle Order Receipt / Invoice Email ──
export async function sendVehicleOrderReceipt(to: string, options: {
  orderNumber: string;
  vehicleName: string;
  vehicleImage?: string;
  selectedColor: string;
  selectedInterior: string;
  totalPrice: number;
  depositAmount: number;
  estimatedDelivery: string;
  fullName: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}) {
  const {
    orderNumber, vehicleName, selectedColor, selectedInterior,
    totalPrice, depositAmount, estimatedDelivery,
    fullName, address, city, state, postalCode, country,
  } = options;

  const COLOR_HEX_MAP: Record<string, string> = {
    pearl_white: '#F5F5F5', solid_black: '#1A1A1A', midnight_silver: '#6E7681',
    deep_blue: '#1E3A5F', red_multi_coat: '#CC0000', ultra_red: '#B71C1C',
    quick_silver: '#9CA3AF', blue_multi_coat: '#3B82F6',
  };
  const COLOR_NAME_MAP: Record<string, string> = {
    pearl_white: 'Pearl White', solid_black: 'Solid Black', midnight_silver: 'Midnight Silver',
    deep_blue: 'Deep Blue', red_multi_coat: 'Red Multi-Coat', ultra_red: 'Ultra Red',
    quick_silver: 'Quick Silver', blue_multi_coat: 'Blue Multi-Coat',
  };
  const colorHex = COLOR_HEX_MAP[selectedColor] || '#888';
  const colorName = COLOR_NAME_MAP[selectedColor] || selectedColor;
  const orderDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const body = contentArea(`
    <p style="color:#ffffff;font-size:14px;margin:0 0 20px;font-weight:500;letter-spacing:0.5px">Dear ${fullName},</p>
    <p style="color:#888888;font-size:13px;margin:0 0 24px;line-height:1.8;letter-spacing:0.3px">Thank you for your order. Your vehicle purchase has been confirmed and is being processed. Below is your official order receipt.</p>

    <!-- Order Confirmation Badge -->
    <div style="text-align:center;margin:0 0 28px">
      <span style="display:inline-block;color:#22C55E;font-size:9px;font-weight:700;letter-spacing:3px;padding:6px 16px;border:1px solid #22C55E;border-radius:3px;text-transform:uppercase;font-family:'Helvetica Neue',Arial,sans-serif">Order Confirmed</span>
    </div>

    <!-- Order Number & Date -->
    <div style="background:#0a0a0a;border:1px solid #1a1a1a;border-radius:8px;padding:20px 24px;margin:0 0 20px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:0 0 8px">
            <p style="color:#666666;font-size:9px;text-transform:uppercase;letter-spacing:2px;margin:0;font-weight:600;font-family:'Helvetica Neue',Arial,sans-serif">Order Number</p>
            <p style="color:#ffffff;font-size:16px;font-weight:700;margin:4px 0 0;font-family:'SF Mono',Monaco,monospace;letter-spacing:1px">${orderNumber}</p>
          </td>
          <td style="padding:0 0 8px;text-align:right">
            <p style="color:#666666;font-size:9px;text-transform:uppercase;letter-spacing:2px;margin:0;font-weight:600;font-family:'Helvetica Neue',Arial,sans-serif">Order Date</p>
            <p style="color:#ffffff;font-size:13px;margin:4px 0 0;font-weight:500">${orderDate}</p>
          </td>
        </tr>
      </table>
    </div>

    <!-- Vehicle Details -->
    <div style="background:#0a0a0a;border:1px solid #1a1a1a;border-left:3px solid #CC0000;border-radius:8px;padding:24px;margin:0 0 20px">
      <p style="color:#CC0000;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:2px;margin:0 0 16px;font-family:'Helvetica Neue',Arial,sans-serif">Vehicle Details</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #1a1a1a;color:#666666;font-size:11px;width:40%;letter-spacing:0.3px">Vehicle</td>
          <td style="padding:8px 0;border-bottom:1px solid #1a1a1a;color:#ffffff;font-size:13px;font-weight:600">${vehicleName}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #1a1a1a;color:#666666;font-size:11px;letter-spacing:0.3px">Exterior Color</td>
          <td style="padding:8px 0;border-bottom:1px solid #1a1a1a;color:#ffffff;font-size:13px">
            <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${colorHex};border:1px solid rgba(255,255,255,0.2);vertical-align:middle;margin-right:6px"></span>
            ${colorName}
          </td>
        </tr>
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #1a1a1a;color:#666666;font-size:11px;letter-spacing:0.3px">Interior</td>
          <td style="padding:8px 0;border-bottom:1px solid #1a1a1a;color:#ffffff;font-size:13px">${selectedInterior}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#666666;font-size:11px;letter-spacing:0.3px">Est. Delivery</td>
          <td style="padding:8px 0;color:#ffffff;font-size:13px">${estimatedDelivery}</td>
        </tr>
      </table>
    </div>

    <!-- Pricing -->
    <div style="background:#0a0a0a;border:1px solid #1a1a1a;border-radius:8px;padding:24px;margin:0 0 20px">
      <p style="color:#CC0000;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:2px;margin:0 0 16px;font-family:'Helvetica Neue',Arial,sans-serif">Pricing</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #1a1a1a;color:#888888;font-size:13px">Vehicle Total</td>
          <td style="padding:8px 0;border-bottom:1px solid #1a1a1a;color:#ffffff;font-size:13px;font-weight:600;text-align:right">$${totalPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #1a1a1a;color:#888888;font-size:13px">Required Deposit (10%)</td>
          <td style="padding:8px 0;border-bottom:1px solid #1a1a1a;color:#CC0000;font-size:14px;font-weight:700;text-align:right">$${depositAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #1a1a1a;color:#888888;font-size:13px">Remaining Balance</td>
          <td style="padding:8px 0;border-bottom:1px solid #1a1a1a;color:#ffffff;font-size:13px;font-weight:600;text-align:right">$${(totalPrice - depositAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
        </tr>
      </table>
    </div>

    <!-- Shipping Address -->
    <div style="background:#0a0a0a;border:1px solid #1a1a1a;border-left:3px solid #3B82F6;border-radius:8px;padding:24px;margin:0 0 28px">
      <p style="color:#3B82F6;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:2px;margin:0 0 12px;font-family:'Helvetica Neue',Arial,sans-serif">Delivery Address</p>
      <p style="color:#ffffff;font-size:13px;margin:0 0 4px;font-weight:500">${fullName}</p>
      <p style="color:#cccccc;font-size:13px;margin:0;line-height:1.8">${address}<br/>${city}, ${state} ${postalCode}<br/>${country}</p>
    </div>

    <p style="color:#555555;font-size:11px;margin:0 0 20px;line-height:1.7;letter-spacing:0.3px">
      Your order is now being processed by our team. You will receive email updates at each stage of production and delivery. Track your vehicle in real-time from your dashboard.
    </p>
  `);

  const html = emailWrapper(headerBlock() + body + footerBlock());
  return sendEmail(to, `Order Receipt | ${vehicleName} (#${orderNumber})`, html);
}
