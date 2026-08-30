# System Architecture

**Project:** Enterprise Investment Platform — Phase 1  
**Version:** 1.0.0  
**Last Updated:** 2025-01  
**Status:** Approved  

This document describes the high-level and detailed system architecture for the enterprise investment platform. The architecture is designed for Phase 1 deployment on Coolify with Docker, prioritizing operational simplicity while maintaining clear boundaries for future scaling. See [SYSTEM_REQUIREMENTS](./SYSTEM_REQUIREMENTS.md) for hardware and software specifications.

---

## 1. Architecture Overview

The platform follows a monorepo structure containing separate frontend and backend applications that share TypeScript type definitions. The monorepo is managed with pnpm workspaces, allowing the frontend to import shared types (API request/response shapes, enums, constants) directly from a shared package without a separate publish step.

The end-to-end request flow proceeds as follows: a user's browser or mobile device issues an HTTPS request that first hits a CDN edge node for static asset caching. Dynamic requests are forwarded to the origin server, where a reverse proxy (Traefik via Coolify or standalone Nginx) performs SSL termination and routes the request. Next.js server-side renders the initial page HTML, which is returned to the browser. Client-side JavaScript then hydrates the page and makes API calls to the backend. These API calls travel through the same reverse proxy, which routes `/api/v1/*` requests to the backend container. The backend container validates authentication, processes business logic, interacts with PostgreSQL for data persistence and Redis for caching/session management, and returns JSON responses. Background tasks (email dispatch, investment maturity processing, notification generation) are offloaded to a BullMQ worker process that runs in a separate container but shares the same codebase as the backend.

This architecture ensures that the frontend can be deployed and scaled independently from the backend, even though they share a single repository. Each service has its own Dockerfile, its own container, and its own resource allocation within Coolify.

---

## 2. Architecture Style

### 2.1 Monolithic with Modular Internal Structure

Phase 1 adopts a monolithic architecture with a strongly modularized internal structure. The backend is a single Node.js application, but its code is organized into distinct domain modules (auth, users, wallets, investments, deposits, withdrawals, referrals, kyc, notifications, support, admin) with clear interface boundaries. Each module exports a router (Express/Fastify), a service layer, and has its own validation schemas. Cross-module communication happens through direct function calls within the same process, which eliminates network latency and simplifies debugging.

### 2.2 Rationale for Monolithic Approach

This architectural decision is driven by three factors specific to Phase 1:

**Team Size and Velocity:** With a small team, a monolith eliminates the operational overhead of managing inter-service communication, distributed transactions, service discovery, and separate deployment pipelines. A single deployment covers all backend changes, reducing the risk of partial deployments and version skew between services.

**Coolify Deployment Constraints:** Coolify excels at deploying containerized applications but is not designed for complex orchestration patterns like service meshes, canary deployments, or inter-service networking beyond basic Docker networking. A monolith maps cleanly to Coolify's deployment model: one or two containers (API + worker) per service definition.

**Future Extraction Path:** The modular internal structure means that extracting a module into a standalone microservice in a future phase requires moving the module's code into a separate repository, adding HTTP or message queue communication, and updating the calling modules. No refactoring of the module's internal code is necessary. The investment maturity processor and email dispatch system are already separated into the worker process, making them natural first candidates for extraction.

---

## 3. System Components

### 3.1 Frontend Application (Next.js with App Router)

The frontend is a Next.js application using the App Router (introduced in Next.js 13 and stabilized in 14+). It serves as both the server-side rendered web application and the client-side single-page application after hydration.

**Server Responsibilities:** The Next.js server handles SSR for initial page loads (critical for SEO and first-contentful-paint performance), API route proxies for server-to-server calls that require server-side secrets, and middleware for authentication checks and locale detection for multi-language routing.

**Client Responsibilities:** The browser-side application handles all interactive UI (forms, modals, charts, real-time notifications), state management with TanStack Query for server state and React Context for client state (theme, locale, auth state), and optimistic updates for responsive user experience.

**Styling and Theming:** Tailwind CSS provides the utility-first styling layer. The platform's visual identity — a red and black premium fintech aesthetic inspired by Tesla's design language — is implemented through a custom Tailwind theme configuration with defined color palettes, typography scales, and spacing systems. Dark theme is the primary mode; light mode is available through a CSS class toggle on the `<html>` element.

**Internationalization:** Multi-language support is implemented at the routing level (`/en/dashboard`, `/fr/dashboard`, `/es/dashboard`) with next-intl or a comparable library. Translation files are JSON-based and loaded per locale. The default locale is English with additional languages added based on target market analysis.

### 3.2 Backend API Server (Node.js/Express or Fastify)

The backend is a Node.js HTTP server built with Express.js or Fastify. It exposes a versioned REST API at `/api/v1/` and serves as the single entry point for all business logic.

**Layer Architecture:** The backend follows a four-layer internal architecture: (1) **Routes/Controllers** — receive HTTP requests, validate input with Zod schemas, and call service methods; (2) **Services** — contain all business logic, orchestrate data access, and enforce business rules; (3) **Data Access (Prisma)** — database queries organized by domain, using Prisma's type-safe query builder; (4) **Shared** — utilities, constants, types, and middleware used across all layers.

**Middleware Stack:** The API server applies middleware in a specific order: request logging, request ID generation, CORS headers, rate limiting (per-endpoint), authentication (JWT verification), authorization (role/permission checks), request body parsing and validation, route handler execution, response compression, and error handling.

**Dual Mode Handling:** Every financial endpoint (deposits, withdrawals, investments) is mode-aware. The backend checks the user's active mode (demo or live) and routes operations to the corresponding wallet. Demo mode uses the same code paths but with isolated wallet records and no actual cryptocurrency or financial transactions. This ensures feature parity between modes without code duplication.

### 3.3 PostgreSQL Database

PostgreSQL serves as the primary relational database for all persistent data storage. It handles user accounts, financial records (wallets, transactions, investments, deposits, withdrawals), referral tree structures, KYC documents, audit logs, support tickets, and application configuration.

PostgreSQL is chosen for its ACID compliance, which is non-negotiable for financial data integrity. Its native JSON/JSONB support allows flexible metadata storage (e.g., transaction metadata, audit log details) without sacrificing queryability. Full-text search capabilities support the support ticket search and notification search features without requiring a separate search engine for Phase 1. See [DATABASE_REQUIREMENTS](./DATABASE_REQUIREMENTS.md) for the complete schema design.

### 3.4 Redis Cache Layer

Redis serves multiple critical functions in the platform architecture:

**Session and Token Management:** Refresh token versions and session metadata (device, IP, last activity) are stored in Redis for fast lookup during authentication and session validation. Redis's TTL (time-to-live) feature automatically expires sessions when the refresh token expires, eliminating the need for periodic cleanup jobs.

**Rate Limiting:** All API rate limits are enforced using Redis counters with sliding window or fixed window algorithms. Rate limit state must be shared across multiple backend instances if the API is scaled horizontally, making Redis the natural choice over in-process rate limiting.

**Job Queue (BullMQ):** BullMQ uses Redis as its backing store for job queues, job states, delayed jobs, and retry logic. The investment maturity processor, email dispatcher, and notification generator all run as BullMQ jobs.

**Caching:** Frequently accessed, rarely changing data (investment plan definitions, exchange rates, application configuration) is cached in Redis with appropriate TTLs to reduce database load.

### 3.5 Cloudinary Media Service

Cloudinary handles all media uploads and transformations. The platform uses Cloudinary for two primary use cases: KYC document uploads (government-issued ID cards, selfie photos, proof of address documents) and gift card screenshot uploads for deposit verification.

Uploads use Cloudinary's signed upload mechanism, where the backend generates a short-lived upload signature that the frontend includes with the upload request. This prevents unauthorized uploads to the platform's Cloudinary account. KYC documents are stored in a dedicated Cloudinary folder with restricted delivery — images are only accessible through signed, time-limited URLs generated by the backend. Cloudinary transformations (resize, format conversion, quality reduction) are applied during upload to normalize all documents to consistent dimensions and file sizes for efficient storage and review.

### 3.6 Email Service (Resend + React Email)

The email service is built on two layers: Resand for delivery and React Email for template authoring.

**React Email** allows email templates to be written as React components, sharing the same design system and component patterns as the frontend application. This ensures visual consistency between the in-app experience and email communications. Templates are defined once in a shared package and rendered to HTML by both the frontend (for preview during development) and the backend (for actual delivery).

**Resend** handles the actual email delivery. The backend constructs the email payload (recipient, subject, HTML body from React Email rendering), sends it through the Resend API, and processes delivery status webhooks to update notification records. Resend is chosen over alternatives (SendGrid, Mailgun) for its developer experience, modern API design, and competitive pricing for the expected email volume.

### 3.7 Background Job Processor (BullMQ with Redis)

BullMQ is the background job processing system built on Redis. It runs in a separate Docker container (the "worker") using the same codebase as the backend API server. The worker process does not expose any HTTP endpoints; it only processes jobs from Redis queues.

Key job types include:

- **Investment Maturity Processing:** A scheduled job runs every minute to check for investments that have reached their maturity date. When an investment matures, the expected return is calculated and credited to the user's wallet as a return transaction.
- **Email Dispatch:** Email jobs are queued by the API server (e.g., "send verification email to user X") and processed by the worker to avoid blocking API response times.
- **Notification Generation:** When a financial event occurs (deposit confirmed, withdrawal processed, investment matured), a notification job creates in-app notification records and triggers email notifications.
- **Exchange Rate Refresh:** A recurring job fetches the latest exchange rates from the external API and caches them in Redis.
- **Audit Log Cleanup:** A scheduled job archives or purges old audit log entries based on the data retention policy defined in [DATABASE_REQUIREMENTS](./DATABASE_REQUIREMENTS.md).

---

## 4. Data Flow

### 4.1 User Registration Flow

1. User submits registration form (email, password, optional referral code) from the Next.js frontend.
2. Frontend validates input locally (password strength, email format) and sends POST `/api/v1/auth/register` to the backend.
3. Backend validates input server-side with Zod, checks email uniqueness and referral code validity.
4. Backend hashes the password with argon2id, creates the user record (status: pending_verification, kycLevel: 0), and creates the referral relationship if a code was provided.
5. Backend creates a demo wallet and a live wallet (both with zero balances) for the new user.
6. Backend queues an email job (send verification OTP to user's email).
7. Backend returns a success response indicating that email verification is required.
8. Frontend navigates to the OTP verification screen.
9. User enters the 6-digit OTP. Frontend sends POST `/api/v1/auth/verify-email`.
10. Backend verifies the OTP (checks hash, expiry, attempt count), updates user status to `active`.
11. Backend returns access and refresh tokens. Frontend stores access token in memory and receives refresh token as an HTTP-only cookie.

### 4.2 Deposit Flow (Cryptocurrency)

1. User navigates to the deposit page and selects cryptocurrency (BTC, ETH, or USDT).
2. Frontend sends POST `/api/v1/deposits/crypto/initiate` with the selected currency and amount.
3. Backend creates a `Deposits` record with status `pending`, generates or retrieves a unique deposit address for the user/currency combination, and returns the address and QR code data to the frontend.
4. User sends cryptocurrency from their external wallet to the provided address.
5. The cryptocurrency monitoring service (either a payment processor webhook or a polling job in the worker) detects the incoming transaction on the blockchain.
6. Once the transaction reaches the configured number of confirmations, the worker updates the deposit status to `confirmed`.
7. The worker credits the deposit amount (converted to USD at the current rate) to the user's wallet and creates a transaction record.
8. The worker queues notification and email jobs to inform the user of the successful deposit.
9. If the deposit amount does not match the expected amount (for addresses expecting exact amounts), the deposit is flagged for manual review.

### 4.3 Deposit Flow (Gift Card)

1. User navigates to the deposit page and selects "Gift Card" as the payment method.
2. User selects the card brand, enters the card value and currency, and uploads a screenshot of the gift card.
3. The screenshot is uploaded to Cloudinary via signed upload, and the resulting URL is sent with the deposit request.
4. Frontend sends POST `/api/v1/deposits/gift-card` with the deposit details and Cloudinary URL.
5. Backend creates a `Deposits` record (status: `pending_verification`) and a `GiftCardDeposits` record with the card details.
6. Backend queues a notification job to alert the admin team of a new gift card deposit requiring verification.
7. An admin reviews the gift card screenshot, verifies the card value and validity, and approves or rejects the deposit.
8. On approval, the admin's action triggers the backend to credit the wallet, update the deposit status to `confirmed`, and notify the user.
9. On rejection, the backend updates the deposit status to `rejected`, records the rejection reason, and notifies the user.

### 4.4 Investment Flow

1. User views available investment plans on the dashboard (fetched from GET `/api/v1/investments/plans`).
2. User selects a plan and enters the investment amount. Frontend validates that the amount falls within the plan's min/max range.
3. Frontend sends POST `/api/v1/investments/create` with the plan ID and amount.
4. Backend validates: user is KYC Level 1+ (for live mode), wallet has sufficient available balance, amount is within plan limits, and no conflicting active investments if applicable.
5. Backend locks the investment amount in the wallet (reduces `availableBalance`, increases `lockedBalance`), creates an `Investments` record with status `active`, and creates a transaction record (type: `investment`).
6. Backend queues a notification job confirming the investment activation.
7. The BullMQ maturity processor checks active investments every minute. When an investment's end date is reached, it calculates the expected return based on the plan's return rate and duration.
8. The worker unlocks the principal (moves from `lockedBalance` back to `availableBalance`), credits the return amount, creates a return transaction, and updates the investment status to `completed`.
9. User is notified via in-app notification and email of the investment completion and return credited.

### 4.5 Withdrawal Flow

1. User navigates to the withdrawal page and enters the withdrawal amount and destination (crypto address for crypto withdrawal, bank details if applicable).
2. Frontend sends POST `/api/v1/withdrawals/create` with the withdrawal details.
3. Backend validates: wallet has sufficient available balance, 2FA is enabled (mandatory for withdrawals), minimum withdrawal amount is met, and the destination address is valid.
4. Backend deducts the withdrawal fee (21%) from the gross amount, calculates the net amount, reduces the wallet balance, creates a `Withdrawals` record with status `pending`, and creates a transaction record.
5. Backend queues notification jobs to alert the user and the admin team.
6. An admin reviews the withdrawal request, verifies the user's identity and destination address, and approves or rejects it.
7. On approval, the admin processes the actual cryptocurrency transfer externally, then marks the withdrawal as `processed` in the system.
8. User is notified of the withdrawal status update.

### 4.6 Referral Commission Flow

1. User B registers using User A's referral code during sign-up (handled in the registration flow).
2. Backend creates a `Referrals` record linking User B to User A, and creates a `BinaryNode` record placing User B in User A's binary tree.
3. When User B makes a qualifying deposit or investment, the backend calculates User A's referral commission (10% of User B's deposit/investment amount).
4. Backend creates a `ReferralCommissions` record and credits the commission to User A's wallet.
5. For the binary bonus structure, the worker periodically evaluates binary tree performance (left vs. right leg volumes) and calculates binary bonuses based on the weaker leg's volume.
6. Binary bonuses are distributed weekly, with `ReferralCommissions` records created for each recipient with type `binary` and the applicable `weekNumber`.
7. Users are notified of all referral commissions via in-app notifications and optional email summaries.

---

## 5. Deployment Architecture

### 5.1 Docker Container Layout

The platform runs as five Docker containers in production, orchestrated by Coolify using Docker Compose under the hood:

| Container | Image Source | Purpose | Port (Internal) |
|-----------|-------------|---------|-----------------|
| frontend | Custom Dockerfile (Next.js build) | Serves the SSR web application | 3000 |
| backend | Custom Dockerfile (Node.js) | REST API server | 4000 |
| worker | Same image as backend (different CMD) | BullMQ background job processor | None (no HTTP) |
| postgres | Official postgres:16-alpine | PostgreSQL database | 5432 |
| redis | Official redis:7-alpine | Redis cache and job queue | 6379 |

The frontend and backend containers are stateless — all persistent state is in PostgreSQL or Redis. This allows them to be restarted, scaled, or replaced without data loss. The worker container is also stateless; it derives all job context from the Redis queue and PostgreSQL database.

### 5.2 Docker Compose for Local Development

The local development environment uses a Docker Compose file that starts only the infrastructure dependencies (PostgreSQL, Redis). The frontend and backend run directly on the host machine using `pnpm dev` for hot-reloading and faster development cycles. This avoids the overhead of rebuilding Docker images on every code change.

```yaml
# Conceptual structure — actual compose file will define volumes, networks, health checks
services:
  postgres:
    image: postgres:16-alpine
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: investment_platform
      POSTGRES_USER: platform_user
      POSTGRES_PASSWORD: ${DATABASE_PASSWORD}
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes
```

### 5.3 Coolify Deployment Configuration

In Coolify, the application is configured as a single service definition with the docker-compose production file. Coolify handles:

- **Git Pull and Build:** Automatically pulls the latest commit from the configured branch, builds Docker images, and deploys containers.
- **Health Checks:** Each container defines a health check endpoint or command. Coolify monitors these and restarts unhealthy containers.
- **Environment Variables:** Managed through Coolify's UI, stored securely, and injected into containers at startup.
- **SSL Certificates:** Coolify's built-in Traefik integration provisions Let's Encrypt certificates automatically.
- **Rollback:** If a deployment fails health checks, Coolify can roll back to the previous working container image.
- **Resource Limits:** CPU and memory limits are configured per container in the Coolify service settings.

---

## 6. Network Architecture

### 6.1 External Traffic Flow

All external traffic enters the system through the reverse proxy. In the recommended Coolify setup, Traefik serves as the reverse proxy. In a manual setup, Nginx fills this role. The proxy handles SSL termination, meaning that internal container-to-container communication occurs over plain HTTP within the encrypted Docker network.

**Request Routing:**
- Requests to `/` and all non-API paths → routed to the frontend container (port 3000).
- Requests to `/api/v1/*` → routed to the backend container (port 4000).
- Requests to `/api/v1/auth/refresh` → routed to the backend (handles refresh token cookie).
- WebSocket connections (if any in future phases) → routed through the proxy with appropriate upgrade headers.

### 6.2 Internal Network

Docker Compose creates an internal bridge network (e.g., `platform_default`) that connects all five containers. Only the proxy exposes ports to the host machine. The internal network rules are:

- The frontend container can reach the backend container at `http://backend:4000` (for SSR API calls if needed).
- The backend container can reach PostgreSQL at `postgres:5432` and Redis at `redis:6379`.
- The worker container can reach PostgreSQL and Redis on the same internal hostnames.
- PostgreSQL and Redis cannot initiate outbound connections to the internet (no external packages installed in minimal Alpine images).
- The frontend container does not directly access PostgreSQL or Redis.

### 6.3 Security Boundaries

The network architecture enforces several security boundaries: (1) the public internet can only reach the proxy on ports 80 and 443; (2) database and cache ports are not exposed to the host; (3) the worker container has no public-facing ports at all; (4) all internal traffic is unencrypted (acceptable within a single-host Docker deployment) but could be upgraded to mTLS if the architecture moves to multi-host in future phases. See [SECURITY_REQUIREMENTS](./SECURITY_REQUIREMENTS.md) for the complete security architecture.

---

## 7. Technology Justification

### 7.1 Next.js (App Router)

Next.js provides server-side rendering out of the box, which is essential for the platform's SEO requirements (investment plan pages, marketing landing pages must be indexable by search engines). The App Router (React Server Components) enables granular control over which components render on the server vs. the client, reducing the JavaScript bundle sent to the browser. Next.js also provides built-in image optimization, internationalized routing, and middleware for authentication checks. No alternative framework (Remix, Nuxt, plain Create React App) combines SSR, API routes, image optimization, and middleware in a single cohesive package.

### 7.2 TypeScript

TypeScript is mandatory across the entire codebase (frontend, backend, shared types). It eliminates an entire class of runtime errors (type mismatches, null reference errors, missing properties) that are particularly dangerous in financial applications where incorrect data handling could result in monetary loss. The shared type package ensures that the frontend and backend agree on API contracts at compile time, preventing the common disconnect between API documentation and actual implementation.

### 7.3 Tailwind CSS

Tailwind CSS enables rapid UI development with a utility-first approach that avoids the specificity and naming conflicts of traditional CSS methodologies. For this platform, the critical advantage is the custom theme configuration: the red-and-black color palette, typography scale, and spacing system are defined once in `tailwind.config.ts` and applied consistently across every component. Dark mode is implemented via a CSS class toggle that Tailwind natively supports, avoiding the complexity of maintaining separate dark mode stylesheets.

### 7.4 PostgreSQL over Alternatives

PostgreSQL is chosen over MySQL/MariaDB for its superior JSON support (JSONB with indexing and querying), better concurrency handling (MVCC without read locks), full-text search (eliminating the need for Elasticsearch in Phase 1), and stronger compliance with SQL standards. PostgreSQL is chosen over MongoDB because the platform's data is inherently relational (users have wallets, wallets have transactions, transactions reference investments) and ACID compliance is non-negotiable for financial data. Prisma's first-class PostgreSQL support ensures type-safe database access.

### 7.5 Redis over Alternatives

Redis is the de facto standard for caching, session management, and job queues in Node.js ecosystems. BullMQ (built on Redis) provides reliable, priority-based job processing with retry logic, delayed jobs, and dead-letter queues — all essential for financial operations that must not be lost. Redis is chosen over Memcached because Memcached lacks data structures (lists, sorted sets) needed for BullMQ's queue implementation, and Redis provides persistence options (AOF, RDB) to survive restarts.

### 7.6 Prisma ORM

Prisma provides type-safe database queries that catch errors at compile time rather than runtime. Its schema definition language is intuitive and readable, serving as both the migration source and the type generation source. Prisma's migration system handles schema versioning, and Prisma Studio provides a visual database browser for development. Alternatives (TypeORM, Drizzle, raw SQL with pg) either lack the same level of type safety, have more complex APIs, or require more boilerplate for common operations.

### 7.7 BullMQ over Alternatives

BullMQ is chosen over alternatives (Agenda, Bull, node-cron) for its Redis-based architecture (no separate message broker needed), comprehensive job lifecycle management (waiting, active, completed, failed, delayed), priority queues, rate limiting, and pause/resume capabilities. Its compatibility with Redis 7's native functions provides performance advantages over the older Bull library.

### 7.8 Cloudinary over Alternatives

Cloudinary is chosen over direct S3 storage for its built-in image transformations (resize, format conversion, quality optimization), which are essential for normalizing user-uploaded KYC documents and gift card screenshots of varying sizes and formats. Its signed upload mechanism provides security without building custom upload authentication. The restricted delivery feature (signed URLs) ensures KYC documents are never publicly accessible.

### 7.9 Resend over Alternatives

Resend is chosen over SendGrid and Mailgun for its modern developer experience (clean API, excellent TypeScript support, React Email integration), competitive pricing for the expected email volume, and superior analytics dashboard. Its webhook system provides real-time delivery status updates that feed into the platform's notification tracking system.