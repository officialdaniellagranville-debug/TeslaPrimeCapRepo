# Performance Requirements

> Phase 1 — Enterprise Investment Platform  
> Performance targets, scalability goals, caching strategies, and monitoring thresholds for all system components.

---

## 1. Performance Targets

Performance targets are defined across multiple dimensions to ensure a responsive, reliable user experience. All targets are measured against the 95th percentile (P95) unless otherwise specified, ensuring that the experience is good for the vast majority of users, not just the average.

**Page Load Time** measures the time from initial navigation to the page being fully interactive (Largest Contentful Paint). Public pages (landing page, login, registration, plan information) must load in under 2 seconds at P95. The user dashboard, which involves authenticated data fetching and heavier UI components, must load in under 3 seconds at P95. These targets assume a baseline connection of 4G mobile (10 Mbps down, 50ms RTT) and a mid-range mobile device.

**API Response Time** targets are differentiated by query complexity. Standard CRUD operations (creating a deposit, updating a profile, fetching plan details) must respond in under 200ms at P50 and under 500ms at P95. Complex queries (financial reports, referral tree traversal, analytics dashboards) must respond in under 300ms at P50 and under 800ms at P95. The P99 threshold for any endpoint is 1000ms — responses exceeding this are considered degraded.

**Time to First Byte (TTFB)** is measured separately for server-rendered pages and API responses. SSR pages must achieve a TTFB under 200ms, accounting for database queries, Redis cache lookups, and React server component rendering. API responses must achieve a TTFB under 100ms, as API requests typically involve fewer rendering steps and should be faster.

**Database Query Time** targets ensure that the data layer does not become a bottleneck. Indexed queries (those hitting a properly configured B-tree index) must complete in under 50ms at P95. Complex queries involving joins across multiple tables must complete in under 200ms at P95. Any query exceeding 500ms triggers a slow query alert for investigation and optimization.

These targets are measured in the production environment using real user monitoring (RUM) for frontend metrics and server-side instrumentation for API and database metrics. Targets are reviewed quarterly and adjusted based on actual performance data and business requirements.

---

## 2. Scalability Targets

The platform must support the following concurrent load characteristics at launch: 10,000 concurrent users (simultaneous active sessions), 1,000 requests per second sustained throughput, and 5,000 requests per second burst throughput for short periods (up to 30 seconds). The user base target at launch is 100,000 registered users, with the infrastructure provisioned to handle growth to 500,000 registered users without architectural changes.

Concurrent users are defined as users with an active session (not necessarily making requests at every moment). The system must maintain session state for 10,000 concurrent users without degradation. This impacts Redis memory usage (session storage), connection pool sizing (PostgreSQL and Prisma), and the background worker's ability to process notifications and events in real-time.

Sustained throughput of 1,000 requests per second assumes a typical mix of read-heavy traffic (approximately 80% reads, 20% writes). Read requests include dashboard data, transaction history, plan information, and notification fetching. Write requests include deposits, withdrawals, investments, profile updates, and support ticket messages. The 80/20 ratio is based on typical SaaS application patterns and may be adjusted based on observed traffic after launch.

Burst throughput of 5,000 requests per second accounts for traffic spikes during peak trading periods, promotional events, or notification-driven traffic (e.g., sending an email notification that drives users to check their dashboard simultaneously). The system must handle bursts without dropping requests or returning 5xx errors. This is achieved through request queuing, connection pooling, and Redis caching that absorbs read load during spikes.

Scalability is achieved through vertical scaling (increasing VPS resources) for Phase 1. The single-server architecture with resource headroom (recommended 8 CPU, 16GB RAM) is designed to handle the Phase 1 targets. If horizontal scaling is needed before Phase 2, the stateless API and frontend can be replicated behind a load balancer, with PostgreSQL read replicas for read-heavy workloads.

---

## 3. Frontend Performance

Code splitting is implemented at the route level using Next.js's built-in App Router splitting. Each route (dashboard, investments, deposits, withdrawals, referrals, settings, support) loads only its own JavaScript bundle and shared dependencies. This ensures that the initial page load for any single route is fast, and users only download the code needed for the pages they visit.

Lazy loading is applied to heavy components that are not immediately visible on page load. This includes chart components (used in the dashboard and analytics pages), modal dialogs, image galleries (KYC document previews), and the rich text editor (used in support ticket messages). Lazy-loaded components use `React.lazy()` with `Suspense` boundaries and appropriate loading fallbacks (skeleton screens, not spinners).

Image optimization leverages Cloudinary for all user-uploaded images and Next.js's built-in Image component for static assets. All images use responsive `srcset` attributes with multiple sizes generated at upload time. The `loading="lazy"` attribute is applied to all images below the fold. Critical above-the-fold images (logo, hero images) are preloaded using `<link rel="preload">`.

Font optimization uses `next/font` to self-host fonts, eliminating external font requests. Fonts are subset to include only the characters needed for the supported languages (English, and any configured locales). The primary font is preloaded to prevent FOUT (Flash of Unstyled Text). System font fallbacks are configured to ensure text is always visible, even before the custom font loads.

Critical CSS is inlined for above-the-fold content to reduce render-blocking requests. Tailwind CSS's purge mechanism ensures that only used CSS classes are included in the production build, keeping the CSS bundle minimal. Non-critical CSS is loaded asynchronously.

Compression is enabled at multiple levels. The Next.js production build generates gzipped and Brotli-compressed assets. Coolify's Traefik proxy is configured to serve pre-compressed files when available and to compress responses on-the-fly for dynamically generated content. Brotli compression typically achieves 15-20% better compression than Gzip for text-based assets.

---

## 4. Backend Performance

Connection pooling for PostgreSQL is managed through Prisma and PgBouncer (in production). The pool is sized to handle the expected concurrent database operations without connection starvation. Prisma's connection pool is configured with appropriate min/max values for the environment, and PgBouncer in transaction mode ensures efficient connection reuse across many short-lived transactions.

Redis caching is used for hot data that is accessed frequently but changes infrequently. Cached data includes: investment plan details (changes rarely, read on every dashboard load), user session data, rate limit counters, and frequently accessed configuration values. Cache entries have appropriate TTLs (time-to-live) that balance freshness with performance. Financial data (balances, transactions) is never cached — it is always read from the database to ensure accuracy.

N+1 query prevention is critical for API performance. All Prisma queries that return related data use `include` or `select` to fetch related records in a single round-trip rather than issuing separate queries for each record. Code reviews specifically check for N+1 patterns. Prisma's query log is monitored in development to identify accidental N+1 queries.

Response compression is enabled for all API responses. JSON responses are compressed using Brotli (preferred) or Gzip (fallback) at the Traefik proxy level. This reduces bandwidth usage and improves perceived performance for clients, especially on mobile networks. Compression is applied to responses larger than 1KB to avoid the overhead of compressing tiny responses.

Streaming is used for large response payloads. When returning large lists of transactions or notification histories, the response is streamed rather than buffered in memory. This reduces memory pressure on the server and starts delivering data to the client sooner. Pagination limits (max 100 items per page) prevent any single response from becoming excessively large.

---

## 5. Database Performance

Database performance is foundational to the overall system performance. The indexing strategy (detailed in POSTGRESQL_STRATEGY.md) ensures that all frequently queried columns and common query patterns have appropriate indexes. Indexes are reviewed quarterly and new indexes are added based on observed query patterns from the slow query log.

Query plan analysis is performed for any query identified as slow. The `EXPLAIN ANALYZE` output is reviewed to identify full table scans, inefficient join strategies, and missing indexes. Query optimization may involve adding indexes, restructuring the query, denormalizing data for read-heavy patterns, or introducing materialized views for complex aggregations.

Connection pooling (Prisma + PgBouncer) prevents connection overhead from degrading performance. Each database connection consumes PostgreSQL resources (memory, process slots), so maintaining a managed pool ensures connections are reused efficiently. Pool metrics (utilization, wait time, timeout rate) are monitored to detect when pool sizing needs adjustment.

Read replicas for reporting queries are planned for Phase 2. In Phase 1, all queries (including admin reports) go to the primary database. Admin reports that involve complex aggregations are optimized through materialized views that are refreshed periodically, avoiding expensive real-time aggregation queries against the primary database.

Vacuum and analyze scheduling is configured through PostgreSQL's autovacuum daemon with tuned parameters. Autovacuum runs automatically when dead tuples exceed a threshold (20% of table size). Manual `VACUUM ANALYZE` is run after bulk data operations (batch imports, mass status updates) to ensure statistics are up-to-date for the query planner.

---

## 6. Caching Performance

Redis serves as the primary caching layer, with a target cache hit ratio exceeding 80%. The cache hit ratio is calculated as (cache hits / total cache lookups) and is monitored in real-time. A sustained drop below 80% triggers investigation into cache invalidation logic, key expiration settings, or changes in access patterns.

The cache population strategy is lazy loading: data is loaded into the cache on first request and served from cache on subsequent requests until the TTL expires. This ensures that only data that is actually accessed is cached, avoiding wasted memory on unused cache entries. Cache warming (pre-populating the cache) is performed on deployment for critical data (plan details, configuration values, frequently accessed user data).

Cache invalidation follows a time-based and event-based hybrid approach. Time-based TTLs handle natural data staleness (e.g., plan details cached for 5 minutes, session data cached for 15 minutes). Event-based invalidation is used for data that must be fresh immediately after a change (e.g., when a user's balance changes, the cached balance is invalidated immediately). Event-based invalidation uses Redis pub/sub to notify all application instances to invalidate specific cache keys.

Cache key naming follows a structured convention: `{entity}:{identifier}:{field}` (e.g., `user:abc123:profile`, `plan:basic:details`, `rate-limit:192.168.1.1:login`). This convention enables targeted invalidation (invalidating all keys for a specific entity) and prevents key collisions. Cache keys include the environment prefix in development and staging to prevent cross-environment cache pollution.

The Redis instance is configured with `maxmemory` set to 75% of the allocated container memory, with the `allkeys-lru` eviction policy. This means that when Redis reaches its memory limit, it evicts the least recently used keys to make room for new data. Critical data (sessions, rate limits) uses Redis's native expiration to ensure it is always available and never evicted prematurely.

---

## 7. CDN & Asset Delivery

Cloudinary's global CDN handles all media asset delivery (user avatars, platform branding, email images). Cloudinary's CDN has points of presence in major regions worldwide, ensuring that assets are served from an edge location geographically close to the user. This typically results in sub-100ms asset delivery times regardless of the user's location.

Next.js static optimization handles JavaScript, CSS, and static asset delivery. The Next.js build process generates optimized, hashed filenames for static assets (e.g., `main.a1b2c3d4.js`), enabling aggressive long-term caching. Static assets are served with `Cache-Control: public, max-age=31536000, immutable` headers, ensuring they are cached by browsers and intermediate CDNs for up to one year. When assets change, the filename hash changes, busting the cache automatically.

Cache-control headers for dynamic content are set appropriately for each response type. API responses include `Cache-Control: no-store` to prevent caching of sensitive or frequently changing data. SSR pages include `Cache-Control: private, max-age=0, must-revalidate` to ensure fresh content on each navigation. Static pages (terms of service, privacy policy) may include longer cache durations.

Service worker for offline capability is planned for Phase 2. In Phase 1, the application requires an active internet connection for all operations. The service worker will cache critical assets and API responses for offline access to the dashboard, with background synchronization for pending operations when connectivity is restored.

---

## 8. Monitoring & Alerting

Real-time performance dashboards provide visibility into system health and performance metrics. Dashboards display key metrics including request rate, response latency percentiles (P50, P95, P99), error rate, CPU utilization, memory utilization, database connection pool utilization, Redis memory usage, and cache hit ratio. Dashboards are accessible through the Coolify monitoring interface and any external monitoring tools integrated in Phase 2.

Alerting thresholds are defined for critical performance and health metrics. Alerts are triggered when any of the following conditions persist for more than 5 minutes:

- **P95 latency > 1 second** on any API endpoint group — indicates a performance regression that is affecting user experience.
- **Error rate > 1%** of total requests — indicates application errors, database failures, or integration issues.
- **CPU utilization > 80%** on the host server — indicates resource saturation that may lead to degraded performance.
- **Memory utilization > 80%** on the host server — indicates potential memory pressure that could trigger OOM kills.
- **Database connections > 80%** of pool capacity — indicates connection pool exhaustion that will lead to request failures.
- **Redis memory > 80%** of configured maxmemory — indicates cache pressure that will trigger aggressive eviction.
- **Disk usage > 85%** — indicates potential storage exhaustion that could affect PostgreSQL and log files.

Alerts are delivered via email and Slack. Critical alerts (error rate > 5%, service down) trigger immediate notifications. Warning alerts (approaching thresholds) are batched into a daily digest. All alerts include the metric name, current value, threshold, and a link to the relevant dashboard for investigation.

---

## 9. Load Testing Strategy

Load testing is performed before every major release and after significant architecture changes. The load testing strategy simulates realistic user behavior patterns rather than arbitrary request generation. Test scenarios include: user registration and login flow, dashboard browsing with data fetching, deposit and investment creation, withdrawal requests, and concurrent access to common endpoints.

Tests are run at 2x the expected production capacity to identify bottlenecks before they affect real users. For Phase 1, this means testing with 20,000 concurrent users and 2,000 requests per second sustained. The 2x multiplier provides confidence that the system can handle growth and traffic spikes without performance degradation.

Financial operation concurrency is a specific focus of load testing. Scenarios include multiple users simultaneously creating deposits, investing in plans, and requesting withdrawals. These operations involve database transactions, balance calculations, and referral commission updates that must be processed correctly under concurrent load. Tests verify that no double-spending occurs, balances remain consistent, and no deadlock-related errors are produced.

Load testing tools (k6 or Artillery) generate traffic from multiple sources to simulate geographic distribution. Test results are analyzed for: throughput (requests per second achieved), latency percentiles (P50, P95, P99), error rates, resource utilization (CPU, memory, database connections), and any performance degradation over time (indicating memory leaks or connection leaks). Test reports are archived and compared across releases to detect performance regressions.

---

## 10. Performance Budgets

Performance budgets set hard limits on the size of assets delivered to the client. These budgets are enforced through automated checks in the CI/CD pipeline — any build that exceeds the budget fails the deployment and requires optimization before proceeding.

**JavaScript bundle size** must not exceed 200KB (gzipped) per route. This budget includes all JavaScript loaded for a specific route, including shared chunks. The Next.js build output is analyzed using `@next/bundle-analyzer` to verify compliance. If a route exceeds the budget, the excess must be reduced through additional code splitting, lazy loading, or removing unused dependencies.

**CSS bundle size** must not exceed 50KB (gzipped) per route. Tailwind CSS's purge mechanism ensures that only used styles are included. If the CSS budget is exceeded, the CSS must be reviewed for unused styles, overly complex selectors, or opportunities to simplify the design.

**Total page weight** (including HTML, CSS, JavaScript, fonts, and images) must not exceed 2MB for the initial page load. This budget ensures that the platform remains usable on mobile networks with limited bandwidth. Image-heavy pages (KYC document previews, multiple avatars) are the most likely to approach this budget and should use lazy loading and responsive images to stay within limits.

**API response size** for list endpoints must not exceed 100KB per page (at the default 20 items per page). This budget ensures that paginated responses are fast to serialize, transmit, and parse. If a list endpoint's response exceeds 100KB, the response shape should be reviewed: are unnecessary fields being returned? Can related data be deferred to a detail endpoint? Can fields be paginated separately?

Performance budgets are reviewed and potentially tightened quarterly as the codebase matures and optimization opportunities are identified. Budget violations are treated as deployment blockers to prevent gradual performance degradation (the "boiling frog" problem).