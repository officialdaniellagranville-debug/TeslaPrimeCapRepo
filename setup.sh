#!/bin/bash
# =============================================
# TESLA PLATFORM - SETUP SCRIPT
# =============================================
# For LOCAL dev with Supabase:
#   1. Create a Supabase project (see .env.example)
#   2. Copy .env.example to .env and paste your DATABASE_URL
#   3. Run: bash setup.sh
# =============================================

set -e

echo ""
echo "========================================="
echo "  TESLA PLATFORM SETUP"
echo "========================================="
echo ""

# Check .env exists
if [ ! -f .env ]; then
  echo "ERROR: .env file not found!"
  echo ""
  echo "  1. Copy .env.example to .env:"
  echo "     cp .env.example .env"
  echo ""
  echo "  2. Open .env and paste your Supabase DATABASE_URL"
  echo "     (see .env.example for step-by-step instructions)"
  echo ""
  echo "  3. Run this script again"
  exit 1
fi

echo "[1/5] Installing dependencies..."
npm install 2>&1 | tail -3
echo "  Done."
echo ""

echo "[2/5] Generating Prisma client..."
npx prisma generate 2>&1 | tail -3
echo "  Done."
echo ""

echo "[3/5] Pushing schema to Supabase (creating tables)..."
npx prisma db push 2>&1
echo "  Done."
echo ""

echo "[4/5] Seeding database (admin + demo user + plans)..."
npx tsx prisma/seed.ts 2>&1
echo "  Done."
echo ""

echo "========================================="
echo "  SETUP COMPLETE!"
echo "========================================="
echo ""
echo "  Admin:  admin@tesla.com / Admin@123"
echo "  Demo:   demo@tesla.com  / Demo@123"
echo ""
echo "  Now run:  npm run dev"
echo "  Then open: http://localhost:3000"
echo ""
echo "========================================="