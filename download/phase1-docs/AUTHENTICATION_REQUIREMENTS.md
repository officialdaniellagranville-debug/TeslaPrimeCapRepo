# Authentication Requirements

**Project:** Enterprise Investment Platform — Phase 1  
**Version:** 1.0.0  
**Last Updated:** 2025-01  
**Status:** Approved  

This document specifies the complete authentication and session management requirements for the enterprise investment platform. It covers registration, login, email verification, password management, two-factor authentication, session lifecycle, token management, account lockout, and device tracking. See [SECURITY_REQUIREMENTS](./SECURITY_REQUIREMENTS.md) for the broader security architecture, [SYSTEM_ARCHITECTURE](./SYSTEM_ARCHITECTURE.md) for the technical implementation context, and [DATABASE_REQUIREMENTS](./DATABASE_REQUIREMENTS.md) for the underlying data model.

---

## 1. Authentication Overview

The platform implements a JWT-based authentication system with refresh token rotation. This architecture separates the concerns of short-term access and long-term session management, providing strong security properties while maintaining a smooth user experience.

**Access Token:** A short-lived JSON Web Token (JWT) with a 15-minute expiry. It contains the user's identity claims (user ID, role, KYC level, active mode) and is used to authenticate every API request. The access token is stored in the frontend's JavaScript memory (a module-level variable), never in localStorage, sessionStorage, or cookies. This storage strategy means the token is lost on page refresh and must be re-obtained via the refresh token, which is the intended security behavior.

**Refresh Token:** A longer-lived JWT with a 7-day expiry, stored as an HTTP-only, Secure, SameSite=Strict cookie. The refresh token's sole purpose is to obtain new access tokens. It cannot be used to access API endpoints directly. Every time the refresh token is used, a new refresh token is issued and the old one is invalidated (token rotation). This ensures that a stolen refresh token has a single-use window before becoming worthless.

**Token Contents:** Access tokens include the following claims: `sub` (user ID), `role` (user or admin), `kycLevel` (integer), `mode` (demo or live), `iat` (issued at), and `exp` (expiration). Refresh tokens include: `sub` (user ID), `jti` (unique token identifier for rotation tracking), `sessionVersion` (for invalidation on security events), `iat`, and `exp`. Neither token contains sensitive data (passwords, email addresses, or wallet balances).

---

## 2. Registration Flow

### 2.1 Step-by-Step Process

The registration flow is a multi-step process that validates the user's identity and establishes their account before granting access to the platform.

**Step 1 — Form Submission:** The user navigates to the registration page and submits their email address, password, and an optional referral code. The frontend validates the input client-side (password strength indicator, email format, referral code format) and sends a POST request to `/api/v1/auth/register` with the email, password, and optional referral code.

**Step 2 — Server-Side Validation:** The backend validates the request using a Zod schema. Validation checks include: email format and length, password complexity requirements (see Section 14), email uniqueness (case-insensitive), and referral code validity (if provided). The backend also checks the HaveIBeenPwned API to verify the password has not appeared in a known data breach. If the password is found in the breach database, the registration proceeds with a warning that the user must explicitly acknowledge, or is rejected outright based on configuration.

**Step 3 — Account Creation:** Upon passing validation, the backend hashes the password using argon2id, generates a unique 8-character alphanumeric referral code for the new user, creates the user record with status `pending_verification` and KYC level 0, creates the referral relationship (if a referral code was provided), and creates two wallet records (demo and live, both with zero balances).

**Step 4 — OTP Generation and Delivery:** The backend generates a random 6-digit OTP, stores its argon2id hash in the OTPs table with a 10-minute expiry, and queues an email job to send the OTP to the user's email address. The email uses a React Email template with the platform's branding (red and black theme) and clearly displays the 6-digit code.

**Step 5 — Response to User:** The backend responds to the registration request with a success status indicating that email verification is required. No tokens are issued at this stage — the user cannot access any authenticated endpoints until their email is verified.

### 2.2 Referral Code Handling

If the user provides a referral code during registration, the backend verifies that the code exists and belongs to an active user. The referral relationship is established immediately upon account creation (the `Referrals` and `BinaryNodes` records are created). However, referral commissions are not earned until the referred user completes their first qualifying action (deposit or investment), preventing spam registrations from generating fraudulent commissions.

---

## 3. Login Flow

### 3.1 Step-by-Step Process

**Step 1 — Credential Submission:** The user submits their email address and password from the login page. The frontend sends a POST request to `/api/v1/auth/login`.

**Step 2 — Credential Verification:** The backend looks up the user by email (case-insensitive), checks that the account status is `active` (not pending_verification, suspended, banned, or closed), and verifies the password against the stored argon2id hash. If the account is `pending_verification`, the backend responds with an error instructing the user to verify their email. If the account is suspended or banned, the backend responds with a generic error message (not revealing the specific reason to prevent account enumeration).

**Step 3 — 2FA Check:** If the user has 2FA enabled (`twoFactorEnabled` is true), the backend does not issue tokens immediately. Instead, it responds with a status indicating that 2FA verification is required. The frontend then displays a 2FA input field where the user enters their 6-digit TOTP code. The frontend sends a POST request to `/api/v1/auth/login/2fa` with the user's email and the TOTP code. The backend verifies the TOTP code against the stored encrypted secret. If verification fails, the attempt is counted against the account lockout policy.

**Step 4 — Token Issuance:** Upon successful credential verification (and 2FA verification if applicable), the backend generates an access token (15-minute expiry) and a refresh token (7-day expiry). The access token is returned in the JSON response body. The refresh token is set as an HTTP-only, Secure, SameSite=Strict cookie with a 7-day Max-Age.

**Step 5 — Session and Device Recording:** The backend records the login event in the audit log, updates the user's `lastLoginAt` and `lastLoginIp` fields, stores the device fingerprint and user-agent in the session metadata (in Redis), and checks whether the login is from a new device. If the device is unrecognized, the backend queues an email notification alerting the user of the new login.

**Step 6 — Redirect:** The frontend stores the access token in memory and redirects the user to the dashboard. The refresh token cookie is automatically included in all subsequent requests by the browser.

### 3.2 Error Responses

Login error responses are intentionally generic to prevent account enumeration. The response does not differentiate between "email not found" and "wrong password" — both return the same error message: "Invalid email or password." Only the 2FA challenge response is distinguishable, as the frontend needs to know to display the 2FA input.

---

## 4. Email Verification

### 4.1 OTP Delivery

When an OTP is required (registration, password reset, or 2FA setup), the backend generates a cryptographically random 6-digit numeric code. The code is hashed using argon2id (with lightweight parameters suitable for quick verification) and stored in the OTPs table. The plaintext code is passed to the email dispatch job, which renders a React Email template and sends it via Resend. The email includes the 6-digit code prominently, the platform name and branding, a statement that the code expires in 10 minutes, and a warning never to share the code with anyone.

### 4.2 OTP Verification

The user enters the 6-digit code on the verification page. The frontend sends the code to the backend, which: (1) retrieves the most recent unexpired, unverified OTP record for the user's email and type; (2) verifies the provided code against the stored hash; (3) increments the `attempts` counter; (4) if the code matches, marks the OTP as verified and proceeds with the operation (account activation, password reset, or 2FA setup); (5) if the code does not match and attempts have not been exhausted, returns an error with the remaining attempts; (6) if the code does not match and attempts are exhausted, marks the OTP as expired and the user must request a new one.

### 4.3 OTP Constraints

- **Code Length:** 6 digits (numeric only, 000000–999999).
- **Expiry:** 10 minutes from generation.
- **Maximum Attempts:** 3 verification attempts per OTP. After 3 failed attempts, the OTP is invalidated and the user must request a new one.
- **Rate Limiting:** A maximum of 3 OTP send requests per minute per email address. A maximum of 10 OTP verification attempts per minute per email address.
- **Single Active OTP:** Only the most recently generated OTP for a given email and type is valid. Generating a new OTP automatically invalidates any previous unexpired OTPs for that email and type.

---

## 5. Password Reset

### 5.1 Reset Request Flow

**Step 1 — Request Initiation:** The user navigates to the "Forgot Password" page and enters their email address. The frontend sends a POST request to `/api/v1/auth/forgot-password`.

**Step 2 — Email Lookup and OTP Generation:** The backend looks up the user by email. If the user exists and is active, the backend generates a password reset OTP, stores its hash in the OTPs table (type: `password_reset`, 10-minute expiry), and sends the OTP to the user's email. If the user does not exist, the backend still returns a generic success response ("If an account with this email exists, a verification code has been sent") to prevent email enumeration.

**Step 3 — OTP Entry and New Password:** The user receives the email, navigates to the reset page, enters the OTP and their new password. The frontend sends a POST request to `/api/v1/auth/reset-password` with the email, OTP, and new password.

**Step 4 — Verification and Password Update:** The backend verifies the OTP (same logic as email verification OTP). If valid, the backend validates the new password against the password requirements (complexity, breach check, history check), hashes the new password with argon2id, updates the user's `passwordHash`, appends the old hash to the password history (for the 5-password reuse check), and invalidates all existing sessions for the user.

**Step 5 — Notification:** The backend sends an email notification to the user confirming that their password was changed. If the password reset was not initiated by the user, this email serves as an alert that their account may be compromised.

### 5.2 Session Invalidation on Password Reset

When a password is reset, all existing refresh tokens for the user are invalidated by incrementing the user's session version in Redis. Any subsequent refresh token attempts will fail because the stored session version will not match the token's version. The user must log in with their new password, which will issue a fresh set of tokens. This ensures that if an attacker had valid sessions, those sessions are immediately terminated.

---

## 6. 2FA Setup

### 6.1 Setup Flow

**Step 1 — Initiation:** The user navigates to Security Settings in their dashboard and clicks "Enable Two-Factor Authentication." The frontend sends a POST request to `/api/v1/auth/2fa/setup`.

**Step 2 — Secret Generation:** The backend generates a new TOTP secret using the `otpauth` library (160-bit random key, SHA-1 algorithm per the TOTP RFC). The backend returns the secret as a base32-encoded string and a `otpauth://` URI for QR code generation. The secret is NOT stored in the database at this point — it is held in the response only.

**Step 3 — QR Code Display:** The frontend renders the `otpauth://` URI as a QR code using a client-side QR code library. The user scans the QR code with their authenticator app (Google Authenticator, Authy, etc.). The frontend also displays the secret as a text string for users who cannot scan QR codes and must enter it manually.

**Step 4 — Verification:** The user enters a 6-digit TOTP code generated by their authenticator app. The frontend sends a POST request to `/api/v1/auth/2fa/verify-setup` with the code and the secret (which the frontend retained from Step 2). The backend verifies the TOTP code against the provided secret. If the code is correct, the backend encrypts the secret using AES-256 (with the `ENCRYPTION_KEY` environment variable) and stores the encrypted secret in the user's record.

**Step 5 — Backup Codes Generation:** Upon successful verification, the backend generates 10 random 8-character alphanumeric backup codes. These codes are hashed (using a fast hash suitable for single-use verification) and stored in the database. The plaintext backup codes are returned to the frontend exactly once.

**Step 6 — Backup Code Acknowledgment:** The frontend displays the backup codes in a modal with a clear warning that these codes will not be shown again. The user must click "I have saved my backup codes" to proceed. After acknowledgment, `twoFactorEnabled` is set to `true` on the user's record.

### 6.2 2FA Reconfiguration

If a user needs to set up 2FA again (e.g., they lost their authenticator app), they must first disable 2FA using one of their backup codes, then go through the setup flow again. This two-step process prevents an attacker who gains access to an active session from reconfiguring 2FA to their own device.

---

## 7. 2FA Verification

### 7.1 During Login

When a user with 2FA enabled logs in (after successfully providing their email and password), the login flow pauses at the 2FA verification step. The user is presented with a 6-digit code input field. They have two options:

- **Authenticator App Code:** Enter the current 6-digit TOTP code from their authenticator app.
- **Backup Code:** Enter one of their 10 backup codes (accessed via a "Use backup code" link).

The backend accepts either type of code. For TOTP codes, the backend decrypts the stored secret, generates the expected TOTP code for the current 30-second time window (with a ±1 window tolerance to account for clock drift), and compares. For backup codes, the backend compares against the stored hashed backup codes. If a backup code is used, it is immediately invalidated and cannot be used again. The backend responds with the remaining backup code count if the count is 5 or fewer, prompting the user to regenerate backup codes.

### 7.2 During Sensitive Operations

For operations that require 2FA verification (withdrawals, email changes, password changes, 2FA disable), the frontend displays a 2FA verification modal. The user enters their TOTP code or backup code, which is sent to a dedicated verification endpoint. The backend verifies the code and returns a short-lived 2FA verification token (5-minute expiry, stored in memory) that the frontend includes with the actual operation request. This two-step process ensures that 2FA is verified immediately before the sensitive operation, not cached from an earlier login.

### 7.3 TOTP Time Window Tolerance

The TOTP verification accepts codes from the current 30-second time window and the immediately preceding and following windows (±1 window, covering a 90-second total range). This tolerance accounts for clock drift between the server and the user's device, which is a common issue with TOTP implementations. The tolerance is not extended further (e.g., ±2 windows) because doing so would significantly weaken the security of the TOTP mechanism.

---

## 8. Session Management

### 8.1 Token Storage Strategy

The access token is stored in a JavaScript module-level variable in the frontend application. It is not stored in localStorage, sessionStorage, cookies, or IndexedDB. This means the access token is lost whenever the user refreshes the page or closes the browser tab. This is intentional: the frontend immediately calls the refresh endpoint on page load, using the HTTP-only refresh token cookie, to obtain a new access token. If the refresh fails (because the refresh token has expired or been invalidated), the user is redirected to the login page.

This storage strategy provides the strongest protection against access token theft via XSS. Even if an attacker executes arbitrary JavaScript in the user's browser, they cannot access the access token (it is in a closure, not in any web storage API). They could make API calls using the token while the script is running, but they cannot exfiltrate the token for later use.

### 8.2 Session Tracking

Every successful token refresh (which occurs on page load and when the access token expires) updates the session metadata in Redis. The session metadata includes: the device fingerprint (generated by the frontend using a library like FingerprintJS or a custom implementation based on canvas, WebGL, and navigator properties), the IP address (extracted from `X-Forwarded-For`), the user-agent string, and the last activity timestamp. This data supports the active sessions list and new device detection features.

### 8.3 Active Sessions List

Users can view their active sessions in the Security Settings page. The list displays each session's device type (derived from the user-agent), approximate location (derived from IP geolocation), last activity time, and current status (active or expired). Users can individually revoke sessions (except their current session) or revoke all other sessions with a single button. Session revocation is implemented by deleting the corresponding refresh token from Redis.

### 8.4 Session Expiry

Sessions expire when: (1) the refresh token's 7-day Max-Age expires (the browser deletes the cookie); (2) the refresh token is explicitly revoked (by the user or by the system); (3) the user's session version is incremented (due to password change, 2FA change, or admin action). In all cases, the next access token refresh attempt will fail, and the user will be redirected to the login page.

---

## 9. Token Refresh

### 9.1 Refresh Flow

**Trigger:** The frontend calls the refresh endpoint (`POST /api/v1/auth/refresh`) in two scenarios: (1) on initial page load (to obtain an access token after the in-memory token was lost due to refresh); (2) when an API request returns HTTP 401 (indicating the access token has expired).

**Process:** The frontend sends the refresh request with no explicit body — the refresh token is automatically included as an HTTP-only cookie by the browser. The backend extracts the refresh token from the cookie, verifies the JWT signature and expiry, checks the token's `jti` against Redis (to confirm it hasn't been revoked), checks the token's `sessionVersion` against the user's current session version in Redis (to confirm it hasn't been invalidated), and generates a new access token (15-minute expiry) and a new refresh token (7-day expiry).

**Rotation:** The old refresh token's `jti` is removed from Redis (or moved to a denylist with a short TTL equal to the old token's remaining validity). The new refresh token's `jti` is stored in Redis. The new refresh token is set as a new HTTP-only cookie, replacing the old one. This rotation ensures that even if an attacker copies a refresh token, they can use it only once before it becomes invalid.

### 9.2 Concurrent Refresh Handling

If the user has multiple browser tabs open and the access token expires simultaneously in all tabs, each tab may attempt to refresh the token concurrently. To handle this, the backend's refresh endpoint uses Redis-based locking: when a refresh is in progress for a given user, subsequent refresh requests from the same user are briefly delayed (or return the already-issued tokens if the refresh has completed). The frontend also implements a client-side mutex: a single refresh request is in flight at a time, and other tabs wait for it to complete before making their own requests.

### 9.3 Refresh Failure Handling

When the refresh endpoint returns an error (expired refresh token, revoked token, invalid session version), the frontend clears all authentication state and redirects the user to the login page with a message indicating that their session has expired. The frontend does not display the specific error reason to the user (to avoid leaking security information) but logs it for debugging.

---

## 10. Logout

### 10.1 Single Device Logout

When the user clicks "Log Out," the frontend performs two actions: (1) it discards the in-memory access token by setting the module-level variable to null; (2) it sends a POST request to `/api/v1/auth/logout`. The backend receives the request, extracts the refresh token from the cookie, removes the token's `jti` from Redis (revoking it), and clears the refresh token cookie by setting it with an empty value and a Max-Age of 0. The frontend then redirects the user to the login page.

### 10.2 Logout All Devices

When the user clicks "Log Out All Devices" in Security Settings, the frontend sends a POST request to `/api/v1/auth/logout-all`. The backend increments the user's session version in Redis, which invalidates all refresh tokens across all devices (because every refresh token includes the session version at the time of issuance). The backend also clears the current refresh token cookie. All other devices will fail their next token refresh and be redirected to the login page.

### 10.3 Frontend Cleanup

On logout, the frontend clears all client-side state: the in-memory access token, TanStack Query cache (to prevent cached data from being displayed to a different user), and any local UI state. This ensures that if a different user logs in on the same device (e.g., on a shared computer), they do not see any residual data from the previous session.

---

## 11. Account Lockout

### 11.1 Progressive Lockout Tiers

The account lockout mechanism is designed to stop brute-force attacks while minimizing impact on legitimate users who occasionally mistype their password. Lockout counters are tracked per email address and per IP address independently, providing defense against both targeted attacks on a specific account and broad attacks across many accounts from a single IP.

**Tier 1 — 5 Failed Attempts:** The email address is locked for 15 minutes. The IP address accumulates a failure count but is not yet locked independently. The user sees an error message with a countdown timer showing when they can retry. An audit log entry is created.

**Tier 2 — 10 Failed Attempts:** The email address is locked for 1 hour. The IP address is locked for 15 minutes. An email notification is sent to the user alerting them of repeated failed login attempts (which may indicate someone is trying to access their account). An audit log entry is created.

**Tier 3 — 20 Failed Attempts:** The email address is permanently locked until an administrator reviews and unlocks it. The IP address is locked for 1 hour. Both the user and the admin team are notified. An audit log entry is created with elevated severity.

### 11.2 Lockout Tracking

Lockout state is stored in Redis with TTL-based expiry for automatic unlocking. The data structure per email is: failure count, lockout expiry timestamp, and last failure timestamp. The data structure per IP is: failure count, lockout expiry timestamp, and last failure timestamp. When a successful login occurs, the failure count for both the email and the IP is reset to zero. When the lockout period expires, the failure count is reset to zero on the next request (allowing the user to try again from tier 1 if they fail again).

### 11.3 Lockout Bypass for Admin Unlock

Administrators can unlock a locked account through the admin dashboard. The unlock action resets the email's lockout state in Redis, creates an audit log entry, and optionally notifies the user via email that their account has been unlocked. The IP-level lockout is not affected by admin unlock (the IP lockout expires naturally based on its TTL). See [SECURITY_REQUIREMENTS](./SECURITY_REQUIREMENTS.md) for the related fraud detection rules.

---

## 12. Device Tracking

### 12.1 Device Fingerprinting

On each successful login, the backend records the device characteristics associated with the session. The device fingerprint is generated client-side using a combination of: the `navigator.userAgent` string, screen resolution, color depth, timezone offset, installed plugins (if available), and canvas/WebGL rendering fingerprint. The fingerprint is sent as a custom header (`X-Device-Fingerprint`) during login and token refresh. The backend stores the fingerprint alongside the session metadata in Redis.

### 12.2 New Device Detection

When a login occurs from a device fingerprint that has not been associated with the user's account in the past 30 days, the backend flags it as a new device. The backend sends an email notification to the user with: the timestamp of the login, the approximate geographic location (derived from the IP address using a geolocation API), the device type (desktop/mobile/tablet derived from the user-agent), and the browser name. The email includes a "Was this you?" link that allows the user to quickly review their active sessions and revoke any they don't recognize. If the user does not recognize the login, they are advised to change their password immediately and enable 2FA if not already enabled.

### 12.3 Device History

The platform maintains a rolling 90-day history of devices associated with each user's account. Devices that have not been seen in 90 days are removed from the history (but the session itself may still be valid if the refresh token hasn't expired). The device history powers the active sessions list in Security Settings and the new device detection logic.

---

## 13. OAuth/Social Login

### 13.1 Phase 1 Scope

OAuth and social login (Google, Apple, Facebook, etc.) are explicitly out of scope for Phase 1. The platform launches with email-and-password authentication only. This decision is driven by: (1) the complexity of implementing secure OAuth flows correctly, (2) the need to collect user identity information (name, email, phone) that may not be available from all social providers, (3) the KYC requirements that necessitate verified email ownership regardless of the login method, and (4) the target market's preference for direct email registration.

### 13.2 Future Considerations

OAuth/social login should be evaluated for Phase 2 based on user demand and market analysis. The architecture is designed to accommodate OAuth without major refactoring: the authentication layer is modular (separate services for password, 2FA, and — in the future — OAuth), and the user model already supports the concept of identity verification independent of the login method. Key considerations for future implementation include: (1) choosing providers relevant to the target markets (Google and Apple are universal; regional providers may be relevant), (2) ensuring that social login accounts still require email verification and KYC, (3) handling the account linking flow when a user initially registers with email and later adds social login, and (4) the security implications of relying on a third party for authentication (session hijacking on the provider side, provider outages affecting login availability).

---

## 14. Password Requirements

### 14.1 Complexity Rules

All user passwords must meet the following minimum complexity requirements, enforced at both the client-side (for immediate feedback) and server-side (for security enforcement):

- **Minimum Length:** 8 characters. Passwords shorter than 8 characters are rejected immediately without further checks.
- **Uppercase Letters:** At least 1 character from A–Z.
- **Lowercase Letters:** At least 1 character from a–z.
- **Numbers:** At least 1 digit from 0–9.
- **Special Characters:** At least 1 character from `!@#$%^&*()_+-=[]{}|;:',.<>?/~\`` (the full printable ASCII special character set).
- **Maximum Length:** 128 characters. Excessively long passwords can cause denial-of-service through CPU-intensive hashing and are rejected.

These requirements are implemented as a Zod custom validator that produces specific error messages indicating which requirement(s) are not met, enabling the frontend to provide targeted feedback (e.g., "Password must contain at least one special character").

### 14.2 Breach Database Check

Every new password (registration and password change) is checked against the HaveIBeenPwned breach database using the k-anonymity API. The backend sends the first 5 characters of the password's SHA-1 hash to the API and checks if the full hash appears in the response. If the password is found in the breach database, the backend either rejects the password or returns a warning that the user must acknowledge before proceeding (configurable via the `REJECT_BREACHED_PASSWORDS` environment variable). The password is never sent to any external service in plaintext.

### 14.3 Password History

The platform prevents password reuse by storing the hashes of the user's last 5 passwords. When a user changes their password, the new password is hashed and compared against the stored history hashes. If the new password matches any of the last 5 passwords, the change is rejected with an error message. Password history hashes are stored in a separate database table or as a JSON array in the user record, and they are themselves hashed with a different salt than the current password hash to prevent cross-referencing.

### 14.4 Password Change Flow

**Step 1 — Current Password Verification:** The user navigates to "Change Password" in Security Settings and enters their current password, new password, and confirmation of the new password. The frontend sends a POST request to `/api/v1/auth/change-password`.

**Step 2 — Validation:** The backend verifies the current password, validates the new password against the complexity requirements, checks the breach database, checks the password history, and confirms the new password and confirmation match.

**Step 3 — Update:** The backend hashes the new password, updates the user's `passwordHash`, appends the old hash to the password history (maintaining the 5-password limit by removing the oldest entry if necessary), invalidates all existing sessions (incrementing session version), and creates an audit log entry.

**Step 4 — Notification:** The backend sends an email notification confirming the password change. If the user did not initiate this change, the email serves as an alert, and the user is advised to contact support immediately.