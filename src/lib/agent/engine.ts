import { getSupabaseClient, ensureSchema } from './db';
import { randomUUID } from 'crypto';

type MemoryRow = {
  id: string;
  category: string;
  content: string;
  importance: number;
  tags: string;
  access_count: number;
  last_accessed: string | null;
};

export type ToolStep = {
  tool: string;
  label: string;
  input: string;
  output: string;
  duration: number;
};

function getLlmApiKey(): string | null {
  if (process.env.OPENROUTER_API_KEY) return process.env.OPENROUTER_API_KEY;
  if (process.env.LLM_API_KEY) return process.env.LLM_API_KEY;
  return null;
}

export async function getSetting(key: string): Promise<string | null> {
  const sb = getSupabaseClient();
  const { data } = await sb.from('settings').select('value').eq('key', key).single();
  return (data as any)?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const sb = getSupabaseClient();
  await sb.from('settings').upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
}

export async function getRelevantMemories(query: string, limit = 10): Promise<MemoryRow[]> {
  const sb = getSupabaseClient();
  const { data: allMemories } = await sb.from('memories').select('*').order('importance', { ascending: false }).order('access_count', { ascending: false });
  if (!allMemories || allMemories.length === 0) return [];
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);
  const scored = allMemories.map(mem => {
    let score = 0;
    const contentLower = (mem.content as string).toLowerCase();
    const tags: string[] = JSON.parse((mem.tags as string) || '[]');
    for (const word of queryWords) { if (contentLower.includes(word)) score += 3; }
    for (const tag of tags) { if (queryLower.includes(tag.toLowerCase()) || tag.toLowerCase().includes(queryLower)) score += 5; }
    score += (mem.importance as number) * 0.5;
    score += Math.min((mem.access_count as number) * 0.1, 3);
    return { ...mem, score } as MemoryRow & { score: number };
  });
  return scored.sort((a, b) => b.score - a.score).slice(0, limit) as MemoryRow[];
}

export async function addMemory(data: { category: string; content: string; importance?: number; tags?: string[] }): Promise<string> {
  const sb = getSupabaseClient();
  const id = randomUUID();
  await sb.from('memories').insert({ id, category: data.category, content: data.content, importance: data.importance ?? 5, tags: JSON.stringify(data.tags ?? []) });
  return id;
}

export async function shouldAgentSpeak(text: string): Promise<boolean> {
  const lower = text.toLowerCase();
  const patterns = [/urgent|important|critical|asap/i, /reminder|don'?t forget|remember to/i, /warning|alert|attention/i, /earned|payment|money|dollar/i, /error|failed|rejected|banned/i, /congratulation|success|completed/i, /here.*code|here.*website|built.*for you|generated/i];
  return patterns.some(p => p.test(lower));
}

/* ── Tool Definitions ── */
export const TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'web_search',
      description: 'Search the web for current information, news, prices, documentation, tutorials, or any real-time data. Use this when you need information beyond your training data.',
      parameters: { type: 'object', properties: { query: { type: 'string', description: 'Search query' } }, required: ['query'] }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'web_fetch',
      description: 'Fetch and read the content of a URL. Use this when the user shares a link or you need to read a specific webpage.',
      parameters: { type: 'object', properties: { url: { type: 'string', description: 'The URL to fetch' } }, required: ['url'] }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'code_execute',
      description: 'Execute JavaScript code and return the output. Use this for calculations, data processing, string manipulation, generating data, or any code the user asks you to run.',
      parameters: { type: 'object', properties: { code: { type: 'string', description: 'JavaScript code to execute' } }, required: ['code'] }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'create_file',
      description: 'Create a downloadable file. Use this when building websites, apps, or any project the user needs to download. Provide the filename and full content.',
      parameters: { type: 'object', properties: { filename: { type: 'string', description: 'Filename with extension (e.g. index.html, app.py)' }, content: { type: 'string', description: 'Full file content' } }, required: ['filename', 'content'] }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'save_memory',
      description: 'Save an important fact about the user to your long-term memory. Use this when the user tells you something personal (name, location, preferences, goals, skills, projects, health, relationships), or when you learn something worth remembering across conversations. Do NOT save every message — only durable facts.',
      parameters: { type: 'object', properties: { category: { type: 'string', description: 'Category: identity, preference, goal, finance, project, health, relationship, skill, location, platform, general' }, content: { type: 'string', description: 'The fact as a clear, specific statement (e.g. "User\'s name is Chidi" not "name")' }, importance: { type: 'number', description: '1-10. 9-10 for critical identity, 7-8 for important preferences, 5-6 for useful context, 1-4 for minor notes' } }, required: ['category', 'content'] }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'update_task',
      description: 'Create, update, complete, or delete a task. Use this when the user asks you to track something, when you identify an action item from conversation, or when a task\'s status changes.',
      parameters: { type: 'object', properties: { action: { type: 'string', description: 'create, update, complete, or delete' }, title: { type: 'string', description: 'Task title (required for create)' }, description: { type: 'string', description: 'Task details (optional)' }, task_id: { type: 'string', description: 'Task ID (required for update/complete/delete)' }, priority: { type: 'string', description: 'low, medium, high, urgent (default: medium)' }, platform: { type: 'string', description: 'Related platform (optional)' } }, required: ['action'] }
    }
  }
];

/* ── Tool Implementations ── */
async function toolWebSearch(query: string): Promise<string> {
  try {
    const res = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`);
    const data = await res.json();
    let result = '';
    if (data.Abstract) result += data.Abstract + '\n';
    if (data.RelatedTopics) {
      for (const t of data.RelatedTopics.slice(0, 6)) {
        if (t.Text) result += '- ' + t.Text + '\n';
      }
    }
    if (!result.trim()) {
      const serp = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NEXUS/1.0)' } });
      const html = await serp.text();
      const snippets: string[] = [];
      const re = /class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;
      let m;
      while ((m = re.exec(html)) !== null && snippets.length < 5) {
        const clean = m[1].replace(/<[^>]+>/g, '').trim();
        if (clean) snippets.push(clean);
      }
      if (snippets.length > 0) result = snippets.map(s => '- ' + s).join('\n');
      else result = 'No results found. Try a different search term.';
    }
    return result.substring(0, 3000);
  } catch (e: any) {
    return `Search failed: ${e.message}`;
  }
}

async function toolWebFetch(url: string): Promise<string> {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NEXUS/1.0)' }, signal: AbortSignal.timeout(10000) });
    const html = await res.text();
    const text = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    return text.substring(0, 4000) || 'Page loaded but no readable content found.';
  } catch (e: any) {
    return `Fetch failed: ${e.message}`;
  }
}

async function toolCodeExecute(code: string): Promise<string> {
  try {
    const logs: string[] = [];
    const mockConsole = { log: (...args: any[]) => logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ')), error: (...args: any[]) => logs.push('ERROR: ' + args.map(String).join(' ')), warn: (...args: any[]) => logs.push('WARN: ' + args.map(String).join(' ')), info: (...args: any[]) => logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ')), table: (data: any) => logs.push(JSON.stringify(data, null, 2)), };
    const fn = new Function('console', 'fetch', 'JSON', 'Math', 'Date', 'Array', 'Object', 'String', 'Number', 'Promise', code);
    const result = await Promise.resolve(fn(mockConsole, fetch, JSON, Math, Date, Array, Object, String, Number, Promise));
    if (result !== undefined) logs.push('=> ' + (typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result)));
    return logs.length > 0 ? logs.join('\n').substring(0, 3000) : '(no output)';
  } catch (e: any) {
    return `Error: ${e.message}`;
  }
}

async function toolCreateFile(filename: string, content: string): Promise<string> {
  return JSON.stringify({ filename, content, downloadUrl: `/api/agent/tools/download?file=${encodeURIComponent(filename)}&id=${randomUUID()}` });
}

async function toolSaveMemory(args: any): Promise<string> {
  try {
    const id = await addMemory({ category: args.category || 'general', content: args.content, importance: args.importance || 5, tags: [args.category || 'general'] });
    return `Memory saved (id: ${id.substring(0,8)}...): [${args.category}] ${args.content}`;
  } catch (e: any) { return `Failed to save memory: ${e.message}`; }
}

async function toolUpdateTask(args: any): Promise<string> {
  try {
    const sb = getSupabaseClient();
    const action = args.action;
    if (action === 'create') {
      if (!args.title) return 'Error: title is required to create a task';
      const id = randomUUID();
      await sb.from('tasks').insert({ id, title: args.title, description: args.description || '', platform: args.platform || null, status: 'pending', priority: args.priority || 'medium' });
      return `Task created: ${args.title} (id: ${id.substring(0,8)})`;
    }
    if (action === 'complete') {
      if (!args.task_id) return 'Error: task_id is required';
      await sb.from('tasks').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', args.task_id);
      return `Task marked complete`;
    }
    if (action === 'update') {
      if (!args.task_id) return 'Error: task_id is required';
      const updates: Record<string, any> = { updated_at: new Date().toISOString() };
      if (args.title) updates.title = args.title;
      if (args.description) updates.description = args.description;
      if (args.priority) updates.priority = args.priority;
      if (args.status) updates.status = args.status;
      await sb.from('tasks').update(updates).eq('id', args.task_id);
      return `Task updated`;
    }
    if (action === 'delete') {
      if (!args.task_id) return 'Error: task_id is required';
      await sb.from('tasks').delete().eq('id', args.task_id);
      return `Task deleted`;
    }
    return `Unknown action: ${action}`;
  } catch (e: any) { return `Task error: ${e.message}`; }
}

export const TOOL_EXECUTORS: Record<string, (args: any) => Promise<string>> = {
  web_search: (a) => toolWebSearch(a.query),
  web_fetch: (a) => toolWebFetch(a.url),
  code_execute: (a) => toolCodeExecute(a.code),
  create_file: (a) => toolCreateFile(a.filename, a.content),
  save_memory: (a) => toolSaveMemory(a),
  update_task: (a) => toolUpdateTask(a),
};

export const TOOL_LABELS: Record<string, (args: any) => string> = {
  web_search: (a) => `Searched: ${a.query}`,
  web_fetch: (a) => `Fetched: ${a.url}`,
  code_execute: (a) => `Executed code`,
  create_file: (a) => `Created ${a.filename}`,
  save_memory: (a) => `Saved memory: ${a.content?.substring(0, 50)}...`,
  update_task: (a) => `${a.action === 'create' ? 'Created' : a.action === 'complete' ? 'Completed' : a.action === 'delete' ? 'Deleted' : 'Updated'} task${a.title ? ': ' + a.title : ''}`,
};

/* ── LLM Call with Tools ── */
export type LlmMsg = { role: string; content?: string; tool_calls?: any[]; tool_call_id?: string; name?: string };

async function callLlmWithTools(messages: LlmMsg[], maxTokens = 2048): Promise<{ content: string | null; tool_calls: any[] | null }> {
  const apiKey = getLlmApiKey();
  if (!apiKey) throw new Error('No API key set');
  let model = (await getSetting('llm_model')) || 'openrouter/free';
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'HTTP-Referer': 'https://nexus-agent.app', 'X-Title': 'NEXUS AI Agent' },
    body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature: 0.7, tools: TOOLS, tool_choice: 'auto' }),
  });
  if (!res.ok) { const err = await res.text(); throw new Error(`LLM API error (${res.status}): ${err}`); }
  const data = await res.json();
  const choice = data.choices?.[0];
  return { content: choice?.message?.content || null, tool_calls: choice?.message?.tool_calls || null };
}

async function callLlmText(messages: { role: string; content: string }[]): Promise<string> {
  const apiKey = getLlmApiKey();
  if (!apiKey) throw new Error('No API key set');
  let model = (await getSetting('llm_model')) || 'openrouter/free';
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'HTTP-Referer': 'https://nexus-agent.app', 'X-Title': 'NEXUS AI Agent' },
    body: JSON.stringify({ model, messages, max_tokens: 2048, temperature: 0.7 }),
  });
  if (!res.ok) { const err = await res.text(); throw new Error(`LLM API error (${res.status}): ${err}`); }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || 'No response from LLM.';
}

/* ── Main Process ── */
export async function processMessage(
  userMessage: string,
  conversationId: string,
  isNewConversation = false
): Promise<{ text: string; shouldSpeak: boolean; memoriesUsed: string[]; toolSteps: ToolStep[] }> {
  await ensureSchema();
  const sb = getSupabaseClient();
  const apiKey = getLlmApiKey();
  const agentName = (await getSetting('agent_name')) || 'NEXUS';

  await sb.from('messages').insert({ id: randomUUID(), conversation_id: conversationId, role: 'user', content: userMessage });

  const { data: history } = await sb.from('messages').select('role, content').eq('conversation_id', conversationId).order('created_at', { ascending: false }).limit(20);
  const historyReversed = [...(history || [])].reverse();

  const relevantMemories = await getRelevantMemories(userMessage, 8);
  const memoriesUsed = relevantMemories.map(m => m.content);
  for (const mem of relevantMemories) {
    await sb.from('memories').update({ access_count: (mem.access_count || 0) + 1, last_accessed: new Date().toISOString() }).eq('id', mem.id);
  }

  const memoryContext = relevantMemories.length > 0 ? `\n\nRELEVANT MEMORIES:\n${relevantMemories.map(m => `[${m.category}] ${m.content}`).join('\n')}` : '';
  const timeOfDay = new Date().getHours();
  const timeContext = timeOfDay < 6 ? "It's late night. Be concise." : timeOfDay < 12 ? 'Morning. Energize them.' : timeOfDay < 17 ? 'Afternoon. Check on progress.' : 'Evening. Wrap up and plan tomorrow.';

  const systemPrompt = `You are ${agentName} — a fully capable AI agent. You are not a chatbot. You are not an assistant. You are an AGENT that gets things DONE.

YOUR CAPABILITIES:
- WEB SEARCH: Search the web for any real-time information (news, prices, docs, tutorials, APIs)
- WEB FETCH: Read any URL the user sends you
- CODE EXECUTION: Write and run JavaScript code — calculations, data processing, algorithms, generate JSON/CSV/data
- FILE CREATION: Build websites (HTML/CSS/JS), scripts, configs — any file the user can download
- SAVE MEMORY: Remember important facts the user tells you across all future conversations
- MANAGE TASKS: Create, update, complete, or delete tasks for the user

WHEN TO USE TOOLS:
- User asks about current events, prices, news, weather, recent anything -> SEARCH
- User sends a link -> FETCH it and discuss the content
- User asks you to code, calculate, process data, build something -> EXECUTE code
- User asks you to build a website, app, landing page, or any project -> CREATE files
- User asks "can you build..." or "make me a..." or "create a..." -> USE tools to actually build it
- User tells you something personal, a preference, a goal, or says "remember this" -> SAVE to memory
- User asks you to track something or you identify an action item -> CREATE a task
- User says they finished something -> UPDATE or COMPLETE the task

CODING & BUILDING RULES:
- When building websites: ALWAYS create a COMPLETE, WORKING file with all HTML, CSS, and JS inline. Use modern CSS (flexbox, grid, gradients, animations). Make it look PROFESSIONAL — no placeholder text, no lorem ipsum, no ugly defaults.
- When writing code: Write CLEAN, WELL-COMMENTED code. Include error handling.
- After creating a file, briefly explain what you built and how to use it.
- For complex projects, create multiple files and explain the structure.

WHO YOU ARE:
- You remember EVERYTHING the user has ever told you (check memories above)
- You proactively speak up when something matters
- You learn preferences, habits, goals, and adapt over time
- You give real opinions, make recommendations, challenge bad ideas, celebrate wins
- You track their money (earnings from AI training platforms), tasks, and commitments

BEHAVIOR RULES:
- NEVER say "As an AI..." — you DO have opinions. Be real.
- NEVER say "How can I help you today?" — be specific to context.
- If you know the user's name, USE IT. Don't call them "user".
- When giving advice, be direct. "I think you should..." not "You might consider..."
- Keep responses focused — don't write essays unless the task requires it
- If you don't know something, SEARCH for it. Don't guess.
- When the user asks you to build something, ACTUALLY BUILD IT using create_file.

${timeContext}
${isNewConversation ? `This is a NEW conversation. Greet the user like you know them. Reference something specific from their history if available.` : ''}${memoryContext}

Time: ${new Date().toLocaleString('en-NG', { timeZone: 'Africa/Lagos', hour: '2-digit', minute: '2-digit' })}`;

  if (!apiKey) {
    const offlineResponse = generateOfflineResponse(userMessage, relevantMemories, agentName);
    await sb.from('messages').insert({ id: randomUUID(), conversation_id: conversationId, role: 'assistant', content: offlineResponse.text });
    await autoExtractMemories(userMessage);
    await sb.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', conversationId);
    return { ...offlineResponse, memoriesUsed, toolSteps: [] };
  }

  const chatMessages: LlmMsg[] = [{ role: 'system', content: systemPrompt }];
  for (const msg of historyReversed) {
    if (msg.role === 'user' || msg.role === 'assistant') chatMessages.push({ role: msg.role, content: msg.content as string });
  }

  const toolSteps: ToolStep[] = [];

  try {
    let response = await callLlmWithTools(chatMessages);
    let loopCount = 0;

    while (response.tool_calls && loopCount < 5) {
      chatMessages.push({ role: 'assistant', content: response.content || undefined, tool_calls: response.tool_calls });

      for (const tc of response.tool_calls) {
        const fnName = tc.function.name;
        let args: any = {};
        try { args = JSON.parse(tc.function.arguments); } catch { args = {}; }

        const startTime = Date.now();
        let output = '';

        if (TOOL_EXECUTORS[fnName]) {
          try { output = await TOOL_EXECUTORS[fnName](args); } catch (e: any) { output = `Tool error: ${e.message}`; }
        } else {
          output = `Unknown tool: ${fnName}`;
        }

        const duration = Date.now() - startTime;
        toolSteps.push({ tool: fnName, label: TOOL_LABELS[fnName]?.(args) || fnName, input: JSON.stringify(args), output: output.substring(0, 2000), duration });

        chatMessages.push({ role: 'tool', tool_call_id: tc.id, name: fnName, content: output.substring(0, 4000) });
      }

      response = await callLlmWithTools(chatMessages);
      loopCount++;
    }

    let responseText = response.content || '';
    if (!responseText && response.tool_calls) {
      responseText = toolSteps.length > 0
        ? `Done — ran ${toolSteps.length} tool${toolSteps.length > 1 ? 's' : ''}: ${toolSteps.map(s => s.label).join(', ')}.`
        : 'Tool calls returned no output.';
    }
    if (!responseText) responseText = 'No response generated.';
    // Sanitize: remove <unk> token vomit from free models
    responseText = responseText.replace(/(<unk>)+/gi, '').replace(/\s{3,}/g, '\n').trim();
    if (!responseText || responseText.length < 3) responseText = 'I processed your request but the model returned an empty response. Try rephrasing.';

    await sb.from('messages').insert({ id: randomUUID(), conversation_id: conversationId, role: 'assistant', content: responseText });
    await autoExtractMemories(userMessage);
    await autoExtractMemories(responseText, 'assistant');
    await sb.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', conversationId);
    const speak = await shouldAgentSpeak(responseText);
    return { text: responseText, shouldSpeak: speak, memoriesUsed, toolSteps };
  } catch (error: any) {
    const errorMsg = `Error: ${error.message}`;
    await sb.from('messages').insert({ id: randomUUID(), conversation_id: conversationId, role: 'assistant', content: errorMsg });
    return { text: errorMsg, shouldSpeak: true, memoriesUsed, toolSteps };
  }
}

function generateOfflineResponse(userMessage: string, memories: MemoryRow[], agentName: string): { text: string; shouldSpeak: boolean } {
  const lower = userMessage.toLowerCase();
  if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
    return { text: `Hey! I am ${agentName}. ${memories.length > 0 ? "I know you are working on something — ask me anything." : "Tell me about yourself so I can start learning."}\n\nSet your API key in Settings to unlock my full capabilities.`, shouldSpeak: true };
  }
  return { text: `I am ${agentName}, running in offline mode. Set your API key in Settings for full agent capabilities (free at openrouter.ai).`, shouldSpeak: false };
}

export async function autoExtractMemories(text: string, role: 'user' | 'assistant' = 'user') {
  if (role === 'assistant') return;
  const lower = text.toLowerCase();
  const nameMatch = text.match(/(?:my name is|i'm|i am)\s+([A-Z][a-z]+)/i);
  if (nameMatch) { const sb = getSupabaseClient(); const { data: exists } = await sb.from('memories').select('id').eq('category', 'identity').ilike('content', `%${nameMatch[1]}%`).limit(1); if (!exists || exists.length === 0) { await addMemory({ category: 'identity', content: `User's name is ${nameMatch[1]}`, importance: 9, tags: ['name', 'identity'] }); } }
  if (lower.includes('port harcourt') || lower.includes('nigeria') || lower.includes('rivers state')) { const sb = getSupabaseClient(); const { data: exists } = await sb.from('memories').select('id').eq('category', 'location').limit(1); if (!exists || exists.length === 0) { await addMemory({ category: 'location', content: 'User is based in Port Harcourt, Rivers State, Nigeria', importance: 8, tags: ['location', 'nigeria'] }); } }
  const platformNames = ['outlier', 'mindrift', 'pareto', 'telus', 'welocalize', 'oneforma', 'alignerr', 'crowdgen', 'handshake'];
  for (const p of platformNames) { if (lower.includes(p)) { const sb = getSupabaseClient(); const { data: exists } = await sb.from('memories').select('id').eq('category', 'platform').ilike('content', `%${p}%`).limit(1); if (!exists || exists.length === 0) { await addMemory({ category: 'platform', content: `User mentioned ${p} platform`, importance: 6, tags: ['platform', p] }); } } }
  if (lower.includes('earned') || lower.includes('made') || lower.includes('received') || lower.includes('paid')) { const earningMatch = text.match(/\$?([\d,]+\.?\d*)\s*(dollar|usd)?/i); if (earningMatch) { await addMemory({ category: 'finance', content: `User reported earning $${earningMatch[1]} (${text.substring(0, 100)})`, importance: 8, tags: ['earnings', 'finance'] }); } }
  if (lower.includes('remember') || lower.includes("don't forget") || lower.includes('note that')) { const cleaned = text.replace(/(?:please |can you )?(?:remember|note that|don't forget)\s*/i, '').trim(); if (cleaned.length > 5) { await addMemory({ category: 'user_request', content: cleaned, importance: 7, tags: ['remembered', 'important'] }); } }
}

export async function getAgentStatus() {
  await ensureSchema();
  const sb = getSupabaseClient();
  const [memRes, convRes, activeTasksRes, completedTasksRes, platformRes, totalEarnedRes, todayEarnedRes, weekEarnedRes] = await Promise.all([
    sb.from('memories').select('id', { count: 'exact', head: true }),
    sb.from('conversations').select('id', { count: 'exact', head: true }),
    sb.from('tasks').select('id', { count: 'exact', head: true }).in('status', ['pending', 'running']),
    sb.from('tasks').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
    sb.from('platform_accounts').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    sb.from('earnings').select('amount'),
    sb.from('earnings').select('amount').gte('earned_at', new Date(new Date().setHours(0,0,0,0)).toISOString()),
    sb.from('earnings').select('amount').gte('earned_at', new Date(Date.now() - 7*24*60*60*1000).toISOString()),
  ]);
  const totalEarned = (totalEarnedRes.data || []).reduce((s: number, r: any) => s + (r.amount || 0), 0);
  const todayEarned = (todayEarnedRes.data || []).reduce((s: number, r: any) => s + (r.amount || 0), 0);
  const weekEarned = (weekEarnedRes.data || []).reduce((s: number, r: any) => s + (r.amount || 0), 0);
  const { data: recentEarnings } = await sb.from('earnings').select('*').order('earned_at', { ascending: false }).limit(10);
  const { data: pendingTasks } = await sb.from('tasks').select('*').in('status', ['pending', 'running']).order('priority', { ascending: false }).order('created_at', { ascending: true }).limit(10);
  const { data: activeSchedules } = await sb.from('schedules').select('*').eq('is_active', 1);
  return { memoryCount: memRes.count ?? 0, conversationCount: convRes.count ?? 0, activeTasks: activeTasksRes.count ?? 0, completedTasks: completedTasksRes.count ?? 0, platformCount: platformRes.count ?? 0, totalEarned, todayEarned, weekEarned, recentEarnings: recentEarnings || [], pendingTasks: pendingTasks || [], activeSchedules: activeSchedules || [], hasApiKey: !!getLlmApiKey(), agentName: (await getSetting('agent_name')) || 'NEXUS', voiceEnabled: (await getSetting('voice_enabled')) === 'true', proactiveMode: (await getSetting('proactive_mode')) === 'true' };
}

export async function getProactiveMessage(): Promise<{ message: string; speak: boolean } | null> {
  await ensureSchema(); const sb = getSupabaseClient();
  const { data: overdueTasks } = await sb.from('tasks').select('*').eq('status', 'pending').not('scheduled_for', 'is', null).lte('scheduled_for', new Date().toISOString()).order('priority', { ascending: false }).limit(3);
  if (overdueTasks && overdueTasks.length > 0) { const names = overdueTasks.map((t: any) => t.title).join(', '); return { message: `Heads up — you have ${overdueTasks.length} overdue task${overdueTasks.length > 1 ? 's' : ''}: ${names}. Want me to start working on ${overdueTasks[0].title}?`, speak: true }; }
  const { data: urgentTasks } = await sb.from('tasks').select('*').in('status', ['pending', 'running']).in('priority', ['high', 'urgent']).order('priority', { ascending: false }).limit(3);
  if (urgentTasks && urgentTasks.length > 0) { const names = urgentTasks.map((t: any) => t.title).join(', '); return { message: `Quick reminder — ${urgentTasks.length} high-priority task${urgentTasks.length > 1 ? 's' : ''} waiting: ${names}.`, speak: true }; }
  const now = new Date(); const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`; const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { data: schedules } = await sb.from('schedules').select('*').eq('is_active', 1).eq('trigger_type', 'time').eq('trigger_value', currentTime).or(`last_triggered.is.null,last_triggered.lt.${oneHourAgo}`);
  if (schedules && schedules.length > 0) { const s = schedules[0]; await sb.from('schedules').update({ last_triggered: new Date().toISOString() }).eq('id', s.id); return { message: (s as any).message || (s as any).action, speak: true }; }
  if (!urgentTasks || urgentTasks.length === 0) { const { data: todayEarnings } = await sb.from('earnings').select('amount').gte('earned_at', new Date(new Date().setHours(0,0,0,0)).toISOString()); const todayTotal = (todayEarnings || []).reduce((s: number, r: any) => s + (r.amount || 0), 0); const { count: pendingCount } = await sb.from('tasks').select('id', { count: 'exact', head: true }).in('status', ['pending', 'running']); if ((pendingCount || 0) > 0 && todayTotal === 0) { return { message: `You have ${pendingCount} tasks queued but no earnings logged today. Time to get moving.`, speak: true }; } }
  return null;
}
