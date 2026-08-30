# Page Inventory — Enterprise Investment Platform

> **Project:** Managed Investment Plan Platform  
> **Phase:** 1 — Requirements & Specification  
> **Last Updated:** 2025

---

## 1. Public Pages (Unauthenticated)

### / (Home)

| Field | Value |
|-------|-------|
| **Route** | `/` |
| **Auth Required** | No |
| **Required Role(s)** | N/A |
| **Responsive** | Yes — Mobile / Tablet / Desktop |
| **Description** | Primary landing page for the platform |

**Key Components:**
- Navbar (logo, nav links, Login/Register buttons)
- Hero section (headline, subheadline, CTA buttons — "Get Started" and "View Plans")
- Features overview section (key platform features in a grid)
- Investment plan highlights section (plan cards with key details)
- Trust indicators section (user count, total invested, security badges)
- Testimonials or social proof section
- Newsletter signup section (email input)
- Footer (links, legal, social media)

**Related API Endpoints:** `GET /api/plans` (public plan data), `POST /api/newsletter`

---

### /about

| Field | Value |
|-------|-------|
| **Route** | `/about` |
| **Auth Required** | No |
| **Required Role(s)** | N/A |
| **Responsive** | Yes — Mobile / Tablet / Desktop |
| **Description** | Company information page |

**Key Components:**
- Navbar
- Hero banner with page title
- Company story section (narrative text)
- Mission and vision section
- Team section (team member cards with photos and roles)
- Platform statistics section (animated counters)
- CTA section (invite to register)
- Footer

**Related API Endpoints:** None (static content, or `GET /api/content/about` if CMS-managed)

---

### /plans

| Field | Value |
|-------|-------|
| **Route** | `/plans` |
| **Auth Required** | No |
| **Required Role(s)** | N/A |
| **Responsive** | Yes — Mobile / Tablet / Desktop |
| **Description** | Investment plan showcase with comparison |

**Key Components:**
- Navbar
- Page header ("Investment Plans")
- Plan cards (4 cards: Basic, Silver, Gold, Platinum)
  - Each card: plan name, min/max investment, duration, expected return, feature highlights
  - CTA button ("Invest Now" — links to register if not logged in, or to investment flow if logged in)
- Plan comparison table (side-by-side feature comparison)
- FAQ section (plan-related questions)
- CTA section
- Footer

**Related API Endpoints:** `GET /api/plans`

---

### /faq

| Field | Value |
|-------|-------|
| **Route** | `/faq` |
| **Auth Required** | No |
| **Required Role(s)** | N/A |
| **Responsive** | Yes — Mobile / Tablet / Desktop |
| **Description** | Frequently asked questions |

**Key Components:**
- Navbar
- Page header ("Frequently Asked Questions")
- Search bar (filters FAQ items)
- Category tabs (General, Account, Deposits, Investments, Withdrawals, Referrals, Security)
- Accordion-style FAQ items (question as trigger, answer as expandable content)
- CTA section ("Still have questions? Contact Support")
- Footer

**Related API Endpoints:** `GET /api/faq` or static content

---

### /contact

| Field | Value |
|-------|-------|
| **Route** | `/contact` |
| **Auth Required** | No |
| **Required Role(s)** | N/A |
| **Responsive** | Yes — Mobile / Tablet / Desktop |
| **Description** | Contact information and form |

**Key Components:**
- Navbar
- Page header ("Contact Us")
- Contact form (name, email, subject, message, submit button)
- Contact information sidebar (email address, working hours, location/region)
- Map or office location section (if applicable)
- Footer

**Related API Endpoints:** `POST /api/contact`

---

### /privacy-policy

| Field | Value |
|-------|-------|
| **Route** | `/privacy-policy` |
| **Auth Required** | No |
| **Required Role(s)** | N/A |
| **Responsive** | Yes — Mobile / Tablet / Desktop |
| **Description** | Privacy policy legal page |

**Key Components:**
- Navbar
- Page header ("Privacy Policy")
- Legal text content (structured with headings, paragraphs, lists)
- Last updated date
- Table of contents (sticky sidebar on desktop)
- Footer

**Related API Endpoints:** None (static or CMS content)

---

### /terms-of-service

| Field | Value |
|-------|-------|
| **Route** | `/terms-of-service` |
| **Auth Required** | No |
| **Required Role(s)** | N/A |
| **Responsive** | Yes — Mobile / Tablet / Desktop |
| **Description** | Terms of service legal page |

**Key Components:**
- Navbar
- Page header ("Terms of Service")
- Legal text content (structured with headings, paragraphs, lists)
- Last updated date
- Table of contents (sticky sidebar on desktop)
- Footer

**Related API Endpoints:** None (static or CMS content)

---

### /login

| Field | Value |
|-------|-------|
| **Route** | `/login` |
| **Auth Required** | No |
| **Required Role(s)** | N/A |
| **Responsive** | Yes — Mobile / Tablet / Desktop |
| **Description** | User login page |

**Key Components:**
- AuthLayout (centered card)
- Logo and "Welcome Back" heading
- Email input field
- Password input field (with show/hide toggle)
- "Remember Me" checkbox
- "Sign In" button (primary, full width)
- "Forgot Password?" link
- "Don't have an account? Register" link
- 2FA step (conditional): TOTP code input, "Verify" button
- Error/alert messages area

**Related API Endpoints:** `POST /api/auth/login`, `POST /api/auth/2fa/verify`

---

### /register

| Field | Value |
|-------|-------|
| **Route** | `/register` |
| **Auth Required** | No |
| **Required Role(s)** | N/A |
| **Responsive** | Yes — Mobile / Tablet / Desktop |
| **Description** | User registration page |

**Key Components:**
- AuthLayout (centered card)
- Logo and "Create Account" heading
- Full name input field
- Email input field
- Password input field (with strength indicator)
- Confirm password input field
- Referral code input field (optional, with info tooltip)
- Terms of service checkbox with link
- "Create Account" button (primary, full width)
- "Already have an account? Sign In" link
- Error/validation messages

**Related API Endpoints:** `POST /api/auth/register`

---

### /forgot-password

| Field | Value |
|-------|-------|
| **Route** | `/forgot-password` |
| **Auth Required** | No |
| **Required Role(s)** | N/A |
| **Responsive** | Yes — Mobile / Tablet / Desktop |
| **Description** | Password reset flow (multi-step) |

**Key Components:**
- AuthLayout (centered card)
- **Step 1 — Email Input:** Email field, "Send Reset Code" button, "Back to Login" link
- **Step 2 — OTP Verification:** OTP input (6 digits), "Verify" button, "Resend Code" link with cooldown timer
- **Step 3 — New Password:** New password field, confirm password field, "Reset Password" button
- Progress indicator showing current step
- Success state with link to login

**Related API Endpoints:** `POST /api/auth/forgot-password`, `POST /api/auth/verify-otp`, `POST /api/auth/reset-password`

---

### /verify-email

| Field | Value |
|-------|-------|
| **Route** | `/verify-email` |
| **Auth Required** | No |
| **Required Role(s)** | N/A |
| **Responsive** | Yes — Mobile / Tablet / Desktop |
| **Description** | Email verification page (post-registration) |

**Key Components:**
- AuthLayout (centered card)
- Logo and "Verify Your Email" heading
- Instructional text ("We've sent a 6-digit code to your email")
- OTP input (6 individual digit inputs with auto-focus)
- "Verify" button
- "Resend Code" link with 60-second cooldown timer
- Success state: checkmark animation, "Email verified!" message, "Continue to Login" button
- Error state: "Invalid or expired code" with retry option

**Related API Endpoints:** `POST /api/auth/verify-email`, `POST /api/auth/resend-otp`

---

## 2. Authenticated User Pages

### /dashboard

| Field | Value |
|-------|-------|
| **Route** | `/dashboard` |
| **Auth Required** | Yes |
| **Required Role(s)** | User, Admin, KYC Officer, Support Agent |
| **Responsive** | Yes — Mobile / Tablet / Desktop |
| **Description** | Main user dashboard with portfolio overview |

**Key Components:**
- DashboardLayout (sidebar, top bar, content)
- ModeToggle (Demo / Live — prominent, always visible)
- StatCard — Total Balance (Demo/Live)
- StatCard — Active Investments count
- StatCard — Total Earnings
- StatCard — Referral Earnings
- LineChart — portfolio performance over time
- Active Investments list (top 3-5, with "View All" link)
- Recent Transactions list (top 5-10, with "View All" link)
- Quick Action buttons (Deposit, Invest, Withdraw, Refer)

**Related API Endpoints:** `GET /api/dashboard/summary`, `GET /api/dashboard/chart-data`, `GET /api/investments?status=active&limit=5`, `GET /api/transactions?limit=10`

---

### /dashboard/investments

| Field | Value |
|-------|-------|
| **Route** | `/dashboard/investments` |
| **Auth Required** | Yes |
| **Required Role(s)** | User |
| **Responsive** | Yes — Mobile / Tablet / Desktop |
| **Description** | Active investments tracking and investment history |

**Key Components:**
- DashboardLayout
- Tabs — "Active Investments" | "Investment History"
- **Active Investments Tab:**
  - List of ActiveInvestmentCard components (plan name, amount, progress bar, expected return, countdown timer, maturity date)
  - EmptyState if no active investments
- **Investment History Tab:**
  - DataTable (plan, amount, return, start date, end date, status)
  - Filters (status, date range, plan type)
  - Sort options
  - Export button (CSV/PDF)
  - Pagination

**Related API Endpoints:** `GET /api/investments?status=active`, `GET /api/investments?status=completed`, `GET /api/investments/export`

---

### /dashboard/wallet

| Field | Value |
|-------|-------|
| **Route** | `/dashboard/wallet` |
| **Auth Required** | Yes |
| **Required Role(s)** | User |
| **Responsive** | Yes — Mobile / Tablet / Desktop |
| **Description** | Wallet overview with balance and transaction history |

**Key Components:**
- DashboardLayout
- ModeToggle
- BalanceDisplay — Demo balance (available + pending)
- BalanceDisplay — Live balance (available + pending)
- Total Portfolio Value card
- Action buttons — "Deposit" and "Withdraw"
- Tabs — "All Transactions" | "Deposits" | "Withdrawals" | "Commissions"
- TransactionItem list (icon, description, amount, date, status badge)
- Pagination
- Filters (date range, type, status)

**Related API Endpoints:** `GET /api/wallet/balance`, `GET /api/transactions`, `GET /api/transactions?type=deposit`, `GET /api/transactions?type=withdrawal`, `GET /api/transactions?type=commission`

---

### /dashboard/deposit

| Field | Value |
|-------|-------|
| **Route** | `/dashboard/deposit` |
| **Auth Required** | Yes |
| **Required Role(s)** | User |
| **Responsive** | Yes — Mobile / Tablet / Desktop |
| **Description** | Deposit method selection page |

**Key Components:**
- DashboardLayout
- ModeToggle (gift card only in Live mode)
- Page header ("Deposit Funds")
- Two method selection cards:
  - Cryptocurrency deposit card (icon, description, "Deposit Crypto" button)
  - Gift Card deposit card (icon, description, "Upload Gift Card" button — with "Live Only" badge)
- Recent deposit history (summary)

**Related API Endpoints:** `GET /api/deposits/recent`

---

### /dashboard/deposit/crypto

| Field | Value |
|-------|-------|
| **Route** | `/dashboard/deposit/crypto` |
| **Auth Required** | Yes |
| **Required Role(s)** | User |
| **Responsive** | Yes — Mobile / Tablet / Desktop |
| **Description** | Cryptocurrency deposit flow |

**Key Components:**
- DashboardLayout
- ModeToggle
- Breadcrumb (Dashboard > Deposit > Cryptocurrency)
- Cryptocurrency selector (BTC, ETH, USDT — with network options where applicable)
- Wallet address display (text, with CopyButton)
- QRCode display (for wallet address)
- Minimum deposit amount notice
- Network confirmation info
- Pending crypto deposits list (if any, showing confirmation progress)

**Related API Endpoints:** `GET /api/deposit/crypto/address?coin=BTC&network=bitcoin`, `GET /api/deposit/crypto/pending`

---

### /dashboard/deposit/gift-card

| Field | Value |
|-------|-------|
| **Route** | `/dashboard/deposit/gift-card` |
| **Auth Required** | Yes |
| **Required Role(s)** | User |
| **Responsive** | Yes — Mobile / Tablet / Desktop |
| **Description** | Gift card deposit upload flow |

**Key Components:**
- DashboardLayout
- Breadcrumb (Dashboard > Deposit > Gift Card)
- "Live Mode Only" info alert
- Form:
  - Card brand Select dropdown (Amazon, Google Play, Apple, etc.)
  - Card value input (numeric)
  - Card code input (masked)
  - FileUpload zone (screenshot/photo, JPG/PNG, max 5MB, with preview)
- "Submit Deposit" button
- Submission confirmation modal/success state
- Pending gift card deposits list (status tracking)

**Related API Endpoints:** `POST /api/deposit/gift-card`, `GET /api/deposits?type=gift_card&status=pending`

---

### /dashboard/withdraw

| Field | Value |
|-------|-------|
| **Route** | `/dashboard/withdraw` |
| **Auth Required** | Yes |
| **Required Role(s)** | User |
| **Responsive** | Yes — Mobile / Tablet / Desktop |
| **Description** | Withdrawal request page |

**Key Components:**
- DashboardLayout
- Breadcrumb (Dashboard > Withdraw)
- Available balance display
- Amount input (with max button)
- FeeBreakdown component:
  - Gross amount
  - Withdrawal fee (21%)
  - Net amount (highlighted)
- Withdrawal method selection (cryptocurrency, wallet address input)
- 2FA code input (if 2FA enabled, conditional)
- "Request Withdrawal" button
- ConfirmDialog (review details before submission)
- Recent withdrawals list (status tracking)

**Related API Endpoints:** `GET /api/wallet/balance`, `POST /api/withdrawals`, `GET /api/withdrawals?status=pending`

---

### /dashboard/referrals

| Field | Value |
|-------|-------|
| **Route** | `/dashboard/referrals` |
| **Auth Required** | Yes |
| **Required Role(s)** | User |
| **Responsive** | Yes — Mobile / Tablet / Desktop |
| **Description** | Referral program page with link, stats, and binary tree |

**Key Components:**
- DashboardLayout
- Breadcrumb (Dashboard > Referrals)
- ReferralLinkCard (referral code, full link, CopyButton, share buttons)
- ReferralStatsCard (total referrals, active referrals, total commissions earned)
- Tabs — "Commission History" | "Binary Tree"
- **Commission History Tab:**
  - DataTable (referred user, amount, type [direct/binary], status, date)
  - Filters (type, status, date range)
  - Weekly binary summary card (left leg volume, right leg volume, bonus amount)
- **Binary Tree Tab:**
  - BinaryTreeChart (visual tree with left/right legs)
  - Team volume per leg display
  - Weakest leg indicator
  - Search within tree

**Related API Endpoints:** `GET /api/referrals/code`, `GET /api/referrals/stats`, `GET /api/referrals/commissions`, `GET /api/referrals/tree`, `GET /api/referrals/binary-summary`

---

### /dashboard/kyc

| Field | Value |
|-------|-------|
| **Route** | `/dashboard/kyc` |
| **Auth Required** | Yes |
| **Required Role(s)** | User |
| **Responsive** | Yes — Mobile / Tablet / Desktop |
| **Description** | KYC verification page |

**Key Components:**
- DashboardLayout
- Breadcrumb (Dashboard > KYC Verification)
- KYCLevelIndicator (current level, progress bar to next level, limits per level)
- Document upload sections (one per required document type):
  - DocumentUploadCard (document type name, requirements list, upload zone, status badge)
  - Supported formats and max size notice
- Verification status timeline (submitted → under review → approved/rejected)
- Rejection reason display (if rejected, with re-upload prompt)

**Related API Endpoints:** `GET /api/kyc/status`, `POST /api/kyc/upload`, `GET /api/kyc/documents`

---

### /dashboard/profile

| Field | Value |
|-------|-------|
| **Route** | `/dashboard/profile` |
| **Auth Required** | Yes |
| **Required Role(s)** | User |
| **Responsive** | Yes — Mobile / Tablet / Desktop |
| **Description** | User profile and account settings |

**Key Components:**
- DashboardLayout
- Breadcrumb (Dashboard > Profile)
- Tabs — "Personal Info" | "Security" | "Preferences"
- **Personal Info Tab:**
  - Form: full name, email (read-only or editable with verification), phone number
  - Avatar display with change option
  - "Save Changes" button
- **Security Tab:**
  - Change Password form (current password, new password, confirm)
  - 2FA management (status, enable/disable, backup codes)
- **Preferences Tab:**
  - Language selector
  - Currency preference
  - Notification preferences link

**Related API Endpoints:** `GET /api/user/profile`, `PUT /api/user/profile`, `PUT /api/user/password`, `POST /api/user/2fa/enable`, `POST /api/user/2fa/disable`, `GET /api/user/preferences`, `PUT /api/user/preferences`

---

### /dashboard/notifications

| Field | Value |
|-------|-------|
| **Route** | `/dashboard/notifications` |
| **Auth Required** | Yes |
| **Required Role(s)** | User |
| **Responsive** | Yes — Mobile / Tablet / Desktop |
| **Description** | Full notification center |

**Key Components:**
- DashboardLayout
- Breadcrumb (Dashboard > Notifications)
- Filter tabs — "All" | "Unread" | "Financial" | "Security" | "Account" | "Referral" | "System"
- "Mark All as Read" button
- NotificationItem list (icon, title, message, timestamp, read/unread indicator, click action)
- Pagination (or infinite scroll)
- EmptyState if no notifications

**Related API Endpoints:** `GET /api/notifications`, `PUT /api/notifications/:id/read`, `PUT /api/notifications/read-all`, `DELETE /api/notifications/:id`

---

### /dashboard/support

| Field | Value |
|-------|-------|
| **Route** | `/dashboard/support` |
| **Auth Required** | Yes |
| **Required Role(s)** | User |
| **Responsive** | Yes — Mobile / Tablet / Desktop |
| **Description** | Support ticket management |

**Key Components:**
- DashboardLayout
- Breadcrumb (Dashboard > Support)
- "Create New Ticket" button
- Ticket list (DataTable):
  - Columns: Ticket ID, Subject, Category, Status (open/in progress/closed), Last Updated
  - Click to open ticket conversation view
  - Filters (status, category)
- **Ticket Conversation View (nested route `/dashboard/support/:id`):**
  - Ticket details header (ID, subject, category, status, created date)
  - Message thread (chronological, user and support messages)
  - Message input area (text + file attachment)
  - "Close Ticket" button

**Related API Endpoints:** `GET /api/tickets`, `POST /api/tickets`, `GET /api/tickets/:id`, `POST /api/tickets/:id/messages`, `PUT /api/tickets/:id/close`

---

### /dashboard/security

| Field | Value |
|-------|-------|
| **Route** | `/dashboard/security` |
| **Auth Required** | Yes |
| **Required Role(s)** | User |
| **Responsive** | Yes — Mobile / Tablet / Desktop |
| **Description** | Account security settings and session management |

**Key Components:**
- DashboardLayout
- Breadcrumb (Dashboard > Security)
- **Active Sessions Section:**
  - List of sessions (device, browser, IP, location, timestamp, "Current Session" badge)
  - "Revoke" button per session (except current)
  - "Revoke All Other Sessions" button
- **2FA Section:**
  - Current 2FA status (enabled/disabled)
  - Enable 2FA flow (QR code, TOTP verification, backup codes display)
  - Disable 2FA flow (TOTP + email OTP verification)
- **Security Log Section:**
  - Recent security events (login, password change, 2FA toggle, session revocation)
  - Filter by event type and date

**Related API Endpoints:** `GET /api/user/sessions`, `DELETE /api/user/sessions/:id`, `DELETE /api/user/sessions/others`, `GET /api/user/security-log`

---

## 3. Admin Pages (Role-Protected)

### /admin

| Field | Value |
|-------|-------|
| **Route** | `/admin` |
| **Auth Required** | Yes |
| **Required Role(s)** | Admin, Super Admin |
| **Responsive** | Yes — Mobile / Tablet / Desktop |
| **Description** | Admin dashboard overview |

**Key Components:**
- AdminLayout (admin sidebar, top bar, content)
- StatCard — Total Users (with growth %)
- StatCard — Total Deposits
- StatCard — Pending Withdrawals (with link to queue)
- StatCard — Pending KYC (with link to queue)
- StatCard — Platform Balance
- LineChart — deposit/withdrawal trends (7d/30d/90d)
- BarChart — user registrations over time
- PieChart — investment distribution by plan
- Recent activity feed (latest 10 actions)
- Quick action cards (Review KYC, Process Withdrawals, View Deposits)

**Related API Endpoints:** `GET /api/admin/dashboard/stats`, `GET /api/admin/dashboard/charts`, `GET /api/admin/dashboard/recent-activity`

---

### /admin/users

| Field | Value |
|-------|-------|
| **Route** | `/admin/users` |
| **Auth Required** | Yes |
| **Required Role(s)** | Admin, Super Admin |
| **Responsive** | Yes — Mobile / Tablet / Desktop |
| **Description** | User management page |

**Key Components:**
- AdminLayout
- Breadcrumb (Admin > Users)
- SearchInput (search by name, email, referral code)
- Filters (status, KYC level, registration date range, role)
- DataTable:
  - Columns: Avatar, Name, Email, KYC Level, Balance, Status, Joined, Actions
  - Row actions: View, Edit, Ban/Unban, Impersonate (Super Admin)
- User Detail Panel (slide-out or modal):
  - Personal info, KYC status, wallet balances, investments, transactions, referrals
  - Edit form for name, email, KYC level override
  - Ban/Unban with reason field
- Pagination

**Related API Endpoints:** `GET /api/admin/users`, `GET /api/admin/users/:id`, `PUT /api/admin/users/:id`, `POST /api/admin/users/:id/ban`, `POST /api/admin/users/:id/unban`, `POST /api/admin/users/:id/impersonate`

---

### /admin/kyc

| Field | Value |
|-------|-------|
| **Route** | `/admin/kyc` |
| **Auth Required** | Yes |
| **Required Role(s)** | KYC Officer, Admin, Super Admin |
| **Responsive** | Yes — Mobile / Tablet / Desktop |
| **Description** | KYC document review queue |

**Key Components:**
- AdminLayout
- Breadcrumb (Admin > KYC Review)
- Tabs — "Pending" | "Approved" | "Rejected"
- Pending count badge
- DataTable (pending tab):
  - Columns: User (name, email), Document Type, Submitted Date, Status
  - Click to open review
- Document Review Panel:
  - User info sidebar
  - DocumentViewer (full-resolution image/PDF)
  - Approve button (green)
  - Reject button (red) with required reason field
  - Internal notes field
- Pagination

**Related API Endpoints:** `GET /api/admin/kyc?status=pending`, `PUT /api/admin/kyc/:id/approve`, `PUT /api/admin/kyc/:id/reject`

---

### /admin/deposits

| Field | Value |
|-------|-------|
| **Route** | `/admin/deposits` |
| **Auth Required** | Yes |
| **Required Role(s)** | Admin, Super Admin |
| **Responsive** | Yes — Mobile / Tablet / Desktop |
| **Description** | Deposit monitoring and gift card verification |

**Key Components:**
- AdminLayout
- Breadcrumb (Admin > Deposits)
- Tabs — "All Deposits" | "Crypto Deposits" | "Gift Card Pending" | "Gift Card Completed"
- StatCards — Total Deposits (today/week/month), Pending Gift Cards count
- DataTable:
  - Columns: User, Type (Crypto/Gift Card), Amount, Status, Date, Actions
  - Crypto rows: transaction hash, confirmations count
  - Gift Card rows: "Verify" action button
- Gift Card Verification Modal:
  - Uploaded image (DocumentViewer)
  - Card details (brand, value, code)
  - Verify & Credit / Reject buttons
  - Notes field
- Filters (type, status, date range, user)
- Export button

**Related API Endpoints:** `GET /api/admin/deposits`, `PUT /api/admin/deposits/gift-card/:id/verify`, `PUT /api/admin/deposits/gift-card/:id/reject`

---

### /admin/withdrawals

| Field | Value |
|-------|-------|
| **Route** | `/admin/withdrawals` |
| **Auth Required** | Yes |
| **Required Role(s)** | Admin, Super Admin |
| **Responsive** | Yes — Mobile / Tablet / Desktop |
| **Description** | Withdrawal processing queue |

**Key Components:**
- AdminLayout
- Breadcrumb (Admin > Withdrawals)
- Tabs — "Pending" | "Processing" | "Completed" | "Rejected"
- Pending count badge
- StatCards — Pending amount, Processed today, Total withdrawn
- DataTable:
  - Columns: User, KYC Level, Requested Amount, Fee (21%), Net Amount, Wallet Address, Requested Date, Status, Actions
  - Row actions: Approve, Reject
- Withdrawal Detail Panel:
  - Full user details and KYC status
  - Fee breakdown
  - Approve button (with tx hash input on completion)
  - Reject button with reason field
  - Processing notes
- Filters (status, date range, amount range)

**Related API Endpoints:** `GET /api/admin/withdrawals`, `PUT /api/admin/withdrawals/:id/approve`, `PUT /api/admin/withdrawals/:id/reject`, `PUT /api/admin/withdrawals/:id/complete`

---

### /admin/plans

| Field | Value |
|-------|-------|
| **Route** | `/admin/plans` |
| **Auth Required** | Yes |
| **Required Role(s)** | Super Admin |
| **Responsive** | Yes — Mobile / Tablet / Desktop |
| **Description** | Investment plan management (CRUD) |

**Key Components:**
- AdminLayout
- Breadcrumb (Admin > Investment Plans)
- "Create New Plan" button
- DataTable:
  - Columns: Plan Name, Min, Max, Duration, Return Rate, Status, Investors Count, Actions
  - Row actions: Edit, Enable/Disable, Delete (if no active investments)
- Plan Form (modal or separate page):
  - Name, min amount, max amount, duration, return rate, description, features
  - Enable/disable toggle
  - Save/Cancel buttons

**Related API Endpoints:** `GET /api/admin/plans`, `POST /api/admin/plans`, `PUT /api/admin/plans/:id`, `DELETE /api/admin/plans/:id`, `PUT /api/admin/plans/:id/toggle`

---

### /admin/referrals

| Field | Value |
|-------|-------|
| **Route** | `/admin/referrals` |
| **Auth Required** | Yes |
| **Required Role(s)** | Admin, Super Admin |
| **Responsive** | Yes — Mobile / Tablet / Desktop |
| **Description** | Referral program management and commission oversight |

**Key Components:**
- AdminLayout
- Breadcrumb (Admin > Referrals)
- StatCards — Total Referrals, Active Referral Networks, Total Commissions Paid
- Referral overview chart (referral growth over time)
- DataTable — top referrers (user, total referrals, total commissions, binary tree depth)
- Commission adjustment panel (Super Admin only):
  - Search user, view commission history
  - Adjust commission with reason (audit logged)
- Referral dispute section:
  - List of open disputes
  - Resolution form

**Related API Endpoints:** `GET /api/admin/referrals/overview`, `GET /api/admin/referrals/top-referrers`, `GET /api/admin/referrals/commissions/:userId`, `POST /api/admin/referrals/commissions/adjust`

---

### /admin/support

| Field | Value |
|-------|-------|
| **Route** | `/admin/support` |
| **Auth Required** | Yes |
| **Required Role(s)** | Support Agent, Admin, Super Admin |
| **Responsive** | Yes — Mobile / Tablet / Desktop |
| **Description** | Support ticket management |

**Key Components:**
- AdminLayout
- Breadcrumb (Admin > Support)
- Tabs — "Open" | "In Progress" | "Closed" | "My Tickets"
- StatCards — Open tickets, Avg response time, Tickets today
- DataTable:
  - Columns: Ticket ID, User, Subject, Category, Assigned To, Status, Last Updated, Actions
  - Row actions: View, Assign, Close, Delete
- Ticket Detail View:
  - User info sidebar
  - Full message thread
  - Reply input area (text + internal note toggle + file attachment)
  - Assign to agent dropdown
  - Close ticket button
  - Escalate button

**Related API Endpoints:** `GET /api/admin/tickets`, `GET /api/admin/tickets/:id`, `POST /api/admin/tickets/:id/reply`, `PUT /api/admin/tickets/:id/assign`, `PUT /api/admin/tickets/:id/close`, `DELETE /api/admin/tickets/:id`

---

### /admin/reports

| Field | Value |
|-------|-------|
| **Route** | `/admin/reports` |
| **Auth Required** | Yes |
| **Required Role(s)** | Admin, Super Admin |
| **Responsive** | Yes — Mobile / Tablet / Desktop |
| **Description** | Platform reports and analytics |

**Key Components:**
- AdminLayout
- Breadcrumb (Admin > Reports)
- Tabs — "Financial" | "Users" | "System"
- **Financial Tab:**
  - Date range selector
  - Revenue summary (deposits, withdrawals, fees collected, net revenue)
  - Charts: deposit/withdrawal trends, fee revenue, plan distribution
  - Export button (CSV/PDF)
- **Users Tab:**
  - User growth chart
  - KYC completion rate
  - User engagement metrics
  - Export button
- **System Tab:**
  - System health metrics
  - API response times
  - Error rates

**Related API Endpoints:** `GET /api/admin/reports/financial`, `GET /api/admin/reports/users`, `GET /api/admin/reports/system`, `GET /api/admin/reports/export`

---

### /admin/audit-logs

| Field | Value |
|-------|-------|
| **Route** | `/admin/audit-logs` |
| **Auth Required** | Yes |
| **Required Role(s)** | Admin, Super Admin |
| **Responsive** | Yes — Mobile / Tablet / Desktop |
| **Description** | System audit log viewer |

**Key Components:**
- AdminLayout
- Breadcrumb (Admin > Audit Logs)
- Filters: user search, action type dropdown, date range, status (success/failure)
- SearchInput (search within log descriptions)
- DataTable:
  - Columns: Timestamp, User (name + email), Action, Description, IP Address, Status
  - Click row for full detail
- Pagination with page size selector (25, 50, 100)
- Export button (CSV)

**Related API Endpoints:** `GET /api/admin/audit-logs`, `GET /api/admin/audit-logs/export`

---

### /admin/settings

| Field | Value |
|-------|-------|
| **Route** | `/admin/settings` |
| **Auth Required** | Yes |
| **Required Role(s)** | Admin (view), Super Admin (update restricted fields) |
| **Responsive** | Yes — Mobile / Tablet / Desktop |
| **Description** | System configuration and settings |

**Key Components:**
- AdminLayout
- Breadcrumb (Admin > Settings)
- Tabs/Sections:
  - **General:** Platform name, logo upload, maintenance mode toggle, registration enabled toggle
  - **Fees (Super Admin):** Withdrawal fee percentage (default 21%), minimum withdrawal amount
  - **Email:** Resend API key (masked), from email, from name, test email button
  - **Feature Flags:** enable/disable specific features (gift card deposits, referral program, 2FA, etc.)
- "Save Settings" button per section
- Confirmation modal for critical changes (fee updates, maintenance mode)

**Related API Endpoints:** `GET /api/admin/settings`, `PUT /api/admin/settings`, `POST /api/admin/settings/test-email`

---

### /admin/roles

| Field | Value |
|-------|-------|
| **Route** | `/admin/roles` |
| **Auth Required** | Yes |
| **Required Role(s)** | Super Admin |
| **Responsive** | Yes — Mobile / Tablet / Desktop |
| **Description** | Role and permission management |

**Key Components:**
- AdminLayout
- Breadcrumb (Admin > Roles & Permissions)
- Role list (cards or table): Super Admin, Admin, KYC Officer, Support Agent, User
- Permission matrix view (roles as columns, permissions as rows, toggle switches)
- Edit permission modal (per role)
- "Save Changes" button

**Related API Endpoints:** `GET /api/admin/roles`, `PUT /api/admin/roles/:id/permissions`

---

## 4. Error Pages

### /404 — Not Found

| Field | Value |
|-------|-------|
| **Route** | `/404` (or catch-all `*`) |
| **Auth Required** | No |
| **Required Role(s)** | N/A |
| **Responsive** | Yes |
| **Description** | Displayed when a requested page does not exist |

**Key Components:**
- Centered layout
- Error illustration or icon
- "404 — Page Not Found" heading
- Description text
- "Back to Home" button
- "Contact Support" link

---

### /500 — Server Error

| Field | Value |
|-------|-------|
| **Route** | `/500` |
| **Auth Required** | No |
| **Required Role(s)** | N/A |
| **Responsive** | Yes |
| **Description** | Displayed when an unexpected server error occurs |

**Key Components:**
- Centered layout
- Error illustration or icon
- "500 — Server Error" heading
- "Something went wrong on our end. Please try again later." description
- "Retry" button
- "Back to Home" button

---

### /403 — Forbidden

| Field | Value |
|-------|-------|
| **Route** | `/403` |
| **Auth Required** | No (redirected to this page) |
| **Required Role(s)** | N/A |
| **Responsive** | Yes |
| **Description** | Displayed when a user attempts to access a resource without permission |

**Key Components:**
- Centered layout
- Lock icon
- "403 — Access Denied" heading
- "You don't have permission to access this page." description
- "Back to Dashboard" button
- "Contact Support" link

---

### /maintenance — Planned Maintenance

| Field | Value |
|-------|-------|
| **Route** | `/maintenance` |
| **Auth Required** | No |
| **Required Role(s)** | N/A |
| **Responsive** | Yes |
| **Description** | Displayed when the platform is under planned maintenance |

**Key Components:**
- Centered layout
- Maintenance illustration or icon
- "Under Maintenance" heading
- Description with estimated return time
- "We'll be back soon" message
- Optional: email notification signup for when maintenance is complete

---

## 5. Page Specifications Summary

| Page | Auth | Role(s) | Mobile | Tablet | Desktop | Key API Endpoints |
|------|------|---------|--------|--------|---------|-------------------|
| `/` | No | N/A | ✓ | ✓ | ✓ | `GET /api/plans` |
| `/about` | No | N/A | ✓ | ✓ | ✓ | — |
| `/plans` | No | N/A | ✓ | ✓ | ✓ | `GET /api/plans` |
| `/faq` | No | N/A | ✓ | ✓ | ✓ | `GET /api/faq` |
| `/contact` | No | N/A | ✓ | ✓ | ✓ | `POST /api/contact` |
| `/privacy-policy` | No | N/A | ✓ | ✓ | ✓ | — |
| `/terms-of-service` | No | N/A | ✓ | ✓ | ✓ | — |
| `/login` | No | N/A | ✓ | ✓ | ✓ | `POST /api/auth/login` |
| `/register` | No | N/A | ✓ | ✓ | ✓ | `POST /api/auth/register` |
| `/forgot-password` | No | N/A | ✓ | ✓ | ✓ | `POST /api/auth/forgot-password` |
| `/verify-email` | No | N/A | ✓ | ✓ | ✓ | `POST /api/auth/verify-email` |
| `/dashboard` | Yes | User+ | ✓ | ✓ | ✓ | `GET /api/dashboard/summary` |
| `/dashboard/investments` | Yes | User | ✓ | ✓ | ✓ | `GET /api/investments` |
| `/dashboard/wallet` | Yes | User | ✓ | ✓ | ✓ | `GET /api/wallet/balance` |
| `/dashboard/deposit` | Yes | User | ✓ | ✓ | ✓ | `GET /api/deposits/recent` |
| `/dashboard/deposit/crypto` | Yes | User | ✓ | ✓ | ✓ | `GET /api/deposit/crypto/address` |
| `/dashboard/deposit/gift-card` | Yes | User | ✓ | ✓ | ✓ | `POST /api/deposit/gift-card` |
| `/dashboard/withdraw` | Yes | User | ✓ | ✓ | ✓ | `POST /api/withdrawals` |
| `/dashboard/referrals` | Yes | User | ✓ | ✓ | ✓ | `GET /api/referrals/stats` |
| `/dashboard/kyc` | Yes | User | ✓ | ✓ | ✓ | `GET /api/kyc/status` |
| `/dashboard/profile` | Yes | User | ✓ | ✓ | ✓ | `GET /api/user/profile` |
| `/dashboard/notifications` | Yes | User | ✓ | ✓ | ✓ | `GET /api/notifications` |
| `/dashboard/support` | Yes | User | ✓ | ✓ | ✓ | `GET /api/tickets` |
| `/dashboard/security` | Yes | User | ✓ | ✓ | ✓ | `GET /api/user/sessions` |
| `/admin` | Yes | Admin+ | ✓ | ✓ | ✓ | `GET /api/admin/dashboard/stats` |
| `/admin/users` | Yes | Admin+ | ✓ | ✓ | ✓ | `GET /api/admin/users` |
| `/admin/kyc` | Yes | KYC Officer+ | ✓ | ✓ | ✓ | `GET /api/admin/kyc` |
| `/admin/deposits` | Yes | Admin+ | ✓ | ✓ | ✓ | `GET /api/admin/deposits` |
| `/admin/withdrawals` | Yes | Admin+ | ✓ | ✓ | ✓ | `GET /api/admin/withdrawals` |
| `/admin/plans` | Yes | Super Admin | ✓ | ✓ | ✓ | `GET /api/admin/plans` |
| `/admin/referrals` | Yes | Admin+ | ✓ | ✓ | ✓ | `GET /api/admin/referrals/overview` |
| `/admin/support` | Yes | Support Agent+ | ✓ | ✓ | ✓ | `GET /api/admin/tickets` |
| `/admin/reports` | Yes | Admin+ | ✓ | ✓ | ✓ | `GET /api/admin/reports/*` |
| `/admin/audit-logs` | Yes | Admin+ | ✓ | ✓ | ✓ | `GET /api/admin/audit-logs` |
| `/admin/settings` | Yes | Admin+ | ✓ | ✓ | ✓ | `GET /api/admin/settings` |
| `/admin/roles` | Yes | Super Admin | ✓ | ✓ | ✓ | `GET /api/admin/roles` |
| `/404` | No | N/A | ✓ | ✓ | ✓ | — |
| `/500` | No | N/A | ✓ | ✓ | ✓ | — |
| `/403` | No | N/A | ✓ | ✓ | ✓ | — |
| `/maintenance` | No | N/A | ✓ | ✓ | ✓ | — |

*End of Page Inventory Document — Phase 1*