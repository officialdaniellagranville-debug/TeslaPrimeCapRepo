import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/agent/db';
import { getProactiveMessage } from '@/lib/agent/engine';

export async function GET() {
  try {
    const sb = getSupabaseClient();
    const { data: row } = await sb.from('settings').select('value').eq('key', 'proactive_mode').single();
    if ((row as any)?.value !== 'true') {
      return NextResponse.json({ message: null, active: false });
    }
    const result = await getProactiveMessage();
    return NextResponse.json({ ...result, active: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
