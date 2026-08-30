# Backend Architecture

> **TeslaPrimeCapital — Enterprise Investment Platform**
> Phase 2 Technical Architecture Document
> Version 1.0.0 | Last Updated: 2025-01

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Directory Structure](#2-directory-structure)
3. [Layered Architecture Explanation](#3-layered-architecture-explanation)
4. [Service Layer Details](#4-service-layer-details)
5. [Middleware Stack](#5-middleware-stack)
6. [Background Jobs Architecture](#6-background-jobs-architecture)
7. [Email System](#7-email-system)
8. [File Upload Flow](#8-file-upload-flow)
9. [Error Handling Strategy](#9-error-handling-strategy)
10. [Environment Configuration](#10-environment-configuration)

---

## 1. Architecture Overview

TeslaPrimeCapital is built as a **monolithic Next.js application** using the App Router with API Routes as the HTTP entry point. Despite being a monolith, the backend follows a **strictly layered architecture** inside the `src/server/` directory, separating concerns across Controller, Service, Repository, and Data Access layers. This approach provides the same code organization benefits of a microservice architecture without the operational complexity of distributed systems.

### 1.1 Why Monolith with Layered Architecture

The platform handles financial operations (deposits, investments, withdrawals, commissions) that demand transactional consistency across multiple entities. A monolithic architecture provides:

- **Single-database transactions**: Investment creation, wallet debiting, and referral commission crediting can occur within a single Prisma transaction, eliminating distributed transaction complexity.
- **Simplified deployment**: One build, one deployment artifact. No inter-service networking, service discovery, or partial deployment states to manage.
- **Lower latency**: No network hops between services. A deposit → investment flow completes in-process rather than across HTTP calls.
- **Easier local development**: Developers run a single process with a single database and Redis instance.
- **Clear migration path**: The layered architecture means each service can be extracted into its own microservice in a future phase by moving the service file, its repository, and adding an HTTP/gRPC interface — the business logic stays identical.

### 1.2 High-Level Architecture Diagram

```mermaid
graph TB
    Client[Client Browser / Mobile App]
    Nginx[Nginx / Reverse Proxy]
    Next[Next.js App Router]
    MW[Middleware Stack]
    Ctrl[API Route Controllers]
    Svc[Service Layer]
    Repo[Repository Layer]
    Prisma[Prisma ORM]
    PG[(PostgreSQL)]
    Redis[(Redis)]
    Cloud[Cloudinary]
    Resend[Resend Email API]
    Cron[Job Scheduler / Workers]
    Bull[BullMQ Queues]

    Client --> Nginx --> Next
    Next --> MW --> Ctrl --> Svc --> Repo --> Prisma --> PG
    Svc --> Redis
    Svc --> Cloud
    Svc --> Resend
    Cron --> Bull --> Svc
    Redis -.-> Bull

    style PG fill:#336791,color:#fff
    style Redis fill:#DC382D,color:#fff
    style Cloud fill:#3448C5,color:#fff
    style Resend fill:#000,color:#fff
```

### 1.3 Technology Stack Summary

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Runtime | Node.js 20+ (LTS) | Server runtime |
| Framework | Next.js 15 (App Router) | Full-stack framework with API Routes |
| Language | TypeScript 5.x | Type safety |
| ORM | Prisma 6.x | Database access, migrations, type generation |
| Database | PostgreSQL 16 | Primary data store |
| Cache / Queue | Redis 7+ | Caching, rate limiting, sessions, job queues |
| Job Queue | BullMQ 5.x | Reliable async job processing |
| Email | Resend + React Email | Transactional email delivery and templates |
| File Storage | Cloudinary | Image and document hosting with transforms |
| Validation | Zod | Schema validation for requests and data |
| Scheduling | node-cron | Cron-based job scheduling |
| UUID | uuid v7 | Time-ordered unique identifiers |

---

## 2. Directory Structure

```
src/
├── app/
│   ├── api/v1/                        # API route handlers (thin controllers)
│   │   ├── auth/
│   │   │   ├── register/route.ts
│   │   │   ├── login/route.ts
│   │   │   ├── logout/route.ts
│   │   │   ├── refresh/route.ts
│   │   │   ├── verify-email/route.ts
│   │   │   ├── request-password-reset/route.ts
│   │   │   ├── reset-password/route.ts
│   │   │   ├── setup-2fa/route.ts
│   │   │   ├── verify-2fa/route.ts
│   │   │   └── disable-2fa/route.ts
│   │   ├── users/
│   │   │   ├── me/route.ts
│   │   │   ├── me/security/route.ts
│   │   │   └── me/preferences/route.ts
│   │   ├── plans/
│   │   │   ├── route.ts               # GET (public list)
│   │   │   └── [id]/route.ts          # GET (single plan detail)
│   │   ├── investments/
│   │   │   ├── route.ts               # GET (list), POST (create)
│   │   │   └── [id]/route.ts          # GET (detail)
│   │   ├── deposits/
│   │   │   ├── route.ts               # GET (list), POST (create)
│   │   │   ├── [id]/route.ts          # GET (detail)
│   │   │   ├── crypto-address/route.ts
│   │   │   └── gift-card/route.ts
│   │   ├── withdrawals/
│   │   │   ├── route.ts               # GET (list), POST (create)
│   │   │   ├── [id]/route.ts          # GET (detail)
│   │   │   └── estimate-fee/route.ts
│   │   ├── wallet/
│   │   │   ├── balance/route.ts
│   │   │   └── transactions/route.ts
│   │   ├── referral/
│   │   │   ├── link/route.ts
│   │   │   ├── stats/route.ts
│   │   │   ├── tree/route.ts
│   │   │   └── commissions/route.ts
│   │   ├── kyc/
│   │   │   ├── submit/route.ts
│   │   │   ├── status/route.ts
│   │   │   └── documents/route.ts
│   │   ├── notifications/
│   │   │   ├── route.ts               # GET (list)
│   │   │   ├── [id]/read/route.ts
│   │   │   ├── read-all/route.ts
│   │   │   └── unread-count/route.ts
│   │   ├── tickets/
│   │   │   ├── route.ts               # GET (list), POST (create)
│   │   │   ├── [id]/route.ts          # GET (detail)
│   │   │   └── [id]/messages/route.ts
│   │   └── admin/
│   │       ├── users/route.ts
│   │       ├── users/[id]/route.ts
│   │       ├── kyc/route.ts
│   │       ├── kyc/[id]/route.ts
│   │       ├── deposits/route.ts
│   │       ├── deposits/[id]/route.ts
│   │       ├── withdrawals/route.ts
│   │       ├── withdrawals/[id]/route.ts
│   │       ├── plans/route.ts
│   │       ├── plans/[id]/route.ts
│   │       ├── reports/route.ts
│   │       ├── audit-logs/route.ts
│   │       └── settings/route.ts
│   └── (frontend pages)
├── server/
│   ├── services/                      # Business logic layer
│   │   ├── auth.service.ts
│   │   ├── user.service.ts
│   │   ├── plan.service.ts
│   │   ├── investment.service.ts
│   │   ├── deposit.service.ts
│   │   ├── withdrawal.service.ts
│   │   ├── wallet.service.ts
│   │   ├── referral.service.ts
│   │   ├── kyc.service.ts
│   │   ├── notification.service.ts
│   │   ├── support.service.ts
│   │   ├── admin.service.ts
│   │   ├── audit.service.ts
│   │   ├── email.service.ts
│   │   └── file-upload.service.ts
│   ├── repositories/                  # Data access layer (Prisma)
│   │   ├── user.repo.ts
│   │   ├── plan.repo.ts
│   │   ├── investment.repo.ts
│   │   ├── transaction.repo.ts
│   │   ├── deposit.repo.ts
│   │   ├── withdrawal.repo.ts
│   │   ├── referral.repo.ts
│   │   ├── kyc.repo.ts
│   │   └── notification.repo.ts
│   ├── middleware/                     # Request pipeline middleware
│   │   ├── auth.middleware.ts
│   │   ├── rbac.middleware.ts
│   │   ├── rate-limit.middleware.ts
│   │   ├── validation.middleware.ts
│   │   ├── audit-logger.middleware.ts
│   │   ├── mode-context.middleware.ts
│   │   └── kyc-gate.middleware.ts
│   ├── utils/                         # Shared helpers
│   │   ├── api-response.ts
│   │   ├── pagination.ts
│   │   ├── currency.ts
│   │   ├── date.ts
│   │   ├── jwt.ts
│   │   ├── password.ts
│   │   ├── redis.ts
│   │   ├── validators.ts
│   │   └── errors.ts
│   ├── jobs/                          # Background job processors
│   │   ├── plan-maturity.job.ts
│   │   ├── commission-calc.job.ts
│   │   ├── email-queue.job.ts
│   │   └── audit-cleanup.job.ts
│   ├── workers/                       # Job scheduler/runner setup
│   │   ├── scheduler.ts
│   │   └── bullmq-connection.ts
│   └── config/                        # Environment and constants
│       ├── env.ts
│       ├── constants.ts
│       └── redis-keys.ts
├── prisma/                            # Database schema and migrations
│   ├── schema.prisma
│   ├── migrations/
│   └── seeds/
├── emails/                            # React Email templates
│   ├── verification-email.tsx
│   ├── password-reset-email.tsx
│   ├── deposit-confirmed.tsx
│   ├── withdrawal-processed.tsx
│   ├── investment-matured.tsx
│   ├── 2fa-enabled.tsx
│   ├── kyc-approved.tsx
│   ├── kyc-rejected.tsx
│   ├── referral-commission.tsx
│   └── welcome-email.tsx
└── types/                             # Shared TypeScript types
    ├── api.types.ts
    ├── domain.types.ts
    └── service.types.ts
```

---

## 3. Layered Architecture Explanation

### 3.1 The Four Layers

Every API request flows through four distinct layers, each with a single responsibility:

```
┌─────────────────────────────────────────────┐
│  API Route (Controller Layer)               │  ← HTTP concerns: req, res, status codes
│  src/app/api/v1/*/route.ts                  │
├─────────────────────────────────────────────┤
│  Service Layer                              │  ← Business logic, orchestration, rules
│  src/server/services/*.service.ts           │
├─────────────────────────────────────────────┤
│  Repository Layer                           │  ← Data access, query composition
│  src/server/repositories/*.repo.ts          │
├─────────────────────────────────────────────┤
│  Prisma ORM                                 │  ← SQL generation, connection mgmt
│  PostgreSQL                                 │
└─────────────────────────────────────────────┘
```

### 3.2 Layer Responsibilities

**Controller Layer (API Routes)**
- Parses and validates the incoming HTTP request (path params, query params, body).
- Calls the appropriate service method with extracted parameters.
- Formats the service return value into the standard API response envelope (`{ success, data, message, meta }`).
- Sets HTTP status codes and response headers (rate limit headers, cache headers).
- Handles HTTP-specific concerns (multipart parsing for file uploads, cookie handling for refresh tokens).
- **Never** contains business logic. A controller should be no more than 30–50 lines.

**Service Layer**
- Contains all business rules, calculations, and cross-entity orchestration.
- Coordinates calls to multiple repositories when an operation touches multiple tables.
- Manages transactions (via `prisma.$transaction`) when atomicity is required.
- Calls other services for cross-domain operations (e.g., `investmentService` calls `walletService` and `referralService`).
- Handles Demo/Live mode isolation — every service method is mode-aware.
- Throws domain-specific errors (`NotFoundError`, `InsufficientBalanceError`, etc.) that the global error handler translates to HTTP responses.

**Repository Layer**
- Encapsulates all Prisma query logic behind typed methods.
- Methods map closely to domain operations: `findById`, `findMany`, `create`, `update`, `delete`, `count`.
- Handles query composition for filtering, sorting, and pagination without leaking Prisma internals to the service layer.
- Provides mode-scoped queries that filter by `mode === 'demo'` or `mode === 'live'`.
- Returns plain objects or Prisma models — never exposes Prisma client directly.

**Prisma / PostgreSQL**
- Prisma generates type-safe query builders from `schema.prisma`.
- All queries are parameterized (Prisma default), preventing SQL injection.
- PostgreSQL handles constraints, indexes, and data integrity.

### 3.3 Data Flow Example: Creating an Investment

```mermaid
sequenceDiagram
    participant C as Client
    participant R as API Route (Controller)
    participant M as Middleware Stack
    participant IS as InvestmentService
    participant WS as WalletService
    participant RS as ReferralService
    participant IR as InvestmentRepo
    participant WR as WalletRepo
    participant P as Prisma / PostgreSQL

    C->>R: POST /api/v1/investments
    R->>M: Auth → RBAC → Validation → Mode Context → KYC Gate
    M-->>R: req.user, req.mode
    R->>IS: createInvestment(userId, planId, amount, mode)
    IS->>IR: findPlanById(planId)
    IR->>P: SELECT * FROM plans WHERE id = planId
    P-->>IR: plan
    IR-->>IS: plan
    IS->>IS: validate amount in plan range, plan active
    IS->>WS: debitWallet(userId, amount, mode)
    WS->>WR: findWalletByUser(userId, mode)
    WR->>P: SELECT * FROM wallets WHERE userId AND mode
    P-->>WR: wallet
    WR-->>WS: wallet
    WS->>WS: check balance >= amount
    WS->>P: UPDATE wallets SET balance = balance - amount
    WS->>P: INSERT INTO transactions (type: investment, amount, mode)
    WS-->>IS: updated wallet
    IS->>P: INSERT INTO investments (userId, planId, amount, maturityDate, mode)
    IS->>RS: processReferralCommission(userId, amount, mode)
    RS->>P: INSERT INTO commissions (sponsorId, amount, mode)
    IS-->>R: investment
    R-->>C: 201 { success: true, data: { investment } }
```

---

## 4. Service Layer Details

### 4.1 AuthService

**File:** `src/server/services/auth.service.ts`

**Responsibilities:**
- User registration with password hashing (bcrypt, 12 salt rounds)
- Email/password authentication with credential verification
- JWT access token generation (15-min expiry, HS256, payload: `userId`, `role`, `tokenVersion`)
- Refresh token generation and rotation (opaque token stored in Redis hash)
- Email verification token generation and verification
- Password reset token generation and password reset execution
- 2FA TOTP generation, verification, and secret management (otpauth URI)
- Token version invalidation (forced logout on password change)

**Key Methods:**
| Method | Description |
|--------|-------------|
| `register(data: RegisterDto)` | Creates user in `pending_verification` state, hashes password, generates email token, dispatches verification email, initializes Demo wallet |
| `login(email, password)` | Verifies credentials, checks 2FA status, returns tokens or `2FA_REQUIRED` |
| `refreshToken(refreshToken)` | Validates Redis session, rotates refresh token, issues new access token |
| `logout(refreshToken)` | Deletes session from Redis, increments `tokenVersion` |
| `verifyEmail(token)` | Activates account, sets KYC Level 0, credits Demo wallet starting balance |
| `requestPasswordReset(email)` | Generates reset token (10-min TTL), dispatches reset email |
| `resetPassword(token, newPassword)` | Validates token, hashes new password, increments `tokenVersion` |
| `setup2FA(userId)` | Generates TOTP secret, returns QR code URI |
| `verify2FA(userId, code)` | Validates TOTP code, enables 2FA on user record |
| `disable2FA(userId, code)` | Validates TOTP code, disables 2FA |

**Dependencies:** `UserRepo`, `WalletService` (for Demo wallet initialization), `EmailService`, `AuditService`

**Demo/Live Mode Handling:** Registration creates a Demo wallet with the configured starting balance. No mode-specific data isolation at this level — mode context is applied downstream.

---

### 4.2 UserService

**File:** `src/server/services/user.service.ts`

**Responsibilities:**
- Profile retrieval and updates (name, phone, avatar)
- Password change with current password verification
- 2FA management (delegates to AuthService)
- User preferences (language, notification settings)
- Account deactivation logic

**Key Methods:**
| Method | Description |
|--------|-------------|
| `getProfile(userId)` | Returns user profile excluding sensitive fields (password, 2FA secret) |
| `updateProfile(userId, data)` | Updates allowed profile fields, logs change in audit |
| `changePassword(userId, currentPassword, newPassword)` | Verifies current password, hashes and saves new, invalidates all sessions |
| `updatePreferences(userId, prefs)` | Updates notification and language preferences |
| `getSecuritySummary(userId)` | Returns 2FA status, active sessions count, last login |

**Dependencies:** `UserRepo`, `AuditService`

**Demo/Live Mode Handling:** Profile data is shared across modes. Wallet and investment data shown on the profile is filtered by the active mode context.

---

### 4.3 PlanService

**File:** `src/server/services/plan.service.ts`

**Responsibilities:**
- Retrieve active investment plans (public, cached in Redis)
- Plan details retrieval with current status
- Admin CRUD for plan management (create, update, activate, deactivate)
- Cache invalidation on plan modifications

**Key Methods:**
| Method | Description |
|--------|-------------|
| `getActivePlans()` | Returns all active plans from Redis cache (`cache:plans:all`), falls back to PostgreSQL on miss |
| `getPlanById(planId)` | Returns single plan with full details |
| `createPlan(data)` | Admin: creates new plan, invalidates plan cache |
| `updatePlan(planId, data)` | Admin: updates plan fields, invalidates plan cache |
| `togglePlanStatus(planId, active)` | Admin: activates or deactivates a plan, invalidates cache |

**Dependencies:** `PlanRepo`, Redis (cache)

**Demo/Live Mode Handling:** Plans are global — the same plan definitions apply to both modes. The mode distinction applies to the user's wallet and investment records, not the plans themselves.

---

### 4.4 InvestmentService

**File:** `src/server/services/investment.service.ts`

**Responsibilities:**
- Create new investment (debit wallet, create investment record, trigger referral commission)
- List user's active investments and investment history (mode-filtered)
- Calculate investment maturity date based on plan duration
- Track investment status (active, matured, completed)
- Plan maturity processing (credit returns to wallet upon maturity)

**Key Methods:**
| Method | Description |
|--------|-------------|
| `createInvestment(userId, planId, amount, mode)` | Validates plan, debits wallet, creates investment with calculated maturity date, triggers referral commission |
| `getActiveInvestments(userId, mode, pagination)` | Lists investments with `status = active` for the given mode |
| `getInvestmentHistory(userId, mode, pagination)` | Lists matured/completed investments for the given mode |
| `getInvestmentDetail(userId, investmentId, mode)` | Returns single investment with plan details and earnings breakdown |
| `processMaturedInvestments()` | (Job) Discovers investments past maturity, credits returns, updates status |
| `calculateReturn(plan, amount)` | Pure function: `amount * (1 + plan.returnRate / 100)` |

**Dependencies:** `InvestmentRepo`, `WalletService`, `ReferralService`, `PlanService`, `NotificationService`, `AuditService`

**Demo/Live Mode Handling:** All queries are scoped by `mode`. Demo investments use Demo wallet balance; Live investments use Live wallet balance. The maturity job processes each mode independently.

---

### 4.5 DepositService

**File:** `src/server/services/deposit.service.ts`

**Responsibilities:**
- Create crypto deposit requests (generate unique deposit tracking)
- Create gift card deposit submissions (with Cloudinary screenshot reference)
- Update deposit status through workflow (pending → confirming → verified → completed / failed)
- Credit wallet on deposit completion
- Admin verification and rejection of deposits

**Key Methods:**
| Method | Description |
|--------|-------------|
| `createCryptoDeposit(userId, planId, amount, cryptoType, mode)` | Creates deposit record in `pending` status, returns deposit tracking info |
| `createGiftCardDeposit(userId, planId, cardType, amount, screenshotUrl, mode)` | Creates deposit with gift card details and Cloudinary reference |
| `getUserDeposits(userId, mode, pagination)` | Lists user's deposits for the given mode |
| `getDepositDetail(userId, depositId, mode)` | Returns single deposit with full status history |
| `verifyDeposit(adminId, depositId, mode)` | Admin: sets status to `completed`, credits user wallet, triggers notification |
| `rejectDeposit(adminId, depositId, reason, mode)` | Admin: sets status to `failed`, triggers notification |

**Dependencies:** `DepositRepo`, `WalletService`, `NotificationService`, `FileUploadService`, `AuditService`

**Demo/Live Mode Handling:** Deposits are strictly mode-scoped. A deposit created in Demo mode credits the Demo wallet. Crypto addresses (if applicable) are unique per user and mode.

---

### 4.6 WithdrawalService

**File:** `src/server/services/withdrawal.service.ts`

**Responsibilities:**
- Create withdrawal requests with balance validation
- Calculate withdrawal fees (21% of amount)
- Enforce withdrawal limits based on KYC level
- Manage withdrawal approval workflow (auto-approve below threshold, manual above)
- Process approved withdrawals (queue for blockchain execution in Live mode)

**Key Methods:**
| Method | Description |
|--------|-------------|
| `estimateFee(amount)` | Returns `{ amount, fee, netAmount }` where `fee = amount * 0.21` |
| `createWithdrawal(userId, amount, walletAddress, cryptoType, mode)` | Validates balance, KYC level, daily limits; debits wallet; creates withdrawal record |
| `getUserWithdrawals(userId, mode, pagination)` | Lists user's withdrawals |
| `getWithdrawalDetail(userId, withdrawalId, mode)` | Returns single withdrawal with status timeline |
| `approveWithdrawal(adminId, withdrawalId, mode)` | Admin: queues withdrawal for processing (Live) or auto-completes (Demo) |
| `rejectWithdrawal(adminId, withdrawalId, reason, mode)` | Admin: reverses wallet debit, sets status to `rejected` |

**Dependencies:** `WithdrawalRepo`, `WalletService`, `UserService` (KYC level check), `NotificationService`, `AuditService`, BullMQ (withdrawal queue)

**Demo/Live Mode Handling:** Withdrawal fees and limits apply consistently across modes. Demo withdrawals complete instantly (no blockchain). Live withdrawals are queued for sequential processing via BullMQ.

---

### 4.7 WalletService

**File:** `src/server/services/wallet.service.ts`

**Responsibilities:**
- Retrieve wallet balance for a given mode
- Credit wallet (deposits, investment returns, commissions)
- Debit wallet (investments, withdrawals)
- Maintain transaction history
- Ensure balance never goes negative (atomic operations)

**Key Methods:**
| Method | Description |
|--------|-------------|
| `getBalance(userId, mode)` | Returns `{ balance, availableBalance }` |
| `creditWallet(userId, amount, type, referenceId, mode, tx)` | Adds funds within a Prisma transaction, creates transaction record |
| `debitWallet(userId, amount, type, referenceId, mode, tx)` | Deducts funds within a Prisma transaction, creates transaction record; throws `InsufficientBalanceError` if insufficient |
| `getTransactionHistory(userId, mode, filters, pagination)` | Cursor-paginated transaction list with type/date filters |
| `getOrCreateWallet(userId, mode)` | Retrieves existing wallet or creates one with zero balance |

**Dependencies:** `TransactionRepo`, `UserRepo`, `AuditService`

**Demo/Live Mode Handling:** Every user has two wallets (Demo and Live). All balance operations are scoped by mode. The `creditWallet` and `debitWallet` methods require an explicit `mode` parameter and query the corresponding wallet.

---

### 4.8 ReferralService

**File:** `src/server/services/referral.service.ts`

**Responsibilities:**
- Generate unique referral codes
- Capture referral relationships during registration
- Calculate and credit direct referral commissions (10% of deposit)
- Manage binary tree placement (left/right leg)
- Calculate binary matching bonuses
- Track referral statistics and commission history

**Key Methods:**
| Method | Description |
|--------|-------------|
| `generateReferralCode(userId)` | Creates unique 8-character alphanumeric code |
| `captureReferral(newUserId, referralCode)` | Links new user to sponsor, places in binary tree |
| `processDirectCommission(userId, depositAmount, mode)` | Credits 10% of deposit to sponsor's wallet |
| `processBinaryBonus(userId, mode)` | (Job) Calculates binary matching based on weaker leg volume |
| `getReferralStats(userId, mode)` | Returns total referrals, active referrals, total commissions |
| `getReferralTree(userId, depth)` | Returns binary tree structure up to specified depth |
| `getCommissionHistory(userId, mode, pagination)` | Paginated list of earned commissions |

**Dependencies:** `ReferralRepo`, `WalletService`, `NotificationService`, `AuditService`

**Demo/Live Mode Handling:** Referral relationships are global (a sponsor-referral pair exists once), but commissions are tracked and paid per mode. A deposit in Live mode generates Live commissions; a deposit in Demo mode generates Demo commissions.

---

### 4.9 KYCService

**File:** `src/server/services/kyc.service.ts`

**Responsibilities:**
- Accept KYC document submissions (ID front, ID back, selfie, proof of address)
- Store Cloudinary document references
- Manage KYC status workflow (submitted → under_review → approved / rejected)
- Enforce sequential level progression (Level 1 → 2 → 3)
- Admin review and approval/rejection

**Key Methods:**
| Method | Description |
|--------|-------------|
| `submitKYC(userId, level, documents)` | Validates document types for the target level, creates KYC submission record |
| `getKYCStatus(userId)` | Returns current level and submission status |
| `getDocuments(userId)` | Lists submitted documents with Cloudinary URLs |
| `approveKYC(adminId, submissionId, level)` | Admin: upgrades user's KYC level, triggers notification |
| `rejectKYC(adminId, submissionId, reason)` | Admin: marks submission as rejected, triggers notification with reason |
| `canAccessPlan(userId, planTier)` | Returns whether the user's KYC level permits the plan tier |

**Dependencies:** `KYCRepo`, `UserRepo`, `NotificationService`, `FileUploadService`, `AuditService`

**Demo/Live Mode Handling:** KYC verification is global — a verified identity applies to both modes. The KYC gate middleware checks the user's KYC level regardless of mode.

---

### 4.10 NotificationService

**File:** `src/server/services/notification.service.ts`

**Responsibilities:**
- Create in-app notifications for user events
- List and paginate user notifications
- Mark notifications as read (single and bulk)
- Track unread count
- Publish real-time notifications via Redis pub/sub

**Key Methods:**
| Method | Description |
|--------|-------------|
| `create(userId, type, title, message, data?)` | Creates notification record, publishes to Redis `notifications:{userId}` channel |
| `getList(userId, pagination)` | Returns paginated notification list ordered by most recent |
| `markRead(userId, notificationId)` | Marks single notification as read |
| `markAllRead(userId)` | Marks all unread notifications as read |
| `getUnreadCount(userId)` | Returns count of unread notifications |

**Dependencies:** `NotificationRepo`, Redis (pub/sub)

**Demo/Live Mode Handling:** Notifications are user-level, not mode-specific. A single notification stream per user covers events from both modes. The notification payload includes a `mode` field so the client can display mode context.

---

### 4.11 SupportService

**File:** `src/server/services/support.service.ts`

**Responsibilities:**
- Create support tickets with category and initial message
- Add messages to existing tickets (user and admin)
- List user's tickets and admin's ticket queue
- Ticket status workflow (open → in_progress → resolved → closed)
- Auto-assign tickets to admin queue

**Key Methods:**
| Method | Description |
|--------|-------------|
| `createTicket(userId, category, subject, message)` | Creates ticket with initial message, status `open` |
| `addMessage(userId, ticketId, message)` | Adds user message, reopens if `resolved` |
| `getUserTickets(userId, pagination)` | Lists user's tickets |
| `getTicketDetail(userId, ticketId)` | Returns ticket with full message thread |
| `adminListTickets(filters, pagination)` | Admin: lists all tickets with status/category filters |
| `adminReply(adminId, ticketId, message)` | Admin: adds reply, optionally updates status |

**Dependencies:** (directly uses Prisma for ticket/message CRUD — no dedicated repo for Phase 1), `NotificationService`

**Demo/Live Mode Handling:** Support tickets are user-level and not mode-specific. The ticket creation payload may reference a mode if the issue is mode-related.

---

### 4.12 AdminService

**File:** `src/server/services/admin.service.ts`

**Responsibilities:**
- User management (list, search, view, disable/enable)
- Financial dashboard aggregation (total deposits, withdrawals, active investments, platform balance)
- Platform settings management
- Report generation dispatching

**Key Methods:**
| Method | Description |
|--------|-------------|
| `getDashboardStats()` | Aggregated platform metrics (total users, active investments, total AUM, pending KYC, pending withdrawals) |
| `searchUsers(query, pagination)` | Admin: search users by email, name, or ID |
| `disableUser(adminId, userId, reason)` | Admin: disables user account, invalidates sessions |
| `enableUser(adminId, userId)` | Admin: re-enables user account |
| `updateSettings(settings)` | Admin: updates platform settings, invalidates settings cache |

**Dependencies:** `UserRepo`, `InvestmentRepo`, `DepositRepo`, `WithdrawalRepo`, `AuditService`

**Demo/Live Mode Handling:** Dashboard stats aggregate data across both modes separately, presenting Demo and Live metrics in distinct sections.

---

### 4.13 AuditService

**File:** `src/server/services/audit.service.ts`

**Responsibilities:**
- Record audit log entries for all sensitive operations
- Query audit logs with filters (user, action, date range, entity)
- Periodic cleanup of old audit logs (retention policy)

**Key Methods:**
| Method | Description |
|--------|-------------|
| `log(entry: AuditEntry)` | Creates audit record with actor, action, entity, changes, IP, userAgent |
| `queryLogs(filters, pagination)` | Returns cursor-paginated audit log entries |
| `cleanup(retentionDays)` | Deletes audit logs older than retention period |

**Dependencies:** (direct Prisma access)

**Demo/Live Mode Handling:** Audit logs are global. Each log entry includes a `mode` field for filtering.

---

### 4.14 EmailService

**File:** `src/server/services/email.service.ts`

**Responsibilities:**
- Queue transactional emails via BullMQ email queue
- Render React Email templates with dynamic props
- Send emails through Resend API
- Track email delivery status

**Key Methods:**
| Method | Description |
|--------|-------------|
| `send(template, to, props)` | Queues an email job with the template identifier, recipient, and dynamic props |
| `sendImmediate(template, to, props)` | Bypasses queue, sends directly (for password reset, security alerts) |
| `renderTemplate(template, props)` | Server-side renders a React Email component to HTML string |

**Dependencies:** BullMQ (email queue), Resend SDK

See [Section 7: Email System](#7-email-system) for full details.

---

### 4.15 FileUploadService

**File:** `src/server/services/file-upload.service.ts`

**Responsibilities:**
- Generate signed Cloudinary upload URLs
- Validate file types (extension + magic bytes) and sizes
- Store upload metadata and Cloudinary public IDs
- Apply Cloudinary transformations (resize, format conversion)

**Key Methods:**
| Method | Description |
|--------|-------------|
| `getSignedUploadUrl(userId, category, entityId?)` | Generates Cloudinary signature, returns upload URL and params |
| `verifyUpload(publicId)` | Confirms the upload exists in Cloudinary, returns optimized URL |
| `deleteFile(publicId)` | Removes file from Cloudinary |

See [Section 8: File Upload Flow](#8-file-upload-flow) for full details.

---

### 4.16 Service Dependency Graph

```mermaid
graph LR
    AuthSvc[AuthService] --> UserRepo[UserRepo]
    AuthSvc --> WalletSvc[WalletService]
    AuthSvc --> EmailSvc[EmailService]
    AuthSvc --> AuditSvc[AuditService]

    UserSvc[UserService] --> UserRepo
    UserSvc --> AuditSvc

    PlanSvc[PlanService] --> PlanRepo[PlanRepo]
    PlanSvc --> RedisCache[(Redis Cache)]

    InvestSvc[InvestmentService] --> InvestRepo[InvestmentRepo]
    InvestSvc --> WalletSvc
    InvestSvc --> ReferralSvc[ReferralService]
    InvestSvc --> PlanSvc
    InvestSvc --> NotificationSvc[NotificationService]
    InvestSvc --> AuditSvc

    DepositSvc[DepositService] --> DepositRepo[DepositRepo]
    DepositSvc --> WalletSvc
    DepositSvc --> NotificationSvc
    DepositSvc --> FileUploadSvc[FileUploadService]
    DepositSvc --> AuditSvc

    WithdrawalSvc[WithdrawalService] --> WithdrawalRepo[WithdrawalRepo]
    WithdrawalSvc --> WalletSvc
    WithdrawalSvc --> UserSvc
    WithdrawalSvc --> NotificationSvc
    WithdrawalSvc --> AuditSvc

    WalletSvc --> TxnRepo[TransactionRepo]
    WalletSvc --> UserRepo
    WalletSvc --> AuditSvc

    ReferralSvc --> ReferralRepo[ReferralRepo]
    ReferralSvc --> WalletSvc
    ReferralSvc --> NotificationSvc
    ReferralSvc --> AuditSvc

    KYCSvc[KYCService] --> KYCRepo[KYCRepo]
    KYCSvc --> UserRepo
    KYCSvc --> NotificationSvc
    KYCSvc --> FileUploadSvc
    KYCSvc --> AuditSvc

    NotificationSvc --> NotificationRepo[NotificationRepo]
    NotificationSvc --> RedisPubSub[(Redis Pub/Sub)]

    SupportSvc[SupportService] --> NotificationSvc

    AdminSvc[AdminService] --> UserRepo
    AdminSvc --> InvestRepo
    AdminSvc --> DepositRepo
    AdminSvc --> WithdrawalRepo
    AdminSvc --> AuditSvc

    EmailSvc --> BullMQEmail[(BullMQ: Email Queue)]
    FileUploadSvc --> CloudinaryAPI[Cloudinary API]
```

---

## 5. Middleware Stack

### 5.1 Request Lifecycle

```mermaid
flowchart TD
    A[Incoming Request] --> B{Public Endpoint?}
    B -- Yes --> C[Rate Limit Check]
    B -- No --> D[Rate Limit Check]
    C --> E[Request Validation]
    D --> F[Auth Middleware - JWT Verification]
    F --> G{Valid Token?}
    G -- No --> H[401 Unauthorized]
    G -- Yes --> I[RBAC Middleware - Role Check]
    I --> J{Authorized?}
    J -- No --> K[403 Forbidden]
    J -- Yes --> L[Mode Context Middleware]
    L --> M[Request Validation - Zod]
    M --> N{Valid?}
    N -- No --> O[400/422 Validation Error]
    N -- Yes --> P[KYC Gate Middleware]
    P --> Q{KYC Required?}
    Q -- Yes --> R{KYC Satisfied?}
    R -- No --> S[403 KYC Required]
    R -- Yes --> T[Audit Logger Middleware]
    Q -- No --> T
    T --> U[API Route Handler - Controller]
    U --> V[Service Layer]
    V --> W[Repository Layer]
    W --> X[Prisma → PostgreSQL]
    X --> Y[Response]
    Y --> Z[Audit Log Write]
    Z --> AA[Send Response to Client]

    E --> U

    style H fill:#e74c3c,color:#fff
    style K fill:#e74c3c,color:#fff
    style O fill:#e67e22,color:#fff
    style S fill:#e74c3c,color:#fff
```

### 5.2 Auth Middleware

**File:** `src/server/middleware/auth.middleware.ts`

Extracts the Bearer token from the `Authorization` header, verifies the JWT signature using `JWT_SECRET`, checks the `tokenVersion` against the user's current `tokenVersion` in the database (detects forced logouts), and attaches `req.user = { id, role, email }` to the request context. If the token is missing, expired, or has a stale version, returns `401 Unauthorized`.

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

Token payload structure:
```typescript
interface JwtPayload {
  userId: string;       // UUID
  role: 'user' | 'admin' | 'super_admin';
  tokenVersion: number; // Incremented on password reset / forced logout
  iat: number;          // Issued at
  exp: number;          // Expiration (15 minutes from iat)
}
```

### 5.3 Role-Based Access Middleware (RBAC)

**File:** `src/server/middleware/rbac.middleware.ts`

Accepts a list of allowed roles and checks `req.user.role` against them. Returns `403 Forbidden` if the user's role is not in the allowed list. Applied at the route level:

```typescript
// Example: Admin-only endpoint
export const GET = withMiddleware(
  adminHandler,
  authMiddleware,
  rbacMiddleware(['admin', 'super_admin'])
);
```

Role hierarchy: `super_admin > admin > user`. Super-admins have implicit access to all admin endpoints.

### 5.4 Rate Limiting Middleware

**File:** `src/server/middleware/rate-limit.middleware.ts`

Implements **sliding window rate limiting** using Redis sorted sets. Each request adds the current timestamp to a sorted set keyed by `ratelimit:{endpoint}:{userId|ip}`. Entries older than the window are pruned. If the count exceeds the limit, returns `429 Too Many Requests` with `Retry-After` header.

Rate limit tiers (from `SECURITY_REQUIREMENTS.md` and `REDIS_STRATEGY.md`):

| Endpoint Category | Limit | Window | Key Scope |
|-------------------|-------|--------|-----------|
| Auth (login, reset, 2FA) | 5 req | 1 min | Per IP |
| General API | 60 req | 1 min | Per User |
| Withdrawals / Deposits | 10 req | 1 min | Per User |
| KYC Submission | 3 req | 1 hour | Per User |
| Admin endpoints | 120 req | 1 min | Per User |

On Redis failure, rate limiting is disabled with a warning log (see Redis failure handling in `REDIS_STRATEGY.md`).

### 5.5 Request Validation Middleware

**File:** `src/server/middleware/validation.middleware.ts`

Accepts a Zod schema and validates `req.body`, `req.query`, or `req.params`. Returns `400 Bad Request` with field-level errors on failure. Validation runs **after** auth so that authentication errors take precedence over validation errors.

```typescript
const createInvestmentSchema = z.object({
  planId: z.string().uuid(),
  amount: z.number().positive().min(1),
});

export const POST = withMiddleware(
  createInvestmentHandler,
  authMiddleware,
  validateMiddleware({ body: createInvestmentSchema })
);
```

### 5.6 Audit Logger Middleware

**File:** `src/server/middleware/audit-logger.middleware.ts`

Wraps the request handler to capture the request start time, then after the handler completes (regardless of success/failure), writes an audit log entry with: actor ID, HTTP method, path, status code, response time, IP address, and user agent. Sensitive fields (password, token) are stripped before logging. Audit log writes are non-blocking (fire-and-forget via `setImmediate`).

### 5.7 Mode Context Middleware

**File:** `src/server/middleware/mode-context.middleware.ts`

Extracts the `X-Mode` header from the request (values: `demo` or `live`, default: `demo`). Attaches `req.mode` to the request context. All downstream service and repository calls use `req.mode` to scope their database queries. If the header is missing or invalid, defaults to `demo` and sets a response header `X-Mode-Defaulted: demo`.

```
X-Mode: live
```

### 5.8 KYC Gate Middleware

**File:** `src/server/middleware/kyc-gate.middleware.ts`

Configurable per-route to enforce a minimum KYC level. Checks the user's current KYC level and returns `403 Forbidden` with a descriptive message if the level is insufficient. Not all routes require this middleware — public pages, auth, and user profile endpoints are excluded.

```typescript
// Investment creation requires Level 1 (email verified)
export const POST = withMiddleware(
  createInvestmentHandler,
  authMiddleware,
  kycGateMiddleware({ minLevel: 1 })
);

// Platinum plan investment requires Level 3
export const POST = withMiddleware(
  createPlatinumInvestmentHandler,
  authMiddleware,
  kycGateMiddleware({ minLevel: 3 })
);
```

### 5.9 Middleware Composition

All middleware is composed using a `withMiddleware` utility that applies middleware functions in order. Each middleware receives `(req, res, next)` and calls `next()` to pass control to the next middleware or the final handler:

```typescript
// src/server/middleware/compose.ts
type Middleware = (req: Request, res: Response, next: () => void) => void;

export function withMiddleware(
  handler: RouteHandler,
  ...middlewares: Middleware[]
) {
  return async (req: Request, res: Response) => {
    let index = 0;
    const next = () => {
      if (index < middlewares.length) {
        return middlewares[index++](req, res, next);
      }
      return handler(req, res);
    };
    return next();
  };
}
```

---

## 6. Background Jobs Architecture

### 6.1 Job Scheduler Approach

The platform uses **BullMQ** backed by Redis for reliable async job processing, combined with **node-cron** for scheduled (cron-based) job triggers. This hybrid approach provides:

- **BullMQ**: Persistent job queues with automatic retries, dead-letter queues, job prioritization, concurrency control, and event-driven processing. Used for all asynchronous tasks.
- **node-cron**: Simple cron expression scheduling to trigger BullMQ job additions at regular intervals. Runs inside the Next.js process using the `instrumentation.ts` file (Next.js 15 server startup hook).

Job scheduler initialization in `src/server/workers/scheduler.ts`:

```typescript
import cron from 'node-cron';
import { PlanMaturityJob } from '../jobs/plan-maturity.job';
import { CommissionCalcJob } from '../jobs/commission-calc.job';
import { AuditCleanupJob } from '../jobs/audit-cleanup.job';

export function startSchedulers() {
  // Run every 5 minutes
  cron.schedule('*/5 * * * *', () => PlanMaturityJob.enqueue());

  // Run every 15 minutes
  cron.schedule('*/15 * * * *', () => CommissionCalcJob.enqueue());

  // Run daily at 3:00 AM UTC
  cron.schedule('0 3 * * *', () => AuditCleanupJob.enqueue(90)); // 90-day retention
}
```

### 6.2 Job Processing Flow

```mermaid
flowchart TD
    A[node-cron Trigger] --> B[Enqueue Job to BullMQ]
    B --> C[Job in Redis: waiting]
    C --> D[Worker Picks Up Job]
    D --> E[Process Job Logic]
    E --> F{Success?}
    F -- Yes --> G[Mark Job Completed]
    G --> H[Job in Redis: completed]
    F -- No --> I{Retryable?}
    I -- Yes --> J[Delay with Exponential Backoff]
    J --> K{Max Retries?}
    K -- No --> C
    K -- Yes --> L[Move to Dead-Letter Queue: failed]
    I -- No --> L

    M[Service Layer] -->|Direct Enqueue| B
    N[Email Queue: 5 workers] --> D
    O[Withdrawal Queue: 1 worker] --> D
    P[Maturity Queue: 2 workers] --> D
    Q[Commission Queue: 2 workers] --> D
    R[Cleanup Queue: 1 worker] --> D

    style L fill:#e74c3c,color:#fff
    style H fill:#27ae60,color:#fff
```

### 6.3 Plan Maturity Job

**File:** `src/server/jobs/plan-maturity.job.ts`

**Schedule:** Every 5 minutes (`*/5 * * * *`)

**Processing Logic:**

1. **Discover**: Query all investments where `status = 'active'` AND `maturityDate <= NOW()` AND `processed = false`, scoped by both `demo` and `live` modes.
2. **Calculate Return**: For each matured investment, compute the return amount using the plan's return rate: `returnAmount = investment.amount * (plan.returnRate / 100)`. Total credit = `investment.amount + returnAmount`.
3. **Credit Wallet**: Within a Prisma transaction:
   - Update wallet balance: `wallet.balance += totalCredit`
   - Create transaction record: type `investment_return`, amount `totalCredit`
   - Update investment: `status = 'matured'`, `processed = true`
4. **Notify**: Dispatch an "investment matured" notification and email to the user.
5. **Audit**: Log the maturity processing event.

**Idempotency**: The `processed` flag prevents double-processing if the job runs while a previous run is still in progress. The query uses a `SELECT FOR UPDATE` lock within the transaction to prevent race conditions.

**Failure Handling**: If any single investment fails to process, the job logs the error, marks that investment as `processing_failed`, and continues with the next investment. Failed investments are retried on the next scheduled run.

### 6.4 Commission Calculation Job

**File:** `src/server/jobs/commission-calc.job.ts`

**Schedule:** Every 15 minutes (`*/15 * * * *`)

**Processing Logic:**

1. **Direct Commissions**: Query pending deposits (status `completed` but `commissionProcessed = false`). For each, identify the sponsor, calculate 10% commission, credit sponsor's wallet, and mark commission as processed.
2. **Binary Bonus**: Query the binary tree structure, calculate the weaker leg's volume, and credit matching bonuses to eligible upline users according to the binary bonus rules defined in `BUSINESS_REQUIREMENTS.md`.
3. **Notify**: Send commission credit notifications to sponsors.

**Demo/Live Isolation**: Commissions for Demo deposits credit Demo wallets; Live deposits credit Live wallets. The job processes each mode in separate passes.

### 6.5 Email Queue Processing

**File:** `src/server/jobs/email-queue.job.ts`

**Workers:** 5 concurrent workers

The email queue processes jobs dispatched by `EmailService.send()`. Each job contains:

```typescript
interface EmailJobData {
  template: EmailTemplateType;
  to: string;
  subject?: string;
  props: Record<string, unknown>;
  priority?: 'high' | 'normal' | 'low';
}
```

**Processing Logic:**
1. Worker dequeues a job from the `bull:email` queue.
2. Resolves the template identifier to the React Email component.
3. Renders the component to HTML using `ReactEmail.render()`.
4. Sends the HTML email via the Resend SDK (`resend.emails.send()`).
5. On success, marks the job as completed.
6. On failure, retries with exponential backoff (delays: 30s, 2m, 10m, 30m, 1h).

### 6.6 Audit Cleanup Job

**File:** `src/server/jobs/audit-cleanup.job.ts`

**Schedule:** Daily at 03:00 UTC (`0 3 * * *`)

Deletes audit log entries older than the configured retention period (default: 90 days). Executes as a batch delete using Prisma's `deleteMany` with a `createdAt < threshold` condition. Logs the number of deleted records for operational visibility.

### 6.7 Job Failure Handling and Retries

All BullMQ queues share a common retry configuration:

```typescript
const defaultJobOptions = {
  attempts: 5,
  backoff: {
    type: 'exponential',
    delay: 30_000, // 30 seconds initial, then exponential
  },
  removeOnComplete: {
    count: 1000,    // Keep last 1000 completed jobs
    age: 24 * 60 * 60, // Remove completed jobs older than 24 hours
  },
  removeOnFail: {
    count: 500,     // Keep last 500 failed jobs
  },
};
```

Jobs that exhaust all retries are moved to the dead-letter queue (`bull:{queue}:failed`). Admins can view and manually retry failed jobs through the admin panel (future Phase 2 feature). Failed jobs also trigger an admin notification via the `admin:events` Redis pub/sub channel.

The BullMQ connection to Redis uses the circuit breaker pattern described in `REDIS_STRATEGY.md` — workers enter a waiting state on Redis connection loss and automatically resume when connectivity is restored.

---

## 7. Email System

### 7.1 Architecture

The email system is built on **React Email** for template authoring and **Resend** for delivery. Templates are authored as React components in `src/emails/` and rendered to HTML at send time. This separation allows designers and developers to iterate on email templates using React's component model, props, and conditional rendering.

```mermaid
flowchart LR
    A[Service Layer] -->|enqueue| B[BullMQ Email Queue]
    B --> C[Email Worker]
    C --> D[React Email Renderer]
    D -->|HTML string| E[Resend API]
    E --> F[User Inbox]

    G[Immediate Send Path] -->|bypass queue| D
```

### 7.2 React Email Templates

Templates are React components that accept typed props and return JSX:

| Template | File | Trigger |
|----------|------|---------|
| Welcome Email | `welcome-email.tsx` | Account registration |
| Email Verification | `verification-email.tsx` | Registration (with verification link) |
| Password Reset | `password-reset-email.tsx` | Password reset request |
| 2FA Enabled | `2fa-enabled.tsx` | User enables two-factor authentication |
| Deposit Confirmed | `deposit-confirmed.tsx` | Admin verifies a deposit |
| Withdrawal Processed | `withdrawal-processed.tsx` | Admin approves/processes a withdrawal |
| Investment Matured | `investment-matured.tsx` | Plan maturity job completes |
| KYC Approved | `kyc-approved.tsx` | Admin approves KYC submission |
| KYC Rejected | `kyc-rejected.tsx` | Admin rejects KYC submission |
| Referral Commission | `referral-commission.tsx` | Referral commission credited to sponsor |

All templates extend a base layout component that provides consistent branding (platform logo, colors, footer with unsubscribe preference).

### 7.3 Resend Integration

**Configuration:**
- API key stored in `RESEND_API_KEY` environment variable
- From address: `noreply@teslaprimecapital.com` (configurable via `EMAIL_FROM`)
- Reply-to: `support@teslaprimecapital.com`

**EmailService Implementation:**

```typescript
import { Resend } from 'resend';
import { render } from '@react-email/render';

const resend = new Resend(process.env.RESEND_API_KEY);

class EmailService {
  async send(template: EmailTemplateType, to: string, props: Record<string, unknown>) {
    const component = templateRegistry[template];
    const html = await render(component(props));

    return emailQueue.add('send-email', {
      template,
      to,
      subject: component.subject(props),
      html,
      props,
    });
  }

  async sendImmediate(template: EmailTemplateType, to: string, props: Record<string, unknown>) {
    const component = templateRegistry[template];
    const html = await render(component(props));

    await resend.emails.send({
      from: process.env.EMAIL_FROM!,
      to,
      subject: component.subject(props),
      html,
    });
  }
}
```

**Immediate vs. Queued:** Security-sensitive emails (password reset, 2FA changes) use `sendImmediate` to bypass the queue. Marketing and informational emails use the queued `send` method.

---

## 8. File Upload Flow

### 8.1 Two-Step Upload Pattern

The platform uses a two-step upload pattern to offload file transfer from the application server to Cloudinary:

```mermaid
sequenceDiagram
    participant C as Client
    participant API as Backend API
    participant CLD as Cloudinary

    C->>API: POST /api/v1/uploads/signed-url<br/>{ category, entityId }
    API->>API: Validate auth, permissions, file category
    API->>CLD: Generate signature (server-side)
    API-->>C: { uploadUrl, uploadParams, signature }

    C->>CLD: POST (multipart/form-data)<br/>Direct file upload
    CLD-->>C: { publicId, url, width, height }

    C->>API: POST /api/v1/kyc/submit<br/>{ documents: [{ publicId }] }
    API->>CLD: HEAD /resources/:publicId (verify)
    CLD-->>API: 200 OK
    API->>API: Store publicId in database
    API-->>C: 201 Created
```

### 8.2 File Category Configuration

| Category | Max Size | Accepted Types | Cloudinary Folder | Transformations |
|----------|----------|---------------|-------------------|----------------|
| Avatar | 5 MB | JPEG, PNG, WebP | `avatars/{userId}` | Resize to 400x400, face crop |
| KYC Document | 10 MB | JPEG, PNG, WebP, PDF | `kyc/{userId}/{docType}` | Resize to 2000px max width, quality 80% |
| Gift Card Screenshot | 8 MB | JPEG, PNG | `gift-cards/{depositId}` | No resize (preserve detail) |

### 8.3 Validation

**File type validation** checks both extension and magic bytes:
- The backend extracts the file extension from the original filename and validates it against the allowed types for the category.
- The Cloudinary upload preset also enforces allowed formats, providing a second validation layer.
- Mismatched extension/content-type combinations are rejected.

**File size validation** occurs at two points:
- The backend checks the `Content-Length` header (or the declared size) before generating a signed URL.
- Cloudinary enforces size limits via the upload preset configuration.

### 8.4 Cloudinary Integration

**Signed URL Generation:**
```typescript
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function generateSignedUploadUrl(userId: string, category: UploadCategory) {
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = getFolderForCategory(category, userId);
  const signature = cloudinary.utils.api_sign_request(
    { timestamp, folder, ...getPresetConfig(category) },
    process.env.CLOUDINARY_API_SECRET!
  );

  return {
    uploadUrl: `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/auto/upload`,
    params: {
      timestamp,
      signature,
      folder,
      api_key: process.env.CLOUDINARY_API_KEY,
      upload_preset: category,
    },
  };
}
```

**Post-Upload Verification:** After the client uploads a file and returns the `publicId`, the backend verifies the upload exists by calling Cloudinary's Admin API (`cloudinary.api.resource(publicId)`). This prevents clients from submitting fake or malicious `publicId` values.

### 8.5 KYC Document Handling

KYC document uploads follow a specific flow:

1. User navigates to KYC verification page.
2. For each required document (ID front, ID back, selfie, proof of address), the client requests a signed upload URL with `category: 'kyc_document'` and `entityId: userId`.
3. The client uploads the document directly to Cloudinary.
4. The client collects all `publicId` values and submits them to `POST /api/v1/kyc/submit`.
5. The backend verifies each upload, creates KYC document records, and sets the submission status to `under_review`.
6. Admin reviews documents via the admin panel (which displays the Cloudinary URLs in a secure viewer).

### 8.6 Gift Card Screenshot Handling

1. User initiates a gift card deposit and selects the card type and amount.
2. The client requests a signed upload URL with `category: 'gift_card'` and `entityId: depositId`.
3. The user photographs or uploads the gift card screenshot.
4. The client uploads the image directly to Cloudinary.
5. The `publicId` is included in the `POST /api/v1/deposits/gift-card` request.
6. The backend creates the deposit in `pending` status and dispatches a gift card verification job to the BullMQ gift card queue for admin review.

---

## 9. Error Handling Strategy

### 9.1 Custom Error Classes

All business logic errors are expressed through a hierarchy of custom error classes that extend a base `AppError`. This allows the global error handler to map errors to appropriate HTTP responses without leaking implementation details.

```typescript
// src/server/utils/errors.ts

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string,
    public details?: Array<{ field: string; message: string }>
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super(404, `${resource} with ID ${id} not found`, 'NOT_FOUND');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(401, message, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(403, message, 'FORBIDDEN');
  }
}

export class ValidationError extends AppError {
  constructor(details: Array<{ field: string; message: string }>) {
    super(400, 'Validation failed', 'VALIDATION_ERROR', details);
  }
}

export class BusinessRuleError extends AppError {
  constructor(message: string, code?: string) {
    super(422, message, code || 'BUSINESS_RULE_VIOLATION');
  }
}

export class InsufficientBalanceError extends BusinessRuleError {
  constructor() {
    super('Insufficient wallet balance for this operation', 'INSUFFICIENT_BALANCE');
  }
}

export class KYCLevelRequiredError extends BusinessRuleError {
  constructor(requiredLevel: number, currentLevel: number) {
    super(
      `KYC Level ${requiredLevel} required. Current level: ${currentLevel}`,
      'KYC_LEVEL_REQUIRED'
    );
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message, 'CONFLICT');
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfter: number) {
    super(429, 'Too many requests', 'RATE_LIMITED');
    this.retryAfter = retryAfter;
  }
}
```

### 9.2 Global Error Handler

A global error handler catches all unhandled errors from route handlers and middleware, translating them to the standardized API response format. The handler is applied as a catch-all at the API route level.

```typescript
// src/server/utils/error-handler.ts

export function globalErrorHandler(error: unknown): NextResponse {
  // Log the error with context (never log in production for 4xx errors)
  if (!(error instanceof AppError) || error.statusCode >= 500) {
    logger.error('Unhandled error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
  }

  if (error instanceof AppError) {
    return NextResponse.json(
      {
        success: false,
        message: error.message,
        code: error.code,
        errors: error.details || undefined,
      },
      { status: error.statusCode }
    );
  }

  // Prisma unique constraint violation
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    return NextResponse.json(
      {
        success: false,
        message: 'A record with this value already exists',
        code: 'UNIQUE_CONSTRAINT_VIOLATION',
      },
      { status: 409 }
    );
  }

  // Zod validation error (fallback if middleware didn't catch)
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      {
        success: false,
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        errors: error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      },
      { status: 400 }
    );
  }

  // Unexpected error — return generic message
  return NextResponse.json(
    {
      success: false,
      message: 'An unexpected error occurred. Please try again.',
      code: 'INTERNAL_ERROR',
    },
    { status: 500 }
  );
}
```

### 9.3 Error Response Format

All error responses follow the standardized envelope defined in `API_REQUIREMENTS.md`:

```json
{
  "success": false,
  "message": "Insufficient wallet balance for this operation",
  "code": "INSUFFICIENT_BALANCE",
  "errors": [
    {
      "field": "amount",
      "message": "The amount exceeds your available balance of $500.00"
    }
  ]
}
```

- `success`: Always `false` for errors.
- `message`: Human-readable error summary.
- `code`: Machine-readable error code for client-side logic branching.
- `errors`: Optional array of field-level errors (present only for validation errors).

### 9.4 Error Handling in Services

Services throw domain-specific errors that bubble up through the controller to the global error handler. Services never catch their own domain errors — they let them propagate:

```typescript
// InvestmentService.createInvestment
async createInvestment(userId: string, planId: string, amount: number, mode: Mode) {
  const plan = await this.planRepo.findById(planId);
  if (!plan) throw new NotFoundError('Plan', planId);
  if (!plan.isActive) throw new BusinessRuleError('This plan is not currently accepting investments');

  if (amount < plan.minDeposit || amount > plan.maxDeposit) {
    throw new BusinessRuleError(
      `Amount must be between $${plan.minDeposit} and $${plan.maxDeposit} for the ${plan.name} plan`
    );
  }

  // This throws InsufficientBalanceError if balance is insufficient
  await this.walletService.debitWallet(userId, amount, 'investment', planId, mode);
  // ... continue with investment creation
}
```

---

## 10. Environment Configuration

### 10.1 Required Environment Variables

All configuration is sourced from environment variables. A `.env.example` file is provided in the repository root. No hardcoded configuration values exist in the source code.

| Variable | Description | Required | Default | Example |
|----------|-------------|----------|---------|---------|
| `NODE_ENV` | Application environment | Yes | `development` | `production` |
| `DATABASE_URL` | PostgreSQL connection string | Yes | — | `postgresql://user:pass@host:5432/dbname` |
| `REDIS_URL` | Redis connection string | Yes | — | `redis://:password@host:6379/0` |
| `JWT_SECRET` | Secret for signing JWT access tokens | Yes | — | `a-256-bit-random-secret` |
| `JWT_REFRESH_SECRET` | Secret for signing refresh tokens | Yes | — | `another-256-bit-random-secret` |
| `JWT_ACCESS_EXPIRY` | Access token expiry | No | `15m` | `15m` |
| `JWT_REFRESH_EXPIRY` | Refresh token expiry | No | `7d` | `7d` |
| `RESEND_API_KEY` | Resend email API key | Yes | — | `re_abc123...` |
| `EMAIL_FROM` | Sender email address | Yes | — | `noreply@teslaprimecapital.com` |
| `EMAIL_REPLY_TO` | Reply-to email address | No | `EMAIL_FROM` | `support@teslaprimecapital.com` |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | Yes | — | `my-cloud` |
| `CLOUDINARY_API_KEY` | Cloudinary API key | Yes | — | `123456789012345` |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | Yes | — | `abc123def456...` |
| `DEMO_WALLET_STARTING_BALANCE` | Starting balance for Demo mode wallet | No | `10000` | `10000` |
| `WITHDRAWAL_FEE_PERCENT` | Withdrawal fee percentage | No | `21` | `21` |
| `PLATFORM_NAME` | Display name for the platform | No | `TeslaPrimeCapital` | `TeslaPrimeCapital` |
| `SUPPORT_EMAIL` | Support contact email | No | `support@teslaprimecapital.com` | `support@teslaprimecapital.com` |
| `RATE_LIMIT_ENABLED` | Enable/disable rate limiting | No | `true` | `true` |
| `AUDIT_LOG_RETENTION_DAYS` | Days to retain audit logs | No | `90` | `90` |
| `BCRYPT_SALT_ROUNDS` | Password hashing salt rounds | No | `12` | `12` |
| `CORS_ORIGINS` | Allowed CORS origins (comma-separated) | No | `*` | `https://app.teslaprimecapital.com` |
| `CRYPTO_PRICING_API_URL` | External crypto pricing API | No | — | `https://api.example.com/prices` |
| `CRYPTO_PRICING_API_KEY` | API key for pricing service | No | — | `key123` |

### 10.2 Config Validation at Startup

Environment variables are validated at application startup using a Zod schema. If any required variable is missing or invalid, the application **refuses to start** and logs a clear error message. This prevents the application from running in a misconfigured state.

```typescript
// src/server/config/env.ts
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  DATABASE_URL: z.string().url().min(1),
  REDIS_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),
  RESEND_API_KEY: z.string().min(1).startsWith('re_'),
  EMAIL_FROM: z.string().email(),
  CLOUDINARY_CLOUD_NAME: z.string().min(1),
  CLOUDINARY_API_KEY: z.string().min(1),
  CLOUDINARY_API_SECRET: z.string().min(1),
  DEMO_WALLET_STARTING_BALANCE: z.coerce.number().default(10000),
  WITHDRAWAL_FEE_PERCENT: z.coerce.number().min(0).max(100).default(21),
  PLATFORM_NAME: z.string().default('TeslaPrimeCapital'),
  RATE_LIMIT_ENABLED: z.coerce.boolean().default(true),
  AUDIT_LOG_RETENTION_DAYS: z.coerce.number().default(90),
  BCRYPT_SALT_ROUNDS: z.coerce.number().min(4).max(16).default(12),
});

export function validateEnv() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('❌ Invalid environment configuration:');
    result.error.issues.forEach((issue) => {
      console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
    });
    process.exit(1);
  }

  return result.data;
}

export const env = validateEnv();
```

### 10.3 Configuration Access

Services and middleware access configuration through the validated `env` object:

```typescript
import { env } from '@/server/config/env';

// Usage in service
const maxLoginAttempts = 5;
const accessToken = jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_ACCESS_EXPIRY });
```

Direct access to `process.env` is prohibited outside of `src/server/config/env.ts`. ESLint enforces this rule:

```json
{
  "rules": {
    "no-process-env": "error"
  }
}
```

### 10.4 Environment-Specific Behavior

| Behavior | Development | Staging | Production |
|----------|------------|---------|------------|
| Error responses | Include stack traces | Include stack traces | Generic messages only |
| Prisma logging | All queries logged | Query + error | Error only |
| Rate limiting | Disabled (unless `RATE_LIMIT_ENABLED=true`) | Enabled | Enabled |
| CORS | `*` (all origins) | Configured origins | Configured origins |
| Redis failure | Warning log, continue | Warning log, continue | Warning log, continue |
| BullMQ job processing | In-process (same Node) | In-process | In-process |
| Email sending | Console log (unless Resend key present) | Resend | Resend |

---

## Appendix A: Request/Response Flow Summary

```mermaid
graph TD
    subgraph Client
        A[Browser / Mobile App]
    end

    subgraph "Next.js Server"
        subgraph "Middleware Pipeline"
            B[Rate Limiter]
            C[Auth JWT Verify]
            D[RBAC Check]
            E[Mode Context]
            F[Zod Validation]
            G[KYC Gate]
            H[Audit Logger]
        end

        subgraph "Application Layers"
            I[API Route Controller]
            J[Service Layer]
            K[Repository Layer]
        end
    end

    subgraph "Data Stores"
        L[(PostgreSQL)]
        M[(Redis)]
    end

    subgraph "External Services"
        N[Cloudinary]
        O[Resend]
    end

    subgraph "Background"
        P[BullMQ Workers]
        Q[Job Processors]
    end

    A -->|HTTP Request| B
    B --> C --> D --> E --> F --> G --> H
    H --> I --> J --> K
    K --> L
    J --> M
    J --> N
    J --> O
    J -->|enqueue| P
    P --> Q --> J
    Q --> M
    Q --> O

    I -->|HTTP Response| A
```

---

## Appendix B: Mode Isolation Patterns

Every database query that touches user-scoped financial data includes a mode filter. This is enforced at the repository layer:

```typescript
// Repository base pattern
async findWalletByUser(userId: string, mode: 'demo' | 'live') {
  return this.prisma.wallet.findUnique({
    where: { userId_mode: { userId, mode } },
  });
}

async findInvestmentsByUser(userId: string, mode: 'demo' | 'live') {
  return this.prisma.investment.findMany({
    where: { userId, mode },
    orderBy: { createdAt: 'desc' },
  });
}
```

Prisma's compound unique constraint `@@unique([userId, mode])` on the `Wallet` model ensures each user has exactly one wallet per mode. Investment, deposit, withdrawal, and transaction tables all include a `mode` column with an index for efficient filtering.

---

## Appendix C: Recommended Packages

| Package | Version | Purpose |
|---------|---------|---------|
| `@prisma/client` | 6.x | Database client (auto-generated) |
| `prisma` | 6.x | CLI for migrations and generation |
| `zod` | 3.x | Schema validation |
| `bcryptjs` | 2.x | Password hashing (pure JS, no native deps) |
| `jsonwebtoken` | 9.x | JWT signing and verification |
| `otplib` | 12.x | TOTP 2FA generation and verification |
| `bullmq` | 5.x | Job queue management |
| `ioredis` | 5.x | Redis client (used by BullMQ and directly) |
| `resend` | 4.x | Email delivery SDK |
| `@react-email/render` | 1.x | React Email HTML rendering |
| `react-email` | 3.x | Email template components |
| `cloudinary` | 2.x | Cloudinary SDK for signed uploads |
| `uuid` | 11.x | UUID v7 generation |
| `node-cron` | 3.x | Cron-based job scheduling |
| `date-fns` | 4.x | Date formatting and manipulation |
| `dotenv` | 16.x | Environment variable loading |
| `winston` | 3.x | Structured logging |

---

*This document is a living specification. As the implementation progresses, architectural decisions may be refined and this document should be updated accordingly.*