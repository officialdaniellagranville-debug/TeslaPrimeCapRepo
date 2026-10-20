# =============================================
# TESLA PLATFORM - Dockerfile
# =============================================
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat

# Cache-break: unique per deploy, forces rebuild when changed
ARG BUILD_ID=unknown
RUN echo "build-id=$BUILD_ID"

FROM base AS deps
WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma/

# --ignore-scripts prevents the postinstall hook (prisma generate) from running here.
# We invoke prisma generate explicitly with the local binary (no npx, no npm).
RUN npm install --ignore-scripts && ./node_modules/.bin/prisma generate

FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./
COPY . .

# Use local prisma binary directly (NOT npx — npx can trigger npm install at runtime).
RUN ./node_modules/.bin/prisma generate

# Sync database schema at BUILD time.
# On Railway Hobby plan, DATABASE_URL routes through PgBouncer which BLOCKS DDL.
# We skip prisma db push when PgBouncer is detected — the runtime safety-net
# migration handles schema sync instead (using DIRECT_URL if available).
RUN if [ -z "$DATABASE_URL" ]; then \
      echo "[build] DATABASE_URL not set — skipping schema sync. Set it in Railway Variables."; \
    elif echo "$DATABASE_URL" | grep -qE 'pgbouncer|pooler\.supabase\.com'; then \
      echo "[build] Connection pooler detected (PgBouncer/Supabase) — skipping prisma db push (DDL blocked). Schema will sync at runtime via safety-net."; \
    elif [ -n "$RAILWAY_ENVIRONMENT" ]; then \
      echo "[build] Railway environment — skipping prisma db push (PgBouncer likely). Schema will sync at runtime."; \
    else \
      echo "[build] DATABASE_URL detected — syncing schema with 'prisma db push' (30s timeout)..."; \
      timeout 30 ./node_modules/.bin/prisma db push --accept-data-loss --skip-generate || \
      echo "[build] WARNING: prisma db push failed or timed out. Build continues; schema will sync at runtime."; \
    fi

RUN npm run build

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
# Redirect any stray npm cache writes to a writable temp location (defensive).
# If anything at runtime invokes npm, it will write here instead of /app.
ENV npm_config_cache=/tmp/.npm-cache
ENV NPM_CONFIG_PREFIX=/tmp/.npm-prefix
ENV NPM_CONFIG_UPDATE_NOTIFIER=false
ENV NPM_CONFIG_FUND=false
# Prevent prisma from auto-fetching engines at runtime (we bundle them at build).
ENV PRISMA_ENGINES_MIRROR=
ENV PRISMA_SKIP_POSTINSTALL_GENERATE=true

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy standalone output (includes package.json + server.js)
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy public assets
COPY --from=builder /app/public ./public

# Copy prisma schema + seed file (needed for runtime seed)
COPY --from=builder /app/prisma ./prisma

# Copy node_modules FIRST (from deps stage — has prisma CLI + all deps)
COPY --from=deps /app/node_modules ./node_modules

# Then OVERWRITE .prisma with the GENERATED client from builder stage.
# (deps stage doesn't have the generated client engines; builder does.)
# Order matters: this MUST come after the node_modules COPY above.
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Copy startup script
COPY --from=builder /app/start.sh ./start.sh
RUN chmod +x /app/start.sh

# Pre-create npm cache dirs and make them writable by nextjs user.
RUN mkdir -p /tmp/.npm-cache /tmp/.npm-prefix /tmp/uploads && \
    chown -R nextjs:nodejs /app /tmp/.npm-cache /tmp/.npm-prefix /tmp/uploads && \
    chmod -R 777 /tmp

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Healthcheck — use lightweight /api/health endpoint (no DB queries, instant response)
# This ensures Railway detects the server as healthy as soon as it starts listening.
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health',(r)=>process.exit(r.statusCode<500?0:1)).on('error',()=>process.exit(1))"

CMD ["/app/start.sh"]
# Build trigger: Tue Oct 20 15:12:22 UTC 2026
