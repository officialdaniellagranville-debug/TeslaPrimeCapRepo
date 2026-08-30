#!/usr/bin/env node
/**
 * Generate a Gmail OAuth consent URL.
 * Usage: GMAIL_CLIENT_ID=xxx node scripts/gen-oauth-url.js
 */

const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
if (!CLIENT_ID) {
  console.error('Usage: GMAIL_CLIENT_ID=xxx node scripts/gen-oauth-url.js');
  process.exit(1);
}

const REDIRECT_URI = 'http://localhost:3001/callback';
const SCOPE = 'https://mail.google.com/';
const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
url.searchParams.set('client_id', CLIENT_ID);
url.searchParams.set('redirect_uri', REDIRECT_URI);
url.searchParams.set('response_type', 'code');
url.searchParams.set('scope', SCOPE);
url.searchParams.set('access_type', 'offline');
url.searchParams.set('prompt', 'consent');

console.log('');
console.log('Open this URL, sign in, authorize, then copy the redirect URL:');
console.log('');
console.log(url.toString());
console.log('');
console.log('After authorizing, the browser will fail to load localhost:3001 — that is expected.');
console.log('Copy the FULL URL from the address bar (contains ?code=...) and use exchange-oauth-code.js');
console.log('');