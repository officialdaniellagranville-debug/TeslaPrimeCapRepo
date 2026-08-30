#!/usr/bin/env node
/**
 * Exchange an OAuth authorization code for a refresh token.
 * Usage:
 *   CLIENT_ID=xxx CLIENT_SECRET=xxx node scripts/exchange-oauth-code.js <authorization-code> [email]
 *
 *   code  = the authorization code from the redirect URL (?code=4/...)
 *   email = optional, the SMTP email address for display
 */

const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const EMAIL = process.env.SMTP_EMAIL || process.argv[3] || '';
const code = process.argv[2] || '';

if (!CLIENT_ID || !CLIENT_SECRET || !code) {
  console.error('Usage: GMAIL_CLIENT_ID=xxx GMAIL_CLIENT_SECRET=xxx node scripts/exchange-oauth-code.js <authorization-code> [email]');
  process.exit(1);
}

async function exchange() {
  console.log(`Exchanging code...`);
  console.log(`Client ID: ${CLIENT_ID.substring(0, 30)}...`);
  if (EMAIL) console.log(`Email: ${EMAIL}`);
  console.log('');

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: 'http://localhost:3001/callback',
      grant_type: 'authorization_code',
    }).toString(),
  });

  const text = await res.text();
  if (!res.ok) { console.error(`FAILED (${res.status}): ${text}`); process.exit(1); }

  const data = JSON.parse(text);
  console.log('SUCCESS! New credentials:');
  console.log(`GMAIL_CLIENT_ID=${CLIENT_ID}`);
  console.log(`GMAIL_CLIENT_SECRET=${CLIENT_SECRET}`);
  console.log(`GMAIL_REFRESH_TOKEN=${data.refresh_token}`);
  if (EMAIL) console.log(`SMTP_EMAIL=${EMAIL}`);
  console.log(`\nAccess token: ${data.access_token.substring(0, 20)}...`);
  console.log(`Expires in: ${data.expires_in}s`);
}

exchange().catch(err => { console.error('Error:', err.message); process.exit(1); });
