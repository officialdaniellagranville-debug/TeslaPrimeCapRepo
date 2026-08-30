# TeslaPrimeCapital — Caching Strategy

> **Version:** 1.0  
> **Last Updated:** 2025-07-10  
> **Status:** Approved  
> **Audience:** Backend Engineers, Frontend Engineers, DevOps, SRE

---

## Table of Contents

1. [Caching Philosophy](#1-caching-philosophy)
2. [Cache Tiers](#2-cache-tiers)
3. [Redis Cache Patterns](#3-redis-cache-patterns)
4. [Cache Entries Specification](#4-cache-entries-specification)
5. [Cache Invalidation Strategies](#5-cache-invalidation-strategies)
6. [TanStack Query Cache Configuration](#6-tanstack-query-cache-configuration)
7. [Financial Data Caching](#7-financial-data-caching)
8. [Cache Warming](#8-cache-warming)
9. [Cache Monitoring](#9-cache-monitoring)
10. [Failure Handling](#10-failure-handling)

---

## 1. Caching Philosophy

TeslaPrimeCapital operates as a managed investment platform where correctness of financial data is non-negotiable. Our caching philosophy is built on a single foundational principle: **cache-aside is the default pattern, and PostgreSQL is always the source of truth**. Every piece of data served from a cache must be traceable to an authoritative database record, and no financial operation may ever rely on cached data as its sole input.

We categorize all platform data into two broad groups. **Cache-eligible data** is read-heavy, changes infrequently, and tolerates brief staleness — this includes investment plan definitions, platform configuration settings, supported currency lists, fee schedules, and static reference data. For these data types, serving from cache delivers significant performance gains and reduces database load without compromising correctness. **Non-cacheable data** is write-heavy, changes frequently, or requires absolute real-time accuracy — this includes wallet balances during active transactions, live order books, active trade positions, and any data consumed by financial reconciliation processes. These data types must always be queried directly from PostgreSQL.

The cache layer (Redis) exists as a performance optimization, never as a replacement for the database. If a cache entry is stale, the worst-case outcome is a slight performance degradation while the system fetches fresh data from PostgreSQL. If a cache entry is missing, the system seamlessly falls back to the database. This design ensures that **Redis failure never results in data loss, incorrect financial calculations, or platform downtime**.

Graceful degradation is a core tenet of this philosophy. The system must continue to function — albeit with higher latency — when Redis is unavailable. Every cache read operation is wrapped in error handling that catches Redis connection failures and delegates to the database. Every cache write operation is treated as best-effort; if the cache population fails after a database write, the system logs a warning but does not roll back the database transaction. This asymmetric approach means the database is always consistent, and the cache eventually converges to the correct state through natural invalidation and re-population cycles.

We explicitly reject write-back caching (where the cache is the primary write target) for all financial data. The risk of cache corruption leading to incorrect balances or lost transactions is unacceptable in a regulated financial environment. All writes go to PostgreSQL first, and the cache is updated afterward — either synchronously (write-through) or asynchronously (write-behind) depending on the criticality of the data.

---

## 2. Cache Tiers

TeslaPrimeCapital employs a three-tier caching architecture that progressively reduces latency as data moves closer to the client. Each tier serves a distinct purpose and operates with different consistency guarantees, TTL policies, and invalidation mechanisms. The tiers are designed to be complementary: a cache miss at one tier falls through to the next, creating a seamless chain from client to database.

### Tier 1 (L1) — TanStack Query (Client-Side In-Memory)

The first tier resides in the user's browser, managed by TanStack Query. This cache stores serialized API responses in memory and serves subsequent requests for the same data without making network calls. The default stale time is set to 5 minutes, meaning data is considered fresh for that duration. After the stale time expires, TanStack Query will still serve the cached data but trigger a background refetch to update it (stale-while-revalidate behavior). The garbage collection time is set to 30 minutes, meaning unused cache entries are purged from memory after 30 seconds of no active subscription. This tier is per-user, per-tab, and is not shared across users or devices. It provides the lowest possible latency (sub-millisecond) for repeated data access within a single user session.

### Tier 2 (L2) — Redis (Distributed Server-Side Cache)

The second tier is a Redis instance shared across all application server instances. This is the primary server-side cache and serves as the shared truth layer between all API servers. When an API handler receives a request, it checks Redis before querying PostgreSQL. Redis provides sub-millisecond read latency and supports atomic operations, data structure manipulation, and pattern-based key scanning for bulk invalidation. All cache entries in Redis are stored with explicit TTLs and follow a consistent key naming convention. Redis also serves as the coordination layer for cache invalidation events broadcast across multiple server instances via Pub/Sub channels.

### Tier 3 (L3) — PostgreSQL (Source of Truth)

The third and final tier is the PostgreSQL database, managed through Prisma ORM. This is the authoritative data store for all platform data. No financial calculation, balance check, or transaction processing ever skips this tier. PostgreSQL is only queried when both L1 and L2 caches miss, or when the operation explicitly requires fresh data (e.g., pre-transaction balance verification). Write operations always target PostgreSQL directly; cache updates are side effects of successful database writes.

### Data Flow

The complete request flow follows this path:

1. **Client** initiates a data request (e.g., fetching investment plans).
2. **TanStack Query (L1)** checks its in-memory cache. If fresh data exists, return immediately — no network call.
3. If L1 is stale or empty, the request proceeds to the **API layer**.
4. The API handler checks **Redis (L2)**. If a valid cache entry exists, return the cached data and update L1.
5. If L2 misses, the handler queries **PostgreSQL (L3)** via Prisma.
6. The database response is written back to Redis (L2) with the appropriate TTL.
7. The response is returned to the client, which stores it in TanStack Query (L1).

This three-tier approach ensures that the vast majority of read requests never reach the database, while guaranteeing that every piece of data can be traced back to an authoritative source.

---

## 3. Redis Cache Patterns

TeslaPrimeCapital does not use a single caching pattern for all data. Different data types have different consistency requirements, access patterns, and write frequencies. We employ three distinct Redis caching patterns, each selected based on the specific characteristics of the data it serves. Understanding when and why each pattern is used is critical for maintaining both performance and data integrity across the platform.

### Cache-Aside (Lazy Loading)

**When it's used:** This is the default pattern for the majority of cached data, including investment plans, platform settings, user profiles, feature flags, supported currencies, fee configurations, and KYC status records. Any data that is read frequently but written infrequently is a candidate for cache-aside.

**How it works:** When the application needs to read data, it first checks Redis using the appropriate cache key. If the key exists and has not expired, the cached value is returned immediately. If the key does not exist (cache miss), the application queries PostgreSQL for the authoritative data, then writes the result into Redis with a configured TTL before returning it to the caller. No cache entry is ever created proactively — it only exists after the first read that triggers a miss.

**Why this pattern:** Cache-aside is the safest caching pattern because the cache contains no data that the database does not also contain. There is no risk of the cache and database diverging, because the database is always the writer and the cache is always a derived copy. This pattern also naturally handles cache eviction gracefully — when Redis evicts an entry due to memory pressure or TTL expiration, the next read simply repopulates it from the database. The trade-off is a higher latency on the first request (cold cache), but this is mitigated by cache warming (see Section 8) for critical data.

### Write-Through

**When it's used:** This pattern is reserved for data where read-after-write consistency is critical — specifically wallet balances and session metadata. When a user's wallet balance changes due to a deposit, withdrawal, or investment, the updated balance must be immediately visible on subsequent reads. Using cache-aside here would create a window where the cache still holds the old balance after a write, which is unacceptable for financial operations.

**How it works:** On a write operation, the application first writes the new value to PostgreSQL (within a database transaction). If the database write succeeds, the application synchronously updates the corresponding Redis cache key with the new value. The cache update happens in the same request lifecycle as the database write, ensuring that any subsequent read — even from a different server instance — will see the updated value. If the Redis write fails, the application logs the error but does not roll back the database transaction (the cache will self-heal on the next read via cache-aside fallback).

**Why this pattern:** Write-through eliminates the stale-read window that exists with cache-aside for write-heavy data. For wallet balances, this means that immediately after a deposit is confirmed, the user will see the updated balance on their next page load or API call. The synchronous cache update adds a small amount of latency to write operations (typically less than 1ms for a Redis SET), but this overhead is negligible compared to the database write latency and is justified by the consistency guarantee.

### Write-Behind (Write-Back with Delay)

**When it's used:** This pattern is used exclusively for non-critical counters and aggregate statistics that do not require strict consistency. Examples include referral click counts, notification read counts, and dashboard view counters. These are "best-effort" metrics where slight inaccuracy (a few seconds of delay) is acceptable, and the primary goal is to reduce write amplification on the database.

**How it works:** When a counter needs to be incremented, the application updates the Redis key atomically using INCR or INCRBY. The database is not updated immediately. A background worker (powered by BullMQ) periodically drains the pending counter updates and writes them to PostgreSQL in batched, aggregated form. For example, instead of writing 1,000 individual referral click records, the worker writes a single record with the net delta. The worker runs on a configurable interval (default: every 60 seconds) and ensures that no data is lost even if the application crashes — Redis persists the pending updates, and the worker will process them on the next cycle.

**Why this pattern:** Write-behind dramatically reduces database load for high-frequency, low-criticality updates. A viral referral campaign that generates thousands of clicks per minute would otherwise create significant write pressure on PostgreSQL. By buffering these writes in Redis and batching them, we reduce database writes by orders of magnitude while maintaining acceptable accuracy. The risk is data loss if Redis fails before the worker drains the buffer, but for referral counts and similar metrics, this is an acceptable trade-off.

---

## 4. Cache Entries Specification

The following table defines every cache entry used across the TeslaPrimeCapital platform. Each entry includes its Redis key format, data type, time-to-live (TTL), the events that trigger invalidation, and the caching pattern employed. All keys use a hierarchical `cache:` prefix with colon-separated namespace segments for clarity and scannability.

| # | Cache Key | Type | TTL | Invalidation Trigger | Pattern |
|---|-----------|------|-----|----------------------|---------|
| 1 | `cache:plans:all` | JSON Array | 5 min | Admin creates, updates, or deletes any investment plan | Cache-Aside |
| 2 | `cache:plans:{planId}` | JSON Object | 5 min | Admin updates or deletes the specific plan | Cache-Aside |
| 3 | `cache:rates:btc-usd` | String (number) | 60 s | Background worker refresh on schedule | Cache-Aside |
| 4 | `cache:rates:eth-usd` | String (number) | 60 s | Background worker refresh on schedule | Cache-Aside |
| 5 | `cache:rates:all` | JSON Object | 60 s | Background worker refresh on schedule | Cache-Aside |
| 6 | `cache:settings:platform` | JSON Object | 10 min | Admin updates any platform setting | Cache-Aside |
| 7 | `cache:settings:fees` | JSON Object | 10 min | Admin updates fee configuration | Cache-Aside |
| 8 | `cache:settings:maintenance` | JSON Object | 30 s | Admin toggles maintenance mode | Cache-Aside |
| 9 | `cache:user:{id}:profile` | JSON Object | 5 min | User updates profile, admin modifies user | Cache-Aside |
| 10 | `cache:user:{id}:kyc` | JSON Object | 10 min | User submits KYC, admin approves/rejects KYC | Cache-Aside |
| 11 | `cache:user:{id}:preferences` | JSON Object | 10 min | User updates notification or display preferences | Cache-Aside |
| 12 | `cache:wallet:{id}:balance` | String (number) | 30 s | Deposit confirmed, withdrawal processed, investment purchased, earnings credited | Write-Through |
| 13 | `cache:wallet:{id}:transactions:{page}` | JSON Array | 2 min | New transaction recorded for this wallet | Cache-Aside |
| 14 | `cache:session:{token}` | JSON Object | 24 h | User logs out, token revoked, security event | Cache-Aside |
| 15 | `cache:session:{token}:metadata` | JSON Object | 1 h | Session activity update, device verification | Cache-Aside |
| 16 | `cache:features:all` | JSON Object | 5 min | Admin toggles any feature flag | Cache-Aside |
| 17 | `cache:features:{flagName}` | String (boolean) | 5 min | Admin toggles the specific feature flag | Cache-Aside |
| 18 | `cache:referral:{userId}:stats` | JSON Object | 5 min | Referral signup, referral earns commission | Cache-Aside |
| 19 | `cache:referral:{userId}:clicks` | String (number) | No TTL | Drained by background worker every 60 s | Write-Behind |
| 20 | `cache:notifications:{userId}:count` | String (number) | 30 s | New notification created, user reads notifications | Cache-Aside |
| 21 | `cache:notifications:{userId}:list:{page}` | JSON Array | 2 min | New notification created, notification marked read | Cache-Aside |
| 22 | `cache:admin:dashboard:stats` | JSON Object | 2 min | Any deposit, withdrawal, user registration, or plan purchase | Cache-Aside |
| 23 | `cache:admin:dashboard:revenue` | JSON Object | 5 min | Daily scheduled recalculation | Cache-Aside |
| 24 | `cache:admin:users:active` | JSON Array | 5 min | User registration, account activation or deactivation | Cache-Aside |
| 25 | `cache:plan:{planId}:performance` | JSON Object | 10 min | Daily scheduled recalculation, admin override | Cache-Aside |
| 26 | `cache:plan:{planId}:investors` | JSON Object | 5 min | New investment, investment matures, withdrawal | Cache-Aside |
| 27 | `cache:currencies:supported` | JSON Array | 30 min | Admin adds or removes supported currency | Cache-Aside |
| 28 | `cache:binary:{userId}:structure` | JSON Object | 5 min | New referral placed in binary tree, tree restructure | Cache-Aside |
| 29 | `cache:binary:{userId}:downline-count` | String (number) | 5 min | New referral placed under user in binary tree | Cache-Aside |
| 30 | `cache:binary:{userId}:volume` | JSON Object | 10 min | Downline investment, investment matures | Cache-Aside |

### Key Naming Conventions

- All cache keys begin with the `cache:` prefix to distinguish them from other Redis keys (sessions, rate limits, job queues).
- Namespace segments are separated by colons and follow a hierarchical structure: `cache:{domain}:{identifier}:{sub-resource}`.
- Parameterized segments use curly braces in documentation (e.g., `{userId}`, `{planId}`) and are replaced with actual values at runtime.
- Paginated resources include the page number in the key (e.g., `{page}`) to allow independent invalidation per page.
- No cache key exceeds 200 characters after parameter substitution.

### TTL Rationale

- **30 seconds:** High-frequency, high-sensitivity data — wallet balances, exchange rates, notification counts. These values change often and must reflect recent changes quickly.
- **2 minutes:** Semi-frequently updated data — transaction lists, admin dashboard stats. Users expect near-real-time visibility but a few seconds of staleness is acceptable.
- **5 minutes:** Moderately stable data — investment plans, user profiles, feature flags, referral stats. These change infrequently and do not require sub-minute freshness.
- **10 minutes:** Rarely changing data — KYC status, plan performance metrics, platform settings. Updates are infrequent and typically initiated by admins or scheduled jobs.
- **30 minutes to 24 hours:** Effectively static data — supported currencies (changed only during maintenance), session metadata (long-lived but independently invalidated on logout).

---

## 5. Cache Invalidation Strategies

Cache invalidation is widely regarded as one of the hardest problems in computer science, and in a financial platform, incorrect invalidation can lead to users seeing stale balances, outdated plans, or incorrect fee calculations. TeslaPrimeCapital employs four complementary invalidation strategies, layered together to ensure that stale data is never served for longer than its TTL allows, and that critical updates propagate immediately regardless of TTL.

### Explicit Invalidation

Explicit invalidation is the primary strategy and is triggered by write operations in the application layer. Whenever a write operation modifies data in PostgreSQL, the corresponding cache keys are deleted from Redis immediately, before the API response is returned to the client. This ensures that the next read for that data will result in a cache miss and a fresh fetch from the database.

**Examples:**

- An admin updates an investment plan's return rate. The API handler deletes `cache:plans:{planId}` and `cache:plans:all` from Redis, ensuring that all users will see the updated plan on their next request.
- A user updates their profile (name, avatar, phone number). The handler deletes `cache:user:{id}:profile`, and the user's next profile fetch returns the updated data.
- A deposit is confirmed by the payment processor. The handler deletes `cache:wallet:{id}:balance` and also invalidates `cache:admin:dashboard:stats` since the deposit affects platform-wide metrics.
- A new notification is created for a user. The handler deletes `cache:notifications:{userId}:count` and `cache:notifications:{userId}:list:{page}` for the first page to ensure the new notification appears immediately.

Explicit invalidation is implemented as a dedicated service (`CacheInvalidationService`) that encapsulates all invalidation logic. Handlers call this service after successful database writes, keeping the invalidation rules centralized and auditable.

### TTL-Based Invalidation

TTL-based invalidation serves as a safety net that ensures no cache entry survives indefinitely, even if explicit invalidation is accidentally omitted. Every cache entry defined in Section 4 has an explicit TTL. When the TTL expires, Redis automatically evicts the entry, and the next read repopulates it from the database.

This strategy is not the primary invalidation mechanism — it is a backstop. If a developer adds a new write operation and forgets to invalidate the corresponding cache key, the TTL ensures that the stale data will eventually be replaced. TTL values are chosen to balance freshness requirements (shorter TTL for frequently changing data) with cache efficiency (longer TTL for stable data to maximize hit rates).

TTL-based invalidation also handles cases where cache invalidation events are lost due to Redis Pub/Sub message drops or application crashes. Even if the explicit invalidation message is never delivered, the TTL will eventually expire the stale entry.

### Event-Driven Invalidation

Event-driven invalidation leverages the domain event system (see `EVENT_SYSTEM.md`) to decouple cache invalidation from the write operations that trigger it. When a domain event is published (e.g., `DepositConfirmed`, `PlanUpdated`, `KYCStatusChanged`), the event is placed on a BullMQ cache invalidation queue. A dedicated worker processes this queue and performs the appropriate cache deletions.

This approach provides several benefits:

1. **Decoupling:** The service that writes data does not need to know which cache keys to invalidate. It simply publishes a domain event, and the cache invalidation worker maps events to cache keys.
2. **Reliability:** BullMQ provides at-least-once delivery guarantees. If the application crashes after publishing the event but before invalidating the cache, the worker will process the event when it restarts.
3. **Cross-instance coordination:** In a multi-server deployment, a write on Server A may need to invalidate cache entries held in the TanStack Query cache on the client, which was last populated by Server B. The event-driven approach ensures all instances are notified.
4. **Batching:** Multiple events for the same cache key can be coalesced by the worker, reducing redundant deletion operations.

Event-driven invalidation is used for all cross-cutting concerns (e.g., admin dashboard stats affected by user actions) and for cases where the invalidation logic is complex (e.g., a single plan update requires invalidating multiple related caches).

### Pattern-Based Invalidation

Pattern-based invalidation is used when a write operation affects a group of related cache keys that share a common key prefix. Instead of deleting each key individually (which requires knowing every possible key), the system uses Redis `SCAN` to find all keys matching a pattern and deletes them in bulk.

**Examples:**

- When a user's account is suspended, all user-specific caches must be invalidated: `cache:user:{id}:*`. This catches the profile, KYC status, preferences, wallet-related caches, and any other keys under the user's namespace.
- When an admin performs a bulk update to all investment plans, `cache:plans:*` is scanned and all matching keys are deleted.
- When a user logs out, `cache:session:{token}:*` clears both the session data and its associated metadata.

**Implementation notes:**

- Pattern-based invalidation uses `SCAN` with a `MATCH` filter and `COUNT` hint, never `KEYS`. The `KEYS` command blocks the Redis server for the duration of the scan, which is unacceptable in production.
- Bulk deletions are executed in batches of 100 keys to avoid blocking the Redis event loop.
- Pattern-based invalidation is logged at `INFO` level, including the pattern used and the number of keys deleted, for auditability.

---

## 6. TanStack Query Cache Configuration

TanStack Query is the client-side caching layer and the first line of defense against unnecessary network requests. Its configuration is tuned to balance data freshness with network efficiency, with per-query overrides that reflect the specific freshness requirements of each data type. The configuration is centralized in a custom QueryClient instance created in the application's provider layer.

### Global Defaults

The default configuration applies to all queries that do not specify per-query overrides:

- **`staleTime: 5 minutes (300,000 ms)`** — Data is considered fresh for 5 minutes after it is fetched. During this window, TanStack Query will serve the cached data without making any network request, even if the component re-renders or the user navigates away and back.
- **`gcTime: 30 minutes (1,800,000 ms)`** — After a query becomes inactive (no components are subscribed to it), the cached data is kept in memory for 30 minutes. If the component re-mounts within this window, the cached data is served immediately (even if stale) and a background refetch is triggered. After 30 minutes of inactivity, the data is garbage collected and the next mount results in a full loading state.
- **`refetchOnWindowFocus: true`** — When the user switches browser tabs and returns, TanStack Query triggers a background refetch for all stale queries. This ensures that data is refreshed when the user's attention returns to the platform.
- **`refetchOnReconnect: true`** — When the browser regains network connectivity after an outage, all stale queries are refetched.
- **`retry: 2`** — Failed requests are retried up to 2 times with exponential backoff before surfacing the error to the user.
- **`networkMode: 'online'`** — Queries are only executed when the browser has network connectivity. Offline requests are queued and executed when connectivity is restored.

### Per-Query Overrides

Different data types require different freshness guarantees. The following overrides are applied to specific query keys:

| Query Key | staleTime | gcTime | refetchOnWindowFocus | Notes |
|-----------|-----------|--------|---------------------|-------|
| `['wallet', walletId, 'balance']` | 30 s | 5 min | `true` | Balance changes frequently; always refresh when user returns to tab |
| `['plans', 'all']` | 10 min | 30 min | `false` | Plans rarely change; no need to refetch on focus |
| `['plans', planId]` | 10 min | 30 min | `false` | Individual plan details are stable |
| `['transactions', walletId, page]` | 2 min | 10 min | `true` | Transaction history updates with new deposits/withdrawals |
| `['notifications', userId, 'count']` | 30 s | 5 min | `true` | Notification badge must update frequently |
| `['notifications', userId, 'list', page]` | 2 min | 10 min | `true` | Notification list should reflect recent additions |
| `['user', userId, 'profile']` | 5 min | 30 min | `true` | Profile changes are user-initiated |
| `['settings', 'platform']` | 10 min | 30 min | `false` | Platform settings rarely change |
| `['features', 'all']` | 5 min | 30 min | `true` | Feature flags may change during active session |
| `['rates', 'all']` | 60 s | 5 min | `true` | Exchange rates update every minute |
| `['admin', 'dashboard', 'stats']` | 2 min | 10 min | `true` | Admin dashboard must reflect recent activity |
| `['referral', userId, 'stats']` | 5 min | 30 min | `true` | Referral stats update when downline joins |

### Prefetching Strategy

Prefetching reduces perceived latency by fetching data before the user explicitly requests it. TeslaPrimeCapital uses two prefetching approaches:

1. **On link hover:** When the user hovers over a navigation link for more than 200ms, TanStack Query's `queryClient.prefetchQuery()` is called with the target page's data requirements. This ensures that by the time the user clicks the link, the data is already cached and the page renders instantly. This is used for the investment plans page, transaction history, and referral dashboard.

2. **On route change:** During the Next.js route transition, the destination page's data dependencies are prefetched in parallel. This is implemented in the page component's loader or via React Server Components that trigger client-side hydration with pre-fetched data. Critical data (wallet balance, user profile) is always prefetched on route change.

### Optimistic Updates

TanStack Query's `onMutate` callback is used to implement optimistic updates for specific operations where the UI response must be immediate:

- **Mark notification as read:** When the user clicks a notification, the UI immediately removes the unread indicator and decrements the notification count badge. The cache is updated optimistically, and if the API call fails, the change is rolled back.
- **Toggle demo/live mode:** When the user switches between demo and live trading modes, the UI immediately reflects the new mode. The cache is updated optimistically, and the wallet balance query is invalidated to fetch the correct balance for the selected mode.

All optimistic updates include an `onError` rollback handler and an `onSettled` handler that invalidates the related queries to ensure eventual consistency.

---

## 7. Financial Data Caching

Financial data demands a stricter caching regime than any other data type on the platform. Incorrect balances, missed transactions, or stale rates can directly result in monetary loss, regulatory violations, or user trust erosion. This section defines the special rules that govern how financial data interacts with the caching system. These rules override the general caching policies defined elsewhere in this document wherever there is a conflict.

### Wallet Balance Caching

Wallet balances are cached in Redis with a maximum TTL of 30 seconds using the write-through pattern. However, cached balances are **never used as the sole source of truth for any financial operation**. Before processing a withdrawal, investment purchase, or internal transfer, the system performs a direct PostgreSQL query to retrieve the current wallet balance within the same database transaction that will execute the financial operation. The cached balance is used only for display purposes (showing the user their balance in the UI) and is always labeled as "approximate" in the application's data model.

After a financial operation completes successfully, the wallet balance cache is synchronously updated via the write-through pattern. This means the user will see their updated balance on the very next page load, but the system never trusts the cache for the actual debit or credit calculation.

### Investment Data During Active Operations

Investment data — including plan details, expected returns, and maturity dates — is **never cached during active operations**. When a user is in the process of purchasing an investment plan, the system fetches plan details directly from PostgreSQL and holds a database-level lock (via `SELECT ... FOR UPDATE`) for the duration of the transaction. This prevents race conditions where a plan's terms change between the time the user views the plan and the time they confirm the purchase.

Once the investment is confirmed and the transaction is committed, the investment record is written to the database and the cache is populated or updated. During the active purchase flow, however, no cache is consulted and no cache entry is created.

### Transaction Record Caching

Transaction records (deposits, withdrawals, investments, earnings) follow a dual-caching policy. Paginated transaction lists displayed to the user are cached using the cache-aside pattern with a 2-minute TTL, which provides a responsive browsing experience when the user pages through their transaction history.

However, transaction records used for **financial reconciliation** are never served from cache. The reconciliation process, which runs on a scheduled basis, always queries PostgreSQL directly for the complete, unfiltered set of transactions within the reconciliation window. This ensures that reconciliation is performed against the authoritative data set, not a potentially stale or incomplete cache.

### Balance Calculation Rules

All balance calculations — including available balance, pending balance, total invested, total earnings, and net worth — are always performed against PostgreSQL source-of-truth data. These calculations may involve summing across multiple transaction records, applying fee schedules, and considering pending (unconfirmed) transactions. The complexity and financial sensitivity of these calculations means they cannot be safely cached.

The results of balance calculations may be cached for display purposes (with a 30-second TTL for individual wallet balances and a 2-minute TTL for aggregate dashboard figures), but the cache key explicitly includes a `:display` suffix (e.g., `cache:wallet:{id}:balance:display`) to distinguish display-only cached values from the authoritative values used in financial operations.

### Exchange Rate Caching

Exchange rates are cached for 60 seconds and are refreshed by a background worker that polls external rate providers. When a financial operation requires an exchange rate conversion (e.g., converting a USD deposit to BTC for investment), the system uses the cached rate for display purposes but re-fetches the rate from the external provider at the moment of execution. The difference between the displayed rate and the executed rate is logged, and if the variance exceeds a configurable threshold (default: 0.1%), the operation is flagged for review.

---

## 8. Cache Warming

Cache warming is the process of proactively populating cache entries before they are requested by users. This eliminates the "cold cache" problem where the first user to request a piece of data experiences elevated latency while the system fetches it from the database and populates the cache. TeslaPrimeCapital implements cache warming at three distinct lifecycle points: application startup, scheduled intervals, and deployment events.

### Application Startup Warming

When the application server starts (or restarts), a startup cache warming routine executes before the server begins accepting requests. This routine populates the following cache entries:

1. **Investment plans** (`cache:plans:all` and individual `cache:plans:{planId}`): These are the most frequently accessed read-only data on the platform. Every user who visits the investment page triggers a plan fetch. Warming these entries at startup ensures that the first user after a restart sees instant response times.
2. **Platform settings** (`cache:settings:platform`, `cache:settings:fees`, `cache:settings:maintenance`): Platform settings are used in virtually every API response (fee calculations, feature gating, maintenance mode checks). Warming these at startup prevents a thundering herd of database queries when multiple users load the platform simultaneously after a restart.
3. **Supported currencies** (`cache:currencies:supported`): The currency list is used in deposit forms, withdrawal forms, and display formatting across the platform. It changes extremely rarely and benefits from being pre-loaded.
4. **Feature flags** (`cache:features:all`): Feature flags are checked on nearly every page render. Pre-warming ensures that flag checks do not require database queries during the initial traffic surge after a restart.

The startup warming routine executes these queries in parallel using `Promise.allSettled()`. If any individual warm-up query fails, the startup continues — the cache will be populated lazily via cache-aside on the first request. Startup warming failures are logged at `WARN` level and reported to the monitoring system.

### Scheduled Warming

Some cache entries require periodic refresh to remain current, independent of user activity. These are warmed by background workers on a scheduled basis:

1. **Exchange rates** (`cache:rates:*`): A dedicated BullMQ worker refreshes exchange rates every 60 seconds by polling external rate providers (CoinGecko, Binance API, or a composite aggregator). The worker fetches all tracked currency pairs, updates Redis, and publishes a `RatesUpdated` domain event. This ensures that rate caches never expire and always contain data that is at most 60 seconds old.
2. **Admin dashboard stats** (`cache:admin:dashboard:stats`): A scheduled worker recalculates dashboard statistics every 2 minutes by running aggregation queries against PostgreSQL. This keeps the admin dashboard responsive without requiring on-demand aggregation queries that could be expensive.
3. **Plan performance data** (`cache:plan:{planId}:performance`): A daily scheduled job (running at 00:00 UTC) recalculates plan performance metrics based on the previous day's investment activity. This ensures that performance data shown to users reflects the most recent complete day of data.

### Deployment Warming

When a new version of the application is deployed, the cache invalidation queue processes a `DeploymentComplete` event that triggers a full cache flush. This is a deliberate decision: after a deployment, the code may expect different data shapes, different cache key formats, or different business logic. Flushing all caches ensures that the new code does not encounter stale data from the previous version.

The deployment flush sequence is:

1. The deployment script publishes a `DeploymentComplete` event to the BullMQ cache invalidation queue.
2. The cache invalidation worker receives the event and executes `SCAN` + `DEL` for the `cache:*` pattern, deleting all cache entries.
3. The worker then triggers the startup warming routine for the critical cache entries (plans, settings, currencies, features).
4. The new application instances begin serving traffic with a warm cache for the most common queries.

This approach adds approximately 2-5 seconds to the deployment process but eliminates an entire class of cache-related deployment bugs where stale data from the previous version causes incorrect behavior in the new version.

---

## 9. Cache Monitoring

A caching system without monitoring is a latent production incident. TeslaPrimeCapital tracks a comprehensive set of metrics across all cache tiers to ensure that the caching system is performing as expected and to detect degradation before it impacts users. Monitoring is implemented at two levels: Redis-level metrics (collected via the Redis `INFO` command and the application's Redis client wrapper) and application-level metrics (collected via a custom metrics middleware that instruments every cache operation).

### Redis-Level Metrics

The following metrics are collected from Redis at 10-second intervals:

- **Hit rate:** Calculated as `hits / (hits + misses)`. The target is greater than 80%. A hit rate above 80% indicates that the caching layer is effectively reducing database load. A hit rate below 80% suggests that cache keys are being invalidated too aggressively, TTLs are too short, or the workload has shifted toward data that is not cacheable.
- **Miss rate:** The inverse of hit rate. Tracked separately because absolute miss counts (as opposed to the rate) are useful for understanding the volume of database queries generated by cache misses.
- **Eviction rate:** The number of keys evicted by Redis due to memory pressure (the `evicted_keys` counter from `INFO stats`). A non-zero eviction rate indicates that Redis is running low on memory and is proactively removing keys before their TTL expires. This is an early warning sign of memory issues.
- **Memory usage:** Tracked as both absolute bytes (`used_memory` from `INFO memory`) and as a percentage of the configured `maxmemory` limit. Memory usage above 80% of the limit triggers a warning; above 90% triggers a critical alert.
- **Average latency:** Measured by the application's Redis client wrapper, which records the round-trip time of every Redis command. The target is sub-millisecond average latency for GET and SET operations. Latency spikes above 5ms are flagged as anomalies.
- **Connected clients:** The number of active connections to Redis. A sudden drop may indicate a connectivity issue; a sudden spike may indicate a connection leak.
- **Blocked clients:** The number of clients currently blocked by Redis commands (e.g., during `SCAN` operations for pattern-based invalidation). This should be zero under normal operation.

### Application-Level Metrics

In addition to Redis-level metrics, the application tracks per-query-type cache performance:

- **Cache hit/miss per query type:** Each cache key namespace (e.g., `cache:plans:*`, `cache:wallet:*`, `cache:rates:*`) is tracked independently. This allows the team to identify specific data types that have low hit rates and may need TTL or invalidation strategy adjustments.
- **Cache population latency:** The time taken to populate a cache entry from PostgreSQL on a cache miss. This metric helps identify slow database queries that are triggered by cache misses and may need query optimization or indexing.
- **Invalidation count per trigger:** The number of cache keys invalidated by each write operation. A write operation that invalidates an unusually large number of keys (e.g., hundreds) may indicate an inefficient invalidation pattern that needs optimization.
- **BullMQ queue depth:** The number of pending cache invalidation events in the BullMQ queue. A growing queue depth indicates that the invalidation worker is falling behind, which may lead to stale data being served for longer than expected.

### Alerting Thresholds

The following alerting rules are configured in the monitoring system:

| Metric | Warning Threshold | Critical Threshold | Action |
|--------|-------------------|-------------------|--------|
| Overall cache hit rate | < 80% | < 70% | Investigate TTL settings, invalidation frequency, and workload changes |
| Redis memory usage | > 80% of maxmemory | > 90% of maxmemory | Review key sizes, increase maxmemory, or add additional Redis shards |
| Eviction rate | > 0 evictions/min | > 100 evictions/min | Immediate memory review; consider key TTL reduction |
| Average Redis latency | > 5 ms | > 50 ms | Check for blocking commands, network issues, or Redis CPU saturation |
| BullMQ invalidation queue depth | > 100 pending | > 1,000 pending | Scale up invalidation workers, check for stuck jobs |
| Cache population latency | > 100 ms (p95) | > 500 ms (p95) | Optimize database queries, add indexes, or increase cache TTL to reduce misses |

All alerts are routed to the on-call engineering team via the incident management system and include contextual information (recent deployment events, traffic patterns, and related metric trends) to expedite diagnosis.

---

## 10. Failure Handling

A resilient caching system must degrade gracefully when its dependencies fail. Redis, BullMQ, and external rate providers are all potential points of failure, and the platform must continue to operate correctly — with acceptable but degraded performance — when any of these components are unavailable. This section defines the failure handling behavior for each component and the circuit breaker patterns that protect the system from cascading failures.

### Redis Unavailable

When Redis becomes unreachable (connection timeout, authentication failure, or network partition), the application falls back to direct PostgreSQL queries for all cache operations. This is implemented via a connection health check that runs before every Redis operation. If the health check fails, the application:

1. **Skips the Redis lookup** and proceeds directly to the PostgreSQL query via Prisma.
2. **Skips the Redis cache population** after the database query. The response is returned to the client without being cached.
3. **Logs a `WARN`-level message** with the Redis error details and the cache key that was being accessed.
4. **Increments a `redis_failure` counter** in the metrics system for monitoring and alerting.

From the user's perspective, the platform continues to function normally with slightly higher latency (PostgreSQL queries are slower than Redis lookups by approximately 2-10ms per request). All data is still correct because PostgreSQL is the source of truth.

A circuit breaker (see below) tracks consecutive Redis failures and opens the circuit after 3 consecutive failures, preventing the application from attempting Redis connections for 30 seconds. During the open circuit period, all cache operations are immediately routed to PostgreSQL without any Redis connection attempt. After the 30-second cooldown, the circuit enters a half-open state, allowing a single test request to Redis. If the test succeeds, the circuit closes and normal Redis operations resume. If it fails, the circuit remains open for another 30 seconds.

### TanStack Query Failure Handling

When the API layer returns an error (due to Redis failure, database failure, or network issues), TanStack Query handles the error according to its retry configuration. The default retry count is 2 with exponential backoff (1s, 2s). If all retries fail, the error is surfaced to the user via the error boundary component, which displays a friendly error message with a retry button.

During a Redis outage, the API layer returns successful responses (because it falls back to PostgreSQL), so TanStack Query is largely unaware that Redis is down. The only observable effect is slightly higher response times, which are handled by TanStack Query's built-in loading state display.

### Session Authentication Degraded Mode

Session authentication relies on Redis for session metadata storage (device verification, last activity, security flags). When Redis is unavailable, the authentication system enters degraded mode:

1. **JWT claims are used as the sole source of authentication state.** The JWT contains the user ID, role, and session creation time, which are sufficient for basic authentication.
2. **Device verification is skipped.** Normally, the system checks Redis to verify that the request originates from a recognized device. In degraded mode, device verification is bypassed, and a `WARN` log is emitted for audit purposes.
3. **Session invalidation (logout) is logged but not immediately effective.** When a user logs out, the JWT is added to a local in-memory blocklist on the current server instance. Other instances will not be aware of the logout until Redis is restored or the JWT expires naturally.
4. **Rate limiting is temporarily disabled.** Rate limit counters are stored in Redis. When Redis is unavailable, all rate limit checks pass, and a warning is logged. This prevents legitimate users from being blocked during an outage, but it also means that abusive traffic is not throttled.

### BullMQ Worker Failure

Background workers that process cache invalidation events and scheduled warming jobs use BullMQ, which also depends on Redis for job storage. When Redis is unavailable:

1. **Cache invalidation workers pause.** They stop processing jobs and enter a waiting state. When Redis is restored, they automatically reconnect and resume processing the queued jobs.
2. **Scheduled warming workers skip their scheduled runs.** The scheduled data (exchange rates, dashboard stats) becomes stale but is still available in Redis (if Redis is up) or served from PostgreSQL (if Redis is down).
3. **Write-behind counters accumulate in Redis.** If Redis is up but BullMQ is down, write-behind counters continue to accumulate in Redis. When BullMQ workers reconnect, they drain the accumulated counters and write the aggregated values to PostgreSQL. No data is lost as long as Redis remains available.

### Circuit Breaker Specification

The circuit breaker protecting Redis connections is configured as follows:

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Failure threshold | 3 consecutive failures | Tolerates brief network blips without overreacting |
| Open duration | 30 seconds | Long enough for Redis to recover from a brief outage; short enough to resume caching quickly |
| Half-open test requests | 1 per open period | Minimizes load on a recovering Redis instance |
| Monitored exceptions | Connection timeout, ECONNREFUSED, ECONNRESET, AUTH failure | Covers all common Redis failure modes |
| Success threshold to close | 1 successful request | Optimistic closure to resume caching as quickly as possible |
| Metrics emitted | `circuit_open`, `circuit_close`, `circuit_half_open` | Enables monitoring of circuit breaker activity |

The circuit breaker is implemented as a stateful object shared across all API handlers on a single server instance. Each instance maintains its own circuit breaker state, allowing independent recovery when Redis connectivity is partially restored.

---

## Appendix: Cache Key Quick Reference

| Namespace | Purpose | Example Key |
|-----------|---------|-------------|
| `cache:plans:*` | Investment plan data | `cache:plans:all`, `cache:plans:plan_abc123` |
| `cache:rates:*` | Exchange rates | `cache:rates:btc-usd`, `cache:rates:all` |
| `cache:settings:*` | Platform configuration | `cache:settings:platform`, `cache:settings:fees` |
| `cache:user:{id}:*` | User-specific data | `cache:user:usr_456:profile` |
| `cache:wallet:{id}:*` | Wallet data | `cache:wallet:wal_789:balance` |
| `cache:session:{token}:*` | Session data | `cache:session:sess_xyz:metadata` |
| `cache:features:*` | Feature flags | `cache:features:all`, `cache:features:new_ui` |
| `cache:referral:{id}:*` | Referral data | `cache:referral:usr_456:stats` |
| `cache:notifications:{id}:*` | User notifications | `cache:notifications:usr_456:count` |
| `cache:admin:*` | Admin dashboard | `cache:admin:dashboard:stats` |
| `cache:currencies:*` | Supported currencies | `cache:currencies:supported` |
| `cache:binary:{id}:*` | Binary tree structure | `cache:binary:usr_456:structure` |

---

*This document is a living specification. All cache-related architectural decisions must be validated against the principles and patterns defined herein. Deviations require written approval from the tech lead and must be documented in the project's ADR (Architecture Decision Record) repository.*