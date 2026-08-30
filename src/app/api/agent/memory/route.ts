import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/agent/db';
import { addMemory } from '@/lib/agent/engine';

export async function GET() {
  const sb = getSupabaseClient();
  const { data: memories } = await sb.from('memories').select('*').order('importance', { ascending: false }).order('updated_at', { ascending: false });
  return NextResponse.json({ memories: memories || [] });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { category, content, importance, tags } = body;
    if (!content || typeof content !== 'string') return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    const id = await addMemory({ category: category || 'general', content, importance: importance || 5, tags: tags || [] });
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
  await sb.from('memories').delete().eq('id', id);
  return NextResponse.json({ success: true });
}

export async function PATCH(req: NextRequest) {
  try {
    const sb = getSupabaseClient();
    const body = await req.json();
    const { id, category, content, importance, tags } = body;
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    if (category) updates.category = category;
    if (content) updates.content = content;
    if (importance) updates.importance = importance;
    if (tags) updates.tags = JSON.stringify(tags);

    await sb.from('memories').update(updates).eq('id', id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
