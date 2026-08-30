# Testing Strategy

**Project:** Enterprise Investment Platform
**Phase:** 1 — Discovery & Documentation
**Last Updated:** 2025
**Status:** Draft

---

## 1. Testing Philosophy

This platform adheres to a rigorous, multi-layered testing strategy rooted in the testing pyramid model. The foundation consists of a large number of fast-running unit tests that validate individual functions and business logic in isolation. Above that, a smaller but comprehensive set of integration tests verifies that services interact correctly with the database, Redis, and external dependencies. At the top of the pyramid, a focused set of end-to-end tests validates critical user journeys through the full application stack.

Every code change must pass the automated test suite before it can be merged into the main branch. No deployment to any environment (staging or production) occurs without a fully green test run. This is a non-negotiable gate in the CI/CD pipeline. The goal is to catch defects as early as possible in the development cycle, where they are cheapest and fastest to fix.

Tests are treated as first-class code. They are version-controlled alongside the application code, reviewed in pull requests, and refactored when the application they test changes. Flaky tests (tests that pass or fail non-deterministically) are quarantined and fixed within one sprint. A test that is consistently skipped or ignored provides false confidence and is worse than no test at all.

---

## 2. Unit Tests

### Targets

Unit tests target the isolated business logic of the application. For the backend, this includes service layer functions (investment calculations, commission logic, withdrawal fee computation, plan eligibility checks), validation functions, data transformation utilities, and custom middleware. For the frontend, this includes custom React hooks, utility functions, state reducers, and validation logic.

### Coverage Goals

The minimum code coverage threshold is 80% for backend services and 60% for frontend utilities and custom hooks. These thresholds are enforced in the CI pipeline — a pull request that drops coverage below these levels fails the CI check. Coverage is measured per-module, so a single poorly tested module cannot hide behind strong coverage in other areas.

### Framework

The backend uses Jest as the primary testing framework, leveraging its built-in mocking, assertion, and coverage reporting capabilities. The frontend uses Vitest, which provides native ESM support and faster execution times that are better suited to the Vite/Next.js frontend toolchain. Both frameworks share a similar API surface, reducing cognitive overhead for developers working across the stack.

### What to Test and What Not to Test

Unit tests validate pure business logic and data transformations. They mock external dependencies (database, Redis, email service) and test the behavior of the code in isolation. Prisma queries are not tested directly at the unit level — instead, the service functions that use Prisma are tested with a mocked Prisma client. This keeps unit tests fast and focused while database interaction is covered by integration tests.

---

## 3. Integration Tests

### Database Integration

Integration tests verify that service-layer code interacts correctly with a real PostgreSQL database. A dedicated test database is used (never the development or production database), and each test suite begins with a clean database state achieved through Prisma migrations followed by test-specific seed data. This ensures tests are deterministic and do not interfere with each other.

### API Endpoint Testing

All API endpoints are tested against the real application server with a real database. Supertest is used to send HTTP requests to the API and assert on response status codes, response bodies, headers, and database state changes. These tests validate the full request lifecycle: authentication, authorization, input validation, business logic execution, database persistence, and response formatting.

### Redis and External Service Integration

Redis operations (caching, rate limiting, session management) are tested against a real Redis instance to verify correct key patterns, TTL behavior, and data serialization. Email sending is tested by asserting that the correct email jobs are queued in Redis, rather than actually sending emails. This validates the integration point without depending on an external email service being available in the test environment.

---

## 4. API Testing

### Test Coverage

Every API endpoint is tested with the following request categories to ensure comprehensive coverage:

- **Valid requests** with correct data types, all required fields, and proper authentication tokens
- **Invalid requests** with missing required fields, incorrect data types, out-of-range values, and malformed JSON
- **Unauthorized access** — requests without authentication tokens, with expired tokens, or with malformed tokens
- **Forbidden access** — authenticated requests from users lacking the required role or permission for the endpoint
- **Rate limiting** — verify that rate limit headers are returned and that exceeding limits results in HTTP 429 responses
- **Edge cases** — empty result sets, pagination at boundaries (first page, last page, page beyond results), concurrent requests, and idempotency where applicable

### Automation

All API tests are fully automated and run on every pull request. They are integrated into the CI pipeline as a separate stage that executes after unit tests pass. Test results are reported in the CI interface with clear failure messages, and failed tests block the pull request from being merged.

---

## 5. Authentication Testing

Authentication is the security-critical foundation of the platform, and it receives exhaustive test coverage:

- **Registration flow** — valid registration with all required fields, duplicate email rejection, duplicate username rejection, weak password rejection, email verification trigger
- **Login flow** — valid credentials, invalid email, invalid password, case sensitivity, leading/trailing whitespace handling
- **Token refresh** — valid refresh token exchange, expired refresh token rejection, revoked refresh token rejection, refresh token rotation (old token invalidated after use)
- **Token expiry** — access token expires at the configured TTL, expired token is rejected by middleware, refresh token has a longer TTL than access token
- **2FA setup** — QR code generation, secret key storage, backup code generation, successful verification with TOTP code
- **2FA verification** — valid TOTP code acceptance, expired code rejection, reused code rejection, backup code acceptance (one-time use)
- **Password reset** — reset request generates token, token expires after configured period, token is single-use, new password meets requirements, old password is invalidated
- **Account lockout** — failed login counter increments, account locks after configured threshold (e.g., 5 failures), lockout duration is enforced, account unlocks after duration or via admin action
- **Session revocation** — logout invalidates the refresh token, admin can revoke all user sessions, password change revokes all existing sessions
- **Concurrent sessions** — multiple active sessions are supported, session count limit (if configured), oldest session eviction

---

## 6. Security Testing

Security testing validates that the application is resilient against common attack vectors:

- **SQL injection** — all user inputs are tested with SQL injection payloads (e.g., `' OR 1=1 --`, `'; DROP TABLE users; --`). Prisma's parameterized queries should prevent these, but the tests confirm it.
- **XSS (Cross-Site Scripting)** — user-supplied text fields are tested with script tags, event handlers, and encoded payloads. The application must sanitize or escape all user content rendered in the browser.
- **CSRF (Cross-Site Request Forgery)** — state-changing endpoints verify CSRF token presence and validity. Tokens are tied to the user session and cannot be reused across sessions.
- **File upload type bypass** — upload endpoints are tested with files that have manipulated MIME types, double extensions (e.g., `image.jpg.php`), and content that does not match the declared type. Cloudinary's server-side validation provides an additional layer of protection.
- **Rate limiting enforcement** — endpoints verify that rate limits are enforced per-user (not per-IP, which can be circumvented). Rate limit headers (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`) are present in responses.
- **Authorization boundary checks** — authenticated regular users attempt to access admin-only endpoints, and vice versa where applicable. Users attempt to access resources belonging to other users (e.g., viewing another user's transaction history by manipulating the ID parameter).
- **JWT manipulation** — tokens are tested with modified payloads, altered signatures, and algorithm substitution attacks. The JWT library's verification must reject all tampered tokens.

---

## 7. Frontend Testing

### Component Testing with React Testing Library

Frontend components are tested using React Testing Library (RTL), which tests components from the user's perspective by querying rendered output rather than testing implementation details. This approach ensures tests remain resilient to refactoring and accurately reflect the user experience.

### What to Test

Components are tested for correct rendering given specific props and state, form validation behavior (error messages appear for invalid inputs, submit is disabled until valid), error states (API errors, network failures, permission denied), loading states (spinners, skeletons, disabled interactions during fetch), responsive layout behavior (key elements visible at different viewport sizes), and accessibility (keyboard navigation, correct ARIA attributes, focus management).

### What Not to Test

CSS styling details such as specific colors, pixel values, font sizes, and layout positions are not tested at the component level. These are visual concerns validated through visual regression testing or manual review. Testing pixel-perfect CSS in unit tests creates brittle tests that break on every design tweak without adding meaningful value.

---

## 8. E2E Testing

### Scope

End-to-end tests cover only the most critical user flows that span the entire application stack. These are the paths that users take to accomplish core tasks, and a failure in any of these flows represents a critical production issue. The primary E2E test flows are:

1. **Registration to first investment:** User registers → receives verification email → verifies email → logs in → completes KYC → makes a deposit → selects an investment plan → confirms investment → views active investment on dashboard
2. **Withdrawal flow:** Logged-in user with available balance → initiates withdrawal → sees fee calculation → confirms withdrawal → sees pending status → admin approves → withdrawal completes
3. **Referral flow:** User generates referral link → new user registers via link → first user sees referral in dashboard → commission is calculated and credited

### Framework

Playwright is the E2E testing framework. It provides reliable browser automation with built-in waiting mechanisms, network interception, and multi-browser support (Chromium, Firefox, WebKit). Tests are written to be resilient to minor UI changes by targeting elements through accessible roles and labels rather than CSS selectors.

### Execution Strategy

E2E tests are too slow to run on every commit (typical suite runs in 5–15 minutes). They run on every push to the `main` branch and on release candidate branches before deployment. Pull request CI pipelines run unit and integration tests only. This keeps the PR feedback loop fast while ensuring comprehensive validation before any code reaches production.

---

## 9. Performance Testing

### Load Testing Framework

Performance testing is conducted using k6 (or Artillery as an alternative), which provides scriptable load generation, real-time metrics, and detailed post-test reports. Load test scripts are version-controlled alongside the application code and are executable in CI or manually from a developer's machine.

### Test Scenarios

- **Normal load test:** Simulates expected peak daily traffic (1x multiplier) sustained for 30 minutes. Verifies that response times remain within acceptable thresholds under normal operating conditions.
- **Peak load test:** Simulates 3x the expected peak traffic sustained for 15 minutes. Identifies the system's behavior under load significantly above normal and reveals queuing, timeout, or degradation patterns.
- **Stress test:** Progressively increases load until the system breaks (errors exceed 5% or response times exceed 5 seconds). Identifies the system's breaking point and the nature of the failure (graceful degradation vs. hard crash).
- **Soak test:** Sustains normal load for 1–2 hours. Identifies memory leaks, connection pool exhaustion, and other issues that only manifest over extended periods. Database connection counts, memory usage, and response time percentiles are monitored throughout.

### Database Profiling

During load tests, database query performance is profiled to identify slow queries, missing indexes, and connection pool contention. PostgreSQL's `pg_stat_statements` extension and `EXPLAIN ANALYZE` output are used to pinpoint query-level bottlenecks. Results feed directly back into schema optimization and query refactoring.

---

## 10. Accessibility Testing

### Automated Accessibility Testing

axe-core is integrated into the component test suite, running accessibility audits on every rendered component during unit tests. Any accessibility violation (missing labels, insufficient color contrast, incorrect ARIA usage) causes the test to fail with a detailed report. Lighthouse CI runs accessibility audits on full pages as part of the build process, providing an accessibility score that must meet the minimum threshold (90+).

### Manual Accessibility Testing

Automated tools catch approximately 30–40% of accessibility issues. The remaining issues require manual testing:

- **Keyboard navigation** — all interactive elements are reachable and operable via keyboard alone (Tab, Enter, Space, Escape, Arrow keys). Focus order follows a logical, predictable pattern. Focus indicators are visible and high-contrast.
- **Screen reader testing** — critical flows are tested with VoiceOver (macOS/iOS) and NVDA (Windows) to verify that content is announced correctly, form errors are communicated, and dynamic content updates are signaled.
- **Color contrast verification** — all text meets WCAG 2.1 AA contrast requirements (4.5:1 for normal text, 3:1 for large text). The red and black dark theme is specifically audited to ensure sufficient contrast in all states (default, hover, focus, disabled, error).
- **Focus management** — modal dialogs trap focus, navigation between pages moves focus appropriately, and dynamically added content receives focus when expected.

---

## 11. Regression Testing

### Automated Regression Suite

The full test suite (unit + integration + E2E) serves as the automated regression suite. It runs on every pull request and must pass completely before the PR can be merged. This ensures that no change introduces a regression in existing functionality. The regression suite is cumulative — new tests are added for every new feature and every bug fix.

### Flaky Test Policy

Flaky tests (tests that produce inconsistent pass/fail results without code changes) are treated as a serious problem because they erode trust in the test suite and can mask real failures. The policy is:

1. A test that fails intermittently is flagged and monitored for 3 consecutive CI runs.
2. If the test fails 3 or more times intermittently, it is quarantined — removed from the main test suite and moved to a separate "flaky" test file that does not block merges.
3. The quarantined test must be fixed (made deterministic) or removed within one sprint.
4. The root cause of the flakiness (timing dependency, shared state, external service dependency) is documented and addressed.

---

## 12. Test Data Management

### Seed Scripts

A database seed script provides a consistent, repeatable set of test data that includes sample users at various KYC levels, wallets with different balances, active and matured investments, transactions across all types, and referral trees. This seed data is used for both integration tests and local development, ensuring developers work with realistic data without manually creating records.

### Factories

For tests that require specific data configurations not covered by the seed script, factory functions generate dynamic test data. Factories accept parameters for customization while providing sensible defaults for all required fields. This approach keeps tests readable and maintainable by avoiding inline data construction in each test.

### Database Cleanup

Each integration test is responsible for cleaning up any data it creates. Tests use database transactions that are rolled back after the test completes, ensuring complete isolation. For tests that cannot use transaction rollback (e.g., testing commit behavior), explicit cleanup deletes all created records. The test database is never shared with development or production environments, and test data is never sensitive or PII.

---

## 13. CI Integration

### Pipeline Stages

The CI pipeline is structured as a sequential series of stages, each acting as a quality gate. A failure at any stage stops the pipeline and prevents subsequent stages from running:

1. **Lint** — ESLint (frontend and backend), Prettier format check, TypeScript strict mode compilation
2. **Type check** — `tsc --noEmit` for both frontend and backend, ensuring full type safety
3. **Unit tests** — Jest (backend) and Vitest (frontend) with coverage reporting
4. **Integration tests** — API and database integration tests with test database provisioning
5. **Build** — Next.js production build, Docker image build
6. **E2E tests** — Playwright suite (runs only on `main` branch and release branches)

### Fail-Fast Principle

The pipeline follows a fail-fast approach: each stage runs only if all preceding stages have passed. This provides rapid feedback — if a lint error is introduced, the developer knows within seconds rather than waiting for the full test suite to complete. E2E tests are the most time-consuming stage and are therefore restricted to the main branch to keep pull request CI fast (target: under 5 minutes for lint + type check + unit tests).

### Test Reporting

All test stages generate structured reports (Jest JSON reports, Playwright HTML reports) that are uploaded as CI artifacts. Failed tests are reported inline in the pull request with clear failure messages, expected vs. actual values, and stack traces. Coverage trends are tracked over time to identify modules that are losing test coverage.