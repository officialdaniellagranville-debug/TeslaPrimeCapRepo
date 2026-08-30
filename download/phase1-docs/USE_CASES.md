# Use Cases — Enterprise Investment Platform

> **Project:** Managed Investment Plan Platform  
> **Phase:** 1 — Requirements & Specification  
> **Last Updated:** 2025

---

## UC-001: User Registration

| Field | Value |
|-------|-------|
| **Use Case ID** | UC-001 |
| **Name** | User Registration |
| **Actor** | Unregistered User |
| **Description** | A new user creates an account on the platform by providing their personal details and choosing a secure password. |

**Preconditions:**
- User has access to the registration page (`/register`)
- Platform registration is enabled (not in maintenance mode)
- User has a valid email address

**Main Flow:**
1. User navigates to `/register`
2. User enters their full name, email address, and password
3. User confirms their password
4. User optionally enters a referral code
5. User checks the "I agree to the Terms of Service" checkbox
6. User clicks "Create Account"
7. System validates all input fields (email format, password strength, referral code if provided)
8. System checks that the email is not already registered
9. System creates the user record with status "pending"
10. System generates a 6-digit OTP and sends it to the user's email via Resend
11. System redirects user to the email verification page (`/verify-email`)
12. System displays a success message instructing the user to check their email

**Alternative Flows:**
- **3a. Passwords do not match:** System displays an error message and highlights both password fields. User corrects and retries.
- **4a. Invalid referral code:** System displays "Referral code not found" error. User may remove or correct the code and resubmit.
- **8a. Email already registered:** System displays "An account with this email already exists" error with a link to the login page.

**Postconditions:**
- User record created in the database with status "pending"
- 6-digit OTP stored in Redis with 10-minute TTL
- If referral code was provided, the referral relationship is established
- Verification email sent

**Business Rules:**
- BR-REG-01: Password must be minimum 8 characters with at least one uppercase, one lowercase, one number, and one special character.
- BR-REG-02: Terms of service acceptance is mandatory — registration cannot proceed without it.
- BR-REG-03: Each email address can only be associated with one account.

---

## UC-002: Email Verification

| Field | Value |
|-------|-------|
| **Use Case ID** | UC-002 |
| **Name** | Email Verification |
| **Actor** | Registered (Pending) User |
| **Description** | A newly registered user verifies their email address by entering the 6-digit OTP sent to their email. |

**Preconditions:**
- User has completed registration (UC-001)
- A valid OTP exists in Redis for the user's email
- OTP has not expired (within 10 minutes)

**Main Flow:**
1. User is on the email verification page (`/verify-email`)
2. User enters the 6-digit OTP from their email
3. User clicks "Verify Email"
4. System retrieves the stored OTP from Redis
5. System compares the entered OTP with the stored OTP
6. System updates the user's status from "pending" to "active"
7. System deletes the OTP from Redis
8. System redirects the user to the login page with a success message

**Alternative Flows:**
- **5a. OTP does not match:** System increments the attempt counter. If attempts < 3, displays "Invalid OTP, X attempts remaining." If attempts = 3, the OTP is invalidated and user must request a new one.
- **6a. OTP expired:** System displays "OTP has expired. Please request a new one." The resend button becomes active immediately.

**Postconditions:**
- User account status is "active"
- User can now log in
- OTP is removed from Redis

**Business Rules:**
- BR-VER-01: OTP is valid for exactly 10 minutes from generation.
- BR-VER-02: Maximum 3 verification attempts per OTP. After 3 failures, a new OTP must be requested.
- BR-VER-03: Resend OTP has a 60-second cooldown between requests.

---

## UC-003: User Login

| Field | Value |
|-------|-------|
| **Use Case ID** | UC-003 |
| **Name** | User Login |
| **Actor** | Verified User |
| **Description** | An authenticated user logs into the platform to access their dashboard and features. |

**Preconditions:**
- User has a verified (active) account
- User knows their email and password

**Main Flow:**
1. User navigates to `/login`
2. User enters their email address and password
3. User optionally checks "Remember Me"
4. User clicks "Sign In"
5. System validates the credentials against the database
6. System checks if 2FA is enabled for the account
7. System creates a session (stored in Redis)
8. System records the session (device, IP, timestamp) in the user's active sessions
9. System redirects the user to `/dashboard`

**Alternative Flows:**
- **5a. Invalid credentials:** System increments failed login counter. Displays generic "Invalid email or password" error. After 5 consecutive failures, account is locked for 15 minutes.
- **5b. Account not verified:** System displays "Please verify your email first" with a link to resend the verification email.
- **5c. Account banned:** System displays "Your account has been suspended. Please contact support."
- **6a. 2FA is enabled:** System presents a TOTP code input field. User enters the code from their authenticator app. System validates the TOTP. If valid, proceed to step 7. If invalid, show error and allow retry (max 3 attempts).

**Postconditions:**
- User session is created and stored in Redis
- Active sessions list is updated
- User has access to all permitted features based on their role

**Business Rules:**
- BR-LOG-01: After 5 consecutive failed login attempts, the account is locked for 15 minutes.
- BR-LOG-02: Session TTL is 24 hours (default) or 7 days (with "Remember Me").
- BR-LOG-03: 2FA is required for login if the user has enabled it.

---

## UC-004: Password Reset

| Field | Value |
|-------|-------|
| **Use Case ID** | UC-004 |
| **Name** | Password Reset |
| **Actor** | Registered User |
| **Description** | A user who has forgotten their password initiates a reset flow to regain account access. |

**Preconditions:**
- User has an active account
- User has access to their registered email

**Main Flow:**
1. User navigates to `/forgot-password`
2. User enters their registered email address
3. User clicks "Send Reset Code"
4. System verifies the email exists in the database
5. System generates a 6-digit OTP and sends it to the email via Resend
6. System redirects to the OTP verification step
7. User enters the 6-digit OTP
8. User enters a new password and confirms it
9. User clicks "Reset Password"
10. System validates the new password meets complexity requirements
11. System validates the new password differs from the last 3 passwords
12. System updates the user's password hash
13. System invalidates all existing sessions for the user
14. System sends a password change confirmation email
15. System redirects to `/login` with a success message

**Alternative Flows:**
- **4a. Email not found:** System displays "If an account with this email exists, a reset code has been sent" (generic message to prevent email enumeration).
- **7a. Invalid OTP:** Same retry logic as UC-002 (3 attempts max, 10-minute expiry).

**Postconditions:**
- User's password is updated
- All previous sessions are invalidated
- Password history is updated

**Business Rules:**
- BR-PR-01: New password must meet the same complexity requirements as registration.
- BR-PR-02: New password must differ from the last 3 previously used passwords.
- BR-PR-03: All active sessions are invalidated after a successful password reset.

---

## UC-005: 2FA Setup

| Field | Value |
|-------|-------|
| **Use Case ID** | UC-005 |
| **Name** | Two-Factor Authentication Setup |
| **Actor** | Authenticated User |
| **Description** | A user enables TOTP-based two-factor authentication for enhanced account security. |

**Preconditions:**
- User is logged in
- User does not currently have 2FA enabled
- User has an authenticator app installed on their device

**Main Flow:**
1. User navigates to `/dashboard/security`
2. User clicks "Enable 2FA"
3. System generates a unique TOTP secret
4. System displays a QR code encoding the secret (compatible with Google Authenticator, Authy, etc.)
5. System displays the manual entry key below the QR code
6. User scans the QR code with their authenticator app (or manually enters the key)
7. User enters the 6-digit TOTP code from their authenticator app
8. System validates the TOTP code against the secret
9. System enables 2FA on the user's account
10. System generates 10 backup recovery codes
11. System displays the backup codes with a warning to store them securely (one-time display)
12. User clicks "I've Saved My Backup Codes"
13. System confirms 2FA is now active

**Alternative Flows:**
- **8a. Invalid TOTP code:** System displays "Invalid code. Please try again." User may retry (no strict limit, but rate-limited to prevent brute force — max 10 attempts per minute).
- **11a. User requests new backup codes:** System invalidates old codes and generates a new set. Old codes become unusable immediately.

**Postconditions:**
- 2FA is enabled on the user's account
- 10 backup codes are generated and associated with the account
- Login and withdrawal flows now require TOTP verification

**Business Rules:**
- BR-2FA-01: 2FA, once enabled, is required for all withdrawal requests.
- BR-2FA-02: Backup codes are single-use. Each code can only be used once.
- BR-2FA-03: Disabling 2FA requires entering the current TOTP code AND an email OTP verification.

---

## UC-006: KYC Document Submission

| Field | Value |
|-------|-------|
| **Use Case ID** | UC-006 |
| **Name** | KYC Document Submission |
| **Actor** | Authenticated User |
| **Description** | A user uploads identity verification documents to increase their KYC level and unlock higher deposit/investment limits. |

**Preconditions:**
- User is logged in and has an active account
- User is on the KYC page (`/dashboard/kyc`)
- User has documents ready in an accepted format

**Main Flow:**
1. User navigates to `/dashboard/kyc`
2. System displays the current KYC level and requirements for the next level
3. User selects the document type to upload (e.g., Government-issued ID, Proof of Address, Selfie with ID)
4. User clicks the upload zone or drags and drops the file
5. System validates the file format (JPG, PNG, PDF) and size (max 5MB)
6. System uploads the file to Cloudinary
7. System saves the document record with status "pending_review"
8. System displays a success message with the estimated review time ("24-48 hours")
9. System sends a notification to all KYC Officers about the new submission

**Alternative Flows:**
- **5a. Invalid file format:** System displays "Unsupported file format. Please upload JPG, PNG, or PDF."
- **5b. File too large:** System displays "File size exceeds the 5MB limit."
- **7a. Upload fails (network error):** System displays an error and allows the user to retry.

**Postconditions:**
- Document is stored in Cloudinary
- Document record created with status "pending_review"
- KYC Officers are notified

**Business Rules:**
- BR-KYC-01: Accepted file formats are JPG, PNG, and PDF only.
- BR-KYC-02: Maximum file size is 5MB per document.
- BR-KYC-03: Documents that are rejected can be re-uploaded by the user.

---

## UC-007: KYC Document Review (Admin)

| Field | Value |
|-------|-------|
| **Use Case ID** | UC-007 |
| **Name** | KYC Document Review |
| **Actor** | KYC Officer |
| **Description** | A KYC Officer reviews a user's submitted identity documents and approves or rejects them. |

**Preconditions:**
- KYC Officer is logged into the admin panel
- There are documents in the review queue with status "pending_review"
- Document has not been claimed by another officer

**Main Flow:**
1. KYC Officer navigates to `/admin/kyc`
2. System displays the queue of pending KYC submissions, sorted by submission time (oldest first)
3. KYC Officer clicks on a submission to review
4. System displays the user's details and the uploaded document(s) in a full-resolution viewer
5. KYC Officer examines the document for authenticity and clarity
6. KYC Officer clicks "Approve" or "Reject"
7. **If Approve:** System updates the document status to "approved," updates the user's KYC level, and records the action in the audit log
8. **If Reject:** System displays a required reason field; KYC Officer selects or types a rejection reason; system updates the document status to "rejected," notifies the user, and records the action in the audit log
9. System removes the submission from the pending queue

**Alternative Flows:**
- **4a. Document is unclear or corrupted:** KYC Officer rejects with reason "Document not clearly readable" and recommends the user re-upload.
- **7a. User already has a higher KYC level:** System skips level upgrade and only marks the document as approved.

**Postconditions:**
- Document status is updated to "approved" or "rejected"
- User's KYC level may be upgraded
- Audit log entry is created
- User receives a notification of the outcome

**Business Rules:**
- BR-KYCR-01: KYC level determines maximum deposit and investment limits per plan.
- BR-KYCR-02: All KYC review actions are recorded in the immutable audit log.
- BR-KYCR-03: A document can only be reviewed by one officer at a time (locked on open).

---

## UC-008: Cryptocurrency Deposit

| Field | Value |
|-------|-------|
| **Use Case ID** | UC-008 |
| **Name** | Cryptocurrency Deposit |
| **Actor** | Authenticated User |
| **Description** | A user deposits funds by sending cryptocurrency to a platform-provided wallet address. |

**Preconditions:**
- User is logged in
- User is on the deposit page (`/dashboard/deposit/crypto`)
- User has selected the appropriate mode (Demo or Live)

**Main Flow:**
1. User navigates to `/dashboard/deposit` and selects "Cryptocurrency"
2. System displays supported cryptocurrencies (BTC, ETH, USDT) with their networks
3. User selects a cryptocurrency and network (e.g., USDT on TRC-20)
4. System generates or retrieves the platform's wallet address for the selected crypto/network
5. System displays the wallet address as text and as a QR code
6. System displays the minimum deposit amount for the selected crypto
7. User sends cryptocurrency from their external wallet to the displayed address
8. System monitors the blockchain for incoming transactions to the address
9. System detects the incoming transaction and begins tracking network confirmations
10. System displays a transaction status indicator showing confirmation progress (e.g., "3/6 confirmations")
11. Once the required number of confirmations is reached, system credits the user's wallet
12. System sends a notification to the user that the deposit has been credited
13. Transaction record is created with status "completed"

**Alternative Flows:**
- **9a. Amount below minimum:** System detects the transaction but marks it as "below minimum." User is notified and the transaction is flagged for admin review.
- **10a. Transaction not confirmed within 24 hours:** System marks the transaction as "stale" and notifies the user. Admin review may be required.

**Postconditions:**
- User's wallet balance is increased by the deposit amount
- Transaction record created with full details (tx hash, amount, confirmations, timestamp)
- User notified of successful credit

**Business Rules:**
- BR-CD-01: Each cryptocurrency has a defined minimum deposit amount displayed before the user sends funds.
- BR-CD-02: Funds are only credited after the required number of network confirmations.
- BR-CD-03: Demo mode deposits are simulated and do not involve actual cryptocurrency.

---

## UC-009: Gift Card Deposit

| Field | Value |
|-------|-------|
| **Use Case ID** | UC-009 |
| **Name** | Gift Card Deposit |
| **Actor** | Authenticated User |
| **Description** | A user deposits funds by submitting a gift card for admin verification and subsequent crediting. |

**Preconditions:**
- User is logged in
- User is in Live mode (gift card deposits not available in Demo mode)
- User has a physical or digital gift card

**Main Flow:**
1. User navigates to `/dashboard/deposit` and selects "Gift Card"
2. System displays the gift card deposit form
3. User selects the gift card brand from a dropdown (e.g., Amazon, Google Play, Apple, etc.)
4. User enters the card value (numeric input)
5. User enters the card code (masked input for security)
6. User uploads a screenshot or photo of the gift card
7. System validates the file format (JPG, PNG) and size (max 5MB)
8. System uploads the image to Cloudinary
9. User clicks "Submit Deposit"
10. System creates a deposit record with status "pending_verification"
11. System displays a confirmation message: "Your gift card deposit is pending verification. Estimated time: 24-48 hours."
12. System notifies admins of the new gift card deposit

**Alternative Flows:**
- **7a. Invalid file:** System displays an error message (see UC-006 alternative flows).
- **10a. Duplicate card code detected:** System checks for duplicate card codes across all submissions and flags potential duplicates to the admin.

**Postconditions:**
- Gift card deposit record created with status "pending_verification"
- Image stored in Cloudinary
- Admins notified of new submission

**Business Rules:**
- BR-GC-01: Gift card deposits are only available in Live mode.
- BR-GC-02: Gift card deposits require manual admin verification before crediting.
- BR-GC-03: The card value credited equals the face value of the gift card.

---

## UC-010: Gift Card Verification (Admin)

| Field | Value |
|-------|-------|
| **Use Case ID** | UC-010 |
| **Name** | Gift Card Verification |
| **Actor** | Admin |
| **Description** | An admin reviews a user's gift card submission, verifies its validity, and credits the user's wallet. |

**Preconditions:**
- Admin is logged into the admin panel
- There are gift card deposits with status "pending_verification"

**Main Flow:**
1. Admin navigates to `/admin/deposits` and filters by "Gift Card — Pending"
2. Admin selects a gift card deposit to review
3. System displays the uploaded gift card image, card brand, card value, card code, and user details
4. Admin verifies the gift card (externally checks card validity and balance)
5. Admin clicks "Verify & Credit" or "Reject"
6. **If Verified:** System updates the deposit status to "verified," credits the user's Live wallet with the card value, creates a transaction record, and notifies the user
7. **If Rejected:** System displays a required reason field; admin enters the reason; system updates the deposit status to "rejected" and notifies the user with the reason
8. Admin optionally adds internal notes (visible only to admins)
9. System records the action in the audit log

**Alternative Flows:**
- **4a. Card is partially redeemed:** Admin may credit only the remaining balance, noting the discrepancy.
- **4b. Card code is invalid:** Admin rejects with reason "Invalid card code."

**Postconditions:**
- Gift card deposit status is updated
- User's wallet may be credited (if verified)
- Audit log entry created
- User notified of outcome

**Business Rules:**
- BR-GCV-01: Only admins can verify gift card deposits.
- BR-GCV-02: The credited amount must not exceed the declared card value.
- BR-GCV-03: All verification actions (approve/reject) are logged in the audit log with the admin's ID and timestamp.

---

## UC-011: Investment Plan Purchase

| Field | Value |
|-------|-------|
| **Use Case ID** | UC-011 |
| **Name** | Investment Plan Purchase |
| **Actor** | Authenticated User |
| **Description** | A user selects an investment plan and allocates funds from their wallet to earn returns over the plan's duration. |

**Preconditions:**
- User is logged in with an active account
- User's KYC level permits the selected plan
- User has sufficient wallet balance in the selected mode (Demo or Live)

**Main Flow:**
1. User navigates to `/plans` or `/dashboard`
2. User selects an investment plan:
   - **Basic:** $200 — $4,999 | 24 hours
   - **Silver:** $5,000 — $9,999 | 72 hours
   - **Gold:** $10,000 — $49,999 | 7 days
   - **Platinum:** $50,000 — $100,000 | 14 days
3. User enters the investment amount
4. System validates the amount is within the plan's min/max range
5. System validates the user's wallet has sufficient available balance
6. System displays a confirmation summary: plan name, amount, expected return, duration, fee (if any), net return
7. User clicks "Confirm Investment"
8. System deducts the investment amount from the user's wallet
9. System creates an investment record with status "active," start time, and expected maturity time
10. System calculates the expected return based on the plan's rate
11. System redirects to the investments page and displays the new active investment
12. User receives a confirmation notification

**Alternative Flows:**
- **2a. Plan locked (KYC level too low):** System displays the plan as locked with a message "Upgrade your KYC level to access this plan" and a link to the KYC page.
- **4a. Amount below minimum:** System displays "Minimum investment for this plan is $X."
- **4b. Amount above maximum:** System displays "Maximum investment for this plan is $X."
- **5a. Insufficient balance:** System displays "Insufficient balance. You need $X more."

**Postconditions:**
- Investment record created with status "active"
- User's wallet balance is reduced by the investment amount
- Expected maturity time is calculated and stored
- User notified of the new investment

**Business Rules:**
- BR-IP-01: Investment amount must be within the plan's minimum and maximum range.
- BR-IP-02: The user's KYC level determines which plans are accessible.
- BR-IP-03: Investment mode (Demo/Live) must match the wallet mode toggle.

---

## UC-012: Investment Maturity Processing

| Field | Value |
|-------|-------|
| **Use Case ID** | UC-012 |
| **Name** | Investment Maturity Processing |
| **Actor** | System (Automated) |
| **Description** | The system automatically processes matured investments by crediting the return to the user's wallet. |

**Preconditions:**
- An investment exists with status "active"
- The current time has reached or exceeded the investment's maturity time

**Main Flow:**
1. A scheduled job (cron) runs every minute to check for matured investments
2. System queries all investments where status = "active" AND maturity_time <= now
3. For each matured investment, system calculates the final return (principal + expected return)
4. System updates the investment status from "active" to "completed"
5. System credits the user's wallet with the total return amount (principal + profit)
6. System creates a transaction record for the credit
7. System sends a notification to the user: "Your [Plan Name] investment has matured. $X has been credited to your wallet."

**Alternative Flows:**
- **3a. Return calculation error:** System flags the investment for admin review and does not credit automatically. Admin reviews and processes manually.
- **5a. User's account is banned:** System still completes the investment but places the return in a "held" status for admin review.

**Postconditions:**
- Investment status updated to "completed"
- User's wallet credited with the return
- Transaction record created
- User notified

**Business Rules:**
- BR-IM-01: Returns are automatically credited upon maturity without user intervention.
- BR-IM-02: The return amount is the principal investment plus the plan's expected return rate.
- BR-IM-03: The maturity processing job must run at least every 60 seconds to ensure timely processing.

---

## UC-013: Withdrawal Request

| Field | Value |
|-------|-------|
| **Use Case ID** | UC-013 |
| **Name** | Withdrawal Request |
| **Actor** | Authenticated User |
| **Description** | A user requests a withdrawal of funds from their Live wallet, subject to the platform's 21% withdrawal fee. |

**Preconditions:**
- User is logged in with an active account
- User is in Live mode
- User has sufficient available balance in their Live wallet
- Minimum withdrawal amount is met

**Main Flow:**
1. User navigates to `/dashboard/withdraw`
2. User enters the withdrawal amount
3. System validates the amount against the minimum withdrawal limit and available balance
4. System calculates and displays the fee breakdown:
   - Gross withdrawal amount
   - Withdrawal fee (21%)
   - Net amount (gross - fee)
5. User selects or enters their cryptocurrency wallet address for receiving funds
6. System validates the wallet address format
7. User clicks "Request Withdrawal"
8. If 2FA is enabled, system prompts for TOTP code; user enters and system validates
9. System creates a withdrawal record with status "pending"
10. System reserves the gross amount from the user's available balance
11. System sends a notification to the user and to admins
12. System displays a confirmation: "Your withdrawal request of $X (net: $Y after 21% fee) has been submitted."

**Alternative Flows:**
- **3a. Amount below minimum:** System displays "Minimum withdrawal amount is $X."
- **3b. Insufficient balance:** System displays "Insufficient available balance."
- **8a. Invalid TOTP:** System displays "Invalid code. Please try again." (max 3 attempts, then withdrawal is cancelled).

**Postconditions:**
- Withdrawal record created with status "pending"
- Gross amount reserved from user's wallet (available balance reduced)
- Admins notified of new withdrawal request

**Business Rules:**
- BR-WR-01: All withdrawals are subject to a 21% platform fee.
- BR-WR-02: Withdrawals are only available from the Live mode wallet.
- BR-WR-03: If 2FA is enabled, TOTP verification is required to submit a withdrawal.

---

## UC-014: Withdrawal Processing (Admin)

| Field | Value |
|-------|-------|
| **Use Case ID** | UC-014 |
| **Name** | Withdrawal Processing |
| **Actor** | Admin |
| **Description** | An admin reviews and processes pending withdrawal requests, approving fund transfers to users. |

**Preconditions:**
- Admin is logged into the admin panel
- There are withdrawal requests with status "pending"

**Main Flow:**
1. Admin navigates to `/admin/withdrawals`
2. System displays the queue of pending withdrawals, sorted by request time (oldest first)
3. Admin clicks on a withdrawal request to review details
4. System displays: user details (name, email, KYC level), requested amount, fee, net amount, wallet address, request timestamp
5. Admin reviews the user's account for any flags (recent KYC change, suspicious activity)
6. Admin clicks "Approve" or "Reject"
7. **If Approve:** System updates withdrawal status to "processing," admin processes the actual crypto transfer externally, then marks as "completed" with transaction hash
8. **If Reject:** System displays a required reason field; admin enters the reason; system updates the withdrawal status to "rejected," releases the reserved funds back to the user's available balance, and notifies the user
9. System records the action in the audit log

**Alternative Flows:**
- **5a. User's KYC is under review:** Admin may hold the withdrawal and request KYC completion before processing.
- **7a. Transfer fails:** Admin marks the withdrawal as "failed," notes the reason, and the reserved funds are released back to the user.

**Postconditions:**
- Withdrawal status updated
- If approved and completed: user receives funds
- If rejected: reserved funds returned to user's wallet
- Audit log entry created
- User notified of outcome

**Business Rules:**
- BR-WP-01: Admins must verify user KYC level before approving withdrawals.
- BR-WP-02: The 21% fee is retained by the platform; only the net amount is sent to the user.
- BR-WP-03: Reserved funds are released back to the user's wallet if the withdrawal is rejected or fails.

---

## UC-015: Referral Link Generation

| Field | Value |
|-------|-------|
| **Use Case ID** | UC-015 |
| **Name** | Referral Link Generation |
| **Actor** | Authenticated User |
| **Description** | A user accesses their unique referral link and code to invite others to the platform. |

**Preconditions:**
- User is logged in with an active account
- User has a referral code (auto-generated at registration)

**Main Flow:**
1. User navigates to `/dashboard/referrals`
2. System displays the user's unique referral code (e.g., `ABC12345`)
3. System displays the full referral link (e.g., `https://platform.com/register?ref=ABC12345`)
4. User clicks "Copy Link" to copy the referral URL to clipboard
5. System displays a success toast: "Link copied to clipboard!"
6. User clicks a share icon to share via email, Twitter/X, Telegram, WhatsApp, or Facebook
7. System displays referral statistics: total referrals, active referrals, total commissions earned

**Alternative Flows:**
- **4a. Clipboard API not available:** System falls back to selecting the text for manual copy.
- **6a. Share API not available (older browsers):** System opens a pre-filled email compose window as fallback.

**Postconditions:**
- User has access to their referral link and sharing tools
- Referral statistics are visible

**Business Rules:**
- BR-RL-01: Each user receives a unique, non-changeable referral code at registration.
- BR-RL-02: The referral code is included in the registration URL as a query parameter.
- BR-RL-03: A user is credited as a referrer only when the referred user registers using their referral link/code.

---

## UC-016: Referral Commission Calculation

| Field | Value |
|-------|-------|
| **Use Case ID** | UC-016 |
| **Name** | Referral Commission Calculation |
| **Actor** | System (Automated) |
| **Description** | The system calculates and credits the 10% direct referral commission when a referred user makes a deposit. |

**Preconditions:**
- User B was referred by User A (referral relationship exists)
- User B has made a qualifying deposit

**Main Flow:**
1. User B completes a deposit (crypto credited or gift card verified)
2. System identifies User B's referrer (User A)
3. System calculates the commission: 10% of User B's deposit amount
4. System creates a commission record with status "credited" for User A
5. System credits the commission amount to User A's wallet
6. System creates a transaction record for User A showing the referral commission credit
7. System sends a notification to User A: "You earned $X from [User B]'s deposit!"

**Alternative Flows:**
- **2a. No referrer:** System skips commission calculation (no parent referrer).
- **4a. User A's account is banned:** System still creates the commission record but places it in "held" status for admin review upon account reinstatement.

**Postconditions:**
- Commission record created and linked to the deposit
- Referrer's wallet credited (or held if banned)
- Both users can view the commission in their referral history

**Business Rules:**
- BR-RC-01: Direct referral commission is 10% of the referred user's deposit amount.
- BR-RC-02: Commission is credited immediately upon the referred user's deposit being finalized.
- BR-RC-03: Commissions are tracked separately from regular deposits in the transaction history.

---

## UC-017: Binary Bonus Calculation

| Field | Value |
|-------|-------|
| **Use Case ID** | UC-017 |
| **Name** | Binary Bonus Calculation |
| **Actor** | System (Automated) |
| **Description** | The system calculates weekly binary bonuses based on the weaker leg's investment volume in the user's binary referral tree. |

**Preconditions:**
- User has at least one referral in both left and right legs of their binary tree
- The weekly calculation period has ended (e.g., every Sunday at 00:00 UTC)

**Main Flow:**
1. A scheduled job triggers the weekly binary bonus calculation at the configured time
2. For each user with a binary referral tree, system calculates the total investment volume in the left leg for the week
3. System calculates the total investment volume in the right leg for the week
4. System identifies the weaker leg (lower volume)
5. System calculates the binary bonus based on the weaker leg volume and the applicable bonus percentage
6. System creates a commission record with type "binary_bonus" for the user
7. System credits the bonus amount to the user's wallet
8. System sends a notification summarizing the weekly binary bonus
9. System resets the weekly volume counters for the next period

**Alternative Flows:**
- **4a. One leg has zero volume:** No binary bonus is calculated for the period (both legs must have activity).
- **5a. User is on a lower bonus tier:** System applies the bonus percentage corresponding to the user's current tier based on total downline volume.

**Postconditions:**
- Binary bonus calculated and credited for eligible users
- Weekly volume counters reset
- Users notified of their bonus amounts
- Commission history updated

**Business Rules:**
- BR-BB-01: Binary bonus is calculated on the volume of the weaker (weakest) leg only.
- BR-BB-02: Both left and right legs must have non-zero volume for the week to qualify for a bonus.
- BR-BB-03: Binary bonus calculations run on a fixed weekly schedule.

---

## UC-018: Support Ticket Creation

| Field | Value |
|-------|-------|
| **Use Case ID** | UC-018 |
| **Name** | Support Ticket Creation |
| **Actor** | Authenticated User |
| **Description** | A user creates a support ticket to request help or report an issue. |

**Preconditions:**
- User is logged in with an active account
- User is on the support page (`/dashboard/support`)

**Main Flow:**
1. User navigates to `/dashboard/support`
2. User clicks "Create New Ticket"
3. System displays the ticket creation form
4. User selects a category (Account, Deposit, Withdrawal, Investment, Referral, Other)
5. User enters a subject line
6. User enters a detailed description of their issue
7. User optionally attaches files (screenshots, documents)
8. User clicks "Submit Ticket"
9. System validates all required fields
10. System creates a ticket record with status "open," assigned to "unassigned"
11. System sends a notification to the user: "Your support ticket #[ID] has been created."
12. System adds the ticket to the admin support queue

**Alternative Flows:**
- **7a. File attachment too large:** System displays "File size exceeds the 5MB limit."
- **9a. Missing required fields:** System highlights the missing fields with error messages.

**Postconditions:**
- Support ticket created with status "open"
- User can view the ticket in their ticket list
- Ticket appears in the admin support queue

**Business Rules:**
- BR-ST-01: Subject and description are required fields.
- BR-ST-02: File attachments are limited to 5MB each.
- BR-ST-03: Tickets are automatically assigned a unique ID for reference.

---

## UC-019: Admin User Management

| Field | Value |
|-------|-------|
| **Use Case ID** | UC-019 |
| **Name** | Admin User Management |
| **Actor** | Admin |
| **Description** | An admin searches, views, edits, and manages user accounts from the admin panel. |

**Preconditions:**
- Admin is logged into the admin panel
- Admin has the `user.view` and `user.update` permissions

**Main Flow:**
1. Admin navigates to `/admin/users`
2. System displays a paginated, sortable, filterable list of all users
3. Admin uses the search bar to find a specific user by name, email, or referral code
4. Admin clicks on a user to open their detailed profile
5. System displays: personal info, KYC status, wallet balances (Demo + Live), active investments, transaction history, referral tree
6. Admin clicks "Edit" to modify user details
7. Admin updates the desired fields (name, email, KYC level override)
8. Admin clicks "Save Changes"
9. System validates the changes and updates the user record
10. System records the action in the audit log
11. Admin may click "Ban User" to suspend the account, entering a required reason
12. System updates the user's status to "banned" and invalidates all active sessions

**Alternative Flows:**
- **3a. No results found:** System displays "No users found matching your search criteria."
- **11a. User is already banned:** The button changes to "Unban User." Clicking it restores the account to "active" status.

**Postconditions:**
- User record may be updated
- User may be banned or unbanned
- All actions recorded in the audit log

**Business Rules:**
- BR-UM-01: Only admins with appropriate permissions can manage users.
- BR-UM-02: Banning a user immediately invalidates all their active sessions.
- BR-UM-03: KYC level override is restricted to Super Admin only.
- BR-UM-04: All user management actions are logged in the audit log.

---

## UC-020: Admin System Settings Update

| Field | Value |
|-------|-------|
| **Use Case ID** | UC-020 |
| **Name** | Admin System Settings Update |
| **Actor** | Admin / Super Admin |
| **Description** | An admin updates platform-wide system settings including fees, email configuration, feature flags, and other operational parameters. |

**Preconditions:**
- Admin is logged into the admin panel
- Admin has the `settings.update` permission (some settings restricted to Super Admin)

**Main Flow:**
1. Admin navigates to `/admin/settings`
2. System displays current system settings organized in sections:
   - **General:** Platform name, maintenance mode toggle
   - **Fees:** Withdrawal fee percentage (default 21% — Super Admin only)
   - **Investment Plans:** Plan details, enable/disable (Super Admin only)
   - **Email:** SMTP configuration, email templates (via Resend)
   - **Feature Flags:** Enable/disable specific features
3. Admin modifies the desired setting(s)
4. Admin clicks "Save Settings"
5. System validates all changes (fee must be 0-100%, email config must be valid, etc.)
6. System updates the settings in the database
7. System records the change in the audit log with old and new values
8. System displays a success message: "Settings updated successfully"

**Alternative Flows:**
- **5a. Invalid fee percentage:** System displays "Fee must be between 0% and 100%."
- **5b. Invalid email configuration:** System sends a test email to verify the configuration before saving.
- **6a. Cache invalidation required:** System clears relevant Redis cache entries so updated settings take effect immediately.

**Postconditions:**
- System settings updated in the database
- Redis cache invalidated for affected settings
- Audit log updated with change details

**Business Rules:**
- BR-SS-01: Fee percentage changes are restricted to Super Admin.
- BR-SS-02: All setting changes are recorded in the audit log with previous and new values.
- BR-SS-03: Settings take effect immediately upon saving (cache cleared).

---

*End of Use Cases Document — Phase 1*