# Data Flow Architecture

**Project:** TeslaPrimeCapital — Enterprise Investment Platform
**Phase:** 2 — Technical Architecture
**Last Updated:** 2025
**Status:** Draft

---

## Table of Contents

1. [Data Flow Overview](#1-data-flow-overview)
2. [User Registration Flow](#2-user-registration-flow)
3. [Deposit Flow — Cryptocurrency](#3-deposit-flow--cryptocurrency)
4. [Deposit Flow — Gift Card](#4-deposit-flow--gift-card)
5. [Investment Flow](#5-investment-flow)
6. [Withdrawal Flow](#6-withdrawal-flow)
7. [Referral Commission Flow](#7-referral-commission-flow)
8. [KYC Verification Flow](#8-kyc-verification-flow)
9. [Plan Maturity Processing Flow](#9-plan-maturity-processing-flow)
10. [Admin Approval Flows](#10-admin-approval-flows)
11. [Notification Flow](#11-notification-flow)
12. [Data Entity Relationship Overview](#12-data-entity-relationship-overview)
13. [Demo Mode Data Flow](#13-demo-mode-data-flow)

---

## 1. Data Flow Overview

The TeslaPrimeCapital platform manages the complete lifecycle of user funds through a series of interconnected data flows. Every monetary movement — from initial deposit through investment, maturity, and withdrawal — follows a strictly defined path with validation checkpoints, status transitions, and audit logging at each stage.

### Core Data Flow Principles

- **Unidirectional Trust Boundaries:** Data flows inward from external systems (blockchain, gift card submissions) through validation layers before entering the core financial engine. Outbound flows (withdrawals, notifications) pass through approval gates before leaving the system.
- **Mode Isolation:** Demo and Live mode data are separated at the database level using a `mode` flag on every financial record. Queries and aggregations are scoped by mode to prevent cross-contamination.
- **Idempotent Processing:** All background jobs and webhook handlers are designed to be idempotent. A `processed` flag on investment records, a `locked_version` on wallet operations, and unique constraints on deposit references prevent duplicate processing.
- **Audit Trail Immutability:** Every state transition on financial records (deposits, investments, withdrawals, commissions) creates an immutable audit log entry with the actor, timestamp, previous state, new state, and contextual metadata.

### Primary Data Flow Categories

| Category | Description | Primary Entities |
|----------|-------------|-----------------|
| Onboarding | User registration, email verification, referral capture | User, Wallet, ReferralTree, VerificationToken |
| Deposits | Crypto and gift card funding of wallets | Deposit, Wallet, Transaction, AdminAction |
| Investments | Plan selection, funding, maturity processing | Investment, InvestmentPlan, Wallet, Transaction |
| Withdrawals | Fee calculation, approval, payout processing | Withdrawal, Wallet, Transaction, AdminAction |
| Referrals | Direct commissions, binary bonus calculations | ReferralTree, Commission, Wallet, Transaction |
| Compliance | KYC document submission and review | KYCSubmission, KYCDocument, User, AdminAction |
| Notifications | In-app and email event-driven alerts | Notification, EmailQueue, NotificationPreference |

### Actor Definitions

All sequence diagrams in this document use the following actors:

| Actor | Role |
|-------|------|
| **User** | End user interacting through a web browser or mobile device |
| **Frontend** | Next.js client application (React) rendering the UI and making API calls |
| **API** | RESTful API layer (`/api/v1/`) handling request validation, authentication, and routing |
| **Service** | Business logic layer containing domain services (DepositService, InvestmentService, WalletService, etc.) |
| **Database** | Persistent data store (PostgreSQL) and caching layer (Redis) |
| **External** | Third-party systems: blockchain nodes, price oracle, Cloudinary, Resend email, crypto wallets |

---

## 2. User Registration Flow

The registration flow captures the user's identity, establishes their account infrastructure (dual wallets, referral network position), and initiates email verification. It is the entry point for all subsequent data flows in the platform.

### Sequence Diagram

```mermaid
sequenceDiagram
    actor User
    participant FE as Frontend
    participant API as API Layer
    participant AuthSvc as AuthService
    participant UserSvc as UserService
    participant WalletSvc as WalletService
    participant RefSvc as ReferralService
    participant DB as Database
    participant Ext as External (Resend)

    User->>FE: Fills registration form (email, password, optional referral code)
    FE->>FE: Client-side validation (email format, password strength, matching passwords)
    FE->>API: POST /api/v1/auth/register { email, password, referralCode? }
    API->>API: Rate limit check (IP-based)
    API->>AuthSvc: validateRegistrationInput(payload)
    AuthSvc->>DB: Check email uniqueness
    DB-->>AuthSvc: Email exists? result
    AuthSvc-->>API: Validation result (pass/fail + errors)
    alt Validation fails
        API-->>FE: 400/409 { success: false, errors: [...] }
        FE-->>User: Display validation errors
    end
    API->>AuthSvc: createUser(email, passwordHash, referralCode?)
    AuthSvc->>DB: INSERT User (status: pending_verification, kycLevel: 0)
    DB-->>AuthSvc: User record created (userId)
    AuthSvc->>WalletSvc: initializeWallets(userId)
    WalletSvc->>DB: INSERT Wallet (userId, mode: demo, balance: 0, available: 0)
    WalletSvc->>DB: INSERT Wallet (userId, mode: live, balance: 0, available: 0)
    DB-->>WalletSvc: Wallets created
    WalletSvc->>DB: UPDATE Wallet SET balance = {config.demoStartingBalance}, available = {config.demoStartingBalance} WHERE userId AND mode = demo
    DB-->>WalletSvc: Demo wallet funded
    WalletSvc-->>AuthSvc: Wallets initialized
    AuthSvc->>RefSvc: processReferralOnRegistration(userId, referralCode?)
    RefSvc->>DB: Validate referralCode (exists, belongs to active user)
    alt Valid referral code provided
        RefSvc->>DB: INSERT ReferralTree (referrerId, referredId, leg: left/right)
        RefSvc->>DB: UPDATE User SET referredBy = referrerId WHERE id = userId
        DB-->>RefSvc: Referral link established
    end
    RefSvc-->>AuthSvc: Referral processing complete
    AuthSvc->>DB: INSERT VerificationToken (userId, type: email_verification, token, expiresAt)
    DB-->>AuthSvc: Token created
    AuthSvc->>Ext: Send verification email (via Resend + React Email template)
    Ext-->>AuthSvc: Email delivered
    AuthSvc-->>API: User created successfully (userId)
    API-->>FE: 201 { success: true, data: { userId, message: "Verification email sent" } }
    FE-->>User: Redirect to "Check your email" page

    Note over User,Ext: --- Email Verification Sub-flow ---

    User->>FE: Clicks verification link from email
    FE->>API: POST /api/v1/auth/verify-email { token }
    API->>AuthSvc: verifyEmailToken(token)
    AuthSvc->>DB: SELECT VerificationToken WHERE token AND type = email_verification AND usedAt IS NULL
    DB-->>AuthSvc: Token record
    AuthSvc->>AuthSvc: Check token expiration
    alt Token expired
        AuthSvc-->>API: Token expired
        API-->>FE: 410 { success: false, message: "Token expired" }
        FE-->>User: Display "Token expired, request new one"
    end
    AuthSvc->>DB: UPDATE User SET status = active, kycLevel = 1, emailVerifiedAt = NOW() WHERE id = userId
    AuthSvc->>DB: UPDATE VerificationToken SET usedAt = NOW() WHERE token
    DB-->>AuthSvc: User activated, KYC Level 1 granted
    AuthSvc-->>API: Email verified successfully
    API-->>FE: 200 { success: true, message: "Email verified" }
    FE-->>User: Redirect to login with success message
```

### Step-by-Step Description

1. **Form Submission:** The user completes the registration form providing their email address, a password meeting complexity requirements (8+ characters, uppercase, lowercase, number), and an optional referral code (which may be pre-populated from a URL query parameter `?ref=CODE`).

2. **Client-Side Validation:** The frontend validates email format, password strength in real-time, and that the password confirmation matches. Invalid fields are highlighted before submission.

3. **Server-Side Validation:** The API layer enforces rate limiting on the registration endpoint (per-IP). The AuthService validates the payload schema using Zod and checks that the email is not already registered in the database.

4. **User Record Creation:** On successful validation, a user record is inserted with `status: pending_verification` and `kycLevel: 0`. The password is hashed with bcrypt before storage.

5. **Wallet Initialization:** Two wallet records are created — one for Demo mode and one for Live mode, both starting at $0. The Demo wallet is immediately credited with the configurable starting balance (default: $10,000).

6. **Referral Processing:** If a valid referral code is provided, the system establishes the referral relationship by inserting a record in the ReferralTree table and updating the new user's `referredBy` field. The new user is placed in the binary tree under the referrer (left or right leg based on the placement strategy).

7. **Verification Email Dispatch:** A unique verification token is generated, stored in the database with a configurable expiration (default: 24 hours), and sent to the user's email via the Resend + React Email pipeline.

8. **Email Verification:** When the user clicks the verification link, the token is validated against the database. If valid and unexpired, the user's status is set to `active` and KYC level is upgraded to Level 1 (email verified), enabling deposits and basic platform features.

---

## 3. Deposit Flow — Cryptocurrency

The cryptocurrency deposit flow handles the receipt of Bitcoin (BTC), Ethereum (ETH), and Tether (USDT) from users. It involves blockchain monitoring, confirmation tracking, USD conversion at market rates, admin approval, and balance crediting. This flow also triggers the referral commission pipeline.

### Sequence Diagram

```mermaid
sequenceDiagram
    actor User
    participant FE as Frontend
    participant API as API Layer
    participant DepSvc as DepositService
    participant WalletSvc as WalletService
    participant CryptoSvc as CryptoService
    participant PriceSvc as PriceService
    participant RefSvc as ReferralService
    participant NotifSvc as NotificationService
    participant DB as Database
    participant ExtBc as External (Blockchain)
    participant ExtPo as External (Price Oracle)
    participant Admin as Admin Dashboard

    User->>FE: Navigates to Deposit page, selects "Cryptocurrency"
    FE->>API: GET /api/v1/deposits/crypto-address?currency=BTC
    API->>DepSvc: getOrCreateDepositAddress(userId, currency)
    DepSvc->>DB: SELECT CryptoAddress WHERE userId AND currency
    alt Address already exists
        DB-->>DepSvc: Existing address record
    else No address exists
        DepSvc->>CryptoSvc: generateAddress(currency)
        CryptoSvc->>ExtBc: Derive address from HD wallet (deterministic)
        ExtBc-->>CryptoSvc: Derived address
        CryptoSvc-->>DepSvc: New address
        DepSvc->>DB: INSERT CryptoAddress (userId, currency, address)
    end
    DepSvc-->>API: Deposit address + QR code data
    API-->>FE: 200 { success: true, data: { address, qrCode, network } }
    FE->>User: Display address, QR code, current exchange rate, confirmation requirements

    Note over User,ExtBc: --- User sends crypto from personal wallet ---

    User->>ExtBc: Sends BTC/ETH/USDT to deposit address

    Note over ExtBc,DB: --- Blockchain Monitoring (Background Job) ---

    loop Every 30-60 seconds
        CryptoSvc->>ExtBc: Poll for incoming transactions to watched addresses
        ExtBc-->>CryptoSvc: New transaction detected (txHash, from, to, amount, confirmations)
        CryptoSvc->>DB: Check if txHash already tracked in Deposit table
        alt Transaction already tracked
            CryptoSvc->>DB: UPDATE Deposit SET confirmations = currentCount WHERE txHash
        else New transaction
            CryptoSvc->>PriceSvc: getCurrentRate(currency)
            PriceSvc->>ExtPo: Fetch BTC/ETH/USDT → USD rate
            ExtPo-->>PriceSvc: Current rate (e.g., BTC: $67,250.00)
            PriceSvc-->>CryptoSvc: Rate object
            CryptoSvc->>DB: INSERT Deposit (userId, type: crypto, currency, txHash, cryptoAmount, usdAmount, confirmations, status: detecting, mode: live)
        end
    end

    Note over CryptoSvc,DB: --- Confirmation Threshold Check ---

    CryptoSvc->>DB: SELECT Deposit WHERE status = detecting AND confirmations >= requiredConfirmations
    alt Confirmations met (BTC: 3, ETH: 12, USDT: 12)
        CryptoSvc->>PriceSvc: getRateAtConfirmation(currency)
        PriceSvc->>ExtPo: Fetch confirmation-time rate
        ExtPo-->>PriceSvc: Rate at confirmation
        CryptoSvc->>DB: UPDATE Deposit SET status = confirmed, usdAmount = cryptoAmount * rate, confirmedAt = NOW()
        CryptoSvc->>NotifSvc: triggerNotification(userId, 'deposit_detected', { amount, currency, confirmations })
    end

    Note over Admin,DB: --- Admin Approval ---

    Admin->>FE: Opens Admin Dashboard → Deposit Queue
    FE->>API: GET /api/v1/admin/deposits?status=confirmed
    API->>DB: SELECT Deposit WHERE status = confirmed AND mode = live
    DB-->>API: List of confirmed deposits
    API-->>FE: Deposits list with user info, amounts, txHash links
    Admin->>FE: Reviews deposit details, clicks "Approve"
    FE->>API: POST /api/v1/admin/deposits/{id}/approve
    API->>DepSvc: approveDeposit(depositId, adminId)
    DepSvc->>DB: SELECT Deposit WHERE id AND status = confirmed
    DepSvc->>DB: BEGIN TRANSACTION
    DepSvc->>DB: UPDATE Deposit SET status = completed, approvedBy = adminId, completedAt = NOW()
    DepSvc->>WalletSvc: creditWallet(userId, usdAmount, mode: live, source: deposit)
    WalletSvc->>DB: UPDATE Wallet SET available = available + usdAmount, balance = balance + usdAmount WHERE userId AND mode = live
    WalletSvc->>DB: INSERT Transaction (userId, type: deposit, amount: usdAmount, mode: live, referenceId: depositId, status: completed)
    DB-->>WalletSvc: Wallet credited, transaction recorded
    WalletSvc-->>DepSvc: Credit successful
    DepSvc->>RefSvc: processDepositCommission(userId, usdAmount)
    RefSvc->>DB: SELECT User.referredBy WHERE id = userId
    alt User has a referrer
        RefSvc->>RefSvc: Calculate 10% commission (usdAmount * 0.10)
        RefSvc->>WalletSvc: creditWallet(referrerId, commissionAmount, mode: live, source: referral_commission)
        WalletSvc->>DB: UPDATE Wallet SET available = available + commissionAmount, balance = balance + commissionAmount WHERE userId = referrerId AND mode = live
        WalletSvc->>DB: INSERT Transaction (userId: referrerId, type: commission, amount: commissionAmount, mode: live, referenceId: depositId, status: completed)
        RefSvc->>DB: INSERT Commission (referrerId, referredId, type: direct_deposit, amount: commissionAmount, sourceDepositId: depositId)
        RefSvc->>DB: UPDATE ReferralTree SET totalDepositVolume = totalDepositVolume + usdAmount WHERE referredId = userId
        RefSvc->>NotifSvc: triggerNotification(referrerId, 'referral_commission', { amount: commissionAmount, source: userName })
    end
    DepSvc->>DB: INSERT AuditLog (action: deposit_approved, actor: adminId, entity: depositId, metadata)
    DepSvc->>DB: COMMIT
    DepSvc-->>API: Deposit approved, wallet credited, commission processed
    API-->>FE: 200 { success: true }
    DepSvc->>NotifSvc: triggerNotification(userId, 'deposit_completed', { amount: usdAmount, currency, txHash })
    NotifSvc->>DB: INSERT Notification (userId, type: deposit, title, message, metadata)
    NotifSvc-->>DepSvc: Notification queued
    FE-->>Admin: Deposit marked as approved, removed from queue
```

### Step-by-Step Description

1. **Address Generation:** When the user requests a crypto deposit, the system checks if they already have a deposit address for the selected cryptocurrency. If not, a new address is derived deterministically from the platform's HD wallet and stored in the database. The address and a QR code are returned to the frontend.

2. **Blockchain Monitoring:** A background job continuously polls the blockchain for incoming transactions to all watched deposit addresses. When a new transaction is detected, a Deposit record is created in `detecting` status with the transaction hash, crypto amount, and current USD conversion rate from the price oracle.

3. **Confirmation Tracking:** The monitoring job updates the confirmation count on each detected deposit. Once the required threshold is met (3 for BTC, 12 for ETH/USDT), the deposit status is updated to `confirmed` and the USD amount is recalculated using the confirmation-time exchange rate.

4. **Admin Approval:** Confirmed deposits appear in the admin dashboard's deposit verification queue. An administrator reviews the deposit details (user info, amount, blockchain transaction) and approves or rejects. Approval triggers the wallet crediting process.

5. **Wallet Crediting:** Upon approval, the deposit amount (in USD) is added to the user's Live wallet's available balance within a database transaction. A Transaction record is created to log the credit.

6. **Referral Commission Trigger:** If the depositing user was referred, the system calculates the 10% direct referral commission and credits it to the referrer's Live wallet. A Commission record is created, the referral tree's volume counters are updated, and the referrer is notified.

7. **Notification Dispatch:** The depositing user receives an in-app notification and email confirming the deposit has been completed. If a referral commission was generated, the referrer also receives a notification.

---

## 4. Deposit Flow — Gift Card

The gift card deposit flow enables users who lack access to cryptocurrency to fund their accounts using retail gift cards. This is a manual verification process where administrators review the submitted card details and image before crediting the user's wallet.

### Sequence Diagram

```mermaid
sequenceDiagram
    actor User
    participant FE as Frontend
    participant API as API Layer
    participant DepSvc as DepositService
    participant UploadSvc as UploadService
    participant WalletSvc as WalletService
    participant RefSvc as ReferralService
    participant NotifSvc as NotificationService
    participant DB as Database
    participant Ext as External (Cloudinary)
    participant Admin as Admin Dashboard

    User->>FE: Navigates to Deposit page, selects "Gift Card"
    FE->>API: GET /api/v1/deposits/gift-card/config
    API->>DepSvc: getGiftCardConfig()
    DepSvc->>DB: SELECT SystemSettings WHERE key IN (acceptedGiftCardBrands, minDeposit, maxDeposit)
    DB-->>DepSvc: Configuration data
    DepSvc-->>API: { acceptedBrands: [...], minDeposit: 10, maxDeposit: 100000 }
    API-->>FE: 200 { success: true, data: { brands, limits, estimatedProcessingTime } }
    FE->>User: Display gift card form (brand dropdown, value input, image upload)

    User->>FE: Selects brand, enters card value, uploads gift card screenshot
    FE->>API: POST /api/v1/deposits/gift-card/upload-url
    API->>UploadSvc: generateSignedUploadUrl(category: gift_card, entityId: pending)
    UploadSvc->>Ext: Generate Cloudinary signed upload URL with folder: gift-cards/{userId}
    Ext-->>UploadSvc: Signed URL + upload params
    UploadSvc-->>API: { uploadUrl, publicId, uploadParams }
    API-->>FE: 200 { success: true, data: { uploadUrl, publicId } }
    FE->>Ext: Direct file upload to Cloudinary (multipart/form-data)
    Ext-->>FE: Upload response { secure_url, public_id }

    FE->>API: POST /api/v1/deposits/gift-card { brand, cardNumber, pin, faceValue, cloudinaryPublicId, cloudinaryUrl }
    API->>API: Rate limit check (user-based)
    API->>DepSvc: submitGiftCardDeposit(userId, payload)
    DepSvc->>DepSvc: Validate payload (brand in accepted list, value >= min, value <= max, document exists on Cloudinary)
    DepSvc->>DB: Check user gift card submission frequency (fraud detection)
    DepSvc->>DB: BEGIN TRANSACTION
    DepSvc->>DB: INSERT Deposit (userId, type: gift_card, brand, cardNumber (encrypted), pin (encrypted), faceValue, cloudinaryPublicId, cloudinaryUrl, status: pending_verification, mode: live)
    DepSvc->>DB: INSERT Transaction (userId, type: deposit, amount: faceValue, mode: live, referenceId: depositId, status: pending)
    DepSvc->>DB: INSERT AuditLog (action: gift_card_submitted, actor: userId, entity: depositId, metadata: { brand, faceValue })
    DepSvc->>DB: COMMIT
    DepSvc->>NotifSvc: triggerNotification(userId, 'gift_card_submitted', { brand, faceValue, estimatedTime: "2-24 hours" })
    DepSvc-->>API: Deposit submitted successfully
    API-->>FE: 201 { success: true, data: { depositId, status: pending_verification, estimatedProcessingTime } }
    FE-->>User: Display confirmation with status "Pending Verification"

    Note over Admin,DB: --- Admin Verification ---

    Admin->>FE: Opens Admin Dashboard → Gift Card Deposit Queue
    FE->>API: GET /api/v1/admin/deposits?status=pending_verification&type=gift_card
    API->>DB: SELECT Deposit WHERE status = pending_verification AND type = gift_card AND mode = live
    DB-->>API: Pending gift card deposits with user info, card details, image URLs, submission history
    API-->>FE: 200 { success: true, data: [...] }
    FE-->>Admin: Display queue with card images, user history, fraud score indicator

    alt Admin approves the deposit
        Admin->>FE: Clicks "Approve" on a submission
        FE->>API: POST /api/v1/admin/deposits/{id}/approve
        API->>DepSvc: approveGiftCardDeposit(depositId, adminId)
        DepSvc->>DB: SELECT Deposit WHERE id AND status = pending_verification
        DepSvc->>DB: BEGIN TRANSACTION
        DepSvc->>DB: UPDATE Deposit SET status = completed, approvedBy = adminId, completedAt = NOW()
        DepSvc->>WalletSvc: creditWallet(userId, faceValue, mode: live, source: gift_card_deposit)
        WalletSvc->>DB: UPDATE Wallet SET available = available + faceValue, balance = balance + faceValue WHERE userId AND mode = live
        WalletSvc->>DB: UPDATE Transaction SET status = completed WHERE referenceId = depositId
        DepSvc->>RefSvc: processDepositCommission(userId, faceValue)
        RefSvc->>DB: SELECT User.referredBy WHERE id = userId
        alt User has a referrer
            RefSvc->>RefSvc: Calculate 10% commission (faceValue * 0.10)
            RefSvc->>WalletSvc: creditWallet(referrerId, commissionAmount, mode: live, source: referral_commission)
            WalletSvc->>DB: UPDATE Wallet SET available = available + commissionAmount, balance = balance + commissionAmount WHERE userId = referrerId AND mode = live
            WalletSvc->>DB: INSERT Transaction (userId: referrerId, type: commission, amount: commissionAmount, mode: live, referenceId: depositId, status: completed)
            RefSvc->>DB: INSERT Commission (referrerId, referredId, type: direct_deposit, amount: commissionAmount, sourceDepositId: depositId)
            RefSvc->>DB: UPDATE ReferralTree SET totalDepositVolume = totalDepositVolume + faceValue WHERE referredId = userId
            RefSvc->>NotifSvc: triggerNotification(referrerId, 'referral_commission', { amount: commissionAmount, source: userName })
        end
        DepSvc->>DB: INSERT AuditLog (action: gift_card_approved, actor: adminId, entity: depositId, metadata)
        DepSvc->>DB: COMMIT
        DepSvc->>NotifSvc: triggerNotification(userId, 'deposit_completed', { amount: faceValue, method: gift_card, brand })
        NotifSvc->>DB: INSERT Notification (userId, type: deposit, title, message, metadata)
        DepSvc-->>API: Gift card approved, wallet credited
        API-->>FE: 200 { success: true }
        FE-->>Admin: Deposit marked approved, removed from queue
    else Admin rejects the deposit
        Admin->>FE: Clicks "Reject", enters rejection reason
        FE->>API: POST /api/v1/admin/deposits/{id}/reject { reason }
        API->>DepSvc: rejectGiftCardDeposit(depositId, adminId, reason)
        DepSvc->>DB: UPDATE Deposit SET status = rejected, rejectedBy = adminId, rejectedAt = NOW(), rejectionReason = reason
        DepSvc->>DB: UPDATE Transaction SET status = failed WHERE referenceId = depositId
        DepSvc->>DB: INSERT AuditLog (action: gift_card_rejected, actor: adminId, entity: depositId, metadata: { reason })
        DepSvc->>NotifSvc: triggerNotification(userId, 'deposit_rejected', { method: gift_card, brand, reason })
        NotifSvc->>DB: INSERT Notification (userId, type: deposit, title: "Gift Card Deposit Rejected", message, metadata: { reason })
        DepSvc-->>API: Gift card rejected
        API-->>FE: 200 { success: true }
        FE-->>Admin: Deposit marked rejected
        FE-->>User: (via notification) Display rejection with reason and guidance
    end
```

### Step-by-Step Description

1. **Configuration Retrieval:** The frontend fetches the list of accepted gift card brands, deposit limits, and estimated processing time to populate the deposit form.

2. **Image Upload:** The user selects a gift card brand, enters the face value, and uploads a screenshot of the card. The image is uploaded directly to Cloudinary using a pre-signed URL (offloading transfer from the application server). The upload validates file type (JPEG, PNG, WEBP) and size (max 10MB).

3. **Deposit Submission:** The frontend submits the gift card details along with the Cloudinary reference. The DepositService validates the payload, checks the user's submission history for fraud patterns, and creates a Deposit record in `pending_verification` status with a corresponding `pending` Transaction record.

4. **Admin Review:** Pending gift card deposits appear in the admin dashboard's dedicated verification queue. Each entry shows the card image, user information, declared face value, brand, and the user's historical approval/rejection ratio. Administrators can verify card validity using external tools before making a decision.

5. **Approval Path:** Upon approval, the face value is credited to the user's Live wallet, the Transaction status is updated to `completed`, and the referral commission pipeline is triggered (same 10% direct commission flow as cryptocurrency deposits).

6. **Rejection Path:** Upon rejection, the Transaction status is set to `failed`, and the user receives a notification with the specific rejection reason and guidance on next steps (e.g., re-submit with a clearer image, try a different brand).

---

## 5. Investment Flow

The investment flow handles the user's selection of an investment plan, funding from their wallet balance, tracking of the investment lifecycle, and the processing of returns upon plan maturity. This is the core financial engine of the platform.

### Sequence Diagram

```mermaid
sequenceDiagram
    actor User
    participant FE as Frontend
    participant API as API Layer
    participant InvSvc as InvestmentService
    participant WalletSvc as WalletService
    participant PlanSvc as PlanService
    participant NotifSvc as NotificationService
    participant DB as Database
    participant Worker as Background Worker
    participant RefSvc as ReferralService

    User->>FE: Navigates to Investment Plans page
    FE->>API: GET /api/v1/investments/plans
    API->>PlanSvc: getActivePlans()
    PlanSvc->>DB: SELECT InvestmentPlan WHERE isActive = true ORDER BY minDeposit
    DB-->>PlanSvc: Plans list (Basic, Silver, Gold, Platinum)
    PlanSvc-->>API: Plans with tier details, return rates, durations, KYC requirements
    API-->>FE: 200 { success: true, data: [plans] }
    FE->>User: Display plan cards with user's KYC level indicators (locked/unlocked)

    User->>FE: Selects plan (e.g., "Gold"), enters investment amount
    FE->>API: POST /api/v1/investments { planId, amount, mode }
    API->>API: Authenticate user, extract userId
    API->>InvSvc: createInvestment(userId, planId, amount, mode)
    InvSvc->>DB: SELECT InvestmentPlan WHERE id = planId AND isActive = true
    DB-->>InvSvc: Plan details (name, minDeposit, maxDeposit, durationHours, returnRate, requiredKycLevel)

    InvSvc->>InvSvc: Validate amount >= plan.minDeposit
    InvSvc->>InvSvc: Validate amount <= plan.maxDeposit
    InvSvc->>DB: SELECT User WHERE id = userId
    DB-->>InvSvc: User record with kycLevel
    InvSvc->>InvSvc: Validate user.kycLevel >= plan.requiredKycLevel

    alt KYC level insufficient (Live mode)
        InvSvc-->>API: 422 { success: false, message: "KYC Level X required for this plan" }
        API-->>FE: 422 error response
        FE-->>User: Prompt to complete KYC verification
    end

    InvSvc->>DB: SELECT Wallet WHERE userId AND mode
    DB-->>InvSvc: Wallet record with available balance
    InvSvc->>InvSvc: Validate wallet.available >= amount

    alt Insufficient balance
        InvSvc-->>API: 422 { success: false, message: "Insufficient available balance" }
        API-->>FE: 422 error response
        FE-->>User: Display "Insufficient balance, please deposit funds"
    end

    Note over InvSvc,DB: --- Investment Creation (Transactional) ---

    InvSvc->>DB: BEGIN TRANSACTION
    InvSvc->>DB: SELECT Wallet WHERE userId AND mode FOR UPDATE (row-level lock)
    InvSvc->>DB: UPDATE Wallet SET available = available - amount, balance = balance - amount WHERE userId AND mode AND available >= amount
    InvSvc->>DB: INSERT Investment (userId, planId, principalAmount, expectedReturn, expectedMaturityAt, status: active, mode, createdAt)
    InvSvc->>DB: INSERT Transaction (userId, type: investment, amount: -amount, mode, referenceId: investmentId, status: completed, description: "Investment in {planName}")
    InvSvc->>DB: INSERT AuditLog (action: investment_created, actor: userId, entity: investmentId, metadata: { planId, amount, expectedMaturity, expectedReturn })
    InvSvc->>DB: COMMIT

    InvSvc->>NotifSvc: triggerNotification(userId, 'investment_activated', { planName, amount, expectedReturn, maturityDate })
    NotifSvc->>DB: INSERT Notification (userId, type: investment, title: "Investment Activated", message, metadata)
    InvSvc-->>API: Investment created successfully
    API-->>FE: 201 { success: true, data: { investmentId, planName, amount, expectedReturn, maturityDate, status: active } }
    FE-->>User: Display investment confirmation with countdown to maturity

    Note over Worker,DB: --- Plan Maturity Processing (Background Job) ---

    Worker->>Worker: Cron job triggers (every 1 minute)
    Worker->>DB: SELECT Investment WHERE status = active AND expectedMaturityAt <= NOW() AND processedAt IS NULL
    DB-->>Worker: List of matured investments

    loop For each matured investment
        Worker->>DB: BEGIN TRANSACTION
        Worker->>DB: SELECT Investment WHERE id FOR UPDATE (prevent concurrent processing)
        Worker->>DB: UPDATE Investment SET processedAt = NOW() (idempotency guard)
        Worker->>DB: SELECT InvestmentPlan WHERE id = investment.planId
        Worker->>Worker: Calculate actual return: principalAmount * (returnRate/100 * durationDays)
        Worker->>DB: UPDATE Investment SET status = matured, actualReturn = calculatedReturn, maturedAt = NOW()

        Worker->>DB: UPDATE Wallet SET available = available + (principalAmount + calculatedReturn), balance = balance + (principalAmount + calculatedReturn) WHERE userId AND mode
        Worker->>DB: INSERT Transaction (userId, type: investment_return, amount: principalAmount + calculatedReturn, mode, referenceId: investmentId, status: completed, description: "Principal + return from {planName}")
        Worker->>DB: INSERT PayoutRecord (investmentId, userId, principalAmount, returnAmount, totalCredited, payoutDate, mode)

        Worker->>DB: INSERT AuditLog (action: investment_matured, actor: system, entity: investmentId, metadata: { principal, return, total })
        Worker->>DB: COMMIT

        Worker->>NotifSvc: triggerNotification(userId, 'investment_matured', { planName, principal, returnAmount, totalCredited })
        NotifSvc->>DB: INSERT Notification (userId, type: investment, title: "Investment Matured", message, metadata)

        Worker->>RefSvc: processInvestmentReturnCommission(userId, investmentId, calculatedReturn)
        RefSvc->>DB: SELECT User.referredBy WHERE id = userId
        alt User has a referrer
            RefSvc->>RefSvc: Calculate 10% commission on return (calculatedReturn * 0.10)
            RefSvc->>WalletSvc: creditWallet(referrerId, commissionAmount, mode: live, source: referral_commission)
            WalletSvc->>DB: UPDATE Wallet SET available = available + commissionAmount, balance = balance + commissionAmount WHERE userId = referrerId AND mode = live
            WalletSvc->>DB: INSERT Transaction (userId: referrerId, type: commission, amount: commissionAmount, mode: live, referenceId: investmentId, status: completed)
            RefSvc->>DB: INSERT Commission (referrerId, referredId, type: direct_return, amount: commissionAmount, sourceInvestmentId: investmentId)
            RefSvc->>NotifSvc: triggerNotification(referrerId, 'referral_commission', { amount: commissionAmount, source: investmentReturn })
        end
    end
```

### Step-by-Step Description

1. **Plan Browsing:** The user views available investment plans with their tier details (minimum/maximum amounts, duration, expected return rate, KYC level requirement). Plans that require a higher KYC level than the user currently has are visually locked.

2. **Investment Validation:** When the user submits an investment request, the system validates: the amount is within the plan's min/max range, the user's KYC level meets the plan's requirement (Live mode only), and the user's available wallet balance is sufficient for the mode (Demo or Live).

3. **Funding (Deduction):** Within a database transaction with row-level locking on the wallet, the investment amount is deducted from the user's available balance. An Investment record is created with the plan details, expected maturity timestamp, and expected return amount. A negative Transaction record is created for the deduction.

4. **Active Tracking:** The investment appears in the user's dashboard with a countdown timer to maturity. The frontend can poll the API or use Server-Sent Events to display real-time progress updates.

5. **Maturity Detection:** A background worker (cron job, running every minute) queries for investments where `status = active`, `expectedMaturityAt <= NOW()`, and `processedAt IS NULL`. This triple condition ensures idempotency — once an investment is processed, the `processedAt` timestamp prevents reprocessing.

6. **Return Calculation and Crediting:** For each matured investment, the worker calculates the actual return (principal × daily return rate × duration in days), credits the principal plus return to the user's wallet, creates a PayoutRecord, and updates the investment status to `matured`. The entire operation is wrapped in a database transaction.

7. **Referral Commission on Returns:** If the investing user was referred, a 10% commission on the return amount (not the principal) is calculated and credited to the referrer's Live wallet. This is separate from the deposit commission and is triggered on investment maturity.

8. **Notification:** The user receives an in-app notification and email informing them their investment has matured and the total amount credited. If a referral commission was generated, the referrer is also notified.

---

## 6. Withdrawal Flow

The withdrawal flow governs how users move funds out of the platform. It enforces KYC requirements, calculates the 21% platform fee, places funds in a pending state, routes the request through admin approval, and processes the actual payout.

### Sequence Diagram

```mermaid
sequenceDiagram
    actor User
    participant FE as Frontend
    participant API as API Layer
    participant WdSvc as WithdrawalService
    participant WalletSvc as WalletService
    participant NotifSvc as NotificationService
    participant DB as Database
    participant Ext as External (Blockchain / Wallet)
    participant Admin as Admin Dashboard

    User->>FE: Navigates to Withdrawal page
    FE->>API: GET /api/v1/wallets/balance?mode=live
    API->>DB: SELECT Wallet WHERE userId AND mode = live
    DB-->>API: Wallet record (available, balance, pending)
    API-->>FE: 200 { success: true, data: { available, balance, pending } }
    FE->>User: Display available balance, withdrawal form

    User->>FE: Enters withdrawal amount, selects crypto destination (e.g., BTC address)
    FE->>FE: Real-time fee calculation: fee = amount * 0.21, net = amount - fee
    FE->>User: Display breakdown: "Withdraw: $[amount] | Fee (21%): $[fee] | You Receive: $[net]"

    User->>FE: Confirms withdrawal
    FE->>API: POST /api/v1/withdrawals { amount, destinationAddress, destinationCurrency, mode }
    API->>WdSvc: createWithdrawal(userId, payload)
    WdSvc->>DB: SELECT User WHERE id = userId
    DB-->>WdSvc: User record (kycLevel, status, country)

    WdSvc->>WdSvc: Validate user is not from restricted jurisdiction (OFAC check)
    WdSvc->>WdSvc: Validate KYC status (kycLevel >= 1 required for Live withdrawals)
    WdSvc->>DB: SELECT Wallet WHERE userId AND mode
    DB-->>WdSvc: Wallet record

    WdSvc->>WdSvc: Validate amount <= wallet.available
    WdSvc->>WdSvc: Calculate fee = amount * 0.21
    WdSvc->>WdSvc: Calculate net = amount - fee
    WdSvc->>WdSvc: Validate net >= minimum withdrawal ($10)

    alt Validation failures
        alt KYC not verified (Live mode)
            WdSvc-->>API: 422 { success: false, message: "KYC verification required before withdrawal" }
        end
        alt Insufficient balance
            WdSvc-->>API: 422 { success: false, message: "Insufficient available balance" }
        end
        alt Net below minimum
            WdSvc-->>API: 422 { success: false, message: "Net withdrawal amount must be at least $10" }
        end
        API-->>FE: 422 error response
        FE-->>User: Display specific error message
    end

    Note over WdSvc,DB: --- Withdrawal Creation (Transactional) ---

    WdSvc->>DB: BEGIN TRANSACTION
    WdSvc->>DB: SELECT Wallet WHERE userId AND mode FOR UPDATE (row-level lock)
    WdSvc->>DB: UPDATE Wallet SET available = available - amount, pending = pending + amount WHERE userId AND mode AND available >= amount
    WdSvc->>DB: INSERT Withdrawal (userId, grossAmount, feeAmount, netAmount, destinationAddress, destinationCurrency, status: pending_approval, mode)
    WdSvc->>DB: INSERT Transaction (userId, type: withdrawal, amount: -amount, mode, referenceId: withdrawalId, status: pending, description: "Withdrawal request")
    WdSvc->>DB: INSERT AuditLog (action: withdrawal_requested, actor: userId, entity: withdrawalId, metadata: { gross, fee, net, destination })
    WdSvc->>DB: COMMIT

    WdSvc->>NotifSvc: triggerNotification(userId, 'withdrawal_requested', { grossAmount, feeAmount, netAmount, destination })
    NotifSvc->>DB: INSERT Notification (userId, type: withdrawal, title: "Withdrawal Requested", message, metadata)
    WdSvc-->>API: Withdrawal created
    API-->>FE: 201 { success: true, data: { withdrawalId, grossAmount, feeAmount, netAmount, status: pending_approval } }
    FE-->>User: Display withdrawal confirmation with status "Pending Approval"

    Note over Admin,DB: --- Admin Review and Approval ---

    NotifSvc->>DB: INSERT Notification (targetType: admin, type: withdrawal_pending, message: "New withdrawal request from {user}")
    Admin->>FE: Opens Admin Dashboard → Withdrawal Queue
    FE->>API: GET /api/v1/admin/withdrawals?status=pending_approval
    API->>DB: SELECT Withdrawal WHERE status = pending_approval AND mode = live
    DB-->>API: Pending withdrawals with user info, KYC level, account age, lifetime deposits, risk flags
    API-->>FE: 200 { success: true, data: [...] }
    FE-->>Admin: Display queue sorted by amount (highest first), highlight high-risk requests

    alt Admin approves
        Admin->>FE: Clicks "Approve"
        FE->>API: POST /api/v1/admin/withdrawals/{id}/approve
        API->>WdSvc: approveWithdrawal(withdrawalId, adminId)
        WdSvc->>DB: SELECT Withdrawal WHERE id AND status = pending_approval FOR UPDATE
        WdSvc->>DB: BEGIN TRANSACTION
        WdSvc->>DB: UPDATE Withdrawal SET status = processing, approvedBy = adminId, approvedAt = NOW()
        WdSvc->>DB: INSERT AuditLog (action: withdrawal_approved, actor: adminId, entity: withdrawalId, metadata)
        WdSvc->>DB: COMMIT

        WdSvc->>Ext: Initiate crypto transfer (netAmount converted to destinationCurrency, sent to destinationAddress)
        Ext-->>WdSvc: Transaction broadcast, txHash returned

        WdSvc->>DB: UPDATE Withdrawal SET status = completed, txHash, completedAt = NOW()
        WdSvc->>DB: UPDATE Wallet SET pending = pending - grossAmount WHERE userId AND mode
        WdSvc->>DB: UPDATE Transaction SET status = completed, metadata = { txHash } WHERE referenceId = withdrawalId
        WdSvc->>DB: INSERT AuditLog (action: withdrawal_completed, actor: system, entity: withdrawalId, metadata: { txHash })

        WdSvc->>NotifSvc: triggerNotification(userId, 'withdrawal_completed', { grossAmount, feeAmount, netAmount, destination, txHash })
        NotifSvc->>DB: INSERT Notification (userId, type: withdrawal, title: "Withdrawal Completed", message, metadata: { txHash })
        WdSvc-->>API: Withdrawal completed
        API-->>FE: 200 { success: true }
        FE-->>Admin: Withdrawal marked completed with txHash
        FE-->>User: (via notification) Display completion with blockchain transaction link

    else Admin rejects
        Admin->>FE: Clicks "Reject", enters rejection reason
        FE->>API: POST /api/v1/admin/withdrawals/{id}/reject { reason }
        API->>WdSvc: rejectWithdrawal(withdrawalId, adminId, reason)
        WdSvc->>DB: BEGIN TRANSACTION
        WdSvc->>DB: UPDATE Withdrawal SET status = rejected, rejectedBy = adminId, rejectedAt = NOW(), rejectionReason = reason
        WdSvc->>DB: UPDATE Wallet SET pending = pending - grossAmount, available = available + grossAmount WHERE userId AND mode
        WdSvc->>DB: UPDATE Transaction SET status = reversed WHERE referenceId = withdrawalId
        WdSvc->>DB: INSERT AuditLog (action: withdrawal_rejected, actor: adminId, entity: withdrawalId, metadata: { reason })
        WdSvc->>DB: COMMIT
        WdSvc->>NotifSvc: triggerNotification(userId, 'withdrawal_rejected', { grossAmount, reason })
        NotifSvc->>DB: INSERT Notification (userId, type: withdrawal, title: "Withdrawal Rejected", message, metadata: { reason })
        WdSvc-->>API: Withdrawal rejected
        API-->>FE: 200 { success: true }
        FE-->>Admin: Withdrawal marked rejected
        FE-->>User: (via notification) Funds returned to available balance, reason displayed
    end
```

### Step-by-Step Description

1. **Pre-Submission Validation Display:** The frontend fetches the user's Live wallet balance and displays the withdrawal form. As the user types an amount, the real-time fee calculation (21% of gross amount) and net amount are displayed. The fee breakdown explanation (account management, signal fees, insurance, certification, VAT) is shown below.

2. **Server-Side Validation:** Upon submission, the backend validates: the user is not from a restricted jurisdiction, KYC level is at least Level 1 (for Live withdrawals), the requested amount does not exceed available balance, and the net amount meets the $10 minimum threshold.

3. **Balance Locking:** Within a database transaction, the gross amount is moved from the user's `available` balance to their `pending` balance. This prevents the funds from being used for investments or additional withdrawals while the request is being reviewed. A Withdrawal record is created in `pending_approval` status.

4. **Admin Review:** Pending withdrawals appear in the admin dashboard's approval queue, sorted by amount (highest first for priority review). Each entry shows the user's KYC level, account age, lifetime deposits, destination address, and any risk flags. Large withdrawals from recently registered accounts are highlighted for additional scrutiny.

5. **Approval and Payout:** Upon approval, the system initiates the actual cryptocurrency transfer to the user's designated destination address. The net amount is converted to the selected cryptocurrency and broadcast to the blockchain. Once the transaction is confirmed and a txHash is obtained, the withdrawal is marked as `completed`.

6. **Rejection and Refund:** Upon rejection, the full gross amount (no fee deducted) is moved back from `pending` to `available` balance. The user is notified with the specific rejection reason.

7. **Fee Distribution:** The 21% fee collected on approved withdrawals is allocated internally across operational cost categories (management, signals, insurance, certification, VAT). The specific allocation percentages are configurable by administrators.

---

## 7. Referral Commission Flow

The referral system operates on two commission tracks: direct referral commissions (10% on referred user deposits) and binary bonuses (calculated on weaker leg volume). This flow covers the data movement from user registration with a referral code through commission crediting and binary bonus settlement.

### Sequence Diagram

```mermaid
sequenceDiagram
    actor UserA as New User (Referred)
    actor UserB as Sponsor (Referrer)
    participant FE as Frontend
    participant API as API Layer
    participant AuthSvc as AuthService
    participant RefSvc as ReferralService
    participant WalletSvc as WalletService
    participant Worker as Background Worker
    participant NotifSvc as NotificationService
    participant DB as Database

    Note over UserA,DB: --- Phase 1: Registration with Referral Code ---

    UserA->>FE: Registers with referral code (from URL ?ref=CODE or manual entry)
    FE->>API: POST /api/v1/auth/register { email, password, referralCode: "ABC12345" }
    API->>AuthSvc: createUser(email, passwordHash, referralCode)
    AuthSvc->>RefSvc: processReferralOnRegistration(newUserId, "ABC12345")
    RefSvc->>DB: SELECT User WHERE referralCode = "ABC12345" AND status = active
    DB-->>RefSvc: Sponsor user record (sponsorId)

    RefSvc->>DB: SELECT ReferralTree WHERE parentId = sponsorId
    alt Sponsor has no left child
        RefSvc->>DB: INSERT ReferralTree (parentId: sponsorId, childId: newUserId, leg: left, depth: 1)
    else Sponsor has left child but no right child
        RefSvc->>DB: INSERT ReferralTree (parentId: sponsorId, childId: newUserId, leg: right, depth: 1)
    else Both legs occupied — place deeper in tree
        RefSvc->>RefSvc: Determine placement (left-to-right, top-to-bottom in weaker leg)
        RefSvc->>DB: INSERT ReferralTree (parentId, childId: newUserId, leg, depth: N)
    end
    RefSvc->>DB: UPDATE User SET referredBy = sponsorId WHERE id = newUserId
    DB-->>RefSvc: Referral link established
    RefSvc-->>AuthSvc: Referral processing complete

    Note over UserA,DB: --- Phase 2: Direct Commission on Deposit ---

    UserA->>FE: Makes a deposit (crypto or gift card) — $1,000 approved
    FE->>API: (Deposit approval flow completes)
    API->>RefSvc: processDepositCommission(newUserId, 1000.00)
    RefSvc->>DB: SELECT User.referredBy WHERE id = newUserId
    DB-->>RefSvc: sponsorId
    RefSvc->>RefSvc: Calculate commission: $1,000 * 10% = $100.00
    RefSvc->>WalletSvc: creditWallet(sponsorId, 100.00, mode: live, source: referral_commission)
    WalletSvc->>DB: UPDATE Wallet SET available = available + 100.00, balance = balance + 100.00 WHERE userId = sponsorId AND mode = live
    WalletSvc->>DB: INSERT Transaction (userId: sponsorId, type: commission, amount: 100.00, mode: live, referenceType: deposit, referenceId: depositId, status: completed)
    RefSvc->>DB: INSERT Commission (referrerId: sponsorId, referredId: newUserId, type: direct_deposit, amount: 100.00, sourceDepositId)
    RefSvc->>DB: UPDATE ReferralTree SET weeklyVolume = weeklyVolume + 1000.00 WHERE childId = newUserId (or parent leg aggregate)
    RefSvc->>NotifSvc: triggerNotification(sponsorId, 'referral_commission', { amount: 100.00, source: deposit, referredUser: userName })

    Note over Worker,DB: --- Phase 3: Binary Bonus Calculation (Weekly Cron) ---

    Worker->>Worker: Cron triggers weekly (Sunday 23:59 UTC)
    Worker->>RefSvc: calculateBinaryBonuses()

    loop For each user with a non-empty binary tree
        Worker->>DB: SELECT SUM(weeklyVolume) as leftVolume FROM ReferralTree WHERE ancestorId = userId AND leg = left
        Worker->>DB: SELECT SUM(weeklyVolume) as rightVolume FROM ReferralTree WHERE ancestorId = userId AND leg = right
        DB-->>Worker: leftVolume, rightVolume

        Worker->>Worker: Determine weaker leg: MIN(leftVolume, rightVolume)
        Worker->>DB: SELECT SUM(principalAmount) as activeInvestment FROM Investment WHERE userId = userId AND status = active AND mode = live
        DB-->>Worker: activeInvestment total

        alt activeInvestment >= $200 (qualification met)
            Worker->>DB: SELECT SystemSettings WHERE key = 'binaryBonusRate'
            DB-->>Worker: binaryBonusRate (e.g., 5%)
            Worker->>Worker: Calculate bonus: weakerLegVolume * binaryBonusRate
            Worker->>DB: SELECT SystemSettings WHERE key = 'binaryBonusCap'
            DB-->>Worker: weeklyCap (e.g., $10,000)

            alt Calculated bonus <= weeklyCap
                Worker->>DB: BEGIN TRANSACTION
                Worker->>WalletSvc: creditWallet(userId, bonusAmount, mode: live, source: binary_bonus)
                WalletSvc->>DB: UPDATE Wallet SET available = available + bonusAmount, balance = balance + bonusAmount WHERE userId AND mode = live
                WalletSvc->>DB: INSERT Transaction (userId, type: commission, amount: bonusAmount, mode: live, referenceType: binary_bonus, status: completed)
                Worker->>DB: INSERT Commission (referrerId: userId, type: binary_bonus, amount: bonusAmount, leftVolume, rightVolume, weakerLegVolume, weekEndDate)
                Worker->>DB: INSERT AuditLog (action: binary_bonus_credited, actor: system, entity: userId, metadata: { leftVolume, rightVolume, bonusAmount })
                Worker->>DB: COMMIT
                Worker->>NotifSvc: triggerNotification(userId, 'binary_bonus_credited', { amount: bonusAmount, leftVolume, rightVolume })
            end

            Worker->>DB: Reset weekly volume counters for next cycle
            Worker->>DB: UPDATE ReferralTree SET weeklyVolume = 0 WHERE ancestorId = userId
            alt Flush policy = carry_forward
                Worker->>DB: UPDATE ReferralTree SET carriedVolume = ABS(leftVolume - rightVolume) WHERE ancestorId = userId
            end
        end
    end
```

### Step-by-Step Description

1. **Registration Link Capture:** When a new user registers with a referral code, the system validates the code belongs to an active user and establishes the referral relationship in the ReferralTree. The new user is placed in the binary tree under the sponsor — on the left leg if empty, right leg if left is occupied, or deeper in the tree following the placement strategy.

2. **Direct Deposit Commission:** When a referred user's deposit is approved (crypto or gift card), the system immediately calculates 10% of the deposit amount (in USD) as the sponsor's commission. The commission is credited to the sponsor's Live wallet available balance, a Commission record is created, and the weekly volume counter for the appropriate leg is incremented.

3. **Direct Return Commission:** When a referred user's investment matures, an additional 10% commission on the return amount (not the principal) is calculated and credited to the sponsor's Live wallet. This is separate from the deposit commission.

4. **Binary Bonus Qualification:** To qualify for binary bonuses, a user must have at least $200 in active investments (across any plan tiers). This qualification check runs during the weekly calculation cycle.

5. **Binary Bonus Calculation:** At the weekly cycle close (configurable, default Sunday 23:59 UTC), the background worker aggregates deposit volumes for each user's left and right legs. The bonus is calculated on the weaker leg's volume at the configured rate (e.g., 5%), subject to a weekly cap.

6. **Carry-Forward Policy:** Depending on the configured flush policy, the volume difference between the stronger and weaker legs may carry forward to the next weekly cycle, rewarding sustained balanced team building.

7. **Notification:** Sponsors receive in-app and email notifications for both direct commissions (immediately) and binary bonuses (after weekly calculation). Notifications include the amount, source, and current wallet balance.

---

## 8. KYC Verification Flow

The KYC (Know Your Customer) verification flow manages the progressive identity verification of users through three levels. Each level unlocks higher deposit limits, access to premium investment plans, and the ability to withdraw funds.

### Sequence Diagram

```mermaid
sequenceDiagram
    actor User
    participant FE as Frontend
    participant API as API Layer
    participant KycSvc as KYCService
    participant UploadSvc as UploadService
    participant NotifSvc as NotificationService
    participant DB as Database
    participant Ext as External (Cloudinary)
    participant Admin as Admin Dashboard

    Note over User,DB: --- Level 1: Email Verification (Automatic on Registration) ---
    Note over User,Admin: See Section 2 (User Registration Flow) for Level 1 details.

    Note over User,DB: --- Level 2: Government ID Verification ---

    User->>FE: Navigates to KYC Verification page
    FE->>API: GET /api/v1/kyc/status
    API->>KycSvc: getKYCStatus(userId)
    KycSvc->>DB: SELECT User.kycLevel, KYCSubmission WHERE userId ORDER BY createdAt DESC
    DB-->>KycSvc: Current KYC level and latest submission status
    KycSvc-->>API: { kycLevel: 1, submissions: [...], nextLevelRequirements }
    API-->>FE: 200 { success: true, data: { currentLevel: 1, nextLevel: 2, requirements: [...] } }
    FE->>User: Display KYC progress, Level 2 requirements (government-issued ID)

    User->>FE: Uploads ID front photo
    FE->>API: POST /api/v1/kyc/upload-url { category: kyc_document, documentType: id_front }
    API->>UploadSvc: generateSignedUploadUrl(category: kyc_document, documentType: id_front, userId)
    UploadSvc->>Ext: Generate Cloudinary signed URL with folder: kyc/{userId}/id_front
    Ext-->>UploadSvc: Signed URL
    UploadSvc-->>API: { uploadUrl, publicId }
    API-->>FE: 200 { uploadUrl, publicId }
    FE->>Ext: Upload ID front image to Cloudinary

    User->>FE: Uploads ID back photo
    FE->>Ext: Upload ID back image to Cloudinary (same flow)

    User->>FE: Uploads selfie photo
    FE->>Ext: Upload selfie image to Cloudinary (same flow)

    User->>FE: Clicks "Submit for Verification"
    FE->>API: POST /api/v1/kyc/submit { targetLevel: 2, documents: [{ type: id_front, publicId }, { type: id_back, publicId }, { type: selfie, publicId }] }
    API->>KycSvc: submitKYC(userId, targetLevel, documents)
    KycSvc->>KycSvc: Validate targetLevel is next logical level (cannot skip levels)
    KycSvc->>KycSvc: Validate all required documents for Level 2 are present
    KycSvc->>KycSvc: Validate documents exist on Cloudinary
    KycSvc->>DB: Check for existing pending submission (prevent duplicate)
    KycSvc->>DB: BEGIN TRANSACTION
    KycSvc->>DB: INSERT KYCSubmission (userId, targetLevel: 2, status: pending_review, submittedAt: NOW())
    loop For each document
        KycSvc->>DB: INSERT KYCDocument (submissionId, documentType, cloudinaryPublicId, cloudinaryUrl, uploadedAt: NOW())
    end
    KycSvc->>DB: INSERT AuditLog (action: kyc_submitted, actor: userId, entity: submissionId, metadata: { targetLevel, documentCount })
    KycSvc->>DB: COMMIT
    KycSvc->>NotifSvc: triggerNotification(userId, 'kyc_submitted', { targetLevel: 2 })
    KycSvc->>NotifSvc: triggerAdminNotification('kyc_pending_review', { userId, targetLevel })
    KycSvc-->>API: KYC submitted successfully
    API-->>FE: 201 { success: true, data: { submissionId, status: pending_review } }
    FE-->>User: Display "Under Review" status with estimated processing time

    Note over Admin,DB: --- Admin KYC Review ---

    Admin->>FE: Opens Admin Dashboard → KYC Review Queue
    FE->>API: GET /api/v1/admin/kyc?status=pending_review
    API->>DB: SELECT KYCSubmission WHERE status = pending_review ORDER BY submittedAt ASC
    DB-->>API: Pending submissions with user info, document URLs
    API-->>FE: 200 { success: true, data: [...] }
    FE-->>Admin: Display queue (oldest first), lightbox for document viewing

    alt Admin approves
        Admin->>FE: Reviews documents (side-by-side comparison), clicks "Approve"
        FE->>API: POST /api/v1/admin/kyc/{submissionId}/approve
        API->>KycSvc: approveKYC(submissionId, adminId)
        KycSvc->>DB: SELECT KYCSubmission WHERE id = submissionId AND status = pending_review
        KycSvc->>DB: SELECT User WHERE id = userId
        KycSvc->>DB: BEGIN TRANSACTION
        KycSvc->>DB: UPDATE KYCSubmission SET status = approved, reviewedBy = adminId, reviewedAt = NOW()
        KycSvc->>DB: UPDATE User SET kycLevel = targetLevel WHERE id = userId
        KycSvc->>DB: INSERT AuditLog (action: kyc_approved, actor: adminId, entity: submissionId, metadata: { userId, oldLevel, newLevel })
        KycSvc->>DB: COMMIT
        KycSvc->>NotifSvc: triggerNotification(userId, 'kyc_approved', { newLevel: 2, unlockedFeatures: [...] })
        KycSvc-->>API: KYC approved
        API-->>FE: 200 { success: true }
        FE-->>Admin: Submission removed from queue
        FE-->>User: (via notification) "KYC Approved — Level 2 unlocked. You can now invest in Silver, Gold plans."
    else Admin rejects
        Admin->>FE: Clicks "Reject", selects reason code + enters explanation
        FE->>API: POST /api/v1/admin/kyc/{submissionId}/reject { reasonCode, explanation }
        API->>KycSvc: rejectKYC(submissionId, adminId, reasonCode, explanation)
        KycSvc->>DB: BEGIN TRANSACTION
        KycSvc->>DB: UPDATE KYCSubmission SET status = rejected, reviewedBy = adminId, reviewedAt = NOW(), rejectionReasonCode, rejectionExplanation
        KycSvc->>DB: INSERT AuditLog (action: kyc_rejected, actor: adminId, entity: submissionId, metadata: { reasonCode, explanation })
        KycSvc->>DB: COMMIT
        KycSvc->>NotifSvc: triggerNotification(userId, 'kyc_rejected', { targetLevel, reasonCode, explanation, reuploadLink })
        KycSvc-->>API: KYC rejected
        API-->>FE: 200 { success: true }
        FE-->>Admin: Submission removed from queue
        FE-->>User: (via notification) "KYC verification unsuccessful. Reason: [explanation]. Please re-submit with corrected documents."
    end

    Note over User,DB: --- Level 3: ID + Proof of Address ---

    User->>FE: Navigates to KYC page, sees Level 3 requirements
    FE->>API: GET /api/v1/kyc/status
    API-->>FE: { currentLevel: 2, nextLevel: 3, requirements: ["proof_of_address"] }
    User->>FE: Uploads proof of address document (utility bill, bank statement)
    FE->>API: POST /api/v1/kyc/submit { targetLevel: 3, documents: [{ type: proof_of_address, publicId }] }
    Note over FE,Admin: Same review flow as Level 2
```

### Step-by-Step Description

1. **Level 1 — Email Verification:** Automatically granted upon registration when the user clicks the email verification link. This is covered in the User Registration Flow (Section 2). Enables basic platform access and Demo mode.

2. **Level 2 — Government ID Verification:** The user uploads their government-issued ID (front and back) and a selfie. Documents are uploaded to Cloudinary via signed URLs for secure, direct transfer. The submission enters `pending_review` status and an admin notification is dispatched.

3. **Admin Review:** Administrators view pending submissions in a dedicated queue (oldest first). The review interface supports side-by-side document comparison and a lightbox for zooming. The admin approves or rejects with a structured reason code and explanation.

4. **Approval:** On approval, the user's KYC level is incremented, unlocking access to higher-tier investment plans and increased limits. The user is notified of the approval and what features are now available.

5. **Rejection:** On rejection, the user is notified with the specific reason and guidance on how to correct the submission. The user can re-upload documents through a pre-filled re-submission form that maintains context from the previous attempt.

6. **Level 3 — Proof of Address:** Users seeking full platform access (Platinum plans, maximum withdrawal limits) submit a proof of address document (utility bill, bank statement). The same review flow applies.

---

## 9. Plan Maturity Processing Flow

The plan maturity processing flow is a critical background job that runs on a scheduled interval to detect investments that have reached their maturity timestamp, calculate returns, credit wallets, and trigger downstream effects (commissions, notifications). This flow must be idempotent and resilient to failures.

### Sequence Diagram

```mermaid
sequenceDiagram
    participant Scheduler as Cron Scheduler
    participant Worker as Maturity Worker
    participant InvSvc as InvestmentService
    participant WalletSvc as WalletService
    participant RefSvc as ReferralService
    participant NotifSvc as NotificationService
    participant DB as Database

    Scheduler->>Worker: TRIGGER (every 1 minute)

    Worker->>DB: SELECT Investment WHERE status = active AND expectedMaturityAt <= NOW() AND processedAt IS NULL AND mode = live
    DB-->>Worker: List of matured investments awaiting processing (batch)

    alt No matured investments found
        Worker->>Worker: Log "No matured investments to process", exit
    end

    loop For each matured investment (sequential processing)
        Worker->>DB: BEGIN TRANSACTION
        Worker->>DB: SELECT Investment WHERE id = investmentId FOR UPDATE (pessimistic lock)
        Worker->>DB: SELECT Investment WHERE id AND processedAt IS NULL (re-check idempotency)

        alt Already processed (race condition)
            Worker->>DB: ROLLBACK
            Worker->>Worker: Skip to next investment
        end

        Worker->>DB: UPDATE Investment SET processedAt = NOW() WHERE id = investmentId (set guard before processing)

        Worker->>DB: SELECT InvestmentPlan WHERE id = investment.planId
        DB-->>Worker: Plan details (returnRate, durationHours, name)

        Worker->>Worker: Calculate return:
        Worker->>Worker:   durationDays = plan.durationHours / 24
        Worker->>Worker:   dailyReturn = plan.returnRate / 100 (e.g., 0.5% = 0.005)
        Worker->>Worker:   totalReturn = principalAmount * dailyReturn * durationDays

        Worker->>DB: UPDATE Investment SET status = matured, actualReturn = totalReturn, maturedAt = NOW(), totalCredited = principalAmount + totalReturn

        Worker->>WalletSvc: creditWallet(userId, principalAmount + totalReturn, mode: live, source: investment_return)
        WalletSvc->>DB: UPDATE Wallet SET available = available + (principalAmount + totalReturn), balance = balance + (principalAmount + totalReturn) WHERE userId = userId AND mode = live
        WalletSvc->>DB: INSERT Transaction (userId, type: investment_return, amount: principalAmount + totalReturn, mode: live, referenceId: investmentId, status: completed, description: "Return from {planName} investment")

        Worker->>DB: INSERT PayoutRecord (investmentId, userId, planId, principalAmount, returnAmount: totalReturn, totalCredited, payoutDate: NOW(), mode: live)

        Worker->>DB: INSERT AuditLog (action: investment_matured, actor: system, entity: investmentId, metadata: { planName, principal, return: totalReturn, total, durationDays })

        Worker->>DB: COMMIT

        Note over Worker,NotifSvc: --- Post-Maturity Side Effects (outside transaction) ---

        Worker->>NotifSvc: triggerNotification(userId, 'investment_matured', { planName, principalAmount, returnAmount: totalReturn, totalCredited, maturityDate })

        Worker->>RefSvc: processInvestmentReturnCommission(userId, investmentId, totalReturn)
        RefSvc->>DB: SELECT User.referredBy WHERE id = userId
        alt User was referred
            RefSvc->>RefSvc: Calculate 10% return commission: totalReturn * 0.10
            RefSvc->>WalletSvc: creditWallet(referrerId, commissionAmount, mode: live, source: referral_return_commission)
            WalletSvc->>DB: UPDATE Wallet SET available = available + commissionAmount, balance = balance + commissionAmount WHERE userId = referrerId AND mode = live
            WalletSvc->>DB: INSERT Transaction (userId: referrerId, type: commission, amount: commissionAmount, mode: live, referenceType: investment_return, referenceId: investmentId, status: completed)
            RefSvc->>DB: INSERT Commission (referrerId, referredId, type: direct_return, amount: commissionAmount, sourceInvestmentId: investmentId)
            RefSvc->>NotifSvc: triggerNotification(referrerId, 'referral_commission', { amount: commissionAmount, source: investment_return, referredUser: userName })
        end

        Worker->>Worker: Log successful processing: investmentId, userId, principal, return, totalCredited
    end

    Worker->>Worker: Log batch summary: processed N investments, total returns: $X, total commissions: $Y
```

### Step-by-Step Description

1. **Scheduled Trigger:** The maturity worker is invoked by a cron scheduler every 1 minute. This frequency ensures timely processing even for the shortest plan (Basic: 24 hours) while keeping the query load manageable.

2. **Batch Retrieval:** The worker queries for all investments that are `active`, have reached their `expectedMaturityAt` timestamp, and have not been processed (`processedAt IS NULL`). The `mode = live` filter ensures only real-money investments are processed.

3. **Idempotency Guard:** Each investment is processed within a database transaction with a `FOR UPDATE` lock. The `processedAt` timestamp is set immediately at the start of processing as a guard against concurrent worker instances or retries processing the same investment twice.

4. **Return Calculation:** The return is calculated using the formula: `Principal × (Daily Return Rate / 100) × Duration in Days`. For example, a $5,000 Gold plan investment (7 days, 0.5% daily) would yield: $5,000 × 0.005 × 7 = $175.00 return, with a total credit of $5,175.00.

5. **Wallet Crediting:** Both the principal and the return are credited to the user's Live wallet available balance. A Transaction record is created for the credit, and a PayoutRecord captures the full details of the maturity event for reporting and audit purposes.

6. **Referral Commission Processing:** After the main transaction commits, the referral commission pipeline is triggered. A 10% commission on the return amount is calculated for the user's referrer and credited to the referrer's Live wallet. This is performed outside the main transaction to isolate commission failures from the core maturity processing.

7. **Notification Dispatch:** The investing user receives an in-app notification and email with the maturity details (plan name, principal, return, total credited). The referrer receives a commission notification if applicable.

8. **Batch Summary:** After processing all matured investments, the worker logs a summary of the batch (count, total returns, total commissions) for operational monitoring and alerting.

---

## 10. Admin Approval Flows

Administrators serve as the human-in-the-loop for three critical approval workflows: deposit verification, withdrawal processing, and KYC review. Each flow follows a consistent pattern of queue retrieval, review, decision, and downstream effect execution, with full audit logging.

### 10.1 Deposit Approval Flow

```mermaid
sequenceDiagram
    participant Admin as Admin Dashboard
    participant FE as Frontend
    participant API as API Layer
    participant DepSvc as DepositService
    participant WalletSvc as WalletService
    participant RefSvc as ReferralService
    participant NotifSvc as NotificationService
    participant DB as Database

    Admin->>FE: Navigates to Deposit Verification Queue
    FE->>API: GET /api/v1/admin/deposits?status=confirmed,pending_verification&page=1&limit=20
    API->>DB: SELECT Deposit WHERE status IN ('confirmed', 'pending_verification') AND mode = live ORDER BY createdAt ASC
    DB-->>API: Paginated deposits with user info, amounts, txHash, card details
    API-->>FE: 200 { success: true, data: [...], meta: { total, page, ... } }

    FE->>Admin: Display queue with filters (status, type: crypto/gift_card, date range)

    Admin->>FE: Clicks on a deposit to view details
    FE->>API: GET /api/v1/admin/deposits/{id}
    API->>DB: SELECT Deposit, User, Transaction WHERE Deposit.id
    DB-->>API: Full deposit details with user profile, submission history, fraud score
    API-->>FE: Deposit detail view

    alt Approve
        Admin->>FE: Clicks "Approve"
        FE->>API: POST /api/v1/admin/deposits/{id}/approve
        API->>DepSvc: approveDeposit(depositId, adminId)
        DepSvc->>DB: Validate deposit status, update to completed
        DepSvc->>WalletSvc: creditWallet(userId, amount, mode: live)
        DepSvc->>RefSvc: processDepositCommission(userId, amount)
        DepSvc->>DB: INSERT AuditLog (action: deposit_approved, actor: adminId, ...)
        DepSvc->>NotifSvc: triggerNotification(userId, 'deposit_completed', ...)
        DepSvc-->>API: Success
        API-->>FE: 200 { success: true }
    end

    alt Reject
        Admin->>FE: Clicks "Reject", enters reason
        FE->>API: POST /api/v1/admin/deposits/{id}/reject { reason }
        API->>DepSvc: rejectDeposit(depositId, adminId, reason)
        DepSvc->>DB: UPDATE Deposit SET status = rejected, rejectionReason = reason
        DepSvc->>DB: UPDATE Transaction SET status = failed
        DepSvc->>DB: INSERT AuditLog (action: deposit_rejected, actor: adminId, ...)
        DepSvc->>NotifSvc: triggerNotification(userId, 'deposit_rejected', { reason })
        DepSvc-->>API: Success
        API-->>FE: 200 { success: true }
    end
```

### 10.2 Withdrawal Approval Flow

```mermaid
sequenceDiagram
    participant Admin as Admin Dashboard
    participant FE as Frontend
    participant API as API Layer
    participant WdSvc as WithdrawalService
    participant WalletSvc as WalletService
    participant NotifSvc as NotificationService
    participant DB as Database
    participant Ext as External (Blockchain)

    Admin->>FE: Navigates to Withdrawal Approval Queue
    FE->>API: GET /api/v1/admin/withdrawals?status=pending_approval&page=1&limit=20
    API->>DB: SELECT Withdrawal WHERE status = pending_approval AND mode = live ORDER BY amount DESC
    DB-->>API: Pending withdrawals with user KYC level, account age, lifetime deposits, risk flags
    API-->>FE: 200 { success: true, data: [...] }

    FE->>Admin: Display queue sorted by amount, highlight risk indicators

    alt Approve
        Admin->>FE: Reviews user profile, clicks "Approve"
        FE->>API: POST /api/v1/admin/withdrawals/{id}/approve
        API->>WdSvc: approveWithdrawal(withdrawalId, adminId)
        WdSvc->>DB: UPDATE Withdrawal SET status = processing, approvedBy = adminId
        WdSvc->>Ext: Initiate crypto transfer (netAmount → destinationAddress)
        Ext-->>WdSvc: txHash
        WdSvc->>DB: UPDATE Withdrawal SET status = completed, txHash, completedAt = NOW()
        WdSvc->>DB: UPDATE Wallet SET pending = pending - grossAmount
        WdSvc->>DB: UPDATE Transaction SET status = completed
        WdSvc->>DB: INSERT AuditLog (action: withdrawal_approved_and_completed, actor: adminId, ...)
        WdSvc->>NotifSvc: triggerNotification(userId, 'withdrawal_completed', { txHash })
        WdSvc-->>API: Success
        API-->>FE: 200 { success: true }
    end

    alt Reject
        Admin->>FE: Clicks "Reject", enters reason
        FE->>API: POST /api/v1/admin/withdrawals/{id}/reject { reason }
        API->>WdSvc: rejectWithdrawal(withdrawalId, adminId, reason)
        WdSvc->>DB: UPDATE Withdrawal SET status = rejected, rejectionReason = reason
        WdSvc->>DB: UPDATE Wallet SET pending = pending - grossAmount, available = available + grossAmount
        WdSvc->>DB: UPDATE Transaction SET status = reversed
        WdSvc->>DB: INSERT AuditLog (action: withdrawal_rejected, actor: adminId, ...)
        WdSvc->>NotifSvc: triggerNotification(userId, 'withdrawal_rejected', { reason, returnedAmount })
        WdSvc-->>API: Success
        API-->>FE: 200 { success: true }
    end
```

### 10.3 KYC Approval/Rejection Flow

```mermaid
sequenceDiagram
    participant Admin as Admin Dashboard
    participant FE as Frontend
    participant API as API Layer
    participant KycSvc as KYCService
    participant NotifSvc as NotificationService
    participant DB as Database

    Admin->>FE: Navigates to KYC Review Queue
    FE->>API: GET /api/v1/admin/kyc?status=pending_review&page=1&limit=20
    API->>DB: SELECT KYCSubmission WHERE status = pending_review ORDER BY submittedAt ASC
    DB-->>API: Submissions with user info, document URLs, current KYC level
    API-->>FE: 200 { success: true, data: [...] }

    FE->>Admin: Display queue with document thumbnails

    Admin->>FE: Clicks submission to review documents in lightbox
    FE->>API: GET /api/v1/admin/kyc/{submissionId}
    API->>DB: SELECT KYCSubmission, KYCDocument, User WHERE submissionId
    DB-->>API: Full submission with documents, user profile, previous submission history
    API-->>FE: Full detail view with side-by-side document comparison

    alt Approve
        Admin->>FE: Reviews documents, clicks "Approve"
        FE->>API: POST /api/v1/admin/kyc/{submissionId}/approve
        API->->KycSvc: approveKYC(submissionId, adminId)
        KycSvc->>DB: UPDATE KYCSubmission SET status = approved, reviewedBy = adminId, reviewedAt = NOW()
        KycSvc->>DB: UPDATE User SET kycLevel = targetLevel WHERE id = userId
        KycSvc->>DB: INSERT AuditLog (action: kyc_approved, actor: adminId, ...)
        KycSvc->>NotifSvc: triggerNotification(userId, 'kyc_approved', { newLevel, unlockedFeatures })
        KycSvc-->>API: Success
        API-->>FE: 200 { success: true }
    end

    alt Reject
        Admin->>FE: Selects reason code, enters explanation, clicks "Reject"
        FE->>API: POST /api/v1/admin/kyc/{submissionId}/reject { reasonCode, explanation }
        API->->KycSvc: rejectKYC(submissionId, adminId, reasonCode, explanation)
        KycSvc->>DB: UPDATE KYCSubmission SET status = rejected, reviewedBy = adminId, reviewedAt = NOW(), rejectionReasonCode, rejectionExplanation
        KycSvc->->DB: INSERT AuditLog (action: kyc_rejected, actor: adminId, ...)
        KycSvc->->NotifSvc: triggerNotification(userId, 'kyc_rejected', { reasonCode, explanation, reuploadLink })
        KycSvc-->>API: Success
        API-->>FE: 200 { success: true }
    end

    alt Request Additional Documents
        Admin->>FE: Clicks "Request More Info", specifies which documents needed
        FE->>API: POST /api/v1/admin/kyc/{submissionId}/request-info { requiredDocuments: ["proof_of_address"], message }
        API->->KycSvc: requestAdditionalDocuments(submissionId, adminId, requiredDocuments, message)
        KycSvc->>DB: UPDATE KYCSubmission SET status = info_requested, additionalDocumentsRequested, adminMessage
        KycSvc->->DB: INSERT AuditLog (action: kyc_info_requested, actor: adminId, ...)
        KycSvc->->NotifSvc: triggerNotification(userId, 'kyc_info_requested', { requiredDocuments, message })
        KycSvc-->>API: Success
        API-->>FE: 200 { success: true }
    end
```

### Admin Flow Summary

| Flow | Trigger | Review Criteria | Approval Effect | Rejection Effect |
|------|---------|----------------|-----------------|------------------|
| **Deposit** | Crypto confirmed / Gift card submitted | Valid blockchain tx, correct amount, no fraud indicators | Credit wallet, trigger referral commission | Mark as failed, notify user with reason |
| **Withdrawal** | User submits withdrawal request | KYC level, account age, risk flags, sufficient balance | Initiate crypto transfer, complete withdrawal | Return funds to available balance, notify user |
| **KYC** | User submits verification documents | Document authenticity, readable info, facial match, sanctions check | Upgrade KYC level, unlock features | Notify user with reason, allow re-submission |

All admin actions are recorded in the immutable AuditLog with the admin's identity, timestamp, IP address, and the full context of the decision (what was approved/rejected, the reason, and any metadata).

---

## 11. Notification Flow

The notification system is the platform's event-driven communication layer. It generates in-app notifications and email notifications in response to platform events, respecting user preferences and channel-specific delivery requirements.

### 11.1 Notification Event Matrix

| Event Category | Event | In-App | Email | Admin Notification |
|---------------|-------|--------|-------|-------------------|
| **Account** | Registration completed | Yes | Yes (verification email) | No |
| **Account** | Email verified | Yes | Yes | No |
| **Account** | Password changed | Yes | Yes (mandatory) | No |
| **Account** | New login detected | Yes | Yes (mandatory) | No |
| **Account** | 2FA enabled/disabled | Yes | Yes (mandatory) | No |
| **Account** | Account locked | No | Yes | No |
| **Deposit** | Crypto deposit detected | Yes | Yes | No |
| **Deposit** | Deposit confirmed & credited | Yes | Yes | No |
| **Deposit** | Gift card submitted | Yes | Yes | Yes (admin queue) |
| **Deposit** | Gift card rejected | Yes | Yes | No |
| **Investment** | Investment activated | Yes | Yes | No |
| **Investment** | Investment matured | Yes | Yes | No |
| **Withdrawal** | Withdrawal requested | Yes | Yes | Yes (admin queue) |
| **Withdrawal** | Withdrawal approved | Yes | Yes | No |
| **Withdrawal** | Withdrawal completed | Yes | Yes (with txHash) | No |
| **Withdrawal** | Withdrawal rejected | Yes | Yes | No |
| **KYC** | KYC submitted | Yes | Yes | Yes (admin queue) |
| **KYC** | KYC approved | Yes | Yes | No |
| **KYC** | KYC rejected | Yes | Yes | No |
| **KYC** | Additional docs requested | Yes | Yes | No |
| **Referral** | Direct commission credited | Yes | Yes | No |
| **Referral** | Binary bonus credited | Yes | Yes | No |
| **Support** | Ticket response received | Yes | Yes (if enabled) | No |
| **System** | Scheduled maintenance | Yes | Yes | Yes |
| **Admin** | New KYC pending | No | Yes | Yes |
| **Admin** | New withdrawal pending | No | Yes | Yes |
| **Admin** | New gift card pending | No | Yes | Yes |
| **Admin** | Suspicious activity alert | No | Yes | Yes |

### 11.2 Notification Processing Flow

```mermaid
sequenceDiagram
    participant Source as Event Source (Service/Worker)
    participant NotifSvc as NotificationService
    participant PrefSvc as PreferenceService
    participant DB as Database
    participant EmailQ as Email Queue (Redis)
    participant EmailW as Email Worker
    participant Ext as External (Resend)

    Source->>NotifSvc: triggerNotification(userId, eventType, metadata)
    NotifSvc->>PrefSvc: getNotificationPreferences(userId, eventType)
    PrefSvc->>DB: SELECT NotificationPreference WHERE userId AND eventType
    DB-->>PrefSvc: Preferences { inApp: true/false, email: true/false }
    PrefSvc-->>NotifSvc: Channel preferences

    alt In-App notification enabled
        NotifSvc->>DB: INSERT Notification (userId, type: eventType, title, message, metadata, isRead: false, createdAt: NOW())
        NotifSvc->>DB: UPDATE User SET unreadNotificationCount = unreadNotificationCount + 1 WHERE id = userId
        Note over DB: Notification stored and unread count incremented
    end

    alt Email notification enabled
        NotifSvc->>NotifSvc: Resolve email template for eventType
        NotifSvc->>NotifSvc: Interpolate template with metadata (user name, amounts, dates)
        NotifSvc->>EmailQ: RPUSH email:queue { to: userEmail, subject, templateId, templateData, priority }
        Note over EmailQ: Email job enqueued for async processing
    end

    alt Admin notification required
        NotifSvc->>DB: INSERT Notification (targetType: admin, type: eventType, title, message, metadata, isRead: false)
        NotifSvc->>EmailQ: RPUSH email:admin:queue { to: adminEmail, subject, templateId, templateData, priority: high }
    end

    Note over EmailQ,Ext: --- Async Email Processing ---

    loop Email Worker (polls queue every 5 seconds)
        EmailW->>EmailQ: LPOP email:queue
        alt Email job available
            EmailQ-->>EmailW: { to, subject, templateId, templateData, priority }
            EmailW->>EmailW: Render email using React Email template
            EmailW->>Ext: POST /emails { to, from, subject, html, text }
            alt Email sent successfully
                Ext-->>EmailW: 200 { id: emailId }
                EmailW->>DB: INSERT EmailLog (userId, to, subject, templateId, emailProviderId: emailId, status: sent, sentAt: NOW())
            else Email failed (rate limit, bounce, etc.)
                Ext-->>EmailW: 4xx/5xx error
                EmailW->>DB: INSERT EmailLog (userId, to, subject, templateId, status: failed, error, createdAt: NOW())
                EmailW->>EmailQ: RPUSH email:queue:retry { ... } (with retry count + backoff)
            end
        end
    end

    Note over DB,Source: --- Real-Time In-App Delivery (SSE) ---

    loop SSE Connection
        FE->>API: GET /api/v1/notifications/stream (SSE connection)
        API->>DB: LISTEN notification_channel (PostgreSQL NOTIFY/LISTEN or Redis pub/sub)
        Note over DB: When new notification is INSERTed for this user
        DB-->>API: NOTIFY notification_channel { userId, notificationId }
        API-->>FE: SSE event: { type: "notification", data: { id, title, message, type, createdAt } }
        FE->>FE: Update notification bell count, display toast
    end
```

### 11.3 Notification Delivery Details

**In-App Notifications:**
- Stored in the `Notification` table with `isRead: false` by default
- Delivered in real-time via Server-Sent Events (SSE) to connected clients
- Displayed as a toast/banner for high-priority events (deposit confirmed, investment matured)
- The notification bell icon in the navigation shows the unread count
- Users can mark individual notifications as read or mark all as read
- Notifications persist indefinitely in the database and are never deleted

**Email Notifications:**
- Rendered using React Email templates matching the platform's visual identity
- Enqueued in Redis for asynchronous processing by the email worker
- The email worker processes the queue every 5 seconds with batch processing support
- Failed emails are retried with exponential backoff (3 retries over 15 minutes)
- Security emails (login alerts, password changes) are mandatory and cannot be disabled
- Users can configure preferences per event category and per channel

**Admin Notifications:**
- Operational events (new KYC, new withdrawals, suspicious activity) trigger both in-app admin notifications and emails
- Admin in-app notifications appear in the admin dashboard's notification center
- High-priority admin emails (large withdrawals, fraud alerts) are sent immediately with high priority in the queue

---

## 12. Data Entity Relationship Overview

The following flowchart illustrates how data moves between the primary entities in the TeslaPrimeCapital platform. Each entity box represents a database table or external system, and the arrows show the direction and nature of data flow.

```mermaid
flowchart TB
    subgraph External Systems
        Blockchain["External<br/>Blockchain Nodes"]
        PriceOracle["External<br/>Price Oracle"]
        Cloudinary["External<br/>Cloudinary"]
        Resend["External<br/>Resend Email"]
    end

    subgraph Core Entities
        User["User<br/>──────────────<br/>id, email, passwordHash<br/>kycLevel, status<br/>referredBy, referralCode<br/>tokenVersion"]
        Wallet["Wallet<br/>──────────────<br/>id, userId, mode<br/>balance, available, pending<br/>(mode: demo/live)"]
        InvestmentPlan["InvestmentPlan<br/>──────────────<br/>id, name, tier<br/>minDeposit, maxDeposit<br/>durationHours, returnRate<br/>requiredKycLevel, isActive"]
        Investment["Investment<br/>──────────────<br/>id, userId, planId<br/>principalAmount<br/>expectedReturn, actualReturn<br/>expectedMaturityAt<br/>status, mode, processedAt"]
        Deposit["Deposit<br/>──────────────<br/>id, userId, type<br/>currency, txHash<br/>cryptoAmount, usdAmount<br/>brand, faceValue<br/>status, mode"]
        Withdrawal["Withdrawal<br/>──────────────<br/>id, userId<br/>grossAmount, feeAmount<br/>netAmount, destination<br/>txHash, status, mode"]
        Commission["Commission<br/>──────────────<br/>id, referrerId<br/>referredId, type<br/>amount, sourceDepositId<br/>sourceInvestmentId"]
        ReferralTree["ReferralTree<br/>──────────────<br/>id, parentId<br/>childId, leg, depth<br/>weeklyVolume<br/>carriedVolume"]
        KYCSubmission["KYCSubmission<br/>──────────────<br/>id, userId<br/>targetLevel, status<br/>submittedAt, reviewedAt<br/>rejectionReason"]
        Transaction["Transaction<br/>──────────────<br/>id, userId, type<br/>amount, mode<br/>referenceId, status<br/>description, createdAt"]
        Notification["Notification<br/>──────────────<br/>id, userId/targetType<br/>type, title, message<br/>isRead, metadata"]
        AuditLog["AuditLog<br/>──────────────<br/>id, action, actor<br/>entity, entityId<br/>metadata, timestamp<br/>(immutable)"]
        PayoutRecord["PayoutRecord<br/>──────────────<br/>id, investmentId<br/>userId, principalAmount<br/>returnAmount, totalCredited<br/>payoutDate, mode"]
    end

    %% Registration flow
    User -- "1:1" --> Wallet
    User -- "1:N" --> Investment
    User -- "1:N" --> Deposit
    User -- "1:N" --> Withdrawal
    User -- "1:N" --> KYCSubmission
    User -- "1:N" --> Transaction
    User -- "1:N" --> Notification

    %% Investment flow
    InvestmentPlan -- "1:N" --> Investment
    Investment -- "1:1" --> PayoutRecord
    Investment -- "references" --> Wallet
    Investment -- "creates" --> Transaction

    %% Deposit flow
    Deposit -- "credits" --> Wallet
    Deposit -- "creates" --> Transaction
    Deposit -- "triggers" --> Commission

    %% Withdrawal flow
    Withdrawal -- "deducts from" --> Wallet
    Withdrawal -- "creates" --> Transaction

    %% Referral flow
    ReferralTree -- "parent→child" --> User
    User -- "referredBy→" --> ReferralTree
    Commission -- "referrer earns" --> Wallet
    Deposit -- "10% commission" --> Commission
    Investment -- "10% return commission" --> Commission
    Commission -- "creates" --> Transaction

    %% KYC flow
    KYCSubmission -- "upgrades" --> User

    %% Notification flow
    Deposit -- "triggers" --> Notification
    Investment -- "triggers" --> Notification
    Withdrawal -- "triggers" --> Notification
    Commission -- "triggers" --> Notification
    KYCSubmission -- "triggers" --> Notification

    %% Audit flow
    User -- "logged in" --> AuditLog
    Deposit -- "logged in" --> AuditLog
    Withdrawal -- "logged in" --> AuditLog
    KYCSubmission -- "logged in" --> AuditLog
    Investment -- "logged in" --> AuditLog

    %% External integrations
    Blockchain -- "tx detection" --> Deposit
    Blockchain -- "tx broadcast" --> Withdrawal
    PriceOracle -- "rate feeds" --> Deposit
    Cloudinary -- "stores" --> KYCSubmission
    Cloudinary -- "stores" --> Deposit
    Notification -- "delivered via" --> Resend

    %% Style
    style User fill:#1a1a2e,stroke:#e94560,color:#fff
    style Wallet fill:#1a1a2e,stroke:#e94560,color:#fff
    style Investment fill:#1a1a2e,stroke:#e94560,color:#fff
    style Deposit fill:#1a1a2e,stroke:#e94560,color:#fff
    style Withdrawal fill:#1a1a2e,stroke:#e94560,color:#fff
    style Commission fill:#1a1a2e,stroke:#e94560,color:#fff
    style ReferralTree fill:#1a1a2e,stroke:#e94560,color:#fff
    style AuditLog fill:#16213e,stroke:#0f3460,color:#fff
    style Notification fill:#16213e,stroke:#0f3460,color:#fff
    style Transaction fill:#16213e,stroke:#0f3460,color:#fff
```

### Entity Relationship Summary

| Relationship | Cardinality | Description |
|-------------|-------------|-------------|
| User → Wallet | 1:2 | Each user has exactly two wallets (Demo and Live) |
| User → Investment | 1:N | A user can have multiple active and historical investments |
| User → Deposit | 1:N | A user can have multiple deposits across methods |
| User → Withdrawal | 1:N | A user can have multiple withdrawal requests |
| User → KYCSubmission | 1:N | A user can have multiple KYC submissions (re-submissions after rejection) |
| User → Transaction | 1:N | All financial events create Transaction records |
| User → Notification | 1:N | All notifications are scoped to a user |
| InvestmentPlan → Investment | 1:N | A plan can have many investments from different users |
| Investment → PayoutRecord | 1:1 | Each matured investment generates one payout record |
| User → ReferralTree | 1:N | A user can have many nodes in the referral tree (as parent or child) |
| Deposit → Commission | 1:1 | Each deposit may trigger one direct commission |
| Investment → Commission | 1:1 | Each matured investment may trigger one return commission |
| ReferralTree → Commission | N:1 | Binary bonuses aggregate from tree volumes |

### Data Flow Patterns by Entity

- **Wallet:** Acts as the central ledger for each user-mode combination. All credits (deposits, returns, commissions) and debits (investments, withdrawals) flow through the wallet's `available` and `pending` balances. The `balance` field represents total funds (available + pending + invested).
- **Transaction:** An immutable log of every financial movement. Each record has a `referenceId` linking it to the source entity (Deposit, Investment, Withdrawal, Commission) and a `status` field tracking the lifecycle (pending → completed → reversed).
- **AuditLog:** An immutable, append-only log of all significant platform actions. Entries cannot be edited or deleted. Used for compliance, debugging, and dispute resolution.
- **Commission:** Tracks both direct referral commissions (10% on deposits and returns) and binary bonuses. Each record links to the source event (deposit or investment) and the referrer who earned it.

---

## 13. Demo Mode Data Flow

Demo mode provides a fully functional simulated environment that mirrors the Live platform experience without involving real money, real blockchain transactions, or KYC verification. The two modes share the same codebase, API structure, and UI, but are strictly isolated at the data layer.

### 13.1 Demo Mode Isolation Architecture

```mermaid
flowchart TB
    subgraph User Request
        Request["User Action<br/>(Frontend)"]
    end

    subgraph API Layer
        API["API Controller<br/>──────────────<br/>Extracts 'mode' parameter<br/>from request body or<br/>user's active mode"]
    end

    subgraph Data Access Layer
        DAL["Repository / ORM Layer<br/>──────────────<br/>ALL queries include<br/>WHERE mode = :mode<br/>Enforced at data access level"]
    end

    subgraph Database
        DemoWallet["Wallet<br/>mode = 'demo'"]
        LiveWallet["Wallet<br/>mode = 'live'"]
        DemoInvest["Investment<br/>mode = 'demo'"]
        LiveInvest["Investment<br/>mode = 'live'"]
        DemoTxn["Transaction<br/>mode = 'demo'"]
        LiveTxn["Transaction<br/>mode = 'live'"]
        DemoDep["Deposit<br/>mode = 'demo'"]
        LiveDep["Deposit<br/>mode = 'live'"]
        DemoWd["Withdrawal<br/>mode = 'demo'"]
        LiveWd["Withdrawal<br/>mode = 'live'"]
    end

    Request --> API --> DAL

    DAL -- "mode = 'demo'" --> DemoWallet
    DAL -- "mode = 'demo'" --> DemoInvest
    DAL -- "mode = 'demo'" --> DemoTxn
    DAL -- "mode = 'demo'" --> DemoDep
    DAL -- "mode = 'demo'" --> DemoWd

    DAL -- "mode = 'live'" --> LiveWallet
    DAL -- "mode = 'live'" --> LiveInvest
    DAL -- "mode = 'live'" --> LiveTxn
    DAL -- "mode = 'live'" --> LiveDep
    DAL -- "mode = 'live'" --> LiveWd

    style DemoWallet fill:#1a3a1a,stroke:#4caf50,color:#fff
    style DemoInvest fill:#1a3a1a,stroke:#4caf50,color:#fff
    style DemoTxn fill:#1a3a1a,stroke:#4caf50,color:#fff
    style DemoDep fill:#1a3a1a,stroke:#4caf50,color:#fff
    style DemoWd fill:#1a3a1a,stroke:#4caf50,color:#fff
    style LiveWallet fill:#1a1a2e,stroke:#e94560,color:#fff
    style LiveInvest fill:#1a1a2e,stroke:#e94560,color:#fff
    style LiveTxn fill:#1a1a2e,stroke:#e94560,color:#fff
    style LiveDep fill:#1a1a2e,stroke:#e94560,color:#fff
    style LiveWd fill:#1a1a2e,stroke:#e94560,color:#fff
```

### 13.2 Demo Mode Data Flow Rules

| Aspect | Demo Mode | Live Mode |
|--------|-----------|-----------|
| **Starting Balance** | Configurable (default: $10,000) credited on registration | $0 — must deposit real funds |
| **Deposit Method** | Simulated — user selects type and enters amount, funds credited instantly | Real crypto (blockchain) or gift card (admin review) |
| **Investment Plans** | Same 4 tiers, same durations, same return rates | Same 4 tiers, same durations, same return rates |
| **Investment Returns** | Same calculation formula, simulated | Same calculation formula, real money |
| **Withdrawals** | Simulated — 21% fee displayed, no real payout, funds returned to Demo wallet | Real crypto transfer to user's wallet, 21% fee deducted |
| **KYC Required** | No — all plan tiers accessible without KYC | Yes — Level 1 for Basic, Level 2 for Silver/Gold, Level 3 for Platinum |
| **Referral Commissions** | Referral relationships are real, but Demo deposit/return commissions are credited to Demo wallet (if configured) | All commissions credited to Live wallet |
| **Admin Queues** | Not displayed — no admin review needed | Deposits, withdrawals, KYC displayed for admin action |
| **Notifications** | Same events, prefixed with "Demo:" indicator | Standard notifications |
| **Data Isolation** | All records have `mode = 'demo'` — never included in Live queries | All records have `mode = 'live'` — never mixed with Demo |

### 13.3 Simulated Crypto Deposit Flow (Demo Mode)

```mermaid
sequenceDiagram
    actor User
    participant FE as Frontend
    participant API as API Layer
    participant DepSvc as DepositService
    participant WalletSvc as WalletService
    participant DB as Database

    User->>FE: In Demo mode, navigates to Deposit, selects BTC
    FE->>API: POST /api/v1/deposits/demo { currency: BTC, amount: 500 }
    API->>DepSvc: createDemoDeposit(userId, currency, amount)
    DepSvc->>DepSvc: Validate mode is 'demo'
    DepSvc->>DepSvc: Validate amount >= $10 minimum

    DepSvc->>DB: BEGIN TRANSACTION
    DepSvc->>DB: INSERT Deposit (userId, type: crypto, currency: BTC, cryptoAmount: simulated, usdAmount: 500.00, status: completed, mode: demo, completedAt: NOW())
    DepSvc->>WalletSvc: creditWallet(userId, 500.00, mode: demo, source: demo_deposit)
    WalletSvc->>DB: UPDATE Wallet SET available = available + 500.00, balance = balance + 500.00 WHERE userId AND mode = demo
    WalletSvc->>DB: INSERT Transaction (userId, type: deposit, amount: 500.00, mode: demo, referenceId: depositId, status: completed, description: "Demo BTC deposit")
    DepSvc->>DB: COMMIT

    DepSvc-->>API: Demo deposit completed instantly
    API-->>FE: 201 { success: true, data: { depositId, amount: 500.00, status: completed, mode: demo } }
    FE->>User: Display "Demo deposit of $500.00 credited successfully"
```

### 13.4 Demo Investment Flow

```mermaid
sequenceDiagram
    actor User
    participant FE as Frontend
    participant API as API Layer
    participant InvSvc as InvestmentService
    participant WalletSvc as WalletService
    participant DB as Database
    participant Worker as Background Worker

    User->>FE: In Demo mode, selects Gold plan, enters $10,000
    FE->>API: POST /api/v1/investments { planId, amount: 10000, mode: demo }
    API->>InvSvc: createInvestment(userId, planId, 10000, demo)
    InvSvc->>DB: SELECT Wallet WHERE userId AND mode = demo
    DB-->>InvSvc: Available balance: $10,500 (initial $10,000 + $500 deposit)

    InvSvc->>DB: BEGIN TRANSACTION
    InvSvc->>DB: UPDATE Wallet SET available = available - 10000, balance = balance - 10000 WHERE userId AND mode = demo
    InvSvc->>DB: INSERT Investment (userId, planId, principalAmount: 10000, expectedReturn: 350.00, expectedMaturityAt: NOW() + 7 days, status: active, mode: demo)
    InvSvc->>DB: INSERT Transaction (userId, type: investment, amount: -10000, mode: demo, status: completed)
    InvSvc->->DB: COMMIT

    InvSvc-->>API: Demo investment created
    API-->>FE: 201 { success: true, data: { investmentId, status: active, maturityDate } }
    FE->>User: Display active demo investment with countdown

    Note over Worker,DB: --- Demo Maturity (Same background worker) ---

    Worker->>DB: SELECT Investment WHERE status = active AND expectedMaturityAt <= NOW() AND processedAt IS NULL AND mode = demo
    DB-->>Worker: Matured demo investments

    Worker->>DB: BEGIN TRANSACTION
    Worker->>DB: UPDATE Investment SET status = matured, actualReturn: 350.00, processedAt: NOW()
    Worker->>DB: UPDATE Wallet SET available = available + 10350.00, balance = balance + 10350.00 WHERE userId AND mode = demo
    Worker->>DB: INSERT Transaction (userId, type: investment_return, amount: 10350.00, mode: demo, status: completed)
    Worker->>DB: INSERT PayoutRecord (investmentId, userId, principal: 10000, return: 350, total: 10350, mode: demo)
    Worker->>DB: COMMIT

    Worker-->>Worker: Demo maturity processed (no referral commissions in demo)
```

### 13.5 Demo Withdrawal Flow

```mermaid
sequenceDiagram
    actor User
    participant FE as Frontend
    participant API as API Layer
    participant WdSvc as WithdrawalService
    participant WalletSvc as WalletService
    participant DB as Database

    User->>FE: In Demo mode, enters withdrawal amount: $1,000
    FE->>FE: Calculate: fee = $210, net = $790
    FE->>User: Display: "Withdraw: $1,000 | Fee (21%): $210 | You Receive: $790 (Demo)"

    User->>FE: Confirms withdrawal
    FE->>API: POST /api/v1/withdrawals { amount: 1000, destinationAddress: "demo_address", mode: demo }
    API->>WdSvc: createDemoWithdrawal(userId, 1000, mode: demo)
    WdSvc->>WdSvc: Skip KYC check (not required for demo)
    WdSvc->>DB: SELECT Wallet WHERE userId AND mode = demo

    WdSvc->>DB: BEGIN TRANSACTION
    WdSvc->>DB: UPDATE Wallet SET available = available - 1000 WHERE userId AND mode = demo
    WdSvc->->DB: INSERT Withdrawal (userId, grossAmount: 1000, feeAmount: 210, netAmount: 790, status: completed, mode: demo, completedAt: NOW(), note: "Demo withdrawal — no real funds transferred")
    WdSvc->->DB: INSERT Transaction (userId, type: withdrawal, amount: -1000, mode: demo, status: completed, description: "Demo withdrawal (fee: $210, net: $790)")
    WdSvc->->DB: COMMIT

    WdSvc-->>API: Demo withdrawal completed instantly (no admin review)
    API-->>FE: 201 { success: true, data: { withdrawalId, gross: 1000, fee: 210, net: 790, status: completed } }
    FE->>User: Display "Demo withdrawal of $790 (net) processed. No real funds were transferred."
```

### 13.6 Demo Mode Key Implementation Notes

1. **Data Access Enforcement:** The `mode` parameter is enforced at the repository/ORM layer, not at the service layer. Every query that touches a financial table includes `WHERE mode = :mode`. This prevents accidental cross-contamination even if a service method is called with the wrong mode.

2. **No Admin Queues:** Demo deposits, withdrawals, and KYC submissions never appear in admin queues. The admin dashboard exclusively shows `mode = 'live'` data for financial operations. Demo data is only visible in admin user management for understanding user behavior.

3. **No External Integrations:** Demo deposits do not generate blockchain addresses or interact with the price oracle. Demo withdrawals do not initiate crypto transfers. Demo KYC submissions do not upload to Cloudinary or trigger admin reviews. This eliminates all external API costs for demo activity.

4. **No Real Referral Commissions:** While referral relationships are real (established at registration), commissions generated from Demo mode activity are either not credited or credited to the Demo wallet (depending on configuration). Commissions from Live mode activity are always credited to the Live wallet, regardless of the sponsor's current mode.

5. **Background Worker Processing:** The same maturity worker processes both Demo and Live investments, differentiated by the `mode` column. Demo investments are processed identically to Live investments (same return calculation, same wallet crediting) but without triggering referral commissions or external notifications (or with a "Demo:" prefix on notifications).

6. **Mode Switching:** Users can toggle between Demo and Live modes at any time via the navigation bar. The mode switch updates the user's active mode preference and causes all subsequent API calls to use the new mode. The UI immediately reflects the new mode's balances, transactions, and investments.

7. **Reporting Isolation:** All financial reports in the admin dashboard aggregate only `mode = 'live'` data. Demo data is excluded from revenue calculations, platform balance summaries, and compliance reports. Separate demo usage analytics (registration-to-deposit conversion, plan selection patterns) may be tracked for product insights.

---

## Appendix: Data Flow Cross-Reference

| Flow | Trigger | Primary Tables Written | External Dependencies | Admin Involvement | Background Job |
|------|---------|----------------------|----------------------|-------------------|----------------|
| Registration | User submits form | User, Wallet (×2), VerificationToken, ReferralTree | Resend (email) | No | No |
| Crypto Deposit | Blockchain tx detected | Deposit, Wallet, Transaction, Commission, AuditLog | Blockchain nodes, Price Oracle | Yes (approval) | Yes (monitoring, confirmations) |
| Gift Card Deposit | User submits card | Deposit, Wallet, Transaction, Commission, AuditLog | Cloudinary (image storage) | Yes (verification) | No |
| Investment | User selects plan | Investment, Wallet, Transaction, AuditLog | None | No | Yes (maturity processing) |
| Withdrawal | User submits request | Withdrawal, Wallet, Transaction, AuditLog | Blockchain (payout) | Yes (approval) | No |
| Referral Commission | Deposit/investment completes | Commission, Wallet, Transaction, ReferralTree | None | No | Yes (binary bonus) |
| KYC Verification | User submits documents | KYCSubmission, KYCDocument, User, AuditLog | Cloudinary (document storage) | Yes (review) | No |
| Plan Maturity | Cron schedule | Investment, Wallet, Transaction, PayoutRecord, Commission, AuditLog | None | No | Yes (primary trigger) |
| Notification | Any platform event | Notification, EmailLog | Resend (email delivery) | Indirect (admin alerts) | Yes (email worker) |

---

*This document is part of the TeslaPrimeCapital Phase 2 Technical Architecture documentation. All data flows described here are designed for implementation with the technology stack defined in the System Architecture document: Next.js 16 frontend, Node.js API with TypeScript, PostgreSQL database, Redis caching/queuing, and Cloudinary/Resend for external integrations.*