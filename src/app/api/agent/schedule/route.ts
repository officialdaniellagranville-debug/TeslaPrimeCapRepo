import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/agent/db';
import { randomUUID } from 'crypto';

export async function GET() {
  const sb = getSupabaseClient();
  const { data: schedules } = await sb.from('schedules').select('*').order('created_at', { ascending: false });
  return NextResponse.json({ schedules: schedules || [] });
}

export async function POST(req: NextRequest) {
  try {
    const sb = getSupabaseClient();
    const body = await req.json();
    const { trigger_type, trigger_value, action, message, is_proactive } = body;
    if (!trigger_type || !action) return NextResponse.json({ error: 'trigger_type and action required' }, { status: 400 });

    const id = randomUUID();
    await sb.from('schedules').insert({
      id, trigger_type, trigger_value, action,
      message: message || '', is_proactive: is_proactive ? 1 : 0, is_active: 1,
    });
    return NextResponse.json({ id, success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const sb = getSupabaseClient();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  await sb.from('schedules').delete().eq('id', id);
  return NextResponse.json({ success: true });
}