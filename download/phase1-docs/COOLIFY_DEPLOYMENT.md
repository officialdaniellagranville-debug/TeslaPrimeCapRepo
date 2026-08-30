# Coolify Deployment Strategy

> Phase 1 — Enterprise Investment Platform  
> Container orchestration, CI/CD pipeline, environment management, and operational procedures using Coolify.

---

## 1. Coolify Overview

Coolify is the self-hosted Platform-as-a-Service (PaaS) solution selected for deploying and managing the investment platform. It provides Docker-based container management with a web-based administration interface, replacing the complexity of manual Docker Compose workflows and Kubernetes for a team that values simplicity and control. Coolify is installed on a dedicated VPS and manages all application services, databases, and background workers.

The key capabilities leveraged from Coolify include: Git-push deployment (changes pushed to the main branch automatically trigger builds and deployments), Docker container lifecycle management (build, start, stop, restart, scale), automatic SSL certificate provisioning via Let's Encrypt, environment variable management through a secure UI, log aggregation and viewing, and built-in health monitoring. Coolify's open-source nature and self-hosted model align with the platform's requirement for full control over infrastructure and data.

Coolify is deployed on the same VPS that runs the application containers. For Phase 1, a single-server architecture is sufficient. Coolify itself runs as a Docker container and manages other containers on the same host. The Coolify administration interface is secured with two-factor authentication and is only accessible from authorized IP addresses via the server's firewall. Coolify's built-in Traefik reverse proxy handles routing, SSL termination, and load balancing.

---

## 2. Deployment Architecture

The production deployment consists of five containerized services managed by Coolify on a single host:

- **Frontend container** — The Next.js application, built as a standalone server in a multi-stage Docker build. Serves both server-rendered pages and static assets. Exposes port 3000 internally, mapped through Traefik.
- **Backend API container** — The Node.js REST API, built from the same monorepo. Handles all API requests, authentication, business logic, and database operations. Exposes port 4000 internally.
- **Background worker container** — A Node.js process running the same codebase as the backend, but executing background jobs (email sending, scheduled tasks, webhook processing, cache warming). This container does not expose any ports externally.
- **PostgreSQL container** — The primary database, running PostgreSQL 16 in a Docker container with a persistent volume mounted for data storage. Exposes port 5432 only on the internal Docker network.
- **Redis container** — The cache and session store, running Redis 7 in a Docker container with a persistent volume. Exposes port 6379 only on the internal Docker network.

Coolify's built-in Traefik reverse proxy handles all inbound traffic. Traefik routes requests based on hostname: the primary domain routes to the frontend container, and the API subdomain (`api.domain.com`) routes to the backend API container. Traefik also handles SSL termination, HTTP-to-HTTPS redirection, and can be configured for rate limiting at the proxy level as an additional defense layer.

All containers communicate over a shared Docker network managed by Coolify. The frontend container communicates with the backend via the API subdomain (going through Traefik) rather than direct container-to-container communication, which simplifies CORS handling and mirrors the production traffic path. The backend and worker containers connect directly to PostgreSQL and Redis using their internal Docker network hostnames.

---

## 3. Environment Separation

Three distinct environments are maintained: Development, Staging, and Production. Each environment has its own infrastructure, configuration, and data.

**Development** runs locally using Docker Compose (`docker-compose.yml`) on each developer's machine. It includes all five services with hot-reload enabled for the frontend and backend containers. Debug logging is set to the most verbose level. Seed data is automatically loaded on first run, providing a populated database with sample users, transactions, and investment plans. Developers can run migrations, test API endpoints, and debug issues without affecting shared environments.

**Staging** is a Coolify-managed deployment that mirrors the production configuration as closely as possible. It runs on the same VPS (or a smaller dedicated VPS) with production-like resource limits and SSL certificates. The staging environment uses a separate PostgreSQL database with anonymized production data or synthetic test data. Staging is used for integration testing, QA review, and pre-production validation. Deployments to staging follow the same CI/CD pipeline as production.

**Production** is the live environment serving real users. It runs on a dedicated VPS with scaled resources, comprehensive monitoring, automated backups, and strict access controls. Production deployments follow the full CI/CD pipeline with automated tests, health checks, and rollback capabilities. Production environment variables are managed exclusively through Coolify's UI and are never committed to version control.

Environment-specific configuration is handled exclusively through environment variables. No conditional logic based on environment exists in the application code — the same codebase runs in all environments, with behavior driven by configuration. Environment variables include database URLs, Redis URLs, API keys, JWT secrets, Cloudinary credentials, and feature flags.

---

## 4. Docker Strategy

Each deployable service has its own multi-stage Dockerfile optimized for minimal image size and fast builds.

**Frontend Dockerfile** uses a two-stage build. The first stage (`builder`) installs dependencies and runs the Next.js build process, producing the standalone output in `.next/standalone`. The second stage (`production`) copies only the standalone output, public assets, and necessary configuration files into a slim Node.js 20 Alpine image. The production image is approximately 150-200MB, down from a full development image of over 1GB. The container starts the Next.js server in production mode on port 3000.

**Backend Dockerfile** uses a two-stage build. The first stage (`builder`) installs all dependencies (including devDependencies for the build step) and compiles TypeScript to JavaScript. The second stage (`production`) copies only the compiled JavaScript, production `node_modules` (installed with `--production` flag), and configuration files into a slim Node.js 20 Alpine image. The production image is approximately 100-150MB. The container starts the Node.js API server on port 4000.

**Shared docker-compose.yml** defines all five services for local development. Each service has its Dockerfile reference, environment file reference (`.env.development`), volume mounts for hot-reload (source code mounted into the container), and port mappings for local access. Dependencies between services are expressed with `depends_on` and health checks to ensure services start in the correct order.

**docker-compose.prod.yml** provides production overrides for use with Coolify. It removes development volume mounts, adjusts resource limits, configures restart policies (`unless-stopped`), and sets production-specific environment variable file references. Coolify handles most of these overrides natively, but the override file serves as documentation and can be used for local production-like testing.

Each service has a `.dockerignore` file that excludes `node_modules`, `.git`, `.env*` files, build artifacts, test files, and documentation from the Docker build context. This reduces build context size and prevents sensitive files from being included in the Docker image.

---

## 5. CI/CD Pipeline

The deployment pipeline is triggered by a git push to the `main` branch (for staging) or a tagged release (for production). Coolify handles the build and deployment process, but pre-deploy checks ensure code quality before a new version reaches any environment.

**Pre-deploy hooks** run automated tests before the build begins. This includes unit tests, integration tests, and linting. If any test fails, the build is aborted and the developer is notified. In production, the pre-deploy hook also runs database migration validation (checking that all pending migrations can be applied cleanly against a test database).

**Build** runs on the Coolify server. Coolify pulls the latest code from the git repository, builds the Docker image using the service's Dockerfile, and tags it with the git commit hash and a timestamp. Build logs are streamed to the Coolify UI for real-time monitoring. Build failures trigger immediate notifications to the engineering team.

**Deployment** uses a rolling update strategy to achieve zero downtime. Coolify starts a new container with the updated image, waits for the health check to pass, and then stops the old container. During the transition, both old and new containers may be running simultaneously for a brief period (typically under 30 seconds). Traefik handles traffic routing to healthy containers only.

**Health checks** are defined for each container. The frontend health check hits the `/` endpoint and expects a 200 response. The backend health check hits `/api/v1/health` and expects a 200 response with a JSON body indicating database and Redis connectivity. The health check runs every 15 seconds with a start-up grace period of 60 seconds. If a container fails three consecutive health checks, Coolify automatically restarts it.

**Automatic rollback** is triggered if the new container fails its health check within the grace period. Coolify stops the new container and restarts the previous (known-good) container image. This ensures that a bad deployment does not leave the service in a degraded state. Manual rollback is also available through the Coolify UI, which allows selecting any previously deployed image version.

---

## 6. Environment Variables

All environment variables are managed through Coolify's environment variable UI, which provides secure storage, encrypted at rest, and accessible only to authorized Coolify users. Environment variables are never hardcoded in application code, never committed to git, and never shared between environments.

Each environment (development, staging, production) has its own complete set of environment variables. The variable names are consistent across environments, but the values differ. For example, `DATABASE_URL` points to the development database in development, the staging database in staging, and the production database in production.

Secret values (JWT signing key, database password, API keys, Cloudinary secret, Resend API key) are stored exclusively in Coolify's environment variable store. Non-secret configuration values (feature flags, log levels, CORS origins) are also stored as environment variables for consistency. The `.env.example` file in the repository documents all required variables with placeholder values and descriptions, serving as the source of truth for what variables need to be configured.

Secret scanning is enforced in the CI pipeline using tools like `gitleaks` or `trufflehog`. If any committed file (including history) contains patterns that look like secrets (API keys, passwords, tokens), the pipeline fails and the developer must remove the secret and rotate the compromised credential. This prevents accidental secret leakage through code commits.

Environment variable changes in Coolify require a container restart to take effect. For critical changes (e.g., rotating a compromised secret), the restart is performed immediately. For non-critical changes, the restart is batched with the next deployment. All environment variable changes are logged in Coolify's audit log.

---

## 7. SSL/TLS

SSL/TLS is provisioned and managed automatically by Coolify using Let's Encrypt. When a new domain or subdomain is configured in Coolify, it automatically requests a certificate from Let's Encrypt, validates domain ownership via the HTTP-01 challenge (Traefik handles the challenge response), and installs the certificate. Certificate renewal is fully automatic — Coolify renews certificates before they expire (typically at 30 days before expiry) with no manual intervention.

TLS 1.2 and TLS 1.3 are the only permitted TLS versions. TLS 1.0 and TLS 1.1 are disabled at the Traefik level to prevent use of deprecated encryption protocols. Strong cipher suites are enforced, and weak ciphers (RC4, DES, export-grade) are explicitly excluded.

HTTP Strict Transport Security (HSTS) is enabled via Traefik configuration. The `Strict-Transport-Security` header is set with a `max-age` of 365 days (31,536,000 seconds) and includes the `includeSubDomains` and `preload` directives. This ensures that browsers always use HTTPS for the platform, even if the user types an HTTP URL. HSTS preload submission is planned for Phase 2 once the platform has been operating stably.

Additional security headers are configured at the Traefik level: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection: 1; mode=block`, and `Referrer-Policy: strict-origin-when-cross-origin`. The `Content-Security-Policy` header is managed at the Next.js application level for more granular control over script and resource loading policies.

---

## 8. Monitoring

Coolify provides built-in monitoring capabilities that serve as the foundation for operational observability. The Coolify dashboard displays container status (running, stopped, restarting), resource utilization (CPU, memory, disk I/O), and recent log output for each service. These metrics are accessible through the Coolify web UI and provide a quick overview of system health.

Custom health check endpoints supplement Coolify's built-in monitoring. The backend exposes `/api/v1/health`, which returns a JSON response indicating the health of all dependencies: database connectivity (a lightweight `SELECT 1` query), Redis connectivity (a `PING` command), and application version. The frontend health check at `/` returns the rendered page with a 200 status code. Coolify is configured to use these endpoints for container health checks.

Log aggregation is handled through Coolify's log viewer, which streams Docker container logs in real-time. For persistent log storage and analysis, container logs are configured to use the JSON log driver, making them machine-parseable. In Phase 2, logs will be forwarded to a centralized logging solution (Loki or similar) for long-term retention, search, and alerting. In Phase 1, Docker's built-in log rotation (`max-size=50m`, `max-file=5`) prevents unbounded log growth.

External uptime monitoring is provided by UptimeRobot (or equivalent service) with HTTP checks every 60 seconds against the frontend URL and the API health endpoint. UptimeRobot sends alerts via email and Slack when a check fails for two consecutive probes (2-minute downtime before alert). Monthly uptime reports are reviewed by the team, and the target uptime is 99.9% (excluding scheduled maintenance windows).

---

## 9. Rollback Strategy

Coolify supports image-based rollback, which is the primary rollback mechanism. When a deployment succeeds, Coolify retains the previous container image. If issues are detected post-deployment, an administrator can select the previous image version from the Coolify UI and initiate a rollback. The rollback process stops the current container and starts the previous container image, reverting the service to its known-good state within minutes.

Database migrations complicate rollback because Prisma's forward-only migration strategy does not support `down()` migrations in production. To handle this, all migrations must be forward-compatible: new migrations must not break existing application code. This is achieved by making schema changes in multiple steps (add new column, deploy code, then remove old column). If a rollback is needed, the previous application code can still function against the migrated database.

Feature flags provide an additional rollback mechanism that does not require code rollback. New features are deployed behind feature flags (stored in the database or Redis) that can be toggled off without redeploying. If a new feature causes issues in production, the feature flag is disabled, instantly removing the feature from users without any deployment. Feature flags are managed through admin API endpoints and the Coolify environment variable system.

Automatic backup is performed before each production deployment. A PostgreSQL backup (via `pg_dump`) is triggered as a pre-deploy hook, ensuring that a consistent snapshot exists before any code or migration changes are applied. If a migration fails or causes data corruption, the database can be restored from this pre-deployment backup. The backup is tagged with the deployment version and timestamp for traceability.

---

## 10. Resource Requirements

The minimum VPS specification for running the full platform in Phase 1 is 4 CPU cores, 8GB RAM, and 100GB SSD storage. This allocation supports all five containers with comfortable headroom for moderate traffic. The breakdown is approximately: Coolify and Traefik (0.5 CPU, 512MB RAM), Frontend (1 CPU, 1GB RAM), Backend (1 CPU, 2GB RAM), Worker (0.5 CPU, 1GB RAM), PostgreSQL (1 CPU, 2GB RAM), Redis (0.5 CPU, 1GB RAM), and operating system overhead (0.5 CPU, 0.5GB RAM).

The recommended VPS specification for production with growth headroom is 8 CPU cores, 16GB RAM, and 200GB SSD storage. This allocation provides comfortable capacity for the initial user base (up to 100,000 registered users) and allows for vertical scaling without hardware changes. The additional resources are distributed across containers based on observed utilization patterns, with PostgreSQL and the backend API typically receiving the largest allocations.

A separate persistent volume is required for PostgreSQL data storage. This volume must be backed by SSD storage and should be sized at least 50GB for Phase 1, with the ability to be expanded as data grows. The volume is managed by Docker and mounted into the PostgreSQL container. Separating the database volume from the container's ephemeral storage ensures that database data persists across container rebuilds and redeployments.

Memory limits are configured at the Docker container level to prevent any single container from consuming all available memory and causing an out-of-memory condition that affects other services. PostgreSQL has the highest memory limit (4GB on the recommended spec) with `shared_buffers` set to 1GB. The backend API is limited to 2GB. Redis is limited to 1GB. If a container exceeds its memory limit, it is restarted by the Docker daemon, and Coolify's health check ensures it returns to a healthy state.

---

## 11. DNS & Domains

The primary domain (e.g., `investplatform.com`) serves the Next.js frontend application. All public-facing pages, marketing content, and the user dashboard are accessible through this domain. DNS is configured with an A record pointing to the VPS IP address. Coolify's Traefik handles the incoming requests and routes them to the frontend container.

The API subdomain (`api.investplatform.com`) serves the backend REST API. A separate subdomain is used for the API to enable independent SSL certificate management, CORS policy configuration, and future infrastructure changes (e.g., moving the API to a separate server). DNS is configured with a CNAME or A record pointing to the same VPS IP address. Traefik routes requests to this subdomain to the backend API container.

Separate domains or subdomains are used for the staging environment (e.g., `staging.investplatform.com` and `api.staging.investplatform.com`). Staging DNS records point to the same VPS (or a separate staging VPS), and Traefik routes based on the hostname. This ensures that staging and production are completely isolated at the DNS and routing level, preventing any cross-environment traffic.

DNS propagation is managed through the domain registrar's API where possible, enabling automated DNS configuration as part of the infrastructure provisioning process. DNS records are documented in the infrastructure documentation and include TTL values, record types, and the services they route to. DNS changes for production require approval and are made during low-traffic periods to minimize the impact of DNS caching delays.