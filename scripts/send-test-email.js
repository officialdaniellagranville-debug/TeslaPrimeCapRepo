#!/usr/bin/env node
/**
 * Send a test email directly via Gmail API — bypasses the app entirely.
 *
 * Usage:
 *   node scripts/send-test-email.js "recipient@example.com"
 *
 * Reads GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN from
 * env vars (with the TeslaEquity defaults hardcoded as fallback).
 * Sends a TeslaEquity-branded test email from teslaequity.support@gmail.com
 * to the recipient address.
 */

const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GMAIL_REFRESH_TOKEN;
const FROM_EMAIL = process.env.SMTP_EMAIL || 'teslaequity.support@gmail.com';

const to = process.argv[2];

if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
  console.error('\n❌ Missing Gmail API credentials. Set these env vars first:');
  console.error('  export GMAIL_CLIENT_ID=xxxx.apps.googleusercontent.com');
  console.error('  export GMAIL_CLIENT_SECRET=GOCSPX-xxxx');
  console.error('  export GMAIL_REFRESH_TOKEN=1//xxxx\n');
  process.exit(1);
}

if (!to) {
  console.error('\n❌ Usage: node scripts/send-test-email.js "recipient@example.com"\n');
  process.exit(1);
}

const otp = String(Math.floor(100000 + Math.random() * 900000));

const html = `
<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#000000;font-family:'Helvetica Neue',Arial,sans-serif">
  <div style="max-width:600px;margin:0 auto;background:#000000">
    <div style="background-color:#000000;padding:48px 32px 36px;text-align:center;border-bottom:1px solid #B91C1C">
      <div style="width:72px;height:72px;background-color:#000000;border:1.5px solid #B91C1C;border-radius:16px;margin:0 auto 20px;text-align:center;line-height:72px;font-size:42px;font-weight:900;color:#CC0000;letter-spacing:-2px">T</div>
      <h1 style="color:#ffffff;margin:0;font-size:18px;font-weight:700;letter-spacing:5px">TESLA EQUITY</h1>
      <p style="color:#B91C1C;margin:12px 0 0;font-size:9px;letter-spacing:5px;text-transform:uppercase;font-weight:600">Premium Investment Platform</p>
    </div>
    <div style="padding:48px 32px">
      <h2 style="color:#ffffff;margin:0 0 24px;font-size:24px;font-weight:700">Your verification code</h2>
      <p style="color:#888888;margin:0 0 32px;font-size:15px;line-height:1.6">Use the code below to verify your email address. This code expires in 10 minutes.</p>
      <div style="background:#0a0a0a;border:1px solid #333;border-radius:12px;padding:32px;text-align:center;margin:0 0 32px">
        <div style="color:#CC0000;font-size:42px;font-weight:900;letter-spacing:8px">${otp}</div>
      </div>
      <p style="color:#555;font-size:13px;margin:0 0 8px">If you didn't request this code, you can safely ignore this email.</p>
      <p style="color:#333;font-size:12px;margin:24px 0 0;border-top:1px solid #1a1a1a;padding-top:24px">— TeslaEquity Team</p>
    </div>
    <div style="padding:24px 32px;border-top:1px solid #1a1a1a;text-align:center">
      <p style="color:#444;font-size:11px;margin:0">&copy; ${new Date().getFullYear()} TeslaEquity. All rights reserved.</p>
    </div>
  </div>
</body></html>
`.trim();

(async () => {
  console.log(`Sending test email to ${to}...`);

  // 1. Get access token
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }).toString(),
  });
  const tokenData = await tokenRes.json();
  if (!tokenRes.ok || !tokenData.access_token) {
    console.error('❌ Failed to get access token:', JSON.stringify(tokenData, null, 2));
    process.exit(1);
  }

  // 2. Build RFC 822 message
  const rawMessage = [
    `From: "TeslaEquity" <${FROM_EMAIL}>`,
    `To: ${to}`,
    `Subject: =?UTF-8?B?${Buffer.from('Your TeslaEquity verification code').toString('base64')}?=`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(html).toString('base64'),
  ].join('\r\n');
  const raw = Buffer.from(rawMessage).toString('base64url');

  // 3. Send via Gmail API
  const sendRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${tokenData.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw }),
  });
  const sendData = await sendRes.json();

  if (!sendRes.ok) {
    console.error('❌ Gmail API error:', JSON.stringify(sendData, null, 2));
    process.exit(1);
  }

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  ✓ Email sent successfully!');
  console.log('═══════════════════════════════════════════════════════\n');
  console.log(`  From:    ${FROM_EMAIL}`);
  console.log(`  To:      ${to}`);
  console.log(`  OTP:     ${otp}  (this is the code that was sent)`);
  console.log(`  Msg ID:  ${sendData.id}`);
  console.log(`  Time:    ${new Date().toISOString()}`);
  console.log('\nCheck your inbox (and spam folder if it doesn\'t arrive in 30s).\n');
})().catch(err => {
  console.error('❌ Network error:', err.message);
  process.exit(1);
});
