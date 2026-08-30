#!/usr/bin/env node
/**
 * Gmail OAuth Refresh Token Generator
 * ====================================
 * Run this ONCE locally to get a refresh token for the
 * teslaequity.support@gmail.com Gmail account.
 *
 * The refresh token + your OAuth client credentials then go into
 * Railway env vars and email sending "just works" via Gmail API (HTTPS,
 * bypasses Railway's SMTP block).
 *
 * PREREQUISITES (one-time setup in Google Cloud Console):
 *   1. Go to https://console.cloud.google.com/
 *   2. Create a project (or reuse the existing TeslaEquity project).
 *   3. Enable the Gmail API:
 *        APIs & Services → Library → search "Gmail API" → Enable.
 *   4. Configure the OAuth consent screen:
 *        APIs & Services → OAuth consent screen
 *          → User type: External
 *          → Fill in app name "TeslaEquity", support email, etc.
 *          → Add scope: https://mail.google.com/
 *          → Add yourself as a Test User (your teslaequity.support@gmail.com)
 *   5. Create OAuth credentials:
 *        APIs & Services → Credentials → Create Credentials → OAuth client ID
 *          → Application type: Web application
 *          → Authorized redirect URIs: http://localhost:3001/callback
 *          → Copy the Client ID and Client Secret.
 *
 * USAGE:
 *   GMAIL_CLIENT_ID=xxxx.apps.googleusercontent.com \
 *   GMAIL_CLIENT_SECRET=GOCSPX-xxxx \
 *   node scripts/get-gmail-refresh-token.js
 *
 * It will:
 *   1. Start a tiny HTTP server on port 3001
 *   2. Print a URL — open it in your browser
 *   3. Log in as teslaequity.support@gmail.com (you'll see a "Google hasn't
 *      verified this app" warning — click "Advanced" → "Go to TeslaEquity
 *      (unsafe)")
 *   4. Grant Gmail send permission
 *   5. Capture the authorization code automatically
 *   6. Exchange it for a refresh token
 *   7. Print all three values (CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN)
 *      ready to paste into Railway
 */

const http = require('http');
const { URL } = require('url');

const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('\n❌ Missing GMAIL_CLIENT_ID or GMAIL_CLIENT_SECRET env vars.\n');
  console.error('Run this script as:');
  console.error('  GMAIL_CLIENT_ID=xxxx.apps.googleusercontent.com \\');
  console.error('  GMAIL_CLIENT_SECRET=GOCSPX-xxxx \\');
  console.error('  node scripts/get-gmail-refresh-token.js\n');
  process.exit(1);
}

const REDIRECT_URI = 'http://localhost:3001/callback';
const PORT = 3001;
const SCOPE = 'https://mail.google.com/';

const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
authUrl.searchParams.set('client_id', CLIENT_ID);
authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
authUrl.searchParams.set('response_type', 'code');
authUrl.searchParams.set('scope', SCOPE);
authUrl.searchParams.set('access_type', 'offline');
authUrl.searchParams.set('prompt', 'consent');  // force consent to get a fresh refresh_token

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('  Gmail OAuth — Refresh Token Generator for TeslaEquity');
console.log('═══════════════════════════════════════════════════════════════\n');
console.log('STEP 1: Open this URL in your browser:\n');
console.log(authUrl.toString());
console.log('\nSTEP 2: Sign in as teslaequity.support@gmail.com');
console.log('  → If you see "Google hasn't verified this app":');
console.log('    click "Advanced" → "Go to TeslaEquity (unsafe)"');
console.log('  → Click "Allow" to grant Gmail send permission\n');
console.log('STEP 3: After allowing, you'll be redirected to localhost:3001');
console.log('  → This script will capture the code automatically.\n');
console.log('Waiting for OAuth callback on http://localhost:' + PORT + ' ...\n');

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname !== '/callback') {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (error || !code) {
    console.error('\n❌ OAuth error:', error || 'no code returned');
    res.writeHead(400, { 'Content-Type': 'text/html' });
    res.end(`<h1>OAuth failed</h1><pre>${error || 'no code'}</pre>`);
    server.close();
    process.exit(1);
  }

  console.log('✓ Authorization code received. Exchanging for refresh token...\n');

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
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

    const data = await tokenRes.json();

    if (!tokenRes.ok || !data.refresh_token) {
      console.error('\n❌ Token exchange failed:', JSON.stringify(data, null, 2));
      res.writeHead(500, { 'Content-Type': 'text/html' });
      res.end(`<h1>Token exchange failed</h1><pre>${JSON.stringify(data, null, 2)}</pre>`);
      server.close();
      process.exit(1);
    }

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  ✓ SUCCESS! Copy these 3 values into Railway Variables:');
    console.log('═══════════════════════════════════════════════════════════════\n');
    console.log('GMAIL_CLIENT_ID=' + CLIENT_ID);
    console.log('GMAIL_CLIENT_SECRET=' + CLIENT_SECRET);
    console.log('GMAIL_REFRESH_TOKEN=' + data.refresh_token);
    console.log('\nOptional (also set these in Railway):');
    console.log('SMTP_EMAIL=teslaequity.support@gmail.com  (used as From address)');
    console.log('EMAIL_FROM_NAME=TeslaEquity');
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  After setting all 5 vars in Railway, redeploy and test at:');
    console.log('  /api/admin/email-test  (POST with {"email":"YOUR@EMAIL.COM"})');
    console.log('═══════════════════════════════════════════════════════════════\n');

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <html>
      <body style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 60px auto; padding: 20px;">
        <h1 style="color: #16a34a;">✓ Success!</h1>
        <p>Your Gmail refresh token has been generated.</p>
        <p>Go back to your terminal to copy the 3 values into Railway Variables.</p>
        <p>After that, redeploy Railway and email sending will work via Gmail API.</p>
        <p style="color: #888; font-size: 14px; margin-top: 30px;">You can close this tab.</p>
      </body>
      </html>
    `);
    server.close();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Network error during token exchange:', err.message);
    res.writeHead(500, { 'Content-Type': 'text/html' });
    res.end(`<h1>Network error</h1><pre>${err.message}</pre>`);
    server.close();
    process.exit(1);
  }
});

server.listen(PORT, () => {});
