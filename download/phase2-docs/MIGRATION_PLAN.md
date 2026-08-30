# TeslaPrimeCapital — Migration Plan

> **Document Type:** Technical Architecture — Migration Strategy
> **Project:** TeslaPrimeCapital — Managed Investment Platform
> **Tech Stack:** Next.js 16, Node.js 22, PostgreSQL 16, Prisma ORM 6.x, Redis 7, Docker, Coolify
> **Status:** Greenfield Build — No Legacy System
> **Last Updated:** 2025-01-01

---

## Table of Contents

1. [Migration Overview](#1-migration-overview)
2. [Prisma Migration Strategy](#2-prisma-migration-strategy)
3. [Migration Workflow](#3-migration-workflow)
4. [Seed Data Strategy](#4-seed-data-strategy)
5. [Environment Migration](#5-environment-migration)
6. [Data Migration Procedures](#6-data-migration-procedures)
7. [Rollback Strategy](#7-rollback-strategy)
8. [Zero-Downtime Migration](#8-zero-downtime-migration)
9. [Migration Checklist](#9-migration-checklist)

---

## 1. Migration Overview

### 1.1 Greenfield Context

TeslaPrimeCapital is a fully greenfield project — there is no existing legacy system, no legacy database, and no historical user data to migrate from a previous platform. Every component of this system is being designed and built from scratch. Consequently, the term "migration" in the context of this project does **not** refer to the traditional concept of migrating data or business logic from an older system into a newer one. Instead, "migration" encompasses three distinct operational concerns that are critical to the project's lifecycle:

- **Database Schema Migrations (Prisma Migrate):** The iterative process of evolving the PostgreSQL 16 database schema over time as the application grows. Each new feature or modification to the data model results in a Prisma migration file that alters the database structure in a controlled, versioned, and repeatable manner.

- **Environment Configuration Migration (dev → staging → production):** The structured promotion of the application and its configuration through three distinct environments. Since the same codebase runs in every environment, configuration migration means ensuring that environment variables, database instances, Redis instances, and external service integrations are correctly provisioned and configured at each stage.

- **Data Seeding for Initial Deployment:** The process of populating each environment's database with the initial reference data required for the application to function. This includes investment plans, role-based access control definitions, platform settings, and system configuration records.

### 1.2 Scope and Exclusions

There is no legacy data migration requirement. No ETL pipelines are needed to pull data from a prior system. No data cleansing, deduplication, or historical record reconciliation is in scope for the initial deployment. The data migration procedures documented in Section 6 are forward-looking — they establish the framework and conventions that will be used when future phases of the project introduce data migration needs (for example, migrating from a third-party payment processor to a new one, or consolidating user records after an acquisition).

### 1.3 Migration Principles

All migrations — schema, configuration, and seed — adhere to the following foundational principles:

- **Version Controlled:** Every migration file and every seed script is committed to the Git repository. No ad-hoc database modifications are permitted outside of the Prisma migration pipeline.
- **Reproducible:** Any environment can be rebuilt from scratch using the migration history and seed scripts. A fresh PostgreSQL instance can be brought to the current schema state by running all migrations in order.
- **Environment-Parity:** The schema in development, staging, and production is always identical. The only differences between environments are in the data content (seed data varies per environment) and the configuration (environment variables).
- **Forward-Only in Production:** Schema migrations in staging and production environments are applied in a forward-only manner. Down migrations are never executed against non-local environments.
- **Zero-Downtime Target:** All schema changes are designed to be applied without requiring application downtime. Where a change is inherently breaking, a multi-step migration pattern is used (documented in Section 8).

---

## 2. Prisma Migration Strategy

### 2.1 Prisma Migrate as the Sole Schema Management Tool

Prisma Migrate is the exclusive tool for managing the PostgreSQL 16 database schema throughout the TeslaPrimeCapital project lifecycle. No raw SQL migration files, no manual `ALTER TABLE` statements, and no third-party migration frameworks are permitted. All schema changes must be expressed as modifications to the `schema.prisma` file, and Prisma Migrate generates the corresponding SQL migration files. This ensures a single source of truth for the data model and guarantees that the Prisma Client type definitions are always in sync with the actual database schema.

### 2.2 Migration File Naming and Organization

Prisma Migrate automatically generates migration directories with timestamp-based naming conventions. Each migration directory resides under `prisma/migrations/` and follows the pattern:

```
prisma/migrations/
  20250101120000_init/
    migration.sql
  20250102150000_add_user_kyc_fields/
    migration.sql
  20250103100000_create_investment_plans_table/
    migration.sql
```

The timestamp prefix (`YYYYMMDDHHMMSS`) ensures that migrations are applied in the exact order they were created, regardless of filesystem sorting or merge conflicts. Migration directory names must be descriptive — they should communicate the intent of the schema change at a glance. Developers must not rename migration directories after creation, as Prisma tracks applied migrations by directory name in the `_prisma_migrations` table.

### 2.3 Forward-Only Migrations

In all non-local environments (staging and production), migrations are applied in a strictly forward-only manner using `prisma migrate deploy`. Down migrations — the SQL statements that Prisma can generate to reverse a migration — are never executed against staging or production databases. This policy eliminates the risk of a failed down migration corrupting production data or leaving the schema in an inconsistent state.

If a migration must be reverted in production, the rollback strategy documented in Section 7 is followed instead: the application code is reverted to the previous version, and if the schema change itself must be undone, a new forward migration is authored that reverses the original change.

### 2.4 Forward-Compatible Migrations

Every migration must be designed so that the application code being deployed can function correctly with **both** the pre-migration and post-migration schema states during a rolling deployment. This is critical because, during deployment, some application instances may be running the old code against the new schema while other instances are running the new code against the new schema. The migration must not break either version of the application.

For example, when adding a new required column, the migration must include a default value so that existing rows satisfy the new constraint immediately. When removing a column, the removal must be deferred to a separate deployment after all code references to that column have been removed.

### 2.5 Multi-Step Migration Pattern for Breaking Changes

When a schema change is inherently breaking — meaning it cannot be made forward-compatible with a single migration — a multi-step deployment pattern is required. This pattern spans multiple deployments and ensures zero downtime:

1. **Step 1 — Additive Migration:** Add the new column, table, or index alongside the existing structure. Deploy the migration and the new application code that writes to both the old and new structures. The old code continues to read from the old structure.
2. **Step 2 — Data Migration:** If data must be moved or transformed, author and execute a data migration script (using Prisma batch operations or raw SQL) that populates the new structure from the old one. This step runs after Step 1 is deployed and verified.
3. **Step 3 — Removal Migration:** Once all application instances are running code that exclusively uses the new structure, deploy a migration that removes the old column, table, or index. This step is only executed after the team has confirmed that no code path references the old structure.

### 2.6 Migration Testing

Every migration must be tested against a dedicated test database before it is eligible for deployment to staging or production. The testing process includes:

- Applying the migration to a fresh test database (created from the previous migration state).
- Verifying that the schema matches the expected state using `prisma migrate status`.
- Running the application's test suite against the migrated database.
- Confirming that the Prisma Client generates correctly with `prisma generate`.
- Checking that no data is lost or corrupted by the migration.

### 2.7 Migration Locking

Prisma Migrate uses an advisory lock on the database to ensure that only one migration process can run at a time. This prevents race conditions when multiple deployment processes attempt to apply migrations simultaneously (for example, during a rolling deployment with multiple replicas). If a migration lock is held by a stale process, it must be manually cleared by a database administrator after confirming that no active migration is in progress.

---

## 3. Migration Workflow

### 3.1 Development Workflow

In the development environment, schema changes follow a rapid iterative cycle using `prisma migrate dev`:

1. The developer modifies the `prisma/schema.prisma` file to reflect the desired schema change.
2. The developer runs `prisma migrate dev --name descriptive_migration_name`.
3. Prisma generates a new migration directory under `prisma/migrations/` with a timestamped name and a `migration.sql` file containing the SQL statements to apply the change.
4. Prisma applies the migration to the local development database automatically.
5. Prisma regenerates the Prisma Client with updated type definitions.
6. The developer verifies the change by running the application locally and executing relevant tests.
7. The developer commits the migration directory, the updated `schema.prisma`, and any code changes to the Git repository.

If a migration in development is problematic (for example, the developer made a mistake in the schema), they may reset the development database using `prisma migrate reset`, which drops and recreates the database, then reapplies all migrations from scratch and runs the seed script. This command is **never** used in staging or production.

### 3.2 Staging Workflow

The staging environment serves as the final verification gate before production. Migrations are applied to staging using `prisma migrate deploy`, which applies all pending migrations without generating new ones:

1. Code is deployed to the staging environment via Coolify.
2. As part of the deployment process, a pre-deploy hook executes `prisma migrate deploy`.
3. Prisma checks the `_prisma_migrations` table to determine which migrations have already been applied.
4. Prisma applies all pending migrations in chronological order.
5. If all migrations succeed, the deployment continues. If any migration fails, the deployment is halted.
6. After migration, the staging seed script is executed to ensure reference data is up to date.
7. Smoke tests are run against the staging environment to verify application health.
8. A human reviewer signs off on the staging deployment before it is promoted to production.

### 3.3 Production Workflow

Production deployments follow the same mechanical process as staging but with additional safeguards:

1. A pre-deploy hook creates a database backup using `pg_dump` (documented in Section 7).
2. The pre-deploy hook executes `prisma migrate deploy` to apply any pending migrations.
3. If the migration succeeds, the deployment proceeds: the new application container is built, started, and health-checked.
4. If the migration fails, the deployment is immediately halted. The pre-deploy backup is preserved, and the rollback procedure documented in Section 7 is initiated.
5. Post-deploy, smoke tests are executed against the production environment.
6. The on-call engineer monitors error rates, response times, and database performance for a minimum of 30 minutes after deployment.

### 3.4 Migration Tracking in Version Control

All migration files are tracked in the Git repository under the `prisma/migrations/` directory. This directory is part of the deployed artifact — the migration files must be present in the container at deployment time for `prisma migrate deploy` to function. Migration files must never be modified after they have been applied to any shared environment (staging or production). If a correction is needed, a new migration must be created.

The migration history in Git serves as the authoritative record of all schema changes. Any divergence between the migration files in the repository and the `_prisma_migrations` table in a database indicates a serious configuration error that must be investigated immediately.

---

## 4. Seed Data Strategy

### 4.1 Seed Script Architecture

The TeslaPrimeCapital platform requires a set of foundational reference data to function. This data is managed through Prisma seed scripts written in TypeScript, executed using the Prisma Client. The seed script is defined in the `package.json` under the `prisma.seed` configuration and can be invoked with `prisma db seed`.

The seed script is structured as a modular system where each data domain (investment plans, roles, settings, etc.) is defined in its own file under `prisma/seed/`. A central orchestrator (`prisma/seed/index.ts`) imports and executes each domain's seed function in the correct dependency order.

### 4.2 Investment Plans

Four investment plans are seeded into the platform at initial deployment. These plans define the core product offering and must be present in all environments:

| Plan Name    | Minimum Investment | Duration (Days) | Daily Return Rate | Withdrawal Fee |
|-------------|-------------------|-----------------|-------------------|----------------|
| Basic       | $100              | 30              | 1.5%              | 2%             |
| Silver      | $1,000            | 60              | 2.0%              | 1.5%           |
| Gold        | $5,000            | 90              | 2.5%              | 1.0%           |
| Platinum    | $25,000           | 180             | 3.0%              | 0.5%           |

Each plan record includes additional metadata: a description, risk level classification, compounding configuration, early withdrawal penalty, and maximum investment cap. The plan data is identical across all environments — the product definition does not change between dev, staging, and production.

### 4.3 RBAC Roles and Permissions

The role-based access control system is seeded with a complete hierarchy of roles and their associated permissions. The default roles are:

- **Super Admin:** Full access to all system features, including user management, financial operations, platform configuration, and audit log access.
- **Admin:** Access to user management, investment operations, and reporting. Cannot modify platform configuration or other admins.
- **Support Agent:** Access to user profiles, support ticket management, and read-only investment data. Cannot perform financial operations.
- **KYC Officer:** Access to KYC verification workflows, document review, and compliance reporting. Cannot access financial operations.
- **Accountant:** Access to financial reports, transaction records, and payout management. Cannot access user management.
- **User:** Standard investor access — portfolio management, deposits, withdrawals, and personal settings.

Each role is associated with a set of permission records that map to specific API endpoints and UI features. The permission system uses a fine-grained model where each permission is a combination of a resource (e.g., `users`, `investments`, `transactions`) and an action (e.g., `read`, `create`, `update`, `delete`).

### 4.4 Admin User Account

A default admin user account is created during seeding to ensure that the platform is accessible immediately after deployment. The admin user is seeded with:

- A securely generated password (minimum 32 characters, stored using bcrypt with cost factor 12).
- The Super Admin role assigned.
- A verified email address and completed KYC status.
- Two-factor authentication enabled with a recovery code stored in the platform's secure secrets manager.

In production, the admin user's credentials are injected via environment variables at seed time — they are never hardcoded in the seed script. In development and staging, default credentials are used for convenience.

### 4.5 Platform Settings

Platform-wide configuration is seeded as key-value pairs in the settings table. These settings control operational parameters:

- **Fee Configuration:** Platform fee percentage, deposit fee, withdrawal fee, referral commission rates.
- **Limits:** Minimum and maximum deposit amounts per transaction and per day, maximum investment per plan, maximum withdrawal per day.
- **Supported Currencies:** List of accepted deposit currencies (USD, EUR, GBP, BTC, ETH, USDT) with their exchange rate sources and refresh intervals.
- **KYC Configuration:** Required document types, verification timeout, auto-rejection rules, manual review thresholds.
- **Notification Settings:** Email sender address, SMS gateway configuration, push notification toggle, notification preferences per event type.
- **Security Settings:** Password policy (minimum length, complexity requirements), session timeout, IP whitelist, rate limiting thresholds.

### 4.6 Environment-Specific Seed Data

The seed script detects the current environment via the `NODE_ENV` variable and adjusts its behavior accordingly:

- **Development (`NODE_ENV=development`):** Seeds the full dataset — all investment plans, all roles and permissions, the admin user, all platform settings, and additionally creates 50+ test users with diverse profiles (various KYC statuses, investment portfolios across all plans, transaction histories spanning multiple months, pending and completed withdrawals, support tickets in various states). This rich dataset enables thorough manual and automated testing.

- **Staging (`NODE_ENV=staging`):** Seeds investment plans, roles, permissions, platform settings, and the admin user. Additionally creates 20 anonymized test users with realistic-looking but fabricated data. No real user data is ever present in staging. The staging seed is designed to mimic production data volume and distribution for performance testing.

- **Production (`NODE_ENV=production`):** Seeds **only** investment plans, roles, permissions, platform settings, system configuration, and the admin user. No test users are created. No fabricated data is generated. The production seed is intentionally minimal — it contains only the reference data required for the application to function. All user data in production is created organically through the registration and onboarding flows.

---

## 5. Environment Migration

### 5.1 Configuration Promotion Model

TeslaPrimeCapital uses a strict environment promotion model where the same codebase is deployed across development, staging, and production environments. There are zero code differences between environments — all behavioral variation is controlled through environment variables. This eliminates an entire class of bugs caused by configuration drift between environments and ensures that any code change tested in development behaves identically in staging and production.

Environment configuration migration follows a linear promotion path:

```
Development → Staging → Production
```

Configuration changes are first validated in development, then promoted to staging for integration testing, and finally promoted to production after sign-off. Configuration is never modified directly in staging or production — it flows through the promotion pipeline.

### 5.2 Environment Variable Management

All runtime configuration is expressed as environment variables. The project maintains a `.env.example` file in the repository root that documents every environment variable the application requires, along with its type, a description, and an example value. The `.env.example` file is the canonical reference for configuration — if a variable is not documented there, the application should not depend on it.

Environment variable categories include:

- **Database:** `DATABASE_URL` — PostgreSQL connection string. Each environment connects to its own PostgreSQL instance or database.
- **Redis:** `REDIS_URL` — Redis connection string. Each environment has its own Redis instance.
- **Authentication:** `JWT_SECRET`, `JWT_EXPIRY`, `REFRESH_TOKEN_EXPIRY`, `TWO_FACTOR_SECRET`.
- **External Services:** `SENDGRID_API_KEY`, `TWILIO_ACCOUNT_SID`, `STRIPE_SECRET_KEY`, `COINBASE_API_KEY`.
- **Platform:** `NODE_ENV`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_API_URL`, `PLATFORM_NAME`.
- **Feature Flags:** `FF_NEW_DASHBOARD`, `FF_CRYPTO_DEPOSITS`, `FF_REFERRAL_PROGRAM`.
- **Security:** `CORS_ORIGINS`, `RATE_LIMIT_MAX`, `ENCRYPTION_KEY`.

### 5.3 Coolify Environment Variable Management

Coolify is the deployment platform and is responsible for managing environment variables per service per environment. Each environment (dev, staging, production) has its own set of services (web, worker, cron) with its own environment variable configuration stored in Coolify's encrypted secret store.

When a new environment variable is added:

1. The variable is documented in `.env.example` with a clear description and example value.
2. The application code is updated to read the variable (with a sensible default or a clear error message if the variable is required but missing).
3. The variable is added to the Coolify configuration for each environment with the appropriate value for that environment.
4. The deployment is triggered, and the new variable is available to the application.

### 5.4 Database and Redis Isolation

Each environment operates against its own completely isolated PostgreSQL database and Redis instance:

| Resource   | Development              | Staging                  | Production               |
|-----------|-------------------------|--------------------------|--------------------------|
| PostgreSQL | `tesla_prime_dev`       | `tesla_prime_staging`    | `tesla_prime_prod`       |
| Redis      | `redis://dev:6379/0`    | `redis://staging:6379/0` | `redis://prod:6379/0`    |

There is no cross-environment database access. Development code never connects to the staging or production database. Staging data is periodically refreshed by dropping and re-seeding the staging database (never by copying production data, which would contain real user information).

### 5.5 Configuration Validation

At application startup, the application validates all required environment variables are present and correctly formatted. If any required variable is missing or malformed, the application refuses to start and logs a clear error message identifying the problematic variable. This fail-fast behavior prevents the application from running in a misconfigured state.

---

## 6. Data Migration Procedures

### 6.1 Future-Proofing for Data Migration Needs

While the initial deployment of TeslaPrimeCapital does not require any data migration from a legacy system, future phases of the project will almost certainly introduce data migration scenarios. These may include: migrating payment processing records when switching payment providers, consolidating user accounts after a partnership or acquisition, importing historical market data from a third-party API, or migrating from one currency to another. This section establishes the procedures, conventions, and safeguards that will govern all future data migrations.

### 6.2 Data Migration Pipeline

All data migrations follow a four-stage pipeline:

1. **Export:** Data is extracted from the source system or source table(s) in a structured format (JSON, CSV, or direct database query results). The export must include all fields required for the transformation and import stages, plus metadata for auditability (source timestamp, record identifier, checksum).

2. **Transform:** The exported data is transformed to match the target schema and business rules. This stage handles data type conversions, field mappings, calculations, deduplication, and any business logic required to adapt the source data to the target structure. Transformation logic is implemented as a standalone TypeScript module with comprehensive unit tests.

3. **Validate:** The transformed data is validated against the target schema constraints and business rules. Validation checks include: required field presence, data type correctness, referential integrity (all foreign keys resolve to existing records), business rule compliance (e.g., no negative investment amounts), and aggregate consistency (total amounts match expected totals).

4. **Import:** The validated data is written to the target database using Prisma batch operations. The import stage is executed within a database transaction to ensure atomicity — either all records are imported successfully, or none are.

### 6.3 Large Dataset Handling

For migrations involving large datasets (defined as more than 10,000 records), the following optimizations are applied:

- **Batch Operations:** Prisma's `createMany` is used instead of individual `create` calls. Batch sizes are capped at 1,000 records per operation to balance memory usage and database performance.
- **Streaming:** For datasets exceeding 100,000 records, a streaming approach is used where data is read, transformed, and written in chunks rather than loading the entire dataset into memory.
- **Throttling:** Database writes are throttled to avoid overwhelming the PostgreSQL instance during migration. A configurable delay (default: 100ms) is inserted between batches.
- **Progress Tracking:** A migration progress table records the number of records processed, the current batch, and the timestamp. This allows a failed migration to be resumed from the last successful batch rather than starting over.

### 6.4 Transaction Safety

All data migrations are executed within a single database transaction unless the dataset size necessitates a chunked approach (in which case each chunk is its own transaction). Transactions ensure that the database is never left in a partially migrated state. If a migration fails midway, all changes within the current transaction are rolled back automatically.

### 6.5 Validation and Verification

Before and after every data migration, the following verification steps are performed:

- **Row Count Verification:** The number of source records, transformed records, and imported records are compared. Any discrepancy triggers an investigation.
- **Checksum Verification:** For critical data (financial transactions, investment records), a checksum is computed on the source data and compared against the checksum of the imported data.
- **Sample Audit:** A random sample of records (minimum 5% or 100 records, whichever is greater) is manually compared between source and target to verify field-level accuracy.

### 6.6 Dry-Run Mode

Every data migration script supports a dry-run mode (activated via the `DRY_RUN=true` environment variable). In dry-run mode, the script performs all export, transform, and validation steps but skips the actual import. Instead, it logs the SQL statements that would have been executed and the number of records that would have been affected. Dry-run mode is mandatory before any production data migration.

### 6.7 Pre-Migration Backup

A full database backup is created using `pg_dump` before any data migration is executed. The backup file is stored in a separate location from the database server and is retained for a minimum of 90 days. The backup must be verified (restored to a test database) before the migration proceeds.

### 6.8 Rollback Procedure

Every data migration script must include a corresponding rollback script that reverses the import. The rollback script is tested in staging before the migration is executed in production. If a migration fails or produces incorrect results, the rollback script is executed to restore the database to its pre-migration state. If the rollback script also fails, the pre-migration backup is used for point-in-time recovery.

---

## 7. Rollback Strategy

### 7.1 Rollback Philosophy

The rollback strategy for TeslaPrimeCapital is built on the principle that rollbacks should be rare, well-practiced, and mechanical. A rollback is not a debugging exercise — it is an emergency procedure that restores the system to a known-good state as quickly as possible. Post-rollback analysis is conducted separately, after the system is stable.

### 7.2 Application Code Rollback

The primary rollback mechanism is application code reversion. If a deployment introduces a bug or an incompatibility, the application is reverted to the previous version:

1. The Coolify deployment is rolled back to the previous container image.
2. The previous application code is now running against the current database schema.
3. Because all migrations are designed to be forward-compatible (Section 2.4), the previous code version can function correctly with the new schema.
4. If the new schema is incompatible with the old code, a new migration must be authored that restores schema compatibility (this is a failure of the migration review process and triggers a post-incident review).

### 7.3 Schema Rollback

Prisma does not support automatic down migrations in production (see Section 2.3). If a schema change must be undone, the process is:

1. **Revert application code** to the version that preceded the problematic schema change.
2. **Author a new forward migration** that undoes the schema change (e.g., drops the column that was added, restores the column that was removed, removes the table that was created).
3. **Deploy the new migration** using the standard `prisma migrate deploy` pipeline.
4. **Verify** that the reverted schema is compatible with the reverted application code.

This approach is more reliable than executing down migrations because the rollback migration is a normal forward migration that goes through the same testing and review process as any other migration.

### 7.4 Database Backup Strategy

A PostgreSQL backup is created before every production deployment:

- **Tool:** `pg_dump` with custom format (`-Fc`) for efficient backup and restore.
- **Timing:** Executed as a pre-deploy hook, immediately before `prisma migrate deploy` runs.
- **Storage:** Backups are stored in an S3-compatible object storage bucket with lifecycle policies that retain daily backups for 30 days and weekly backups for 90 days.
- **Verification:** Each backup is verified by restoring it to a test database and running a schema comparison against the source database.
- **Encryption:** Backups are encrypted at rest using AES-256.

### 7.5 Point-in-Time Recovery (PITR)

PostgreSQL 16's Write-Ahead Log (WAL) archival is enabled for point-in-time recovery. WAL files are archived to the same S3-compatible storage as the pg_dump backups. PITR allows the database to be restored to any specific point in time within the WAL retention window (default: 7 days). This is the ultimate fallback if a logical backup is insufficient or if data corruption is detected after a migration.

### 7.6 Feature Flags as Rollback Mechanism

Feature flags provide a rapid, code-deployment-free rollback mechanism for new features. If a new feature is causing issues in production, the feature flag can be disabled immediately without requiring a code rollback or schema change:

- Feature flags are stored in the platform settings table and cached in Redis with a 60-second TTL.
- Disabling a feature flag takes effect within 60 seconds across all application instances.
- Feature flags are the preferred rollback mechanism for application-level issues (bugs, performance problems) that are isolated to a specific feature.
- Feature flags are **not** a substitute for schema-level rollbacks — if the schema itself is problematic, a code and schema rollback is required.

---

## 8. Zero-Downtime Migration

### 8.1 Zero-Downtime as a Design Constraint

TeslaPrimeCapital is a financial platform where downtime directly impacts users' ability to manage investments, execute transactions, and monitor their portfolios. Zero-downtime migrations are not an aspirational goal — they are a hard design constraint. Every schema change must be deployable without requiring the application to be stopped, restarted, or placed in maintenance mode.

### 8.2 Additive-Only Changes

The safest schema changes are purely additive — they add new structures without modifying or removing existing ones. Additive changes are always zero-downtime compatible:

- **Add a new table:** No existing query is affected. The new table is simply available for the new code to use.
- **Add a new column:** If the column is nullable or has a default value, existing rows are automatically populated, and existing queries are unaffected. The new column is simply ignored by the old code.
- **Add a new index:** PostgreSQL acquires a `SHARE` lock on the table during index creation, which allows reads and writes to continue. For very large tables, `CREATE INDEX CONCURRENTLY` is used to avoid blocking writes entirely.
- **Add a new enum value:** PostgreSQL allows appending new enum values without locking the table.

### 8.3 Rules for Schema Changes

The following rules govern all schema changes to ensure zero-downtime compatibility:

1. **Never remove a column that is referenced by the currently deployed code.** The column must first be removed from all code paths (in a prior deployment), and only then can the column be dropped from the schema (in a subsequent deployment).

2. **Always provide default values for new required columns.** If a column is `NOT NULL` and has no default, the `ALTER TABLE` will fail on tables with existing rows. Use a sensible default value or make the column nullable initially and backfill the data before adding the `NOT NULL` constraint.

3. **Never rename a column in a single migration.** Renaming a column breaks all existing code that references the old name. Instead: (a) add a new column with the new name, (b) deploy code that writes to both columns, (c) backfill data from old column to new column, (d) deploy code that reads from the new column, (e) drop the old column.

4. **Never change a column's data type in a way that is not implicitly convertible.** For example, changing a `VARCHAR` to `INTEGER` requires a multi-step migration: (a) add a new `INTEGER` column, (b) backfill by parsing the `VARCHAR` values, (c) deploy code that uses the new column, (d) drop the old column.

5. **Use `CREATE INDEX CONCURRENTLY` for indexes on large tables.** Standard `CREATE INDEX` acquires an exclusive lock that blocks writes. The concurrent variant builds the index without blocking any operations.

### 8.4 Deployment Sequence for Schema Changes

The canonical deployment sequence for a zero-downtime schema change is:

1. **Deploy Migration:** Apply the additive schema change using `prisma migrate deploy`. At this point, the old code is still running, and the new schema elements (new columns, new tables) are simply present but unused.

2. **Deploy New Code:** Deploy the application code that uses the new schema elements. During the rolling deployment, some instances run old code (ignoring new columns) and some run new code (using new columns). Because the schema change is additive and forward-compatible, both code versions function correctly.

3. **Verify:** Monitor the deployment for errors, performance degradation, or unexpected behavior. Confirm that all instances are running the new code.

4. **(Optional) Deploy Cleanup Migration:** If the schema change was part of a multi-step pattern (Section 2.5), deploy the cleanup migration that removes the old schema elements after confirming that no code references them.

### 8.5 Long-Running Migrations

Some migrations may take a significant amount of time (for example, adding an index on a table with millions of rows, or backfilling a new column on a large table). For these migrations:

- The migration is executed during a low-traffic window (determined by historical traffic analysis).
- `CREATE INDEX CONCURRENTLY` is used to avoid blocking writes.
- Data backfill operations are batched and throttled to minimize impact on database performance.
- The migration progress is monitored in real-time, and if database performance degrades below a defined threshold, the migration is paused or aborted.

---

## 9. Migration Checklist

### 9.1 Pre-Migration Checklist

The following items must be completed **before** a migration is applied to staging or production:

- [ ] **Database backup completed:** A `pg_dump` backup has been created and verified by restoring to a test database.
- [ ] **Migration tested on staging:** The migration has been applied to the staging database and the application has been deployed and smoke-tested.
- [ ] **Rollback plan documented:** The rollback procedure is documented and understood by the on-call engineer. If a schema rollback migration is needed, it has been authored and tested.
- [ ] **Team notified:** All team members have been notified of the upcoming migration, including the expected timeline, potential impact, and rollback plan.
- [ ] **Feature flags ready:** If the migration is associated with a new feature, the corresponding feature flag is in place and set to disabled.
- [ ] **Migration file reviewed:** The generated `migration.sql` has been reviewed by at least one team member who was not the author. The reviewer has verified that the SQL is correct, efficient, and follows the zero-downtime rules.
- [ ] **Prisma Client regenerated:** `prisma generate` has been run and the updated Prisma Client is included in the deployment artifact.
- [ ] **Seed script updated (if applicable):** If the migration adds new reference data requirements, the seed script has been updated and tested.
- [ ] **Rolling deployment verified:** The deployment process has been confirmed to use a rolling strategy (not a stop-the-world redeploy).
- [ ] **Monitoring dashboards open:** The on-call engineer has the monitoring dashboards (error rates, response times, database connections, queue depth) open and visible.

### 9.2 During-Migration Checklist

The following items are executed **during** the migration process:

- [ ] **Migration executed:** `prisma migrate deploy` has been run and completed successfully.
- [ ] **Schema verified:** `prisma migrate status` confirms that the database schema is up to date and no pending migrations remain.
- [ ] **Seed data applied (if applicable):** The environment-appropriate seed script has been run to ensure reference data is current.
- [ ] **Smoke tests executed:** The automated smoke test suite has been run against the migrated database and all tests pass.
- [ ] **Application health verified:** The application starts successfully, all health check endpoints return 200, and no errors are logged during startup.
- [ ] **Database performance checked:** Query performance has not degraded. Slow query logs have been reviewed for any anomalies introduced by the migration.
- [ ] **Feature flag enabled (if applicable):** If the migration is associated with a new feature, the feature flag has been enabled.

### 9.3 Post-Migration Checklist

The following items are completed **after** the migration has been deployed and verified:

- [ ] **Application health monitored:** The application has been running for a minimum of 30 minutes without errors. Error rates, response times, and throughput are within normal baselines.
- [ ] **Data integrity verified:** A sample of records has been audited to confirm that data has not been corrupted or lost during the migration. Row counts match expected values.
- [ ] **User-facing functionality tested:** Key user flows (login, deposit, investment, withdrawal, dashboard) have been tested manually or via end-to-end tests.
- [ ] **Team notified of completion:** All team members have been notified that the migration is complete and the system is operating normally.
- [ ] **Documentation updated:** Any changes to the database schema, configuration, or operational procedures have been reflected in the project documentation.
- [ ] **Incident report filed (if applicable):** If any issues were encountered during the migration, an incident report has been filed with a timeline, root cause analysis, and corrective actions.
- [ ] **Backup retention confirmed:** The pre-migration backup is stored in the designated location and the retention policy is correctly applied.
- [ ] **Migration marked as complete:** The migration is marked as complete in the project's deployment tracking system (e.g., a Jira ticket is moved to "Done").

---

## Appendix A: Quick Reference Commands

| Task                      | Command                                            | Environment  |
|--------------------------|-----------------------------------------------------|-------------|
| Create migration          | `prisma migrate dev --name description`            | Development |
| Reset dev database        | `prisma migrate reset`                             | Development |
| Apply pending migrations  | `prisma migrate deploy`                            | Staging/Prod|
| Check migration status    | `prisma migrate status`                            | Any         |
| Generate Prisma Client    | `prisma generate`                                  | Any         |
| Run seed script           | `prisma db seed`                                   | Any         |
| Create database backup    | `pg_dump -Fc dbname > backup.dump`                 | Staging/Prod|
| Restore database          | `pg_restore -d dbname backup.dump`                 | Any         |
| Verify backup             | `pg_restore --list backup.dump`                    | Any         |

## Appendix B: Migration File Template

```sql
-- Migration: <YYYYMMDDHHMMSS>_<description>
-- Author: <developer name>
-- Ticket: <JIRA/issue reference>
-- Description: <detailed description of what this migration does and why>
-- Forward-Compatible: <yes/no — if no, document the multi-step plan>
-- Rollback: <description of how to rollback this migration>

BEGIN;

-- Migration SQL goes here

COMMIT;
```

---

*Document generated for TeslaPrimeCapital — Managed Investment Platform*
*This document is a living artifact and will be updated as the migration strategy evolves.*
