# TeslaPrimeCapital — Phase 2 Domain Model

> **Version:** 2.0.0  
> **Status:** Final Specification  
> **Last Updated:** 2025-01-20  
> **Audience:** Backend engineers, domain architects, QA leads  

---

## Table of Contents

1. [Domain Model Overview](#1-domain-model-overview)
2. [Core Aggregates](#2-core-aggregates)
3. [Value Objects](#3-value-objects)
4. [Domain Events](#4-domain-events)
5. [Entity Relationships](#5-entity-relationships)
6. [State Machines](#6-state-machines)
7. [Business Rules](#7-business-rules)

---

## 1. Domain Model Overview

### 1.1 Domain-Driven Design Approach

TeslaPrimeCapital adopts a tactical Domain-Driven Design (DDD) approach within a **modular monolith** architecture. Rather than distributing bounded contexts across microservices prematurely, the platform encapsulates each domain slice as an internally cohesive module with explicit boundaries, dedicated schemas (or prefixed tables), and well-defined integration surfaces via domain events. This strategy preserves the team's ability to reason about the whole system while enforcing the same conceptual boundaries that would exist in a distributed architecture. Each module owns its data exclusively; cross-module communication occurs exclusively through asynchronous domain events dispatched by an in-process event bus and persisted to an outbox table for reliability.

The strategic design recognizes that the core domain is the **investment lifecycle** — the progression from deposit through plan selection, investment activation, return accrual, and withdrawal. Everything else (identity, notifications, support) is a supporting or generic subdomain. This distinction drives where the team invests the most modeling effort and where simpler CRUD-style patterns are acceptable.

### 1.2 Bounded Contexts

#### Auth Context

The Auth bounded context is responsible for all authentication and authorization concerns: registration, login, token issuance (JWT access + refresh pair), session management, password reset flows, and two-factor authentication (TOTP). It owns the credential verification logic and produces authenticated principal objects consumed by all other contexts. Auth depends on the Identity context for user status and KYC-level checks that gate certain operations (e.g., login may be blocked for suspended users). Auth publishes `UserRegistered` and `PasswordChanged` events. It does not directly access Wallet or Investment data — it only verifies the user's right to operate.

#### Identity Context

The Identity context manages the User entity, profile data, role assignments, and account lifecycle (activation, suspension, reactivation, closure). It is the canonical owner of user metadata such as email, username, preferred currency, demo-mode toggle, and referral code. Identity subscribes to `KYCApproved` events to elevate a user's KYC level automatically. It publishes `UserSuspended`, `UserReactivated`, and `TwoFactorEnabled`/`TwoFactorDisabled` events. The Identity context is referenced by virtually every other context because every domain operation begins with a user.

#### Wallet Context

The Wallet context is the financial ledger of the platform. It manages Wallet entities (one per user per mode — demo and live), enforces balance invariants (non-negative, locked vs. available), and coordinates all balance mutations through its `credit`, `debit`, `lock`, and `unlock` domain methods. Every financial operation — deposits, withdrawals, investment funding, return crediting, commission payments, fee deductions — flows through this context. The Wallet context publishes `WalletCredited`, `WalletDebited`, `BalanceLocked`, and `BalanceUnlocked` events. It consumes events from Deposit, Withdrawal, Investment, and Referral contexts to perform the corresponding balance mutations, ensuring that all monetary movements are serialized through a single aggregate per wallet to prevent race conditions.

#### Investment Context

The Investment context is the core domain. It owns Investment entities, Plan definitions, and the maturity processing engine. When a user selects a plan and funds it, this context validates the plan constraints (min/max amount, one active investment per plan per user), creates the Investment aggregate, locks the required funds from the Wallet, and schedules the maturity date. On maturity, it calculates the expected return and emits a `ReturnCredited` event that the Wallet context consumes. The Investment context also manages plan catalog administration (CRUD operations performed by admins). It depends on the Wallet context for locking/unlocking funds and on the Identity context for KYC-level verification (certain plans may require higher KYC levels).

#### Deposit Context

The Deposit context handles incoming funds through two distinct channels: cryptocurrency (BTC, ETH, USDT) and gift cards (screenshot upload + manual verification). For crypto deposits, it tracks the expected transaction hash, coordinates with external blockchain monitors (or admin manual confirmation), and transitions the deposit through pending → verifying → confirmed states. For gift card deposits, it manages image upload references, queues the deposit for KYC Officer review, and handles approval or rejection. Upon confirmation, the Deposit context emits `DepositConfirmed`, which triggers the Wallet context to credit the user's wallet. This context depends on the Wallet context (to know which wallet to credit) and on the Identity context (KYC level must be ≥ 1 for any deposit).

#### Withdrawal Context

The Withdrawal context manages outgoing funds. It validates that the user has sufficient available balance, calculates the 21% composite fee (management, signal, insurance, VAT), creates the Withdrawal aggregate, and locks the full amount. Admin approval is required before funds are released. The context transitions withdrawals through pending → approved → processing → completed|failed, or directly to rejected at the pending stage. Upon completion, it emits `WithdrawalProcessed`, which the Wallet context consumes to debit the wallet and unlock any remainder. This context depends on the Wallet context, the Identity context (KYC level ≥ 2 for standard withdrawals, ≥ 3 for high-value), and the Investment context (to verify no active investment conflicts).

#### Referral Context

The Referral context implements the referral program: unique referral code generation, referral tracking, 10% direct commission on referred user's deposits/investments, and a binary bonus structure where commissions are paid when both left and right legs are active. It owns the Referral aggregate (linking referrer to referred) and the BinaryNode entity (positioning users in the binary tree). It subscribes to `DepositConfirmed` and `InvestmentCreated` events to calculate and trigger commission payments, emitting `CommissionEarned` and `BinaryBonusPaid` events that the Wallet context consumes. The Referral context depends on the Identity context for user lookup and the Wallet context for commission crediting.

#### KYC Context

The KYC context manages the know-your-customer verification pipeline. It owns KYCSubmission aggregates, each representing a user's attempt to reach a specific KYC level. Documents are stored as a JSONB array of file references (to Cloudinary). KYC Officers review submissions, and the context enforces sequential level progression (Level 1 → 2 → 3). It publishes `KYCApproved`, `KYCRejected`, and `KYCResubmissionRequested` events. The Identity context subscribes to these to update the user's `kycLevel` field. The KYC context depends on Identity (to verify the user exists and to record the reviewer) and on the Admin context (KYC Officers are a specialized admin role).

#### Notification Context

The Notification context is a generic supporting subdomain responsible for dispatching notifications (email, in-app, SMS) in response to domain events. It subscribes to a wide range of events from other contexts (`UserRegistered`, `DepositConfirmed`, `WithdrawalProcessed`, `KYCApproved`, etc.) and renders appropriate notification templates. It maintains a Notification entity for delivery tracking and a NotificationPreference entity per user for channel opt-in/out. This context has no dependencies on other domain contexts — it is purely reactive.

#### Support Context

The Support context manages user support tickets and admin responses. It owns Ticket and TicketMessage entities, handles ticket lifecycle (open → in_progress → resolved → closed), and assigns tickets to support agents. It depends on the Identity context for user and agent lookup. It is a generic subdomain with minimal coupling to the core investment domain.

#### Admin Context

The Admin context provides the administrative control plane: user management (search, suspend, activate), deposit/withdrawal approval workflows, KYC review queues, plan management, system configuration, and audit logging. It consumes entities and events from virtually every other context, presenting them through a unified admin dashboard API. The Admin context does not own core domain logic — it orchestrates and approves operations that are owned by their respective domain contexts.

### 1.3 Modular Monolith Mapping

Each bounded context maps to a dedicated module directory within the backend codebase (e.g., `src/modules/auth/`, `src/modules/wallet/`, `src/modules/investment/`). Inter-module communication uses a shared `EventBus` interface implemented as an in-process mediator. Each module exposes a public API through a dedicated controller/router, a service layer containing domain logic, a repository layer for persistence, and an event handler layer for reacting to cross-domain events. Database tables are prefixed per module (e.g., `wallet_`, `investment_`, `kyc_`) to enforce logical separation even within a shared physical database.

---

## 2. Core Aggregates

### 2.1 User Aggregate

**Aggregate Root:** `User`

The User aggregate is the central entity of the Identity context. It represents a registered platform participant whose lifecycle spans from registration through account closure. The User aggregate is the only entry point for all operations involving a person on the platform.

#### Entity Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key, generated at creation |
| `email` | Email (Value Object) | Unique, normalized to lowercase |
| `username` | string | Unique, 3-30 characters, alphanumeric + underscore |
| `passwordHash` | string | bcrypt hash, never exposed via API |
| `role` | enum (USER, KYC_OFFICER, ADMIN, SUPER_ADMIN) | Assigned at creation, restricted escalation rules apply |
| `kycLevel` | enum (LEVEL_0, LEVEL_1, LEVEL_2, LEVEL_3) | Defaults to LEVEL_0, elevated by KYC context |
| `status` | enum (PENDING_VERIFICATION, ACTIVE, SUSPENDED, CLOSED) | Current account status |
| `preferredCurrency` | string (ISO 4217) | Fiat currency for display purposes (USD, EUR, GBP, etc.) |
| `demoMode` | boolean | true = demo/simulated, false = live/real funds |
| `referralCode` | string | Unique 8-character alphanumeric code, auto-generated |
| `referredBy` | UUID (nullable) | ID of the referring user, null if organic signup |
| `twoFactorEnabled` | boolean | Whether TOTP 2FA is active |
| `twoFactorSecret` | string (nullable) | Encrypted TOTP secret, null if 2FA disabled |
| `failedLoginAttempts` | integer | Counter for lockout logic, reset on successful login |
| `lockedUntil` | timestamp (nullable) | Expiration of account lockout, null if not locked |
| `lastLoginAt` | timestamp (nullable) | Most recent successful login |
| `createdAt` | timestamp | Immutable creation timestamp |
| `updatedAt` | timestamp | Auto-updated on every aggregate mutation |

#### Invariants

- **Email Uniqueness:** No two active (non-closed) users may share the same email address. This is enforced at the database level with a unique partial index on `email WHERE status != 'CLOSED'`.
- **Username Uniqueness:** Same uniqueness constraint as email — no two active users may share a username.
- **Role Immutability Constraints:** A user's role can only be escalated, never downgraded, and only by a SUPER_ADMIN. The specific allowed transitions are: USER → KYC_OFFICER (by SUPER_ADMIN), USER → ADMIN (by SUPER_ADMIN), ADMIN → SUPER_ADMIN (by SUPER_ADMIN). A KYC_OFFICER cannot self-promote or promote others.
- **Status Transition Validity:** The status field may only transition along defined paths (see Section 6: State Machines). Direct jumps (e.g., PENDING_VERIFICATION → SUSPENDED) are prohibited.
- **KYC Level Sequencing:** KYC levels must be achieved in order (0 → 1 → 2 → 3). A level cannot be skipped, and a level cannot be downgraded once approved.
- **Referral Code Immutability:** Once generated at registration, the referral code cannot be changed.

#### Lifecycle Events

- **Creation:** Triggered during registration. The user starts in `PENDING_VERIFICATION` status and `LEVEL_0` KYC. A unique referral code is generated. A `WalletCreated` event is also emitted for the default demo wallet.
- **Email Verification:** Upon confirming the email token, the user transitions to `ACTIVE` status and `LEVEL_1` KYC. A `UserVerified` event is published.
- **Suspension:** An admin may suspend a user, preventing all operations. A `UserSuspended` event is published. Active investments continue to mature but withdrawals are blocked.
- **Reactivation:** A SUPER_ADMIN may reactivate a suspended user. A `UserReactivated` event is published.
- **Closure:** A user may request account closure. If no active investments or pending withdrawals exist, the account transitions to `CLOSED`. If active investments exist, closure is deferred until maturity.

---

### 2.2 Wallet Aggregate

**Aggregate Root:** `Wallet`

The Wallet aggregate is the financial core of the platform, owned by the Wallet context. Each user has exactly two wallets: one in demo mode and one in live mode. All monetary movements are serialized through the wallet aggregate to ensure consistency.

#### Entity Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `userId` | UUID | Foreign key to User |
| `mode` | enum (DEMO, LIVE) | Wallet mode — demo is simulated, live is real |
| `balance` | Decimal(18,8) | Total balance including locked funds |
| `availableBalance` | Decimal(18,8) | Balance available for new operations |
| `lockedBalance` | Decimal(18,8) | Balance locked in active investments or pending withdrawals |
| `currency` | string | Base currency code (USD for all wallets; crypto amounts stored separately in transactions) |
| `createdAt` | timestamp | Immutable creation timestamp |
| `updatedAt` | timestamp | Auto-updated on every mutation |

#### Invariants

- **Non-Negative Balance:** `balance >= 0` at all times. This is enforced by every debit operation checking sufficiency before mutating state. Database-level CHECK constraint provides a safety net.
- **Available Balance Ceiling:** `availableBalance <= balance` always. An operation that would set availableBalance above balance is rejected.
- **Locked Balance Derivation:** `lockedBalance = balance - availableBalance` must hold at all times. This is not stored as an independent value but derived; however, it is persisted for query performance and validated on every write.
- **Mode Exclusivity:** A user may have at most one wallet per mode. Attempting to create a second DEMO or LIVE wallet for the same user throws a domain exception.
- **Cross-Mode Isolation:** Demo wallet operations must never affect the live wallet and vice versa. The mode is a mandatory filter on every query.

#### Domain Methods

- **`credit(amount: Money): void`** — Increases both `balance` and `availableBalance` by the given amount. Emits `WalletCredited` event. Used by deposits, investment returns, and commission payments.
- **`debit(amount: Money): void`** — Decreases both `balance` and `availableBalance` by the given amount. Throws `InsufficientFundsException` if `availableBalance < amount`. Emits `WalletDebited` event. Used by withdrawals and investment funding.
- **`lock(amount: Money): void`** — Transfers `amount` from `availableBalance` to `lockedBalance`. Throws `InsufficientFundsException` if `availableBalance < amount`. Emits `BalanceLocked` event. Used when an investment is created or a withdrawal is initiated.
- **`unlock(amount: Money): void`** — Transfers `amount` from `lockedBalance` to `availableBalance`. Throws `InvalidOperationException` if `lockedBalance < amount`. Emits `BalanceUnlocked` event. Used when an investment is cancelled or a withdrawal fails and funds are returned.

---

### 2.3 Investment Aggregate

**Aggregate Root:** `Investment`

The Investment aggregate represents a single instance of a user placing funds into a managed investment plan. It tracks the full lifecycle from creation through maturity.

#### Entity Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `userId` | UUID | Foreign key to User |
| `planId` | UUID | Foreign key to Plan |
| `walletId` | UUID | Foreign key to Wallet (the wallet that funded this investment) |
| `amount` | Decimal(18,8) | Principal amount invested |
| `expectedReturn` | Decimal(18,8) | Calculated return based on plan's rate × amount |
| `returnRate` | Decimal(5,4) | The plan's return rate at the time of investment (snapshotted) |
| `startDate` | timestamp | When the investment becomes active |
| `maturityDate` | timestamp | When the investment matures and return is credited |
| `durationDays` | integer | Number of days in the investment period |
| `status` | enum (PENDING, ACTIVE, MATURED, CANCELLED) | Current investment status |
| `createdAt` | timestamp | Immutable creation timestamp |
| `updatedAt` | timestamp | Auto-updated on every mutation |

#### Invariants

- **Plan Amount Bounds:** The `amount` must satisfy `plan.minAmount <= amount <= plan.maxAmount`. If the user attempts to invest outside these bounds, a `PlanConstraintViolationException` is thrown.
- **Return Rate Consistency:** The `expectedReturn` must equal `amount * returnRate`. The `returnRate` is snapshotted from the Plan at creation time so that subsequent plan edits do not affect existing investments.
- **Maturity Date Calculation:** `maturityDate = startDate + durationDays days`. This is computed at creation time and is immutable.
- **Single Active Investment Per Plan Per User:** A user may not have more than one ACTIVE investment in the same plan at the same time. Attempting to create a duplicate throws `DuplicateActiveInvestmentException`. This is enforced by a database partial unique index on `(userId, planId) WHERE status = 'ACTIVE'`.
- **Wallet Mode Consistency:** The `walletId` must belong to the same user and must match the user's current mode (demo or live). Cross-mode investment funding is prohibited.

#### Lifecycle

1. **Create:** User selects a plan and amount. System validates constraints, locks funds from the wallet, creates the Investment in PENDING status, and emits `InvestmentCreated`.
2. **Activate:** The investment transitions to ACTIVE immediately upon creation (or after a brief confirmation window for live mode). `startDate` is set to the activation timestamp. Emits `InvestmentActivated`.
3. **Mature:** A scheduled job checks for investments whose `maturityDate` has passed. It transitions the investment to MATURED, unlocks the principal, credits the return to the wallet, and emits `InvestmentMatured` and `ReturnCredited`.
4. **Cancel (rare):** An admin may cancel a PENDING investment, unlocking the locked funds. Emits no return credit.

---

### 2.4 Transaction Aggregate

**Aggregate Root:** `Transaction`

The Transaction aggregate is an immutable audit log of every balance movement on a wallet. It serves as the financial ledger and is the basis for all account statements, reconciliation, and dispute resolution.

#### Entity Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `walletId` | UUID | Foreign key to Wallet |
| `type` | enum (DEPOSIT, WITHDRAWAL, INVESTMENT, RETURN, COMMISSION, FEE) | Category of the transaction |
| `amount` | Decimal(18,8) | Transaction amount (positive for credits, positive for debits; direction is in the type) |
| `balanceBefore` | Decimal(18,8) | Wallet balance immediately before this transaction |
| `balanceAfter` | Decimal(18,8) | Wallet balance immediately after this transaction |
| `status` | enum (PENDING, COMPLETED, FAILED, REVERSED) | Transaction status |
| `reference` | string | External reference (crypto tx hash, deposit ID, withdrawal ID, etc.) |
| `metadata` | JSONB | Additional context (crypto network, gift card ID, investment ID, etc.) |
| `createdAt` | timestamp | Immutable creation timestamp |

#### Invariants

- **Append-Only:** Once created, a Transaction's `amount`, `balanceBefore`, `balanceAfter`, `type`, and `reference` fields are immutable. Only `status` may change (PENDING → COMPLETED/FAILED/REVERSED).
- **Balance Consistency:** `balanceAfter = balanceBefore + amount` for credits, or `balanceAfter = balanceBefore - amount` for debits. This must hold true at creation time and is validated by the domain service.
- **Sequential Integrity:** For a given wallet, transactions are ordered by `createdAt`. The `balanceBefore` of transaction N+1 must equal the `balanceAfter` of transaction N (for the same wallet). Any gap triggers a reconciliation alert.
- **Immutability After Completion:** Once a transaction reaches COMPLETED status, its status cannot change. Only PENDING transactions may transition to COMPLETED, FAILED, or REVERSED.

---

### 2.5 Deposit Aggregate

**Aggregate Root:** `Deposit`

The Deposit aggregate manages incoming funds, supporting both cryptocurrency transfers and gift card submissions. It tracks the verification workflow from initiation through confirmation.

#### Entity Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `userId` | UUID | Foreign key to User |
| `walletId` | UUID | Foreign key to Wallet (target wallet for crediting) |
| `amount` | Decimal(18,8) | Declared deposit amount |
| `method` | enum (CRYPTO, GIFT_CARD) | Deposit channel |
| `status` | enum (PENDING, VERIFYING, CONFIRMED, FAILED, EXPIRED) | Current deposit status |
| `cryptoTxHash` | string (nullable) | Blockchain transaction hash for crypto deposits |
| `cryptoNetwork` | string (nullable) | Blockchain network (bitcoin, ethereum, tron for USDT) |
| `cryptoCurrency` | string (nullable) | Crypto currency code (BTC, ETH, USDT) |
| `giftCardImageIds` | string[] (nullable) | Array of Cloudinary image IDs for gift card screenshots |
| `giftCardType` | string (nullable) | Brand/type of the gift card |
| `currency` | string | Fiat equivalent currency (USD) |
| `fiatAmount` | Decimal(18,2) | Amount converted to fiat |
| `reviewNotes` | string (nullable) | Admin/KYC Officer review notes |
| `reviewedBy` | UUID (nullable) | ID of the admin who reviewed this deposit |
| `expiresAt` | timestamp | Expiration time for pending deposits (e.g., 24 hours for crypto) |
| `createdAt` | timestamp | Immutable creation timestamp |
| `updatedAt` | timestamp | Auto-updated on every mutation |

#### Lifecycle — Crypto Deposit

1. **PENDING:** User initiates a deposit, specifying the crypto currency and amount. System generates a unique deposit address (or reuses a user-specific one) and sets the expiration timer.
2. **VERIFYING:** A blockchain monitor (or admin) detects the transaction and matches it to the deposit. The `cryptoTxHash` is recorded.
3. **CONFIRMED:** After sufficient blockchain confirmations (or admin approval), the deposit is confirmed. The Wallet context credits the wallet. `DepositConfirmed` event is emitted.

Alternative terminal states: **FAILED** (transaction detected but incorrect amount), **EXPIRED** (no transaction detected within the expiration window).

#### Lifecycle — Gift Card Deposit

1. **PENDING:** User uploads one or more gift card screenshot images and declares the card type and amount.
2. **VERIFYING:** The deposit enters the KYC Officer review queue. The officer verifies the gift card balance (via external verification service or manual check) against the declared amount.
3. **CONFIRMED:** Officer approves the deposit. Wallet is credited. `GiftCardApproved` event is emitted.

Alternative terminal state: **REJECTED** (card is invalid, already used, or amount does not match). Funds are not credited. `GiftCardRejected` event is emitted with review notes explaining the reason.

---

### 2.6 Withdrawal Aggregate

**Aggregate Root:** `Withdrawal`

The Withdrawal aggregate manages outgoing funds, enforcing the platform's 21% composite fee and requiring admin approval before disbursement.

#### Entity Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `userId` | UUID | Foreign key to User |
| `walletId` | UUID | Foreign key to Wallet (source wallet) |
| `amount` | Decimal(18,8) | Gross withdrawal amount requested by the user |
| `fee` | Decimal(18,8) | Total fee (21% of amount) |
| `netAmount` | Decimal(18,8) | Amount the user actually receives (amount - fee) |
| `feeBreakdown` | JSONB | Detailed fee breakdown: `{ management: 10%, signal: 5%, insurance: 3%, vat: 3% }` |
| `destination` | JSONB | `{ type: 'crypto', currency: 'BTC', address: '...' }` or `{ type: 'bank', ... }` |
| `status` | enum (PENDING, APPROVED, PROCESSING, COMPLETED, FAILED, REJECTED) | Current status |
| `approvedBy` | UUID (nullable) | Admin who approved the withdrawal |
| `approvedAt` | timestamp (nullable) | Approval timestamp |
| `processedBy` | UUID (nullable) | Admin who processed the disbursement |
| `processedAt` | timestamp (nullable) | Processing/completion timestamp |
| `rejectionReason` | string (nullable) | Reason for rejection |
| `txHash` | string (nullable) | Blockchain transaction hash for crypto disbursements |
| `createdAt` | timestamp | Immutable creation timestamp |
| `updatedAt` | timestamp | Auto-updated on every mutation |

#### Invariants

- **Fee Calculation:** `fee = amount * 0.21` and `netAmount = amount - fee`. These are computed at creation time and are immutable.
- **Sufficient Balance:** `amount <= wallet.availableBalance` at the time of creation. The full gross amount is locked from the wallet immediately.
- **KYC Level Requirement:** The user must have KYC level ≥ 2 for standard withdrawals and ≥ 3 for withdrawals exceeding $25,000 (or equivalent).
- **No Active Investment Conflict:** The user must not have any investment that would be adversely affected by this withdrawal. (Withdrawals pull from available balance, not locked balance, so this is implicitly satisfied, but an explicit check ensures no edge cases.)

#### Lifecycle

1. **PENDING:** User requests a withdrawal. Full amount is locked from the wallet. Withdrawal enters the admin approval queue.
2. **APPROVED:** An admin reviews and approves the withdrawal. The `approvedBy` and `approvedAt` fields are set.
3. **PROCESSING:** The withdrawal is being executed — crypto transfer is initiated or bank wire is queued.
4. **COMPLETED:** Funds have been successfully disbursed. The wallet is debited for the full `amount` (the fee is retained by the platform; only `netAmount` is sent to the user). `WithdrawalProcessed` event is emitted.

Alternative paths: **REJECTED** at PENDING stage (admin denies the request; locked funds are returned to available balance). **FAILED** at PROCESSING stage (external failure; funds are returned to available balance).

---

### 2.7 Referral Aggregate

**Aggregate Root:** `Referral`

The Referral aggregate tracks the relationship between a referrer and a referred user, and calculates commissions.

#### Entity Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `referrerId` | UUID | Foreign key to User (the person who shared the referral code) |
| `referredId` | UUID | Foreign key to User (the person who signed up using the code) |
| `code` | string | The referral code used at signup |
| `isActive` | boolean | Whether the referral relationship is active (false if referred account is closed) |
| `totalCommissions` | Decimal(18,8) | Cumulative commissions earned from this referral |
| `createdAt` | timestamp | Immutable creation timestamp |

#### BinaryNode Entity (Child of Referral Context)

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `userId` | UUID | The user positioned in the tree |
| `parentId` | UUID (nullable) | Parent node (the referrer's binary node) |
| `position` | enum (LEFT, RIGHT) | Which leg this node occupies under its parent |
| `leftChildId` | UUID (nullable) | Left child node |
| `rightChildId` | UUID (nullable) | Right child node |
| `depth` | integer | Depth in the binary tree (root = 0) |

---

### 2.8 KYCSubmission Aggregate

**Aggregate Root:** `KYCSubmission`

The KYCSubmission aggregate represents a single attempt by a user to verify their identity at a specific KYC level.

#### Entity Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `userId` | UUID | Foreign key to User |
| `level` | enum (LEVEL_1, LEVEL_2, LEVEL_3) | Target KYC level |
| `status` | enum (PENDING, UNDER_REVIEW, APPROVED, REJECTED, EXPIRED) | Current status |
| `documents` | JSONB | Array of uploaded document references: `[{ type: 'id_front', url: '...', uploadedAt: '...' }, ...]` |
| `reviewNotes` | string (nullable) | Reviewer's notes (required for rejections) |
| `reviewedBy` | UUID (nullable) | ID of the KYC Officer who reviewed this submission |
| `reviewedAt` | timestamp (nullable) | Review completion timestamp |
| `expiresAt` | timestamp | Submission expiration (e.g., 72 hours for document upload completion) |
| `createdAt` | timestamp | Immutable creation timestamp |
| `updatedAt` | timestamp | Auto-updated on every mutation |

#### Level-Specific Document Requirements

- **Level 1:** Email verification only (no document upload; handled by Auth context).
- **Level 2:** Government-issued photo ID (front and back) — passport, national ID, or driver's license.
- **Level 3:** Selfie holding the ID + proof of address (utility bill, bank statement, or government correspondence dated within the last 90 days).

---

## 3. Value Objects

### 3.1 Money

Encapsulates a monetary amount with its currency, providing arithmetic operations that prevent floating-point errors by using integer-based internal representation (smallest unit, e.g., cents for USD, satoshis for BTC) or by enforcing decimal precision through the application's Decimal library.

- **Fields:** `amount: Decimal(18,8)`, `currency: string (ISO 4217 or crypto code)`
- **Operations:** `add(other: Money): Money`, `subtract(other: Money): Money`, `multiply(factor: Decimal): Money`, `divide(factor: Decimal): Money`, `percentage(rate: Percentage): Money`
- **Constraints:** `amount >= 0` (negative money is not representable; debits are represented as positive amounts with a directional transaction type). `add` and `subtract` throw `CurrencyMismatchException` if `this.currency !== other.currency`.
- **Serialization:** Stored in PostgreSQL as `NUMERIC(18,8)` for the amount and `VARCHAR(10)` for the currency. Never stored as a floating-point number.

### 3.2 Email

A validated, normalized email address value object.

- **Fields:** `value: string`
- **Validation:** RFC 5322 compliant regex check, max 254 characters, must contain exactly one `@`, domain must have at least one dot, TLD must be at least 2 characters.
- **Normalization:** Trimmed of leading/trailing whitespace, converted to lowercase. The normalized form is used for all comparisons and storage.
- **Immutability:** Once constructed, the value cannot be modified. A new instance must be created for a different email.

### 3.3 PhoneNumber

A phone number in E.164 international format.

- **Fields:** `value: string`
- **Validation:** Must match the E.164 format regex: `^\+[1-9]\d{1,14}$`. The leading `+` is required. Maximum 15 digits after the `+`.
- **Normalization:** All user input is parsed and formatted to E.164 using a library such as `libphonenumber`. Country codes are extracted for display purposes but the stored value is always E.164.

### 3.4 CryptoAddress

A validated cryptocurrency address, with validation logic that varies by blockchain.

- **Fields:** `address: string`, `network: enum (BITCOIN, ETHEREUM, TRON)`
- **Validation Rules:**
  - **Bitcoin:** Must be a valid P2PKH (starts with `1`), P2SH (starts with `3`), or Bech32/SegWit (starts with `bc1`) address. Length 26-62 characters.
  - **Ethereum:** Must be a valid hex address (0x followed by 40 hex characters). Case-insensitive, but EIP-55 checksum validation is applied if mixed case is provided.
  - **Tron (USDT):** Must be a valid Base58 address starting with `T`. Length 34 characters.
- **Immutability:** Address and network are set at construction and cannot be changed.

### 3.5 Percentage

A percentage value with decimal precision, used for fee calculations, return rates, and commission rates.

- **Fields:** `value: Decimal(5,4)` (range: 0.0000 to 100.0000)
- **Operations:** `of(amount: Money): Money` — calculates the percentage of a monetary amount. `add(other: Percentage): Percentage`, `subtract(other: Percentage): Percentage`.
- **Constraints:** Value must be in the range [0, 100]. Attempting to construct a Percentage with a value outside this range throws `InvalidPercentageException`.
- **Precision:** All arithmetic uses the underlying Decimal library with 4 decimal places of precision. No floating-point arithmetic is performed.

### 3.6 Duration

Represents a time duration in days, with the ability to calculate start and end dates.

- **Fields:** `days: integer` (range: 1 to 365)
- **Operations:** `from(startDate: Date): Date` — returns the end date by adding `days` to `startDate`. `contains(date: Date, startDate: Date): boolean` — checks if a date falls within the duration window.
- **Constraints:** `days` must be a positive integer. The context (Investment Plans) further constrains valid durations per plan (Basic: 1-7 days, Silver/Gold/Platinum: 1-14 days).

### 3.7 Address

A physical address value object used in KYC Level 3 (proof of address) and withdrawal destinations.

- **Fields:** `street: string`, `city: string`, `state: string`, `country: string (ISO 3166-1 alpha-2)`, `postalCode: string`
- **Validation:** `street` is required, max 200 characters. `city` is required, max 100 characters. `state` is required, max 100 characters. `country` must be a valid ISO 3166-1 alpha-2 code. `postalCode` is required, format validated per country (regex-based).
- **Normalization:** All string fields are trimmed. Country code is uppercased. State and city are title-cased.

---

## 4. Domain Events

All domain events implement a common interface with fields: `eventId: UUID`, `eventType: string`, `aggregateId: UUID`, `aggregateType: string`, `timestamp: ISO8601`, `payload: object`, `version: integer`. Events are dispatched to the in-process EventBus and persisted to an outbox table for reliable delivery.

### 4.1 User Events

| Event Name | Aggregate | Payload Fields | Description |
|------------|-----------|---------------|-------------|
| `UserRegistered` | User | `{ userId, email, username, referralCode, referredBy?, mode }` | Fired when a new user completes registration. Triggers demo wallet creation, welcome email, and referral tracking initialization. |
| `UserVerified` | User | `{ userId, email, previousKycLevel, newKycLevel }` | Fired when a user confirms their email address, transitioning from PENDING_VERIFICATION to ACTIVE status and KYC Level 0 to 1. Triggers onboarding notification. |
| `UserSuspended` | User | `{ userId, suspendedBy, reason }` | Fired when an admin suspends a user account. Triggers notification to the user and blocks all operations. |
| `UserReactivated` | User | `{ userId, reactivatedBy, reason }` | Fired when a SUPER_ADMIN reactivates a previously suspended account. Triggers notification and operation unblocking. |
| `PasswordChanged` | User | `{ userId, changedAt }` | Fired when a user successfully changes their password. Triggers notification and invalidation of all other active sessions. |
| `TwoFactorEnabled` | User | `{ userId, enabledAt }` | Fired when a user activates TOTP two-factor authentication. Triggers security notification. |
| `TwoFactorDisabled` | User | `{ userId, disabledAt, disabledBy }` | Fired when 2FA is disabled (by user or admin). Triggers security alert notification. |

### 4.2 Wallet Events

| Event Name | Aggregate | Payload Fields | Description |
|------------|-----------|---------------|-------------|
| `WalletCreated` | Wallet | `{ walletId, userId, mode, currency }` | Fired when a wallet is created for a user (both demo and live wallets are created at registration). |
| `WalletCredited` | Wallet | `{ walletId, userId, mode, amount, currency, reference, transactionId }` | Fired when funds are added to a wallet. Used by deposits, investment returns, and commissions. |
| `WalletDebited` | Wallet | `{ walletId, userId, mode, amount, currency, reference, transactionId }` | Fired when funds are removed from a wallet. Used by withdrawals and investment funding. |
| `BalanceLocked` | Wallet | `{ walletId, userId, mode, amount, currency, reference }` | Fired when a portion of available balance is locked (investment creation, withdrawal initiation). |
| `BalanceUnlocked` | Wallet | `{ walletId, userId, mode, amount, currency, reference }` | Fired when locked funds are returned to available balance (investment cancellation, withdrawal failure). |

### 4.3 Investment Events

| Event Name | Aggregate | Payload Fields | Description |
|------------|-----------|---------------|-------------|
| `InvestmentCreated` | Investment | `{ investmentId, userId, planId, planName, amount, expectedReturn, durationDays, maturityDate, mode }` | Fired when a user creates a new investment. Triggers referral commission calculation. |
| `InvestmentActivated` | Investment | `{ investmentId, userId, startDate, maturityDate }` | Fired when the investment transitions from PENDING to ACTIVE. Marks the start of the earning period. |
| `InvestmentMatured` | Investment | `{ investmentId, userId, planId, amount, expectedReturn, maturedAt }` | Fired when the investment reaches its maturity date. Triggers return crediting and balance unlocking. |
| `ReturnCredited` | Investment | `{ investmentId, userId, walletId, amount, mode }` | Fired when the investment return is successfully credited to the user's wallet. Triggers notification. |

### 4.4 Transaction Events

| Event Name | Aggregate | Payload Fields | Description |
|------------|-----------|---------------|-------------|
| `TransactionCreated` | Transaction | `{ transactionId, walletId, type, amount, status, reference }` | Fired when a new transaction record is created in the ledger. |
| `TransactionCompleted` | Transaction | `{ transactionId, walletId, type, amount, completedAt }` | Fired when a pending transaction transitions to COMPLETED status. |
| `TransactionFailed` | Transaction | `{ transactionId, walletId, type, amount, reason, failedAt }` | Fired when a transaction fails. Triggers notification and any necessary compensating actions. |

### 4.5 Deposit Events

| Event Name | Aggregate | Payload Fields | Description |
|------------|-----------|---------------|-------------|
| `DepositInitiated` | Deposit | `{ depositId, userId, walletId, amount, method, currency, mode }` | Fired when a user starts a deposit. Creates the initial PENDING deposit record. |
| `DepositConfirmed` | Deposit | `{ depositId, userId, walletId, amount, method, currency, confirmedAt, mode }` | Fired when a deposit is verified and confirmed. Triggers wallet crediting and notification. |
| `DepositFailed` | Deposit | `{ depositId, userId, amount, method, reason, failedAt, mode }` | Fired when a deposit fails verification or expires. Triggers user notification. |
| `GiftCardSubmitted` | Deposit | `{ depositId, userId, imageIds, giftCardType, declaredAmount }` | Fired when a user submits gift card images for verification. Triggers KYC Officer queue entry. |
| `GiftCardApproved` | Deposit | `{ depositId, userId, amount, reviewedBy, approvedAt }` | Fired when a KYC Officer approves a gift card deposit. Triggers wallet crediting. |
| `GiftCardRejected` | Deposit | `{ depositId, userId, reason, reviewedBy, rejectedAt }` | Fired when a gift card is rejected. Triggers notification to the user with rejection reason. |

### 4.6 Withdrawal Events

| Event Name | Aggregate | Payload Fields | Description |
|------------|-----------|---------------|-------------|
| `WithdrawalRequested` | Withdrawal | `{ withdrawalId, userId, walletId, amount, fee, netAmount, destination, mode }` | Fired when a user submits a withdrawal request. Triggers balance locking and admin queue entry. |
| `WithdrawalApproved` | Withdrawal | `{ withdrawalId, userId, amount, approvedBy, approvedAt }` | Fired when an admin approves a pending withdrawal. Triggers processing pipeline. |
| `WithdrawalProcessed` | Withdrawal | `{ withdrawalId, userId, walletId, amount, fee, netAmount, txHash?, processedBy, processedAt, mode }` | Fired when the withdrawal is fully processed and funds are disbursed. Triggers wallet debiting and notification. |
| `WithdrawalRejected` | Withdrawal | `{ withdrawalId, userId, amount, reason, rejectedBy, rejectedAt, mode }` | Fired when an admin rejects a withdrawal. Triggers balance unlocking and user notification. |

### 4.7 Referral Events

| Event Name | Aggregate | Payload Fields | Description |
|------------|-----------|---------------|-------------|
| `ReferralCreated` | Referral | `{ referralId, referrerId, referredId, code }` | Fired when a new user signs up using a referral code. Initializes the binary tree node. |
| `CommissionEarned` | Referral | `{ referralId, referrerId, referredId, sourceType, sourceId, amount, walletId }` | Fired when a referrer earns a 10% direct commission from a referred user's deposit or investment. Triggers wallet crediting. |
| `BinaryBonusPaid` | Referral | `{ nodeId, userId, leftVolume, rightVolume, bonusAmount, walletId }` | Fired when a binary bonus is calculated and paid (when both left and right legs have active volume). Triggers wallet crediting. |

### 4.8 KYC Events

| Event Name | Aggregate | Payload Fields | Description |
|------------|-----------|---------------|-------------|
| `KYCSubmitted` | KYCSubmission | `{ submissionId, userId, level, documentCount }` | Fired when a user submits documents for KYC review. Triggers KYC Officer queue entry and notification. |
| `KYCApproved` | KYCSubmission | `{ submissionId, userId, level, reviewedBy, reviewedAt }` | Fired when a KYC Officer approves a submission. Triggers user's KYC level elevation in the Identity context. |
| `KYCRejected` | KYCSubmission | `{ submissionId, userId, level, reason, reviewedBy, reviewedAt }` | Fired when a KYC submission is rejected. Triggers user notification with rejection reason and resubmission instructions. |
| `KYCResubmissionRequested` | KYCSubmission | `{ submissionId, userId, level, reason, requestedBy }` | Fired when a KYC Officer requests additional documents or corrections. Triggers user notification. |

---

## 5. Entity Relationships

### 5.1 Relationship Definitions

- **User → Wallets (1:many):** A user owns exactly two wallets — one DEMO and one LIVE. The relationship is enforced by a unique constraint on `(userId, mode)`. When a user is created, both wallets are automatically provisioned. Deleting a user (account closure) cascades to soft-delete the wallets.

- **User → Investments (1:many):** A user may have zero or more investments across different plans. However, at most one ACTIVE investment per plan per user is allowed. Historical (MATURED, CANCELLED) investments are retained indefinitely for audit purposes.

- **User → Deposits (1:many):** A user may have many deposits over their lifetime. Deposits are linked to both the user and the specific wallet that was credited.

- **User → Withdrawals (1:many):** A user may have many withdrawals. Only withdrawals from the user's active mode wallet are valid.

- **User → KYCSubmissions (1:many):** A user may have multiple KYC submissions per level (if previous attempts were rejected). Each submission represents one attempt. Only the most recent APPROVED submission per level determines the user's current KYC level.

- **User → Referrals as Referrer (1:many):** A user may refer many other users. The `referrerId` field on the Referral entity points back to the referring user.

- **User → Referrals as Referred (0:1):** A user was referred by at most one other user. The `referredId` field on the Referral entity points to the referred user. If `referredBy` is null on the User, no Referral record exists for this user as a referred party.

- **Wallet → Transactions (1:many):** Every financial movement on a wallet produces a Transaction record. Transactions are ordered by `createdAt` and must maintain sequential balance integrity.

- **Wallet → Investments (1:many, active):** Active investments lock funds from a specific wallet. The `walletId` on the Investment entity references the funding wallet. Only ACTIVE investments are considered for lock balance calculation.

- **Wallet → Deposits (1:many):** Deposits credit a specific wallet. The `walletId` on the Deposit entity identifies the target.

- **Wallet → Withdrawals (1:many):** Withdrawals debit from a specific wallet. The `walletId` on the Withdrawal entity identifies the source.

- **Investment → Plan (many:1):** Each investment references a single Plan. The plan's return rate and duration are snapshotted into the Investment at creation time.

- **Plan → Investments (1:many):** A plan may have many investments across many users. Plans are managed by admins and can be updated, but updates do not affect existing investments.

### 5.2 Entity-Relationship Diagram (Text-Based)

```
┌─────────────────────────────────────────────────────────────────────────────┐

  ┌──────────────┐       1:2        ┌──────────────────┐
  │    USER      │─────────────────▶│     WALLET       │
  │              │                  │ (DEMO & LIVE)    │
  ├──────────────┤                  ├──────────────────┤
  │ id (PK)      │       1:N        │ id (PK)          │
  │ email        │─────────────────▶│ userId (FK)      │
  │ username     │                  │ mode             │
  │ passwordHash │       1:N        │ balance          │
  │ role         │─────────────────▶│ availableBalance │
  │ kycLevel     │   ┌──────────┐   │ lockedBalance    │
  │ status       │   │INVESTMENT│   │ currency         │
  │ demoMode     │   │          │   └────────┬─────────┘
  │ referralCode │   │ id (PK)  │            │
  │ referredBy   │   │ userId   │            │ 1:N
  └──────┬───────┘   │ planId   │   ┌────────▼─────────┐
         │           │ walletId │   │   TRANSACTION     │
         │           │ amount   │   ├──────────────────┤
         │           │ expected │   │ id (PK)          │
         │           │  Return  │   │ walletId (FK)    │
         │           │ status   │   │ type             │
         │           └────┬─────┘   │ amount           │
         │                │         │ balanceBefore    │
         │                │ N:1     │ balanceAfter     │
         │                │         │ status           │
         │           ┌────▼─────┐   │ reference        │
         │           │   PLAN   │   │ metadata         │
         │           │          │   └──────────────────┘
         │           │ id (PK)  │
         │           │ name     │
         │           │ minAmount│   ┌──────────────────┐
         │           │ maxAmount│   │    DEPOSIT        │
         │           │ returnRt │   ├──────────────────┤
         │           │ duration │   │ id (PK)          │
         │           └──────────┘   │ userId (FK)      │
         │                           │ walletId (FK)    │
         │ 1:N                       │ amount           │
         │                           │ method           │
   ┌─────▼────────┐                 │ status           │
   │    DEPOSIT    │                 │ cryptoTxHash     │
   │  (see right)  │                 │ giftCardImageIds │
   └──────────────┘                 │ currency         │
                                    └──────────────────┘
  ┌──────────────────┐
  │   WITHDRAWAL     │               ┌──────────────────┐
  ├──────────────────┤               │   KYC SUBMISSION  │
  │ id (PK)          │               ├──────────────────┤
  │ userId (FK)      │               │ id (PK)          │
  │ walletId (FK)    │               │ userId (FK)      │
  │ amount           │               │ level            │
  │ fee              │               │ status           │
  │ netAmount        │               │ documents (JSONB)│
  │ feeBreakdown     │               │ reviewNotes      │
  │ status           │               │ reviewedBy (FK)  │
  │ approvedBy       │               │ reviewedAt       │
  │ destination       │               └──────────────────┘
  └──────────────────┘

  ┌──────────────────┐               ┌──────────────────┐
  │    REFERRAL      │               │   BINARY NODE    │
  ├──────────────────┤               ├──────────────────┤
  │ id (PK)          │               │ id (PK)          │
  │ referrerId (FK)  │───────────┐   │ userId (FK)      │
  │ referredId (FK)  │           │   │ parentId (FK)    │
  │ code             │           └──▶│ position         │
  │ isActive         │               │ leftChildId      │
  │ totalCommissions │               │ rightChildId     │
  └──────────────────┘               │ depth            │
                                      └──────────────────┘

└─────────────────────────────────────────────────────────────────────────────┘

RELATIONSHIP SUMMARY:
=====================
  USER ──(1:2)──▶ WALLET
  USER ──(1:N)──▶ INVESTMENT
  USER ──(1:N)──▶ DEPOSIT
  USER ──(1:N)──▶ WITHDRAWAL
  USER ──(1:N)──▶ KYC_SUBMISSION
  USER ──(1:N)──▶ REFERRAL (as referrer)
  USER ──(0:1)──▶ REFERRAL (as referred)
  WALLET ──(1:N)──▶ TRANSACTION
  WALLET ──(1:N)──▶ INVESTMENT (active)
  WALLET ──(1:N)──▶ DEPOSIT
  WALLET ──(1:N)──▶ WITHDRAWAL
  INVESTMENT ──(N:1)──▶ PLAN
  REFERRAL ──(1:1)──▶ BINARY_NODE
```

---

## 6. State Machines

### 6.1 User Status State Machine

```
                         ┌──────────────────────┐
                         │  PENDING_VERIFICATION │
                         │  (after registration)  │
                         └──────────┬───────────┘
                                    │
                         email verified
                                    │
                                    ▼
                         ┌──────────────────────┐
            ┌───────────│        ACTIVE         │◄──────────┐
            │           │  (fully operational)  │           │
            │           └──────────┬───────────┘           │
            │                      │                       │
            │              admin action               admin action
            │            (violation/policy)         (appeal granted)
            │                      │                       │
            │                      ▼                       │
            │           ┌──────────────────────┐           │
            │           │      SUSPENDED        │───────────┘
            │           │  (operations blocked) │
            │           └──────────┬───────────┘
            │                      │
            │              admin action
            │           (permanent violation)
            │                      │
            │                      ▼
            │           ┌──────────────────────┐
            └──────────│       CLOSED          │
  (deferred if        │  (no operations,      │
   active investments)│   read-only access)   │
                        └──────────────────────┘

TRANSITION RULES:
  PENDING_VERIFICATION → ACTIVE:    Triggered by email verification. Requires valid token.
  ACTIVE → SUSPENDED:               Triggered by admin. Reason must be provided. Active investments
                                    continue to mature; new operations are blocked.
  SUSPENDED → ACTIVE:               Triggered by SUPER_ADMIN only. Reason must be provided.
  SUSPENDED → CLOSED:               Triggered by SUPER_ADMIN. No active investments or pending
                                    withdrawals may exist.
  ACTIVE → CLOSED:                  Triggered by user request or admin. No active investments or
                                    pending withdrawals may exist. If active investments exist,
                                    closure is deferred until all mature.
  CLOSED → *:                      Terminal state. No transitions out of CLOSED.
  PENDING_VERIFICATION → SUSPENDED: Allowed for fraud prevention (admin blocks before email confirm).
  PENDING_VERIFICATION → CLOSED:    Allowed for cleanup of abandoned registrations.
```

### 6.2 Investment Status State Machine

```
  ┌──────────────┐       immediate        ┌──────────────┐
  │   PENDING    │──────────────────────▶│    ACTIVE     │
  │  (funds      │   (or after brief     │  (earning    │
  │   locked)    │    confirmation in     │   period)    │
  └──────┬───────┘    live mode)         └──────┬───────┘
         │                                      │
         │ admin cancel                         │ maturity date reached
         │ (before activation)                  │ (scheduled job)
         │                                      │
         ▼                                      ▼
  ┌──────────────┐                      ┌──────────────┐
  │  CANCELLED   │                      │   MATURED    │
  │  (funds      │                      │  (return     │
  │   unlocked)  │                      │   credited)  │
  └──────────────┘                      └──────────────┘

TRANSITION RULES:
  PENDING → ACTIVE:       Automatic upon creation (demo) or after admin/blockchain confirmation (live).
                           Wallet funds are locked, startDate is set.
  PENDING → CANCELLED:    Admin may cancel before activation. Locked funds are returned to available balance.
  ACTIVE → MATURED:       Triggered by scheduled maturity job when currentDate >= maturityDate.
                           Return is credited to wallet, locked principal is unlocked.
  MATURED → *:            Terminal state. No further transitions.
  CANCELLED → *:          Terminal state. No further transitions.
```

### 6.3 Deposit Status State Machine

```
  ┌──────────────┐
  │   PENDING    │  (initial state for both crypto and gift card)
  └──────┬───────┘
         │
         │  ┌───────────────────────────────────────────┐
         │  │              VERIFYING                     │
         │  │  ┌──────────────────┐  ┌────────────────┐ │
         ▼  │  │ CRYPTO FLOW:     │  │ GIFT CARD FLOW:│ │
         ├──┴─▶│ tx hash detected │  │ images uploaded│ │
         │     │ or admin review  │  │ officer reviews│ │
         │     └────────┬─────────┘  └───────┬────────┘ │
         │              │                    │          │
         │              │ confirmed           │          │
         │              ▼                    ▼          │
         │     ┌──────────────┐     ┌──────────────┐   │
         │     │  CONFIRMED   │     │  CONFIRMED   │◀──┘
         │     │  (wallet     │     │  (wallet     │
         │     │   credited)  │     │   credited)  │
         │     └──────────────┘     └──────────────┘
         │                                   │
         │                     rejected      │
         │                                   ▼
         │                          ┌──────────────┐
         │                          │  REJECTED    │
         │                          │  (not        │
         │                          │   credited)  │
         │                          └──────────────┘
         │
         │  expired (no tx / no action)
         ▼
  ┌──────────────┐
  │   EXPIRED    │
  │  (24h crypto,│
  │   72h gift)  │
  └──────────────┘

  Alternative from VERIFYING (crypto only):
  ┌──────────────┐
  │    FAILED    │  (wrong amount, wrong network, double-spend detected)
  └──────────────┘

TRANSITION RULES:
  PENDING → VERIFYING:   Crypto: tx hash detected or admin begins review.
                          Gift card: user submits images and the deposit enters the review queue.
  VERIFYING → CONFIRMED: Crypto: sufficient confirmations reached or admin manually confirms.
                          Gift card: KYC Officer verifies card validity and approves.
  VERIFYING → FAILED:    Crypto only: transaction detected but amount mismatch, wrong network,
                          or double-spend. Funds are not credited.
  VERIFYING → REJECTED:  Gift card only: KYC Officer rejects after review. Reason is recorded.
  PENDING → EXPIRED:     No action taken within the expiration window (24h for crypto,
                          72h for gift card). No funds credited.
  CONFIRMED/FAILED/REJECTED/EXPIRED → *: Terminal states. No further transitions.
```

### 6.4 Withdrawal Status State Machine

```
  ┌──────────────┐       admin review        ┌──────────────┐
  │   PENDING    │──────────────────────────▶│   APPROVED    │
  │  (amount     │                           │  (ready for   │
  │   locked)    │    admin rejection        │  processing)  │
  └──────┬───────┘──────────────────────────▶└──────┬───────┘
         │       ┌──────────────┐                   │
         │       │  REJECTED    │                   │ processing
         │       │  (funds      │                   │ initiated
         │       │   unlocked)  │                   │
         │       └──────────────┘                   │
         │                                           ▼
         │                                ┌──────────────────┐
         │                    ┌───────────│   PROCESSING      │
         │                    │           │  (transfer in    │
         │                    │           │   progress)      │
         │                    │           └──────┬───────────┘
         │                    │                  │
         │                    │   ┌──────────────┼──────────────┐
         │                    │   │              │              │
         │                    │   │ success      │ failure      │
         │                    │   ▼              ▼              │
         │                    │ ┌──────────┐ ┌──────────┐      │
         │                    │ │COMPLETED │ │  FAILED  │      │
         │                    │ │(funds    │ │(funds    │      │
         │                    │ │ sent,    │ │returned  │      │
         │                    │ │wallet    │ │to avail) │      │
         │                    │ │debited)  │ └──────────┘      │
         │                    │ └──────────┘                    │
         │                    │                                 │
         └────────────────────┘  (failure loops back:          │
                                 │   funds returned, user       │
                                 │   may re-request)            │
                                 └─────────────────────────────┘

TRANSITION RULES:
  PENDING → APPROVED:    Admin reviews and approves. approvedBy and approvedAt are recorded.
                          KYC level must be ≥ 2 (or ≥ 3 for high-value withdrawals).
  PENDING → REJECTED:    Admin rejects. rejectionReason is recorded. Locked funds are returned
                          to available balance via BalanceUnlocked.
  APPROVED → PROCESSING: Withdrawal enters the disbursement pipeline. For crypto, the transfer
                          is initiated on the blockchain. For bank wires, the transfer is queued.
  PROCESSING → COMPLETED: Funds successfully disbursed. Wallet is debited for the full amount.
                          Fee is retained by the platform; netAmount is sent to user.
  PROCESSING → FAILED:    External failure (blockchain rejection, bank return). Locked funds are
                          returned to available balance. User is notified and may re-request.
  COMPLETED/REJECTED → *: Terminal states. No further transitions.
  FAILED → PENDING:      User may submit a new withdrawal request (new aggregate instance).
```

### 6.5 KYC Status State Machine

```
  ┌──────────────┐     officer picks up      ┌──────────────┐
  │   PENDING    │──────────────────────────▶│ UNDER_REVIEW │
  │  (submitted  │                            │  (assigned   │
  │  by user)    │     auto-expire (72h)      │  to officer) │
  └──────┬───────┘─────────────────────────▶ └──────┬───────┘
         │       ┌──────────────┐                  │
         │       │   EXPIRED    │                  │
         │       │  (documents  │         ┌────────┴────────┐
         │       │   stale)     │         │                 │
         │       └──────────────┘    approved            rejected
         │                              │                 │
         │                              ▼                 ▼
         │                       ┌──────────┐    ┌──────────┐
         │                       │ APPROVED │    │ REJECTED │
         │                       │ (level   │    │ (reason  │
         │                       │ elevated)│    │ given)  │
         │                       └──────────┘    └────┬─────┘
         │                                            │
         │                               user may resubmit
         │                                            │
         │              ┌──────────────┐              │
         │              │  RESUBMISSION│◀─────────────┘
         │              │  REQUESTED   │  (officer asks
         │              │  (additional │   for more docs)
         │              │   docs needed│
         │              │  )           │
         │              └──────┬───────┘
         │                     │
         │     user resubmits │
         │                     ▼
         │              ┌──────────────┐
         └─────────────▶│   PENDING    │  (new submission aggregate)
                        │ (resubmission│
                        └──────────────┘

TRANSITION RULES:
  PENDING → UNDER_REVIEW:  KYC Officer claims the submission from the review queue.
                            reviewedBy is set. Must happen within 72 hours or auto-expire.
  PENDING → EXPIRED:       No officer picked up the submission within 72 hours.
                            User must create a new submission.
  UNDER_REVIEW → APPROVED: Officer approves. User's kycLevel is elevated in the Identity context.
                            reviewedAt is set. APPROVED is terminal for this submission.
  UNDER_REVIEW → REJECTED: Officer rejects. reviewNotes with reason are required.
                            User may create a new submission (new aggregate instance).
  UNDER_REVIEW → RESUBMISSION_REQUESTED: Officer requests additional or corrected documents.
                                             User is notified and may upload new documents, creating
                                             a new submission aggregate.
  APPROVED/EXPIRED → *:  Terminal states for the submission aggregate.
```

---

## 7. Business Rules

### 7.1 Balance Invariants

| Rule ID | Rule | Rationale |
|---------|------|-----------|
| BR-BAL-001 | `wallet.balance >= 0` at all times | A negative balance represents an accounting error and potential fund loss. The database CHECK constraint prevents this even if application logic fails. |
| BR-BAL-002 | `wallet.availableBalance <= wallet.balance` | Available balance is a subset of total balance. Exceeding it would allow spending locked funds. |
| BR-BAL-003 | `wallet.lockedBalance = wallet.balance - wallet.availableBalance` | Locked balance is a derived value that must remain consistent. Any operation modifying balance or availableBalance must recalculate this. |
| BR-BAL-004 | Locking operations check `availableBalance >= lockAmount` before mutating | Prevents over-locking. If insufficient available balance, the operation is rejected with `InsufficientFundsException`. |
| BR-BAL-005 | Debit operations check `availableBalance >= debitAmount` before mutating | Same as BR-BAL-004 for debits. Withdrawals and investment funding cannot exceed available balance. |
| BR-BAL-006 | All balance mutations are serialized per wallet | Concurrent operations on the same wallet are handled through pessimistic locking (SELECT FOR UPDATE) or optimistic concurrency (version column) to prevent race conditions. |
| BR-BAL-007 | Demo and live wallets are strictly isolated | A debit on the demo wallet must never affect the live wallet and vice versa. The `mode` field is a mandatory filter in every query. |

### 7.2 Investment Plan Constraints

| Rule ID | Rule | Rationale |
|---------|------|-----------|
| BR-INV-001 | Investment amount must satisfy `plan.minAmount <= amount <= plan.maxAmount` | Prevents users from investing below the plan's minimum threshold (operational cost coverage) or above the maximum (risk concentration limit). |
| BR-INV-002 | A user may have at most one ACTIVE investment per plan | Simplifies maturity processing, prevents confusion in the UI, and limits exposure to any single plan. Enforced by database unique index. |
| BR-INV-003 | The return rate is snapshotted from the Plan at investment creation time | Ensures that users receive the return rate they were promised at the time of investment, even if the admin later modifies the plan's return rate. |
| BR-INV-004 | Maturity date = start date + plan duration days | Provides a predictable, auditable maturity timeline. The duration is immutable per investment. |
| BR-INV-005 | Investment funding locks the full amount from the wallet's available balance | The principal is locked until maturity, preventing double-spending. Upon maturity, both the principal and return are credited back. |
| BR-INV-006 | Plan-specific constraints: Basic ($200-$4,999, 1-7 days), Silver ($5,000-$9,999, 1-14 days), Gold ($10,000-$49,999, 1-14 days), Platinum ($50,000-$100,000, 1-14 days) | These constraints define the platform's tiered product offering and are enforced at the domain service layer before Investment aggregate creation. |
| BR-INV-007 | Investments can only be created in the user's current active mode (demo or live) | Prevents cross-contamination between simulated and real funds. |

### 7.3 Withdrawal Fee Calculation

| Rule ID | Rule | Rationale |
|---------|------|-----------|
| BR-WDR-001 | Total withdrawal fee is 21% of the requested amount | The platform charges a composite fee to cover operational costs, risk management, and regulatory obligations. |
| BR-WDR-002 | Fee breakdown: Management Fee (10%), Signal Fee (5%), Insurance Fee (3%), VAT (3%) | Each component covers a distinct operational cost. Management covers platform operations, Signal covers trading signal services, Insurance covers fund protection, VAT covers tax obligations. The breakdown is stored in `feeBreakdown` JSONB for transparency and audit. |
| BR-WDR-003 | `netAmount = amount - fee` where `fee = amount * 0.21` | The user receives 79% of the requested withdrawal amount. This is computed at creation time and is immutable. |
| BR-WDR-004 | The full `amount` (gross) is locked from the wallet, not just `netAmount` | The platform must ensure the full amount is available before processing. The fee portion is retained by the platform upon completion; only `netAmount` is disbursed. |
| BR-WDR-005 | Fee percentages are configurable by SUPER_ADMIN but default to 21% total | Allows the platform to adjust fees in response to regulatory changes or business strategy, while providing a sensible default. |
| BR-WDR-006 | Fees are calculated on the gross withdrawal amount before any deductions | Ensures consistent and predictable fee amounts regardless of the user's balance. |

### 7.4 Referral Commission Rules

| Rule ID | Rule | Rationale |
|---------|------|-----------|
| BR-REF-001 | Direct commission is 10% of the referred user's deposit/investment amount | Provides a straightforward incentive for user acquisition. The commission is credited to the referrer's wallet upon the referred user's deposit confirmation or investment creation. |
| BR-REF-002 | Binary bonus is paid when both the left and right legs under a referrer's binary node have active volume | The binary structure incentivizes balanced team building. A bonus is calculated based on the weaker leg's volume to prevent imbalance exploitation. |
| BR-REF-003 | Binary bonus amount = commission rate × min(leftLegVolume, rightLegVolume) | The weaker leg determines the bonus amount, encouraging referrers to build both legs equally. The commission rate is configurable by SUPER_ADMIN. |
| BR-REF-004 | Commissions are only paid for live-mode transactions, not demo-mode | Demo mode is for simulation only; paying commissions on simulated transactions would create meaningless liability. |
| BR-REF-005 | A referral relationship becomes inactive if the referred user's account is CLOSED | Prevents commission accumulation on inactive accounts. The `isActive` flag on the Referral entity is set to false. |
| BR-REF-006 | Self-referral is prohibited (referrerId != referredId) and is enforced at the application layer | Prevents gaming the referral system. The registration flow validates that the referral code does not belong to the registering user. |
| BR-REF-007 | Referral commissions are credited to the referrer's live wallet only | Even if the referrer is in demo mode, commissions from live transactions are always credited to the live wallet to maintain real financial accuracy. |

### 7.5 KYC Level Requirements for Operations

| Rule ID | Rule | KYC Level | Operation | Rationale |
|---------|------|-----------|-----------|-----------|
| BR-KYC-001 | LEVEL_0 → LEVEL_1 | Level 1 (Email Verified) | Login, view dashboard, switch to demo mode | Minimum identity verification. Email confirmation proves the user controls the email address. |
| BR-KYC-002 | LEVEL_1 required | Level 1 | Initiate deposits (both crypto and gift card) | Basic identity verification required before accepting any funds. |
| BR-KYC-003 | LEVEL_2 required | Level 2 (ID Verified) | Request withdrawals | Stronger identity verification required before releasing funds. Government ID verification deters fraud. |
| BR-KYC-004 | LEVEL_3 required | Level 3 (Selfie + Proof of Address) | Withdrawals exceeding $25,000 (or equivalent) | High-value withdrawals require the strongest verification to comply with AML/CTF regulations. |
| BR-KYC-005 | LEVEL_1 required | Level 1 | Create investments (both demo and live) | Basic verification before engaging in financial products. |
| BR-KYC-006 | Sequential progression only | — | KYC level elevation | Levels must be achieved in order (0 → 1 → 2 → 3). Skipping levels is prohibited to ensure a consistent verification pipeline. |
| BR-KYC-007 | KYC rejection does not lower current level | — | After a rejected submission | If a user is already at Level 2 and submits for Level 3 but is rejected, they remain at Level 2. A rejection never downgrades. |

### 7.6 Demo Mode Rules

| Rule ID | Rule | Rationale |
|---------|------|-----------|
| BR-DMO-001 | Demo wallets start with a simulated balance (e.g., $10,000 USD) | Provides users with a risk-free environment to learn the platform's functionality. The initial balance is configurable by SUPER_ADMIN. |
| BR-DMO-002 | No real financial transactions occur in demo mode | Crypto deposits, gift card deposits, and real withdrawals are not available in demo mode. All operations are simulated. |
| BR-DMO-003 | Demo mode uses the same UI components, flows, and validations as live mode | Ensures a consistent user experience so that transitioning from demo to live is seamless. The only difference is a prominent "DEMO MODE" indicator in the UI. |
| BR-DMO-004 | Demo investments follow the same plan constraints, return rates, and maturity timelines as live investments | Provides an accurate simulation of the investment experience. Returns are calculated identically. |
| BR-DMO-005 | Demo mode does not generate real referral commissions | Since demo transactions are simulated, commissions would also be simulated and meaningless. The referral system tracks demo referrals for analytics but does not credit commissions. |
| BR-DMO-006 | Users can toggle between demo and live mode at any time via the UI | Allows users to experiment freely in demo mode and switch to live mode when ready. The toggle is a prominent UI element on the dashboard. |
| BR-DMO-007 | Demo mode transactions are stored in the same database schema but filtered by the wallet's `mode` field | No separate database or schema is needed. The `mode` field on the Wallet aggregate ensures complete isolation. |
| BR-DMO-008 | Demo withdrawal fees are calculated identically to live mode (21%) | Even in simulation, the fee structure must be accurately represented so users understand the true cost of withdrawals. |

### 7.7 Account Lockout Rules

| Rule ID | Rule | Rationale |
|---------|------|-----------|
| BR-SEC-001 | After 5 consecutive failed login attempts, the account is locked for 30 minutes | Prevents brute-force password attacks. 5 attempts provide reasonable tolerance for typos while limiting exposure. |
| BR-SEC-002 | Failed attempt count resets to 0 after a successful login | Allows normal users to continue using the platform without friction after a successful authentication. |
| BR-SEC-003 | Subsequent lockouts apply exponential backoff: 30min → 1h → 2h → 4h → 8h (max) | Increases the cost of repeated brute-force attempts. An attacker's effective attempt rate decreases exponentially. |
| BR-SEC-004 | If 2FA is enabled, failed 2FA attempts also count toward the lockout threshold | Prevents attackers who have obtained the password from bypassing lockout by failing the 2FA step. |
| BR-SEC-005 | Account lockout notifications are sent to the user's email on every lockout event | Keeps users informed about potential unauthorized access attempts, allowing them to take proactive security measures. |
| BR-SEC-006 | SUPER_ADMIN can manually unlock an account at any time | Provides an escape hatch for legitimate users who are locked out (e.g., forgotten password with no recovery options). The manual unlock also resets the failed attempt counter. |
| BR-SEC-007 | Lockout state is tracked per user in the `failedLoginAttempts` and `lockedUntil` fields | These fields on the User aggregate provide the source of truth for lockout state, persisted to the database to survive server restarts. |
| BR-SEC-008 | During lockout, all authentication attempts (including correct credentials) are rejected with a generic "account locked" message | Prevents information leakage about whether the password is correct during the lockout window. |

---

## Appendix: Plan Definitions Reference

| Plan | Min Amount | Max Amount | Duration Range | Notes |
|------|-----------|-----------|---------------|-------|
| Basic | $200 | $4,999 | 24 hours – 7 days | Entry-level plan for new users |
| Silver | $5,000 | $9,999 | 24 hours – 14 days | Mid-tier plan with extended duration options |
| Gold | $10,000 | $49,999 | 24 hours – 14 days | High-tier plan for experienced investors |
| Platinum | $50,000 | $100,000 | 24 hours – 14 days | Premium plan for high-net-worth individuals |

All plans offer fixed returns. The return rate is configurable per plan by SUPER_ADMIN and is snapshotted at the time of investment creation.

---

*End of Domain Model Specification — TeslaPrimeCapital Phase 2*
