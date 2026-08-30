import { NextRequest } from 'next/server';
import { getSupabaseClient, ensureSchema } from '@/lib/agent/db';
import {
  getRelevantMemories,
  shouldAgentSpeak,
  autoExtractMemories,
  getSetting,
  TOOLS,
  TOOL_EXECUTORS,
  TOOL_LABELS,
  ToolStep,
  LlmMsg,
} from '@/lib/agent/engine';
import { randomUUID } from 'crypto';

/* ── Helpers ── */

function getLlmApiKey(): string | null {
  return process.env.OPENROUTER_API_KEY || process.env.LLM_API_KEY || null;
}

function sseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

interface OpenRouterDeltaToolCall {
  index: number;
  id?: string;
  function?: {
    name?: string;
    arguments?: string;
  };
}

/* ── Accumulate streaming tool calls from delta chunks ── */

interface AccumulatedToolCall {
  id: string;
  name: string;
  arguments: string;
}

function accumulateToolCalls(
  acc: Map<number, AccumulatedToolCall>,
  deltaToolCalls: OpenRouterDeltaToolCall[]
): void {
  for (const tc of deltaToolCalls) {
    const idx = tc.index;
    const existing = acc.get(idx);
    if (tc.id) {
      acc.set(idx, {
        id: tc.id,
        name: tc.function?.name || existing?.name || '',
        arguments: tc.function?.arguments || '',
      });
    } else if (existing) {
      if (tc.function?.name) existing.name = tc.function.name;
      if (tc.function?.arguments) existing.arguments += tc.function.arguments;
    }
  }
}

/* ── Parse an OpenRouter SSE stream, yielding tokens and collecting tool calls ── */

async function* streamOpenRouter(
  messages: LlmMsg[],
  apiKey: string,
  model: string,
  maxTokens: number,
): AsyncGenerator<
  | { type: 'token'; text: string }
  | { type: 'tool_calls'; toolCalls: AccumulatedToolCall[] }
  | { type: 'error'; message: string }
  | { type: 'done' }
> {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://nexus-agent.app',
      'X-Title': 'NEXUS AI Agent',
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens,
      temperature: 0.7,
      tools: TOOLS,
      tool_choice: 'auto',
      stream: true,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => 'Unknown error');
    yield { type: 'error', message: `LLM API error (${res.status}): ${errText}` };
    return;
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder('utf-8' as BufferEncoding);
  let buffer = '';
  const toolCallAcc = new Map<number, AccumulatedToolCall>();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      // Keep the last (potentially incomplete) line in the buffer
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        const payload = trimmed.slice(6); // remove 'data: '

        if (payload === '[DONE]') {
          // Flush any accumulated tool calls
          if (toolCallAcc.size > 0) {
            const sorted = Array.from(toolCallAcc.entries())
              .sort(([a], [b]) => a - b)
              .map(([, v]) => v);
            yield { type: 'tool_calls', toolCalls: sorted };
          }
          yield { type: 'done' };
          return;
        }

        let parsed: any;
        try {
          parsed = JSON.parse(payload);
        } catch {
          continue; // skip malformed JSON
        }

        const delta = parsed.choices?.[0]?.delta;
        if (!delta) continue;

        // Yield content tokens (filter <unk> garbage from bad models)
        if (delta.content) {
          const cleaned = delta.content.replace(/(<unk>)+/gi, '');
          if (cleaned) {
            yield { type: 'token', text: cleaned };
          }
        }

        // Accumulate tool call deltas
        if (delta.tool_calls && delta.tool_calls.length > 0) {
          accumulateToolCalls(toolCallAcc, delta.tool_calls);
        }
      }
    }

    // Stream ended without [DONE] — still flush tool calls if any
    if (toolCallAcc.size > 0) {
      const sorted = Array.from(toolCallAcc.entries())
        .sort(([a], [b]) => a - b)
        .map(([, v]) => v);
      yield { type: 'tool_calls', toolCalls: sorted };
    }
    yield { type: 'done' };
  } finally {
    reader.releaseLock();
  }
}

/* ── POST Handler ── */

export async function POST(req: NextRequest) {
  // --- Parse & validate request ---
  let body: { message?: string; conversationId?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const { message, conversationId } = body;
  if (!message || typeof message !== 'string') {
    return new Response(JSON.stringify({ error: 'Message is required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  // --- Ensure schema & resolve conversation ---
  let convId: string;
  let isNew = false;
  try {
    await ensureSchema();
    const sb = getSupabaseClient();

    if (!conversationId) {
      convId = randomUUID();
      isNew = true;
      await sb.from('conversations').insert({ id: convId, title: message.substring(0, 60) });
    } else {
      convId = conversationId;
      const { data: conv } = await sb.from('conversations').select('id').eq('id', convId).single();
      if (!conv) {
        return new Response(JSON.stringify({ error: 'Conversation not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
      }
    }
  } catch (error: any) {
    return new Response(JSON.stringify({ error: `Setup failed: ${error.message}` }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  // --- Check API key ---
  const apiKey = getLlmApiKey();
  if (!apiKey) {
    return new Response(
      `event: error\ndata: ${JSON.stringify({ message: 'No API key configured. Set OPENROUTER_API_KEY or LLM_API_KEY in your environment.' })}\n\n`,
      {
        status: 200, // SSE connections should return 200 even for logical errors
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
        },
      }
    );
  }

  // --- Create the SSE stream ---
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(sseEvent(event, data)));
      };

      try {
        const sb = getSupabaseClient();
        const agentName = (await getSetting('agent_name')) || 'NEXUS';
        const model = (await getSetting('llm_model')) || 'openrouter/free';

        // Save user message
        await sb.from('messages').insert({ id: randomUUID(), conversation_id: convId, role: 'user', content: message });

        // Load conversation history
        const { data: history } = await sb
          .from('messages')
          .select('role, content')
          .eq('conversation_id', convId)
          .order('created_at', { ascending: false })
          .limit(20);
        const historyReversed = [...(history || [])].reverse();

        // Load relevant memories
        const relevantMemories = await getRelevantMemories(message, 8);
        const memoriesUsed = relevantMemories.map(m => m.content);
        for (const mem of relevantMemories) {
          await sb
            .from('memories')
            .update({ access_count: (mem.access_count || 0) + 1, last_accessed: new Date().toISOString() })
            .eq('id', mem.id);
        }

        // Build memory context
        const memoryContext =
          relevantMemories.length > 0
            ? `\n\nRELEVANT MEMORIES:\n${relevantMemories.map(m => `[${m.category}] ${m.content}`).join('\n')}`
            : '';

        // Time context
        const timeOfDay = new Date().getHours();
        const timeContext =
          timeOfDay < 6
            ? "It's late night. Be concise."
            : timeOfDay < 12
              ? 'Morning. Energize them.'
              : timeOfDay < 17
                ? 'Afternoon. Check on progress.'
                : 'Evening. Wrap up and plan tomorrow.';

        // System prompt (mirrors processMessage)
        const systemPrompt = `You are ${agentName} — a fully capable AI agent. You are not a chatbot. You are not an assistant. You are an AGENT that gets things DONE.

YOUR CAPABILITIES:
- WEB SEARCH: Search the web for any real-time information (news, prices, docs, tutorials, APIs)
- WEB FETCH: Read any URL the user sends you
- CODE EXECUTION: Write and run JavaScript code — calculations, data processing, algorithms, generate JSON/CSV/data
- FILE CREATION: Build websites (HTML/CSS/JS), scripts, configs — any file the user can download

WHEN TO USE TOOLS:
- User asks about current events, prices, news, weather, recent anything -> SEARCH
- User sends a link -> FETCH it and discuss the content
- User asks you to code, calculate, process data, build something -> EXECUTE code
- User asks you to build a website, app, landing page, or any project -> CREATE files
- User asks "can you build..." or "make me a..." or "create a..." -> USE tools to actually build it

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
${isNew ? 'This is a NEW conversation. Greet the user like you know them. Reference something specific from their history if available.' : ''}${memoryContext}

USER CONTEXT:
- Location: Port Harcourt, Rivers State, Nigeria
- Building: STRIKEZONE game
- Income goal: $100-500/month via AI training platforms (Outlier, Mindrift, Pareto, Telus, etc.)
- Payout: Payoneer
- Time: ${new Date().toLocaleString('en-NG', { timeZone: 'Africa/Lagos', hour: '2-digit', minute: '2-digit' })}`;

        // Build messages array
        const chatMessages: LlmMsg[] = [{ role: 'system', content: systemPrompt }];
        for (const msg of historyReversed) {
          if (msg.role === 'user' || msg.role === 'assistant') {
            chatMessages.push({ role: msg.role, content: msg.content as string });
          }
        }

        // --- Agent loop (max 5 iterations) ---
        const toolSteps: ToolStep[] = [];
        let fullResponseText = '';
        let loopCount = 0;
        const MAX_LOOPS = 5;

        while (loopCount < MAX_LOOPS) {
          const streamGen = streamOpenRouter(chatMessages, apiKey, model, 2048);
          let hasToolCalls = false;
          let currentTokenText = '';

          for await (const chunk of streamGen) {
            if (chunk.type === 'token') {
              currentTokenText += chunk.text;
              send('token', { text: chunk.text });
            } else if (chunk.type === 'tool_calls') {
              hasToolCalls = true;
              // Add the partial assistant message (content only, tool_calls separate)
              chatMessages.push({
                role: 'assistant',
                content: currentTokenText || undefined,
                tool_calls: chunk.toolCalls.map(tc => ({
                  id: tc.id,
                  type: 'function',
                  function: { name: tc.name, arguments: tc.arguments },
                })),
              });

              // Execute each tool
              for (const tc of chunk.toolCalls) {
                let args: any = {};
                try {
                  args = JSON.parse(tc.arguments);
                } catch {
                  args = {};
                }

                const label = TOOL_LABELS[tc.name]?.(args) || tc.name;
                send('tool_start', { tool: tc.name, label });

                const startTime = Date.now();
                let output = '';

                if (TOOL_EXECUTORS[tc.name]) {
                  try {
                    output = await TOOL_EXECUTORS[tc.name](args);
                  } catch (e: any) {
                    output = `Tool error: ${e.message}`;
                  }
                } else {
                  output = `Unknown tool: ${tc.name}`;
                }

                const duration = Date.now() - startTime;
                toolSteps.push({
                  tool: tc.name,
                  label,
                  input: JSON.stringify(args),
                  output: output.substring(0, 2000),
                  duration,
                });

                send('tool_result', {
                  tool: tc.name,
                  label,
                  output: output.substring(0, 2000),
                  duration,
                });

                // Add tool result to messages for next LLM call
                chatMessages.push({
                  role: 'tool',
                  tool_call_id: tc.id,
                  name: tc.name,
                  content: output.substring(0, 4000),
                });
              }
            } else if (chunk.type === 'error') {
              send('error', { message: chunk.message });
              controller.close();
              return;
            }
          }

          if (!hasToolCalls) {
            fullResponseText = currentTokenText;
            break;
          }

          loopCount++;
          // If we hit max loops, the last iteration's tokens become the final text
          if (loopCount >= MAX_LOOPS) {
            const toolSummary = toolSteps.map(s => `${s.label}: done in ${s.duration}ms`).join(', ');
            fullResponseText = currentTokenText || `Completed ${toolSteps.length} action${toolSteps.length > 1 ? 's' : ''}: ${toolSummary}`;
          }
        }

        // If no text was produced at all (edge case)
        if (!fullResponseText && toolSteps.length > 0) {
          const toolSummary = toolSteps.map(s => `${s.label}: done`).join(', ');
          fullResponseText = `Done! ${toolSummary}.`;
        } else if (!fullResponseText) {
          fullResponseText = 'No response generated.';
        }

        // Sanitize any remaining <unk> tokens from final text
        fullResponseText = fullResponseText.replace(/(<unk>)+/gi, '').trim();

        // --- Persist to database ---
        try {
          await sb.from('messages').insert({
            id: randomUUID(),
            conversation_id: convId,
            role: 'assistant',
            content: fullResponseText,
          });
        } catch (dbErr: any) {
          console.error('Failed to save assistant message:', dbErr);
        }

        // --- Extract memories ---
        try {
          await autoExtractMemories(message);
          await autoExtractMemories(fullResponseText, 'assistant');
        } catch (memErr: any) {
          console.error('Memory extraction failed:', memErr);
        }

        // --- Update conversation timestamp ---
        try {
          await sb.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', convId);
        } catch (updErr: any) {
          console.error('Failed to update conversation:', updErr);
        }

        // --- Check if agent should speak ---
        let speak = false;
        try {
          speak = await shouldAgentSpeak(fullResponseText);
        } catch {
          speak = false;
        }

        // --- Send done event ---
        send('done', {
          conversationId: convId,
          isNew,
          shouldSpeak: speak,
          memoriesUsed,
          toolSteps,
        });
      } catch (error: any) {
        console.error('Stream error:', error);
        try {
          send('error', { message: error.message || 'An unexpected error occurred' });
        } catch {
          // If even sending the error fails, just close
        }
      } finally {
        try {
          controller.close();
        } catch {
          // Stream already closed
        }
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  });
}
