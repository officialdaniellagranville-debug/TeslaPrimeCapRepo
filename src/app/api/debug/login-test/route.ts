import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyPassword } from '@/lib/auth';
import { debugGate } from '@/lib/debug-gate';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const gate = debugGate();
  if (gate) return gate;
  const steps: string[] = [];

  try {
    steps.push('1. Finding user...');
    const user = await db.user.findUnique({
      where: { email: 'teslaprimesupportt@gmail.com' },
    });
    steps.push(user ? `2. User found: id=${user.id}, status=${user.status}, verified=${user.emailVerified}` : '2. User NOT found');

    if (!user) {
      return NextResponse.json({ steps, error: 'User not found — need to run seed' });
    }

    steps.push('3. Verifying password...');
    const valid = await verifyPassword('Admin@123', user.passwordHash);
    steps.push(`4. Password valid: ${valid}`);

    steps.push('5. Including profile...');
    const withProfile = await db.user.findUnique({
      where: { email: 'teslaprimesupportt@gmail.com' },
      include: { profile: true },
    });
    steps.push(`6. Profile loaded: ${withProfile?.profile ? `firstName=${withProfile.profile.firstName}` : 'null'}`);

    steps.push('7. Including adminRecord...');
    const withAdmin = await db.user.findUnique({
      where: { email: 'teslaprimesupportt@gmail.com' },
      include: { adminRecord: true },
    });
    steps.push(`8. Admin record: ${withAdmin?.adminRecord ? `role=${withAdmin.adminRecord.role}` : 'null'}`);

    steps.push('9. Including wallets...');
    const withWallets = await db.user.findUnique({
      where: { email: 'teslaprimesupportt@gmail.com' },
      include: { wallets: true },
    });
    steps.push(`10. Wallets: ${withWallets?.wallets?.length ?? 0} found`);

    steps.push('11. Full include (same as login)...');
    const full = await db.user.findUnique({
      where: { email: 'teslaprimesupportt@gmail.com' },
      include: { profile: true, adminRecord: true, wallets: true },
    });
    steps.push(`12. Full query SUCCESS — all includes work`);

    return NextResponse.json({ steps, success: true, user: { id: full?.id, email: full?.email, status: full?.status, adminRole: full?.adminRecord?.role } });
  } catch (error: any) {
    steps.push(`ERROR: ${error.code || 'UNKNOWN'} — ${error.message}`);
    return NextResponse.json({ steps, error: error.message, code: error.code }, { status: 500 });
  }
}
