# API Design Specification — TeslaPrimeCapital

> **Phase 2 — Technical Architecture**
> **Version:** 2.0.0
> **Last Updated:** 2025-06
> **Status:** Approved

This document is the authoritative API contract for the TeslaPrimeCapital enterprise investment platform. Every endpoint, request schema, response schema, error code, and authorization rule is specified here. Implementations must conform exactly to this contract.

---

## Table of Contents

1. [Design Principles](#1-design-principles)
2. [Authentication & Authorization](#2-authentication--authorization)
3. [Standard Response Format](#3-standard-response-format)
4. [Standard Error Codes](#4-standard-error-codes)
5. [Rate Limiting Strategy](#5-rate-limiting-strategy)
6. [Domain: Authentication (`/api/v1/auth`)](#6-domain-authentication)
7. [Domain: Users (`/api/v1/users`)](#7-domain-users)
8. [Domain: KYC (`/api/v1/kyc`)](#8-domain-kyc)
9. [Domain: Plans (`/api/v1/plans`)](#9-domain-plans)
10. [Domain: Investments (`/api/v1/investments`)](#10-domain-investments)
11. [Domain: Deposits (`/api/v1/deposits`)](#11-domain-deposits)
12. [Domain: Withdrawals (`/api/v1/withdrawals`)](#12-domain-withdrawals)
13. [Domain: Wallet (`/api/v1/wallet`)](#13-domain-wallet)
14. [Domain: Referral (`/api/v1/referral`)](#14-domain-referral)
15. [Domain: Notifications (`/api/v1/notifications`)](#15-domain-notifications)
16. [Domain: Support (`/api/v1/support`)](#16-domain-support)
17. [Domain: Admin — User Management (`/api/v1/admin/users`)](#17-domain-admin--user-management)
18. [Domain: Admin — KYC Review (`/api/v1/admin/kyc`)](#18-domain-admin--kyc-review)
19. [Domain: Admin — Deposits (`/api/v1/admin/deposits`)](#19-domain-admin--deposits)
20. [Domain: Admin — Withdrawals (`/api/v1/admin/withdrawals`)](#20-domain-admin--withdrawals)
21. [Domain: Admin — Plans (`/api/v1/admin/plans`)](#21-domain-admin--plans)
22. [Domain: Admin — Reports (`/api/v1/admin/reports`)](#22-domain-admin--reports)
23. [Domain: Admin — System Config (`/api/v1/admin/system`)](#23-domain-admin--system-config)
24. [Domain: Admin — Audit Logs (`/api/v1/admin/audit-logs`)](#24-domain-admin--audit-logs)
25. [Domain: Utility (`/api/v1/currencies`, `/api/v1/settings`)](#25-domain-utility)

---

## 1. Design Principles

### 1.1 RESTful Conventions

- Resources are modeled as **plural nouns** (`/investments`, not `/investment`).
- HTTP methods convey intent: `GET` (read), `POST` (create), `PUT` (full update), `PATCH` (partial update), `DELETE` (remove).
- All request and response bodies use `Content-Type: application/json`. File uploads use `multipart/form-data`.
- Date/time values use **ISO 8601 UTC** (`2025-01-15T14:30:00.000Z`).
- Monetary values are **decimal strings in USD** (`"amount": "1500.00"`) to avoid floating-point precision loss.
- Resource identifiers are **UUIDs** (not auto-incrementing integers) for security and to prevent enumeration.

### 1.2 URL-Based Versioning

All endpoints are prefixed with `/api/v1/`. When breaking changes are required, a new version (`/api/v2/`) is deployed alongside the existing version with a minimum 6-month deprecation period. Deprecated endpoints include `Deprecation: true` and `Sunset: <date>` headers.

Backward-compatible changes (new response fields, new optional request fields, new endpoints) do not require a version increment.

### 1.3 Pagination

Two strategies are used based on data characteristics:

| Strategy | Used For | Params | Navigation |
|----------|----------|--------|------------|
| **Offset-based** | Plans, admin user lists, tickets | `?page=1&limit=20` | Direct page access, `meta.total` included |
| **Cursor-based** | Transactions, notifications, audit logs | `?cursor=<opaque>&limit=20` | Sequential only, `meta.hasMore` provided |

- Default page size: **20** items.
- Maximum page size: **100** items (requests exceeding this are silently capped, `X-Page-Size-Capped: true` header sent).
- Cursor format: base64-encoded `{timestamp}_{uuid}` — opaque to clients.

### 1.4 Filtering & Sorting

- **Filtering:** Query parameters prefixed with field names: `?status=active&planId=<uuid>`.
- **Sorting:** `?sortBy=createdAt&sortOrder=desc`. Default sort is `createdAt` descending.
- **Date range filtering:** `?startDate=2025-01-01&endDate=2025-06-30` (ISO date strings).
- **Search:** `?search=john@example.com` — performs partial match on supported fields (documented per endpoint).

### 1.5 Stateless Design

Each request must contain all information needed to process it. The only stateful mechanism is the refresh token (HTTP-only cookie). No server-side session storage.

### 1.6 HATEOAS-Lite Pagination Links

Paginated responses include `meta.prev` and `meta.next` URLs for navigation:

```json
{
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "prev": "/api/v1/investments?page=0",
    "next": "/api/v1/investments?page=2"
  }
}
```

---

## 2. Authentication & Authorization

### 2.1 JWT Access Token

- **Algorithm:** HS256
- **Expiry:** 15 minutes
- **Storage:** Frontend JavaScript memory only (module-level variable); never in localStorage, sessionStorage, or cookies.
- **Header:** `Authorization: Bearer <access_token>`
- **Payload (claims):**

```typescript
interface JwtPayload {
  sub: string;           // User UUID
  role: Role;            // Current role
  kycLevel: number;      // 0–3
  activeMode: 'demo' | 'live';
  tokenVersion: number;  // Incremented on password reset / forced logout
  iat: number;           // Issued at (Unix timestamp)
  exp: number;           // Expiration (Unix timestamp)
}

type Role = 'SUPER_ADMIN' | 'ADMIN' | 'COMPLIANCE' | 'SUPPORT' | 'USER';
```

### 2.2 Refresh Token

- **Type:** Opaque random string (not a JWT)
- **Expiry:** 7 days
- **Storage:** HTTP-only, `Secure`, `SameSite=Strict` cookie named `__tpc_rt`
- **Rotation:** Each refresh invalidates the old token and issues a new one (prevents replay attacks).
- **Family tracking:** All tokens in a rotation chain are stored; if any token in the chain is reused after rotation, the entire family is revoked (theft detection).

### 2.3 Two-Factor Authentication (2FA)

When 2FA is enabled for a user, the login flow is two-step:

1. `POST /api/v1/auth/login` returns `HTTP 200` with `requires2FA: true` and a temporary `twoFactorToken` (short-lived, 5 minutes).
2. Client submits `POST /api/v1/auth/verify-2fa` with the temporary token and TOTP code.
3. On success, access + refresh tokens are issued.

**2FA Verification Header:** For endpoints requiring confirmed 2FA (e.g., withdrawals), the client must include `X-2FA-Code: <6-digit TOTP>` to prove possession. This is validated server-side against the user's TOTP secret.

### 2.4 Role Hierarchy & Middleware

```
SUPER_ADMIN > ADMIN > COMPLIANCE > SUPPORT > USER
```

Higher roles inherit all permissions from roles below them. Middleware checks are enforced at both the route level and endpoint level (defense in depth). Failed permission checks return `403 Forbidden`.

### 2.5 Public vs. Protected Endpoints

| Category | Endpoints |
|----------|-----------|
| **Public** (no auth) | `register`, `login`, `forgot-password`, `reset-password`, `verify-email`, `resend-verification`, plan list, currencies, maintenance status |
| **Protected** (auth required) | All other endpoints |

### 2.6 Token Versioning

Each user has a `tokenVersion` in the database. Password resets and admin-forced logouts increment this value. Tokens containing a stale `tokenVersion` are rejected — no blacklist needed.

---

## 3. Standard Response Format

### 3.1 Success Envelope

```typescript
interface ApiResponse<T> {
  success: true;
  data: T;
  message: string;
}
```

### 3.2 List Response with Pagination (Offset-based)

```typescript
interface ApiPaginatedResponse<T> {
  success: true;
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    prev: string | null;    // Full URL or null
    next: string | null;    // Full URL or null
  };
  message: string;
}
```

### 3.3 List Response with Cursor Pagination

```typescript
interface ApiCursorResponse<T> {
  success: true;
  data: T[];
  meta: {
    cursor: string | null;   // Cursor for next page
    hasMore: boolean;
    limit: number;
  };
  message: string;
}
```

### 3.4 Error Envelope

```typescript
interface ApiErrorResponse {
  success: false;
  message: string;
  errors?: Array<{
    field: string;
    message: string;
    code?: string;  // Machine-readable error code
  }>;
  code?: string;    // Top-level machine-readable error code
}
```

### 3.5 Deletion Response

```typescript
// HTTP 200 or 204
interface ApiDeleteResponse {
  success: true;
  data: null;
  message: string;
}
```

---

## 4. Standard Error Codes

| HTTP Status | Machine Code | Description |
|-------------|-------------|-------------|
| `400` | `BAD_REQUEST` | Malformed request, missing required fields, or invalid values |
| `400` | `INVALID_UUID` | Provided identifier is not a valid UUID |
| `400` | `INVALID_EMAIL` | Email format is invalid |
| `400` | `INVALID_PASSWORD` | Password does not meet complexity requirements |
| `400` | `INVALID_AMOUNT` | Amount is not a positive number or outside allowed range |
| `400` | `INVALID_FILE_TYPE` | Uploaded file type is not accepted for this category |
| `400` | `FILE_TOO_LARGE` | Uploaded file exceeds the size limit for this category |
| `401` | `UNAUTHORIZED` | Missing, expired, or invalid access token |
| `401` | `TOKEN_EXPIRED` | Access token has expired; use refresh token |
| `401` | `TOKEN_INVALIDATED` | Token version mismatch; re-authenticate |
| `401` | `REFRESH_TOKEN_INVALID` | Refresh token is missing, expired, or revoked |
| `401` | `REFRESH_TOKEN_REUSE` | Reuse of a previously rotated refresh token detected; all sessions revoked |
| `403` | `FORBIDDEN` | Authenticated but lacks permission for this action |
| `403` | `KYC_LEVEL_INSUFFICIENT` | User's KYC level does not permit this operation |
| `403` | `ACCOUNT_LOCKED` | Account is temporarily locked due to failed login attempts |
| `403` | `ACCOUNT_BANNED` | Account has been banned by an administrator |
| `403` | `ACCOUNT_SUSPENDED` | Account is suspended pending review |
| `404` | `NOT_FOUND` | Requested resource does not exist |
| `404` | `USER_NOT_FOUND` | Specified user does not exist |
| `404` | `PLAN_NOT_FOUND` | Specified investment plan does not exist or is inactive |
| `404` | `INVESTMENT_NOT_FOUND` | Specified investment does not exist |
| `404` | `DEPOSIT_NOT_FOUND` | Specified deposit does not exist |
| `404` | `WITHDRAWAL_NOT_FOUND` | Specified withdrawal does not exist |
| `409` | `EMAIL_ALREADY_EXISTS` | Email is already registered |
| `409` | `REFERRAL_CODE_INVALID` | Referral code does not belong to an active user |
| `409` | `KYC_ALREADY_SUBMITTED` | KYC verification is already submitted or approved |
| `409` | `KYC_ALREADY_APPROVED` | KYC is already at the requested level |
| `409` | `PLAN_NOT_ACCEPTING` | Plan is not currently accepting investments |
| `409` | `WITHDRAWAL_ALREADY_PENDING` | User already has a pending withdrawal request |
| `422` | `INSUFFICIENT_BALANCE` | Wallet balance is insufficient for this operation |
| `422` | `AMOUNT_BELOW_MINIMUM` | Amount is below the plan's minimum deposit |
| `422` | `AMOUNT_ABOVE_MAXIMUM` | Amount exceeds the plan's maximum deposit or user's KYC limit |
| `422` | `WITHDRAWAL_LIMIT_EXCEEDED` | Withdrawal amount exceeds daily limit |
| `422` | `INVALID_2FA_CODE` | TOTP code is incorrect or expired |
| `422` | `2FA_REQUIRED` | Two-factor authentication is required for this operation |
| `422` | `2FA_NOT_ENABLED` | 2FA is not enabled on this account |
| `422` | `BUSINESS_RULE_VIOLATION` | Generic business rule violation (detail in `message`) |
| `429` | `RATE_LIMIT_EXCEEDED` | Too many requests; retry after the `Retry-After` duration |
| `500` | `INTERNAL_ERROR` | Unexpected server error |
| `503` | `SERVICE_UNAVAILABLE` | Service is temporarily unavailable (maintenance, dependency failure) |

---

## 5. Rate Limiting Strategy

Rate limiting is implemented via **Redis sliding-window counters**.

### 5.1 Rate Limit Tiers

| Endpoint Category | Limit | Window | Scope |
|-------------------|-------|--------|-------|
| **Auth (login, forgot-password, reset-password, verify-2fa)** | 5 requests | 1 minute | Per IP |
| **Auth (register, verify-email, resend-verification)** | 3 requests | 1 minute | Per IP |
| **Auth (refresh-token)** | 30 requests | 1 minute | Per IP |
| **Write (create deposit, withdrawal, investment)** | 10 requests | 1 minute | Per User |
| **KYC submit** | 3 requests | 1 hour | Per User |
| **Support ticket create** | 5 requests | 1 hour | Per User |
| **Read (list, detail, dashboard)** | 60 requests | 1 minute | Per User |
| **Admin (all admin endpoints)** | 120 requests | 1 minute | Per User |
| **File upload (signed URL generation)** | 10 requests | 1 minute | Per User |

### 5.2 Response Headers (Every Request)

| Header | Description |
|--------|-------------|
| `X-RateLimit-Limit` | Max requests allowed in the current window |
| `X-RateLimit-Remaining` | Requests remaining in the current window |
| `X-RateLimit-Reset` | Unix timestamp when the window resets |

### 5.3 Rate Limit Exceeded Response

```
HTTP 429 Too Many Requests
Retry-After: 45
```

```json
{
  "success": false,
  "message": "Rate limit exceeded. Please retry after 45 seconds.",
  "code": "RATE_LIMIT_EXCEEDED"
}
```

---

## 6. Domain: Authentication

Base path: `/api/v1/auth`

### 6.1 Register

```
POST /api/v1/auth/register
```

**Auth:** None (public)

**Description:** Register a new user account. Creates the user in `pending_verification` state, generates an email verification token (24h expiry), sends a verification email, and credits the Demo wallet with the configured starting balance upon email verification.

**Request Body:**

```typescript
interface RegisterRequest {
  email: string;           // Valid email, max 254 chars
  password: string;        // Min 8 chars, 1 uppercase, 1 lowercase, 1 number
  confirmPassword: string; // Must match password
  referralCode?: string;   // Optional referral code from existing user
}
```

**Response (200):**

```typescript
interface RegisterResponse {
  user: {
    id: string;            // UUID
    email: string;
    status: 'pending_verification';
    createdAt: string;     // ISO 8601
  };
  message: string;         // "Verification email sent. Please check your inbox."
}
```

**Status Codes:** `200` (success), `400` (validation), `409` (email exists, invalid referral code), `429` (rate limit)

---

### 6.2 Login

```
POST /api/v1/auth/login
```

**Auth:** None (public)

**Description:** Authenticate with email and password. If 2FA is enabled, returns `requires2FA: true` and a temporary token instead of access/refresh tokens. After 5 consecutive failed attempts, the account is locked for 15 minutes.

**Request Body:**

```typescript
interface LoginRequest {
  email: string;
  password: string;
}
```

**Response (200) — No 2FA:**

```typescript
interface LoginResponse {
  user: {
    id: string;
    email: string;
    role: Role;
    kycLevel: number;
    activeMode: 'demo' | 'live';
    twoFactorEnabled: boolean;
  };
  accessToken: string;     // JWT, 15min
  message: string;
}
```

**Response (200) — 2FA Required:**

```typescript
interface Login2FAResponse {
  requires2FA: true;
  twoFactorToken: string;  // Temporary token, 5min expiry
  message: string;         // "Two-factor authentication required."
}
```

**Status Codes:** `200` (success), `401` (invalid credentials), `403` (account locked/banned), `429` (rate limit)

---

### 6.3 Logout

```
POST /api/v1/auth/logout
```

**Auth:** Required (any authenticated user)

**Description:** Invalidate the current refresh token (clear the `__tpc_rt` cookie) and increment the user's `tokenVersion` to invalidate all existing access tokens.

**Request Body:** None

**Response (200):**

```typescript
interface LogoutResponse {
  message: string;  // "Logged out successfully."
}
```

**Status Codes:** `200` (success), `401` (unauthorized)

---

### 6.4 Refresh Token

```
POST /api/v1/auth/refresh-token
```

**Auth:** Refresh token cookie (`__tpc_rt`) required; no access token needed.

**Description:** Exchange a valid refresh token for a new access token and a rotated refresh token. If the refresh token has been previously used (replay detected), the entire token family is revoked.

**Request Body:** None

**Response (200):**

```typescript
interface RefreshTokenResponse {
  accessToken: string;
  message: string;
}
```

**Status Codes:** `200` (success), `401` (invalid/expired/revoked refresh token)

---

### 6.5 Forgot Password

```
POST /api/v1/auth/forgot-password
```

**Auth:** None (public)

**Description:** Initiate password reset. Sends a reset email with a time-limited token (1 hour). Always returns 200 to prevent email enumeration.

**Request Body:**

```typescript
interface ForgotPasswordRequest {
  email: string;
}
```

**Response (200):**

```typescript
interface ForgotPasswordResponse {
  message: string;  // "If an account with that email exists, a reset link has been sent."
}
```

**Status Codes:** `200` (always, even if email not found), `429` (rate limit)

---

### 6.6 Reset Password

```
POST /api/v1/auth/reset-password
```

**Auth:** None (public, requires valid reset token)

**Description:** Set a new password using the token from the reset email. Invalidates all existing sessions (increments `tokenVersion`).

**Request Body:**

```typescript
interface ResetPasswordRequest {
  token: string;            // From reset email
  password: string;         // New password (same complexity rules)
  confirmPassword: string;  // Must match
}
```

**Response (200):**

```typescript
interface ResetPasswordResponse {
  message: string;  // "Password has been reset successfully. Please log in."
}
```

**Status Codes:** `200` (success), `400` (invalid token, validation), `429` (rate limit)

---

### 6.7 Verify Email

```
POST /api/v1/auth/verify-email
```

**Auth:** None (public, requires valid verification token)

**Description:** Activate user account by verifying the email token sent during registration. Transitions the user from `pending_verification` to `active`, sets KYC Level 0, and credits the Demo wallet with the configured starting balance.

**Request Body:**

```typescript
interface VerifyEmailRequest {
  token: string;  // From verification email
}
```

**Response (200):**

```typescript
interface VerifyEmailResponse {
  message: string;  // "Email verified successfully. You may now log in."
}
```

**Status Codes:** `200` (success), `400` (invalid/expired token)

---

### 6.8 Resend Verification Email

```
POST /api/v1/auth/resend-verification
```

**Auth:** None (public)

**Description:** Resend the email verification link. Only works for accounts still in `pending_verification` state.

**Request Body:**

```typescript
interface ResendVerificationRequest {
  email: string;
}
```

**Response (200):**

```typescript
interface ResendVerificationResponse {
  message: string;  // "Verification email resent. Please check your inbox."
}
```

**Status Codes:** `200` (success or email not found — same response to prevent enumeration), `429` (rate limit)

---

### 6.9 Setup 2FA

```
POST /api/v1/auth/setup-2fa
```

**Auth:** Required (any authenticated user)

**Description:** Generate a new TOTP secret for the user. Returns the secret (for QR code generation) and a set of backup codes. The 2FA is not active until verified.

**Request Body:** None

**Response (200):**

```typescript
interface Setup2FAResponse {
  secret: string;         // Base32-encoded TOTP secret
  qrCodeUrl: string;      // otpauth:// URI for QR code generation
  backupCodes: string[];  // Array of 10 recovery codes
  message: string;        // "Scan the QR code with your authenticator app and verify a code."
}
```

**Status Codes:** `200` (success), `401` (unauthorized), `409` (2FA already enabled)

---

### 6.10 Verify 2FA

```
POST /api/v1/auth/verify-2fa
```

**Auth:** Context-dependent. If called during login (after `requires2FA`), the `twoFactorToken` from the login response is required. If called during setup, a valid access token is required.

**Description:** Verify a TOTP code. During login, this completes authentication and issues access + refresh tokens. During setup, this activates 2FA on the account.

**Request Body (Login flow):**

```typescript
interface Verify2FALoginRequest {
  twoFactorToken: string;  // Temporary token from login response
  code: string;            // 6-digit TOTP code
}
```

**Request Body (Setup flow):**

```typescript
interface Verify2FASetupRequest {
  code: string;            // 6-digit TOTP code
}
```

**Response (200) — Login flow:**

```typescript
interface Verify2FALoginResponse {
  user: {
    id: string;
    email: string;
    role: Role;
    kycLevel: number;
    activeMode: 'demo' | 'live';
    twoFactorEnabled: boolean;
  };
  accessToken: string;
  message: string;
}
```

**Response (200) — Setup flow:**

```typescript
interface Verify2FASetupResponse {
  message: string;  // "Two-factor authentication has been enabled."
}
```

**Status Codes:** `200` (success), `400` (invalid/expired twoFactorToken), `401` (unauthorized — setup flow), `422` (invalid TOTP code)

---

### 6.11 Disable 2FA

```
POST /api/v1/auth/disable-2fa
```

**Auth:** Required (access token + `X-2FA-Code` header with valid TOTP code)

**Description:** Disable two-factor authentication on the authenticated user's account. Requires a valid TOTP code to confirm the action.

**Request Body:** None

**Headers:**
- `X-2FA-Code: <6-digit TOTP>` — required

**Response (200):**

```typescript
interface Disable2FAResponse {
  message: string;  // "Two-factor authentication has been disabled."
}
```

**Status Codes:** `200` (success), `401` (unauthorized), `422` (invalid 2FA code, 2FA not enabled)

---

## 7. Domain: Users

Base path: `/api/v1/users`

### 7.1 Get Current User

```
GET /api/v1/users/me
```

**Auth:** Required (any authenticated user)

**Description:** Retrieve the authenticated user's full account summary including profile, KYC status, wallet overview, and active mode.

**Request Body:** None

**Response (200):**

```typescript
interface CurrentUserResponse {
  id: string;
  email: string;
  role: Role;
  kycLevel: number;
  kycStatus: 'none' | 'pending' | 'approved' | 'rejected';
  status: 'active' | 'pending_verification' | 'locked' | 'banned' | 'suspended';
  activeMode: 'demo' | 'live';
  twoFactorEnabled: boolean;
  referralCode: string;
  referredBy: string | null;  // Referrer's user ID
  profile: {
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
    country: string | null;
    avatarUrl: string | null;
    preferredCurrency: string;
    createdAt: string;
    emailVerifiedAt: string | null;
  };
  wallet: {
    demoBalance: string;   // Decimal string
    liveBalance: string;   // Decimal string
  };
}
```

**Status Codes:** `200` (success), `401` (unauthorized)

---

### 7.2 Get Profile

```
GET /api/v1/users/me/profile
```

**Auth:** Required (any authenticated user)

**Description:** Retrieve the authenticated user's profile details.

**Request Body:** None

**Response (200):**

```typescript
interface UserProfileResponse {
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  country: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  avatarUrl: string | null;
  preferredCurrency: string;
  language: string;
  notificationPreferences: {
    email: boolean;
    inApp: boolean;
    depositAlerts: boolean;
    withdrawalAlerts: boolean;
    investmentAlerts: boolean;
    referralAlerts: boolean;
  };
  createdAt: string;
  updatedAt: string;
}
```

**Status Codes:** `200` (success), `401` (unauthorized)

---

### 7.3 Update Profile

```
PUT /api/v1/users/me/profile
```

**Auth:** Required (any authenticated user)

**Description:** Update the authenticated user's profile. Only non-protected fields can be updated. Email and role changes are not allowed through this endpoint.

**Request Body:**

```typescript
interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  phone?: string;
  country?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  preferredCurrency?: string;  // ISO 4217 code
  language?: string;           // ISO 639-1 code
  notificationPreferences?: {
    email?: boolean;
    inApp?: boolean;
    depositAlerts?: boolean;
    withdrawalAlerts?: boolean;
    investmentAlerts?: boolean;
    referralAlerts?: boolean;
  };
}
```

**Response (200):**

```typescript
interface UpdateProfileResponse {
  user: UserProfileResponse;  // Updated profile
  message: string;
}
```

**Status Codes:** `200` (success), `400` (validation), `401` (unauthorized)

---

## 8. Domain: KYC

Base path: `/api/v1/kyc`

### 8.1 Submit KYC

```
POST /api/v1/kyc/submit
```

**Auth:** Required (User role, KYC Level 0–2)

**Description:** Submit KYC documents for verification. The user specifies the target level and provides Cloudinary public IDs for the uploaded documents. Level 1 requires ID only. Level 2 requires ID + proof of address. Level 3 requires ID + proof of address + selfie.

**Request Body:**

```typescript
interface KycSubmitRequest {
  targetLevel: 1 | 2 | 3;
  documents: {
    idFront: string;           // Cloudinary public ID
    idBack?: string;           // Required for national ID / driver's license; not for passport
    idType: 'passport' | 'national_id' | 'drivers_license';
    proofOfAddress?: string;   // Cloudinary public ID (required for Level 2+)
    selfie?: string;           // Cloudinary public ID (required for Level 3)
  };
}
```

**Response (200):**

```typescript
interface KycSubmitResponse {
  submission: {
    id: string;
    userId: string;
    targetLevel: number;
    status: 'pending';
    submittedAt: string;
    documents: Array<{
      id: string;
      type: 'id_front' | 'id_back' | 'proof_of_address' | 'selfie';
      cloudinaryUrl: string;
    }>;
  };
  message: string;  // "KYC documents submitted successfully. Review typically completes within 24-72 hours."
}
```

**Status Codes:** `200` (success), `400` (validation, missing required documents), `401` (unauthorized), `409` (already submitted/approved), `422` (KYC level prerequisites not met)

---

### 8.2 Get KYC Status

```
GET /api/v1/kyc/status
```

**Auth:** Required (any authenticated user)

**Description:** Retrieve the authenticated user's current KYC level, status, and submission history.

**Request Body:** None

**Response (200):**

```typescript
interface KycStatusResponse {
  currentLevel: number;           // 0, 1, 2, or 3
  status: 'none' | 'pending' | 'approved' | 'rejected';
  currentSubmission: {
    id: string;
    targetLevel: number;
    status: 'pending' | 'approved' | 'rejected';
    submittedAt: string;
    reviewedAt: string | null;
    rejectionReason: string | null;
  } | null;
  depositLimits: {
    cumulativeMax: string;    // Decimal string (e.g., "2000.00")
    cumulativeUsed: string;
    dailyWithdrawalMax: string;
  };
  history: Array<{
    id: string;
    targetLevel: number;
    status: 'approved' | 'rejected';
    submittedAt: string;
    reviewedAt: string;
    rejectionReason: string | null;
  }>;
}
```

**Status Codes:** `200` (success), `401` (unauthorized)

---

### 8.3 Get KYC Document

```
GET /api/v1/kyc/documents/:id
```

**Auth:** Required (User — own documents only; Compliance, Admin, SuperAdmin — all documents)

**Description:** Retrieve a specific KYC document's metadata and a time-limited signed URL for viewing the document in Cloudinary's private folder.

**Path Parameters:**
- `id` (UUID) — Document ID

**Response (200):**

```typescript
interface KycDocumentResponse {
  id: string;
  type: 'id_front' | 'id_back' | 'proof_of_address' | 'selfie';
  status: 'pending' | 'approved' | 'rejected';
  cloudinaryPublicId: string;
  signedUrl: string;        // Time-limited Cloudinary signed URL (1 hour)
  uploadedAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;  // Reviewer user ID
  rejectionReason: string | null;
}
```

**Status Codes:** `200` (success), `401` (unauthorized), `403` (forbidden — not own document), `404` (document not found)

---

## 9. Domain: Plans

Base path: `/api/v1/plans`

### 9.1 List Plans

```
GET /api/v1/plans
```

**Auth:** None (public — plan information is publicly browsable)

**Description:** Retrieve all active investment plans with their tier details, return rates, and duration. Inactive plans are excluded unless the user is an Admin or SuperAdmin.

**Query Parameters:**
- `mode` (optional): `demo` | `live` — filter by mode (default: both)

**Response (200):**

```typescript
interface PlanListResponse {
  plans: Array<{
    id: string;
    name: string;              // "Basic", "Silver", "Gold", "Platinum"
    slug: string;              // "basic", "silver", "gold", "platinum"
    tier: number;              // 1, 2, 3, 4
    minDeposit: string;        // Decimal string (e.g., "200.00")
    maxDeposit: string;        // Decimal string (e.g., "4999.00")
    returnRate: string;        // Decimal string, percentage (e.g., "5.00")
    durationHours: number;     // 24, 72, 168, 336
    durationLabel: string;     // "24 Hours", "3 Days", "7 Days", "14 Days"
    mode: 'demo' | 'live';
    isActive: boolean;
    requiredKycLevel: number;
    features: string[];        // ["Fixed returns", "Principal protection", ...]
  }>;
}
```

**Status Codes:** `200` (success)

---

### 9.2 Get Plan Details

```
GET /api/v1/plans/:id
```

**Auth:** None (public)

**Description:** Retrieve detailed information about a specific investment plan.

**Path Parameters:**
- `id` (UUID) — Plan ID

**Response (200):**

```typescript
interface PlanDetailResponse {
  id: string;
  name: string;
  slug: string;
  tier: number;
  minDeposit: string;
  maxDeposit: string;
  returnRate: string;
  durationHours: number;
  durationLabel: string;
  mode: 'demo' | 'live';
  isActive: boolean;
  isAcceptingInvestments: boolean;
  requiredKycLevel: number;
  description: string;
  features: string[];
  riskLevel: 'low' | 'medium' | 'high';
  createdAt: string;
  updatedAt: string;
}
```

**Status Codes:** `200` (success), `404` (plan not found)

---

## 10. Domain: Investments

Base path: `/api/v1/investments`

### 10.1 Create Investment

```
POST /api/v1/investments/create
```

**Auth:** Required (User role, KYC Level per plan requirement)

**Description:** Create a new investment by allocating wallet balance to an investment plan. Deducts the investment amount from the user's live wallet. The plan must be active and accepting investments. The amount must fall within the plan's min/max range and the user's KYC deposit limit.

**Request Body:**

```typescript
interface CreateInvestmentRequest {
  planId: string;       // UUID
  amount: string;       // Decimal string, positive, within plan range
  mode: 'demo' | 'live';
}
```

**Response (201):**

```typescript
interface CreateInvestmentResponse {
  investment: {
    id: string;
    userId: string;
    planId: string;
    planName: string;
    amount: string;
    expectedReturn: string;      // amount * (1 + returnRate/100)
    returnRate: string;
    status: 'active';
    mode: 'demo' | 'live';
    startedAt: string;
    maturesAt: string;           // startedAt + durationHours
    createdAt: string;
  };
  message: string;
}
```

**Status Codes:** `201` (created), `400` (validation), `401` (unauthorized), `403` (KYC insufficient, plan not available for this KYC level), `422` (insufficient balance, amount out of range, plan not accepting)

---

### 10.2 List Investments

```
GET /api/v1/investments
```

**Auth:** Required (User — own investments only; Admin, SuperAdmin — all with filters)

**Description:** Retrieve the authenticated user's investments. Supports filtering by status and mode.

**Query Parameters:**
- `status` (optional): `active` | `matured` | `completed`
- `mode` (optional): `demo` | `live`
- `page` (optional): number, default 1
- `limit` (optional): number, default 20, max 100

**Response (200):**

```typescript
// Paginated response
interface InvestmentListResponse {
  data: Array<{
    id: string;
    planName: string;
    planTier: number;
    amount: string;
    expectedReturn: string;
    returnRate: string;
    status: 'active' | 'matured' | 'completed';
    mode: 'demo' | 'live';
    startedAt: string;
    maturesAt: string;
    completedAt: string | null;
    createdAt: string;
  }>;
  meta: OffsetPaginationMeta;
  message: string;
}
```

**Status Codes:** `200` (success), `401` (unauthorized)

---

### 10.3 Get Investment Details

```
GET /api/v1/investments/:id
```

**Auth:** Required (User — own investment only; Admin, SuperAdmin — all)

**Description:** Retrieve detailed information about a specific investment including earnings breakdown and transaction history.

**Path Parameters:**
- `id` (UUID) — Investment ID

**Response (200):**

```typescript
interface InvestmentDetailResponse {
  id: string;
  userId: string;
  planId: string;
  planName: string;
  planTier: number;
  amount: string;
  expectedReturn: string;
  currentEarnings: string;
  returnRate: string;
  status: 'active' | 'matured' | 'completed';
  mode: 'demo' | 'live';
  startedAt: string;
  maturesAt: string;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  transactions: Array<{
    id: string;
    type: 'investment' | 'return' | 'completion';
    amount: string;
    description: string;
    createdAt: string;
  }>;
}
```

**Status Codes:** `200` (success), `401` (unauthorized), `403` (not own investment), `404` (not found)

---

## 11. Domain: Deposits

Base path: `/api/v1/deposits`

### 11.1 Create Crypto Deposit

```
POST /api/v1/deposits/crypto
```

**Auth:** Required (User role, KYC Level ≥ 1)

**Description:** Request a crypto deposit. Generates a unique deposit address and returns it along with the deposit reference. The deposit is created in `pending` status and transitions to `confirming` once blockchain transactions are detected.

**Request Body:**

```typescript
interface CreateCryptoDepositRequest {
  amount: string;             // Decimal string, must be > 0
  currency: 'BTC' | 'ETH' | 'USDT';
  network?: string;           // e.g., "ERC-20", "TRC-20", "BTC" (default per currency)
}
```

**Response (201):**

```typescript
interface CreateCryptoDepositResponse {
  deposit: {
    id: string;
    userId: string;
    type: 'crypto';
    amount: string;
    currency: 'BTC' | 'ETH' | 'USDT';
    network: string;
    depositAddress: string;       // Generated unique address
    status: 'pending';
    mode: 'live';
    expiresAt: string;            // Address expires after configurable duration
    createdAt: string;
  };
  message: string;  // "Send exactly <amount> <currency> to the address below."
}
```

**Status Codes:** `201` (created), `400` (validation), `401` (unauthorized), `403` (KYC insufficient), `422` (unsupported currency)

---

### 11.2 Create Gift Card Deposit

```
POST /api/v1/deposits/gift-card
```

**Auth:** Required (User role, KYC Level ≥ 1)

**Description:** Submit a gift card deposit with a screenshot. The gift card image must be pre-uploaded to Cloudinary. The deposit enters `pending` status and requires admin verification.

**Request Body:**

```typescript
interface CreateGiftCardDepositRequest {
  amount: string;           // Decimal string, claimed card value
  cardBrand: string;        // e.g., "Amazon", "Apple", "Google Play", "Visa"
  cardNumber: string;       // Gift card number
  pin?: string;             // PIN if applicable
  screenshotCloudinaryId: string;  // Pre-uploaded image in Cloudinary
  countryCode: string;      // ISO 3166-1 alpha-2
}
```

**Response (201):**

```typescript
interface CreateGiftCardDepositResponse {
  deposit: {
    id: string;
    userId: string;
    type: 'gift_card';
    amount: string;
    cardBrand: string;
    status: 'pending';
    mode: 'live';
    createdAt: string;
  };
  message: string;  // "Gift card deposit submitted. Verification typically takes 1-4 hours."
}
```

**Status Codes:** `201` (created), `400` (validation), `401` (unauthorized), `403` (KYC insufficient)

---

### 11.3 List Deposits

```
GET /api/v1/deposits
```

**Auth:** Required (User — own deposits only; Admin, SuperAdmin — all with filters)

**Description:** List deposits for the authenticated user. Supports filtering by status, type, and mode.

**Query Parameters:**
- `status` (optional): `pending` | `confirming` | `verified` | `completed` | `failed` | `rejected`
- `type` (optional): `crypto` | `gift_card`
- `mode` (optional): `demo` | `live`
- `page` (optional): number, default 1
- `limit` (optional): number, default 20, max 100

**Response (200):**

```typescript
interface DepositListResponse {
  data: Array<{
    id: string;
    type: 'crypto' | 'gift_card';
    amount: string;
    currency: string;
    status: DepositStatus;
    mode: 'demo' | 'live';
    createdAt: string;
    completedAt: string | null;
  }>;
  meta: OffsetPaginationMeta;
  message: string;
}

type DepositStatus = 'pending' | 'confirming' | 'verified' | 'completed' | 'failed' | 'rejected';
```

**Status Codes:** `200` (success), `401` (unauthorized)

---

### 11.4 Get Deposit Details

```
GET /api/v1/deposits/:id
```

**Auth:** Required (User — own deposit only; Admin, SuperAdmin — all)

**Description:** Retrieve detailed information about a specific deposit.

**Path Parameters:**
- `id` (UUID) — Deposit ID

**Response (200):**

```typescript
interface DepositDetailResponse {
  id: string;
  userId: string;
  type: 'crypto' | 'gift_card';
  amount: string;
  currency: string;
  network: string | null;
  depositAddress: string | null;
  txHash: string | null;
  status: DepositStatus;
  mode: 'demo' | 'live';
  rejectionReason: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  screenshotUrl: string | null;   // Signed URL for gift card screenshot
  createdAt: string;
  completedAt: string | null;
}
```

**Status Codes:** `200` (success), `401` (unauthorized), `403` (not own deposit), `404` (not found)

---

## 12. Domain: Withdrawals

Base path: `/api/v1/withdrawals`

### 12.1 Create Withdrawal

```
POST /api/v1/withdrawals/create
```

**Auth:** Required (User role, KYC Level ≥ 1, `X-2FA-Code` header required)

**Description:** Request a withdrawal from the user's live wallet. A 21% withdrawal fee is applied. The net amount (amount minus fee) is what the user receives. The user must have sufficient balance and must not exceed daily withdrawal limits for their KYC level.

**Headers:**
- `X-2FA-Code: <6-digit TOTP>` — required

**Request Body:**

```typescript
interface CreateWithdrawalRequest {
  amount: string;              // Gross amount to withdraw (before fee)
  currency: 'BTC' | 'ETH' | 'USDT';
  network?: string;            // e.g., "ERC-20", "TRC-20", "BTC"
  walletAddress: string;       // Destination wallet address
}
```

**Response (201):**

```typescript
interface CreateWithdrawalResponse {
  withdrawal: {
    id: string;
    userId: string;
    grossAmount: string;        // Requested amount
    feePercentage: string;      // "21.00"
    feeAmount: string;          // grossAmount * 0.21
    netAmount: string;          // grossAmount - feeAmount
    currency: 'BTC' | 'ETH' | 'USDT';
    network: string;
    walletAddress: string;
    status: 'pending';
    mode: 'live';
    createdAt: string;
  };
  message: string;
}
```

**Status Codes:** `201` (created), `400` (validation), `401` (unauthorized), `403` (KYC insufficient, 2FA required), `422` (insufficient balance, daily limit exceeded, invalid wallet address)

---

### 12.2 List Withdrawals

```
GET /api/v1/withdrawals
```

**Auth:** Required (User — own withdrawals only; Admin, SuperAdmin — all with filters)

**Description:** List withdrawal history for the authenticated user.

**Query Parameters:**
- `status` (optional): `pending` | `processing` | `approved` | `completed` | `rejected` | `failed`
- `page` (optional): number, default 1
- `limit` (optional): number, default 20, max 100

**Response (200):**

```typescript
interface WithdrawalListResponse {
  data: Array<{
    id: string;
    grossAmount: string;
    feeAmount: string;
    netAmount: string;
    currency: string;
    status: WithdrawalStatus;
    walletAddress: string;
    createdAt: string;
    completedAt: string | null;
  }>;
  meta: OffsetPaginationMeta;
  message: string;
}

type WithdrawalStatus = 'pending' | 'processing' | 'approved' | 'completed' | 'rejected' | 'failed';
```

**Status Codes:** `200` (success), `401` (unauthorized)

---

### 12.3 Get Withdrawal Details

```
GET /api/v1/withdrawals/:id
```

**Auth:** Required (User — own withdrawal only; Admin, SuperAdmin — all)

**Description:** Retrieve detailed information about a specific withdrawal.

**Path Parameters:**
- `id` (UUID) — Withdrawal ID

**Response (200):**

```typescript
interface WithdrawalDetailResponse {
  id: string;
  userId: string;
  grossAmount: string;
  feePercentage: string;
  feeAmount: string;
  netAmount: string;
  currency: string;
  network: string;
  walletAddress: string;
  txHash: string | null;
  status: WithdrawalStatus;
  mode: 'live';
  rejectionReason: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  completedAt: string | null;
}
```

**Status Codes:** `200` (success), `401` (unauthorized), `403` (not own withdrawal), `404` (not found)

---

## 13. Domain: Wallet

Base path: `/api/v1/wallet`

### 13.1 Get Wallet

```
GET /api/v1/wallet
```

**Auth:** Required (any authenticated user — own wallet only)

**Description:** Retrieve the authenticated user's wallet balances across both demo and live modes, including available balance and locked (invested) balance.

**Request Body:** None

**Response (200):**

```typescript
interface WalletResponse {
  demo: {
    availableBalance: string;    // Decimal string
    investedBalance: string;
    totalBalance: string;
    currency: string;            // "USD"
  };
  live: {
    availableBalance: string;
    investedBalance: string;
    totalBalance: string;
    currency: string;            // "USD"
  };
}
```

**Status Codes:** `200` (success), `401` (unauthorized)

---

### 13.2 Get Wallet Transactions

```
GET /api/v1/wallet/transactions
```

**Auth:** Required (any authenticated user — own transactions only)

**Description:** Retrieve the authenticated user's wallet transaction history using cursor-based pagination. Supports filtering by type and mode.

**Query Parameters:**
- `type` (optional): `deposit` | `withdrawal` | `investment` | `return` | `commission` | `fee` | `adjustment`
- `mode` (optional): `demo` | `live`
- `cursor` (optional): opaque cursor string from previous response
- `limit` (optional): number, default 20, max 100
- `startDate` (optional): ISO date string
- `endDate` (optional): ISO date string

**Response (200):**

```typescript
interface WalletTransactionListResponse {
  data: Array<{
    id: string;
    type: 'deposit' | 'withdrawal' | 'investment' | 'return' | 'commission' | 'fee' | 'adjustment';
    amount: string;           // Positive for credits, negative for debits
    balanceAfter: string;     // Balance after this transaction
    currency: string;
    mode: 'demo' | 'live';
    description: string;
    referenceId: string | null;   // Related entity ID (deposit, withdrawal, investment, etc.)
    referenceType: string | null;
    createdAt: string;
  }>;
  meta: {
    cursor: string | null;
    hasMore: boolean;
    limit: number;
  };
  message: string;
}
```

**Status Codes:** `200` (success), `401` (unauthorized)

---

### 13.3 Get Wallet Transaction Details

```
GET /api/v1/wallet/transactions/:id
```

**Auth:** Required (any authenticated user — own transaction only)

**Description:** Retrieve detailed information about a specific wallet transaction.

**Path Parameters:**
- `id` (UUID) — Transaction ID

**Response (200):**

```typescript
interface WalletTransactionDetailResponse {
  id: string;
  type: 'deposit' | 'withdrawal' | 'investment' | 'return' | 'commission' | 'fee' | 'adjustment';
  amount: string;
  balanceBefore: string;
  balanceAfter: string;
  currency: string;
  mode: 'demo' | 'live';
  description: string;
  referenceId: string | null;
  referenceType: string | null;
  metadata: Record<string, unknown>;  // Additional context (e.g., plan name, commission source)
  createdAt: string;
}
```

**Status Codes:** `200` (success), `401` (unauthorized), `403` (not own transaction), `404` (not found)

---

## 14. Domain: Referral

Base path: `/api/v1/referral`

### 14.1 Generate Referral Link

```
POST /api/v1/referral/generate-link
```

**Auth:** Required (User role)

**Description:** Generate or retrieve the authenticated user's unique referral link and code.

**Request Body:** None

**Response (200):**

```typescript
interface ReferralLinkResponse {
  referralCode: string;
  referralLink: string;       // e.g., "https://teslaprimecapital.com/register?ref=ABC123"
  totalReferrals: number;
  activeReferrals: number;
  message: string;
}
```

**Status Codes:** `200` (success), `401` (unauthorized)

---

### 14.2 Get Referral Team

```
GET /api/v1/referral/team
```

**Auth:** Required (User — own team only; Admin, SuperAdmin — any user's team via query param)

**Description:** Retrieve the authenticated user's direct referral team members and their statuses.

**Query Parameters:**
- `page` (optional): number, default 1
- `limit` (optional): number, default 20, max 100
- `status` (optional): `active` | `inactive`

**Response (200):**

```typescript
interface ReferralTeamResponse {
  data: Array<{
    id: string;
    userId: string;
    email: string;
    status: 'active' | 'inactive' | 'banned';
    kycLevel: number;
    totalDeposits: string;
    joinedAt: string;
    level: number;            // 1 = direct referral, 2 = referral of referral, etc.
  }>;
  meta: OffsetPaginationMeta;
  message: string;
}
```

**Status Codes:** `200` (success), `401` (unauthorized)

---

### 14.3 Get Referral Commissions

```
GET /api/v1/referral/commissions
```

**Auth:** Required (User — own commissions only; Admin, SuperAdmin — all with filters)

**Description:** Retrieve the authenticated user's referral commission history. Commissions are 10% of the referred user's deposit/investment amounts, plus binary bonus payouts.

**Query Parameters:**
- `type` (optional): `direct` | `binary` | `all`
- `page` (optional): number, default 1
- `limit` (optional): number, default 20, max 100
- `startDate` (optional): ISO date string
- `endDate` (optional): ISO date string

**Response (200):**

```typescript
interface ReferralCommissionListResponse {
  data: Array<{
    id: string;
    type: 'direct' | 'binary';
    amount: string;
    sourceUserId: string;
    sourceUserEmail: string;
    sourceTransactionType: 'deposit' | 'investment';
    sourceTransactionId: string;
    percentage: string;        // "10.00"
    status: 'paid' | 'pending';
    paidAt: string | null;
    createdAt: string;
  }>;
  meta: OffsetPaginationMeta;
  summary: {
    totalEarned: string;
    totalPending: string;
    thisMonth: string;
  };
  message: string;
}
```

**Status Codes:** `200` (success), `401` (unauthorized)

---

### 14.4 Get Binary Tree

```
GET /api/v1/referral/binary-tree
```

**Auth:** Required (User — own tree only; Admin, SuperAdmin — any user's tree via query param)

**Description:** Retrieve the user's binary referral tree structure. The binary tree places each referral on the left or right subtree. Returns a hierarchical structure up to a configurable depth limit.

**Query Parameters:**
- `depth` (optional): number, default 3, max 10
- `userId` (optional, Admin/SuperAdmin only): UUID of target user

**Response (200):**

```typescript
interface BinaryTreeResponse {
  root: BinaryTreeNode;
  summary: {
    totalLeft: number;
    totalRight: number;
    leftVolume: string;       // Total deposit/investment volume on left
    rightVolume: string;      // Total deposit/investment volume on right
    weakerLegVolume: string;  // min(leftVolume, rightVolume) — used for binary bonus calc
  };
  message: string;
}

interface BinaryTreeNode {
  userId: string;
  email: string;
  status: 'active' | 'inactive' | 'banned';
  totalVolume: string;
  leftChild: BinaryTreeNode | null;
  rightChild: BinaryTreeNode | null;
  directReferrals: number;
  level: number;
}
```

**Status Codes:** `200` (success), `401` (unauthorized), `403` (forbidden — cannot view another user's tree without admin role)

---

## 15. Domain: Notifications

Base path: `/api/v1/notifications`

### 15.1 List Notifications

```
GET /api/v1/notifications
```

**Auth:** Required (any authenticated user — own notifications only)

**Description:** Retrieve the authenticated user's notifications using cursor-based pagination, ordered by most recent first. Supports filtering by read status.

**Query Parameters:**
- `unreadOnly` (optional): boolean
- `type` (optional): `deposit` | `withdrawal` | `investment` | `kyc` | `referral` | `security` | `system`
- `cursor` (optional): opaque cursor string
- `limit` (optional): number, default 20, max 100

**Response (200):**

```typescript
interface NotificationListResponse {
  data: Array<{
    id: string;
    type: 'deposit' | 'withdrawal' | 'investment' | 'kyc' | 'referral' | 'security' | 'system';
    title: string;
    message: string;
    isRead: boolean;
    actionUrl: string | null;    // Deep link to relevant page
    metadata: Record<string, unknown>;
    createdAt: string;
    readAt: string | null;
  }>;
  meta: {
    cursor: string | null;
    hasMore: boolean;
    limit: number;
    unreadCount: number;          // Total unread count for badge
  };
  message: string;
}
```

**Status Codes:** `200` (success), `401` (unauthorized)

---

### 15.2 Mark Notification as Read

```
PUT /api/v1/notifications/:id/read
```

**Auth:** Required (any authenticated user — own notification only)

**Description:** Mark a single notification as read.

**Path Parameters:**
- `id` (UUID) — Notification ID

**Request Body:** None

**Response (200):**

```typescript
interface MarkReadResponse {
  id: string;
  isRead: true;
  readAt: string;
  message: string;
}
```

**Status Codes:** `200` (success), `401` (unauthorized), `403` (not own notification), `404` (not found)

---

### 15.3 Mark All Notifications as Read

```
PUT /api/v1/notifications/read-all
```

**Auth:** Required (any authenticated user)

**Description:** Mark all of the authenticated user's unread notifications as read.

**Request Body:** None

**Response (200):**

```typescript
interface MarkAllReadResponse {
  markedCount: number;
  message: string;  // "All notifications marked as read."
}
```

**Status Codes:** `200` (success), `401` (unauthorized)

---

## 16. Domain: Support

Base path: `/api/v1/support`

### 16.1 Create Support Ticket

```
POST /api/v1/support/tickets
```

**Auth:** Required (any authenticated user)

**Description:** Create a new support ticket with an initial message. The ticket is created in `open` status.

**Request Body:**

```typescript
interface CreateTicketRequest {
  subject: string;             // Max 200 characters
  category: 'general' | 'deposit' | 'withdrawal' | 'investment' | 'kyc' | 'referral' | 'technical' | 'other';
  priority: 'low' | 'medium' | 'high';
  message: string;             // Initial message body, max 5000 characters
  attachments?: string[];      // Cloudinary public IDs of attached files (max 5)
}
```

**Response (201):**

```typescript
interface CreateTicketResponse {
  ticket: {
    id: string;
    userId: string;
    subject: string;
    category: string;
    priority: string;
    status: 'open';
    assignedTo: string | null;
    createdAt: string;
    updatedAt: string;
    messages: Array<{
      id: string;
      senderId: string;
      senderRole: Role;
      message: string;
      isInternal: boolean;     // true = only visible to staff
      attachments: string[];
      createdAt: string;
    }>;
  };
  message: string;
}
```

**Status Codes:** `201` (created), `400` (validation), `401` (unauthorized), `429` (rate limit)

---

### 16.2 List Support Tickets

```
GET /api/v1/support/tickets
```

**Auth:** Required (User — own tickets only; Support, Compliance, Admin, SuperAdmin — all/filtered)

**Description:** List support tickets. Users see only their own tickets. Staff see tickets based on role permissions.

**Query Parameters:**
- `status` (optional): `open` | `in_progress` | `resolved` | `closed`
- `category` (optional): filter by category
- `page` (optional): number, default 1
- `limit` (optional): number, default 20, max 100
- `assignedTo` (optional, staff only): filter by assigned agent
- `sortBy` (optional): `createdAt` | `updatedAt` | `priority`, default `updatedAt`

**Response (200):**

```typescript
interface TicketListResponse {
  data: Array<{
    id: string;
    subject: string;
    category: string;
    priority: 'low' | 'medium' | 'high';
    status: 'open' | 'in_progress' | 'resolved' | 'closed';
    lastMessageAt: string;
    unreadCount: number;
    assignedTo: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
  meta: OffsetPaginationMeta;
  message: string;
}
```

**Status Codes:** `200` (success), `401` (unauthorized)

---

### 16.3 Get Ticket Details

```
GET /api/v1/support/tickets/:id
```

**Auth:** Required (User — own ticket only; Support, Compliance, Admin, SuperAdmin — all)

**Description:** Retrieve a support ticket with its full message thread. Users see non-internal messages only. Staff see all messages including internal notes.

**Path Parameters:**
- `id` (UUID) — Ticket ID

**Response (200):**

```typescript
interface TicketDetailResponse {
  id: string;
  userId: string;
  subject: string;
  category: string;
  priority: 'low' | 'medium' | 'high';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  assignedTo: string | null;
  createdAt: string;
  updatedAt: string;
  messages: Array<{
    id: string;
    senderId: string;
    senderName: string;
    senderRole: Role;
    message: string;
    isInternal: boolean;
    attachments: string[];
    createdAt: string;
  }>;
}
```

**Status Codes:** `200` (success), `401` (unauthorized), `403` (not own ticket), `404` (not found)

---

### 16.4 Add Message to Ticket

```
POST /api/v1/support/tickets/:id/messages
```

**Auth:** Required (User — own open/in_progress tickets only; Support, Compliance, Admin, SuperAdmin — all)

**Description:** Add a message to an existing support ticket. Users can only add messages to tickets that are `open` or `in_progress`. Staff can add messages to any ticket. Staff can add internal-only notes.

**Path Parameters:**
- `id` (UUID) — Ticket ID

**Request Body:**

```typescript
interface AddTicketMessageRequest {
  message: string;            // Max 5000 characters
  isInternal?: boolean;       // Staff only — true = only visible to staff
  attachments?: string[];     // Cloudinary public IDs (max 5)
}
```

**Response (201):**

```typescript
interface AddTicketMessageResponse {
  message: {
    id: string;
    ticketId: string;
    senderId: string;
    senderRole: Role;
    message: string;
    isInternal: boolean;
    attachments: string[];
    createdAt: string;
  };
  message: string;
}
```

**Status Codes:** `201` (created), `400` (validation, ticket closed), `401` (unauthorized), `403` (not own ticket), `404` (ticket not found)

---

## 17. Domain: Admin — User Management

Base path: `/api/v1/admin/users`

### 17.1 List Users (Admin)

```
GET /api/v1/admin/users
```

**Auth:** Required (Admin, SuperAdmin)

**Description:** List all platform users with filtering, searching, and sorting. Supports pagination.

**Query Parameters:**
- `status` (optional): `active` | `pending_verification` | `locked` | `banned` | `suspended`
- `role` (optional): filter by role
- `kycLevel` (optional): filter by KYC level (0–3)
- `search` (optional): partial match on email, name
- `sortBy` (optional): `createdAt` | `totalDeposits` | `totalInvestments`, default `createdAt`
- `sortOrder` (optional): `asc` | `desc`, default `desc`
- `page` (optional): number, default 1
- `limit` (optional): number, default 20, max 100

**Response (200):**

```typescript
interface AdminUserListResponse {
  data: Array<{
    id: string;
    email: string;
    role: Role;
    kycLevel: number;
    kycStatus: string;
    status: string;
    activeMode: 'demo' | 'live';
    twoFactorEnabled: boolean;
    totalDeposits: string;
    totalInvestments: string;
    totalWithdrawals: string;
    referralCode: string;
    createdAt: string;
    lastLoginAt: string | null;
  }>;
  meta: OffsetPaginationMeta;
  message: string;
}
```

**Status Codes:** `200` (success), `401` (unauthorized), `403` (forbidden)

---

### 17.2 Get User Details (Admin)

```
GET /api/v1/admin/users/:id
```

**Auth:** Required (Admin, SuperAdmin, Support — limited fields)

**Description:** Retrieve detailed information about a specific user. Support Agents see limited fields (no financial data).

**Path Parameters:**
- `id` (UUID) — User ID

**Response (200):**

```typescript
interface AdminUserDetailResponse {
  id: string;
  email: string;
  role: Role;
  kycLevel: number;
  kycStatus: string;
  status: string;
  activeMode: 'demo' | 'live';
  twoFactorEnabled: boolean;
  profile: {
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
    country: string | null;
    avatarUrl: string | null;
  };
  wallet: {
    demoBalance: string;
    liveBalance: string;
    totalDeposits: string;
    totalInvestments: string;
    totalWithdrawals: string;
    totalCommissions: string;
  };
  referral: {
    code: string;
    referredBy: string | null;
    totalReferrals: number;
    activeReferrals: number;
  };
  createdAt: string;
  lastLoginAt: string | null;
  emailVerifiedAt: string | null;
}
```

**Status Codes:** `200` (success), `401` (unauthorized), `403` (forbidden), `404` (user not found)

---

### 17.3 Update User Status (Admin)

```
PUT /api/v1/admin/users/:id/status
```

**Auth:** Required (Admin, SuperAdmin)

**Description:** Update a user's account status (ban, unban, suspend, activate, lock). SuperAdmin can also change roles. Creates an audit log entry and notifies the affected user.

**Path Parameters:**
- `id` (UUID) — User ID

**Request Body:**

```typescript
interface UpdateUserStatusRequest {
  status: 'active' | 'banned' | 'suspended' | 'locked';
  reason: string;              // Mandatory for ban, suspend, lock
  role?: Role;                 // SuperAdmin only
}
```

**Response (200):**

```typescript
interface UpdateUserStatusResponse {
  user: {
    id: string;
    status: string;
    role: Role;
    updatedAt: string;
  };
  message: string;
}
```

**Status Codes:** `200` (success), `400` (validation, missing reason), `401` (unauthorized), `403` (forbidden — cannot modify own status, Admin cannot change roles), `404` (user not found), `422` (cannot ban a SuperAdmin)

---

### 17.4 Adjust User Wallet (SuperAdmin Only)

```
POST /api/v1/admin/users/:id/wallet/adjust
```

**Auth:** Required (SuperAdmin only)

**Description:** Manually adjust a user's wallet balance. Requires a detailed reason. Creates an audit log entry.

**Path Parameters:**
- `id` (UUID) — User ID

**Request Body:**

```typescript
interface AdjustWalletRequest {
  mode: 'demo' | 'live';
  amount: string;              // Decimal string, can be negative (debit) or positive (credit)
  reason: string;              // Mandatory justification
}
```

**Response (200):**

```typescript
interface AdjustWalletResponse {
  transaction: {
    id: string;
    userId: string;
    type: 'adjustment';
    amount: string;
    balanceBefore: string;
    balanceAfter: string;
    mode: 'demo' | 'live';
    reason: string;
    performedBy: string;       // Admin user ID
    createdAt: string;
  };
  message: string;
}
```

**Status Codes:** `200` (success), `400` (validation), `401` (unauthorized), `403` (forbidden — not SuperAdmin), `404` (user not found), `422` (would result in negative balance)

---

## 18. Domain: Admin — KYC Review

Base path: `/api/v1/admin/kyc`

### 18.1 List Pending KYC Submissions

```
GET /api/v1/admin/kyc/pending
```

**Auth:** Required (Compliance, Admin, SuperAdmin)

**Description:** List all KYC submissions that are in `pending` status, ordered by submission date (oldest first for FIFO processing).

**Query Parameters:**
- `targetLevel` (optional): filter by target KYC level (1, 2, 3)
- `search` (optional): partial match on user email or name
- `page` (optional): number, default 1
- `limit` (optional): number, default 20, max 100

**Response (200):**

```typescript
interface KycPendingListResponse {
  data: Array<{
    id: string;
    userId: string;
    userEmail: string;
    userName: string | null;
    currentLevel: number;
    targetLevel: number;
    status: 'pending';
    submittedAt: string;
    documentTypes: string[];   // ["id_front", "id_back", "proof_of_address"]
  }>;
  meta: OffsetPaginationMeta;
  message: string;
}
```

**Status Codes:** `200` (success), `401` (unauthorized), `403` (forbidden)

---

### 18.2 Approve KYC Submission

```
PUT /api/v1/admin/kyc/:id/approve
```

**Auth:** Required (Compliance, Admin, SuperAdmin)

**Description:** Approve a pending KYC submission. Upgrades the user's KYC level and grants access to corresponding deposit limits and plan tiers. Creates an audit log entry and notifies the user.

**Path Parameters:**
- `id` (UUID) — KYC submission ID

**Request Body:**

```typescript
interface ApproveKycRequest {
  notes?: string;              // Optional reviewer notes
}
```

**Response (200):**

```typescript
interface ApproveKycResponse {
  submission: {
    id: string;
    userId: string;
    targetLevel: number;
    status: 'approved';
    reviewedAt: string;
    reviewedBy: string;
  };
  user: {
    id: string;
    previousKycLevel: number;
    newKycLevel: number;
  };
  message: string;
}
```

**Status Codes:** `200` (success), `401` (unauthorized), `403` (forbidden), `404` (submission not found), `409` (already reviewed), `422` (user's current level does not qualify for this target)

---

### 18.3 Reject KYC Submission

```
PUT /api/v1/admin/kyc/:id/reject
```

**Auth:** Required (Compliance, Admin, SuperAdmin)

**Description:** Reject a pending KYC submission with a mandatory reason. The user is notified and can resubmit. Creates an audit log entry.

**Path Parameters:**
- `id` (UUID) — KYC submission ID

**Request Body:**

```typescript
interface RejectKycRequest {
  reason: string;              // Mandatory — detailed rejection reason
  rejectionCode?: string;      // e.g., "DOCUMENT_UNREADABLE", "NAME_MISMATCH", "FORGED_DOCUMENT"
}
```

**Response (200):**

```typescript
interface RejectKycResponse {
  submission: {
    id: string;
    userId: string;
    targetLevel: number;
    status: 'rejected';
    rejectionReason: string;
    reviewedAt: string;
    reviewedBy: string;
  };
  message: string;
}
```

**Status Codes:** `200` (success), `400` (missing reason), `401` (unauthorized), `403` (forbidden), `404` (submission not found), `409` (already reviewed)

---

## 19. Domain: Admin — Deposits

Base path: `/api/v1/admin/deposits`

### 19.1 List Pending Deposits

```
GET /api/v1/admin/deposits/pending
```

**Auth:** Required (Admin, SuperAdmin)

**Description:** List all deposits in `pending` status that require admin review (primarily gift card deposits). Crypto deposits are typically auto-confirmed but may appear here for manual review.

**Query Parameters:**
- `type` (optional): `crypto` | `gift_card`
- `search` (optional): partial match on user email
- `page` (optional): number, default 1
- `limit` (optional): number, default 20, max 100
- `sortBy` (optional): `createdAt` | `amount`, default `createdAt`

**Response (200):**

```typescript
interface AdminPendingDepositListResponse {
  data: Array<{
    id: string;
    userId: string;
    userEmail: string;
    type: 'crypto' | 'gift_card';
    amount: string;
    currency: string;
    status: 'pending';
    cardBrand: string | null;     // Gift card deposits only
    createdAt: string;
  }>;
  meta: OffsetPaginationMeta;
  message: string;
}
```

**Status Codes:** `200` (success), `401` (unauthorized), `403` (forbidden)

---

### 19.2 Approve Deposit

```
PUT /api/v1/admin/deposits/:id/approve
```

**Auth:** Required (Admin, SuperAdmin)

**Description:** Approve a pending deposit. Credits the equivalent USD amount to the user's live wallet. Creates an audit log entry, triggers a notification, and may credit referral commissions if applicable.

**Path Parameters:**
- `id` (UUID) — Deposit ID

**Request Body:**

```typescript
interface ApproveDepositRequest {
  notes?: string;
  actualAmount?: string;        // Override the credited amount (Admin only with justification)
}
```

**Response (200):**

```typescript
interface ApproveDepositResponse {
  deposit: {
    id: string;
    userId: string;
    amount: string;
    creditedAmount: string;
    status: 'completed';
    reviewedAt: string;
    reviewedBy: string;
  };
  message: string;
}
```

**Status Codes:** `200` (success), `401` (unauthorized), `403` (forbidden), `404` (deposit not found), `409` (already reviewed)

---

### 19.3 Reject Deposit

```
PUT /api/v1/admin/deposits/:id/reject
```

**Auth:** Required (Admin, SuperAdmin)

**Description:** Reject a pending deposit with a mandatory reason.

**Path Parameters:**
- `id` (UUID) — Deposit ID

**Request Body:**

```typescript
interface RejectDepositRequest {
  reason: string;              // Mandatory
}
```

**Response (200):**

```typescript
interface RejectDepositResponse {
  deposit: {
    id: string;
    status: 'rejected';
    rejectionReason: string;
    reviewedAt: string;
    reviewedBy: string;
  };
  message: string;
}
```

**Status Codes:** `200` (success), `400` (missing reason), `401` (unauthorized), `403` (forbidden), `404` (not found), `409` (already reviewed)

---

## 20. Domain: Admin — Withdrawals

Base path: `/api/v1/admin/withdrawals`

### 20.1 List Pending Withdrawals

```
GET /api/v1/admin/withdrawals/pending
```

**Auth:** Required (Admin, SuperAdmin)

**Description:** List all withdrawals in `pending` status that require admin approval. Withdrawals exceeding $10,000 require dual approval.

**Query Parameters:**
- `currency` (optional): `BTC` | `ETH` | `USDT`
- `search` (optional): partial match on user email
- `page` (optional): number, default 1
- `limit` (optional): number, default 20, max 100
- `sortBy` (optional): `createdAt` | `amount`, default `createdAt`

**Response (200):**

```typescript
interface AdminPendingWithdrawalListResponse {
  data: Array<{
    id: string;
    userId: string;
    userEmail: string;
    grossAmount: string;
    feeAmount: string;
    netAmount: string;
    currency: string;
    walletAddress: string;
    status: 'pending';
    requiresDualApproval: boolean;
    approvalCount: number;
    createdAt: string;
  }>;
  meta: OffsetPaginationMeta;
  message: string;
}
```

**Status Codes:** `200` (success), `401` (unauthorized), `403` (forbidden)

---

### 20.2 Approve Withdrawal

```
PUT /api/v1/admin/withdrawals/:id/approve
```

**Auth:** Required (Admin, SuperAdmin)

**Description:** Approve a pending withdrawal. For amounts > $10,000, requires dual approval (two different admins must approve). On final approval, the withdrawal is processed and the user's wallet is debited. Creates an audit log entry.

**Path Parameters:**
- `id` (UUID) — Withdrawal ID

**Request Body:**

```typescript
interface ApproveWithdrawalRequest {
  notes?: string;
  txHash?: string;             // Transaction hash after on-chain execution (SuperAdmin for final step)
}
```

**Response (200):**

```typescript
interface ApproveWithdrawalResponse {
  withdrawal: {
    id: string;
    status: 'approved' | 'processing' | 'completed';
    approvalCount: number;
    requiresDualApproval: boolean;
    approvedBy: string[];
    reviewedAt: string;
  };
  message: string;
}
```

**Status Codes:** `200` (success), `401` (unauthorized), `403` (forbidden), `404` (not found), `409` (already reviewed, self-approval for dual approval)

---

### 20.3 Reject Withdrawal

```
PUT /api/v1/admin/withdrawals/:id/reject
```

**Auth:** Required (Admin, SuperAdmin)

**Description:** Reject a pending withdrawal. The full gross amount is returned to the user's live wallet. Creates an audit log entry.

**Path Parameters:**
- `id` (UUID) — Withdrawal ID

**Request Body:**

```typescript
interface RejectWithdrawalRequest {
  reason: string;              // Mandatory
}
```

**Response (200):**

```typescript
interface RejectWithdrawalResponse {
  withdrawal: {
    id: string;
    status: 'rejected';
    rejectionReason: string;
    refundedAmount: string;    // Full gross amount returned to wallet
    reviewedAt: string;
    reviewedBy: string;
  };
  message: string;
}
```

**Status Codes:** `200` (success), `400` (missing reason), `401` (unauthorized), `403` (forbidden), `404` (not found), `409` (already reviewed)

---

## 21. Domain: Admin — Plans

Base path: `/api/v1/admin/plans`

### 21.1 Create Plan

```
POST /api/v1/admin/plans
```

**Auth:** Required (SuperAdmin only)

**Description:** Create a new investment plan. Plans cannot be deleted or disabled if they have active investments.

**Request Body:**

```typescript
interface CreatePlanRequest {
  name: string;                // e.g., "Basic", "Silver", "Gold", "Platinum"
  slug: string;                // URL-safe identifier
  tier: number;                // 1–4
  minDeposit: string;          // Decimal string
  maxDeposit: string;          // Decimal string
  returnRate: string;          // Decimal string, percentage
  durationHours: number;       // Investment duration in hours
  durationLabel: string;       // Human-readable duration
  mode: 'demo' | 'live';
  requiredKycLevel: number;    // 0–3
  description: string;
  features: string[];
  riskLevel: 'low' | 'medium' | 'high';
  isActive: boolean;
  isAcceptingInvestments: boolean;
}
```

**Response (201):**

```typescript
interface CreatePlanResponse {
  plan: {
    id: string;
    name: string;
    slug: string;
    tier: number;
    minDeposit: string;
    maxDeposit: string;
    returnRate: string;
    durationHours: number;
    durationLabel: string;
    mode: 'demo' | 'live';
    requiredKycLevel: number;
    description: string;
    features: string[];
    riskLevel: 'low' | 'medium' | 'high';
    isActive: boolean;
    isAcceptingInvestments: boolean;
    createdAt: string;
    updatedAt: string;
  };
  message: string;
}
```

**Status Codes:** `201` (created), `400` (validation), `401` (unauthorized), `403` (forbidden — not SuperAdmin), `409` (slug already exists)

---

### 21.2 Update Plan

```
PUT /api/v1/admin/plans/:id
```

**Auth:** Required (SuperAdmin only)

**Description:** Update an existing investment plan. Cannot delete or disable plans with active investments. Changes to active plans require a migration strategy.

**Path Parameters:**
- `id` (UUID) — Plan ID

**Request Body:**

```typescript
interface UpdatePlanRequest {
  name?: string;
  minDeposit?: string;
  maxDeposit?: string;
  returnRate?: string;
  durationHours?: number;
  durationLabel?: string;
  requiredKycLevel?: number;
  description?: string;
  features?: string[];
  riskLevel?: 'low' | 'medium' | 'high';
  isActive?: boolean;
  isAcceptingInvestments?: boolean;
}
```

**Response (200):**

```typescript
interface UpdatePlanResponse {
  plan: {
    id: string;
    // ... all plan fields
    updatedAt: string;
  };
  message: string;
}
```

**Status Codes:** `200` (success), `400` (validation), `401` (unauthorized), `403` (forbidden), `404` (not found), `422` (cannot deactivate plan with active investments)

---

### 21.3 Delete Plan

```
DELETE /api/v1/admin/plans/:id
```

**Auth:** Required (SuperAdmin only)

**Description:** Soft-delete a plan. Only allowed if the plan has zero active investments. Historical (completed) investments referencing this plan are preserved.

**Path Parameters:**
- `id` (UUID) — Plan ID

**Response (200):**

```typescript
interface DeletePlanResponse {
  id: string;
  deleted: true;
  message: string;
}
```

**Status Codes:** `200` (success), `401` (unauthorized), `403` (forbidden), `404` (not found), `422` (plan has active investments)

---

## 22. Domain: Admin — Reports

Base path: `/api/v1/admin/reports`

### 22.1 Dashboard Report

```
GET /api/v1/admin/reports/dashboard
```

**Auth:** Required (Admin, SuperAdmin)

**Description:** Retrieve platform-wide dashboard metrics including user counts, financial summaries, pending actions, and recent activity.

**Query Parameters:**
- `mode` (optional): `demo` | `live` — filter by mode (default: both, shown separately)

**Response (200):**

```typescript
interface DashboardReportResponse {
  users: {
    total: number;
    active: number;
    pendingVerification: number;
    newThisWeek: number;
    newThisMonth: number;
  };
  finances: {
    demo: {
      totalDeposits: string;
      totalInvestments: string;
      totalWithdrawals: string;
      platformBalance: string;
    };
    live: {
      totalDeposits: string;
      totalInvestments: string;
      totalWithdrawals: string;
      platformBalance: string;
      feesCollected: string;
    };
  };
  investments: {
    activeCount: number;
    totalActiveAmount: string;
    maturedToday: number;
  };
  pendingActions: {
    pendingDeposits: number;
    pendingWithdrawals: number;
    pendingKyc: number;
    openTickets: number;
  };
  recentActivity: Array<{
    type: string;
    description: string;
    createdAt: string;
  }>;
}
```

**Status Codes:** `200` (success), `401` (unauthorized), `403` (forbidden)

---

### 22.2 Revenue Report

```
GET /api/v1/admin/reports/revenue
```

**Auth:** Required (Admin, SuperAdmin with `report.financial` permission)

**Description:** Retrieve revenue and fee breakdown reports. Supports date range filtering and grouping.

**Query Parameters:**
- `startDate` (optional): ISO date string, default 30 days ago
- `endDate` (optional): ISO date string, default today
- `groupBy` (optional): `day` | `week` | `month`, default `day`

**Response (200):**

```typescript
interface RevenueReportResponse {
  summary: {
    totalRevenue: string;         // Total fees collected in period
    withdrawalFees: string;       // 21% withdrawal fees
    netDeposits: string;          // Total deposits minus withdrawals
    activeInvestmentVolume: string;
  };
  breakdown: Array<{
    period: string;               // Date, week, or month label
    deposits: string;
    withdrawals: string;
    withdrawalFees: string;
    investments: string;
    returns: string;
    netRevenue: string;
  }>;
}
```

**Status Codes:** `200` (success), `401` (unauthorized), `403` (forbidden — no financial report permission)

---

### 22.3 User Report

```
GET /api/v1/admin/reports/users
```

**Auth:** Required (Admin, SuperAdmin)

**Description:** Retrieve user growth and engagement metrics.

**Query Parameters:**
- `startDate` (optional): ISO date string
- `endDate` (optional): ISO date string
- `groupBy` (optional): `day` | `week` | `month`, default `day`

**Response (200):**

```typescript
interface UserReportResponse {
  summary: {
    totalUsers: number;
    newUsers: number;
    verifiedUsers: number;
    kycLevel1: number;
    kycLevel2: number;
    kycLevel3: number;
    avgDepositsPerUser: string;
  };
  growth: Array<{
    period: string;
    newUsers: number;
    cumulativeTotal: number;
    kycCompletions: number;
  }>;
}
```

**Status Codes:** `200` (success), `401` (unauthorized), `403` (forbidden)

---

## 23. Domain: Admin — System Config

Base path: `/api/v1/admin/system`

### 23.1 Get System Config

```
GET /api/v1/admin/system/config
```

**Auth:** Required (Admin, SuperAdmin)

**Description:** Retrieve the current platform configuration. Admins see non-restricted fields. SuperAdmins see all fields including fees and critical settings.

**Response (200):**

```typescript
interface SystemConfigResponse {
  platform: {
    name: string;
    logoUrl: string;
    supportEmail: string;
    maintenanceMode: boolean;
  };
  fees: {                        // SuperAdmin only
    withdrawalFeePercentage: string;  // "21.00"
  };
  demo: {
    startingBalance: string;
    enabled: boolean;
  };
  referral: {
    directCommissionPercentage: string;  // "10.00"
    binaryBonusPercentage: string;
    maxDepth: number;
  };
  kyc: {
    documentRetentionYears: number;
    reVerificationMonths: number;
    maxSubmissionAttempts: number;
  };
  security: {                    // SuperAdmin only
    accountLockoutAttempts: number;
    accountLockoutMinutes: number;
    passwordResetTokenExpiryMinutes: number;
    emailVerificationTokenExpiryHours: number;
  };
  email: {
    fromAddress: string;
    fromName: string;
  };
  lastUpdatedBy: string | null;
  lastUpdatedAt: string | null;
}
```

**Status Codes:** `200` (success), `401` (unauthorized), `403` (forbidden)

---

### 23.2 Update System Config

```
PUT /api/v1/admin/system/config
```

**Auth:** Required (Admin — non-restricted fields only; SuperAdmin — all fields)

**Description:** Update platform configuration. Admins can update email settings, feature flags, and general settings. SuperAdmins can additionally update fees, security settings, and critical parameters. All changes are audit-logged.

**Request Body:**

```typescript
interface UpdateSystemConfigRequest {
  platform?: {
    name?: string;
    logoUrl?: string;
    supportEmail?: string;
    maintenanceMode?: boolean;
  };
  fees?: {                       // SuperAdmin only
    withdrawalFeePercentage?: string;
  };
  demo?: {
    startingBalance?: string;
    enabled?: boolean;
  };
  referral?: {
    directCommissionPercentage?: string;
    binaryBonusPercentage?: string;
    maxDepth?: number;
  };
  kyc?: {
    documentRetentionYears?: number;
    reVerificationMonths?: number;
    maxSubmissionAttempts?: number;
  };
  security?: {                   // SuperAdmin only
    accountLockoutAttempts?: number;
    accountLockoutMinutes?: number;
    passwordResetTokenExpiryMinutes?: number;
    emailVerificationTokenExpiryHours?: number;
  };
  email?: {
    fromAddress?: string;
    fromName?: string;
  };
}
```

**Response (200):**

```typescript
interface UpdateSystemConfigResponse {
  config: SystemConfigResponse;
  updatedFields: string[];       // List of changed field paths
  message: string;
}
```

**Status Codes:** `200` (success), `400` (validation), `401` (unauthorized), `403` (forbidden — attempting to modify restricted fields without SuperAdmin)

---

## 24. Domain: Admin — Audit Logs

Base path: `/api/v1/admin/audit-logs`

### 24.1 List Audit Logs

```
GET /api/v1/admin/audit-logs
```

**Auth:** Required (Admin, SuperAdmin)

**Description:** Retrieve the immutable audit log. Audit logs capture all administrative actions, financial operations, permission changes, and system configuration changes. Logs are append-only and cannot be modified or deleted.

**Query Parameters:**
- `action` (optional): filter by action type (e.g., `user.ban`, `kyc.approve`, `deposit.approve`, `withdrawal.approve`, `settings.update`, `plan.create`, `role.assign`, `wallet.adjust`)
- `userId` (optional): filter by the user who performed the action
- `targetUserId` (optional): filter by the user affected by the action
- `entityType` (optional): `user` | `kyc` | `deposit` | `withdrawal` | `plan` | `settings` | `role`
- `entityId` (optional): filter by specific entity UUID
- `startDate` (optional): ISO date string
- `endDate` (optional): ISO date string
- `cursor` (optional): opaque cursor string
- `limit` (optional): number, default 50, max 100

**Response (200):**

```typescript
interface AuditLogListResponse {
  data: Array<{
    id: string;
    action: string;              // e.g., "kyc.approve", "withdrawal.reject"
    actor: {
      id: string;
      email: string;
      role: Role;
    };
    target: {
      entityType: string;
      entityId: string;
      description: string;
    } | null;
    metadata: Record<string, unknown>;
    ipAddress: string;
    userAgent: string;
    createdAt: string;
  }>;
  meta: {
    cursor: string | null;
    hasMore: boolean;
    limit: number;
  };
  message: string;
}
```

**Status Codes:** `200` (success), `401` (unauthorized), `403` (forbidden)

---

## 25. Domain: Utility

### 25.1 List Currencies

```
GET /api/v1/currencies
```

**Auth:** None (public)

**Description:** Retrieve the list of supported fiat currencies and their display information.

**Response (200):**

```typescript
interface CurrencyListResponse {
  currencies: Array<{
    code: string;               // ISO 4217, e.g., "USD", "EUR", "GBP"
    name: string;               // "US Dollar"
    symbol: string;             // "$"
    flagEmoji: string;          // "🇺🇸"
    isDefault: boolean;
  }>;
  crypto: Array<{
    code: 'BTC' | 'ETH' | 'USDT';
    name: string;
    symbol: string;
    networks: string[];         // ["ERC-20", "TRC-20", "BTC"]
    isActive: boolean;
  }>;
}
```

**Status Codes:** `200` (success)

---

### 25.2 Get Exchange Rates

```
GET /api/v1/currencies/rates
```

**Auth:** None (public)

**Description:** Retrieve the latest exchange rates for all supported currencies against USD.

**Response (200):**

```typescript
interface ExchangeRatesResponse {
  base: string;                 // "USD"
  rates: Record<string, string>;  // { "EUR": "0.92", "GBP": "0.79", ... }
  cryptoRates: Record<string, string>;  // { "BTC": "67500.00", "ETH": "3450.00", "USDT": "1.00" }
  updatedAt: string;            // ISO 8601 timestamp of last rate update
}
```

**Status Codes:** `200` (success)

---

### 25.3 Get Maintenance Status

```
GET /api/v1/settings/maintenance
```

**Auth:** None (public)

**Description:** Check if the platform is currently in maintenance mode. Used by the frontend to display a maintenance banner.

**Response (200):**

```typescript
interface MaintenanceStatusResponse {
  isMaintenanceMode: boolean;
  message: string | null;       // Custom maintenance message
  estimatedEndTime: string | null;  // ISO 8601 or null
  features: {
    registration: boolean;      // false if registration is disabled during maintenance
    login: boolean;
    deposits: boolean;
    withdrawals: boolean;
    investments: boolean;
  };
}
```

**Status Codes:** `200` (success)

---

## 26. Audit Logging Specification

Every **mutating endpoint** (POST, PUT, PATCH, DELETE) must create an audit log entry regardless of success or failure. The audit log entry is created after the endpoint handler executes and captures:

```typescript
interface AuditLogEntry {
  id: string;                   // UUID
  action: string;               // e.g., "deposit.approve", "user.ban", "kyc.reject"
  actorId: string;              // User ID of the performer
  actorRole: Role;              // Role at time of action
  entityType: string;           // Target entity type
  entityId: string;             // Target entity UUID
  changes: {
    before: Record<string, unknown> | null;
    after: Record<string, unknown> | null;
  };
  requestMetadata: {
    method: string;
    path: string;
    ipAddress: string;
    userAgent: string;
    requestId: string;          // Correlation ID for tracing
  };
  status: 'success' | 'failure';
  errorMessage: string | null;
  createdAt: string;            // ISO 8601 UTC
}
```

Audit logs are stored in a dedicated `AuditLog` table with append-only semantics. No UPDATE or DELETE operations are permitted on this table, enforced at the ORM level via Prisma middleware.

---

## 27. File Upload Flow

File uploads follow a two-step pattern:

### 27.1 Request Signed Upload URL

```
POST /api/v1/uploads/signed-url
```

**Auth:** Required (any authenticated user)

**Request Body:**

```typescript
interface SignedUrlRequest {
  category: 'avatar' | 'kyc_document' | 'gift_card';
  fileType: string;             // MIME type, e.g., "image/jpeg"
  fileSize: number;             // Bytes
  documentType?: 'id_front' | 'id_back' | 'proof_of_address' | 'selfie';  // KYC only
}
```

**Response (200):**

```typescript
interface SignedUrlResponse {
  uploadUrl: string;            // Cloudinary signed upload URL
  publicId: string;             // Expected Cloudinary public ID
  uploadParams: Record<string, string>;
  maxSize: number;              // Max allowed size in bytes
  expiresAt: string;            // Signed URL expiry (ISO 8601)
}
```

### 27.2 File Size Limits

| Category | Max Size | Accepted Types |
|----------|----------|----------------|
| Avatar | 5 MB | JPEG, PNG, WebP |
| KYC Document | 10 MB | JPEG, PNG, WebP, PDF |
| Gift Card Screenshot | 8 MB | JPEG, PNG |

### 27.3 Validation

File type is validated by both extension and magic bytes (content type). Mismatches are rejected.

---

## 28. Common Type Definitions

```typescript
// Reusable types referenced throughout this document

type Role = 'SUPER_ADMIN' | 'ADMIN' | 'COMPLIANCE' | 'SUPPORT' | 'USER';

type DepositStatus =
  | 'pending'
  | 'confirming'
  | 'verified'
  | 'completed'
  | 'failed'
  | 'rejected';

type WithdrawalStatus =
  | 'pending'
  | 'processing'
  | 'approved'
  | 'completed'
  | 'rejected'
  | 'failed';

type InvestmentStatus =
  | 'active'
  | 'matured'
  | 'completed';

type TicketStatus =
  | 'open'
  | 'in_progress'
  | 'resolved'
  | 'closed';

type NotificationType =
  | 'deposit'
  | 'withdrawal'
  | 'investment'
  | 'kyc'
  | 'referral'
  | 'security'
  | 'system';

type TicketCategory =
  | 'general'
  | 'deposit'
  | 'withdrawal'
  | 'investment'
  | 'kyc'
  | 'referral'
  | 'technical'
  | 'other';

type TicketPriority = 'low' | 'medium' | 'high';

type CryptoCurrency = 'BTC' | 'ETH' | 'USDT';

type UserStatus =
  | 'active'
  | 'pending_verification'
  | 'locked'
  | 'banned'
  | 'suspended';

interface OffsetPaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  prev: string | null;
  next: string | null;
}

interface CursorPaginationMeta {
  cursor: string | null;
  hasMore: boolean;
  limit: number;
}
```

---

## 29. Webhook Support (Phase 2 — Future)

> This section is reserved for Phase 2 webhook implementation. The API design does not preclude webhook support.

Planned webhook endpoints (admin-only, future):

```
POST   /api/v1/admin/webhooks           — Create webhook subscription
GET    /api/v1/admin/webhooks           — List active webhooks
PUT    /api/v1/admin/webhooks/:id       — Update webhook
DELETE /api/v1/admin/webhooks/:id       — Delete webhook
GET    /api/v1/admin/webhooks/:id/logs  — View delivery logs
POST   /api/v1/admin/webhooks/:id/retry — Retry failed deliveries
```

---

*End of API Design Specification — TeslaPrimeCapital Phase 2*