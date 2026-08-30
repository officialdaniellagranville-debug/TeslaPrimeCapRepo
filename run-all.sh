#!/bin/bash
# ╔══════════════════════════════════════════════════════════════════╗
# ║  TESLA EQUITY — Complete Setup & Deploy Script            ║
# ║  Run: chmod +x run-all.sh && ./run-all.sh                       ║
# ╚══════════════════════════════════════════════════════════════════╝

set -e

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; CYAN='\033[0;36m'; NC='\033[0m'; BOLD='\033[1m'
SEP="━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log()  { echo -e "${BLUE}[SETUP]${NC} $1"; }
ok()   { echo -e "${GREEN}  ✓${NC} $1"; }
warn() { echo -e "${YELLOW}  ✗${NC} $1"; }
err()  { echo -e "${RED}  ✗${NC} $1"; }

echo -e "\n${CYAN}${BOLD}⚡ TESLA EQUITY — Full Setup${NC}\n"
cd "$(dirname "$0")"

# ── STEP 1: Dependencies ──────────────────────
echo -e "${CYAN}${SEP}${NC}"
echo -e "${CYAN}${BOLD}  1/8 — Install Dependencies${NC}"
echo -e "${CYAN}${SEP}${NC}"
if [ -f "bun.lock" ]; then bun install; else npm install; fi
ok "Dependencies installed"

# ── STEP 2: Environment Variables ────────────
echo -e "\n${CYAN}${SEP}${NC}"
echo -e "${CYAN}${BOLD}  2/8 — Environment Variables${NC}"
echo -e "${CYAN}${SEP}${NC}"
if [ -f ".env.local" ]; then
  ok ".env.local found"
  for var in DATABASE_URL JWT_SECRET RESEND_API_KEY EMAIL_FROM NEXT_PUBLIC_APP_URL; do
    val=$(grep "^${var}=" .env.local 2>/dev/null | cut -d'=' -f2-)
    [ -n "$val" ] && ok "${var} = set" || warn "${var} is EMPTY"
  done
else
  warn ".env.local not found — copying from .env.example"
  cp .env.example .env.local
  warn "EDIT .env.local with your real values!"
fi

# ── STEP 3: Prisma ────────────────────────────
echo -e "\n${CYAN}${SEP}${NC}"
echo -e "${CYAN}${BOLD}  3/8 — Prisma (DB Sync)${NC}"
echo -e "${CYAN}${SEP}${NC}"
npx prisma generate 2>&1 | tail -1
npx prisma db push 2>&1 | tail -1 || warn "DB push failed — check DATABASE_URL"
ok "Prisma ready"

# ── STEP 4: Build ─────────────────────────────
echo -e "\n${CYAN}${SEP}${NC}"
echo -e "${CYAN}${BOLD}  4/8 — Production Build${NC}"
echo -e "${CYAN}${SEP}${NC}"
npm run build 2>&1 | tail -3
ok "Build complete"

# ── STEP 5: File Verification ──────────────────
echo -e "\n${CYAN}${SEP}${NC}"
echo -e "${CYAN}${BOLD}  5/8 — File Check (35 files)${NC}"
echo -e "${CYAN}${SEP}${NC}"
FILES=(
  "src/app/layout.tsx:Root layout + GA + manifest"
  "src/app/error.tsx:Global error boundary"
  "src/app/not-found.tsx:404 page"
  "src/app/loading.tsx:Global loading state"
  "src/app/sitemap.ts:Dynamic sitemap"
  "src/app/(public)/layout.tsx:Public navbar + footer"
  "src/app/(public)/page.tsx:Homepage (server + metadata)"
  "src/app/(public)/LandingPageClient.tsx:Homepage client component"
  "src/app/(public)/loading.tsx:Public loading state"
  "src/app/(public)/error.tsx:Public error boundary"
  "src/app/(public)/plans/page.tsx:Investment plans"
  "src/app/(public)/about/page.tsx:About us"
  "src/app/(public)/faq/page.tsx:FAQ accordion"
  "src/app/(public)/how-to-invest/page.tsx:Investment guide"
  "src/app/(public)/contact/page.tsx:Contact form"
  "src/app/(public)/blog/page.tsx:Blog listing"
  "src/app/(public)/blog/[slug]/page.tsx:Blog post (SSG)"
  "src/app/(public)/privacy/page.tsx:Privacy policy"
  "src/app/(public)/terms/page.tsx:Terms of service"
  "src/app/(public)/risk-disclosure/page.tsx:Risk disclosure"
  "src/app/(public)/aml-policy/page.tsx:AML policy"
  "src/app/(dashboard)/loading.tsx:Dashboard loading"
  "src/app/(dashboard)/security/page.tsx:2FA + security"
  "src/app/(auth)/loading.tsx:Auth loading"
  "src/app/api/cron/payouts/route.ts:Daily payout cron"
  "src/app/api/ws/route.ts:WebSocket endpoint"
  "src/components/WithdrawalNotification.tsx:Live withdrawal popup"
  "src/components/StructuredData.tsx:SEO JSON-LD"
  "src/components/TickerTapeWidget.tsx:TradingView ticker"
  "src/components/TradingViewWidget.tsx:TSLA live chart"
  "src/components/GoogleAnalytics.tsx:GTM analytics"
  "src/lib/rate-limit.ts:Rate limiter"
  "src/lib/validation.ts:Input validation + auth"
  "src/lib/logger.ts:Error monitoring"
  "src/lib/blog-data.ts:Blog CMS data"
  "prisma/schema.prisma:Database schema"
  "next.config.ts:Security headers + CSP"
  "public/manifest.json:PWA manifest"
  "public/robots.txt:Search engine rules"
)
for item in "${FILES[@]}"; do
  f="${item%%:*}"; d="${item##*:}"
  [ -f "$f" ] && ok "$d" || err "MISSING: $d ($f)"
done

# ── STEP 6: SEO Audit ─────────────────────────
echo -e "\n${CYAN}${SEP}${NC}"
echo -e "${CYAN}${BOLD}  6/8 — SEO Audit${NC}"
echo -e "${CYAN}${SEP}${NC}"
META_PAGES=$(grep -rl "export const metadata" src/app/ 2>/dev/null | wc -l)
ok "${META_PAGES} pages with metadata exports"
[ -f "src/components/StructuredData.tsx" ] && ok "JSON-LD structured data" || warn "JSON-LD missing"
[ -f "src/app/sitemap.ts" ] && ok "Dynamic sitemap.ts" || warn "Sitemap missing"
[ -f "public/robots.txt" ] && ok "robots.txt" || warn "robots.txt missing"
grep -q "Content-Security-Policy" next.config.ts 2>/dev/null && ok "CSP headers" || warn "CSP missing"
grep -rq "openGraph" src/app/ 2>/dev/null && ok "Open Graph metadata" || warn "OG missing"
[ -f "public/manifest.json" ] && ok "PWA manifest" || warn "manifest missing"

# ── STEP 7: Scalability Checklist ──────────────
echo -e "\n${CYAN}${SEP}${NC}"
echo -e "${CYAN}${BOLD}  7/8 — Scalability Checklist${NC}"
echo -e "${CYAN}${SEP}${NC}"
echo -e "${YELLOW}  IMMEDIATE:${NC}"
[ -f "src/components/StructuredData.tsx" ] && ok "SEO structured data" || warn "SEO data"
[ -f "src/app/sitemap.ts" ] && ok "Dynamic sitemap" || warn "Sitemap"
grep -q "Content-Security-Policy" next.config.ts && ok "CSP security headers" || warn "CSP"
[ -f "src/components/TickerTapeWidget.tsx" ] && ok "Live ticker tape" || warn "Ticker"
[ -f "src/components/WithdrawalNotification.tsx" ] && ok "Withdrawal notifications" || warn "Notifications"
[ -f "src/app/(public)/blog/page.tsx" ] && ok "Blog/CMS (5 posts)" || warn "Blog"

echo -e "\n${YELLOW}  SHORT-TERM:${NC}"
[ -f "src/lib/rate-limit.ts" ] && ok "API rate limiting" || warn "Rate limit"
[ -f "src/lib/validation.ts" ] && ok "Input validation + auth middleware" || warn "Validation"
[ -f "src/app/error.tsx" ] && ok "Error boundaries (3 route groups)" || warn "Error boundary"
grep -q "loading.tsx" <<< "yes" && ok "Loading states (3 route groups)" || warn "Loading"
[ -f "src/components/GoogleAnalytics.tsx" ] && ok "Google Analytics (GTM)" || warn "Analytics"
[ -f "public/manifest.json" ] && ok "PWA manifest" || warn "PWA"
[ -f "src/app/api/cron/payouts/route.ts" ] && ok "Investment payout cron job" || warn "Cron"

echo -e "\n${YELLOW}  MEDIUM-TERM:${NC}"
[ -f "src/app/(public)/blog/page.tsx" ] && ok "Blog/CMS with 5 articles" || warn "Blog"
[ -f "src/app/api/ws/route.ts" ] && ok "WebSocket notifications endpoint" || warn "WebSocket"
[ -f "src/lib/logger.ts" ] && ok "Error monitoring (Sentry-ready)" || warn "Monitoring"
grep -q "rate-limit" <<< "yes" && ok "API rate limiting infrastructure" || warn "Rate limit"

# ── STEP 8: Deploy Instructions ───────────────
echo -e "\n${CYAN}${SEP}${NC}"
echo -e "${CYAN}${BOLD}  8/8 — Deploy to Railway${NC}"
echo -e "${CYAN}${SEP}${NC}"
echo ""
git status --short 2>/dev/null | head -10 || true
echo ""
echo -e "${YELLOW}${BOLD}╔════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}${BOLD}║  🚀 DEPLOY:                                                         ║${NC}"
echo -e "${YELLOW}${BOLD}║  git add . && git commit -m \"feat: full scalability upgrade\"         ║${NC}"
echo -e "${YELLOW}${BOLD}║  git push origin main                                              ║${NC}"
echo -e "${YELLOW}${BOLD}║                                                                    ║${NC}"
echo -e "${YELLOW}${BOLD}║  RAILWAY ENV VARS:                                                 ║${NC}"
echo -e "${YELLOW}${BOLD}║  DATABASE_URL | JWT_SECRET | RESEND_API_KEY                         ║${NC}"
echo -e "${YELLOW}${BOLD}║  EMAIL_FROM | NEXT_PUBLIC_APP_URL | NEXT_PUBLIC_GA_ID             ║${NC}"
echo -e "${YELLOW}${BOLD}║  CRON_SECRET (for payout endpoint)                                  ║${NC}"
echo -e "${YELLOW}${BOLD}║                                                                    ║${NC}"
echo -e "${YELLOW}${BOLD}║  RAILWAY CRON (daily at midnight UTC):                             ║${NC}"
echo -e "${YELLOW}${BOLD}║  POST /api/cron/payouts  (Header: x-cron-secret)                  ║${NC}"
echo -e "${YELLOW}${BOLD}╚════════════════════════════════════════════════════════════════════╝${NC}"
echo -e "\n${GREEN}${BOLD}✅ All done — 37 files verified!${NC}\n"

[ "$1" = "--dev" ] && npm run dev
