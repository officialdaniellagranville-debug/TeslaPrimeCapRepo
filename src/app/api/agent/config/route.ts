import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/agent/db';
import { setSetting } from '@/lib/agent/engine';

export async function GET() {
  const sb = getSupabaseClient();
  const { data: all } = await sb.from('settings').select('key, value');
  const config: Record<string, string> = {};
  for (const row of (all || [])) {
    config[(row as any).key] = (row as any).value;
  }
  const hasLlmKey = !!(process.env.OPENROUTER_API_KEY || process.env.LLM_API_KEY || config.llm_api_key);
  config.hasApiKey = hasLlmKey ? 'true' : 'false';
  return NextResponse.json(config);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { key, value } = body;
    if (!key) return NextResponse.json({ error: 'key required' }, { status: 400 });

    if (key === 'llm_api_key') {
      if (value) {
        process.env.LLM_API_KEY = value;
        await setSetting('llm_api_key', value);
      }
      return NextResponse.json({ success: true, note: 'API key set.' });
    }

    await setSetting(key, value);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
