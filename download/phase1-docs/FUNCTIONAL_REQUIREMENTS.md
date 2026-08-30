# Functional Requirements

## 1. User Registration and Onboarding

### 1.1 Email Registration

The registration flow begins on a dedicated registration page accessible from the public site navigation and marketing call-to-action buttons. The form collects the user's email address, a password (with real-time strength validation requiring minimum 8 characters, at least one uppercase letter, one lowercase letter, and one number), and an optional referral code field. If the user arrived at the registration page via a referral link, the referral code field is pre-populated from the URL parameter and read-only. The form validates that the email is not already registered, the password meets complexity requirements, and the password confirmation matches before submission.

Upon successful form validation, the system creates a user record in a "pending verification" state, generates an email verification token with a configurable expiration (default: 24 hours), and sends a verification email to the provided address using the Resend + React Email pipeline. The email contains a unique verification link that, when clicked, activates the user's account, sets their KYC level to Level 0 (unverified), credits their Demo wallet with the configured starting balance, and redirects them to the login page with a success message.

### 1.2 Referral Code Capture

The referral code field during registration accepts alphanumeric codes and validates the code against the database of active referral codes. If the code is valid, the system records the referring user's ID as the new user's sponsor. This relationship is immutable once set -- a user's sponsor cannot be changed after registration. If the referral code is invalid or belongs to a suspended account, the form displays an error message and does not allow registration to proceed with that code. The referral code field is optional; users may register without a referral code.

### 1.3 Terms Acceptance

Before the registration form can be submitted, the user must check a checkbox confirming that they have read and agree to the platform's Terms of Service and Privacy Policy. Both documents must be accessible via hyperlinks that open in new tabs or modal overlays so the user can review them without losing their form progress. The checkbox cannot be pre-checked, and the submit button remains disabled until the checkbox is checked. The system records the timestamp of terms acceptance on the user record for audit purposes.

### 1.4 Email Verification

The email verification flow supports both link-based verification (user clicks a URL in the email) and code-based verification (user enters a 6-digit code displayed in the email into the application). The link-based approach is the primary method, with the code-based approach serving as a fallback for users whose email clients strip or break verification links. After successful verification, the user's KYC level is set to Level 1 (email verified), and they are redirected to the dashboard with an onboarding prompt to complete their profile and proceed with KYC verification. Unverified accounts that do not verify within the token expiration window receive a reminder email and may have their account flagged for cleanup after an extended period.

## 2. Authentication

### 2.1 Login

The login page accepts the user's email address and password. Upon submission, the system validates the credentials against the database, checks that the account is not suspended or banned, and verifies that the email has been confirmed (Level 1 KYC minimum). Successful authentication generates a session token (JWT) that is stored in an HTTP-only, secure, SameSite cookie. The user is redirected to their dashboard. Failed login attempts increment a counter on the user account; after 5 consecutive failed attempts, the account is temporarily locked for 15 minutes and the user is notified via email of the lockout. Each failed attempt also triggers a rate limiter at the IP level to prevent brute-force attacks.

### 2.2 Logout

Logout invalidates the current session token on the server side and clears the session cookie from the client. The user is redirected to the login page with a confirmation message. All active sessions for the user may optionally be invalidated on logout (configurable behavior), forcing re-authentication on all devices.

### 2.3 Two-Factor Authentication (2FA)

Users can enable 2FA from their account security settings. The platform uses TOTP (Time-based One-Time Password) as the 2FA method, compatible with authenticator apps such as Google Authenticator, Authy, and similar applications. The setup flow displays a QR code encoding the TOTP secret, provides the secret key as text for manual entry, and requires the user to enter a valid 6-digit code from their authenticator app to confirm setup. Backup recovery codes (a set of 10 single-use codes) are generated during setup and displayed once for the user to save securely.

Once 2FA is enabled, the login flow requires the user to enter their TOTP code after successful email/password authentication. If the user does not have access to their authenticator app, they can use one of their backup recovery codes. Each backup code can be used only once, and the system notifies the user when they have fewer than 3 remaining backup codes, recommending they regenerate a new set. Users can disable 2FA at any time from their security settings, but must enter a valid TOTP code to confirm the disable action.

### 2.4 Password Reset

Users can request a password reset from the login page by entering their registered email address. The system generates a password reset token (configurable expiration, default: 1 hour), sends a reset email containing a link, and records the token. Clicking the link navigates the user to a password reset form where they enter a new password (subject to the same complexity requirements as registration) and confirm it. Upon successful reset, all existing sessions for the user are invalidated, forcing re-authentication on all devices. A confirmation email is sent notifying the user that their password was changed.

### 2.5 Session Management

Each successful login creates a session record storing the user ID, session token, device information (user agent, OS, browser), IP address, and login timestamp. Users can view all active sessions from their security settings page, showing the device, location (derived from IP), and last active time. Users can terminate individual sessions or all sessions except the current one. Sessions have a configurable maximum lifetime (default: 7 days) and are refreshed on each authenticated request using a sliding window approach. Expired sessions are cleaned up by a scheduled background process.

### 2.6 Device Tracking

The system tracks and displays the devices from which a user has logged in, including the device type (desktop, mobile, tablet), operating system, browser, IP address, approximate location (city/country level from IP geolocation), and last login timestamp. New device logins trigger an optional security email notification informing the user of the new login. If 2FA is enabled, the device tracking data is displayed alongside the 2FA status on the security settings page, giving users a comprehensive view of their account's access history.

## 3. KYC Verification

### 3.1 Verification Levels

The KYC system operates on three levels, each unlocking additional platform capabilities as described in [BUSINESS_REQUIREMENTS](./BUSINESS_REQUIREMENTS.md) Section 3. Users must progress through levels sequentially -- Level 2 cannot be achieved without first completing Level 1, and Level 3 requires Level 2 completion.

**Level 1 -- Email Verified:** Achieved automatically upon email verification during registration. Allows Demo mode usage and public page access. Does not permit Live mode deposits or investments.

**Level 2 -- Identity Verified:** Requires upload of a valid government-issued photo ID (passport, national ID card, or driver's license). The uploaded document undergoes verification (manual by administrators or automated via third-party KYC service). Allows Live mode deposits and investments up to the Gold plan tier ($49,999).

**Level 3 -- Address Verified:** Requires proof of address document (utility bill, bank statement, or government correspondence issued within the last 90 days) in addition to the Level 2 ID verification. Allows Live mode deposits and investments up to the Platinum plan tier ($100,000) and unlocks the highest withdrawal limits.

### 3.2 Document Upload

The document upload interface allows users to upload images (JPG, PNG, PDF format, maximum file size 10MB) of their identification and address documents. For ID verification, users select the document type (passport, national ID, driver's license), upload the front of the document, and optionally upload the back if required by the selected document type. For passport uploads, the photo page is required.

The upload interface includes clear instructions on acceptable document criteria: the document must be valid (not expired), the full document must be visible (all corners, no cropping), the image must be clear and legible (no blur, glare, or shadows), and the document must match the user's registered name and date of birth. Uploaded documents are stored securely in Cloudinary with restricted access -- only administrators with appropriate permissions can view KYC documents.

### 3.3 Selfie Verification

As part of the Level 2 verification process, users are required to take a live selfie (or upload a recent photo) for facial comparison against the photo on their submitted ID document. The selfie capture interface uses the device's camera (via the browser's MediaDevices API) with on-screen guidance to center the face, ensure adequate lighting, and remove glasses or headwear. If a live camera capture is not possible, users can upload a photo. The selfie is stored alongside the ID document for administrative or automated comparison.

### 3.4 Proof of Address

Level 3 verification requires a proof of address document. Acceptable documents include utility bills (electricity, gas, water, internet), bank statements, or official government correspondence. The document must be dated within the last 90 days, show the user's full name and residential address, and be in English or accompanied by a certified translation. The uploaded document is reviewed by administrators who verify the name matches the user's profile, the address is complete and matches the declared country, and the document date is within the acceptable window.

### 3.5 Verification Status and Notifications

Users see their current KYC level displayed prominently in their dashboard and profile settings. Each pending verification shows a status indicator: Pending (submitted, awaiting review), Under Review (an admin is actively reviewing), Approved, or Rejected. Rejections include a reason code and a human-readable explanation so users understand what to correct. Users can resubmit documents after a rejection. All KYC status changes trigger in-app notifications and email notifications to keep users informed of their verification progress.

## 4. Wallet System

### 4.1 Balance Display

The wallet section of the user dashboard displays the user's current balances separated by mode (Demo and Live). Each mode shows three balance figures: Available Balance (funds available for deposits into investment plans or withdrawals), Pending Balance (funds from deposits currently being confirmed or returns from plans that have matured but not yet credited), and Total Balance (the sum of available and pending). The active mode's balance is displayed prominently, with the inactive mode's balance accessible via the mode switcher. All amounts are displayed in the user's preferred currency as configured in their profile settings, with the underlying USD value shown as a reference.

### 4.2 Transaction History

The wallet includes a comprehensive transaction history showing all credits, debits, and transfers associated with the user's account. Each transaction record includes: a unique transaction ID, timestamp, type (deposit, withdrawal, investment funding, return credit, referral commission, binary bonus), amount (positive for credits, negative for debits), running balance after the transaction, status (completed, pending, failed, reversed), and a description. The transaction history supports filtering by type, date range, and status, as well as pagination for users with extensive histories. Transactions are displayed separately for Demo and Live modes based on the active mode, with an option to view the other mode's history.

### 4.3 Pending and Available Balance Logic

When a user initiates a deposit, the deposited amount initially enters the Pending Balance. For cryptocurrency deposits, the amount moves from Pending to Available only after the required blockchain confirmations are reached and the deposit is marked as confirmed. For gift card deposits, the amount moves from Pending to Available only after an administrator approves the verification. When a user funds an investment plan, the invested amount is deducted from Available Balance. When a plan matures, the return is initially credited to Pending Balance and moved to Available Balance after a brief processing period (configurable, default: immediate). Withdrawals are deducted from Available Balance at the time of request.

## 5. Deposit System

### 5.1 Cryptocurrency Deposit Flow

The cryptocurrency deposit page presents the three supported currencies (BTC, ETH, USDT) as selectable options. Upon selecting a currency, the system generates a unique deposit address (or retrieves an existing unused address for the user) and displays it alongside a QR code. The page shows the current exchange rate for the selected cryptocurrency to USD, updates this rate at regular intervals, and notes the rate lock window. Users are instructed to send only the selected cryptocurrency to the displayed address -- sending any other cryptocurrency or token will result in permanent loss of funds, and the platform must display a clear warning to this effect.

After the user sends funds, the system begins monitoring the blockchain for incoming transactions to the user's deposit address. The deposit page shows a "pending" state with the expected number of confirmations and a real-time counter of confirmations received. Once the required confirmations are met, the deposit is marked as confirmed, the USD equivalent is calculated at the confirmation-time rate, and the amount is credited to the user's wallet. The user receives an in-app notification and email confirming the successful deposit.

### 5.2 Gift Card Deposit Flow

The gift card deposit flow is documented in detail in [BUSINESS_REQUIREMENTS](./BUSINESS_REQUIREMENTS.md) Section 5. From a functional perspective, the deposit page presents a "Gift Card" tab alongside the cryptocurrency options. Selecting this tab reveals the gift card deposit form, which includes: a dropdown to select the gift card brand from the list of accepted brands, an input field for the card's face value, and a file upload component for the card image (photo or screenshot). The upload component accepts common image formats (JPG, PNG, WEBP) with a maximum file size of 10MB and includes drag-and-drop support alongside the traditional file picker.

Upon submission, the deposit enters a "Pending Verification" state. The user sees this deposit in their transaction history with a clear status indicator. The admin dashboard's deposit verification queue surfaces all pending gift card deposits for review. Administrators can view the uploaded image at full resolution, see the user's submission history (number of previous gift card deposits, approval/rejection ratio), and approve or reject the deposit with a required reason for rejections. Upon approval, the face value is credited to the user's Available Balance, and a notification is sent. Upon rejection, no funds are credited, and the user receives a notification with the rejection reason and guidance on next steps.

### 5.3 Deposit Limits and Validation

Each deposit method has a minimum USD equivalent of $10 and is subject to the maximum investment plan limit of $100,000 per deposit. Users attempting to deposit amounts outside this range receive a clear validation message. For cryptocurrency deposits, the system validates the sent amount against the minimum before crediting (if the blockchain-confirmed amount is below the minimum after conversion, the deposit is flagged for admin review rather than automatically credited). There is no limit on the number of deposits a user can make, but the system tracks cumulative deposits for reporting and compliance purposes.

## 6. Investment Plans

### 6.1 Plan Browsing and Selection

The investment plans page displays all four tiers (Basic, Silver, Gold, Platinum) as cards showing the plan name, minimum and maximum deposit amounts, duration, expected return rate, and any tier-specific features (priority support, dedicated account manager). Each card indicates the KYC level required for that plan. Plans for which the user does not meet the KYC requirement are visually distinguished (grayed out or locked) with a prompt to complete the required verification. The current mode (Demo or Live) is displayed on the page to remind users which balance they are investing from.

### 6.2 Plan Funding

When a user selects a plan, they are presented with a funding form that pre-selects the plan tier and shows their Available Balance for the current mode. The user enters the investment amount, which must fall within the plan's minimum and maximum range. The form validates the amount against the user's Available Balance and the plan limits in real time, showing error messages if the amount is too low, too high, or exceeds the available balance. Upon confirmation, the invested amount is deducted from the user's Available Balance, and an active investment record is created with the plan details, start timestamp, expected maturity timestamp, and the expected return amount.

### 6.3 Active Investment Tracking

The user's dashboard displays all active investments in a table or card list showing: the plan tier, invested amount, start date and time, expected maturity date and time, time remaining (as a countdown or progress bar), expected return amount, and current status (Active, Maturing, Completed, Failed). Investments that are nearing maturity (within 1 hour) may be highlighted to draw the user's attention. Completed investments show the actual return credited and a link to the corresponding wallet transaction.

### 6.4 Maturity and Returns Crediting

When an investment plan reaches its maturity timestamp, a background process (scheduled task or event-driven worker) processes the maturity. The system calculates the return based on the invested principal and the applicable return rate (0.5% daily multiplied by the number of days in the plan duration). The return amount is credited to the user's wallet (first to Pending Balance, then immediately to Available Balance). The investment record is updated to "Completed" status with the actual return amount and completion timestamp. An in-app notification and email are sent to the user informing them that their investment has matured and the return has been credited.

Users can choose to reinvest their returns by navigating to the investment plans page and funding a new plan. The platform may display a "Reinvest" button on completed investments that pre-fills a new investment form with the returned amount, streamlining the compounding process. Multiple active investments are supported across different tiers, and each is tracked independently.

## 7. Withdrawal System

### 7.1 Withdrawal Request

The withdrawal page displays the user's Available Balance and provides a form to initiate a withdrawal. The user enters the desired gross withdrawal amount (subject to the minimum of $10 net, as detailed in [BUSINESS_REQUIREMENTS](./BUSINESS_REQUIREMENTS.md) Section 6). The form calculates and displays the 21% fee, the net amount the user will receive, and a brief explanation of what the fee covers. The user selects the withdrawal destination (cryptocurrency wallet address, with the address validated for format correctness based on the selected cryptocurrency network).

Before submission, the system validates that the requested amount does not exceed the Available Balance, that the net amount meets the minimum threshold, and that the destination address is valid. The user must explicitly confirm the withdrawal, acknowledging the 21% fee deduction. Upon confirmation, the gross amount is deducted from the Available Balance and placed in a "Pending Withdrawal" state.

### 7.2 Fee Calculation and Display

The 21% withdrawal fee is calculated as: Fee = Gross Amount x 0.21. Net Amount = Gross Amount - Fee. The withdrawal form updates these calculations in real time as the user types or adjusts the withdrawal amount. The display format is: "Withdrawal Amount: $[gross] | Fee (21%): $[fee] | You Receive: $[net]." The fee breakdown explanation is displayed below the calculation with a professional, concise description of the fee components (account management, signal fees, insurance, certification, VAT).

### 7.3 Admin Approval Flow

All withdrawal requests enter the admin dashboard's withdrawal approval queue. Administrators see the user's information, KYC level, account history (deposits, previous withdrawals, active investments), the requested amount, fee, net amount, and destination address. The administrator can approve or reject the withdrawal. Rejection requires a reason, and the full gross amount is returned to the user's Available Balance with a notification. Approval moves the withdrawal to "Processing" status, and the actual fund transfer is initiated by the administrator or automated system.

### 7.4 Processing Status Tracking

Users can track their withdrawal status through the transaction history and a dedicated withdrawals section in their wallet. Each withdrawal shows a status progression: Requested (submitted, awaiting admin review), Under Review (admin is reviewing), Approved (approved, initiating transfer), Processing (transfer in progress), Completed (funds transferred), or Rejected (rejected, funds returned). For cryptocurrency withdrawals, once the transfer is broadcast to the blockchain, a transaction hash (TXID) is displayed to the user so they can track the transfer on a block explorer.

### 7.5 Completion Notification

When a withdrawal is completed (the blockchain transaction is confirmed or the transfer is otherwise finalized), the user receives an in-app notification and an email confirmation containing the withdrawal details: gross amount, fee, net amount, destination, transaction hash (for crypto), and completion timestamp. This provides the user with a complete record for their personal financial tracking.

## 8. Referral System

### 8.1 Referral Link and Code Generation

Upon registration, every user is assigned a unique referral code (alphanumeric, 8 characters) and a referral link in the format: `https://platform.com/register?ref=[CODE]`. The referral code and link are displayed on the user's referral dashboard with a one-click copy button for the link and a share button that opens the device's native share sheet or a modal with social media sharing options. Users can share their referral link via email, messaging apps, or social media platforms.

### 8.2 Referral Tracking

The referral dashboard displays a comprehensive list of the user's direct referrals showing: the referral's registration date, KYC level, total deposits, and current status (active, suspended, banned). The dashboard also shows aggregate statistics: total number of direct referrals, number of active referrals (those who have deposited), total commission earned from direct referrals, and pending commissions. The referral tracking system records the referral relationship at registration time, and this relationship is immutable.

### 8.3 Direct Commission Calculations

When a direct referral makes a deposit, the system immediately calculates the 10% commission and credits it to the sponsor's Live wallet Available Balance. The commission is calculated on the deposit amount in USD (after any cryptocurrency conversion). For example, a $500 deposit by a referral generates a $50 commission for the sponsor. Commissions are tracked per-deposit, and the full commission history is available in the sponsor's referral dashboard. There is no cap on direct referral commissions, and commissions are earned regardless of the sponsor's own investment activity.

### 8.4 Binary Tree Visualization

The binary tree visualization displays the user's referral network organized into a left leg and a right leg, extending at least three levels deep. Each node in the tree shows the referral's name (or partial identifier for privacy), total deposit volume, and status (active, inactive). The visualization uses a collapsible tree structure that allows users to expand or collapse branches. Color coding distinguishes between active users (those with deposits or recent activity) and inactive users. The total volume for each leg is displayed at the top level, along with the current week's volume for binary bonus calculation purposes.

### 8.5 Binary Bonus Calculations

The binary bonus calculation runs on a weekly cycle as described in [BUSINESS_REQUIREMENTS](./BUSINESS_REQUIREMENTS.md) Section 4. The system aggregates all new deposit volumes from each user's downline (both legs) for the current weekly cycle. At cycle close, the weaker leg's volume is used to calculate the bonus at the configured rate. The system checks that the user meets the minimum active investment pool requirement ($200 in active plans) before crediting any binary bonus. Eligible bonuses are credited to the user's Live wallet and recorded in their commission history with a "Binary Bonus" type designation.

### 8.6 Payout History

The referral dashboard includes a payout history section showing all commissions received (both direct referral and binary bonus), sorted by date with the most recent first. Each entry shows: date and time, commission type (Direct Referral or Binary Bonus), source (the referral's name/identifier or "Weekly Binary Bonus"), amount, and the wallet balance after the credit. This history supports filtering by commission type and date range, and can be exported as a CSV for personal record-keeping.

## 9. User Dashboard

### 9.1 Portfolio Summary

The dashboard landing page provides a high-level portfolio summary showing the user's total balance (Demo or Live, depending on active mode), total amount invested across active plans, total returns earned (both realized and pending), and a visual breakdown of their portfolio distribution by investment plan tier. For users with active investments, a summary card shows the next investment maturing (plan name, amount, expected return, time remaining) to create a sense of anticipation and engagement.

### 9.2 Active Investments Section

A dedicated section lists all active investments with key details: plan tier, invested amount, start date, maturity date, expected return, and a progress indicator showing time elapsed versus total duration. This section provides quick access to the full investment tracking view and allows users to see at a glance how their investments are progressing. Investments are sorted by maturity date (soonest first) by default.

### 9.3 Earnings Chart

The dashboard includes an earnings chart showing the user's cumulative earnings over time. The chart displays a line or area chart with time on the x-axis and cumulative returns on the y-axis. Data points are plotted at each investment maturity event. The chart is interactive, allowing users to hover over data points for detailed information and adjust the time range. For users in Demo mode, the chart reflects simulated earnings; for Live mode, it reflects actual returns. The chart uses the platform's charting library and follows the design system's color palette and styling conventions.

### 9.4 Transaction History

A condensed transaction history is displayed on the dashboard (with a link to the full wallet transaction history), showing the most recent 5-10 transactions. Each entry shows the type icon, description, amount, and timestamp. This provides users with immediate visibility into recent account activity without requiring navigation to a separate page.

### 9.5 Referral Statistics

For users with referrals, the dashboard displays a referral statistics card showing the total number of direct referrals, total referral commissions earned, and the current binary bonus eligibility status. This card includes a link to the full referral dashboard for detailed tracking and network visualization.

### 9.6 Account Settings

The account settings section, accessible from the dashboard navigation, provides options for editing personal information (name, phone number, address), changing the password (requires current password confirmation), managing 2FA (enable, disable, regenerate backup codes), setting preferred currency and language, and managing notification preferences. All changes are persisted immediately and reflected across the user's sessions.

## 10. Admin Dashboard

### 10.1 User Management

The admin user management section provides a searchable, filterable, and sortable list of all registered users. Each user record displays: registration date, email, KYC level, account status (active, suspended, banned), total deposits, total withdrawals, current balance, and referral count. Administrators can click into a user's detail view to see their full profile, transaction history, investment history, KYC documents, referral network, and support tickets. Actions available from the user detail view include: suspend account, ban account, reset password, manually adjust balance (with audit trail), and send a system notification to the user.

### 10.2 KYC Review Queue

The KYC review queue displays all pending verification submissions sorted by submission time (oldest first). Each entry shows the user's name, submitted document type, uploaded images (viewable in a lightbox or modal), and the user's current KYC level. Administrators can approve or reject each submission. Approvals advance the user's KYC level and trigger a notification to the user. Rejections require a reason code and optional explanation, which are communicated to the user via notification. The queue supports batch operations for efficiency when volumes are high.

### 10.3 Deposit Verification (Gift Cards)

The deposit verification queue specifically for gift card deposits displays all pending gift card submissions. Each entry shows the user's information, submitted card brand, declared face value, uploaded card image (viewable at full resolution), and the user's gift card history (previous submissions, approval rate). Administrators can approve (crediting the face value to the user's wallet) or reject (with a required reason). Repeated rejections for a user trigger a visual flag in the queue, alerting administrators to potential fraud patterns.

### 10.4 Withdrawal Approval

The withdrawal approval queue displays all pending withdrawal requests. Each entry shows the user's information, KYC level, requested amount, fee, net amount, destination address, account age, total lifetime deposits, and any risk flags. Administrators can approve (initiating the fund transfer) or reject (returning funds to the user's balance). The queue supports sorting by amount (highest first for priority review) and filtering by risk level or KYC status.

### 10.5 Investment Plan Management

Administrators can configure the investment plan parameters: plan names, minimum and maximum deposits, durations, return rates, and required KYC levels. Changes to plan parameters affect new investments only; existing active investments continue under the terms in effect at the time of funding. This section also provides an overview of active investments across all users: total capital invested, number of active plans by tier, and aggregate expected returns.

### 10.6 Referral and Commission Management

This section provides an overview of the referral system's performance: total registered users, percentage who joined via referral, total commissions paid, and binary bonus payout history by week. Administrators can view any user's referral tree and commission history. Commission rates (direct referral percentage, binary bonus percentage) and qualification thresholds (minimum active investment for binary eligibility) are configurable here.

### 10.7 System Settings

The system settings section allows administrators to configure platform-wide parameters including: exchange rate API sources and refresh intervals, deposit minimums and maximums, withdrawal fee percentage, withdrawal processing timeframes, KYC document requirements, email notification templates, support contact information, restricted jurisdictions list, and maintenance mode toggle. All configuration changes are logged in the audit trail with the administrator's identity and timestamp.

### 10.8 Reports

The reports section provides standard reports for platform operations: daily/weekly/monthly deposit volume, withdrawal volume, net flow, user registration trends, KYC verification rates, plan uptake distribution, referral conversion rates, and revenue from withdrawal fees. Reports are displayed as interactive tables and charts with the ability to filter by date range and export as CSV or PDF. Custom report creation is a future-phase feature.

## 11. Notifications

### 11.1 In-App Notification Center

The platform includes a notification bell icon in the navigation bar that displays the count of unread notifications. Clicking the icon opens a dropdown or dedicated page showing all notifications in reverse chronological order. Each notification includes: an icon indicating the type (transaction, security, system, marketing), a title, a message body, a timestamp, and a read/unread state. Users can mark individual notifications as read or mark all as read. Notifications persist indefinitely and are not deleted, though users can dismiss them from the visible list. The notification center supports filtering by type and read status.

### 11.2 Email Notifications

Email notifications are sent via Resend using React Email templates that match the platform's visual identity. Email notification types include:

- **Transaction Emails:** Deposit confirmed, withdrawal completed, investment return credited, referral commission received, binary bonus credited.
- **Security Emails:** New login detected, password changed, 2FA enabled/disabled, account locked due to failed attempts.
- **KYC Emails:** Verification submitted, verification approved, verification rejected with reason, reminder to complete verification.
- **System Emails:** Scheduled maintenance notice, new feature announcement, terms of service update.

Users can configure their email notification preferences from their account settings, choosing which categories they want to receive emails for. Unsubscribing from marketing emails does not affect transaction or security emails, which are mandatory for account security and transparency.

### 11.3 Notification Preferences

The notification preferences page allows users to control which in-app and email notifications they receive. Preferences are organized by category (Transactions, Security, KYC, Marketing, System) with individual toggle switches for each notification type within each category. Security notifications (new login, password change) cannot be fully disabled -- they can only be toggled between email and in-app delivery. The system respects these preferences for all subsequent notifications.

## 12. Support System

### 12.1 Support Ticket Creation

Users can create support tickets from a dedicated support page accessible from the dashboard navigation. The ticket creation form includes: a subject line (required, free text), a category dropdown (Account Issues, Deposits, Withdrawals, KYC Verification, Investment Plans, Referral Program, Technical Issues, Other), a priority selector (Low, Medium, High), and a message body (required, with rich text support for formatting). Users can attach files (screenshots, documents) to their ticket to help illustrate their issue. Upon submission, the ticket is assigned a unique ticket ID and enters the "Open" status.

### 12.2 Ticket Status Tracking

Users can view all their support tickets from the support page, sorted by most recent update. Each ticket displays: ticket ID, subject, category, priority, status (Open, In Progress, Awaiting User Response, Resolved, Closed), creation date, and last update date. Clicking a ticket opens the full conversation thread, showing all messages from the user and administrator responses in chronological order. Users can reply to their tickets to provide additional information or clarification. When an administrator responds, the user receives an in-app notification and an email (if email notifications for support are enabled).

### 12.3 FAQ and Knowledge Base

The public-facing FAQ page (accessible without login) provides answers to common questions organized by category. The initial FAQ should cover at least 20 questions spanning: account registration and verification, deposit methods and processing, investment plans and returns, withdrawal fees and processing, referral program details, security and 2FA, and general platform information. FAQ answers should be clear, concise, and link to relevant pages within the platform where appropriate. The FAQ content is manageable by administrators through the admin dashboard.

### 12.4 Contact Form

For users and visitors who have not registered or prefer not to create a support ticket, a public contact form is available on the Contact page. The form collects: name, email address, subject, and message. Submissions are routed to the support team's inbox and optionally create a guest support ticket. The submitter receives an auto-reply email acknowledging receipt and providing an estimated response time.

## 13. Profile Management

### 13.1 Personal Information

Users can edit their personal information from the profile settings page. Editable fields include: first name, last name, phone number (with country code selector), date of birth, country of residence, and residential address (street, city, state/province, postal code). Changes to name, date of birth, or country of residence may trigger a KYC re-verification requirement if these fields are used in KYC validation. The system logs all profile changes in the audit trail with timestamps.

### 13.2 Password Change

The password change form requires the user to enter their current password, a new password (subject to the standard complexity requirements), and a confirmation of the new password. Upon successful change, all existing sessions are invalidated (except the current session, which receives a refreshed token) and a security email is sent notifying the user that their password was changed. If the current password is incorrect, the form displays an error and does not proceed.

### 13.3 Two-Factor Authentication Management

The 2FA management section displays the current 2FA status (enabled/disabled), the date 2FA was last enabled, and the number of remaining backup codes. Users can enable 2FA (triggering the setup flow described in Section 2.3), disable 2FA (requiring a valid TOTP code to confirm), and regenerate backup codes (which invalidates all previous backup codes). All 2FA state changes are logged in the security audit trail.

### 13.4 Preferred Currency

Users can select their preferred display currency from a dropdown menu offering USD (default), EUR, GBP, and any additional currencies configured by administrators. The selection affects how monetary values are displayed throughout the platform but does not change the underlying USD-denominated balances. The current exchange rate and a "approximate" label are shown next to converted amounts to set appropriate expectations.

### 13.5 Language Preference

Users can select their preferred interface language from a dropdown menu listing all available translations. The selection is persisted in the user's profile and applied immediately. If the user's browser language matches an available translation, that language is pre-selected on first login. The language selector is also accessible from the public site footer for visitors who have not yet registered.

## 14. Charts and Analytics

### 14.1 Portfolio Performance Chart

The portfolio performance chart displays the user's total portfolio value over time, combining available balance and the current value of active investments (principal plus accrued returns). The chart uses a line or area chart with daily data points and supports time range selection (7 days, 30 days, 90 days, 1 year, all time). Hovering over data points shows the exact date and value. The chart is rendered using the platform's charting library and is responsive across all screen sizes.

### 14.2 Earnings Over Time Chart

The earnings over time chart shows cumulative returns received from matured investments. Each data point represents a plan maturity event, plotting the running total of returns. This chart provides users with a clear visualization of their investment performance and the compounding effect of reinvesting returns. The chart supports the same time range selection and interactivity as the portfolio performance chart.

### 14.3 Investment Distribution Chart

The investment distribution chart displays a pie or donut chart showing the allocation of the user's total invested capital across the four plan tiers. Each segment is labeled with the plan name and the percentage of total investment it represents. Hovering over a segment shows the exact amount invested in that tier. This visualization helps users understand their portfolio composition at a glance.

### 14.4 Referral Network Visualization

The referral network visualization (also described in Section 8.4) provides an interactive tree diagram showing the user's binary referral network. Beyond the basic tree structure, this visualization includes performance indicators: each node can display total deposit volume, active plan count, and commission generated. The visualization supports drill-down into deeper levels of the tree and provides summary statistics for each leg (total volume, active members, recent growth trend). This chart is critical for users who actively build their referral networks and need to monitor performance across both legs.