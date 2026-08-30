# TeslaPrimeCapital — Integration Architecture

> **Version:** 2.0.0-draft  
> **Status:** Phase 2 Design  
> **Last Updated:** 2025-07-13  
> **Audience:** Backend engineers, DevOps, security reviewers

---

## Table of Contents

1. [Integration Architecture Overview](#1-integration-architecture-overview)
2. [Cloudinary Integration](#2-cloudinary-integration)
3. [Resend + React Email Integration](#3-resend--react-email-integration)
4. [Cryptocurrency Payment Integration](#4-cryptocurrency-payment-integration)
5. [Gift Card Deposit Integration](#5-gift-card-deposit-integration)
6. [Redis Integration](#6-redis-integration)
7. [Service Abstraction Layer](#7-service-abstraction-layer)
8. [Webhook Architecture](#8-webhook-architecture)
9. [Error Handling for Integrations](#9-error-handling-for-integrations)
10. [Configuration Management](#10-configuration-management)

---

## 1. Integration Architecture Overview

TeslaPrimeCapital relies on a constellation of external services to deliver its core managed investment platform capabilities. Each external dependency is treated as a bounded integration boundary with a well-defined contract, its own error domain, and an independent lifecycle. The primary external integrations include: **Cloudinary** for all media asset management (user avatars, KYC document uploads, gift card screenshot deposits, and platform branding assets); **Resend** as the transactional and marketing email delivery service, paired with **React Email** for composable, type-safe template rendering; a **Cryptocurrency Payment Processor** supporting BTC, ETH, and USDT for deposits and withdrawals; an **Exchange Rate API** (CoinGecko or Binance public endpoint) for real-time cryptocurrency price feeds used in wallet conversions and display; and an **optional SMS provider** (Twilio or Africa's Talking) for two-factor authentication code delivery.

The overarching integration philosophy follows the **Adapter/Gateway Pattern**: no part of the application core ever imports an external SDK directly. Instead, every external service is wrapped behind a TypeScript interface that describes only the operations the platform needs. A concrete adapter implements that interface by delegating to the real SDK, while a mock adapter implements the same interface with in-memory stubs for testing and development. This separation means swapping CoinGecko for Binance, or Resend for SendGrid, requires changing only one adapter file and a configuration value — zero changes to business logic.

**Dependency Injection** is achieved through a lightweight central factory module (`src/services/index.ts`) that instantiates every service adapter once at application boot and exports typed references. Route handlers and background workers receive their dependencies through function parameters or module-level imports from this factory — never constructing service clients inline. This makes the entire dependency graph visible in one file and trivial to rewire for tests.

**Configuration-driven service selection** means the factory reads environment variables at startup to decide which concrete implementation to bind to each interface. For example, `PAYMENT_PROVIDER=coinbase` loads the Coinbase Commerce adapter, while `PAYMENT_PROVIDER=mock` loads the in-memory fake. The same applies to email (`EMAIL_PROVIDER=resend|mock`), SMS (`SMS_PROVIDER=twilio|disabled`), and exchange rates (`RATE_PROVIDER=coingecko|binance|mock`). Feature flags such as `ENABLE_CRYPTO_DEPOSITS`, `ENABLE_GIFT_CARD_DEPOSITS`, and `ENABLE_SMS_2FA` allow operators to toggle entire integration surfaces without redeploying code. Every configuration value is validated at startup using Zod schemas so misconfigurations are caught immediately rather than at first use in production.

The integration layer is the outermost ring of the architecture. Incoming data from external services is translated into domain events or command results as quickly as possible, keeping the inner domain pure and testable. Outbound calls to external services are similarly initiated from thin adapter shells that accept domain primitives and map them to the SDK-specific request shapes.

**Integration Health Monitoring.** A lightweight health-check system runs alongside the application, periodically probing each external service (e.g., Resend API ping, Cloudinary API ping, crypto provider status endpoint, Redis PING, PostgreSQL SELECT 1). Results are aggregated into a single `GET /api/v1/health/integrations` endpoint that returns a JSON object with the status of each integration (`healthy`, `degraded`, `down`) and the last successful/failed probe timestamp. This endpoint is consumed by the Coolify deployment dashboard and external uptime monitoring services (UptimeRobot, BetterUptime) to trigger alerts. Individual integration failures do not affect the overall platform health status unless they are critical-path services (PostgreSQL, Redis).

---

## 2. Cloudinary Integration

Cloudinary serves as the single media asset management layer for TeslaPrimeCapital. All user-uploaded files and platform-generated images flow through Cloudinary's transform pipeline and are served from their global CDN. The platform never stores or serves media files from its own filesystem.

**Client Setup.** The backend uses the official `cloudinary` Node.js SDK configured with the `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` environment variables. The SDK is initialized once in the service factory and shared across all modules. On the frontend, the Cloudinary Upload widget (or a thin Axios wrapper around the unsigned upload endpoint) is used for direct browser-to-Cloudinary uploads, ensuring the backend never acts as a file proxy.

**Upload Flow (Signed Upload Pattern).** When a user needs to upload a file (avatar, KYC document, or gift card screenshot), the following sequence executes: (1) The frontend calls `POST /api/v1/uploads/presign` with the target folder and file metadata. (2) The backend validates the user's permissions, constructs a Cloudinary upload preset or signed upload parameters using the server-side SDK, and returns the signature, timestamp, and upload URL to the frontend. (3) The frontend uploads the file directly to Cloudinary using these signed parameters. (4) Upon successful upload, Cloudinary fires a notification webhook to `POST /api/v1/webhooks/cloudinary` (or the frontend returns the public_id to the backend in a follow-up API call, depending on the flow). (5) The backend records the `public_id`, secure URL, and metadata in the relevant database record (User.avatarUrl, KycDocument.fileUrl, Deposit.giftCardImageUrl).

**Folder Structure.** All Cloudinary assets are organized into a strict folder hierarchy to enforce access policies and simplify asset management:  
- `avatars/{userId}/` — Profile pictures, one active per user.  
- `kyc/{userId}/{docType}/` — KYC verification documents where `{docType}` is one of `passport`, `drivers-license`, `national-id`, `selfie`, `proof-of-address`.  
- `gift-cards/{depositId}/` — Gift card screenshots, potentially multiple (front and back).  
- `platform/branding/` — Logo, icons, og-images, and other public marketing assets.  
- `platform/email/` — Header banners and footer logos embedded in email templates.

**Access Tiers.** Three distinct access levels govern who can retrieve each asset:  
- **Public (no authentication):** Assets under `platform/branding/` are delivered with a standard Cloudinary public URL. These are cached aggressively at the CDN layer.  
- **Private Signed-URL (authenticated users):** Avatars and gift card images are stored as `type: private` in Cloudinary. The backend generates time-limited signed URLs (default 1-hour expiry) that are included in API responses. The frontend never receives a raw public_id for these resources.  
- **Authenticated Single-Use (KYC documents):** KYC documents are stored as `type: private` with the strictest access controls. Signed URLs for KYC docs are generated with a 15-minute TTL and are only ever served to admin users via the admin review panel. Once an admin has viewed a document, the URL is considered consumed (the backend may track access in an audit log, but Cloudinary itself does not enforce single-use — the short TTL approximates this).

**Transformations.** Cloudinary's on-the-fly transformation chain is leveraged extensively to avoid storing multiple derivative files:  
- **Avatars:** Eager transformations are configured to generate 64px, 128px, and 256px rounded-circle versions at upload time (`eager: c_fill,g_face,r_max,w_64,h_64|w_128,h_128|w_256,h_256`). The API returns the appropriate size based on the requesting context (thumbnail vs. full profile).  
- **Format negotiation:** All image deliveries include `f_auto` to let Cloudinary serve WebP or AVIF to browsers that support them, falling back to JPEG for older clients.  
- **Quality optimization:** `q_auto:good` is applied globally to balance visual fidelity against file size.  
- **Gift card screenshots:** Delivered at original resolution for admin review; `q_auto:good` and `f_auto` are still applied to reduce bandwidth.

**Fallback Strategy.** If Cloudinary becomes unreachable: (1) The upload presign endpoint returns a 503 with a user-facing message that uploads are temporarily unavailable. (2) Existing signed URLs that have already been generated continue to work until their TTL expires (CDN edge cache). (3) Failed uploads are not retried automatically on the client; the user is prompted to retry manually. (4) The system emits an `integration.cloudinary.unhealthy` event that triggers an admin alert. (5) If the outage persists, an operator can set `ENABLE_UPLOADS=false` to globally disable upload-dependent features (avatar changes, KYC submissions, gift card deposits) without taking the entire platform offline.

---

## 3. Resend + React Email Integration

Email delivery at TeslaPrimeCapital is handled by **Resend** as the transport layer and **React Email** as the templating engine. This combination provides type-safe, component-composable email templates with production-grade deliverability metrics.

**Email Service Layer.** A dedicated `EmailService` class acts as the single entry point for all outgoing emails. It exposes a single public method: `send(templateId: string, to: string | string[], data: TemplateData): Promise<SendResult>`. Internally, the method: (1) Looks up the template ID in the **Template Registry** (a static map of template identifiers to React Email component functions). (2) Renders the React Email component to HTML using `render()` from `@react-email/render`. (3) Also renders a plain-text fallback using `render()` with the `plainText` option. (4) Constructs a Resend `SendEmail` payload with the rendered HTML, plain text, subject (extracted from template metadata or the data object), from address (configured via `EMAIL_FROM_ADDRESS`), and reply-to address. (5) Enqueues the payload into the **BullMQ Email Queue** rather than calling Resend directly, ensuring no synchronous I/O blocks the request handler.

**Template Registry.** The registry is a plain TypeScript record mapping string keys (e.g., `'welcome'`, `'deposit_confirmed'`) to lazy-loaded React Email components. Each template component receives a typed props object specific to that template. Shared layout components — `EmailLayout` (outer HTML shell with DOCTYPE, meta tags), `EmailHeader` (TeslaPrimeCapital logo and brand bar in red/black), `EmailBody` (content area with consistent padding and typography), and `EmailFooter` (unsubscribe link, physical address, and preference center URL) — are composed into every template. The brand palette (#B71C1C red, #1A1A1A near-black, #F5F5F5 off-white background) is applied through CSS-in-JS within the layout components.

**Queue Architecture.** All email sends flow through a dedicated BullMQ queue named `email`. The queue is configured with: `concurrency: 5` (five parallel Resend API calls), `attempts: 3` (retry up to three times), and an `exponential backoff` strategy starting at 5 seconds and capping at 5 minutes between retries. Jobs in this queue carry a `category` field that determines priority: **Transactional** emails (deposit confirmed, withdrawal processed, investment matured, commission credited) are given `priority: 1` and processed immediately. **Security** emails (OTP verification, password reset, login alert, new device detected, security alert) are given `priority: 1` as well — they are time-sensitive. **System** emails (KYC status change, support ticket update) are `priority: 3`. **Marketing** emails (monthly statements, promotional offers) are `priority: 5` and are additionally scheduled for delivery via a `delay` property to respect send-time optimization.

**Required Templates.** The following email templates must be implemented at launch, each with its React Email component and typed data interface:  
- `welcome` — Sent immediately after registration. Contains the user's name, a brief platform overview, and a "complete your profile" CTA.  
- `otp_verification` — Delivers a 6-digit one-time code. The code is rendered in a large monospaced font with a 10-minute validity notice.  
- `password_reset` — Contains a time-limited reset link (30-minute expiry) and warns the user to ignore the email if they did not request the reset.  
- `login_alert` — Notifies the user of a new login with IP address, device type, and location (if available). Includes a "secure your account" link if the login was unrecognized.  
- `new_device` — Similar to login_alert but specifically for device additions to the trusted device list.  
- `deposit_confirmed` — Confirms a crypto or gift card deposit with amount, currency, transaction hash (crypto) or reference ID (gift card), and updated wallet balance.  
- `withdrawal_processed` — Confirms a withdrawal with amount, destination address, transaction hash, and expected blockchain confirmation time.  
- `investment_matured` — Notifies the user that an investment plan has reached maturity with the principal returned and profit credited, including a summary table.  
- `commission_credited` — Alerts a referrer that their referral commission has been credited, showing the referral's masked name and the commission amount.  
- `kyc_status_change` — Informs the user of a KYC verification result (approved, rejected, or additional documents required) with next steps.  
- `support_ticket_update` — Notifies the user when their support ticket receives a new response, including a snippet of the message and a link to view the full thread.  
- `security_alert` — Generic security notification for suspicious activity (e.g., multiple failed login attempts, account lockout), with recommended actions.

**Webhook Integration.** Resend sends webhook events to `POST /api/v1/webhooks/resend` for `email.delivered`, `email.bounced`, and `email.complained` events. The webhook handler updates the user's `emailReputation` score in the database: bounces decrement the score, complaints decrement it more aggressively, and successful deliveries increment it slowly. If a user's reputation score drops below a threshold, the system flags their account for review and may suppress non-essential emails. All webhook payloads are validated using Resend's HMAC-SHA256 signature before processing.

**Email Sending Reliability.** Beyond the BullMQ retry mechanism, the email system implements a dead-letter pattern: if an email job exhausts all retries, it is moved to an `email:dead-letter` BullMQ queue. A weekly automated job scans the dead-letter queue and generates an admin report listing undeliverable emails, the failure reason, and the affected users. Administrators can manually retry individual emails or bulk-retry the entire queue after resolving the underlying issue (e.g., expired API key, invalid sender domain). This ensures that no transactional email is silently lost.

---

## 4. Cryptocurrency Payment Integration

Cryptocurrency is the primary deposit and withdrawal channel for TeslaPrimeCapital. The platform supports three assets: **Bitcoin (BTC)**, **Ethereum (ETH)**, and **Tether (USDT)** on their respective native networks (Bitcoin mainnet for BTC, Ethereum mainnet for ETH and USDT ERC-20). Integration is designed to be provider-agnostic through the `PaymentGateway` abstraction, with the initial implementation targeting a provider such as Coinbase Commerce, NOWPayments, or a self-managed HD wallet solution via a Bitcoin/Ethereum node.

**Deposit Flow.** The end-to-end deposit process follows these steps:  
1. **Initiation:** The user navigates to the deposit page, selects their preferred cryptocurrency (BTC, ETH, or USDT), and optionally enters a custom amount in USD. The frontend calls `POST /api/v1/deposits/crypto/initiate` with `{ currency: 'BTC' | 'ETH' | 'USDT', expectedAmountUsd?: number }`.  
2. **Address Generation:** The backend delegates to `PaymentGateway.createDepositAddress(userId, currency)` which returns a unique deposit address and a `depositId`. Some providers generate a unique address per deposit; others reuse a static address and differentiate by payment reference. The backend creates a `Deposit` record with status `pending` and stores the generated address.  
3. **Display:** The frontend displays the deposit address as both a copyable string and a QR code, along with the equivalent amount in the selected crypto (converted using the cached exchange rate) and a countdown timer (deposits expire after a configurable window, default 24 hours).  
4. **Fund Transfer:** The user sends funds from their personal wallet to the provided address. The platform has no control over this step; it simply waits for confirmation.  
5. **Webhook Notification:** The payment provider sends a webhook to `POST /api/v1/webhooks/crypto` when the blockchain transaction is detected. The payload includes the transaction hash, amount, currency, confirmations count, and the provider's deposit ID.  
6. **Verification:** The backend retrieves the pending `Deposit` record, verifies that the received amount matches the expected amount (within a configurable tolerance, default ±2% for volatile assets, exact for USDT), and checks the confirmation count against the required threshold (1 for USDT, 3 for ETH, 3 for BTC).  
7. **Wallet Credit:** Once verified, the backend executes an atomic database transaction that: updates the `Deposit` status to `completed`, credits the user's `Wallet` balance (converted to the platform's base currency, USD, using the rate at the time of deposit confirmation, not initiation), creates a `WalletTransaction` record, and emits a `deposit.completed` domain event.  
8. **Notification:** The domain event triggers an email notification (`deposit_confirmed` template) via the email queue and a real-time UI notification via Redis Pub/Sub.

**Withdrawal Flow.**  
1. **Request:** The user submits `POST /api/v1/withdrawals` with `{ currency, amount, destinationAddress }`. The backend validates the withdrawal amount against the user's available wallet balance and any per-transaction or daily limits.  
2. **Pending Review:** The withdrawal is created with status `pending_approval`. For amounts below a configured auto-approval threshold (e.g., $1,000), the system may auto-approve. Otherwise, it enters the admin review queue.  
3. **Admin Approval:** An admin reviews the withdrawal in the admin panel, verifying the destination address and user identity. The admin approves or rejects the withdrawal with an optional note.  
4. **Execution:** Upon approval, the backend calls `PaymentGateway.sendWithdrawal(withdrawalId, destinationAddress, amount, currency)`. The provider (or self-managed node) signs the transaction and broadcasts it to the blockchain, returning a transaction hash.  
5. **Confirmation Monitoring:** The system polls `PaymentGateway.getTransactionStatus(transactionHash)` periodically (or relies on webhooks) until the required number of blockchain confirmations is reached.  
6. **Completion:** The backend updates the `Withdrawal` status to `completed`, debits the user's wallet (if not already debited at step 2), and triggers the `withdrawal_processed` email notification. If the transaction fails on-chain, the status is set to `failed` and the user's wallet is re-credited.

**Exchange Rate Service.** A background BullMQ worker (`exchange-rate-worker`) fetches the latest BTC/USD, ETH/USD, and USDT/USD prices from the configured exchange rate API (CoinGecko free tier or Binance public REST endpoint) every 60 seconds. The fetched rates are stored in Redis under the key `rates:crypto` as a JSON object with a timestamp. All rate lookups read from this Redis cache. If the cached rate is older than 120 seconds (two missed refresh cycles), the system falls back to fetching on-demand with a staled-cache-while-revalidate pattern. A rate is never considered stale for more than 5 minutes; beyond that, crypto deposit/withdrawal features are temporarily disabled and an admin alert is emitted.

**PaymentGateway Interface.** The abstract `PaymentGateway` interface defines the following contract:  
- `createDepositAddress(userId: string, currency: SupportedCrypto): Promise<DepositAddressResult>`  
- `verifyDeposit(depositId: string, providerTxId: string): Promise<DepositVerificationResult>`  
- `sendWithdrawal(withdrawalId: string, destinationAddress: string, amount: string, currency: SupportedCrypto): Promise<WithdrawalResult>`  
- `getTransactionStatus(txHash: string, currency: SupportedCrypto): Promise<TransactionStatus>`  
- `getCurrentRates(): Promise<CryptoRateMap>`  

Each supported provider implements this interface. The factory selects the implementation based on `PAYMENT_PROVIDER` environment variable.

---

## 5. Gift Card Deposit Integration

Gift card deposits provide an alternative funding method for users who may not have access to cryptocurrency exchanges. The flow is deliberately asynchronous and human-in-the-loop, as gift card valuation requires manual verification.

**End-to-End Flow.**  
1. **Method Selection:** The user selects "Gift Card" from the deposit method list on the deposit page. The frontend displays supported gift card brands (e.g., Amazon, Apple, Google Play, iTunes, Visa/Mastercard prepaid) and prompts the user to specify the card brand, face value, and optionally the card code (depending on whether the platform collects codes or only screenshots).  
2. **Screenshot Upload:** The user is prompted to upload one or two images of the physical or digital gift card. If it is a physical card, both the front (showing the card number and brand) and the back (showing the PIN/security code and scratch-off area) are required. For digital cards, a single screenshot of the email or receipt containing the full code is sufficient. The upload uses the Cloudinary signed upload flow described in Section 2, targeting the `gift-cards/{depositId}/` folder.  
3. **Deposit Record Creation:** The frontend calls `POST /api/v1/deposits/gift-card` with `{ cardBrand, faceValue, currency, imageUrls: string[] }`. The backend creates a `Deposit` record with `method: 'GIFT_CARD'`, `status: 'pending_verification'`, and stores the Cloudinary public IDs and secure URLs. A `GiftCardDeposit` sub-record (or embedded JSON field) stores the card-specific metadata.  
4. **Queue Submission:** The deposit ID is enqueued to a dedicated BullMQ queue named `gift-card-review` with `concurrency: 3`. This queue does not perform automated processing — its purpose is to serialize access to the admin review pool and track processing timeouts. A separate timeout job is scheduled; if the deposit is not reviewed within 24 hours, an escalation alert is sent to the admin team.  
5. **Admin Review:** Admins access the review queue via the admin panel at `/admin/deposits/gift-cards`. Each pending deposit card shows: the user's name and email, the uploaded card images (rendered from Cloudinary signed URLs), the declared card brand and face value, the deposit timestamp, and the user's KYC verification status. The admin can **Approve** (entering the verified face value, which may differ from the declared value), **Reject** (entering a reason), or **Request More Info** (asking the user for additional photos or clarification).  
6. **Wallet Credit:** On approval, the backend executes the same atomic wallet-crediting transaction as crypto deposits: updates the `Deposit` status to `completed`, credits the user's wallet (typically at a discount rate, e.g., 70–85% of face value depending on the card brand, configurable via `GIFT_CARD_PAYOUT_RATES`), creates a `WalletTransaction`, and emits a `deposit.completed` event.  
7. **Notification:** The user receives a `deposit_confirmed` email (or a `deposit_rejected` email if rejected) with the details and, if applicable, the adjusted credited amount.

**Screenshot Requirements and Validation.** The backend enforces the following constraints on all uploaded gift card images:  
- **Format:** JPEG (`image/jpeg`) or PNG (`image/png`) only. WebP and other formats are rejected at the presign stage.  
- **File size:** Maximum 8 MB per image. The Cloudinary preset enforces this limit server-side as a secondary check.  
- **Minimum resolution:** 300×300 pixels. Images below this threshold are rejected with a clear error message asking the user to retake the photo at higher resolution.  
- **Magic byte validation:** The backend inspects the first few bytes of the uploaded file (via the Buffer returned from Cloudinary's upload response metadata or a lightweight validation before presign) to confirm the file is a genuine JPEG (`FF D8 FF`) or PNG (`89 50 4E 47`). This prevents users from uploading non-image files renamed with image extensions.  
- **Maximum images per deposit:** 2 (front and back). Additional uploads are rejected.

**Fraud Detection Measures.**  
- **Duplicate card detection:** The backend maintains a Redis set `gift-cards:seen-hashes` containing perceptual hashes (pHash) of all previously submitted gift card images. Before accepting a new upload, the system computes the pHash of the uploaded image and checks for near-duplicate matches (Hamming distance < 10) in the set. Matches flag the deposit for manual review with a "possible duplicate" warning.  
- **Rate limiting:** Each user is limited to a maximum of 5 gift card deposit submissions per 24-hour rolling window, enforced via Redis sorted-set rate limiting.  
- **Manual review threshold:** All gift card deposits with a declared face value exceeding $500 are automatically flagged for senior admin review and are not eligible for junior admin approval.  
- **User reputation:** Users with a history of rejected gift card deposits (more than 2 rejections in 30 days) have their subsequent gift card deposits automatically flagged and require senior review regardless of amount.

---

## 6. Redis Integration

Redis is the operational backbone of TeslaPrimeCapital's real-time and performance-critical features. It serves six distinct roles, each with its own key namespace and lifecycle policy.

**Client Configuration.** The platform uses the `ioredis` Node.js client with connection pooling via a small custom wrapper. The pool maintains up to 10 connections (configurable via `REDIS_POOL_SIZE`) to handle concurrent BullMQ workers, session reads, and cache operations without connection starvation. The primary Redis instance is configured via `REDIS_URL` (e.g., `redis://redis:6379/0`). TLS is supported for managed Redis services via `REDIS_TLS=true`. Connection health is verified at startup and periodically (every 30 seconds) via a `PING` command; if the primary goes down, the circuit breaker opens (see Section 9) and the system degrades gracefully.

**Use Cases.**

1. **Session Storage.** User sessions (after JWT-based authentication) are stored as Redis hashes under the key pattern `session:{sessionId}`. Each hash contains `userId`, `ip`, `userAgent`, `createdAt`, `lastActivityAt`, and `deviceFingerprint`. Sessions have a configurable TTL (default 7 days) that is refreshed on each authenticated request (sliding expiry). On logout, the session key is deleted. The admin "revoke all sessions" action scans and deletes all keys matching `session:*` for a given userId.

2. **Rate Limiting.** All API rate limits are enforced using Redis sorted sets implementing the **sliding window** algorithm. The key pattern is `ratelimit:{routePattern}:{userIdOrIp}`. Each request adds the current timestamp as a member with score equal to the timestamp. Before processing, the system counts members within the window `[now - windowSize, now]` and rejects the request if the count exceeds the limit. Expired members are pruned on each check using `ZREMRANGEBYSCORE`. Rate limits are defined per route category: auth endpoints (10 req/min), general API (60 req/min), admin API (120 req/min), file uploads (5 req/min), gift card submissions (5 req/hour).

3. **Cache-Aside Caching.** Frequently accessed, rarely changing data is cached in Redis using the **cache-aside** pattern. Cached items include: cryptocurrency exchange rates (`rates:crypto`, TTL 120s), user profile summaries (`cache:user:{userId}:profile`, TTL 300s), platform configuration/settings (`cache:platform:settings`, TTL 600s), and investment plan details (`cache:plans:active`, TTL 300s). The cache key pattern is `cache:{category}:{identifier}`. Cache invalidation is explicit — on any write operation that modifies the source data, the corresponding cache key is deleted, and the next read repopulates it. No TTL-only expiration is relied upon for correctness.

4. **BullMQ Backing Store.** Redis is the persistent backing store for all BullMQ queues (email, gift-card-review, exchange-rate-refresh, webhook-processing). BullMQ uses its own key namespace (`bull:{queueName}:*`) internally. No manual key management is needed for queue operations, but operators should be aware that queue data contributes to overall Redis memory usage.

5. **OTP Storage.** One-time passwords (for email-based login verification and 2FA) are stored in Redis under the key `otp:{userId}:{purpose}` (where purpose is `login`, `withdrawal`, or `admin_login`). The value is the SHA-256 hash of the OTP (never the plaintext). TTL is 10 minutes. Each OTP key also stores the attempt count; after 5 failed verifications, the OTP is invalidated and a new one must be requested.

6. **Pub/Sub.** Redis Pub/Sub enables real-time notifications across the platform. Channels include: `notifications:user:{userId}` (for user-specific events like deposit confirmed, investment matured), `admin:events` (for admin dashboard updates like new deposit pending, new user registered), and `system:health` (for infrastructure health events). The Next.js frontend subscribes to user-specific channels via Server-Sent Events (SSE) or a lightweight WebSocket bridge. Admin clients subscribe to `admin:events`. Publishers are domain event handlers that fire after successful state mutations.

**Key Naming Convention.** All keys follow the pattern `{category}:{entity}:{identifier}` with lowercase, hyphen-separated segments. This convention is enforced in a shared `redis-keys.ts` utility module that provides typed key-builder functions (e.g., `sessionKey(id)`, `rateLimitKey(route, userId)`, `cacheKey(category, id)`) to prevent ad-hoc key construction and namespace collisions.

**Persistence.** Redis is configured with both RDB snapshots (every 15 minutes) and AOF logging (`appendonly yes`, `appendfsync everysec`). This ensures that session data, rate limit counters, and cache survive Redis restarts with at most one second of data loss. BullMQ job state is also preserved across restarts.

**Memory.** A minimum of 1 GB of Redis memory is recommended for production. The expected breakdown: BullMQ queues (~200 MB at typical load), sessions (~100 MB for 10K active sessions), rate limit sorted sets (~50 MB), cache data (~150 MB), OTP and Pub/Sub (~negligible). The remaining ~500 MB provides headroom for traffic spikes. `maxmemory-policy` is set to `allkeys-lru` so that under memory pressure, the least recently used cache keys are evicted first while session and queue keys (which are accessed frequently) are preserved.

**Failure Handling.** If Redis becomes unavailable: (1) The circuit breaker opens and all Redis operations throw `RedisUnavailableError`. (2) **Cache misses** fall through to the database — the cache-aside pattern degrades gracefully to direct DB reads. (3) **Rate limiting** is temporarily relaxed (all requests are allowed) and a warning is logged; this is acceptable for short outages. (4) **Sessions** fall back to JWT-only validation (the token is still valid, but session-specific features like "revoke session" are unavailable). (5) **BullMQ queues** pause processing until Redis recovers; jobs remain in the queue and resume automatically. (6) **OTP verification** falls back to database-stored OTPs (a secondary storage path that is written to in parallel with Redis).

---

## 7. Service Abstraction Layer

The Service Abstraction Layer (SAL) is the architectural mechanism that decouples TeslaPrimeCapital's business logic from every external dependency. It is not a framework or library — it is a disciplined pattern enforced through TypeScript interfaces, factory functions, and project structure conventions.

**Core Principle.** Every external service is represented by a TypeScript interface that declares only the methods the platform needs. The interface lives in `src/services/types/` and contains no implementation details, no SDK types, and no HTTP-specific concerns. For example, the `PaymentGateway` interface knows about `DepositAddressResult` and `WithdrawalResult` — domain concepts — not about HTTP status codes or provider-specific webhook schemas.

**Four-Artefact Pattern.** Each external service integration consists of exactly four artefacts:  

1. **Interface (`src/services/types/{service}.ts`):** A TypeScript interface or type alias that defines the contract. This is the single source of truth for what the service can do. Example — `PaymentGateway` interface with methods for creating deposit addresses, verifying deposits, sending withdrawals, checking transaction status, and fetching rates.  

2. **Concrete Implementation (`src/services/implementations/{provider}-{service}.ts`):** The real adapter that imports the external SDK and translates between the platform's domain types and the provider's API types. This file is the only place in the entire codebase where the external SDK is imported. Example — `CoinbasePaymentGateway` implements `PaymentGateway` using the Coinbase Commerce REST API.  

3. **Mock/Fake Implementation (`src/services/implementations/mock-{service}.ts`):** An in-memory implementation that satisfies the same interface with deterministic behavior. Used in development, CI, and unit tests. Mocks simulate success paths, configurable failure paths, and realistic delays. Example — `MockPaymentGateway` stores deposits in a `Map`, always returns a fixed deposit address, and can be configured to simulate webhook events.  

4. **Factory Function (`src/services/{service}.ts`):** A factory function that reads the environment configuration and returns either the concrete or mock implementation. Example — `createPaymentGateway()` reads `PAYMENT_PROVIDER` and returns `new CoinbasePaymentGateway(config)` or `new MockPaymentGateway()`. The factory is called once at application startup, and the returned instance is stored in the central DI container.

**Central DI Container (`src/services/index.ts`).** This module imports all factory functions, calls each one, and exports the resulting service instances as named exports. The file looks approximately like:  

```
export const emailService = createEmailService(config.email);
export const paymentGateway = createPaymentGateway(config.payment);
export const storageService = createStorageService(config.storage);
export const cacheService = createCacheService(config.cache);
export const smsService = createSmsService(config.sms);
export const rateService = createRateService(config.rates);
```

Route handlers import from this module: `import { paymentGateway } from '@/services'`. In tests, the entire module is mocked at the jest/vitest level, or individual services are replaced via dependency injection parameters on the handler functions. No service is ever instantiated inside a route handler or business logic function.

**Benefits of This Approach.**  
- **Testability:** Every business logic test runs against mock services with zero network I/O. Tests are fast, deterministic, and can simulate edge cases (timeouts, rate limits, partial failures) by configuring the mock.  
- **Swappability:** Switching from Resend to SendGrid, or from CoinGecko to Binance, requires writing a new adapter file, adding a case to the factory, and updating one environment variable. No business logic changes.  
- **Visibility:** The DI container provides a single file that lists every external dependency and its current binding. New engineers can understand the integration surface by reading one file.  
- **Safety:** TypeScript ensures that every implementation satisfies the interface at compile time. If a provider changes their API, the concrete adapter fails to compile until it is updated, while the rest of the application continues to work against the unchanged interface.  
- **Feature Flags:** The factory can return a `NoOpService` implementation (methods that log warnings and return empty results) when an integration is disabled via feature flag, preventing runtime errors while cleanly degrading functionality.

---

## 8. Webhook Architecture

Webhooks are the primary mechanism by which TeslaPrimeCapital receives asynchronous notifications from external services. The platform currently handles webhooks from two sources: the cryptocurrency payment provider (deposit and withdrawal status updates) and Resend (email delivery events). Additional webhook sources (SMS delivery receipts, Cloudinary upload confirmations) may be added in the future.

**Endpoint Design.** All incoming webhooks are received at a single route pattern: `POST /api/v1/webhooks/{provider}`. The `{provider}` path parameter identifies the source (e.g., `crypto`, `resend`, `cloudinary`). Each provider has a dedicated handler registered in a webhook router. The router validates the provider name against an allowlist and returns 404 for unknown providers, preventing arbitrary endpoint enumeration.

**Webhook Security — Signature Verification.** Every incoming webhook request must pass cryptographic signature verification before any processing occurs. The verification steps are:  
1. Extract the signature header from the request. Each provider uses a different header name (e.g., `X-Webhook-Signature` for the crypto provider, `X-Resend-Signature` for Resend).  
2. Retrieve the corresponding signing secret from the configuration (`CRYPTO_WEBHOOK_SECRET`, `RESEND_WEBHOOK_SECRET`).  
3. Compute the HMAC-SHA256 hash of the raw request body using the secret.  
4. Compare the computed hash with the provided signature using a constant-time string comparison (`crypto.timingSafeEqual`) to prevent timing attacks.  
5. If the signatures do not match, log the attempt (including IP address and request body prefix) and return `401 Unauthorized`. The request body is not parsed or processed further.

**Asynchronous Processing via BullMQ.** Webhook handlers never perform business logic synchronously. After verifying the signature, the handler: (1) Parses the request body into a provider-specific DTO, (2) Validates the DTO structure using Zod, (3) Enqueues a job to the `webhook-processing` BullMQ queue with the provider name, event type, and payload as the job data, and (4) Immediately returns `200 OK` with an empty body. This ensures the webhook response is always fast (under 100ms) and the provider never experiences a timeout, which could trigger unwanted retry behavior on their end.

**Idempotency.** Each webhook provider includes a unique event identifier in their payload (e.g., `event_id`, `id`, or a combination of `timestamp + provider_ref`). The webhook handler checks Redis for the key `webhook:processed:{provider}:{eventId}` before enqueuing the job. If the key exists, the webhook is a duplicate and the handler returns `200 OK` without re-enqueuing. If the key does not exist, the handler creates it with a TTL of 7 days (configurable) and proceeds. This prevents duplicate processing caused by provider-side retries or network-level request duplication. The idempotency check is performed synchronously (before the BullMQ enqueue) because it must complete within the webhook response window.

**Webhook Processing Workers.** The `webhook-processing` BullMQ queue has dedicated worker(s) that consume jobs and route them to the appropriate domain handler based on the provider and event type. For example:  
- `provider: 'crypto', event: 'deposit.confirmed'` → triggers deposit verification and wallet crediting logic.  
- `provider: 'crypto', event: 'withdrawal.completed'` → updates withdrawal status and notifies the user.  
- `provider: 'resend', event: 'email.delivered'` → increments user email reputation score.  
- `provider: 'resend', event: 'email.bounced'` → decrements reputation score and flags account if below threshold.  
- `provider: 'resend', event: 'email.complained'` → decrements reputation score aggressively and may trigger account suspension.

**Retry Strategy.** If a webhook processing job fails (throws an error), BullMQ retries it with exponential backoff: 3 attempts total, with delays of 10 seconds, 60 seconds, and 5 minutes. If all retries are exhausted, the job is moved to the `webhook-processing:failed` queue where it can be inspected and retried manually by an admin via the BullBoard dashboard (or a custom admin UI). Failed webhook jobs include the full original payload and error details for debugging.

**Logging and Observability.** Every incoming webhook request is logged at `info` level with: provider name, event type, event ID, request timestamp, processing duration, and outcome (accepted, duplicate, rejected). Failed processing jobs are logged at `error` level with the full error stack trace. These logs are critical for debugging payment discrepancies and email delivery issues.

---

## 9. Error Handling for Integrations

Every external service integration is wrapped in a dedicated error-handling layer that translates provider-specific errors into domain-level error types, prevents cascading failures through circuit breaking, and defines explicit fallback behaviors for each service. The goal is to ensure that a failure in any single integration never crashes the platform or corrupts user data.

**Error Mapping.** Each service adapter catches errors from the external SDK and re-throws a domain-specific error class. These domain error classes live in `src/errors/` and extend a base `IntegrationError` class that carries: the original error, the service name, a user-friendly message, a machine-readable error code, and the timestamp. The mapping is as follows:  

- **Cloudinary errors** (upload failures, transformation errors, API rate limits) are caught and re-thrown as `FileUploadError`. The error code distinguishes between `UPLOAD_FAILED` (generic), `FILE_TOO_LARGE`, `INVALID_FORMAT`, `QUOTA_EXCEEDED`, and `SERVICE_UNAVAILABLE`.  
- **Resend errors** (API failures, invalid recipient, template rendering errors) are caught and re-thrown as `EmailDeliveryError`. Error codes include `SEND_FAILED`, `INVALID_RECIPIENT`, `TEMPLATE_ERROR`, `RATE_LIMITED`, and `SERVICE_UNAVAILABLE`.  
- **Cryptocurrency payment errors** (address generation failures, transaction broadcast failures, insufficient funds, network timeouts) are caught and re-thrown as `PaymentProcessingError`. Error codes include `ADDRESS_GENERATION_FAILED`, `TRANSACTION_FAILED`, `INSUFFICIENT_FUNDS`, `NETWORK_TIMEOUT`, `INVALID_ADDRESS`, and `SERVICE_UNAVAILABLE`.  
- **Exchange rate errors** (API failures, stale data) are caught and re-thrown as `RateFetchError`. Error codes include `FETCH_FAILED` and `STALE_DATA`.  
- **SMS errors** (delivery failures, invalid number) are caught and re-thrown as `SmsDeliveryError`.  
- **Redis errors** (connection failures, command timeouts) are caught and re-thrown as `CacheError`.

**Circuit Breaker.** A lightweight circuit breaker implementation wraps every external service call. The circuit breaker tracks the number of consecutive failures for each service. When the failure count reaches the configured threshold (default: 5 consecutive failures), the circuit **opens** — all subsequent calls to that service immediately throw `ServiceUnavailableError` without attempting the real call. After a configurable cooldown period (default: 30 seconds), the circuit transitions to **half-open** state, allowing a single probe request through. If the probe succeeds, the circuit **closes** and normal operation resumes. If the probe fails, the circuit remains open and the cooldown timer resets. Circuit breaker state transitions are logged and emitted as system events (`integration.{service}.circuit_opened`, `integration.{service}.circuit_closed`) for monitoring and alerting.

**Fallback Behaviors.** Each service defines what happens when it is unavailable (circuit open or explicit disable flag):  

| Service | Fallback Behavior |
|---|---|
| **Cloudinary** | Disable upload-dependent features (avatar change, KYC upload, gift card deposit). Existing signed URLs continue working until TTL expires. Serve branding assets from a secondary CDN or local fallback directory. |
| **Resend** | Queue emails in BullMQ with extended retry. After 1 hour of continuous failure, switch to a log-only mode where email content is written to a persistent log table for later manual review/sending. |
| **Crypto Payments** | Disable deposit and withdrawal initiation. Existing pending transactions continue to be monitored. Display "temporarily unavailable" in the UI. |
| **Exchange Rates** | Serve the last known good rate from a persistent cache (database, not just Redis). If no cached rate exists, disable crypto deposit features and display a warning. Rates older than 5 minutes are considered stale and trigger a warning. |
| **SMS** | Fall back to email-based OTP delivery. If both SMS and email are down, disable 2FA requirement temporarily and log a critical security alert. |
| **Redis** | Degrade as described in Section 6: cache misses fall through to DB, rate limiting is relaxed, sessions fall back to JWT-only. |

**Logging and Context.** Every integration error is logged with structured context including: the service name, the operation attempted, the input parameters (sanitized — no API keys, secrets, or PII), the full error object from the provider SDK, the circuit breaker state at the time of the error, and the request ID for traceability. Error logs use the `error` level and are routed to both the application log and an external error tracking service (Sentry, configurable via `SENTRY_DSN`).

**User-Facing Error Messages.** Domain errors carry a `userMessage` field that is safe to display to end users. This message never exposes internal implementation details, stack traces, or provider-specific jargon. For example, a `PaymentProcessingError` with code `NETWORK_TIMEOUT` displays "We couldn't process your transaction right now. Please try again in a few minutes." to the user, while the full error context is logged server-side.

---

## 10. Configuration Management

All external service configuration at TeslaPrimeCapital is managed exclusively through environment variables. No credentials, API keys, URLs, secrets, or service-specific settings are ever hardcoded in the source code, committed to version control, or embedded in client-side bundles. This section defines the configuration schema, validation strategy, and operational patterns.

**Environment Variable Schema.** Every configuration value is defined in a central Zod schema (`src/config/schema.ts`). The schema categorizes variables into groups and enforces types, formats, and constraints. Example groups and key variables include:

- **App:** `NODE_ENV` (enum: development, staging, production), `APP_URL`, `API_URL`, `PORT`.  
- **Database:** `DATABASE_URL` (PostgreSQL connection string), `DATABASE_POOL_SIZE` (default 10).  
- **Redis:** `REDIS_URL`, `REDIS_POOL_SIZE`, `REDIS_TLS` (boolean).  
- **Cloudinary:** `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `CLOUDINARY_UPLOAD_PRESET`.  
- **Resend:** `RESEND_API_KEY`, `EMAIL_FROM_ADDRESS`, `EMAIL_FROM_NAME`.  
- **Cryptocurrency Payments:** `PAYMENT_PROVIDER` (enum: coinbase, nowpayments, mock), `CRYPTO_API_KEY`, `CRYPTO_API_SECRET`, `CRYPTO_WEBHOOK_SECRET`, `CRYPTO_WEBHOOK_URL`, `CRYPTO_MIN_CONFIRMATIONS_BTC`, `CRYPTO_MIN_CONFIRMATIONS_ETH`, `CRYPTO_MIN_CONFIRMATIONS_USDT`.  
- **Exchange Rates:** `RATE_PROVIDER` (enum: coingecko, binance, mock), `RATE_REFRESH_INTERVAL_SECONDS` (default 60), `RATE_STALE_THRESHOLD_SECONDS` (default 120).  
- **SMS (optional):** `SMS_PROVIDER` (enum: twilio, africastalking, disabled), `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`.  
- **Feature Flags:** `ENABLE_CRYPTO_DEPOSITS` (boolean, default true), `ENABLE_GIFT_CARD_DEPOSITS` (boolean, default true), `ENABLE_SMS_2FA` (boolean, default false), `ENABLE_REGISTRATION` (boolean, default true).  
- **Operational:** `CIRCUIT_BREAKER_FAILURE_THRESHOLD` (default 5), `CIRCUIT_BREAKER_COOLDOWN_SECONDS` (default 30), `BULLMQ_CONCURRENCY_EMAIL` (default 5), `BULLMQ_CONCURRENCY_GIFT_CARD` (default 3).

**Startup Validation.** When the application boots (both the Next.js server and any standalone worker processes), the configuration module reads all environment variables, parses them through the Zod schema, and immediately throws a descriptive error if any required variable is missing, malformed, or logically invalid (e.g., `CRYPTO_MIN_CONFIRMATIONS_BTC` is negative). This "fail fast" approach ensures that misconfigured deployments never reach a half-functional state. The validation error message lists all invalid variables with their expected types and current values (secrets are masked).

**Environment-Specific Overrides.** The application supports `.env`, `.env.local`, `.env.staging`, and `.env.production` files via Next.js built-in environment file loading. In non-production environments, a `.env.example` file is provided that documents all required variables with placeholder values. The `.env.example` file is committed to version control; actual `.env` files are gitignored.

**Secret Management in Production.** In production deployments (via Coolify), environment variables are injected through the container orchestration layer. Coolify's secret management (or a linked HashiCorp Vault / cloud KMS) is the recommended approach for storing and rotating sensitive values. API key rotation is supported: the configuration module can read from a primary and secondary key, and the service adapters can be designed to try the primary first and fall back to the secondary during rotation windows.

**Feature Flags.** Boolean feature flags (`ENABLE_*`) control whether entire integration surfaces are active. When a flag is set to `false`: (1) The service factory returns a `NoOpService` implementation that logs warnings and returns empty/no-op results. (2) The corresponding UI elements (deposit buttons, 2FA setup, registration form) are hidden or disabled. (3) API endpoints return `403 Forbidden` with a message indicating the feature is temporarily disabled. Feature flags can be changed without redeploying by updating environment variables and restarting the process (or, in a more advanced setup, by reading flags from a Redis key that is polled every 60 seconds).

**Configuration Access Pattern.** The validated and parsed configuration object is created once at startup and exported as a singleton from `src/config/index.ts`. All service factories, middleware, and utility modules import from this single source. The configuration object is deeply readonly (enforced via TypeScript's `Readonly` and `as const` assertions) to prevent accidental mutation at runtime. No module ever calls `process.env` directly after startup — all access goes through the validated config object.

**Documentation.** The `.env.example` file serves as the living documentation for all configuration variables. Each variable includes a comment describing its purpose, valid values, and default (if applicable). This file is the single source of truth for configuration documentation and must be updated whenever new integrations are added or existing ones change their configuration surface.

---

## Appendix A: Integration Dependency Map

```
┌─────────────────────────────────────────────────────────────────┐
│                     TeslaPrimeCapital Platform                   │
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌──────────────┐  │
│  │ Next.js   │  │ REST API │  │ BullMQ    │  │ Admin Panel  │  │
│  │ Frontend  │──│ Backend  │──│ Workers   │──│ (Next.js)    │  │
│  └────┬─────┘  └────┬─────┘  └─────┬─────┘  └──────┬───────┘  │
│       │              │               │                 │         │
│  ┌────▼──────────────▼───────────────▼─────────────────▼──────┐ │
│  │              Service Abstraction Layer (SAL)                │ │
│  │  ┌────────────┐ ┌────────────┐ ┌──────────┐ ┌───────────┐ │ │
│  │  │ Storage    │ │ Email      │ │ Payment  │ │ Rate      │ │ │
│  │  │ Service    │ │ Service    │ │ Gateway  │ │ Service   │ │ │
│  │  └─────┬──────┘ └─────┬──────┘ └────┬─────┘ └─────┬─────┘ │ │
│  └────────┼──────────────┼──────────────┼──────────────┼───────┘ │
│           │              │              │              │         │
│  ┌────────▼──────┐ ┌─────▼──────┐ ┌────▼──────┐ ┌────▼──────┐  │
│  │  Cloudinary   │ │  Resend    │ │ Coinbase  │ │ CoinGecko │  │
│  │  (CDN/Upload) │ │  (Email)   │ │ /NOWPay   │ │ /Binance  │  │
│  └───────────────┘ └────────────┘ └───────────┘ └───────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                   Shared Infrastructure                   │   │
│  │  ┌──────────┐  ┌──────────┐  ┌────────────────────────┐ │   │
│  │  │ PostgreSQL│  │  Redis   │  │  Docker / Coolify      │ │   │
│  │  │ (Prisma) │  │ (ioredis)│  │  (Deployment)          │ │   │
│  │  └──────────┘  └──────────┘  └────────────────────────┘ │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Appendix B: Service Interface Summary

| Interface | Methods | Concrete Impl (Prod) | Mock Impl |
|---|---|---|---|
| `StorageService` | `getSignedUploadToken()`, `getSignedUrl()`, `deleteAsset()`, `getTransformedUrl()` | `CloudinaryStorageService` | `MockStorageService` |
| `EmailService` | `send()`, `sendBatch()`, `getTemplatePreview()` | `ResendEmailService` | `MockEmailService` |
| `PaymentGateway` | `createDepositAddress()`, `verifyDeposit()`, `sendWithdrawal()`, `getTransactionStatus()`, `getCurrentRates()` | `CoinbasePaymentGateway` | `MockPaymentGateway` |
| `RateService` | `getCurrentRates()`, `convertUsdToCrypto()`, `convertCryptoToUsd()` | `CoinGeckoRateService` / `BinanceRateService` | `MockRateService` |
| `SmsService` | `sendOtp()`, `verifyOtp()` | `TwilioSmsService` | `MockSmsService` / `NoOpSmsService` |
| `CacheService` | `get()`, `set()`, `del()`, `invalidatePattern()` | `RedisCacheService` | `InMemoryCacheService` |

## Appendix C: Environment Variable Reference

| Variable | Required | Default | Description |
|---|---|---|---|
| `NODE_ENV` | Yes | — | Application environment (development, staging, production) |
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `REDIS_URL` | Yes | — | Redis connection URL |
| `CLOUDINARY_CLOUD_NAME` | Yes | — | Cloudinary cloud identifier |
| `CLOUDINARY_API_KEY` | Yes | — | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Yes | — | Cloudinary API secret |
| `RESEND_API_KEY` | Yes | — | Resend API key for email delivery |
| `EMAIL_FROM_ADDRESS` | Yes | — | Sender email address (must be verified in Resend) |
| `PAYMENT_PROVIDER` | Yes | — | Payment gateway (coinbase, nowpayments, mock) |
| `CRYPTO_API_KEY` | Yes | — | Payment provider API key |
| `CRYPTO_WEBHOOK_SECRET` | Yes | — | HMAC secret for webhook signature verification |
| `RATE_PROVIDER` | No | `coingecko` | Exchange rate data source |
| `SMS_PROVIDER` | No | `disabled` | SMS provider (twilio, africastalking, disabled) |
| `ENABLE_CRYPTO_DEPOSITS` | No | `true` | Toggle cryptocurrency deposit feature |
| `ENABLE_GIFT_CARD_DEPOSITS` | No | `true` | Toggle gift card deposit feature |
| `ENABLE_SMS_2FA` | No | `false` | Toggle SMS-based two-factor authentication |
| `ENABLE_REGISTRATION` | No | `true` | Toggle new user registration |
| `CIRCUIT_BREAKER_FAILURE_THRESHOLD` | No | `5` | Consecutive failures before circuit opens |
| `CIRCUIT_BREAKER_COOLDOWN_SECONDS` | No | `30` | Seconds before half-open probe attempt |
| `BULLMQ_CONCURRENCY_EMAIL` | No | `5` | Parallel email sending workers |
| `BULLMQ_CONCURRENCY_GIFT_CARD` | No | `3` | Parallel gift card review workers |
| `GIFT_CARD_PAYOUT_RATES` | No | `{}` | JSON map of card brand to payout percentage |
| `CACHE_SERVICE_TTL_DEFAULT` | No | `300` | Default cache TTL in seconds |
| `GIFT_CARD_MAX_AMOUNT_AUTO` | No | `500` | Max gift card amount for junior admin approval |
| `GIFT_CARD_MAX_SUBMISSIONS_PER_DAY` | No | `5` | Rate limit for gift card submissions per user |
| `DEPOSIT_EXPIRY_HOURS` | No | `24` | Hours before a pending crypto deposit expires |
| `WITHDRAWAL_AUTO_APPROVAL_MAX` | No | `1000` | Max withdrawal amount (USD) for auto-approval |

---

*End of document.*