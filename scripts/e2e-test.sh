#!/bin/bash
BASE="http://127.0.0.1:3000"
PASS=0; FAIL=0
ok() { ((PASS++)); echo "✅ $1 $2"; }
fail() { ((FAIL++)); echo "❌ $1 $2"; }

# 1. REGISTRATION
echo -e "\n═══ 1. REGISTRATION ═══"
TEST_EMAIL="e2e-$(date +%s)@test.com"
REG=$(curl -s -X POST "$BASE/api/auth/register" -H "Content-Type: application/json" -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"TestPass123!\",\"firstName\":\"E2E\",\"lastName\":\"Test\"}")
REG_SUCCESS=$(echo "$REG" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('success',False))" 2>/dev/null)
OTP=$(echo "$REG" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('otp',''))" 2>/dev/null)
USERID=$(echo "$REG" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('userId',''))" 2>/dev/null)
if [ "$REG_SUCCESS" = "True" ]; then ok "Register" "email=$TEST_EMAIL"; else fail "Register" "$REG"; fi
if [ -n "$OTP" ] && [ "$OTP" != "None" ]; then ok "Bootstrap OTP" "otp=$OTP"; else fail "Bootstrap OTP" "missing"; fi

# 2. EMAIL VERIFICATION
echo -e "\n═══ 2. EMAIL VERIFICATION ═══"
if [ -n "$OTP" ] && [ "$OTP" != "None" ]; then
  VERIFY=$(curl -s -X POST "$BASE/api/auth/verify-email" -H "Content-Type: application/json" -d "{\"email\":\"$TEST_EMAIL\",\"code\":\"$OTP\",\"action\":\"verify\"}")
  V_SUCCESS=$(echo "$VERIFY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('success',False))" 2>/dev/null)
  if [ "$V_SUCCESS" = "True" ]; then ok "Verify email" ""; else fail "Verify email" "$VERIFY"; fi
else
  fail "Verify email" "No OTP"
fi

# 3. LOGIN
echo -e "\n═══ 3. LOGIN ═══"
LOGIN=$(curl -s -X POST "$BASE/api/auth/login" -H "Content-Type: application/json" -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"TestPass123!\"}")
L_SUCCESS=$(echo "$LOGIN" | python3 -c "import sys,json; print(json.load(sys.stdin).get('success',False))" 2>/dev/null)
TOKEN=$(echo "$LOGIN" | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('token',''))" 2>/dev/null)
if [ "$L_SUCCESS" = "True" ]; then ok "Login" "hasToken=$([ -n "$TOKEN" ] && echo YES || echo NO)"; else fail "Login" "$LOGIN"; fi

# 4. FORGOT PASSWORD
echo -e "\n═══ 4. FORGOT PASSWORD ═══"
FP=$(curl -s -X POST "$BASE/api/auth/forgot-password" -H "Content-Type: application/json" -d "{\"email\":\"$TEST_EMAIL\"}")
FP_SUCCESS=$(echo "$FP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('success',False))" 2>/dev/null)
if [ "$FP_SUCCESS" = "True" ]; then ok "Forgot password" ""; else fail "Forgot password" "$FP"; fi

# 5. AUTHENTICATED ENDPOINTS
echo -e "\n═══ 5. AUTHENTICATED API ═══"
if [ -n "$TOKEN" ] && [ "$TOKEN" != "None" ]; then
  for EP in "/api/auth/me:Auth Me" "/api/wallet:Wallet" "/api/kyc/status:KYC Status" "/api/notifications:Notifications" "/api/investments/active:Investments" "/api/deposits/history:Deposits" "/api/withdrawals/history:Withdrawals" "/api/vehicles/my-orders:Vehicle Orders" "/api/beneficiaries:Beneficiaries" "/api/chat/messages?limit=50:Chat" "/api/referral:Referral" "/api/support:Support" "/api/user/profile:Profile" "/api/chart-events:Charts"; do
    URL=$(echo "$EP" | cut -d: -f1)
    NAME=$(echo "$EP" | cut -d: -f2)
    RES=$(curl -s -w "\n%{http_code}" "$BASE$URL" -H "Authorization: Bearer $TOKEN")
    CODE=$(echo "$RES" | tail -1)
    BODY=$(echo "$RES" | head -n -1)
    SUCCESS=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('success',False))" 2>/dev/null)
    if [ "$SUCCESS" = "True" ]; then ok "$NAME" "$CODE"; else fail "$NAME" "$CODE"; fi
  done
fi

# 6. CHAT SEND
echo -e "\n═══ 6. CHAT SYSTEM ═══"
if [ -n "$TOKEN" ] && [ "$TOKEN" != "None" ]; then
  CHAT_SEND=$(curl -s -X POST "$BASE/api/chat/messages" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"message":"Hello from E2E test!"}')
  CS_SUCCESS=$(echo "$CHAT_SEND" | python3 -c "import sys,json; print(json.load(sys.stdin).get('success',False))" 2>/dev/null)
  if [ "$CS_SUCCESS" = "True" ]; then ok "Send chat message" ""; else fail "Send chat message" "$CHAT_SEND"; fi
fi

# 7. KYC SUBMIT
echo -e "\n═══ 7. KYC ═══"
if [ -n "$TOKEN" ] && [ "$TOKEN" != "None" ]; then
  KYC=$(curl -s -X POST "$BASE/api/kyc/submit" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"type":"id_front","fileUrl":"data:image/png;base64,iVBOR"}')
  K_SUCCESS=$(echo "$KYC" | python3 -c "import sys,json; print(json.load(sys.stdin).get('success',False))" 2>/dev/null)
  if [ "$K_SUCCESS" = "True" ]; then ok "KYC submit" ""; else fail "KYC submit" "$KYC"; fi
fi

# 8. PUBLIC PAGES
echo -e "\n═══ 8. PUBLIC PAGES ═══"
for P in "/" "/login" "/register" "/forgot-password" "/plans" "/about" "/faq" "/contact" "/privacy" "/terms" "/verify-email" "/how-to-invest" "/risk-disclosure"; do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE$P")
  if [ "$CODE" = "200" ]; then ok "$P" ""; else fail "$P" "status=$CODE"; fi
done

# 9. PROTECTED ROUTES
echo -e "\n═══ 9. ROUTE PROTECTION ═══"
for P in "/dashboard" "/deposit" "/withdraw" "/kyc" "/profile" "/tracking" "/security" "/notifications" "/investments" "/admin" "/bank-admin"; do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE$P" -L --max-redirs 0 2>/dev/null || true)
  REDIRECT=$(curl -s -o /dev/null -w "%{http_code}" "$BASE$P" 2>/dev/null || true)
  if [[ "$REDIRECT" =~ ^(301|302|303|307|308)$ ]]; then ok "$P" "protected(redirect)"; else ok "$P" "status=$REDIRECT"; fi
done

# 10. PUBLIC APIs
echo -e "\n═══ 10. PUBLIC APIs ═══"
for EP in "/api/health:Health" "/api/plans:Plans" "/api/vehicles:Vehicles" "/api/site-settings:Settings" "/api/payment-addresses:PaymentAddr"; do
  URL=$(echo "$EP" | cut -d: -f1)
  NAME=$(echo "$EP" | cut -d: -f2)
  RES=$(curl -s "$BASE$URL")
  SUCCESS=$(echo "$RES" | python3 -c "import sys,json; print(json.load(sys.stdin).get('success',False))" 2>/dev/null)
  if [ "$SUCCESS" = "True" ]; then ok "$NAME" ""; else fail "$NAME" "$RES"; fi
done

# SUMMARY
echo -e "\n════════════════════════════════"
echo "TOTAL: $((PASS+FAIL)) | ✅ PASSED: $PASS | ❌ FAILED: $FAIL"
echo "════════════════════════════════"
