# TeslaPrimeCapital — Phase 2: Error Handling Architecture

> **Version:** 2.0.0
> **Status:** Final Specification
> **Last Updated:** 2025-01-15
> **Audience:** Backend Engineers, Frontend Engineers, DevOps, SRE

---

## Table of Contents

1. [Error Handling Philosophy](#1-error-handling-philosophy)
2. [Error Classification System](#2-error-classification-system)
3. [Error Response Format](#3-error-response-format)
4. [API Error Code Reference](#4-api-error-code-reference)
5. [Validation Error Handling](#5-validation-error-handling)
6. [Error Handling Middleware](#6-error-handling-middleware)
7. [Financial Error Handling](#7-financial-error-handling)
8. [Retry Strategy](#8-retry-strategy)
9. [Logging Specification](#9-logging-specification)
10. [Client-Side Error Handling](#10-client-side-error-handling)
11. [Error Recovery Procedures](#11-error-recovery-procedures)
12. [Alerting Rules](#12-alerting-rules)

---

## 1. Error Handling Philosophy

TeslaPrimeCapital operates as a managed investment platform handling real financial value. Error handling is not a secondary concern — it is a core architectural pillar. Every error must be anticipated, classified, communicated clearly, and resolved safely. The following principles govern all error handling decisions across the entire stack.

### 1.1 Core Principles

**Fail Loudly During Development**
All errors in development and staging environments must surface immediately with full stack traces, detailed context, and actionable debugging information. Development error responses include the entire error chain, the file and line number of the throw site, and a suggestion for resolution. Strict TypeScript configuration (`"strict": true`, `"noUncheckedIndexedAccess": true`, `"strictNullChecks": true`) ensures compile-time error catching. All custom domain errors enforce required metadata fields at construction time so errors are never thrown without context.

**Degrade Gracefully in Production**
When a non-critical dependency fails (e.g., email service, image upload), the primary financial operations must continue unaffected. The platform must never enter a cascading failure state. Each external dependency has a defined degradation path: if Resend email fails, the notification is queued in a dead letter queue for retry; if Cloudinary fails, file uploads return an error but the user can retry; if a read-only analytics query fails, the dashboard renders with cached data. Only failures in the critical path (database writes, authentication, balance mutations) should block the user flow.

**Never Expose Internal Details to Clients**
Production error responses must never include stack traces, database error codes, internal file paths, query strings, environment variable names, or third-party service error bodies. Every error shown to the client uses a pre-authored human-readable message stored in the error class itself. Internal details are routed exclusively to logging and monitoring systems. This is non-negotiable for a financial platform — leaking internal structure information is both a security risk and a compliance violation.

**Always Log Errors with Full Context**
Every error, regardless of severity, is logged with a structured JSON payload that includes: the request ID (for distributed tracing), the authenticated user ID (if present), the action being attempted, the full error message and stack trace, relevant metadata (e.g., which plan ID was being queried, which wallet was being debited), and the environment. Errors that occur inside database transactions include the transaction ID. Errors that occur inside BullMQ jobs include the job ID and attempt count.

**Classify Errors by Severity and Type**
Every error belongs to exactly one of four severity tiers (debug, warn, error, fatal) and exactly one classification category (client, server, domain, infrastructure). This dual taxonomy drives logging verbosity, alerting rules, and monitoring dashboards. A `ValidationError` is a client-side concern logged at `warn` level; a `DatabaseError` during a financial transaction is a fatal-level event that triggers immediate alerting.

**Ensure Financial Operations Are Never Left in an Inconsistent State**
This is the paramount principle. Any operation that mutates financial state (deposits, withdrawals, investments, plan purchases, referral bonus credits) must execute within a Prisma interactive transaction. If any step within the transaction fails — validation, balance check, record creation, notification dispatch — the entire transaction is rolled back. No partial writes. No orphaned records. Compensation operations exist for the narrow case where an external service call succeeds but the local transaction cannot commit (see Section 7).

### 1.2 Error Handling as a Feature

Error handling is treated as a first-class feature of the API. Every endpoint's contract explicitly documents which error codes it can return. Client SDKs and the frontend are built to handle every documented error code. Error responses carry enough information for the client to render an appropriate recovery UI without additional API calls. This eliminates the anti-pattern of "something went wrong" dead-end screens.

### 1.3 Guiding Constraints

- All error classes extend a base `AppError` class that enforces `code`, `statusCode`, `message`, and `isOperational` fields.
- Operational errors (expected, handled) are distinguished from programmer errors (bugs, unhandled). Only programmer errors trigger Sentry capture and page-level error UI.
- Errors are never silently swallowed. If a catch block handles an error, it must either re-throw a new typed error or log the original error explicitly.
- The error handling middleware stack is the last middleware registered on the Express/Fastify app, ensuring all routes benefit from uniform error formatting.

---

## 2. Error Classification System

### 2.1 Taxonomy Overview

The TeslaPrimeCapital error taxonomy is organized into four primary categories, each mapped to specific HTTP status code ranges and internal handling behaviors.

### 2.2 Client Errors (4xx)

These errors indicate that the client sent a request that cannot be processed as-is. They are the client's responsibility to correct. All client errors are logged at `warn` level.

| Error Class | HTTP Status | Code Constant | When It Occurs | User-Facing Message | Logged |
|---|---|---|---|---|---|
| `ValidationError` | 400 | `VALIDATION_ERROR` | Request body, query params, or path params fail Zod schema validation | "The provided data is invalid. Please check the highlighted fields and try again." | Yes (warn) |
| `AuthenticationError` | 401 | `AUTH_UNAUTHORIZED` | Missing, expired, or malformed JWT; invalid API key | "Your session has expired. Please sign in to continue." | Yes (warn) |
| `ForbiddenError` | 403 | `AUTH_FORBIDDEN` | Authenticated user lacks RBAC permission for the requested action | "You do not have permission to perform this action." | Yes (warn) |
| `NotFoundError` | 404 | `NOT_FOUND` | Requested resource does not exist (user, plan, transaction, withdrawal) | "The requested resource could not be found." | Yes (warn) |
| `ConflictError` | 409 | `CONFLICT` | Resource already exists (duplicate email, duplicate phone, duplicate investment) | "This resource already exists. Please check your input." | Yes (warn) |
| `RateLimitError` | 429 | `RATE_LIMIT_EXCEEDED` | Request exceeds per-IP or per-user rate limit | "Too many requests. Please wait a moment before trying again." | Yes (warn) |
| `PaymentRequiredError` | 402 | `PAYMENT_REQUIRED` | User must complete a payment or have sufficient balance before proceeding | "Payment is required to complete this action." | Yes (warn) |

### 2.3 Server Errors (5xx)

These errors indicate a failure on the server side. They are never the client's fault. All server errors are logged at `error` or `fatal` level and trigger monitoring alerts when thresholds are exceeded.

| Error Class | HTTP Status | Code Constant | When It Occurs | User-Facing Message | Logged |
|---|---|---|---|---|---|
| `InternalError` | 500 | `INTERNAL_ERROR` | Unhandled exception, unexpected null reference, programmer error | "An unexpected error occurred. Our team has been notified. Please try again." | Yes (error) |
| `DatabaseError` | 503 | `DATABASE_ERROR` | Prisma query failure, connection timeout, migration mismatch, constraint violation that is not mapped to a domain error | "A database error occurred. Please try again in a few moments." | Yes (error) |
| `ExternalServiceError` | 502 | `EXTERNAL_SERVICE_ERROR` | Third-party API call failure (Resend, Cloudinary, crypto payment gateway) | "An external service is temporarily unavailable. Please try again." | Yes (error) |
| `QueueError` | 503 | `QUEUE_ERROR` | BullMQ connection failure, job enqueue failure, Redis unavailability | "A background processing error occurred. Your request has been queued for retry." | Yes (error) |

### 2.4 Domain Errors

Domain errors represent business rule violations. They carry domain-specific context and are mapped to appropriate HTTP status codes. They are logged at `warn` level because they are expected business outcomes, not system failures.

| Error Class | HTTP Status | Code Constant | When It Occurs | User-Facing Message | Logged |
|---|---|---|---|---|---|
| `InsufficientBalanceError` | 422 | `WALLET_INSUFFICIENT_BALANCE` | User attempts a withdrawal or investment purchase exceeding available wallet balance | "Insufficient balance. Your current balance is $X.XX." | Yes (warn) |
| `InvalidPlanError` | 422 | `INVESTMENT_INVALID_PLAN` | User references a plan ID that is inactive, archived, or does not exist | "The selected investment plan is not currently available." | Yes (warn) |
| `InvestmentNotMaturedError` | 422 | `INVESTMENT_NOT_MATURED` | User attempts to withdraw returns or principal from an active (non-matured) investment | "This investment has not yet matured. Maturity date: YYYY-MM-DD." | Yes (warn) |
| `KYCRequiredError` | 403 | `KYC_REQUIRED` | User attempts an action that requires KYC verification (deposit above threshold, withdrawal) but KYC is not approved | "KYC verification is required before you can perform this action. Please complete your identity verification." | Yes (warn) |
| `DuplicateReferralError` | 409 | `REFERRAL_DUPLICATE` | User attempts to use a referral code after already having used one, or refers themselves | "You have already used a referral code, or this code belongs to you." | Yes (warn) |
| `GiftCardInvalidError` | 422 | `PAYMENT_GIFT_CARD_INVALID` | Gift card code is expired, already redeemed, or does not exist in the system | "The gift card code is invalid, expired, or has already been redeemed." | Yes (warn) |
| `WithdrawalLimitError` | 422 | `WITHDRAWAL_LIMIT_EXCEEDED` | Withdrawal amount exceeds daily, weekly, or per-transaction limits for the user's KYC tier | "Withdrawal amount exceeds your limit of $X.XX per day." | Yes (warn) |
| `AccountSuspendedError` | 403 | `USER_ACCOUNT_SUSPENDED` | User account has been suspended by an admin, pending review or compliance action | "Your account has been suspended. Please contact support for assistance." | Yes (warn) |
| `AccountLockedError` | 423 | `USER_ACCOUNT_LOCKED` | User account is temporarily locked due to too many failed login attempts | "Your account is temporarily locked due to too many failed login attempts. Please try again in X minutes." | Yes (warn) |
| `InvalidOTPError` | 422 | `AUTH_INVALID_OTP` | The OTP provided for email or phone verification does not match the stored value | "The verification code you entered is incorrect. Please try again." | Yes (warn) |
| `OTPExpiredError` | 422 | `AUTH_OTP_EXPIRED` | The OTP has exceeded its validity period (typically 10 minutes) | "This verification code has expired. Please request a new one." | Yes (warn) |
| `Invalid2FACodeError` | 422 | `AUTH_INVALID_2FA` | The TOTP code provided for two-factor authentication does not match | "The 2FA code you entered is incorrect. Please try again." | Yes (warn) |

### 2.5 Infrastructure Errors

Infrastructure errors represent failures in external services that the platform depends on. These are logged at `error` level and are critical for SRE monitoring.

| Error Class | HTTP Status | Code Constant | When It Occurs | User-Facing Message | Logged |
|---|---|---|---|---|---|
| `RedisConnectionError` | 503 | `SYSTEM_REDIS_UNAVAILABLE` | Redis connection refused, authentication failure, or command timeout | "A caching service is temporarily unavailable. Some features may be degraded." | Yes (error) |
| `CloudinaryError` | 502 | `SYSTEM_CLOUDINARY_ERROR` | Image upload to Cloudinary fails (network, quota, invalid format) | "File upload failed. Please try again or use a different file." | Yes (error) |
| `ResendError` | 502 | `SYSTEM_EMAIL_ERROR` | Email dispatch via Resend fails (API error, rate limit, template not found) | "We were unable to send the email at this time. It will be retried automatically." | Yes (error) |
| `CryptoNetworkError` | 502 | `PAYMENT_CRYPTO_NETWORK_ERROR` | Cryptocurrency payment gateway API call fails, blockchain network congestion, transaction broadcast failure | "The cryptocurrency network is experiencing issues. Your transaction will be retried." | Yes (error) |

---

## 3. Error Response Format

### 3.1 Standard Error Response Schema

All API error responses follow a single, consistent JSON structure. This structure is enforced by the global error handling middleware and must never be bypassed by individual route handlers.

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The provided data is invalid. Please check the highlighted fields and try again.",
    "details": [
      {
        "field": "email",
        "message": "Must be a valid email address"
      }
    ],
    "requestId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "timestamp": "2025-01-15T14:30:00.000Z"
  }
}
```

### 3.2 Field Specifications

| Field | Type | Required | Description |
|---|---|---|---|
| `error.code` | `string` | Always | Machine-readable error code constant (e.g., `AUTH_UNAUTHORIZED`, `WALLET_INSUFFICIENT_BALANCE`). Never a raw HTTP status text. Used by the frontend for programmatic error handling and routing. |
| `error.message` | `string` | Always | Human-readable message intended for display to the end user. Written in clear, non-technical language. Never contains internal details, stack traces, or system identifiers. This is the message shown in toast notifications and error modals. |
| `error.details` | `array<object>` | Conditional | Array of field-level error objects. Present only for `VALIDATION_ERROR` responses where specific fields failed validation. Omitted (not null) for all other error types to keep the response lean. |
| `error.details[].field` | `string` | When details present | The JSON pointer or dot-notation path to the field that failed validation. Uses dot notation for nested fields (e.g., `address.street`, `documents[0].type`). |
| `error.details[].message` | `string` | When details present | Human-readable description of why this specific field's value is invalid. |
| `error.requestId` | `string` (UUIDv4) | Always | Unique identifier for the request, generated at the middleware layer and attached to the request object. Enables correlation between client reports, server logs, and Sentry events. |
| `error.timestamp` | `string` (ISO 8601) | Always | Server-side timestamp of when the error was processed, in UTC with millisecond precision. |

### 3.3 Response Variations

**Single-Field Validation Error**
Returned when exactly one field in the request body fails validation. The `details` array contains one entry.

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The provided data is invalid. Please check the highlighted fields and try again.",
    "details": [
      {
        "field": "amount",
        "message": "Amount must be at least $10.00"
      }
    ],
    "requestId": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    "timestamp": "2025-01-15T14:30:00.000Z"
  }
}
```

**Multi-Field Validation Error**
Returned when multiple fields fail validation simultaneously. All field errors are collected and returned in a single response so the user can fix all issues at once rather than one at a time.

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The provided data is invalid. Please check the highlighted fields and try again.",
    "details": [
      {
        "field": "email",
        "message": "Must be a valid email address"
      },
      {
        "field": "password",
        "message": "Must be at least 8 characters and contain a number"
      },
      {
        "field": "confirmPassword",
        "message": "Passwords do not match"
      }
    ],
    "requestId": "c3d4e5f6-a7b8-9012-cdef-123456789012",
    "timestamp": "2025-01-15T14:30:00.000Z"
  }
}
```

**Non-Field Error (Domain/Server)**
Returned for errors that are not tied to a specific request field. The `details` field is omitted entirely (not included as null). This is the most common response shape for non-validation errors.

```json
{
  "error": {
    "code": "WALLET_INSUFFICIENT_BALANCE",
    "message": "Insufficient balance. Your current balance is $150.00.",
    "requestId": "d4e5f6a7-b8c9-0123-defa-234567890123",
    "timestamp": "2025-01-15T14:30:00.000Z"
  }
}
```

**Development-Only Error (Stack Trace)**
In non-production environments, an additional `stack` field is included for operational and programmer errors to aid debugging. This field is stripped in production by the global error handler.

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred. Our team has been notified. Please try again.",
    "stack": "Error: Cannot read properties of undefined (reading 'id')\n    at InvestmentService.create (/app/src/services/investment.service.ts:47:22)\n    ...",
    "requestId": "e5f6a7b8-c9d0-1234-efab-345678901234",
    "timestamp": "2025-01-15T14:30:00.000Z"
  }
}
```

### 3.4 HTTP Status Code Selection Rules

The HTTP status code is determined by the error class, not chosen ad hoc by route handlers. The mapping is enforced in the base `AppError` class constructor. The only exception is Prisma errors, which are mapped by the Prisma error handler middleware (see Section 6.3).

- `400` — Validation errors, malformed request syntax
- `401` — Authentication errors (missing, invalid, or expired credentials)
- `402` — Payment required (user must fund their account or complete payment)
- `403` — Authorization errors (insufficient permissions, account suspended, KYC required)
- `404` — Resource not found
- `409` — Conflict (duplicate resource)
- `422` — Business rule violation (domain errors)
- `429` — Rate limit exceeded
- `500` — Internal server error (unhandled/programmer errors)
- `502` — Bad gateway (external service failure)
- `503` — Service unavailable (database, queue, or infrastructure failure)

---

## 4. API Error Code Reference

### 4.1 Authentication Errors (AUTH_*)

| Error Code | HTTP Status | Message | When It Occurs | Retryable |
|---|---|---|---|---|
| `AUTH_UNAUTHORIZED` | 401 | "Your session has expired. Please sign in to continue." | JWT token is missing from Authorization header, token is expired, token signature is invalid, or API key is not recognized. | No |
| `AUTH_INVALID_CREDENTIALS` | 401 | "Invalid email or password." | Login attempt with email/password combination that does not match any user record. Uses generic message to prevent user enumeration. | No |
| `AUTH_FORBIDDEN` | 403 | "You do not have permission to perform this action." | Authenticated user's RBAC role does not include the permission required by the endpoint. E.g., a User role attempting to access admin endpoints. | No |
| `AUTH_INVALID_OTP` | 422 | "The verification code you entered is incorrect. Please try again." | OTP submitted for email verification or phone verification does not match the stored OTP value. Increments failed attempt counter. | No |
| `AUTH_OTP_EXPIRED` | 422 | "This verification code has expired. Please request a new one." | OTP submitted after its TTL has elapsed (10 minutes). Stored OTP is deleted on expiry. | No |
| `AUTH_OTP_RATE_LIMITED` | 429 | "You have requested too many verification codes. Please wait before requesting another." | User has requested more than 5 OTPs within a 15-minute window. | No |
| `AUTH_INVALID_2FA` | 422 | "The 2FA code you entered is incorrect. Please try again." | TOTP code does not match the expected value for the user's 2FA secret. | No |
| `AUTH_2FA_REQUIRED` | 403 | "Two-factor authentication is required to complete this action." | User has 2FA enabled but did not provide a 2FA code for a sensitive operation (withdrawal, password change). | No |
| `AUTH_2FA_NOT_ENABLED` | 422 | "Two-factor authentication is not enabled on your account." | User attempts to disable or manage 2FA when it is not currently enabled. | No |
| `AUTH_TOKEN_REFRESH_FAILED` | 401 | "Unable to refresh your session. Please sign in again." | Refresh token is invalid, expired, or has been revoked. | No |
| `AUTH_ACCOUNT_LOCKED` | 423 | "Your account is temporarily locked due to too many failed login attempts. Please try again in {minutes} minutes." | 5 consecutive failed login attempts trigger a 30-minute account lock. Timer resets on each failed attempt. | No |

### 4.2 User Errors (USER_*)

| Error Code | HTTP Status | Message | When It Occurs | Retryable |
|---|---|---|---|---|
| `USER_NOT_FOUND` | 404 | "User account not found." | User ID in path parameter does not match any user record. | No |
| `USER_ALREADY_EXISTS` | 409 | "An account with this email already exists." | Registration attempt with an email address already registered in the system. | No |
| `USER_PHONE_ALREADY_EXISTS` | 409 | "An account with this phone number already exists." | Registration attempt with a phone number already registered. | No |
| `USER_ACCOUNT_SUSPENDED` | 403 | "Your account has been suspended. Please contact support for assistance." | User account status is `SUSPENDED`. All API access is blocked except read-only profile retrieval. | No |
| `USER_ACCOUNT_DEACTIVATED` | 403 | "Your account has been deactivated." | User account status is `DEACTIVATED`. No API access permitted. | No |
| `USER_PROFILE_INCOMPLETE` | 422 | "Please complete your profile before proceeding." | User attempts an action requiring a complete profile (e.g., KYC submission) but required profile fields are missing. | No |

### 4.3 Wallet Errors (WALLET_*)

| Error Code | HTTP Status | Message | When It Occurs | Retryable |
|---|---|---|---|---|
| `WALLET_NOT_FOUND` | 404 | "Wallet not found." | Referenced wallet ID does not exist or does not belong to the authenticated user. | No |
| `WALLET_INSUFFICIENT_BALANCE` | 422 | "Insufficient balance. Your current balance is ${balance}." | Withdrawal or investment amount exceeds the wallet's available balance. The current balance is injected into the message template. | No |
| `WALLET_CURRENCY_MISMATCH` | 422 | "Currency mismatch. This operation requires USD." | User attempts an operation with a wallet in the wrong currency. | No |
| `WALLET_FROZEN` | 423 | "Your wallet is temporarily frozen. Please contact support." | Wallet has been frozen by an admin or compliance hold. No debits or credits permitted. | No |

### 4.4 Investment Errors (INVESTMENT_*)

| Error Code | HTTP Status | Message | When It Occurs | Retryable |
|---|---|---|---|---|
| `INVESTMENT_NOT_FOUND` | 404 | "Investment record not found." | Investment ID does not exist or does not belong to the authenticated user. | No |
| `INVESTMENT_INVALID_PLAN` | 422 | "The selected investment plan is not currently available." | Plan ID is invalid, plan status is `INACTIVE` or `ARCHIVED`, or plan has reached its maximum participant count. | No |
| `INVESTMENT_NOT_MATURED` | 422 | "This investment has not yet matured. Maturity date: {maturityDate}." | User attempts to withdraw returns or principal before the plan's maturity period has elapsed. | No |
| `INVESTMENT_ALREADY_ACTIVE` | 409 | "You already have an active investment in this plan." | User attempts to create a second investment in a plan that allows only one concurrent investment per user. | No |
| `INVESTMENT_MIN_AMOUNT` | 422 | "Minimum investment amount for this plan is ${minAmount}." | Investment amount is below the plan's minimum investment threshold. | No |
| `INVESTMENT_MAX_AMOUNT` | 422 | "Maximum investment amount for this plan is ${maxAmount}." | Investment amount exceeds the plan's maximum investment threshold. | No |

### 4.5 Deposit Errors (DEPOSIT_*)

| Error Code | HTTP Status | Message | When It Occurs | Retryable |
|---|---|---|---|---|
| `DEPOSIT_NOT_FOUND` | 404 | "Deposit record not found." | Deposit ID does not exist or does not belong to the authenticated user. | No |
| `DEPOSIT_AMOUNT_BELOW_MIN` | 422 | "Minimum deposit amount is $10.00." | Deposit amount is below the platform minimum. | No |
| `DEPOSIT_AMOUNT_ABOVE_MAX` | 422 | "Maximum single deposit amount is $50,000.00." | Deposit amount exceeds the platform maximum per transaction. | No |
| `DEPOSIT_DUPLICATE_REFERENCE` | 409 | "This deposit reference has already been used." | Idempotency key collision — a deposit with this reference ID was already processed. | No |
| `DEPOSIT_VERIFICATION_FAILED` | 422 | "Deposit verification failed. Please contact support." | Manual deposit review was rejected by a KYC officer or admin. | No |

### 4.6 Withdrawal Errors (WITHDRAWAL_*)

| Error Code | HTTP Status | Message | When It Occurs | Retryable |
|---|---|---|---|---|
| `WITHDRAWAL_NOT_FOUND` | 404 | "Withdrawal record not found." | Withdrawal ID does not exist or does not belong to the authenticated user. | No |
| `WITHDRAWAL_LIMIT_EXCEEDED` | 422 | "Withdrawal amount exceeds your daily limit of ${limit}." | Requested withdrawal amount exceeds the per-day limit for the user's KYC tier. | No |
| `WITHDRAWAL_MIN_AMOUNT` | 422 | "Minimum withdrawal amount is $5.00." | Withdrawal amount is below the platform minimum. | No |
| `WITHDRAWAL_PENDING_EXISTS` | 409 | "You already have a pending withdrawal. Please wait for it to be processed." | User attempts to create a new withdrawal while one is already in `PENDING` status. | No |
| `WITHDRAWAL_CANNOT_CANCEL` | 422 | "This withdrawal cannot be cancelled at its current stage." | User attempts to cancel a withdrawal that has already been approved or completed. | No |

### 4.7 Referral Errors (REFERRAL_*)

| Error Code | HTTP Status | Message | When It Occurs | Retryable |
|---|---|---|---|---|
| `REFERRAL_CODE_NOT_FOUND` | 404 | "Referral code not found." | The referral code provided does not match any active user. | No |
| `REFERRAL_DUPLICATE` | 409 | "You have already used a referral code." | User attempts to apply a referral code after having already used one. | No |
| `REFERRAL_SELF_REFERRAL` | 422 | "You cannot refer yourself." | User provides their own referral code. | No |
| `REFERRAL_PROGRAM_INACTIVE` | 422 | "The referral program is currently not active." | User attempts to use a referral code when the referral system is disabled. | No |

### 4.8 KYC Errors (KYC_*)

| Error Code | HTTP Status | Message | When It Occurs | Retryable |
|---|---|---|---|---|
| `KYC_REQUIRED` | 403 | "KYC verification is required before you can perform this action." | User attempts a restricted action (high-value deposit, withdrawal) without approved KYC. | No |
| `KYC_ALREADY_SUBMITTED` | 409 | "You have already submitted your KYC documents. Please wait for review." | User submits KYC documents when a submission already exists in `PENDING` or `APPROVED` status. | No |
| `KYC_REJECTED` | 403 | "Your KYC verification was rejected. Please resubmit with corrected documents." | User's KYC was previously rejected and they are attempting an action requiring KYC approval. | No |
| `KYC_DOCUMENT_REQUIRED` | 422 | "All required documents must be uploaded." | KYC submission is missing a required document type (e.g., proof of address). | No |
| `KYC_NOT_FOUND` | 404 | "KYC record not found." | KYC officer or admin references a KYC ID that does not exist. | No |

### 4.9 Notification Errors (NOTIFICATION_*)

| Error Code | HTTP Status | Message | When It Occurs | Retryable |
|---|---|---|---|---|
| `NOTIFICATION_PREFERENCE_NOT_FOUND` | 404 | "Notification preferences not found." | User's notification preference record does not exist (should be auto-created on registration). | No |
| `NOTIFICATION_SEND_FAILED` | 502 | "Failed to send notification. It will be retried automatically." | Email or push notification dispatch failed at the provider level (Resend, FCM). | Yes |

### 4.10 Support Errors (SUPPORT_*)

| Error Code | HTTP Status | Message | When It Occurs | Retryable |
|---|---|---|---|---|
| `SUPPORT_TICKET_NOT_FOUND` | 404 | "Support ticket not found." | Ticket ID does not exist or does not belong to the user (for user role) or does not exist at all (for admin roles). | No |
| `SUPPORT_TICKET_CLOSED` | 422 | "This ticket is already closed and cannot be updated." | User or admin attempts to add a message to a ticket in `CLOSED` status. | No |

### 4.11 Admin Errors (ADMIN_*)

| Error Code | HTTP Status | Message | When It Occurs | Retryable |
|---|---|---|---|---|
| `ADMIN_PLAN_NOT_FOUND` | 404 | "Investment plan not found." | Admin references a plan ID that does not exist. | No |
| `ADMIN_PLAN_HAS_ACTIVE_INVESTMENTS` | 422 | "Cannot archive a plan with active investments." | Admin attempts to archive or deactivate a plan that still has active (non-matured) investments. | No |
| `ADMIN_USER_UPDATE_FAILED` | 500 | "Failed to update user. Please try again." | Database error during user update by admin. | Yes |
| `ADMIN_ACTION_LOGGED` | 200 | N/A (success) | All admin actions are logged to the audit trail. This is not an error code but a notation that every admin mutation writes to the `AuditLog` table. | N/A |

### 4.12 Payment Errors (PAYMENT_*)

| Error Code | HTTP Status | Message | When It Occurs | Retryable |
|---|---|---|---|---|
| `PAYMENT_REQUIRED` | 402 | "Payment is required to complete this action." | User attempts to purchase an investment plan without sufficient wallet balance or active payment method. | No |
| `PAYMENT_GIFT_CARD_INVALID` | 422 | "The gift card code is invalid, expired, or has already been redeemed." | Gift card validation fails against the gift card service or local database. | No |
| `PAYMENT_CRYPTO_NETWORK_ERROR` | 502 | "The cryptocurrency network is experiencing issues. Your transaction will be retried." | Crypto payment gateway API call fails or blockchain transaction broadcast fails. | Yes |
| `PAYMENT_CRYPTO_AMOUNT_MISMATCH` | 422 | "The cryptocurrency amount does not match the expected value." | Amount received on-chain differs from the expected deposit amount beyond the acceptable tolerance (0.5%). | No |
| `PAYMENT_CRYPTO_TIMEOUT` | 504 | "The cryptocurrency transaction timed out. It may still be processing. Please check back later." | Waiting for blockchain confirmation exceeded the timeout threshold (30 minutes). | No |
| `PAYMENT_METHOD_NOT_FOUND` | 404 | "Payment method not found." | User references a saved payment method ID that does not exist or belongs to another user. | No |

### 4.13 System Errors (SYSTEM_*)

| Error Code | HTTP Status | Message | When It Occurs | Retryable |
|---|---|---|---|---|
| `SYSTEM_REDIS_UNAVAILABLE` | 503 | "A caching service is temporarily unavailable. Some features may be degraded." | Redis connection fails, authentication fails, or a critical Redis command times out. | Yes |
| `SYSTEM_CLOUDINARY_ERROR` | 502 | "File upload failed. Please try again or use a different file." | Cloudinary upload API returns an error (invalid resource, quota exceeded, network failure). | Yes |
| `SYSTEM_EMAIL_ERROR` | 502 | "We were unable to send the email at this time. It will be retried automatically." | Resend API call fails for any reason. The email is queued for background retry. | Yes |
| `SYSTEM_MAINTENANCE` | 503 | "The platform is undergoing scheduled maintenance. Please try again after {estimatedTime}." | System is in maintenance mode (set via environment variable or admin toggle). | Yes |
| `INTERNAL_ERROR` | 500 | "An unexpected error occurred. Our team has been notified. Please try again." | Any unhandled exception that is not caught by more specific error handlers. | No |

### 4.14 Validation Errors (VALIDATION_*)

| Error Code | HTTP Status | Message | When It Occurs | Retryable |
|---|---|---|---|---|
| `VALIDATION_ERROR` | 400 | "The provided data is invalid. Please check the highlighted fields and try again." | Request body, query parameters, or path parameters fail Zod schema validation. Field-level details are included in the response. | No |
| `VALIDATION_INVALID_QUERY` | 400 | "Invalid query parameters." | Query string contains unrecognized parameters or invalid values for known parameters (e.g., invalid sort direction, invalid cursor). | No |
| `VALIDATION_INVALID_FILE` | 400 | "The uploaded file is invalid. Accepted formats: JPG, PNG, PDF. Maximum size: 5MB." | File upload fails size, type, or dimension validation. | No |
| `VALIDATION_PAGINATION` | 400 | "Invalid pagination parameters. Page must be a positive integer, limit must be between 1 and 100." | Pagination query parameters are out of bounds. | No |

---

## 5. Validation Error Handling

### 5.1 Zod-to-API-Error Transformation Pipeline

All incoming request data (body, query, params) is validated using Zod schemas before reaching any route handler. When a Zod validation fails, the resulting `ZodError` is transformed into the standard `ValidationError` response format through a dedicated transformation function.

The transformation pipeline executes the following steps:
1. **Catch**: The validation middleware catches the `ZodError` thrown by `schema.parse()`.
2. **Flatten**: The `ZodError` is flattened using `error.flatten()` to produce a single-level map of field paths to error messages.
3. **Map**: Each field error is mapped to the `details` array format: `{ field: string, message: string }`.
4. **Construct**: A `ValidationError` is constructed with the mapped details and thrown into the global error handler.
5. **Respond**: The global error handler serializes the `ValidationError` into the standard JSON response.

### 5.2 Field-Level Error Mapping

Each field in a Zod schema maps to a specific dot-notation path in the `details` array. The transformation follows these rules:

- **Top-level fields**: `email` maps to `"field": "email"`.
- **Nested objects**: `address.city` maps to `"field": "address.city"`.
- **Array indices**: `documents[0].type` maps to `"field": "documents.0.type"` (zero-indexed, dot-separated).
- **Union types**: When a field fails a `z.union()`, the message summarizes all branch failures: "Must be a valid email address or phone number."
- **Enum types**: When a field fails a `z.enum()`, the message lists valid options: "Must be one of: ACTIVE, INACTIVE, ARCHIVED."
- **Transform types**: When a `z.string().transform()` fails, the message reflects the semantic intent: "Must be a valid UUID."

### 5.3 Nested Object Validation Errors

For deeply nested objects (e.g., KYC submission with nested address and document arrays), the Zod error path is preserved through the transformation. Consider a KYC submission payload with this structure:

```json
{
  "personalInfo": {
    "fullName": "John Doe",
    "dateOfBirth": "not-a-date",
    "address": {
      "street": "123 Main St",
      "city": "",
      "country": "INVALID"
    }
  },
  "documents": [
    { "type": "PASSPORT", "file": null },
    { "type": "UTILITY_BILL", "file": "data:..." }
  ]
}
```

The resulting `details` array would be:

```json
[
  { "field": "personalInfo.dateOfBirth", "message": "Must be a valid date in YYYY-MM-DD format" },
  { "field": "personalInfo.address.city", "message": "City is required" },
  { "field": "personalInfo.address.country", "message": "Must be a valid ISO 3166-1 alpha-2 country code" },
  { "field": "documents.0.file", "message": "Passport document is required" }
]
```

### 5.4 Array Validation Errors

Array fields receive per-element error reporting. If an array has `z.array(z.string().min(1))` and the input is `["valid", "", "also valid"]`, the details array contains only the failing element:

```json
[
  { "field": "tags.1", "message": "String must contain at least 1 character(s)" }
]
```

For `z.array().min(1)`, the error is reported on the array field itself:

```json
[
  { "field": "documents", "message": "At least 1 document is required" }
]
```

### 5.5 File Upload Validation Errors

File uploads are validated through a multi-stage pipeline before the request body is processed:

**Stage 1 — Multipart Parsing**: The multipart parser extracts files and fields. If the parser fails (malformed multipart, missing boundary), a `ValidationError` with code `VALIDATION_INVALID_FILE` is returned immediately.

**Stage 2 — Size Validation**: Each file is checked against the maximum allowed size (configurable per field, default 5MB for documents, 10MB for images). The check occurs before the file is fully buffered into memory (stream-based size check). If the size exceeds the limit, the response is:

```json
{
  "error": {
    "code": "VALIDATION_INVALID_FILE",
    "message": "File exceeds the maximum size of 5MB.",
    "details": [
      { "field": "document", "message": "File size is 7.2MB, maximum allowed is 5MB" }
    ],
    "requestId": "...",
    "timestamp": "..."
  }
}
```

**Stage 3 — MIME Type Validation**: The file's MIME type is checked against an allowlist. The check uses both the declared Content-Type header and magic byte inspection (the first 32 bytes of the file) to prevent MIME spoofing. If the type is not in the allowlist:

```json
{
  "error": {
    "code": "VALIDATION_INVALID_FILE",
    "message": "File type is not allowed.",
    "details": [
      { "field": "document", "message": "File type 'application/octet-stream' is not accepted. Allowed types: image/jpeg, image/png, application/pdf" }
    ],
    "requestId": "...",
    "timestamp": "..."
  }
}
```

**Stage 4 — Image Dimension Validation** (image uploads only): For avatar and document images, the image dimensions are checked after decoding the file header. If the image exceeds maximum dimensions (e.g., 4096x4096 for documents) or is below minimum dimensions (e.g., 100x100 for avatars):

```json
{
  "error": {
    "code": "VALIDATION_INVALID_FILE",
    "message": "Image dimensions are not valid.",
    "details": [
      { "field": "avatar", "message": "Image dimensions 8000x6000 exceed the maximum of 4096x4096" }
    ],
    "requestId": "...",
    "timestamp": "..."
  }
}
```

---

## 6. Error Handling Middleware

### 6.1 Middleware Registration Order

The error handling middleware stack is registered in the following order (Express middleware registration is sequential; order matters):

1. Request ID injection middleware (generates `req.requestId`)
2. Request logging middleware (logs incoming request at `debug` level)
3. Rate limiting middleware (returns `RateLimitError` before any route processing)
4. Authentication middleware (extracts and validates JWT, populates `req.user`)
5. RBAC authorization middleware (checks `req.user.role` against required permissions)
6. Request body parsing middleware (JSON body parser with size limit)
7. File upload middleware (multer with configured limits)
8. Validation middleware (Zod schema validation, transforms `ZodError` to `ValidationError`)
9. Route handlers (business logic)
10. **Prisma error handler** (catches Prisma-specific errors thrown by route handlers)
11. **Domain error handler** (catches domain errors and maps to HTTP responses)
12. **Global error handler** (catches everything else, final safety net)
13. **404 handler** (catches requests that did not match any route)
14. **Request body parsing error handler** (catches `SyntaxError` from JSON parsing)

### 6.2 Global Express Error Handler

The global error handler is a four-argument Express middleware `(err, req, res, next)` registered after all routes. It is the final safety net that ensures no error ever results in an unformatted response or a connection hang.

**Behavior:**
1. If `err` is an instance of `AppError`, serialize it using its `toJSON()` method and send the response with the appropriate HTTP status code.
2. If `err` is a `ZodError`, transform it into a `ValidationError` and serialize (defense-in-depth; the validation middleware should catch these before they reach here).
3. If `err` is a `SyntaxError` with `status === 400` and `type === 'entity.parse.failed'`, transform it into a `ValidationError` with message "Request body contains invalid JSON."
4. For all other errors (programmer errors, unexpected exceptions), create a generic `InternalError`, log the full error with stack trace at `error` level, send the generic response to the client, and capture the error in Sentry.
5. In non-production environments, include the `stack` field in the response body for debugging.
6. Always include `requestId` and `timestamp` in the response.

**Logging:** All errors passing through the global handler are logged. Operational errors (`isOperational === true`) are logged at `warn` level. Programmer errors (`isOperational === false`) are logged at `error` level with full stack traces.

### 6.3 Domain Error Handler

The domain error handler is registered before the global error handler and after all route handlers. It catches errors that are instances of any domain error class (defined in Section 2.4) and maps them to their pre-defined HTTP responses.

**Behavior:**
1. Check if `err instanceof DomainError` (base class for all domain errors).
2. If true, call `err.toResponse()` which returns `{ statusCode, body }`.
3. Send the response with the mapped status code.
4. Call `next(err)` so the global handler can also log the error (the global handler checks if a response has already been sent and skips re-sending if so — this is tracked via `res.headersSent`).

**Why separate from global handler:** Domain errors are expected, operational errors. They deserve `warn`-level logging and should not trigger Sentry capture. Separating them from the global handler makes this distinction clear and avoids complex conditional logic in a single handler.

### 6.4 Prisma Error Handler

Prisma throws specific error types with error codes (e.g., `P2002` for unique constraint violation, `P2025` for record not found). The Prisma error handler catches these and maps them to the appropriate API error classes.

| Prisma Error Code | Prisma Error Name | Mapped API Error | User-Facing Message |
|---|---|---|---|
| P2002 | Unique constraint violation | `ConflictError` | Context-dependent. If the constraint is on `email`: "An account with this email already exists." If on `phone`: "An account with this phone number already exists." If on `referralCode`: "This referral code is already in use." The handler inspects `err.meta.target` to determine which field caused the violation. |
| P2025 | Record not found | `NotFoundError` | "The requested resource could not be found." The handler checks the query context (available from `err.meta.model`) to potentially provide a more specific message: "Investment plan not found" vs. "User not found". |
| P2003 | Foreign key constraint violation | `ValidationError` | "Referenced resource does not exist." Inspected field determines specificity. |
| P2014 | Required relation violation | `ValidationError` | "A required associated record is missing." |
| P2000 | Value too long for column | `ValidationError` | "The value for '{field}' is too long." |
| P2001 | Column does not exist (query error) | `InternalError` | Logged at `error` level. This indicates a schema mismatch or a bug. Never exposed to the client in detail. |

**Transaction Context:** If a Prisma error occurs inside an interactive transaction (`prisma.$transaction()`), the Prisma error handler cannot send an HTTP response (the error is thrown inside the transaction callback). In this case, the error propagates to the calling service method, which catches it, and either re-throws a domain-specific error or lets it bubble to the global handler.

### 6.5 404 Handler for Unknown Routes

Registered as the final middleware (after the global error handler but using a non-error signature). Any request that reaches this handler did not match any registered route.

**Behavior:**
1. Check if the request path starts with `/api/`. If yes, return a 404 JSON response: `{ "error": { "code": "NOT_FOUND", "message": "The endpoint {method} {path} does not exist.", "requestId": "...", "timestamp": "..." } }`.
2. If the path does not start with `/api/`, let Next.js handle it (the request may be for a frontend page or a static asset).
3. Log at `warn` level with the method, path, and IP address — a high volume of 404s may indicate a misconfigured client, a broken link, or a scanning attack.

### 6.6 Request Body Parsing Error Handler

Express's `express.json()` middleware throws a `SyntaxError` with `status: 400` and `type: 'entity.parse.failed'` when it encounters malformed JSON. This handler catches that specific error before it reaches the global handler.

**Behavior:**
1. Check if `err instanceof SyntaxError && err.status === 400 && 'body' in err`.
2. If true, return a `ValidationError` with code `VALIDATION_ERROR` and message "Request body contains invalid JSON. Please check your input format."
3. Do not include any details about the JSON parsing position or the malformed content (this information could be used to probe the API structure).

---

## 7. Financial Error Handling

This is the most critical section of the error handling architecture. Financial errors involve real monetary value, and any inconsistency directly impacts user trust and regulatory compliance.

### 7.1 Database Transaction Rollback Rules

Every operation that mutates financial state MUST execute within a Prisma interactive transaction (`prisma.$transaction(async (tx) => { ... })`). The following rules are absolute:

1. **All-or-Nothing Rollback**: If any operation within the transaction throws an error — whether it is a validation error, a database constraint violation, an external service failure, or a programmer error — the entire transaction is rolled back. No partial writes are committed. This is guaranteed by Prisma's interactive transaction implementation, which wraps all operations in a database SAVEPOINT and issues ROLLBACK on error.

2. **Transaction Boundary Definition**: A financial transaction begins at the service layer (e.g., `WithdrawalService.create()`) and encompasses every database write required for the operation. For a withdrawal, this includes:
   - Reading the wallet balance (with `SELECT ... FOR UPDATE` row-level lock)
   - Deducting the withdrawal amount from the wallet
   - Creating the withdrawal record with status `PENDING`
   - Creating an audit log entry
   - Updating the user's total withdrawn amount (for limit tracking)
   If any of these steps fails, all changes are rolled back.

3. **No External Calls Inside Transactions**: External API calls (email, Cloudinary, crypto payment gateway) are NEVER made inside a database transaction. The transaction handles only database operations. External side effects are dispatched after the transaction commits successfully. If an external call fails after the transaction commits, a compensation operation is triggered (see Section 7.4).

4. **Read-After-Write Consistency**: After a financial transaction commits, the service reads back the affected records within the same request context to verify consistency. This serves as a sanity check and provides the response data. If the read-back returns unexpected values, a `DatabaseError` is thrown and an alert is triggered.

### 7.2 Idempotency Key Handling

Financial mutation endpoints (deposit, withdrawal, investment purchase) require an `Idempotency-Key` header. This key is a UUID v4 generated by the client and sent with every mutation request.

**Processing Flow:**
1. On receiving a mutation request, the server checks Redis for a key `idempotency:{idempotencyKey}:{userId}`.
2. If the key exists and the stored status is `COMPLETED`, the server returns the cached response (the original success response) without re-executing the operation. HTTP status 200 with an `Idempotent-Replayed: true` header.
3. If the key exists and the stored status is `PROCESSING`, the server returns a 409 Conflict with code `DEPOSIT_DUPLICATE_REFERENCE` (or the equivalent for the operation type). The client should not retry immediately.
4. If the key does not exist, the server sets it in Redis with status `PROCESSING` and a TTL of 24 hours, then proceeds with the operation.
5. On successful completion, the Redis key is updated to status `COMPLETED` and the response body is cached.
6. On failure, the Redis key is updated to status `FAILED` and the error response is cached for 5 minutes. Subsequent requests with the same key within those 5 minutes receive the cached error response. After 5 minutes, the key is deleted and the client may retry with the same key.

**Key Expiry:** All idempotency keys expire after 24 hours regardless of status. This prevents Redis from accumulating stale entries.

### 7.3 Balance Check-Then-Act Pattern

The classic "check balance, then deduct" pattern is vulnerable to race conditions when two concurrent requests attempt to withdraw from the same wallet. TeslaPrimeCapital eliminates this risk using Prisma's row-level locking within interactive transactions.

**Implementation:**
1. Begin a Prisma interactive transaction.
2. Execute `tx.wallet.findUnique({ where: { id }, select: { balance: true } })` — Prisma's interactive transaction runs this within a `SELECT ... FOR UPDATE` on PostgreSQL, acquiring an exclusive row lock on the wallet row.
3. If the balance is insufficient, throw `InsufficientBalanceError`. The transaction is rolled back and the lock is released.
4. If the balance is sufficient, execute `tx.wallet.update({ where: { id }, data: { balance: { decrement: amount } } })`.
5. Commit the transaction, releasing the lock.

If two concurrent withdrawal requests arrive for the same wallet, the second request's `findUnique` call blocks at step 2 until the first transaction commits or rolls back. When it unblocks, it reads the updated balance and makes its own sufficiency check. This guarantees that the balance never goes negative.

### 7.4 Compensation Operations

Compensation operations handle the rare but critical case where an external service call succeeds but the associated local database state cannot be updated or must be reversed.

**Scenario: Withdrawal to Crypto Address**
1. Database transaction commits: wallet debited, withdrawal record created with status `PROCESSING`.
2. Crypto payment gateway API is called to initiate the blockchain transaction.
3. The API call succeeds and returns a transaction hash.
4. The server attempts to update the withdrawal record with the transaction hash and status `COMPLETED`.
5. **Failure**: The database update fails (connection lost, constraint violation).

**Compensation Flow:**
1. The failure is caught and logged at `fatal` level.
2. A BullMQ job is immediately enqueued to the `withdrawal-compensation` queue with the withdrawal ID and the transaction hash.
3. The compensation job attempts to update the withdrawal record every 1 minute for 10 attempts.
4. If all retry attempts fail, the job is moved to the dead letter queue and a `SYSTEM` severity alert is triggered.
5. A manual reconciliation entry is created in the `ReconciliationLog` table with status `REQUIRES_MANUAL_REVIEW`.
6. An admin notification is dispatched (via the notification system) informing the operations team of the discrepancy.

**Scenario: Investment Purchase with Failed Notification**
1. Database transaction commits: wallet debited, investment record created.
2. BullMQ notification job is enqueued.
3. The notification job fails (Resend API is down).
4. The notification job is retried per BullMQ retry rules (see Section 8).
5. The financial state is unaffected — the investment was successfully created. Only the notification is delayed or lost, which is an acceptable degradation.

### 7.5 Dead Letter Queue for Failed Financial Jobs

BullMQ queues used for financial operations have a dedicated dead letter queue (DLQ) configuration. When a job exceeds its maximum retry count, it is moved to the DLQ.

**DLQ Configuration:**
- Queue name: `financial-dlq`
- Jobs are stored with their full payload, error message, stack trace, and timestamp of final failure
- A scheduled BullMQ repeatable job (`0 */15 * * * *` — every 15 minutes) processes the DLQ
- The DLQ processor attempts to classify each failed job: retryable (transient error, service recovered) vs. non-retryable (permanent data issue, business rule violation)
- Retryable jobs are re-enqueued to their original queue
- Non-retryable jobs are flagged for manual review and an alert is generated

**Financial Job Types that Use DLQ:**
- `deposit-processing`: Crypto deposit confirmation monitoring
- `withdrawal-dispatch`: Crypto/fiat withdrawal execution
- `investment-maturity`: Maturity processing and profit crediting
- `referral-bonus`: Referral bonus crediting
- `withdrawal-compensation`: Post-failure state reconciliation

### 7.6 Manual Reconciliation Procedures

When automated recovery mechanisms are insufficient, the following manual reconciliation procedures are executed by the operations team:

**Daily Balance Reconciliation (Automated + Manual Review):**
1. A scheduled job runs daily at 00:00 UTC that sums all wallet balances and compares against the sum of all deposits minus all withdrawals minus all investments.
2. If the totals match (within a configurable tolerance of $0.01 due to rounding), no action is needed.
3. If a discrepancy is detected, a `ReconciliationDiscrepancy` record is created with the expected total, actual total, and difference.
4. An alert is dispatched to the operations team.
5. The operations team reviews the `AuditLog` and `Transaction` tables for the affected period to identify the source of the discrepancy.
6. If the discrepancy is caused by a known failed job (from the DLQ), the job is manually resolved.
7. If the cause is unknown, the platform enters a "restricted mode" where withdrawals are temporarily suspended until the discrepancy is resolved.

**Per-Transaction Reconciliation:**
1. Admin users can trigger a reconciliation for a specific transaction from the admin dashboard.
2. The reconciliation process traces the full lifecycle of the transaction: creation, all status transitions, all associated wallet mutations, all external service calls.
3. The result is a reconciliation report showing the expected state vs. actual state for each entity involved.

---

## 8. Retry Strategy

### 8.1 Client-Side Retry

**Which Mutations Can Be Retried:**
Only idempotent mutations should be retried by the client. The frontend maintains a list of retryable mutation keys. Non-retryable mutations (e.g., login attempts, OTP verification) are never retried automatically.

- Retryable: `deposit.create`, `withdrawal.create`, `investment.purchase`, `profile.update`, `kyc.submit`
- Non-retryable: `auth.login`, `auth.verifyOtp`, `auth.enable2fa`, `referral.apply`

**Retry Configuration:**
- Maximum retry count: 3 (the initial request + 3 retries = 4 total attempts)
- Retry delay: Exponential backoff with jitter
  - Attempt 1: 1 second (± 200ms jitter)
  - Attempt 2: 2 seconds (± 400ms jitter)
  - Attempt 3: 4 seconds (± 800ms jitter)
- Retry condition: Only retry if the error is marked as retryable in the API error code reference (see Section 4, "Retryable" column). The client checks `response.error.code` against this list.

**Retry Implementation:**
TanStack Query's `retry` configuration is used for query refetches. For mutations, a custom `useMutation` wrapper implements the retry logic:
1. The mutation's `onError` callback checks if the error code is retryable.
2. If retryable and the attempt count is below 3, schedule a retry with the appropriate delay.
3. If the retry limit is exceeded or the error is not retryable, display the error to the user.
4. Each retry uses the same `Idempotency-Key` header as the original request.

### 8.2 Server-Side Retry (BullMQ)

BullMQ handles background job processing with built-in retry support. Each job queue has a configured retry policy.

**Default Retry Configuration:**
- Maximum attempts: 3 (1 initial + 3 retries)
- Backoff strategy: Exponential
- Backoff delays: 60,000ms (1 min), 300,000ms (5 min), 900,000ms (15 min)
- On the final failure, the job is moved to the dead letter queue

**Per-Queue Overrides:**

| Queue | Max Attempts | Backoff Delays | Notes |
|---|---|---|---|
| `email-notification` | 5 | 1m, 5m, 15m, 30m, 60m | Email delivery is high-priority; more retries with longer final delay |
| `deposit-processing` | 3 | 1m, 5m, 15m | Crypto deposit confirmation polling |
| `withdrawal-dispatch` | 3 | 1m, 5m, 15m | Crypto withdrawal execution |
| `investment-maturity` | 5 | 1m, 5m, 15m, 30m, 60m | Maturity processing is critical and should be aggressively retried |
| `referral-bonus` | 3 | 1m, 5m, 15m | Bonus crediting |
| `withdrawal-compensation` | 10 | 1m, 1m, 1m, 5m, 5m, 5m, 15m, 15m, 15m, 30m | Compensation jobs are critical; higher retry count with persistent short intervals |

**Job Retry Logic:**
Each job processor is wrapped in a try-catch that:
1. Catches any error thrown during job execution.
2. Checks if the error is a domain error (e.g., `InsufficientBalanceError`). If so, the error is non-transient and the job should NOT be retried — it is immediately moved to the DLQ.
3. For transient errors (network timeouts, 5xx from external services), the error is allowed to propagate to BullMQ's built-in retry mechanism.
4. Each retry attempt is logged with the job ID, attempt number, and error message.

### 8.3 External Service Retry

**Resend Email Retry:**
- Handled via the `email-notification` BullMQ queue (see above)
- Additional client-side: If a synchronous email send (e.g., password reset) fails, the error is returned to the client as `SYSTEM_EMAIL_ERROR` with `retryable: true`. The client does NOT retry email sends — only the server retries via BullMQ.
- Circuit breaker: If 5 consecutive email sends fail, the circuit breaker opens and all subsequent email dispatches are routed directly to the DLQ without attempting the Resend API.

**Cloudinary Upload Retry:**
- File upload endpoints use a custom retry wrapper around the Cloudinary SDK.
- Maximum 2 retries (3 total attempts) with 2-second delay between attempts.
- If all attempts fail, `SYSTEM_CLOUDINARY_ERROR` is returned to the client.
- The client can retry the upload (using a new idempotency key) up to 3 times.
- Circuit breaker: If 5 consecutive Cloudinary uploads fail, the circuit breaker opens for 30 seconds.

**Crypto Payment Gateway Retry:**
- All crypto API calls are wrapped in a retry function with exponential backoff.
- Maximum 3 retries with delays of 2s, 5s, 10s.
- Only retries on network errors (ETIMEDOUT, ECONNREFUSED, ENOTFOUND) and HTTP 5xx responses.
- Does NOT retry on HTTP 4xx responses (these indicate client errors like invalid credentials or malformed requests).
- Circuit breaker: If 5 consecutive crypto API calls fail, the circuit breaker opens for 60 seconds (longer cooldown because crypto network issues tend to persist).

### 8.4 Circuit Breaker Pattern

The circuit breaker pattern prevents cascading failures when an external service is down. TeslaPrimeCapital implements a simple state-machine circuit breaker for each external service dependency.

**States:**
- **Closed (Normal)**: Requests pass through to the external service. Consecutive failures are counted.
- **Open (Failing)**: Requests are immediately rejected with the appropriate `SYSTEM_*` error. No actual call is made to the external service.
- **Half-Open (Probing)**: After the cooldown period, a single probe request is allowed through. If it succeeds, the circuit closes. If it fails, the circuit re-opens and the cooldown resets.

**Configuration Per Service:**

| Service | Failure Threshold | Cooldown (Open Duration) | Half-Open Probes |
|---|---|---|---|
| Resend (Email) | 5 consecutive failures | 30 seconds | 1 |
| Cloudinary (Uploads) | 5 consecutive failures | 30 seconds | 1 |
| Crypto Payment Gateway | 5 consecutive failures | 60 seconds | 1 |
| Redis | 3 consecutive failures | 10 seconds | 1 |

**Implementation Notes:**
- Circuit breaker state is stored in-memory per process (not in Redis, because Redis itself might be the failing service).
- In a multi-process deployment, each process maintains its own circuit breaker state. This is acceptable because the failure threshold is low enough that all processes will independently detect the failure within seconds of each other.
- Successful requests reset the consecutive failure counter to zero.
- When a circuit is open, the error returned to the client includes the `retryable: true` flag and a message suggesting the user try again after the cooldown period.

---

## 9. Logging Specification

### 9.1 Log Levels

| Level | Numeric Value | When to Use | Example |
|---|---|---|---|
| `debug` | 0 | Detailed diagnostic information for development and troubleshooting. Not enabled in production by default. | "Validating request body against CreateUserSchema", "Cache hit for key user:123:profile", "BullMQ job deposit:456 started" |
| `info` | 1 | Normal operational events that confirm the system is working as expected. | "User 123 successfully logged in", "Investment 789 created for $5,000 in plan SILVER", "Withdrawal 101 approved by admin 5" |
| `warn` | 2 | Expected error conditions that are handled gracefully. These do not indicate system malfunction but are notable events. | "Failed login attempt for user 123 from IP 45.67.89.0", "Insufficient balance for withdrawal of $10,000 by user 123", "Rate limit exceeded for IP 45.67.89.0" |
| `error` | 3 | Error conditions that indicate a malfunction but do not cause the entire system to fail. These require investigation. | "Database connection timeout after 5000ms (pool: 3/10 connections)", "Cloudinary upload failed: ETIMEDOUT", "Unhandled error in withdrawal-processing job #456" |
| `fatal` | 4 | Critical errors that cause a core function to fail or that indicate data inconsistency. These require immediate attention. | "Financial transaction rollback: wallet balance inconsistency detected for user 123", "Database connection pool exhausted (10/10 connections in use)", "Compensation operation failed for withdrawal 789" |

### 9.2 Structured JSON Log Format

All logs are emitted as single-line JSON objects to stdout. The format is designed for consumption by log aggregators (e.g., Loki, ELK, Datadog).

```json
{
  "timestamp": "2025-01-15T14:30:00.123Z",
  "level": "error",
  "requestId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "userId": "usr_abc123def456",
  "action": "withdrawal.create",
  "message": "Insufficient balance for withdrawal of $10000.00",
  "error": {
    "name": "InsufficientBalanceError",
    "message": "Insufficient balance. Current balance: $5000.00",
    "code": "WALLET_INSUFFICIENT_BALANCE",
    "stack": "InsufficientBalanceError: Insufficient balance...\n    at WithdrawalService.create (/app/src/services/withdrawal.service.ts:87:13)\n    ..."
  },
  "metadata": {
    "walletId": "wal_xyz789",
    "requestedAmount": 10000,
    "currentBalance": 5000
  },
  "environment": "production",
  "service": "api",
  "version": "2.0.0"
}
```

**Field Definitions:**

| Field | Type | Always Present | Description |
|---|---|---|---|
| `timestamp` | string (ISO 8601) | Yes | Exact time the log entry was created, in UTC with millisecond precision. |
| `level` | string | Yes | One of: `debug`, `info`, `warn`, `error`, `fatal`. |
| `requestId` | string (UUID) | When in request context | The unique request identifier. Absent in background job logs (which use `jobId` instead). |
| `userId` | string | When authenticated | The authenticated user's ID. Absent for unauthenticated requests and background jobs. |
| `action` | string | Yes | A dot-notation action identifier (e.g., `auth.login`, `withdrawal.create`, `investment.maturity.process`). This is the primary field for filtering and searching logs. |
| `message` | string | Yes | Human-readable log message. |
| `error` | object | On error logs only | Contains `name` (error class name), `message`, `code` (API error code if applicable), and `stack` (full stack trace). |
| `metadata` | object | Conditional | Arbitrary key-value pairs providing context. Content varies by action type. |
| `environment` | string | Yes | The deployment environment: `development`, `staging`, `production`. |
| `service` | string | Yes | The service emitting the log: `api`, `worker`, `cron`. |
| `version` | string | Yes | The application version from the `VERSION` environment variable. |

### 9.3 Sensitive Data Exclusion Rules

The following data categories are NEVER included in logs, under any circumstances, at any log level. This is enforced by a logging utility function that redacts known sensitive fields from the `metadata` object before the log is emitted.

**Never Log:**
- Passwords (plaintext, hashed, or masked) — the entire field is omitted
- JWT tokens and refresh tokens — only the token prefix (first 8 characters followed by `...`) is logged
- API keys and secrets — the entire value is replaced with `[REDACTED]`
- Full credit/debit card numbers — only the last 4 digits are logged (e.g., `**** **** **** 1234`)
- Cryptocurrency private keys, seed phrases, or mnemonic words — the entire value is omitted
- KYC document file contents (base64 data, file URLs with auth tokens) — only the document ID and type are logged
- SSN, full date of birth, full address — these are logged only as `[REDACTED_PII]` in production
- Bank account numbers — only the last 4 digits are logged
- Email addresses in full — the local part is masked (e.g., `j***@example.com`) in production

**Implementation:**
The logging utility maintains a list of sensitive field names (recursive key matching on objects and arrays). Before any log is emitted, the metadata object is deep-cloned and all matching keys are redacted. This runs in O(n) time where n is the number of keys in the metadata object. The redaction list is configurable via environment variable `SENSITIVE_FIELDS` (comma-separated) to allow deployment-specific additions.

### 9.4 Error Tracking Integration (Sentry)

Sentry is used for real-time error tracking and alerting on unhandled exceptions. Not all errors are sent to Sentry — only errors that indicate bugs or unexpected behavior.

**Events Sent to Sentry:**
- All `error` and `fatal` level log entries
- All unhandled promise rejections
- All uncaught exceptions
- All errors with `isOperational === false` (programmer errors)
- All 5xx responses

**Events NOT Sent to Sentry:**
- `warn` level logs (expected business errors like validation failures, insufficient balance)
- `info` and `debug` level logs
- Errors from health check endpoints
- Errors from known monitoring/scraping IP addresses

**Breadcrumb Trails:**
Sentry breadcrumbs are automatically captured for:
- HTTP requests (method, URL, status code)
- Database queries (model, operation, duration) — query parameters are not included
- Redis commands (command name only, no keys or values)
- External API calls (service name, method, status code, duration)
- User actions (login, logout, plan purchase, withdrawal request)

**User Context:**
When a user is authenticated, the Sentry event is enriched with:
- `id`: User ID
- `email`: User email (masked in production: `j***@example.com`)
- `role`: User RBAC role
- `ip_address`: Request IP (only first two octets in production: `45.67.*.*`)

**Tags and Context:**
Every Sentry event includes the following tags:
- `environment`: deployment environment
- `service`: api, worker, or cron
- `version`: application version
- `action`: the action being performed when the error occurred
- `error_code`: the API error code (if applicable)

### 9.5 Log Aggregation and Retention

- **Transport**: Logs are written to stdout and collected by the container runtime (Docker/Kubernetes). A log shipping agent (Fluent Bit or Vector) forwards logs to the central log aggregator.
- **Aggregator**: Loki (part of the Grafana stack) is the primary log aggregator. Logs are indexed by `level`, `action`, `userId`, `requestId`, and `environment`.
- **Retention Policies**:
  - `debug` logs: 7 days
  - `info` logs: 30 days
  - `warn` logs: 90 days
  - `error` logs: 1 year
  - `fatal` logs: 2 years (regulatory requirement for financial platforms)
- **Archive**: Logs older than the retention period are moved to cold storage (S3-compatible object storage) and retained for an additional 5 years for audit and compliance purposes.
- **Access Control**: Log access is restricted to engineering team members with the `logs:read` permission. Production logs require MFA for access. Audit logs of who accessed which log entries are maintained.

---

## 10. Client-Side Error Handling

### 10.1 React Error Boundaries

Error boundaries are React components that catch JavaScript errors anywhere in their child component tree, log those errors, and display a fallback UI. TeslaPrimeCapital uses a three-tier error boundary architecture.

**Tier 1 — Layout Level (Root Error Boundary)**
- Placement: Wraps the entire application in the root layout (`app/layout.tsx`).
- Catches: Unhandled errors in any page or component, including rendering errors, event handler errors (when using `react-error-boundary`'s `onError` prop), and async errors caught by the boundary.
- Fallback UI: A full-page error screen with the TeslaPrimeCapital logo, a generic "Something went wrong" message, a "Try Again" button that calls `window.location.reload()`, and a "Report Issue" button that opens a support ticket pre-filled with error details.
- Behavior: When triggered, the error is logged to Sentry with full component stack, and a `fatal`-level log entry is emitted to the server via a dedicated `/api/log/client-error` endpoint.

**Tier 2 — Page Level**
- Placement: Wraps each major page's content area (e.g., the investments page, the wallet page, the KYC page).
- Catches: Errors specific to a single page's functionality (e.g., a chart component crashes, a data table fails to render).
- Fallback UI: An inline error panel within the page layout (navigation remains functional) with a "Something went wrong on this page" message and a "Reload Page" button.
- Behavior: Logs to Sentry with page-specific context. Does NOT unmount the navigation or layout — the user can still navigate to other pages.

**Tier 3 — Feature Level**
- Placement: Wraps specific complex features (e.g., the investment calculator widget, the crypto deposit QR code component, the document upload flow).
- Catches: Errors within a self-contained feature component.
- Fallback UI: A compact error message within the feature's container area with a "Retry" button that re-mounts the feature component.
- Behavior: Logs to Sentry with feature-specific tags. The rest of the page continues to function normally.

### 10.2 TanStack Query Error Callbacks

**Global `queryCache` onError:**
Configured in the TanStack Query client provider. This is the default error handler for all queries.

- Logs the error to the console (in development) and to the server-side logging endpoint (in production).
- Shows a global toast notification: "Failed to load data. Please try again."
- Does NOT refetch automatically — the user must manually trigger a refetch (via pull-to-refresh or a retry button).

**Per-Mutation `onError`:**
Configured on each `useMutation` hook for specific error handling.

- **Deposit mutation `onError`**: Checks if the error code is `WALLET_INSUFFICIENT_BALANCE`. If so, shows a specific toast: "Insufficient balance. Please deposit funds first." with a button linking to the deposit page. For other errors, shows the default error toast.
- **Withdrawal mutation `onError`**: Checks for `WITHDRAWAL_LIMIT_EXCEEDED` and shows the specific limit in the toast. Checks for `KYC_REQUIRED` and shows a toast with a button linking to the KYC page.
- **Investment purchase mutation `onError`**: Checks for `INVESTMENT_INVALID_PLAN` and invalidates the plans query cache to refresh the available plans list.
- **Login mutation `onError`**: Checks for `AUTH_ACCOUNT_LOCKED` and shows the lock duration. Checks for `AUTH_INVALID_CREDENTIALS` and shows a generic "Invalid email or password" message.
- **KYC submission mutation `onError`**: Checks for `VALIDATION_INVALID_FILE` and highlights the specific file upload field.

### 10.3 Network Error Handling

**Offline Detection:**
The app registers event listeners for `navigator.onLine` / `window.addEventListener('online')` / `window.addEventListener('offline')`.
- When offline: A persistent banner appears at the top of the screen: "You are currently offline. Some features may be unavailable."
- When online: The banner is dismissed, and any queued mutations are retried automatically.

**Retry UI for Failed Queries:**
When a TanStack Query fetch fails (network error, server error, timeout), the query enters the `error` state. The component rendering the query data checks `query.isError` and renders a retry UI:
- A centered message: "Unable to load data."
- A "Try Again" button that calls `query.refetch()`.
- If the query has been retried more than 3 times, a "Contact Support" link is shown.

**Timeout Handling:**
- Query requests use a 30-second timeout (configured in the fetch adapter).
- Mutation requests use a 60-second timeout (financial operations may take longer).
- On timeout, the error is surfaced as a `SYSTEM_*` error with a message suggesting the user check their connection and try again.

### 10.4 Form Error Display Patterns

**Inline Field Errors:**
When a `VALIDATION_ERROR` response includes a `details` array, each field error is mapped to the corresponding form field using the `field` path. The form rendering component matches the `field` value to the form's field names and displays the error message directly below the invalid field in red text. The field's border is also highlighted in red.

**Form-Level Errors:**
When a domain error occurs (e.g., `InsufficientBalanceError`, `KYCRequiredError`), the error is displayed at the top of the form in a prominent alert box. The alert box includes the error message, an appropriate icon (warning, info, error), and, when applicable, an action button (e.g., "Deposit Funds" for insufficient balance, "Complete KYC" for KYC required).

**Server-Side Error Mapping:**
The frontend maintains a mapping from API error codes to user-facing recovery actions. This mapping is defined in a shared constants file accessible to both the form components and the mutation `onError` callbacks.

### 10.5 Toast/Notification Error Display

Error toasts are displayed using a toast notification system (Sonner or React Hot Toast) with the following specifications:

- **Position**: Bottom-right corner (desktop), bottom-center (mobile).
- **Duration**: 5 seconds for informational errors, persistent (no auto-dismiss) for critical errors (e.g., `AUTH_ACCOUNT_LOCKED`, financial operation failures).
- **Styling**: Red background for errors, with a close button and, when applicable, an action button.
- **Action Buttons**: Error toasts can include a single action button that navigates the user to a relevant page. Examples:
  - `WALLET_INSUFFICIENT_BALANCE` → "Deposit Funds" button → navigates to `/wallet/deposit`
  - `KYC_REQUIRED` → "Verify Identity" button → navigates to `/kyc`
  - `AUTH_UNAUTHORIZED` → "Sign In" button → navigates to `/login?returnTo={currentPath}`

### 10.6 Global Error Modal for Unexpected Errors

When an error is not a known `VALIDATION_ERROR` or domain error (i.e., it is a 5xx `INTERNAL_ERROR` or a network error that was not handled by more specific logic), a global error modal is displayed.

**Modal Content:**
- Title: "Something Unexpected Happened"
- Body: "We're sorry, an unexpected error occurred. Our team has been automatically notified. You can try again or report this issue for further assistance."
- Request ID: "Reference: {requestId}" (so the user can reference it when contacting support)
- Buttons:
  - "Try Again" (primary): Dismisses the modal and retries the failed action.
  - "Report Issue" (secondary): Opens a support ticket creation flow pre-filled with the request ID, the current URL, and a timestamp.

**Behavior:**
- The modal is rendered as a React portal at the document root level, above all other UI.
- It blocks interaction with the rest of the application until dismissed.
- It is managed by a global error modal store (Zustand) that any component can trigger.
- It is used sparingly — only for truly unexpected errors. Known error codes (validation, domain) should never trigger this modal.

---

## 11. Error Recovery Procedures

### 11.1 Validation Errors (VALIDATION_ERROR, 400)

**Recovery Path:**
1. The frontend receives the error response with the `details` array.
2. Each field error in the `details` array is mapped to the corresponding form field.
3. The invalid fields are highlighted with red borders and the error message is displayed below each field.
4. The form scrolls to the first invalid field (smooth scroll behavior).
5. The user corrects the invalid fields and resubmits.
6. No server-side state change occurred — no cleanup is needed.

**Edge Case — Partial Submission:**
If the request included file uploads, the files are not re-uploaded on retry. Instead, the frontend preserves the uploaded file URLs or temporary file references so the user does not need to re-select files for fields that passed validation.

### 11.2 Authentication Errors (AUTH_*, 401/403/423)

**AUTH_UNAUTHORIZED (401):**
1. The frontend detects the 401 response from any API call.
2. The global response interceptor checks if the error code is `AUTH_UNAUTHORIZED`.
3. The current access token and refresh token are cleared from local storage and memory.
4. The user is redirected to `/login?returnTo={currentPath}` where `currentPath` is the URL the user was on when the error occurred.
5. After successful login, the user is redirected back to the original path.
6. If the login redirect is triggered during a mutation, the mutation's state is reset (no retry after redirect).

**AUTH_FORBIDDEN (403):**
1. The frontend displays a "Permission Denied" page or inline message.
2. For role-based restrictions (e.g., user attempting to access admin area), the user is redirected to their dashboard with a toast: "You do not have permission to access that page."
3. For feature-based restrictions (e.g., KYC required), a specific message with a link to complete the requirement is shown.

**AUTH_ACCOUNT_LOCKED (423):**
1. The login form displays the lock message with the countdown timer (e.g., "Account locked. Try again in 28 minutes.").
2. A client-side timer updates the countdown every second.
3. The login form's submit button is disabled until the lock expires.
4. When the timer reaches zero, the button is re-enabled and the message changes to "You may now try logging in again."

### 11.3 Balance Errors (WALLET_INSUFFICIENT_BALANCE, 422)

**Recovery Path:**
1. The error response includes the user's current balance in the message template: "Insufficient balance. Your current balance is $150.00."
2. The withdrawal or investment form displays this message prominently at the top of the form.
3. An action button "Deposit Funds" is shown alongside the error message.
4. Clicking the button navigates to `/wallet/deposit` with a query parameter `?redirectAfter=withdrawal` or `?redirectAfter=investment&planId={planId}`.
5. After a successful deposit, the user is automatically redirected back to the original action with the updated balance pre-filled.
6. The form field for the amount retains the user's input so they can adjust rather than re-entering.

### 11.4 Rate Limit Errors (RATE_LIMIT_EXCEEDED, 429)

**Recovery Path:**
1. The 429 response includes a `Retry-After` header indicating the number of seconds until the rate limit resets.
2. The frontend reads this header and displays a countdown timer to the user: "Too many requests. Please wait 45 seconds before trying again."
3. The submit button (or action button) is disabled and shows the countdown.
4. When the countdown reaches zero, the button is re-enabled and the message is dismissed.
5. If the user navigates away and back before the timer expires, the rate limit status is re-fetched from the server via a lightweight `/api/rate-limit/status` endpoint.

### 11.5 Server Errors (5xx)

**Recovery Path:**
1. A friendly error message is displayed: "Something went wrong on our end. Please try again."
2. A "Try Again" button is shown. Clicking it re-executes the exact same request (with the same idempotency key for mutations).
3. If the error is a 503 (service unavailable), an additional message is shown: "Our services are temporarily unavailable. We're working on it."
4. If the error persists after 3 manual retries, a "Contact Support" link is shown.
5. The request ID from the error response is displayed so the user can reference it when contacting support.

### 11.6 Network Errors (No Server Response)

**Recovery Path:**
1. The frontend detects a network error when the `fetch` call throws (no response received) or when `navigator.onLine` is `false`.
2. An "Offline" banner is displayed at the top of the screen.
3. For queries (GET requests): TanStack Query's `retryOnMount` setting ensures the query is refetched when the window regains focus (via the `refetchOnWindowFocus` option, enabled by default).
4. For mutations (POST/PUT/PATCH/DELETE): The failed mutation is stored in a local queue (IndexedDB via `tanstack-query-persist-client` or a custom `localStorage` queue).
5. When the network is restored (detected via `online` event), the queued mutations are replayed in order.
6. Each queued mutation includes its original request body, headers, and the API endpoint URL. The idempotency key ensures that replayed mutations are safe even if the original request was partially processed.
7. A toast notification is shown when the network is restored: "You're back online. Retrying your last action..."

---

## 12. Alerting Rules

### 12.1 Alerting Infrastructure

Alerts are managed through Grafana Alerting (paired with the Loki log aggregator) and Sentry alerts. All alerts are routed to a Slack channel (`#tesla-prime-alerts`) and, for `critical` severity, also trigger PagerDuty to page the on-call engineer.

### 12.2 Alert Rules

**Rule 1: 5xx Error Rate Exceeds Threshold**
- **Condition**: The percentage of 5xx responses exceeds 1% of total requests over a 5-minute rolling window.
- **Severity**: `critical`
- **Channels**: Slack, PagerDuty
- **Evaluation**: Every 1 minute
- **Recovery**: Alert clears when 5xx rate drops below 0.5% for 5 consecutive minutes.
- **Rationale**: A sustained 5xx rate above 1% indicates a systemic issue affecting a significant portion of users. Immediate investigation is required.

**Rule 2: Financial Operation Failure (Any)**
- **Condition**: Any single deposit, withdrawal, or investment purchase operation fails with a non-client error (5xx, `DATABASE_ERROR`, `QUEUE_ERROR`, or an unmapped exception).
- **Severity**: `critical`
- **Channels**: Slack, PagerDuty
- **Evaluation**: Immediate (real-time via Sentry alert)
- **Rationale**: Every financial failure is treated as critical because it involves real monetary value. Even a single failure could indicate a data integrity issue.

**Rule 3: Authentication Anomalies — Brute Force Detection**
- **Condition**: More than 10 failed login attempts from a single IP address within a 5-minute window, OR more than 5 failed login attempts for a single user account within a 15-minute window.
- **Severity**: `high`
- **Channels**: Slack
- **Evaluation**: Every 1 minute
- **Response**: The IP address or user account is temporarily added to a watchlist. If the threshold is exceeded by 3x (30 attempts from IP, 15 attempts for user), the IP is blocked at the firewall level and the account is locked.

**Rule 4: Multiple Account Lockouts**
- **Condition**: More than 5 user accounts are locked within a 10-minute window.
- **Severity**: `high`
- **Channels**: Slack
- **Evaluation**: Every 2 minutes
- **Rationale**: A sudden spike in account lockouts could indicate a credential stuffing attack or a systemic issue with the authentication system.

**Rule 5: External Service Failure — Redis**
- **Condition**: Redis connection fails or the circuit breaker for Redis transitions to the `OPEN` state.
- **Severity**: `critical`
- **Channels**: Slack, PagerDuty
- **Evaluation**: Immediate (in-process circuit breaker state change triggers the alert)
- **Rationale**: Redis is used for session management, rate limiting, caching, and BullMQ. A Redis outage degrades nearly every aspect of the platform.

**Rule 6: External Service Failure — Cloudinary**
- **Condition**: Cloudinary circuit breaker transitions to `OPEN` state, OR more than 10 consecutive Cloudinary upload failures.
- **Severity**: `medium`
- **Channels**: Slack
- **Evaluation**: Every 2 minutes
- **Rationale**: Cloudinary outages prevent KYC document uploads and profile image changes. Financial operations are not directly affected.

**Rule 7: External Service Failure — Resend (Email)**
- **Condition**: Resend circuit breaker transitions to `OPEN` state, OR more than 50 email delivery failures in a 30-minute window.
- **Severity**: `medium`
- **Channels**: Slack
- **Evaluation**: Every 5 minutes
- **Rationale**: Email outages prevent OTP delivery, password reset emails, and transaction notifications. Critical for user experience but not for data integrity.

**Rule 8: Database Connection Pool Exhaustion**
- **Condition**: The Prisma connection pool usage exceeds 90% of its maximum capacity (default max: 10 connections per process) for more than 30 seconds.
- **Severity**: `critical`
- **Channels**: Slack, PagerDuty
- **Evaluation**: Every 10 seconds
- **Rationale**: Connection pool exhaustion means the application cannot serve new requests. This is an immediate availability threat.

**Rule 9: Job Queue Depth Exceeds Threshold**
- **Condition**: The number of waiting + active jobs in any BullMQ queue exceeds 1000.
- **Severity**: `high`
- **Channels**: Slack
- **Evaluation**: Every 1 minute
- **Recovery**: Alert clears when queue depth drops below 500 for 5 consecutive minutes.
- **Rationale**: A growing queue indicates that jobs are being produced faster than they are being consumed. This could be caused by a spike in user activity, a slow worker, or a worker crash.

**Rule 10: Dead Letter Queue Growth**
- **Condition**: The number of jobs in the financial DLQ exceeds 10, OR any single DLQ job is older than 1 hour.
- **Severity**: `critical`
- **Channels**: Slack, PagerDuty
- **Evaluation**: Every 1 minute
- **Rationale**: Jobs in the financial DLQ represent failed financial operations that require manual intervention. Any accumulation is urgent.

**Rule 11: Unhandled Exception Spike**
- **Condition**: Sentry receives more than 20 unhandled exception events within a 5-minute window.
- **Severity**: `critical`
- **Channels**: Slack, PagerDuty
- **Evaluation**: Every 1 minute (Sentry alert rule)
- **Rationale**: A spike in unhandled exceptions indicates a potential bug deployment or a cascading failure.

**Rule 12: Crypto Payment Gateway Latency**
- **Condition**: The p95 response time for crypto payment gateway API calls exceeds 10 seconds over a 5-minute window.
- **Severity**: `medium`
- **Channels**: Slack
- **Evaluation**: Every 2 minutes
- **Rationale**: High crypto gateway latency may indicate blockchain network congestion. While not directly harmful, it degrades the deposit/withdrawal user experience and may lead to timeout failures.

### 12.3 Alert Escalation Policy

- **`medium` severity**: Posted to Slack. Monitored by the engineering team during business hours. No on-call notification.
- **`high` severity**: Posted to Slack with `@here` mention. On-call engineer is notified via Slack. If not acknowledged within 30 minutes, escalated to PagerDuty.
- **`critical` severity**: Posted to Slack with `@channel` mention. PagerDuty page sent immediately. If not acknowledged within 15 minutes, escalation to the engineering manager and the CTO.

### 12.4 Alert Runbook References

Each alert includes a link to a runbook document that provides step-by-step instructions for the on-call engineer to diagnose and resolve the issue. Runbooks are maintained in the project's operational documentation repository and are version-controlled alongside the codebase. Each runbook covers:
- Symptoms and confirmation steps
- Likely root causes (ranked by probability)
- Immediate mitigation actions
- Escalation criteria
- Post-incident review checklist

---

## Appendix A: Base AppError Class Interface

The following TypeScript interface defines the contract for all error classes in the TeslaPrimeCapital error hierarchy. All custom error classes must extend this base class.

```typescript
interface AppErrorOptions {
  code: string;           // Machine-readable error code (e.g., "WALLET_INSUFFICIENT_BALANCE")
  message: string;        // User-facing message (never includes internal details)
  statusCode: number;     // HTTP status code (400, 401, 403, 404, 422, 429, 500, 502, 503)
  isOperational: boolean; // true = expected/handled error; false = bug/unexpected
  details?: Array<{       // Field-level errors (only for VALIDATION_ERROR)
    field: string;
    message: string;
  }>;
  metadata?: Record<string, unknown>; // Additional context for logging (never sent to client)
}

abstract class AppError extends Error {
  readonly code: string;
  readonly statusCode: number;
  readonly isOperational: boolean;
  readonly details?: Array<{ field: string; message: string }>;
  readonly metadata?: Record<string, unknown>;

  constructor(options: AppErrorOptions) { /* ... */ }
  toJSON(): ErrorResponse { /* ... */ }
}
```

## Appendix B: Error Code Naming Convention

All error codes follow the pattern `{CATEGORY}_{SPECIFIC_ERROR}` in `SCREAMING_SNAKE_CASE`. Categories are derived from the domain context:

- `AUTH_*` — Authentication and authorization errors
- `USER_*` — User account management errors
- `WALLET_*` — Wallet and balance errors
- `INVESTMENT_*` — Investment plan and portfolio errors
- `DEPOSIT_*` — Deposit operation errors
- `WITHDRAWAL_*` — Withdrawal operation errors
- `REFERRAL_*` — Referral program errors
- `KYC_*` — KYC verification errors
- `NOTIFICATION_*` — Notification delivery errors
- `SUPPORT_*` — Support ticket errors
- `ADMIN_*` — Admin operation errors
- `PAYMENT_*` — Payment processing errors
- `SYSTEM_*` — Infrastructure and system errors
- `VALIDATION_*` — Input validation errors

New error codes must be added to this document and the API error code reference table before being introduced in code. This ensures the frontend team can prepare error handling for new codes before they are deployed.

---

*End of Document*