# Component Inventory — Enterprise Investment Platform

> **Project:** Managed Investment Plan Platform  
> **Phase:** 1 — Requirements & Specification  
> **Last Updated:** 2025

---

## 1. Component Architecture

### Design Principles

- **Shared Design System:** All components use a unified design token system (colors, spacing, typography, shadows, border-radius) defined in Tailwind CSS configuration. Primary palette: red (`red-500` to `red-700`) and black (`gray-900` to `black`), dark theme default.
- **Compound Components Pattern:** Complex components (e.g., DataTable, Form, Tabs, Accordion) use a compound component pattern with Context providers for shared state management.
- **Separation of Concerns:** Presentational components receive data via props; container/hook components handle data fetching, state management, and business logic via custom React hooks.
- **Component Colocation:** Components are organized by domain feature (`/components/auth/`, `/components/wallet/`, `/components/investments/`, etc.) with shared primitives in `/components/ui/`.
- **TypeScript Strict Mode:** All components are fully typed with TypeScript. Props interfaces are exported for reuse.
- **Server/Client Boundaries:** Components are marked as `'use client'` only when necessary (interactivity, hooks, browser APIs). Static/presentational components remain server components by default.

### Component Hierarchy

```
app/
├── (public)/              → PublicLayout
│   ├── page.tsx           → Navbar, Hero, Features, PlanCards, Footer
│   ├── about/             → Navbar, Content, Footer
│   ├── plans/             → Navbar, PlanCards, Footer
│   ├── faq/               → Navbar, SearchInput, Accordion, Footer
│   ├── contact/           → Navbar, ContactForm, Footer
│   ├── login/             → AuthLayout, LoginForm, 2FAForm
│   ├── register/          → AuthLayout, RegisterForm
│   └── forgot-password/   → AuthLayout, ForgotPasswordSteps
├── (authenticated)/       → DashboardLayout
│   └── dashboard/
│       ├── page.tsx       → StatCards, Charts, ActiveInvestments, Transactions
│       ├── investments/   → Tabs, ActiveInvestmentCard, DataTable
│       ├── wallet/        → BalanceDisplay, TransactionItem
│       ├── deposit/       → ModeToggle, CryptoDepositFlow, GiftCardForm
│       ├── withdraw/      → FeeBreakdown, ConfirmDialog
│       ├── referrals/     → ReferralLinkCard, BinaryTreeChart, DataTable
│       ├── kyc/           → KYCLevelIndicator, DocumentUploadCard
│       ├── profile/       → Form, 2FA Settings
│       ├── notifications/ → NotificationItem, FilterTabs
│       ├── support/       → DataTable, MessageThread
│       └── security/      → SessionList, 2FA Settings
└── (admin)/               → AdminLayout
    └── admin/
        ├── page.tsx       → StatCards, Charts, ActivityFeed
        ├── users/         → DataTable, UserDetailPanel
        ├── kyc/           → DataTable, DocumentViewer, ReviewActions
        ├── deposits/      → DataTable, GiftCardVerifyModal
        ├── withdrawals/   → DataTable, WithdrawalDetailPanel
        ├── plans/         → DataTable, PlanForm
        ├── referrals/     → DataTable, CommissionAdjustPanel
        ├── support/       → DataTable, TicketDetailView
        ├── reports/       → Charts, ExportButton
        ├── audit-logs/    → DataTable, Filters
        ├── settings/      → Form, FeatureFlags
        └── roles/         → PermissionMatrix
```

---

## 2. Layout Components

### PublicLayout

| Field | Value |
|-------|-------|
| **Path** | `components/layouts/PublicLayout.tsx` |
| **Type** | Server Component |
| **Description** | Wrapper layout for all public (unauthenticated) pages |

**Structure:**
- `<Navbar />` — top navigation bar
- `<main>` — page content area (children)
- `<Footer />` — site footer

---

### DashboardLayout

| Field | Value |
|-------|-------|
| **Path** | `components/layouts/DashboardLayout.tsx` |
| **Type** | Client Component (`'use client'` — sidebar state) |
| **Description** | Wrapper layout for all authenticated user dashboard pages |

**Structure:**
- `<Sidebar />` — left sidebar with navigation links
- `<div className="top-bar">` — top bar containing:
  - Mobile menu toggle (hamburger icon)
  - `<ModeToggle />` — Demo/Live mode switch (prominent, always visible)
  - `<NotificationBell />` — notification icon with unread count
  - User avatar dropdown (profile link, settings, logout)
- `<main>` — page content area (children)

---

### AdminLayout

| Field | Value |
|-------|-------|
| **Path** | `components/layouts/AdminLayout.tsx` |
| **Type** | Client Component (`'use client'` — sidebar state) |
| **Description** | Wrapper layout for all admin panel pages |

**Structure:**
- `<AdminSidebar />` — left sidebar with admin navigation grouped by section
- `<div className="top-bar">` — top bar containing:
  - Mobile menu toggle
  - Admin badge/indicator
  - `<NotificationBell />`
  - User avatar dropdown
- `<main>` — page content area (children)

---

### AuthLayout

| Field | Value |
|-------|-------|
| **Path** | `components/layouts/AuthLayout.tsx` |
| **Type** | Server Component |
| **Description** | Centered card layout for authentication pages (login, register, forgot password) |

**Structure:**
- Full-height centered flex container with subtle background pattern/gradient
- Centered card container with max-width (`max-w-md`)
- Logo at top of card
- Form content area (children)
- Optional footer links (e.g., "Don't have an account?")

---

## 3. Navigation Components

### Navbar

| Field | Value |
|-------|-------|
| **Path** | `components/navigation/Navbar.tsx` |
| **Type** | Client Component (`'use client'` — mobile menu state, scroll behavior) |
| **Props** | None (self-contained) |

**Elements:**
- Logo (left)
- Nav links: Home, About, Plans, FAQ, Contact
- Right side: Login button (outlined), Register button (filled, primary red)
- Mobile: hamburger icon triggers `<MobileMenu />`
- Sticky on scroll with background blur effect
- Active link highlighting based on current route

---

### Sidebar

| Field | Value |
|-------|-------|
| **Path** | `components/navigation/Sidebar.tsx` |
| **Type** | Client Component (`'use client'` — collapse/expand state) |
| **Props** | `collapsed?: boolean`, `onToggle?: () => void` |

**Elements:**
- Logo (top, hidden when collapsed)
- Navigation links with icons:
  - Dashboard (home icon)
  - Investments (chart icon)
  - Wallet (wallet icon)
  - Deposits (arrow-down-circle icon)
  - Withdrawals (arrow-up-circle icon)
  - Referrals (users icon)
  - KYC (shield-check icon)
  - Support (help-circle icon)
  - Profile (user icon)
  - Security (lock icon)
- Active link highlighting (red left border, red text)
- Collapse toggle button at bottom
- On mobile: slide-out drawer overlay with backdrop
- Logout button at bottom

---

### AdminSidebar

| Field | Value |
|-------|-------|
| **Path** | `components/navigation/AdminSidebar.tsx` |
| **Type** | Client Component (`'use client'`) |
| **Props** | Same as Sidebar |

**Elements:**
- Logo with "Admin" badge
- Grouped navigation sections:
  - **Overview:** Dashboard
  - **Management:** Users, KYC, Deposits, Withdrawals, Plans
  - **Operations:** Referrals, Support
  - **Analytics:** Reports, Audit Logs
  - **Configuration:** Settings, Roles & Permissions
- Active link highlighting
- Collapse behavior (same as Sidebar)

---

### Breadcrumb

| Field | Value |
|-------|-------|
| **Path** | `components/navigation/Breadcrumb.tsx` |
| **Type** | Server Component |
| **Props** | `items: Array<{ label: string; href?: string }>` |

**Elements:**
- Horizontal breadcrumb trail: Home > Section > Page
- Last item is plain text (current page)
- Other items are links
- Separator character between items (chevron icon)

---

### MobileMenu

| Field | Value |
|-------|-------|
| **Path** | `components/navigation/MobileMenu.tsx` |
| **Type** | Client Component (`'use client'` — open/close state, animation) |
| **Props** | `isOpen: boolean`, `onClose: () => void` |

**Elements:**
- Full-screen slide-in drawer from the right
- Dark backdrop overlay
- Close button (X icon)
- Navigation links (same as Navbar)
- Login/Register buttons
- Animated entrance/exit

---

### ModeToggle

| Field | Value |
|-------|-------|
| **Path** | `components/navigation/ModeToggle.tsx` |
| **Type** | Client Component (`'use client'` — toggle state, context) |
| **Props** | None (reads/writes from ModeContext) |

**Elements:**
- Prominent toggle switch with two options: **Demo** and **Live**
- Visual distinction: Demo = gray/blue label, Live = red label (active emphasis)
- Tooltip: "Demo mode uses virtual funds. Live mode uses real funds."
- Persists selection in localStorage and user preferences
- Always visible in dashboard top bar
- Triggers data refresh on mode change

---

## 4. Form Components

### Input

| Field | Value |
|-------|-------|
| **Path** | `components/ui/Input.tsx` |
| **Type** | Client Component (`'use client'` — focus state) |
| **Props** | `label?: string`, `error?: string`, `helperText?: string`, `type?: string`, `icon?: ReactNode`, plus native input props |

**Variants:** Default, with icon (left), with action button (right, e.g., show/hide password)

---

### Select

| Field | Value |
|-------|-------|
| **Path** | `components/ui/Select.tsx` |
| **Type** | Client Component (`'use client'` — open/close, search) |
| **Props** | `label?: string`, `error?: string`, `options: Array<{ value: string; label: string }>`, `searchable?: boolean`, `placeholder?: string` |

**Elements:**
- Dropdown trigger showing selected value
- Dropdown list with options
- Search input (when searchable)
- Keyboard navigation support

---

### TextArea

| Field | Value |
|-------|-------|
| **Path** | `components/ui/TextArea.tsx` |
| **Type** | Client Component (`'use client'`) |
| **Props** | `label?: string`, `error?: string`, `helperText?: string`, `maxLength?: number`, plus native textarea props |

---

### Checkbox

| Field | Value |
|-------|-------|
| **Path** | `components/ui/Checkbox.tsx` |
| **Type** | Client Component (`'use client'`) |
| **Props** | `label?: string`, `checked?: boolean`, `onCheckedChange?: (checked: boolean) => void`, `error?: string` |

---

### RadioGroup

| Field | Value |
|-------|-------|
| **Path** | `components/ui/RadioGroup.tsx` |
| **Type** | Client Component (`'use client'`) |
| **Props** | `label?: string`, `options: Array<{ value: string; label: string; description?: string }>`, `value?: string`, `onValueChange?: (value: string) => void` |

---

### FileUpload

| Field | Value |
|-------|-------|
| **Path** | `components/ui/FileUpload.tsx` |
| **Type** | Client Component (`'use client'` — drag state, file state, upload progress) |
| **Props** | `accept?: string`, `maxSize?: number` (bytes), `onFileSelect?: (file: File) => void`, `onUpload?: (file: File) => Promise<void>`, `preview?: boolean`, `value?: File | null` |

**Elements:**
- Dashed border drop zone with upload icon
- "Drag and drop or click to upload" text
- Accepted formats and max size hint text
- File preview (image thumbnail or filename with icon)
- Upload progress bar (during upload)
- Error message for invalid files
- Remove button (after file selected)

---

### OTPInput

| Field | Value |
|-------|-------|
| **Path** | `components/auth/OTPInput.tsx` |
| **Type** | Client Component (`'use client'` — individual input focus, value management) |
| **Props** | `length?: number` (default 6), `onComplete?: (otp: string) => void`, `error?: string`, `disabled?: boolean` |

**Elements:**
- 6 individual single-digit input boxes
- Auto-focus moves to next input on digit entry
- Backspace moves to previous input
- Paste support (fills all inputs from clipboard)
- Visual focus and filled states
- Error shake animation on invalid OTP

---

### Form

| Field | Value |
|-------|-------|
| **Path** | `components/ui/Form.tsx` |
| **Type** | Client Component (`'use client'` — validation context) |
| **Props** | `onSubmit?: (data: FormData) => Promise<void>`, `validationSchema?: ZodSchema`, `defaultValues?: Record<string, any>`, `children: ReactNode` |

**Elements:**
- Form wrapper with validation context provider
- Integrates with Zod for schema validation
- Maps field errors to child inputs via name prop
- Loading state (disables all inputs and shows spinner on submit button)
- `<Form.Field name="email">` wrapper for individual fields

---

### SearchInput

| Field | Value |
|-------|-------|
| **Path** | `components/ui/SearchInput.tsx` |
| **Type** | Client Component (`'use client'` — debounce) |
| **Props** | `onSearch?: (query: string) => void`, `debounceMs?: number` (default 300), `placeholder?: string` |

**Elements:**
- Search icon (left)
- Text input with debounced onChange
- Clear button (right, appears when input has value)

---

## 5. Data Display Components

### DataTable

| Field | Value |
|-------|-------|
| **Path** | `components/ui/DataTable.tsx` |
| **Type** | Client Component (`'use client'` — sort, filter, pagination state) |
| **Props** | `columns: Column[]`, `data: T[]`, `sortable?: boolean`, `filterable?: boolean`, `paginated?: boolean`, `pageSize?: number`, `onRowClick?: (row: T) => void`, `actions?: (row: T) => ReactNode`, `emptyState?: ReactNode` |

**Elements:**
- Column headers (clickable for sort, with sort direction indicator)
- Row data with optional row actions (dropdown menu or icon buttons)
- Column-level filters (dropdowns or inputs in header row)
- Pagination footer (page buttons, items per page selector, total count)
- `<EmptyState />` when no data
- Loading skeleton state
- Responsive: horizontal scroll on mobile with sticky first column

---

### Card

| Field | Value |
|-------|-------|
| **Path** | `components/ui/Card.tsx` |
| **Type** | Server Component |
| **Props** | `header?: ReactNode`, `footer?: ReactNode`, `className?: string`, `children: ReactNode` |

**Variants:** Default, elevated (shadow), outlined (border only), interactive (hover effect)

---

### StatCard

| Field | Value |
|-------|-------|
| **Path** | `components/ui/StatCard.tsx` |
| **Type** | Server Component |
| **Props** | `label: string`, `value: string | number`, `trend?: { value: number; direction: 'up' | 'down' }`, `icon?: ReactNode`, `className?: string` |

**Elements:**
- Icon container (left, colored background circle)
- Label (small, muted text)
- Value (large, bold)
- Trend indicator (percentage with up/down arrow, green/red color)

---

### Badge

| Field | Value |
|-------|-------|
| **Path** | `components/ui/Badge.tsx` |
| **Type** | Server Component |
| **Props** | `variant: 'success' | 'warning' | 'error' | 'info' | 'neutral'`, `children: ReactNode`, `dot?: boolean` |

**Variants:**
- `success` — green (approved, completed, active)
- `warning` — yellow (pending, processing)
- `error` — red (rejected, failed, banned)
- `info` — blue (informational)
- `neutral` — gray (default)
- Optional leading dot indicator

---

### Avatar

| Field | Value |
|-------|-------|
| **Path** | `components/ui/Avatar.tsx` |
| **Type** | Server Component |
| **Props** | `src?: string`, `alt?: string`, `fallback?: string` (initials), `size?: 'sm' | 'md' | 'lg' | 'xl'` |

**Elements:**
- Circular image (from `src`, loaded via `next/image`)
- Fallback: colored circle with initials (generated from name)
- Size variants: sm (32px), md (40px), lg (48px), xl (64px)

---

### ProgressBar

| Field | Value |
|-------|-------|
| **Path** | `components/ui/ProgressBar.tsx` |
| **Type** | Server Component |
| **Props** | `value: number` (0-100), `variant?: 'default' | 'success' | 'warning' | 'error'`, `size?: 'sm' | 'md' | 'lg'`, `showLabel?: boolean` |

**Elements:**
- Track (gray background, rounded)
- Fill (colored, animated width transition)
- Optional percentage label

---

### CountdownTimer

| Field | Value |
|-------|-------|
| **Path** | `components/ui/CountdownTimer.tsx` |
| **Type** | Client Component (`'use client'` — interval) |
| **Props** | `targetDate: Date | string`, `onComplete?: () => void`, `format?: 'full' | 'short'` |

**Elements:**
- Displays remaining time: days, hours, minutes, seconds (or abbreviated)
- Updates every second
- Calls `onComplete` when countdown reaches zero
- Compact mode: "2d 14h 30m" | Full mode: individual digit boxes

---

### EmptyState

| Field | Value |
|-------|-------|
| **Path** | `components/ui/EmptyState.tsx` |
| **Type** | Server Component |
| **Props** | `icon?: ReactNode`, `title: string`, `description?: string`, `action?: { label: string; onClick: () => void }` |

**Elements:**
- Centered layout
- Illustration or icon (large, muted)
- Title text
- Description text (muted)
- Optional CTA button

---

### Skeleton

| Field | Value |
|-------|-------|
| **Path** | `components/ui/Skeleton.tsx` |
| **Type** | Server Component |
| **Props** | `variant?: 'text' | 'circle' | 'card' | 'table' | 'chart'`, `width?: string`, `height?: string`, `count?: number` |

**Elements:**
- Animated pulse/ shimmer effect
- Shape variants that match real component dimensions
- `table` variant renders a full table skeleton with header and rows
- `card` variant renders a card-shaped placeholder

---

## 6. Feedback Components

### Toast

| Field | Value |
|-------|-------|
| **Path** | `components/feedback/Toast.tsx` |
| **Type** | Client Component (`'use client'` — auto-dismiss timer) |
| **Props** | `type: 'success' | 'error' | 'warning' | 'info'`, `title: string`, `message?: string`, `duration?: number` (default 5000ms) |

**Elements:**
- Positioned at top-right of viewport
- Icon based on type (check, X, alert, info)
- Title and optional message
- Close button
- Auto-dismiss after duration
- Stack multiple toasts vertically
- Enter/exit animations
- Managed via toast context/hook (`useToast()`)

---

### Modal

| Field | Value |
|-------|-------|
| **Path** | `components/ui/Modal.tsx` |
| **Type** | Client Component (`'use client'` — open/close, focus trap, escape key) |
| **Props** | `isOpen: boolean`, `onClose: () => void`, `title?: string`, `footer?: ReactNode`, `size?: 'sm' | 'md' | 'lg' | 'xl'`, `children: ReactNode` |

**Elements:**
- Backdrop overlay (dark, click to close)
- Centered dialog box
- Header (title + close button)
- Body (scrollable content)
- Optional footer (buttons)
- Focus trap within modal
- Close on Escape key
- Body scroll lock when open
- Enter/exit animations (fade + scale)

---

### ConfirmDialog

| Field | Value |
|-------|-------|
| **Path** | `components/feedback/ConfirmDialog.tsx` |
| **Type** | Client Component (`'use client'`) |
| **Props** | `isOpen: boolean`, `onClose: () => void`, `onConfirm: () => void`, `title: string`, `message: string`, `confirmLabel?: string`, `cancelLabel?: string`, `variant?: 'danger' | 'warning' | 'default'` |

**Elements:**
- Built on top of `<Modal />`
- Warning/danger icon
- Message text
- Cancel and Confirm buttons (confirm styled per variant)

---

### Alert

| Field | Value |
|-------|-------|
| **Path** | `components/ui/Alert.tsx` |
| **Type** | Server Component |
| **Props** | `variant: 'info' | 'success' | 'warning' | 'error'`, `title?: string`, `children: ReactNode`, `dismissible?: boolean` |

**Elements:**
- Inline banner with colored left border and background tint
- Icon based on variant
- Title (bold) and content
- Optional dismiss button

---

### Tooltip

| Field | Value |
|-------|-------|
| **Path** | `components/ui/Tooltip.tsx` |
| **Type** | Client Component (`'use client'` — hover/focus state) |
| **Props** | `content: string | ReactNode`, `side?: 'top' | 'right' | 'bottom' | 'left'`, `children: ReactNode` |

**Elements:**
- Trigger element (children)
- Floating tooltip on hover/focus
- Arrow pointing to trigger
- Small delay before showing (100ms)

---

### Dropdown

| Field | Value |
|-------|-------|
| **Path** | `components/ui/Dropdown.tsx` |
| **Type** | Client Component (`'use client'` — open/close, keyboard nav) |
| **Props** | `trigger: ReactNode`, `items: Array<{ label: string; icon?: ReactNode; onClick?: () => void; href?: string; danger?: boolean; divider?: boolean }>` |

**Elements:**
- Trigger element (click to toggle)
- Floating menu with items
- Item hover highlight
- Optional dividers between groups
- Close on outside click
- Keyboard navigation

---

## 7. Chart Components

### LineChart

| Field | Value |
|-------|-------|
| **Path** | `components/charts/LineChart.tsx` |
| **Type** | Client Component (`'use client'` — chart rendering) |
| **Props** | `data: Array<{ x: string | Date; y: number }>`, `xLabel?: string`, `yLabel?: string`, `color?: string` (default: red), `height?: number` |

**Description:** Portfolio performance over time, deposit/withdrawal trends. Uses a charting library (e.g., Recharts, ECharts, or Chart.js). Dark theme styled with red primary color.

---

### BarChart

| Field | Value |
|-------|-------|
| **Path** | `components/charts/BarChart.tsx` |
| **Type** | Client Component (`'use client'`) |
| **Props** | `data: Array<{ label: string; value: number; color?: string }>`, `xLabel?: string`, `yLabel?: string`, `height?: number` |

**Description:** Monthly earnings comparison, user registrations over time. Dark theme styled.

---

### PieChart

| Field | Value |
|-------|-------|
| **Path** | `components/charts/PieChart.tsx` |
| **Type** | Client Component (`'use client'`) |
| **Props** | `data: Array<{ label: string; value: number; color: string }>`, `height?: number` |

**Description:** Investment distribution by plan, deposit type breakdown. Dark theme styled with a complementary color palette.

---

### BinaryTreeChart

| Field | Value |
|-------|-------|
| **Path** | `components/charts/BinaryTreeChart.tsx` |
| **Type** | Client Component (`'use client'` — zoom, pan, expand/collapse) |
| **Props** | `data: BinaryTreeNode`, `onNodeClick?: (node: BinaryTreeNode) => void`, `highlightWeakestLeg?: boolean` |

**Description:** Visual referral binary tree with left/right legs. Interactive: zoom, pan, click to expand/collapse branches. Weakest leg highlighted in a distinct color. Each node shows name and volume.

---

## 8. Notification Components

### NotificationBell

| Field | Value |
|-------|-------|
| **Path** | `components/notifications/NotificationBell.tsx` |
| **Type** | Client Component (`'use client'` — dropdown state, polling/WebSocket) |
| **Props** | None (self-contained, fetches from API) |

**Elements:**
- Bell icon button
- Unread count badge (red circle with number, hidden when 0)
- Click toggles `<NotificationDropdown />`
- Polls for new notifications (or WebSocket push)

---

### NotificationDropdown

| Field | Value |
|-------|-------|
| **Path** | `components/notifications/NotificationDropdown.tsx` |
| **Type** | Client Component (`'use client'`) |
| **Props** | `isOpen: boolean`, `onClose: () => void` |

**Elements:**
- Dropdown panel from bell icon
- "Notifications" header with "Mark all as read" link
- List of 5 most recent `<NotificationItem />` components
- "View All Notifications" link at bottom (navigates to `/dashboard/notifications`)

---

### NotificationItem

| Field | Value |
|-------|-------|
| **Path** | `components/notifications/NotificationItem.tsx` |
| **Type** | Client Component (`'use client'` — mark as read on click) |
| **Props** | `notification: { id: string; type: string; title: string; message: string; read: boolean; createdAt: string; actionUrl?: string }` |

**Elements:**
- Category icon (wallet, shield, users, bell, etc.)
- Title (bold if unread)
- Message preview (truncated)
- Relative timestamp ("2 hours ago")
- Unread indicator (blue dot)
- Click marks as read and optionally navigates to `actionUrl`

---

### NotificationPreferences

| Field | Value |
|-------|-------|
| **Path** | `components/notifications/NotificationPreferences.tsx` |
| **Type** | Client Component (`'use client'` — toggle state, save) |
| **Props** | `preferences: NotificationPreferences`, `onSave: (prefs: NotificationPreferences) => Promise<void>` |

**Elements:**
- Category rows:
  - Financial (deposit, withdrawal, investment) — in-app toggle, email toggle
  - Security (login, 2FA, password) — in-app toggle, email toggle
  - Account (KYC, profile) — in-app toggle, email toggle
  - Referral (new referral, commission) — in-app toggle, email toggle
  - System (maintenance, announcements) — in-app toggle, email toggle
- "Enable All" / "Disable All" quick actions
- Save button

---

## 9. Wallet Components

### BalanceDisplay

| Field | Value |
|-------|-------|
| **Path** | `components/wallet/BalanceDisplay.tsx` |
| **Type** | Server Component |
| **Props** | `label: string`, `available: number`, `pending: number`, `currency?: string` (default: "USD"), `mode?: 'demo' | 'live'` |

**Elements:**
- Label (e.g., "Live Balance" or "Demo Balance")
- Mode badge/indicator (distinct color per mode)
- Large available balance figure
- Pending amount (smaller, muted text: "$X.XX pending")
- Optional trend indicator

---

### TransactionItem

| Field | Value |
|-------|-------|
| **Path** | `components/wallet/TransactionItem.tsx` |
| **Type** | Server Component |
| **Props** | `transaction: { id: string; type: 'deposit' | 'withdrawal' | 'investment' | 'return' | 'commission'; description: string; amount: number; status: string; createdAt: string }` |

**Elements:**
- Icon (colored by type: green for deposits/returns, red for withdrawals, blue for investments, purple for commissions)
- Description text
- Amount (green for credits, red for debits)
- Date (relative or formatted)
- Status `<Badge />`

---

### FeeBreakdown

| Field | Value |
|-------|-------|
| **Path** | `components/wallet/FeeBreakdown.tsx` |
| **Type** | Server Component |
| **Props** | `amount: number`, `feePercentage: number` (default: 21) |

**Elements:**
- Line items:
  - "Gross Amount: $X.XX"
  - "Withdrawal Fee (21%): -$Y.YY" (in red)
  - Divider line
  - "Net Amount: $Z.ZZ" (in bold, green or white)
- Fee percentage clearly labeled

---

## 10. Investment Components

### PlanCard

| Field | Value |
|-------|-------|
| **Path** | `components/investments/PlanCard.tsx` |
| **Type** | Client Component (`'use client'` — hover effects) |
| **Props** | `plan: { id: string; name: string; min: number; max: number; duration: string; returnRate: number; features: string[] }`, `locked?: boolean`, `onInvest?: (planId: string) => void` |

**Elements:**
- Plan name (header)
- Investment range: "$200 — $4,999"
- Duration: "24 Hours"
- Expected return rate: "X%"
- Feature list (checkmark icons)
- CTA button: "Invest Now" (or "Locked — Upgrade KYC" if locked)
- Popular/badge indicator (optional, e.g., "Most Popular" on Gold)
- Hover elevation effect

---

### ActiveInvestmentCard

| Field | Value |
|-------|-------|
| **Path** | `components/investments/ActiveInvestmentCard.tsx` |
| **Type** | Client Component (`'use client'` — countdown) |
| **Props** | `investment: { id: string; planName: string; amount: number; expectedReturn: number; startTime: string; maturityTime: string; progress: number }` |

**Elements:**
- Plan name and mode badge
- Invested amount
- `<ProgressBar />` showing time elapsed / time remaining
- Expected return amount
- `<CountdownTimer />` to maturity
- Status `<Badge />` (active/maturing)

---

### InvestmentHistoryRow

| Field | Value |
|-------|-------|
| **Path** | `components/investments/InvestmentHistoryRow.tsx` |
| **Type** | Server Component |
| **Props** | `investment: { id: string; planName: string; amount: number; returnAmount: number; startDate: string; endDate: string; status: string }` |

**Elements:**
- Plan name
- Invested amount
- Return amount (actual)
- Start and end dates
- Status `<Badge />` (completed, cancelled, failed)
- ROI percentage

---

## 11. KYC Components

### KYCLevelIndicator

| Field | Value |
|-------|-------|
| **Path** | `components/kyc/KYCLevelIndicator.tsx` |
| **Type** | Server Component |
| **Props** | `currentLevel: number`, `maxLevel: number`, `levels: Array<{ level: number; name: string; limits: string; requirements: string[] }>` |

**Elements:**
- Current level badge (e.g., "Level 1 — Basic")
- Step progress bar showing levels 0 → 1 → 2
- Current limits displayed (deposit max, investment max per plan)
- Requirements for next level (list with checkmarks for completed)
- Visual progress to next level

---

### DocumentUploadCard

| Field | Value |
|-------|-------|
| **Path** | `components/kyc/DocumentUploadCard.tsx` |
| **Type** | Client Component (`'use client'` — upload state) |
| **Props** | `documentType: string`, `requirements: string[]`, `examples?: string[]`, `currentStatus?: 'none' | 'pending_review' | 'approved' | 'rejected'`, `rejectionReason?: string`, `onUpload: (file: File) => Promise<void>` |

**Elements:**
- Document type title (e.g., "Government-Issued ID")
- Requirements list (bullet points)
- Example descriptions
- `<FileUpload />` component (or status display)
- Status indicator: not uploaded, pending (yellow), approved (green), rejected (red with reason)
- Rejection reason with "Re-upload" button (if rejected)

---

### DocumentViewer

| Field | Value |
|-------|-------|
| **Path** | `components/kyc/DocumentViewer.tsx` |
| **Type** | Client Component (`'use client'` — zoom, pan) |
| **Props** | `fileUrl: string`, `fileType: 'image' | 'pdf'` |

**Elements:**
- Full-resolution image viewer (for JPG/PNG) with zoom and pan controls
- PDF viewer (for PDF files)
- Fullscreen toggle
- Download button

---

## 12. Referral Components

### ReferralLinkCard

| Field | Value |
|-------|-------|
| **Path** | `components/referrals/ReferralLinkCard.tsx` |
| **Type** | Client Component (`'use client'` — copy feedback, share) |
| **Props** | `referralCode: string`, `referralLink: string` |

**Elements:**
- Referral code display (large, monospace font)
- Full referral link display
- `<CopyButton />` for the link
- Share icons/links (email, Twitter/X, Telegram, WhatsApp, Facebook)
- Info text: "Earn 10% on every referral's deposit!"

---

### ReferralStatsCard

| Field | Value |
|-------|-------|
| **Path** | `components/referrals/ReferralStatsCard.tsx` |
| **Type** | Server Component |
| **Props** | `totalReferrals: number`, `activeReferrals: number`, `totalCommissions: number`, `pendingCommissions: number` |

**Elements:**
- Grid of 3-4 `<StatCard />` components:
  - Total Referrals (count)
  - Active Referrals (count)
  - Total Commissions Earned (USD)
  - Pending Commissions (USD)

---

### BinaryTreeView

| Field | Value |
|-------|-------|
| **Path** | `components/referrals/BinaryTreeView.tsx` |
| **Type** | Client Component (`'use client'`) |
| **Props** | `treeData: BinaryTreeNode`, `onNodeClick?: (node: BinaryTreeNode) => void` |

**Elements:**
- Wrapper around `<BinaryTreeChart />` with supplementary UI:
  - Left leg volume display
  - Right leg volume display
  - Weakest leg callout
  - Search input to find a specific referral
  - Depth level indicator
  - Expand/collapse controls

---

## 13. Common / UI Components

### Button

| Field | Value |
|-------|-------|
| **Path** | `components/ui/Button.tsx` |
| **Type** | Client Component (`'use client'` — click, loading state) |
| **Props** | `variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'`, `size?: 'sm' | 'md' | 'lg'`, `loading?: boolean`, `icon?: ReactNode`, `iconPosition?: 'left' | 'right'`, `disabled?: boolean`, `fullWidth?: boolean`, `children: ReactNode`, `onClick?: () => void` |

**Variants:**
- `primary` — red background, white text (default)
- `secondary` — dark gray background, white text
- `ghost` — transparent, white text, border on hover
- `danger` — red outline, red text (or filled red for destructive actions)
- `outline` — border only, white text

**Sizes:** sm (h-8), md (h-10), lg (h-12)

**States:** default, hover, active, focus, disabled, loading (spinner replaces icon/text)

---

### IconButton

| Field | Value |
|-------|-------|
| **Path** | `components/ui/IconButton.tsx` |
| **Type** | Client Component (`'use client'`) |
| **Props** | `icon: ReactNode`, `variant?: 'ghost' | 'outline'`, `size?: 'sm' | 'md'`, `label?: string` (for accessibility), `onClick?: () => void` |

---

### LoadingSpinner

| Field | Value |
|-------|-------|
| **Path** | `components/ui/LoadingSpinner.tsx` |
| **Type** | Server Component |
| **Props** | `size?: 'sm' | 'md' | 'lg'`, `className?: string` |

**Elements:**
- CSS/SVG animated spinning circle
- Color matches theme (white or red)

---

### Pagination

| Field | Value |
|-------|-------|
| **Path** | `components/ui/Pagination.tsx` |
| **Type** | Client Component (`'use client'`) |
| **Props** | `currentPage: number`, `totalPages: number`, `onPageChange: (page: number) => void`, `pageSize?: number`, `onPageSizeChange?: (size: number) => void`, `totalItems?: number` |

**Elements:**
- Previous/Next arrow buttons
- Page number buttons (with ellipsis for large ranges)
- Items per page selector (dropdown)
- Total items count text
- Disabled state for first/last page

---

### Tabs

| Field | Value |
|-------|-------|
| **Path** | `components/ui/Tabs.tsx` |
| **Type** | Client Component (`'use client'` — active tab state) |
| **Props:** Compound component pattern |
- `<Tabs>` — root wrapper, `defaultValue?: string`, `onValueChange?: (value: string) => void`
- `<TabsList>` — tab button container
- `<TabsTrigger value="tab1">` — individual tab button
- `<TabsContent value="tab1">` — panel content for the tab

---

### Accordion

| Field | Value |
|-------|-------|
| **Path** | `components/ui/Accordion.tsx` |
| **Type** | Client Component (`'use client'` — expand/collapse animation) |
| **Props:** Compound component pattern |
- `<Accordion>` — root wrapper, `type?: 'single' | 'multiple'`
- `<AccordionItem value="item1">` — individual item wrapper
- `<AccordionTrigger>` — clickable header with chevron icon
- `<AccordionContent>` — expandable content panel

---

### Switch

| Field | Value |
|-------|-------|
| **Path** | `components/ui/Switch.tsx` |
| **Type** | Client Component (`'use client'`) |
| **Props** | `checked?: boolean`, `onCheckedChange?: (checked: boolean) => void`, `label?: string`, `disabled?: boolean` |

**Elements:**
- Toggle switch (off = gray, on = red)
- Optional label text
- Smooth transition animation

---

### CopyButton

| Field | Value |
|-------|-------|
| **Path** | `components/ui/CopyButton.tsx` |
| **Type** | Client Component (`'use client'` — clipboard API) |
| **Props** | `text: string`, `label?: string` (default: "Copy") |

**Elements:**
- Copy icon button
- Click copies text to clipboard
- Feedback: icon changes to checkmark for 2 seconds
- Toast: "Copied to clipboard!"

---

### QRCode

| Field | Value |
|-------|-------|
| **Path** | `components/ui/QRCode.tsx` |
| **Type** | Server Component |
| **Props** | `value: string`, `size?: number` (default: 200) |

**Elements:**
- QR code rendered as SVG (using a library like `qrcode.react`)
- White QR code on dark background (or configurable)
- Used primarily for cryptocurrency wallet addresses

---

### ThemeToggle

| Field | Value |
|-------|-------|
| **Path** | `components/ui/ThemeToggle.tsx` |
| **Type** | Client Component (`'use client'`) |
| **Props** | None |

**Elements:**
- Sun/Moon icon toggle button
- Switches between dark and light themes (dark is default/primary)
- Persists preference in localStorage
- Applies `dark` class on `<html>` element for Tailwind dark mode

---

### LanguageSelector

| Field | Value |
|-------|-------|
| **Path** | `components/ui/LanguageSelector.tsx` |
| **Type** | Client Component (`'use client'` — dropdown state) |
| **Props** | `currentLanguage?: string`, `onLanguageChange?: (lang: string) => void` |

**Elements:**
- Globe icon button (trigger)
- Dropdown with available languages (e.g., English, Spanish, French, Arabic, Chinese)
- Current language shown with a checkmark
- Persists selection in localStorage and user preferences
- Triggers i18n context update

---

*End of Component Inventory Document — Phase 1*