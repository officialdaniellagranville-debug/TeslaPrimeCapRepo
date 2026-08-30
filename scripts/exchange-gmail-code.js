#!/usr/bin/env node
/**
 * Exchange a Gmail OAuth authorization code for a refresh token.
 *
 * Usage:
 *   node scripts/exchange-gmail-code.js "4/0AanRRr..."
 *
 * The auth code is captured manually from the browser URL bar after
 * completing the OAuth consent flow (see scripts/get-gmail-refresh-token.js
 * for the full flow with automatic capture — this script is the manual
 * fallback when the user can't run a local Node server).
 */

const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost:3001/callback';

const code = process.argv[2];

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('\n❌ Missing GMAIL_CLIENT_ID or GMAIL_CLIENT_SECRET env vars.');
  console.error('  export GMAIL_CLIENT_ID=xxxx.apps.googleusercontent.com');
  console.error('  export GMAIL_CLIENT_SECRET=GOCSPX-xxxx\n');
  process.exit(1);
}

if (!code) {
  console.error('\n❌ Usage: node scripts/exchange-gmail-code.js "AUTH_CODE_HERE"');
  console.error('   (the auth code starts with "4/" — copy it from the browser URL bar after OAuth)\n');
  process.exit(1);
}

(async () => {
  try {
    console.log('Exchanging auth code for refresh token...\n');

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }).toString(),
    });

    const data = await res.json();

    if (!res.ok || !data.refresh_token) {
      console.error('\n❌ Token exchange failed.');
      console.error('Status:', res.status);
      console.error('Response:', JSON.stringify(data, null, 2));
      if (data.error === 'invalid_grant') {
        console.error('\nThis usually means:');
        console.error('  - The auth code was already used (codes are single-use). Generate a fresh one.');
        console.error('  - The auth code is stale (they expire in ~10 minutes).');
        console.error('  - The redirect_uri in this script doesn\'t match the one in the OAuth URL.');
      }
      process.exit(1);
    }

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  ✓ SUCCESS — Add these 4 vars to Railway → Variables');
    console.log('═══════════════════════════════════════════════════════════════\n');
    console.log('GMAIL_CLIENT_ID=' + CLIENT_ID);
    console.log('GMAIL_CLIENT_SECRET=' + CLIENT_SECRET);
    console.log('GMAIL_REFRESH_TOKEN=' + data.refresh_token);
    console.log('SMTP_EMAIL=teslaequity.support@gmail.com');
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  After setting all 4 in Railway, redeploy → email works.');
    console.log('═══════════════════════════════════════════════════════════════\n');
  } catch (err) {
    console.error('\n❌ Network error:', err.message);
    process.exit(1);
  }
})();
