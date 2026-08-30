import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/agent/db';
import { getAgentStatus } from '@/lib/agent/engine';
import { randomUUID } from 'crypto';

export async function GET() {
  try {
    const status = await getAgentStatus();
    return NextResponse.json(status);
  } catch (error: any) {
    return NextResponse.json({ error: error.message, stack: error.stack?.slice(0, 300) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const sb = getSupabaseClient();
    const body = await req.json();
    const { type } = body;

    if (type === 'log_earning') {
      await sb.from('earnings').insert({
        id: randomUUID(),
        platform: body.platform || 'unknown',
        amount: body.amount || 0,
        currency: 'USD',
        task_type: body.task_type || null,
        notes: body.notes || '',
      });

      if (body.platform) {
        const { data: accts } = await sb.from('platform_accounts')
          .select('id, total_earned, tasks_completed')
          .eq('platform', body.platform)
          .eq('status', 'active');
        if (accts && accts.length > 0) {
          for (const acct of accts) {
            await sb.from('platform_accounts').update({
              total_earned: ((acct as any).total_earned || 0) + (body.amount || 0),
              tasks_completed: ((acct as any).tasks_completed || 0) + 1,
              updated_at: new Date().toISOString(),
            }).eq('id', acct.id);
          }
        }
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown type' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}