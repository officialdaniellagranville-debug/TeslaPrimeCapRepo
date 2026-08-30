import { createClient } from '@supabase/supabase-js';

let _client: ReturnType<typeof createClient> | null = null;
let _schemaInitialized = false;

export function getSupabaseClient() {
  if (_client) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Supabase URL and key required. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY) in .env.local');
  _client = createClient(url, key);
  return _client;
}

export async function ensureSchema(): Promise<void> {
  if (_schemaInitialized) return;
  const sb = getSupabaseClient();
  // Use the service role / rpc to run DDL via Supabase SQL editor.
  // For runtime init we insert default settings (tables created via migration).
  const defaults = [
    { key: 'agent_name', value: 'NEXUS' },
    { key: 'voice_enabled', value: 'true' },
    { key: 'proactive_mode', value: 'true' },
    { key: 'agent_paused', value: 'false' },
    { key: 'auto_work_enabled', value: 'false' },
    { key: 'llm_model', value: 'openrouter/free' },
    { key: 'proactive_interval', value: '300' },
  ];
  for (const d of defaults) {
    await sb.from('settings').upsert(
      { ...d, updated_at: new Date().toISOString() },
      { onConflict: 'key', count: 'exact' }
    );
  }
  _schemaInitialized = true;
}

ensureSchema().catch(e => console.error('Schema init failed:', e));
