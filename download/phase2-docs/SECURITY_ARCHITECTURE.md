# TeslaPrimeCapital — Security Architecture Document

> **Version:** 1.0.0
> **Classification:** Internal — Confidential
> **Last Updated:** 2025-01-15
> **Author:** Security Engineering Team
> **Status:** Approved

---

## Table of Contents

1. [Threat Model (STRIDE Analysis)](#1-threat-model-stride-analysis)
2. [Encryption Architecture](#2-encryption-architecture)
3. [CORS Policy](#3-cors-policy)
4. [Content Security Policy](#4-content-security-policy)
5. [Security Headers](#5-security-headers)
6. [CSRF Protection](#6-csrf-protection)
7. [XSS Prevention](#7-xss-prevention)
8. [SQL Injection Prevention](#8-sql-injection-prevention)
9. [Rate Limiting Architecture](#9-rate-limiting-architecture)
10. [Session Security](#10-session-security)
11. [API Security](#11-api-security)
12. [File Upload Security](#12-file-upload-security)
13. [Audit Logging](#13-audit-logging)
14. [Infrastructure Security](#14-infrastructure-security)

---

## 1. Threat Model (STRIDE Analysis)

This section provides a comprehensive STRIDE threat analysis for the TeslaPrimeCapital managed investment platform. The analysis accounts for the platform's handling of cryptocurrency transactions, gift card payments, Know Your Customer (KYC) verification workflows, and multi-role access control across User, KYC Officer, Admin, and Super Admin roles. Each threat is evaluated for likelihood and impact within the context of a financial services application operating in a regulated environment.

### S — Spoofing

**Description:** An attacker impersonates a legitimate user, admin, or system component to gain unauthorized access to the platform. Spoofing attacks on TeslaPrimeCapital could target user accounts to initiate fraudulent withdrawals, impersonate KYC Officers to approve unverified identities, or masquerade as the API server to intercept client-side communications. Given the financial nature of the platform, account spoofing directly translates to monetary loss and regulatory violations.

**Attack Vectors:**
- Credential stuffing using breached email/password combinations from external data breaches targeting user login endpoints.
- Phishing campaigns that replicate the TeslaPrimeCapital login page to harvest credentials and 2FA TOTP codes.
- Forged JWT tokens generated through secret key leakage or algorithm confusion attacks.
- Email spoofing via伪造 Resend transactional emails directing users to attacker-controlled pages.
- Session token theft through XSS or network interception on misconfigured endpoints.

**Impact: Critical** — Successful spoofing enables full account takeover, unauthorized fund transfers, identity fraud through KYC manipulation, and exposure of sensitive financial data. Regulatory penalties under financial compliance frameworks are a direct consequence of spoofing incidents.

**Mitigations:**
- Multi-factor authentication (TOTP) enforced for all roles, with mandatory 2FA for Admin and Super Admin accounts.
- Argon2id password hashing with high memory cost (65536 KB) to resist brute-force and credential stuffing.
- JWT tokens signed with HS256 using a cryptographically strong 256-bit secret, rotated every 90 days.
- Email verification for all actions that change security settings or financial bindings.
- Device fingerprinting and IP binding on new sessions to detect anomalous access patterns.
- Rate limiting on authentication endpoints (5 attempts per minute per IP) to slow credential stuffing attacks.

### T — Tampering

**Description:** An attacker modifies data in transit or at rest without authorization. For TeslaPrimeCapital, tampering could involve altering withdrawal amounts, modifying KYC submission data, changing investment plan allocations, or manipulating gift card balance records. The integrity of financial records is a core platform requirement; any undetected tampering undermines user trust and regulatory compliance.

**Attack Vectors:**
- Man-in-the-middle (MITM) attacks intercepting and modifying API requests between the Next.js frontend and the Node.js REST API.
- Direct database manipulation through SQL injection or compromised database credentials.
- Client-side modification of request payloads using browser developer tools or proxy tools (Burp Suite, OWASP ZAP).
- Altering KYC document metadata or substituting uploaded identity documents.
- Modifying Redis cache values to bypass rate limits or session states.
- Manipulating webhook payloads from payment processors or crypto network confirmations.

**Impact: Critical** — Data tampering in a financial platform can result in unauthorized fund transfers, falsified KYC records enabling money laundering, corrupted investment calculations, and complete loss of data integrity. Undetected tampering may persist for extended periods, compounding financial and legal exposure.

**Mitigations:**
- TLS 1.3 enforced on all communications with certificate pinning where feasible.
- All API requests validated server-side using Zod schemas at route boundaries before processing.
- Prisma ORM parameterized queries exclusively — raw SQL forbidden without explicit security review.
- Column-level encryption for sensitive fields (KYC documents, wallet addresses) using pgcrypto.
- Idempotency keys on all financial operations to prevent duplicate or replayed transactions.
- Cryptographic hashing of critical financial records for integrity verification.
- Server-side re-validation of all client-submitted data regardless of frontend validation.

### R — Repudiation

**Description:** A user or system component denies performing an action that was actually carried out. In the TeslaPrimeCapital platform, repudiation threatens the ability to prove who initiated a withdrawal, who approved or rejected a KYC submission, who modified user roles, or who processed a gift card redemption. Financial platforms require non-repudiation to resolve disputes, comply with regulations, and maintain audit trails.

**Attack Vectors:**
- Users claiming they never initiated a withdrawal or investment after market movements go against them.
- KYC Officers denying they approved or rejected a verification submission.
- Admins denying they suspended a user account or modified system configuration.
- Attackers exploiting shared credentials to perform actions that the legitimate credential holder disavows.
- Session hijacking enabling actions performed under a stolen session that the victim disclaims.
- Log tampering or deletion to erase evidence of unauthorized actions.

**Impact: High** — Repudiation undermines dispute resolution, enables fraud, and violates regulatory requirements for financial record-keeping. Without robust non-repudiation, the platform cannot reliably arbitrate user disputes or defend against regulatory inquiries.

**Mitigations:**
- Comprehensive JSON audit logging for all security-relevant events with immutable log storage.
- Every audit entry includes timestamp, userId, action, entityId, IP address, and user agent.
- JWT-based authentication ensures every API request is cryptographically attributable to a specific user session.
- Idempotency keys on financial transactions provide cryptographic proof of intent.
- Admin actions require re-authentication for destructive operations.
- Audit logs stored in a separate write-once storage tier with retention policies aligned to regulatory requirements (minimum 7 years for financial records).

### I — Information Disclosure

**Description:** Sensitive information is exposed to unauthorized parties. TeslaPrimeCapital handles highly sensitive data including personal identity documents (passports, driver's licenses, utility bills), cryptocurrency wallet addresses, gift card details, investment portfolios, and financial transaction histories. Unauthorized disclosure of this data constitutes a severe breach of privacy regulations (GDPR, CCPA) and financial confidentiality requirements.

**Attack Vectors:**
- Broken access control allowing users to view other users' KYC documents, balances, or transaction history.
- API responses leaking internal system IDs, database schema details, or stack traces in error messages.
- Unencrypted database backups stored on insecure infrastructure.
- Log files containing sensitive data (passwords, tokens, wallet addresses) accessible to unauthorized personnel.
- Email communications containing sensitive financial data intercepted in transit.
- Cloudinary misconfiguration exposing private KYC document uploads to public access.
- GraphQL or REST API over-fetching returning fields beyond what the client requires.

**Impact: Critical** — Information disclosure of KYC documents and financial data exposes users to identity theft, financial fraud, and stalking. Regulatory penalties under GDPR can reach 4% of global annual turnover. Platform reputation damage is severe and potentially irreversible in the financial services sector.

**Mitigations:**
- Role-based access control (RBAC) with four distinct roles: User, KYC Officer, Admin, Super Admin.
- Column-level encryption for KYC documents and wallet details using AES-256 via pgcrypto.
- API response sanitization stripping internal IDs, stack traces, and unnecessary fields.
- Zod schemas enforce strict response shapes, preventing accidental data leakage.
- Cloudinary signed uploads with access tiers: public, private, and authenticated.
- Environment variables for all secrets — never committed to version control.
- Regular access control audits and penetration testing.

### D — Denial of Service

**Description:** An attacker renders the TeslaPrimeCapital platform unavailable to legitimate users by consuming system resources. For an investment platform, downtime during market volatility can result in significant user financial losses, eroded trust, and regulatory scrutiny. DoS attacks may target the web layer, API layer, database, or external service integrations.

**Attack Vectors:**
- Volumetric DDoS attacks flooding the Next.js frontend or Node.js API with HTTP requests.
- Application-layer attacks targeting expensive endpoints (KYC document upload, investment calculation, report generation).
- Slowloris-style attacks holding connections open to exhaust server connection pools.
- Resource exhaustion through malicious file uploads (large files, malformed images triggering expensive processing).
- Database exhaustion through queries that generate massive result sets or complex joins.
- Redis memory exhaustion through cache poisoning or key explosion attacks.
- Crypto payment callback spam overwhelming webhook processing pipelines.

**Impact: High** — Platform unavailability during active trading or investment periods directly harms users financially. Prolonged outages trigger regulatory concern, user attrition, and potential compensation claims. Secondary impact includes degraded performance of dependent services (payment processing, KYC verification).

**Mitigations:**
- Redis-based sliding window rate limiting on all API endpoints.
- Specific rate limits: login (5/min/IP), registration (5/hour/IP), general API (60/min/user), withdrawal (10/hour/user), OTP (3/5min/user).
- File upload size limits per type with magic byte validation.
- Database query optimization with Prisma ORM, index coverage analysis, and query plan review.
- Cloudflare or equivalent CDN/DDoS protection at the network edge.
- Horizontal scaling via Docker containers managed by Coolify.
- Circuit breakers on external service calls (Cloudinary, Resend, crypto networks).
- Connection pooling with sensible limits on PostgreSQL and Redis connections.

### E — Elevation of Privilege

**Description:** An attacker gains access to functionality or data beyond their authorized level. TeslaPrimeCapital's four-tier role hierarchy (User → KYC Officer → Admin → Super Admin) presents multiple elevation paths. A user elevating to Admin could approve their own KYC, modify investment plans, or access all user financial data. A KYC Officer elevating to Super Admin could compromise system configuration and user data at scale.

**Attack Vectors:**
- Exploiting IDOR (Insecure Direct Object Reference) vulnerabilities to access admin-only endpoints.
- Manipulating JWT token claims to escalate role assignments.
- Exploiting race conditions in role assignment workflows.
- Compromising a lower-privilege account (e.g., KYC Officer) and leveraging misconfigured authorization checks.
- SQL injection to modify role columns directly in the database.
- Exploiting mass-assignment vulnerabilities in user profile or settings update endpoints.
- Abusing password reset flows to take over higher-privilege accounts.

**Impact: Critical** — Privilege escalation to Admin or Super Admin level grants unrestricted access to all user data, financial records, KYC documents, and system configuration. An attacker with Super Admin access can create backdoor accounts, manipulate investment plans, approve fraudulent KYC submissions, and exfiltrate the entire user database. This represents the single most damaging attack scenario for the platform.

**Mitigations:**
- RBAC middleware enforced on every API route, checking the user's role against the required minimum role for that endpoint.
- JWT claims include role and permissions; server-side validation on every request, never trusting client-side role state.
- Least-privilege principle: each role has only the permissions required for its function.
- No mass-assignment — Zod schemas explicitly define allowed fields for every update operation.
- Admin and Super Admin actions require re-authentication and are logged with full audit trails.
- Separation of duties: KYC Officers cannot access financial operations; Admins cannot modify their own role.
- Regular authorization matrix audits and automated access control testing in CI/CD pipelines.

---

## 2. Encryption Architecture

The TeslaPrimeCapital encryption architecture provides defense in depth through layered encryption at rest and in transit, secure key management practices, and cryptographically appropriate algorithms for each data classification tier. The architecture is designed to protect user financial data, identity documents, cryptocurrency wallet details, and authentication credentials against both external attackers and insider threats.

### Encryption at Rest

Sensitive data stored in PostgreSQL is encrypted at the column level using the `pgcrypto` extension. Fields classified as highly sensitive — including KYC document URLs, government ID numbers, cryptocurrency wallet addresses, and gift card redemption codes — are encrypted using AES-256-CBC before storage. The encryption is applied at the application layer using Prisma middleware, ensuring that encryption and decryption are transparent to business logic while preventing plaintext exposure in the database. This approach ensures that even if database backups are compromised or an attacker gains read access to the PostgreSQL data directory, the sensitive fields remain cryptographically protected.

The encryption key for AES-256 is stored as an environment variable (`ENCRYPTION_MASTER_KEY`) and never committed to version control. Key rotation is performed on a quarterly basis with a documented rotation procedure that includes re-encrypting all affected data columns. The rotation process uses a dual-key approach where both the old and new keys are available during the transition period, allowing gradual re-encryption without service interruption.

For KYC documents stored on Cloudinary, the platform leverages Cloudinary's signed delivery mechanism. Uploaded documents are marked as private, and access requires a time-limited signed URL generated server-side. This ensures that KYC documents are never accessible via predictable or permanent URLs, even if the Cloudinary public ID is known. The signed URLs expire after a configurable duration (default: 30 minutes), limiting the window of exposure for any intercepted link.

### Encryption in Transit

All communications between the Next.js frontend, Node.js REST API, PostgreSQL, Redis, and external services (Cloudinary, Resend, cryptocurrency network nodes) are encrypted using TLS 1.3 with fallback to TLS 1.2. The TLS configuration enforces strong cipher suites, disables weak ciphers (RC4, DES, 3DES, MD5-based MACs), and prefers forward-secret cipher suites (ECDHE-based key exchange). Certificate validation is enforced on all outbound connections, and certificate pinning is implemented for critical internal service communications where feasible.

The Cloudflare or reverse proxy layer terminates TLS and re-encrypts connections to backend services over the internal Docker network. This double-encryption architecture ensures that traffic between the load balancer and application containers is also protected, preventing potential interception on the internal network segment. HSTS headers (detailed in Section 5) enforce HTTPS-only connections from compliant browsers, preventing SSL stripping attacks.

### Key Management

Cryptographic keys are managed through environment variables injected at container runtime via Coolify's secret management. The key management lifecycle follows these principles:

- **Generation:** Keys are generated using cryptographically secure random number generators (Node.js `crypto.randomBytes`).
- **Storage:** Keys exist only in environment variables and are never written to disk, logged, or included in error messages.
- **Distribution:** Keys are distributed through Coolify's encrypted secret store to running containers.
- **Rotation:** The JWT signing secret rotates every 90 days. The AES-256 encryption master key rotates quarterly. OTP secrets rotate with each new 2FA enrollment.
- **Revocation:** In the event of suspected key compromise, an emergency rotation procedure is triggered that invalidates all existing sessions and re-encrypts affected data.

### Password Hashing

User passwords are hashed using Argon2id with the following parameters, configured to provide strong resistance against GPU-based brute-force attacks while maintaining acceptable authentication latency:

- **Memory cost:** 64 MB (65536 KiB) — requires significant memory per hash attempt, making GPU/ASIC attacks expensive.
- **Iterations (time cost):** 3 — provides adequate computational work factor.
- **Parallelism:** 4 threads — limits parallel attack speed.
- **Salt length:** 16 bytes — generated uniquely per password using `crypto.randomBytes`.
- **Hash length:** 32 bytes — sufficient output size to prevent collision attacks.

Argon2id is selected over bcrypt and scrypt because it provides optimal resistance against both side-channel and GPU attacks. The memory-hard property ensures that attackers cannot trivially parallelize cracking attempts on commodity hardware.

### OTP Hashing

Time-based One-Time Password (TOTP) secrets generated during 2FA enrollment are hashed using SHA-256 before storage in Redis and PostgreSQL. The raw TOTP secret is displayed to the user only once during enrollment (via the QR code) and is never stored in plaintext. When a user submits a TOTP code during login, the server hashes the submitted code with the same SHA-256 salt and compares it against the stored hash. This prevents OTP secret exposure in the event of database or cache compromise.

### JWT Signing

JSON Web Tokens are signed using the HS256 (HMAC-SHA256) algorithm with a 256-bit secret. The JWT secret is distinct from the encryption master key and follows its own rotation schedule. Token payloads are kept minimal, containing only the user ID, role, and expiration timestamp. Sensitive data such as email addresses, wallet balances, or KYC status are never included in JWT payloads to prevent information exposure through token decoding. Token expiration is set to 15 minutes for access tokens and 7 days for refresh tokens, with rotation enforced on every refresh.

---

## 3. CORS Policy

The Cross-Origin Resource Sharing (CORS) policy for TeslaPrimeCapital is configured with a strict allowlist approach that explicitly defines which origins are permitted to interact with the Node.js REST API. This policy is critical because the platform's frontend and API may be deployed on different domains or subdomains, and an overly permissive CORS configuration would expose the API to cross-origin attacks including CSRF and data exfiltration from malicious third-party websites.

### Allowed Origins

The CORS configuration maintains an explicit allowlist of permitted origins. In production, this allowlist contains exactly one entry: the canonical TeslaPrimeCapital frontend domain (e.g., `https://app.teslaprimecapital.com`). In development and staging environments, additional entries for `localhost` and staging subdomains are included but are strictly scoped to non-production deployments. The allowlist is maintained as an environment variable (`CORS_ALLOWED_ORIGINS`) containing a comma-separated list of origins.

### Configuration Rules

The CORS middleware on the Node.js REST API enforces the following rules:

- **Allowed Origins:** Only origins explicitly listed in `CORS_ALLOWED_ORIGINS`. The server validates the incoming `Origin` header against this list and reflects the matching origin in the `Access-Control-Allow-Origin` response header. Wildcard values (`*`) are never used, including in non-production environments.
- **Allow Credentials:** Set to `true` to enable the transmission of cookies (specifically the refresh token cookie) in cross-origin requests. This is essential for the authentication flow but requires that the allowed origin is never set to `*`, as browsers reject `credentials: true` with wildcard origins.
- **Null Origin Rejection:** Requests with an `Origin` header set to `null` (common in cross-origin iframe requests and certain browser extensions) are explicitly rejected. The `null` origin is a common attack vector for CORS bypasses.
- **Allowed Methods:** Only the HTTP methods required by the application are permitted: `GET`, `POST`, `PUT`, `PATCH`, and `DELETE`. Methods like `OPTIONS` are handled automatically by the CORS preflight mechanism. Uncommon methods such as `TRACE`, `CONNECT`, and `PURGE` are blocked.
- **Allowed Headers:** The `Authorization` header (for Bearer token authentication) and `Content-Type` header (for JSON request bodies) are the only permitted request headers. This limits the attack surface for header-based attacks.
- **Exposed Headers:** Only the `X-Request-Id` custom header is exposed to the frontend. This header enables client-side request tracing and error reporting without exposing internal system details.
- **Preflight Cache:** `Access-Control-Max-Age` is set to 3600 seconds (1 hour). This reduces the frequency of preflight `OPTIONS` requests from the browser, improving performance while maintaining security through the strict origin validation on every preflight response.

### Implementation Notes

The CORS middleware is applied as the first middleware in the Express/Koa middleware stack on the Node.js API, before authentication and route handlers. This ensures that all requests — including those to non-existent or error-producing endpoints — are subject to CORS validation. Failed CORS checks result in a response with no CORS headers, causing the browser to block the response from reaching the client-side JavaScript. The server does not return error details for CORS failures to avoid information leakage about the CORS configuration or internal routing.

---

## 4. Content Security Policy

The Content Security Policy (CSP) for the TeslaPrimeCapital Next.js application is implemented as a strict HTTP response header that controls which resources the browser is permitted to load. The CSP is a critical defense against Cross-Site Scripting (XSS), clickjacking, and data injection attacks. Given the financial nature of the platform, the CSP is configured with a default-deny posture, explicitly allowing only the minimum set of resources required for the application to function correctly.

### Directive Configuration

The CSP header is constructed as follows:

- **`default-src 'none'`** — The default policy denies all resource types unless explicitly overridden by a more specific directive. This ensures that any resource type not explicitly permitted by the policy is blocked, providing a strong baseline security posture.

- **`script-src 'self' 'nonce-{RANDOM}'`** — Scripts may only be loaded from the same origin (`self`) or include an inline script with a valid cryptographic nonce. The nonce is generated server-side on every request by Next.js middleware and embedded in the HTML template. This prevents execution of injected scripts (XSS) because an attacker cannot predict the nonce value. External script sources (CDN scripts, analytics) are not permitted under any circumstances.

- **`style-src 'self' 'unsafe-inline'`** — Styles may be loaded from the same origin or applied inline. The `'unsafe-inline'` directive is required because Tailwind CSS generates utility classes at build time that are injected as inline styles, and the Tailwind runtime may apply styles dynamically. This is a documented and accepted trade-off; the XSS protection provided by the script-src nonce directive mitigates the risk of style injection escalating to script execution.

- **`img-src 'self' data: https://res.cloudinary.com`** — Images may be loaded from the same origin, as base64 data URIs (required for some UI elements), and from the Cloudinary CDN domain. The Cloudinary domain is explicitly allowlisted because all user-uploaded KYC documents and platform assets are served through Cloudinary. No other image sources are permitted.

- **`connect-src 'self' https://api.teslaprimecapital.com https://res.cloudinary.com https://api.resend.com`** — The browser may initiate connections (fetch, XMLHttpRequest, WebSocket) only to the platform's own API domain, the Cloudinary API (for direct uploads), and the Resend API (if any client-side email-triggering is required, though this is unlikely). This prevents data exfiltration to attacker-controlled endpoints.

- **`frame-ancestors 'none'`** — The application cannot be embedded in any iframe on any domain, including the same origin. This provides comprehensive clickjacking protection. It is a stricter alternative to `X-Frame-Options: DENY` and is respected by modern browsers.

- **`form-action 'self'`** — Form submissions are only permitted to the same origin. This prevents attackers from creating forms on external sites that submit data to the TeslaPrimeCapital application, which is a vector for CSRF and data injection attacks.

- **`base-uri 'self'`** — The `<base>` HTML element can only use the same origin. This prevents attackers from using a base tag injection to redirect relative URLs to an attacker-controlled domain, which would be particularly dangerous for script and style loading.

### CSP Reporting

In addition to the enforcing CSP header, a `Content-Security-Policy-Report-Only` header may be deployed in staging environments to monitor policy violations without blocking resources. Violation reports are sent to a dedicated reporting endpoint (`/api/csp-report`) that logs the violation details for analysis. This enables the team to identify legitimate resource loads that need to be added to the policy before they cause user-facing breakage in production.

---

## 5. Security Headers

TeslaPrimeCapital implements a comprehensive set of HTTP security headers on both the Next.js frontend and the Node.js REST API. These headers provide defense-in-depth protections against a range of client-side and transport-layer attacks. Headers are applied uniformly across all responses, including error pages and static assets, through Next.js middleware and API middleware layers.

### Header Definitions

**Strict-Transport-Security (HSTS)**
```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```
This header instructs browsers to only connect to TeslaPrimeCapital over HTTPS for one year (31,536,000 seconds). The `includeSubDomains` directive extends this requirement to all subdomains (e.g., `api.teslaprimecapital.com`, `admin.teslaprimecapital.com`). The `preload` directive signals intent to be included in browser HSTS preload lists, which hardcodes HTTPS-only behavior into the browser. Once preloaded, the domain cannot be removed from the list easily, so this is a deliberate long-term commitment. HSTS prevents SSL stripping attacks where an attacker downgrades a connection from HTTPS to HTTP to intercept traffic.

**X-Content-Type-Options**
```
X-Content-Type-Options: nosniff
```
This header prevents browsers from MIME-type sniffing, which is an attack where the browser attempts to guess the content type of a response independent of the declared `Content-Type` header. Without this protection, an attacker could upload a malicious file (e.g., an HTML file disguised as an image) and the browser might execute it as HTML/JavaScript. The `nosniff` directive forces the browser to respect the server-declared content type.

**X-Frame-Options**
```
X-Frame-Options: DENY
```
This header prevents the TeslaPrimeCapital application from being rendered in an iframe on any domain. Combined with the CSP `frame-ancestors 'none'` directive, this provides comprehensive clickjacking protection across both legacy and modern browsers. The `DENY` value is used instead of `SAMEORIGIN` because there is no legitimate use case for framing the application, even within the same origin.

**X-XSS-Protection**
```
X-XSS-Protection: 1; mode=block
```
This header activates the browser's built-in XSS filter. While modern browsers with CSP have largely superseded this header's functionality, it remains valuable for protecting users on older browsers (e.g., Internet Explorer, older Edge versions) that do not fully support CSP. The `mode=block` directive instructs the browser to completely block the page if an XSS attempt is detected, rather than sanitizing the output. Note that this header is deprecated in modern Chrome but is retained for backward compatibility.

**Referrer-Policy**
```
Referrer-Policy: strict-origin-when-cross-origin
```
This header controls how much referrer information is included in requests when navigating away from TeslaPrimeCapital. The `strict-origin-when-cross-origin` policy sends the full URL as the referrer for same-origin requests, but only the origin (scheme, host, port) for cross-origin requests. This prevents sensitive path and query parameter information (such as user IDs, token fragments, or investment plan details) from being leaked to third-party sites via the `Referer` header.

**Permissions-Policy**
```
Permissions-Policy: camera=(), microphone=(), geolocation=()
```
This header explicitly disables access to the camera, microphone, and geolocation APIs for the TeslaPrimeCapital application. Since the platform does not require these device capabilities for any feature (KYC document uploads use file selection, not camera capture), disabling them reduces the attack surface for social engineering attacks where a malicious script could attempt to activate device sensors. Additional permissions (payment, USB, Bluetooth, etc.) are denied by default through browser default behavior and are not explicitly granted.

### Header Application

All security headers are applied at the middleware layer. On the Next.js frontend, a `middleware.ts` file adds these headers to every response. On the Node.js REST API, a dedicated security headers middleware is registered before route handlers. Headers are applied before caching to ensure cached responses also include security headers. Header values are verified in automated integration tests to prevent regressions.

---

## 6. CSRF Protection

Cross-Site Request Forgery (CSRF) protection for TeslaPrimeCapital is implemented through a multi-layered defense strategy that combines cookie attributes, token-based validation, and origin verification. CSRF attacks are particularly dangerous for the TeslaPrimeCapital platform because they could be used to initiate unauthorized withdrawals, modify investment allocations, change wallet addresses, or alter KYC submission data — all of which are state-changing operations with financial consequences.

### SameSite Cookie Attributes

The refresh token cookie is configured with `SameSite=Strict`, `HttpOnly`, and `Secure` attributes. The `SameSite=Strict` directive ensures that the browser only sends the refresh token cookie in first-party context (i.e., when the user is directly on the TeslaPrimeCapital domain). Requests originating from third-party sites — including those initiated by forms, fetch requests, or link navigations — will not include the cookie. This eliminates the most common CSRF attack vector where a malicious site silently submits a form to the target application using the victim's cookies.

The `Strict` mode is chosen over `Lax` because the TeslaPrimeCapital platform does not use top-level navigations from external sites to perform state-changing operations. All mutations occur via JavaScript `fetch` or `XMLHttpRequest` calls from within the Single Page Application, which are always same-origin.

### Double-Submit Cookie Pattern

For API endpoints that accept JSON request bodies (where cookies alone may not be sufficient for CSRF protection), the platform implements the double-submit cookie pattern. When a user authenticates, the server sets a non-HttpOnly CSRF cookie (`csrf-token`) containing a cryptographically random token. The Next.js frontend reads this cookie via JavaScript and includes the same token value in a custom `X-CSRF-Token` header on every state-changing request (POST, PUT, PATCH, DELETE). The server-side middleware validates that the `X-CSRF-Token` header value matches the `csrf-token` cookie value. Since a malicious third-party site cannot read or set cookies for the TeslaPrimeCapital domain (due to SameSite restrictions and cross-origin policies), it cannot include the correct token in the custom header, causing the request to be rejected.

### Origin Header Validation

As an additional defense layer, the server validates the `Origin` header on all state-changing requests. The middleware checks that the `Origin` header matches one of the allowed origins in the CORS configuration. If the `Origin` header is missing or does not match, the request is rejected with a 403 Forbidden response. This provides protection even in edge cases where cookie-based protections might be bypassed (e.g., through subdomain takeover or browser-specific quirks). The `Origin` header cannot be set by cross-origin JavaScript, making it a reliable signal for same-origin verification.

### Custom X-CSRF-Token Header

The `X-CSRF-Token` header is the primary CSRF defense mechanism for API mutations. The token is generated using `crypto.randomBytes(32)` converted to a hexadecimal string, providing 256 bits of entropy. The token is regenerated on each authentication event (login, token refresh) to limit the window of exploitation. The server-side validation is performed early in the middleware stack, before authentication and authorization, to ensure that unauthenticated CSRF attempts are also blocked. Failed CSRF validation results in a 403 response with a request ID for logging correlation.

---

## 7. XSS Prevention

Cross-Site Scripting (XSS) prevention for TeslaPrimeCapital leverages the inherent protections of React, reinforced by Content Security Policy, input sanitization, and strict coding standards. XSS attacks are particularly dangerous for a financial platform because they could be used to steal session tokens, intercept cryptocurrency wallet credentials, modify transaction parameters, or redirect users to phishing pages. The prevention strategy operates at multiple layers to ensure that no single defense failure results in an exploitable vulnerability.

### React Auto-Escaping

The Next.js frontend is built with React, which provides built-in XSS protection through automatic HTML escaping. When rendering user-provided data in JSX expressions (`{userData}`), React encodes special characters (`<`, `>`, `"`, `'`, `&`) into their HTML entity equivalents, preventing injected markup from being interpreted as HTML by the browser. This is the primary and most effective XSS defense in the frontend stack. All user-generated content — including usernames, investment plan descriptions, KYC notes, and transaction memos — is rendered exclusively through JSX expressions, never through raw HTML manipulation.

### CSP Nonce-Based Scripts

As detailed in Section 4, the Content Security Policy enforces nonce-based script execution. Only scripts containing the correct cryptographic nonce (generated per-request) are executed by the browser. This means that even if an attacker manages to inject a `<script>` tag into the DOM — through a DOM-based XSS vector, a template injection, or a compromised third-party dependency — the script will not execute because it lacks the valid nonce. This provides a robust safety net against XSS vulnerabilities that might bypass React's auto-escaping.

### Prohibition of dangerouslySetInnerHTML

The use of React's `dangerouslySetInnerHTML` prop is prohibited in the TeslaPrimeCapital codebase. Static analysis rules (ESLint) enforce this prohibition, and code review checklists include explicit verification that no new instances are introduced. If a legitimate use case arises in the future (e.g., rendering rich text from a trusted admin source), the use of `dangerouslySetInnerHTML` would require a mandatory security review and must be paired with DOMPurify sanitization.

### Output Encoding and DOMPurify

User-generated content that must be displayed in contexts where React's auto-escaping is insufficient (e.g., in tooltip text, notification bodies, or dynamically generated document titles) is passed through DOMPurify before rendering. DOMPurify is a security-focused HTML sanitizer that strips dangerous elements (`<script>`, `<iframe>`, `<object>`, `<embed>`), event handler attributes (`onclick`, `onerror`), and `javascript:` URIs while preserving safe HTML markup. DOMPurify is configured with a strict allowlist of permitted tags and attributes. It is the only approved HTML sanitization library for the platform.

### URL and Data Handling

URLs provided by users (e.g., profile links, refund addresses) are validated against an allowlist of permitted schemes (`https:` only). `javascript:` URIs, `data:` URIs (except for allowed image contexts), and `vbscript:` URIs are rejected at the input validation layer using Zod schemas. This prevents script injection through URL-based XSS vectors. Additionally, all JSON responses from the API are serialized with proper content type headers (`application/json`), preventing the browser from interpreting response content as HTML in edge-case scenarios.

---

## 8. SQL Injection Prevention

SQL injection prevention for TeslaPrimeCapital is achieved through the exclusive use of Prisma ORM with parameterized queries, supplemented by strict input validation and a prohibition on raw SQL execution. SQL injection is a critical threat for a financial platform because a successful injection could expose the entire user database, modify financial records, bypass authentication, or destroy data. The defense strategy ensures that user input is never interpolated into SQL statements as raw text.

### Prisma ORM Parameterized Queries

The TeslaPrimeCapital backend uses Prisma ORM exclusively for all database interactions. Prisma generates parameterized queries by default, ensuring that user input is always passed as bound parameters to PostgreSQL. This means that even if user input contains SQL metacharacters (e.g., `' OR 1=1 --`), these characters are treated as literal string values by the database engine and cannot alter the structure or logic of the query. All database operations — including queries, inserts, updates, deletes, and aggregations — are performed through Prisma's type-safe query builder.

### Raw SQL Prohibition

The use of Prisma's `$queryRaw` and `$executeRaw` methods is prohibited in the TeslaPrimeCapital codebase without explicit security approval. When raw SQL is absolutely necessary (e.g., for complex reporting queries that cannot be expressed through Prisma's query builder), the following requirements must be met:

1. The raw SQL must use Prisma's tagged template literal syntax (`Prisma.$queryRaw\`...\``), which automatically parameterizes interpolated variables.
2. The SQL query must be reviewed by at least one team member in a dedicated security-focused code review.
3. The query must include a comment explaining why Prisma's query builder cannot be used.
4. The query must be covered by automated tests that include SQL injection payloads in input parameters.

The string-based `$queryRawUnsafe` and `$executeRawUnsafe` methods are completely banned and cannot be used under any circumstances. ESLint rules enforce this prohibition at the code level.

### Input Validation with Zod

All user input is validated using Zod schemas at the API route boundary before any database query is constructed. Zod schemas enforce type constraints, string length limits, format validation (email, UUID, cryptocurrency address), and enum values. This defense-in-depth approach means that even if a Prisma query were somehow constructed with unvalidated input, the Zod layer would have already rejected malformed or malicious input. Zod validation occurs in dedicated validation middleware that runs before authentication, authorization, and business logic handlers.

### Database Schema Protections

The PostgreSQL database is configured with the minimum necessary privileges for the application user. The application database user has SELECT, INSERT, UPDATE, and DELETE permissions on its own schema but does not have access to system tables, the ability to create or drop tables, or permissions to execute administrative functions. This limits the impact of a potential SQL injection to the application's own data and prevents privilege escalation within the database layer. Row-level security (RLS) policies are considered for future implementation to provide additional per-user data isolation.

---

## 9. Rate Limiting Architecture

The TeslaPrimeCapital rate limiting architecture uses Redis-based sliding window counters to protect against brute-force attacks, credential stuffing, automated scraping, and denial-of-service conditions. Rate limiting is applied at the API gateway level before authentication and business logic processing, ensuring that excessive requests are rejected early in the request lifecycle to minimize resource consumption.

### Sliding Window Algorithm

The rate limiter implements a sliding window counter using Redis sorted sets. For each rate-limited operation, the current timestamp is added to a Redis sorted set keyed by the identifier (IP address, user ID, or combination). On each request, the sorted set is pruned of entries outside the current window, and the remaining count is checked against the limit. This provides smooth rate limiting without the burst-amplification problem of fixed window counters and with better performance than the full sliding window log approach. The sliding window approach is preferred because it provides consistent rate enforcement that attackers cannot exploit by timing requests at window boundaries.

### Rate Limit Definitions

The following rate limits are enforced across the TeslaPrimeCapital platform:

- **Authentication Endpoints (login):** 5 requests per minute per IP address. This limit is intentionally strict to slow credential stuffing and brute-force password attacks. Failed login attempts contribute to the rate limit regardless of whether the credentials are valid, preventing attackers from distinguishing between valid and invalid usernames.

- **Registration Endpoint:** 5 requests per hour per IP address. Registration is rate-limited per IP to prevent mass account creation for spam, fraud, or Sybil attacks. The hourly window reflects the infrequent nature of registration compared to authentication.

- **General API Endpoints:** 60 requests per minute per authenticated user. This limit provides generous headroom for normal application usage (page loads, API calls for dashboard data, etc.) while preventing automated scraping or API abuse. Unauthenticated requests are limited per IP address at a lower threshold (30 requests per minute).

- **Withdrawal Endpoint:** 10 requests per hour per authenticated user. Withdrawals are rate-limited more aggressively than general API calls because they directly impact funds. The hourly window balances user flexibility with fraud prevention.

- **OTP Generation Endpoint:** 3 requests per 5-minute window per user identifier (email or phone). This is the strictest rate limit on the platform, designed to prevent OTP bombing attacks where an attacker floods a victim's email or phone with verification codes to cause annoyance or enable SIM swapping attacks.

### Rate Limit Headers

All API responses include the following rate limit headers to provide transparency to the frontend and enable graceful degradation:

- **`X-RateLimit-Limit`:** The maximum number of requests allowed in the current window.
- **`X-RateLimit-Remaining`:** The number of requests remaining in the current window.
- **`X-RateLimit-Reset`:** A Unix timestamp indicating when the current rate limit window resets.

When a client exceeds the rate limit, the API responds with a `429 Too Many Requests` status code and includes a `Retry-After` header indicating the number of seconds until the client can make another request. The response body includes a structured error message with the request ID for support correlation.

### Implementation Details

Rate limiting is implemented as Express middleware and registered on specific route groups. The middleware uses a shared Redis connection pool to avoid connection exhaustion. Rate limit counters are stored with TTLs matching the window duration to ensure automatic cleanup. The frontend reads rate limit headers and implements client-side throttling (disabling buttons, showing countdown timers) to provide immediate user feedback before the server rejects the request.

---

## 10. Session Security

Session security for TeslaPrimeCapital is designed around the principle of minimizing the exposure window for stolen credentials and providing robust session management across the platform's four user roles. The session architecture uses a dual-token pattern (access token + refresh token) with distinct storage mechanisms and security properties for each token type.

### Token Storage Architecture

**Access Tokens** are stored exclusively in JavaScript memory (a React context variable or state) on the client side. They are never written to `localStorage`, `sessionStorage`, or cookies accessible to JavaScript. This ensures that access tokens are not accessible to XSS attacks that might read browser storage. The access token is attached to API requests via the `Authorization: Bearer <token>` header. When the user closes the browser tab or navigates away, the in-memory token is destroyed.

**Refresh Tokens** are stored in an `HttpOnly`, `Secure`, `SameSite=Strict` cookie set by the server. The `HttpOnly` flag prevents JavaScript access, making refresh tokens immune to XSS-based token theft. The `Secure` flag ensures the cookie is only transmitted over HTTPS. The `SameSite=Strict` flag prevents the cookie from being sent in cross-origin requests, providing CSRF protection. The refresh token has a 7-day expiration and is used exclusively to obtain new access tokens via the `/api/auth/refresh` endpoint.

### Session Binding

When a user logs in, the server creates a session record that binds the authentication session to the user's device fingerprint and IP address. The device fingerprint is computed from browser characteristics (User-Agent, screen resolution, timezone, language, canvas fingerprint) and is stored alongside the session. On subsequent requests, the server compares the current fingerprint and IP against the stored values. Significant deviations (e.g., different country, different browser family) trigger a re-authentication requirement or an email notification to the user, depending on the severity of the deviation.

### Token Rotation

Refresh tokens are rotated on every use. When the `/api/auth/refresh` endpoint is called, the server issues a new refresh token and invalidates the old one. This ensures that a stolen refresh token can only be used once — the legitimate user's next refresh attempt will fail (because the stolen token was already used), alerting them to potential compromise. The server maintains a token family chain to detect token reuse attacks; if a previously invalidated token is presented, all tokens in that family are revoked, and the user is forced to re-authenticate.

### Force Logout and Session Revocation

When a user changes their password, all existing sessions for that user are immediately revoked. This is implemented by invalidating all refresh tokens associated with the user's account in Redis. The user must re-authenticate on all devices after a password change. Additionally, Admin and Super Admin users have the ability to revoke all sessions for any user account through the admin panel, which is critical for responding to compromised accounts or security incidents. Individual sessions can also be viewed and selectively revoked from the user's security settings page, displaying the device, location, and last active time for each active session.

---

## 11. API Security

API security for the TeslaPrimeCapital Node.js REST API is implemented through a layered approach encompassing input validation, response sanitization, authentication, authorization, request tracing, and idempotency guarantees. The API is the primary interface between the frontend and backend systems, making it the most critical attack surface to secure.

### Input Validation at Route Boundary

All incoming API requests are validated using Zod schemas at the route boundary, before any business logic or database interaction occurs. Each API route defines a Zod schema for its expected request body, query parameters, and path parameters. The validation middleware parses the request, validates it against the schema, and rejects invalid requests with a 400 Bad Request response that includes detailed field-level error messages. This approach prevents malformed, malicious, or unexpected data from entering the application's processing pipeline. Validation rules include type checking, string length constraints, enum value restrictions, format validation (email, UUID, cryptocurrency addresses), and custom business rule validators.

### Response Sanitization

API responses are sanitized before being sent to the client. Internal implementation details — including database auto-generated IDs (e.g., Prisma `cuid` fields), internal status codes, stack traces, and error messages that reveal system internals — are stripped from responses. Error responses use a standardized format that includes a user-friendly message, a machine-readable error code, and a request ID for support correlation. Sensitive fields (KYC document URLs, full wallet addresses in list views) are redacted based on the requesting user's role and the data classification of the field.

### Request ID Tracing

Every API request is assigned a unique request ID (UUID v4) generated at the API gateway or middleware layer. This request ID is propagated through the entire request lifecycle — including to downstream services (database queries, external API calls, background jobs) — and is included in all log entries, error responses, and audit records. This enables end-to-end request tracing for debugging, security incident investigation, and performance monitoring. The request ID is exposed to the client via the `X-Request-Id` response header.

### Authentication and Authorization

All API endpoints require authentication unless explicitly marked as public (login, registration, password reset, health check). Authentication is performed by validating the JWT access token in the `Authorization` header. Authorization is enforced via RBAC middleware that checks the user's role against the minimum required role for the endpoint. The authorization check occurs after authentication but before business logic, ensuring that unauthorized requests are rejected before any sensitive operations are performed.

### Idempotency Keys for Financial Operations

All financial operations (deposits, withdrawals, investments, gift card redemptions) require an `Idempotency-Key` header. The server stores the response for each idempotency key in Redis for a configurable duration (24 hours default). If a request is repeated with the same idempotency key, the server returns the stored response without re-executing the operation. This prevents duplicate transactions caused by network retries, browser double-clicks, or client-side race conditions. The idempotency key is combined with the user ID to prevent cross-user replay attacks.

---

## 12. File Upload Security

File upload security for TeslaPrimeCapital addresses the risks associated with user-uploaded content, particularly KYC identity documents (passports, driver's licenses, utility bills, selfies) and any user-provided images. The file upload architecture is built on Cloudinary's signed upload mechanism, with multiple validation layers to prevent malicious file uploads, data exfiltration, and resource abuse.

### Signed Cloudinary Uploads

All file uploads to Cloudinary use the signed upload API. The upload signature is generated server-side using the Cloudinary API secret, ensuring that only the TeslaPrimeCapital backend can authorize uploads. The frontend initiates uploads by requesting a signed upload parameters payload from the Node.js API, which returns a time-limited signature, timestamp, and upload preset. This prevents attackers from uploading arbitrary files to the TeslaPrimeCapital Cloudinary account by manipulating the frontend upload request.

### File Type Validation via Magic Bytes

File type validation is performed using magic byte (file signature) analysis rather than relying solely on the file extension or MIME type declared by the client. The server reads the first few bytes of the uploaded file and validates them against a known set of magic bytes for permitted file types:

- **JPEG:** `FF D8 FF`
- **PNG:** `89 50 4E 47`
- **PDF:** `25 50 44 46` (for document uploads)
- **WebP:** `52 49 46 46 ... 57 45 42 50`

Files that do not match any permitted magic byte pattern are rejected, regardless of the file extension. This prevents attackers from bypassing extension-based validation by renaming executable files or scripts with image extensions.

### File Size Limits

File size limits are enforced per file type to prevent resource exhaustion:

- **KYC document images (JPEG, PNG, WebP):** Maximum 10 MB per file.
- **KYC PDF documents:** Maximum 20 MB per file.
- **Profile images:** Maximum 5 MB per file.

These limits are enforced at the Cloudinary upload preset level and validated again server-side before processing the upload response. Total upload volume per user is also limited through the rate limiting architecture.

### Malware Scanning

Cloudinary's built-in malware scanning add-on is enabled for all uploads. This service scans uploaded files for known malware signatures and potentially unwanted applications (PUAs) before making the file available for delivery. If malware is detected, the upload is rejected and the file is quarantined. As a secondary defense, files can be routed through a ClamAV container running on the internal Docker network for additional scanning before the upload is finalized, particularly for PDF documents that may contain embedded exploits.

### Filename and URL Security

User-controlled filenames are never used in storage or delivery URLs. All uploaded files are assigned a UUID-based public ID (e.g., `a1b2c3d4e5f6g7h8`) in Cloudinary. The original filename is stored only as metadata and is never exposed in URLs. This prevents directory traversal, filename injection, and predictable URL attacks. Delivery URLs are generated server-side using Cloudinary's signed URL mechanism, which includes a time-limited signature and configurable expiration.

### Access Tiers

Uploaded files are organized into three access tiers:

- **Public:** Profile images and platform assets that can be accessed without authentication.
- **Private:** KYC documents that require a signed, time-limited URL for access. The signed URL is generated server-side only after verifying the requesting user's authorization to view the document.
- **Authenticated:** Files that require the user to be logged in but do not need per-document authorization. Access is controlled through Cloudinary's authenticated delivery mode with a backend-generated authentication token.

---

## 13. Audit Logging

The TeslaPrimeCapital audit logging system provides a comprehensive, tamper-evident record of all security-relevant events across the platform. Audit logs serve multiple purposes: forensic investigation of security incidents, regulatory compliance demonstration, dispute resolution, and operational monitoring. The logging system is designed to capture sufficient detail for investigation while avoiding the capture of sensitive secrets or personally identifiable information beyond what is necessary for the audit context.

### Event Categories

**Authentication Events:**
- Successful and failed login attempts (including email/username used, IP address, device fingerprint).
- Logout events (user-initiated and session expiry).
- Two-factor authentication events: enrollment, disable, verification success/failure.
- Password change events (old password hash verification, new password set).
- Password reset request and completion events.
- Session creation, refresh, and revocation events.
- Account lockout events (threshold exceeded).

**Financial Events:**
- Deposit initiation and confirmation (amount, currency/crypto type, transaction hash).
- Withdrawal request, approval, and execution (amount, destination, status changes).
- Investment plan purchase, modification, and maturity events.
- Gift card submission and redemption events (masked card details, value, status).
- Balance adjustments by admin (reason, previous and new balance).
- Failed transaction attempts with reason codes.

**Administrative Events:**
- KYC document submission, review, approval, and rejection (reviewer ID, reason for rejection).
- User role changes (changed by, previous role, new role, reason).
- User account suspension and reactivation (admin ID, reason).
- System configuration changes (parameter, previous value, new value, changed by).
- Access to user data by admin or KYC Officer (which user's data was accessed, which fields).
- Bulk operations (affected users count, operation type, initiator).

**Data Access Events:**
- KYC document viewing (which document, accessed by, timestamp).
- User profile viewing by privileged roles.
- Financial report generation and export.
- Database backup initiation (automated and manual).

### Log Format

All audit log entries are structured as JSON objects with the following fields:

```json
{
  "timestamp": "2025-01-15T10:30:00.000Z",
  "level": "INFO",
  "requestId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "userId": "user_cuid_here",
  "userRole": "USER",
  "action": "WITHDRAWAL_REQUEST",
  "entity": "WITHDRAWAL",
  "entityId": "withdrawal_cuid_here",
  "ip": "203.0.113.42",
  "userAgent": "Mozilla/5.0...",
  "metadata": {
    "amount": 1500.00,
    "currency": "USDT",
    "destinationWallet": "0x1234...abcd"
  }
}
```

The `timestamp` field uses ISO 8601 format with millisecond precision and UTC timezone. The `level` field uses standard syslog levels (DEBUG, INFO, WARN, ERROR, FATAL). The `requestId` enables correlation with application logs and API responses. The `metadata` field contains event-specific contextual data.

### Secrets Exclusion

Audit logs must never contain the following sensitive data:

- Passwords (plaintext or hashed).
- JWT tokens or refresh tokens.
- OTP codes (past or present).
- Full cryptocurrency wallet private keys.
- Full gift card numbers or PINs.
- Cloudinary API secrets or signed upload signatures.
- Database connection strings or credentials.
- Encryption master keys.

When logging events that involve these data types, the log entry uses masked or redacted representations (e.g., `"wallet": "0x1234...abcd"`, `"card": "****-****-****-1234"`). This ensures that even if audit logs are exposed, they cannot be used to compromise user accounts or system security.

### Log Storage and Retention

Audit logs are written to a dedicated logging service with the following properties:

- **Write-once storage:** Logs are appended but never modified or deleted during the retention period.
- **Retention:** Security event logs are retained for a minimum of 7 years, aligned with financial regulatory requirements.
- **Access control:** Audit log access is restricted to Super Admin and designated security personnel. Access to audit logs is itself audited.
- **Integrity:** Log entries are cryptographically chained (hash of previous entry included in next entry) to detect tampering.
- **Backup:** Audit logs are backed up to a separate storage location with encryption at rest.

---

## 14. Infrastructure Security

The TeslaPrimeCapital infrastructure security architecture protects the platform's hosting environment, container orchestration, network topology, and deployment pipeline. The infrastructure is deployed using Docker containers managed by Coolify, with a defense-in-depth approach that assumes any single security control may fail.

### Network Firewall

The host-level firewall is configured with a default-deny inbound policy. Only the following inbound ports are permitted:

- **Port 80 (TCP):** HTTP traffic, redirected to port 443 by the reverse proxy (Nginx/Caddy).
- **Port 443 (TCP):** HTTPS traffic, terminated by the reverse proxy and forwarded to the Docker container network.

All other inbound ports are blocked, including SSH (port 22) from external networks. Database ports (PostgreSQL 5432, Redis 6379) are not exposed outside the Docker network. Outbound traffic is restricted to only the destinations required for platform operation: Cloudinary CDN, Resend API, cryptocurrency network RPC nodes, and system package repositories for updates.

### Internal Docker Network

PostgreSQL and Redis run as Docker containers on an internal Docker network that is not accessible from outside the host. The application containers (Next.js, Node.js API) communicate with PostgreSQL and Redis over this internal network using Docker DNS resolution. No port mapping exposes the database or cache ports to the host or external network. This isolation ensures that even if an attacker gains access to the host, they cannot directly connect to the database without first compromising a container on the internal network or exploiting a Docker daemon vulnerability.

### SSH Access Control

SSH access to the host server is restricted as follows:

- **Key-based authentication only:** Password authentication is disabled in the SSH daemon configuration (`PasswordAuthentication no`). SSH keys must use Ed25519 or RSA (minimum 4096 bits).
- **Non-standard port (optional):** The SSH daemon may be configured to listen on a non-standard port to reduce noise from automated SSH brute-force scanners.
- **Root login disabled:** Direct root login via SSH is prohibited. Administrators must SSH as a non-root user and escalate privileges via `sudo` as needed.
- **Fail2Ban:** SSH authentication failures trigger temporary IP bans through Fail2Ban, reducing the risk of brute-force attacks on SSH credentials.

### Coolify Security

The Coolify instance managing TeslaPrimeCapital deployments is hardened with the following measures:

- **Two-factor authentication enabled** for all Coolify admin accounts.
- **Coolify instance not publicly discoverable** — accessed through a dedicated subdomain or VPN.
- **Automatic updates enabled** for Coolify and its dependencies to patch known vulnerabilities promptly.
- **Service isolation:** Coolify runs as a separate Docker container with limited access to the application's database and secrets.

### Secret Scanning and CI Security

The CI/CD pipeline includes automated secret scanning using Gitleaks. Every pull request and commit is scanned for accidentally committed secrets including:

- API keys and tokens (AWS, Cloudinary, Resend, database passwords).
- Private keys (SSH, TLS certificates).
- JWT secrets and encryption keys.
- Connection strings and database credentials.

If Gitleaks detects a secret, the pipeline fails and the commit is blocked. For already-committed secrets, a Git history rewriting procedure is documented and executed immediately, followed by secret rotation. Environment variables containing secrets are managed exclusively through Coolify's encrypted secret store and are injected into containers at runtime. They are never stored in Docker Compose files, `.env` files committed to Git, or container images.

### Container Security

Docker containers are configured with the following security hardening:

- **Non-root user:** All application containers run as a non-root user (`node` or a dedicated `appuser` with UID 1000). The `USER` directive is set in the Dockerfile after the build stage.
- **Read-only root filesystem:** Where feasible, the container root filesystem is mounted as read-only (`--read-only` flag with tmpfs mounts for `/tmp` and `/var/log`). This prevents attackers who gain code execution from writing persistent files or modifying binaries.
- **Minimal base images:** Production containers use Alpine Linux or distroless base images to minimize the attack surface from unnecessary packages.
- **No unnecessary packages:** The Docker build only installs runtime dependencies. Build tools, debug utilities, and package managers are excluded from the production image.
- **Image scanning:** Docker images are scanned for known vulnerabilities (CVEs) using Trivy or equivalent tools as part of the CI pipeline before deployment.
- **Resource limits:** Container memory and CPU limits are defined in the Docker Compose configuration to prevent resource exhaustion attacks affecting the host or other containers.

---

## Appendix A: Security Testing Cadence

| Test Type | Frequency | Scope |
|-----------|-----------|-------|
| Automated vulnerability scanning (Trivy) | Every build | Container images, dependencies |
| Secret scanning (Gitleaks) | Every commit | Full repository |
| Static application security testing (SAST) | Every PR | Source code |
| Dependency audit (npm audit) | Weekly | All npm packages |
| DAST / Penetration testing | Quarterly | Full application surface |
| Authorization matrix review | Quarterly | All RBAC rules |
| Incident response drill | Semi-annually | Security team |
| Infrastructure security audit | Annually | Host, network, Coolify |

## Appendix B: Incident Response Contacts

| Role | Responsibility | Escalation Path |
|------|---------------|-----------------|
| Security Lead | Initial triage, investigation coordination | CTO |
| Engineering Lead | Technical remediation, deployment of fixes | VP Engineering |
| Legal/Compliance | Regulatory notification, user communication | General Counsel |
| Communications | Public relations, user notification | CEO |

## Appendix C: Document Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-01-15 | Security Engineering Team | Initial release — complete security architecture documentation |

---

*This document is classified as Internal — Confidential. Distribution outside the TeslaPrimeCapital engineering and security teams requires written approval from the CTO.*