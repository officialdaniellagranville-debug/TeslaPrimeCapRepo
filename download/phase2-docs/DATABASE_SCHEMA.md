# Database Schema — TeslaPrimeCapital

**Project:** TeslaPrimeCapital — Enterprise Investment Platform  
**Phase:** 2 — Technical Architecture  
**Version:** 1.0.0  
**Status:** Single Source of Truth  
**Last Updated:** 2025-01  

This document is the **authoritative, exhaustive schema definition** for the TeslaPrimeCapital platform. Every table, field, constraint, index, and relationship required by the platform is defined here. All application code, migrations, and data-access layers must conform to this specification.

---

## Table of Contents

1. [Database Approach Overview](#1-database-approach-overview)
2. [Schema Design Principles](#2-schema-design-principles)
3. [Complete Prisma Schema](#3-complete-prisma-schema)
   - 3.1 [Enums](#31-enums)
   - 3.2 [Core User Models](#32-core-user-models)
   - 3.3 [Account & Wallet Models](#33-account--wallet-models)
   - 3.4 [Investment Plan Models](#34-investment-plan-models)
   - 3.5 [Deposit Models](#35-deposit-models)
   - 3.6 [Withdrawal Models](#36-withdrawal-models)
   - 3.7 [Referral & Binary Models](#37-referral--binary-models)
   - 3.8 [KYC Verification Models](#38-kyc-verification-models)
   - 3.9 [Admin & RBAC Models](#39-admin--rbac-models)
   - 3.10 [Notification & Email Models](#310-notification--email-models)
   - 3.11 [Support Ticket Models](#311-support-ticket-models)
   - 3.12 [Currency & Exchange Rate Models](#312-currency--exchange-rate-models)
   - 3.13 [Security & Session Models](#313-security--session-models)
   - 3.14 [Audit & Configuration Models](#314-audit--configuration-models)
   - 3.15 [Promo Code Models](#315-promo-code-models)
4. [Entity-Relationship Diagram (ERD)](#4-entity-relationship-diagram-erd)
5. [Index Strategy](#5-index-strategy)
6. [Data Partitioning Considerations](#6-data-partitioning-considerations)
7. [Migration Strategy](#7-migration-strategy)
8. [Seed Data Requirements](#8-seed-data-requirements)

---

## 1. Database Approach Overview

### 1.1 Technology Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Primary RDBMS | PostgreSQL 16+ | All persistent application data |
| ORM | Prisma ORM (v5+) | Type-safe database access, migrations, schema management |
| Caching / Ephemeral | Redis 7+ | Sessions, rate limits, exchange rate cache, job queues, OTP throttle |
| File Storage | Cloudinary | KYC documents, gift card screenshots |
| Email | Resend + React Email | Transactional and notification emails |

### 1.2 Why PostgreSQL + Prisma

**PostgreSQL** provides strict ACID compliance for financial data integrity, native `JSONB` support for flexible metadata columns, full-text search with `tsvector`/`tsquery` and GIN indexes, and mature tooling for backup (pg_dump + WAL archiving) and point-in-time recovery. These capabilities are essential for a financial platform handling investments, withdrawals, and audit trails.

**Prisma ORM** delivers first-class PostgreSQL support with generated TypeScript types, an interactive transaction API (`prisma.$transaction()`) for multi-step financial operations, declarative migration management (`prisma migrate`), and a schema-first development workflow where the `schema.prisma` file serves as the single source of truth.

### 1.3 Internal Accounting Currency

USD is the sole internal accounting currency. All wallet balances, investment amounts, fee calculations, and commission values are stored in USD. Fiat display currencies (EUR, GBP, etc.) are handled at the presentation layer via real-time conversion using cached exchange rates. Cryptocurrency deposit amounts are converted to USD at the time of blockchain confirmation.

### 1.4 Dual-Mode Data Separation

Every user operates in two parallel modes: **Demo** and **Live**. Data separation is achieved through:

- **Wallets**: Each user has exactly two wallets — one `demo`, one `live` — differentiated by the `type` field.
- **Investments**: The `mode` field on `UserInvestment` tags each investment as demo or live.
- **Transactions**: The `walletId` foreign key implicitly links each transaction to the correct mode via the wallet.
- **Deposits/Withdrawals**: The `mode` field explicitly tags each operation.
- **Referral Commissions**: Commissions from live deposits credit the sponsor's live wallet; demo commissions credit the demo wallet.

---

## 2. Schema Design Principles

### 2.1 Normalization

The schema adheres to **Third Normal Form (3NF)** as the baseline. Controlled denormalization is applied only where query performance demands it:

- **Wallet balances** (`balance`, `availableBalance`, `lockedBalance`) are denormalized summaries maintained transactionally. The invariant `balance = availableBalance + lockedBalance` is always enforced application-side.
- **BinaryNode volumes** (`volumeLeft`, `volumeRight`) are incrementally updated denormalized counters to avoid recursive tree traversal on every query.

### 2.2 UUID Primary Keys

All entities use `UUID v4` as their primary key, generated application-side via `crypto.randomUUID()`. This prevents information leakage (no sequential ID enumeration), eliminates cross-environment ID collisions, and supports future distributed architectures.

### 2.3 Soft Deletes

All entities include a nullable `deletedAt` `DateTime` column. Hard `DELETE` is never used in application code. All queries include `WHERE deletedAt IS NULL` enforced through Prisma middleware. Hard deletes are reserved for GDPR erasure compliance after a mandatory holding period.

### 2.4 Timestamps

Every entity includes `createdAt` (non-nullable, default `now()`) and `updatedAt` (non-nullable, default `now()`, auto-updated via `@updatedAt`). These serve audit, debugging, and analytics purposes.

### 2.5 Financial Precision

All monetary values use `Decimal` type (mapped to PostgreSQL `NUMERIC(19,4)`). This prevents floating-point rounding errors that would be unacceptable in financial calculations. Return rates use `Decimal` for precision (e.g., `0.50` for 0.5%).

---

## 3. Complete Prisma Schema

### 3.1 Enums

```prisma
// ──────────────────────────────────────────────
// ENUM DEFINITIONS
// ──────────────────────────────────────────────

/// User account status lifecycle
enum UserStatus {
  pending_verification  // Registered, email not yet verified
  active                // Fully operational
  suspended             // Temporarily restricted by admin
  banned                // Permanently restricted
  closed                // Account closed (GDPR or user request)
}

/// KYC verification levels (progressive)
enum KycLevel {
  LEVEL_0  // Unverified — email only
  LEVEL_1  // Basic — government ID verified
  LEVEL_2  // Standard — ID + proof of address verified
  LEVEL_3  // Premium — ID + proof of address + selfie verified
}

/// Wallet type for dual-mode separation
enum WalletType {
  demo
  live
}

/// Transaction types for the financial ledger
enum TransactionType {
  deposit              // Funds entering the platform
  withdrawal           // Funds leaving the platform
  investment           // Principal committed to a plan
  investment_return    // Return credited upon plan maturity
  referral_bonus       // Direct referral commission
  binary_bonus         // Weekly binary bonus payout
  fee                  // Withdrawal or service fee
  promo_credit         // Promotional bonus credit
  balance_adjustment   // Manual admin balance correction
}

/// Status lifecycle for transactions
enum TransactionStatus {
  pending
  completed
  failed
  reversed
}

/// Investment lifecycle status
enum InvestmentStatus {
  active
  completed
  failed
  cancelled
}

/// Deposit payment methods
enum DepositMethod {
  crypto
  gift_card
}

/// Supported cryptocurrencies
enum CryptoCurrency {
  BTC
  ETH
  USDT
}

/// Deposit lifecycle status
enum DepositStatus {
  pending                // Awaiting blockchain confirmation or admin review
  pending_verification   // Gift card awaiting admin review
  confirmed              // Funds credited to wallet
  rejected               // Declined with reason
  expired                // Timed out (crypto: no confirmation received)
}

/// Withdrawal lifecycle status
enum WithdrawalStatus {
  pending      // Awaiting admin approval
  processing   // Approved, fund transfer in progress
  completed    // Transfer confirmed
  rejected     // Declined, funds returned to wallet
  failed       // Transfer failed after approval
}

/// Withdrawal destination types
enum WithdrawalDestinationType {
  crypto
  bank
}

/// Referral commission types
enum ReferralCommissionType {
  direct    // 10% of referred user's deposit
  binary    // Weekly binary bonus from weaker leg
}

/// Referral commission status
enum ReferralCommissionStatus {
  pending
  paid
  reversed
}

/// Binary tree node position
enum BinaryPosition {
  left
  right
}

/// KYC document types
enum KycDocumentType {
  id_front
  id_back
  selfie
  proof_of_address
}

/// KYC document review status
enum KycDocumentStatus {
  pending
  approved
  rejected
  expired
}

/// Support ticket status
enum TicketStatus {
  open
  in_progress
  waiting_user
  resolved
  closed
}

/// Support ticket priority
enum TicketPriority {
  low
  medium
  high
  urgent
}

/// Admin role hierarchy
enum AdminRoleName {
  SUPER_ADMIN
  ADMIN
  COMPLIANCE
  SUPPORT
}

/// Admin permission action types
enum PermissionAction {
  create
  read
  update
  delete
  ban
  approve
  reject
  export
  manage
  view
  respond
  close
  escalate
}

/// Admin permission resource types
enum PermissionResource {
  users
  kyc
  deposits
  withdrawals
  investments
  plans
  referrals
  commissions
  tickets
  reports
  analytics
  audit_logs
  system_config
  roles
  settings
  notifications
  promotions
}

/// Notification types
enum NotificationType {
  deposit_confirmed
  deposit_rejected
  withdrawal_processed
  withdrawal_rejected
  investment_activated
  investment_completed
  investment_return_credited
  referral_earned
  binary_bonus_credited
  kyc_submitted
  kyc_approved
  kyc_rejected
  kyc_reminder
  security_login_detected
  security_password_changed
  security_2fa_enabled
  security_2fa_disabled
  security_account_locked
  ticket_response
  ticket_resolved
  system_maintenance
  system_announcement
  promo_applied
  custom
}

/// OTP types
enum OtpType {
  email_verification
  password_reset
  two_factor_setup
  two_factor_disable
  withdrawal_confirm
}

/// Gift card submission status
enum GiftCardStatus {
  pending
  verified
  rejected
  expired
}

/// Email log status
enum EmailStatus {
  sent
  delivered
  failed
  bounced
}

/// Plan payout status
enum PayoutStatus {
  pending
  processed
  failed
}

/// User active mode
enum UserMode {
  demo
  live
}

/// Plan duration units
enum DurationUnit {
  hours
  days
}

/// Promo code discount types
enum PromoDiscountType {
  percentage
  fixed
}

/// Promo code status
enum PromoCodeStatus {
  active
  inactive
  expired
  fully_redeemed
}
```

### 3.2 Core User Models

```prisma
// ──────────────────────────────────────────────
// USER MODEL
// ──────────────────────────────────────────────

model User {
  id                String     @id @default(uuid()) @db.Uuid
  email             String     @unique @db.VarChar(255)
  passwordHash      String     @map("password_hash") @db.VarChar(255)
  emailVerified     Boolean    @default(false) @map("email_verified")
  emailVerifiedAt   DateTime?  @map("email_verified_at")

  // Status and role
  status            UserStatus @default(pending_verification)
  kycLevel          KycLevel   @default(LEVEL_0) @map("kyc_level")
  activeMode        UserMode   @default(demo) @map("active_mode")

  // Referral
  referralCode      String     @unique @map("referral_code") @db.VarChar(12)
  referredById      String?    @map("referred_by_id") @db.Uuid

  // 2FA
  twoFactorEnabled  Boolean    @default(false) @map("two_factor_enabled")

  // Security tracking
  lastLoginAt       DateTime?  @map("last_login_at")
  lastLoginIp       String?    @map("last_login_ip") @db.VarChar(45)
  loginAttemptCount Int        @default(0) @map("login_attempt_count")
  lockedUntil       DateTime?  @map("locked_until")

  // Preferences
  preferredCurrency String     @default("USD") @map("preferred_currency") @db.VarChar(3)
  preferredLanguage String     @default("en") @map("preferred_language") @db.VarChar(5)

  // Timestamps
  createdAt         DateTime   @default(now()) @map("created_at")
  updatedAt         DateTime   @updatedAt @map("updated_at")
  deletedAt         DateTime?  @map("deleted_at")

  // ── Relations ──
  profile           Profile?
  wallets           Wallet[]
  deposits          Deposit[]
  withdrawals       Withdrawal[]
  investments       UserInvestment[]
  notifications     Notification[]
  auditLogs         AuditLog[]
  supportTickets    SupportTicket[]
  kycDocuments      KYCDocument[]
  kycVerifications  KYCVerification[]
  referredBy        User?      @relation("ReferralTree", fields: [referredById], references: [id])
  referrals         User[]     @relation("ReferralTree")
  referralAsReferrer Referral[]
  referralAsReferred Referral[]
  referralCommissions ReferralCommission[]
  binaryNode        BinaryNode?
  sentTickets       SupportTicket[] @relation("AssignedTickets")
  verifiedDeposits  Deposit[]       @relation("DepositVerifier")
  verifiedKycDocs   KYCDocument[]   @relation("KycDocReviewer")
  processedWithdrawals Withdrawal[] @relation("WithdrawalProcessor")
  adminRecord       Admin?
  twoFactorAuth     TwoFactorAuth?
  userPromos        UserPromo[]
  otps              Otp[]
  emailLogs         EmailLog[]  @relation("EmailRecipient")

  // ── Indexes ──
  @@index([status], map: "idx_user_status")
  @@index([kycLevel], map: "idx_user_kyc_level")
  @@index([referredById], map: "idx_user_referred_by")
  @@index([deletedAt], map: "idx_user_deleted_at")
  @@map("users")
}

// ──────────────────────────────────────────────
// PROFILE MODEL
// ──────────────────────────────────────────────

model Profile {
  id            String   @id @default(uuid()) @db.Uuid
  userId        String   @unique @map("user_id") @db.Uuid

  // Personal information
  firstName     String?  @map("first_name") @db.VarChar(100)
  lastName      String?  @map("last_name") @db.VarChar(100)
  phone         String?  @map("phone") @db.VarChar(20)
  dateOfBirth   DateTime? @map("date_of_birth")
  avatarUrl     String?  @map("avatar_url") @db.VarChar(500)
  country       String?  @map("country") @db.VarChar(2)   // ISO 3166-1 alpha-2

  // Address
  streetAddress String?  @map("street_address") @db.VarChar(255)
  city          String?  @map("city") @db.VarChar(100)
  state         String?  @map("state") @db.VarChar(100)
  postalCode    String?  @map("postal_code") @db.VarChar(20)

  // Timestamps
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  // ── Relation ──
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("profiles")
}
```

### 3.3 Account & Wallet Models

```prisma
// ──────────────────────────────────────────────
// ACCOUNT MODEL (Logical grouping — maps 1:1
// to User + Wallet pair; provides a unified
// view of a user's financial presence)
// ──────────────────────────────────────────────

model Account {
  id                String     @id @default(uuid()) @db.Uuid
  userId            String     @unique @map("user_id") @db.Uuid
  mode              UserMode
  isActive          Boolean    @default(true) @map("is_active")

  // Aggregate stats (denormalized, updated by jobs)
  totalDeposits     Decimal    @default(0) @map("total_deposits") @db.Decimal(19, 4)
  totalWithdrawals  Decimal    @default(0) @map("total_withdrawals") @db.Decimal(19, 4)
  totalInvested     Decimal    @default(0) @map("total_invested") @db.Decimal(19, 4)
  totalReturns      Decimal    @default(0) @map("total_returns") @db.Decimal(19, 4)
  totalCommissions  Decimal    @default(0) @map("total_commissions") @db.Decimal(19, 4)

  createdAt         DateTime   @default(now()) @map("created_at")
  updatedAt         DateTime   @updatedAt @map("updated_at")
  deletedAt         DateTime?  @map("deleted_at")

  // ── Relations ──
  user              User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  wallet            Wallet?

  @@unique([userId, mode], map: "uq_account_user_mode")
  @@index([mode], map: "idx_account_mode")
  @@map("accounts")
}

// ──────────────────────────────────────────────
// WALLET MODEL
// ──────────────────────────────────────────────

model Wallet {
  id                String     @id @default(uuid()) @db.Uuid
  userId            String     @map("user_id") @db.Uuid
  type              WalletType

  // Balance fields (denormalized, maintained transactionally)
  balance           Decimal    @default(0) @db.Decimal(19, 4)
  availableBalance  Decimal    @default(0) @map("available_balance") @db.Decimal(19, 4)
  lockedBalance     Decimal    @default(0) @map("locked_balance") @db.Decimal(19, 4)

  // Internal accounting currency
  currency          String     @default("USD") @db.VarChar(3)

  createdAt         DateTime   @default(now()) @map("created_at")
  updatedAt         DateTime   @updatedAt @map("updated_at")
  deletedAt         DateTime?  @map("deleted_at")

  // ── Relations ──
  user              User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  transactions      Transaction[]
  deposits          Deposit[]
  withdrawals       Withdrawal[]
  account           Account?

  // Each user has exactly one wallet per type
  @@unique([userId, type], map: "uq_wallet_user_type")
  @@index([userId], map: "idx_wallet_user_id")
  @@map("wallets")
}

// ──────────────────────────────────────────────
// TRANSACTION MODEL (Immutable Financial Ledger)
// ──────────────────────────────────────────────

model Transaction {
  id              String           @id @default(uuid()) @db.Uuid
  walletId        String           @map("wallet_id") @db.Uuid
  type            TransactionType
  amount          Decimal          @db.Decimal(19, 4)   // Always positive
  status          TransactionStatus @default(pending)

  // Human-readable description
  description     String           @db.VarChar(500)

  // Polymorphic reference to the source entity
  referenceId     String?          @map("reference_id") @db.Uuid
  referenceType   String?          @map("reference_type") @db.VarChar(50)
  // referenceType values: "Deposit", "Withdrawal", "UserInvestment",
  //                       "ReferralCommission", "PlanPayout", "UserPromo", "Admin"

  // Extensible context (exchange rate, crypto amount, fee breakdown, etc.)
  metadata        Json?

  createdAt       DateTime         @default(now()) @map("created_at")
  deletedAt       DateTime?        @map("deleted_at")

  // ── Relations ──
  wallet          Wallet           @relation(fields: [walletId], references: [id])

  // ── Indexes ──
  @@index([walletId, createdAt], map: "idx_tx_wallet_created")
  @@index([type], map: "idx_tx_type")
  @@index([status], map: "idx_tx_status")
  @@index([referenceId, referenceType], map: "idx_tx_reference")
  @@index([createdAt], map: "idx_tx_created_at")
  @@map("transactions")
}

// ──────────────────────────────────────────────
// TRANSACTION LOG MODEL (Detailed log for every
// financial operation — supplements Transaction)
// ──────────────────────────────────────────────

model TransactionLog {
  id              String   @id @default(uuid()) @db.Uuid
  transactionId   String   @map("transaction_id") @db.Uuid
  walletId        String   @map("wallet_id") @db.Uuid

  // Balance snapshot before and after
  balanceBefore   Decimal  @map("balance_before") @db.Decimal(19, 4)
  balanceAfter    Decimal  @map("balance_after") @db.Decimal(19, 4)
  availableBefore Decimal  @map("available_before") @db.Decimal(19, 4)
  availableAfter  Decimal  @map("available_after") @db.Decimal(19, 4)
  lockedBefore    Decimal  @map("locked_before") @db.Decimal(19, 4)
  lockedAfter     Decimal  @map("locked_after") @db.Decimal(19, 4)

  // Operation context
  operation       String   @db.VarChar(100)   // e.g. "credit_deposit", "debit_investment"
  metadata        Json?

  createdAt       DateTime @default(now()) @map("created_at")

  // ── Relations ──
  transaction     Transaction @relation(fields: [transactionId], references: [id], onDelete: Cascade)
  wallet          Wallet      @relation(fields: [walletId], references: [id])

  @@index([transactionId], map: "idx_txlog_tx_id")
  @@index([walletId, createdAt], map: "idx_txlog_wallet_created")
  @@map("transaction_logs")
}
```

### 3.4 Investment Plan Models

```prisma
// ──────────────────────────────────────────────
// INVESTMENT PLAN MODEL (Configuration entity)
// ──────────────────────────────────────────────

model InvestmentPlan {
  id              String       @id @default(uuid()) @db.Uuid
  name            String       @db.VarChar(50)           // "Basic", "Silver", "Gold", "Platinum"
  slug            String       @unique @db.VarChar(50)    // "basic", "silver", "gold", "platinum"
  description     String?      @db.Text

  // Deposit range
  minAmount       Decimal      @map("min_amount") @db.Decimal(19, 4)
  maxAmount       Decimal      @map("max_amount") @db.Decimal(19, 4)

  // Duration
  duration        Int          // Numeric value
  durationUnit    DurationUnit @map("duration_unit")      // "hours" or "days"

  // Returns
  returnRate      Decimal      @map("return_rate") @db.Decimal(8, 4)  // e.g., 0.50 for 0.5%

  // KYC requirement
  requiredKycLevel KycLevel   @map("required_kyc_level")

  // Display and ordering
  features        Json?        // JSON array of feature strings for marketing display
  sortOrder       Int          @default(0) @map("sort_order")
  isActive        Boolean      @default(true) @map("is_active")

  // Icon/color for UI
  icon            String?      @db.VarChar(50)
  color           String?      @db.VarChar(7)  // Hex color code

  createdAt       DateTime     @default(now()) @map("created_at")
  updatedAt       DateTime     @updatedAt @map("updated_at")

  // ── Relations ──
  investments     UserInvestment[]
  planPayouts     PlanPayout[]

  @@index([isActive], map: "idx_plan_active")
  @@index([sortOrder], map: "idx_plan_sort")
  @@map("investment_plans")
}

// ──────────────────────────────────────────────
// USER INVESTMENT MODEL
// ──────────────────────────────────────────────

model UserInvestment {
  id              String           @id @default(uuid()) @db.Uuid
  userId          String           @map("user_id") @db.Uuid
  planId          String           @map("plan_id") @db.Uuid
  walletId        String           @map("wallet_id") @db.Uuid
  mode            UserMode         @default(live)

  // Financial details
  amount          Decimal          @db.Decimal(19, 4)    // Principal invested
  expectedReturn  Decimal          @map("expected_return") @db.Decimal(19, 4)
  actualReturn    Decimal?         @map("actual_return") @db.Decimal(19, 4)

  // Return rate locked at time of investment (plan may change later)
  lockedReturnRate Decimal         @map("locked_return_rate") @db.Decimal(8, 4)

  // Dates
  startDate       DateTime         @map("start_date")
  endDate         DateTime         @map("end_date")
  completedAt     DateTime?        @map("completed_at")

  status          InvestmentStatus @default(active)

  createdAt       DateTime         @default(now()) @map("created_at")
  updatedAt       DateTime         @updatedAt @map("updated_at")
  deletedAt       DateTime?        @map("deleted_at")

  // ── Relations ──
  user            User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  plan            InvestmentPlan   @relation(fields: [planId], references: [id])
  wallet          Wallet           @relation(fields: [walletId], references: [id])
  payouts         PlanPayout[]

  // ── Indexes ──
  @@index([userId, status], map: "idx_investment_user_status")
  @@index([status, endDate], map: "idx_investment_status_end_date")
  @@index([planId], map: "idx_investment_plan")
  @@index([walletId], map: "idx_investment_wallet")
  @@index([mode], map: "idx_investment_mode")
  @@map("user_investments")
}

// ──────────────────────────────────────────────
// PLAN PAYOUT MODEL (Records individual payouts
// when an investment matures)
// ──────────────────────────────────────────────

model PlanPayout {
  id              String       @id @default(uuid()) @db.Uuid
  investmentId    String       @map("investment_id") @db.Uuid
  planId          String       @map("plan_id") @db.Uuid
  walletId        String       @map("wallet_id") @db.Uuid

  // Payout amounts
  principalReturned  Decimal   @map("principal_returned") @db.Decimal(19, 4)
  profitCredited     Decimal   @map("profit_credited") @db.Decimal(19, 4)
  totalCredited      Decimal   @map("total_credited") @db.Decimal(19, 4)

  status          PayoutStatus @default(pending)
  processedAt     DateTime?    @map("processed_at")

  createdAt       DateTime     @default(now()) @map("created_at")
  updatedAt       DateTime     @updatedAt @map("updated_at")

  // ── Relations ──
  investment      UserInvestment @relation(fields: [investmentId], references: [id], onDelete: Cascade)
  plan            InvestmentPlan @relation(fields: [planId], references: [id])
  wallet          Wallet         @relation(fields: [walletId], references: [id])

  @@index([investmentId], map: "idx_payout_investment")
  @@index([status], map: "idx_payout_status")
  @@map("plan_payouts")
}
```

### 3.5 Deposit Models

```prisma
// ──────────────────────────────────────────────
// DEPOSIT MODEL
// ──────────────────────────────────────────────

model Deposit {
  id                String        @id @default(uuid()) @db.Uuid
  userId            String        @map("user_id") @db.Uuid
  walletId          String        @map("wallet_id") @db.Uuid
  mode              UserMode      @default(live)
  method            DepositMethod

  // Amount in USD (after conversion for crypto)
  amount            Decimal       @db.Decimal(19, 4)
  currency          String        @db.VarChar(10)  // "BTC", "ETH", "USDT", or "USD"

  // Crypto-specific fields
  cryptoCurrency    CryptoCurrency? @map("crypto_currency")
  cryptoAddress     String?       @map("crypto_address") @db.VarChar(100)
  cryptoTxHash      String?       @map("crypto_tx_hash") @db.VarChar(255)
  cryptoAmount      Decimal?      @map("crypto_amount") @db.Decimal(28, 8)
  cryptoConfirmations Int?        @map("crypto_confirmations")
  cryptoExchangeRate  Decimal?    @map("crypto_exchange_rate") @db.Decimal(28, 8)
  exchangeRateLockedAt DateTime?   @map("exchange_rate_locked_at")

  // Status and verification
  status            DepositStatus @default(pending)
  verifiedById      String?       @map("verified_by_id") @db.Uuid
  verifiedAt        DateTime?     @map("verified_at")
  rejectionReason   String?       @map("rejection_reason") @db.Text

  // Extensible metadata
  metadata          Json?

  createdAt         DateTime      @default(now()) @map("created_at")
  updatedAt         DateTime      @updatedAt @map("updated_at")
  deletedAt         DateTime?     @map("deleted_at")

  // ── Relations ──
  user              User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  wallet            Wallet        @relation(fields: [walletId], references: [id])
  verifiedBy        User?         @relation("DepositVerifier", fields: [verifiedById], references: [id])
  giftCardSubmission GiftCardSubmission?

  // ── Indexes ──
  @@index([userId, status], map: "idx_deposit_user_status")
  @@index([status], map: "idx_deposit_status")
  @@index([method], map: "idx_deposit_method")
  @@index([cryptoTxHash], map: "idx_deposit_crypto_tx_hash")
  @@index([createdAt], map: "idx_deposit_created")
  @@map("deposits")
}

// ──────────────────────────────────────────────
// GIFT CARD SUBMISSION MODEL
// ──────────────────────────────────────────────

model GiftCardSubmission {
  id                String        @id @default(uuid()) @db.Uuid
  depositId         String        @unique @map("deposit_id") @db.Uuid
  userId            String        @map("user_id") @db.Uuid

  // Card details
  cardBrand         String        @map("card_brand") @db.VarChar(50)   // "Amazon", "Apple", etc.
  cardNumber        String?       @map("card_number") @db.VarChar(50)  // Last 4 digits for record
  cardValue         Decimal       @map("card_value") @db.Decimal(19, 4)
  cardCurrency      String        @default("USD") @map("card_currency") @db.VarChar(3)

  // Screenshot stored in Cloudinary
  screenshotUrl     String        @map("screenshot_url") @db.VarChar(500)
  screenshotPublicId String?      @map("screenshot_public_id") @db.VarChar(200)

  // Verification
  status            GiftCardStatus @default(pending)
  reviewedById      String?       @map("reviewed_by_id") @db.Uuid
  reviewedAt        DateTime?     @map("reviewed_at")
  rejectionReason   String?       @map("rejection_reason") @db.Text
  reviewNotes       String?       @map("review_notes") @db.Text

  // Fraud tracking
  fraudFlag         Boolean       @default(false) @map("fraud_flag")
  fraudFlagReason   String?       @map("fraud_flag_reason") @db.VarChar(500)

  createdAt         DateTime      @default(now()) @map("created_at")
  updatedAt         DateTime      @updatedAt @map("updated_at")

  // ── Relations ──
  deposit           Deposit       @relation(fields: [depositId], references: [id], onDelete: Cascade)
  user              User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  review            GiftCardReview?

  @@index([userId, status], map: "idx_gc_user_status")
  @@index([status], map: "idx_gc_status")
  @@index([cardBrand], map: "idx_gc_brand")
  @@index([fraudFlag], map: "idx_gc_fraud_flag")
  @@map("gift_card_submissions")
}

// ──────────────────────────────────────────────
// GIFT CARD REVIEW MODEL (Detailed audit of each
// review action)
// ──────────────────────────────────────────────

model GiftCardReview {
  id                String   @id @default(uuid()) @db.Uuid
  submissionId      String   @map("submission_id") @db.Uuid
  reviewerId        String   @map("reviewer_id") @db.Uuid

  action            String   @db.VarChar(20)   // "approved", "rejected", "flagged"
  notes             String?  @db.Text

  // Snapshot of submission state at review time
  cardBrand         String   @map("card_brand") @db.VarChar(50)
  cardValue         Decimal  @map("card_value") @db.Decimal(19, 4)
  decisionReason    String?  @map("decision_reason") @db.Text

  createdAt         DateTime @default(now()) @map("created_at")

  // ── Relations ──
  submission        GiftCardSubmission @relation(fields: [submissionId], references: [id], onDelete: Cascade)
  reviewer          User              @relation(fields: [reviewerId], references: [id])

  @@index([submissionId], map: "idx_gcr_submission")
  @@index([reviewerId], map: "idx_gcr_reviewer")
  @@map("gift_card_reviews")
}
```

### 3.6 Withdrawal Models

```prisma
// ──────────────────────────────────────────────
// WITHDRAWAL MODEL
// ──────────────────────────────────────────────

model Withdrawal {
  id                String                 @id @default(uuid()) @db.Uuid
  userId            String                 @map("user_id") @db.Uuid
  walletId          String                 @map("wallet_id") @db.Uuid
  mode              UserMode               @default(live)

  // Amounts
  amount            Decimal                @db.Decimal(19, 4)  // Gross requested
  feeAmount         Decimal                @map("fee_amount") @db.Decimal(19, 4)
  feeRate           Decimal                @map("fee_rate") @db.Decimal(5, 4)  // e.g., 0.2100
  netAmount         Decimal                @map("net_amount") @db.Decimal(19, 4)

  // Destination
  destinationType   WithdrawalDestinationType @map("destination_type")
  destinationAddress String                @map("destination_address") @db.VarChar(500)
  cryptoCurrency    CryptoCurrency?         @map("crypto_currency")

  // Status
  status            WithdrawalStatus       @default(pending)
  processedById     String?                @map("processed_by_id") @db.Uuid
  processedAt       DateTime?              @map("processed_at")
  rejectionReason   String?                @map("rejection_reason") @db.Text

  // Risk and compliance
  riskScore         Int?                   @map("risk_score")    // 0-100, calculated automatically
  riskFlags         Json?                  @map("risk_flags")    // Array of flag reasons

  // Extensible
  metadata          Json?

  createdAt         DateTime               @default(now()) @map("created_at")
  updatedAt         DateTime               @updatedAt @map("updated_at")
  deletedAt         DateTime?              @map("deleted_at")

  // ── Relations ──
  user              User                   @relation(fields: [userId], references: [id], onDelete: Cascade)
  wallet            Wallet                 @relation(fields: [walletId], references: [id])
  processedBy       User?                  @relation("WithdrawalProcessor", fields: [processedById], references: [id])
  fees              WithdrawalFee[]

  // ── Indexes ──
  @@index([userId, status], map: "idx_withdrawal_user_status")
  @@index([status], map: "idx_withdrawal_status")
  @@index([createdAt], map: "idx_withdrawal_created")
  @@index([riskScore], map: "idx_withdrawal_risk")
  @@map("withdrawals")
}

// ──────────────────────────────────────────────
// WITHDRAWAL FEE MODEL (Detailed breakdown of
// the 21% fee into sub-components)
// ──────────────────────────────────────────────

model WithdrawalFee {
  id                String   @id @default(uuid()) @db.Uuid
  withdrawalId      String   @map("withdrawal_id") @db.Uuid

  // Fee components (all in USD)
  managementFee     Decimal  @map("management_fee") @db.Decimal(19, 4)
  signalFee         Decimal  @map("signal_fee") @db.Decimal(19, 4)
  insuranceFee      Decimal  @map("insurance_fee") @db.Decimal(19, 4)
  certificateFee    Decimal  @map("certificate_fee") @db.Decimal(19, 4)
  vatFee            Decimal  @map("vat_fee") @db.Decimal(19, 4)

  // Total must equal Withdrawal.feeAmount
  totalFee          Decimal  @map("total_fee") @db.Decimal(19, 4)

  createdAt         DateTime @default(now()) @map("created_at")

  // ── Relation ──
  withdrawal        Withdrawal @relation(fields: [withdrawalId], references: [id], onDelete: Cascade)

  @@index([withdrawalId], map: "idx_wfee_withdrawal")
  @@map("withdrawal_fees")
}
```

### 3.7 Referral & Binary Models

```prisma
// ──────────────────────────────────────────────
// REFERRAL MODEL (Direct referral relationships)
// ──────────────────────────────────────────────

model Referral {
  id              String   @id @default(uuid()) @db.Uuid
  referrerId      String   @map("referrer_id") @db.Uuid
  referredId      String   @unique @map("referred_id") @db.Uuid
  code            String   @db.VarChar(12)   // Denormalized from referrer's referralCode
  level           Int      @default(1)       // 1 = direct, higher = indirect (future)
  isActive        Boolean  @default(true) @map("is_active")

  createdAt       DateTime @default(now()) @map("created_at")

  // ── Relations ──
  referrer        User     @relation("ReferralAsReferrer", fields: [referrerId], references: [id], onDelete: Cascade)
  referred        User     @relation("ReferralAsReferred", fields: [referredId], references: [id], onDelete: Cascade)

  @@index([referrerId], map: "idx_referral_referrer")
  @@index([isActive], map: "idx_referral_active")
  @@map("referrals")
}

// ──────────────────────────────────────────────
// REFERRAL COMMISSION MODEL
// ──────────────────────────────────────────────

model ReferralCommission {
  id              String                 @id @default(uuid()) @db.Uuid
  userId          String                 @map("user_id") @db.Uuid           // Commission recipient
  sourceUserId    String                 @map("source_user_id") @db.Uuid   // User whose activity generated this
  sourceDepositId String?                @map("source_deposit_id") @db.Uuid // Link to the triggering deposit

  amount          Decimal                @db.Decimal(19, 4)
  rate            Decimal                @db.Decimal(5, 4)  // Rate applied (e.g., 0.1000 for 10%)
  type            ReferralCommissionType
  weekNumber      Int?                   @map("week_number")  // ISO week, relevant for binary bonuses
  weekYear        Int?                   @map("week_year")    // ISO year

  status          ReferralCommissionStatus @default(pending)
  walletId        String                 @map("wallet_id") @db.Uuid
  paidAt          DateTime?              @map("paid_at")

  createdAt       DateTime               @default(now()) @map("created_at")

  // ── Relations ──
  user            User                   @relation(fields: [userId], references: [id], onDelete: Cascade)
  sourceUser      User                   @relation("CommissionSource", fields: [sourceUserId], references: [id])
  wallet          Wallet                 @relation(fields: [walletId], references: [id])

  @@index([userId, createdAt], map: "idx_rc_user_created")
  @@index([userId, type], map: "idx_rc_user_type")
  @@index([userId, weekNumber, weekYear], map: "idx_rc_user_week")
  @@index([sourceUserId], map: "idx_rc_source_user")
  @@index([status], map: "idx_rc_status")
  @@map("referral_commissions")
}

// ──────────────────────────────────────────────
// BINARY NODE MODEL (Binary tree structure)
// ──────────────────────────────────────────────

model BinaryNode {
  id              String         @id @default(uuid()) @db.Uuid
  userId          String         @unique @map("user_id") @db.Uuid

  // Tree structure (self-referencing)
  parentId        String?        @map("parent_id") @db.Uuid
  position        BinaryPosition  // "left" or "right"
  leftChildId     String?        @map("left_child_id") @db.Uuid
  rightChildId    String?        @map("right_child_id") @db.Uuid

  // Depth in the tree (root = 0)
  depth           Int            @default(0)

  // Denormalized cumulative volume counters
  volumeLeft      Decimal        @default(0) @map("volume_left") @db.Decimal(19, 4)
  volumeRight     Decimal        @default(0) @map("volume_right") @db.Decimal(19, 4)
  totalVolume     Decimal        @default(0) @map("total_volume") @db.Decimal(19, 4)

  // Week-specific volume for binary bonus calculation
  weeklyVolumeLeft  Decimal      @default(0) @map("weekly_volume_left") @db.Decimal(19, 4)
  weeklyVolumeRight Decimal      @default(0) @map("weekly_volume_right") @db.Decimal(19, 4)
  currentWeekNumber Int?         @map("current_week_number")
  currentWeekYear   Int?         @map("current_week_year")

  createdAt       DateTime       @default(now()) @map("created_at")
  updatedAt       DateTime       @updatedAt @map("updated_at")

  // ── Relations ──
  user            User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  parent          User?          @relation("BinaryParent", fields: [parentId], references: [id])
  leftChild       User?          @relation("BinaryLeftChild", fields: [leftChildId], references: [id])
  rightChild      User?          @relation("BinaryRightChild", fields: [rightChildId], references: [id])

  @@index([parentId], map: "idx_binary_parent")
  @@index([leftChildId], map: "idx_binary_left_child")
  @@index([rightChildId], map: "idx_binary_right_child")
  @@index([depth], map: "idx_binary_depth")
  @@map("binary_nodes")
}

// ──────────────────────────────────────────────
// BINARY BONUS MODEL (Weekly binary bonus records)
// ──────────────────────────────────────────────

model BinaryBonus {
  id              String   @id @default(uuid()) @db.Uuid
  userId          String   @map("user_id") @db.Uuid       // Bonus recipient
  weekNumber      Int      @map("week_number")             // ISO week
  weekYear        Int      @map("week_year")               // ISO year

  // Volume snapshot at time of calculation
  volumeLeft      Decimal  @map("volume_left") @db.Decimal(19, 4)
  volumeRight     Decimal  @map("volume_right") @db.Decimal(19, 4)
  weakerLegVolume Decimal  @map("weaker_leg_volume") @db.Decimal(19, 4)

  // Bonus calculation
  bonusRate       Decimal  @map("bonus_rate") @db.Decimal(5, 4)
  bonusAmount     Decimal  @map("bonus_amount") @db.Decimal(19, 4)

  // Qualification
  isActiveInvestor Boolean @default(false) @map("is_active_investor")  // $200+ in active investments

  // Carry-forward from stronger leg
  carriedForward  Decimal  @map("carried_forward") @db.Decimal(19, 4) @default(0)

  status          ReferralCommissionStatus @default(pending)
  walletId        String   @map("wallet_id") @db.Uuid
  commissionId    String?  @map("commission_id") @db.Uuid   // Links to ReferralCommission if paid

  createdAt       DateTime @default(now()) @map("created_at")

  // ── Relations ──
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  wallet          Wallet   @relation(fields: [walletId], references: [id])

  @@unique([userId, weekNumber, weekYear], map: "uq_binary_bonus_user_week")
  @@index([weekNumber, weekYear], map: "idx_binary_bonus_week")
  @@index([status], map: "idx_binary_bonus_status")
  @@map("binary_bonuses")
}
```

### 3.8 KYC Verification Models

```prisma
// ──────────────────────────────────────────────
// KYC DOCUMENT MODEL
// ──────────────────────────────────────────────

model KYCDocument {
  id              String           @id @default(uuid()) @db.Uuid
  userId          String           @map("user_id") @db.Uuid
  type            KycDocumentType

  // File stored in Cloudinary
  fileUrl         String           @map("file_url") @db.VarChar(500)
  filePublicId    String?          @map("file_public_id") @db.VarChar(200)
  fileName        String           @map("file_name") @db.VarChar(255)
  fileSize        Int              @map("file_size")         // Bytes
  mimeType        String           @map("mime_type") @db.VarChar(50)

  // Target verification level
  targetKycLevel  KycLevel         @map("target_kyc_level")

  // Review
  status          KycDocumentStatus @default(pending)
  reviewedById    String?          @map("reviewed_by_id") @db.Uuid
  reviewedAt      DateTime?        @map("reviewed_at")
  rejectionReason String?          @map("rejection_reason") @db.Text

  // Compliance flags
  complianceFlags Json?            @map("compliance_flags")  // e.g. sanctions match, manipulation detected

  // Extracted metadata (OCR results, detected name, etc.)
  metadata        Json?

  // Retention
  fileExpiresAt   DateTime?        @map("file_expires_at")  // When Cloudinary file should be purged
  fileDeletedAt   DateTime?        @map("file_deleted_at")

  createdAt       DateTime         @default(now()) @map("created_at")
  updatedAt       DateTime         @updatedAt @map("updated_at")
  deletedAt       DateTime?        @map("deleted_at")

  // ── Relations ──
  user            User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  reviewedBy      User?            @relation("KycDocReviewer", fields: [reviewedById], references: [id])

  @@index([userId, type, status], map: "idx_kyc_doc_user_type_status")
  @@index([status], map: "idx_kyc_doc_status")
  @@index([targetKycLevel], map: "idx_kyc_doc_target_level")
  @@index([fileExpiresAt], map: "idx_kyc_doc_file_expires")
  @@map("kyc_documents")
}

// ──────────────────────────────────────────────
// KYC VERIFICATION MODEL (Level progression
// record — one per level upgrade attempt)
// ──────────────────────────────────────────────

model KYCVerification {
  id              String   @id @default(uuid()) @db.Uuid
  userId          String   @map("user_id") @db.Uuid

  // Level progression
  previousLevel   KycLevel @map("previous_level")
  targetLevel     KycLevel @map("target_level")

  // Status
  status          KycDocumentStatus @default(pending)

  // Review
  reviewedById    String?  @map("reviewed_by_id") @db.Uuid
  reviewedAt      DateTime? @map("reviewed_at")
  notes           String?  @db.Text

  // Re-verification tracking
  isReVerification Boolean  @default(false) @map("is_re_verification")
  previousVerificationId String? @map("previous_verification_id") @db.Uuid

  // Document IDs submitted for this verification attempt
  documentIds     Json?    @map("document_ids")  // Array of KYCDocument UUIDs

  // Expiry tracking
  expiresAt       DateTime? @map("expires_at")   // When re-verification is due (12 months)

  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  // ── Relations ──
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, status], map: "idx_kyc_ver_user_status")
  @@index([targetLevel], map: "idx_kyc_ver_target_level")
  @@index([expiresAt], map: "idx_kyc_ver_expires")
  @@map("kyc_verifications")
}
```

### 3.9 Admin & RBAC Models

```prisma
// ──────────────────────────────────────────────
// ADMIN MODEL (Links a User to admin-specific
// configuration and metadata)
// ──────────────────────────────────────────────

model Admin {
  id              String   @id @default(uuid()) @db.Uuid
  userId          String   @unique @map("user_id") @db.Uuid
  roleId          String   @map("role_id") @db.Uuid

  // Admin-specific metadata
  department      String?  @db.VarChar(50)   // "compliance", "support", "operations"
  isSuperAdmin    Boolean  @default(false) @map("is_super_admin")
  canApproveHighValue Boolean @default(false) @map("can_approve_high_value")  // For >$10k dual-approval

  // Status
  isActive        Boolean  @default(true) @map("is_active")

  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  // ── Relations ──
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  role            AdminRole @relation(fields: [roleId], references: [id])

  @@index([roleId], map: "idx_admin_role")
  @@index([isActive], map: "idx_admin_active")
  @@map("admins")
}

// ──────────────────────────────────────────────
// ADMIN ROLE MODEL
// ──────────────────────────────────────────────

model AdminRole {
  id              String         @id @default(uuid()) @db.Uuid
  name            AdminRoleName  @unique
  displayName     String         @map("display_name") @db.VarChar(50)
  description     String?        @db.Text

  // Hierarchy level (higher = more permissions)
  hierarchyLevel  Int            @map("hierarchy_level")  // 5=SuperAdmin, 4=Admin, 3=Compliance, 2=Support

  isActive        Boolean        @default(true) @map("is_active")

  createdAt       DateTime       @default(now()) @map("created_at")
  updatedAt       DateTime       @updatedAt @map("updated_at")

  // ── Relations ──
  admins          Admin[]
  permissions     AdminPermission[]

  @@index([hierarchyLevel], map: "idx_admin_role_hierarchy")
  @@map("admin_roles")
}

// ──────────────────────────────────────────────
// ADMIN PERMISSION MODEL
// ──────────────────────────────────────────────

model AdminPermission {
  id              String           @id @default(uuid()) @db.Uuid
  roleId          String           @map("role_id") @db.Uuid
  resource        PermissionResource
  actions         Json             // Array of PermissionAction values: ["create","read","update","delete"]

  // Conditions (optional fine-grained constraints)
  conditions      Json?            // e.g. {"maxAmount": 10000, "requires2FA": true}

  createdAt       DateTime         @default(now()) @map("created_at")
  updatedAt       DateTime         @updatedAt @map("updated_at")

  // ── Relations ──
  role            AdminRole        @relation(fields: [roleId], references: [id], onDelete: Cascade)

  // One permission record per role per resource
  @@unique([roleId, resource], map: "uq_admin_perm_role_resource")
  @@index([resource], map: "idx_admin_perm_resource")
  @@map("admin_permissions")
}
```

### 3.10 Notification & Email Models

```prisma
// ──────────────────────────────────────────────
// NOTIFICATION MODEL (In-app notifications)
// ──────────────────────────────────────────────

model Notification {
  id              String           @id @default(uuid()) @db.Uuid
  userId          String           @map("user_id") @db.Uuid
  type            NotificationType

  title           String           @db.VarChar(255)
  message         String           @db.Text
  actionUrl       String?          @map("action_url") @db.VarChar(500)

  isRead          Boolean          @default(false) @map("is_read")
  readAt          DateTime?        @map("read_at")

  // Categorization for filtering
  category        String?          @db.VarChar(50)  // "transaction", "security", "kyc", "system", "marketing"

  // Priority for display ordering
  priority        Int              @default(0)       // Higher = more prominent

  // Expiry (optional — for time-sensitive notifications)
  expiresAt       DateTime?        @map("expires_at")

  createdAt       DateTime         @default(now()) @map("created_at")
  deletedAt       DateTime?        @map("deleted_at")

  // ── Relation ──
  user            User             @relation(fields: [userId], references: [id], onDelete: Cascade)

  // ── Indexes ──
  @@index([userId, isRead, createdAt], map: "idx_notif_user_read_created")
  @@index([userId, type], map: "idx_notif_user_type")
  @@index([userId, category], map: "idx_notif_user_category")
  @@index([expiresAt], map: "idx_notif_expires")
  @@map("notifications")
}

// ──────────────────────────────────────────────
// EMAIL LOG MODEL (Record of all emails sent)
// ──────────────────────────────────────────────

model EmailLog {
  id              String       @id @default(uuid()) @db.Uuid
  userId          String?      @map("user_id") @db.Uuid  // Nullable for non-user emails

  to              String       @db.VarChar(255)
  from            String       @db.VarChar(255)
  subject         String       @db.VarChar(500)
  templateId      String?      @map("template_id") @db.VarChar(100)

  // Resend message ID for tracking
  resendMessageId String?      @map("resend_message_id") @db.VarChar(255)

  status          EmailStatus  @default(sent)
  errorMessage    String?      @map("error_message") @db.Text

  // Template variables used (for audit)
  templateData    Json?        @map("template_data")

  // Categorization
  category        String?      @db.VarChar(50)  // "transaction", "security", "kyc", "marketing", "system"

  createdAt       DateTime     @default(now()) @map("created_at")

  // ── Relation ──
  user            User?        @relation("EmailRecipient", fields: [userId], references: [id])

  @@index([userId], map: "idx_email_log_user")
  @@index([status], map: "idx_email_log_status")
  @@index([resendMessageId], map: "idx_email_log_resend_id")
  @@index([category], map: "idx_email_log_category")
  @@index([createdAt], map: "idx_email_log_created")
  @@map("email_logs")
}
```

### 3.11 Support Ticket Models

```prisma
// ──────────────────────────────────────────────
// SUPPORT TICKET MODEL
// ──────────────────────────────────────────────

model SupportTicket {
  id              String         @id @default(uuid()) @db.Uuid
  userId          String         @map("user_id") @db.Uuid

  // Ticket details
  ticketNumber    String         @unique @map("ticket_number") @db.VarChar(20)  // e.g. "TKT-000001"
  subject         String         @db.VarChar(255)
  category        String         @db.VarChar(50)   // "deposits", "withdrawals", "kyc", etc.
  status          TicketStatus   @default(open)
  priority        TicketPriority @default(medium)

  // Assignment
  assignedTo      String?        @map("assigned_to_id") @db.Uuid

  // SLA tracking
  firstResponseAt DateTime?      @map("first_response_at")
  resolvedAt      DateTime?      @map("resolved_at")
  closedAt        DateTime?      @map("closed_at")

  // Satisfaction
  satisfactionScore Int?         @map("satisfaction_score")  // 1-5
  satisfactionComment String?    @map("satisfaction_comment") @db.Text

  createdAt       DateTime       @default(now()) @map("created_at")
  updatedAt       DateTime       @updatedAt @map("updated_at")
  deletedAt       DateTime?      @map("deleted_at")

  // ── Relations ──
  user            User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  assignedToUser  User?          @relation("AssignedTickets", fields: [assignedTo], references: [id])
  messages        TicketMessage[]

  // ── Indexes ──
  @@index([userId, status], map: "idx_ticket_user_status")
  @@index([assignedTo, status], map: "idx_ticket_assigned_status")
  @@index([status, priority, createdAt], map: "idx_ticket_status_priority")
  @@index([category], map: "idx_ticket_category")
  @@map("support_tickets")
}

// ──────────────────────────────────────────────
// TICKET MESSAGE MODEL
// ──────────────────────────────────────────────

model TicketMessage {
  id              String   @id @default(uuid()) @db.Uuid
  ticketId        String   @map("ticket_id") @db.Uuid
  senderId        String   @map("sender_id") @db.Uuid
  senderRole      String   @map("sender_role") @db.VarChar(20)  // "user" or "admin"

  content         String   @db.Text
  isInternal      Boolean  @default(false) @map("is_internal")  // Admin-only notes

  // Attachments stored in Cloudinary
  attachments     Json?    // Array of {url, fileName, fileSize, mimeType}

  createdAt       DateTime @default(now()) @map("created_at")

  // ── Relations ──
  ticket          SupportTicket @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  sender          User          @relation(fields: [senderId], references: [id])

  @@index([ticketId, createdAt], map: "idx_ticket_msg_ticket_created")
  @@index([senderId], map: "idx_ticket_msg_sender")
  @@map("ticket_messages")
}
```

### 3.12 Currency & Exchange Rate Models

```prisma
// ──────────────────────────────────────────────
// CURRENCY MODEL (Supported display currencies)
// ──────────────────────────────────────────────

model Currency {
  id              String   @id @db.VarChar(3)   // ISO 4217 code: "USD", "EUR", "GBP"
  name            String   @db.VarChar(50)      // "US Dollar", "Euro", "British Pound"
  symbol          String   @db.VarChar(5)       // "$", "€", "£"
  isActive        Boolean  @default(true) @map("is_active")

  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  // ── Relation ──
  exchangeRates   ExchangeRate[]

  @@map("currencies")
}

// ──────────────────────────────────────────────
// EXCHANGE RATE MODEL (Historical rate snapshots)
// ──────────────────────────────────────────────

model ExchangeRate {
  id              String   @id @default(uuid()) @db.Uuid
  baseCurrency    String   @map("base_currency") @db.VarChar(3)  // Always "USD"
  quoteCurrency   String   @map("quote_currency") @db.VarChar(3) // "EUR", "GBP", "BTC", "ETH", "USDT"
  rate            Decimal  @db.Decimal(28, 8)   // 1 USD = rate units of quoteCurrency

  // Source tracking
  source          String   @db.VarChar(50)       // "coingecko", "openexchangerates", "manual"
  sourceTimestamp DateTime @map("source_timestamp")

  createdAt       DateTime @default(now()) @map("created_at")

  // ── Relation ──
  currency        Currency @relation(fields: [quoteCurrency], references: [id])

  @@index([baseCurrency, quoteCurrency, createdAt], map: "idx_ex_rate_pair_time")
  @@index([quoteCurrency], map: "idx_ex_rate_quote")
  @@index([createdAt], map: "idx_ex_rate_created")
  @@map("exchange_rates")
}
```

### 3.13 Security & Session Models

```prisma
// ──────────────────────────────────────────────
// SESSION MODEL
// ──────────────────────────────────────────────

model Session {
  id              String   @id @default(uuid()) @db.Uuid
  userId          String   @map("user_id") @db.Uuid

  // Token
  token           String   @unique @db.VarChar(500)

  // Device/client info
  ipAddress       String   @map("ip_address") @db.VarChar(45)
  userAgent       String?  @map("user_agent") @db.VarChar(500)
  deviceFingerprint String? @map("device_fingerprint") @db.VarChar(255)

  // Lifecycle
  expiresAt       DateTime @map("expires_at")
  lastActivityAt  DateTime @map("last_activity_at")
  isRevoked       Boolean  @default(false) @map("is_revoked")
  revokedAt       DateTime? @map("revoked_at")
  revokeReason    String?  @map("revoke_reason") @db.VarChar(100)

  createdAt       DateTime @default(now()) @map("created_at")

  // ── Relation ──
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, isRevoked], map: "idx_session_user_revoked")
  @@index([expiresAt], map: "idx_session_expires")
  @@map("sessions")
}

// ──────────────────────────────────────────────
// TWO FACTOR AUTH MODEL
// ──────────────────────────────────────────────

model TwoFactorAuth {
  id              String   @id @default(uuid()) @db.Uuid
  userId          String   @unique @map("user_id") @db.Uuid

  // TOTP secret (encrypted at application level)
  secretEncrypted String   @map("secret_encrypted") @db.VarChar(500)
  secretIv        String   @map("secret_iv") @db.VarChar(100)

  // Backup codes (hashed individually, stored as JSON array)
  backupCodesHash Json     @map("backup_codes_hash")  // ["hash1", "hash2", ...]
  backupCodesUsed Int      @default(0) @map("backup_codes_used")

  // Status
  isEnabled       Boolean  @default(false) @map("is_enabled")
  enabledAt       DateTime? @map("enabled_at")
  disabledAt      DateTime? @map("disabled_at")

  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  // ── Relation ──
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("two_factor_auth")
}

// ──────────────────────────────────────────────
// OTP MODEL (One-Time Passwords)
// ──────────────────────────────────────────────

model Otp {
  id              String   @id @default(uuid()) @db.Uuid
  userId          String?  @map("user_id") @db.Uuid  // Nullable for pre-registration OTPs
  identifier      String   @db.VarChar(255)  // Email address or user ID
  type            OtpType

  // Security
  codeHash        String   @map("code_hash") @db.VarChar(255)  // argon2id hash
  expiresAt       DateTime @map("expires_at")
  verified        Boolean  @default(false)
  verifiedAt      DateTime? @map("verified_at")
  attempts        Int      @default(0)       // Number of verification attempts
  maxAttempts     Int      @default(5) @map("max_attempts")

  // IP context
  ipAddress       String?  @map("ip_address") @db.VarChar(45)

  createdAt       DateTime @default(now()) @map("created_at")

  // ── Relations ──
  user            User?    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([identifier, type, verified], map: "idx_otp_identifier_type_verified")
  @@index([expiresAt], map: "idx_otp_expires")
  @@map("otps")
}
```

### 3.14 Audit & Configuration Models

```prisma
// ──────────────────────────────────────────────
// AUDIT LOG MODEL (Immutable, append-only)
// ──────────────────────────────────────────────

model AuditLog {
  id              String   @id @default(uuid()) @db.Uuid
  userId          String?  @map("user_id") @db.Uuid   // Nullable for system-initiated events

  // Action classification
  action          String   @db.VarChar(100)   // e.g. "user.login", "deposit.create"
  entity          String?  @db.VarChar(50)    // e.g. "User", "Withdrawal"
  entityId        String?  @map("entity_id") @db.Uuid

  // Request context
  ipAddress       String?  @map("ip_address") @db.VarChar(45)
  userAgent       String?  @map("user_agent") @db.VarChar(500)
  requestId       String?  @map("request_id") @db.VarChar(100)  // For tracing

  // Event details (old values, new values, request params)
  metadata        Json?

  // Outcome
  status          String?  @db.VarChar(20)    // "success", "failure", "error"
  errorMessage    String?  @map("error_message") @db.Text

  createdAt       DateTime @default(now()) @map("created_at")

  // ── Relation ──
  user            User?    @relation(fields: [userId], references: [id])

  // ── Indexes ──
  @@index([userId, createdAt], map: "idx_audit_user_created")
  @@index([action, createdAt], map: "idx_audit_action_created")
  @@index([entity, entityId], map: "idx_audit_entity")
  @@index([ipAddress], map: "idx_audit_ip")
  @@index([createdAt], map: "idx_audit_created")
  @@index([status], map: "idx_audit_status")
  @@map("audit_logs")
}

// ──────────────────────────────────────────────
// SYSTEM CONFIG MODEL (Key-value platform settings)
// ──────────────────────────────────────────────

model SystemConfig {
  id              String   @id @default(uuid()) @db.Uuid
  key             String   @unique @db.VarChar(100)
  value           Json                              // Flexible value: string, number, boolean, object
  description     String?  @db.Text                  // Human-readable description
  category        String?  @db.VarChar(50)           // "fees", "deposits", "withdrawals", "referrals", "kyc", "email", "general"

  // Change tracking
  updatedById     String?  @map("updated_by_id") @db.Uuid
  updatedAt       DateTime @updatedAt @map("updated_at")
  createdAt       DateTime @default(now()) @map("created_at")

  // ── Relation ──
  updatedBy       User?    @relation("ConfigUpdater", fields: [updatedById], references: [id])

  @@index([category], map: "idx_sysconfig_category")
  @@map("system_configs")
}
```

### 3.15 Promo Code Models

```prisma
// ──────────────────────────────────────────────
// PROMO CODE MODEL
// ──────────────────────────────────────────────

model PromoCode {
  id              String           @id @default(uuid()) @db.Uuid
  code            String           @unique @db.VarChar(30)

  // Discount
  discountType    PromoDiscountType @map("discount_type")
  discountValue   Decimal          @map("discount_value") @db.Decimal(10, 4)
  maxDiscount     Decimal?         @map("max_discount") @db.Decimal(19, 4)  // Cap for percentage discounts

  // Applicability
  applicablePlans Json?            @map("applicable_plans")  // Array of plan slugs, null = all plans
  minDeposit      Decimal?         @map("min_deposit") @db.Decimal(19, 4)

  // Limits
  maxUses         Int?             @map("max_uses")          // Total redemptions allowed
  maxUsesPerUser  Int              @default(1) @map("max_uses_per_user")
  currentUses     Int              @default(0) @map("current_uses")

  // Validity window
  validFrom       DateTime         @map("valid_from")
  validUntil      DateTime?        @map("valid_until")

  // Status
  status          PromoCodeStatus  @default(active)
  createdBy       String?          @map("created_by_id") @db.Uuid

  createdAt       DateTime         @default(now()) @map("created_at")
  updatedAt       DateTime         @updatedAt @map("updated_at")

  // ── Relations ──
  userPromos      UserPromo[]
  creator         User?            @relation("PromoCreator", fields: [createdBy], references: [id])

  @@index([status, validFrom], map: "idx_promo_status_valid")
  @@index([code], map: "idx_promo_code")
  @@map("promo_codes")
}

// ──────────────────────────────────────────────
// USER PROMO MODEL (Tracks promo code redemptions)
// ──────────────────────────────────────────────

model UserPromo {
  id              String   @id @default(uuid()) @db.Uuid
  userId          String   @map("user_id") @db.Uuid
  promoCodeId     String   @map("promo_code_id") @db.Uuid
  depositId       String?  @map("deposit_id") @db.Uuid  // The deposit that triggered this

  // Applied discount
  discountType    PromoDiscountType @map("discount_type")
  discountValue   Decimal  @map("discount_value") @db.Decimal(19, 4)
  bonusCredited   Decimal  @map("bonus_credited") @db.Decimal(19, 4)

  // Wallet that received the bonus
  walletId        String   @map("wallet_id") @db.Uuid

  createdAt       DateTime @default(now()) @map("created_at")

  // ── Relations ──
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  promoCode       PromoCode @relation(fields: [promoCodeId], references: [id])
  wallet          Wallet   @relation(fields: [walletId], references: [id])

  @@unique([userId, promoCodeId, depositId], map: "uq_user_promo_user_code_deposit")
  @@index([userId], map: "idx_user_promo_user")
  @@index([promoCodeId], map: "idx_user_promo_code")
  @@map("user_promos")
}
```

---

## 4. Entity-Relationship Diagram (ERD)

```mermaid
erDiagram
    %% ── Core User ──
    User ||--o| Profile : "has one"
    User ||--o{ Wallet : "has two (demo + live)"
    User ||--o{ Deposit : "makes"
    User ||--o{ Withdrawal : "requests"
    User ||--o{ UserInvestment : "owns"
    User ||--o{ Notification : "receives"
    User ||--o{ AuditLog : "generates"
    User ||--o{ SupportTicket : "opens"
    User ||--o{ KYCDocument : "submits"
    User ||--o{ KYCVerification : "undergoes"
    User ||--o{ Session : "has active"
    User ||--o{ Otp : "receives"
    User ||--o{ EmailLog : "is sent"
    User ||--o| TwoFactorAuth : "configures"
    User ||--o| BinaryNode : "occupies"
    User ||--o| Admin : "may be"
    User ||--o{ UserPromo : "redeems"
    User }o--o{ User : "ReferralTree (referredBy)"

    %% ── Wallet & Transactions ──
    Wallet ||--o{ Transaction : "records"
    Wallet ||--o{ TransactionLog : "logs"
    Wallet ||--o{ Deposit : "receives"
    Wallet ||--o{ Withdrawal : "funds"
    Wallet ||--o{ UserInvestment : "finances"
    Wallet ||--o{ ReferralCommission : "credits"
    Wallet ||--o{ BinaryBonus : "credits"
    Wallet ||--o{ UserPromo : "bonus to"

    %% ── Account ──
    User ||--o{ Account : "has (demo + live)"
    Account ||--o| Wallet : "maps to"

    %% ── Investment Plans ──
    InvestmentPlan ||--o{ UserInvestment : "selected by"
    InvestmentPlan ||--o{ PlanPayout : "generates"
    UserInvestment ||--o{ PlanPayout : "produces"
    UserInvestment }o--|| Wallet : "funded by"
    UserInvestment }o--|| User : "belongs to"
    UserInvestment }o--|| InvestmentPlan : "uses"

    %% ── Deposits ──
    Deposit ||--o| GiftCardSubmission : "may have"
    GiftCardSubmission ||--o{ GiftCardReview : "reviewed in"

    %% ── Withdrawals ──
    Withdrawal ||--o{ WithdrawalFee : "breaks into"

    %% ── Referral ──
    Referral }o--|| User : "referrer"
    Referral }o--|| User : "referred"
    ReferralCommission }o--|| User : "recipient"
    ReferralCommission }o--|| User : "source"
    ReferralCommission }o--|| Wallet : "credits"
    BinaryNode }o--|| User : "belongs to"
    BinaryNode }o--o| User : "parent"
    BinaryNode }o--o| User : "left child"
    BinaryNode }o--o| User : "right child"
    BinaryBonus }o--|| User : "paid to"
    BinaryBonus }o--|| Wallet : "credits"

    %% ── Admin RBAC ──
    Admin }o--|| User : "is"
    Admin }o--|| AdminRole : "has"
    AdminRole ||--o{ AdminPermission : "grants"

    %% ── Support ──
    SupportTicket }o--|| User : "opened by"
    SupportTicket }o--o| User : "assigned to"
    SupportTicket ||--o{ TicketMessage : "contains"
    TicketMessage }o--|| User : "sent by"

    %% ── Currency ──
    Currency ||--o{ ExchangeRate : "has"
    ExchangeRate }o--|| Currency : "for"

    %% ── Promo ──
    PromoCode ||--o{ UserPromo : "redeemed via"
    UserPromo }o--|| User : "by"
    UserPromo }o--|| PromoCode : "uses"
    UserPromo }o--|| Wallet : "credits"

    %% ── System ──
    SystemConfig }o--o| User : "updated by"

    User {
        uuid id PK
        varchar email UK
        varchar password_hash
        boolean email_verified
        enum status
        enum kyc_level
        enum active_mode
        varchar referral_code UK
        uuid referred_by_id FK
        boolean two_factor_enabled
        varchar preferred_currency
        varchar preferred_language
        timestamp created_at
        timestamp updated_at
        timestamp deleted_at
    }

    Wallet {
        uuid id PK
        uuid user_id FK
        enum type
        decimal balance
        decimal available_balance
        decimal locked_balance
        varchar currency
    }

    Transaction {
        uuid id PK
        uuid wallet_id FK
        enum type
        decimal amount
        enum status
        varchar description
        uuid reference_id
        varchar reference_type
        jsonb metadata
    }

    TransactionLog {
        uuid id PK
        uuid transaction_id FK
        uuid wallet_id FK
        decimal balance_before
        decimal balance_after
        varchar operation
    }

    InvestmentPlan {
        uuid id PK
        varchar name
        varchar slug UK
        decimal min_amount
        decimal max_amount
        int duration
        enum duration_unit
        decimal return_rate
        enum required_kyc_level
        boolean is_active
    }

    UserInvestment {
        uuid id PK
        uuid user_id FK
        uuid plan_id FK
        uuid wallet_id FK
        enum mode
        decimal amount
        decimal expected_return
        decimal actual_return
        timestamp start_date
        timestamp end_date
        enum status
    }

    PlanPayout {
        uuid id PK
        uuid investment_id FK
        uuid plan_id FK
        uuid wallet_id FK
        decimal principal_returned
        decimal profit_credited
        decimal total_credited
        enum status
    }

    Deposit {
        uuid id PK
        uuid user_id FK
        uuid wallet_id FK
        enum mode
        enum method
        decimal amount
        varchar currency
        enum crypto_currency
        varchar crypto_tx_hash
        decimal crypto_amount
        enum status
        uuid verified_by_id FK
    }

    GiftCardSubmission {
        uuid id PK
        uuid deposit_id FK UK
        uuid user_id FK
        varchar card_brand
        decimal card_value
        varchar screenshot_url
        enum status
        uuid reviewed_by_id FK
        boolean fraud_flag
    }

    GiftCardReview {
        uuid id PK
        uuid submission_id FK
        uuid reviewer_id FK
        varchar action
        varchar notes
    }

    Withdrawal {
        uuid id PK
        uuid user_id FK
        uuid wallet_id FK
        enum mode
        decimal amount
        decimal fee_amount
        decimal fee_rate
        decimal net_amount
        enum destination_type
        varchar destination_address
        enum status
        uuid processed_by_id FK
        int risk_score
    }

    WithdrawalFee {
        uuid id PK
        uuid withdrawal_id FK
        decimal management_fee
        decimal signal_fee
        decimal insurance_fee
        decimal certificate_fee
        decimal vat_fee
        decimal total_fee
    }

    Referral {
        uuid id PK
        uuid referrer_id FK
        uuid referred_id FK UK
        varchar code
        int level
        boolean is_active
    }

    ReferralCommission {
        uuid id PK
        uuid user_id FK
        uuid source_user_id FK
        decimal amount
        decimal rate
        enum type
        int week_number
        int week_year
        enum status
        uuid wallet_id FK
    }

    BinaryNode {
        uuid id PK
        uuid user_id FK UK
        uuid parent_id FK
        enum position
        uuid left_child_id FK
        uuid right_child_id FK
        int depth
        decimal volume_left
        decimal volume_right
    }

    BinaryBonus {
        uuid id PK
        uuid user_id FK
        int week_number
        int week_year
        decimal volume_left
        decimal volume_right
        decimal weaker_leg_volume
        decimal bonus_rate
        decimal bonus_amount
        enum status
        uuid wallet_id FK
    }

    KYCDocument {
        uuid id PK
        uuid user_id FK
        enum type
        varchar file_url
        varchar file_name
        int file_size
        enum target_kyc_level
        enum status
        uuid reviewed_by_id FK
    }

    KYCVerification {
        uuid id PK
        uuid user_id FK
        enum previous_level
        enum target_level
        enum status
        uuid reviewed_by_id FK
        boolean is_re_verification
        timestamp expires_at
    }

    Notification {
        uuid id PK
        uuid user_id FK
        enum type
        varchar title
        text message
        varchar action_url
        boolean is_read
        varchar category
        int priority
    }

    EmailLog {
        uuid id PK
        uuid user_id FK
        varchar to
        varchar subject
        varchar template_id
        varchar resend_message_id
        enum status
        varchar category
    }

    SupportTicket {
        uuid id PK
        uuid user_id FK
        varchar ticket_number UK
        varchar subject
        varchar category
        enum status
        enum priority
        uuid assigned_to_id FK
    }

    TicketMessage {
        uuid id PK
        uuid ticket_id FK
        uuid sender_id FK
        varchar sender_role
        text content
        boolean is_internal
    }

    Currency {
        varchar id PK
        varchar name
        varchar symbol
        boolean is_active
    }

    ExchangeRate {
        uuid id PK
        varchar base_currency
        varchar quote_currency FK
        decimal rate
        varchar source
    }

    Session {
        uuid id PK
        uuid user_id FK
        varchar token UK
        varchar ip_address
        timestamp expires_at
        boolean is_revoked
    }

    TwoFactorAuth {
        uuid id PK
        uuid user_id FK UK
        varchar secret_encrypted
        jsonb backup_codes_hash
        boolean is_enabled
    }

    Otp {
        uuid id PK
        uuid user_id FK
        varchar identifier
        enum type
        varchar code_hash
        timestamp expires_at
        boolean verified
        int attempts
    }

    AuditLog {
        uuid id PK
        uuid user_id FK
        varchar action
        varchar entity
        uuid entity_id
        varchar ip_address
        jsonb metadata
        varchar status
    }

    SystemConfig {
        uuid id PK
        varchar key UK
        jsonb value
        varchar description
        varchar category
        uuid updated_by_id FK
    }

    Admin {
        uuid id PK
        uuid user_id FK UK
        uuid role_id FK
        varchar department
        boolean is_super_admin
        boolean is_active
    }

    AdminRole {
        uuid id PK
        enum name UK
        varchar display_name
        int hierarchy_level
        boolean is_active
    }

    AdminPermission {
        uuid id PK
        uuid role_id FK
        enum resource
        jsonb actions
    }

    PromoCode {
        uuid id PK
        varchar code UK
        enum discount_type
        decimal discount_value
        decimal max_discount
        int max_uses
        int max_uses_per_user
        int current_uses
        timestamp valid_from
        timestamp valid_until
        enum status
    }

    UserPromo {
        uuid id PK
        uuid user_id FK
        uuid promo_code_id FK
        uuid deposit_id FK
        enum discount_type
        decimal discount_value
        decimal bonus_credited
        uuid wallet_id FK
    }

    Account {
        uuid id PK
        uuid user_id FK
        enum mode
        boolean is_active
        decimal total_deposits
        decimal total_withdrawals
        decimal total_invested
        decimal total_returns
        decimal total_commissions
    }

    Profile {
        uuid id PK
        uuid user_id FK UK
        varchar first_name
        varchar last_name
        varchar phone
        date date_of_birth
        varchar country
        varchar street_address
        varchar city
        varchar state
        varchar postal_code
    }
```

---

## 5. Index Strategy

### 5.1 Index Design Philosophy

Indexes are designed to optimize the platform's most frequent and performance-critical query patterns. Every foreign key column automatically receives a B-tree index through Prisma's default behavior. The additional indexes defined in the schema above target specific access patterns.

### 5.2 Index Categories

#### Authentication & User Lookup

| Table | Index | Type | Rationale |
|-------|-------|------|-----------|
| `users` | `email` (unique) | B-tree | Every login, registration check, password reset |
| `users` | `referral_code` (unique) | B-tree | Referrer lookup during registration |
| `users` | `status` | B-tree | Admin dashboard user filtering |
| `users` | `kyc_level` | B-tree | KYC-gated feature access checks |
| `sessions` | `token` (unique) | B-tree | Session validation on every API request |
| `sessions` | `user_id, is_revoked` | Composite B-tree | Active session enumeration (e.g., for logout-all) |
| `otps` | `identifier, type, verified` | Composite B-tree | OTP lookup during verification flow |

#### Financial Operations (Highest Priority)

| Table | Index | Type | Rationale |
|-------|-------|------|-----------|
| `wallets` | `user_id, type` (unique) | B-tree | Wallet lookup per mode — every financial operation |
| `transactions` | `wallet_id, created_at` | Composite B-tree | Transaction history pagination (most common user query) |
| `transactions` | `type` | B-tree | Admin report filtering by transaction type |
| `transactions` | `status` | B-tree | Pending/failed transaction monitoring |
| `transaction_logs` | `transaction_id` | B-tree | Audit trail lookup for a specific transaction |
| `transaction_logs` | `wallet_id, created_at` | Composite B-tree | Balance reconstruction queries |
| `deposits` | `user_id, status` | Composite B-tree | User dashboard pending deposit display |
| `deposits` | `status` | B-tree | Admin verification queue |
| `deposits` | `crypto_tx_hash` | B-tree | Blockchain confirmation lookup |
| `withdrawals` | `user_id, status` | Composite B-tree | User dashboard pending withdrawal display |
| `withdrawals` | `status` | B-tree | Admin approval queue |
| `withdrawal_fees` | `withdrawal_id` | B-tree | Fee breakdown lookup |

#### Investment Operations

| Table | Index | Type | Rationale |
|-------|-------|------|-----------|
| `user_investments` | `user_id, status` | Composite B-tree | User's active investments dashboard |
| `user_investments` | `status, end_date` | Composite B-tree | **Critical** — maturity processor runs every minute |
| `user_investments` | `plan_id` | B-tree | Plan uptake reporting |
| `plan_payouts` | `investment_id` | B-tree | Payout history per investment |
| `plan_payouts` | `status` | B-tree | Failed payout monitoring |

#### Referral & Binary Tree

| Table | Index | Type | Rationale |
|-------|-------|------|-----------|
| `referrals` | `referrer_id` | B-tree | Referral count and commission eligibility |
| `referrals` | `referred_id` (unique) | B-tree | Prevent duplicate referral relationships |
| `referral_commissions` | `user_id, created_at` | Composite B-tree | User's commission earnings history |
| `referral_commissions` | `user_id, week_number, week_year` | Composite B-tree | Weekly binary bonus reporting |
| `referral_commissions` | `source_user_id` | B-tree | Trace commission to source activity |
| `binary_nodes` | `user_id` (unique) | B-tree | One node per user |
| `binary_nodes` | `parent_id` | B-tree | Tree traversal (find children of a node) |
| `binary_nodes` | `depth` | B-tree | Depth-based queries for tree visualization |
| `binary_bonuses` | `user_id, week_number, week_year` (unique) | B-tree | Prevent duplicate weekly bonuses |
| `binary_bonuses` | `week_number, week_year` | Composite B-tree | Batch processing all bonuses for a week |

#### KYC & Compliance

| Table | Index | Type | Rationale |
|-------|-------|------|-----------|
| `kyc_documents` | `user_id, type, status` | Composite B-tree | Check user's KYC submission status |
| `kyc_documents` | `status` | B-tree | Admin review queue |
| `kyc_documents` | `file_expires_at` | B-tree | Cloudinary file retention cleanup job |
| `kyc_verifications` | `user_id, status` | Composite B-tree | User's verification history |
| `kyc_verifications` | `expires_at` | B-tree | Re-verification reminder job |

#### Notifications & Email

| Table | Index | Type | Rationale |
|-------|-------|------|-----------|
| `notifications` | `user_id, is_read, created_at` | Composite B-tree | Unread notification count + pagination |
| `notifications` | `user_id, type` | Composite B-tree | Filter notifications by type |
| `email_logs` | `user_id` | B-tree | User's email history |
| `email_logs` | `status` | B-tree | Bounced/failed email monitoring |
| `email_logs` | `resend_message_id` | B-tree | Webhook event correlation |

#### Support

| Table | Index | Type | Rationale |
|-------|-------|------|-----------|
| `support_tickets` | `user_id, status` | Composite B-tree | User's active tickets |
| `support_tickets` | `assigned_to, status` | Composite B-tree | Admin's assigned ticket queue |
| `support_tickets` | `status, priority, created_at` | Composite B-tree | Admin queue sorting by urgency |
| `ticket_messages` | `ticket_id, created_at` | Composite B-tree | Conversation thread ordering |

#### Audit

| Table | Index | Type | Rationale |
|-------|-------|------|-----------|
| `audit_logs` | `user_id, created_at` | Composite B-tree | User's audit history |
| `audit_logs` | `action, created_at` | Composite B-tree | Admin filtering by action type |
| `audit_logs` | `entity, entity_id` | Composite B-tree | Entity-specific audit trail |
| `audit_logs` | `ip_address` | B-tree | Security investigation by IP |
| `audit_logs` | `created_at` | B-tree | Time-range audit queries |

### 5.3 Future Index Considerations

As the platform scales, the following indexes should be evaluated for addition based on query performance monitoring:

- **GIN index on `audit_logs.metadata`** — If admin audit search requires filtering by metadata fields (e.g., searching for specific old/new values).
- **Partial index on `transactions (wallet_id, created_at) WHERE type = 'deposit'`** — If deposit-specific transaction queries become frequent.
- **BRIN index on `transactions.created_at`** — If the transactions table grows very large and time-range queries dominate.
- **GIN index on `support_tickets` tsvector column** — If full-text search across ticket subjects and messages is implemented.

---

## 6. Data Partitioning Considerations

### 6.1 Current Phase Assessment

For the initial launch (Phase 1), **no table partitioning is implemented**. PostgreSQL handles the expected data volume efficiently with proper indexing. The following analysis identifies tables that may benefit from partitioning as the platform scales.

### 6.2 Candidates for Future Partitioning

#### Audit Logs — Range Partitioning by `created_at`

`audit_logs` is the highest-volume append-only table. Every user action (login, page view, API call) and every financial operation generates an audit entry. At scale (10,000+ active users, 50+ actions per user per day), this table will grow by 500,000+ rows per day.

**Recommended strategy:** Monthly range partitioning on `created_at`.

```sql
-- Future partitioning example (Phase 2+)
CREATE TABLE audit_logs (
  id UUID NOT NULL,
  user_id UUID,
  action VARCHAR(100) NOT NULL,
  entity VARCHAR(50),
  entity_id UUID,
  ip_address VARCHAR(45),
  user_agent VARCHAR(500),
  request_id VARCHAR(100),
  metadata JSONB,
  status VARCHAR(20),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (created_at);

CREATE TABLE audit_logs_2025_01 PARTITION OF audit_logs
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
```

**Benefits:** Older partitions can be detached and archived without affecting query performance on recent data. Retention policy (2 years) maps cleanly to monthly partitions.

#### Transactions — Range Partitioning by `created_at`

`transactions` will grow proportionally to user activity. Every deposit, withdrawal, investment, return, commission, and fee creates a transaction record. The 7-year retention requirement means this table accumulates data indefinitely.

**Recommended strategy:** Quarterly range partitioning on `created_at`.

#### Notifications — Range Partitioning by `created_at` + Time-to-Live

Notifications have a 1-year retention period. Partitioning by month allows efficient purging of expired notifications by dropping entire partitions rather than running mass `DELETE` queries.

**Recommended strategy:** Monthly range partitioning on `created_at`, with monthly job to drop partitions older than 13 months.

#### Exchange Rates — Range Partitioning by `created_at`

Exchange rates are polled every 60 seconds (crypto) and 5 minutes (fiat), generating ~1,500+ rows per day. Historical rates have limited value beyond 30 days for display purposes, though they are retained for audit.

**Recommended strategy:** Monthly range partitioning. Partitions older than 6 months can be compressed or archived.

### 6.3 Tables Not Suitable for Partitioning

- **Users, Profiles, Wallets, KYCDocuments** — Moderate row count, heavily indexed, no natural partitioning key.
- **InvestmentPlans, Currencies, SystemConfigs, AdminRoles, AdminPermissions** — Configuration tables with very few rows.
- **Referrals, BinaryNodes** — Relationship tables that grow linearly with users. Partitioning adds complexity without clear benefit at expected scales.
- **Deposits, Withdrawals, UserInvestments** — Medium volume. Partitioning should be evaluated when rows exceed 10 million.

### 6.4 Partitioning Implementation Notes

- Prisma ORM does not natively support declaring partitioned tables in the schema. Partitioning is implemented via **custom SQL migration files** that Prisma Migrate can execute.
- Application queries do not need to change — PostgreSQL's partition pruning automatically routes queries to the correct partition based on the `WHERE` clause.
- The maturity processor query (`WHERE status = 'active' AND end_date <= NOW()`) on `user_investments` is a strong candidate for a **partial index** rather than partitioning, as only active rows need fast access.

---

## 7. Migration Strategy

### 7.1 Prisma Migrate Workflow

All schema changes are managed through Prisma Migrate, generating versioned SQL migration files from the `schema.prisma` definition.

```
prisma/migrations/
├── 20250115143000_init_schema/
│   └── migration.sql
├── 20250115150000_add_gift_card_tables/
│   └── migration.sql
├── 20250115160000_add_binary_tree/
│   └── migration.sql
└── migration_lock.toml
```

### 7.2 Development Workflow

1. Developer modifies `schema.prisma`
2. Run `pnpm prisma migrate dev --name descriptive_name`
3. Prisma generates migration SQL + updates database + regenerates client types
4. Test locally
5. Commit both schema change and migration file

### 7.3 Production Deployment Workflow

1. Migrations are applied automatically via `prisma migrate deploy` in the Dockerfile, running **before** the application starts
2. If migration fails, deployment stops; previous container continues running
3. Complex migrations (data backfills) are split into multiple deployment steps with explicit coordination
4. All production migrations are tested against a staging database mirroring production schema and data volume

### 7.4 Zero-Downtime Migration Rules

| Operation | Strategy |
|-----------|----------|
| Add nullable column | Safe — no downtime |
| Add column with default | Safe — no downtime (PostgreSQL 11+ rewrites not needed for constant defaults) |
| Remove column | Two-phase: (1) remove from app code, deploy, (2) drop column in next migration |
| Add index | Use `CREATE INDEX CONCURRENTLY` in custom SQL |
| Add unique constraint | Use `CREATE UNIQUE INDEX CONCURRENTLY` in custom SQL |
| Rename column | Two-phase: (1) add new column, copy data, (2) drop old column |
| Data backfill | Background job processing records in batches, not in migration SQL |
| Change column type | Two-phase: (1) add new column, migrate data, (2) swap and drop old column |

### 7.5 Rollback Strategy

- Every migration must have a reversible `down.sql` file
- For production rollbacks, the application code and database must be rolled back together
- `prisma migrate resolve --rolled-back` marks a migration as rolled back without executing SQL (for manual recovery)
- Backups (pg_dump + WAL) enable point-in-time recovery if a migration causes data corruption

### 7.6 Connection Pooling

- **Application pool:** Prisma uses `pg-pool` internally. Configure `connection_limit` in the database URL to match PostgreSQL's `max_connections` minus reserved connections.
- **Recommended:** Use PgBouncer (transaction mode) in production to manage connection pooling efficiently, especially with serverless deployments that create many short-lived connections.
- **Prisma PgBouncer compatibility:** Set `pgbouncer: true` in the Prisma datasource URL when using PgBouncer in transaction mode.

---

## 8. Seed Data Requirements

### 8.1 Investment Plans (Required)

Four investment plan records must be seeded on initial deployment:

| Field | Basic | Silver | Gold | Platinum |
|-------|-------|--------|------|----------|
| `name` | "Basic" | "Silver" | "Gold" | "Platinum" |
| `slug` | "basic" | "silver" | "gold" | "platinum" |
| `minAmount` | 200.0000 | 5000.0000 | 10000.0000 | 50000.0000 |
| `maxAmount` | 4999.9900 | 9999.9900 | 49999.9900 | 100000.0000 |
| `duration` | 24 | 72 | 7 | 14 |
| `durationUnit` | `hours` | `hours` | `days` | `days` |
| `returnRate` | 0.5000 | 0.5000 | 0.5000 | 0.5000 |
| `requiredKycLevel` | `LEVEL_1` | `LEVEL_2` | `LEVEL_2` | `LEVEL_3` |
| `sortOrder` | 1 | 2 | 3 | 4 |
| `isActive` | true | true | true | true |

### 8.2 Currencies (Required)

| `id` | `name` | `symbol` | `isActive` |
|------|--------|----------|------------|
| `USD` | "US Dollar" | "$" | true |
| `EUR` | "Euro" | "€" | true |
| `GBP` | "British Pound" | "£" | true |

### 8.3 Admin Roles (Required)

| `name` | `displayName` | `hierarchyLevel` | `isActive` |
|--------|--------------|-------------------|------------|
| `SUPER_ADMIN` | "Super Admin" | 5 | true |
| `ADMIN` | "Admin" | 4 | true |
| `COMPLIANCE` | "KYC Officer" | 3 | true |
| `SUPPORT` | "Support Agent" | 2 | true |

### 8.4 Admin Permissions (Required)

Each role must have permission records for their authorized resources. Below is the full permission matrix:

| Resource | SUPER_ADMIN | ADMIN | COMPLIANCE | SUPPORT |
|----------|-------------|-------|------------|---------|
| `users` | ALL actions | create, read, update, ban | read | read |
| `kyc` | ALL actions | read, approve, reject | review, approve, reject, view | — |
| `deposits` | ALL actions | read, approve, reject | — | read |
| `withdrawals` | ALL actions | read, approve, reject | — | read |
| `investments` | ALL actions | read, manage | — | read |
| `plans` | ALL actions | read, manage | — | read |
| `referrals` | ALL actions | read, view | — | read |
| `commissions` | ALL actions | read, adjust | — | — |
| `tickets` | ALL actions | view, respond, close, escalate | view, respond | view, respond, close, escalate |
| `reports` | ALL actions | view, export | — | — |
| `analytics` | ALL actions | view | — | — |
| `audit_logs` | ALL actions | view, export | view (own actions) | — |
| `system_config` | ALL actions | — | — | — |
| `roles` | ALL actions | — | — | — |
| `settings` | ALL actions | view | — | — |
| `notifications` | ALL actions | manage | — | — |
| `promotions` | ALL actions | create, read, update | — | — |

### 8.5 System Configuration (Required)

The following system configuration keys must be seeded:

| `key` | `value` | `category` | `description` |
|-------|---------|------------|---------------|
| `demo_starting_balance` | `10000` | `general` | Default demo wallet balance for new users |
| `withdrawal_fee_rate` | `0.21` | `fees` | 21% withdrawal fee rate |
| `fee_allocation.management` | `0.30` | `fees` | 30% of fee for account management |
| `fee_allocation.signal` | `0.25` | `fees` | 25% of fee for trading signals |
| `fee_allocation.insurance` | `0.20` | `fees` | 20% of fee for insurance |
| `fee_allocation.certificate` | `0.05` | `fees` | 5% of fee for investment certificates |
| `fee_allocation.vat` | `0.20` | `fees` | 20% of fee for VAT |
| `direct_referral_rate` | `0.10` | `referrals` | 10% direct referral commission |
| `binary_bonus_rate` | `0.05` | `referrals` | 5% binary bonus rate (configurable) |
| `binary_min_investment` | `200` | `referrals` | Min active investment for binary eligibility |
| `binary_weekly_max` | `50000` | `referrals` | Max weekly binary bonus cap |
| `binary_flush_policy` | `"carry_forward"` | `referrals` | Flush policy: carry_forward or flush |
| `crypto.min_deposit_usd` | `10` | `deposits` | Minimum crypto deposit in USD |
| `crypto.max_deposit_usd` | `100000` | `deposits` | Maximum crypto deposit in USD |
| `crypto.confirmations.BTC` | `3` | `deposits` | BTC confirmation requirement |
| `crypto.confirmations.ETH` | `12` | `deposits` | ETH confirmation requirement |
| `crypto.confirmations.USDT` | `10` | `deposits` | USDT confirmation requirement |
| `exchange_rate.refresh_crypto_sec` | `60` | `general` | Crypto rate refresh interval (seconds) |
| `exchange_rate.refresh_fiat_sec` | `300` | `general` | Fiat rate refresh interval (seconds) |
| `withdrawal.min_net_usd` | `10` | `withdrawals` | Minimum net withdrawal after fees |
| `kyc.level1.daily_deposit_limit` | `2000` | `kyc` | Level 1 cumulative deposit limit |
| `kyc.level2.daily_deposit_limit` | `10000` | `kyc` | Level 2 cumulative deposit limit |
| `kyc.level3.daily_deposit_limit` | `100000` | `kyc` | Level 3 cumulative deposit limit |
| `kyc.level1.daily_withdrawal_limit` | `500` | `kyc` | Level 1 daily withdrawal limit |
| `kyc.level2.daily_withdrawal_limit` | `5000` | `kyc` | Level 2 daily withdrawal limit |
| `kyc.level3.daily_withdrawal_limit` | `50000` | `kyc` | Level 3 daily withdrawal limit |
| `kyc.re_verification_period_months` | `12` | `kyc` | Months between re-verification |
| `kyc.re_verification_reminder_days` | `[30, 14, 7]` | `kyc` | Days before expiry to send reminders |
| `kyc.document_retention_years` | `5` | `kyc` | Years to retain KYC documents |
| `email.from_address` | `"noreply@teslaprimecapital.com"` | `email` | Sender email address |
| `email.from_name` | `"TeslaPrimeCapital"` | `email` | Sender display name |
| `maintenance_mode` | `false` | `general` | Platform maintenance mode toggle |
| `platform_name` | `"TeslaPrimeCapital"` | `general` | Display name used in emails and UI |
| `dual_approval_threshold` | `10000` | `withdrawals` | Amount threshold for dual admin approval |

### 8.6 Super Admin Account (Required)

A default Super Admin user account must be created during initial deployment with credentials seeded from environment variables (never hardcoded):

- Email: from `SEED_ADMIN_EMAIL` environment variable
- Password: hashed from `SEED_ADMIN_PASSWORD` environment variable
- Role: `SUPER_ADMIN`
- KYC Level: `LEVEL_3`
- Status: `active`
- Profile: name and other details from environment variables

### 8.7 Seed Script Architecture

The seed script (`prisma/seed.ts`) must be idempotent — running it multiple times produces the same result without creating duplicates. This is achieved through:

- `upsert` operations for all configuration data
- Checking for existing records before creating users
- Using `createMany` with `skipDuplicates` for permission data
- Wrapping the entire seed in a Prisma interactive transaction

---

## Appendix A: Prisma Datasource Configuration

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  // Example: postgresql://user:password@localhost:5432/teslaprimecapital?schema=public
}
```

## Appendix B: Model Count Summary

| Category | Models | Count |
|----------|--------|-------|
| Core User | User, Profile | 2 |
| Account & Wallet | Account, Wallet, Transaction, TransactionLog | 4 |
| Investment Plans | InvestmentPlan, UserInvestment, PlanPayout | 3 |
| Deposits | Deposit, GiftCardSubmission, GiftCardReview | 3 |
| Withdrawals | Withdrawal, WithdrawalFee | 2 |
| Referral & Binary | Referral, ReferralCommission, BinaryNode, BinaryBonus | 4 |
| KYC | KYCDocument, KYCVerification | 2 |
| Admin & RBAC | Admin, AdminRole, AdminPermission | 3 |
| Notifications & Email | Notification, EmailLog | 2 |
| Support | SupportTicket, TicketMessage | 2 |
| Currency | Currency, ExchangeRate | 2 |
| Security | Session, TwoFactorAuth, Otp | 3 |
| Audit & Config | AuditLog, SystemConfig | 2 |
| Promos | PromoCode, UserPromo | 2 |
| **Total** | | **36 models** |

## Appendix C: Enum Count Summary

| Category | Enums | Count |
|----------|-------|-------|
| User & Auth | UserStatus, KycLevel, UserMode, WalletType | 4 |
| Transactions | TransactionType, TransactionStatus | 2 |
| Investments | InvestmentStatus, DurationUnit, PayoutStatus | 3 |
| Deposits | DepositMethod, CryptoCurrency, DepositStatus, GiftCardStatus | 4 |
| Withdrawals | WithdrawalStatus, WithdrawalDestinationType | 2 |
| Referral | ReferralCommissionType, ReferralCommissionStatus, BinaryPosition | 3 |
| KYC | KycDocumentType, KycDocumentStatus | 2 |
| Admin | AdminRoleName, PermissionAction, PermissionResource | 3 |
| Notifications | NotificationType, EmailStatus | 2 |
| Support | TicketStatus, TicketPriority | 2 |
| Security | OtpType | 1 |
| Promos | PromoDiscountType, PromoCodeStatus | 2 |
| **Total** | | **30 enums** |