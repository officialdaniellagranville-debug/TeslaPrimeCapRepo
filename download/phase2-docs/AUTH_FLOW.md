# Auth Flow — TeslaPrimeCapital

**Project:** TeslaPrimeCapital — Enterprise Investment Platform  
**Phase:** 2 — Technical Architecture  
**Version:** 1.0.0  
**Status:** Draft  
**Tech Stack:** Next.js · TypeScript · JWT · bcrypt/argon2id · TOTP 2FA · Redis · PostgreSQL  

---

## Table of Contents

1. [Authentication Overview](#1-authentication-overview)
2. [Registration Flow](#2-registration-flow)
3. [Login Flow](#3-login-flow)
4. [Token Lifecycle](#4-token-lifecycle)
5. [2FA / TOTP Flow](#5-2fa--totp-flow)
6. [Password Reset Flow](#6-password-reset-flow)
7. [Email Verification Flow](#7-email-verification-flow)
8. [Session Management](#8-session-management)
9. [Role-Based Access Control](#9-role-based-access-control)
10. [KYC Gate](#10-kyc-gate)
11. [Demo vs Live Mode Context](#11-demo-vs-live-mode-context)
12. [Security Measures](#12-security-measures)

---

## 1. Authentication Overview

TeslaPrimeCapital implements a **JWT-based stateless authentication** system with **dual-token architecture**: a short-lived access token and a long-lived refresh token with rotation. This design separates short-term API authorization from long-term session management, minimising the blast radius of token theft while preserving a seamless user experience.

### 1.1 Access Token

| Property | Value |
|---|---|
| **Type** | Signed JWT (HS256) |
| **Lifetime** | 15 minutes |
| **Storage** | JavaScript module-level variable (in-memory only) |
| **Transport** | `Authorization: Bearer <token>` header |
| **Claims** | `sub` (user ID), `role`, `kycLevel`, `mode`, `iat`, `exp` |

The access token is **never** stored in `localStorage`, `sessionStorage`, cookies, or `IndexedDB`. It lives exclusively in a closure-scoped JS variable and is lost on every page refresh. This eliminates XSS-based token exfiltration vectors.

### 1.2 Refresh Token

| Property | Value |
|---|---|
| **Type** | Signed JWT (HS256) |
| **Lifetime** | 7 days |
| **Storage** | HTTP-only, `Secure`, `SameSite=Strict` cookie |
| **Transport** | Automatically attached by the browser |
| **Claims** | `sub`, `jti`, `sessionVersion`, `iat`, `exp` |

The refresh token is the **only** persistent authentication artifact. Its HTTP-only flag prevents JavaScript access; `SameSite=Strict` prevents cross-site transmission. Each use triggers **token rotation** — the old token is invalidated and a new one is issued.

### 1.3 Design Principles

- **Stateless API layer** — the backend validates JWTs on every request; no server-side session lookup is needed for normal API calls.
- **Redis-backed session state** — refresh token `jti` values, session versions, lockout counters, and device metadata live in Redis for sub-millisecond lookups.
- **Zero Trust** — every request is authenticated and authorised; the reverse proxy is not a substitute for application-layer auth.
- **Defence in depth** — rate limiting, CSRF tokens, CSP headers, input validation (Zod), and audit logging operate as independent security layers.

---

## 2. Registration Flow

### 2.1 Sequence Diagram

```mermaid
sequenceDiagram
    actor U as User
    participant FE as Frontend (Next.js)
    participant API as Backend API
    participant DB as PostgreSQL
    participant Redis as Redis
    participant Email as Resend / React Email
    participant HIBP as HaveIBeenPwned API

    U->>FE: Fill registration form (email, password, referral?)
    FE->>FE: Client-side validation (email format, password strength)
    FE->>API: POST /api/v1/auth/register { email, password, referralCode? }

    API->>API: Zod schema validation
    API->>DB: Check email uniqueness (case-insensitive)
    DB-->>API: Email available
    API->>HIBP: SHA-1 prefix (k-anonymity)
    HIBP-->>API: Breach status
    alt Password in breach
        API-->>FE: 400 — Password found in breach (or warning)
    end

    API->>DB: Check referral code (if provided)
    DB-->>API: Referral valid / invalid
    alt Referral invalid
        API-->>FE: 400 — Invalid referral code
    end

    API->>API: Hash password (argon2id)
    API->>DB: INSERT User (status: pending_verification, role: UNVERIFIED)
    API->>DB: INSERT Wallet (demo, $0) + Wallet (live, $0)
    API->>DB: INSERT Referral relationship (if code provided)

    API->>API: Generate 6-digit OTP
    API->>Redis: Store OTP hash (TTL 10 min)
    API->>Email: Send verification email (React Email template)
    Email-->>U: Email with 6-digit OTP

    API-->>FE: 201 — Account created, verification required
    FE-->>U: Redirect to /verify-email
```

### 2.2 Validation Rules

| Field | Rule |
|---|---|
| **Email** | RFC 5322 format, max 254 chars, case-insensitive uniqueness |
| **Password** | Min 8 / max 128 chars; ≥ 1 uppercase, ≥ 1 lowercase, ≥ 1 digit, ≥ 1 special char |
| **Referral Code** | Optional; 8-char alphanumeric; must belong to an active user |
| **Breach Check** | HaveIBeenPwned k-anonymity API; configurable reject/warn via `REJECT_BREACHED_PASSWORDS` |

### 2.3 Post-Registration State

- Account status: `pending_verification`
- Role: `UNVERIFIED` (can only verify email and browse public pages)
- Session: none — no tokens are issued until email is verified
- Wallets: demo and live wallets created with zero balances
- Referral: relationship recorded; commissions deferred until first qualifying action

---

## 3. Login Flow

### 3.1 Sequence Diagram

```mermaid
sequenceDiagram
    actor U as User
    participant FE as Frontend
    participant API as Backend API
    participant DB as PostgreSQL
    participant Redis as Redis
    participant Audit as Audit Log

    U->>FE: Enter email + password
    FE->>API: POST /api/v1/auth/login { email, password }

    API->>Redis: Check rate limit (5/min per IP, 5/min per email)
    Redis-->>API: Under limit
    API->>Redis: Check lockout state (email + IP)
    Redis-->>API: Not locked

    API->>DB: SELECT user BY email (case-insensitive)
    DB-->>API: User record
    alt Account not active
        API-->>FE: 401 — Invalid email or password (generic)
    end

    API->>API: Verify password against argon2id hash
    alt Password invalid
        API->>Redis: Increment failure count (email + IP)
        API->>Audit: Log failed login
        alt Failure count >= 20
            API->>Redis: Permanent lock (admin unlock only)
            API->>Email: Alert user + notify admins
        else Failure count >= 10
            API->>Redis: Lock email 1 hr, IP 15 min
            API->>Email: Alert user
        else Failure count >= 5
            API->>Redis: Lock email 15 min
        end
        API-->>FE: 401 — Invalid email or password
    end

    API->>Redis: Reset failure counts (email + IP)
    API->>DB: Check twoFactorEnabled
    alt 2FA enabled
        API-->>FE: 200 — { requires2FA: true, email }
        FE-->>U: Show 2FA input
        U->>FE: Enter TOTP code (or backup code)
        FE->>API: POST /api/v1/auth/login/2fa { email, code }
        API->>API: Verify TOTP (±1 window) or backup code
        alt 2FA invalid
            API->>Redis: Increment failure count
            API-->>FE: 401 — Invalid 2FA code
        end
    end

    API->>API: Generate access token (15 min)
    API->>API: Generate refresh token (7 days)
    API->>Redis: Store refresh token jti
    API->>Redis: Store session metadata (device, IP, UA)
    API->>DB: UPDATE lastLoginAt, lastLoginIp
    API->>Audit: Log successful login

    API-->>FE: 200 — { accessToken, user }
    Note over FE: Set access token in memory<br/>Refresh token set via Set-Cookie header

    alt New device detected
        API->>Email: Send new device notification
    end

    FE-->>U: Redirect to /dashboard
```

### 3.2 Error Response Policy

All login failures return the **same** generic message: `"Invalid email or password."` The only distinguishable response is the 2FA challenge (`requires2FA: true`), which the frontend needs to render the correct UI. This prevents account enumeration.

### 3.3 Progressive Lockout Tiers

| Tier | Failed Attempts | Email Lock | IP Lock | Notification |
|---|---|---|---|---|
| 1 | 5 | 15 min | — | Audit log only |
| 2 | 10 | 1 hour | 15 min | Email to user |
| 3 | 20 | Permanent (admin unlock) | 1 hour | Email to user + alert admins |

Counters reset on successful login or after lockout TTL expiry.

---

## 4. Token Lifecycle

### 4.1 Access Token

```
┌──────────────────────────────────────────────────────┐
│  ACCESS TOKEN (JWT, HS256)                            │
│                                                      │
│  Header:  { "alg": "HS256", "typ": "JWT" }           │
│  Payload: {                                           │
│    "sub": "usr_abc123",                               │
│    "role": "USER",                                    │
│    "kycLevel": 1,                                     │
│    "mode": "live",                                    │
│    "iat": 1700000000,                                 │
│    "exp": 1700000900    ← 15 minutes                  │
│  }                                                   │
│  Storage: JS in-memory variable                       │
│  Transport: Authorization: Bearer <token>             │
└──────────────────────────────────────────────────────┘
```

### 4.2 Refresh Token

```
┌──────────────────────────────────────────────────────┐
│  REFRESH TOKEN (JWT, HS256)                           │
│                                                      │
│  Header:  { "alg": "HS256", "typ": "JWT" }           │
│  Payload: {                                           │
│    "sub": "usr_abc123",                               │
│    "jti": "rt_x9f2k8m1",                              │
│    "sessionVersion": 3,                               │
│    "iat": 1700000000,                                 │
│    "exp": 1700604800    ← 7 days                      │
│  }                                                   │
│  Storage: HTTP-only, Secure, SameSite=Strict cookie   │
│  Transport: Automatically by browser                  │
└──────────────────────────────────────────────────────┘
```

### 4.3 Token Refresh Flow

```mermaid
sequenceDiagram
    participant FE as Frontend
    participant API as Backend API
    participant Redis as Redis

    Note over FE: Triggered on page load<br/>or 401 response

    FE->>API: POST /api/v1/auth/refresh (cookie auto-attached)

    API->>API: Extract refresh token from cookie
    API->>API: Verify JWT signature + expiry
    API->>Redis: CHECK jti exists (not revoked)
    alt jti not found
        API-->>FE: 401 — Invalid session
        FE->>FE: Clear state, redirect to /login
    end
    API->>Redis: GET user sessionVersion
    alt sessionVersion mismatch
        API-->>FE: 401 — Session invalidated
        FE->>FE: Clear state, redirect to /login
    end

    API->>Redis: DELETE old jti (or move to denylist)
    API->>API: Generate new access token (15 min)
    API->>API: Generate new refresh token (7 days)
    API->>Redis: SET new jti
    API-->>FE: 200 — { accessToken }
    Note over FE: New refresh token set via Set-Cookie

    FE->>FE: Store accessToken in memory
    FE->>FE: Retry failed request (if triggered by 401)
```

### 4.4 Token Blacklist on Logout

On logout, the refresh token's `jti` is removed from Redis (or added to a short-TTL denylist equal to the token's remaining validity). The access token is discarded from memory. Since the access token expires in 15 minutes, no server-side blacklist is maintained for it — the window of misuse is negligible.

**Logout all devices** is implemented by incrementing the user's `sessionVersion` in Redis. Every subsequent refresh attempt fails because the token's embedded version no longer matches the stored version.

### 4.5 Concurrent Refresh Handling

When multiple browser tabs attempt to refresh simultaneously, a **Redis-based lock** ensures only one refresh proceeds at a time. The frontend also implements a client-side mutex — a single in-flight refresh promise is shared across all tabs via a BroadcastChannel or shared state.

---

## 5. 2FA / TOTP Flow

### 5.1 Setup Sequence

```mermaid
sequenceDiagram
    actor U as User
    participant FE as Frontend
    participant API as Backend API
    participant DB as PostgreSQL

    U->>FE: Navigate to Security Settings → Enable 2FA
    FE->>API: POST /api/v1/auth/2fa/setup

    API->>API: Generate TOTP secret (160-bit, otpauth lib)
    API->>API: Build otpauth:// URI (issuer=TeslaPrimeCapital, user email)
    API-->>FE: 200 — { secret (base32), otpauthUri }

    FE->>FE: Render QR code from otpauth:// URI
    FE->>FE: Display manual-entry secret key
    FE-->>U: "Scan QR code with your authenticator app"

    U->>FE: Enter 6-digit TOTP code from authenticator
    FE->>API: POST /api/v1/auth/2fa/verify-setup { code, secret }

    API->>API: Verify TOTP code against secret (±1 window)
    alt Code invalid
        API-->>FE: 400 — Invalid code
    end

    API->>API: Encrypt secret with AES-256 (ENCRYPTION_KEY)
    API->>DB: UPDATE user SET twoFactorSecretEncrypted, twoFactorEnabled = false
    API->>API: Generate 10 backup codes (8-char alphanumeric)
    API->>DB: Store hashed backup codes
    API-->>FE: 200 — { backupCodes: ["aB3xY9kL", ...] }

    FE-->>U: Display backup codes (one-time modal)
    U->>FE: Click "I have saved my backup codes"
    FE->>API: POST /api/v1/auth/2fa/confirm-setup
    API->>DB: UPDATE user SET twoFactorEnabled = true
    API-->>FE: 200 — 2FA enabled
    FE-->>U: Show success confirmation
```

### 5.2 Verification on Login

```mermaid
sequenceDiagram
    actor U as User
    participant FE as Frontend
    participant API as Backend API
    participant DB as PostgreSQL
    participant Redis as Redis

    Note over FE: Credentials already verified<br/>2FA challenge required

    FE-->>U: Show 2FA input (code + "Use backup code" link)

    alt Authenticator code
        U->>FE: Enter 6-digit TOTP code
        FE->>API: POST /api/v1/auth/login/2fa { email, code }
        API->>DB: Get encrypted TOTP secret
        API->>API: Decrypt secret (AES-256)
        API->>API: Compute expected TOTP (current ±1 window)
        API->>API: Compare provided code
    else Backup code
        U->>FE: Click "Use backup code", enter 8-char code
        FE->>API: POST /api/v1/auth/login/2fa { email, code, isBackup: true }
        API->>DB: Compare against hashed backup codes
        alt Code matches
            API->>DB: Invalidate used backup code
            API->>Redis: Decrement remaining backup code count
        end
    end

    alt Verification fails
        API->>Redis: Increment 2FA failure count
        API-->>FE: 401 — Invalid code
    end

    Note over API: Proceed with token issuance (see Login Flow §3.1)
```

### 5.3 Disable 2FA Flow

```mermaid
sequenceDiagram
    actor U as User
    participant FE as Frontend
    participant API as Backend API
    participant DB as PostgreSQL
    participant Redis as Redis

    U->>FE: Security Settings → Disable 2FA
    FE-->>U: Show confirmation modal (password + TOTP code)

    U->>FE: Enter current password + TOTP code
    FE->>API: POST /api/v1/auth/2fa/disable { password, totpCode }

    API->>DB: Verify password
    alt Password invalid
        API-->>FE: 401 — Invalid password
    end

    API->>DB: Decrypt TOTP secret, verify TOTP code
    alt Code invalid
        API-->>FE: 401 — Invalid 2FA code
    end

    API->>DB: Clear twoFactorSecretEncrypted, twoFactorEnabled = false
    API->>DB: Delete backup codes
    API->>Redis: Increment sessionVersion (invalidate all sessions)
    API->>Audit: Log 2FA disabled
    API-->>FE: 200 — 2FA disabled
    FE-->>U: Redirect to login (all sessions invalidated)
```

### 5.4 2FA for Sensitive Operations

Operations such as withdrawals, email changes, and password changes require a **fresh 2FA verification** — not the cached login state. The frontend shows a 2FA modal, the code is verified via a dedicated endpoint, and a short-lived (5 min) 2FA verification token is returned. This token is included in the subsequent operation request.

### 5.5 TOTP Time Window

The verifier accepts codes from the **current** 30-second window and the **immediately preceding and following** windows (±1, covering 90 seconds total). This accounts for clock drift without significantly weakening security.

---

## 6. Password Reset Flow

```mermaid
sequenceDiagram
    actor U as User
    participant FE as Frontend
    participant API as Backend API
    participant DB as PostgreSQL
    participant Redis as Redis
    participant Email as Resend

    U->>FE: Navigate to "Forgot Password"
    U->>FE: Enter email address
    FE->>API: POST /api/v1/auth/forgot-password { email }

    API->>Redis: Check rate limit (3/hr per IP + email)
    API->>DB: SELECT user BY email
    alt User exists and is active
        API->>API: Generate 6-digit OTP
        API->>Redis: Store OTP hash (type: password_reset, TTL 10 min)
        API->>Email: Send reset code email
    else User not found
        Note over API: Return generic success (prevent email enumeration)
    end
    API-->>FE: 200 — "If an account exists, a code was sent"
    FE-->>U: "Check your email"

    U->>FE: Enter OTP + new password
    FE->>API: POST /api/v1/auth/reset-password { email, otp, newPassword }

    API->>Redis: Retrieve OTP record
    API->>API: Verify OTP hash (increment attempts, max 3)
    alt OTP invalid / expired
        API-->>FE: 400 — Invalid or expired code
    end

    API->>API: Validate new password (complexity, breach check, history)
    alt Password fails validation
        API-->>FE: 400 — Validation errors
    end

    API->>API: Hash new password (argon2id)
    API->>DB: UPDATE passwordHash, append old hash to passwordHistory (last 5)
    API->>Redis: Increment sessionVersion (invalidate all sessions)
    API->>DB: Mark OTP as verified
    API->>Audit: Log password reset
    API->>Email: Send "password changed" notification
    API-->>FE: 200 — Password reset successful
    FE-->>U: Redirect to /login
```

### 6.1 Session Invalidation on Reset

All existing sessions are immediately invalidated by incrementing the user's `sessionVersion` in Redis. Every refresh token carries the version at issuance time; a mismatch forces re-authentication.

---

## 7. Email Verification Flow

```mermaid
sequenceDiagram
    actor U as User
    participant FE as Frontend
    participant API as Backend API
    participant DB as PostgreSQL
    participant Redis as Redis
    participant Email as Resend / React Email

    Note over U,FE: Triggered after registration OR resend request

    U->>FE: POST /api/v1/auth/email/verify/resend { email }
    FE->>API: POST /api/v1/auth/email/verify/resend { email }

    API->>Redis: Check rate limit (3 sends/min per email)
    API->>DB: Check user status is pending_verification
    API->>API: Generate 6-digit OTP
    API->>Redis: Store OTP hash (type: email_verification, TTL 10 min)<br/>Invalidate any previous unexpired OTP for this email+type
    API->>Email: Send verification email (React Email template)
    Email-->>U: Email with 6-digit code (expires in 10 min)
    API-->>FE: 200 — Code sent

    U->>FE: Enter 6-digit OTP on /verify-email page
    FE->>API: POST /api/v1/auth/email/verify { email, otp }

    API->>Redis: Retrieve latest unexpired, unverified OTP
    alt No valid OTP found
        API-->>FE: 400 — No valid code found, request a new one
    end

    API->>Redis: Increment attempt counter
    alt Attempts exhausted (>= 3)
        API->>Redis: Mark OTP as expired
        API-->>FE: 400 — Too many attempts, request a new code
    end

    API->>API: Verify OTP against stored hash
    alt OTP mismatch
        API-->>FE: 400 — Invalid code (remainingAttempts: N)
    end

    API->>Redis: Mark OTP as verified
    API->>DB: UPDATE user SET status = 'active', role = 'USER'
    API->>Audit: Log email verification
    API->>API: Issue access token + refresh token (auto-login)
    API-->>FE: 200 — { accessToken, user } + Set-Cookie refresh token
    FE-->>U: Redirect to /dashboard (auto-logged in)
```

### 7.1 OTP Constraints

| Constraint | Value |
|---|---|
| **Code format** | 6 digits (000000–999999) |
| **Expiry** | 10 minutes |
| **Max attempts** | 3 per OTP |
| **Send rate limit** | 3 per minute per email |
| **Verify rate limit** | 10 per minute per email |
| **Single active OTP** | New OTP invalidates previous unexpired OTPs for same email+type |

---

## 8. Session Management

### 8.1 Redis Session Store

Session metadata is stored in Redis with the following structure:

```
session:{jti} → {
  userId: "usr_abc123",
  deviceFingerprint: "fp_a1b2c3d4",
  ipAddress: "203.0.113.42",
  userAgent: "Mozilla/5.0 ...",
  createdAt: 1700000000,
  lastActivityAt: 1700003600,
  mode: "live"
}
TTL: 7 days (matches refresh token expiry)
```

A user-level key tracks the session version for bulk invalidation:

```
sessionVersion:{userId} → 3
TTL: 30 days
```

### 8.2 Session Management Sequence

```mermaid
sequenceDiagram
    actor U as User
    participant FE as Frontend
    participant API as Backend API
    participant Redis as Redis
    participant Audit as Audit Log

    Note over U,API: Viewing active sessions in Security Settings

    U->>FE: Navigate to Security Settings → Active Sessions
    FE->>API: GET /api/v1/auth/sessions (Bearer token)
    API->>Redis: SCAN session:{userId}:*
    Redis-->>API: List of session entries
    API-->>FE: 200 — [ { device, location, lastActivity, current }, ... ]
    FE-->>U: Display session list

    Note over U,API: Revoking a single session

    U->>FE: Click "Revoke" on a non-current session
    FE->>API: DELETE /api/v1/auth/sessions/:jti
    API->>Redis: DEL session:{jti}
    API->>Audit: Log session revocation
    API-->>FE: 200 — Session revoked

    Note over U,API: Revoking all other sessions

    U->>FE: Click "Log Out All Other Devices"
    FE->>API: POST /api/v1/auth/logout-all
    API->>Redis: INCR sessionVersion:{userId}
    API->>Redis: DEL all session:* keys for userId (except current jti)
    API->>Audit: Log bulk session revocation
    API-->>FE: 200 — All other sessions revoked

    Note over FE: Other devices fail next refresh<br/>(sessionVersion mismatch)
```

### 8.3 Concurrent Session Limits

The platform enforces a maximum of **5 concurrent active sessions** per user. When a 6th login is attempted, the oldest session (by `lastActivityAt`) is automatically revoked. The user receives a notification indicating which device was logged out.

### 8.4 Session Invalidation Triggers

| Event | Mechanism |
|---|---|
| Password change | Increment `sessionVersion` |
| 2FA enable / disable | Increment `sessionVersion` |
| Admin ban / suspend | Increment `sessionVersion` |
| User "logout all" | Increment `sessionVersion` |
| Single device logout | Delete specific `jti` from Redis |
| Session TTL expiry | Redis auto-expires key (7 days) |

### 8.5 Device Fingerprinting

On each login and token refresh, the frontend generates a device fingerprint using:

- `navigator.userAgent` string
- Screen resolution and colour depth
- Timezone offset
- Canvas / WebGL rendering hash
- Installed plugins (if available)

The fingerprint is sent via the `X-Device-Fingerprint` custom header. When a login originates from a **previously unseen** fingerprint (not associated with the user in the past 30 days), the backend sends a "new device login" email notification containing the timestamp, approximate location, device type, and browser name.

A rolling **90-day device history** is maintained per user. Devices not seen in 90 days are pruned from the history.

---

## 9. Role-Based Access Control

### 9.1 Role Hierarchy

```
SuperAdmin (Level 6)
├── Admin (Level 5)
│   ├── KYC Officer (Level 4)
│   └── Support Agent (Level 3)
│       └── User / Investor (Level 2)
│           └── Unverified User (Level 1)
```

Higher roles **inherit all permissions** of the roles below them. A SuperAdmin possesses every permission available to all other roles, plus exclusive permissions (role management, fee management, wallet adjustment, KYC override, impersonation).

### 9.2 Role Assignment & Enforcement

```mermaid
sequenceDiagram
    actor Admin as Admin / SuperAdmin
    participant FE as Admin Dashboard
    participant MW as Middleware Chain
    participant API as API Handler
    participant DB as PostgreSQL
    participant Redis as Redis
    participant Audit as Audit Log

    Note over MW: Incoming request to /api/v1/admin/users/:id/role

    MW->>MW: 1. Extract Bearer token
    MW->>MW: 2. Verify JWT signature + expiry
    MW->>MW: 3. Extract role from claims
    MW->>MW: 4. Check role >= required level

    alt Role insufficient
        MW-->>FE: 403 Forbidden
    end

    MW->>Redis: 5. Check IP against ADMIN_ALLOWED_IPS
    alt IP not whitelisted
        MW-->>FE: 403 Forbidden
    end

    MW->>API: Request passes all checks
    API->>DB: UPDATE user SET role = :newRole
    API->>Redis: Invalidate permission cache for user
    API->>Audit: Log role change (actor, target, oldRole, newRole, reason)
    API->>FE: 200 — Role updated
    FE->>Admin: Show success + notify affected user via email
```

### 9.3 Middleware Chain for Route Protection

Every API route passes through the following middleware chain:

```
Request → [Rate Limiter] → [CORS] → [CSRF Token] → [JWT Verify] → [Role Check] → [KYC Check] → [Mode Context] → Handler
```

| Layer | Responsibility |
|---|---|
| **Rate Limiter** | Redis sliding-window counter; returns 429 with `Retry-After` |
| **CORS** | Validate `Origin` against whitelist; set `Access-Control-*` headers |
| **CSRF Token** | Validate `X-CSRF-Token` on POST/PUT/PATCH/DELETE (SSR-injected) |
| **JWT Verify** | Verify signature, expiry, and claims; attach `user` to request |
| **Role Check** | Compare user's role against route's required minimum role |
| **KYC Check** | Verify user's KYC level meets the endpoint's requirement (if any) |
| **Mode Context** | Resolve `demo` or `live` from request header / query param / default |
| **Handler** | Execute business logic |

### 9.4 Permission Inheritance Model

Permissions are resolved at **middleware level** in a single check. The middleware maintains a permission map keyed by role, where each role's entry is the union of its own permissions plus all permissions from roles below it in the hierarchy. This map is cached in Redis and invalidated when roles or permissions change.

```
// Conceptual permission resolution
const ROLE_PERMISSIONS = {
  SUPER_ADMIN:  { /* all 36 permissions */ },
  ADMIN:        { /* inherits KYC_OFFICER + SUPPORT_AGENT + USER, plus admin ops */ },
  KYC_OFFICER:  { /* inherits SUPPORT_AGENT, plus KYC review */ },
  SUPPORT_AGENT:{ /* inherits USER, plus ticket management */ },
  USER:         { /* own-profile, own-wallet, deposit, invest, withdraw, referral */ },
  UNVERIFIED:   { /* email verification only */ },
};
```

### 9.5 Role Transition Rules

| Transition | Trigger | Actor | Audit |
|---|---|---|---|
| UNVERIFIED → USER | Email verified | System (auto) | Yes |
| USER → KYC_OFFICER | Promotion | SuperAdmin / Admin | Yes + training required |
| USER → SUPPORT_AGENT | Promotion | SuperAdmin / Admin | Yes + training required |
| Any → BANNED | Policy violation | Admin / SuperAdmin | Yes + email notification |
| Any role → USER | Demotion | SuperAdmin | Yes + email notification |

---

## 10. KYC Gate

### 10.1 KYC Levels and Restrictions

| KYC Level | Deposit Limit | Withdrawal Allowed | Plan Tiers Available |
|---|---|---|---|
| **Level 0** (Unverified) | None (no deposits) | No | None |
| **Level 1** (Basic) | $5,000 per transaction | Up to $1,000/day | Starter, Bronze |
| **Level 2** (Enhanced) | $50,000 per transaction | Up to $25,000/day | All tiers (including Gold, Platinum) |

### 10.2 KYC-Gated Operations

The following operations require minimum KYC levels, enforced in middleware:

```mermaid
sequenceDiagram
    participant FE as Frontend
    participant MW as KYC Middleware
    participant API as API Handler

    FE->>MW: POST /api/v1/withdrawals (Bearer token)

    MW->>MW: Extract kycLevel from JWT claims
    alt kycLevel < 1
        MW-->>FE: 403 — "Complete KYC verification to withdraw"
    end

    alt kycLevel < 2 AND planTier in [Gold, Platinum]
        MW-->>FE: 403 — "Enhanced KYC required for this plan tier"
    end

    MW->>API: Request passes KYC check
```

| Operation | Min KYC Level | Notes |
|---|---|---|
| Create deposit | Level 1 | Crypto and gift card deposits |
| Request withdrawal | Level 1 | 21% fee applied |
| Withdraw > $1,000/day | Level 2 | Daily cumulative check |
| Activate Gold / Platinum plan | Level 2 | Higher-return plan tiers |
| Refer users and earn commissions | Level 1 | Commissions credited to live wallet |

### 10.3 KYC Status in JWT

The access token embeds the user's `kycLevel` at the time of issuance. If a user's KYC is approved during an active session, the token will reflect the new level on the next refresh (within 15 minutes max). For immediate effect, the frontend can call the refresh endpoint after a KYC approval notification.

---

## 11. Demo vs Live Mode Context

### 11.1 Architecture Principle

Authentication is **shared** between Demo and Live modes — a single login grants access to both environments. The operating mode is a **per-request context**, not a session-level setting. This simplifies the auth model while ensuring financial isolation.

### 11.2 Mode Resolution

```mermaid
sequenceDiagram
    participant FE as Frontend
    participant MW as Mode Middleware
    participant Handler as API Handler
    participant DB as PostgreSQL

    FE->>MW: GET /api/v1/wallet/balance (Bearer token)

    MW->>MW: Resolve mode:
    Note over MW: Priority order:<br/>1. X-Mode header (explicit)<br/>2. ?mode query param<br/>3. User's default preference<br/>4. Fallback: "demo"

    alt Invalid mode value
        MW-->>FE: 400 — "Invalid mode, must be 'demo' or 'live'"
    end

    MW->>MW: Attach resolved mode to request context
    MW->>Handler: req.mode = "live" (for example)

    Handler->>DB: SELECT * FROM wallets WHERE userId = :id AND mode = 'live'
    DB-->>Handler: Wallet record (live)
    Handler-->>FE: 200 — { balance: 12500.00, mode: "live" }
```

### 11.3 Wallet / Account Isolation

| Dimension | Demo Mode | Live Mode |
|---|---|---|
| **Wallet** | Separate `Wallet` row (`mode = 'demo'`) | Separate `Wallet` row (`mode = 'live'`) |
| **Transactions** | Isolated transaction history | Isolated transaction history |
| **Investments** | Simulated plans, virtual returns | Real funds, actual returns |
| **Withdrawals** | Not permitted (virtual funds) | Permitted (KYC-gated, 21% fee) |
| **KYC** | Not required | Required for deposits and withdrawals |
| **Admin view** | Admins can toggle to see demo data | Default view for financial operations |

The database enforces isolation through the `mode` column on `Wallet`, `Transaction`, `Investment`, and related tables. Every query includes a `WHERE mode = :resolvedMode` clause, preventing cross-mode data leakage.

### 11.4 Mode Switching

The frontend provides a prominent mode toggle in the navigation bar. Switching modes does **not** require re-authentication — it simply changes the `X-Mode` header sent with subsequent API requests. The UI visually distinguishes the two modes (e.g., a "DEMO" badge with a distinct colour scheme) to prevent users from accidentally operating in the wrong context.

---

## 12. Security Measures

### 12.1 Brute Force Protection

| Layer | Mechanism |
|---|---|
| **Rate limiting** | 5 login requests/min per IP + per email; 20/hr |
| **Progressive lockout** | 5 fails → 15 min; 10 fails → 1 hr; 20 fails → permanent (admin unlock) |
| **Generic errors** | "Invalid email or password" for all failures (prevents enumeration) |
| **IP + email tracking** | Independent counters in Redis with TTL auto-expiry |

### 12.2 Account Lockout & Suspicious Activity Detection

```mermaid
sequenceDiagram
    participant Attacker as Attacker
    participant API as Backend API
    participant Redis as Redis
    participant Email as Resend
    participant Admin as Admin Dashboard
    participant Audit as Audit Log

    loop Repeated failed attempts
        Attacker->>API: POST /api/v1/auth/login { email, wrong_password }
        API->>Redis: INCR fail:email:{addr} + fail:ip:{addr}
        API->>Audit: Log failed attempt (IP, UA, timestamp)
    end

    Note over Redis: fail:email:count = 10

    API->>Redis: SET lock:email:{addr} TTL 1hr
    API->>Redis: SET lock:ip:{addr} TTL 15min
    API->>Email: Send lockout alert to user
    API-->>Attacker: 429 — Account temporarily locked

    loop Continued attempts from different emails (same IP)
        Attacker->>API: POST /api/v1/auth/login { email2, ... }
        API->>Redis: CHECK fraud:ip:{addr}
        Note over Redis: >3 accounts from same IP in 24hr
        Redis-->>API: Fraud flag triggered
        API->>Admin: Create fraud alert (multiple accounts, same IP)
    end
```

### 12.3 Fraud Detection Rules

| Rule | Threshold | Action |
|---|---|---|
| Multiple accounts from same IP | >3 registrations / 24 hr | Admin alert |
| Rapid deposit/withdrawal | >5 cycles / 1 hr | Admin alert |
| Unusual referral pattern | >10 referrals / 24 hr | Admin alert |
| KYC document reuse | Perceptual hash match | Admin alert |
| Geographic anomaly | Sudden location change | Soft alert on next login |
| Gift card fraud indicators | Multiple rejections, same brand | Admin alert |

### 12.4 CORS Configuration

```
Access-Control-Allow-Origin:  https://teslaprimecapital.com (production)
Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, X-CSRF-Token, X-Device-Fingerprint, X-Mode
Access-Control-Allow-Credentials: true
Access-Control-Max-Age: 86400
```

In development, `localhost:3000` is added to the allowed origins. The CORS middleware rejects all requests from unlisted origins.

### 12.5 CSRF Protection

| Mechanism | Detail |
|---|---|
| **SameSite=Strict** | All cookies (including refresh token) use `SameSite=Strict` |
| **CSRF token** | Server-generated, SSR-injected via `<meta>` tag or hidden field |
| **Header validation** | State-changing requests must include `X-CSRF-Token` header |
| **Bearer exemption** | Requests using `Authorization: Bearer` are exempt (token not auto-attached) |

### 12.6 XSS Protection

| Mechanism | Detail |
|---|---|
| **CSP header** | `script-src 'self' 'nonce-{NONCE}'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://res.cloudinary.com; frame-ancestors 'none'` |
| **React auto-encoding** | JSX rendering automatically encodes all output |
| **DOMPurify** | Required for any rich-text rendering (support tickets) |
| **Access token in memory** | Even if XSS occurs, the token cannot be exfiltrated to persistent storage |

### 12.7 IP Whitelisting for Admin Routes

Admin API endpoints (`/api/v1/admin/*`) enforce an additional IP allowlist check:

```typescript
// Middleware pseudocode
const adminAllowedIPs = (process.env.ADMIN_ALLOWED_IPS || '').split(',');
// Extracted from X-Forwarded-For (set by trusted reverse proxy)
const clientIP = req.headers['x-forwarded-for']?.split(',')[0] || req.ip;

if (!adminAllowedIPs.includes(clientIP)) {
  return res.status(403).json({ error: 'Access denied' });
}
```

The `ADMIN_ALLOWED_IPS` environment variable accepts a comma-separated list of IPv4/IPv6 addresses. If the platform is accessed through a CDN or reverse proxy, the real client IP is extracted from the `X-Forwarded-For` header.

### 12.8 Security Headers

| Header | Value | Purpose |
|---|---|---|
| `Content-Security-Policy` | Per-request nonce for scripts | XSS prevention |
| `X-Frame-Options` | `DENY` | Clickjacking prevention |
| `X-Content-Type-Options` | `nosniff` | MIME sniffing prevention |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` | Force HTTPS |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Prevent URL leakage |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Disable unused browser features |

### 12.9 Audit Logging on Auth Events

Every authentication-related event produces an immutable audit log entry:

| Event | Severity | Data Captured |
|---|---|---|
| Successful login | Info | userId, IP, device fingerprint, UA |
| Failed login | Warning | email (masked), IP, UA, failure count |
| Account lockout | High | email, IP, lockout tier, failure count |
| Account unlock | Medium | actorId (admin), targetUserId, reason |
| 2FA enabled | Info | userId |
| 2FA disabled | High | userId, actorId (self), IP |
| 2FA verification failure | Warning | userId, IP |
| Password change | Info | userId, IP |
| Password reset | High | userId, IP |
| Session revocation | Info | userId, jti, actorId |
| New device login | Medium | userId, device fingerprint, IP, location |

Audit logs are **append-only** — no API endpoint or admin action can modify or delete entries. The database role for the application has `INSERT` and `SELECT` only on the audit table. Retention period: 2 years.

---

## Appendix A: API Endpoint Summary

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/auth/register` | Public | Register new account |
| POST | `/api/v1/auth/login` | Public | Login with email + password |
| POST | `/api/v1/auth/login/2fa` | Public | Verify 2FA during login |
| POST | `/api/v1/auth/refresh` | Refresh cookie | Rotate tokens |
| POST | `/api/v1/auth/logout` | Bearer | Revoke current session |
| POST | `/api/v1/auth/logout-all` | Bearer | Revoke all sessions |
| POST | `/api/v1/auth/forgot-password` | Public | Request password reset OTP |
| POST | `/api/v1/auth/reset-password` | Public | Reset password with OTP |
| POST | `/api/v1/auth/change-password` | Bearer | Change password (requires current password) |
| POST | `/api/v1/auth/email/verify` | Public | Verify email with OTP |
| POST | `/api/v1/auth/email/verify/resend` | Public | Resend verification OTP |
| POST | `/api/v1/auth/2fa/setup` | Bearer | Generate TOTP secret + QR |
| POST | `/api/v1/auth/2fa/verify-setup` | Bearer | Verify TOTP during setup |
| POST | `/api/v1/auth/2fa/confirm-setup` | Bearer | Finalize 2FA enable |
| POST | `/api/v1/auth/2fa/disable` | Bearer + 2FA | Disable 2FA |
| GET | `/api/v1/auth/sessions` | Bearer | List active sessions |
| DELETE | `/api/v1/auth/sessions/:jti` | Bearer | Revoke specific session |
| POST | `/api/v1/auth/2fa/verify-operation` | Bearer | Verify 2FA for sensitive ops |

---

## Appendix B: Environment Variables

| Variable | Purpose | Example |
|---|---|---|
| `JWT_ACCESS_SECRET` | Signs access tokens | 64-char random string |
| `JWT_REFRESH_SECRET` | Signs refresh tokens | 64-char random string (different from access) |
| `JWT_ACCESS_EXPIRY` | Access token TTL | `15m` |
| `JWT_REFRESH_EXPIRY` | Refresh token TTL | `7d` |
| `ENCRYPTION_KEY` | AES-256 key for TOTP secrets | 32-byte hex string |
| `ADMIN_ALLOWED_IPS` | IP whitelist for admin routes | `1.2.3.4,5.6.7.8` |
| `REJECT_BREACHED_PASSWORDS` | Breach password policy | `true` / `false` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://...` |

---

*End of AUTH_FLOW.md — TeslaPrimeCapital Phase 2 Technical Architecture*