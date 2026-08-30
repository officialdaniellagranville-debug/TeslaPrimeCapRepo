import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/agent/db';
import { randomUUID } from 'crypto';

export async function GET() {
  const sb = getSupabaseClient();
  const { data: platforms } = await sb.from('platform_accounts').select('*').order('platform');
  return NextResponse.json({ platforms: platforms || [] });
}

export async function POST(req: NextRequest) {
  try {
    const sb = getSupabaseClient();
    const body = await req.json();
    const { platform, email, password, notes } = body;
    if (!platform || !email) return NextResponse.json({ error: 'Platform and email required' }, { status: 400 });

    const id = randomUUID();
    const now = new Date().toISOString();
    await sb.from('platform_accounts').insert({
      id, platform, email, password_encrypted: password || null,
      notes: notes || '', status: 'active', created_at: now, updated_at: now,
    });
    const { data: acct } = await sb.from('platform_accounts').select('*').eq('id', id).single();
    return NextResponse.json({ platform: acct, success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const sb = getSupabaseClient();
    const body = await req.json();
    const { id, status, email, notes, total_earned, tasks_completed } = body;
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    if (status) updates.status = status;
    if (status === 'active') updates.last_active = new Date().toISOString();
    if (email) updates.email = email;
    if (notes !== undefined) updates.notes = notes;
    if (total_earned !== undefined) updates.total_earned = total_earned;
    if (tasks_completed !== undefined) updates.tasks_completed = tasks_completed;

    await sb.from('platform_accounts').update(updates).eq('id', id);
    const { data: acct } = await sb.from('platform_accounts').select('*').eq('id', id).single();
    return NextResponse.json({ platform: acct, success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const sb = getSupabaseClient();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  await sb.from('platform_accounts').delete().eq('id', id);
  return NextResponse.json({ success: true });
}
