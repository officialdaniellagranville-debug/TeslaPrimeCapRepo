import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Temporary diagnostic + fix endpoint — REMOVE after fixing the schema issue
export async function GET() {
  const results: Record<string, { ok: boolean; detail: string }> = {};

  // AUTO-FIX: The actual table is 'users' (lowercase, in public schema)
  // NOT 'User' (capital) as the Prisma @@map suggests
  try {
    await db.$executeRawUnsafe(
      `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS kyc_verification_code TEXT`
    );
    results.autoFix = { ok: true, detail: 'ALTER TABLE public.users succeeded — column added' };
  } catch (e: any) {
    results.autoFix = { ok: false, detail: `ALTER TABLE failed: ${e.message}` };
  }

  // Verify column exists now
  try {
    const colCheck = await db.$queryRawUnsafe(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'kyc_verification_code'`
    ) as any[];
    results.verify = colCheck.length > 0
      ? { ok: true, detail: 'kyc_verification_code column NOW EXISTS on public.users' }
      : { ok: false, detail: 'Column still missing' };
  } catch (e: any) {
    results.verify = { ok: false, detail: e.message };
  }

  // Test the full user query (same as login)
  try {
    const user = await db.user.findFirst({
      where: { email: 'admin@tesla.com' },
      include: { profile: true, adminRecord: true, wallets: true },
    });
    results.userQuery = user
      ? { ok: true, detail: `User query OK (admin@tesla.com found, id=${user.id})` }
      : { ok: true, detail: 'User query OK but admin@tesla.com not found (need seed)' };
  } catch (e: any) {
    results.userQuery = { ok: false, detail: `Still failing: ${e.message}` };
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    results,
  });
}
