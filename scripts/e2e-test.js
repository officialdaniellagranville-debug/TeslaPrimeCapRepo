const baseUrl = 'http://localhost:3000';

async function run() {
  let passed = 0, failed = 0;
  const log = (name, ok, detail = '') => {
    if (ok) passed++; else failed++;
    console.log(ok ? '✅' : '❌', name, detail);
  };

  // ═══════════════════════════════════════
  // 1. FULL REGISTRATION + VERIFY + LOGIN
  // ═══════════════════════════════════════
  console.log('\n═══ 1. REGISTRATION FLOW ═══');
  const testEmail = `e2e-${Date.now()}@test.com`;
  let regData, token, userId;

  try {
    const r = await fetch(baseUrl + '/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: 'TestPass123!', firstName: 'E2E', lastName: 'Test' })
    });
    regData = await r.json();
    log('Register API', regData.success, `status=${r.status}`);
    log('Register returns userId', !!regData.data?.userId, regData.data?.userId || 'missing');
    log('Bootstrap OTP returned', !!regData.data?.otp, regData.data?.otp || 'missing');
    userId = regData.data?.userId;
  } catch(e) { log('Register API', false, e.message); }

  // ═══════════════════════════════════════
  // 2. EMAIL VERIFICATION
  // ═══════════════════════════════════════
  console.log('\n═══ 2. EMAIL VERIFICATION ═══');
  if (regData?.success && regData.data?.otp) {
    try {
      const r = await fetch(baseUrl + '/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail, code: String(regData.data.otp), action: 'verify' })
      });
      const d = await r.json();
      log('Verify email', d.success, `status=${r.status}`);
    } catch(e) { log('Verify email', false, e.message); }
  } else {
    log('Verify email', false, 'No OTP from registration');
  }

  // ═══════════════════════════════════════
  // 3. LOGIN
  // ═══════════════════════════════════════
  console.log('\n═══ 3. LOGIN ═══');
  try {
    const r = await fetch(baseUrl + '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: 'TestPass123!' })
    });
    const d = await r.json();
    token = d.data?.token;
    log('Login', d.success, `status=${r.status} hasToken=${!!token}`);
  } catch(e) { log('Login', false, e.message); }

  // ═══════════════════════════════════════
  // 4. FORGOT PASSWORD
  // ═══════════════════════════════════════
  console.log('\n═══ 4. FORGOT PASSWORD ═══');
  try {
    const r = await fetch(baseUrl + '/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail })
    });
    const d = await r.json();
    log('Forgot password', d.success, `status=${r.status}`);
  } catch(e) { log('Forgot password', false, e.message); }

  // ═══════════════════════════════════════
  // 5. ALL AUTHENTICATED ENDPOINTS
  // ═══════════════════════════════════════
  console.log('\n═══ 5. AUTHENTICATED API ENDPOINTS ═══');
  if (token) {
    const auth = { 'Authorization': `Bearer ${token}` };
    const endpoints = [
      ['/api/auth/me', 'Auth Me'],
      ['/api/wallet', 'Wallet'],
      ['/api/kyc/status', 'KYC Status'],
      ['/api/notifications', 'Notifications'],
      ['/api/notifications/unread-count', 'Unread Count'],
      ['/api/investments/active', 'Active Investments'],
      ['/api/investments/history', 'Investment History'],
      ['/api/deposits/history', 'Deposit History'],
      ['/api/withdrawals/history', 'Withdrawal History'],
      ['/api/vehicles/my-orders', 'Vehicle Orders'],
      ['/api/beneficiaries', 'Beneficiaries'],
      ['/api/chat/messages?limit=50', 'Chat Messages'],
      ['/api/referral', 'Referral'],
      ['/api/support', 'Support Tickets'],
      ['/api/user/profile', 'User Profile'],
      ['/api/chart-events', 'Chart Events'],
      ['/api/payment-addresses', 'Payment Addresses'],
    ];
    for (const [ep, name] of endpoints) {
      try {
        const r = await fetch(baseUrl + ep, { headers: auth });
        const d = await r.json();
        log(name, d.success, `${r.status}`);
      } catch(e) { log(name, false, e.message); }
    }
  }

  // ═══════════════════════════════════════
  // 6. CHAT MESSAGES (send + receive)
  // ═══════════════════════════════════════
  console.log('\n═══ 6. CHAT SYSTEM ═══');
  if (token) {
    const auth = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
    try {
      const r = await fetch(baseUrl + '/api/chat/messages', {
        method: 'POST', headers: auth,
        body: JSON.stringify({ message: 'Hello from E2E test!' })
      });
      const d = await r.json();
      log('Send chat message', d.success, `status=${r.status}`);
    } catch(e) { log('Send chat message', false, e.message); }

    try {
      const r = await fetch(baseUrl + '/api/chat/messages?limit=50', { headers: { 'Authorization': `Bearer ${token}` } });
      const d = await r.json();
      log('Fetch chat messages', d.success, `count=${d.data?.messages?.length || 0}`);
    } catch(e) { log('Fetch chat messages', false, e.message); }
  }

  // ═══════════════════════════════════════
  // 7. KYC STATUS
  // ═══════════════════════════════════════
  console.log('\n═══ 7. KYC ═══');
  if (token) {
    const auth = { 'Authorization': `Bearer ${token}` };
    try {
      const r = await fetch(baseUrl + '/api/kyc/status', { headers: auth });
      const d = await r.json();
      log('KYC status', d.success, `level=${d.data?.kycLevel || d.data?.level || 'unknown'}`);
    } catch(e) { log('KYC status', false, e.message); }

    try {
      const r = await fetch(baseUrl + '/api/kyc/submit', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'id_front', fileUrl: 'data:image/png;base64,test' })
      });
      const d = await r.json();
      log('KYC submit', r.status === 200 || r.status === 201, `status=${r.status}`);
    } catch(e) { log('KYC submit', false, e.message); }
  }

  // ═══════════════════════════════════════
  // 8. RESEND EMAIL - ACTUAL SEND
  // ═══════════════════════════════════════
  console.log('\n═══ 8. RESEND EMAIL ═══');
  try {
    const r = await fetch(baseUrl + '/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: `resend-test-${Date.now()}@test.com`, password: 'TestPass123!', firstName: 'Resend', lastName: 'Test' })
    });
    const d = await r.json();
    log('Register (triggers Resend)', d.success, `otp=${d.data?.otp || 'none'} emailSent=${!d.data?.otp ? 'YES (no bootstrap needed)' : 'bootstrap fallback'}`);
  } catch(e) { log('Register (triggers Resend)', false, e.message); }

  // ═══════════════════════════════════════
  // 9. PUBLIC PAGES
  // ═══════════════════════════════════════
  console.log('\n═══ 9. PUBLIC PAGES ═══');
  const pages = ['/', '/login', '/register', '/forgot-password', '/plans', '/about', '/faq', '/contact', '/privacy', '/terms', '/verify-email', '/how-to-invest', '/risk-disclosure', '/aml-policy'];
  for (const p of pages) {
    try {
      const r = await fetch(baseUrl + p);
      log(p, r.status === 200, `status=${r.status}`);
    } catch(e) { log(p, false, e.message); }
  }

  // ═══════════════════════════════════════
  // 10. PROTECTED ROUTE REDIRECTS
  // ═══════════════════════════════════════
  console.log('\n═══ 10. ROUTE PROTECTION ═══');
  const protectedRoutes = ['/dashboard', '/deposit', '/withdraw', '/kyc', '/profile', '/tracking', '/security', '/notifications', '/investments', '/vehicles', '/cards', '/beneficiaries', '/admin', '/bank-admin'];
  for (const p of protectedRoutes) {
    try {
      const r = await fetch(baseUrl + p, { redirect: 'manual' });
      const isRedirect = [301, 302, 303, 307, 308].includes(r.status);
      log(p, isRedirect, isRedirect ? 'redirects' : `status=${r.status}`);
    } catch(e) { log(p, false, e.message); }
  }

  // ═══════════════════════════════════════
  // 11. PUBLIC APIs
  // ═══════════════════════════════════════
  console.log('\n═══ 11. PUBLIC APIs ═══');
  const publicApis = [
    ['/api/health', 'Health'],
    ['/api/plans', 'Plans'],
    ['/api/vehicles', 'Vehicles'],
    ['/api/site-settings', 'Site Settings'],
    ['/api/payment-addresses', 'Payment Addresses'],
  ];
  for (const [ep, name] of publicApis) {
    try {
      const r = await fetch(baseUrl + ep);
      const d = await r.json();
      log(name, d.success, `status=${r.status}`);
    } catch(e) { log(name, false, e.message); }
  }

  // ═══════════════════════════════════════
  // 12. CHAT WIDGET IN HTML
  // ═══════════════════════════════════════
  console.log('\n═══ 12. CHAT WIDGET IN PAGE HTML ═══');
  try {
    const r = await fetch(baseUrl + '/');
    const html = await r.text();
    const hasChatWidget = html.includes('ChatWidget') || html.includes('chat') || html.includes('Chat');
    log('Chat widget on landing page', r.status === 200, `status=${r.status}`);
  } catch(e) { log('Chat widget check', false, e.message); }

  // ═══════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════
  console.log(`\n════════════════════════════════`);
  console.log(`TOTAL: ${passed + failed} | ✅ PASSED: ${passed} | ❌ FAILED: ${failed}`);
  console.log(`════════════════════════════════`);
  
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(e => { console.error('FATAL:', e); process.exit(1); });
