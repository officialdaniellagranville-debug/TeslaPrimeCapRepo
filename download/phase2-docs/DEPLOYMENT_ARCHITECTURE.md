# Deployment Architecture

**Project:** TeslaPrimeCapital — Enterprise Investment Platform
**Phase:** 2 — Technical Architecture
**Version:** 1.0.0
**Last Updated:** 2025-01
**Status:** Approved

This document defines the complete deployment architecture for the TeslaPrimeCapital investment platform, covering Docker containerization, Coolify orchestration, CI/CD pipelines, SSL management, backup strategies, monitoring, scaling, and security hardening.

---

## 1. Deployment Overview

TeslaPrimeCapital is deployed as a fully containerized application on a self-hosted infrastructure stack. The deployment model prioritizes operational simplicity for Phase 1 while maintaining an evolutionary path to horizontal scaling for Phase 2 and beyond.

### 1.1 Deployment Model

| Attribute | Value |
|-----------|-------|
| **Orchestration** | Coolify (self-hosted PaaS) |
| **Container Runtime** | Docker Engine v25+ |
| **Container Orchestration** | Docker Compose v2.29+ |
| **Reverse Proxy** | Traefik v3 (managed by Coolify) |
| **Initial Topology** | Single VPS (monolithic container layout) |
| **Scaling Strategy** | Vertical-first, horizontal-second |
| **SSL Provider** | Let's Encrypt (auto-provisioned by Coolify) |
| **Target Uptime** | 99.9% (excluding scheduled maintenance) |

### 1.2 Service Inventory

The platform consists of the following deployable services:

| Service | Technology | Internal Port | External Exposure |
|---------|-----------|---------------|-------------------|
| **App** (Frontend + API) | Next.js 14+ (App Router, standalone) | 3000 | Via Traefik (443) |
| **PostgreSQL** | PostgreSQL 16 | 5432 | None (internal only) |
| **Redis** | Redis 7.2+ | 6379 | None (internal only) |

External SaaS dependencies (no containerization required):

| Service | Purpose | Connection Method |
|---------|---------|-------------------|
| **Cloudinary** | Media storage & transformations | API over HTTPS |
| **Resend** | Transactional email delivery | API over HTTPS |

### 1.3 Deployment Principles

1. **Immutable Infrastructure** — Every deployment produces a new Docker image. Containers are never modified in-place; they are replaced.
2. **Stateless Application** — All session state, caches, and rate-limit data reside in Redis. Application containers are fully ephemeral.
3. **Environment Parity** — Development, staging, and production run the same Docker images with environment-specific configuration.
4. **Zero-Downtime Deployments** — Rolling updates with health-check gates ensure new containers are healthy before old containers are terminated.
5. **Infrastructure as Code** — All Docker, Compose, and Coolify configuration is version-controlled and reproducible.

---

## 2. Infrastructure Architecture Diagram

### 2.1 High-Level Infrastructure

```mermaid
graph TB
    subgraph Internet["Internet"]
        User["Global Users"]
        ExternalAPI["External APIs"]
        ExternalAPI ---|"Resend / Cloudinary / Exchange Rates"| AppContainer
    end

    subgraph VPS["VPS — TeslaPrimeCapital Host"]
        subgraph Firewall["UFW Firewall"]
            subgraph TraefikLayer["Traefik Reverse Proxy (Port 80/443)"]
                SSL["SSL/TLS Termination<br/>Let's Encrypt"]
                Router["Host-Based Routing"]
            end

            subgraph Coolify["Coolify PaaS"]
                CoolifyAPI["Coolify Management API"]
                CoolifyUI["Coolify Dashboard"]
            end

            subgraph DockerNetwork["Docker Bridge Network (teslaprime-net)"]
                AppContainer["App Container<br/>Next.js (standalone)<br/>Port 3000"]
                PostgresContainer["PostgreSQL 16<br/>Port 5432"]
                RedisContainer["Redis 7.2<br/>Port 6379"]
            end

            subgraph Volumes["Docker Volumes"]
                PGData["pgdata<br/>(PostgreSQL Data)"]
                RedisData["redisdata<br/>(Redis Persistence)"]
            end
        end
    end

    User -->|"HTTPS"| Router
    Router -->|"teslaprimecapital.com<br/>www.teslaprimecapital.com"| AppContainer
    Router -->|"api.teslaprimecapital.com"| AppContainer

    AppContainer <-->|"TCP 5432"| PostgresContainer
    AppContainer <-->|"TCP 6379"| RedisContainer
    PostgresContainer --- PGData
    RedisContainer --- RedisData

    CoolifyAPI -.->|"Manages"| AppContainer
    CoolifyAPI -.->|"Manages"| PostgresContainer
    CoolifyAPI -.->|"Manages"| RedisContainer

    classDef user fill:#e1f5fe,stroke:#0288d1
    classDef infra fill:#f3e5f5,stroke:#7b1fa2
    classDef service fill:#e8f5e9,stroke:#2e7d32
    classDef storage fill:#fff3e0,stroke:#ef6c00
    class User user
    class ExternalAPI user
    class TraefikLayer,Firewall,Coolify infra
    class AppContainer,PostgresContainer,RedisContainer service
    class PGData,RedisData storage
```

### 2.2 Request Flow

```mermaid
sequenceDiagram
    participant U as User Browser
    participant T as Traefik (Port 443)
    participant A as Next.js App (Port 3000)
    participant R as Redis (Port 6379)
    participant P as PostgreSQL (Port 5432)
    participant C as Cloudinary / Resend

    U->>T: HTTPS Request (teslaprimecapital.com)
    T->>T: SSL Termination
    T->>T: Route to App Container
    T->>A: Forward Request (HTTP)
    
    A->>R: Session Lookup / Cache Check
    R-->>A: Cache Hit / Miss
    
    alt Cache Miss
        A->>P: Database Query
        P-->>A: Query Result
        A->>R: Cache Write (TTL)
    end
    
    alt Media Upload Required
        A->>C: Upload to Cloudinary
        C-->>A: Signed URL Response
    end
    
    alt Email Required
        A->>C: Send via Resend
        C-->>A: Delivery Confirmation
    end
    
    A-->>T: HTTP Response (HTML/JSON)
    T-->>U: HTTPS Response (Compressed)
```

### 2.3 Deployment Flow

```mermaid
flowchart LR
    Dev["Developer"] -->|"git push main"| GitHub["GitHub Repository"]
    GitHub -->|"Webhook"| Coolify["Coolify Server"]
    Coolify -->|"Pull & Build"| DockerBuild["Docker Build<br/>(Multi-Stage)"]
    DockerBuild -->|"Image"| Registry["Local Image Cache"]
    Registry -->|"Deploy"| NewContainer["New Container"]
    NewContainer -->|"Health Check"| Healthy{"Healthy?"}
    Healthy -->|"Yes"| StopOld["Stop Old Container"]
    Healthy -->|"No"| Rollback["Rollback to Previous"]
    StopOld --> Live["Live Traffic"]
    Rollback --> Live
```

---

## 3. Docker Setup

### 3.1 Multi-Stage Dockerfile for Next.js App

The application Dockerfile uses a three-stage build to produce a minimal, secure production image:

```dockerfile
# ============================================================
# TeslaPrimeCapital — Next.js Application Dockerfile
# Multi-stage build: deps → build → production
# ============================================================

# -------------------------------------------------------
# Stage 1: Dependencies
# Installs all dependencies (including devDependencies
# needed for the build step) in a separate layer for
# Docker layer caching optimization.
# -------------------------------------------------------
FROM node:20-alpine AS deps

RUN apk add --no-cache libc6-compat

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

# Install pnpm globally and all dependencies
RUN corepack enable && corepack prepare pnpm@latest --activate \
    && pnpm install --frozen-lockfile

# -------------------------------------------------------
# Stage 2: Build
# Copies source code and runs the Next.js production
# build. Outputs to .next/standalone for minimal image.
# -------------------------------------------------------
FROM node:20-alpine AS build

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set build-time environment variables (non-secret)
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Generate Prisma client
RUN npx prisma generate

# Build Next.js in standalone output mode
RUN corepack enable && corepack prepare pnpm@latest --activate \
    && pnpm build

# -------------------------------------------------------
# Stage 3: Production
# Minimal image with only the standalone server output,
# public assets, and Prisma client. No devDependencies.
# -------------------------------------------------------
FROM node:20-alpine AS production

# Security: Run as non-root user
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

# Install only runtime dependencies
RUN apk add --no-cache tini dumb-init

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Copy standalone server output
COPY --from=build /app/.next/standalone ./
# Copy static and public assets
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
# Copy Prisma client for runtime database access
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma

# Change ownership to non-root user
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

# Health check endpoint
HEALTHCHECK --interval=15s --timeout=5s --start-period=60s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Use tini as PID 1 for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
```

### 3.2 .dockerignore

```dockerignore
# Dependencies
node_modules
.pnpm-store

# Build artifacts
.next
dist
out
build

# Version control
.git
.gitignore

# Environment files (NEVER in image)
.env
.env.local
.env.staging
.env.production
.env*.local

# IDE
.vscode
.idea
*.swp
*.swo

# OS files
.DS_Store
Thumbs.db

# Documentation
*.md
docs/
phase1-docs/
phase2-docs/

# Testing
coverage/
__tests__/
*.test.ts
*.spec.ts

# Docker
Dockerfile*
docker-compose*
.dockerignore
```

### 3.3 Docker Compose Configuration

The complete `docker-compose.yml` defines all services, networks, and volumes for the platform:

```yaml
# ============================================================
# TeslaPrimeCapital — Docker Compose Configuration
# Services: app (Next.js), postgres, redis
# ============================================================

services:
  # ----------------------------------------------------------
  # Next.js Application
  # Serves both SSR pages and API routes
  # ----------------------------------------------------------
  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: teslaprime-app
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=${NODE_ENV:-production}
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - JWT_ACCESS_SECRET=${JWT_ACCESS_SECRET}
      - JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
      - JWT_ACCESS_EXPIRY=${JWT_ACCESS_EXPIRY:-15m}
      - JWT_REFRESH_EXPIRY=${JWT_REFRESH_EXPIRY:-7d}
      - APP_URL=${APP_URL}
      - APP_NAME=${APP_NAME:-TeslaPrimeCapital}
      - CLOUDINARY_CLOUD_NAME=${CLOUDINARY_CLOUD_NAME}
      - CLOUDINARY_API_KEY=${CLOUDINARY_API_KEY}
      - CLOUDINARY_API_SECRET=${CLOUDINARY_API_SECRET}
      - RESEND_API_KEY=${RESEND_API_KEY}
      - RESEND_FROM_EMAIL=${RESEND_FROM_EMAIL}
      - ENCRYPTION_KEY=${ENCRYPTION_KEY}
      - LOG_LEVEL=${LOG_LEVEL:-info}
      - ENABLE_DEMO_MODE=${ENABLE_DEMO_MODE:-true}
      - ENABLE_LIVE_MODE=${ENABLE_LIVE_MODE:-true}
      - ENABLE_2FA=${ENABLE_2FA:-true}
      - ENABLE_REFERRAL_PROGRAM=${ENABLE_REFERRAL_PROGRAM:-true}
      - ENABLE_REGISTRATION=${ENABLE_REGISTRATION:-true}
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - teslaprime-net
    deploy:
      resources:
        limits:
          cpus: "2.0"
          memory: 2G
        reservations:
          cpus: "0.5"
          memory: 512M
    logging:
      driver: json-file
      options:
        max-size: "50m"
        max-file: "5"
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/api/health"]
      interval: 15s
      timeout: 5s
      start_period: 60s
      retries: 3

  # ----------------------------------------------------------
  # PostgreSQL Database
  # Primary data store for all platform data
  # ----------------------------------------------------------
  postgres:
    image: postgres:16-alpine
    container_name: teslaprime-postgres
    restart: unless-stopped
    # Port NOT exposed externally — internal network only
    # ports:
    #   - "5432:5432"
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-teslaprime}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB:-teslaprime}
      POSTGRES_INITDB_ARGS: "--encoding=UTF-8 --lc-collate=C --lc-ctype=C"
    volumes:
      - pgdata:/var/lib/postgresql/data
    networks:
      - teslaprime-net
    deploy:
      resources:
        limits:
          cpus: "2.0"
          memory: 4G
        reservations:
          cpus: "0.5"
          memory: 1G
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-teslaprime} -d ${POSTGRES_DB:-teslaprime}"]
      interval: 10s
      timeout: 5s
      start_period: 30s
      retries: 5
    logging:
      driver: json-file
      options:
        max-size: "50m"
        max-file: "3"

  # ----------------------------------------------------------
  # Redis Cache & Session Store
  # Also serves as BullMQ job queue broker
  # ----------------------------------------------------------
  redis:
    image: redis:7-alpine
    container_name: teslaprime-redis
    restart: unless-stopped
    # Port NOT exposed externally — internal network only
    # ports:
    #   - "6379:6379"
    command: >
      redis-server
      --requirepass ${REDIS_PASSWORD}
      --maxmemory 768mb
      --maxmemory-policy allkeys-lru
      --appendonly yes
      --appendfsync everysec
      --save 900 1
      --save 300 10
      --save 60 10000
      --appendfilename "appendonly.aof"
      --dbfilename "dump.rdb"
    volumes:
      - redisdata:/data
    networks:
      - teslaprime-net
    deploy:
      resources:
        limits:
          cpus: "1.0"
          memory: 1G
        reservations:
          cpus: "0.25"
          memory: 256M
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping"]
      interval: 10s
      timeout: 5s
      start_period: 15s
      retries: 5
    logging:
      driver: json-file
      options:
        max-size: "20m"
        max-file: "3"

# ============================================================
# Networks
# ============================================================
networks:
  teslaprime-net:
    driver: bridge
    internal: false
    name: teslaprime-net

# ============================================================
# Volumes
# ============================================================
volumes:
  pgdata:
    driver: local
    name: teslaprime-pgdata
  redisdata:
    driver: local
    name: teslaprime-redisdata
```

### 3.4 Network Isolation

All inter-service communication occurs exclusively over the `teslaprime-net` Docker bridge network:

- **PostgreSQL (port 5432)** — Not mapped to the host. Only reachable from containers on `teslaprime-net` via the hostname `postgres`.
- **Redis (port 6379)** — Not mapped to the host. Only reachable from containers on `teslaprime-net` via the hostname `redis`.
- **App (port 3000)** — Mapped to the host only during local development. In production, Traefik routes to the container directly via the Docker network.

This ensures that the database and cache are never accessible from the public internet, even if the host firewall is misconfigured.

```mermaid
graph LR
    subgraph DockerNetwork["teslaprime-net (Bridge Network)"]
        App["app:3000"]
        PG["postgres:5432"]
        RD["redis:6379"]
    end

    subgraph Host["Host Machine"]
        Traefik["Traefik"]
    end

    subgraph External["Internet"]
        Users["Users"]
    end

    Users -->|"443"| Traefik
    Traefik -->|"Docker Network"| App
    App <-->|"Internal Only"| PG
    App <-->|"Internal Only"| RD

    style PG fill:#fce4ec,stroke:#c62828
    style RD fill:#fce4ec,stroke:#c62828
```

---

## 4. Coolify Configuration

### 4.1 Service Definitions

Each service is registered in Coolify as a separate resource. Coolify discovers and manages containers based on these definitions.

**App Service:**
- **Type:** Public Repository (GitHub)
- **Build Pack:** Dockerfile (auto-detected)
- **Branch:** `main` (production), `develop` (staging)
- **Domains:** `teslaprimecapital.com`, `www.teslaprimecapital.com`
- **Docker Compose Location:** Root of repository

**PostgreSQL Service:**
- **Type:** Public Service (pre-built image `postgres:16-alpine`)
- **No Git source** — Managed as an infrastructure service
- **Configuration:** Environment variables set in Coolify UI

**Redis Service:**
- **Type:** Public Service (pre-built image `redis:7-alpine`)
- **No Git source** — Managed as an infrastructure service
- **Configuration:** Custom command and environment variables in Coolify UI

### 4.2 Environment Variables Management

Environment variables in Coolify are managed through the secure web UI:

1. Navigate to the service → **Environment** tab
2. Add all required variables (see Section 5 for complete list)
3. Variables are encrypted at rest in Coolify's database
4. Changes require a service restart to take effect

**Best practices:**
- Never commit `.env.production` to version control
- Use Coolify's built-in secret masking (variables appear as `***` in logs)
- Reference the `.env.example` file in the repository for the authoritative list of required variables
- Use different values for staging and production environments

### 4.3 SSL/HTTPS Configuration

SSL is fully managed by Coolify's integrated Traefik proxy:

1. In Coolify, navigate to the service → **Domains** tab
2. Add domain: `teslaprimecapital.com`
3. Toggle **"HTTPS"** — Coolify automatically provisions a Let's Encrypt certificate
4. Toggle **"Redirect HTTP to HTTPS"**
5. Traefik handles certificate renewal automatically (30 days before expiry)

**TLS Configuration (applied via Traefik labels or Coolify settings):**

```
TLS_MIN_VERSION: TLS1.2
TLS_CIPHER_SUITES: TLS_AES_256_GCM_SHA384,TLS_CHACHA20_POLY1305_SHA256,TLS_AES_128_GCM_SHA256
HSTS_MAX_AGE: 31536000
HSTS_INCLUDE_SUBDOMAINS: true
HSTS_PRELOAD: true
```

### 4.4 Auto-Deploy from Git

Coolify monitors the configured GitHub branch for changes. The auto-deploy flow:

1. Developer pushes to `main` branch
2. GitHub sends a webhook to Coolify
3. Coolify pulls the latest commit
4. Coolify builds a new Docker image
5. Coolify deploys the new container with rolling update
6. Health checks validate the new container
7. Old container is removed

**Configuration:**
- Enable **"Auto Deploy"** toggle in the Coolify service settings
- Set the **webhook secret** in GitHub repository settings → Webhooks
- Ensure the GitHub repository grants Coolify read access

### 4.5 Health Checks

Coolify uses the container-level `HEALTHCHECK` directives defined in the Dockerfile and docker-compose.yml. Additional monitoring is configured in the Coolify service settings:

| Check | Endpoint | Interval | Timeout | Retries | Expected |
|-------|----------|----------|---------|---------|----------|
| App Liveness | `GET /api/health` | 15s | 5s | 3 | HTTP 200 + JSON |
| PostgreSQL | `pg_isready` | 10s | 5s | 5 | Exit code 0 |
| Redis | `redis-cli ping` | 10s | 5s | 5 | `PONG` response |

The application health endpoint (`/api/health`) returns:

```json
{
  "status": "healthy",
  "timestamp": "2025-01-15T14:30:00.000Z",
  "version": "1.0.0",
  "uptime": 86400,
  "checks": {
    "database": "connected",
    "redis": "connected"
  }
}
```

### 4.6 Resource Limits

Resource limits are enforced at the container level via Docker Compose `deploy.resources` (as shown in Section 3.3). These limits prevent any single container from consuming all host resources:

| Service | CPU Limit | Memory Limit | CPU Reservation | Memory Reservation |
|---------|-----------|-------------|-----------------|-------------------|
| App | 2.0 cores | 2 GB | 0.5 cores | 512 MB |
| PostgreSQL | 2.0 cores | 4 GB | 0.5 cores | 1 GB |
| Redis | 1.0 cores | 1 GB | 0.25 cores | 256 MB |

When a container exceeds its memory limit, the Docker daemon terminates it with an OOM kill. Coolify's restart policy (`unless-stopped`) automatically restarts the container.

---

## 5. Environment Management

### 5.1 Environment Strategy

Three environments are maintained with complete isolation:

```mermaid
graph TB
    subgraph Dev["Development (Local)"]
        DevApp["App: localhost:3000"]
        DevPG["PostgreSQL: localhost:5432"]
        DevRedis["Redis: localhost:6379"]
        DevApp --- DevPG
        DevApp --- DevRedis
    end

    subgraph Staging["Staging (Coolify)"]
        StgApp["App: staging.teslaprimecapital.com"]
        StgPG["PostgreSQL (staging DB)"]
        StgRedis["Redis (staging)"]
        StgApp --- StgPG
        StgApp --- StgRedis
    end

    subgraph Prod["Production (Coolify)"]
        PrdApp["App: teslaprimecapital.com"]
        PrdPG["PostgreSQL (production DB)"]
        PrdRedis["Redis (production)"]
        PrdApp --- PrdPG
        PrdApp --- PrdRedis
    end

    Dev -->|"PR to develop"| Staging
    Staging -->|"Tag release"| Prod

    style Dev fill:#e3f2fd,stroke:#1565c0
    style Staging fill:#fff3e0,stroke:#ef6c00
    style Prod fill:#e8f5e9,stroke:#2e7d32
```

### 5.2 Environment Files

**`.env.local` (Development):**
```env
# TeslaPrimeCapital — Development Environment
NODE_ENV=development
APP_URL=http://localhost:3000
APP_NAME=TeslaPrimeCapital (Dev)
PORT=3000

# Database
DATABASE_URL=postgresql://teslaprime:devpassword@localhost:5432/teslaprime_dev
POSTGRES_USER=teslaprime
POSTGRES_PASSWORD=devpassword
POSTGRES_DB=teslaprime_dev

# Redis
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=devredispass

# Auth (short-lived for development)
JWT_ACCESS_SECRET=dev-access-secret-minimum-32-chars-long!!
JWT_REFRESH_SECRET=dev-refresh-secret-minimum-32-chars-long!!
JWT_ACCESS_EXPIRY=1d
JWT_REFRESH_EXPIRY=30d

# Encryption
ENCRYPTION_KEY=0123456789abcdef0123456789abcdef

# External Services
CLOUDINARY_CLOUD_NAME=dev-cloud
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=dev-cloud-secret
RESEND_API_KEY=re_dev_test_api_key
RESEND_FROM_EMAIL=dev@teslaprimecapital.com

# Logging
LOG_LEVEL=debug

# Feature Flags
ENABLE_DEMO_MODE=true
ENABLE_LIVE_MODE=true
ENABLE_2FA=true
ENABLE_REFERRAL_PROGRAM=true
ENABLE_REGISTRATION=true
```

**`.env.staging` (Staging):**
```env
# TeslaPrimeCapital — Staging Environment
NODE_ENV=staging
APP_URL=https://staging.teslaprimecapital.com
APP_NAME=TeslaPrimeCapital (Staging)
PORT=3000

# Database
DATABASE_URL=postgresql://teslaprime:stgpassword@postgres:5432/teslaprime_staging
POSTGRES_USER=teslaprime
POSTGRES_PASSWORD=<COOLIFY_SECRET>
POSTGRES_DB=teslaprime_staging

# Redis
REDIS_URL=redis://redis:6379
REDIS_PASSWORD=<COOLIFY_SECRET>

# Auth
JWT_ACCESS_SECRET=<COOLIFY_SECRET>
JWT_REFRESH_SECRET=<COOLIFY_SECRET>
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Encryption
ENCRYPTION_KEY=<COOLIFY_SECRET>

# External Services
CLOUDINARY_CLOUD_NAME=staging-cloud
CLOUDINARY_API_KEY=<COOLIFY_SECRET>
CLOUDINARY_API_SECRET=<COOLIFY_SECRET>
RESEND_API_KEY=<COOLIFY_SECRET>
RESEND_FROM_EMAIL=staging@teslaprimecapital.com

# Logging
LOG_LEVEL=info

# Feature Flags
ENABLE_DEMO_MODE=true
ENABLE_LIVE_MODE=true
ENABLE_2FA=true
ENABLE_REFERRAL_PROGRAM=true
ENABLE_REGISTRATION=true
```

**`.env.production` (Production):**
```env
# TeslaPrimeCapital — Production Environment
# MANAGED EXCLUSIVELY THROUGH COOLIFY UI
# NEVER COMMIT THIS FILE TO VERSION CONTROL
NODE_ENV=production
APP_URL=https://teslaprimecapital.com
APP_NAME=TeslaPrimeCapital
PORT=3000

# Database
DATABASE_URL=postgresql://teslaprime:<SECRET>@postgres:5432/teslaprime
POSTGRES_USER=teslaprime
POSTGRES_PASSWORD=<COOLIFY_SECRET>
POSTGRES_DB=teslaprime

# Redis
REDIS_URL=redis://:password@redis:6379
REDIS_PASSWORD=<COOLIFY_SECRET>

# Auth
JWT_ACCESS_SECRET=<COOLIFY_SECRET_64CHARS>
JWT_REFRESH_SECRET=<COOLIFY_SECRET_64CHARS>
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Encryption
ENCRYPTION_KEY=<COOLIFY_SECRET_32BYTES_HEX>

# External Services
CLOUDINARY_CLOUD_NAME=<COOLIFY_SECRET>
CLOUDINARY_API_KEY=<COOLIFY_SECRET>
CLOUDINARY_API_SECRET=<COOLIFY_SECRET>
RESEND_API_KEY=<COOLIFY_SECRET>
RESEND_FROM_EMAIL=noreply@teslaprimecapital.com

# Logging
LOG_LEVEL=info
SENTRY_DSN=<COOLIFY_SECRET>

# Feature Flags
ENABLE_DEMO_MODE=true
ENABLE_LIVE_MODE=true
ENABLE_2FA=true
ENABLE_REFERRAL_PROGRAM=true
ENABLE_REGISTRATION=true
```

### 5.3 Complete Environment Variable Reference

| Variable | Dev | Staging | Production | Category | Secret |
|----------|-----|---------|------------|----------|--------|
| `NODE_ENV` | `development` | `staging` | `production` | App | No |
| `APP_URL` | `http://localhost:3000` | `https://staging...` | `https://teslaprime...` | App | No |
| `APP_NAME` | TeslaPrimeCapital (Dev) | ... (Staging) | TeslaPrimeCapital | App | No |
| `PORT` | `3000` | `3000` | `3000` | App | No |
| `DATABASE_URL` | `postgresql://...dev` | `postgresql://...stg` | `postgresql://...prod` | Database | Yes |
| `POSTGRES_USER` | `teslaprime` | `teslaprime` | `teslaprime` | Database | No |
| `POSTGRES_PASSWORD` | `devpassword` | Secret | Secret | Database | Yes |
| `POSTGRES_DB` | `teslaprime_dev` | `teslaprime_staging` | `teslaprime` | Database | No |
| `DATABASE_POOL_MIN` | `2` | `5` | `10` | Database | No |
| `DATABASE_POOL_MAX` | `10` | `20` | `20` | Database | No |
| `DATABASE_SSL_MODE` | `disable` | `prefer` | `require` | Database | No |
| `REDIS_URL` | `redis://localhost:6379` | `redis://redis:6379` | `redis://:pw@redis:6379` | Redis | Yes |
| `REDIS_PASSWORD` | `devredispass` | Secret | Secret | Redis | Yes |
| `REDIS_DB` | `0` | `1` | `0` | Redis | No |
| `JWT_ACCESS_SECRET` | Dev value | Secret | Secret (64+ chars) | Auth | Yes |
| `JWT_REFRESH_SECRET` | Dev value | Secret | Secret (64+ chars) | Auth | Yes |
| `JWT_ACCESS_EXPIRY` | `1d` | `15m` | `15m` | Auth | No |
| `JWT_REFRESH_EXPIRY` | `30d` | `7d` | `7d` | Auth | No |
| `ENCRYPTION_KEY` | Dev hex | Secret | Secret (32 bytes hex) | Security | Yes |
| `CLOUDINARY_CLOUD_NAME` | Dev name | Staging name | Prod name | External | No |
| `CLOUDINARY_API_KEY` | Dev key | Secret | Secret | External | Yes |
| `CLOUDINARY_API_SECRET` | Dev secret | Secret | Secret | External | Yes |
| `RESEND_API_KEY` | Dev key | Secret | Secret | External | Yes |
| `RESEND_FROM_EMAIL` | `dev@...` | `staging@...` | `noreply@...` | External | No |
| `LOG_LEVEL` | `debug` | `info` | `info` | Logging | No |
| `SENTRY_DSN` | — | Optional | Secret | Logging | Yes |
| `ENABLE_DEMO_MODE` | `true` | `true` | `true` | Feature Flag | No |
| `ENABLE_LIVE_MODE` | `true` | `true` | `true` | Feature Flag | No |
| `ENABLE_2FA` | `true` | `true` | `true` | Feature Flag | No |
| `ENABLE_REFERRAL_PROGRAM` | `true` | `true` | `true` | Feature Flag | No |
| `ENABLE_REGISTRATION` | `true` | `true` | `true` | Feature Flag | No |
| `ENABLE_CRYPTO_DEPOSITS` | `false` | `false` | `false` | Feature Flag | No |
| `ENABLE_GIFT_CARD_DEPOSITS` | `true` | `true` | `true` | Feature Flag | No |

---

## 6. CI/CD Pipeline

### 6.1 Pipeline Overview

```mermaid
flowchart TD
    Push["Git Push to Branch"] --> BranchCheck{"Branch?"}
    BranchCheck -->|"develop"| StagingFlow
    BranchCheck -->|"main"| ProdFlow
    BranchCheck -->|"feature/*"| PRFlow

    subgraph PRFlow["Pull Request Checks"]
        Lint["ESLint & Prettier"]
        TypeCheck["TypeScript Type Check"]
        UnitTest["Unit Tests (Vitest)"]
        Lint --> TypeCheck --> UnitTest
    end

    subgraph StagingFlow["Staging Deployment"]
        S1["Pull Code"]
        S2["Lint + Type Check"]
        S3["Build Docker Image"]
        S4["Run Migrations"]
        S5["Deploy to Staging"]
        S6["Health Check"]
        S1 --> S2 --> S3 --> S4 --> S5 --> S6
    end

    subgraph ProdFlow["Production Deployment"]
        P1["Tag Release (v*)"]
        P2["Pre-deploy Backup"]
        P3["Pull Code"]
        P4["Lint + Type Check + Tests"]
        P5["Build Docker Image"]
        P6["Validate Migrations"]
        P7["Run Migrations"]
        P8["Deploy (Rolling Update)"]
        P9["Health Check Gate"]
        P10["Confirm / Auto-Rollback"]
        P1 --> P2 --> P3 --> P4 --> P5 --> P6 --> P7 --> P8 --> P9 --> P10
    end

    UnitTest -->|"PR Approved → Merge to develop"| StagingFlow
    S6 -->|"Manual Approval → Tag Release"| ProdFlow

    style Push fill:#e3f2fd,stroke:#1565c0
    style PRFlow fill:#f3e5f5,stroke:#7b1fa2
    style StagingFlow fill:#fff3e0,stroke:#ef6c00
    style ProdFlow fill:#e8f5e9,stroke:#2e7d32
```

### 6.2 Pre-Deploy Checks

Before any deployment, the following checks run automatically:

```bash
#!/bin/bash
# pre-deploy-checks.sh — Run before every deployment

set -euo pipefail

echo "==> Running pre-deploy checks..."

# 1. Lint
echo ">> Step 1/4: ESLint & Prettier"
pnpm lint
if [ $? -ne 0 ]; then
    echo "FAIL: Linting failed. Fix linting errors before deploying."
    exit 1
fi

# 2. Type check
echo ">> Step 2/4: TypeScript type checking"
pnpm type-check
if [ $? -ne 0 ]; then
    echo "FAIL: Type check failed. Fix type errors before deploying."
    exit 1
fi

# 3. Unit & integration tests
echo ">> Step 3/4: Running tests"
pnpm test:ci
if [ $? -ne 0 ]; then
    echo "FAIL: Tests failed. Fix failing tests before deploying."
    exit 1
fi

# 4. Build validation
echo ">> Step 4/4: Build validation"
pnpm build
if [ $? -ne 0 ]; then
    echo "FAIL: Build failed. Fix build errors before deploying."
    exit 1
fi

echo "==> All pre-deploy checks passed."
```

### 6.3 Database Migration Strategy

Migrations are managed with Prisma Migrate and follow a forward-compatible strategy:

1. **Pre-deploy validation** — `npx prisma migrate diff` verifies that the migration can be applied cleanly
2. **Pre-deploy backup** — A `pg_dump` snapshot is taken before applying any migration
3. **Migration execution** — `npx prisma migrate deploy` applies pending migrations in order
4. **Post-migration verification** — Health check confirms database connectivity

```bash
# Migration deployment script (runs inside the app container)
npx prisma migrate deploy --schema ./prisma/schema.prisma
```

**Forward-compatibility rules:**
- New columns must have defaults or be nullable (so old code still works)
- Column renames use a three-step process: add new column → deploy code → remove old column
- Table drops are never performed in a single migration with code changes

### 6.4 Rollback Procedure

**Automatic Rollback (Coolify native):**
- If the new container fails 3 consecutive health checks within the start-up grace period (60s), Coolify stops the new container and restarts the previous container image
- No manual intervention required

**Manual Rollback (via Coolify UI):**
1. Navigate to the service in Coolify
2. Click **"Deployments"** tab
3. Identify the last known-good deployment
4. Click **"Redeploy"** on that deployment
5. Coolify rebuilds and deploys the previous image version

**Database Rollback (emergency):**
```bash
# Restore from pre-deploy backup
docker exec -i teslaprime-postgres \
    psql -U teslaprime -d teslaprime < /backups/pre-deploy-20250115-143000.sql

# Revert application code via Coolify UI rollback
```

**Feature Flag Rollback (instant, no deploy):**
- Disable the problematic feature flag in Coolify environment variables
- Restart the app container: the feature is immediately disabled
- No code rollback or database rollback required

---

## 7. SSL & Domain Configuration

### 7.1 Domain Structure

| Domain / Subdomain | Purpose | Route Target |
|--------------------|---------|--------------|
| `teslaprimecapital.com` | Primary application (canonical) | App Container |
| `www.teslaprimecapital.com` | Redirect to primary domain | 301 → `teslaprimecapital.com` |
| `staging.teslaprimecapital.com` | Staging environment | App Container (staging) |
| `api.teslaprimecapital.com` | API endpoint (future, if split) | App Container |

### 7.2 DNS Records Required

| Record | Type | Value | TTL | Purpose |
|--------|------|-------|-----|---------|
| `teslaprimecapital.com` | A | `<VPS_IP_ADDRESS>` | 3600 | Primary domain → VPS |
| `www.teslaprimecapital.com` | CNAME | `teslaprimecapital.com` | 3600 | WWW subdomain |
| `staging.teslaprimecapital.com` | A | `<VPS_IP_ADDRESS>` | 3600 | Staging environment |
| `api.teslaprimecapital.com` | A | `<VPS_IP_ADDRESS>` | 3600 | API subdomain (future) |
| `teslaprimecapital.com` | CAA | `0 issue "letsencrypt.org"` | 3600 | Authorize Let's Encrypt |
| `_dmarc.teslaprimecapital.com` | TXT | `v=DMARC1; p=none; rua=mailto:dmarc@teslaprimecapital.com` | 3600 | DMARC policy |
| `teslaprimecapital.com` | TXT | `v=spf1 include:resend.com ~all` | 3600 | SPF for Resend emails |
| `teslaprimecapital.com` | MX | `feedback-smtp.us-east-1.amazonses.com` (via Resend) | 3600 | Email receiving (if needed) |

### 7.3 SSL Certificate Management

SSL certificates are fully automated through Coolify + Traefik + Let's Encrypt:

```mermaid
sequenceDiagram
    participant Admin as Administrator
    participant CF as Coolify UI
    participant TR as Traefik
    participant LE as Let's Encrypt

    Admin->>CF: Add domain "teslaprimecapital.com"
    Admin->>CF: Toggle "HTTPS" ON
    CF->>TR: Configure ACME challenge route
    TR->>LE: Request certificate (HTTP-01 challenge)
    LE->>TR: Challenge verification
    TR->>LE: Challenge response
    LE->>TR: Issue certificate
    TR->>TR: Install certificate
    CF->>Admin: Certificate active ✓

    Note over TR,LE: Auto-renewal at 30 days before expiry
    LE->>TR: Renew certificate (no admin action)
```

**Certificate details:**
- **Provider:** Let's Encrypt (free, automated)
- **Type:** RSA 2048-bit or ECDSA P-256
- **Validity:** 90 days (auto-renewed at 60 days)
- **SANs:** All configured domains and subdomains
- **Storage:** Traefik's ACME storage (`/letsencrypt/acme.json`)

### 7.4 Security Headers (Traefik Middleware)

Configured via Traefik labels in Coolify or as a Traefik dynamic configuration:

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

---

## 8. Backup Strategy

### 8.1 Backup Architecture

```mermaid
graph TB
    subgraph Production["Production VPS"]
        PG["PostgreSQL<br/>teslaprime-pgdata"]
        Redis["Redis<br/>teslaprime-redisdata"]
    end

    subgraph BackupProcess["Backup Process"]
        PGDump["pg_dump<br/>(Custom Format)"]
        RDBSnap["Redis RDB Snapshot<br/>(Automatic)"]
        AOFSnap["Redis AOF File<br/>(Continuous)"]
    end

    subgraph Storage["Backup Storage"]
        LocalBackup["/backups/local/<br/>(On VPS)"]
        RemoteBackup["S3 / R2 / Offsite<br/>(Encrypted)"]
    end

    PG -->|"Cron: Every 6 hours"| PGDump
    PGDump --> LocalBackup
    LocalBackup -->|"rclone sync<br/>Every 24 hours"| RemoteBackup

    Redis -->|"save 900 1<br/>save 300 10<br/>save 60 10000"| RDBSnap
    Redis -->|"appendonly yes<br/>appendfsync everysec"| AOFSnap
    RDBSnap --> LocalBackup
    AOFSnap --> LocalBackup
    LocalBackup --> RemoteBackup

    style BackupProcess fill:#fff3e0,stroke:#ef6c00
    style Storage fill:#e8f5e9,stroke:#2e7d32
```

### 8.2 PostgreSQL Automated Backups

A cron job on the VPS (or a dedicated backup container) runs `pg_dump` at regular intervals:

```bash
#!/bin/bash
# /backups/scripts/pg-backup.sh
# PostgreSQL Automated Backup Script

set -euo pipefail

# Configuration
BACKUP_DIR="/backups/postgresql"
DB_CONTAINER="teslaprime-postgres"
DB_USER="${POSTGRES_USER:-teslaprime}"
DB_NAME="${POSTGRES_DB:-teslaprime}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
RETENTION_DAYS=30
RETENTION_COUNT=48

# Create backup directory
mkdir -p "${BACKUP_DIR}"

# Run pg_dump (custom format for parallel restore support)
echo "[${TIMESTAMP}] Starting PostgreSQL backup..."
docker exec "${DB_CONTAINER}" \
    pg_dump -U "${DB_USER}" -d "${DB_NAME}" \
    --format=custom \
    --compress=9 \
    --no-owner \
    --no-privileges \
    > "${BACKUP_DIR}/teslaprime-${TIMESTAMP}.dump"

# Verify backup
if [ $? -eq 0 ]; then
    BACKUP_SIZE=$(du -h "${BACKUP_DIR}/teslaprime-${TIMESTAMP}.dump" | cut -f1)
    echo "[${TIMESTAMP}] Backup completed successfully. Size: ${BACKUP_SIZE}"
else
    echo "[${TIMESTAMP}] ERROR: Backup failed!"
    exit 1
fi

# Retention cleanup — keep last N backups and delete older than N days
cd "${BACKUP_DIR}"
ls -t teslaprime-*.dump | tail -n +$((RETENTION_COUNT + 1)) | xargs -r rm --
find "${BACKUP_DIR}" -name "teslaprime-*.dump" -mtime +${RETENTION_DAYS} -delete

echo "[${TIMESTAMP}] Retention cleanup complete."
```

**Cron schedule (via host crontab):**
```cron
# PostgreSQL backups — every 6 hours
0 */6 * * * /backups/scripts/pg-backup.sh >> /backups/logs/pg-backup.log 2>&1

# Pre-deploy backup (triggered by Coolify webhook or manual)
```

### 8.3 Redis Persistence

Redis persistence is configured in the docker-compose.yml with dual persistence:

| Method | Configuration | Retention | Use Case |
|--------|--------------|-----------|----------|
| **RDB Snapshots** | `save 900 1`, `save 300 10`, `save 60 10000` | Point-in-time snapshots | Disaster recovery, cold restart |
| **AOF (Append Only File)** | `appendonly yes`, `appendfsync everysec` | Every-write log | Max 1 second data loss, warm restart |

**AOF rewrite** runs automatically when the AOF file grows to 100% of the last rewrite size (`auto-aof-rewrite-percentage 100`).

### 8.4 Backup Retention Policy

| Backup Type | Frequency | Retention | Storage |
|-------------|-----------|-----------|---------|
| PostgreSQL (pg_dump) | Every 6 hours | 30 days / 48 files | Local + Remote |
| Pre-deploy PostgreSQL | Every deployment | 90 days | Local + Remote |
| Redis RDB | Automatic (trigger-based) | 7 days | Local (volume) |
| Redis AOF | Continuous | 7 days | Local (volume) |
| Offsite sync | Daily | 90 days | S3 / Cloudflare R2 |

### 8.5 Disaster Recovery Procedure

**Scenario: Total VPS Failure**

1. **Provision new VPS** with the same or higher specifications
2. **Install Docker and Coolify** on the new VPS
3. **Restore PostgreSQL** from the latest offsite backup:
   ```bash
   docker run -d --name postgres-restore postgres:16-alpine
   docker exec -i postgres-restore \
       pg_restore -U teslaprime -d teslaprime \
       --clean --if-exists < teslaprime-latest.dump
   ```
4. **Deploy application** from GitHub via Coolify (same configuration)
5. **Restore Redis** from RDB snapshot (copy `dump.rdb` to Redis volume)
6. **Update DNS** to point to the new VPS IP address
7. **Verify SSL** certificate provisioning via Coolify
8. **Run smoke tests** against all critical endpoints

**Estimated recovery time:** 1–2 hours (assuming backups are accessible).

---

## 9. Monitoring & Health

### 9.1 Monitoring Stack

```mermaid
graph TB
    subgraph Sources["Data Sources"]
        AppLogs["App Container Logs"]
        PGLogs["PostgreSQL Logs"]
        RedisLogs["Redis Logs"]
        HealthAPI["/api/health Endpoint"]
        TraefikLogs["Traefik Access Logs"]
    end

    subgraph CoolifyMonitoring["Coolify Built-in Monitoring"]
        ContainerStatus["Container Status"]
        ResourceMetrics["CPU / Memory / Disk"]
        LogViewer["Real-time Log Stream"]
        DeploymentHistory["Deployment Log"]
    end

    subgraph ExternalMonitoring["External Monitoring"]
        Uptime["UptimeRobot / BetterUptime"]
        Uptime -->|"HTTP check every 60s"| HealthAPI
        Uptime -->|"SSL cert expiry check"| SSLCheck["SSL Certificate"]
        Uptime -->|"DNS resolution check"| DNSCheck["DNS Records"]
    end

    subgraph Alerting["Alerting"]
        Email["Email Notifications"]
        Slack["Slack Webhook"]
    end

    AppLogs --> LogViewer
    PGLogs --> LogViewer
    RedisLogs --> LogViewer
    ContainerStatus --> ResourceMetrics
    ResourceMetrics --> Alerting
    ExternalMonitoring --> Alerting
    Alerting --> Email
    Alerting --> Slack

    style CoolifyMonitoring fill:#e3f2fd,stroke:#1565c0
    style ExternalMonitoring fill:#fff3e0,stroke:#ef6c00
    style Alerting fill:#fce4ec,stroke:#c62828
```

### 9.2 Application Health Endpoint

The `/api/health` endpoint provides a comprehensive health check:

```typescript
// app/api/health/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

export async function GET() {
  const health: Record<string, string> = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
  };

  const checks: Record<string, string> = {};

  // Database connectivity check
  try {
    const prisma = new PrismaClient();
    await prisma.$queryRaw`SELECT 1`;
    await prisma.$disconnect();
    checks.database = 'connected';
  } catch (error) {
    checks.database = `error: ${error instanceof Error ? error.message : 'unknown'}`;
    health.status = 'degraded';
  }

  // Redis connectivity check
  try {
    const redis = new Redis(process.env.REDIS_URL!, {
      password: process.env.REDIS_PASSWORD,
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
    });
    const result = await redis.ping();
    await redis.quit();
    checks.redis = result === 'PONG' ? 'connected' : 'unexpected response';
  } catch (error) {
    checks.redis = `error: ${error instanceof Error ? error.message : 'unknown'}`;
    health.status = 'degraded';
  }

  health.checks = checks;

  const statusCode = health.status === 'healthy' ? 200 : 503;
  return NextResponse.json(health, { status: statusCode });
}
```

### 9.3 Database Health Monitoring

Key PostgreSQL metrics monitored via Coolify and periodic checks:

| Metric | Check Method | Alert Threshold |
|--------|-------------|-----------------|
| Connection count | `SELECT count(*) FROM pg_stat_activity` | > 80% of max connections |
| Replication lag | `pg_stat_replication` (future) | > 5 seconds |
| Dead tuples | `pg_stat_user_tables.n_dead_tup` | > 1,000,000 (trigger VACUUM) |
| Cache hit ratio | `blks_hit / (blks_hit + blks_read)` | < 95% |
| Transaction rate | `pg_stat_database.xact_commit` | Monitor trends |
| Long-running queries | `pg_stat_activity` where `now() - query_start > 30s` | Any occurrence |

### 9.4 Uptime Monitoring

External uptime monitoring via UptimeRobot (or equivalent):

| Monitor | URL | Interval | Alert After |
|---------|-----|----------|-------------|
| Frontend | `https://teslaprimecapital.com` | 60 seconds | 2 consecutive failures |
| API Health | `https://teslaprimecapital.com/api/health` | 60 seconds | 2 consecutive failures |
| SSL Certificate | `teslaprimecapital.com` | 24 hours | 30 days before expiry |
| Staging | `https://staging.teslaprimecapital.com` | 300 seconds | 3 consecutive failures |

### 9.5 Log Aggregation

**Phase 1 (Current):**
- Docker JSON log driver with rotation (`max-size: 50m`, `max-file: 5`)
- Coolify's built-in log viewer for real-time log streaming
- Structured JSON logging format for machine-parseable logs

**Phase 2 (Planned):**
- Centralized logging with Loki + Grafana or similar
- Log forwarding via Docker log driver or Promtail
- Long-term log retention (90+ days)
- Full-text search and log-based alerting
- Correlation of logs across services using trace IDs

---

## 10. Scaling Plan

### 10.1 Scaling Evolution

```mermaid
graph LR
    subgraph Phase1["Phase 1: Single VPS"]
        VPS1["8 vCPU / 16GB RAM / 200GB SSD"]
        VPS1 --- App1["App (x1)"]
        VPS1 --- PG1["PostgreSQL (x1)"]
        VPS1 --- RD1["Redis (x1)"]
    end

    subgraph Phase2a["Phase 2a: Vertical Scale"]
        VPS2["16 vCPU / 32GB RAM / 500GB SSD"]
        VPS2 --- App2["App (x2)"]
        VPS2 --- PG2["PostgreSQL (x1, upgraded)"]
        VPS2 --- RD2["Redis (x1, upgraded)"]
    end

    subgraph Phase2b["Phase 2b: Horizontal Scale"]
        LB["Load Balancer<br/>(HAProxy / Nginx)"]
        App3a["App Instance 1"]
        App3b["App Instance 2"]
        App3c["App Instance N"]
        PG3["PostgreSQL Primary"]
        PGR["PostgreSQL Replica (Read)"]
        RD3["Redis Sentinel (x3)"]
        CDN["CDN (Cloudflare)"]
    end

    Phase1 -->|"Resource pressure"| Phase2a
    Phase2a -->|"Single-node limit"| Phase2b

    LB --> App3a & App3b & App3c
    App3a & App3b & App3c --> PG3 & PGR & RD3
    App3a & App3b & App3c --> CDN

    style Phase1 fill:#e8f5e9,stroke:#2e7d32
    style Phase2a fill:#fff3e0,stroke:#ef6c00
    style Phase2b fill:#e3f2fd,stroke:#1565c0
```

### 10.2 Vertical Scaling (VPS Upgrade)

Vertical scaling is the first response to resource pressure. Upgrade the VPS specification through the cloud provider:

| Resource | Phase 1 (Current) | Phase 2a (Upgraded) | Trigger |
|----------|-------------------|---------------------|---------|
| CPU | 8 vCPU | 16 vCPU | Sustained > 70% utilization |
| RAM | 16 GB | 32 GB | Sustained > 75% utilization |
| Storage | 200 GB SSD | 500 GB NVMe SSD | > 70% disk usage |
| Network | 1 Gbps | 1 Gbps | N/A (usually sufficient) |

**Vertical scaling procedure:**
1. Monitor resource utilization trends for 1–2 weeks
2. Schedule maintenance window (brief downtime possible during resize)
3. Resize VPS through cloud provider console
4. Reboot and verify all containers restart successfully
5. Run health checks and smoke tests
6. Adjust container resource limits in docker-compose.yml if needed

### 10.3 Horizontal Scaling (Load Balancer + Multiple App Instances)

When vertical scaling is no longer cost-effective, add application instances behind a load balancer:

**Architecture:**
- Deploy HAProxy or Nginx as a dedicated load balancer (or use Coolify's Traefik with multiple containers)
- Run 2–N app containers on the same or multiple VPS instances
- All app instances share the same PostgreSQL and Redis backends
- No sticky sessions required (stateless architecture)

**Coolify scaling configuration:**
- In Coolify, set the service **replicas** to the desired count
- Traefik automatically load-balances across all replicas using round-robin
- Health checks remove unhealthy instances from rotation

```yaml
# docker-compose.scale.yml — Horizontal scaling overlay
services:
  app:
    deploy:
      replicas: 3
      mode: replicated
      update_config:
        parallelism: 1
        delay: 30s
        order: start-first
      rollback_config:
        parallelism: 1
        delay: 10s
```

### 10.4 Read Replicas for PostgreSQL

Offload read-heavy queries (dashboards, reports, analytics) to a read replica:

```
Primary (writes + reads) → Streaming Replication → Replica (reads only)
```

**Implementation:**
1. Configure PostgreSQL primary for streaming replication
2. Deploy a replica PostgreSQL container
3. Update Prisma schema to use `replicas` configuration
4. Route read-only queries to the replica, writes to the primary

```prisma
// prisma/schema.prisma — Read replica configuration
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  replicas  = [
    { url = env("DATABASE_REPLICA_URL") }
  ]
  directUrl = env("DATABASE_DIRECT_URL")
}
```

### 10.5 Redis Cluster / Sentinel

**Phase 2a: Redis Sentinel (High Availability)**
- 3-node Sentinel deployment for automatic failover
- Primary + replica topology
- Automatic promotion of replica to primary on failure
- Sub-second failover for sessions and cache

**Phase 2b: Redis Cluster (Horizontal Scaling)**
- 6+ node cluster (3 masters, 3 replicas)
- Hash-based sharding across masters
- Transparent cross-slot operations
- Separate Redis instances by workload (cache, sessions, queues)

### 10.6 CDN for Static Assets

Cloudflare (or equivalent) sits in front of the application:

| Asset Type | Cache Strategy | TTL |
|-----------|---------------|-----|
| JavaScript bundles (hashed) | `public, max-age=31536000, immutable` | 1 year |
| CSS (hashed) | `public, max-age=31536000, immutable` | 1 year |
| Fonts | `public, max-age=31536000, immutable` | 1 year |
| Images (static) | `public, max-age=86400, stale-while-revalidate` | 1 day + revalidate |
| HTML (SSR) | `private, max-age=0, must-revalidate` | No cache |
| API responses | `no-store` | No cache |

**Cloudflare configuration:**
- Enable **Auto Minify** (JavaScript, CSS, HTML)
- Enable **Brotli** compression
- Configure **Page Rules** for cache behavior
- Enable **Bot Management** and **WAF** rules
- Set **Security Level** to "Medium"

---

## 11. Security Hardening

### 11.1 Firewall Rules (UFW)

The Uncomplicated Firewall (UFW) is configured on the VPS host with a default-deny inbound policy:

```bash
#!/bin/bash
# /opt/teslaprime/setup-firewall.sh
# TeslaPrimeCapital — UFW Firewall Configuration

set -euo pipefail

# Reset existing rules
ufw --force reset

# Default policies
ufw default deny incoming
ufw default allow outgoing

# Allow SSH from admin IPs only (REPLACE with actual admin IPs)
ufw allow from 203.0.113.0/24 to any port 22 proto tcp comment 'SSH - Admin Office'
ufw allow from 198.51.100.50 to any port 22 proto tcp comment 'SSH - Admin Home'

# Allow HTTP and HTTPS (public)
ufw allow 80/tcp comment 'HTTP - Redirect to HTTPS'
ufw allow 443/tcp comment 'HTTPS - Application Traffic'

# Allow Coolify management interface (admin IPs only)
ufw allow from 203.0.113.0/24 to any port 6443/tcp comment 'Coolify - Admin Office'
ufw allow from 198.51.100.50 to any port 6443/tcp comment 'Coolify - Admin Home'

# Deny all other inbound traffic
# (implicit from default deny)

# Rate limiting for SSH
ufw limit 22/tcp comment 'SSH - Rate Limited'

# Enable firewall
ufw --force enable

# Show status
ufw status verbose
```

**Firewall rule summary:**

| Port | Protocol | Source | Purpose |
|------|----------|--------|---------|
| 22 | TCP | Admin IPs only | SSH access |
| 80 | TCP | Any | HTTP → HTTPS redirect |
| 443 | TCP | Any | HTTPS application traffic |
| 6443 | TCP | Admin IPs only | Coolify management |
| 5432 | TCP | None (blocked) | PostgreSQL (internal only) |
| 6379 | TCP | None (blocked) | Redis (internal only) |
| 3000 | TCP | None (blocked) | App dev port (internal only) |

### 11.2 SSH Hardening

```bash
# /etc/ssh/sshd_config — Hardened SSH Configuration

# Disable password authentication (key-only)
PasswordAuthentication no
PermitEmptyPasswords no
ChallengeResponseAuthentication no

# Disable root login
PermitRootLogin no

# Restrict to SSH keys and specific users
PubkeyAuthentication yes
AuthorizedKeysFile .ssh/authorized_keys
AllowUsers deploy admin

# Security settings
MaxAuthTries 3
LoginGraceTime 30
ClientAliveInterval 300
ClientAliveCountMax 2

# Disable unused features
X11Forwarding no
AllowTcpForwarding no
AllowAgentForwarding no

# Use strong ciphers
Ciphers chacha20-poly1305@openssh.com,aes256-gcm@openssh.com,aes128-gcm@openssh.com
MACs hmac-sha2-512-etm@openssh.com,hmac-sha2-256-etm@openssh.com
KexAlgorithms curve25519-sha256,curve25519-sha256@libssh.org

# Logging
SyslogFacility AUTH
LogLevel VERBOSE
```

### 11.3 Docker Security

```bash
# /etc/docker/daemon.json — Docker Daemon Security Configuration
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "50m",
    "max-file": "5"
  },
  "live-restore": true,
  "userns-remap": "default",
  "no-new-privileges": true,
  "icc": false,
  "userland-proxy": false,
  "storage-driver": "overlay2"
}
```

**Docker security measures applied:**

| Measure | Implementation | Purpose |
|---------|---------------|---------|
| Non-root containers | `USER nextjs` in Dockerfile | Prevent privilege escalation |
| Read-only root filesystem | `read_only: true` (with tmpfs mounts) | Prevent runtime modifications |
| No new privileges | `no-new-privileges: true` | Prevent `setuid` binary escalation |
| Resource limits | `deploy.resources.limits` | Prevent resource exhaustion |
| Network isolation | Custom bridge network | Segregate service traffic |
| Image scanning | `trivy` in CI pipeline | Detect known vulnerabilities |
| .dockerignore | Exclude all non-essential files | Prevent secret leakage in images |
| Tini as PID 1 | `ENTRYPOINT ["/sbin/tini", "--"]` | Proper signal handling, zombie reaping |

### 11.4 Environment Secret Management

**Current (Phase 1):**
- Secrets stored in Coolify's encrypted environment variable store
- Secrets never committed to Git (enforced by `.gitignore` and secret scanning)
- `.env.example` documents all required variables with placeholder values
- Pre-commit hooks run `gitleaks` to detect accidental secret commits

**Planned (Phase 2):**
- Docker Secrets or HashiCorp Vault for advanced secret management
- Secret rotation automation with zero-downtime deployment
- Audit logging for all secret access

**Secret scanning in CI:**
```bash
# Run gitleaks in pre-deploy checks
gitleaks detect --source . --verbose --report-format json --report-path gitleaks-report.json
if [ $? -ne 0 ]; then
    echo "FAIL: Secret detected in codebase! Remove the secret and rotate the credential."
    exit 1
fi
```

### 11.5 Network Policies and Defense in Depth

```mermaid
graph TB
    subgraph Internet["Internet"]
        Attackers["Potential Attackers"]
        LegitUsers["Legitimate Users"]
    end

    subgraph Edge["Edge Protection"]
        Cloudflare["Cloudflare CDN / WAF"]
        DDoS["DDoS Mitigation"]
        BotFilter["Bot Protection"]
    end

    subgraph VPS["VPS Firewall (UFW)"]
        FW["Default Deny Inbound<br/>Allow 80, 443<br/>SSH from admin IPs only"]
    end

    subgraph Proxy["Reverse Proxy (Traefik)"]
        TLS["TLS 1.2+ Only<br/>Strong Ciphers"]
        RateLimit["Rate Limiting"]
        HSTS["Security Headers"]
    end

    subgraph AppLayer["Application Layer"]
        CORS["CORS Policy"]
        RateLimitAPI["API Rate Limiting (Redis)"]
        Auth["JWT Authentication"]
        RBAC["Role-Based Access"]
        InputValid["Input Validation (Zod)"]
        SQLPrevent["Parameterized Queries (Prisma)"]
    end

    subgraph DataLayer["Data Layer"]
        PGEnc["Data Encryption at Rest"]
        NetIso["Network Isolation<br/>(Docker Bridge)"]
    end

    Attackers --> Cloudflare
    LegitUsers --> Cloudflare
    Cloudflare --> FW --> TLS --> RateLimit --> HSTS
    HSTS --> AppLayer
    AppLayer --> DataLayer

    style Attackers fill:#fce4ec,stroke:#c62828
    style Edge fill:#fff3e0,stroke:#ef6c00
    style VPS fill:#f3e5f5,stroke:#7b1fa2
    style AppLayer fill:#e8f5e9,stroke:#2e7d32
    style DataLayer fill:#e3f2fd,stroke:#1565c0
```

**Defense in depth layers:**

1. **Edge (Cloudflare):** DDoS mitigation, WAF rules, bot protection, geo-blocking (if needed)
2. **Network (UFW + Docker):** Port restrictions, IP whitelisting, bridge network isolation
3. **Transport (Traefik):** TLS 1.2+ enforcement, HSTS, security headers, HTTP→HTTPS redirect
4. **Application (Next.js):** CORS policy, CSRF protection, rate limiting per IP/user, input validation
5. **Authentication (JWT):** Short-lived access tokens, secure refresh token rotation, 2FA support
6. **Data (PostgreSQL):** Parameterized queries (Prisma), encryption at rest for sensitive fields (AES-256), row-level security (if needed)
7. **Operational:** Secret scanning, image vulnerability scanning, audit logging, regular security reviews

---

## Appendix A: Quick Start — Local Development

```bash
# 1. Clone the repository
git clone https://github.com/teslaprime/teslaprimecapital.git
cd teslaprimecapital

# 2. Copy environment template
cp .env.example .env.local
# Edit .env.local with local development values

# 3. Start all services
docker compose up -d

# 4. Run database migrations
docker compose exec app npx prisma migrate dev

# 5. Seed the database (development only)
docker compose exec app npx prisma db seed

# 6. View logs
docker compose logs -f app

# 7. Stop all services
docker compose down

# 8. Stop and remove volumes (reset database)
docker compose down -v
```

## Appendix B: Deployment Checklist

- [ ] VPS provisioned with recommended specs (8 vCPU / 16GB RAM / 200GB SSD)
- [ ] Docker Engine v25+ installed
- [ ] Coolify installed and accessible at `https://<vps-ip>:6443`
- [ ] UFW firewall configured (Section 11.1)
- [ ] SSH hardened (Section 11.2)
- [ ] Docker daemon security configured (Section 11.3)
- [ ] DNS records configured (Section 7.2)
- [ ] Domain added in Coolify with HTTPS enabled
- [ ] All environment variables set in Coolify UI (Section 5.3)
- [ ] PostgreSQL service created in Coolify
- [ ] Redis service created in Coolify
- [ ] App service linked to GitHub repository
- [ ] Auto-deploy enabled
- [ ] Health checks verified
- [ ] SSL certificate provisioned successfully
- [ ] Backup scripts deployed and cron scheduled
- [ ] Uptime monitoring configured (UptimeRobot)
- [ ] Alert notifications configured (Email + Slack)
- [ ] First production deployment tested
- [ ] Rollback procedure tested
- [ ] Disaster recovery procedure documented and tested

---

*This document is maintained by the TeslaPrimeCapital engineering team and updated with each architectural change. Last reviewed: 2025-01.*