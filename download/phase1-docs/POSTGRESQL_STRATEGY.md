# PostgreSQL Strategy

> Phase 1 — Enterprise Investment Platform  
> Database design, configuration, and operational strategy for PostgreSQL 16+ with Prisma ORM.

---

## 1. PostgreSQL Version & Configuration

PostgreSQL 16+ serves as the primary relational data store for the entire platform. All financial records, user data, investment plans, transactions, referral structures, and audit trails reside in PostgreSQL. The deployment uses the official PostgreSQL 16 Docker image with tuned configuration parameters appropriate for the container's allocated resources.

Connection pooling is handled through PgBouncer running as a sidecar container in production, configured in transaction mode to maximize connection reuse across the pool. For Phase 1, the built-in Prisma connection pool is acceptable in development and staging, but production must use PgBouncer to prevent connection exhaustion under concurrent load. PgBouncer is configured with a minimum pool size of 10 and a maximum that scales with container memory, typically capping at 100 connections.

Critical timeout configurations are applied at the PostgreSQL level to prevent resource leaks. The `statement_timeout` is set to 30 seconds, ensuring no single query can monopolize a connection indefinitely. The `idle_in_transaction_session_timeout` is set to 60 seconds, closing sessions that hold transactions open without activity. The `max_connections` parameter is set to 200 at the PostgreSQL level, with PgBouncer managing a smaller pool of actual server connections (typically 20-50) while presenting a larger pool to application clients.

Additional configuration includes `shared_buffers` set to 25% of available container memory, `effective_cache_size` at 75% of container memory, `work_mem` at 16MB for sorting and hashing operations, and `maintenance_work_mem` at 256MB for index creation and vacuum operations. WAL settings are tuned for durability with `wal_level = replica` to support future read replicas, and `synchronous_commit = on` to guarantee financial data is flushed to disk before acknowledgment.

---

## 2. Database Creation

Phase 1 uses a single PostgreSQL database instance containing all application data. Within this database, logical separation is achieved through schemas: the `public` schema holds all application-facing tables (users, investments, transactions, wallets, referrals, tickets, notifications), while an `internal` schema is reserved for system-level tables (background job tracking, migration state, system configuration, audit log entries that are not part of the business domain).

A separate read-only database user is created for reporting and backup operations. This user has SELECT privileges on the `public` schema and no access to the `internal` schema. This user is used by monitoring tools, backup scripts, and any future reporting pipelines, ensuring that a compromised reporting credential cannot write or modify application data.

The application user has full CRUD access to the `public` schema and limited access to the `internal` schema (read-write on job queues, read-only on audit logs). Database and schema creation are managed through Prisma migrations and infrastructure-as-code scripts, never through ad-hoc manual commands in production environments.

---

## 3. Connection Management

Prisma ORM manages the application-side connection pool with explicit configuration in the `DATABASE_URL` connection string. In development, the pool size is set to a minimum of 2 and maximum of 10 connections. In staging, the pool expands to a minimum of 5 and maximum of 25. In production, with PgBouncer, the Prisma pool is configured with a small number of persistent connections (min 5, max 20) since PgBouncer handles multiplexing.

The `connection_timeout` is set to 10 seconds, meaning Prisma will throw an error if a connection cannot be acquired from the pool within that window. This prevents request threads from blocking indefinitely when the pool is exhausted. The `idle_timeout` is set to 300 seconds (5 minutes), ensuring idle connections are released back to the pool or closed.

Connection health checks are performed by Prisma on checkout, using a lightweight `SELECT 1` query to verify the connection is still alive before handing it to application code. This prevents stale connections from causing query failures. For long-running operations, such as report generation, connections are explicitly managed with shorter timeouts and dedicated pool slots to avoid starving the main request pool.

PgBouncer configuration in production uses `pool_mode = transaction`, which releases connections back to the pool at the end of each transaction rather than at the end of each session. This dramatically increases the effective number of clients that can be served with a fixed number of PostgreSQL server connections. The `server_idle_timeout` in PgBouncer is set to 600 seconds to close unused server connections gracefully.

---

## 4. Query Performance

All database queries must use the Prisma ORM. Prisma provides type-safe query building, automatic parameterization (preventing SQL injection), and consistent query patterns across the codebase. Raw SQL queries are prohibited unless explicitly approved by the technical lead, and even then must use parameterized queries exclusively — string interpolation of user input into raw SQL is a critical security violation.

The Prisma `query` event is logged in development to capture all generated SQL for review. A custom logging middleware captures query execution time, and any query exceeding 100ms in development triggers a console warning. In production, slow query logging is handled at the PostgreSQL level with `log_min_duration_statement = 200`, capturing queries that take longer than 200ms into the PostgreSQL log for analysis.

For any query identified as slow through monitoring or logging, developers must run `EXPLAIN ANALYZE` against the query (or its equivalent Prisma-generated SQL) to understand the execution plan. The output must be reviewed to identify sequential scans, nested loops on large tables, or missing index usage. Query optimization must be validated with real production-scale data volumes before deployment.

Prisma's `include` and `select` directives are used to control query shape and prevent over-fetching data. N+1 query problems are addressed by using `include` for eager loading related data in a single round-trip, rather than looping through results and issuing individual queries. All list queries must have explicit `take` and `skip` or cursor-based pagination to prevent unbounded result sets.

---

## 5. Indexing Strategy

All foreign key columns have B-tree indexes created automatically by Prisma. Beyond foreign keys, B-tree indexes are defined on all columns that appear in WHERE clauses, JOIN conditions, or ORDER BY clauses with any meaningful frequency. This includes email addresses (unique lookups during login and registration), status fields (filtered queries across all entity types), date/timestamp columns (range queries for transaction history, audit logs, and reporting), and any column used for sorting in list endpoints.

Composite indexes are defined for common multi-column query patterns. For example, if the platform frequently queries investments by `(userId, status, createdAt)`, a composite index on those three columns in that order supports the query efficiently. The column order in composite indexes follows the equality-then-range rule: columns used in equality conditions come first, followed by columns used in range conditions or ordering. This ensures the index is usable for the maximum number of query patterns.

Partial indexes are used for status-based queries that filter on a specific status value. Rather than indexing the full table on a status column, a partial index on `WHERE status = 'pending'` (or any other high-frequency filter value) reduces index size and improves insert/update performance. Partial indexes are particularly valuable for financial transactions where the vast majority of records are in a terminal state (`completed`, `failed`) but active queries filter on `pending` or `processing` states.

The indexing strategy is reviewed during every code review that introduces new query patterns. New indexes are added through Prisma migrations, and the migration must include an explanation of the query pattern the index supports. Indexes are never added speculatively — each index must correspond to an observed or anticipated query pattern. Unused indexes are identified through PostgreSQL statistics (`pg_stat_user_indexes`) and removed to avoid unnecessary write overhead.

---

## 6. Transaction Management

All financial operations — deposits, withdrawals, investment purchases, referral commission calculations — must use Prisma interactive transactions (`prisma.$transaction(async (tx) => { ... })`). Interactive transactions ensure that multiple database operations within a single business action are atomic, consistent, isolated, and durable. If any step within the transaction fails, all changes are rolled back automatically.

Multi-step operations that touch multiple entities (for example, processing a deposit: updating the deposit record, crediting the wallet, recording a transaction, updating the referral commission) must be wrapped in a single interactive transaction. The transaction scope should be as narrow as possible to minimize lock duration and reduce the chance of contention with concurrent operations.

Serialization failures (PostgreSQL error code 40001) are retried automatically. Prisma's interactive transaction support includes retry logic for serialization failures, but the application must also implement retry with exponential backoff at the service layer for cases where the retry needs to re-read state before retrying the operation. The maximum retry count is 3, with delays of 100ms, 250ms, and 500ms between retries.

Deadlock detection is handled by PostgreSQL, which aborts one of the conflicting transactions with error code 40P01. The application catches this error code and retries the transaction from the beginning. Deadlocks are logged as warnings (not errors) since they are expected under concurrent financial operations, but frequent deadlocks indicate a need for query or schema optimization. Deadlock analysis is performed monthly by reviewing PostgreSQL logs for deadlock reports.

---

## 7. Data Integrity

Foreign key constraints are defined on all relationships with appropriate `ON DELETE` rules. The default is `ON DELETE RESTRICT` to prevent accidental deletion of referenced records. `ON DELETE SET NULL` is used where the relationship is optional and the referenced record deletion should not cascade. `ON DELETE CASCADE` is used sparingly and only for clearly dependent entities (e.g., deleting a ticket message when its parent ticket is deleted). Financial entities never use `CASCADE` — deletion of referenced financial records is always blocked.

Unique constraints are enforced on email addresses (case-insensitive via a functional unique index on `LOWER(email)`), referral codes (globally unique across all users), and on the combination of `(userId, planId, status)` for active investments to prevent users from having duplicate active investments in the same plan tier. The referral code constraint includes a check that the code is not easily confused (e.g., no O/0, I/1 ambiguity) via application-level validation and a regex constraint.

Check constraints enforce business rules at the database level. Deposit and investment amounts are constrained to be positive and within the plan tier's minimum and maximum range. Status columns use PostgreSQL enum types to restrict values to valid states. Timestamp columns use `DEFAULT NOW()` and are never null. Withdrawal amounts include a check constraint ensuring the amount plus the withdrawal fee does not exceed the available wallet balance at the time of request creation.

Enum types are defined in PostgreSQL rather than using string columns with application-level validation. This provides database-level enforcement of valid values, reduces storage compared to strings, and makes the valid states self-documenting in the schema. Enums include `InvestmentStatus` (active, completed, matured), `TransactionType` (deposit, withdrawal, commission, bonus), `KYCStatus` (pending, submitted, approved, rejected), `TicketStatus` (open, in_progress, resolved, closed), and `DepositMethod` (crypto, gift_card).

---

## 8. Soft Delete Strategy

Soft deletes are implemented using a `deletedAt` nullable timestamp column on applicable models. When a record is soft-deleted, the `deletedAt` column is set to the current timestamp rather than removing the row. A Prisma middleware intercepts all `find`, `findFirst`, `findMany`, and `count` queries to automatically append `WHERE deletedAt IS NULL` to the query conditions, ensuring soft-deleted records are excluded from normal application queries by default.

Models that use soft delete are: Users, Support Tickets, Notifications, and KYC Submissions. These are entities where deletion is a logical operation that should be reversible and where related data must be preserved for audit and compliance purposes. The soft-delete filter can be bypassed by passing `{ includeDeleted: true }` in Prisma query options, which is used by admin endpoints and audit reporting.

Financial transactions (deposits, withdrawals, investments, commissions, wallet entries) are strictly immutable and never soft-deleted. Once a financial record is created, it cannot be modified or deleted through the application. Corrections, if ever needed, are handled through reversal transactions that create new records referencing the original. This immutability is critical for financial audit trails, regulatory compliance, and dispute resolution.

Hard deletion is available for GDPR compliance when a user exercises their right to erasure. The hard-delete process is: (1) soft-delete the user record, (2) after a configurable grace period (default 30 days), permanently remove all personal data from the user record (replace with anonymized placeholder), (3) retain financial transaction records with the user reference replaced by an anonymized ID, (4) log the deletion in the audit trail with timestamp, operator, and reason. This process is irreversible and requires admin approval with dual-authorization.

---

## 9. Backup Strategy

Automated backups are performed using `pg_dump` in custom format (`-Fc`) daily at 02:00 UTC. The backup captures the entire database including all schemas, tables, indexes, and role definitions. The dump file is compressed and uploaded to a separate storage volume or cloud storage bucket (S3-compatible) that is geo-redundant and access-controlled. Backup integrity is verified automatically by restoring the dump to a test instance and running a set of smoke queries.

Write-Ahead Log (WAL) archiving is enabled for point-in-time recovery (PITR). WAL files are archived continuously to the same backup storage location. Combined with the base backup, this allows recovery to any point in time within the WAL retention window (7 days). PITR is essential for financial platforms where recovering to the exact state before an incident is critical.

Backup retention follows a tiered schedule: daily backups are retained for 30 days, weekly backups (taken on Sundays) are retained for 12 weeks, and monthly backups (taken on the 1st of each month) are retained for 12 months. This tiered approach balances storage costs with recovery options, ensuring that recent data is recoverable at daily granularity while older data remains available at weekly or monthly granularity.

Backup restoration is tested quarterly in a non-production environment. The restoration test verifies that the backup is complete, the restored database passes integrity checks (`pg_checksums`), and the application can connect and perform basic operations against the restored data. Restoration test results are documented and any failures are addressed immediately. The maximum recovery time objective (RTO) is 4 hours, and the recovery point objective (RPO) is 24 hours (or minutes with PITR).

---

## 10. Monitoring

Connection pool metrics are monitored in real-time, including active connections, idle connections, waiting clients, and pool utilization percentage. PgBouncer exposes metrics on port 15432 that are scraped by the monitoring system. Alerts are triggered when pool utilization exceeds 80% for more than 5 minutes, indicating either increased load or a connection leak. Connection spikes are correlated with application request patterns to identify root causes.

Query performance monitoring uses PostgreSQL's `pg_stat_statements` extension to track cumulative query execution statistics. The slow query log captures any query exceeding 500ms with its full text, execution time, and plan. Slow queries are aggregated into a daily report for the engineering team. Queries that consistently appear in the slow log are prioritized for optimization in the next sprint.

Table size monitoring tracks the growth rate of all tables and indexes. Tables exceeding expected growth rates trigger investigation for data retention issues or missing archival policies. The `pg_relation_size` and `pg_total_relation_size` functions are queried every 15 minutes and stored in a time-series for trend analysis.

Dead tuple monitoring tracks the accumulation of unreclaimed space from UPDATE and DELETE operations. The `pg_stat_user_tables` view provides `n_dead_tup` and `last_vacuum`/`last_autovacuum` timestamps. When dead tuples exceed 20% of live tuples, manual VACUUM is triggered or autovacuum parameters are adjusted. This monitoring prevents table bloat from degrading query performance over time.

---

## 11. Migration Strategy

All database schema changes are managed through Prisma migrations. Migration files are generated using `prisma migrate dev` in development and committed to version control alongside the application code. Each migration file includes the SQL changes, the migration name, and a timestamp, providing a complete and ordered history of schema evolution.

In production, migrations are applied using `prisma migrate deploy`, which applies all pending migrations in order. Rollbacks via `prisma migrate rollback` (the `down()` migration) are prohibited in production. If a rollback is necessary, a new forward migration is created that reverses the unwanted changes. This forward-only approach ensures the migration history is always linear and predictable, avoiding the ambiguity that can arise from applying and reverting migrations in non-sequential order.

Zero-downtime migrations are required for all deployment changes. Additive changes (adding new tables, adding new nullable columns, adding new indexes with `CONCURRENTLY`) are safe to deploy without downtime. Destructive changes (removing columns, changing column types, adding NOT NULL constraints to existing columns) require a multi-step migration strategy: first deploy the application code that handles both the old and new schema, then apply the migration in a way that is compatible with both versions, then deploy the application code that uses only the new schema. Column renames are handled by adding a new column, migrating data, updating the application to use the new column, and finally dropping the old column in a subsequent migration.

Migration testing is performed against a copy of the production database (anonymized) before deployment. The migration is timed, and if it exceeds 30 seconds, it must be broken into smaller steps or executed during a maintenance window. Migration failures in staging block the deployment and require investigation before proceeding.

---

## 12. JSON Columns

PostgreSQL's JSONB column type is used for flexible, semi-structured data that does not warrant dedicated columns or separate tables. This includes transaction metadata (on-chain transaction hashes, gas fees, block confirmations, network identifiers for crypto deposits), audit log details (request/response payloads, IP addresses, user agent strings, changed field values), and user preferences (dashboard layout settings, notification preferences, theme selection, locale override).

JSONB is chosen over JSON for its superior query performance (binary storage with indexing support) and its ability to enforce structural constraints via CHECK constraints or JSON Schema validation. GIN indexes are created on JSONB columns that are queried frequently, enabling efficient containment and existence queries. Specific key paths within JSONB columns can be indexed using expression indexes.

JSONB is explicitly not used for core structured data. Financial amounts, dates, statuses, user identifiers, and any data that is queried, filtered, sorted, or joined must use properly typed columns. JSONB is an extension mechanism for supplementary data that varies in shape, not a replacement for relational modeling. Every JSONB column must have a documented schema describing its expected structure, either in the Prisma model comment or in a companion documentation file.

Data integrity within JSONB columns is enforced through application-level validation using Zod schemas. When JSONB data is written, it is validated against the defined schema before persisting. This ensures that even though the database accepts arbitrary JSON, the application only stores well-formed, expected data structures. Validation errors are logged and the write is rejected with a descriptive error message.