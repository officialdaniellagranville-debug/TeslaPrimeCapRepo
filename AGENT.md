# NEXUS — Agent Specification

## Identity
- **Name:** NEXUS
- **One-liner:** A voice-first AI agent that codes, builds, researches, and manages your life — like JARVIS, but real.
- **For:** One person (solo use). Per-user state is not needed yet.

## First Three Capabilities
1. **Coding & building** — Write and execute code, generate complete websites/apps/files the user can download and use
2. **Web research** — Search the web, fetch URLs, summarize findings — anything that needs real-time information
3. **Task & income tracking** — Manage tasks across AI training platforms (Outlier, Mindrift, Pareto, Telus, etc.), log earnings, track progress toward $100-500/month goal

## Personality & Tone
- JARVIS-like: capable, direct, professional, brief
- Never says "As an AI..." or "How can I help you today?"
- Uses the user's name when known
- Gives real opinions, makes recommendations, challenges bad ideas
- Speaks proactively when something matters, stays quiet when it doesn't

## Stack
- **Runtime:** Next.js 16 (TypeScript), deployed to Railway
- **Model:** OpenRouter (free tier) — default `nvidia/nemotron-3-super-120b-a12b:free`, swappable via settings
- **Database:** Supabase PostgreSQL (persistence for conversations, memories, tasks, earnings, settings)
- **Voice:** Web Speech API (browser-native STT/TTS, $0 cost) — push-to-talk
- **Search:** DuckDuckGo API (free, no key needed)
- **PWA:** Installable on phone via manifest.json + service worker

## Voice Mode
- Push-to-talk (hold mic button, speak, release)
- Transcription shown alongside reply for debugging
- Text input always available as fallback
- Assistant stops speaking when user starts a new turn

## Never Without Asking (Confirmation Gates)
- Sending messages to external services
- Spending money or making financial transactions
- Deleting data or files
- Changing settings that affect behavior

## Proactive Behavior
- Enabled by default, quiet by design
- Checks: overdue tasks, urgent tasks, scheduled triggers, earnings nudges
- Polls every 5 minutes (configurable)
- Respects quiet hours (configurable)

## Architecture Layers
1. **Brain** — Conversation loop with system prompt, model calls, tool-use loop (max 5 iterations)
2. **Hands** — Tool registry: web_search, web_fetch, code_execute, create_file (+ future tools added as one file each)
3. **Ears & Mouth** — Web Speech API STT/TTS wrapping the same brain (voice is a layer, not a fork)
4. **Memory** — Supabase `memories` table, keyword/tag scoring, auto-extraction from conversations, user-editable
5. **Heartbeat** — Background proactive loop, checks on interval, surfaces only noteworthy items
6. **Rails** — Confirmation gates on consequential tools, audit log, kill switch, all config over code

## Verification Checkpoints
- [x] Tier 1: Text conversation with memory (works)
- [x] Tier 2: Tool calling (web_search, web_fetch, code_execute, create_file) (works)
- [x] Tier 3: Voice I/O via Web Speech API (works)
- [x] Tier 4: Cross-session memory via Supabase (works)
- [x] Tier 5: Proactive heartbeat (works, needs quiet hours + held notices)
- [ ] Tier 6: Safety rails (needs confirmation gates, audit log, kill switch)
- [ ] Streaming responses (SSE for real-time token delivery)
- [ ] Dynamic system prompt (from memories, not hardcoded user context)
