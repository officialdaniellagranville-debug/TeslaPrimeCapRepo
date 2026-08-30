#!/usr/bin/env node
/**
 * Verify Gmail refresh token works by exchanging it for an access token
 * and making a test API call (get user profile = email address).
 *
 * Usage:
 *   GMAIL_CLIENT_ID=xxxx.apps.googleusercontent.com \
 *   GMAIL_CLIENT_SECRET=GOCSPX-xxxx \
 *   GMAIL_REFRESH_TOKEN=1//xxxx \
 *   node scripts/verify-gmail-token.js
 */

const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GMAIL_REFRESH_TOKEN;

if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
  console.error('❌ Missing env vars. Need GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN');
  process.exit(1);
}

(async () => {
  console.log('Exchanging refresh token for access token...\n');

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
    console.error('❌ Token exchange failed:');
    console.error(JSON.stringify(tokenData, null, 2));
    process.exit(1);
  }

  console.log('✓ Got access token (length:', tokenData.access_token.length, 'chars)');

  // Test the token by calling Gmail's user profile API
  const profileRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });

  const profile = await profileRes.json();

  if (!profileRes.ok) {
    console.error('❌ Profile API call failed:');
    console.error(JSON.stringify(profile, null, 2));
    process.exit(1);
  }

  console.log('✓ Token is valid. Account verified:');
  console.log('   Email:', profile.emailAddress);
  console.log('   Messages total:', profile.messagesTotal);
  console.log('   Threads total:', profile.threadsTotal);

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  ✓ SUCCESS — Add these 4 vars to Railway → Variables (Tesla Prime)');
  console.log('═══════════════════════════════════════════════════════════════\n');
  console.log('GMAIL_CLIENT_ID=' + CLIENT_ID);
  console.log('GMAIL_CLIENT_SECRET=' + CLIENT_SECRET);
  console.log('GMAIL_REFRESH_TOKEN=' + REFRESH_TOKEN);
  console.log('SMTP_EMAIL=teslaprimesupportt@gmail.com');
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  After setting all 4 in Railway, redeploy → email works.');
  console.log('═══════════════════════════════════════════════════════════════\n');
})();
