# Security Requirements

**Project:** Enterprise Investment Platform — Phase 1  
**Version:** 1.0.0  
**Last Updated:** 2025-01  
**Status:** Approved  

This document defines the comprehensive security requirements for the enterprise investment platform. Given that the platform handles financial transactions, cryptocurrency operations, and personally identifiable information, security is a first-class concern that influences every architectural and implementation decision. See [AUTHENTICATION_REQUIREMENTS](./AUTHENTICATION_REQUIREMENTS.md) for the detailed authentication flow specifications, [SYSTEM_ARCHITECTURE](./SYSTEM_ARCHITECTURE.md) for the system design context, and [DATABASE_REQUIREMENTS](./DATABASE_REQUIREMENTS.md) for data protection measures.

---

## 1. Security Architecture Overview

### 1.1 Defense in Depth Strategy

The platform implements a defense-in-depth security model where multiple independent security layers protect the system. No single security control is relied upon exclusively. If one layer is compromised, the subsequent layers continue to provide protection. The layers, from outermost to innermost, are:

1. **Network Layer:** Firewall rules restrict inbound traffic to HTTP/HTTPS only. Database and Redis ports are never exposed externally. SSL/TLS encryption terminates at the reverse proxy, and internal container communication occurs over an isolated Docker bridge network.
2. **Application Layer:** Input validation (Zod schemas), rate limiting, CSRF protection, XSS prevention, security headers, and request signing protect against application-level attacks.
3. **Data Layer:** Encryption at rest for sensitive fields, parameterized queries (Prisma ORM), database-level access controls, and backup encryption protect stored data.
4. **User Layer:** Strong password policies, 2FA, session management, device tracking, and progressive account lockout protect individual user accounts.

### 1.2 Zero Trust Principles

Where applicable, the platform applies zero trust principles: no user, device, or network segment is inherently trusted. Every request is authenticated and authorized based on identity and context. Specific applications of this principle include: (1) the backend validates the JWT on every API request rather than relying on the reverse proxy for authentication; (2) admin actions require both authentication and role-based authorization; (3) internal service-to-service communication (if introduced in future phases) would use mutual TLS or signed tokens rather than trusting the internal network.

---

## 2. Authentication Security

### 2.1 Password Hashing

All user passwords are hashed using the argon2id algorithm before storage. Argon2id is the winner of the Password Hashing Competition and is recommended over bcrypt and scrypt by OWASP. It provides resistance against both GPU-based and side-channel attacks. The specific parameters are configured via environment variables (see [SYSTEM_REQUIREMENTS](./SYSTEM_REQUIREMENTS.md)) with recommended defaults: salt length of 16 bytes, memory cost of 64 MB, time cost of 3 iterations, and parallelism of 4 lanes. These parameters may be adjusted upward as hardware capabilities increase over time.

### 2.2 Password Requirements

Users must create passwords meeting the following minimum requirements: at least 8 characters in length, containing at least one uppercase letter, one lowercase letter, one number, and one special character. These requirements are validated both client-side (for immediate feedback) and server-side (for security enforcement). Passwords are checked against the HaveIBeenPwned breach database API to prevent users from choosing compromised passwords. The last 5 passwords cannot be reused, enforced by storing password history hashes. See [AUTHENTICATION_REQUIREMENTS](./AUTHENTICATION_REQUIREMENTS.md) for the complete password policy.

### 2.3 Account Lockout Policy

The platform implements a progressive account lockout mechanism to prevent brute-force attacks. Lockout state is tracked both per email address and per IP address, ensuring that attackers cannot bypass lockout by switching targets. The lockout tiers are:

- **5 failed attempts:** Account locked for 15 minutes. User sees a countdown timer indicating when they can retry.
- **10 failed attempts:** Account locked for 1 hour. User receives an email notification of the lockout.
- **20 failed attempts:** Account permanently locked until an administrator reviews and unlocks it. Both the user and the admin team are notified.

Failed attempt counters reset after a successful login. The counters also reset after the lockout period expires. All lockout events are recorded in the audit log with the IP address, user agent, and timestamp.

---

## 3. Session Security

### 3.1 Token Architecture

The platform uses a dual-token architecture consisting of a short-lived access token and a long-lived refresh token. This design minimizes the damage of token theft: if an access token is compromised, it expires in 15 minutes; if a refresh token is compromised, it can only be used once before being rotated.

**Access Token:** A signed JWT containing the user's ID, role, KYC level, and active mode. It has a 15-minute expiry and is stored in the frontend's memory (JavaScript variable), not in localStorage or cookies. This prevents access token theft via XSS attacks. The access token is attached to API requests in the `Authorization: Bearer <token>` header.

**Refresh Token:** A signed JWT stored as an HTTP-only, Secure, SameSite=Strict cookie. It has a 7-day expiry and is used exclusively to obtain new access tokens. The HTTP-only flag prevents JavaScript access (mitigating XSS), the Secure flag ensures it is only sent over HTTPS, and SameSite=Strict prevents it from being sent on cross-site requests (mitigating CSRF).

### 3.2 Token Rotation

Every time the refresh endpoint is called, a new refresh token is issued and the old one is immediately invalidated. This rotation ensures that a stolen refresh token can only be used once. The invalidation is implemented by storing the refresh token's unique identifier (jti claim) in Redis, and checking for its presence during refresh. After issuing a new token, the old token's identifier is removed from Redis (or moved to a denylist), making subsequent use of the old token fail.

### 3.3 Session Invalidation

All existing sessions (refresh tokens) for a user are invalidated when: (1) the user changes their password, (2) the user explicitly logs out from all devices, (3) an administrator suspends or bans the user's account, (4) the user's 2FA secret is changed. Invalidation is implemented by maintaining a user-level session version counter in Redis. Every refresh token includes this version number. If the stored version does not match the token's version, the refresh is rejected and the user must re-authenticate.

---

## 4. Two-Factor Authentication

### 4.1 TOTP-Based 2FA

The platform implements TOTP (Time-based One-Time Password) two-factor authentication, compatible with any authenticator app that supports the TOTP standard (Google Authenticator, Authy, 1Password, etc.). The TOTP secret is generated using the `otpauth` library, stored encrypted in the database using AES-256, and rendered as a QR code (using the `otpauth://` URI format) during the setup flow.

### 4.2 Backup Codes

When 2FA is enabled, the platform generates 10 single-use backup codes. Each code is a random 8-character alphanumeric string. Backup codes are displayed to the user once during setup and cannot be retrieved again. The user is instructed to store them securely. Each backup code, when used, is immediately invalidated. The backend tracks the number of remaining backup codes and warns the user when fewer than 3 remain.

### 4.3 2FA Enforcement

2FA is mandatory for the following operations: (1) initiating a withdrawal, (2) changing the account email address, (3) changing the password, (4) disabling 2FA itself, (5) accessing the admin dashboard, (6) performing any admin action that modifies user data or financial records. For login, 2FA is optional at the user's preference but strongly recommended through UI prompts.

### 4.4 2FA Setup Flow

The setup flow is designed to prevent the user from locking themselves out: (1) the user navigates to security settings and clicks "Enable 2FA"; (2) the backend generates a TOTP secret and returns the QR code; (3) the user scans the QR code with their authenticator app; (4) the user enters a 6-digit TOTP code to verify the secret is correctly configured; (5) only after successful verification, the backend stores the encrypted secret in the database; (6) backup codes are generated and displayed; (7) the user must acknowledge receipt of the backup codes before the setup is complete.

---

## 5. CSRF Protection

### 5.1 SameSite Cookies

All cookies set by the platform include the `SameSite=Strict` attribute, which prevents the browser from sending cookies in cross-site requests. This is the primary CSRF defense mechanism, as the refresh token cookie (the only stateful authentication mechanism) will not be sent with requests initiated by third-party sites.

### 5.2 CSRF Tokens for State-Changing Requests

As a defense-in-depth measure beyond SameSite cookies, all state-changing API requests (POST, PUT, PATCH, DELETE) require a CSRF token. The token is generated by the backend, embedded in the HTML during SSR (via a hidden form field or a meta tag), and attached by the frontend to each state-changing request in a custom header (e.g., `X-CSRF-Token`). The backend validates the token on every state-changing request. The double-submit cookie pattern is not used independently because it provides weaker protection than the header-based approach.

### 5.3 API Authentication Exception

API requests that use Bearer token authentication (access token in the Authorization header) are exempt from CSRF token validation because Bearer tokens are not automatically attached by the browser. CSRF is only a concern for cookie-based authentication, and the platform's access tokens are never stored in cookies. The refresh token cookie is HTTP-only and SameSite=Strict, which provides sufficient CSRF protection for the refresh flow.

---

## 6. XSS Protection

### 6.1 Content Security Policy

A strict Content-Security-Policy (CSP) header is configured to prevent XSS attacks by restricting the sources from which scripts, styles, images, and other resources can be loaded. The CSP directive set includes: `script-src 'self'` (only scripts from the platform's own origin, with specific nonces for inline scripts from Next.js), `style-src 'self' 'unsafe-inline'` (styles from the platform and inline styles required by Tailwind CSS), `img-src 'self' data: https://res.cloudinary.com` (images from the platform, data URIs for inline SVGs, and Cloudinary for uploaded images), `connect-src 'self'` (API calls only to the platform's own origin), and `frame-ancestors 'none'` (prevents the platform from being embedded in iframes).

### 6.2 Output Encoding

React's built-in JSX rendering automatically encodes output, preventing XSS in rendered content. All user-generated content (ticket messages, notification messages, profile names) is rendered through React components, never injected as raw HTML. If HTML rendering is ever required (e.g., rich text in support tickets), the content must be sanitized using a library like DOMPurify before rendering, and the sanitized output must be rendered via `dangerouslySetInnerHTML` only after explicit security review.

### 6.3 Input Sanitization

All user input is validated and sanitized at the API layer using Zod schemas before being stored in the database. String inputs are trimmed of leading/trailing whitespace. Inputs containing HTML or script tags are either rejected (for fields that should not contain HTML) or sanitized (for fields that may contain rich content). No user input is ever used directly in SQL queries, shell commands, or HTML templates without sanitization.

---

## 7. SQL Injection Prevention

### 7.1 Prisma ORM Parameterized Queries

The platform uses Prisma ORM for all database access, which generates parameterized queries by default. User input is never interpolated directly into SQL strings. Prisma's query builder ensures that all values are properly escaped and parameterized, eliminating the SQL injection attack vector entirely for standard queries.

### 7.2 Raw Query Policy

Raw SQL queries (`prisma.$queryRaw` or `prisma.$executeRaw`) are prohibited in the codebase unless explicitly approved by the technical lead. Any approved raw query must use tagged template literals (`prisma.$queryRaw\`SELECT ... WHERE id = ${id}\``) which Prisma automatically parameterizes. String concatenation in raw queries is never permitted. Raw queries are subject to additional code review and must include a comment explaining why Prisma's query builder is insufficient for the use case.

### 7.3 Input Validation Layer

Even though Prisma provides SQL injection protection, all API inputs are validated with Zod schemas before reaching the database layer. This provides defense in depth: if a bug in Prisma were to expose a SQL injection vector, the input validation layer would still limit the scope of the attack by rejecting malformed inputs.

---

## 8. Rate Limiting

### 8.1 Rate Limiting Implementation

Rate limiting is implemented using Redis-based sliding window counters. Each rate limit rule defines a maximum number of requests within a time window, identified by either the user's IP address, the user's ID (for authenticated requests), or both. Rate limit status is communicated to the frontend via standard rate limit headers (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`). When a rate limit is exceeded, the API returns HTTP 429 (Too Many Requests) with a `Retry-After` header.

### 8.2 Rate Limit Rules

| Endpoint Category | Limit | Window | Scope | Notes |
|-------------------|-------|--------|-------|-------|
| Login | 5 requests | per minute | per IP + per email | Prevents brute-force password attacks |
| Login | 20 requests | per hour | per IP + per email | Longer window for sustained attacks |
| Registration | 3 requests | per hour | per IP | Prevents mass account creation |
| Email OTP (send) | 3 requests | per minute | per identifier (email) | Prevents OTP spam |
| Email OTP (verify) | 10 requests | per minute | per identifier (email) | Allows reasonable retry attempts |
| Password Reset | 3 requests | per hour | per IP + per email | Prevents reset abuse |
| General API (authenticated) | 100 requests | per minute | per user ID | Allows normal app usage |
| General API (unauthenticated) | 30 requests | per minute | per IP | Allows browsing and registration flow |
| File Upload | 10 requests | per hour | per user ID | Prevents storage abuse |
| Support Ticket Creation | 5 requests | per hour | per user ID | Prevents ticket spam |
| Admin API | 200 requests | per minute | per user ID | Higher limit for admin operations |

### 8.3 Rate Limit Evasion Prevention

Rate limits based on IP address are vulnerable to evasion through proxies and VPNs. To mitigate this: (1) the platform uses the `X-Forwarded-For` header (set by the trusted reverse proxy) to get the real client IP, not the proxy IP; (2) critical endpoints (login, registration, OTP) apply rate limits at both the IP level and the target level (email address); (3) suspicious rate limit patterns (e.g., many different emails from the same IP) trigger fraud detection alerts. See the Fraud Detection section below.

---

## 9. Request Validation

### 9.1 Input Sanitization and Type Checking

Every API endpoint defines a Zod validation schema that specifies the exact expected types, formats, and constraints for each request parameter (body, query, path, headers). Validation occurs at the framework middleware level, before the request reaches any business logic. Invalid requests are rejected with HTTP 400 (Bad Request) and a detailed error response listing each validation failure. This approach prevents malformed or malicious input from reaching the application logic or the database.

### 9.2 Length Limits

All string inputs have explicit maximum length constraints defined in the Zod schemas. Common limits include: email (254 characters), names (100 characters), password (128 characters), text fields (10,000 characters), and message content (50,000 characters). These limits prevent buffer overflow attacks (even though Node.js/JavaScript is not traditionally vulnerable) and database storage abuse.

### 9.3 Content-Type Validation

API endpoints that accept request bodies enforce `Content-Type: application/json`. Requests with other content types (e.g., `multipart/form-data` on a JSON endpoint) are rejected. File upload endpoints explicitly accept `multipart/form-data` and reject all other content types. This prevents content-type confusion attacks.

### 9.4 File Upload Validation

File uploads are validated at multiple levels: (1) the file extension must match the allowed list (`.jpg`, `.jpeg`, `.png`, `.webp` for images; `.pdf` for documents); (2) the MIME type is checked against the extension (rejecting mismatched extensions); (3) the file size must not exceed the configured maximum (5 MB for KYC documents, 2 MB for gift card screenshots); (4) the file content is inspected for known malware signatures. See the File Upload Security section below for additional details.

---

## 10. Security Headers

### 10.1 Header Configuration

The following security headers are applied to all responses by the reverse proxy (Nginx or Traefik) and/or the backend middleware:

**Content-Security-Policy (CSP):** `default-src 'self'; script-src 'self' 'nonce-{NONCE}'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://res.cloudinary.com; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`. The nonce is generated per-request by the backend and injected into the SSR HTML and the CSP header.

**X-Frame-Options:** `DENY` — prevents the platform from being embedded in iframes, mitigating clickjacking attacks.

**X-Content-Type-Options:** `nosniff` — prevents browsers from MIME-type sniffing, ensuring that files are treated according to their declared content type.

**Strict-Transport-Security (HSTS):** `max-age=31536000; includeSubDomains; preload` — forces browsers to use HTTPS for all requests to the platform for one year. The `preload` directive is included to qualify for the HSTS Preload List.

**Referrer-Policy:** `strict-origin-when-cross-origin` — sends the origin (not the full URL) as the referrer when navigating to external sites, preventing sensitive URL parameters from leaking.

**Permissions-Policy:** `camera=(), microphone=(), geolocation=(), payment=()` — disables browser features that the platform does not use, reducing the attack surface.

**X-XSS-Protection:** `0` — this header is explicitly set to `0` (disabled) because the platform relies on the stronger CSP header for XSS prevention, and the legacy XSS auditor in some browsers can introduce vulnerabilities.

---

## 11. Data Encryption

### 11.1 Encryption at Rest

Sensitive database fields are encrypted at rest using AES-256-GCM (Galois/Counter Mode) before storage. The encryption key is managed as an environment variable (`ENCRYPTION_KEY`) and never stored in the database. Fields encrypted at rest include: the 2FA TOTP secret (in the Users table), KYC document metadata that may contain PII extracted from documents, and any wallet-related private data. The encryption is implemented as a Prisma middleware that transparently encrypts designated fields on write and decrypts them on read, so the application code works with plaintext values.

### 11.2 Encryption in Transit

All data in transit between the client and the server is encrypted using TLS 1.3 (with TLS 1.2 as the minimum fallback). This is enforced by the reverse proxy's SSL configuration. Internal container-to-container communication (backend to PostgreSQL, backend to Redis) occurs over the Docker bridge network in plain text. This is acceptable for a single-host deployment where the network is entirely within the server's kernel. If the architecture moves to multi-host, internal communication must be upgraded to mTLS.

### 11.3 Password Hashing

Passwords are not encrypted — they are hashed. Hashing is a one-way function, unlike encryption which is reversible. The argon2id algorithm with per-password random salts ensures that identical passwords produce different hashes, and that the hashes cannot be reversed to recover the original passwords. This distinction is critical: the platform must be able to verify a password against its hash but must never be able to recover a plaintext password.

---

## 12. File Upload Security

### 12.1 Upload Flow

All file uploads follow a secure multi-step flow: (1) the frontend requests a signed upload signature from the backend; (2) the backend validates the user's authentication and the upload context (e.g., KYC submission for a specific document type) and generates a Cloudinary signed upload parameters; (3) the frontend uploads the file directly to Cloudinary using the signed parameters; (4) Cloudinary performs its own security checks (file type, size); (5) Cloudinary returns the uploaded file's public ID and URL; (6) the frontend sends the Cloudinary URL to the backend as part of the KYC submission or deposit request; (7) the backend records the URL in the database.

### 12.2 File Type Whitelist

Only specific file types are permitted for upload, and the whitelist varies by context:

- **KYC Documents:** `.jpg`, `.jpeg`, `.png`, `.webp` (images), `.pdf` (documents)
- **Gift Card Screenshots:** `.jpg`, `.jpeg`, `.png`, `.webp` (images only)
- **User Avatars:** `.jpg`, `.jpeg`, `.png`, `.webp` (images only)

Any file with an extension or MIME type not in the whitelist is rejected at the backend signature generation step (before the upload reaches Cloudinary).

### 12.3 Size Limits

File size limits are enforced at three levels: (1) the frontend checks the file size before initiating the upload and rejects files that exceed the limit; (2) the backend includes the maximum size in the Cloudinary upload parameters; (3) Cloudinary enforces the size limit server-side. The limits are: 5 MB for KYC documents, 2 MB for gift card screenshots, and 2 MB for user avatars.

### 12.4 Private Access for KYC Documents

KYC document images are stored in a dedicated Cloudinary folder with restricted delivery. The Cloudinary URLs stored in the database are not directly accessible — they require a signed URL generated by the backend with a short expiry time (typically 30 minutes). This ensures that KYC documents cannot be accessed by anyone who obtains the database URL, and the signed URLs cannot be shared beyond their expiry window. Only authenticated admin users (or the document owner during upload preview) can request a signed URL.

### 12.5 Malware Scanning

For Phase 1, malware scanning relies on Cloudinary's built-in security features (file type validation, content analysis). If the platform scales to higher upload volumes, an additional malware scanning service (e.g., ClamAV, VirusTotal API) should be integrated into the upload flow, scanning files before they are made available for admin review.

---

## 13. API Security

### 13.1 Authentication and Authorization

Every API endpoint requires authentication unless explicitly marked as public (registration, login, password reset, public plan information). Authentication is verified by extracting and validating the JWT from the `Authorization: Bearer` header. Authorization is verified by checking the user's role (user, admin, super_admin) against the endpoint's required role. Financial endpoints additionally verify the user's KYC level and account status.

### 13.2 Endpoint-Level Authorization

Authorization is enforced at the route level using middleware that checks the user's role before the request handler is invoked. The role hierarchy is: `super_admin` (full platform access, including user management and configuration), `admin` (operational access: KYC review, deposit/withdrawal processing, support ticket management), `user` (standard user access to their own data and operations). Users can only access their own financial data; attempting to access another user's resources returns HTTP 403 (Forbidden).

### 13.3 Admin API Protection

The admin API endpoints are protected by an additional layer: IP allowlisting. Only requests from IP addresses configured in the `ADMIN_ALLOWED_IPS` environment variable can reach admin endpoints. This is enforced at the middleware level before role-based authorization. If the platform is accessed through a CDN, the real client IP must be extracted from the `X-Forwarded-For` header set by the trusted CDN.

### 13.4 Request Signing for Sensitive Endpoints

Highly sensitive endpoints (e.g., processing a withdrawal, changing a user's KYC level) require an additional request signature beyond standard JWT authentication. The request signature is an HMAC of the request body using a server-side secret, ensuring that the request body has not been tampered with between the frontend and the backend. This provides integrity protection beyond what TLS provides (TLS protects against network tampering but not against compromised frontend code).

### 13.5 API Key Rotation

External service API keys (Cloudinary, Resend, crypto payment processor, exchange rate API) must be rotatable without application downtime. Each service's API key is stored as an environment variable and can be updated through Coolify's environment management. When a key is rotated, the new value is deployed, and the application picks it up on the next request (no restart required if the application reads environment variables on each use, or a restart is triggered by Coolify after the environment variable update).

---

## 14. Audit Logging

### 14.1 Events Logged

The audit log captures a comprehensive record of all significant system events. The following event categories are logged without exception:

**Authentication Events:** Successful login, failed login attempt, account lockout, account unlock, password change, 2FA enable/disable, 2FA verification success/failure, session creation, session revocation, device-based login alert.

**Financial Events:** Deposit initiation, deposit confirmation, deposit rejection, withdrawal request, withdrawal approval, withdrawal rejection, withdrawal completion, investment creation, investment maturity/completion, referral commission credit, wallet balance adjustment (by admin).

**Admin Events:** User suspension, user banning, user unbanning, KYC document approval, KYC document rejection, deposit verification, withdrawal processing, system configuration changes, role changes, admin login.

**KYC Events:** Document submission, document approval, document rejection with reason, KYC level upgrade.

**Configuration Events:** Investment plan creation/modification/deactivation, fee percentage changes, system feature toggles.

### 14.2 Audit Log Properties

Every audit log entry captures: the acting user's ID (or system identifier for automated events), the action performed, the entity type and ID affected, the source IP address, the user-agent string, and a JSON metadata object containing the specific details of the event (old values, new values, request parameters). The `createdAt` timestamp is set by the database, not the application, to prevent clock skew issues.

### 14.3 Immutable Audit Trail

Audit logs are immutable from the application's perspective. No API endpoint or admin action can modify or delete an audit log entry. The only mechanism for audit log deletion is the scheduled cleanup job that purges entries older than the retention period (2 years). This job is a background task that hard-deletes expired entries. The audit log table has no `updatedAt` column and no soft-delete mechanism, reinforcing its append-only nature. Even database administrators with direct database access should not modify audit logs; this policy is enforced through database role permissions in production (the application's database user has INSERT and SELECT only on the audit logs table, no UPDATE or DELETE).

---

## 15. Fraud Detection

### 15.1 Suspicious Activity Rules

The platform implements automated suspicious activity detection based on the following rules. When a rule is triggered, an alert is created in the admin dashboard and an optional notification is sent to the security team:

**Multiple Accounts from Same IP:** If more than 3 user accounts are registered from the same IP address within a 24-hour period, an alert is triggered. This detects mass account creation for referral fraud.

**Rapid Deposit/Withdrawal Patterns:** If a user makes more than 5 deposits and withdrawals within a 1-hour period (especially if the amounts are similar, suggesting circular transactions), an alert is triggered.

**Unusual Referral Patterns:** If a single user refers more than 10 new users within 24 hours, or if referred users all deposit the minimum investment amount simultaneously, an alert is triggered for potential referral fraud.

**KYC Document Reuse:** If a KYC document image (identified by Cloudinary's perceptual hash or visual similarity) is uploaded by multiple users, an alert is triggered for potential identity fraud.

**Geographic Anomalies:** If a user's account activity suddenly originates from a significantly different geographic location (based on IP geolocation) than their registered country, a soft alert is generated for the user's next login suggesting they verify their identity.

**Gift Card Fraud Indicators:** If a user submits multiple gift card deposits that are subsequently rejected, or if gift card brands or values show patterns associated with fraudulent gift cards (e.g., many low-value cards from the same brand in rapid succession), an alert is triggered.

### 15.2 Manual Review Triggers

Certain actions automatically flag user accounts for manual review by an administrator: (1) any fraud detection rule trigger, (2) the first withdrawal from a new account, (3) any withdrawal exceeding $10,000, (4) KYC documents that fail automated validation checks, (5) gift card deposits from previously flagged card brands. Manual review does not block the user's account automatically, but it does add the account to a review queue that admins must clear before certain high-risk operations proceed.

### 15.3 Account Freezing

Administrators have the ability to freeze (temporarily suspend) any user account. A frozen account cannot perform any financial operations (deposits, withdrawals, investments) but can still log in and view their data. Freezing is used when suspicious activity is detected and needs investigation. Frozen accounts are reviewed within 24 hours, after which they are either unfrozen (if the activity is legitimate) or escalated to suspension or banning. All freeze/unfreeze actions are audit-logged.

---

## 16. Secret Management

### 16.1 Environment Variables

All secrets (database passwords, API keys, encryption keys, JWT secrets) are stored as environment variables and injected into containers at runtime. Secrets are never hardcoded in the source code, committed to version control, or included in Docker images. The `.env` file (used in local development) is listed in `.gitignore` and never committed. A `.env.example` file with placeholder values (no actual secrets) is committed to document the required environment variables.

### 16.2 Docker Secrets for Production

For production deployments on Coolify, secrets are managed through Coolify's secure environment variable management interface, which stores secrets encrypted at rest and injects them into containers at runtime. If deploying without Coolify, Docker secrets or a secrets management tool (HashiCorp Vault, AWS Secrets Manager) should be used. Environment variables set via `docker-compose.yml` or `Dockerfile` ENV instructions are acceptable for non-secret configuration but must never contain actual secret values.

### 16.3 No Secrets in Logs

Application logging is configured to never log sensitive data. The following categories of data are redacted from all log output: passwords (even in error messages), JWT tokens, API keys, encryption keys, cryptocurrency private keys or wallet addresses (partial masking only, e.g., `0x1234...abcd`), and KYC document contents. Log redaction is implemented through a logging utility that scans log messages for patterns matching sensitive data and replaces them with `[REDACTED]`.

### 16.4 Secret Rotation Policy

All secrets must be rotatable without application downtime. The rotation schedule is: JWT secrets — rotated every 90 days (existing sessions gracefully expire during the transition period); database passwords — rotated every 90 days (requires a brief restart); API keys for external services — rotated immediately upon suspected compromise or according to the service provider's recommendation; encryption keys — rotation requires a data re-encryption migration and is planned quarterly. Each secret rotation is documented with the date, the person who performed it, and the reason.

---

## 17. Incident Response

### 17.1 Security Event Classification

Security events are classified into four severity levels, each with a defined response procedure:

**Critical (Severity 1):** Active data breach, unauthorized access to production systems, cryptocurrency wallet compromise, or database exfiltration. Response: immediate isolation of affected systems, engagement of incident response team, notification of affected users within 72 hours (GDPR requirement), forensic data preservation.

**High (Severity 2):** Suspicious but unconfirmed access attempts, detected vulnerability exploitation, or mass account compromise indicators. Response: investigation within 1 hour, potential account freezing, enhanced monitoring.

**Medium (Severity 3):** Brute-force attack patterns, phishing reports from users, or minor configuration security gaps. Response: investigation within 4 hours, IP blocking if applicable, user notification if their account was targeted.

**Low (Severity 4):** Individual failed login attempts, individual rate limit violations, or minor policy violations. Response: logged for monitoring, no immediate action required. Patterns are reviewed weekly.

### 17.2 Notification Procedures

When a security incident is confirmed: (1) the on-call engineer is notified immediately via the configured alerting channel (email, Slack, PagerDuty); (2) the incident is classified and escalated according to the severity level; (3) for Severity 1 and 2 incidents, all active sessions may be invalidated, requiring all users to re-authenticate; (4) affected users are notified via email with specific details about what happened and what actions they should take; (5) a post-incident report is produced within 5 business days for Severity 1 and 2 incidents, documenting the timeline, root cause, impact, and remediation steps.

### 17.3 Forensic Data Preservation

When a security incident is detected, all relevant data must be preserved for forensic analysis. This includes: (1) immediate database snapshot (before any remediation actions that might alter data); (2) application and access logs exported and stored securely; (3) Redis data exported (for session and rate limit state analysis); (4) Cloudinary access logs and upload records requested. This data is preserved for a minimum of 1 year after the incident is resolved. Access to forensic data is restricted to the incident response team and legal counsel.