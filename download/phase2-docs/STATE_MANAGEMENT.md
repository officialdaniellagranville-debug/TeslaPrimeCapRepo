# TeslaPrimeCapital — Phase 2: State Management Architecture

> **Version:** 2.0.0
> **Status:** Specification
> **Last Updated:** 2025-01-15
> **Audience:** Frontend engineers, platform engineers, tech leads

---

## Table of Contents

1. [State Management Philosophy](#1-state-management-philosophy)
2. [Server State (TanStack Query)](#2-server-state-tanstack-query)
3. [Client State (Zustand)](#3-client-state-zustand)
4. [Form State Management](#4-form-state-management)
5. [URL State](#5-url-state)
6. [Real-time State](#6-real-time-state)
7. [Authentication State Flow](#7-authentication-state-flow)
8. [Optimistic Updates](#8-optimistic-updates)
9. [Loading & Error States](#9-loading--error-states)
10. [State Architecture Diagram](#10-state-architecture-diagram)
11. [Performance Considerations](#11-performance-considerations)

---

## 1. State Management Philosophy

### 1.1 Server-First Principle

TeslaPrimeCapital adopts an aggressively server-first state management strategy. The core tenet is: **if data originates from the server, it should live on the server for as long as possible.** This principle is not merely stylistic — it is a structural guarantee that eliminates entire categories of bugs (stale client caches, drift between client and server, unauthorized data exposure in client bundles) and aligns naturally with Next.js App Router's Server Component model.

In practice, this means:

- **Server Components** render the initial HTML using direct database/API calls with zero client-side JavaScript for data fetching. A dashboard page, for example, fetches wallet balance, active investments, and recent transactions entirely on the server during the RSC pass. No loading spinner is ever shown for the initial page paint — the data is already in the HTML.
- **Client Components** are used only for interactivity (modals, form inputs, real-time updates, drag-and-drop). They receive server data as props from the parent Server Component, and any subsequent mutations or refetches are handled by TanStack Query on the client.
- **No local duplication of server data.** Client-side stores (Zustand) never hold copies of data that the server owns. The auth store holds a minimal `user` object (id, email, role, mode) for quick access, but the canonical user profile is always fetched from the server via TanStack Query. The UI store holds layout state (sidebar, modals, toasts) that has no server counterpart.

### 1.2 Server State vs. Client State Separation

The boundary between server state and client state is sharp and unambiguous:

| Dimension | Server State (TanStack Query) | Client State (Zustand) |
|---|---|---|
| **Source of truth** | Backend API / Database | Browser runtime only |
| **Persistence** | None (cache is ephemeral, refetched on demand) | localStorage for auth tokens and mode preference only |
| **Shared across tabs** | No (each tab has its own query cache) | No (each tab has its own Zustand stores) |
| **Examples** | Wallet balance, transaction history, investment plans, KYC status, notifications | Sidebar open/closed, active modal, toast queue, demo/live mode toggle |
| **Invalidation** | Cache invalidation, time-based staleness, manual `invalidateQueries` | Direct `setState` call |

The separation is enforced by convention and code review: if a piece of state is fetchable from an API endpoint, it belongs in TanStack Query. If it is purely ephemeral UI state with no API representation, it belongs in Zustand. There are no gray areas.

### 1.3 Why TanStack Query for Server State

TanStack Query (React Query v5) is the canonical solution for server state in the React ecosystem, and it was selected for TeslaPrimeCapital for the following reasons:

1. **Declarative cache management.** Developers declare what data they need and how fresh it must be. TanStack Query handles deduplication, background refetching, garbage collection, and stale-while-revalidate semantics automatically. This eliminates the manual `useEffect` + `useState` + loading/error boilerplate that plagues ad-hoc fetching approaches.
2. **Optimistic updates.** The `onMutate` / `onError` / `onSettled` lifecycle provides a structured mechanism for immediate UI feedback during mutations, with automatic rollback on failure. This is critical for a financial platform where perceived latency must be minimized.
3. **Devtools.** TanStack Query Devtools provide real-time visibility into cache state, active queries, and mutations — invaluable for debugging stale data issues in a platform with complex interdependencies between wallets, investments, and transactions.
4. **TypeScript-first.** The query function return type flows directly into the `data` property, providing full type safety without manual generic annotations in most cases.
5. **Pagination and infinite scrolling.** Built-in `useInfiniteQuery` with cursor-based pagination support matches the API design for transaction history and notification lists.

### 1.4 Why Zustand for Client State

Zustand was selected over alternatives (Redux Toolkit, Jotai, Valtio) for these reasons:

1. **Minimal boilerplate.** A Zustand store is a single function call with no reducers, actions, dispatchers, or providers. This keeps the code surface small and readable.
2. **No Provider wrapper.** Zustand stores are accessed via hooks that read from a module-level singleton. This avoids the "provider hell" problem in deeply nested component trees and simplifies usage in Server Component boundaries (stores are only accessed in Client Components, but no provider needs to be threaded through Server Components).
3. **Selective re-rendering.** Zustand's `useStore(selector)` pattern ensures components only re-render when the specific slice of state they subscribe to changes. This is critical for the UI store, where opening a modal should not re-render the sidebar.
4. **Middleware ecosystem.** The `persist`, `devtools`, and `immer` middlewares are first-class and composable. This allows auth token persistence, Redux DevTools integration, and immutable state updates in complex stores.
5. **Small bundle size.** Zustand adds approximately 1.1 KB gzipped to the client bundle, which is negligible compared to the TanStack Query dependency.

---

## 2. Server State (TanStack Query)

### 2.1 QueryClient Configuration

The `QueryClient` is instantiated once on the client and provided via `QueryClientProvider` at the root layout level. The following default configuration applies to all queries unless overridden per-query:

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,            // 30 seconds — data is considered fresh
      gcTime: 300_000,              // 5 minutes — unused cache entries are garbage collected
      retry: 2,                     // Retry failed requests up to 2 times
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10_000), // Exponential backoff capped at 10s
      refetchOnWindowFocus: true,   // Refetch when the user switches back to the tab
      refetchOnReconnect: true,     // Refetch when network connectivity is restored
      refetchOnMount: true,         // Refetch when a component using this query mounts
      networkMode: 'online',        // Do not run queries while offline
    },
    mutations: {
      retry: 0,                     // Mutations are never automatically retried
      networkMode: 'online',
    },
  },
});
```

**Rationale for each setting:**

- **`staleTime: 30_000`**: Financial data changes frequently, but not every second. A 30-second window balances freshness with reduced server load. Critical queries (wallet balance, active investments) override this to 10 seconds. Reference data (plan details, static content) override to 5 minutes.
- **`gcTime: 300_000`**: Cached data for navigated-away pages is retained for 5 minutes so that returning to the page shows cached data instantly while a background refetch occurs. This covers the common pattern of switching between Dashboard and Investments tabs.
- **`retry: 2` with exponential backoff**: Transient network errors (brief connectivity loss, load balancer 502s) are retried, but persistent failures (401, 403, 404, 422) are surfaced immediately. The retry logic is customized per-query to avoid retrying validation errors.
- **`refetchOnWindowFocus: true`**: When a user returns to the TeslaPrimeCapital tab after being away, their wallet balance, investments, and notifications are silently refreshed. This is critical for a financial platform where data may have changed while the tab was inactive.
- **`refetchOnReconnect: true`**: After a network interruption (e.g., switching Wi-Fi networks), all active queries are refetched to ensure the client is in sync with the server.

### 2.2 Query Key Factory Pattern

All query keys are defined in a centralized factory module (`src/lib/query-keys.ts`). This ensures type safety, prevents key collisions, and makes cache invalidation predictable.

```typescript
// src/lib/query-keys.ts

export const queryKeys = {
  // ── Auth ──────────────────────────────────────────────
  auth: {
    all: ['auth'] as const,
    session: () => ['auth', 'session'] as const,
    currentUser: () => ['auth', 'current-user'] as const,
  },

  // ── Wallet ────────────────────────────────────────────
  wallet: {
    all: ['wallet'] as const,
    balance: (mode: 'demo' | 'live') => ['wallet', 'balance', mode] as const,
    transactions: (mode: 'demo' | 'live', params: TransactionFilters) =>
      ['wallet', 'transactions', mode, params] as const,
  },

  // ── Investments ───────────────────────────────────────
  investment: {
    all: ['investment'] as const,
    plans: () => ['investment', 'plans'] as const,
    planDetail: (planId: string) => ['investment', 'plans', planId] as const,
    active: (mode: 'demo' | 'live') => ['investment', 'active', mode] as const,
    history: (mode: 'demo' | 'live', params: PaginationParams) =>
      ['investment', 'history', mode, params] as const,
  },

  // ── Deposits ──────────────────────────────────────────
  deposit: {
    all: ['deposit'] as const,
    history: (mode: 'demo' | 'live', params: PaginationParams) =>
      ['deposit', 'history', mode, params] as const,
    status: (depositId: string) => ['deposit', 'status', depositId] as const,
    paymentMethods: (mode: 'demo' | 'live') =>
      ['deposit', 'payment-methods', mode] as const,
  },

  // ── Withdrawals ───────────────────────────────────────
  withdrawal: {
    all: ['withdrawal'] as const,
    history: (mode: 'demo' | 'live', params: PaginationParams) =>
      ['withdrawal', 'history', mode, params] as const,
    status: (withdrawalId: string) =>
      ['withdrawal', 'status', withdrawalId] as const,
    bankAccounts: (mode: 'demo' | 'live') =>
      ['withdrawal', 'bank-accounts', mode] as const,
  },

  // ── Referrals ─────────────────────────────────────────
  referral: {
    all: ['referral'] as const,
    stats: (mode: 'demo' | 'live') => ['referral', 'stats', mode] as const,
    downline: (mode: 'demo' | 'live', params: PaginationParams) =>
      ['referral', 'downline', mode, params] as const,
    commissions: (mode: 'demo' | 'live', params: PaginationParams) =>
      ['referral', 'commissions', mode, params] as const,
    binaryTree: (mode: 'demo' | 'live') =>
      ['referral', 'binary-tree', mode] as const,
  },

  // ── KYC ───────────────────────────────────────────────
  kyc: {
    all: ['kyc'] as const,
    status: () => ['kyc', 'status'] as const,
    documents: () => ['kyc', 'documents'] as const,
  },

  // ── Notifications ─────────────────────────────────────
  notification: {
    all: ['notification'] as const,
    list: (params: PaginationParams) =>
      ['notification', 'list', params] as const,
    unreadCount: () => ['notification', 'unread-count'] as const,
  },

  // ── Admin ─────────────────────────────────────────────
  admin: {
    all: ['admin'] as const,
    userList: (params: AdminUserFilters) =>
      ['admin', 'users', params] as const,
    userDetail: (userId: string) => ['admin', 'users', userId] as const,
    kycReviewQueue: (params: PaginationParams) =>
      ['admin', 'kyc-queue', params] as const,
    kycDetail: (submissionId: string) =>
      ['admin', 'kyc-detail', submissionId] as const,
    withdrawalApprovalQueue: (params: PaginationParams) =>
      ['admin', 'withdrawal-queue', params] as const,
    withdrawalDetail: (withdrawalId: string) =>
      ['admin', 'withdrawal-detail', withdrawalId] as const,
    platformStats: () => ['admin', 'platform-stats'] as const,
    platformStatsDaily: (date: string) =>
      ['admin', 'platform-stats', 'daily', date] as const,
  },
} as const;
```

**Key design decisions:**

- Every key factory function returns `as const` to preserve literal types. This enables the `invalidateQueries` call to accept exact key prefixes for surgical invalidation.
- The `mode` parameter (`'demo' | 'live'`) is embedded in wallet, investment, deposit, withdrawal, and referral keys. This ensures that toggling between demo and live mode fetches and caches data independently — a user's demo wallet balance and live wallet balance are separate cache entries that never collide.
- Filter and pagination parameters are included in list query keys. This means filtering transactions by "deposits only" creates a separate cache entry from "all transactions," which is correct because the result sets are different.
- Admin keys are namespaced under `admin` to allow bulk invalidation of all admin queries when the admin session state changes.

### 2.3 Per-Domain Query Specifications

#### 2.3.1 Auth Queries

| Query Key | API Endpoint | Method | staleTime | gcTime | Invalidation Triggers |
|---|---|---|---|---|---|
| `auth.session()` | `GET /api/auth/session` | Cookie-based | 0 (always fresh) | 0 (no cache) | N/A — checked on every navigation |
| `auth.currentUser()` | `GET /api/users/me` | Bearer JWT | 60_000 (1 min) | 300_000 (5 min) | Login, logout, profile update mutation |

**Behavioral notes:**

- The session query runs on the server side (in a Server Component or middleware) and does not use TanStack Query at all. It reads the HTTP-only session cookie and validates the JWT. The result is passed down as a prop to the root Client Component, which initializes the auth Zustand store.
- The `currentUser()` query fetches the full user profile (name, email, avatar, KYC status, referral code, mode preference). It is used by the header, profile page, and any component that needs user metadata. The 60-second staleTime reflects that profile changes are infrequent.
- Session validation failure (expired or invalid JWT) triggers `authStore.logout()` and redirects to `/login`.

#### 2.3.2 Wallet Queries

| Query Key | API Endpoint | Method | staleTime | gcTime | Invalidation Triggers |
|---|---|---|---|---|---|
| `wallet.balance(mode)` | `GET /api/wallet/balance` | Bearer JWT | 10_000 (10s) | 60_000 (1 min) | Deposit confirmed, withdrawal processed, investment return credited, admin adjustment |
| `wallet.transactions(mode, params)` | `GET /api/wallet/transactions` | Bearer JWT | 15_000 (15s) | 120_000 (2 min) | New transaction created, deposit confirmed, withdrawal processed |

**Behavioral notes:**

- Wallet balance has the shortest staleTime (10 seconds) of any query because it is displayed prominently on the dashboard and must reflect recent changes (incoming deposits, investment returns). The trade-off is slightly more frequent network requests, but the endpoint is lightweight (a single row lookup).
- Transaction history uses `useInfiniteQuery` with cursor-based pagination. The cursor is the transaction ID of the last item in the current page. Each page fetches 20 items.
- Transaction filters (`type`, `status`, `dateFrom`, `dateTo`) are part of the query key. Changing a filter automatically triggers a new fetch for the filtered result set.

#### 2.3.3 Investment Queries

| Query Key | API Endpoint | Method | staleTime | gcTime | Invalidation Triggers |
|---|---|---|---|---|---|
| `investment.plans()` | `GET /api/investments/plans` | Bearer JWT | 300_000 (5 min) | 600_000 (10 min) | Admin updates plan configuration |
| `investment.planDetail(planId)` | `GET /api/investments/plans/:planId` | Bearer JWT | 300_000 (5 min) | 600_000 (10 min) | Admin updates plan configuration |
| `investment.active(mode)` | `GET /api/investments/active` | Bearer JWT | 15_000 (15s) | 120_000 (2 min) | New investment created, investment matured, investment return credited |
| `investment.history(mode, params)` | `GET /api/investments/history` | Bearer JWT | 30_000 (30s) | 300_000 (5 min) | New investment created, investment matured |

**Behavioral notes:**

- Plan details are reference data that changes rarely (only when an admin modifies plan configuration). The 5-minute staleTime reflects this.
- Active investments need to reflect maturity status changes. If an investment matures while the user is on the dashboard, the 15-second staleTime ensures the UI updates within 15 seconds of a window focus or manual refetch.
- Investment history uses `useInfiniteQuery` with cursor-based pagination, identical to transaction history.

#### 2.3.4 Deposit Queries

| Query Key | API Endpoint | Method | staleTime | gcTime | Invalidation Triggers |
|---|---|---|---|---|---|
| `deposit.history(mode, params)` | `GET /api/deposits` | Bearer JWT | 15_000 (15s) | 120_000 (2 min) | New deposit initiated, deposit confirmed |
| `deposit.status(depositId)` | `GET /api/deposits/:depositId` | Bearer JWT | 5_000 (5s) | 60_000 (1 min) | Polling — status changes from pending to confirmed/rejected |
| `deposit.paymentMethods(mode)` | `GET /api/deposits/payment-methods` | Bearer JWT | 300_000 (5 min) | 600_000 (10 min) | Admin updates payment methods |

**Behavioral notes:**

- `deposit.status(depositId)` uses a short 5-second staleTime because it is polled during the deposit flow. After a user submits a deposit, the detail page polls this query every 5 seconds until the deposit is confirmed or rejected, at which point polling stops and a success/failure UI is shown.
- Payment methods are reference data with a long staleTime.

#### 2.3.5 Withdrawal Queries

| Query Key | API Endpoint | Method | staleTime | gcTime | Invalidation Triggers |
|---|---|---|---|---|---|
| `withdrawal.history(mode, params)` | `GET /api/withdrawals` | Bearer JWT | 15_000 (15s) | 120_000 (2 min) | New withdrawal requested, withdrawal status change |
| `withdrawal.status(withdrawalId)` | `GET /api/withdrawals/:withdrawalId` | Bearer JWT | 5_000 (5s) | 60_000 (1 min) | Polling — status changes from pending to processing/completed/rejected |
| `withdrawal.bankAccounts(mode)` | `GET /api/withdrawals/bank-accounts` | Bearer JWT | 60_000 (1 min) | 300_000 (5 min) | User adds/edits/deletes bank account |

**Behavioral notes:**

- Withdrawal status polling follows the same pattern as deposit status polling: short staleTime, stopped when a terminal state is reached.
- Bank accounts are cached for 1 minute because they are displayed in a dropdown during the withdrawal form and should be reasonably current.

#### 2.3.6 Referral Queries

| Query Key | API Endpoint | Method | staleTime | gcTime | Invalidation Triggers |
|---|---|---|---|---|---|
| `referral.stats(mode)` | `GET /api/referrals/stats` | Bearer JWT | 30_000 (30s) | 300_000 (5 min) | New referral signs up, commission credited |
| `referral.downline(mode, params)` | `GET /api/referrals/downline` | Bearer JWT | 30_000 (30s) | 300_000 (5 min) | New referral signs up |
| `referral.commissions(mode, params)` | `GET /api/referrals/commissions` | Bearer JWT | 15_000 (15s) | 120_000 (2 min) | New commission credited |
| `referral.binaryTree(mode)` | `GET /api/referrals/binary-tree` | Bearer JWT | 60_000 (1 min) | 300_000 (5 min) | New referral placed in tree |

**Behavioral notes:**

- Binary tree data is the most expensive query (recursive tree traversal) and is cached for 1 minute. It is only fetched when the user navigates to the referral tree visualization page.
- Commission history uses `useInfiniteQuery` with cursor-based pagination.

#### 2.3.7 KYC Queries

| Query Key | API Endpoint | Method | staleTime | gcTime | Invalidation Triggers |
|---|---|---|---|---|---|
| `kyc.status()` | `GET /api/kyc/status` | Bearer JWT | 30_000 (30s) | 300_000 (5 min) | User submits KYC, admin approves/rejects KYC |
| `kyc.documents()` | `GET /api/kyc/documents` | Bearer JWT | 60_000 (1 min) | 300_000 (5 min) | User uploads document, admin reviews document |

**Behavioral notes:**

- KYC status gates access to deposits and withdrawals. When status changes to "verified," the wallet and investment components must be unblocked. This is handled by invalidating `kyc.status()` which triggers a re-render of gating components.
- Document uploads return presigned URLs for direct S3 upload. The `kyc.documents()` query is invalidated after a successful upload to reflect the new document.

#### 2.3.8 Notification Queries

| Query Key | API Endpoint | Method | staleTime | gcTime | Invalidation Triggers |
|---|---|---|---|---|---|
| `notification.list(params)` | `GET /api/notifications` | Bearer JWT | 10_000 (10s) | 60_000 (1 min) | New notification received (SSE), notification marked as read |
| `notification.unreadCount()` | `GET /api/notifications/unread-count` | Bearer JWT | 10_000 (10s) | 60_000 (1 min) | New notification received (SSE), notification marked as read |

**Behavioral notes:**

- Notification data is the primary consumer of SSE events. When a new notification arrives via SSE, both `notification.list()` and `notification.unreadCount()` are immediately invalidated.
- The notification list uses `useInfiniteQuery` with cursor-based pagination.

#### 2.3.9 Admin Queries

| Query Key | API Endpoint | Method | staleTime | gcTime | Invalidation Triggers |
|---|---|---|---|---|---|
| `admin.userList(params)` | `GET /api/admin/users` | Bearer JWT | 15_000 (15s) | 120_000 (2 min) | User created, user updated, KYC status change |
| `admin.userDetail(userId)` | `GET /api/admin/users/:userId` | Bearer JWT | 15_000 (15s) | 120_000 (2 min) | Any update to this user |
| `admin.kycReviewQueue(params)` | `GET /api/admin/kyc/queue` | Bearer JWT | 10_000 (10s) | 60_000 (1 min) | New KYC submission, KYC reviewed |
| `admin.kycDetail(submissionId)` | `GET /api/admin/kyc/:submissionId` | Bearer JWT | 30_000 (30s) | 300_000 (5 min) | KYC reviewed |
| `admin.withdrawalApprovalQueue(params)` | `GET /api/admin/withdrawals/queue` | Bearer JWT | 10_000 (10s) | 60_000 (1 min) | New withdrawal request, withdrawal approved/rejected |
| `admin.withdrawalDetail(withdrawalId)` | `GET /api/admin/withdrawals/:withdrawalId` | Bearer JWT | 30_000 (30s) | 300_000 (5 min) | Withdrawal status change |
| `admin.platformStats()` | `GET /api/admin/stats` | Bearer JWT | 30_000 (30s) | 300_000 (5 min) | Any transaction, user registration, investment event |
| `admin.platformStatsDaily(date)` | `GET /api/admin/stats/daily/:date` | Bearer JWT | 300_000 (5 min) | 600_000 (10 min) | End-of-day reconciliation |

**Behavioral notes:**

- Admin queues (KYC review, withdrawal approval) use shorter staleTimes because admin users need to see new items promptly. SSE events provide instant updates, but the staleTime acts as a fallback.
- Platform stats are aggregated data that is expensive to compute. The 30-second staleTime balances freshness with server load. The daily stats endpoint uses a 5-minute staleTime because historical data does not change.
- All admin queries are gated by the RBAC system. If the user's role is not `admin` or `super_admin`, the queries are never mounted (the admin layout itself is conditionally rendered).

### 2.4 Mutation Specifications

Every write operation is defined as a TanStack Query mutation with explicit invalidation rules. Below is the complete mutation catalog.

#### 2.4.1 Auth Mutations

**`login(credentials)`**
- Endpoint: `POST /api/auth/login`
- Optimistic update: None (auth state is handled by the auth store on success)
- On success: Set auth token in Zustand store (triggers localStorage persist), set cookie via `document.cookie` or server `Set-Cookie` header, invalidate `auth.currentUser()`, redirect to dashboard
- On error: Display field-level error (invalid email/password) via form error state

**`logout()`**
- Endpoint: `POST /api/auth/logout`
- Optimistic update: Immediately clear auth store, clear TanStack Query cache via `queryClient.clear()`, redirect to `/login`
- On error: Still clear local state (the server session will expire naturally), but log a warning

**`refreshToken()`**
- Endpoint: `POST /api/auth/refresh`
- Optimistic update: None
- On success: Update stored token, rehydrate auth store
- On error: Trigger full logout (token is irrecoverably expired)

**`updateProfile(data)`**
- Endpoint: `PATCH /api/users/me`
- Optimistic update: Yes — immediately update `auth.currentUser()` cache with the new profile data
- On success: Invalidate `auth.currentUser()` to fetch the canonical server state
- On error: Rollback `auth.currentUser()` to previous value, display error toast

#### 2.4.2 Wallet Mutations

No direct wallet mutations exist. Wallet balance changes are side effects of deposit, withdrawal, and investment operations.

#### 2.4.3 Investment Mutations

**`createInvestment({ planId, amount })`**
- Endpoint: `POST /api/investments`
- Optimistic update: Yes — prepend a "pending" entry to `investment.active(mode)` and deduct `amount` from `wallet.balance(mode)`
- On success: Invalidate `investment.active(mode)`, `wallet.balance(mode)`, `investment.history(mode, params)`
- On error: Rollback both `investment.active(mode)` and `wallet.balance(mode)` to previous values, display error toast with reason (insufficient balance, plan unavailable, KYC not verified)

#### 2.4.4 Deposit Mutations

**`initiateDeposit({ amount, paymentMethodId })`**
- Endpoint: `POST /api/deposits`
- Optimistic update: Yes — prepend a "pending" deposit to `deposit.history(mode, params)` and add `amount` to `wallet.balance(mode)` in demo mode only (in live mode, balance is not updated until confirmed)
- On success: Invalidate `deposit.history(mode, params)`, `wallet.balance(mode)`
- On error: Rollback `deposit.history(mode, params)` and `wallet.balance(mode)` (if demo mode), display error toast

**`confirmDeposit(depositId)`** (admin only)
- Endpoint: `POST /api/admin/deposits/:depositId/confirm`
- Optimistic update: Yes — update `admin.kycReviewQueue(params)` and `deposit.status(depositId)` to "confirmed"
- On success: Invalidate `deposit.history(mode, params)`, `wallet.balance(mode)`, `admin.kycReviewQueue(params)`, `admin.userDetail(userId)`
- On error: Rollback status change, display error toast

#### 2.4.5 Withdrawal Mutations

**`requestWithdrawal({ amount, bankAccountId })`**
- Endpoint: `POST /api/withdrawals`
- Optimistic update: Yes — prepend a "pending" withdrawal to `withdrawal.history(mode, params)` and deduct `amount` from `wallet.balance(mode)`
- On success: Invalidate `withdrawal.history(mode, params)`, `wallet.balance(mode)`
- On error: Rollback both caches, display error toast (insufficient balance, withdrawal limit exceeded, KYC not verified)

**`approveWithdrawal(withdrawalId)`** (admin only)
- Endpoint: `POST /api/admin/withdrawals/:withdrawalId/approve`
- Optimistic update: Yes — update withdrawal status to "approved" in queue
- On success: Invalidate `admin.withdrawalApprovalQueue(params)`, `admin.userDetail(userId)`
- On error: Rollback status change, display error toast

**`rejectWithdrawal(withdrawalId, { reason })`** (admin only)
- Endpoint: `POST /api/admin/withdrawals/:withdrawalId/reject`
- Optimistic update: Yes — update withdrawal status to "rejected" in queue, refund amount to user's wallet
- On success: Invalidate `admin.withdrawalApprovalQueue(params)`, `admin.userDetail(userId)`, user's `wallet.balance(mode)`
- On error: Rollback status change, display error toast

#### 2.4.6 Referral Mutations

No direct referral mutations exist from the user's perspective (referrals are created when a new user signs up with a referral code). The system handles this server-side.

#### 2.4.7 KYC Mutations

**`submitKyc(documents)`**
- Endpoint: `POST /api/kyc/submit`
- Optimistic update: Yes — update `kyc.status()` to "pending_review"
- On success: Invalidate `kyc.status()`, `kyc.documents()`
- On error: Rollback `kyc.status()` to previous value, display error toast

**`approveKyc(submissionId)`** (KYC Officer / Admin)
- Endpoint: `POST /api/admin/kyc/:submissionId/approve`
- Optimistic update: Yes — update status to "verified" in queue and detail views
- On success: Invalidate `admin.kycReviewQueue(params)`, `admin.kycDetail(submissionId)`, `admin.userDetail(userId)`, user's `kyc.status()`
- On error: Rollback, display error toast

**`rejectKyc(submissionId, { reason })`** (KYC Officer / Admin)
- Endpoint: `POST /api/admin/kyc/:submissionId/reject`
- Optimistic update: Yes — update status to "rejected" in queue and detail views
- On success: Invalidate `admin.kycReviewQueue(params)`, `admin.kycDetail(submissionId)`, `admin.userDetail(userId)`, user's `kyc.status()`
- On error: Rollback, display error toast

#### 2.4.8 Notification Mutations

**`markNotificationAsRead(notificationId)`**
- Endpoint: `PATCH /api/notifications/:notificationId/read`
- Optimistic update: Yes — immediately update the notification in `notification.list(params)` cache to `read: true`, decrement `notification.unreadCount()` by 1
- On success: No additional invalidation needed (cache is already correct)
- On error: Rollback notification to `read: false`, re-increment unread count, no toast (silent failure — read status is not critical)

**`markAllNotificationsAsRead()`**
- Endpoint: `PATCH /api/notifications/read-all`
- Optimistic update: Yes — set all notifications in `notification.list(params)` cache to `read: true`, set `notification.unreadCount()` to 0
- On success: No additional invalidation needed
- On error: Rollback all changes, no toast

### 2.5 Prefetching Strategy

**Link hover prefetching:**

Navigation links to data-heavy pages (Investments, Transactions, Referral Tree) use TanStack Query's `queryClient.prefetchQuery()` on mouse hover. The prefetch is triggered by a custom `usePrefetchOnHover` hook that wraps `onMouseEnter` on `<Link>` components. Prefetched data is stored in the TanStack Query cache with the same staleTime and gcTime as a regular query, so if the user clicks the link within the cache window, the page renders instantly with cached data and silently refetches in the background.

Pages that use prefetching:
- `/dashboard/investments` — prefetches `investment.active(mode)`
- `/dashboard/transactions` — prefetches first page of `wallet.transactions(mode, { page: 1 })`
- `/dashboard/referrals` — prefetches `referral.stats(mode)`
- `/dashboard/referrals/tree` — prefetches `referral.binaryTree(mode)` (only on hover, not on page load of referrals)

**Route-based prefetching:**

Server Components prefetch data during the RSC render pass using `React.cache()` and direct API calls. This data is passed as props to Client Components and also used to pre-populate the TanStack Query cache via `queryClient.setQueryData()` in a `HydrationBoundary` wrapper. This means the Client Component's first render has data available immediately (no loading state), and TanStack Query takes over for subsequent refetches.

```typescript
// Pattern: Server Component prefetches, HydrationBoundary hydrates client cache
export default async function DashboardPage() {
  const [balance, investments, notifications] = await Promise.all([
    fetchWalletBalance(mode),
    fetchActiveInvestments(mode),
    fetchNotifications({ page: 1, limit: 5 }),
  ]);

  return (
    <HydrationBoundary queryClient={dehydrate(queryClient)}>
      <DashboardClient initialBalance={balance} />
    </HydrationBoundary>
  );
}
```

### 2.6 Pagination Pattern (Cursor-Based Infinite Scroll)

All paginated lists (transactions, notifications, investment history, deposit history, withdrawal history, referral downline, referral commissions, admin queues) use cursor-based pagination via `useInfiniteQuery`.

**Cursor mechanism:**

- The API returns `{ data: T[], nextCursor: string | null, hasMore: boolean }`.
- The cursor is the ID of the last item in the current page (string-encoded UUID or ISO timestamp, depending on the domain).
- `getNextPageParam` extracts `nextCursor` from the API response. If `nextCursor` is `null`, `hasNextPage` becomes `false` and the infinite scroll stops.
- `getPreviousPageParam` returns `undefined` for all lists (backward pagination is not supported — lists are appended only).

**Component pattern:**

Each infinite scroll list uses the same compositional pattern:
1. A `useInfiniteQuery` hook with the appropriate query key and fetch function.
2. A `<VirtualList>` component (from `@tanstack/react-virtual`) that renders only visible items, providing smooth scrolling even with thousands of items.
3. An `IntersectionObserver` on a sentinel element at the bottom of the list. When the sentinel enters the viewport, `fetchNextPage()` is called.
4. A loading indicator shown while `isFetchingNextPage` is true.
5. An "end of list" message shown when `hasNextPage` is false.

**Virtual scrolling:**

Transaction history and notification lists can grow unboundedly. Without virtual scrolling, rendering 10,000+ DOM nodes causes severe performance degradation. `@tanstack/react-virtual` is used to render only the items visible in the viewport plus a small overscan buffer (5 items above and below). The virtual list integrates with `useInfiniteQuery`'s `flatPages` (a flattened array of all fetched pages) and dynamically requests new pages as the user scrolls near the bottom.

---

## 3. Client State (Zustand)

### 3.1 Store Definitions

#### 3.1.1 Auth Store (`src/stores/auth-store.ts`)

**State shape:**

```typescript
interface AuthState {
  isAuthenticated: boolean;
  user: {
    id: string;
    email: string;
    name: string;
    role: 'user' | 'kyc_officer' | 'admin' | 'super_admin';
    avatarUrl: string | null;
  } | null;
  mode: 'demo' | 'live';
  token: string | null;
  tokenExpiresAt: number | null; // Unix timestamp in milliseconds
}
```

**Actions:**

```typescript
interface AuthActions {
  login(response: LoginResponse): void;
  logout(): void;
  setToken(token: string, expiresAt: number): void;
  setUser(user: AuthState['user']): void;
  toggleMode(): void;
  hydrateFromStorage(): void;
}
```

**Behavioral specification:**

- `login(response)`: Sets `isAuthenticated` to `true`, populates `user` and `token` from the response, and stores `token` and `mode` in localStorage. Triggers a TanStack Query invalidation of `auth.currentUser()`.
- `logout()`: Resets all state to initial values (`isAuthenticated: false`, `user: null`, `token: null`), removes token and mode from localStorage, clears the entire TanStack Query cache via `queryClient.clear()`, and calls `window.location.href = '/login'` (full navigation, not Next.js router, to ensure all client state is destroyed).
- `setToken(token, expiresAt)`: Updates the stored token and expiry time. Used during silent token refresh. Does not modify `isAuthenticated` or `user`.
- `setUser(user)`: Updates the user object. Used when the `auth.currentUser()` query returns updated profile data.
- `toggleMode()`: Flips `mode` between `'demo'` and `'live'`, persists the new mode to localStorage, and invalidates all mode-dependent query keys (wallet, investment, deposit, withdrawal, referral). The invalidation is scoped: `queryClient.invalidateQueries({ queryKey: ['wallet'] })`, `queryClient.invalidateQueries({ queryKey: ['investment'] })`, etc. This triggers a refetch of all data for the newly selected mode.
- `hydrateFromStorage()`: Reads `token`, `mode`, and `tokenExpiresAt` from localStorage and sets them in the store. Called once on app initialization (in the root Client Component's `useEffect`). If the token is expired, `logout()` is called instead.

#### 3.1.2 UI Store (`src/stores/ui-store.ts`)

**State shape:**

```typescript
interface UIState {
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  activeModal: {
    type: 'deposit' | 'withdraw' | 'invest' | 'kyc-upload' | 'referral-invite' | 'confirm-action' | null;
    props?: Record<string, unknown>;
  } | null;
  toasts: Array<{
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message?: string;
    duration: number; // milliseconds, 0 = persistent until dismissed
    createdAt: number;
  }>;
  activeTab: Record<string, string>; // map of tab group ID to active tab key
}
```

**Actions:**

```typescript
interface UIActions {
  toggleSidebar(): void;
  setSidebarOpen(open: boolean): void;
  toggleSidebarCollapse(): void;
  openModal(type: UIState['activeModal']['type'], props?: Record<string, unknown>): void;
  closeModal(): void;
  addToast(toast: Omit<UIState['toasts'][0], 'id' | 'createdAt'>): string;
  removeToast(id: string): void;
  clearToasts(): void;
  setActiveTab(group: string, tab: string): void;
}
```

**Behavioral specification:**

- `toggleSidebar()` / `setSidebarOpen(open)`: Controls the mobile sidebar overlay. On desktop, the sidebar is always visible and `sidebarOpen` is ignored.
- `toggleSidebarCollapse()`: Controls the collapsed/expanded state of the desktop sidebar. The collapsed state persists in localStorage.
- `openModal(type, props)`: Sets `activeModal` to the specified type and props. Only one modal can be open at a time (opening a new modal implicitly closes the previous one). The modal component reads `activeModal` and renders the appropriate modal type.
- `closeModal()`: Sets `activeModal` to `null`. Also clears any associated props.
- `addToast(toast)`: Appends a toast with a generated UUID and `createdAt` timestamp. Returns the toast ID for programmatic dismissal. If the toast has a non-zero `duration`, it is automatically removed after that duration via `setTimeout`.
- `removeToast(id)`: Removes a specific toast from the array.
- `clearToasts()`: Removes all toasts. Called on logout.
- `setActiveTab(group, tab)`: Sets the active tab for a given tab group. Tab state is used in multi-tab views (e.g., Transactions tab having "All", "Deposits", "Withdrawals" sub-tabs).

#### 3.1.3 Notification Store (`src/stores/notification-store.ts`)

**State shape:**

```typescript
interface NotificationState {
  unreadCount: number;
  realtimeNotifications: Array<{
    id: string;
    title: string;
    body: string;
    type: 'info' | 'success' | 'warning' | 'alert';
    createdAt: string;
    isRead: boolean;
  }>;
  sseConnectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
}
```

**Actions:**

```typescript
interface NotificationActions {
  setUnreadCount(count: number): void;
  incrementUnreadCount(): void;
  decrementUnreadCount(): void;
  addNotification(notification: NotificationState['realtimeNotifications'][0]): void;
  markAsReadLocally(notificationId: string): void;
  setSSEConnectionStatus(status: NotificationState['sseConnectionStatus']): void;
}
```

**Behavioral specification:**

- `setUnreadCount(count)`: Sets the unread count. Called when the `notification.unreadCount()` query returns fresh data and to keep the header badge in sync between SSE events and periodic refetches.
- `incrementUnreadCount()` / `decrementUnreadCount()`: Used by SSE event handlers to optimistically update the unread count without waiting for a query refetch.
- `addNotification(notification)`: Prepends a new notification to `realtimeNotifications` (maintains a local buffer of the most recent 50 notifications received via SSE). Triggers `incrementUnreadCount()` if the notification is unread. Also invalidates `notification.list(params)` and `notification.unreadCount()` in TanStack Query to trigger a background refetch for the canonical state.
- `markAsReadLocally(notificationId)`: Finds the notification in `realtimeNotifications` and sets `isRead` to `true`. Used for optimistic updates when the user marks a notification as read.
- `setSSEConnectionStatus(status)`: Updates the SSE connection status indicator. Used by the SSE client to communicate connection state to the UI (e.g., showing a "reconnecting..." indicator).

### 3.2 Store Persistence Strategy

Only the auth store uses Zustand's `persist` middleware, and only for a specific subset of fields:

**Persisted to localStorage (key: `tpc-auth`):**
- `token` — the JWT access token
- `tokenExpiresAt` — the token's expiration timestamp
- `mode` — the user's demo/live mode preference

**NOT persisted:**
- `isAuthenticated` — derived from whether a valid, non-expired token exists in storage
- `user` — fetched from the server on every app initialization via `auth.currentUser()`

**No other stores are persisted.** The UI store resets to defaults on page reload (sidebar opens, no modals, no toasts). The notification store resets on page reload (unread count is fetched from the server, SSE re-establishes).

**Storage format:** JSON, managed by Zustand's `persist` middleware with `version: 1` and a `migrate` function placeholder for future schema changes.

**Storage security considerations:**
- The JWT token in localStorage is an access token with a short expiry (15 minutes). The refresh token is stored in an HTTP-only cookie and is never accessible to JavaScript.
- In a future phase, the access token will be moved to an in-memory variable (not persisted at all) and re-acquired via the refresh token cookie on page reload. This mitigates XSS-based token theft. The current localStorage approach is accepted for Phase 2 with the understanding that the migration path is straightforward.

### 3.3 Store Composition and Cross-Store Interactions

Stores are designed to be loosely coupled. Cross-store interactions follow these rules:

1. **Stores do not import each other.** A store never calls another store's actions directly. This prevents circular dependencies and makes stores independently testable.
2. **Cross-store communication happens via TanStack Query invalidation.** For example, when `authStore.toggleMode()` changes the mode, it calls `queryClient.invalidateQueries()` for all mode-dependent keys. The query refetch then updates the components that depend on that data. No Zustand store needs to know about another store's data.
3. **Components orchestrate cross-store interactions.** If a component needs to read from both the auth store and a query, it does so by using both hooks: `const { mode } = useAuthStore()` and `const { data: balance } = useQuery(queryKeys.wallet.balance(mode))`.
4. **Event emitter pattern for SSE.** The SSE client is a standalone module (`src/lib/sse-client.ts`) that emits events. The notification store subscribes to SSE events via a callback registered in the root Client Component. This decouples the SSE client from the store implementation.

### 3.4 Zustand Middleware Configuration

All stores use the following middleware stack (ordered from outermost to innermost):

1. **`devtools`** (development only): Connects to the Redux DevTools extension. The store name is set to `AuthStore`, `UIStore`, or `NotificationStore` for clear identification. Disabled in production via `process.env.NODE_ENV === 'development'` check.
2. **`immer`**: Enables immutable state updates with mutable syntax inside `set()` callbacks. Used primarily in the notification store (for array operations like prepending, filtering, and updating notifications) and the UI store (for toast array management).
3. **`persist`** (auth store only): Persists specified fields to localStorage with JSON serialization.

```typescript
// Middleware stack example for auth store
const useAuthStore = create<AuthState & AuthActions>()(
  devtools(
    persist(
      (set, get) => ({
        // ... state and actions
      }),
      {
        name: 'tpc-auth',
        partialize: (state) => ({
          token: state.token,
          tokenExpiresAt: state.tokenExpiresAt,
          mode: state.mode,
        }),
        version: 1,
      }
    ),
    { name: 'AuthStore', enabled: process.env.NODE_ENV === 'development' }
  )
);
```

---

## 4. Form State Management

### 4.1 React Hook Form + Zod Integration

All forms in TeslaPrimeCapital use React Hook Form (RHF) for form state management and Zod for schema validation. The integration is mediated by `@hookform/resolvers/zod`, which translates Zod schema violations into RHF error objects.

**Pattern:**

```typescript
// Every form follows this pattern
const schema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type FormData = z.infer<typeof schema>;

const form = useForm<FormData>({
  resolver: zodResolver(schema),
  defaultValues: {
    email: '',
    password: '',
  },
});
```

**Key conventions:**

- Every form has a named Zod schema defined in the same file or in a shared `src/schemas/` directory.
- The `FormData` type is derived from the schema using `z.infer`, ensuring the form values type matches the validation schema exactly.
- Default values are always provided explicitly, never left undefined. This prevents uncontrolled-to-controlled component warnings and ensures reset behavior is predictable.
- Field-level validation runs on `onChange` (as the user types) and `onBlur` (when the user leaves the field). Form-level validation runs on `onSubmit`.

### 4.2 Form Error Handling Patterns

**Client-side validation errors (Zod):**

- Displayed inline below the form field using the `<FormError>` component.
- The `<FormError>` component receives the error message from `form.formState.errors.fieldName?.message`.
- Errors clear automatically when the user modifies the field (RHF's `mode: 'onChange'` behavior).
- Styling: red border on the input field, red text below it, with a subtle fade-in animation.

**Server-side validation errors (API response):**

- The API returns 422 Unprocessable Entity with a structured error body:
  ```json
  {
    "errors": {
      "email": ["This email is already registered"],
      "amount": ["Minimum deposit amount is $100"]
    }
  }
  ```
- On mutation error, the form's `setError()` method is called for each field in the response:
  ```typescript
  onError: (error: ApiError) => {
    if (error.statusCode === 422 && error.fields) {
      Object.entries(error.fields).forEach(([field, messages]) => {
        form.setError(field as keyof FormData, {
          type: 'server',
          message: messages[0],
        });
      });
    }
  };
  ```
- Server-side errors are visually distinguished from client-side errors by a slightly different color (orange instead of red) and a "Server" badge.
- Non-field errors (e.g., "KYC verification required") are displayed as a form-level alert above all fields.

### 4.3 Multi-Step Form State

Multi-step forms (KYC submission, deposit flow) use a step-based state machine managed by React Hook Form's `useForm` combined with a local `currentStep` state variable.

**KYC Submission Flow (4 steps):**

| Step | Fields | Zod Schema |
|---|---|---|
| 1. Personal Info | firstName, lastName, dateOfBirth, nationality | `kycPersonalInfoSchema` |
| 2. Address | street, city, state, postalCode, country | `kycAddressSchema` |
| 3. Identity Document | documentType (passport/nationalId/driversLicense), frontImage (File), backImage (File) | `kycDocumentSchema` |
| 4. Review & Submit | (read-only summary of steps 1-3) | N/A (no input) |

**State management:**

- A single `useForm` instance spans all steps. This means field values from step 1 are preserved when the user navigates to step 3.
- Step validation is scoped: only the fields for the current step are validated when the user clicks "Next." This is implemented by validating a sub-schema:
  ```typescript
  const validateCurrentStep = async () => {
    const stepSchema = stepSchemas[currentStep];
    const result = stepSchema.safeParse(form.getValues());
    return result.success;
  };
  ```
- Navigation between steps is managed by `currentStep: number` in the component's local state (not in Zustand, because form state is inherently component-scoped and should not survive navigation).
- The "Back" button never validates — it simply decrements `currentStep`.
- The "Submit" button (step 4) validates all fields across all steps simultaneously using the combined `kycFullSchema`.
- On successful submission, the form is reset via `form.reset()` and the user is redirected to the KYC status page.

**Deposit Flow (3 steps):**

| Step | Fields | Notes |
|---|---|---|
| 1. Amount | amount, currency | Validates against plan minimum/maximum |
| 2. Payment Method | paymentMethodId | Lists available methods for the selected currency |
| 3. Confirmation | (read-only summary) | Shows payment instructions (crypto address, bank details) |

### 4.4 Form Reset and Dirty State Tracking

- **Reset:** `form.reset()` is called after successful form submission and when the component unmounts. The reset uses the same `defaultValues` provided during `useForm` initialization.
- **Dirty state:** `form.formState.isDirty` is `true` when any field value differs from its default. This is used to show a "You have unsaved changes" warning if the user attempts to navigate away from a form with unsaved changes. The warning is implemented via `useBeforeUnload` (for browser tab close) and Next.js router's `useBlocker` (for in-app navigation).
- **Touched state:** `form.formState.touchedFields` tracks which fields the user has interacted with. Validation errors are only shown for touched fields (prevents showing errors on fields the user hasn't reached yet in multi-step forms).

---

## 5. URL State

### 5.1 Next.js App Router Search Params as State

TeslaPrimeCapital uses URL search parameters as the canonical source of truth for certain types of state. This ensures that the URL is shareable, bookmarkable, and back-button-friendly.

**State that lives in the URL:**

| State | URL Parameter | Example | Component |
|---|---|---|---|
| Page number | `page` | `?page=3` | All paginated lists |
| Items per page | `limit` | `?limit=50` | All paginated lists |
| Active tab | `tab` | `?tab=deposits` | Transaction page tabs |
| Transaction type filter | `type` | `?type=deposit` | Transaction history |
| Transaction status filter | `status` | `?status=completed` | Transaction history |
| Date range | `from`, `to` | `?from=2025-01-01&to=2025-01-15` | Transaction history, admin reports |
| Search query | `q` | `?q=john@example.com` | Admin user search |
| KYC filter | `kycStatus` | `?kycStatus=pending` | Admin KYC queue |
| Sort order | `sort` | `?sort=createdAt:desc` | All list views |
| Admin detail view | `userId`, `withdrawalId`, etc. | `?userId=abc123` | Admin detail panels (side drawer or modal) |

**State that lives in memory (Zustand UI store):**

| State | Store | Rationale |
|---|---|---|
| Sidebar open/closed | `uiStore.sidebarOpen` | Transient UI state, not shareable |
| Active modal | `uiStore.activeModal` | Transient UI state |
| Toast queue | `uiStore.toasts` | Ephemeral notifications |
| SSE connection status | `notificationStore.sseConnectionStatus` | Connection metadata |

**State that lives on the server (TanStack Query cache):**

| State | Query Key | Rationale |
|---|---|---|
| Wallet balance | `wallet.balance(mode)` | Server is source of truth |
| Transactions | `wallet.transactions(...)` | Server is source of truth |
| Investments | `investment.active(mode)` | Server is source of truth |
| KYC status | `kyc.status()` | Server is source of truth |
| Notifications | `notification.list(params)` | Server is source of truth |
| User profile | `auth.currentUser()` | Server is source of truth |

### 5.2 useSearchParams and useRouter Patterns

**Reading URL state:**

All components that depend on URL parameters use Next.js `useSearchParams()` to read the current state and pass it to TanStack Query as part of the query key:

```typescript
function TransactionHistory() {
  const searchParams = useSearchParams();
  const type = searchParams.get('type') || 'all';
  const status = searchParams.get('status') || 'all';
  const page = Number(searchParams.get('page')) || 1;

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.wallet.transactions(mode, { type, status, page }),
    queryFn: () => fetchTransactions({ type, status, page }),
  });

  // ... render
}
```

**Writing URL state (client-side navigation):**

URL parameter changes use `useRouter().push()` or `useRouter().replace()` with the updated search params. The `replace` variant is used for pagination (to avoid cluttering the browser history with every page navigation). The `push` variant is used for filter changes (so the user can use the back button to undo a filter change).

```typescript
function TransactionFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleTypeChange = (type: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('type', type);
    params.delete('page'); // Reset to page 1 when filter changes
    router.push(`/dashboard/transactions?${params.toString()}`);
  };

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(page));
    router.replace(`/dashboard/transactions?${params.toString()}`);
  };
}
```

**Server Component URL state reading:**

In Server Components, URL parameters are read from the `searchParams` prop (Next.js App Router passes this automatically to page components):

```typescript
export default async function TransactionPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const type = params.type || 'all';
  // ... fetch data on server
}
```

---

## 6. Real-time State

### 6.1 Server-Sent Events (SSE) Architecture

TeslaPrimeCapital uses Server-Sent Events (SSE) for real-time updates. SSE was chosen over WebSockets because:

1. **Unidirectional communication is sufficient.** All real-time updates flow from server to client. Client-to-server communication uses standard HTTP requests (mutations). There is no need for bidirectional communication.
2. **SSE is simpler.** No handshake protocol, no frame parsing, no ping/pong. The client opens an HTTP connection and receives a stream of `event: ...\ndata: ...\n\n` messages.
3. **SSE works through proxies.** Unlike WebSockets, SSE connections are long-lived HTTP requests that work through most corporate proxies and CDMs without special configuration.
4. **Automatic reconnection.** The browser's `EventSource` API automatically reconnects on connection drop, with built-in backoff.

**SSE endpoint:** `GET /api/events` (authenticated via cookie or query parameter token)

**Connection lifecycle:**

1. The root Client Component creates an `EventSource` instance pointing to `/api/events`.
2. The server sends an initial `connected` event with the current server timestamp.
3. The server pushes events as they occur (new notification, balance change, KYC status change, etc.).
4. If the connection drops, `EventSource` automatically reconnects after a delay (starting at 1 second, doubling on each failure, capped at 30 seconds).
5. On successful reconnection, the server sends any events that occurred during the disconnection period (the server maintains a per-user event buffer for the last 60 seconds).

### 6.2 SSE Event Types and Cache Invalidation Targets

| SSE Event Type | Payload | Zustand Store Update | TanStack Query Invalidation |
|---|---|---|---|
| `notification.new` | `{ id, title, body, type, createdAt }` | `notificationStore.addNotification()` | `notification.list(params)`, `notification.unreadCount()` |
| `wallet.balance_updated` | `{ mode, newBalance }` | None (query cache handles it) | `wallet.balance(mode)` |
| `deposit.confirmed` | `{ depositId, mode, amount }` | None | `wallet.balance(mode)`, `deposit.history(mode, params)`, `deposit.status(depositId)` |
| `deposit.rejected` | `{ depositId, mode, reason }` | None | `deposit.history(mode, params)`, `deposit.status(depositId)` |
| `withdrawal.processing` | `{ withdrawalId, mode }` | None | `withdrawal.history(mode, params)`, `withdrawal.status(withdrawalId)` |
| `withdrawal.completed` | `{ withdrawalId, mode }` | None | `wallet.balance(mode)`, `withdrawal.history(mode, params)`, `withdrawal.status(withdrawalId)` |
| `withdrawal.rejected` | `{ withdrawalId, mode, reason }` | None | `wallet.balance(mode)`, `withdrawal.history(mode, params)`, `withdrawal.status(withdrawalId)` |
| `investment.return_credited` | `{ investmentId, mode, amount }` | None | `wallet.balance(mode)`, `investment.active(mode)`, `investment.history(mode, params)` |
| `investment.matured` | `{ investmentId, mode }` | None | `investment.active(mode)`, `investment.history(mode, params)` |
| `kyc.status_changed` | `{ status: 'verified' \| 'rejected' \| 'requires_resubmission' }` | None | `kyc.status()`, `kyc.documents()` |
| `admin.new_kyc_submission` | `{ submissionId }` (admin only) | None | `admin.kycReviewQueue(params)` |
| `admin.new_withdrawal_request` | `{ withdrawalId }` (admin only) | None | `admin.withdrawalApprovalQueue(params)` |
| `admin.new_user_registered` | `{ userId }` (admin only) | None | `admin.userList(params)`, `admin.platformStats()` |

### 6.3 Integration with TanStack Query Cache

The SSE event handler calls `queryClient.invalidateQueries()` for the appropriate query keys. This triggers a background refetch that updates the TanStack Query cache, which in turn causes components subscribed to those queries to re-render with fresh data.

**Invalidation strategy:**

- Exact match invalidation is used when the event contains a specific identifier (e.g., `deposit.status(depositId)`).
- Prefix-based invalidation is used when the event affects all entries in a domain (e.g., `queryClient.invalidateQueries({ queryKey: queryKeys.wallet.balance(mode) })`).
- Invalidations are debounced at 100ms when multiple events arrive in rapid succession (e.g., during a batch processing run on the server). This prevents redundant refetches.

### 6.4 Connection Management

**Reconnect strategy:**

- The `EventSource` API handles reconnection automatically. The client does not implement custom reconnection logic.
- `Last-Event-ID` header is sent on reconnect. The server uses this to replay missed events.
- If the server returns an HTTP 401 during reconnection (token expired during disconnection), the SSE client calls `authStore.logout()` and redirects to login.

**Backoff:**

- The browser's built-in `EventSource` backoff starts at ~1 second and doubles on each failure, with a typical maximum of ~30 seconds. This is sufficient for TeslaPrimeCapital's use case.
- A custom `onerror` handler is attached to track the reconnection attempt count. After 5 consecutive failures, a "Connection lost" indicator is shown in the header. The indicator includes a manual "Reconnect" button that calls `eventSource.close()` and creates a new `EventSource` instance.

**Offline handling:**

- When the browser goes offline (`navigator.onLine === false`), the SSE connection drops naturally. The `EventSource` API queues the reconnection attempt and executes it when connectivity is restored.
- TanStack Query's `refetchOnReconnect: true` ensures all active queries are refetched when the browser comes back online.
- A global `online` / `offline` event listener updates `notificationStore.sseConnectionStatus` to `'disconnected'` when offline and `'connected'` when back online (after the SSE reconnection succeeds).

---

## 7. Authentication State Flow

### 7.1 Initial Load Sequence

The following sequence runs on every page load (including hard refresh):

```
1. Browser sends request to Next.js server
2. Server middleware reads HTTP-only session cookie
3. Middleware validates JWT:
   a. If valid: attach decoded user info to request, continue to page
   b. If expired: attempt silent refresh using refresh token cookie
      - If refresh succeeds: set new access token cookie, continue to page
      - If refresh fails: redirect to /login
   c. If absent: redirect to /login (unless route is public)
4. Server Component renders page HTML with user data
5. Client Component hydrates:
   a. useAuthStore.hydrateFromStorage() reads token and mode from localStorage
   b. If localStorage token differs from cookie token, localStorage wins (edge case, logged in on another device)
   c. auth.currentUser() query is enabled (isAuthenticated is true from step 4)
   d. queryClient fetches fresh user data and caches it
   e. SSE connection is established
6. App is fully loaded and interactive
```

**Middleware protection:**

- Routes under `/dashboard/*` require a valid session. If the session is missing or expired, the middleware redirects to `/login?redirect=/dashboard/...`.
- Routes under `/admin/*` additionally require the user's role to be `admin` or `super_admin`. Non-admin users are redirected to `/dashboard`.
- Public routes (`/login`, `/register`, `/`, `/pricing`) do not require a session.

### 7.2 Token Refresh Flow

**Silent refresh (proactive):**

- A `useInterval` hook runs every 60 seconds and checks if the access token will expire in the next 2 minutes (`tokenExpiresAt - Date.now() < 120_000`).
- If the token is about to expire, a `POST /api/auth/refresh` request is made using the HTTP-only refresh token cookie.
- On success: The response contains a new access token and its expiry. The auth store's `setToken()` is called, and the cookie is updated by the server's `Set-Cookie` header. No UI interruption occurs.
- On failure: `authStore.logout()` is called immediately. The user is redirected to `/login` with a "Session expired" toast message.

**Silent refresh (reactive):**

- If a TanStack Query request returns a 401, the global error handler attempts a token refresh:
  1. Call `POST /api/auth/refresh`.
  2. If refresh succeeds: retry the original query with the new token.
  3. If refresh fails: logout and redirect.
- This is implemented as a TanStack Query `queryFn` wrapper (`withAuthRefresh`) that intercepts 401 errors and retries once after refreshing.

### 7.3 Demo/Live Mode Toggle Flow

When the user toggles between demo and live mode:

1. **`authStore.toggleMode()`** flips the `mode` value and persists it to localStorage.
2. **All mode-dependent query caches are invalidated** via `queryClient.invalidateQueries()` with the appropriate key prefixes: `['wallet']`, `['investment']`, `['deposit']`, `['withdrawal']`, `['referral']`.
3. **Components re-render with loading states** as the invalidated queries refetch for the new mode.
4. **SSE connection is re-established** by closing the existing `EventSource` and creating a new one (the server filters events by mode).
5. **The URL is NOT changed.** The mode toggle is a client-side state change, not a route change. This is intentional — sharing a URL should not change the recipient's mode preference.

**Data isolation guarantee:**

Because the `mode` parameter is part of every relevant query key, demo data and live data occupy completely separate cache entries. There is zero risk of demo data leaking into live views or vice versa. The mode is also sent as a header (`X-Mode: demo` or `X-Mode: live`) on every API request, providing server-side enforcement of data isolation.

### 7.4 Logout Flow

1. **`POST /api/auth/logout`** is called to invalidate the refresh token on the server (best-effort — if this fails, the token will expire naturally).
2. **`authStore.logout()`** resets all auth state to initial values.
3. **`queryClient.clear()`** removes all entries from the TanStack Query cache, ensuring no sensitive data remains in memory.
4. **`uiStore.clearToasts()`** removes all toast notifications.
5. **SSE connection is closed** via `eventSource.close()`.
6. **localStorage is cleared** for the `tpc-auth` key.
7. **Full page navigation** to `/login` via `window.location.href` (not Next.js router) to ensure all client-side state (including React component tree) is destroyed and rebuilt.

---

## 8. Optimistic Updates

### 8.1 General Pattern

All optimistic updates follow the same TanStack Query lifecycle:

```typescript
useMutation({
  mutationFn: apiCall,
  onMutate: async (variables) => {
    // 1. Cancel any outgoing refetches for the affected queries
    await queryClient.cancelQueries({ queryKey: affectedQueryKey });

    // 2. Snapshot the current cache value
    const previousData = queryClient.getQueryData(affectedQueryKey);

    // 3. Optimistically update the cache
    queryClient.setQueryData(affectedQueryKey, (old) => applyOptimisticUpdate(old, variables));

    // 4. Return the snapshot for rollback
    return { previousData };
  },
  onError: (error, variables, context) => {
    // 5. Rollback to the snapshot
    if (context?.previousData) {
      queryClient.setQueryData(affectedQueryKey, context.previousData);
    }
    // 6. Show error toast
    uiStore.addToast({ type: 'error', title: 'Operation failed', message: error.message });
  },
  onSettled: () => {
    // 7. Always refetch to get the canonical server state
    queryClient.invalidateQueries({ queryKey: affectedQueryKey });
  },
});
```

### 8.2 Toggle Demo/Live Mode

- **Optimistic update:** `authStore.toggleMode()` immediately flips the mode in the store. The header badge, balance display, and all mode-indicator components re-render instantly.
- **Background action:** All mode-dependent queries are invalidated and refetched for the new mode.
- **Rollback:** If the refetch fails (network error), the mode is NOT rolled back — the user's explicit choice takes precedence. A warning toast is shown: "Some data could not be loaded for [mode] mode."
- **No API call:** The mode toggle itself does not make an API call. It only changes a query parameter and invalidates caches. The mode preference is persisted to localStorage and sent as a header on subsequent API requests.

### 8.3 Mark Notification as Read

- **Optimistic update:** The notification in `notification.list(params)` cache is immediately set to `read: true`. The `notification.unreadCount()` cache is decremented by 1. The notification's visual style changes from bold/unread to normal/read instantly.
- **Background action:** `PATCH /api/notifications/:notificationId/read` is called.
- **Rollback:** If the API call fails, the notification is reverted to `read: false` and the unread count is re-incremented. No error toast is shown (read status is not critical and a toast would be more annoying than helpful).
- **Batch variant:** `markAllNotificationsAsRead()` optimistically sets all cached notifications to `read: true` and sets unread count to 0. Rollback reverts all changes.

### 8.4 Update Profile

- **Optimistic update:** `auth.currentUser()` cache is immediately updated with the new profile data (name, avatar URL, etc.). The header and profile page re-render instantly.
- **Background action:** `PATCH /api/users/me` is called with the changed fields.
- **Rollback:** If the API call fails (422 validation error, 500 server error), the `auth.currentUser()` cache is rolled back to the previous snapshot. An error toast is shown with the server's error message. The form's `setError()` is called with any field-level errors.
- **Conflict resolution:** If another client or admin modified the user's profile concurrently, the server returns a 409 Conflict. The client handles this by fetching the latest profile data and showing a toast: "Your profile was updated elsewhere. Please review the changes."

---

## 9. Loading & Error States

### 9.1 Skeleton Loading Patterns

Every data-dependent component has a corresponding skeleton component. Skeletons are implemented using Tailwind CSS `animate-pulse` utility with gray background rectangles that match the approximate size and layout of the real content.

| Component Type | Skeleton Pattern | Library |
|---|---|---|
| Dashboard stats cards | 4 rectangular cards with pulse animation | Custom `<SkeletonCard>` |
| Balance display | Rounded rectangle matching balance text width | Custom `<SkeletonText>` |
| Transaction table | 5 rows of alternating gray bars | Custom `<SkeletonTable>` |
| Notification list | 5 notification-shaped cards with circle + lines | Custom `<SkeletonNotification>` |
| Investment cards | 3 cards with image placeholder + text bars | Custom `<SkeletonCard>` |
| Referral tree | Circular nodes with connecting lines | Custom `<SkeletonTree>` |
| Admin user table | 10 rows of table cells | Custom `<SkeletonTable>` |
| Profile page | Avatar circle + text fields | Custom `<SkeletonProfile>` |

**Loading state logic:**

- **Initial load:** Show skeleton. This occurs when `isLoading` is true (no cached data exists).
- **Background refetch:** Show existing data with a subtle header-level indicator (a thin progress bar at the top of the content area). This occurs when `isFetching && !isLoading` (cached data exists but is being refreshed).
- **Page transition:** Use Next.js `<Suspense>` with skeleton fallback for route-level loading states. This provides instant skeleton display during RSC streaming.

### 9.2 Error Boundary Placement

Error boundaries are placed at the following levels:

1. **Root layout:** Catches any unhandled rendering errors. Displays a full-page error message with a "Reload" button that calls `window.location.reload()`. Logs the error to the error reporting service (Sentry).
2. **Dashboard layout:** Catches errors within the dashboard shell. Displays the error in the main content area while keeping the sidebar and header intact. The user can navigate to other dashboard pages without losing the sidebar.
3. **Individual feature sections:** Each major section (wallet, investments, referrals, etc.) has its own error boundary. A failure in the investment section does not affect the wallet section. Displays a section-level error card with a "Retry" button that re-mounts the section.
4. **Modal content:** If a modal's content throws during rendering, the modal shows an error message with a "Close" button instead of crashing the entire page.

**Error boundary implementation:**

Using React's `ErrorBoundary` class component (wrapped in a `withErrorBoundary` HOC for functional component usage):

```typescript
<ErrorBoundary
  fallback={<SectionErrorFallback onRetry={() => resetErrorBoundary()} />}
  onError={(error, errorInfo) => {
    errorReportingService.captureException(error, { extra: errorInfo });
  }}
>
  <InvestmentSection />
</ErrorBoundary>
```

### 9.3 Global Error Handling

**TanStack Query global error callback:**

The `QueryClient` is configured with a global `queryCache.onError` callback:

```typescript
queryCache: {
  onError: (error, query) => {
    // Only show toast for queries that are currently mounted (user is looking at them)
    if (query.state.data !== undefined) {
      // Data was previously loaded, now it failed on refetch — show subtle toast
      uiStore.addToast({
        type: 'warning',
        title: 'Data may be outdated',
        message: 'Could not refresh. Retrying...',
        duration: 5000,
      });
    }
    // Don't show toast for queries that have never loaded (initial load failure)
    // — the component's own error state handles that
  },
},
```

**Mutation error handling:**

Each mutation's `onError` callback is responsible for displaying an appropriate error toast. The toast message is derived from the API error response:
- `400 Bad Request`: "Invalid request. Please check your input."
- `401 Unauthorized`: Triggers logout (handled by the auth error interceptor, not the mutation's `onError`).
- `403 Forbidden`: "You do not have permission to perform this action."
- `404 Not Found`: "The requested resource was not found."
- `409 Conflict`: "This action conflicts with the current state. Please refresh and try again."
- `422 Unprocessable Entity`: Field-level errors are set on the form (if applicable). A generic toast is shown: "Please fix the errors in the form."
- `429 Too Many Requests`: "Too many requests. Please wait a moment and try again."
- `500+ Server Error`: "Something went wrong. Please try again later."

**Network error toast:**

When `navigator.onLine` is false, or when a request fails with a `TypeError` (network error), a persistent toast is shown: "You are offline. Some features may be unavailable." This toast disappears automatically when connectivity is restored (detected via `window.addEventListener('online', ...)`).

### 9.4 Retry Strategies

**Automatic retry (TanStack Query built-in):**

- Default retry count: 2 (after the initial failure, for a total of 3 attempts).
- Exponential backoff: 1s, 2s, 4s (capped at 10s).
- Retries are skipped for the following status codes (the error is surfaced immediately):
  - `400` (bad request — retrying won't help)
  - `401` (unauthorized — triggers refresh flow, not retry)
  - `403` (forbidden — retrying won't help)
  - `404` (not found — retrying won't help)
  - `422` (validation error — retrying won't help)

**Custom retry logic:**

```typescript
retry: (failureCount, error) => {
  const status = (error as ApiError)?.statusCode;
  if (status && [400, 401, 403, 404, 422].includes(status)) {
    return false; // Don't retry client errors
  }
  return failureCount < 3; // Retry server errors up to 3 times
},
```

**Manual retry:**

- Each error state component includes a "Retry" button that calls `queryClient.refetchQueries({ queryKey: specificKey })`.
- The root error boundary's "Reload" button calls `window.location.reload()` as a last resort.
- TanStack Query Devtools allow developers to manually invalidate or refetch any query during development.

---

## 10. State Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER ACTION                                     │
│                    (click, form submit, toggle, navigate)                    │
└──────────┬──────────────────────────┬──────────────────────────┬─────────────┘
           │                          │                          │
           ▼                          ▼                          ▼
┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────────┐
│   CLIENT STATE       │  │   SERVER MUTATION    │  │   URL STATE          │
│   (Zustand Stores)   │  │   (TanStack Query    │  │   (searchParams)     │
│                      │  │    useMutation)      │  │                      │
│  • authStore         │  │                      │  │  • page, limit       │
│    - token           │  │  • login()           │  │  • filters           │
│    - mode            │  │  • createInvestment()│  │  • tab, sort         │
│    - isAuthenticated │  │  • initiateDeposit() │  │  • search query      │
│                      │  │  • requestWithdrawal│  │                      │
│  • uiStore           │  │  • submitKyc()      │  │  Synced via:         │
│    - sidebarOpen     │  │  • approveKyc()     │  │  useSearchParams()   │
│    - activeModal     │  │  • markAsRead()     │  │  router.push/replace │
│    - toasts[]        │  │  • toggleMode()     │  │                      │
│                      │  │                      │  │                      │
│  • notificationStore │  │  Optimistic Update:  │  │                      │
│    - unreadCount     │  │  1. Cancel refetch   │  │                      │
│    - sseStatus       │  │  2. Snapshot cache   │  │                      │
│                      │  │  3. Update cache     │  │                      │
│  Persisted:          │  │  4. Call API         │  │                      │
│  • token → localStorage│ 5. On err: rollback  │  │                      │
│  • mode  → localStorage│ 6. Invalidate queries│  │                      │
└──────────┬───────────┘  └──────────┬───────────┘  └──────────┬───────────┘
           │                         │                         │
           │                         ▼                         │
           │              ┌──────────────────────┐             │
           │              │  REST API ENDPOINT    │             │
           │              │  (Bearer JWT +        │             │
           │              │   X-Mode header)      │             │
           │              └──────────┬───────────┘             │
           │                         │                         │
           │                         ▼                         │
           │              ┌──────────────────────┐             │
           │              │     BACKEND          │             │
           │              │  (Node.js / Express   │             │
           │              │   or Next.js API      │             │
           │              │   Route Handlers)     │             │
           │              └──────────┬───────────┘             │
           │                         │                         │
           │                         ▼                         │
           │              ┌──────────────────────┐             │
           │              │     DATABASE          │             │
           │              │  (PostgreSQL)         │             │
           │              └──────────┬───────────┘             │
           │                         │                         │
           │    ┌────────────────────┘                         │
           │    │                                              │
           ▼    ▼                                              │
┌─────────────────────────────────────────────────────────────────────────────┐
│                        SERVER-SIDE EVENTS (SSE)                              │
│                                                                             │
│  Backend emits events:                                                       │
│    notification.new, wallet.balance_updated, deposit.confirmed,             │
│    investment.return_credited, kyc.status_changed, admin.*                  │
│                                                                             │
│  ┌────────────────┐    ┌────────────────────┐    ┌────────────────────┐     │
│  │  SSE Client    │───▶│  Event Handler     │───▶│  TanStack Query    │     │
│  │  (EventSource) │    │  (notificationStore│    │  Cache Invalidation│     │
│  │                │    │   .addNotification,│    │                    │     │
│  │  Reconnect:    │    │   .incrementUnread)│    │  queryClient       │     │
│  │  auto backoff  │    │                    │    │  .invalidateQueries│     │
│  │  Last-Event-ID │    │                    │    │  ({ queryKey })    │     │
│  └────────────────┘    └────────────────────┘    └─────────┬──────────┘     │
│                                                           │                 │
│                                                           ▼                 │
│                                                ┌────────────────────┐      │
│                                                │  COMPONENT         │      │
│                                                │  RE-RENDER         │      │
│                                                │  (fresh data from  │      │
│                                                │   refetched query) │      │
│                                                └────────────────────┘      │
└─────────────────────────────────────────────────────────────────────────────┘

DATA FLOW SUMMARY:

┌─────────────┐     ┌──────────────┐     ┌─────────┐     ┌──────────┐     ┌──────────┐
│ User Action │────▶│  Component   │────▶│ Zustand │────▶│ UI Update│     │          │
│             │     │              │     │  Store  │     │ (instant)│     │          │
└─────────────┘     └──────┬───────┘     └─────────┘     └──────────┘     │          │
                           │                                               │          │
                           │ (for server data)                             │          │
                           ▼                                               │          │
                    ┌──────────────┐     ┌─────────┐     ┌──────────┐     │          │
                    │ TanStack     │────▶│ REST    │────▶│ Backend  │────▶│ Database │
                    │ Query        │     │ API     │     │          │     │          │
                    │ (useMutation)│     │ Call    │     │          │     │          │
                    └──────┬───────┘     └─────────┘     └──────────┘     └──────────┘
                           │
                           │ (on success)
                           ▼
                    ┌──────────────┐
                    │ Cache        │────▶ Component Re-render (fresh data)
                    │ Invalidation │
                    └──────────────┘
```

---

## 11. Performance Considerations

### 11.1 Query Deduplication

TanStack Query automatically deduplicates concurrent requests for the same query key. If two components mount simultaneously and both call `useQuery({ queryKey: ['wallet', 'balance', 'live'] })`, only a single network request is made. Both components receive the same cached data when the request resolves.

This is particularly important in TeslaPrimeCapital because:

- The wallet balance is displayed in the header (always mounted) and on the dashboard page. Deduplication prevents double-fetching.
- The user's KYC status is checked by the deposit flow, withdrawal flow, and investment flow. All three use the same `kyc.status()` query key and share a single cache entry.
- The notification unread count is displayed in the header badge and on the notifications page.

### 11.2 Window Focus Refetching Strategy

`refetchOnWindowFocus: true` is the global default, but is selectively disabled for specific queries where refetching on focus would be wasteful or disruptive:

- **Disabled:** `investment.plans()`, `deposit.paymentMethods()`, `withdrawal.bankAccounts()` — these are reference data that rarely changes and is already cached for 5 minutes.
- **Disabled:** `notification.list(params)` during active scrolling — if the user is scrolling through notifications and switches tabs, refetching on focus would cause a scroll position reset. The `refetchOnWindowFocus` is set to `false` dynamically via the query's options when the user is actively scrolling (detected via a scroll event listener with a debounce).
- **Enabled (default):** All other queries, especially `wallet.balance()`, `investment.active()`, and `notification.unreadCount()`.

### 11.3 Selective Refetching on Reconnect

When the browser reconnects after a network interruption, TanStack Query refetches all `mounted` queries (queries currently used by at least one rendered component). This is the correct default behavior because:

- If the user is on the dashboard, all dashboard queries (balance, investments, recent transactions, notifications) are refetched.
- If the user is on the admin panel, only admin queries are refetched.
- Queries for pages the user has navigated away from are NOT refetched (they are not mounted), saving bandwidth.

### 11.4 Memory Management for Large Lists

Transaction history, notification history, and referral downline lists can grow to thousands of entries. To prevent excessive memory usage:

1. **Virtual scrolling:** Only visible items (plus an overscan buffer of 5 items above and below) are rendered as DOM nodes. The rest exist only as JavaScript objects in the TanStack Query cache. This limits DOM node count to approximately 30-50 regardless of total list size.

2. **Page garbage collection:** The `gcTime` for paginated queries is set to 2 minutes. If the user navigates away from a large list, the cached pages are garbage collected after 2 minutes, freeing memory. If the user returns, the first page is refetched (not all pages).

3. **Cache size cap:** A custom `afterFetch` middleware monitors total cache size (estimated by counting the number of cached items across all queries). If the total exceeds 1,000 items, the oldest pages (lowest cursor value) of the least-recently-used infinite query are evicted. This is a safeguard against memory bloat in long-running sessions.

4. **Flat page management:** `useInfiniteQuery` stores pages as an array of arrays. The `flatPages` computed property (via `useMemo`) flattens this into a single array for the virtual scroll component. This avoids repeated flattening on every render.

### 11.5 Structural Sharing

TanStack Query v5 uses structural sharing by default. When a query refetch returns new data, TanStack Query performs a shallow comparison between the old and new data. If a nested object or array hasn't changed, the reference is preserved. This prevents unnecessary re-renders in components that subscribe to unchanged portions of the data.

For TeslaPrimeCapital, structural sharing is critical for:

- **Wallet balance:** The balance value changes frequently, but the currency and account metadata do not. Structural sharing ensures that components displaying only the currency (e.g., a footer) do not re-render on every balance change.
- **Transaction list:** When a new transaction is prepended to the list, existing transaction objects are reference-equal. Only the new transaction and the container array trigger re-renders.
- **Notification list:** Same pattern as transactions.

### 11.6 Request Batching and Waterfall Prevention

When a page has multiple queries, they are fetched in parallel using `Promise.all` in the Server Component. On the client, TanStack Query naturally parallelizes independent queries. However, dependent queries (e.g., "fetch user, then fetch user's wallet") use the `enabled` option to create a waterfall:

```typescript
// Dependent query: only runs when userId is available
const { data: user } = useQuery({ queryKey: ['auth', 'current-user'], ... });
const { data: balance } = useQuery({
  queryKey: queryKeys.wallet.balance(mode),
  queryFn: fetchWalletBalance,
  enabled: !!user, // Only runs after user is loaded
});
```

Waterfalls are minimized by design. Most data does not depend on other data — the user's ID is available from the session (cookie), so wallet, investments, and notifications can all be fetched in parallel without waiting for the user query.

### 11.7 Bundle Size Impact

The state management layer adds the following to the client bundle (gzipped):

| Dependency | Size | Purpose |
|---|---|---|
| `@tanstack/react-query` | ~13 KB | Server state management |
| `zustand` | ~1.1 KB | Client state management |
| `immer` | ~6 KB | Immutable state updates in Zustand |
| `@hookform/resolvers` | ~2 KB | Zod-RHF integration |
| `zod` | ~8 KB | Runtime validation (shared with API client) |
| `@tanstack/react-virtual` | ~4 KB | Virtual scrolling for large lists |
| **Total** | **~34 KB** | |

This is well within acceptable limits for a financial platform. The alternative (no state management library, manual `useEffect` + `useState`) would result in more code (more bytes) and more bugs.

---

## Appendix A: File Structure

```
src/
├── lib/
│   ├── query-keys.ts          # Query key factory
│   ├── query-client.ts        # QueryClient singleton
│   ├── sse-client.ts          # SSE connection manager
│   ├── api-client.ts          # Axios/fetch wrapper with auth interceptor
│   └── with-auth-refresh.ts   # HOC for retry-after-refresh
├── stores/
│   ├── auth-store.ts          # Auth Zustand store
│   ├── ui-store.ts            # UI Zustand store
│   └── notification-store.ts  # Notification Zustand store
├── schemas/
│   ├── auth.schema.ts         # Login, register, profile Zod schemas
│   ├── kyc.schema.ts          # KYC submission Zod schemas
│   ├── deposit.schema.ts      # Deposit form Zod schemas
│   ├── withdrawal.schema.ts   # Withdrawal form Zod schemas
│   └── investment.schema.ts   # Investment form Zod schemas
├── hooks/
│   ├── use-auth-query.ts      # Auth query hooks
│   ├── use-wallet-query.ts    # Wallet query hooks
│   ├── use-investment-query.ts
│   ├── use-deposit-query.ts
│   ├── use-withdrawal-query.ts
│   ├── use-referral-query.ts
│   ├── use-kyc-query.ts
│   ├── use-notification-query.ts
│   ├── use-admin-query.ts
│   ├── use-prefetch-on-hover.ts
│   └── use-token-refresh.ts
├── providers/
│   ├── query-provider.tsx      # QueryClientProvider + HydrationBoundary
│   └── sse-provider.tsx        # SSE connection lifecycle
└── components/
    ├── common/
    │   ├── skeleton-card.tsx
    │   ├── skeleton-table.tsx
    │   ├── skeleton-text.tsx
    │   ├── skeleton-notification.tsx
    │   ├── skeleton-tree.tsx
    │   └── skeleton-profile.tsx
    ├── error-boundary.tsx
    └── virtual-list.tsx
```

---

## Appendix B: Decision Log

| Decision | Rationale | Alternatives Considered |
|---|---|---|
| TanStack Query over SWR | More mature mutation lifecycle (optimistic updates, rollback), better devtools, built-in infinite query | SWR (lighter but less feature-rich), Apollo Client (overkill, GraphQL not used) |
| Zustand over Redux Toolkit | Less boilerplate, no provider needed, smaller bundle, sufficient for our client state complexity | Redux Toolkit (heavier, provider required), Jotai (atomic model doesn't fit our domain), Context API (no devtools, no persistence) |
| SSE over WebSockets | Unidirectional is sufficient, simpler protocol, better proxy compatibility, auto-reconnect built-in | WebSockets (bidirectional but unnecessary), Polling (higher latency, more server load) |
| Cursor-based pagination over offset | Better performance for large datasets (no COUNT query), consistent results when new items are added during pagination | Offset pagination (simpler but inconsistent with real-time inserts), Keyset pagination (similar to cursor) |
| Virtual scrolling over pagination-only | Better UX for financial transaction history (users expect to see all history) | Traditional page-by-page pagination only (simpler but worse UX for power users) |

---

*End of State Management Architecture Document — Phase 2*