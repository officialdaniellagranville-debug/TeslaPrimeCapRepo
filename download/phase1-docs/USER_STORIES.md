# User Stories — Enterprise Investment Platform

> **Project:** Managed Investment Plan Platform  
> **Phase:** 1 — Requirements & Specification  
> **Format:** "As a [role], I want [action] so that [benefit]."  
> **Last Updated:** 2025

---

## 1. Authentication Stories

### US-AUTH-001: Account Registration

**As an** unregistered user, **I want to** create an account with email and password **so that** I can access the platform.

**Acceptance Criteria:**
- Email format is validated (RFC 5322 compliant)
- Password must be a minimum of 8 characters, containing at least one uppercase letter, one lowercase letter, one number, and one special character
- Referral code field is optional; if provided, it must match an existing active user's referral code
- Terms of service acceptance checkbox is required and must be checked before submission
- A verification email with a 6-digit OTP is sent to the provided email address upon successful registration
- Duplicate email addresses are rejected with a clear error message
- Registration form includes: full name, email address, password, confirm password, optional referral code

---

### US-AUTH-002: Email Verification

**As a** registered user, **I want to** verify my email **so that** I can activate my account.

**Acceptance Criteria:**
- A 6-digit OTP is sent to the user's registered email address
- OTP is valid for 10 minutes from the time of generation
- Maximum of 3 verification attempts allowed per OTP
- After 3 failed attempts, a new OTP must be requested
- Account status changes from "pending" to "active" upon successful verification
- User is redirected to the login page with a success message upon activation
- Resend OTP option is available with a cooldown timer (60 seconds)

---

### US-AUTH-003: User Login

**As a** verified user, **I want to** log in with email and password **so that** I can access my dashboard.

**Acceptance Criteria:**
- Email and password credentials are validated against the database
- If 2FA is enabled for the account, a TOTP input step is presented before granting access
- A session is created upon successful authentication (stored in Redis with configurable TTL)
- User is redirected to their dashboard after successful login
- Failed login attempts are tracked; after 5 consecutive failures, the account is temporarily locked for 15 minutes
- "Remember me" option extends session duration from 24 hours to 7 days
- Clear error messages for invalid credentials (generic, not specifying which field is wrong for security)

---

### US-AUTH-004: Password Reset

**As a** user, **I want to** reset my password **so that** I can regain access if forgotten.

**Acceptance Criteria:**
- An OTP is sent to the user's registered email address
- OTP is valid for 10 minutes
- New password must meet the same complexity requirements as registration
- New password must differ from the last 3 previously used passwords
- All active sessions are invalidated immediately after a successful password reset
- Password change confirmation email is sent to the user
- User is prompted to log in with the new password after reset completion

---

### US-AUTH-005: Two-Factor Authentication (2FA) Setup

**As a** user, **I want to** enable 2FA **so that** my account has additional security.

**Acceptance Criteria:**
- A QR code is generated using a TOTP-compatible algorithm (e.g., Google Authenticator format)
- A manual entry secret key is also displayed for users who cannot scan QR codes
- User must enter a valid TOTP code from their authenticator app to confirm setup
- 10 backup recovery codes are generated and displayed once upon successful setup
- User is warned to store backup codes securely (one-time display)
- 2FA is required for all withdrawal requests once enabled
- Option to disable 2FA requires re-entering current TOTP code and email OTP verification
- Backup codes can each be used only once; used codes are marked accordingly

---

### US-AUTH-006: Active Session Management

**As a** user, **I want to** see my active sessions **so that** I can detect unauthorized access.

**Acceptance Criteria:**
- A list of all active sessions is displayed showing: device type, browser, IP address, location (if available), and login timestamp
- The current session is clearly labeled
- User can revoke individual sessions (except the current session)
- A "Revoke All Other Sessions" button is available
- Revoked sessions are immediately invalidated
- An email notification is sent when a session is revoked by the user
- Sessions older than the configured TTL (7 days max with "Remember Me") are automatically cleaned up

---

## 2. KYC Stories

### US-KYC-001: ID Document Upload

**As a** user, **I want to** upload my ID document **so that** I can verify my identity.

**Acceptance Criteria:**
- Supported file formats: JPG, PNG, PDF
- Maximum file size: 5MB per document
- Clear upload progress indicator during file upload
- Upload status is displayed (pending, approved, rejected)
- Processing time estimate is shown after successful upload (e.g., "Estimated review time: 24-48 hours")
- User can upload multiple document types based on KYC level requirements (government-issued ID, proof of address, selfie with ID)
- Previously uploaded documents can be re-uploaded if rejected
- Cloudinary is used for secure file storage with access controls

---

### US-KYC-002: KYC Verification Level Display

**As a** user, **I want to** see my KYC verification level **so that** I know my account limits.

**Acceptance Criteria:**
- Current KYC level is prominently displayed (e.g., Level 0 — Unverified, Level 1 — Basic, Level 2 — Advanced)
- Deposit and investment limits per level are clearly shown
- Requirements to upgrade to the next level are listed (e.g., "Upload government-issued ID to reach Level 1")
- Progress indicator shows completion toward next level
- Notification badge appears when documents need re-verification or additional documents are required

---

### US-KYC-003: KYC Document Review (KYC Officer)

**As a** KYC officer, **I want to** review submitted documents **so that** I can approve or reject verifications.

**Acceptance Criteria:**
- An in-app document viewer displays uploaded images and PDFs at full resolution
- Approve and reject action buttons are prominently displayed
- A rejection reason field (required on reject) with common reason options and custom input
- Every review action creates an immutable audit log entry with: reviewer ID, action taken, timestamp, reason (if rejected)
- Documents are marked as "under review" to prevent duplicate review by another officer
- Batch review capability for processing multiple submissions efficiently
- Queue sorted by submission time (oldest first)

---

## 3. Wallet & Deposit Stories

### US-WALLET-001: Wallet Balance Display

**As a** user, **I want to** see my wallet balance **so that** I know how much I have available.

**Acceptance Criteria:**
- Separate balances displayed for Demo mode and Live mode
- Each balance shows: available amount and pending amount separately
- Currency is clearly displayed (e.g., USD)
- Demo balance is clearly labeled and visually distinct from Live balance
- Balance updates in real-time after transactions (via WebSocket or polling)
- Total portfolio value (wallet + active investments) is shown

---

### US-WALLET-002: Cryptocurrency Deposit

**As a** user, **I want to** deposit cryptocurrency **so that** I can fund my wallet.

**Acceptance Criteria:**
- A unique wallet address is generated per deposit transaction (or per user, depending on implementation)
- Supported cryptocurrencies are listed (e.g., BTC, ETH, USDT)
- Network selection is available where applicable (e.g., ERC-20, TRC-20 for USDT)
- QR code of the wallet address is displayed for easy scanning
- Network confirmation tracking is visible (e.g., "3/6 confirmations required")
- Funds are credited to the wallet after the required number of network confirmations
- Minimum deposit amount is displayed per cryptocurrency
- User receives a notification when deposit is credited

---

### US-WALLET-003: Gift Card Deposit

**As a** user, **I want to** deposit via gift card **so that** I have an alternative funding method.

**Acceptance Criteria:**
- Upload screenshot/photo of the gift card (JPG, PNG, max 5MB)
- Form fields for: card brand (dropdown), card value (numeric input), card code (masked input)
- Submission shows "Pending Verification" status
- Estimated verification time is displayed
- Notification is sent when admin approves or rejects the deposit
- Rejected deposits include the rejection reason
- Gift card deposits are only available in Live mode

---

### US-WALLET-004: Gift Card Deposit Verification (Admin)

**As an** admin, **I want to** verify gift card deposits **so that** only valid cards are credited.

**Acceptance Criteria:**
- View the uploaded gift card screenshot at full resolution
- Card details (brand, value, code) are displayed alongside the image
- Mark as "Verified" to auto-credit the user's Live wallet with the card value
- Mark as "Rejected" with a required reason field
- Add internal notes (visible only to admins) for each review
- Verification timestamp and admin ID are logged
- Queue sorted by submission time

---

## 4. Investment Stories

### US-INVEST-001: Browse Investment Plans

**As a** user, **I want to** browse investment plans **so that** I can choose one that fits my budget.

**Acceptance Criteria:**
- All four investment plans are displayed with details:
  - **Basic:** $200 — $4,999 | Duration: 24 hours | Expected return displayed
  - **Silver:** $5,000 — $9,999 | Duration: 72 hours | Expected return displayed
  - **Gold:** $10,000 — $49,999 | Duration: 7 days | Expected return displayed
  - **Platinum:** $50,000 — $100,000 | Duration: 14 days | Expected return displayed
- Plans outside the user's KYC level limits are visually indicated as locked with upgrade prompt
- Plan comparison view or table is available
- Return rate, duration, and risk level are clearly communicated
- CTA button on each plan card navigates to investment flow

---

### US-INVEST-002: Invest in a Plan

**As a** user, **I want to** invest in a plan **so that** I can earn returns.

**Acceptance Criteria:**
- User selects a plan from the available options
- Amount input with validation: must be within plan min/max range
- Available wallet balance is displayed; amount cannot exceed available balance
- Confirmation step shows: plan name, amount, expected return, duration, fee breakdown
- Investment is created and deducted from the wallet balance
- Returns are calculated based on the plan's rate and start counting from investment creation time
- User receives a confirmation notification
- Investment mode (Demo/Live) is clearly indicated and matches the current mode toggle

---

### US-INVEST-003: Track Active Investments

**As a** user, **I want to** track my active investments **so that** I know when they mature.

**Acceptance Criteria:**
- List of all active investments displayed
- Each investment shows: plan name, invested amount, expected return, progress bar, expected completion date/time
- Countdown timer shows time remaining until maturity
- Real-time or near-real-time progress updates
- Investment status (active, maturing, completed) is clearly indicated

---

### US-INVEST-004: Investment History

**As a** user, **I want to** see my investment history **so that** I can review past performance.

**Acceptance Criteria:**
- Paginated list of all past investments (completed, cancelled, failed)
- Filter options: by status, date range, plan type
- Sort options: by date, amount, return
- Each entry shows: plan name, amount invested, actual return, start/end dates, status
- Export to CSV/PDF option available
- Summary statistics at top: total invested, total returns, average ROI

---

## 5. Withdrawal Stories

### US-WITHDRAW-001: Withdrawal Request

**As a** user, **I want to** request a withdrawal **so that** I can receive my funds.

**Acceptance Criteria:**
- Amount input with validation against available balance
- Fee breakdown is clearly displayed: 21% withdrawal fee, net amount shown
- User must select a withdrawal method (cryptocurrency wallet address)
- Confirmation step requires user to review and explicitly confirm the withdrawal
- If 2FA is enabled, TOTP code is required to submit the withdrawal
- Withdrawal request is created with "pending" status
- User receives a confirmation notification
- Minimum withdrawal amount is enforced and displayed
- Withdrawals are only available from Live mode wallet

---

### US-WITHDRAW-002: Withdrawal Status Tracking

**As a** user, **I want to** track my withdrawal status **so that** I know when I'll receive funds.

**Acceptance Criteria:**
- Status timeline displayed: Pending → Processing → Completed (or Rejected)
- Each status change shows timestamp
- Estimated completion time displayed for current status
- Notification sent on each status change
- Rejected withdrawals show the rejection reason
- Ability to view full withdrawal details (amount, fee, net, method, transaction hash on completion)

---

### US-WITHDRAW-003: Withdrawal Approval (Admin)

**As an** admin, **I want to** approve withdrawals **so that** I can control fund outflows.

**Acceptance Criteria:**
- Queue of all pending withdrawals displayed, sorted by request time
- Each entry shows: user details (name, email, KYC level), requested amount, fee, net amount, withdrawal method, time since request
- Approve button marks withdrawal as "Processing" and triggers fund transfer
- Reject button requires a reason and notifies the user
- Processing notes can be added for internal reference
- Batch approval capability for verified users
- Withdrawal amount is reserved from user's balance while pending

---

## 6. Referral Stories

### US-REF-001: Referral Link Generation

**As a** user, **I want to** generate a referral link **so that** I can invite friends.

**Acceptance Criteria:**
- Unique referral code is auto-generated upon account creation (e.g., alphanumeric, 8 characters)
- Full referral link is constructed and displayed (e.g., `https://platform.com/register?ref=ABC12345`)
- Copy-to-clipboard button with success feedback
- Share options: email, social media (Twitter/X, Telegram, WhatsApp, Facebook)
- Referral stats are visible on the same page (total referrals, active referrals, total earned)
- Referral code is unique and cannot be changed by the user

---

### US-REF-002: Referral Commission Tracking

**As a** user, **I want to** see my referral commissions **so that** I know how much I've earned.

**Acceptance Criteria:**
- Commission history displayed in a paginated list
- Each entry shows: referred user (anonymized if needed), amount, type (direct/binary), status (pending/paid), date
- Pending vs. paid commission totals are clearly shown
- Direct commissions (10% of referral's deposit) and binary bonuses are listed separately
- Weekly binary bonus summary showing left leg volume, right leg volume, and bonus amount
- Total lifetime commissions displayed prominently

---

### US-REF-003: Binary Referral Tree View

**As a** user, **I want to** see my binary referral tree **so that** I can track my network.

**Acceptance Criteria:**
- Visual tree structure with left leg and right leg branches
- Each node shows: referral name, join date, total investment volume
- Team volume per leg (left and right) is displayed
- Weakest leg is visually highlighted (binary bonus is calculated on the weaker leg)
- Tree is navigable — click to expand/collapse branches
- Search functionality to find specific referrals in the tree
- Depth indicator showing levels from root

---

## 7. Notification Stories

### US-NOTIF-001: In-App Notifications

**As a** user, **I want to** receive notifications for important events **so that** I stay informed.

**Acceptance Criteria:**
- Notification bell icon in the top bar with unread count badge
- Dropdown displays the 5 most recent notifications
- Clicking "View All" navigates to the full notification page
- Each notification shows: icon (by category), title, message preview, timestamp, read/unread state
- Clicking a notification marks it as read
- Notifications are triggered by: deposits, withdrawals, investment maturity, KYC status changes, security events, referral commissions

---

### US-NOTIF-002: Notification Preferences

**As a** user, **I want to** configure notification preferences **so that** I only receive what I want.

**Acceptance Criteria:**
- Toggle switches for each notification category:
  - Financial (deposits, withdrawals, investment returns)
  - Security (login alerts, 2FA changes, password changes)
  - Account (KYC updates, profile changes)
  - Referral (new referrals, commission payouts)
  - System (maintenance, announcements)
- Separate toggles for in-app notifications and email notifications per category
- "Enable All" / "Disable All" quick actions
- Preferences are saved immediately on toggle change
- Default: all categories enabled for both in-app and email

---

## 8. Admin Stories

### US-ADMIN-001: Admin Dashboard Overview

**As an** admin, **I want to** see a dashboard overview **so that** I can monitor platform health.

**Acceptance Criteria:**
- Key metrics displayed as stat cards: total users, new users (today/week/month), total deposits, total withdrawals, pending withdrawals count, pending KYC count, platform balance
- Recent activity feed showing latest 10 platform actions
- Charts: deposit/withdrawal trends (line chart), user growth (bar chart), investment distribution (pie chart)
- Quick action buttons: "Review KYC" (count badge), "Process Withdrawals" (count badge), "View Deposits"
- Data is real-time or near-real-time (refreshed every 30 seconds or via WebSocket)
- Date range selector for filtering dashboard data

---

### US-ADMIN-002: User Management

**As an** admin, **I want to** manage users **so that** I can handle issues.

**Acceptance Criteria:**
- Search users by name, email, or referral code
- Filter users by: status (active, banned, pending), KYC level, registration date, role
- User list displayed in a sortable, paginated DataTable
- Clicking a user opens their detailed profile: personal info, KYC status, wallet balances, investment history, transaction history, referral tree
- Edit user details (name, email, KYC level override for Super Admin)
- Ban/unban users with reason field; banned users cannot log in
- Impersonate user (Super Admin only) with clear audit trail

---

### US-ADMIN-003: Audit Log Viewer

**As an** admin, **I want to** view audit logs **so that** I can track all system actions.

**Acceptance Criteria:**
- Filterable log table with columns: timestamp, user (name + email), action type, description, IP address, status
- Filters: by user, action type, date range, status (success/failure)
- Search within log descriptions
- Pagination with configurable page size (25, 50, 100)
- Export to CSV format
- Log entries are immutable — cannot be edited or deleted
- Logs cover: authentication events, financial transactions, KYC reviews, admin actions, system configuration changes

---

*End of User Stories Document — Phase 1*