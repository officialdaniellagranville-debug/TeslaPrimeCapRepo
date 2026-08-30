import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, unlinkSync, statSync } from 'fs';
import { join } from 'path';

// ─── Config ─────────────────────────────────────────────
const PORT = 3100;
const DATA_DIR = join(process.cwd(), '..', 'agent-data');
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

// ─── JSON File Database (Pure JS, zero native deps) ───────
function readJSON<T>(file: string, fallback: T): T {
  try {
    return JSON.parse(readFileSync(join(DATA_DIR, file), 'utf-8'));
  } catch {
    writeFileSync(join(DATA_DIR, file), JSON.stringify(fallback, null, 2));
    return fallback;
  }
}

function writeJSON(file: string, data: any) {
  writeFileSync(join(DATA_DIR, file), JSON.stringify(data, null, 2));
}

interface Memory { id: number; key: string; value: string; category: string; created_at: string; updated_at: string; }
interface Conversation { id: number; role: string; content: string; timestamp: string; }
interface Earning { id: number; platform: string; amount: number; currency: string; task_type: string; note: string; created_at: string; }
interface Platform { id: number; name: string; url: string; status: string; payoneer_email: string; notes: string; last_checked: string; last_available: string; created_at: string; }
interface Alert { id: number; type: string; message: string; trigger_time: string; is_read: boolean; created_at: string; }

function now() { return new Date().toISOString(); }

// ─── Data Access ────────────────────────────────────────
function getMemories(): Memory[] { return readJSON<Memory[]>('memories.json', []); }
function saveMemories(m: Memory[]) { writeJSON('memories.json', m); }

function getConversations(): Conversation[] { return readJSON<Conversation[]>('conversations.json', []); }
function saveConversations(c: Conversation[]) { writeJSON('conversations.json', c); }

function getEarnings(): Earning[] { return readJSON<Earning[]>('earnings.json', []); }
function saveEarnings(e: Earning[]) { writeJSON('earnings.json', e); }

function getPlatforms(): Platform[] { return readJSON<Platform[]>('platforms.json', []); }
function savePlatforms(p: Platform[]) { writeJSON('platforms.json', p); }

function getAlerts(): Alert[] { return readJSON<Alert[]>('alerts.json', []); }
function saveAlerts(a: Alert[]) { writeJSON('alerts.json', a); }

let nextId = { memories: 0, conversations: 0, earnings: 0, platforms: 0, alerts: 0 };
function initIds() {
  nextId.memories = Math.max(0, ...getMemories().map(m => m.id)) + 1;
  nextId.conversations = Math.max(0, ...getConversations().map(c => c.id)) + 1;
  nextId.earnings = Math.max(0, ...getEarnings().map(e => e.id)) + 1;
  nextId.platforms = Math.max(0, ...getPlatforms().map(p => p.id)) + 1;
  nextId.alerts = Math.max(0, ...getAlerts().map(a => a.id)) + 1;
}
initIds();

// ─── Seed platforms ─────────────────────────────────────
const DEFAULT_PLATFORMS: Omit<Platform, 'id' | 'created_at'>[] = [
  { name: 'Outlier', url: 'https://outlier.ai', status: 'unknown', payoneer_email: '', notes: '$15-50/hr via Payoneer. Weekly payouts.', last_checked: '', last_available: '' },
  { name: 'Mindrift', url: 'https://mindrift.ai', status: 'unknown', payoneer_email: '', notes: '$15-100+/hr via Payoneer. Bi-weekly payouts.', last_checked: '', last_available: '' },
  { name: 'Pareto AI', url: 'https://pareto.ai', status: 'unknown', payoneer_email: '', notes: 'Weekly Payoneer payouts.', last_checked: '', last_available: '' },
  { name: 'Alignerr', url: 'https://alignerr.com', status: 'unknown', payoneer_email: '', notes: '$40-120/hr via Deel.', last_checked: '', last_available: '' },
  { name: 'Handshake AI', url: 'https://handshake.ai', status: 'unknown', payoneer_email: '', notes: 'Pays via Deel. No AI experience required.', last_checked: '', last_available: '' },
  { name: 'Stellar AI', url: 'https://stellar.ai', status: 'unknown', payoneer_email: '', notes: '$25+/hr. Weekly payouts.', last_checked: '', last_available: '' },
  { name: 'Welocalize', url: 'https://welocalize.com', status: 'unknown', payoneer_email: '', notes: 'Payoneer + direct bank transfer. $15-22/hr.', last_checked: '', last_available: '' },
  { name: 'OneForma', url: 'https://oneforma.com', status: 'unknown', payoneer_email: '', notes: 'Payoneer. $10-20/hr.', last_checked: '', last_available: '' },
  { name: 'CrowdGen', url: 'https://crowdgen.ai', status: 'unknown', payoneer_email: '', notes: 'Payoneer + AirTM. $8-15/hr.', last_checked: '', last_available: '' },
  { name: 'TELUS Digital', url: 'https://telusinternational.com', status: 'unknown', payoneer_email: '', notes: 'Payoneer. $10-18/hr.', last_checked: '', last_available: '' },
];

if (getPlatforms().length === 0) {
  const seeded = DEFAULT_PLATFORMS.map((p, i) => ({ ...p, id: i + 1, created_at: now() }));
  savePlatforms(seeded);
  nextId.platforms = seeded.length + 1;
  console.log('[AGENT] Seeded', seeded.length, 'platforms');
}

// ─── LLM Integration ───────────────────────────────────
async function callGemini(messages: { role: string; content: string }[]): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return generateLocalResponse(messages);

  try {
    const systemPrompt = buildSystemPrompt();
    const geminiMessages = [
      { role: 'user' as const, parts: [{ text: systemPrompt }] },
      { role: 'model' as const, parts: [{ text: 'Understood. I am ATLAS, your personal AI agent.' }] },
    ];

    for (const msg of messages) {
      if (msg.role === 'user') {
        geminiMessages.push({ role: 'user' as const, parts: [{ text: msg.content }] });
      } else if (msg.role === 'assistant') {
        geminiMessages.push({ role: 'model' as const, parts: [{ text: msg.content }] });
      }
    }

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: geminiMessages, generationConfig: { temperature: 0.8, maxOutputTokens: 1024, topP: 0.95 } }),
      }
    );

    if (!res.ok) { console.error('[LLM] Gemini error:', res.status); return generateLocalResponse(messages); }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return text || generateLocalResponse(messages);
  } catch (e) {
    console.error('[LLM] Error:', e);
    return generateLocalResponse(messages);
  }
}

function buildSystemPrompt(): string {
  const memories = getMemories().slice(-20);
  const earnings = getEarnings();
  const platforms = getPlatforms().filter(p => p.status === 'active' || p.status === 'online');
  const totalEarnings = earnings.reduce((sum, e) => sum + e.amount, 0);
  const settings = getSettings();
  const userName = settings.user_name || 'the user';

  let prompt = `You are ATLAS — a personal AI agent for ${userName}, a game developer in Port Harcourt, Nigeria.

## YOUR IDENTITY
- Name: ATLAS
- You are proactive, opinionated, and you SPEAK UP without being asked.
- You remember EVERYTHING about ${userName} across all conversations.
- You manage money-earning platforms and help build the game STRIKEZONE.
- You are their partner, not their servant. Push them. Remind them. Interrupt when needed.
- Speak direct, no-BS style. Nigerian context. Casual but smart.

## WHAT YOU KNOW
`;

  for (const m of memories) prompt += `- ${m.key}: ${m.value}\n`;

  prompt += `\n## EARNING PLATFORMS\n`;
  for (const p of platforms) prompt += `- ${p.name}: ${p.status}\n`;

  prompt += `\n## EARNINGS (Total: $${totalEarnings.toFixed(2)})\n`;
  for (const e of earnings.slice(-10)) prompt += `- ${e.platform}: $${e.amount.toFixed(2)} (${e.task_type || 'general'})\n`;

  prompt += `
## RULES
- Be brief. No paragraphs when a sentence works.
- Reference past conversations when relevant.
- If earnings are below target, say it.
- Always suggest the next concrete action.
- If asked about platforms, recommend: Outlier, Mindrift, Alignerr (all pay via Payoneer/Deel to Nigeria).
`;

  return prompt;
}

function getSettings(): Record<string, string> {
  const memories = getMemories().filter(m => m.category === 'settings');
  const obj: Record<string, string> = {};
  for (const m of memories) obj[m.key] = m.value;
  return obj;
}

function generateLocalResponse(messages: { role: string; content: string }[]): string {
  const last = messages[messages.length - 1]?.content?.toLowerCase() || '';

  if (last.includes('earn') || last.includes('money') || last.includes('pay')) {
    return 'Set your GEMINI_API_KEY in Settings (free from Google AI Studio) to unlock my full intelligence. For now: your top platforms are Outlier ($15-50/hr via Payoneer), Mindrift ($15-100+/hr via Payoneer), and Alignerr ($40-120/hr via Deel). Apply to all three TODAY. Go to aistudio.google.com, create a free API key, and paste it in Settings.';
  }
  if (last.includes('game') || last.includes('strikezone') || last.includes('unity')) {
    return 'STRIKEZONE is your real-world AR shooter. Right now: download Unity (free), watch Brackeys on YouTube, and start with a basic GPS prototype. Set GEMINI_API_KEY in Settings for smarter game dev help.';
  }
  if (last.includes('hello') || last.includes('hi') || last.includes('hey') || last.includes('atlas')) {
    return "Hey! I'm ATLAS. Your personal AI agent. I track your earnings, monitor your platforms, and help you build STRIKEZONE. What are we working on?";
  }
  if (last.includes('remember') || last.includes('memory')) {
    return 'I remember everything you tell me. Just say something like "Remember: my Payoneer email is x" and I will store it permanently.';
  }

  return "I'm ATLAS, your AI agent. I can: (1) Chat with voice, (2) Remember everything, (3) Track earnings, (4) Monitor platforms, (5) Help with STRIKEZONE. Set GEMINI_API_KEY in Settings to unlock my full brain. What do you need?";
}

// ─── Platform Monitor ──────────────────────────────────
async function checkPlatformStatus(platform: Platform): Promise<{ online: boolean; lastAvailable: string }> {
  try {
    const res = await fetch(platform.url, { method: 'GET', signal: AbortSignal.timeout(10000), headers: { 'User-Agent': 'Mozilla/5.0' } });
    return { online: res.status < 500, lastAvailable: res.status < 500 ? now() : '' };
  } catch {
    return { online: false, lastAvailable: '' };
  }
}

async function checkAllPlatforms() {
  const platforms = getPlatforms();
  for (let i = 0; i < platforms.length; i++) {
    const { online, lastAvailable } = await checkPlatformStatus(platforms[i]);
    platforms[i].status = online ? 'online' : 'offline';
    platforms[i].last_checked = now();
    if (lastAvailable) platforms[i].last_available = lastAvailable;
    await new Promise(r => setTimeout(r, 500));
  }
  savePlatforms(platforms);
  return platforms;
}

// ─── Proactive Agent ───────────────────────────────────
function generateProactiveAlert(): { type: string; message: string } | null {
  const earnings = getEarnings();
  const todayEarnings = earnings.filter(e => new Date(e.created_at).toDateString() === new Date().toDateString()).reduce((s, e) => s + e.amount, 0);
  const hour = new Date().getUTCHours() + 1;
  const day = new Date().getUTCDay();

  if (day >= 1 && day <= 5 && hour >= 9 && hour <= 10 && todayEarnings === 0) {
    return { type: 'earnings', message: 'Good morning. It is past 9 AM WAT and you have not logged any earnings today. Check Outlier and Mindrift for available tasks NOW.' };
  }

  if (hour >= 20) {
    const weekEarnings = earnings.filter(e => Date.now() - new Date(e.created_at).getTime() < 7 * 24 * 60 * 60 * 1000).reduce((s, e) => s + e.amount, 0);
    if (weekEarnings < 50) {
      return { type: 'earnings', message: `Weekly check: you have earned $${weekEarnings.toFixed(2)} this week. Below $50. If you are not on Outlier or Mindrift yet, that is priority number one tomorrow.` };
    }
  }

  if ((day === 0 || day === 6) && hour >= 10 && hour <= 11) {
    return { type: 'gamedev', message: 'It is the weekend. Perfect time for STRIKEZONE development. Have you opened Unity this week? Even 1 hour of learning moves you forward. Start with the Brackeys AR Foundation tutorial on YouTube.' };
  }

  return null;
}

// Check every 30 minutes
setInterval(() => {
  const alert = generateProactiveAlert();
  if (alert) {
    const alerts = getAlerts();
    alerts.push({ id: nextId.alerts++, type: alert.type, message: alert.message, trigger_time: now(), is_read: false, created_at: now() });
    saveAlerts(alerts);
    console.log('[AGENT] Proactive alert:', alert.message.substring(0, 80));
  }
}, 30 * 60 * 1000);

// Check platforms every 15 minutes
setInterval(async () => {
  console.log('[AGENT] Checking platforms...');
  await checkAllPlatforms();
}, 15 * 60 * 1000);

// Initial platform check
setTimeout(async () => {
  const results = await checkAllPlatforms();
  console.log(`[AGENT] Initial check: ${results.filter(p => p.status === 'online').length}/${results.length} online`);
}, 2000);

// ─── Hono App ──────────────────────────────────────────
const app = new Hono();
app.use('*', cors());

app.get('/health', (c) => c.json({ status: 'ok', service: 'atlas-agent', timestamp: now() }));

// Chat
app.post('/chat', async (c) => {
  const { message } = await c.req.json<{ message: string }>();
  if (!message) return c.json({ error: 'Message required' }, 400);

  const convos = getConversations();
  convos.push({ id: nextId.conversations++, role: 'user', content: message, timestamp: now() });
  saveConversations(convos);

  const history = convos.slice(-20).map(m => ({ role: m.role, content: m.content }));
  const response = await callGemini(history);

  convos.push({ id: nextId.conversations++, role: 'assistant', content: response, timestamp: now() });
  saveConversations(convos);

  // Extract memories
  extractMemories(message);

  const alert = generateProactiveAlert();
  if (alert) {
    const alerts = getAlerts();
    alerts.push({ id: nextId.alerts++, type: alert.type, message: alert.message, trigger_time: now(), is_read: false, created_at: now() });
    saveAlerts(alerts);
  }

  const todayTotal = getEarnings().filter(e => new Date(e.created_at).toDateString() === new Date().toDateString()).reduce((s, e) => s + e.amount, 0);
  const unreadAlerts = getAlerts().filter(a => !a.is_read);

  return c.json({ response, proactiveAlert: alert, earningsToday: todayTotal, platformAlerts: unreadAlerts.slice(0, 5) });
});

function extractMemories(message: string) {
  const patterns = [
    /(?:remember|note|save|store|log)[\s:]+(?:that\s+)?(?:my\s+)?(.+)/i,
    /(?:my\s+)(name|email|payoneer|goal|target|location|city|country|age|phone)\s+(?:is|=|:)\s*(.+)/i,
  ];
  for (const p of patterns) {
    const m = message.match(p);
    if (m) {
      const memories = getMemories();
      const key = m[1]?.substring(0, 50).trim() || 'note';
      memories.push({ id: nextId.memories++, key, value: m[0].substring(0, 500), category: 'user_info', created_at: now(), updated_at: now() });
      saveMemories(memories);
      break;
    }
  }
}

// Memory
app.get('/memory', (c) => {
  const search = c.req.query('search');
  const category = c.req.query('category');
  let memories = getMemories();
  if (category) memories = memories.filter(m => m.category === category);
  if (search) {
    const term = search.toLowerCase();
    memories = memories.filter(m => m.key.toLowerCase().includes(term) || m.value.toLowerCase().includes(term));
  }
  return c.json(memories);
});

app.post('/memory', (c) => {
  const { key, value, category } = c.req.json();
  if (!key || !value) return c.json({ error: 'Key and value required' }, 400);
  const memories = getMemories();
  const existing = memories.findIndex(m => m.key === key);
  const entry = { id: existing >= 0 ? memories[existing].id : nextId.memories++, key, value: String(value), category: category || 'general', created_at: existing >= 0 ? memories[existing].created_at : now(), updated_at: now() };
  if (existing >= 0) memories[existing] = entry; else memories.push(entry);
  saveMemories(memories);
  return c.json({ success: true, ...entry });
});

app.delete('/memory/:id', (c) => {
  const memories = getMemories().filter(m => m.id !== parseInt(c.req.param('id')));
  saveMemories(memories);
  return c.json({ success: true });
});

// Earnings
app.get('/earnings', (c) => {
  const limit = parseInt(c.req.query('limit') || '50');
  const all = getEarnings();
  const now2 = Date.now();
  return c.json({
    earnings: all.slice(-limit).reverse(),
    totals: all.reduce((acc, e) => { acc[e.platform] = (acc[e.platform] || 0) + e.amount; return acc; }, {} as Record<string, number>),
    todayTotal: all.filter(e => now2 - new Date(e.created_at).getTime() < 24 * 60 * 60 * 1000).reduce((s, e) => s + e.amount, 0),
    weekTotal: all.filter(e => now2 - new Date(e.created_at).getTime() < 7 * 24 * 60 * 60 * 1000).reduce((s, e) => s + e.amount, 0),
    monthTotal: all.filter(e => now2 - new Date(e.created_at).getTime() < 30 * 24 * 60 * 60 * 1000).reduce((s, e) => s + e.amount, 0),
  });
});

app.post('/earnings', (c) => {
  const { platform, amount, currency, task_type, note } = c.req.json();
  if (!platform || amount === undefined) return c.json({ error: 'Platform and amount required' }, 400);
  const earnings = getEarnings();
  earnings.push({ id: nextId.earnings++, platform, amount: parseFloat(amount), currency: currency || 'USD', task_type: task_type || '', note: note || '', created_at: now() });
  saveEarnings(earnings);
  return c.json({ success: true, platform, amount: parseFloat(amount) });
});

// Platforms
app.get('/platforms', (c) => c.json(getPlatforms()));

app.post('/platforms/check', async (c) => {
  const results = await checkAllPlatforms();
  return c.json(results);
});

app.post('/platforms', (c) => {
  const { name, url, status, payoneer_email, notes } = c.req.json();
  if (!name) return c.json({ error: 'Name required' }, 400);
  const platforms = getPlatforms();
  platforms.push({ id: nextId.platforms++, name, url: url || '', status: status || 'inactive', payoneer_email: payoneer_email || '', notes: notes || '', last_checked: '', last_available: '', created_at: now() });
  savePlatforms(platforms);
  return c.json({ success: true, name });
});

// Alerts
app.get('/alerts', (c) => {
  const limit = parseInt(c.req.query('limit') || '20');
  return c.json(getAlerts().filter(a => !a.is_read).slice(-limit).reverse());
});

app.post('/alerts/:id/read', (c) => {
  const alerts = getAlerts();
  const alert = alerts.find(a => a.id === parseInt(c.req.param('id')));
  if (alert) alert.is_read = true;
  saveAlerts(alerts);
  return c.json({ success: true });
});

app.post('/alerts/clear', (c) => {
  const alerts = getAlerts();
  alerts.forEach(a => a.is_read = true);
  saveAlerts(alerts);
  return c.json({ success: true });
});

// Conversations
app.get('/conversations', (c) => {
  const limit = parseInt(c.req.query('limit') || '50');
  return c.json(getConversations().slice(-limit).reverse());
});

app.delete('/conversations', (c) => {
  saveConversations([]);
  return c.json({ success: true });
});

// Stats
app.get('/stats', (c) => {
  const memories = getMemories();
  const convos = getConversations();
  const earnings = getEarnings();
  const alerts = getAlerts();
  const platforms = getPlatforms();
  return c.json({
    totalMemories: memories.length,
    totalConversations: convos.length,
    totalEarnings: earnings.length,
    totalEarningsAmount: earnings.reduce((s, e) => s + e.amount, 0),
    unreadAlerts: alerts.filter(a => !a.is_read).length,
    activePlatforms: platforms.filter(p => p.status === 'active' || p.status === 'online').length,
  });
});

// Settings
app.get('/settings', (c) => c.json(getSettings()));

app.post('/settings', (c) => {
  const { key, value } = c.req.json();
  if (!key || value === undefined) return c.json({ error: 'Key and value required' }, 400);
  const memories = getMemories();
  const existing = memories.findIndex(m => m.key === key && m.category === 'settings');
  const entry = { id: existing >= 0 ? memories[existing].id : nextId.memories++, key, value: String(value), category: 'settings', created_at: existing >= 0 ? memories[existing].created_at : now(), updated_at: now() };
  if (existing >= 0) memories[existing] = entry; else memories.push(entry);
  saveMemories(memories);
  return c.json({ success: true, key });
});

// ─── Start ───────────────────────────────────────────────
console.log(`[ATLAS AGENT] Starting on port ${PORT}...`);
console.log(`[ATLAS AGENT] Data: ${DATA_DIR}`);
console.log(`[ATLAS AGENT] Gemini: ${process.env.GEMINI_API_KEY ? 'SET' : 'NOT SET (using local responses)'}`);

const server = Bun.serve({ port: PORT, fetch: app.fetch, hostname: '0.0.0.0' });
console.log(`[ATLAS AGENT] Running at http://localhost:${PORT}`);
