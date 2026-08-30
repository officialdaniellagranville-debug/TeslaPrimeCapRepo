import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/agent/db';
import { randomUUID } from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const sb = getSupabaseClient();
    const body = await req.json();
    const { title, description, platform, type, priority, scheduled_for } = body;
    if (!title) return NextResponse.json({ error: 'Title is required' }, { status: 400 });

    const id = randomUUID();
    const now = new Date().toISOString();
    await sb.from('tasks').insert({
      id, title, description: description || '', platform: platform || null,
      type: type || 'manual', priority: priority || 'medium',
      scheduled_for: scheduled_for || null, status: 'pending', created_at: now, updated_at: now,
    });
    const { data: task } = await sb.from('tasks').select('*').eq('id', id).single();
    return NextResponse.json({ task, success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const sb = getSupabaseClient();
    const body = await req.json();
    const { id, status, title, description, result, error: taskError } = body;
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    if (status) {
      updates.status = status;
      if (status === 'running') updates.started_at = new Date().toISOString();
      if (status === 'completed' || status === 'failed') updates.completed_at = new Date().toISOString();
    }
    if (title) updates.title = title;
    if (description) updates.description = description;
    if (result !== undefined) updates.result = result;
    if (taskError !== undefined) updates.error = taskError;

    await sb.from('tasks').update(updates).eq('id', id);
    const { data: task } = await sb.from('tasks').select('*').eq('id', id).single();
    return NextResponse.json({ task, success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const sb = getSupabaseClient();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  await sb.from('tasks').delete().eq('id', id);
  return NextResponse.json({ success: true });
}
