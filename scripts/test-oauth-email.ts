/**
 * Standalone test script — validates Gmail OAuth2 credentials.
 * Credentials are read from env vars, NOT hardcoded.
 *
 * Usage:
 *   GMAIL_CLIENT_ID=xxx \
 *   GMAIL_CLIENT_SECRET=xxx \
 *   GMAIL_REFRESH_TOKEN=xxx \
 *   SMTP_EMAIL=xxx@gmail.com \
 *   npx tsx scripts/test-oauth-email.ts [recipient@email.com]
 */

const CLIENT_ID = process.env.GMAIL_CLIENT_ID!;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET!;
const REFRESH_TOKEN = process.env.GMAIL_REFRESH_TOKEN!;
const SMTP_EMAIL = process.env.SMTP_EMAIL!;
const RECIPIENT = process.argv[2] || SMTP_EMAIL;

if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN || !SMTP_EMAIL) {
  console.error('Missing env vars: GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN, SMTP_EMAIL');
  process.exit(1);
}

async function run() {
  // Step 1: Get access token
  console.log('Getting access token...');
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID, client_secret: CLIENT_SECRET,
      refresh_token: REFRESH_TOKEN, grant_type: 'refresh_token',
    }).toString(),
  });
  if (!tokenRes.ok) { console.error('Token failed:', await tokenRes.text()); process.exit(1); }
  const { access_token } = await tokenRes.json();
  console.log('Access token obtained.');

  // Step 2: Send test email
  const subject = `Test Email from ${SMTP_EMAIL} — ${new Date().toISOString()}`;
  const html = `<div style="background:#000;padding:40px;text-align:center;font-family:Arial,sans-serif"><h1 style="color:#B91C1C">Test Email</h1><p style="color:#fff">From: ${SMTP_EMAIL}</p><p style="color:#888">Time: ${new Date().toISOString()}</p><p style="color:#555">Email delivery is working.</p></div>`;
  const plain = `Test Email from ${SMTP_EMAIL}\nTime: ${new Date().toISOString()}`;

  const boundary = '----=_Test_' + Math.random().toString(36).slice(2);
  const raw = Buffer.from([
    `From: "Test" <${SMTP_EMAIL}>`, `To: ${RECIPIENT}`,
    `Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`,
    'MIME-Version: 1.0', `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '', `--${boundary}`, 'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: 7bit', '', plain,
    '', `--${boundary}`, 'Content-Type: text/html; charset=UTF-8', 'Content-Transfer-Encoding: base64', '', Buffer.from(html).toString('base64'),
    '', `--${boundary}--`,
  ].join('\r\n')).toString('base64url');

  const sendRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw }),
  });
  if (!sendRes.ok) { console.error('Send failed:', await sendRes.text()); process.exit(1); }
  const { id } = await sendRes.json();
  console.log(`SUCCESS! Message ID: ${id}`);
  console.log(`From: ${SMTP_EMAIL} → To: ${RECIPIENT}`);
}

run().catch(e => { console.error(e); process.exit(1); });
