import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient, ensureSchema } from '@/lib/agent/db';
import { processMessage } from '@/lib/agent/engine';
import { randomUUID } from 'crypto';

export async function POST(req: NextRequest) {
  try {
    await ensureSchema();
    const body = await req.json();
    const { message, conversationId } = body;
    if (!message || typeof message !== 'string') return NextResponse.json({ error: 'Message is required' }, { status: 400 });

    const sb = getSupabaseClient();
    let convId = conversationId; let isNew = false;
    if (!convId) { convId = randomUUID(); isNew = true; await sb.from('conversations').insert({ id: convId, title: message.substring(0, 60) }); }
    else { const { data: conv } = await sb.from('conversations').select('id').eq('id', convId).single(); if (!conv) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 }); }

    const result = await processMessage(message, convId, isNew);
    return NextResponse.json({
      conversationId: convId, isNew, response: result.text,
      shouldSpeak: result.shouldSpeak, memoriesUsed: result.memoriesUsed,
      toolSteps: result.toolSteps || [],
    });
  } catch (error: any) { console.error('Chat error:', error); return NextResponse.json({ error: error.message }, { status: 500 }); }
}

export async function GET(req: NextRequest) {
  const sb = getSupabaseClient();
  const { searchParams } = new URL(req.url);
  const conversationId = searchParams.get('conversationId');
  if (!conversationId) { const { data: conversations } = await sb.from('conversations').select('id, title, updated_at').order('updated_at', { ascending: false }).limit(50); return NextResponse.json({ conversations: conversations || [] }); }
  const { data: messages } = await sb.from('messages').select('id, role, content, created_at').eq('conversation_id', conversationId).order('created_at', { ascending: true });
  return NextResponse.json({ messages: messages || [] });
}

export async function DELETE(req: NextRequest) {
  const sb = getSupabaseClient(); const { searchParams } = new URL(req.url); const id = searchParams.get('conversationId');
  if (!id) return NextResponse.json({ error: 'conversationId required' }, { status: 400 });
  await sb.from('messages').delete().eq('conversation_id', id); await sb.from('conversations').delete().eq('id', id);
  return NextResponse.json({ success: true });
}
