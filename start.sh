#!/bin/sh

echo "========================================"
echo "[startup] TeslaPrime - Initializing"
echo "========================================"

# ============================================
# SET MISSING ENV VARS (runtime defaults)
# ============================================
# Resend API key — must be set in Railway/env vars
if [ -z "$RESEND_API_KEY" ]; then
  echo "[startup] WARNING: RESEND_API_KEY is NOT SET. Email will not work. Set it in Railway Variables."
fi
if [ -z "$JWT_SECRET" ]; then
  JWT_SECRET="tpc_jwt_70d1fb87f6814d46adae336433c68cc0"
  export JWT_SECRET
  echo "[startup] JWT_SECRET set from runtime default"
fi
if [ -z "$EMAIL_FROM" ]; then
  EMAIL_FROM="support@teslaprimecap.com"
  export EMAIL_FROM
  echo "[startup] EMAIL_FROM set to support@teslaprimecap.com"
fi
if [ -z "$NEXT_PUBLIC_SITE_URL" ]; then
  NEXT_PUBLIC_SITE_URL="https://teslaprimecap.com"
  export NEXT_PUBLIC_SITE_URL
fi

# ============================================
# CRITICAL ENV VAR CHECKS (log only, never expose values)
# ============================================
echo "[startup] DATABASE_URL set: $([ -n "$DATABASE_URL" ] && echo 'YES' || echo 'NO')"
echo "[startup] DIRECT_URL set: $([ -n "$DIRECT_URL" ] && echo 'YES' || echo 'NO')"
echo "[startup] JWT_SECRET set: $([ -n "$JWT_SECRET" ] && echo 'YES' || echo 'NO')"
echo "[startup] RAILWAY_ENVIRONMENT: ${RAILWAY_ENVIRONMENT:-not set}"
echo "[startup] NODE_ENV: ${NODE_ENV:-not set}"

if [ -z "$JWT_SECRET" ]; then
  echo "[startup] ⚠️  WARNING: JWT_SECRET is NOT SET. Login WILL fail with 500 error."
fi

# ============================================
# DATABASE_URL VALIDATION
# ============================================
if [ -z "$DATABASE_URL" ]; then
  echo "[startup] WARNING: DATABASE_URL is NOT SET."
  echo "[startup] Login and DB operations will fail until you set it in Railway Variables."
else
  case "$DATABASE_URL" in
    file:*)
      echo "[startup] WARNING: DATABASE_URL looks like SQLite (file:). This project needs PostgreSQL."
      ;;
    postgresql://*|postgres://*)
      echo "[startup] DATABASE_URL OK (PostgreSQL format)"
      ;;
    *)
      echo "[startup] WARNING: DATABASE_URL format unrecognized: ${DATABASE_URL:0:20}..."
      ;;
  esac
fi

# ============================================
# RUNTIME SCHEMA SYNC
# ============================================
# Railway Hobby plan uses PgBouncer which BLOCKS DDL (prisma db push).
# The safety-net migration below handles schema sync, so we SKIP prisma db push
# entirely when PgBouncer is detected (pgbouncer in URL or RAILWAY_ENVIRONMENT set).
# For non-PgBouncer setups, we still run it with a 30s timeout to prevent hangs.
if [ -n "$DATABASE_URL" ]; then
  # Use DIRECT_URL for DDL if available (bypasses PgBouncer which blocks DDL)
  SCHEMA_URL="${DIRECT_URL:-$DATABASE_URL}"
  case "$DATABASE_URL" in
    *pgbouncer*|*pooler.supabase.com*)
      if [ -n "$DIRECT_URL" ]; then
        echo "[startup] PgBouncer detected — using DIRECT_URL for prisma db push (DDL)..."
        timeout 30 env DATABASE_URL="$SCHEMA_URL" ./node_modules/.bin/prisma db push --accept-data-loss --skip-generate 2>&1 || {
          echo "[startup] WARNING: prisma db push via DIRECT_URL failed. Trying safety-net fallback."
        }
      else
        echo "[startup] PgBouncer detected, no DIRECT_URL set — skipping prisma db push (DDL blocked)."
      fi
      ;;
    *)
      if [ -n "$RAILWAY_ENVIRONMENT" ] && [ -n "$DIRECT_URL" ]; then
        echo "[startup] Railway + DIRECT_URL — using DIRECT_URL for prisma db push..."
        timeout 30 env DATABASE_URL="$SCHEMA_URL" ./node_modules/.bin/prisma db push --accept-data-loss --skip-generate 2>&1 || {
          echo "[startup] WARNING: prisma db push via DIRECT_URL failed. Trying safety-net fallback."
        }
      elif [ -n "$RAILWAY_ENVIRONMENT" ]; then
        echo "[startup] Railway environment, no DIRECT_URL — skipping prisma db push."
      else
        echo "[startup] Running prisma db push (runtime schema sync, 30s timeout)..."
        timeout 30 ./node_modules/.bin/prisma db push --accept-data-loss --skip-generate 2>&1 || {
          echo "[startup] WARNING: prisma db push failed or timed out. Falling back to safety-net migration."
        }
      fi
      ;;
  esac
else
  echo "[startup] Skipping prisma db push (DATABASE_URL not set)"
fi

# ============================================
# SAFETY-NET MIGRATION (idempotent raw SQL, foreground, BLOCKING)
# ============================================
# Belt-and-suspenders: ensures every column the Prisma client expects
# exists in the DB, even if prisma db push above failed.
echo "[startup] Running safety-net migration (idempotent raw SQL, 50s timeout)..."
if [ -n "$DATABASE_URL" ]; then
  timeout 50 node prisma/migrate-safety-net.cjs 2>&1 || {
    echo "[startup] Safety-net migration failed or timed out (non-critical, will continue)"
  }
else
  echo "[startup] Skipping safety-net migration (DATABASE_URL not set)"
fi

# ============================================
# FILE SYSTEM
# ============================================
mkdir -p /tmp/uploads
echo "[startup] Upload directory ready at /tmp/uploads"

# ============================================
# BACKGROUND TASKS — seed + migration run AFTER server starts
# ============================================
( \
  echo "[bg] Waiting 5s for server to boot before seeding..." && \
  sleep 5 && \
  echo "[bg] Seeding database (timeout 60s, non-fatal)..." && \
  timeout 60 node /app/prisma/seed.cjs 2>&1 || \
  echo "[bg] Seed failed, skipped, or timed out — server still running." \
) &

( \
  echo "[bg] Waiting 10s for server to boot before demo-to-live migration..." && \
  sleep 10 && \
  echo "[bg] Migrating demo users to live mode (timeout 30s, non-fatal)..." && \
  timeout 30 node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function migrate() {
  try {
    var r = await prisma.user.updateMany({ where: { activeMode: 'demo' }, data: { activeMode: 'live' } });
    console.log('[bg] Migrated ' + r.count + ' users from demo to live mode');
  } catch(e) {
    console.error('[bg] Migration failed:', e.message);
  } finally {
    process.exit(0);
  }
}
migrate();
" 2>&1 || echo "[bg] Mode migration skipped (non-critical)" \
) &

# ============================================
# START SERVER — IMMEDIATELY, in foreground
# ============================================
echo "========================================"
echo "[startup] Starting Next.js server NOW..."
echo "[startup] Health check: /api/health"
echo "[startup] Background seed/migration will log with [bg] prefix"
echo "========================================"
exec node server.js
