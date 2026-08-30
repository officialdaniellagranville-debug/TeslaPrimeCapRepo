# System Requirements

**Project:** Enterprise Investment Platform — Phase 1  
**Version:** 1.0.0  
**Last Updated:** 2025-01  
**Status:** Approved  

This document specifies the complete hardware, software, network, and environmental requirements for deploying and operating the enterprise investment platform in production. All requirements are calibrated for a global user base operating in both demo and live modes simultaneously.

---

## 1. Hardware Requirements

### 1.1 Production Server Specifications

The production environment runs as a set of Docker containers orchestrated through Coolify. The following specifications represent minimum requirements for a stable production deployment handling up to 10,000 concurrent users. For larger scale, each component should be scaled independently.

#### Application Server (Frontend + Backend + Worker)

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| CPU | 4 vCPU (x86_64 or ARM64) | 8 vCPU |
| RAM | 4 GB | 8 GB |
| Storage | 40 GB SSD | 80 GB NVMe SSD |
| Network | 100 Mbps | 1 Gbps |

The application server hosts three containerized services: the Next.js frontend (SSR rendering), the Node.js backend API server, and the BullMQ background worker process. The SSR rendering is memory-intensive due to server-side component rendering, and the worker process needs sufficient memory to handle concurrent investment maturity processing, email dispatch, and notification generation without triggering OOM kills.

#### Database Server (PostgreSQL)

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| CPU | 2 vCPU | 4 vCPU |
| RAM | 4 GB | 16 GB |
| Storage | 50 GB SSD | 200 GB NVMe SSD |
| Network | 100 Mbps | 1 Gbps |

PostgreSQL performance is heavily dependent on shared_buffers and work_mem configurations, both of which require substantial RAM. The database stores all financial transactions, user data, KYC documents metadata, audit logs, and referral tree structures. NVMe SSD storage is strongly recommended because WAL writes and index scans are I/O-bound operations that directly affect deposit and withdrawal processing latency.

#### Redis Server

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| CPU | 1 vCPU | 2 vCPU |
| RAM | 2 GB | 4 GB |
| Storage | 10 GB SSD | 20 GB SSD |
| Network | 100 Mbps | 1 Gbps |

Redis serves as the cache layer, session store, rate-limiting backend, and BullMQ job queue broker. The memory requirement scales primarily with the number of active sessions and queued background jobs. During peak investment maturity windows (when multiple plans complete simultaneously), the job queue may temporarily hold thousands of jobs, each consuming memory until processed.

#### Coolify Host Machine

If Coolify is self-hosted rather than using Coolify Cloud, the host machine must accommodate all services plus the Coolify management overhead:

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| CPU | 8 vCPU | 16 vCPU |
| RAM | 16 GB | 32 GB |
| Storage | 200 GB SSD | 500 GB NVMe SSD |
| Network | 1 Gbps | 1 Gbps |

The Coolify host runs its own proxy (Traefik or Nginx), the Coolify API, and all application containers. Allocating dedicated resources for Coolify itself prevents resource contention during deployment rollouts, log streaming, and health checks. This specification assumes a single-node deployment; multi-node Coolify clusters require distributed storage and networking beyond this scope.

### 1.2 Development Workstation

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| CPU | 4 cores | 8 cores |
| RAM | 8 GB | 16 GB |
| Storage | 20 GB free | 50 GB SSD free |

Developers run Docker containers locally (PostgreSQL, Redis) alongside the Next.js development server and backend API. The combination of hot-reloading, Prisma Studio, and multiple terminal processes demands sufficient RAM to avoid swapping.

---

## 2. Software Requirements

### 2.1 Runtime Dependencies

| Component | Minimum Version | Recommended Version | Notes |
|-----------|----------------|---------------------|-------|
| Node.js | v20.0.0 (LTS) | v20.x LTS | Required for built-in test runner, ESM stability, and performance improvements |
| npm | v10.x | v10.x (bundled with Node 20) | pnpm is the preferred package manager for this project |
| pnpm | v8.x | v9.x | Faster installs, strict dependency resolution, workspace support for monorepo |
| PostgreSQL | v16.0 | v16.x | Required for JSON path expressions, improved logical replication, and performance |
| Redis | v7.0 | v7.2+ | Required for ACL improvements, function support, and better memory efficiency |
| Docker Engine | v24.0 | v25.x | Required for compose watch, BuildKit improvements, and multi-platform builds |
| Docker Compose | v2.20+ | v2.29+ | V2 plugin (not standalone compose). Required for compose watch and health checks |

### 2.2 Infrastructure Software

| Component | Version | Purpose |
|-----------|---------|---------|
| Coolify | Latest stable (v4.x) | Self-hosting platform for deployment, monitoring, and SSL management |
| Nginx | v1.25+ | Reverse proxy, SSL termination, static asset serving, rate limiting |
| Traefik | v3.x | Alternative reverse proxy if using Coolify's built-in proxy (recommended) |
| Certbot | v2.x | Let's Encrypt SSL certificate management (if not using Coolify's built-in) |

### 2.3 Backend Dependencies (Key Libraries)

| Library | Purpose |
|---------|---------|
| Express.js or Fastify | HTTP framework for the REST API server |
| Prisma ORM | Database access layer with type-safe queries and migrations |
| BullMQ | Background job processing (investment maturity, emails, notifications) |
| jsonwebtoken | JWT token creation and verification |
| argon2id | Password hashing (via the argon2 npm package) |
| zod | Runtime request validation and schema parsing |
| otpauth | TOTP 2FA code generation and verification |
| cloudinary | Media upload and transformation for KYC documents and gift card screenshots |
| resend | Transactional email delivery via the Resend API |
| ioredis | Redis client with connection pooling and cluster support |

### 2.4 Frontend Dependencies (Key Libraries)

| Library | Purpose |
|---------|---------|
| Next.js (App Router) | React framework with SSR, routing, and API route support |
| React 18+ | UI component library with concurrent features |
| TypeScript 5+ | Static type checking for all frontend and shared code |
| Tailwind CSS 4+ | Utility-first CSS framework for the red-and-black premium theme |
| shadcn/ui | Accessible, composable UI component primitives |
| React Query / TanStack Query | Server state management, caching, and background refetching |
| Recharts or ECharts | Chart and analytics visualization for user and admin dashboards |
| next-intl or similar | Internationalization framework for multi-language support |
| React Email | Email template rendering (shared with backend) |

---

## 3. Network Requirements

### 3.1 Ports

| Port | Service | Access |
|------|---------|--------|
| 80 | HTTP → HTTPS redirect | Public |
| 443 | HTTPS (TLS 1.3) | Public |
| 5432 | PostgreSQL | Internal only (Docker network) |
| 6379 | Redis | Internal only (Docker network) |
| 3000 | Next.js frontend (dev only) | Localhost |
| 4000 / 5000 | Backend API (dev only) | Localhost |
| 6443 | Coolify (if self-hosted) | Restricted (admin IPs only) |

Production deployments must not expose PostgreSQL or Redis ports outside the Docker internal network. Coolify's proxy or Nginx handles all external traffic routing to the appropriate internal container ports.

### 3.2 SSL/TLS Requirements

- **Minimum TLS Version:** TLS 1.2, with TLS 1.3 preferred and prioritized in cipher suite configuration.
- **Certificate Authority:** Let's Encrypt (automated via Coolify or Certbot) for public-facing domains. Wildcard certificates recommended for subdomain flexibility.
- **Certificate Auto-Renewal:** Configured with at least 30-day advance renewal and automated reload of the proxy service.
- **Cipher Suites:** Only AEAD cipher suites permitted (AES-GCM, ChaCha20-Poly1305). RSA key exchange disabled. Forward secrecy required.
- **HSTS:** Strict-Transport-Security header with minimum 1-year max-age and includeSubDomains directive. See [SECURITY_REQUIREMENTS](./SECURITY_REQUIREMENTS.md) for full header configuration.

### 3.3 Domain and DNS Requirements

| Record | Type | Value | Purpose |
|--------|------|-------|---------|
| platform.example.com | A | Server IP | Primary application domain |
| api.platform.example.com | A | Server IP | API endpoint (or served from same domain via path) |
| admin.platform.example.com | A | Server IP | Admin dashboard (optional separate subdomain) |
| platform.example.com | CAA | letsencrypt.org | Certificate authority authorization |
| _dmarc.platform.example.com | TXT | DMARC policy | Email authentication |
| platform.example.com | TXT | SPF record | Email sender verification |

DNS propagation should complete before SSL certificate provisioning. TTL values should be set to reasonable intervals (3600s during initial setup, lowered to 300s during migrations).

### 3.4 CDN Requirements

A Content Delivery Network is recommended for serving static assets (JavaScript bundles, CSS, images, fonts) to global users. Key requirements include:

- **Geographic Distribution:** Edge nodes in at least North America, Europe, and Asia-Pacific regions to serve the platform's global user base.
- **Caching Strategy:** Static assets cached with immutable cache headers. HTML pages cached with stale-while-revalidate. API responses never cached at CDN level.
- **Origin Shield:** A single origin request for cache misses to reduce load on the application server during cache invalidation events.
- **DDoS Mitigation:** Layer 3/4 DDoS protection and basic Layer 7 rate limiting at the CDN edge before requests reach the application.

### 3.5 Firewall Rules

The following rules define the minimum firewall configuration for the production server. All inbound traffic is denied by default unless explicitly permitted.

- **Allow:** TCP 80 (HTTP) from any source (redirects to 443)
- **Allow:** TCP 443 (HTTPS) from any source
- **Allow:** TCP 22 (SSH) from admin IP addresses only
- **Allow:** TCP 6443 (Coolify) from admin IP addresses only
- **Deny:** All other inbound traffic
- **Allow:** All outbound traffic (for external API calls to Resend, Cloudinary, crypto nodes, exchange rate APIs)
- **Internal:** Docker bridge network allows unrestricted communication between containers on ports 5432, 6379, 3000, 4000

IP-based access restrictions for the Coolify management interface and SSH should be enforced at both the firewall level and the application level for defense in depth.

---

## 4. Browser Support

### 4.1 Desktop Browsers

| Browser | Minimum Version | Notes |
|---------|----------------|-------|
| Google Chrome | 90+ | Primary target. Full feature support including crypto wallet extensions. |
| Mozilla Firefox | 90+ | Full feature support. Test with strict tracking protection enabled. |
| Apple Safari | 15+ | Requires testing for crypto payment flows and WebAuthn compatibility. |
| Microsoft Edge | 90+ | Chromium-based, inherits Chrome compatibility. Test with IE mode disabled. |

### 4.2 Mobile Browsers

| Browser | Minimum Version | Notes |
|---------|----------------|-------|
| Chrome Android | 90+ | Primary mobile target. Responsive layout tested on 360px–428px viewports. |
| Safari iOS | 15+ | Test on iPhone SE through iPhone 15 Pro Max. Verify WKWebView behavior. |
| Samsung Internet | 15+ | Secondary mobile target for markets where Samsung has significant share. |

### 4.3 Unsupported Browsers

- Internet Explorer (all versions) — no support whatsoever.
- Opera Mini — server-side rendering may cause issues with client-side interactivity.
- Any browser with JavaScript disabled — the platform requires JavaScript for all functionality.

### 4.4 Progressive Enhancement

The platform follows a progressive enhancement strategy where core content (account balances, plan information) is server-rendered and accessible even before JavaScript hydration. Interactive features (charts, real-time updates, modals) require JavaScript but degrade gracefully with loading states and fallback content. This approach ensures reliability on slower mobile connections common in emerging markets where the platform targets users.

---

## 5. API Compatibility

### 5.1 REST API Design

The backend exposes a RESTful API following OpenAPI 3.1 specification conventions. All endpoints are prefixed with the version identifier as described in the versioning strategy below. The API is designed for consumption by the Next.js frontend, future mobile applications, and third-party integrations (admin tools, analytics).

### 5.2 Request and Response Format

All API communication uses JSON as the content type. Requests must include `Content-Type: application/json` for endpoints with request bodies. Responses use a standardized envelope format to ensure consistent error handling and metadata delivery across all endpoints.

- **Success Response:** Returns HTTP status code in the 2xx range with a JSON body containing the requested data or confirmation.
- **Error Response:** Returns HTTP status code in the 4xx or 5xx range with a JSON body containing an error code, human-readable message, and optional validation details.
- **Pagination:** List endpoints accept `page` and `limit` query parameters and return metadata including `total`, `page`, `limit`, and `totalPages`.
- **Date/Time Format:** All timestamps use ISO 8601 format (e.g., `2025-01-15T14:30:00.000Z`) in UTC.
- **Currency Format:** All monetary amounts are represented as numbers (not strings) with a maximum of 2 decimal places. Currency codes follow ISO 4217 (e.g., `USD`, `EUR`, `GBP`).

### 5.3 Versioning Strategy

The API uses URL-based versioning to maintain backward compatibility and allow independent evolution of API contracts. The current version prefix is `/api/v1/`.

- **Version Prefix:** All endpoints begin with `/api/v1/` (e.g., `/api/v1/auth/login`, `/api/v1/investments/plans`).
- **Breaking Changes:** Any change that removes or restructures an existing field, changes a data type, or alters the semantics of an endpoint requires a new API version (`/api/v2/`).
- **Non-Breaking Changes:** Adding new optional fields, new endpoints, or new query parameters does not require a version bump.
- **Deprecation:** Deprecated endpoints return a `Deprecation` header and a `Sunset` header indicating the removal date. Deprecated endpoints are maintained for at least 6 months after deprecation notice.
- **Version Lifecycle:** At most two API versions are supported simultaneously. Older versions are sunset with advance notice to all consumers.

---

## 6. Third-Party Services

### 6.1 Cloudinary (Media Management)

Cloudinary handles all image uploads and transformations for the platform. Primary use cases include KYC document uploads (ID cards, selfies, proof of address), gift card screenshot uploads for deposit verification, and user profile avatars. Images are uploaded using Cloudinary's signed upload mechanism to prevent unauthorized uploads. Transformations are applied server-side (resizing, format conversion to WebP, quality optimization) to ensure consistent display across the platform. All KYC-related images are stored in a restricted access folder with signed URL delivery only.

### 6.2 Resend (Email Delivery)

Resend serves as the transactional email service for all platform communications. This includes email verification OTPs, password reset OTPs, 2FA backup code delivery, investment plan activation confirmations, withdrawal processing notifications, referral bonus alerts, support ticket updates, and marketing communications (opt-in only). Email templates are built using React Email for consistent rendering across email clients and for sharing template components between frontend preview and backend delivery. Resend's webhook integration provides delivery status tracking for monitoring email deliverability.

### 6.3 Cryptocurrency Payment Processing

The platform requires integration with a cryptocurrency service for generating deposit addresses and monitoring blockchain transactions for BTC, ETH, and USDT deposits. This may be implemented through a third-party payment processor API (e.g., a crypto payment gateway) or through self-hosted blockchain nodes (Bitcoin Core, Geth for Ethereum, and a USDT contract monitor). The chosen approach must support address generation per deposit, transaction confirmation monitoring with configurable confirmations threshold, and webhook or polling-based status updates. See [SYSTEM_ARCHITECTURE](./SYSTEM_ARCHITECTURE.md) for details on how this integrates with the deposit flow.

### 6.4 Exchange Rate API

A real-time exchange rate API is required for converting between fiat currencies (USD, EUR, GBP) and for displaying equivalent values in the user's preferred currency. The API must provide reliable rates for USD/EUR, USD/GBP, BTC/USD, ETH/USD, and USDT/USD pairs. Rates should be cached in Redis with a 5-minute TTL to avoid excessive API calls. A fallback static rate configuration should be maintained for service continuity if the external API becomes unavailable.

### 6.5 SMS/OTP Service (Future Consideration)

While Phase 1 uses email-based OTP for verification, a SMS delivery service (e.g., Twilio, Vonage) should be evaluated for Phase 2 when phone-based verification is added. The architecture should not preclude adding SMS as an additional OTP delivery channel without significant refactoring.

### 6.6 Analytics Service

An analytics service is required for tracking user behavior, conversion funnels (registration → KYC → first deposit → first investment), and platform performance metrics. This may be implemented through a self-hosted solution (Plausible Analytics, Matomo) to maintain user privacy and GDPR compliance, avoiding third-party cookies and cross-site tracking. Analytics data feeds into both the admin dashboard and business intelligence reporting.

---

## 7. Development Environment

### 7.1 Required Local Tools

Every developer on the project must have the following tools installed and configured on their local workstation:

- **Node.js v20+ LTS** — installed via nvm (Node Version Manager) to allow seamless switching between project-required versions and system Node.
- **pnpm v9.x** — the project's package manager of choice. Installed globally via `npm install -g pnpm`.
- **Docker Desktop or Docker Engine** — for running PostgreSQL and Redis containers locally without installing them natively on the host OS.
- **Git v2.40+** — with GPG signing configured for commit authentication.
- **PostgreSQL Client** — for direct database access during debugging (optional, Prisma Studio can substitute).
- **Redis CLI** — for cache inspection and manual cache invalidation during development (optional).

### 7.2 IDE and Tooling Recommendations

- **Visual Studio Code** is the recommended IDE with the following extensions: ESLint, Prettier, Prisma, Tailwind CSS IntelliSense, TypeScript Error Translator, and GitLens.
- **WebStorm** is a fully supported alternative with native TypeScript, Prisma, and Tailwind support out of the box.
- **Terminal:** iTerm2 (macOS), Windows Terminal (Windows), or any modern terminal emulator with split panes and tab support for running multiple services simultaneously.
- **API Testing:** Bruno or Insomnia for local API testing. API request collections should be version-controlled alongside the codebase.
- **Database GUI:** Prisma Studio (included with Prisma) for browsing and editing development database records.

### 7.3 Git Workflow

The project follows a trunk-based development workflow with short-lived feature branches:

- **main** — production-ready code. Protected branch requiring pull request approval and passing CI checks.
- **develop** — integration branch for ongoing development. All feature branches merge into develop.
- **feature/** — short-lived branches for individual features or bug fixes. Named using the convention `feature/JIRA-123-short-description` or `fix/JIRA-456-bug-description`.
- **release/** — cut from develop for release candidate testing and stabilization.
- **hotfix/** — branched from main for urgent production fixes, merged back into both main and develop.

Commit messages follow the Conventional Commits specification (e.g., `feat(auth): add 2FA setup endpoint`, `fix(wallet): correct balance calculation for concurrent withdrawals`). All commits must pass pre-commit hooks (linting, type checking) before being accepted.

---

## 8. Environment Variables

Environment variables are the sole mechanism for configuring the application across environments (development, staging, production). No configuration values are hardcoded in the source code. Secrets are never committed to version control. See [SECURITY_REQUIREMENTS](./SECURITY_REQUIREMENTS.md) for secret management policies.

### 8.1 Database Configuration

| Variable Name | Purpose |
|---------------|---------|
| `DATABASE_URL` | PostgreSQL connection string (format: `postgresql://user:password@host:5432/dbname`) |
| `DATABASE_POOL_MIN` | Minimum connection pool size |
| `DATABASE_POOL_MAX` | Maximum connection pool size |
| `DATABASE_SSL_MODE` | SSL mode for database connections (`require` in production) |

### 8.2 Redis Configuration

| Variable Name | Purpose |
|---------------|---------|
| `REDIS_URL` | Redis connection string (format: `redis://host:6379`) |
| `REDIS_PASSWORD` | Redis authentication password |
| `REDIS_DB` | Redis database number (default: 0) |

### 8.3 Authentication and Security

| Variable Name | Purpose |
|---------------|---------|
| `JWT_ACCESS_SECRET` | Secret key for signing access tokens (minimum 32 characters) |
| `JWT_REFRESH_SECRET` | Secret key for signing refresh tokens (must differ from access secret) |
| `JWT_ACCESS_EXPIRY` | Access token expiry duration (e.g., `15m`) |
| `JWT_REFRESH_EXPIRY` | Refresh token expiry duration (e.g., `7d`) |
| `ARGON2_SALT_LENGTH` | Salt length for argon2id password hashing |
| `ARGON2_MEMORY_COST` | Memory cost parameter for argon2id |
| `ARGON2_TIME_COST` | Time cost parameter for argon2id |
| `ARGON2_PARALLELISM` | Parallelism parameter for argon2id |
| `ENCRYPTION_KEY` | AES-256 encryption key for sensitive field encryption at rest |

### 8.4 Application Configuration

| Variable Name | Purpose |
|---------------|---------|
| `NODE_ENV` | Execution environment (`development`, `staging`, `production`) |
| `APP_URL` | Canonical base URL of the application (e.g., `https://platform.example.com`) |
| `APP_NAME` | Display name of the application |
| `PORT` | Backend API server port |
| `FRONTEND_URL` | Frontend application URL for CORS configuration |
| `DEMO_MODE_DEFAULT` | Default mode for new users (`demo` or `live`) |
| `WITHDRAWAL_FEE_PERCENT` | Withdrawal fee percentage (e.g., `21`) |

### 8.5 External Service API Keys

| Variable Name | Purpose |
|---------------|---------|
| `CLOUDINARY_CLOUD_NAME` | Cloudinary account cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key for signed uploads |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret for signed uploads |
| `CLOUDINARY_UPLOAD_PRESET` | Cloudinary unsigned upload preset (if applicable) |
| `RESEND_API_KEY` | Resend API key for email delivery |
| `RESEND_FROM_EMAIL` | Sender email address for transactional emails |
| `CRYPTO_RPC_URL` | Cryptocurrency node RPC endpoint URL |
| `CRYPTO_API_KEY` | Cryptocurrency payment processor API key |
| `EXCHANGE_RATE_API_KEY` | Exchange rate API authentication key |
| `EXCHANGE_RATE_API_URL` | Base URL for the exchange rate API |

### 8.6 Feature Flags

| Variable Name | Purpose |
|---------------|---------|
| `ENABLE_DEMO_MODE` | Toggle demo mode availability |
| `ENABLE_LIVE_MODE` | Toggle live mode availability |
| `ENABLE_GIFT_CARD_DEPOSITS` | Toggle gift card deposit method |
| `ENABLE_CRYPTO_DEPOSITS` | Toggle cryptocurrency deposit method |
| `ENABLE_2FA` | Toggle two-factor authentication feature |
| `ENABLE_REFERRAL_PROGRAM` | Toggle referral program feature |
| `ENABLE_REGISTRATION` | Toggle new user registration (useful during maintenance) |

### 8.7 Logging and Monitoring

| Variable Name | Purpose |
|---------------|---------|
| `LOG_LEVEL` | Minimum log level (`debug`, `info`, `warn`, `error`) |
| `SENTRY_DSN` | Sentry error tracking DSN (if using Sentry) |
| `ANALYTICS_TRACKING_ID` | Analytics service tracking identifier |

All environment variables should be documented in a `.env.example` file committed to version control with placeholder values (never actual secrets). Production environment variables are managed through Coolify's environment variable management interface or Docker secrets.