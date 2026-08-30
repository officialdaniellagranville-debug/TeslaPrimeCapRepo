# TeslaPrimeCapital — Phase 2: File Structure & Technical Architecture Specification

> **Document Type:** Technical Architecture — File Structure
> **Phase:** 2 — Managed Investment Plan Platform
> **Version:** 1.0.0
> **Last Updated:** 2025-01-01
> **Status:** Final

---

## Table of Contents

1. [Monorepo Structure Overview](#1-monorepo-structure-overview)
2. [Root Configuration Files](#2-root-configuration-files)
3. [Frontend Package Structure](#3-frontend-package-structure)
4. [Backend Package Structure](#4-backend-package-structure)
5. [Worker Package Structure](#5-worker-package-structure)
6. [Shared Package Structure](#6-shared-package-structure)
7. [Docker Configuration](#7-docker-configuration)
8. [Environment Variable Documentation](#8-environment-variable-documentation)
9. [Import Conventions](#9-import-conventions)
10. [Naming Conventions](#10-naming-conventions)
11. [Dependency Management](#11-dependency-management)

---

## 1. Monorepo Structure Overview

### 1.1 Why a Monorepo

TeslaPrimeCapital adopts a monorepo architecture managed with **pnpm workspaces** because the project consists of three tightly coupled deployable units (frontend, backend API, background worker) that share TypeScript types, validation schemas, constants, and business-domain knowledge. A monorepo ensures that a single `pnpm install` at the repository root hydrates all workspace dependencies atomically, eliminating version skew between the shared package and its consumers. Cross-cutting changes — for example, adding a new investment plan enum to `packages/shared` and immediately consuming it in the backend controller and the frontend dropdown — are performed in a single commit, which simplifies code review, refactoring, and release management. The alternative (separate repositories with published npm packages) would introduce coordination overhead that is unnecessary at this project scale and deployment cadence. Additionally, the monorepo structure allows Turborepo to cache build artifacts across packages, dramatically reducing CI build times by only rebuilding packages whose dependencies have changed.

### 1.2 Workspace Package Names

| Workspace Path | Package Name | Description |
|---|---|---|
| `apps/web` | `@teslaprime/web` | Next.js 16 frontend (App Router) |
| `apps/api` | `@teslaprime/api` | Node.js REST API (Express/Fastify) |
| `apps/worker` | `@teslaprime/worker` | BullMQ background job processors |
| `packages/shared` | `@teslaprime/shared` | Shared types, constants, schemas |

### 1.3 Dependency Relationships

```
@teslaprime/web    ──depends-on──>  @teslaprime/shared
@teslaprime/api    ──depends-on──>  @teslaprime/shared
@teslaprime/worker ──depends-on──>  @teslaprime/shared
@teslaprime/worker ──depends-on──>  @teslaprime/api  (imports services/repositories)
```

The worker package depends on the API package's service and repository layers to reuse business logic (e.g., the withdrawal processing service) without duplication. The shared package has **zero** workspace dependencies — it is a leaf node that only uses external npm packages (`zod`, `date-fns`). This directed acyclic graph (DAG) prevents circular workspace dependencies. Turborepo uses this dependency graph to determine parallelizable builds and correct topological build order.

### 1.4 Top-Level Directory Tree

```
tesla-prime-capital/
├── apps/
│   ├── web/                          # Frontend - Next.js 16 (App Router)
│   ├── api/                          # Backend REST API (Express/Fastify)
│   └── worker/                       # Background job processors (BullMQ)
├── packages/
│   └── shared/                       # Shared types, constants, schemas
├── docker/
│   ├── web.Dockerfile
│   ├── api.Dockerfile
│   ├── worker.Dockerfile
│   └── .dockerignore
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── deploy.yml
├── docs/
│   ├── phase1-docs/
│   └── phase2-docs/
├── scripts/
│   ├── seed-db.sh
│   ├── generate-types.sh
│   └── run-migrations.sh
├── .nvmrc
├── .gitignore
├── .prettierrc
├── .eslintrc.js
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── turbo.json
└── docker-compose.yml
```

The root-level `package.json` acts as the workspace anchor. It contains no application code — only scripts that delegate to workspace packages (e.g., `"dev:web": "pnpm --filter @teslaprime/web dev"`), shared dev dependencies (`typescript`, `eslint`, `prettier`, `turbo`), and the `pnpm-workspace.yaml` pointer configuration. The `docker/` directory at root level centralizes all Dockerfiles, making container build context paths cleaner. The `scripts/` directory holds operational scripts used during development and deployment. The `.github/workflows/` directory contains GitHub Actions CI/CD pipeline definitions for automated testing, linting, type-checking, and deployment via Coolify webhooks.

---

## 2. Root Configuration Files

### 2.1 `package.json` (Root)

The root `package.json` serves as the monorepo manifest. It declares the project name as `tesla-prime-capital`, sets `private: true` to prevent accidental npm publication, and defines workspace scripts that serve as the single entry point for all development commands. Key scripts include `dev` (starts all services via turbo in parallel), `build` (builds all packages in dependency order), `lint` (runs eslint across all workspaces), `format` (runs prettier with --write across all workspaces), `format:check` (runs prettier in check mode for CI), `test` (runs vitest across all workspaces), `test:ci` (runs tests with coverage and no watch mode), `db:generate` (prisma generate in the api workspace), `db:migrate` (prisma migrate deploy against the target database), `db:migrate:dev` (prisma migrate dev for local development), `db:seed` (executes the prisma seed script), `db:studio` (opens Prisma Studio), and `docker:up` / `docker:down` for local Docker Compose orchestration. The `devDependencies` at root level include `typescript@^5.6.0`, `eslint@^9.0.0`, `prettier@^3.4.0`, `turbo@^2.3.0`, `@types/node@^22.0.0`, `vitest@^2.1.0`, and `@typescript-eslint/eslint-plugin@^8.0.0`. These are hoisted and shared by all workspace packages to ensure exact version consistency. The `engines` field specifies `"node": ">=22.0.0"` and `"pnpm": ">=9.0.0"` to enforce minimum tooling versions.

### 2.2 `pnpm-workspace.yaml`

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

This is the sole configuration that tells pnpm which directories to treat as workspace packages. The glob patterns `apps/*` and `packages/*` are scanned recursively for directories containing a `package.json`. When `pnpm install` is run at the root, pnpm resolves inter-workspace dependencies using the `workspace:*` protocol, symlinks them into each package's `node_modules`, and hoists common dependencies to the root `node_modules` for deduplication. This results in significantly faster installs and lower disk usage compared to npm or yarn workspaces. The `catalog` feature of pnpm may also be leveraged in the future to centralize dependency version management across all workspaces.

### 2.3 `tsconfig.base.json`

The base TypeScript configuration is inherited by all workspace packages via the `extends` field. It sets `strict: true` (enabling all strict type-checking options), `target: "ES2022"` (aligning with Node.js 22 baseline), `module: "ESNext"`, `moduleResolution: "bundler"` (optimized for modern bundlers like webpack/turbopack), `esModuleInterop: true`, `skipLibCheck: true` (improves build speed by skipping type checking of declaration files), `forceConsistentCasingInFileNames: true`, `resolveJsonModule: true`, `isolatedModules: true` (required by certain bundlers), and `declaration: true` (emits .d.ts files for the shared package). Path aliases are intentionally **not** defined here - each workspace defines its own aliases in its local `tsconfig.json` that extends this base, avoiding conflicting path mappings.

### 2.4 `turbo.json`

Turbo is used as the monorepo build orchestrator. The `turbo.json` defines pipelines for `build`, `dev`, `lint`, `test`, and `type-check` tasks. The `build` pipeline specifies `dependsOn: ["^build"]` ensuring packages are built in topological order (shared before api before worker before web). The `#build` cacheable subset includes `outputs: ["dist/**", ".next/**", ".prisma/client/**"]`. The `dev` pipeline uses `persistent: true` and `cache: false` since dev servers are long-running processes. Input glob patterns include `**/*.ts`, `**/*.tsx`, `**/*.json` for cache invalidation. Environment variables that affect build output (e.g., `NODE_ENV`, `DATABASE_URL`) are listed in the `env` array. The `globalDependencies` array includes `tsconfig.base.json` and `.eslintrc.js` so that changes to shared configuration invalidate all package caches.

### 2.5 `.eslintrc.js`

The root ESLint configuration extends `eslint:recommended`, `plugin:@typescript-eslint/recommended`, and `prettier`. It sets the parser to `@typescript-eslint/parser` and defines rules: `@typescript-eslint/no-unused-vars: ["error", { argsIgnorePattern: "^_" }]`, `@typescript-eslint/no-explicit-any: "error"`, `@typescript-eslint/consistent-type-imports: "error"`, `@typescript-eslint/no-unused-expressions: "error"`, and `no-console: ["warn", { allow: ["warn", "error"] }]`. Each workspace can override rules with its own `.eslintrc.js`. The web workspace additionally extends `next/core-web-vitals` for Next.js-specific linting rules.

### 2.6 `.prettierrc`

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "arrowParens": "always",
  "endOfLine": "lf",
  "bracketSpacing": true,
  "jsxSingleQuote": false
}
```

All workspaces share this Prettier configuration without override. The `printWidth` of 100 accommodates TypeScript type annotations without excessive wrapping. The `trailingComma: "all"` ensures cleaner git diffs when items are appended to arrays or objects.

### 2.7 `docker-compose.yml`

Defined at root level for local development, orchestrating five services: `web` (Next.js:3000), `api` (Node.js:4000), `worker`, `postgres` (PostgreSQL 16:5432 with named volume `pgdata`), and `redis` (Redis 7:6379 with named volume `redisdata`). All application services share an `app-network` bridge network. Postgres health check: `pg_isready -U $POSTGRES_USER -d $POSTGRES_DB`. Redis health check: `redis-cli ping`. The `api` and `worker` declare `depends_on` with `condition: service_healthy`. Environment files are referenced per service (`.env.web`, `.env.api`, `.env.worker`). Restart policy: `unless-stopped`. Detailed Docker configuration is covered in Section 7.

### 2.8 `.env.example`

Documents every environment variable across all services in a single file. Organized into commented sections: `# -- Shared --`, `# -- Database --`, `# -- Redis --`, `# -- Frontend --`, `# -- Backend API --`, `# -- Worker --`. Each variable includes a descriptive comment, placeholder value, and required/optional indication. Committed to version control; actual `.env` files are gitignored.

### 2.9 `.gitignore`

Covers: `node_modules/`, `dist/`, `.next/`, `build/`, `.turbo/`, `*.log`, `.env`, `.env.*.local`, `.DS_Store`, `.Thumbs.db`, `coverage/`, `.prisma/client/`, `docker/data/`, `.vercel/`, `.coolify/`, `.vscode/`, `.idea/`, `*.swp`, `*.swo`.

### 2.10 `.nvmrc`

```
22.12.0
```

Pins Node.js to 22.12.0 LTS. Docker images use `FROM node:22.12.0-alpine` for environment parity between local development, CI, and production.

---

## 3. Frontend Package Structure (apps/web)

The frontend is a Next.js 16 application using the App Router paradigm with React Server Components as the default rendering model. Client interactivity is opted into via `"use client"` directives on leaf components only. Tailwind CSS 4 with the shadcn/ui component library provides the design system. The directory structure follows a domain-driven organization with route groups that segregate access control boundaries without affecting URL paths.

### 3.1 Full Directory Tree

```
apps/web/
├── public/
│   ├── favicon.ico
│   ├── robots.txt
│   ├── sitemap.xml
│   ├── og-image.png
│   └── images/
│       ├── logo.svg
│       ├── logo-dark.svg
│       ├── hero-illustration.svg
│       └── placeholders/
│           ├── plan-card.png
│           └── avatar-fallback.png
├── app/
│   ├── layout.tsx                          # Root layout (fonts, providers, shell)
│   ├── loading.tsx                         # Root loading spinner
│   ├── not-found.tsx                       # Global 404 page
│   ├── error.tsx                           # Global error boundary
│   ├── globals.css                         # Tailwind directives + CSS vars
│   ├── (public)/
│   │   ├── layout.tsx                      # Public layout (marketing nav, footer)
│   │   ├── page.tsx                        # Homepage
│   │   ├── about/page.tsx
│   │   ├── plans/page.tsx
│   │   ├── pricing/page.tsx
│   │   ├── faq/page.tsx
│   │   ├── contact/page.tsx
│   │   ├── terms/page.tsx
│   │   ├── privacy/page.tsx
│   │   └── blog/
│   │       ├── page.tsx
│   │       └── [slug]/page.tsx
│   ├── (auth)/
│   │   ├── layout.tsx                      # Auth layout (centered card)
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   ├── forgot-password/page.tsx
│   │   ├── reset-password/page.tsx
│   │   ├── verify-email/page.tsx
│   │   └── two-factor/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx                      # Dashboard layout (sidebar, topbar)
│   │   ├── page.tsx                        # Dashboard overview
│   │   ├── profile/page.tsx
│   │   ├── security/
│   │   │   ├── page.tsx
│   │   │   └── change-password/page.tsx
│   │   ├── wallet/
│   │   │   ├── page.tsx
│   │   │   ├── deposit/page.tsx
│   │   │   └── withdraw/page.tsx
│   │   ├── investments/
│   │   │   ├── page.tsx
│   │   │   ├── [id]/page.tsx
│   │   │   ├── invest/page.tsx
│   │   │   └── history/page.tsx
│   │   ├── kyc/page.tsx
│   │   ├── referrals/
│   │   │   ├── page.tsx
│   │   │   └── earnings/page.tsx
│   │   ├── notifications/page.tsx
│   │   ├── support/
│   │   │   ├── page.tsx
│   │   │   ├── new/page.tsx
│   │   │   └── [id]/page.tsx
│   │   └── transactions/page.tsx
│   └── (admin)/
│       ├── layout.tsx                      # Admin layout (admin sidebar)
│       ├── page.tsx                        # Admin dashboard
│       ├── users/
│       │   ├── page.tsx
│       │   └── [id]/page.tsx
│       ├── investments/
│       │   ├── page.tsx
│       │   └── plans/
│       │       ├── page.tsx
│       │       └── new/page.tsx
│       ├── deposits/page.tsx
│       ├── withdrawals/page.tsx
│       ├── kyc/page.tsx
│       ├── referrals/page.tsx
│       ├── support/
│       │   ├── page.tsx
│       │   └── [id]/page.tsx
│       ├── notifications/page.tsx
│       ├── reports/
│       │   ├── page.tsx
│       │   └── [reportId]/page.tsx
│       ├── settings/page.tsx
│       └── audit-log/page.tsx
├── components/
│   ├── ui/                                 # Primitive UI components (shadcn/ui)
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── select.tsx
│   │   ├── textarea.tsx
│   │   ├── dialog.tsx
│   │   ├── sheet.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── table.tsx
│   │   ├── badge.tsx
│   │   ├── card.tsx
│   │   ├── avatar.tsx
│   │   ├── tabs.tsx
│   │   ├── toast.tsx
│   │   ├── toaster.tsx
│   │   ├── use-toast.ts
│   │   ├── skeleton.tsx
│   │   ├── switch.tsx
│   │   ├── progress.tsx
│   │   ├── separator.tsx
│   │   ├── tooltip.tsx
│   │   ├── alert.tsx
│   │   ├── accordion.tsx
│   │   ├── breadcrumb.tsx
│   │   ├── pagination.tsx
│   │   ├── data-table.tsx                   # Reusable table (sort, filter)
│   │   ├── form.tsx                         # RHF + Zod integration
│   │   ├── chart.tsx                        # Recharts wrapper
│   │   ├── file-upload.tsx                  # File upload (Cloudinary)
│   │   ├── loading-spinner.tsx
│   │   ├── empty-state.tsx
│   │   └── index.ts
│   ├── layout/
│   │   ├── public-header.tsx
│   │   ├── public-footer.tsx
│   │   ├── dashboard-sidebar.tsx
│   │   ├── dashboard-topbar.tsx
│   │   ├── admin-sidebar.tsx
│   │   ├── admin-topbar.tsx
│   │   ├── mobile-nav.tsx
│   │   ├── page-header.tsx
│   │   └── index.ts
│   ├── auth/
│   │   ├── login-form.tsx
│   │   ├── register-form.tsx
│   │   ├── forgot-password-form.tsx
│   │   ├── reset-password-form.tsx
│   │   ├── two-factor-form.tsx
│   │   ├── social-login-buttons.tsx
│   │   └── index.ts
│   ├── wallet/
│   │   ├── wallet-balance-card.tsx
│   │   ├── wallet-activity-list.tsx
│   │   ├── deposit-form.tsx
│   │   ├── deposit-method-selector.tsx
│   │   ├── withdrawal-form.tsx
│   │   ├── withdrawal-bank-form.tsx
│   │   ├── withdrawal-crypto-form.tsx
│   │   └── index.ts
│   ├── investments/
│   │   ├── plan-card.tsx
│   │   ├── plan-comparison-table.tsx
│   │   ├── invest-form.tsx
│   │   ├── investment-card.tsx
│   │   ├── investment-detail-header.tsx
│   │   ├── investment-progress-chart.tsx
│   │   ├── investment-earnings-table.tsx
│   │   ├── active-investments-list.tsx
│   │   └── index.ts
│   ├── deposits/
│   │   ├── deposit-history-table.tsx
│   │   ├── deposit-status-badge.tsx
│   │   ├── deposit-confirmation-card.tsx
│   │   └── index.ts
│   ├── withdrawals/
│   │   ├── withdrawal-history-table.tsx
│   │   ├── withdrawal-status-badge.tsx
│   │   └── index.ts
│   ├── referrals/
│   │   ├── referral-link-card.tsx
│   │   ├── referral-stats-cards.tsx
│   │   ├── referral-earnings-table.tsx
│   │   ├── referral-tree-view.tsx
│   │   └── index.ts
│   ├── kyc/
│   │   ├── kyc-status-card.tsx
│   │   ├── kyc-upload-form.tsx
│   │   ├── kyc-document-preview.tsx
│   │   ├── kyc-review-panel.tsx
│   │   └── index.ts
│   ├── notifications/
│   │   ├── notification-bell.tsx
│   │   ├── notification-dropdown.tsx
│   │   ├── notification-list.tsx
│   │   ├── notification-item.tsx
│   │   └── index.ts
│   ├── support/
│   │   ├── ticket-form.tsx
│   │   ├── ticket-list.tsx
│   │   ├── ticket-detail.tsx
│   │   ├── ticket-message.tsx
│   │   ├── ticket-status-badge.tsx
│   │   └── index.ts
│   ├── admin/
│   │   ├── user-table-filters.tsx
│   │   ├── user-detail-panel.tsx
│   │   ├── plan-editor-form.tsx
│   │   ├── deposit-approval-row.tsx
│   │   ├── withdrawal-approval-row.tsx
│   │   ├── kyc-verification-row.tsx
│   │   ├── metric-card.tsx
│   │   ├── revenue-chart.tsx
│   │   ├── broadcast-form.tsx
│   │   ├── system-settings-form.tsx
│   │   └── index.ts
│   └── shared/                              # Cross-domain composites
│       ├── confirm-dialog.tsx
│       ├── amount-input.tsx
│       ├── date-range-picker.tsx
│       ├── search-input.tsx
│       ├── status-pill.tsx
│       ├── copy-button.tsx
│       └── index.ts
├── hooks/
│   ├── auth/
│   │   ├── use-login.ts
│   │   ├── use-register.ts
│   │   ├── use-forgot-password.ts
│   │   ├── use-reset-password.ts
│   │   ├── use-current-user.ts
│   │   ├── use-logout.ts
│   │   └── index.ts
│   ├── wallet/
│   │   ├── use-wallet-balance.ts
│   │   ├── use-initiate-deposit.ts
│   │   ├── use-initiate-withdrawal.ts
│   │   ├── use-wallet-transactions.ts
│   │   └── index.ts
│   ├── investments/
│   │   ├── use-plans.ts
│   │   ├── use-create-investment.ts
│   │   ├── use-active-investments.ts
│   │   ├── use-investment-detail.ts
│   │   ├── use-investment-history.ts
│   │   └── index.ts
│   ├── deposits/
│   │   ├── use-deposits.ts
│   │   ├── use-upload-proof.ts
│   │   └── index.ts
│   ├── withdrawals/
│   │   ├── use-withdrawals.ts
│   │   └── index.ts
│   ├── referrals/
│   │   ├── use-referral-stats.ts
│   │   ├── use-referral-earnings.ts
│   │   └── index.ts
│   ├── kyc/
│   │   ├── use-kyc-status.ts
│   │   ├── use-submit-kyc.ts
│   │   └── index.ts
│   ├── notifications/
│   │   ├── use-notifications.ts
│   │   ├── use-mark-read.ts
│   │   └── index.ts
│   ├── support/
│   │   ├── use-tickets.ts
│   │   ├── use-create-ticket.ts
│   │   ├── use-ticket-messages.ts
│   │   └── index.ts
│   ├── admin/
│   │   ├── use-admin-users.ts
│   │   ├── use-admin-investments.ts
│   │   ├── use-admin-deposits.ts
│   │   ├── use-admin-withdrawals.ts
│   │   ├── use-admin-kyc-queue.ts
│   │   ├── use-admin-metrics.ts
│   │   ├── use-admin-reports.ts
│   │   └── index.ts
│   └── common/
│       ├── use-debounce.ts
│       ├── use-media-query.ts
│       ├── use-local-storage.ts
│       ├── use-countdown.ts
│       └── index.ts
├── lib/
│   ├── api-client.ts                       # Axios/fetch wrapper with auth
│   ├── auth.ts                             # Token management (get/set JWT)
│   ├── formatters.ts                       # Currency, date, percentage fmt
│   ├── validators.ts                       # Frontend-only validation helpers
│   ├── query-client.ts                     # TanStack Query client config
│   └── utils.ts                            # General utilities (cn helper, etc.)
├── types/
│   ├── api.ts                              # API response type wrappers
│   ├── auth.ts                             # Auth-related frontend types
│   ├── wallet.ts                           # Wallet/frontend DTO types
│   ├── investment.ts                       # Investment display types
│   └── index.ts
├── styles/                                 # Reserved for global CSS overrides
├── providers/
│   ├── auth-provider.tsx                   # Auth context provider
│   ├── query-provider.tsx                  # TanStack Query provider
│   ├── toast-provider.tsx                  # Sonner/Toast provider
│   └── theme-provider.tsx                  # Dark/light mode provider
├── next.config.ts
├── tailwind.config.ts
├── postcss.config.js
├── tsconfig.json
├── vitest.config.ts
├── .eslintrc.js
├── .prettierrc
└── package.json
```

### 3.2 Key Frontend Files Explained

The `app/layout.tsx` is the root layout that wraps every page. It imports Google Fonts (Inter for body text, a display font for headings), wraps children in the `ThemeProvider`, `QueryProvider`, `AuthProvider`, and `ToastProvider`, and renders the `<html>` and `<body>` tags. Route group layouts - `(public)/layout.tsx`, `(auth)/layout.tsx`, `(dashboard)/layout.tsx`, `(admin)/layout.tsx` - each apply their own navigation shell without affecting the URL structure. The `(dashboard)/layout.tsx` includes session checks and renders the sidebar/topbar chrome. The `(admin)/layout.tsx` additionally verifies the user has `ADMIN` or `SUPER_ADMIN` role and redirects unauthorized users.

The `lib/api-client.ts` creates a configured Axios (or native fetch wrapper) instance with a request interceptor that attaches the JWT from cookies/storage and a response interceptor that handles 401 responses by redirecting to login. It provides typed convenience methods (`get<T>`, `post<T>`, `put<T>`, `patch<T>`, `delete<T>`) that unwrap the API standard envelope `{ data, meta, message }`. The `lib/query-client.ts` creates a TanStack Query `QueryClient` with defaults: `staleTime: 60_000` (1 minute), `retry: 1`, `refetchOnWindowFocus: false`.

The `hooks/` directory follows a domain-mirroring convention. Each hook encapsulates a TanStack Query `useQuery` or `useMutation` call along with its loading/error states. For example, `use-active-investments.ts` returns `{ data: Investment[], isLoading, error, refetch }` by calling `useQuery` with the key `['investments', 'active']`. Mutation hooks like `use-create-investment.ts` wrap `useMutation` and include `onSuccess` callbacks that invalidate relevant query keys to trigger automatic refetching.

The `components/ui/` directory contains shadcn/ui-style primitive components. Each component is self-contained, accepts forwarded refs, uses `cva` (class-variance-authority) for variant management, and exports a named export alongside the default export. The `index.ts` barrel file re-exports all primitives for convenient imports like `import { Button, Card, Dialog } from '@/components/ui'`.

The `providers/` directory contains client-side context providers that wrap the application. `auth-provider.tsx` manages the user session state, exposes `user`, `isLoading`, and `login`/`logout` functions through React context, and periodically refreshes the JWT token before expiry. `query-provider.tsx` creates and provides the TanStack Query client. `theme-provider.tsx` manages dark/light/system theme preference using `next-themes`.

---

## 4. Backend Package Structure (apps/api)

The backend is a Node.js REST API built with Express (or Fastify as an alternative) following a strict layered architecture. Each domain module (auth, users, wallets, investments, deposits, withdrawals, referrals, kyc, notifications, support, admin) has its own route, controller, service, and repository files. This separation ensures that business logic in services can be reused by both the API routes and the worker package without crossing layer boundaries.

### 4.1 Full Directory Tree

```
apps/api/
├── src/
│   ├── index.ts                            # Entry point: create app, listen, shutdown
│   ├── app.ts                              # Express app factory (middleware, routes)
│   ├── routes/
│   │   ├── index.ts                        # Route aggregator
│   │   ├── auth.routes.ts
│   │   ├── user.routes.ts
│   │   ├── wallet.routes.ts
│   │   ├── investment.routes.ts
│   │   ├── deposit.routes.ts
│   │   ├── withdrawal.routes.ts
│   │   ├── referral.routes.ts
│   │   ├── kyc.routes.ts
│   │   ├── notification.routes.ts
│   │   ├── support.routes.ts
│   │   └── admin.routes.ts
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── user.controller.ts
│   │   ├── wallet.controller.ts
│   │   ├── investment.controller.ts
│   │   ├── deposit.controller.ts
│   │   ├── withdrawal.controller.ts
│   │   ├── referral.controller.ts
│   │   ├── kyc.controller.ts
│   │   ├── notification.controller.ts
│   │   ├── support.controller.ts
│   │   └── admin.controller.ts
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── user.service.ts
│   │   ├── wallet.service.ts
│   │   ├── investment.service.ts
│   │   ├── deposit.service.ts
│   │   ├── withdrawal.service.ts
│   │   ├── referral.service.ts
│   │   ├── kyc.service.ts
│   │   ├── notification.service.ts
│   │   ├── support.service.ts
│   │   ├── admin.service.ts
│   │   └── email.service.ts                # Centralized email dispatch
│   ├── repositories/
│   │   ├── base.repository.ts              # Generic CRUD base
│   │   ├── user.repository.ts
│   │   ├── wallet.repository.ts
│   │   ├── investment.repository.ts
│   │   ├── deposit.repository.ts
│   │   ├── withdrawal.repository.ts
│   │   ├── referral.repository.ts
│   │   ├── kyc.repository.ts
│   │   ├── notification.repository.ts
│   │   ├── support.repository.ts
│   │   └── transaction-log.repository.ts
│   ├── middleware/
│   │   ├── auth.middleware.ts               # JWT verification
│   │   ├── rbac.middleware.ts              # Role-based access control
│   │   ├── rate-limit.middleware.ts         # Rate limiting
│   │   ├── validate.middleware.ts           # Request validation (Zod)
│   │   ├── error-handler.middleware.ts      # Global error handler
│   │   ├── request-logger.middleware.ts     # HTTP request logging
│   │   └── cors.middleware.ts              # CORS configuration
│   ├── validators/
│   │   ├── auth.validator.ts
│   │   ├── user.validator.ts
│   │   ├── investment.validator.ts
│   │   ├── deposit.validator.ts
│   │   ├── withdrawal.validator.ts
│   │   ├── kyc.validator.ts
│   │   ├── support.validator.ts
│   │   └── admin.validator.ts
│   ├── utils/
│   │   ├── hash.ts                         # bcrypt/argon2 password hashing
│   │   ├── jwt.ts                          # JWT sign/verify helpers
│   │   ├── crypto.ts                       # Encryption/decryption utilities
│   │   ├── format-currency.ts              # Currency formatting
│   │   ├── date-utils.ts                   # Date arithmetic helpers
│   │   ├── id.ts                           # NanoID/UUID generation
│   │   ├── pagination.ts                   # Prisma skip/take calculator
│   │   └── response.ts                     # Standard API response envelope
│   ├── config/
│   │   ├── index.ts                        # Config aggregator
│   │   ├── env.ts                          # Zod-validated env variables
│   │   ├── database.ts                     # Prisma client singleton
│   │   ├── redis.ts                        # Redis client (ioredis)
│   │   └── queue.ts                        # BullMQ connection & queues
│   ├── jobs/
│   │   ├── index.ts                        # Job type registry
│   │   ├── email.job.ts                    # Email send job
│   │   ├── withdrawal-process.job.ts       # Withdrawal processing
│   │   ├── investment-maturity.job.ts      # Investment maturity payout
│   │   ├── cache-invalidation.job.ts       # Redis cache warm/invalidation
│   │   ├── report-generation.job.ts        # Report PDF/CSV generation
│   │   └── gift-card-verify.job.ts         # Gift card verification
│   ├── events/
│   │   ├── index.ts                        # Event emitter setup
│   │   ├── deposit-created.event.ts
│   │   ├── withdrawal-requested.event.ts
│   │   ├── investment-activated.event.ts
│   │   ├── investment-matured.event.ts
│   │   ├── kyc-submitted.event.ts
│   │   ├── kyc-approved.event.ts
│   │   ├── kyc-rejected.event.ts
│   │   ├── referral-commission-earned.event.ts
│   │   └── user-registered.event.ts
│   ├── email/
│   │   ├── index.ts                        # Email template registry
│   │   ├── welcome-email.tsx               # React Email template
│   │   ├── verify-email.tsx
│   │   ├── password-reset.tsx
│   │   ├── deposit-confirmed.tsx
│   │   ├── withdrawal-processed.tsx
│   │   ├── withdrawal-rejected.tsx
│   │   ├── investment-activated.tsx
│   │   ├── investment-matured.tsx
│   │   ├── kyc-approved-email.tsx
│   │   ├── kyc-rejected-email.tsx
│   │   ├── referral-bonus.tsx
│   │   ├── two-factor-enabled.tsx
│   │   ├── support-reply.tsx
│   │   └── email-layout.tsx                # Shared HTML wrapper
│   ├── integrations/
│   │   ├── cloudinary.ts                   # Cloudinary upload/transform
│   │   ├── resend.ts                       # Resend email provider
│   │   └── crypto-payment.ts               # Crypto payment gateway
│   └── types/
│       └── express.d.ts                    # Express request augmentation
├── prisma/
│   ├── schema.prisma                       # Full database schema
│   ├── migrations/                         # Migration SQL files
│   │   └── ...
│   └── seed.ts                             # Database seed script
├── tsconfig.json
├── vitest.config.ts
├── .eslintrc.js
├── .prettierrc
└── package.json
```

### 4.2 Backend Layer Responsibilities

**Routes** (`src/routes/`): Define HTTP endpoints, attach middleware chains (auth, validation, RBAC), and delegate to controllers. Each route file exports an `Express.Router` instance. The `routes/index.ts` aggregates all routers and mounts them under versioned prefixes (e.g., `/api/v1/auth`, `/api/v1/investments`). Route files contain no business logic — they are pure HTTP concern mapping.

**Controllers** (`src/controllers/`): Extract and validate request parameters (body, params, query), call the appropriate service method, and return a standardized HTTP response using the `response.ts` utility. Controllers handle HTTP-specific concerns like status codes, response formatting, and calling next() for the error handler. They translate between HTTP request/response and the service layer domain types.

**Services** (`src/services/`): Contain all business logic. A service method might orchestrate multiple repository calls, perform calculations (e.g., ROI computation, referral commission splitting), emit domain events, and enqueue background jobs. Services are designed to be framework-agnostic so they can be imported by the worker package without pulling in Express dependencies. Transaction boundaries are managed here using Prisma's `$transaction` API.

**Repositories** (`src/repositories/`): Encapsulate all database access through Prisma queries. The `base.repository.ts` provides generic CRUD methods (`findById`, `findAll`, `create`, `update`, `delete`) that domain repositories extend with specific query methods (e.g., `findActiveByUserId`, `countByStatusInDateRange`). Repositories return Prisma model instances or plain objects, never HTTP-specific types.

**Middleware** (`src/middleware/`): Seven middleware modules handle cross-cutting concerns. `auth.middleware.ts` verifies the JWT from the Authorization header, decodes the payload, attaches `req.user`, and calls `next()`. `rbac.middleware.ts` checks `req.user.role` against an array of allowed roles and returns 403 if unauthorized. `rate-limit.middleware.ts` applies per-IP or per-user rate limiting using Redis as the store. `validate.middleware.ts` takes a Zod schema and validates `req.body`, `req.params`, or `req.query`, returning 400 with detailed error messages on failure. `error-handler.middleware.ts` is the final middleware in the chain that catches all unhandled errors, logs them, and returns a sanitized error response.

**Events** (`src/events/`): Domain events use Node.js `EventEmitter` (or a dedicated emitter instance). Events are emitted by services after state changes (e.g., `eventEmitter.emit('deposit.created', deposit)`). Event listeners in the same process can react immediately — for example, the deposit-created listener enqueues an admin notification job and a user confirmation email job. This decouples the service from downstream side effects.

**Email** (`src/email/`): React Email templates are authored as `.tsx` components. Each template accepts typed props (e.g., `{ userName: string; amount: number; currency: string }`). The `email-layout.tsx` provides the shared HTML skeleton with header, footer, and styling. The `index.ts` registry maps template names to components and provides a `sendEmail(templateName, props, to)` function that renders the template to HTML and dispatches it via the Resend integration.

---

## 5. Worker Package Structure (apps/worker)

The worker package is a standalone Node.js process that connects to the same Redis instance as the API and processes jobs from BullMQ queues. It imports service and repository layers directly from `@teslaprime/api` to avoid duplicating business logic. The worker is designed to be horizontally scalable — multiple worker instances can run concurrently, and BullMQ handles job distribution and concurrency control.

### 5.1 Full Directory Tree

```
apps/worker/
├── src/
│   ├── index.ts                            # Entry point: start all workers
│   ├── processors/
│   │   ├── email.processor.ts              # Renders & sends emails via Resend
│   │   ├── withdrawal.processor.ts         # Processes withdrawal approvals
│   │   ├── investment-maturity.processor.ts # Calculates & credits ROI on maturity
│   │   ├── cache-invalidation.processor.ts  # Warms/invalidates Redis caches
│   │   ├── report-generation.processor.ts   # Generates PDF/CSV reports
│   │   └── gift-card-verify.processor.ts    # Verifies gift card codes
│   ├── queues.ts                           # BullMQ queue definitions & workers
│   └── utils/
│       ├── logger.ts                       # Winston/Pino logger config
│       └── graceful-shutdown.ts            # SIGTERM/SIGINT handler
├── tsconfig.json
├── vitest.config.ts
├── .eslintrc.js
├── .prettierrc
└── package.json
```

### 5.2 Worker Details

**Email Processor** (`email.processor.ts`): Consumes jobs from the `email` queue. Each job payload contains `{ templateName, props, to, subject }`. The processor imports the email template registry and Resend client from the API package, renders the React Email template to HTML, and sends it. Failed jobs are retried with exponential backoff (3 attempts, delays of 30s, 120s, 300s). Dead-lettered jobs are logged for manual investigation.

**Withdrawal Processor** (`withdrawal.processor.ts`): Processes withdrawals that have been approved by an admin. It verifies the user's wallet balance is sufficient, deducts the withdrawal amount (plus fees), records the transaction, enqueues a confirmation email, and updates the withdrawal status to `COMPLETED`. If the balance is insufficient or the crypto transfer fails, the status is set to `FAILED` and a notification email is sent. This processor handles external payment gateway interactions for crypto withdrawals.

**Investment Maturity Processor** (`investment-maturity.processor.ts`): Runs on a scheduled basis (cron via BullMQ repeatable jobs). It queries for investments that have reached their maturity date and calculates the final ROI payout including any compounding effects. It credits the user's wallet balance, updates the investment status to `MATURED`, records the payout as a transaction, enqueues a maturity notification email, and recalculates any referral commissions owed on the earnings.

**Cache Invalidation Processor** (`cache-invalidation.processor.ts`): Processes cache invalidation events. When data changes (e.g., a new deposit is confirmed), the API service emits an invalidation job specifying the cache key pattern. This processor deletes or refreshes the corresponding Redis cache entries. It also handles scheduled cache warming — pre-computing expensive queries (like admin dashboard aggregates) and storing them in Redis to keep API response times low.

**Report Generator Processor** (`report-generation.processor.ts`): Generates downloadable reports (PDF, CSV, XLSX) for admin users. Job payload specifies `{ reportType, dateRange, filters, requestedBy }`. The processor queries the database for the requested data, formats it using a reporting library, stores the result in Cloudinary or a local file store, and notifies the requesting admin via an in-app notification and email with a download link. Common report types include: user activity reports, financial summaries (deposits vs withdrawals), investment performance by plan, and referral tree reports.

**Gift Card Verification Processor** (`gift-card-verify.processor.ts`): Handles asynchronous verification of gift cards submitted as deposit proof. The processor calls the external gift card verification API, parses the response (balance, currency, validity), updates the deposit record with the verified amount, and if the verification is successful, auto-approves the deposit and credits the user's wallet. Failed verifications are flagged for manual review.

---

## 6. Shared Package Structure (packages/shared)

The shared package is the single source of truth for all cross-package TypeScript types, business constants, validation schemas, and pure utility functions. It has zero runtime dependencies on other workspace packages and minimal external dependencies (only `zod` for validation and `date-fns` for date utilities). The shared package is built (compiled to JavaScript) before the other packages so they can import from it.

### 6.1 Full Directory Tree

```
packages/shared/
├── src/
│   ├── index.ts                            # Main barrel export
│   ├── types/
│   │   ├── index.ts                        # Types barrel export
│   │   ├── api.types.ts                    # ApiResponse<T>, PaginatedResponse<T>, ApiError
│   │   ├── auth.types.ts                   # LoginPayload, RegisterPayload, TokenPayload, Session
│   │   ├── user.types.ts                   # User, UserProfile, UserAdminView
│   │   ├── wallet.types.ts                 # Wallet, WalletBalance, Transaction, TransactionType
│   │   ├── investment.types.ts             # Investment, InvestmentPlan, InvestmentStatus
│   │   ├── deposit.types.ts                # Deposit, DepositStatus, DepositMethod
│   │   ├── withdrawal.types.ts             # Withdrawal, WithdrawalStatus, WithdrawalMethod
│   │   ├── referral.types.ts               # Referral, ReferralEarning, ReferralStats
│   │   ├── kyc.types.ts                    # KYCSubmission, KYCDocument, KYCStatus, KYCLevel
│   │   ├── notification.types.ts           # Notification, NotificationType, NotificationPriority
│   │   ├── support.types.ts                # SupportTicket, TicketMessage, TicketStatus
│   │   └── admin.types.ts                  # AdminMetrics, SystemConfig, AuditLogEntry
│   ├── constants/
│   │   ├── index.ts                        # Constants barrel export
│   │   ├── roles.ts                        # UserRole enum, ROLE_HIERARCHY map
│   │   ├── kyc-levels.ts                   # KYC_LEVELS config (limits per level)
│   │   ├── plan-configs.ts                 # INVESTMENT_PLANS (name, min, max, ROI, duration)
│   │   ├── fees.ts                         # DEPOSIT_FEE, WITHDRAWAL_FEE, REFERRAL_COMMISSION
│   │   ├── currencies.ts                   # SUPPORTED_CURRENCIES, DEFAULT_CURRENCY
│   │   ├── limits.ts                       # MAX_DEPOSIT_DAILY, MAX_WITHDRAWAL_DAILY, etc.
│   │   ├── notifications.ts               # NOTIFICATION_TYPES, NOTIFICATION_CHANNELS
│   │   └── app.ts                          # APP_NAME, APP_URL, SUPPORT_EMAIL
│   ├── schemas/
│   │   ├── index.ts                        # Schemas barrel export
│   │   ├── auth.schema.ts                  # loginSchema, registerSchema, resetPasswordSchema
│   │   ├── user.schema.ts                  # updateUserSchema, changePasswordSchema
│   │   ├── investment.schema.ts            # createInvestmentSchema
│   │   ├── deposit.schema.ts               # createDepositSchema, uploadProofSchema
│   │   ├── withdrawal.schema.ts            # createWithdrawalSchema
│   │   ├── kyc.schema.ts                   # submitKycSchema
│   │   ├── support.schema.ts              # createTicketSchema, replyTicketSchema
│   │   └── pagination.schema.ts           # paginationSchema, sortSchema
│   └── utils/
│       ├── index.ts                        # Utils barrel export
│       ├── currency.ts                     # formatCurrency, parseCurrency, roundCurrency
│       ├── date.ts                         # formatDate, calculateMaturityDate, daysBetween
│       ├── percentage.ts                   # calculateROI, formatPercentage
│       ├── id.ts                           # isValidId, extractIdFromString
│       └── validation.ts                   # isValidEmail, isValidPhone, isStrongPassword
├── tsconfig.json
├── package.json
└── vitest.config.ts                        # Shared package also has unit tests
```

### 6.2 Shared Package Details

**Types** (`src/types/`): Every type is a TypeScript interface or type alias. The `api.types.ts` file defines the universal API response envelope: `ApiResponse<T>` with `{ success: boolean; data: T; message?: string; meta?: PaginationMeta }` and `PaginatedResponse<T>` extends this with `{ data: T[]; meta: { page: number; limit: number; total: number; totalPages: number } }`. Domain types mirror the Prisma models but are framework-agnostic — they do not include Prisma-specific types like `Prisma.UserInclude`. Enums are defined as TypeScript union types (e.g., `type InvestmentStatus = 'PENDING' | 'ACTIVE' | 'MATURED' | 'CANCELLED'`) for lightweight consumption without runtime overhead.

**Constants** (`src/constants/`): The `roles.ts` file exports the `UserRole` type as `'USER' | 'KYC_OFFICER' | 'ADMIN' | 'SUPER_ADMIN'` and a `ROLE_HIERARCHY` map where numeric values indicate privilege level (USER=0, KYC_OFFICER=1, ADMIN=2, SUPER_ADMIN=3), used by the RBAC middleware for role comparison. The `plan-configs.ts` exports an array of investment plan configurations that is consumed by both the backend (plan validation, ROI calculation) and the frontend (plan cards, comparison tables). The `fees.ts` centralizes all fee percentages so that changes propagate to both frontend display logic and backend calculation logic.

**Schemas** (`src/schemas/`): Zod validation schemas that are shared between the frontend (form validation with React Hook Form's `zodResolver`) and the backend (request validation middleware). For example, `createInvestmentSchema` validates that the `planId` is a valid UUID, the `amount` is a positive number within the plan's min/max range, and the user's wallet has sufficient balance. Schemas use `.refine()` and `.superRefine()` for cross-field validation. The `pagination.schema.ts` provides reusable schemas for `page`, `limit`, `sortBy`, and `sortOrder` query parameters used across all list endpoints.
