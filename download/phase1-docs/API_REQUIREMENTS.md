# API Requirements

> Phase 1 — Enterprise Investment Platform  
> RESTful API design principles, authentication, response formats, endpoint groups, and versioning strategy.

---

## 1. API Design Principles

The platform's API follows RESTful design principles with consistent conventions across all endpoints. Resources are modeled as nouns (users, investments, deposits, withdrawals, wallets, tickets, notifications) and HTTP methods convey the action: GET for retrieval, POST for creation, PUT for full updates, PATCH for partial updates, and DELETE for removal. Resource names are plural in URL paths (e.g., `/investments`, not `/investment`).

All request and response bodies use JSON format with `Content-Type: application/json`. File uploads use `multipart/form-data` where required. The API does not support XML or other content types. Date/time values use ISO 8601 format in UTC (e.g., `2025-01-15T14:30:00.000Z`). Monetary values are represented as decimal strings in USD (e.g., `"amount": "1500.00"`) to avoid floating-point precision issues.

The API is versioned using URL-based versioning: all endpoints are prefixed with `/api/v1/`. This approach is explicit, cacheable, and easy to understand. When a new API version is released, the new version is deployed alongside the existing version, and clients are migrated over a deprecation period. URL-based versioning also simplifies routing and documentation organization.

The API is stateless between requests — each request must contain all information needed to process it. The only stateful mechanism is the refresh token, which is stored as an HTTP-only cookie and used to obtain new access tokens without requiring the user to re-authenticate. Session state is not maintained on the server.

Responses include HATEOAS-lite pagination links for list endpoints. Each paginated response includes `meta.prev` and `meta.next` URLs (when applicable) that clients can use to navigate pages without constructing URLs manually. This reduces client-side logic and ensures URL consistency as the API evolves.

---

## 2. Base URL Structure

All API endpoints follow the pattern `/api/v1/{resource}`. The resource name is always a plural noun. Resource identifiers use UUIDs (not auto-incrementing integers) for security and to prevent enumeration.

```
/api/v1/{resource}              — List (GET), Create (POST)
/api/v1/{resource}/{id}         — Read (GET), Update (PUT/PATCH), Delete (DELETE)
/api/v1/{resource}/{id}/{sub}   — Nested resource access
```

Nested routes express relationships between resources. For example, `/api/v1/users/{id}/investments` returns the investments belonging to a specific user. Nested routes are limited to one level of depth to maintain URL readability. For deeper relationships, query parameters are used instead (e.g., `/api/v1/investments?userId={id}&status=active`).

Resource identifiers in URLs use the `id` parameter name consistently. UUIDs are validated server-side before processing — invalid UUIDs return a 400 error with a descriptive message. IDs are always accepted as path parameters for single-resource operations and as query parameters for filtering on list endpoints.

---

## 3. Authentication

Authenticated endpoints require a Bearer token (JWT) in the `Authorization` header: `Authorization: Bearer <access_token>`. The access token is a short-lived JWT (15-minute expiry) containing the user's ID, role, and token version. The token is signed with the server's JWT secret using the HS256 algorithm. The token payload is minimized to reduce token size and avoid storing sensitive information in the token.

Refresh tokens are used to obtain new access tokens without requiring full re-authentication. The refresh token is a longer-lived opaque token (7-day expiry) stored as an HTTP-only, Secure, SameSite=Strict cookie. When the access token expires, the client sends a request to `/api/v1/auth/refresh`, and the server validates the refresh token cookie, issues a new access token, and rotates the refresh token (the old refresh token is invalidated). This rotation prevents refresh token replay attacks.

Public endpoints that do not require authentication include: user registration, login, password reset request, password reset execution, OTP verification, plan information (public list of investment plans), and the health check endpoint. All other endpoints require a valid access token.

Two-factor authentication (2FA) adds an additional step to the login flow. After the user provides valid credentials, the API responds with a `2FA_REQUIRED` status instead of issuing tokens. The client then submits the TOTP code via `/api/v1/auth/verify-2fa`, which validates the code and issues the access and refresh tokens. 2FA setup and management endpoints are protected by the existing access token (the user must already be authenticated to enable or disable 2FA).

Token versioning is implemented to support forced logout. Each user has a `tokenVersion` field in the database. When a user resets their password or an admin forcibly logs them out, the `tokenVersion` is incremented. All issued access and refresh tokens include the `tokenVersion` at issuance time, and tokens with a stale version are rejected. This invalidates all existing sessions without maintaining a token blacklist.

---

## 4. Response Format

All API responses use a standardized JSON envelope that provides consistency across endpoints and simplifies client-side error handling.

**Success response:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully"
}
```

**List response with pagination:**
```json
{
  "success": true,
  "data": [ ... ],
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

**Error response:**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

The `success` boolean provides a quick, reliable check for the client. The `data` field contains the response payload — an object for single-resource responses, an array for list responses, or `null` for operations that do not return data (e.g., deletion). The `message` field provides a human-readable summary, used primarily for error messages but included in success responses for consistency.

The `meta` field is present only on paginated list responses. It includes the current page number, page size (limit), total item count, total page count, and navigation links. Navigation links (`prev` and `next`) are fully qualified URLs that the client can use directly.

The `errors` field is present only on validation error responses (HTTP 400/422). It is an array of field-level error objects, each containing the field name and a descriptive error message. This structure enables the client to display error messages next to the appropriate form fields.

---

## 5. Error Responses

All error responses follow the standardized format and use appropriate HTTP status codes. The error response always includes `success: false`, a `message` summarizing the error, and an `errors` array for validation errors. Error messages are descriptive but do not expose internal system details, stack traces, or database schema information.

**HTTP Status Codes:**

- **400 Bad Request** — The request is malformed, missing required fields, or contains invalid values. Includes field-level errors in the `errors` array. Example: submitting a deposit amount below the plan minimum.
- **401 Unauthorized** — The request lacks a valid authentication token, the token has expired, or the token has been invalidated. The client should attempt to refresh the token or redirect to login.
- **403 Forbidden** — The authenticated user does not have permission to perform the requested action. Example: a regular user attempting to access admin endpoints, or a user attempting to access another user's data.
- **404 Not Found** — The requested resource does not exist. Example: querying an investment with an invalid ID, or accessing an endpoint that does not exist.
- **409 Conflict** — The request conflicts with the current state of the resource. Example: attempting to create an account with an email that is already registered, or submitting a duplicate referral code.
- **422 Unprocessable Entity** — The request is syntactically correct but semantically invalid. Example: a withdrawal request where the amount exceeds the available balance after fees.
- **429 Too Many Requests** — The client has exceeded the rate limit for the endpoint. The response includes `Retry-After` header and rate limit headers (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`).
- **500 Internal Server Error** — An unexpected error occurred on the server. The response includes a generic error message. Details are logged server-side for debugging. The client should display a generic error message and offer a retry.
- **503 Service Unavailable** — The service is temporarily unavailable (e.g., during maintenance or when a dependency like the database is unreachable). The response includes a `Retry-After` header indicating when the client should retry.

All errors are logged server-side with the request ID, timestamp, endpoint, HTTP method, status code, error details, and request metadata (without sensitive data like passwords or tokens). Error monitoring is integrated with the alerting system to notify the team of increasing error rates.

---

## 6. Validation

Every endpoint validates all incoming request data on the server side, regardless of any client-side validation. Client-side validation improves user experience by providing immediate feedback, but server-side validation is the authoritative enforcement point. Validation uses Zod schemas that define the expected shape, types, constraints, and custom validation rules for each request.

Validation error messages are descriptive and field-specific. When a validation failure occurs, the response includes an array of error objects, each identifying the field and explaining the constraint that was violated. For example: `"The deposit amount must be between $200 and $4,999 for the Basic plan"` rather than `"Invalid amount"`. Error messages are internationalization-ready, using message keys that can be translated to the user's preferred language.

Email validation checks format, length, and domain. Password validation enforces minimum length (8 characters), complexity requirements (uppercase, lowercase, number, special character), and checks against common breached password lists. Amount validation checks that the value is a positive number within the plan's allowed range. UUID validation ensures that ID parameters are valid UUIDs before database queries are executed.

Business rule validation is performed after schema validation. This includes checking that a user has sufficient balance for a withdrawal, that a plan is currently active and accepting investments, that a KYC submission has not already been approved, and that a referral code belongs to an active user. Business rule violations return 422 status codes with descriptive messages explaining the business constraint that was violated.

---

## 7. Pagination

Two pagination strategies are used depending on the data characteristics:

**Cursor-based pagination** is used for large, frequently appended datasets where offset-based pagination becomes inefficient. This applies to transaction history, notification lists, and audit log entries. The cursor is an opaque string (typically a base64-encoded timestamp + ID) that points to the last item in the current page. The client passes `?cursor={cursor}&limit=20` to fetch the next page. Cursor-based pagination provides consistent results even when new items are inserted between page requests.

**Offset-based pagination** is used for smaller, relatively stable datasets where page numbers are meaningful to users. This applies to investment plan lists, admin user lists, and support ticket lists. The client passes `?page=1&limit=20` to fetch a specific page. Offset-based pagination allows direct page access (e.g., jumping to page 5) but may produce inconsistent results if data is inserted or deleted between requests.

Default page size is 20 items. Maximum page size is 100 items. Requests exceeding the maximum are silently capped to 100 with a warning header (`X-Page-Size-Capped: true`). Total count is included in the `meta` object for offset-based pagination. For cursor-based pagination, total count may be omitted for performance reasons if the dataset is very large, and `hasMore` is provided instead.

---

## 8. Rate Limiting

All API endpoints are rate-limited to prevent abuse, ensure fair resource allocation, and protect against brute-force attacks. Rate limiting is implemented using Redis as the counting backend, with sliding window algorithms for smooth limit enforcement.

Rate limit information is communicated to clients through HTTP response headers on every request:
- **`X-RateLimit-Limit`** — The maximum number of requests allowed in the current window.
- **`X-RateLimit-Remaining`** — The number of requests remaining in the current window.
- **`X-RateLimit-Reset`** — The Unix timestamp when the rate limit window resets.

When a client exceeds the rate limit, the API responds with HTTP 429 Too Many Requests and includes a `Retry-After` header indicating how many seconds the client must wait before making another request.

Rate limits vary by endpoint category and are defined in the SECURITY_REQUIREMENTS.md document. General categories include: strict limits on authentication endpoints (login, password reset, 2FA verification) to prevent brute-force attacks, moderate limits on write endpoints (deposits, withdrawals, investments) to prevent accidental duplicate operations, and generous limits on read endpoints (dashboard, transaction history, plan information) to support normal user activity. Admin endpoints have separate rate limits that are higher than user endpoints.

Rate limiting is applied per-user (authenticated requests) or per-IP address (unauthenticated requests). For authenticated requests, the rate limit key includes the user ID, ensuring that one user's activity does not affect another user's limits, even if they share an IP address (e.g., users behind a corporate NAT).

---

## 9. Endpoint Groups

The following endpoint groups define the API surface area for Phase 1. Each group is listed with its base path and a description of its purpose. Detailed endpoint specifications (request/response schemas, validation rules, business logic) are defined in Phase 2.

### Auth Group (`/api/v1/auth`)
Handles user authentication, registration, and session management. Endpoints include user registration, email/password login, logout, token refresh, email verification, password reset request and execution, and 2FA setup and verification. All endpoints in this group are public (unauthenticated) except 2FA setup, which requires an active session.

### Users Group (`/api/v1/users`)
Manages the authenticated user's profile and account settings. Endpoints include retrieving the current user's profile, updating profile information, managing security settings (password change, 2FA management), and updating preferences (language, notification settings). Users can only access their own data through this group — accessing other users' data is restricted to admin endpoints.

### Wallets Group (`/api/v1/wallets`)
Manages the user's wallet, including balance retrieval and transaction history. The wallet reflects the user's available balance across all currencies. Transaction history supports filtering by type (deposit, withdrawal, commission), date range, and pagination. This group is read-only from the user's perspective — wallet balance changes are initiated through deposits, withdrawals, and system operations.

### Deposits Group (`/api/v1/deposits`)
Handles deposit creation and management. Endpoints include listing user deposits, requesting a crypto deposit address (generates a unique address for the deposit), submitting a gift card deposit (with screenshot upload), and checking deposit status. Deposits move through a status workflow: pending, confirming (for crypto), verified, completed, or failed.

### Investments Group (`/api/v1/investments`)
Manages the user's investment lifecycle. Endpoints include listing available investment plans, viewing active investments (currently earning returns), viewing investment history (completed/matured investments), creating a new investment (purchasing a plan), and viewing investment details. Investment creation validates that the user has sufficient wallet balance and that the plan is active.

### Withdrawals Group (`/api/v1/withdrawals`)
Handles withdrawal requests and management. Endpoints include creating a withdrawal request, listing withdrawal history, viewing withdrawal details, and estimating the withdrawal fee (21% of the withdrawal amount) before submission. Withdrawals are subject to balance validation, daily limits, and an approval workflow for large amounts.

### Referrals Group (`/api/v1/referrals`)
Manages the referral program. Endpoints include retrieving the user's referral link, viewing referral statistics (total referrals, active referrals, total commissions), viewing the referral tree (binary structure), and viewing commission history. Referral commissions are calculated automatically by the system when referred users make deposits or investments.

### Notifications Group (`/api/v1/notifications`)
Manages user notifications. Endpoints include listing notifications (paginated, ordered by most recent), marking a single notification as read, marking all notifications as read, and retrieving unread notification count. Notifications are generated by the system for events such as deposit confirmation, investment maturity, withdrawal processing, and referral commissions.

### KYC Group (`/api/v1/kyc`)
Handles KYC (Know Your Customer) verification. Endpoints include submitting KYC documents (ID front, ID back, selfie, proof of address), checking KYC verification status, and listing submitted documents. KYC submission requires authenticated uploads to Cloudinary, and documents are reviewed by admin personnel. Users cannot withdraw funds until KYC is approved.

### Support Group (`/api/v1/tickets`)
Manages user support tickets. Endpoints include creating a support ticket (with category and initial message), listing the user's tickets, viewing ticket details with message thread, and adding messages to an existing ticket. Tickets follow a status workflow: open, in_progress, resolved, closed.

### Admin Group (`/api/v1/admin`)
Provides administrative functionality restricted to users with admin or super-admin roles. Subgroups include user management (listing, searching, viewing, disabling users), KYC review (listing pending submissions, approving, rejecting with reason), deposit management (listing, verifying, rejecting), withdrawal management (listing, approving, rejecting), plan management (CRUD operations on investment plans), financial reports, audit log viewing, and platform settings management. All admin endpoints require both authentication and admin role authorization.

---

## 10. File Upload Endpoints

File uploads use `multipart/form-data` encoding. The upload process follows a two-step pattern: the client requests a signed upload URL from the backend, then uploads the file directly to Cloudinary using that signed URL. This approach offloads the actual file transfer from the application server to Cloudinary, reducing server load and enabling Cloudinary's built-in processing capabilities.

The signed upload URL generation endpoint accepts the file category (avatar, kyc_document, gift_card), the related entity ID, and optionally the document type (for KYC). The backend validates the user's permissions, generates a Cloudinary signed upload URL with the appropriate upload preset, folder path, and metadata, and returns the URL along with the upload parameters.

File upload size limits are enforced at both the application level (before generating the signed URL) and the Cloudinary level (via upload preset). Avatar uploads are limited to 5MB, KYC documents to 10MB, and gift card screenshots to 8MB. Files exceeding the limit are rejected with a 413 Payload Too Large response and a descriptive error message.

File type validation checks both the file extension and the file's magic bytes (actual content type). Accepted types vary by category: avatars accept JPEG, PNG, and WebP; KYC documents accept JPEG, PNG, WebP, and PDF; gift card screenshots accept JPEG and PNG. Files with mismatched extensions and content types are rejected.

After a successful upload, the client sends the Cloudinary public ID back to the backend (via the relevant entity creation endpoint, e.g., `/api/v1/kyc/submit` includes the document Cloudinary IDs). The backend verifies that the upload exists in Cloudinary, stores the reference in the database, and proceeds with the business logic.

---

## 11. API Versioning

The API uses URL-based versioning with the `/api/v1/` prefix. This is the only version for Phase 1. When breaking changes are required, a new version (`/api/v2/`) is introduced and deployed alongside the existing version.

A minimum deprecation period of 6 months is enforced between announcing an API version deprecation and shutting it down. During the deprecation period, deprecated endpoints continue to function but include a `Deprecation: true` header and a `Sunset: <date>` header indicating the shutdown date. A `Link` header points to the replacement endpoint or documentation.

Clients can optionally specify their preferred API version using the `Accept-Version` header. If the header is not present, the URL-based version is used. If both conflict, the URL-based version takes precedence. This dual mechanism supports both URL-based routing and header-based negotiation.

Backward-compatible changes (adding new fields to responses, adding new optional request fields, adding new endpoints) do not require a version increment. These changes are deployed to the existing version and documented in the changelog. Clients are encouraged to ignore unknown fields in responses to maintain forward compatibility.

---

## 12. Webhook Support (Future)

Webhook support is planned for Phase 2 and is documented here to ensure the API design does not preclude its implementation. Webhooks will allow administrators to configure event-driven notifications to external systems (e.g., notifying a CRM when a user completes KYC, alerting a compliance system when a large withdrawal is requested).

Webhook configuration will be managed through admin endpoints: creating webhook subscriptions (specifying the event types and the target URL), listing active webhooks, updating webhook configuration, and deleting webhooks. Each webhook subscription includes a secret key used to sign webhook payloads, allowing the receiving system to verify the payload's authenticity.

Webhook payloads will be JSON documents delivered via HTTP POST to the configured target URL. Each payload includes the event type, event timestamp, the relevant entity data, and an `X-Webhook-Signature` header containing the HMAC-SHA256 signature of the payload body. The receiving system verifies the signature before processing the payload.

Delivery guarantees include automatic retry with exponential backoff (up to 5 retries over 24 hours) for failed deliveries. A delivery log will track each webhook delivery attempt, response status, and response body. Administrators can view delivery logs and manually retry failed deliveries through the admin panel. Webhooks that consistently fail (e.g., target URL is unreachable) will be automatically disabled after a configurable failure threshold.