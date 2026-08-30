# Non-Functional Requirements

## 1. Performance

### 1.1 Page Load Time

All public-facing pages (homepage, about, FAQ, contact, privacy policy, terms of service, registration, login) must achieve a Time to Interactive (TTI) of under 2 seconds at the 95th percentile (P95) measured from a user in North America or Europe on a standard broadband connection (10 Mbps download, 5 Mbps upload, 50ms latency). Landing pages and marketing content should leverage Next.js server-side rendering (SSR) or static site generation (SSG) to minimize client-side JavaScript execution. Critical CSS should be inlined, and non-critical resources should be deferred or lazy-loaded. Performance budgets should be established during development and enforced in CI/CD pipelines using Lighthouse or similar tooling.

### 1.2 API Response Time

All backend API endpoints must respond within 500 milliseconds at the 95th percentile under normal load conditions. This includes the full request lifecycle: authentication and authorization, request validation, database queries, business logic execution, and response serialization. Endpoints that involve external service calls (blockchain monitoring, email delivery, KYC verification) may exceed this threshold for the synchronous response but must acknowledge the request within 500ms and process the external operation asynchronously. Database queries that touch large datasets must use pagination, cursor-based navigation, or targeted indexing to maintain response time requirements.

### 1.3 Dashboard Load Time

The user dashboard is the most data-intensive page in the application, aggregating wallet balances, active investments, recent transactions, referral statistics, and chart data. The initial dashboard load must complete within 3 seconds at the P95. This is achieved through parallel data fetching (multiple API calls executed concurrently rather than sequentially), server-side data aggregation to minimize client-side processing, and progressive rendering where core metrics (balance, active investments) render first while charts and secondary data load subsequently. Chart data for the earnings and portfolio performance visualizations should be fetched independently after the main dashboard content has rendered, preventing chart API latency from blocking the initial page display.

### 1.4 Concurrent User Capacity

The platform must support a minimum of 10,000 concurrent users without degradation in response times beyond the stated thresholds. This target assumes a typical usage pattern of page navigation, form submissions, and API calls distributed across the application's features. Load testing should simulate realistic user behavior patterns including read-heavy operations (dashboard views, plan browsing) and write operations (deposits, investments, withdrawals) to validate capacity under mixed load. The architecture must support horizontal scaling to increase this capacity as the user base grows beyond the initial target.

## 2. Scalability

### 2.1 Horizontal Scaling

The application architecture must support horizontal scaling of both frontend and backend components. Backend API instances must be stateless, storing no session data or user-specific state in memory -- all state must reside in the database, Redis, or the client (via secure cookies). Frontend instances can be scaled behind a load balancer with no session affinity requirement. New backend or frontend instances must be addable to the cluster without application code changes or downtime, relying solely on infrastructure configuration (Docker Compose scale commands, Coolify deployment configuration, or container orchestration scaling policies).

### 2.2 Database Read Replicas

PostgreSQL must be configured with at least one read replica to distribute query load. Write operations (transactions, balance updates, investment creation) must go to the primary database instance. Read operations (dashboard queries, transaction history, plan browsing) should be routed to read replicas where eventual consistency is acceptable. The Prisma ORM configuration must support read replica routing, directing eligible queries to replica instances while ensuring that queries immediately following a write operation (where read-after-write consistency is required) are directed to the primary. Connection pooling (via PgBouncer or a similar tool) must be configured to manage database connections efficiently as the number of application instances scales.

### 2.3 Redis Clustering

Redis serves multiple roles in the platform: session storage, rate limiting counters, API response caching, and real-time data (exchange rates, blockchain confirmation tracking). As the platform scales, Redis must support clustering to distribute the data and query load across multiple nodes. The application must use Redis client libraries that support cluster mode and must partition keys logically (e.g., sessions in one slot range, rate limits in another) to optimize cluster performance. Redis persistence must be configured (RDB snapshots plus AOF logging) to prevent data loss on restart.

### 2.4 CDN for Static Assets

All static assets -- JavaScript bundles, CSS stylesheets, images, fonts, and other media -- must be served through a Content Delivery Network (CDN). Cloudinary provides CDN capabilities for uploaded images and media assets. For application bundles and static files, a CDN layer (Cloudflare, AWS CloudFront, or similar) must sit in front of the application to serve cached assets from edge locations geographically close to users. Cache invalidation must be automated as part of the deployment pipeline, ensuring that new deployments immediately propagate updated assets to CDN edge locations while maintaining cache integrity for unchanged assets.

## 3. Availability

### 3.1 Uptime Target

The platform must achieve 99.9% availability, equivalent to no more than 8 hours and 45 minutes of unplanned downtime per year. This target excludes scheduled maintenance windows, which are communicated to users in advance. Availability is measured as the percentage of time the platform's core functions (authentication, dashboard, deposits, investments, withdrawals) are accessible and responsive, not including peripheral features (public marketing pages, blog content) that have a lower availability threshold.

### 3.2 Planned Maintenance Windows

Scheduled maintenance is performed during low-traffic periods, typically between 02:00 and 06:00 UTC on weekends. Maintenance windows are announced at least 48 hours in advance via in-app notification banners, email notifications, and a status page. The maintenance process must minimize downtime through blue-green or rolling deployment strategies. If maintenance extends beyond the announced window, users receive real-time updates via the status page. Emergency maintenance (security patches, critical bug fixes) may be performed with shorter notice but must still be communicated via the status page before execution.

### 3.3 Graceful Degradation

When non-critical services experience outages (email delivery, external price APIs, blockchain monitoring), the core platform must continue to function with degraded capabilities rather than failing entirely. For example, if the email service is unavailable, the platform should queue emails for retry and continue operating without sending real-time notifications. If the exchange rate API is unavailable, the platform should use the last successfully cached rate and display a notice that rates may be slightly stale. If blockchain monitoring is temporarily disrupted, pending cryptocurrency deposits should show an "awaiting confirmation" status and resume processing once the monitoring service is restored.

## 4. Security

### 4.1 OWASP Top 10 Compliance

The platform must be designed and tested against the OWASP Top 10 vulnerabilities. This includes protection against injection attacks (parameterized queries via Prisma, input validation), broken authentication (secure session management, 2FA support, brute-force protection), sensitive data exposure (encryption at rest and in transit, minimal data display), XML external entities (XXE -- not applicable as the platform uses JSON for all API communication), broken access control (role-based access control, resource-level authorization checks), security misconfiguration (secure default configurations, disabled debug modes in production, restricted CORS policies), cross-site scripting (XSS -- output encoding, Content Security Policy headers), insecure deserialization (avoidance of raw deserialization, schema validation on all inputs), using components with known vulnerabilities (dependency scanning in CI/CD), and insufficient logging and monitoring (comprehensive audit logging as described in Section 6).

### 4.2 Data Encryption at Rest

All sensitive data stored in the database must be encrypted at rest using AES-256 encryption. This includes user passwords (which are also hashed using bcrypt or argon2 before encryption), KYC documents (stored encrypted in Cloudinary or with encryption applied before upload), wallet balances, transaction records, personal information, and session data. Database-level encryption (full disk encryption via the database host or cloud provider) provides an additional layer of protection. Encryption keys must be managed through a dedicated key management service or secure key store, not embedded in application code or configuration files.

### 4.3 Data Encryption in Transit

All communication between clients and the platform must use TLS 1.3 (with fallback to TLS 1.2 for older clients). HTTP must be redirected to HTTPS on all endpoints. HSTS (HTTP Strict Transport Security) headers must be set with a minimum max-age of one year and include subdomains. Internal communication between application components (API servers, background workers, databases) must also use TLS. Certificate management must be automated through services like Let's Encrypt or a cloud provider's certificate management, with certificate rotation occurring before expiration.

### 4.4 Password Security

Passwords must be hashed using argon2id (preferred) or bcrypt with a minimum cost factor of 12. Passwords must never be stored in plain text, logged, or transmitted over insecure channels. The password complexity requirements (minimum 8 characters, uppercase, lowercase, number) are enforced on both the client and server side. The platform must not impose a maximum password length that would prevent users from using passphrases. Password hashes must be unique per user through the use of per-user salts, which are handled automatically by the hashing algorithm.

### 4.5 Rate Limiting

API rate limiting must be implemented at multiple levels to prevent abuse and protect against brute-force and denial-of-service attacks. Global rate limits restrict each IP address to a configurable number of requests per minute (default: 100 requests per minute for authenticated endpoints, 30 per minute for unauthenticated endpoints). Endpoint-specific rate limits apply stricter limits to sensitive operations: login attempts (5 per minute per email), password reset requests (3 per hour per email), registration attempts (5 per hour per IP), and withdrawal requests (10 per hour per user). Rate limit headers (X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset) must be included in API responses. Rate limiting is implemented using Redis counters with TTL-based expiration.

### 4.6 CSRF, XSS, and SQLi Protection

Cross-Site Request Forgery (CSRF) protection is implemented through the SameSite attribute on session cookies (set to "Lax" or "Strict") combined with CSRF tokens for state-changing requests if SameSite alone is insufficient. Cross-Site Scripting (XSS) protection is achieved through React's built-in output encoding (which escapes rendered content by default), Content Security Policy (CSP) headers that restrict script sources, and explicit output encoding for any dynamically generated HTML. SQL Injection protection is provided by Prisma's parameterized query builder, which separates SQL structure from user-supplied data. Raw SQL queries are prohibited in the codebase and enforced through code review and linting rules.

## 5. Reliability

### 5.1 Idempotent Operations

All state-changing API operations that could be retried due to network failures, timeouts, or client retries must be idempotent. Withdrawal requests, investment plan funding, and deposit credit operations must use idempotency keys provided by the client or generated by the server. If a client retries a request with the same idempotency key, the server returns the original response without re-executing the operation. This prevents duplicate withdrawals, double crediting of deposits, or creation of duplicate investment records. The idempotency key storage and lookup mechanism is implemented in Redis with a configurable TTL.

### 5.2 Transaction Integrity

All financial operations (deposits, investments, returns crediting, withdrawals, commissions) must execute within database transactions to ensure atomicity. A deposit confirmation, for example, must atomically: update the deposit record to confirmed status, credit the user's wallet balance, create a wallet transaction record, and update any relevant referral commission records. If any step in the transaction fails, the entire operation is rolled back, leaving the database in a consistent state. Database transactions use the appropriate isolation level (typically READ COMMITTED for PostgreSQL) to balance consistency and concurrency performance.

### 5.3 Retry Mechanisms

Operations that depend on external services (email delivery, blockchain transaction monitoring, exchange rate API calls) must implement retry mechanisms with exponential backoff. Failed email sends are retried up to 3 times with increasing delays (30 seconds, 2 minutes, 10 minutes) before being marked as permanently failed and logged for manual review. Blockchain monitoring for pending deposits runs on a polling schedule that naturally retries on each poll cycle. Exchange rate API failures trigger a fallback to the secondary API source; if both sources fail, the last successfully cached rate is used with a staleness indicator. All retry attempts are logged with the attempt number, error details, and final outcome.

## 6. Maintainability

### 6.1 Modular Architecture

The codebase is organized into clearly defined modules following a domain-driven structure. Frontend code is organized by feature (auth, wallet, investments, referrals, admin) with shared components, hooks, and utilities in dedicated directories. Backend code follows a similar feature-based structure with clear separation between routes, controllers, services, and data access layers. Each module has well-defined interfaces and dependencies, minimizing coupling between features. This modular structure allows teams to develop, test, and deploy features independently as the codebase and team grow.

### 6.2 Comprehensive Logging

All application events must be logged with sufficient detail for debugging, auditing, and operational monitoring. Logs must include: timestamp (ISO 8601, UTC), log level (debug, info, warn, error), request ID (for tracing a request across multiple log entries), user ID (when applicable), action performed, input parameters (sanitized to exclude sensitive data like passwords and full card numbers), and outcome. Logs are structured (JSON format) to enable machine parsing and filtering. Sensitive data (passwords, API keys, full KYC document contents, cryptocurrency private keys) must never appear in logs. Log retention policies must comply with data retention requirements while providing sufficient history for incident investigation.

### 6.3 Documentation

All modules, functions, and complex logic blocks must include inline documentation (JSDoc/TSDoc comments for TypeScript) explaining the purpose, parameters, return values, and any important behavioral notes. API endpoints must be documented with request/response schemas, authentication requirements, and example payloads. Architecture decisions, data model rationale, and operational procedures must be captured in the project documentation. The documentation standard requires that any developer unfamiliar with the codebase can understand the purpose and behavior of a module by reading its documentation and the documentation of its dependencies.

### 6.4 Code Standards

The project enforces consistent code standards through automated tooling. ESLint with a TypeScript-specific configuration enforces code quality and style rules. Prettier formats all code to a consistent style. TypeScript strict mode is enabled to catch type errors at compile time. Husky pre-commit hooks run linting and type-checking before allowing commits. Pull request pipelines run the full test suite, linting, and type-checking before allowing merges. These standards ensure that the codebase remains maintainable and readable as the team and codebase scale.

## 7. Accessibility

### 7.1 WCAG 2.1 AA Compliance

The platform must conform to the Web Content Accessibility Guidelines (WCAG) 2.1 at the AA level. This ensures the platform is usable by people with a wide range of disabilities, including visual, auditory, physical, speech, cognitive, language, learning, and neurological disabilities. Compliance covers all perceivable, operable, understandable, and robust criteria at the AA level. Conformance is validated through a combination of automated testing (axe-core, Lighthouse accessibility audit) and manual testing with assistive technologies (screen readers, keyboard-only navigation, voice control).

### 7.2 Keyboard Navigation

All interactive elements (links, buttons, form fields, dropdowns, modals, tabs) must be fully operable via keyboard navigation without requiring a mouse. The logical tab order must follow the visual layout of the page (left to right, top to bottom). Focus indicators must be clearly visible and distinguishable from the default browser focus ring, using the platform's accent color. Modal dialogs must trap focus within the modal when open and return focus to the triggering element when closed. Skip-to-content links must be provided on all pages to allow keyboard users to bypass repetitive navigation elements.

### 7.3 Screen Reader Support

All content must be accessible to screen reader users. Images must have descriptive alt text; decorative images must use empty alt attributes (alt=""). Form fields must have associated labels (using the HTML label element with a for attribute or aria-label/aria-labelledby attributes). Dynamic content updates (notification counts, real-time balance changes, chart data) must be announced to screen readers using ARIA live regions. Data tables must use proper header associations (scope or headers/id attributes). Interactive components (tabs, accordions, dropdowns) must use appropriate ARIA roles, states, and properties to communicate their behavior to assistive technologies.

## 8. Internationalization

### 8.1 Multi-Language Support

The platform's internationalization (i18n) framework supports dynamic language switching without page reload. All user-facing text is stored in locale-specific JSON files, organized by namespace (common, auth, wallet, investments, referrals, admin, notifications, emails). The application loads only the current locale's translations at runtime to minimize bundle size. Missing translations fall back to English, ensuring no broken text displays regardless of translation completeness. The i18n framework supports pluralization rules, gender-aware translations (if needed), and context-specific translations (the same key can have different values based on context parameters).

### 8.2 Right-to-Left (RTL) Support

The CSS architecture must support RTL layouts for languages such as Arabic, Hebrew, and Farsi. RTL support is implemented through CSS logical properties (margin-inline-start instead of margin-left, padding-inline-end instead of padding-right) and automatic direction switching based on the active locale's text direction. The Tailwind CSS configuration includes RTL-aware utility classes, and a global `dir` attribute on the HTML element controls the layout direction. Components must be tested in both LTR and RTL modes to ensure correct rendering. Icons and images that imply directionality (arrows, back/forward indicators) must be mirrored in RTL mode.

### 8.3 Locale-Specific Formatting

Dates, times, currencies, and numbers must be formatted according to the user's selected locale. Date formatting uses the Intl.DateTimeFormat API with the user's locale, supporting variations like "January 15, 2025" (en-US), "15 January 2025" (en-GB), and "15. Januar 2025" (de-DE). Currency formatting uses Intl.NumberFormat with the appropriate currency symbol and decimal placement. Large numbers use locale-appropriate thousand separators (1,000 in English, 1.000 in German, 1 000 in French). Time zones are handled by storing all timestamps in UTC and converting to the user's local time zone for display using the Intl API.

## 9. SEO

### 9.1 Server-Side Rendering for Public Pages

All public-facing pages (homepage, about, FAQ, contact, privacy policy, terms of service) must be server-side rendered using Next.js SSR or SSG capabilities. This ensures that search engine crawlers receive fully rendered HTML content with all text, links, and structured data present in the initial response, rather than depending on JavaScript execution. Meta tags, Open Graph tags, and structured data are rendered server-side and included in the HTML head. Dynamic pages (user-specific content) remain client-side rendered behind authentication, as these pages are not indexed by search engines.

### 9.2 Meta Tags and Structured Data

Every public page must include comprehensive meta tags: title (unique per page, 50-60 characters), description (unique per page, 150-160 characters), Open Graph tags (og:title, og:description, og:image, og:url, og:type), Twitter Card tags, and canonical URL. Structured data (JSON-LD format) must be implemented for the platform's key entity types: Organization, FinancialProduct (for investment plans), FAQPage (for the FAQ page), and BreadcrumbList (for page hierarchy). Structured data must be validated using Google's Rich Results Test before deployment.

### 9.3 Sitemap and Robots.txt

The platform must generate a dynamic XML sitemap listing all public pages with their last modification dates and priority values. The sitemap is regenerated on each deployment and automatically submitted to Google Search Console and Bing Webmaster Tools. A robots.txt file must be configured to allow crawling of public pages, block crawling of authenticated pages and API endpoints, and reference the sitemap URL. The robots.txt must also reference any additional sitemaps (such as an image sitemap or news sitemap if applicable in future phases).

## 10. Monitoring

### 10.1 Application Performance Monitoring (APM)

The platform must integrate an APM solution (such as Datadog, New Relic, or an open-source alternative like OpenTelemetry with Grafana) to monitor application performance in real time. APM dashboards must display: request throughput (requests per second), response time distributions (P50, P90, P95, P99), error rates by endpoint, database query performance, and external service call latency. APM alerts must be configured for threshold breaches (e.g., P95 response time exceeding 1 second for more than 5 consecutive minutes, error rate exceeding 1% of total requests). Trace data must capture the full request lifecycle from inbound request through database queries and external calls to response, enabling rapid diagnosis of performance issues.

### 10.2 Error Tracking

An error tracking system (such as Sentry) must capture and aggregate all unhandled exceptions, rejected promise rejections, and client-side JavaScript errors. Each error report includes: the error message and stack trace, the request context (URL, parameters, user ID when available), the browser or server environment, and a breadcrumb trail of events leading up to the error. Errors are automatically grouped by similarity (stack trace fingerprinting) to prevent duplicate alerts. Critical errors (5xx server errors, unhandled payment or investment failures) trigger immediate alerts to the on-call engineering team via the configured notification channel (Slack, PagerDuty, email).

### 10.3 Uptime Monitoring

External uptime monitoring must be configured using a service (such as UptimeRobot, Pingdom, or Better Uptime) that probes the platform's critical endpoints from multiple geographic locations at regular intervals (every 1 minute for critical endpoints, every 5 minutes for secondary endpoints). Monitored endpoints include: the public homepage, the login page, the API health check endpoint, and the registration page. Downtime is detected when a probe fails after a configurable number of consecutive checks (default: 3 failures). Uptime incidents trigger alerts to the operations team, and downtime duration is tracked against the 99.9% availability target.

### 10.4 Alerting

Alerting is organized into tiers based on severity. Critical alerts (service down, database failure, security incident) trigger immediate notifications to the on-call engineer via multiple channels (SMS, phone call, Slack) and escalate to the engineering lead if not acknowledged within 15 minutes. High-severity alerts (error rate spike, performance degradation, external service outage) trigger notifications via Slack and email with a 30-minute acknowledgment window. Low-severity alerts (disk usage above threshold, certificate approaching expiration, minor API latency increase) are routed to a daily digest and reviewed during regular operational reviews. All alerts include contextual information (affected component, current metrics, suggested investigation steps) to enable rapid response.

## 11. Backup and Recovery

### 11.1 Automated Daily Backups

The PostgreSQL database must be backed up automatically on a daily schedule. The backup process creates a full database dump (using pg_dump) and stores it in a secure, geographically separate storage location (different availability zone or region from the primary database). Backup files must be encrypted at rest using AES-256. The backup schedule should be configured during off-peak hours to minimize impact on database performance. Backup success or failure must be logged, and backup failures must trigger an immediate alert to the operations team.

### 11.2 Point-in-Time Recovery

The database must support point-in-time recovery (PITR) using continuous WAL (Write-Ahead Log) archiving in addition to daily full backups. WAL archiving captures every database transaction, enabling recovery to any specific point in time, not just the last full backup. This is critical for a financial platform where transactional integrity is paramount -- if a bug or human error corrupts data, the database can be restored to the state immediately before the corruption occurred. PITR recovery procedures must be documented and tested quarterly through scheduled disaster recovery drills.

### 11.3 Recovery Objectives

The platform must achieve a Recovery Point Objective (RPO) of less than 1 hour, meaning that in the event of a catastrophic failure, at most 1 hour of data may be lost. Given the daily backup schedule plus continuous WAL archiving, the actual RPO should be significantly lower (minutes, not hours). The Recovery Time Objective (RTO) must be less than 4 hours, meaning the platform must be fully restored and operational within 4 hours of a catastrophic failure. The RTO includes the time to provision replacement infrastructure, restore the database from backup, verify data integrity, and bring the application back online. These recovery objectives must be validated through periodic disaster recovery testing, with results documented and any gaps addressed.

## 12. Compliance

### 12.1 GDPR Compliance

The platform must comply with the General Data Protection Regulation (GDPR) for all users within the European Economic Area (EEA) and any other jurisdictions with similar data protection laws. Key GDPR requirements include: lawful basis for processing user data (consent for marketing, legitimate interest for service provision), data minimization (collecting only data necessary for the stated purpose), purpose limitation (using data only for the purposes disclosed at collection), and data retention limits (retaining personal data only as long as necessary for the purposes of processing or as required by law). See [BUSINESS_REQUIREMENTS](./BUSINESS_REQUIREMENTS.md) Section 12 for related financial risk disclosure requirements.

### 12.2 Data Subject Rights

The platform must implement mechanisms to fulfill data subject rights requests within the GDPR-mandated timeframes (30 days for most requests, 72 hours for data breach notifications). Supported rights include: the right of access (users can download all personal data held about them), the right to rectification (users can correct inaccurate personal data through their profile settings), the right to erasure (users can request account deletion, which triggers a data removal process that anonymizes or deletes personal data while retaining anonymized financial records for regulatory compliance), the right to data portability (user data exportable in a standard machine-readable format), and the right to object (users can opt out of marketing communications). Data subject requests must be logged, tracked, and fulfilled with audit trails.

### 12.3 KYC and AML Requirements

The platform's KYC verification process, as specified in [FUNCTIONAL_REQUIREMENTS](./FUNCTIONAL_REQUIREMENTS.md) Section 3, is designed to meet basic Anti-Money Laundering (AML) requirements common across jurisdictions. KYC documents must be retained for a minimum of 5 years after the end of the business relationship or as required by the applicable jurisdiction, whichever is longer. Transaction records must be retained for a minimum of 5 years. Suspicious activity must be reported to relevant authorities in accordance with the platform's legal obligations in each operating jurisdiction. The platform's restricted jurisdiction list (OFAC-sanctioned countries) must be maintained and enforced as described in [BUSINESS_REQUIREMENTS](./BUSINESS_REQUIREMENTS.md) Section 9.

### 12.4 Financial Data Handling

All financial data -- wallet balances, transaction records, deposit and withdrawal details, investment records, and commission data -- must be handled with the highest level of security and accuracy. Financial calculations must use precise decimal arithmetic (not floating-point) to prevent rounding errors. The Prisma schema must use Decimal types for all monetary fields. Financial audit trails must be immutable (append-only, no update or delete operations on transaction records). Regular reconciliation processes must compare system balances against expected values and flag discrepancies for investigation. These requirements are aligned with the reliability standards in Section 5.

## 13. Usability

### 13.1 Responsive Design (Mobile-First)

The platform is built with a mobile-first responsive design approach using Tailwind CSS's responsive utility classes. All pages and features must be fully functional on mobile devices (320px viewport and above), tablets (768px and above), and desktop displays (1024px and above). The primary navigation collapses into a hamburger menu on mobile viewports. Tables and data-dense components (transaction history, investment lists) use card-based layouts on mobile and table layouts on larger screens. Touch targets must be at least 44x44 pixels on mobile to prevent mis-taps. The investment plan cards, dashboard widgets, and chart components must resize and reflow appropriately across all breakpoints without horizontal scrolling.

### 13.2 Intuitive Navigation

The navigation structure must be consistent across all pages and modes. The primary navigation includes: Dashboard, Invest (investment plans), Wallet, Referrals, Support, and a mode switcher (Demo/Live). The user avatar in the navigation opens a dropdown menu with: Profile, Settings, Security, and Logout. The admin dashboard has a separate navigation structure organized by operational domain (Users, KYC, Deposits, Withdrawals, Plans, Referrals, Settings, Reports). Breadcrumbs are displayed on all pages below the top-level navigation to indicate the user's current location within the application hierarchy.

### 13.3 Consistent UI Patterns

All user interface elements must follow the design system defined in the UI/UX Design System document, ensuring visual and behavioral consistency across the platform. Buttons, form inputs, cards, modals, dropdowns, and other components use standardized variants, sizes, colors, and interaction patterns. Loading states use a consistent spinner or skeleton component. Success and error states use a consistent toast notification system with appropriate colors and icons. Form validation displays errors inline next to the relevant field with clear, actionable error messages. This consistency reduces cognitive load for users and accelerates their ability to navigate and use the platform effectively.

### 13.4 Loading States

Every asynchronous operation must display an appropriate loading state. Page transitions show a skeleton layout or loading bar while data is being fetched. Form submissions disable the submit button and show a spinner to prevent double submissions. Data tables display skeleton rows while data is loading. Charts show a loading placeholder until the data is ready and rendered. The loading states must use the platform's design system components and must not block the entire page unless the operation is page-level (such as initial dashboard load). Partial loading (where some sections load before others) is preferred over full-page blocking loaders.

### 13.5 Error States

Every operation that can fail must have a clearly designed error state. API errors display user-friendly error messages (not raw technical error details) with actionable guidance where possible (e.g., "Your deposit amount is below the minimum of $10. Please enter a larger amount."). Network errors display a message indicating a connectivity issue and a retry button. Form validation errors are displayed inline next to the relevant field with a summary at the top of the form. 404 pages for non-existent routes display a friendly message with navigation back to the dashboard. 500 errors display a generic error message with a support contact prompt and log the technical details for the engineering team. All error states must be accessible to screen readers and must not disrupt the user's ability to navigate to other parts of the application.