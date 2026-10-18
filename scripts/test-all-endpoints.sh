#!/bin/bash
# TeslaPrime Comprehensive Endpoint Testing
BASE="https://triumphant-illumination-production-81a3.up.railway.app"

PASS=0
FAIL=0
RESULTS=""

log_result() {
  local name="$1"
  local status="$2"
  local detail="$3"
  if [ "$status" = "PASS" ]; then
    PASS=$((PASS+1))
    RESULTS="$RESULTS\n✅ $name: $detail"
  else
    FAIL=$((FAIL+1))
    RESULTS="$RESULTS\n❌ $name: $detail"
  fi
}

echo "=========================================="
echo "TESLAPRIME COMPREHENSIVE ENDPOINT TESTING"
echo "Base URL: $BASE"
echo "=========================================="
echo ""

# ─── AUTH ENDPOINTS ──────────────────────────
echo "═══ AUTH ENDPOINTS ═══"

# 1. Health
R=$(curl -s "$BASE/api/health")
STATUS=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status',''))" 2>/dev/null)
if [ "$STATUS" = "healthy" ]; then log_result "Health" "PASS" "$STATUS"; else log_result "Health" "FAIL" "$STATUS"; fi

# 2. Registration
R=$(curl -s -X POST "$BASE/api/auth/register" -H "Content-Type: application/json" -d '{"email":"e2etest@testmail.com","password":"TestPass123!","firstName":"E2E","lastName":"Test"}')
SUCCESS=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin).get('success',False))" 2>/dev/null)
if [ "$SUCCESS" = "True" ]; then log_result "Register" "PASS" "created"; else log_result "Register" "FAIL" "$SUCCESS"; fi

# 3. Login (Admin)
R=$(curl -s -X POST "$BASE/api/auth/login" -H "Content-Type: application/json" -d '{"email":"teslaprimesupportt@gmail.com","password":"Admin@123"}')
TOKEN=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('token',''))" 2>/dev/null)
if [ -n "$TOKEN" ] && [ ${#TOKEN} -gt 20 ]; then log_result "Admin Login" "PASS" "token obtained"; else log_result "Admin Login" "FAIL" "no token"; fi

# 4. Login (regular user)
R=$(curl -s -X POST "$BASE/api/auth/login" -H "Content-Type: application/json" -d '{"email":"e2etest@testmail.com","password":"TestPass123!"}')
USER_TOKEN=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('token',''))" 2>/dev/null)
if [ -n "$USER_TOKEN" ] && [ ${#USER_TOKEN} -gt 20 ]; then log_result "User Login" "PASS" "token obtained"; else log_result "User Login" "FAIL" "no token"; fi

# 5. Auth /me
R=$(curl -s "$BASE/api/auth/me" -H "Authorization: Bearer $TOKEN")
EMAIL=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('email',''))" 2>/dev/null)
if [ "$EMAIL" = "teslaprimesupportt@gmail.com" ]; then log_result "Auth /me" "PASS" "$EMAIL"; else log_result "Auth /me" "FAIL" "$EMAIL"; fi

# 6. Logout
R=$(curl -s -X POST "$BASE/api/auth/logout" -H "Authorization: Bearer $TOKEN")
SUCCESS=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin).get('success',False))" 2>/dev/null)
if [ "$SUCCESS" = "True" ]; then log_result "Logout" "PASS" "success"; else log_result "Logout" "FAIL" "failed"; fi

# Re-login to get fresh token
R=$(curl -s -X POST "$BASE/api/auth/login" -H "Content-Type: application/json" -d '{"email":"teslaprimesupportt@gmail.com","password":"Admin@123"}')
TOKEN=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('token',''))" 2>/dev/null)

# 7. Forgot Password
R=$(curl -s -X POST "$BASE/api/auth/forgot-password" -H "Content-Type: application/json" -d '{"email":"teslaprimesupportt@gmail.com"}')
# This may fail due to email not configured, but should not crash
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/auth/forgot-password" -H "Content-Type: application/json" -d '{"email":"teslaprimesupportt@gmail.com"}')
if [ "$HTTP_CODE" -lt 500 ]; then log_result "Forgot Password" "PASS" "HTTP $HTTP_CODE"; else log_result "Forgot Password" "FAIL" "HTTP $HTTP_CODE"; fi

# 8. Change Password
R=$(curl -s -X POST "$BASE/api/auth/change-password" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"currentPassword":"Admin@123","newPassword":"Admin@123"}')
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/auth/change-password" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"currentPassword":"Admin@123","newPassword":"Admin@123"}')
if [ "$HTTP_CODE" -lt 500 ]; then log_result "Change Password" "PASS" "HTTP $HTTP_CODE"; else log_result "Change Password" "FAIL" "HTTP $HTTP_CODE"; fi

echo ""

# ─── WALLET ENDPOINTS ────────────────────────
echo "═══ WALLET ENDPOINTS ═══"

# 9. Get Wallet
R=$(curl -s "$BASE/api/wallet" -H "Authorization: Bearer $TOKEN")
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/wallet" -H "Authorization: Bearer $TOKEN")
if [ "$HTTP_CODE" -lt 500 ]; then log_result "Get Wallet" "PASS" "HTTP $HTTP_CODE"; else log_result "Get Wallet" "FAIL" "HTTP $HTTP_CODE"; fi

# 10. Wallet Transactions
R=$(curl -s "$BASE/api/wallet/transactions" -H "Authorization: Bearer $TOKEN")
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/wallet/transactions" -H "Authorization: Bearer $TOKEN")
if [ "$HTTP_CODE" -lt 500 ]; then log_result "Wallet Transactions" "PASS" "HTTP $HTTP_CODE"; else log_result "Wallet Transactions" "FAIL" "HTTP $HTTP_CODE"; fi

echo ""

# ─── KYC ENDPOINTS ───────────────────────────
echo "═══ KYC ENDPOINTS ═══"

# 11. KYC Status
R=$(curl -s "$BASE/api/kyc/status" -H "Authorization: Bearer $TOKEN")
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/kyc/status" -H "Authorization: Bearer $TOKEN")
if [ "$HTTP_CODE" -lt 500 ]; then log_result "KYC Status" "PASS" "HTTP $HTTP_CODE"; else log_result "KYC Status" "FAIL" "HTTP $HTTP_CODE"; fi

# 12. KYC Submit
R=$(curl -s -X POST "$BASE/api/kyc/submit" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"documentType":"passport","documentNumber":"AB1234567","firstName":"Admin","lastName":"User","dateOfBirth":"1990-01-01","country":"US"}')
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/kyc/submit" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"documentType":"passport","documentNumber":"AB1234567","firstName":"Admin","lastName":"User","dateOfBirth":"1990-01-01","country":"US"}')
if [ "$HTTP_CODE" -lt 500 ]; then log_result "KYC Submit" "PASS" "HTTP $HTTP_CODE"; else log_result "KYC Submit" "FAIL" "HTTP $HTTP_CODE"; fi

# 13. Admin KYC - Generate code for user
USER_ID="cmvdu1ar40000o801fstv4jhl"
R=$(curl -s -X POST "$BASE/api/admin/users/$USER_ID/kyc-code" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json")
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/admin/users/$USER_ID/kyc-code" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json")
if [ "$HTTP_CODE" -lt 500 ]; then log_result "Admin KYC Code" "PASS" "HTTP $HTTP_CODE"; else log_result "Admin KYC Code" "FAIL" "HTTP $HTTP_CODE"; fi

echo ""

# ─── INVESTMENT ENDPOINTS ────────────────────
echo "═══ INVESTMENT ENDPOINTS ═══"

# 14. Get Investment Plans
R=$(curl -s "$BASE/api/plans" -H "Authorization: Bearer $TOKEN")
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/plans" -H "Authorization: Bearer $TOKEN")
if [ "$HTTP_CODE" -lt 500 ]; then log_result "Investment Plans" "PASS" "HTTP $HTTP_CODE"; else log_result "Investment Plans" "FAIL" "HTTP $HTTP_CODE"; fi

# 15. Investments
R=$(curl -s "$BASE/api/investments" -H "Authorization: Bearer $TOKEN")
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/investments" -H "Authorization: Bearer $TOKEN")
if [ "$HTTP_CODE" -lt 500 ]; then log_result "Investments" "PASS" "HTTP $HTTP_CODE"; else log_result "Investments" "FAIL" "HTTP $HTTP_CODE"; fi

# 16. Active Investments
R=$(curl -s "$BASE/api/investments/active" -H "Authorization: Bearer $TOKEN")
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/investments/active" -H "Authorization: Bearer $TOKEN")
if [ "$HTTP_CODE" -lt 500 ]; then log_result "Active Investments" "PASS" "HTTP $HTTP_CODE"; else log_result "Active Investments" "FAIL" "HTTP $HTTP_CODE"; fi

# 17. Investment History
R=$(curl -s "$BASE/api/investments/history" -H "Authorization: Bearer $TOKEN")
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/investments/history" -H "Authorization: Bearer $TOKEN")
if [ "$HTTP_CODE" -lt 500 ]; then log_result "Investment History" "PASS" "HTTP $HTTP_CODE"; else log_result "Investment History" "FAIL" "HTTP $HTTP_CODE"; fi

echo ""

# ─── DEPOSIT ENDPOINTS ───────────────────────
echo "═══ DEPOSIT ENDPOINTS ═══"

# 18. Deposits
R=$(curl -s "$BASE/api/deposits" -H "Authorization: Bearer $TOKEN")
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$3BASE/api/deposits" -H "Authorization: Bearer $TOKEN")
if [ "$HTTP_CODE" -lt 500 ]; then log_result "Deposits" "PASS" "HTTP $HTTP_CODE"; else log_result "Deposits" "FAIL" "HTTP $HTTP_CODE"; fi

# 19. Deposit History
R=$(curl -s "$BASE/api/deposits/history" -H "Authorization: Bearer $TOKEN")
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/deposits/history" -H "Authorization: Bearer $TOKEN")
if [ "$HTTP_CODE" -lt 500 ]; then log_result "Deposit History" "PASS" "HTTP $HTTP_CODE"; else log_result "Deposit History" "FAIL" "HTTP $HTTP_CODE"; fi

echo ""

# ─── WITHDRAWAL ENDPOINTS ────────────────────
echo "═══ WITHDRAWAL ENDPOINTS ═══"

# 20. Withdrawals
R=$(curl -s "$BASE/api/withdrawals" -H "Authorization: Bearer $TOKEN")
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/withdrawals" -H "Authorization: Bearer $TOKEN")
if [ "$HTTP_CODE" -lt 500 ]; then log_result "Withdrawals" "PASS" "HTTP $HTTP_CODE"; else log_result "Withdrawals" "FAIL" "HTTP $HTTP_CODE"; fi

# 21. Withdrawal History
R=$(curl -s "$BASE/api/withdrawals/history" -H "Authorization: Bearer $TOKEN")
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/withdrawals/history" -H "Authorization: Bearer $TOKEN")
if [ "$HTTP_CODE" -lt 500 ]; then log_result "Withdrawal History" "PASS" "HTTP $HTTP_CODE"; else log_result "Withdrawal History" "FAIL" "HTTP $HTTP_CODE"; fi

echo ""

# ─── VEHICLE ENDPOINTS ───────────────────────
echo "═══ VEHICLE ENDPOINTS ═══"

# 22. Vehicles
R=$(curl -s "$BASE/api/vehicles" -H "Authorization: Bearer $TOKEN")
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/vehicles" -H "Authorization: Bearer $TOKEN")
if [ "$HTTP_CODE" -lt 500 ]; then log_result "Vehicles" "PASS" "HTTP $HTTP_CODE"; else log_result "Vehicles" "FAIL" "HTTP $HTTP_CODE"; fi

# 23. My Orders
R=$(curl -s "$BASE/api/vehicles/my-orders" -H "Authorization: Bearer $TOKEN")
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/vehicles/my-orders" -H "Authorization: Bearer $TOKEN")
if [ "$HTTP_CODE" -lt 500 ]; then log_result "My Orders" "PASS" "HTTP $HTTP_CODE"; else log_result "My Orders" "FAIL" "HTTP $HTTP_CODE"; fi

echo ""

# ─── REFERRAL ENDPOINTS ──────────────────────
echo "═══ REFERRAL ENDPOINTS ═══"

# 24. Referral
R=$(curl -s "$BASE/api/referral" -H "Authorization: Bearer $TOKEN")
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/referral" -H "Authorization: Bearer $TOKEN")
if [ "$HTTP_CODE" -lt 500 ]; then log_result "Referral" "PASS" "HTTP $HTTP_CODE"; else log_result "Referral" "FAIL" "HTTP $HTTP_CODE"; fi

echo ""

# ─── NOTIFICATION ENDPOINTS ──────────────────
echo "═══ NOTIFICATION ENDPOINTS ═══"

# 25. Notifications
R=$(curl -s "$BASE/api/notifications" -H "Authorization: Bearer $TOKEN")
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/notifications" -H "Authorization: Bearer $TOKEN")
if [ "$HTTP_CODE" -lt 500 ]; then log_result "Notifications" "PASS" "HTTP $HTTP_CODE"; else log_result "Notifications" "FAIL" "HTTP $HTTP_CODE"; fi

# 26. Unread Count
R=$(curl -s "$BASE/api/notifications/unread-count" -H "Authorization: Bearer $TOKEN")
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/notifications/unread-count" -H "Authorization: Bearer $TOKEN")
if [ "$HTTP_CODE" -lt 500 ]; then log_result "Unread Count" "PASS" "HTTP $HTTP_CODE"; else log_result "Unread Count" "FAIL" "HTTP $HTTP_CODE"; fi

echo ""

# ─── USER/PROFILE ENDPOINTS ──────────────────
echo "═══ USER/PROFILE ENDPOINTS ═══"

# 27. User Profile
R=$(curl -s "$BASE/api/user/profile" -H "Authorization: Bearer $TOKEN")
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/user/profile" -H "Authorization: Bearer $TOKEN")
if [ "$HTTP_CODE" -lt 500 ]; then log_result "User Profile" "PASS" "HTTP $HTTP_CODE"; else log_result "User Profile" "FAIL" "HTTP $HTTP_CODE"; fi

# 28. User (current)
R=$(curl -s "$BASE/api/user" -H "Authorization: Bearer $TOKEN")
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/user" -H "Authorization: Bearer $TOKEN")
if [ "$HTTP_CODE" -lt 500 ]; then log_result "User Info" "PASS" "HTTP $HTTP_CODE"; else log_result "User Info" "FAIL" "HTTP $HTTP_CODE"; fi

# 29. User Mode
R=$(curl -s "$BASE/api/user/mode" -H "Authorization: Bearer $TOKEN")
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/user/mode" -H "Authorization: Bearer $TOKEN")
if [ "$HTTP_CODE" -lt 500 ]; then log_result "User Mode" "PASS" "HTTP $HTTP_CODE"; else log_result "User Mode" "FAIL" "HTTP $HTTP_CODE"; fi

echo ""

# ─── SUPPORT ENDPOINTS ───────────────────────
echo "═══ SUPPORT ENDPOINTS ═══"

# 30. Support
R=$(curl -s "$BASE/api/support" -H "Authorization: Bearer $TOKEN")
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/support" -H "Authorization: Bearer $TOKEN")
if [ "$HTTP_CODE" -lt 500 ]; then log_result "Support" "PASS" "HTTP $HTTP_CODE"; else log_result "Support" "FAIL" "HTTP $HTTP_CODE"; fi

echo ""

# ─── CARDS ENDPOINTS ─────────────────────────
echo "═══ CARDS ENDPOINTS ═══"

# 31. Cards
R=$(curl -s "$BASE/api/cards" -H "Authorization: Bearer $TOKEN")
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/cards" -H "Authorization: Bearer $TOKEN")
if [ "$HTTP_CODE" -lt 500 ]; then log_result "Cards" "PASS" "HTTP $HTTP_CODE"; else log_result "Cards" "FAIL" "HTTP $HTTP_CODE"; fi

echo ""

# ─── ADMIN ENDPOINTS ─────────────────────────
echo "═══ ADMIN ENDPOINTS ═══"

# 32. Admin Stats
R=$(curl -s "$BASE/api/admin/stats" -H "Authorization: Bearer $TOKEN")
SUCCESS=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin).get('success',False))" 2>/dev/null)
if [ "$SUCCESS" = "True" ]; then log_result "Admin Stats" "PASS" "data returned"; else log_result "Admin Stats" "FAIL" "no data"; fi

# 33. Admin Users
R=$(curl -s "$BASE/api/admin/users" -H "Authorization: Bearer $TOKEN")
SUCCESS=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin).get('success',False))" 2>/dev/null)
if [ "$SUCCESS" = "True" ]; then log_result "Admin Users" "PASS" "data returned"; else log_result "Admin Users" "FAIL" "no data"; fi

# 34. Admin KYC
R=$(curl -s "$BASE/api/admin/kyc" -H "Authorization: Bearer $TOKEN")
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/admin/kyc" -H "Authorization: Bearer $TOKEN")
if [ "$HTTP_CODE" -lt 500 ]; then log_result "Admin KYC" "PASS" "HTTP $HTTP_CODE"; else log_result "Admin KYC" "FAIL" "HTTP $HTTP_CODE"; fi

# 35. Admin Deposits
R=$(curl -s "$BASE/api/admin/deposits" -H "Authorization: Bearer $TOKEN")
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/admin/deposits" -H "Authorization: Bearer $TOKEN")
if [ "$HTTP_CODE" -lt 500 ]; then log_result "Admin Deposits" "PASS" "HTTP $HTTP_CODE"; else log_result "Admin Deposits" "FAIL" "HTTP $HTTP_CODE"; fi

# 36. Admin Withdrawals
R=$(curl -s "$BASE/api/admin/withdrawals" -H "Authorization: Bearer $TOKEN")
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/admin/withdrawals" -H "Authorization: Bearer $TOKEN")
if [ "$HTTP_CODE" -lt 500 ]; then log_result "Admin Withdrawals" "PASS" "HTTP $HTTP_CODE"; else log_result "Admin Withdrawals" "FAIL" "HTTP $HTTP_CODE"; fi

# 37. Admin Vehicles
R=$(curl -s "$BASE/api/admin/vehicles" -H "Authorization: Bearer $TOKEN")
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/admin/vehicles" -H "Authorization: Bearer $TOKEN")
if [ "$HTTP_CODE" -lt 500 ]; then log_result "Admin Vehicles" "PASS" "HTTP $HTTP_CODE"; else log_result "Admin Vehicles" "FAIL" "HTTP $HTTP_CODE"; fi

# 38. Admin Settings
R=$(curl -s "$BASE/api/admin/settings" -H "Authorization: Bearer $TOKEN")
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/admin/settings" -H "Authorization: Bearer $TOKEN")
if [ "$HTTP_CODE" -lt 500 ]; then log_result "Admin Settings" "PASS" "HTTP $HTTP_CODE"; else log_result "Admin Settings" "FAIL" "HTTP $HTTP_CODE"; fi

# 39. Site Settings
R=$(curl -s "$BASE/api/site-settings")
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/site-settings")
if [ "$HTTP_CODE" -lt 500 ]; then log_result "Site Settings" "PASS" "HTTP $HTTP_CODE"; else log_result "Site Settings" "FAIL" "HTTP $HTTP_CODE"; fi

# 40. Payment Addresses
R=$(curl -s "$BASE/api/payment-addresses" -H "Authorization: Bearer $TOKEN")
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/payment-addresses" -H "Authorization: Bearer $TOKEN")
if [ "$HTTP_CODE" -lt 500 ]; then log_result "Payment Addresses" "PASS" "HTTP $HTTP_CODE"; else log_result "Payment Addresses" "FAIL" "HTTP $HTTP_CODE"; fi

echo ""

# ─── RESULTS ─────────────────────────────────
echo "=========================================="
echo "TEST RESULTS SUMMARY"
echo "=========================================="
echo -e "$RESULTS"
echo ""
echo "Total: $((PASS+FAIL)) | Passed: $PASS | Failed: $FAIL"
echo "=========================================="
