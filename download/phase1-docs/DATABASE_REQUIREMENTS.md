# Database Requirements

**Project:** Enterprise Investment Platform — Phase 1  
**Version:** 1.0.0  
**Last Updated:** 2025-01  
**Status:** Approved  

This document defines the database strategy, schema design, entity relationships, indexing, retention policies, backup procedures, and migration approach for the enterprise investment platform. PostgreSQL is the sole relational database; Redis handles caching and ephemeral data. See [SYSTEM_ARCHITECTURE](./SYSTEM_ARCHITECTURE.md) for how the database fits into the overall system, and [SECURITY_REQUIREMENTS](./SECURITY_REQUIREMENTS.md) for data encryption and access control policies.

---

## 1. Database Strategy

### 1.1 PostgreSQL as Primary RDBMS

PostgreSQL 16+ serves as the platform's primary and only relational database management system. Every piece of persistent application data — user accounts, financial records, referral structures, audit trails, and configuration — resides in PostgreSQL. Redis handles only ephemeral data (sessions, rate limits, cached exchange rates, job queues) and is never a source of truth for financial or user data.

### 1.2 Rationale

PostgreSQL is selected over alternatives (MySQL, MariaDB, SQL Server, Oracle) for the following reasons:

**ACID Compliance:** Financial data integrity is non-negotiable. PostgreSQL's strict ACID implementation ensures that a deposit crediting operation either fully completes (wallet balance updated, transaction record created, audit log written) or fully rolls back with zero possibility of partial writes. This is critical for operations like investment maturity processing, where a failure to credit a return would result in direct monetary loss to the user.

**JSON/JSONB Support:** Several entities (Transactions, AuditLogs, SupportTickets messages) carry metadata that varies by type. PostgreSQL's JSONB type allows flexible metadata storage with indexing, querying, and constraint validation — providing the flexibility of a document store within a relational context. This avoids the need for a separate MongoDB instance or an excessive number of metadata columns.

**Full-Text Search:** Support ticket search and notification search require text matching capabilities. PostgreSQL's built-in full-text search with `tsvector` and `tsquery` types, combined with GIN indexes, provides adequate search performance for Phase 1 without introducing Elasticsearch as an additional infrastructure component.

**Mature Ecosystem and Prisma Support:** Prisma ORM has first-class PostgreSQL support with features like generated types, migration management, and interactive transactions. The combination of Prisma's type-safe queries and PostgreSQL's reliability provides the strongest developer experience and the safest data access pattern for this stack.

---

## 2. Schema Design Principles

### 2.1 Normalization Level

The database schema adheres to Third Normal Form (3NF) as the baseline. Every non-key attribute depends on the primary key, the whole key, and nothing but the key. This normalization level eliminates data redundancy (a user's email is stored in exactly one place) and update anomalies (changing a plan's return rate requires updating exactly one row).

Controlled denormalization is applied only where query performance justifies it. Specifically, the `balance`, `availableBalance`, and `lockedBalance` fields on the `Wallets` entity are denormalized summaries of the underlying transaction history. These are maintained through application-level transactional logic (every financial operation updates both the wallet balances and creates a transaction record within a single database transaction). This trade-off is accepted because calculating balances from transaction history on every API request would be prohibitively expensive at scale.

### 2.2 Soft Deletes

No entity uses hard deletes (actual `DELETE` SQL statements) in the application code. Instead, all entities include a `deletedAt` nullable timestamp column. When a record is logically deleted, `deletedAt` is set to the current timestamp. All queries include a `WHERE deletedAt IS NULL` condition (enforced through Prisma middleware) to exclude soft-deleted records from normal queries.

This approach is mandatory for financial records (transactions, investments, deposits, withdrawals, wallets) where deletion would destroy the audit trail. It is also applied to users and other entities to support potential data recovery and administrative review. Hard deletes are only executed through explicit, admin-only database operations (e.g., GDPR right-to-erasure compliance) and only after a mandatory holding period.

### 2.3 UUID Primary Keys

All entities use UUID v4 as their primary key (`id` column). UUIDs are generated application-side (not database-side) using the `crypto.randomUUID()` function available in Node.js 19+. This approach offers several advantages over auto-incrementing integers:

- **Globally Unique Across Environments:** A record created in the development database will never collide with a record created in production, simplifying data migration and debugging.
- **No Information Leakage:** Sequential integer IDs expose the total count and creation rate of records (e.g., a user seeing investment ID 42 knows only 42 investments exist). UUIDs prevent this enumeration.
- **Distributed Generation:** If the architecture evolves to multiple application instances, no coordination is needed to generate unique IDs.

### 2.4 Timestamps

Every entity includes `createdAt` (non-nullable `DateTime`, defaulting to `now()`) and `updatedAt` (non-nullable `DateTime`, defaulting to `now()`, auto-updated on every save). These timestamps serve audit, debugging, and analytics purposes. The `updatedAt` field is maintained through Prisma's built-in `@updatedAt` directive, ensuring it is never missed.

### 2.5 Single-Tenant Isolation

Phase 1 is a single-tenant application: one platform instance serves all users. There is no concept of "organizations" or "tenants" within the database schema. Row-level security or tenant ID columns are not implemented. If multi-tenancy is introduced in a future phase, a `tenantId` column can be added to all user-facing tables along with row-level security policies.

---

## 3. Core Entities

### 3.1 Users

The `Users` entity is the central entity of the platform. It stores all identity, authentication, and preference data for every registered user. Each user has exactly two associated wallets (one demo, one live) created at registration time.

**Key Attributes:** `id` (UUID PK), `email` (unique, case-insensitive index), `passwordHash` (argon2id hash), `firstName`, `lastName`, `phone` (optional, with country code), `country` (ISO 3166-1 alpha-2 code), `currency` (user's preferred display currency, default USD), `kycLevel` (integer 0–3, where 0 = unverified, 1 = basic verified, 2 = address verified, 3 = full KYC), `referralCode` (unique, auto-generated 8-character alphanumeric code), `referredBy` (foreign key to the referring user's ID, nullable), `mode` (current active mode: `demo` or `live`, default `demo`), `status` (enum: `pending_verification`, `active`, `suspended`, `banned`, `closed`), `twoFactorEnabled` (boolean, default false), `twoFactorSecret` (encrypted TOTP secret, nullable), `lastLoginAt`, `lastLoginIp`, `createdAt`, `updatedAt`, `deletedAt`.

**Purpose:** This entity is the root of all user relationships. Every financial record, notification, audit log, support ticket, and KYC document links back to a specific user. The `mode` attribute determines which wallet is used for financial operations, and the `kycLevel` attribute controls which features are available (e.g., live deposits may require KYC Level 1+).

### 3.2 Wallets

The `Wallets` entity stores the current balance state for each user in each mode. Every user has exactly two wallets: one for demo mode and one for live mode, distinguished by the `type` field.

**Key Attributes:** `id` (UUID PK), `userId` (foreign key to Users), `type` (enum: `demo`, `live`), `balance` (decimal, total balance including locked funds), `availableBalance` (decimal, balance available for new operations), `lockedBalance` (decimal, funds locked in active investments), `currency` (always `USD` for internal accounting, regardless of user's display currency preference), `createdAt`, `updatedAt`, `deletedAt`.

**Purpose:** The wallet is the financial container for each user's funds. The separation of `balance`, `availableBalance`, and `lockedBalance` ensures that funds committed to active investments cannot be withdrawn or reinvested. When an investment matures, the locked amount is released back to `availableBalance`, and the return is added to `availableBalance`. The invariant `balance = availableBalance + lockedBalance` must always hold true and is enforced application-side.

### 3.3 Transactions

The `Transactions` entity is the immutable financial ledger. Every financial event (deposit, withdrawal, investment, return, referral bonus, fee) creates a transaction record. This entity is append-only: once created, a transaction record is never modified (only soft-deleted in extreme administrative cases).

**Key Attributes:** `id` (UUID PK), `walletId` (foreign key to Wallets), `type` (enum: `deposit`, `withdrawal`, `investment`, `investment_return`, `referral_bonus`, `binary_bonus`, `fee`), `amount` (decimal, always positive), `status` (enum: `pending`, `completed`, `failed`, `reversed`), `description` (human-readable description), `referenceId` (foreign key to the source entity: Deposits, Withdrawals, Investments, or ReferralCommissions), `referenceType` (string indicating the source entity type), `metadata` (JSONB, extensible data such as exchange rate at time of transaction, cryptocurrency amount, etc.), `createdAt`, `deletedAt`.

**Purpose:** The transaction ledger provides a complete, auditable history of every financial movement for every user. It supports the transaction history view in the user dashboard, the financial reports in the admin dashboard, and dispute resolution. The `metadata` field captures context that varies by transaction type without requiring separate columns.

### 3.4 Investments

The `Investments` entity records each user's active and completed investment in a specific plan.

**Key Attributes:** `id` (UUID PK), `userId` (foreign key to Users), `planId` (foreign key to InvestmentPlans), `walletId` (foreign key to Wallets, the wallet that funded the investment), `amount` (decimal, the principal invested), `expectedReturn` (decimal, calculated as amount × return rate), `actualReturn` (decimal, the return amount actually credited — may differ from expected in edge cases), `startDate` (DateTime, when the investment was activated), `endDate` (DateTime, when the investment matures — calculated from startDate + duration), `status` (enum: `active`, `completed`, `failed`, `cancelled`), `createdAt`, `updatedAt`, `deletedAt`.

**Purpose:** This entity tracks the lifecycle of each investment from activation to maturity. The maturity processor queries for investments with `status = 'active'` and `endDate <= now()` to find investments ready for completion. The `actualReturn` field captures the precise amount credited, which should equal `expectedReturn` in normal operation but provides flexibility for manual adjustments in exceptional cases.

### 3.5 InvestmentPlans

The `InvestmentPlans` entity defines the available investment plans that users can select.

**Key Attributes:** `id` (UUID PK), `name` (string, e.g., "Basic", "Silver", "Gold", "Platinum"), `slug` (unique URL-safe identifier), `minAmount` (decimal, minimum investment amount), `maxAmount` (decimal, maximum investment amount), `duration` (integer, the plan duration value), `durationUnit` (enum: `hours`, `days`), `returnRate` (decimal, the return percentage, e.g., 0.5 for 0.5%), `features` (JSONB array of feature descriptions for marketing display), ` sortOrder` (integer for display ordering), `isActive` (boolean, whether the plan is currently available for new investments), `createdAt`, `updatedAt`.

**Purpose:** This is a configuration entity that defines the four investment tiers. The `returnRate` is interpreted as a total return over the plan's duration (not a daily rate), though the platform markets it as an average daily rate. The `isActive` flag allows admins to disable a plan for new investments without affecting existing active investments.

### 3.6 Deposits

The `Deposits` entity tracks all deposit attempts, regardless of payment method.

**Key Attributes:** `id` (UUID PK), `userId` (foreign key to Users), `walletId` (foreign key to Wallets), `method` (enum: `crypto`, `gift_card`), `amount` (decimal, the deposited amount in USD), `currency` (the original currency before conversion, e.g., BTC, ETH, USDT, USD for gift cards), `cryptoAddress` (the deposit address provided to the user, for crypto deposits), `cryptoTxHash` (the blockchain transaction hash, for crypto deposits), `cryptoAmount` (the actual cryptocurrency amount received, for crypto deposits), `cryptoConfirmations` (integer, number of blockchain confirmations), `giftCardScreenshot` (Cloudinary URL, for gift card deposits), `status` (enum: `pending`, `pending_verification`, `confirmed`, `rejected`, `expired`), `verifiedBy` (foreign key to admin user, nullable), `verifiedAt` (DateTime, nullable), `rejectionReason` (text, nullable), `metadata` (JSONB), `createdAt`, `updatedAt`, `deletedAt`.

**Purpose:** The deposit entity captures the full lifecycle of a deposit from initiation through verification to confirmation. For crypto deposits, it stores the blockchain transaction details needed for reconciliation. For gift card deposits, it links to the verification workflow. The `status` field drives the deposit list UI in both user and admin dashboards.

### 3.7 Withdrawals

The `Withdrawals` entity tracks all withdrawal requests.

**Key Attributes:** `id` (UUID PK), `userId` (foreign key to Users), `walletId` (foreign key to Wallets), `amount` (decimal, the gross withdrawal amount requested), `feeAmount` (decimal, calculated as amount × 21%), `netAmount` (decimal, the amount actually sent to the user), `status` (enum: `pending`, `processing`, `completed`, `rejected`, `failed`), `destinationType` (enum: `crypto`, `bank`), `destinationAddress` (crypto wallet address or bank account details), `processedBy` (foreign key to admin user, nullable), `processedAt` (DateTime, nullable), `rejectionReason` (text, nullable), `metadata` (JSONB), `createdAt`, `updatedAt`, `deletedAt`.

**Purpose:** The withdrawal entity manages the withdrawal request lifecycle. The 21% fee is calculated and stored at the time of request creation to maintain a fixed record even if the fee percentage changes later. The `destinationAddress` stores the user's withdrawal destination, which is validated at creation time and used by the admin during processing.

### 3.8 Referrals

The `Referrals` entity records the direct referral relationship between users.

**Key Attributes:** `id` (UUID PK), `referrerId` (foreign key to Users, the person who referred), `referredId` (foreign key to Users, the person who was referred), `code` (the referral code used, denormalized from the referrer's `referralCode` for query convenience), `level` (integer, 1 for direct referral, higher for multi-level if implemented), `isActive` (boolean, whether the referral relationship is active), `createdAt`.

**Purpose:** This entity enables the referral commission system. When a qualifying event occurs (deposit, investment) for the referred user, the system queries this entity to find the referrer and calculate the 10% commission. The `isActive` flag allows referral relationships to be deactivated (e.g., if the referred account is flagged for fraud).

### 3.9 BinaryNodes

The `BinaryNodes` entity implements the binary tree structure for the referral bonus system.

**Key Attributes:** `id` (UUID PK), `userId` (foreign key to Users, the node's owner), `leftChildId` (foreign key to Users, nullable), `rightChildId` (foreign key to Users, nullable), `parentId` (foreign key to Users, nullable, the parent in the binary tree), `position` (enum: `left`, `right`, indicating which side of the parent this node occupies), `volumeLeft` (decimal, cumulative volume of the left subtree), `volumeRight` (decimal, cumulative volume of the right subtree), `createdAt`, `updatedAt`.

**Purpose:** The binary tree structure is the foundation of the binary bonus compensation plan. Each user occupies one node in the tree. New referrals are placed alternately on the left and right sides (or according to the sponsor's placement preference). The `volumeLeft` and `volumeRight` fields are denormalized summaries of the investment volume in each subtree, used by the weekly binary bonus calculation job. These volumes are updated incrementally when new investments are made.

### 3.10 ReferralCommissions

The `ReferralCommissions` entity records every commission payment resulting from the referral program.

**Key Attributes:** `id` (UUID PK), `userId` (foreign key to Users, the commission recipient), `sourceUserId` (foreign key to Users, the user whose activity generated the commission), `amount` (decimal, the commission amount in USD), `type` (enum: `direct`, `binary`), `weekNumber` (integer, the ISO week number, relevant for binary bonuses which are calculated weekly), `status` (enum: `pending`, `paid`, `reversed`), `createdAt`.

**Purpose:** This entity provides a complete record of all referral earnings for each user, supporting the referral earnings view in the user dashboard and the referral reports in the admin dashboard. The `sourceUserId` link enables tracing each commission back to the activity that generated it. The `weekNumber` field supports the weekly binary bonus calculation and reporting.

### 3.11 KYCDocuments

The `KYCDocuments` entity stores metadata and review status for user KYC submissions.

**Key Attributes:** `id` (UUID PK), `userId` (foreign key to Users), `type` (enum: `id_document`, `selfie`, `proof_of_address`), `fileUrl` (Cloudinary URL for the uploaded document), `fileName` (original file name), `fileSize` (integer, bytes), `mimeType` (the file's MIME type), `status` (enum: `pending`, `approved`, `rejected`, `expired`), `reviewedBy` (foreign key to admin user, nullable), `reviewedAt` (DateTime, nullable), `rejectionReason` (text, nullable), `metadata` (JSONB, extracted data such as document type detected, name on document, etc.), `createdAt`, `updatedAt`, `deletedAt`.

**Purpose:** KYC documents support the tiered KYC system. Level 1 requires an ID document and selfie. Level 2 additionally requires proof of address. The review workflow (pending → approved/rejected) is managed by admin users. The `fileUrl` points to a Cloudinary restricted-access image that can only be accessed through signed, time-limited URLs generated by the backend.

### 3.12 Notifications

The `Notifications` entity stores in-app notifications for users.

**Key Attributes:** `id` (UUID PK), `userId` (foreign key to Users), `type` (string category, e.g., `deposit_confirmed`, `withdrawal_processed`, `investment_completed`, `referral_earned`, `system`), `title` (short notification title), `message` (full notification message), `actionUrl` (optional internal link the user can click to navigate to the relevant page), `isRead` (boolean, default false), `createdAt`.

**Purpose:** In-app notifications provide real-time feedback to users about their account activity. They supplement email notifications for users who prefer to check the platform directly. The `isRead` flag supports the unread notification badge and mark-as-read functionality. Notifications are created by background jobs triggered by financial events.

### 3.13 AuditLogs

The `AuditLogs` entity provides an immutable record of all significant system events.

**Key Attributes:** `id` (UUID PK), `userId` (foreign key to Users, nullable — some system events have no user context), `action` (string, e.g., `user.login`, `deposit.create`, `withdrawal.approve`, `admin.user.suspend`), `entity` (string, the entity type affected, e.g., `User`, `Withdrawal`), `entityId` (UUID, the ID of the affected entity), `ipAddress` (the requester's IP address), `userAgent` (the requester's browser user-agent string), `metadata` (JSONB, details of the event such as old values, new values, request parameters), `createdAt`.

**Purpose:** Audit logs are the platform's accountability mechanism. They support compliance requirements, dispute resolution, security investigation, and operational monitoring. Audit logs are append-only and never modified or deleted through the application. The `metadata` field captures the specific details of each event, enabling reconstruction of what happened, when, by whom, and from where.

### 3.14 SupportTickets

The `SupportTickets` entity manages user support requests.

**Key Attributes:** `id` (UUID PK), `userId` (foreign key to Users), `subject` (string, the ticket subject/title), `status` (enum: `open`, `in_progress`, `waiting_user`, `resolved`, `closed`), `priority` (enum: `low`, `medium`, `high`, `urgent`), `assignedTo` (foreign key to admin user, nullable), `messages` (JSONB array of message objects, each containing `senderId`, `senderRole`, `content`, `createdAt`, and optional `attachments`), `lastMessageAt` (DateTime, for sorting by most recent activity), `createdAt`, `updatedAt`, `deletedAt`.

**Purpose:** Support tickets enable communication between users and the support team. The `messages` JSONB array stores the full conversation thread within a single ticket row, avoiding a separate messages table and simplifying queries (fetching a ticket always includes all its messages). This design is appropriate for Phase 1 where ticket message volumes per ticket are expected to be manageable (tens to low hundreds of messages).

### 3.15 GiftCardDeposits

The `GiftCardDeposits` entity stores specific details for gift card deposit submissions.

**Key Attributes:** `id` (UUID PK), `depositId` (foreign key to Deposits, one-to-one relationship), `cardBrand` (string, e.g., "Amazon", "Apple", "Google Play", "Visa", "Mastercard"), `cardValue` (decimal, the face value of the gift card), `cardCurrency` (string, the currency of the gift card's face value), `screenshotUrl` (Cloudinary URL, the uploaded screenshot of the gift card), `uploadedAt` (DateTime), `verifiedAt` (DateTime, nullable), `verifiedBy` (foreign key to admin user, nullable), `status` (enum: `pending`, `verified`, `rejected`, `expired`), `rejectionReason` (text, nullable), `createdAt`, `updatedAt`.

**Purpose:** This entity extends the base `Deposits` entity with gift card-specific fields. Separating gift card details into their own entity keeps the `Deposits` table cleaner (no nullable gift-card columns for crypto deposits) and allows the admin gift card verification UI to query only gift card records. The `screenshotUrl` points to a Cloudinary image that admins review to verify the gift card's validity and value.

### 3.16 OTPs

The `OTPs` entity stores one-time password records for email verification and password reset.

**Key Attributes:** `id` (UUID PK), `identifier` (string, the email address or user ID the OTP was sent to), `type` (enum: `email_verification`, `password_reset`, `two_factor_setup`), `codeHash` (string, the argon2id hash of the 6-digit OTP code), `expiresAt` (DateTime, when the OTP becomes invalid), `verified` (boolean, whether the OTP has been successfully verified), `attempts` (integer, number of verification attempts made, to enforce the maximum attempts limit), `createdAt`.

**Purpose:** OTP records enable the platform to verify email ownership and process password resets without persistent password reset tokens. The code itself is never stored in plaintext — only its hash is stored. The `expiresAt` and `attempts` fields enforce the security policy of OTP expiry and maximum attempts. Expired and fully consumed OTPs are periodically purged by a cleanup job.

---

## 4. Relationships

### 4.1 User-Centric Relationships

- **Users → Wallets (One-to-Many):** Each user has exactly two wallets (one demo, one live). This is enforced at the application level during registration. The relationship is defined by `Wallets.userId` referencing `Users.id`.
- **Users → Investments (One-to-Many):** A user can have multiple investments across different plans, including multiple active investments simultaneously. Defined by `Investments.userId` referencing `Users.id`.
- **Users → Transactions (One-to-Many via Wallets):** A user's transactions are accessed through their wallets. Each wallet has many transactions. This is a transitive relationship: `Users → Wallets → Transactions`.
- **Users → Deposits (One-to-Many):** A user can have many deposits across different methods and statuses. Defined by `Deposits.userId` referencing `Users.id`.
- **Users → Withdrawals (One-to-Many):** A user can have many withdrawal requests. Defined by `Withdrawals.userId` referencing `Users.id`.
- **Users → KYCDocuments (One-to-Many):** A user can submit multiple KYC documents (ID document, selfie, proof of address, and resubmissions after rejection). Defined by `KYCDocuments.userId` referencing `Users.id`.
- **Users → Notifications (One-to-Many):** A user receives many notifications over their lifetime. Defined by `Notifications.userId` referencing `Users.id`.
- **Users → AuditLogs (One-to-Many):** A user generates many audit log entries through their actions. Defined by `AuditLogs.userId` referencing `Users.id` (nullable for system-initiated events).
- **Users → SupportTickets (One-to-Many):** A user can open multiple support tickets. Defined by `SupportTickets.userId` referencing `Users.id`.
- **Users → Referrals (One-to-Many as Referrer):** A user can refer many other users. Defined by `Referrals.referrerId` referencing `Users.id`.
- **Users → Referrals (One-to-Many as Referred):** A user can be referred by at most one other user. Defined by `Referrals.referredId` referencing `Users.id` with a unique constraint.
- **Users → ReferralCommissions (One-to-Many):** A user can earn many commissions from their referral network. Defined by `ReferralCommissions.userId` referencing `Users.id`.

### 4.2 Referral and Binary Tree Relationships

- **Users → BinaryNodes (One-to-One):** Each user has exactly one binary node in the referral tree. Defined by `BinaryNodes.userId` referencing `Users.id` with a unique constraint.
- **BinaryNodes → BinaryNodes (Self-referencing, One-to-Many):** A binary node can have at most two children (left and right) and exactly one parent. Defined by `BinaryNodes.parentId` referencing `BinaryNodes.userId` (self-referencing). This recursive relationship forms the binary tree structure.
- **Referrals → Users (Many-to-One):** Each referral relationship links a referrer and a referred user.

### 4.3 Financial Entity Relationships

- **Wallets → Transactions (One-to-Many):** Each wallet has many transaction records. Defined by `Transactions.walletId` referencing `Wallets.id`.
- **InvestmentPlans → Investments (One-to-Many):** Each plan can have many user investments. Defined by `Investments.planId` referencing `InvestmentPlans.id`.
- **Deposits → GiftCardDeposits (One-to-One):** Each gift card deposit has exactly one associated detail record. Defined by `GiftCardDeposits.depositId` referencing `Deposits.id` with a unique constraint.
- **Withdrawals → Users (Many-to-One, processedBy):** Each withdrawal may be processed by an admin user. Defined by `Withdrawals.processedBy` referencing `Users.id` (the admin user).
- **KYCDocuments → Users (Many-to-One, reviewedBy):** Each KYC document may be reviewed by an admin user. Defined by `KYCDocuments.reviewedBy` referencing `Users.id` (the admin user).

---

## 5. Indexing Strategy

Indexes are designed to optimize the most frequent and performance-critical query patterns. Every foreign key column has an index by default (Prisma creates these automatically). The following additional indexes are specified for query optimization:

### 5.1 User and Authentication Indexes

- `Users.email` — Unique B-tree index. Used for every login, registration, and password reset operation. Case-insensitive comparison is handled via a functional index or application-level lowercasing.
- `Users.referralCode` — Unique B-tree index. Used when looking up the referrer during registration.
- `Users.status` — B-tree index. Used by admin queries to filter users by status (active, suspended, banned).
- `Users.kycLevel` — B-tree index. Used by admin queries and internal checks for KYC-gated features.
- `Users.deletedAt` — Partial index where `deletedAt IS NOT NULL`. Supports efficient soft-delete queries.

### 5.2 Financial Indexes

- `Wallets.userId` + `Wallets.type` — Composite unique index. Enforces the one-wallet-per-type-per-user constraint and optimizes wallet lookups.
- `Transactions.walletId` + `Transactions.createdAt` — Composite B-tree index. Optimizes the most common query: fetching a wallet's transaction history sorted by date.
- `Transactions.type` — B-tree index. Used for admin reports filtering by transaction type.
- `Transactions.status` — B-tree index. Used for admin queries filtering pending or failed transactions.
- `Investments.userId` + `Investments.status` — Composite B-tree index. Optimizes the query for finding a user's active investments.
- `Investments.status` + `Investments.endDate` — Composite B-tree index. This is the critical index for the maturity processor, which queries for active investments with an end date in the past. The processor runs every minute, so this query must be fast.
- `Deposits.userId` + `Deposits.status` — Composite B-tree index. Optimizes user dashboard queries for pending deposits.
- `Deposits.status` — B-tree index. Used by admin queries to find deposits requiring verification or processing.
- `Withdrawals.userId` + `Withdrawals.status` — Composite B-tree index. Optimizes user dashboard queries for pending withdrawals.
- `Withdrawals.status` — B-tree index. Used by admin queries to find withdrawals requiring processing.

### 5.3 Referral Indexes

- `Referrals.referrerId` — B-tree index. Used when calculating a user's total referral count and commission eligibility.
- `Referrals.referredId` — Unique B-tree index. Enforces that each user can only be referred by one person.
- `ReferralCommissions.userId` + `ReferralCommissions.weekNumber` — Composite B-tree index. Optimizes the weekly binary bonus calculation and the user's referral earnings report.
- `BinaryNodes.userId` — Unique B-tree index. Enforces one node per user.
- `BinaryNodes.parentId` — B-tree index. Optimizes tree traversal queries.

### 5.4 Operational Indexes

- `Notifications.userId` + `Notifications.isRead` + `Notifications.createdAt` — Composite B-tree index. Optimizes the query for fetching a user's unread notifications ordered by date.
- `AuditLogs.userId` + `AuditLogs.createdAt` — Composite B-tree index. Optimizes the query for fetching a user's audit history.
- `AuditLogs.action` + `AuditLogs.createdAt` — Composite B-tree index. Optimizes admin queries filtering audit logs by action type.
- `AuditLogs.entity` + `AuditLogs.entityId` — Composite B-tree index. Optimizes queries looking up the audit history of a specific entity.
- `SupportTickets.userId` + `SupportTickets.status` — Composite B-tree index. Optimizes user and admin queries for active tickets.
- `SupportTickets.assignedTo` + `SupportTickets.status` — Composite B-tree index. Optimizes admin queries for tickets assigned to a specific admin.
- `OTPs.identifier` + `OTPs.type` + `OTPs.verified` — Composite B-tree index. Optimizes the OTP lookup during verification.
- `KYCDocuments.userId` + `KYCDocuments.type` + `KYCDocuments.status` — Composite B-tree index. Optimizes queries checking a user's KYC submission status.

---

## 6. Data Retention

### 6.1 Retention Periods by Data Category

| Data Category | Retention Period | Rationale |
|---------------|-----------------|-----------|
| User account data | Account lifetime + 5 years post-closure | Financial regulations require retaining customer data beyond the account relationship. |
| Financial transactions | 7 years minimum | Aligns with financial record-keeping regulations in most jurisdictions. |
| Investments | 7 years minimum | Same as financial transactions. |
| Deposits and Withdrawals | 7 years minimum | Same as financial transactions. |
| Referral records | Account lifetime | Referral relationships are active as long as both accounts exist. |
| KYC documents (metadata) | Account lifetime + 5 years | KYC records must be retained for regulatory compliance. |
| KYC documents (files in Cloudinary) | Account lifetime + 1 year | Image files are purged from Cloudinary after the retention period; metadata remains. |
| Audit logs | 2 years | Sufficient for security investigation and compliance audits. |
| Notifications | 1 year | In-app notifications older than 1 year are purged. Users have already been informed via email. |
| Support tickets (resolved/closed) | 3 years | Retained for service quality analysis and dispute reference. |
| OTP records | 24 hours | OTPs expire within minutes; records are purged daily. No long-term retention value. |
| Soft-deleted records | 90 days | Provides a recovery window before permanent deletion. |

### 6.2 GDPR Right-to-Erasure

The platform must support GDPR Article 17 (Right to Erasure) for EU users. The erasure process is not an immediate hard delete — it follows a structured workflow:

1. User requests account deletion through the platform or via a formal GDPR request to the support team.
2. The account is immediately suspended (status set to `closed`), preventing any financial activity.
3. All active investments are settled (matured early if necessary, with return calculations based on time elapsed).
4. All wallet balances are withdrawn to the user's provided external address.
5. After a 30-day holding period (to allow for any pending transactions or disputes), the user's PII (email, name, phone, address) is anonymized (replaced with hashed placeholders).
6. KYC document files are deleted from Cloudinary. KYC document metadata is anonymized.
7. The anonymized account record, financial transaction records, and audit logs are retained for the regulatory period.
8. Referral relationships are preserved but the referred user's identity is anonymized.

This approach balances the user's right to erasure with the platform's regulatory obligation to maintain financial records. See [SECURITY_REQUIREMENTS](./SECURITY_REQUIREMENTS.md) for related data protection measures.

---

## 7. Backup Strategy

### 7.1 Backup Method

PostgreSQL backups use `pg_dump` for logical backups and continuous WAL archiving for point-in-time recovery (PITR). The backup strategy has two components:

**Daily Full Backups:** A cron job runs `pg_dump` with the custom format (`-Fc`) every day at 02:00 UTC. The dump is compressed (gzip) and uploaded to a configured remote storage location (S3-compatible object storage or a separate backup server). The backup includes all tables, indexes, sequences, and ownership information. The backup job is configured as a BullMQ recurring job or a system cron on the database server container.

**Continuous WAL Archiving:** PostgreSQL's `archive_mode` is set to `on`, and `archive_command` is configured to ship WAL segment files to the same remote storage location. This enables point-in-time recovery to any specific moment, not just the last daily backup. WAL archiving captures every transaction committed between full backups.

### 7.2 Backup Retention

| Backup Type | Retention | Total Storage Estimate (at scale) |
|-------------|-----------|----------------------------------|
| Daily full backups | 30 days | ~30 × backup size |
| WAL archives | 7 days | ~7 × daily WAL volume |
| Monthly archival backup | 12 months | ~12 × backup size (stored separately) |

After 30 days, daily backups are deleted automatically. Monthly archival backups (taken on the 1st of each month) are retained for 12 months and then reviewed for longer-term archival or deletion based on regulatory requirements.

### 7.3 Recovery Procedures

**Full Recovery:** Restore the most recent daily backup using `pg_restore`, then replay WAL archives to bring the database to the desired point in time using PostgreSQL's `recovery_target_time` or `recovery_target_lsn` configuration.

**Point-in-Time Recovery:** If data corruption or accidental deletion is detected, the database can be restored to any moment within the WAL archive retention window (7 days). This is critical for recovering from accidental admin actions (e.g., an admin accidentally approving a fraudulent withdrawal).

**Recovery Testing:** Backup restoration is tested quarterly in a staging environment to verify that backups are complete and uncorrupted. The test results are documented and reviewed by the technical lead.

### 7.4 Redis Backup

Redis persistence is configured with both RDB snapshots (every 15 minutes if at least 1000 keys changed) and AOF (Append-Only File) with `appendfsync everysec`. Redis data is ephemeral by nature (sessions, cache, job queues), so Redis backup is a lower priority than PostgreSQL backup. If Redis data is lost, sessions expire (users re-authenticate), cache is rebuilt from database queries, and failed jobs are re-queued from the database. Nevertheless, RDB snapshots provide a fast recovery path that avoids the cold-start load on PostgreSQL after a Redis failure.

---

## 8. Migration Strategy

### 8.1 Prisma Migrate

All database schema changes are managed through Prisma Migrate, which generates SQL migration files from changes to the Prisma schema definition. The migration workflow follows these principles:

**Versioned Migrations:** Every schema change produces a numbered migration file (e.g., `20250115143000_add_gift_card_deposits_table/migration.sql`) stored in the `prisma/migrations/` directory. Migration files are committed to version control alongside the application code, ensuring that the schema and application code are always synchronized.

**Reversible Migrations:** Every migration must be reversible. Prisma's `migrate rollback` command applies the down migration. Developers must ensure that `down.sql` files are correct for every migration. Non-reversible operations (e.g., dropping a column with data) require a multi-step migration: first add a new column, migrate data, then drop the old column in a separate migration.

### 8.2 Zero-Downtime Migrations

For production deployments, migrations must not cause downtime. The following rules govern production migration design:

- **Adding Columns:** New nullable columns or columns with default values can be added without downtime.
- **Removing Columns:** Columns must first be removed from all application code (Prisma schema, API responses, queries), deployed, and confirmed to be unused before the column is dropped from the database in a subsequent migration.
- **Adding Indexes:** New indexes are created with `CREATE INDEX CONCURRENTLY`, which does not lock the table during index construction.
- **Data Migrations:** Large data transformations (e.g., backfilling a new column) are implemented as background jobs that process records in batches, not as part of the migration SQL file.
- **Schema Changes and Code Changes:** Schema changes must be backward-compatible with the currently deployed application code. The deployment order is: (1) deploy database migration (adding new column, creating new table), (2) deploy application code that uses the new schema, (3) in a subsequent release, remove the old schema elements.

### 8.3 Migration Workflow in Development

1. Developer modifies the Prisma schema file (`schema.prisma`).
2. Developer runs `pnpm prisma migrate dev --name descriptive_name` to generate and apply the migration.
3. Prisma generates the migration SQL file and updates the database.
4. Prisma also regenerates the Prisma Client types, so TypeScript immediately reflects the schema changes.
5. Developer tests the migration locally.
6. Developer commits both the schema change and the migration file.

### 8.4 Migration Workflow in Production

1. Migrations are applied automatically as part of the Coolify deployment process. The Dockerfile includes a `prisma migrate deploy` command that runs before the application starts.
2. If a migration fails, the deployment stops and the previous container version continues running. The failed migration must be investigated and resolved before retrying.
3. For complex migrations requiring manual intervention (e.g., data backfills), the migration is split into multiple deployment steps with explicit coordination.
4. All production migrations are tested against a staging database that mirrors the production schema and data volume before being applied to production.