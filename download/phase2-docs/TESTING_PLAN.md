# TeslaPrimeCapital — Testing Plan

> **Version:** 1.0  
> **Status:** Approved  
> **Last Updated:** 2025-07-12  
> **Audience:** Engineering team, QA, DevOps, Tech leads  

---

## Table of Contents

1. [Testing Philosophy](#1-testing-philosophy)
2. [Testing Stack](#2-testing-stack)
3. [Unit Testing Standards](#3-unit-testing-standards)
4. [Component Testing](#4-component-testing)
5. [API Integration Testing](#5-api-integration-testing)
6. [E2E Testing](#6-e2e-testing)
7. [Financial Testing](#7-financial-testing)
8. [Security Testing](#8-security-testing)
9. [Test Data Management](#9-test-data-management)
10. [CI/CD Testing Pipeline](#10-cicd-testing-pipeline)
11. [Test Organization](#11-test-organization)
12. [Coverage Requirements](#12-coverage-requirements)

---

## 1. Testing Philosophy

TeslaPrimeCapital is a managed investment platform where correctness, reliability, and financial integrity are non-negotiable. Our testing philosophy is built on the **test pyramid**: a broad base of fast unit tests, a smaller middle layer of integration tests, and a focused apex of end-to-end tests. This distribution ensures fast feedback loops during development while still validating complete user journeys before release.

Every feature must have tests written before milestone approval is granted. This is not a suggestion — it is a hard gate. No feature moves from "in development" to "ready for review" without accompanying tests that demonstrate correctness. Tests are **first-class code**: they are reviewed in pull requests with the same rigor as production code, maintained alongside the features they protect, and never skipped or marked as `.skip()` without an explicit approval comment from a tech lead and a linked issue tracking the re-enabling of the test.

Our coverage targets are stratified by module criticality. Overall, the project must maintain **80% line coverage**. Business logic — including financial calculations, authentication flows, authorization rules, and data validation — must reach **90% line coverage**. UI components must maintain **70% line coverage**, acknowledging that complex page-level interactions are better validated through integration and E2E tests than through brittle unit-level DOM assertions.

Every pull request runs the full test suite in CI. A single failing test blocks the merge. Coverage regressions are treated as build failures. Flaky tests are tracked as P1 bugs and must be resolved within one sprint. We do not tolerate a culture of ignoring test failures. The test suite is the safety net that allows the team to move fast with confidence, and its integrity must be preserved at all times.

The financial nature of this platform demands that testing goes beyond typical web application standards. Monetary calculations, transaction integrity, concurrent operations, and data consistency are all areas where bugs have direct material consequences for users. Our testing strategy reflects this reality by dedicating disproportionate attention to financial modules, security controls, and edge-case validation.

---

## 2. Testing Stack

The TeslaPrimeCapital testing stack is carefully chosen to provide fast, reliable, and maintainable tests across all layers of the application. Each tool serves a specific purpose in the testing pipeline and integrates cleanly with the others.

### Unit and Integration Testing — Vitest

Vitest is our primary test runner for unit and integration tests. It provides native ESM support, built-in TypeScript compilation via esbuild, and a configuration surface compatible with Vite (which we use for the frontend). Vitest offers watch mode for rapid local development, parallel test execution by default, and comprehensive assertion and mocking APIs. We use `vitest --coverage` with the `v8` provider to generate coverage reports. Vitest replaces Jest entirely — we do not use Jest anywhere in the project.

### React Component Testing

React components are tested using **@testing-library/react** for rendering and querying, **@testing-library/jest-dom** for semantic DOM matchers (e.g., `toBeInTheDocument()`, `toHaveTextContent()`, `toBeDisabled()`), and **@testing-library/user-event** for simulating realistic user interactions. These libraries enforce testing behavior over implementation details, ensuring our tests remain resilient to refactoring.

### API Integration Testing

REST API endpoints are tested using **Supertest** with the Express application instance. Supertest provides a high-level API for sending HTTP requests to the server without needing to bind to a real port. Tests validate response status codes, response body shapes, headers, and side effects on the database. Combined with the test database and MSW for upstream service mocking, this gives us comprehensive API-level confidence.

### End-to-End Testing

**Playwright** drives our E2E test suite across three browser engines: Chromium, Firefox, and WebKit. Playwright provides auto-waiting, network interception, multi-tab and multi-context support, and excellent debugging tools (trace viewer, codegen). E2E tests validate complete user journeys against a staging environment and are the final gate before production deployment.

### API Mocking — MSW

**Mock Service Worker (MSW)** intercepts outgoing HTTP requests at the network level during frontend tests. This allows us to test React components in isolation from the backend by defining request handlers that return predictable responses. MSW works in both unit tests and component tests, and can also be used in development for manual frontend testing against mock APIs.

### Database and Coverage

Integration tests use a **dedicated PostgreSQL test database** managed through Prisma. Before each test suite, all tables are truncated and reseeded with a known, deterministic dataset. This ensures tests are idempotent and do not interfere with each other. Coverage is collected via `@vitest/coverage-v8` and reported in both terminal and HTML formats during CI runs.

---

## 3. Unit Testing Standards

Unit tests are the foundation of the test pyramid. They are fast (targeting under 50ms per test), isolated, and deterministic. A unit test validates the behavior of a single function, hook, or component in isolation from its dependencies, which are replaced with mocks or stubs.

### What to Unit Test

- **Utility functions:** Formatters (currency, date, percentage), validators (email, password strength, phone number), hashers, encoders, and any pure function that transforms input to output.
- **Custom React hooks:** Business logic encapsulated in hooks — especially those managing local state, derived computations, or data fetching orchestration. Mock the underlying data fetching layer and test the hook's return values and side effects.
- **React components (isolated):** Rendering with required props, displaying expected content, responding to user interactions (click, type, submit), toggling between loading/error/success states, and emitting expected callback invocations. Components are tested in isolation — no real API calls, no real router.
- **Service layer business logic:** Domain services that orchestrate business rules, calculate values, or make authorization decisions. Inject dependencies and mock the repository layer.
- **Repository data transformations:** Functions that reshape database records into domain objects or DTOs. Test mapping correctness and edge cases (null fields, optional fields, nested structures).

### What NOT to Unit Test

- **Third-party library internals:** We trust that Prisma, TanStack Query, Next.js, and other dependencies work correctly. Do not test their query syntax, caching behavior, or routing logic.
- **Framework behavior:** Do not test that React re-renders when state changes, or that Next.js handles navigation correctly. These are framework guarantees.
- **Simple pass-through code:** If a function has no conditional logic and merely delegates to another function, it does not need a dedicated unit test.

### Naming Conventions

All tests follow this structure:

```text
describe('UnitName', () => {
  it('should behavior when condition', () => {
    // test body
  })
})
```

The `describe` block names the unit under test. The `it` block describes the expected behavior in plain English using "should...when..." format. Avoid vague names like "works correctly" or "handles input." Be specific about the behavior and the condition that triggers it.

### AAA Pattern

Every test follows the **Arrange-Act-Assert** pattern:

- **Arrange:** Set up test data, create mocks, define inputs.
- **Act:** Invoke the function, render the component, or trigger the event.
- **Assert:** Verify the output, side effects, or state changes.

Each test tests **exactly one behavior**. If a test has multiple `expect` statements, they should all be validating aspects of the same behavior. If you find yourself testing two unrelated behaviors in one test, split it into two tests.

---

## 4. Component Testing

Every React component in TeslaPrimeCapital must be tested using the Testing Library ecosystem. Component tests run in a JSDOM environment via Vitest and validate that components render correctly, respond to user input, and display appropriate states. These tests do not replace E2E tests — they provide a fast, focused safety net during development.

### What to Test in Components

- **Rendering with required props:** Verify that the component renders without throwing when provided all required props. Check that key UI elements are present in the document.
- **Display of expected content:** Validate that the component displays the correct text, labels, and values based on the props it receives. Test with different prop values to ensure conditional rendering works.
- **User interactions:** Simulate clicks, form input, dropdown selections, and form submissions using `@testing-library/user-event`. Verify that the correct callback is invoked with the correct arguments.
- **Loading states:** Components that fetch data or perform async operations must be tested in their loading state — verify that skeletons, spinners, or loading indicators are displayed while data is pending.
- **Error states:** Test that components display appropriate error messages or fallback UI when data fetching fails or validation errors occur.
- **Accessibility:** Verify that interactive elements have appropriate `aria-label` attributes, that landmark roles are correct, and that focus management works for modals and dialogs.

### Provider Wrappers

Testing Library renders components in isolation, so we must wrap them in the providers they expect at runtime:

- **TanStack Query:** Wrap components in `QueryClientProvider` with a fresh `QueryClient` instance per test. Disable retries (`retry: false`) to prevent flaky timeouts in tests.
- **Next.js Router:** Use `next/router` mock or `MemoryRouterProvider` to simulate route context. Test components that depend on `useRouter()` or `useSearchParams()`.
- **React Hook Form:** For form-heavy components, test form submission behavior. Use `renderHook` with `useForm` to validate form validation rules programmatically.

### Snapshot Testing Policy

Snapshot tests are permitted **only** for complex static components that have no dynamic data, no user interactions, and no conditional rendering. Examples include icon components, static SVG illustrations, and configuration-driven layout shells. Snapshot tests must NOT be used for components that receive data props, display user-generated content, or have conditional UI states, because snapshot diffs become meaningless and maintenance-heavy for such components.

---

## 5. API Integration Testing

Every REST API endpoint exposed by the TeslaPrimeCapital backend must be tested with Supertest. Integration tests exercise the full request lifecycle: HTTP parsing, middleware execution (auth, rate limiting, validation), controller logic, service layer invocation, database interaction, and response serialization. These tests catch integration issues that unit tests cannot — middleware ordering problems, missing error handling, and incorrect database queries.

### Status Code Coverage

For every endpoint, we must test the following response categories:

- **Success cases (200/201):** Valid requests return the expected response body and status code. Verify response shape matches the API contract.
- **Validation errors (400):** Missing required fields, invalid email formats, negative amounts, and malformed JSON bodies all return 400 with descriptive error messages.
- **Authentication errors (401):** Requests with no token, an expired token, a malformed token, or a token signed with a wrong secret return 401.
- **Permission errors (403):** Authenticated users attempting to access resources or endpoints outside their role's scope return 403. Each role (USER, ADMIN) must be tested against every endpoint.
- **Not found (404):** Requests for non-existent resources (user ID, transaction ID, investment plan ID) return 404 with a clear message.
- **Rate limiting (429):** Requests that exceed the rate limit threshold return 429 with a `Retry-After` header.
- **Server errors (500):** Simulate unexpected database errors or external service failures and verify that the server returns 500 without leaking stack traces or internal details.

### Test Database Management

Integration tests run against a dedicated PostgreSQL test database. Before each test suite (using `beforeAll` or `beforeEach`), all tables are truncated in dependency order and reseeded with a deterministic dataset. This ensures that every test starts with a known state. The seed data includes predefined users (with known roles and KYC statuses), investment plans, transactions, and referral relationships.

### Authentication and RBAC Testing

Every protected endpoint must be tested with four authentication scenarios: valid token, expired token, invalid token, and no token. Role-based access control must be tested for every endpoint: a regular USER should receive 403 on admin endpoints, and an ADMIN should be able to access all endpoints. Test that role checks happen after authentication (401 before 403).

### List Endpoint Testing

Endpoints that return paginated lists must be tested for: correct pagination parameters (page, limit), default values when parameters are omitted, boundary cases (page 1, last page, page beyond last), filtering by relevant fields, sorting by allowed fields in both ascending and descending order, and response metadata (total count, page number, total pages).

### Financial Endpoint Testing

Endpoints that create or modify financial records (deposits, investments, withdrawals) must be tested for idempotency key handling. Duplicate requests with the same idempotency key must return the original response without creating duplicate records. Test that idempotency keys are enforced on POST and PATCH requests to financial endpoints.

---

## 6. E2E Testing

Playwright E2E tests validate critical user journeys by driving a real browser against the staging environment. These tests are the slowest and most expensive in the test suite, so we limit them to the highest-priority flows that span multiple pages and API interactions. E2E tests are the final validation before a release reaches production.

### Critical User Journeys

The following journeys must have dedicated E2E test specs:

1. **Registration flow:** Navigate to the registration page, fill in all required fields (name, email, password, referral code — optional), submit the form, and verify the user is redirected to the email verification page or dashboard.
2. **Email verification:** Click the verification link from a test email (or use a test endpoint to simulate verification), verify the account is marked as verified, and verify the user can now log in.
3. **Login/Logout:** Enter valid credentials, verify successful login and redirect to dashboard. Verify that the session persists across page reloads. Click logout and verify the user is redirected to the login page and the session is destroyed.
4. **Deposit (crypto):** Navigate to the deposit page, select a cryptocurrency, verify the deposit address and QR code are displayed, and verify the deposit is recorded as pending after simulating a blockchain confirmation.
5. **Deposit (gift card):** Navigate to the deposit page, select gift card option, enter gift card details, submit, and verify the deposit is credited after validation.
6. **Investment plan selection and funding:** Browse available investment plans, select a plan, enter an investment amount, confirm the investment, and verify the balance is debited and the investment is active.
7. **Withdrawal request:** Navigate to the withdrawal page, enter a withdrawal amount and wallet address, submit the request, and verify it appears in the withdrawal history with "pending" status.
8. **Referral code usage:** Register a new user using an existing user's referral code and verify the referral relationship is established and the referrer's commission balance is updated.
9. **KYC document upload:** Navigate to the KYC page, upload a government-issued ID, submit, and verify the KYC status changes to "pending review."
10. **Admin KYC review:** Log in as an admin, navigate to the KYC review queue, approve or reject a KYC submission, and verify the user's KYC status is updated accordingly.
11. **Admin withdrawal approval:** Log in as an admin, navigate to pending withdrawals, approve a withdrawal, and verify the user's withdrawal status changes to "approved" and their balance reflects the deduction.
12. **Demo/Live mode toggle:** Toggle between demo and live mode on the dashboard and verify that the displayed data, balances, and available actions change appropriately.

### Test Independence and Cleanup

Each E2E test must be fully independent and able to run in any order. Tests must clean up after themselves — any data created during the test (users, transactions, etc.) must be deleted or reverted. Tests must not depend on state created by previous tests. Use unique identifiers (timestamps, UUIDs) to avoid collisions between parallel test runs.

### Execution Strategy

E2E tests run against the **staging environment**, not the development environment. Staging mirrors production configuration (database, Redis, environment variables) to catch environment-specific issues. E2E tests run **nightly** via a scheduled CI job, not on every PR (the suite takes 15–30 minutes to complete). A PR-triggered E2E run is available as a manual workflow trigger for critical releases.

### Page Object Model

All E2E tests use the **Page Object Model (POM)** pattern. Each page or significant UI section has a corresponding page object class that encapsulates element selectors and interaction methods. This keeps test specs clean, reduces duplication, and makes tests resilient to UI changes — when a selector changes, it is updated in one place (the page object) rather than across dozens of test files.

---

## 7. Financial Testing

This is the **most critical section** of the testing plan. TeslaPrimeCapital handles real money, and financial bugs have immediate, material consequences for users. All financial operations must be tested with extreme care, using exact decimal arithmetic, comprehensive edge cases, and concurrency validation.

### Balance Integrity

- **Non-negative balance invariant:** At no point during any operation (deposit, investment, withdrawal, commission credit) may a user's balance go below zero. Every financial mutation must include a pre-condition check and a post-condition assertion.
- **Balance before/after consistency:** Every transaction record must store `balanceBefore` and `balanceAfter` values. Tests must verify that `balanceAfter = balanceBefore + credit - debit` for every operation. These values must be snapshotted atomically within the same database transaction as the balance mutation.

### Transaction Immutability

Once a transaction reaches the "completed" status, it must be immutable. Tests must verify that completed transactions cannot be modified or deleted through any API endpoint, including admin endpoints. The only valid state transition from "completed" is no transition — the record is locked.

### Concurrency and Double-Spend Prevention

Financial operations must be safe under concurrent execution. Tests must simulate parallel requests using `Promise.all` or similar concurrency primitives:

- Two simultaneous withdrawal requests that together exceed the available balance must result in exactly one succeeding and one failing — never both succeeding (double-spend) and never both failing (lost transaction).
- Two simultaneous investment requests from the same balance must be serialized by database-level locking (e.g., `SELECT ... FOR UPDATE`) and produce correct final balances.
- Test with at least 10 concurrent requests to validate that database row-level locks and application-level idempotency keys work together correctly.

### Exact Calculations

All financial calculations must use **decimal precision** — no IEEE 754 floating-point arithmetic. The application uses a Decimal library (or PostgreSQL `NUMERIC`/`DECIMAL` type via Prisma `Decimal` type) for all money values.

- **Withdrawal fee:** Exactly 21% of the withdrawal amount. Test: withdraw 1000.00, fee is 210.00, net is 790.00. Withdraw 0.01, fee is 0.0021 — verify rounding rules (round half up, round half even, or truncate — whichever is specified in the business requirements).
- **Investment return:** Calculated based on the plan's return rate and duration. Verify that the return amount matches the formula exactly, including compounding rules if applicable.
- **Referral commission:** Exactly 10% of the referred user's investment amount. Test: referral invests 500.00, referrer receives commission of 50.00.
- **Binary bonus:** Verify that the binary bonus calculation follows the specified algorithm (weaker leg matching, capping rules, flush rules) with exact precision. Test with multiple referral tree structures.

### Edge Cases

- Invest exactly at the plan's minimum amount — verify the investment is accepted and the return is calculated correctly.
- Invest exactly at the plan's maximum amount — verify the investment is accepted and no more can be invested in that plan.
- Withdraw the entire available balance — verify the balance goes to zero and the withdrawal fee is correctly deducted from the gross amount.
- Withdraw when the available balance equals the fee — verify the transaction is rejected (user would receive zero net) or handled according to business rules.
- Deposit exactly 0.01 (minimum possible) — verify it is credited correctly.
- Withdraw 0.01 — verify the fee calculation and net amount.

---

## 8. Security Testing

Security testing validates that the platform's defensive controls work correctly under both normal and adversarial conditions. While we supplement automated tests with periodic penetration testing, the following security behaviors must be continuously validated in the automated test suite.

### Input Validation and Sanitization

- **SQL injection:** Submit payloads like `' OR 1=1 --`, `'; DROP TABLE users; --`, and Unicode-based injection attempts to every text input field and query parameter. Verify that Prisma's parameterized queries prevent all SQL injection, and that no raw query endpoints exist without proper sanitization.
- **XSS (Cross-Site Scripting):** Submit script tags (`<script>alert(1)</script>`), event handlers (`onerror="alert(1)"`), and encoded variants to every user input field. Verify that rendered output is properly escaped and that no stored XSS is possible.
- **CSRF (Cross-Site Request Forgery):** Verify that state-mutating endpoints (POST, PUT, DELETE, PATCH) require a valid CSRF token (or use SameSite cookie attributes + token-based auth to mitigate CSRF). Test that requests without the CSRF token are rejected.

### Authentication and Authorization

- **Brute force protection:** Submit 5+ failed login attempts for the same account and verify that the account is temporarily locked or rate-limited. Verify that the lockout duration increases with repeated failures (exponential backoff).
- **Token validation:** Submit requests with expired JWTs, malformed JWTs, JWTs signed with a different secret, and JWTs with altered payloads. Verify all return 401.
- **2FA enforcement:** When a user has two-factor authentication enabled, verify that login requires the OTP code after the password is accepted. Verify that incorrect OTPs are rejected and that the OTP expires after the configured TTL.
- **RBAC enforcement:** Test every endpoint with every role combination. A USER must never access admin endpoints. An ADMIN must never perform user-level financial mutations through user-facing endpoints (use admin endpoints instead).

### Rate Limiting and Session Management

- **Rate limiting:** Send requests exceeding the configured rate limit (e.g., 100 requests per minute) and verify that the 101st request returns 429 with a `Retry-After` header. Test rate limiting per IP and per user (authenticated requests).
- **Password history:** After a password change, verify that the user cannot reuse any of the last N passwords (as configured). Test that the password history check is case-insensitive.
- **Session revocation:** When a user logs out or an admin revokes a session, verify that the JWT is added to a blocklist (via Redis) and that subsequent requests with that token return 401.
- **File upload validation:** Attempt to upload files with disallowed extensions (`.exe`, `.php`, `.sh`), files exceeding the size limit, and files with incorrect MIME types. Verify all are rejected with appropriate error messages.

### OTP Security

- **OTP expiration:** Generate an OTP, wait until after the TTL has elapsed, and verify the OTP is rejected.
- **OTP reuse:** Use the same OTP twice and verify the second attempt is rejected (one-time use enforcement).
- **OTP brute force:** Submit multiple incorrect OTP attempts and verify rate limiting or lockout triggers.

---

## 9. Test Data Management

Reliable tests require reliable test data. The TeslaPrimeCapital test data strategy uses a layered approach: fixtures for static reference data, factories for dynamic test data generation, and seed scripts for integration and E2E test databases.

### Fixtures

Fixtures are defined in TypeScript files organized by domain: `tests/fixtures/users.ts`, `tests/fixtures/plans.ts`, `tests/fixtures/transactions.ts`, `tests/fixtures/kyc.ts`. Fixtures contain static, unchanging reference data — for example, the list of available investment plans, valid country codes for KYC, or supported cryptocurrencies for deposits. Fixtures are imported directly into test files and provide consistent, known values.

### Factories

Factories are functions that create test data objects with sensible defaults and allow arbitrary field overrides. Factories use the builder pattern:

```text
createUser({ email: 'admin@test.com', role: 'ADMIN' })
```

This creates a user object with all required fields populated (default name, password hash, KYC status, etc.) while overriding the specified fields. Factories are defined in `tests/factories/` and organized by entity type. They do NOT write to the database — they return plain objects that can be used in unit tests or passed to repository/create functions in integration tests.

### Seed Data

The test database is populated with a consistent seed dataset that provides the baseline state for all integration and E2E tests. The seed script (`prisma/seed-test.ts`) creates:

- A set of predefined users with known roles, KYC statuses, balances, and referral relationships.
- All active investment plans with defined return rates, min/max amounts, and durations.
- A set of historical transactions covering various states (pending, completed, failed, reversed).
- KYC documents in various review states.

The seed data is designed to cover common test scenarios so that individual tests do not need to set up complex prerequisite states from scratch.

### Test Database

The test database is a separate PostgreSQL database (e.g., `teslaprime_test`) that is never used for development or staging. It is identified by the `DATABASE_URL` in `.env.test`. Before each test suite, all tables are truncated in the correct dependency order (child tables first, then parent tables) and the seed script is re-executed. This ensures complete isolation between test suites.

### Environment Configuration

Test-specific environment variables are stored in `.env.test` (never committed to version control — the template is `.env.test.example`). This file contains:

- `DATABASE_URL`: Connection string for the test PostgreSQL database.
- `REDIS_URL`: Connection string for the test Redis instance (or a separate database number).
- `JWT_SECRET`: A fixed test secret for predictable token generation.
- `ENCRYPTION_KEY`: A fixed test key for encrypting sensitive test data.

---

## 10. CI/CD Testing Pipeline

The CI/CD pipeline enforces the testing discipline described in this document. Every stage acts as a quality gate — failure at any stage blocks progress to the next.

### Pre-Commit Hooks (Local)

Developers run the following checks locally before committing. These are enforced via Husky + lint-staged:

- **ESLint:** Run ESLint on all staged files. Zero errors allowed. Warnings are reported but do not block the commit (configurable).
- **TypeScript type check:** Run `tsc --noEmit` to verify that there are no type errors anywhere in the codebase. This catches type mismatches that ESLint may miss.
- **Prettier:** Run Prettier in check mode (`--check`) to verify formatting. Files that are not properly formatted cause the hook to fail. Developers run `prettier --write` to auto-fix.

These hooks prevent obviously broken code from entering the repository and give developers immediate feedback.

### Pull Request Pipeline

Every PR triggers the following CI pipeline:

1. **Install dependencies:** `npm ci` with frozen lockfile.
2. **Lint, type-check, format-check:** Same as pre-commit, but run on the full codebase to catch any issues that were introduced by files not covered in the pre-commit hook.
3. **Unit tests:** `vitest run --coverage` on the full test suite. Tests run in parallel across available CI cores. Coverage data is collected and uploaded.
4. **Integration tests:** `vitest run --config vitest.config.integration.ts`. These tests start the test database, run migrations, seed data, execute tests, and shut down.
5. **Build verification:** `next build` to verify that the application compiles successfully. This catches import errors, missing environment variables, and other build-time issues.
6. **Coverage gate:** The PR must not decrease overall line coverage by more than 0.5%. If it does, the pipeline fails and the PR author must add tests for the uncovered code.

### Nightly Pipeline

The nightly pipeline runs at a scheduled time (e.g., 02:00 UTC) and includes:

1. **All PR pipeline steps** (unit, integration, build).
2. **E2E tests:** Playwright suite against the staging environment. Tests run across Chromium, Firefox, and WebKit.
3. **Security scan:** Run dependency vulnerability scanning (e.g., `npm audit --audit-level=high`) and static analysis security tools (SAST).
4. **Coverage trend report:** Generate and publish a coverage trend report comparing current coverage to the previous week. Degrading trends trigger alerts.

### Pre-Deployment Pipeline

Before any deployment to production (including staging), the following additional checks run:

1. **Full test suite:** Unit, integration, and E2E tests all pass.
2. **Database migration validation:** Run `prisma migrate diff` to verify that the migration is non-destructive and that no data loss will occur. Run `prisma migrate deploy` against a staging database clone to verify the migration applies cleanly.
3. **Smoke tests:** Deploy to staging and run a minimal set of smoke tests (health check, login, dashboard load) to verify the deployment is functional.

---

## 11. Test Organization

Tests are organized in a dedicated `tests/` directory that mirrors the source code structure. This makes it easy to locate tests for any given module and maintains a clear separation between production code and test code.

### Directory Structure

```text
tests/
  unit/
    auth/
      auth.service.test.ts
      password.util.test.ts
    wallet/
      wallet.service.test.ts
      fee.calculator.test.ts
    investment/
      investment.service.test.ts
      return.calculator.test.ts
    referral/
      referral.service.test.ts
      binary.tree.test.ts
    utils/
      formatters.test.ts
      validators.test.ts
  integration/
    api/
      auth.test.ts
      deposits.test.ts
      investments.test.ts
      withdrawals.test.ts
      admin.test.ts
    services/
      kyc.service.test.ts
      notification.service.test.ts
  e2e/
    auth/
      registration.spec.ts
      login.spec.ts
      email-verification.spec.ts
    deposits/
      crypto-deposit.spec.ts
      gift-card-deposit.spec.ts
    investments/
      plan-selection.spec.ts
      fund-investment.spec.ts
    withdrawals/
      request-withdrawal.spec.ts
    admin/
      kyc-review.spec.ts
      withdrawal-approval.spec.ts
    misc/
      referral-flow.spec.ts
      demo-live-toggle.spec.ts
  fixtures/
    users.ts
    plans.ts
    transactions.ts
  factories/
    user.factory.ts
    transaction.factory.ts
    investment.factory.ts
  utils/
    setup.ts                    # Global test setup (MSW, DB connection)
    auth.helper.ts              # Generate test JWTs, create authenticated users
    db.helper.ts                # Database truncation and seeding utilities
    request.helper.ts           # Supertest app instance with test configuration
  e2e/
    pages/                      # Page Object Model classes
      dashboard.page.ts
      login.page.ts
      deposit.page.ts
      investment.page.ts
    fixtures/                   # E2E-specific test data
```

### Shared Test Utilities

The `tests/utils/` directory contains reusable helper modules:

- **setup.ts:** Global Vitest setup file (referenced in `vitest.config.ts`). Initializes MSW service worker, sets up test database connection, configures test timeouts.
- **auth.helper.ts:** Functions to generate valid/invalid/expired JWTs for testing, create pre-authenticated Supertest requests, and set up users with specific roles.
- **db.helper.ts:** Functions to truncate all database tables, run the seed script, and create/destroy test data within a transaction that rolls back after the test.
- **request.helper.ts:** Exports a configured Supertest agent with the Express app, test database, and any necessary middleware overrides.

### Configuration Files

- **vitest.config.ts:** Configures Vitest with path aliases, coverage settings, test environment (jsdom for unit/component tests, node for integration tests), and setup files.
- **playwright.config.ts:** Configures Playwright with base URL (staging), browser projects (Chromium, Firefox, WebKit), timeouts, retries, and reporter settings.

---

## 12. Coverage Requirements

Code coverage is a quantitative measure of test thoroughness, but it is not a sufficient measure of test quality. A project can have 100% coverage with trivial tests that assert nothing meaningful. TeslaPrimeCapital uses coverage as a **minimum threshold**, not a target — the real measure of test quality is the behavioral coverage (are all important behaviors tested?) and the failure detection rate (do tests catch real bugs?).

### Coverage Targets by Module

| Module Category               | Line Coverage | Branch Coverage | Notes                                              |
|-------------------------------|---------------|-----------------|----------------------------------------------------|
| **Overall project**           | ≥ 80%         | ≥ 80%           | Minimum bar for the entire codebase                |
| **Financial modules**         | ≥ 90%         | ≥ 90%           | Wallet, transaction, investment, referral services |
| **Authentication & auth**     | ≥ 90%         | ≥ 90%           | Login, registration, JWT, 2FA, session management  |
| **API controllers & routes**  | ≥ 85%         | ≥ 85%           | Request handling, response serialization            |
| **Service layer (general)**   | ≥ 85%         | ≥ 85%           | Business logic, orchestration, validation          |
| **Utility functions**         | ≥ 95%         | ≥ 95%           | Pure functions — easy to test, no excuses          |
| **UI components**             | ≥ 70%         | ≥ 70%           | Component rendering, interactions, state           |
| **Page components**           | ≥ 60%         | ≥ 60%           | Complex pages — mostly validated via E2E tests     |

### Coverage Collection and Reporting

- Coverage is collected using `@vitest/coverage-v8` (the V8 engine built into Node.js) on every CI run, including PR pipelines and nightly builds.
- Coverage reports are generated in three formats: terminal summary (visible in CI logs), HTML report (archived as a CI artifact and downloadable), and JSON report (for trend tracking).
- Coverage data from the nightly build is stored historically. A weekly trend report compares current coverage to the previous four weeks and flags any module with a declining trend.

### Coverage Gates in CI

- **PR pipeline:** The overall line coverage must not decrease by more than 0.5% compared to the `main` branch. If it does, the PR pipeline fails with a clear message indicating the regression.
- **Nightly pipeline:** Every module must meet its minimum coverage target. If any module falls below its target, a Slack/Teams alert is sent to the engineering channel with the specific module and the shortfall amount.
- **New code requirement:** Any new file or significant new function introduced in a PR must have accompanying tests that cover the new code. Files with 0% coverage that are not explicitly excluded (via `// @coverage-ignore` with a comment explaining why) will block the PR.

### Exclusions

Certain files are excluded from coverage tracking because testing them provides no meaningful value:

- Configuration files (`next.config.js`, `tailwind.config.ts`, `postcss.config.js`).
- Type definition files (`.d.ts` files with only type exports).
- Prisma schema and generated client code (`prisma/` directory).
- Test files themselves (`tests/` directory).
- Migration files (`prisma/migrations/`).
- Static assets and public files.

Exclusions are configured in `vitest.config.ts` under the `coverage.exclude` array. Any additional exclusion must be justified in a code review comment and approved by a tech lead.

### Coverage as a Habit

Coverage is not something to optimize for at the end of a sprint. It is a continuous practice. Developers are expected to write tests as they write code — not after. The pre-commit hooks and PR pipeline ensure that coverage never degrades, and the nightly pipeline provides visibility into long-term trends. When coverage drops, it is treated as a technical debt item and addressed in the next sprint planning session.