import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// TEMPORARY diagnostic endpoint — REMOVE AFTER DEBUGGING
// Call GET /api/debug/db-test to see exactly what fails
export async function GET() {
  const results: Record<string, any> = { timestamp: new Date().toISOString() };

  // 1. Env vars
  results.env = {
    DATABASE_URL_SET: !!process.env.DATABASE_URL,
    DATABASE_URL_PREFIX: process.env.DATABASE_URL?.slice(0, 25) || 'NOT SET',
    DATABASE_URL_HAS_SSL: process.env.DATABASE_URL?.includes('sslmode') || false,
    JWT_SECRET_SET: !!process.env.JWT_SECRET,
    NODE_ENV: process.env.NODE_ENV,
    RAILWAY_ENVIRONMENT: process.env.RAILWAY_ENVIRONMENT || 'not set',
  };

  // 2. Try a raw SQL query (bypasses Prisma client column mapping)
  try {
    const raw = await db.$queryRawUnsafe('SELECT 1 as ok');
    results.rawQuery = { success: true, data: raw };
  } catch (err: any) {
    results.rawQuery = { success: false, code: err?.code, message: err?.message, meta: err?.meta };
  }

  // 3. Check if 'users' table exists
  try {
    const tables = await db.$queryRawUnsafe(`SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename`);
    results.tables = (tables as any[]).map((t: any) => t.tablename);
  } catch (err: any) {
    results.tablesError = { code: err?.code, message: err?.message };
  }

  // 4. Check users table columns
  try {
    const cols = await db.$queryRawUnsafe(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name='users' AND table_schema='public' ORDER BY ordinal_position`);
    results.userColumns = (cols as any[]).map((c: any) => `${c.column_name}: ${c.data_type}`);
  } catch (err: any) {
    results.userColumnsError = { code: err?.code, message: err?.message };
  }

  // 5. Try Prisma user.count (tests all User model columns)
  try {
    const count = await db.user.count();
    results.prismaUserCount = { success: true, count };
  } catch (err: any) {
    results.prismaUserCount = {
      success: false,
      code: err?.code,
      message: err?.message,
      meta: err?.meta?.message || null,
    };
  }

  // 6. Try Prisma user.findFirst (tests relations too)
  try {
    const user = await db.user.findFirst({
      include: { profile: true, adminRecord: true, wallets: true },
    });
    results.prismaUserFind = {
      success: true,
      found: !!user,
      email: user?.email || null,
    };
  } catch (err: any) {
    results.prismaUserFind = {
      success: false,
      code: err?.code,
      message: err?.message,
      meta: err?.meta?.message || null,
    };
  }

  // 7. Check for missing columns the Prisma client expects
  // The Prisma schema defines these columns on User — verify they exist
  const EXPECTED_USER_COLS = [
    'id', 'email', 'password_hash', 'email_verified', 'email_verified_at',
    'status', 'kyc_level', 'active_mode', 'referral_code', 'referred_by_id',
    'two_factor_enabled', 'kyc_verification_code', 'verification_code',
    'verification_code_expires', 'kyc_code_expires_at', 'kyc_code_purchased',
    'last_login_at', 'last_login_ip', 'login_attempt_count', 'locked_until',
    'preferred_currency', 'preferred_language', 'created_at', 'updated_at', 'deleted_at',
  ];
  try {
    const allCols = await db.$queryRawUnsafe(
      `SELECT column_name FROM information_schema.columns WHERE table_name='users' AND table_schema='public'`
    );
    const existing = new Set((allCols as any[]).map((c: any) => c.column_name));
    const missing = EXPECTED_USER_COLS.filter(c => !existing.has(c));
    results.columnAudit = {
      expected: EXPECTED_USER_COLS.length,
      found: existing.size,
      missing,
      extra: [...existing].filter(c => !EXPECTED_USER_COLS.includes(c)),
    };
  } catch (err: any) {
    results.columnAuditError = err?.message;
  }

  return NextResponse.json(results, { status: 200 });
}