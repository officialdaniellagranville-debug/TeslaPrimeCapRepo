# Feature Inventory

**Project:** Enterprise Investment Platform
**Phase:** 1 — Discovery & Documentation
**Last Updated:** 2025
**Status:** Draft

---

## 1. Feature Overview

This document provides a complete, categorized inventory of every feature the platform must include. Each feature is assigned a unique identifier, a descriptive name, a functional description, a priority level, a target phase, any dependencies on other features, and an estimated implementation complexity.

### Priority Definitions

- **P0 (Must Have):** Required for launch. The platform cannot function without this feature. Blocking if missing.
- **P1 (Should Have):** Important for launch but not strictly blocking. Significant user experience or operational impact if absent.
- **P2 (Nice to Have):** Desirable for launch but can be deferred to a post-launch update without major impact.

### Phase Definitions

- **Launch:** Implemented and available at the initial platform launch.
- **Future:** Planned for a post-launch development cycle. Not a launch blocker.

### Complexity Definitions

- **Low:** Straightforward implementation, well-understood patterns, minimal integration points. Estimated 1–3 days.
- **Medium:** Requires business logic, multiple integration points, or non-trivial UI. Estimated 4–8 days.
- **High:** Complex business logic, multiple system integrations, significant UI complexity, or security-sensitive. Estimated 2+ weeks.

---

## 2. Authentication & Authorization

| ID | Feature | Priority | Phase | Dependencies | Complexity |
|----|---------|----------|-------|-------------|------------|
| F-AUTH-01 | User Registration | P0 | Launch | — | Medium |
| F-AUTH-02 | User Login/Logout | P0 | Launch | F-AUTH-01 | Medium |
| F-AUTH-03 | Email Verification (OTP) | P0 | Launch | F-AUTH-01 | Medium |
| F-AUTH-04 | Password Reset | P0 | Launch | F-AUTH-01, F-NOTIF-02 | Medium |
| F-AUTH-05 | Two-Factor Authentication (TOTP) | P0 | Launch | F-AUTH-02 | High |
| F-AUTH-06 | Session Management (JWT) | P0 | Launch | F-AUTH-02 | High |
| F-AUTH-07 | Device Tracking | P1 | Launch | F-AUTH-06 | Medium |
| F-AUTH-08 | Account Lockout | P0 | Launch | F-AUTH-02 | Low |
| F-AUTH-09 | RBAC System | P0 | Launch | — | High |

### F-AUTH-01: User Registration

Users create an account by providing email, username, password, and optional referral code. The system validates uniqueness of email and username, enforces password strength requirements (minimum 8 characters, uppercase, lowercase, number, special character), hashes the password using bcrypt, creates the user record with KYC Level 0, initializes both demo and live wallets with zero balances, and triggers an email verification OTP (F-AUTH-03). If a valid referral code is provided, the referral relationship is established.

### F-AUTH-02: User Login/Logout

Users authenticate with their email and password. The system verifies credentials against the stored hash, checks account status (active, suspended, locked), and returns JWT access and refresh tokens. Logout invalidates the active refresh token and clears the client-side token storage. Failed login attempts are tracked for the account lockout system (F-AUTH-08).

### F-AUTH-03: Email Verification (OTP)

Upon registration, a 6-digit one-time password (OTP) is generated and sent to the user's email. The OTP expires after a configurable duration (default: 15 minutes). The user enters the OTP on the verification page. Successful verification upgrades the user's KYC level from 0 to 1, enabling deposits and other platform features. Resend functionality allows users to request a new OTP after a cooldown period.

### F-AUTH-04: Password Reset

Users who have forgotten their password request a reset via email. The system generates a secure, single-use token with a configurable expiry (default: 1 hour), stores it hashed in the database, and sends a reset link via email. The user clicks the link, enters a new password (meeting strength requirements), and the password is updated. All existing sessions for the user are revoked. The reset token is invalidated after use or expiry.

### F-AUTH-05: Two-Factor Authentication (TOTP)

Users can enable 2FA from their security settings. The system generates a TOTP secret, displays it as a QR code for scanning with an authenticator app (Google Authenticator, Authy), and provides backup codes (one-time use). Users verify setup by entering a current TOTP code. When 2FA is enabled, the login flow requires both password and TOTP code. Users can disable 2FA by entering a current TOTP code (and optionally re-entering their password). Lost device recovery is handled through backup codes or admin-assisted verification.

### F-AUTH-06: Session Management (JWT)

The session system uses short-lived access tokens (15-minute TTL) and longer-lived refresh tokens (7-day TTL). Access tokens are sent with every API request in the Authorization header. When the access token expires, the client uses the refresh token to obtain a new access token pair. Refresh token rotation invalidates the old refresh token on each use, preventing token theft. Administrators can revoke all sessions for a user. Sessions are tracked in Redis for real-time revocation capability.

### F-AUTH-07: Device Tracking

The system records the device information (user agent, IP address, approximate geolocation) for each login session. Users can view a list of all devices that have active sessions. Suspicious login notifications are sent when a login occurs from a new device or unusual location. Users can manually revoke sessions for specific devices. This feature enhances account security visibility and provides an audit trail for support investigations.

### F-AUTH-08: Account Lockout

After a configurable number of consecutive failed login attempts (default: 5), the account is locked for a configurable duration (default: 30 minutes). Each subsequent failed attempt after unlock increases the lockout duration (exponential backoff). Account lockout status and attempt count are stored in Redis for fast access. An email notification is sent to the user when their account is locked, with instructions for unlocking or contacting support. Administrators can manually unlock accounts.

### F-AUTH-09: RBAC System

Role-based access control defines three primary roles: User, Admin, and Super Admin. Each API endpoint and UI route is annotated with the required role(s). The middleware layer enforces authorization by extracting the user's role from the JWT payload and comparing it against the endpoint's requirements. Permissions are structured hierarchically — Super Admin has all Admin permissions, Admin has all User permissions plus admin-specific operations. Additional custom roles can be defined for specialized admin functions (e.g., KYC Reviewer, Finance Manager) if needed.

---

## 3. User Management

| ID | Feature | Priority | Phase | Dependencies | Complexity |
|----|---------|----------|-------|-------------|------------|
| F-USER-01 | User Profile | P0 | Launch | F-AUTH-01 | Low |
| F-USER-02 | Profile Settings | P0 | Launch | F-USER-01 | Low |
| F-USER-03 | Password Change | P0 | Launch | F-AUTH-02 | Low |
| F-USER-04 | Language Preference | P1 | Launch | — | Low |
| F-USER-05 | Currency Preference | P1 | Launch | — | Low |
| F-USER-06 | Notification Preferences | P1 | Launch | F-NOTIF-01, F-NOTIF-02 | Low |

### F-USER-01: User Profile

The user profile page displays the user's personal information (name, email, username, registration date), KYC verification level and status, wallet balance summary (demo and live), and referral code. The profile is visible to the user in a read-only view from the main profile page, with editable fields accessible through the settings page.

### F-USER-02: Profile Settings

Users can edit their profile information including display name, phone number (optional), and profile avatar (uploaded to Cloudinary, resized and optimized). Changes are persisted immediately with validation. Sensitive fields (email, username) require re-verification if changed to prevent account hijacking.

### F-USER-03: Password Change

Authenticated users can change their password by providing their current password and a new password meeting strength requirements. On successful password change, all existing sessions (except the current one) are revoked, and the user is prompted to re-authenticate on other devices. This ensures that a compromised session cannot be used to change the password and maintain access.

### F-USER-04: Language Preference

Users can select their preferred language from a dropdown in settings. The selection is stored in the user's profile and applied to all UI text, email content, and system messages. The platform detects the user's browser language on first visit and sets a default, which the user can override. Language changes take effect immediately without page reload.

### F-USER-05: Currency Preference

Users can select their preferred display currency (USD, EUR, GBP, BTC, ETH) for wallet balances and transaction amounts. The underlying accounting always uses USD, but displayed amounts are converted at the current exchange rate. This is a display preference only and does not affect deposit/withdrawal currencies.

### F-USER-06: Notification Preferences

Users can configure which notifications they receive via email and which appear as in-app notifications. Notification categories include: account activity (logins, password changes), deposits, investments, withdrawals, KYC updates, and referral commissions. Each category has independent toggles for email and in-app channels.

---

## 4. KYC System

| ID | Feature | Priority | Phase | Dependencies | Complexity |
|----|---------|----------|-------|-------------|------------|
| F-KYC-01 | Document Upload | P0 | Launch | F-USER-02 | Medium |
| F-KYC-02 | KYC Level Progression | P0 | Launch | F-KYC-01 | Medium |
| F-KYC-03 | Admin KYC Review | P0 | Launch | F-KYC-01, F-ADM-01 | Medium |
| F-KYC-04 | KYC Status Notifications | P0 | Launch | F-KYC-03, F-NOTIF-02 | Low |
| F-KYC-05 | Document Re-upload | P0 | Launch | F-KYC-03 | Low |

### F-KYC-01: Document Upload

Users upload KYC documents through a secure, guided interface. The upload component supports common image formats (JPG, PNG) and PDF. Documents are uploaded directly to Cloudinary with private access (signed URLs). The upload interface provides clear instructions on acceptable document types, image quality requirements, and data that must be visible. File size limits and format restrictions are enforced client-side and server-side.

### F-KYC-02: KYC Level Progression

The KYC system implements progressive verification levels: Level 0 (unverified — registration only), Level 1 (email verified — basic platform access), Level 2 (government ID verified — increased deposit/withdrawal limits), Level 3 (ID + proof of address verified — full platform access). Each level has defined deposit and withdrawal limits. Users see their current level, limits, and the requirements to advance to the next level on their profile page.

### F-KYC-03: Admin KYC Review

Administrators access a dedicated KYC review queue that shows all pending submissions ordered by submission date. Each submission displays the user's information, uploaded documents (viewable in a comparison lightbox), and admin action buttons (approve, reject, request additional documents). The review interface supports side-by-side document comparison for ID verification. Approved submissions advance the user's KYC level; rejected submissions notify the user with specific feedback.

### F-KYC-04: KYC Status Notifications

Users receive email and in-app notifications at each KYC status transition: submission received, under review, approved, rejected (with feedback), and additional documents requested. Notifications include clear next steps and links to the relevant page (re-upload, profile, etc.). Admin actions that change KYC status are the trigger for these notifications.

### F-KYC-05: Document Re-upload

When a KYC submission is rejected or additional documents are requested, the user can re-upload the required documents through their profile page. The re-upload interface pre-fills the context of the rejection (which document was rejected, why, what is needed). The re-submission enters the admin review queue with a reference to the previous submission for continuity.

---

## 5. Wallet System

| ID | Feature | Priority | Phase | Dependencies | Complexity |
|----|---------|----------|-------|-------------|------------|
| F-WALLET-01 | Wallet Dashboard | P0 | Launch | F-WALLET-02, F-WALLET-03 | Medium |
| F-WALLET-02 | Balance Display (Demo + Live) | P0 | Launch | F-AUTH-02 | Low |
| F-WALLET-03 | Transaction History | P0 | Launch | F-WALLET-02 | Medium |
| F-WALLET-04 | Pending/Available Balance | P0 | Launch | F-WALLET-02 | Medium |

### F-WALLET-01: Wallet Dashboard

The wallet dashboard provides a comprehensive view of the user's financial position. It displays demo and live wallet balances side by side, a summary of active investments and expected returns, recent transactions (last 10), and quick action buttons (deposit, invest, withdraw). The dashboard is the primary financial overview page and is accessible from the main navigation.

### F-WALLET-02: Balance Display (Demo + Live)

Each user has two separate wallets: a demo wallet for practice (funded with virtual credits) and a live wallet for real transactions. The balance display shows total balance, available balance (funds that can be used immediately), and pending balance (funds from processing deposits or maturing investments). The demo and live balances are visually distinct to prevent user confusion. The live wallet is the primary display and is always prominent.

### F-WALLET-03: Transaction History

A comprehensive, filterable transaction history displays all financial transactions associated with the user's wallets. Each transaction record includes: type (deposit, withdrawal, investment, return, commission), amount, status (pending, completed, failed, reversed), timestamp, and a reference ID. Filters include: transaction type, status, date range, and wallet type (demo/live). Pagination supports browsing through large transaction histories. Transaction details are viewable by clicking on a record.

### F-WALLET-04: Pending/Available Balance

The wallet distinguishes between available balance (funds that can be immediately used for investments or withdrawals) and pending balance (funds that are being processed or are locked in active investments). Deposits are pending until verified (crypto confirmation or gift card admin approval). Investment returns are pending until the investment matures. Only the available balance is used for investment funding and withdrawal calculations.

---

## 6. Deposit System

| ID | Feature | Priority | Phase | Dependencies | Complexity |
|----|---------|----------|-------|-------------|------------|
| F-DEP-01 | Crypto Deposit (BTC, ETH, USDT) | P0 | Launch | F-WALLET-02 | High |
| F-DEP-02 | Crypto Address Generation | P0 | Launch | F-DEP-01 | High |
| F-DEP-03 | Crypto Transaction Tracking | P1 | Launch | F-DEP-01 | Medium |
| F-DEP-04 | Gift Card Deposit | P0 | Launch | F-WALLET-02 | Medium |
| F-DEP-05 | Gift Card Screenshot Upload | P0 | Launch | F-DEP-04 | Low |
| F-DEP-06 | Gift Card Admin Verification | P0 | Launch | F-DEP-04, F-ADM-01 | Medium |
| F-DEP-07 | Deposit Notifications | P0 | Launch | F-DEP-01, F-DEP-04, F-NOTIF-02 | Low |

### F-DEP-01: Crypto Deposit (BTC, ETH, USDT)

Users can deposit cryptocurrency by sending funds to a platform-provided address. The deposit page shows the user's unique deposit address for each supported cryptocurrency, a QR code for easy scanning, the current exchange rate, and an estimated USD value. The system monitors the blockchain for incoming transactions matching user deposit addresses. Upon detection, the transaction enters a confirmation tracking state.

### F-DEP-02: Crypto Address Generation

Each user receives a unique deposit address for each supported cryptocurrency. Addresses are generated using a hierarchical deterministic (HD) wallet approach, deriving addresses from a master key. This allows the platform to generate unlimited unique addresses without managing separate private keys for each. Generated addresses are stored in the database and associated with the user. The address generation is deterministic — the same user always receives the same address for the same cryptocurrency, simplifying the user experience.

### F-DEP-03: Crypto Transaction Tracking

After a crypto deposit transaction is detected on the blockchain, the system tracks its confirmation count. BTC requires configurable confirmations (default: 3), ETH requires 12 confirmations, and USDT requires 12 confirmations. The user sees a real-time status of their deposit (detected, confirming, confirmed, credited). Once the required confirmations are reached, the deposit amount (converted to USD at the confirmation-time exchange rate) is credited to the user's live wallet.

### F-DEP-04: Gift Card Deposit

Users can deposit funds by submitting gift card details. The deposit form captures: gift card brand (from a dropdown of supported brands), card value (selected from predefined denominations), card number, and PIN code. The submission is entered into a pending state and routed to the admin verification queue. Users see a clear status indicator showing their submission is under review.

### F-DEP-05: Gift Card Screenshot Upload

As part of the gift card deposit submission, users upload a clear photograph or screenshot of the physical gift card showing the card number, PIN, and any security codes. The upload uses the same Cloudinary integration as KYC documents, with private access and file validation. Clear instructions guide users on photograph quality requirements (readable, well-lit, no cropped edges).

### F-DEP-06: Gift Card Admin Verification

Administrators review gift card deposit submissions in a dedicated queue. Each submission shows the card details, uploaded image, and the user's information. The admin can verify the card balance (via external tools or APIs), approve the deposit (crediting the user's live wallet), or reject the deposit (notifying the user with a reason). A fraud scoring indicator highlights submissions that match known fraud patterns. The admin can also flag a user for review based on their submission history.

### F-DEP-07: Deposit Notifications

Users receive email and in-app notifications for key deposit events: crypto deposit detected, crypto deposit confirmed and credited, gift card submission received, gift card verified and credited, and gift card rejected. Notifications include the deposit amount, USD value, and current wallet balance. Failed crypto deposits (insufficient confirmations, transaction reverted) are also notified.

---

## 7. Investment Plans

| ID | Feature | Priority | Phase | Dependencies | Complexity |
|----|---------|----------|-------|-------------|------------|
| F-INV-01 | Plan Browsing | P0 | Launch | — | Low |
| F-INV-02 | Plan Selection & Funding | P0 | Launch | F-INV-01, F-WALLET-04 | High |
| F-INV-03 | Active Investments Tracking | P0 | Launch | F-INV-02 | Medium |
| F-INV-04 | Investment Maturity & Returns | P0 | Launch | F-INV-02 | High |
| F-INV-05 | Investment History | P0 | Launch | F-INV-02 | Low |
| F-INV-06 | Admin Plan Management | P0 | Launch | F-ADM-01 | Medium |

### F-INV-01: Plan Browsing

Users can browse all available investment plans on a dedicated plans page and from the investment section of the dashboard. Each plan displays: name (Basic, Silver, Gold, Platinum), minimum and maximum investment amounts, investment duration, expected return rate, and a brief description. Plans are visually differentiated with the red and black theme. Users who are not yet KYC-verified at the required level see the plans but cannot invest.

### F-INV-02: Plan Selection & Funding

Users select a plan and enter their investment amount. The system validates that the amount falls within the plan's minimum and maximum thresholds, that the user's available live wallet balance is sufficient, and that the user's KYC level permits the investment. Upon confirmation, the investment amount is deducted from the user's available balance and moved to pending, and an active investment record is created with the start date, expected maturity date, and expected return amount.

### F-INV-03: Active Investments Tracking

Users can view all their active investments on a dedicated page. Each investment shows: plan name, invested amount, start date, maturity date, expected return, days remaining, and a progress indicator. Active investments are listed in chronological order by start date. The investment section of the dashboard also displays a summary of total active investments and total expected returns.

### F-INV-04: Investment Maturity & Returns

When an investment reaches its maturity date, a background worker processes the maturity. The invested principal and the calculated return are credited to the user's live wallet available balance. The investment status is updated to "matured." The user receives email and in-app notifications of the maturity and the credited amount. The referral commission system is triggered for the investor's referrer. This process is idempotent — if the worker fails and retries, the credit is not applied twice (enforced by a processed flag on the investment record).

### F-INV-05: Investment History

A historical view of all investments (active, matured, and any other terminal states) with filtering and sorting. Each record shows the plan, amount, return, dates, and final status. This provides users with a complete record of their investment activity for personal tracking and reference.

### F-INV-06: Admin Plan Management

Administrators can create, edit, and deactivate investment plans through the admin dashboard. Each plan has configurable parameters: name, description, minimum amount, maximum amount, duration (in hours or days), return rate (percentage), and KYC level requirement. Plan changes only affect new investments — existing active investments continue under the terms in effect at the time of investment. This immutability of active investment terms is critical for user trust and regulatory compliance.

---

## 8. Withdrawal System

| ID | Feature | Priority | Phase | Dependencies | Complexity |
|----|---------|----------|-------|-------------|------------|
| F-WD-01 | Withdrawal Request | P0 | Launch | F-WALLET-04 | Medium |
| F-WD-02 | Fee Calculation Display | P0 | Launch | F-WD-01 | Low |
| F-WD-03 | Admin Withdrawal Approval | P0 | Launch | F-WD-01, F-ADM-01 | Medium |
| F-WD-04 | Withdrawal Status Tracking | P0 | Launch | F-WD-01 | Low |
| F-WD-05 | Withdrawal Notifications | P0 | Launch | F-WD-01, F-WD-03, F-NOTIF-02 | Low |

### F-WD-01: Withdrawal Request

Users initiate a withdrawal from their available live wallet balance. The withdrawal form captures the amount (pre-filled from available balance, editable down) and the withdrawal destination (crypto wallet address for crypto withdrawals). The system validates that the amount does not exceed the available balance, that the withdrawal destination is in a valid format for the selected cryptocurrency, and that the user's KYC level permits withdrawals of the requested amount. The withdrawal amount is deducted from the available balance and placed in a pending state.

### F-WD-02: Fee Calculation Display

Before confirming a withdrawal, the system clearly displays the fee calculation: the requested amount, the 21% platform fee, and the net amount the user will receive. The fee is shown both as an absolute value and as a percentage. This transparency ensures users understand the cost of withdrawal before committing. The fee is non-negotiable and consistent across all withdrawal amounts and methods.

### F-WD-03: Admin Withdrawal Approval

Withdrawal requests enter an admin approval queue. Each request shows the user's information, withdrawal amount, fee, net amount, and withdrawal destination. The admin can approve (triggering the actual withdrawal processing), reject (returning the funds to the user's available balance), or request additional information from the user. Large withdrawals (above a configurable threshold) require additional verification steps. The approval process is logged in the audit trail with the admin's identity and timestamp.

### F-WD-04: Withdrawal Status Tracking

Users can track the status of their withdrawal requests through the transaction history. Statuses include: pending (awaiting admin review), processing (approved and being sent), completed (funds sent, transaction hash available), and rejected (funds returned to wallet). Each status change triggers a notification. For crypto withdrawals, the transaction hash is displayed once the withdrawal is completed, allowing the user to verify on the blockchain.

### F-WD-05: Withdrawal Notifications

Users receive email and in-app notifications for all withdrawal status changes: request submitted, approved, processing, completed (with transaction hash), and rejected (with reason and returned amount). These notifications keep users informed throughout the withdrawal process and reduce support inquiries about withdrawal status.

---

## 9. Referral System

| ID | Feature | Priority | Phase | Dependencies | Complexity |
|----|---------|----------|-------|-------------|------------|
| F-REF-01 | Referral Code/Link Generation | P0 | Launch | F-AUTH-01 | Low |
| F-REF-02 | Referral Tracking Dashboard | P0 | Launch | F-REF-01 | Medium |
| F-REF-03 | Direct Referral Commission (10%) | P0 | Launch | F-REF-01, F-INV-04 | High |
| F-REF-04 | Binary Tree Structure | P0 | Launch | F-REF-01 | High |
| F-REF-05 | Binary Bonus Calculation | P0 | Launch | F-REF-04, F-INV-04 | High |
| F-REF-06 | Commission Payout History | P0 | Launch | F-REF-03, F-REF-05 | Low |
| F-REF-07 | Admin Referral Management | P0 | Launch | F-ADM-01 | Medium |

### F-REF-01: Referral Code/Link Generation

Each user receives a unique referral code upon registration. The referral code is displayed on the user's dashboard and can be shared as a direct link (`https://platform.com/ref/CODE`). When a new user registers using this link or enters the code during registration, the referral relationship is established. The referral code is permanent and cannot be changed.

### F-REF-02: Referral Tracking Dashboard

A dedicated referral dashboard shows the user their referral network: total direct referrals, binary tree visualization (left and right legs), active referrals, total commissions earned, and commission history. The dashboard provides a clear overview of the referral program's performance for the individual user and serves as motivation for active referral participation.

### F-REF-03: Direct Referral Commission (10%)

When a directly referred user earns investment returns, the referring user receives a 10% commission on those returns. The commission is calculated at the time the investment matures and is credited to the referrer's live wallet. The commission amount is recorded in the referrer's transaction history with a reference to the triggering investment. This commission structure is configurable by administrators.

### F-REF-04: Binary Tree Structure

The referral system uses a binary tree structure where each user can have at most two direct referrals: one on the left leg and one on the right leg. When a user refers more than two people, additional referrals are placed in the binary tree according to a configurable placement strategy (typically, new referrals are placed in the leg with fewer members to maintain balance). The tree structure is stored in the database and supports efficient traversal for commission calculations.

### F-REF-05: Binary Bonus Calculation

Binary bonuses are calculated based on the investment volume of the weaker leg in the user's binary tree. At configurable intervals (daily, weekly, or on investment maturity), the system compares the total investment volume on the left leg and right leg. The bonus is calculated as a percentage (configurable) of the weaker leg's volume, up to a daily or weekly cap (configurable). Binary bonuses are credited to the user's live wallet and recorded in the transaction history.

### F-REF-06: Commission Payout History

A detailed history of all commission payouts (both direct referral commissions and binary bonuses) is displayed to the user. Each record shows: commission type, source (which referral or investment triggered the commission), amount, timestamp, and current wallet balance after the commission. The history is filterable by commission type and date range.

### F-REF-07: Admin Referral Management

Administrators can view the global referral tree, inspect individual user referral networks, view commission calculations and payouts, and adjust referral program parameters (direct commission percentage, binary bonus percentage, binary bonus cap, placement strategy). Administrators can also investigate and resolve referral-related issues (e.g., misassigned referrals, commission calculation disputes).

---

## 10. Notifications

| ID | Feature | Priority | Phase | Dependencies | Complexity |
|----|---------|----------|-------|-------------|------------|
| F-NOTIF-01 | In-App Notification Center | P0 | Launch | F-AUTH-02 | Medium |
| F-NOTIF-02 | Email Notifications | P0 | Launch | — | Medium |
| F-NOTIF-03 | Notification Preferences | P1 | Launch | F-NOTIF-01, F-NOTIF-02 | Low |
| F-NOTIF-04 | Admin Notifications | P0 | Launch | F-ADM-01 | Low |
| F-NOTIF-05 | Real-Time Updates | P1 | Launch | F-NOTIF-01 | Medium |

### F-NOTIF-01: In-App Notification Center

A notification bell icon in the header displays the count of unread notifications. Clicking the icon opens a dropdown panel listing recent notifications with timestamps and read/unread status. A dedicated notifications page shows the full notification history with filtering capabilities. Notifications are marked as read when viewed. The notification center stores all notifications in the database, ensuring they persist across sessions and devices.

### F-NOTIF-02: Email Notifications

Transactional emails are sent for all critical user events using Resend and React Email. Email templates are designed in the platform's red and black theme with clear, professional layouts. Email types include: verification OTP, password reset, 2FA setup, deposit status, investment activation, investment maturity, withdrawal status, KYC status, and commission credits. Emails include action links where appropriate and are optimized for both desktop and mobile email clients.

### F-NOTIF-03: Notification Preferences

Users can configure their notification preferences to control which events trigger email notifications, which trigger in-app notifications, and which are disabled entirely. Preferences are organized by category (account, deposits, investments, withdrawals, KYC, referrals) and can be independently toggled for each channel (email, in-app). Default preferences are set to receive all critical notifications via both channels.

### F-NOTIF-04: Admin Notifications

Administrators receive email and in-app notifications for operational events that require attention: new KYC submissions, new gift card deposits pending verification, withdrawal requests pending approval, large withdrawal requests, suspicious activity alerts, and system error alerts. Admin notifications ensure timely handling of user requests and system issues.

### F-NOTIF-05: Real-Time Updates

For time-sensitive information (deposit confirmations, withdrawal status changes, new commissions), the platform provides real-time updates through Server-Sent Events (SSE) or WebSocket connections. Real-time updates appear as in-app toasts or update the UI without a page refresh. This feature enhances the user experience by providing immediate feedback for financial events.

---

## 11. Admin Features

| ID | Feature | Priority | Phase | Dependencies | Complexity |
|----|---------|----------|-------|-------------|------------|
| F-ADM-01 | Admin Dashboard | P0 | Launch | F-AUTH-09 | High |
| F-ADM-02 | User Management | P0 | Launch | F-ADM-01 | Medium |
| F-ADM-03 | KYC Review Queue | P0 | Launch | F-ADM-01, F-KYC-03 | Medium |
| F-ADM-04 | Deposit Verification | P0 | Launch | F-ADM-01, F-DEP-06 | Medium |
| F-ADM-05 | Withdrawal Approval | P0 | Launch | F-ADM-01, F-WD-03 | Medium |
| F-ADM-06 | Investment Plan CRUD | P0 | Launch | F-ADM-01, F-INV-06 | Medium |
| F-ADM-07 | Financial Reports | P1 | Launch | F-ADM-01 | High |
| F-ADM-08 | Audit Log Viewer | P0 | Launch | F-ADM-01 | Medium |
| F-ADM-09 | System Settings | P1 | Launch | F-ADM-01 | Medium |
| F-ADM-10 | Support Ticket Management | P0 | Launch | F-ADM-01, F-SUP-01 | Medium |

### F-ADM-01: Admin Dashboard

The admin dashboard is the central operations hub, providing an overview panel with key metrics (total users, new registrations today, active investments, total platform balance, pending withdrawals, pending KYC, pending deposits), quick-access links to all admin sections, and a recent activity feed showing the latest platform events. The dashboard is the first page administrators see upon login and provides immediate situational awareness of the platform's state.

### F-ADM-02: User Management

Administrators can search for users by email, username, or ID, view detailed user profiles (all personal information, KYC status, wallet balances, transaction history, referral network), edit user details, suspend or activate accounts, and manually adjust wallet balances (with audit logging and dual-approval for significant adjustments). The user management interface includes pagination, sorting, and filtering for efficient navigation of the user base.

### F-ADM-03: KYC Review Queue

A dedicated queue interface displays all pending KYC submissions ordered by submission date. Each submission card shows the user's basic info, submitted documents (viewable in a lightbox with zoom), and action buttons (approve, reject, request more info). Bulk actions are available for common operations. The queue displays counts for pending, approved today, and rejected today.

### F-ADM-04: Deposit Verification

The gift card deposit verification queue shows all pending gift card submissions with card details, uploaded images, user information, and fraud scoring indicators. Administrators can verify card balances, approve deposits, or reject with reasons. The queue supports filtering by card brand, submission date, and fraud score. Approved deposits immediately credit the user's wallet.

### F-ADM-05: Withdrawal Approval

The withdrawal approval queue displays all pending withdrawal requests with user information, withdrawal amount, fee, net amount, and destination address. Administrators can approve (triggering withdrawal processing), reject (returning funds), or request additional verification. The queue highlights large withdrawals and withdrawals from recently registered accounts for additional scrutiny.

### F-ADM-06: Investment Plan CRUD

Administrators can create new investment plans, edit existing plans (changes affect new investments only), deactivate plans (preventing new investments while existing ones continue), and view plan performance metrics (total invested, active investments, total returns paid). Plan management uses a form-based interface with validation for all numeric fields.

### F-ADM-07: Financial Reports

Predefined financial reports provide visibility into platform financials: daily/weekly/monthly deposit summaries, withdrawal summaries, commission payouts, platform balance breakdown, and net revenue calculations. Reports are displayed in tabular format with date range selectors and support export to CSV for external analysis. Reports help administrators and stakeholders make informed financial decisions.

### F-ADM-08: Audit Log Viewer

A comprehensive audit log records all significant admin actions (user edits, KYC approvals/rejections, deposit verifications, withdrawal approvals, balance adjustments, plan changes) with the admin's identity, timestamp, IP address, and detailed change description. The audit log viewer provides search, filter, and pagination capabilities. The audit log is immutable — entries cannot be edited or deleted, only viewed.

### F-ADM-09: System Settings

A settings management interface allows administrators to configure platform-wide parameters: commission rates, withdrawal fees, KYC level limits, investment plan defaults, email templates, and platform maintenance mode. Changes to system settings are audit-logged and take effect immediately. A settings history shows who changed what and when.

### F-ADM-10: Support Ticket Management

Administrators view and respond to all support tickets through the admin dashboard. The ticket management interface shows open tickets, allows assignment to specific admins, supports internal notes (not visible to the user), and tracks response time against SLA targets. Ticket status transitions (open, in progress, waiting for user, resolved, closed) are tracked. Analytics show ticket volume trends and average resolution times.

---

## 12. Support

| ID | Feature | Priority | Phase | Dependencies | Complexity |
|----|---------|----------|-------|-------------|------------|
| F-SUP-01 | Support Ticket Creation | P0 | Launch | F-AUTH-02 | Medium |
| F-SUP-02 | Ticket Conversation | P0 | Launch | F-SUP-01 | Medium |
| F-SUP-03 | FAQ/Knowledge Base | P1 | Launch | — | Medium |
| F-SUP-04 | Contact Form | P0 | Launch | — | Low |

### F-SUP-01: Support Ticket Creation

Authenticated users can create support tickets by selecting a category (account issues, deposits, withdrawals, investments, KYC, referrals, other), writing a subject and description, and optionally attaching screenshots or documents. Each ticket receives a unique reference number. A confirmation notification is sent to the user with the ticket reference number for tracking purposes.

### F-SUP-02: Ticket Conversation

Users can view their open and past support tickets, read admin responses, and submit follow-up messages. The conversation interface displays messages chronologically with clear visual distinction between user messages and admin responses. Users can close tickets that they consider resolved. New admin responses trigger in-app and email notifications.

### F-SUP-03: FAQ/Knowledge Base

A public-facing FAQ page provides answers to common questions organized by category (getting started, deposits, investments, withdrawals, referrals, KYC, security, account management). Each FAQ entry has a clear question and answer. The FAQ is searchable. Content is managed through the admin panel or directly in code (for launch). This feature reduces support ticket volume by providing self-service answers to common questions.

### F-SUP-04: Contact Form

A simple contact form on the public contact page allows non-authenticated visitors (and authenticated users who prefer it) to send a message to the support team. The form captures name, email, subject, and message. Submissions are routed to the admin support ticket system as a new ticket. A confirmation message is displayed to the user after submission.

---

## 13. Public Pages

| ID | Feature | Priority | Phase | Dependencies | Complexity |
|----|---------|----------|-------|-------------|------------|
| F-PUB-01 | Landing Page | P0 | Launch | — | Medium |
| F-PUB-02 | About Page | P1 | Launch | — | Low |
| F-PUB-03 | FAQ Page | P1 | Launch | F-SUP-03 | Low |
| F-PUB-04 | Contact Page | P0 | Launch | F-SUP-04 | Low |
| F-PUB-05 | Plans Page | P0 | Launch | F-INV-01 | Medium |
| F-PUB-06 | Privacy Policy | P0 | Launch | — | Low |
| F-PUB-07 | Terms of Service | P0 | Launch | — | Low |
| F-PUB-08 | Newsletter Subscription | P2 | Future | — | Low |

### F-PUB-01: Landing Page

The landing page is the primary marketing and conversion page for the platform. It features: a hero section with headline, value proposition, and call-to-action (register button), a features section highlighting key platform benefits, a plans overview section showing all four investment tiers, a testimonials or trust section (if available), and a footer with links to all public pages, social media, and legal documents. The page is fully responsive and optimized for conversion with the red and black dark theme.

### F-PUB-02: About Page

The about page provides information about the company, its mission, its team, and its values. Content is structured with clear headings and may include team member profiles. The page builds trust and credibility with prospective users and is important for regulatory transparency.

### F-PUB-03: FAQ Page

The public FAQ page displays the same content as the admin-managed FAQ/knowledge base (F-SUP-03) in a user-friendly format. Questions are organized by category with expandable/collapsible answers. A search bar allows users to quickly find relevant answers. This is the self-service support entry point for non-authenticated visitors.

### F-PUB-04: Contact Page

The contact page provides multiple ways to reach the support team: a contact form (F-SUP-04), email address, and optionally social media links. The page is clean and straightforward, encouraging users to reach out with questions or concerns before registering.

### F-PUB-05: Plans Page

A detailed plans page displays all four investment plans (Basic, Silver, Gold, Platinum) with complete information: tier name, investment range, duration, expected return rate, and any additional benefits or requirements. Plans are presented in a comparison format (cards or table) that makes it easy for users to compare options. The page is designed to drive registration and investment.

### F-PUB-06: Privacy Policy

A comprehensive privacy policy page detailing data collection practices, data usage, data storage, third-party data sharing, cookie usage, user rights (access, correction, deletion, portability), and contact information for privacy-related inquiries. The privacy policy is reviewed by legal counsel and is a regulatory requirement.

### F-PUB-07: Terms of Service

A comprehensive terms of service page detailing user obligations, platform disclaimers, limitation of liability, dispute resolution, investment risk disclosures, withdrawal fee disclosure, and governing law. The terms of service are reviewed by legal counsel and must be accepted by users during registration.

### F-PUB-08: Newsletter Subscription

A newsletter subscription form allows visitors to subscribe to platform updates, news, and promotional content. Subscribers provide their email address and receive a confirmation email. This feature is deferred to a post-launch update and is not required for the initial launch.

---

## 14. Charts & Analytics

| ID | Feature | Priority | Phase | Dependencies | Complexity |
|----|---------|----------|-------|-------------|------------|
| F-CHART-01 | Portfolio Performance Chart | P1 | Launch | F-WALLET-01 | Medium |
| F-CHART-02 | Earnings Over Time Chart | P1 | Launch | F-WALLET-01, F-REF-06 | Medium |
| F-CHART-03 | Investment Distribution Chart | P2 | Future | F-CHART-01 | Low |
| F-CHART-04 | Referral Network Visualization | P2 | Future | F-REF-02 | High |

### F-CHART-01: Portfolio Performance Chart

An interactive line chart on the user's dashboard shows portfolio performance over time, plotting the total wallet balance (available + invested) on a time axis. Users can select time ranges (7 days, 30 days, 90 days, all time). The chart is implemented using a lightweight charting library (Recharts or Chart.js) with the red and black theme applied to all chart elements.

### F-CHART-02: Earnings Over Time Chart

A bar or area chart displays cumulative earnings over time, broken down by source (investment returns, direct referral commissions, binary bonuses). Users can see the growth trajectory of their earnings and understand which revenue streams contribute most to their total returns.

### F-CHART-03: Investment Distribution Chart

A pie or donut chart shows the distribution of the user's investments across the four plan tiers. This helps users understand their portfolio allocation at a glance. Deferred to a post-launch update.

### F-CHART-04: Referral Network Visualization

An interactive tree visualization shows the user's binary referral tree, displaying the structure of their downline, the investment volume on each leg, and highlighting weak and strong legs. This visualization is complex to implement (especially for large trees) and is deferred to a post-launch update.

---

## 15. Future Features (Not in Launch)

The following features are planned for future development cycles and are explicitly excluded from the initial launch scope. They are documented here for roadmap planning purposes.

| Feature | Priority | Description |
|---------|----------|-------------|
| Mobile App (iOS/Android) | P3 | Native or cross-platform mobile application providing full platform functionality on mobile devices. Significant development effort requiring separate design and QA cycles. |
| Social Login | P3 | Support for Google, Apple, and Facebook login as alternatives to email/password registration. Reduces registration friction but introduces dependency on third-party OAuth providers. |
| Push Notifications | P3 | Browser and mobile push notifications for real-time alerts. Requires user permission, push service integration (Firebase Cloud Messaging or Web Push API), and additional notification management UI. |
| Additional Payment Methods | P3 | Support for bank transfers, credit/debit cards, or additional cryptocurrency options. Each new payment method requires integration work, compliance review, and operational procedures. |
| Advanced Analytics/Reports | P3 | User-facing detailed analytics including ROI calculations, investment performance comparisons, tax document generation, and exportable financial statements. Significant business logic and UI development effort. |