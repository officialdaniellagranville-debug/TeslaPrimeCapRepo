import os

page = r"""'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Mic, MicOff, Send, Brain, ListTodo, DollarSign, Settings,
  MessageSquare, Plus, Trash2, CheckCircle, Clock, AlertCircle,
  Play, X, Volume2, VolumeX, Bot, ChevronUp, Server, Shield, ImagePlus
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

/* ── Types ── */
type Msg = { id: string; role: string; content: string; created_at?: string }
type Task = { id: string; title: string; description: string; platform: string | null; status: string; priority: string; created_at: string }
type Plat = { id: string; platform: string; email: string; status: string; total_earned: number; tasks_completed: number; notes: string; last_active: string | null }
type Mem = { id: string; category: string; content: string; importance: number; tags: string; created_at: string }
type S = { memoryCount: number; conversationCount: number; activeTasks: number; completedTasks: number; platformCount: number; totalEarned: number; todayEarned: number; weekEarned: number; hasApiKey: boolean; agentName: string; voiceEnabled: boolean; proactiveMode: boolean; recentEarnings?: any[]; pendingTasks?: any[] }

async function api(path: string, options?: RequestInit) {
  const res = await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...options })
  return res.json()
}

function ft(iso?: string) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

/* ── Collapsible Section ── */
function Section({ title, icon, count, expanded, onToggle, children }: { title: string; icon: React.ReactNode; count?: number; expanded: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div className='mb-3'>
      <button onClick={onToggle} className='w-full flex items-center justify-between py-2 px-1' style={{ color: 'rgba(255,255,255,0.6)' }}>
        <div className='flex items-center gap-2'><span style={{ color: '#00e5ff' }}>{icon}</span><span className='text-xs font-semibold tracking-widest uppercase'>{title}</span>{count !== undefined && <span className='text-[10px] px-1.5 py-0.5 rounded-full' style={{ background: 'rgba(0,229,255,0.1)', color: '#00e5ff' }}>{count}</span>}</div>
        <ChevronUp size={14} className='transition-transform duration-300' style={{ transform: expanded ? 'rotate(0deg)' : 'rotate(180deg)', color: 'rgba(255,255,255,0.2)' }} />
      </button>
      {expanded && <div className='mt-2 pl-1'>{children}</div>}
    </div>
  )
}

export default function Home() {
  const [status, setStatus] = useState<S | null>(null)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const [convId, setConvId] = useState<string | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [platforms, setPlatforms] = useState<Plat[]>([])
  const [memories, setMemories] = useState<Mem[]>([])
  const [cfg, setCfg] = useState<Record<string, string>>({})
  const [voice, setVoice] = useState(true)
  const [listening, setListening] = useState(false)
  const [speechOk, setSpeechOk] = useState(false)
  const [panel, setPanel] = useState(false)
  const [expSec, setExpSec] = useState<string | null>(null)
  const [newTask, setNewTask] = useState({ title: '', description: '', platform: '', priority: 'medium' })
  const [newPlat, setNewPlat] = useState({ platform: '', email: '', password: '', notes: '' })
  const [newMem, setNewMem] = useState({ category: 'general', content: '', importance: '5', tags: '' })
  const [newEarn, setNewEarn] = useState({ platform: '', amount: '', task_type: '', notes: '' })
  const [apiKey, setApiKey] = useState('')
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  const endRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const recRef = useRef<any>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const orb = typing ? 'thinking' : listening ? 'listening' : 'idle'

  /* ── Data Loading ── */
  const loadStatus = useCallback(async () => { try { setStatus(await api('/api/agent/status')) } catch {} }, [])
  const loadAll = useCallback(async () => {
    await loadStatus()
    try {
      const r = await api('/api/agent/chat')
      if (r.conversations?.length > 0) { setConvId(r.conversations[0].id); const m = await api(`/api/agent/chat?conversationId=${r.conversations[0].id}`); setMsgs(m.messages || []) }
    } catch {}
    try { setMemories((await api('/api/agent/memory')).memories || []) } catch {}
    try { setCfg(await api('/api/agent/config')) } catch {}
  }, [loadStatus])

  useEffect(() => { loadAll() }, [loadAll])
  useEffect(() => {
    if (expSec === 'tasks') api('/api/agent/status').then(s => setTasks(s.pendingTasks || [])).catch(() => {})
    if (expSec === 'platforms') api('/api/agent/platforms').then(r => setPlatforms(r.platforms || [])).catch(() => {})
    if (expSec === 'memory') api('/api/agent/memory').then(r => setMemories(r.memories || [])).catch(() => {})
  }, [expSec])

  /* ── Voice ── */
  const speak = useCallback((t: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(t.replace(/[*#_`]/g, '').replace(/\n+/g, '. ').substring(0, 500))
    u.rate = 1.1; u.pitch = 0.9
    window.speechSynthesis.speak(u)
  }, [])

  const toggleListen = useCallback(() => {
    if (!recRef.current) return
    listening ? recRef.current.stop() : recRef.current.start()
  }, [listening])

  /* ── Chat ── */
  const send = useCallback(async (text?: string) => {
    const msg = text || input.trim()
    if (!msg || typing) return
    setInput(''); setMsgs(p => [...p, { id: Date.now().toString(), role: 'user', content: msg, created_at: new Date().toISOString() }]); setTyping(true)
    try {
      const r = await api('/api/agent/chat', { method: 'POST', body: JSON.stringify({ message: msg, conversationId: convId }) })
      if (r.isNew) setConvId(r.conversationId)
      setMsgs(p => [...p, { id: (Date.now()+1).toString(), role: 'assistant', content: r.response, created_at: new Date().toISOString() }])
      if (r.shouldSpeak && voice && speechOk) speak(r.response)
    } catch { setMsgs(p => [...p, { id: 'e', role: 'assistant', content: 'Connection error.', created_at: new Date().toISOString() }]) }
    setTyping(false); loadStatus();
    if (expSec === 'memory') api('/api/agent/memory').then(r => setMemories(r.memories || [])).catch(() => {})
  }, [convId, input, typing, voice, speechOk, speak, loadStatus, expSec])

  /* ── Image send ── */
  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string
      setImagePreview(base64)
      setMsgs(p => [...p, { id: Date.now().toString(), role: 'user', content: `[Image: ${f.name}]`, created_at: new Date().toISOString() }])
      setTyping(true)
      try {
        const r = await api('/api/agent/chat', { method: 'POST', body: JSON.stringify({ message: `[User sent an image: ${f.name}. Describe what you see and discuss it.]`, conversationId: convId }) })
        if (r.isNew) setConvId(r.conversationId)
        setMsgs(p => [...p, { id: (Date.now()+1).toString(), role: 'assistant', content: r.response, created_at: new Date().toISOString() }])
        if (r.shouldSpeak && voice && speechOk) speak(r.response)
      } catch {}
      setTyping(false); setImagePreview(null)
    }
    reader.readAsDataURL(f)
    e.target.value = ''
  }

  /* ── Speech Recognition ── */
  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (SR) {
      setSpeechOk(true)
      const r = new SR(); r.continuous = false; r.interimResults = false; r.lang = 'en-US'
      r.onresult = (e: any) => send(e.results[0][0].transcript)
      r.onend = () => setListening(false)
      r.onerror = () => setListening(false)
      recRef.current = r
    }
  }, [send])

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs])

  /* ── Proactive ── */
  useEffect(() => {
    if (!status?.proactiveMode || !status?.hasApiKey) return
    const iv = setInterval(async () => {
      try {
        const r = await api('/api/agent/proactive')
        if (r.message) {
          setMsgs(p => [...p, { id: 'p-' + Date.now(), role: 'assistant', content: r.message, created_at: new Date().toISOString() }])
          if (r.speak && voice && speechOk) speak(r.message)
        }
      } catch {}
    }, 300000)
    return () => clearInterval(iv)
  }, [status?.proactiveMode, status?.hasApiKey, voice, speechOk, speak])

  /* ── CRUD ── */
  const createTask = async () => {
    if (!newTask.title.trim()) return
    await api('/api/agent/tasks', { method: 'POST', body: JSON.stringify(newTask) })
    setNewTask({ title: '', description: '', platform: '', priority: 'medium' }); loadStatus()
    setTasks((await api('/api/agent/status')).pendingTasks || [])
  }
  const updateTask = async (id: string, u: any) => { await api('/api/agent/tasks', { method: 'PATCH', body: JSON.stringify({ id, ...u }) }); loadStatus(); setTasks((await api('/api/agent/status')).pendingTasks || []) }
  const deleteTask = async (id: string) => { await api(`/api/agent/tasks?id=${id}`, { method: 'DELETE' }); loadStatus(); setTasks((await api('/api/agent/status')).pendingTasks || []) }
  const createPlat = async () => {
    if (!newPlat.platform.trim() || !newPlat.email.trim()) return
    await api('/api/agent/platforms', { method: 'POST', body: JSON.stringify(newPlat) })
    setNewPlat({ platform: '', email: '', password: '', notes: '' }); loadStatus()
    setPlatforms((await api('/api/agent/platforms')).platforms || [])
  }
  const deletePlat = async (id: string) => { await api(`/api/agent/platforms?id=${id}`, { method: 'DELETE' }); loadStatus(); setPlatforms((await api('/api/agent/platforms')).platforms || []) }
  const createMem = async () => {
    if (!newMem.content.trim()) return
    await api('/api/agent/memory', { method: 'POST', body: JSON.stringify({ ...newMem, importance: parseInt(newMem.importance), tags: newMem.tags.split(',').map(t => t.trim()).filter(Boolean) }) })
    setNewMem({ category: 'general', content: '', importance: '5', tags: '' }); loadStatus()
    setMemories((await api('/api/agent/memory')).memories || [])
  }
  const deleteMem = async (id: string) => { await api(`/api/agent/memory?id=${id}`, { method: 'DELETE' }); loadStatus(); setMemories((await api('/api/agent/memory')).memories || []) }
  const logEarning = async () => {
    if (!newEarn.amount) return
    await api('/api/agent/status', { method: 'POST', body: JSON.stringify({ type: 'log_earning', ...newEarn, amount: parseFloat(newEarn.amount) }) })
    setNewEarn({ platform: '', amount: '', task_type: '', notes: '' }); loadStatus()
  }
  const saveKey = async () => {
    await api('/api/agent/config', { method: 'POST', body: JSON.stringify({ key: 'llm_api_key', value: apiKey }) })
    setApiKey(''); const s = await api('/api/agent/status'); setStatus(s)
  }
  const updateCfg = async (k: string, v: string) => { await api('/api/agent/config', { method: 'POST', body: JSON.stringify({ key: k, value: v }) }); setCfg(p => ({ ...p, [k]: v })); loadStatus() }

  const newConvo = () => { setConvId(null); setMsgs([]) }

  const online = status?.hasApiKey ?? false
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className='min-h-screen flex flex-col overflow-hidden' style={{ background: '#030712', color: '#fff', userSelect: 'none' }}>
      <style>{`
        @keyframes pulse-orb{0%,100%{transform:scale(1);opacity:.6}50%{transform:scale(1.05);opacity:1}}
        @keyframes spin-slow{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes spin-rev{from{transform:rotate(360deg)}to{transform:rotate(0deg)}}
        @keyframes fade-up{from{transform:translateY(10px);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes wf{0%,100%{height:4px}50%{height:var(--wh,16px)}}
        @keyframes scan{from{top:-40%}to{top:140%}}
        @keyframes pulse-listen{0%,100%{transform:scale(1);opacity:.5}50%{transform:scale(1.15);opacity:.9}}
        @keyframes ring-exp{0%,100%{transform:scale(1);opacity:.3}50%{transform:scale(1.2);opacity:.6}}
        @keyframes glow{0%,100%{box-shadow:0 0 20px rgba(0,229,255,0.15)}50%{box-shadow:0 0 40px rgba(0,229,255,0.3)}}
        .fi{animation:fade-up .4s ease-out forwards}
        .sb::-webkit-scrollbar{width:3px}.sb::-webkit-scrollbar-track{background:transparent}.sb::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.08);border-radius:9px}
      `}</style>

      {/* ── HUD Header ── */
      <div className='flex-shrink-0 flex items-center justify-between px-4 pt-3 pb-1' style={{ zIndex: 20 }}>
        <div className='flex items-center gap-2'>
          <div className='w-2 h-2 rounded-full' style={{ background: online ? '#00e5ff' : '#ef4444', boxShadow: online ? '0 0 8px rgba(0,229,255,0.5)' : '0 0 8px rgba(239,68,68,0.5)' }} />
          <span className='text-xs font-bold tracking-wider' style={{ color: online ? '#00e5ff' : 'rgba(255,255,255,0.4)' }}>{status?.agentName || 'NEXUS'}</span>
        </div>
        <div className='flex items-center gap-3'>
          <span className='text-[10px]' style={{ color: 'rgba(255,255,255,0.25)' }}>${(status?.todayEarned || 0).toFixed(2)} today</span>
          <span className='text-[10px]' style={{ color: 'rgba(255,255,255,0.15)' }}>{status?.memoryCount || 0} memories</span>
          <button onClick={newConvo} className='w-7 h-7 rounded-full flex items-center justify-center' style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}><Plus size={13} style={{ color: 'rgba(255,255,255,0.3)' }} /></button>
          <button onClick={() => setVoice(!voice)} className='w-7 h-7 rounded-full flex items-center justify-center' style={{ background: voice ? 'rgba(0,229,255,0.08)' : 'rgba(255,255,255,0.04)', border: `1px solid ${voice ? 'rgba(0,229,255,0.2)' : 'rgba(255,255,255,0.06)'}` }}>{voice ? <Volume2 size={13} style={{ color: '#00e5ff' }} /> : <VolumeX size={13} style={{ color: 'rgba(255,255,255,0.2)' }} />}</button>
        </div>
      </div>

      {/* ── Chat Area ── */
      <div className='flex-1 overflow-y-auto sb px-4 py-2' style={{ maskImage: 'linear-gradient(to bottom, black 90%, transparent 100%)' }}>
        {msgs.length === 0 ? (
          <div className='flex flex-col items-center justify-center' style={{ height: 'calc(100vh - 180px)' }}>
            <div className='relative flex items-center justify-center mb-6' style={{ width: 140, height: 140 }}>
              <div className='absolute inset-0 rounded-full' style={{ border: '1px solid rgba(0,229,255,0.15)', animation: orb === 'listening' ? 'spin-rev 8s linear infinite,ring-exp 1.5s ease-in-out infinite' : 'spin-rev 20s linear infinite' }} />
              <div className='absolute rounded-full' style={{ inset: 12, border: '1px solid rgba(0,229,255,0.2)', animation: orb === 'listening' ? 'spin-slow 10s linear infinite,ring-exp 1.2s ease-in-out infinite .3s' : 'spin-slow 18s linear infinite' }} />
              <div className='absolute rounded-full' style={{ inset: 28, border: '1px solid rgba(0,229,255,0.3)', animation: orb === 'listening' ? 'spin-rev 6s linear infinite' : orb === 'thinking' ? 'spin-slow 4s linear infinite' : 'spin-slow 15s linear infinite' }} />
              <div className='absolute rounded-full' style={{ inset: 44, border: '1px solid rgba(0,229,255,0.2)', boxShadow: '0 0 30px rgba(0,229,255,0.1),inset 0 0 30px rgba(0,229,255,0.04)', animation: 'pulse-orb 3s ease-in-out infinite' }} />
              <div className='rounded-full relative overflow-hidden' style={{ width: 48, height: 48, background: 'radial-gradient(circle,rgba(0,229,255,0.25) 0%,rgba(0,229,255,0.04) 60%,transparent 100%)', boxShadow: '0 0 40px rgba(0,229,255,0.15),0 0 80px rgba(0,229,255,0.08)', animation: orb === 'listening' ? 'pulse-listen .8s ease-in-out infinite' : orb === 'thinking' ? 'glow 1.5s ease-in-out infinite' : 'pulse-orb 3s ease-in-out infinite' }}>
                {orb === 'thinking' && <div className='absolute left-0 w-full' style={{ height: 2, background: 'linear-gradient(90deg,transparent,#00e5ff,transparent)', animation: 'scan 2s linear infinite' }} />}
              </div>
            </div>
            <p className='text-sm mb-1' style={{ color: 'rgba(255,255,255,0.35)' }}>{online ? (orb === 'idle' ? `${greeting}. Tap mic or type.` : '') : 'Offline — set API key in ⊙'}</p>
            {!online && <p className='text-[11px] mt-2 max-w-[240px] text-center' style={{ color: 'rgba(255,255,255,0.15)' }}>Open the panel below → Settings → add your free OpenRouter key</p>}
          </div>
        ) : (
          <div className='flex flex-col gap-3 pb-4'>
            {msgs.map(m => (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} fi`}>
                {m.role === 'assistant' && <div className='flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mr-2 mt-1' style={{ background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.15)' }}><Bot size={11} style={{ color: '#00e5ff' }} /></div>}
                <div className='max-w-[82%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed' style={{ background: m.role === 'user' ? 'rgba(0,229,255,0.06)' : 'rgba(255,255,255,0.03)', border: m.role === 'user' ? '1px solid rgba(0,229,255,0.12)' : '1px solid rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(12px)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {m.content}
                  <div className='mt-1' style={{ fontSize: 9, color: m.role === 'user' ? 'rgba(0,229,255,0.3)' : 'rgba(255,255,255,0.15)' }}>{ft(m.created_at)}</div>
                </div>
              </div>
            ))}
            {typing && (
              <div className='flex justify-start fi'>
                <div className='flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mr-2 mt-1' style={{ background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.15)' }}><Bot size={11} style={{ color: '#00e5ff' }} /></div>
                <div className='rounded-2xl px-4 py-3 flex items-center gap-1.5' style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  {[0,1,2].map(i => <div key={i} className='w-1.5 h-1.5 rounded-full' style={{ background: 'rgba(0,229,255,0.4)', animation: `pulse-orb 1s ease-in-out infinite ${i*0.2}s` }} />)}
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>
        )}
      </div>

      {/* ── Input Bar ── */
      <div className='flex-shrink-0 px-3 pb-2' style={{ zIndex: 20 }}>
        {imagePreview && <div className='mb-2 flex items-center gap-2 px-2'><img src={imagePreview} className='w-12 h-12 rounded-lg object-cover' style={{ border: '1px solid rgba(0,229,255,0.2)' }} /><button onClick={() => setImagePreview(null)}><X size={14} style={{ color: 'rgba(255,255,255,0.3)' }} /></button></div>}
        <div className='flex items-center gap-2'>
          <button onClick={toggleListen} className='relative flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center' style={{ background: listening ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.04)', border: listening ? '1.5px solid rgba(239,68,68,0.4)' : '1px solid rgba(255,255,255,0.08)' }}>
            {listening && <div className='absolute inset-0 rounded-full' style={{ border: '2px solid rgba(239,68,68,0.2)', animation: 'ring-exp 1s ease-in-out infinite' }} />}
            {listening ? <Mic size={18} style={{ color: '#ef4444' }} /> : speechOk ? <Mic size={18} style={{ color: 'rgba(255,255,255,0.4)' }} /> : <MicOff size={18} style={{ color: 'rgba(255,255,255,0.15)' }} />}
          </button>
          <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }} placeholder={listening ? 'Listening...' : online ? `Ask ${status?.agentName || 'NEXUS'} anything...` : 'Type here...'} className='flex-1 bg-transparent text-sm py-2.5 px-1 outline-none' style={{ color: 'rgba(255,255,255,0.85)', borderBottom: '1px solid rgba(255,255,255,0.08)' }} disabled={typing} />
          <button onClick={() => fileRef.current?.click()} className='flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center' style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}><ImagePlus size={15} style={{ color: 'rgba(255,255,255,0.35)' }} /></button>
          <input ref={fileRef} type='file' accept='image/*' className='hidden' onChange={handleImage} />
          {input.trim() && <button onClick={() => send()} className='flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center' style={{ background: 'rgba(0,229,255,0.12)', border: '1px solid rgba(0,229,255,0.25)' }}><Send size={15} style={{ color: '#00e5ff' }} /></button>}
          <button onClick={() => setPanel(!panel)} className='flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center' style={{ background: panel ? 'rgba(0,229,255,0.08)' : 'rgba(255,255,255,0.04)', border: panel ? '1px solid rgba(0,229,255,0.15)' : '1px solid rgba(255,255,255,0.06)' }}><ChevronUp size={15} className='transition-transform duration-300' style={{ color: panel ? '#00e5ff' : 'rgba(255,255,255,0.3)', transform: panel ? 'rotate(180deg)' : 'rotate(0)' }} /></button>
        </div>
        {(listening || typing) && <div className='flex items-center justify-center gap-[3px] mt-2 h-5'>{[1,2,3,4,5].map(i => <div key={i} style={{ width: 3, height: 4, borderRadius: 2, background: listening ? 'rgba(239,68,68,0.5)' : 'rgba(0,229,255,0.3)', animation: `wf 1s ease-in-out infinite ${i*0.12}s`, '--wh': `${12 + i*3}px` }} />)}</div>}
      </div>

      {/* ── Slide-Up Panel ── */
      <div className='flex-shrink-0 transition-transform duration-500 ease-out' style={{ transform: panel ? 'translateY(0)' : 'translateY(100%)', zIndex: 30, maxHeight: '60vh' }}>
        <div className='rounded-t-3xl overflow-hidden' style={{ background: 'rgba(8,12,28,0.97)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.05)', borderBottom: 'none' }}>
          <div className='flex justify-center pt-2.5 pb-1'><div className='w-10 h-1 rounded-full' style={{ background: 'rgba(255,255,255,0.12)' }} /></div>
          <div className='overflow-y-auto sb px-4 pb-8' style={{ maxHeight: 'calc(60vh - 20px)' }}>

            {/* Tasks */}
            <Section title='Tasks' icon={<ListTodo size={14} />} count={tasks.length} expanded={expSec === 'tasks'} onToggle={() => setExpSec(expSec === 'tasks' ? null : 'tasks')}>
              <div className='flex gap-1.5 mb-2'><input value={newTask.title} onChange={e => setNewTask(p => ({ ...p, title: e.target.value }))} onKeyDown={e => e.key === 'Enter' && createTask()} placeholder='New task...' className='flex-1 bg-transparent text-xs py-2 px-3 rounded-lg outline-none' style={{ border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)' }} /><button onClick={createTask} className='px-2.5 py-2 rounded-lg' style={{ background: 'rgba(0,229,255,0.08)', color: '#00e5ff', border: '1px solid rgba(0,229,255,0.15)' }}><Plus size={13} /></button></div>
              {tasks.length === 0 && <p className='text-[11px] text-center py-2' style={{ color: 'rgba(255,255,255,0.15)' }}>No tasks</p>}
              {tasks.map(t => (<div key={t.id} className='flex items-center gap-2 px-3 py-2 rounded-lg mb-1' style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.03)' }}><button onClick={() => updateTask(t.id, { status: t.status === 'completed' ? 'pending' : 'completed' })}>{t.status === 'completed' ? <CheckCircle size={13} style={{ color: '#10b981' }} /> : t.status === 'running' ? <Play size={13} style={{ color: '#f97316' }} /> : <Clock size={13} style={{ color: 'rgba(255,255,255,0.2)' }} />}</button><span className={`flex-1 text-xs truncate ${t.status === 'completed' ? 'line-through' : ''}`} style={{ color: t.status === 'completed' ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.6)' }}>{t.title}</span><button onClick={() => deleteTask(t.id)}><Trash2 size={11} style={{ color: 'rgba(255,255,255,0.1)' }} /></button></div>))}
            </Section>

            {/* Platforms */}
            <Section title='Platforms' icon={<Server size={14} />} count={platforms.length} expanded={expSec === 'platforms'} onToggle={() => setExpSec(expSec === 'platforms' ? null : 'platforms')}>
              <div className='flex gap-1.5 mb-2'><input value={newPlat.platform} onChange={e => setNewPlat(p => ({ ...p, platform: e.target.value }))} placeholder='Platform' className='flex-1 bg-transparent text-xs py-2 px-3 rounded-lg outline-none' style={{ border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)' }} /><input value={newPlat.email} onChange={e => setNewPlat(p => ({ ...p, email: e.target.value }))} placeholder='Email' className='flex-1 bg-transparent text-xs py-2 px-3 rounded-lg outline-none' style={{ border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)' }} /><button onClick={createPlat} className='px-2.5 py-2 rounded-lg' style={{ background: 'rgba(0,229,255,0.08)', color: '#00e5ff', border: '1px solid rgba(0,229,255,0.15)' }}><Plus size={13} /></button></div>
              {platforms.length === 0 && <p className='text-[11px] text-center py-2' style={{ color: 'rgba(255,255,255,0.15)' }}>No platforms</p>}
              {platforms.map(p => (<div key={p.id} className='flex items-center gap-2 px-3 py-2 rounded-lg mb-1' style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.03)' }}><Shield size={12} style={{ color: '#00e5ff' }} /><div className='flex-1 min-w-0'><div className='text-xs truncate' style={{ color: 'rgba(255,255,255,0.6)' }}>{p.platform}</div><div className='text-[10px] truncate' style={{ color: 'rgba(255,255,255,0.25)' }}>{p.email} · ${p.total_earned?.toFixed(2) || 0}</div></div><button onClick={() => deletePlat(p.id)}><Trash2 size={11} style={{ color: 'rgba(255,255,255,0.1)' }} /></button></div>))}
            </Section>

            {/* Memory */}
            <Section title='Memory' icon={<Brain size={14} />} count={memories.length} expanded={expSec === 'memory'} onToggle={() => setExpSec(expSec === 'memory' ? null : 'memory')}>
              <div className='flex gap-1.5 mb-2'><Textarea value={newMem.content} onChange={e => setNewMem(p => ({ ...p, content: e.target.value }))} placeholder='Remember this...' className='flex-1 bg-transparent text-xs py-2 px-3 rounded-lg outline-none resize-none' rows={2} style={{ border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)' }} /><button onClick={createMem} className='self-end px-2.5 py-2 rounded-lg' style={{ background: 'rgba(0,229,255,0.08)', color: '#00e5ff', border: '1px solid rgba(0,229,255,0.15)' }}><Plus size={13} /></button></div>
              {memories.length === 0 && <p className='text-[11px] text-center py-2' style={{ color: 'rgba(255,255,255,0.15)' }}>No memories yet. I learn as we talk.</p>}
              {memories.slice(0, 10).map(m => (<div key={m.id} className='flex items-start gap-2 px-3 py-2 rounded-lg mb-1' style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.03)' }}><span className='text-[9px] px-1.5 py-0.5 rounded shrink-0 mt-0.5' style={{ background: 'rgba(0,229,255,0.08)', color: '#00e5ff' }}>{m.category}</span><span className='flex-1 text-xs leading-relaxed' style={{ color: 'rgba(255,255,255,0.5)' }}>{m.content}</span><button onClick={() => deleteMem(m.id)} className='shrink-0 mt-0.5'><Trash2 size={10} style={{ color: 'rgba(255,255,255,0.1)' }} /></button></div>))}
            </Section>

            {/* Earnings */}
            <Section title='Earnings' icon={<DollarSign size={14} />} count={status?.recentEarnings?.length || 0} expanded={expSec === 'earnings'} onToggle={() => setExpSec(expSec === 'earnings' ? null : 'earnings')}>
              <div className='grid grid-cols-3 gap-2 mb-3 text-center'><div><div className='text-lg font-bold' style={{ color: '#00e5ff' }}>${(status?.totalEarned || 0).toFixed(2)}</div><div className='text-[9px]' style={{ color: 'rgba(255,255,255,0.25)' }}>TOTAL</div></div><div><div className='text-lg font-bold' style={{ color: '#10b981' }}>${(status?.todayEarned || 0).toFixed(2)}</div><div className='text-[9px]' style={{ color: 'rgba(255,255,255,0.25)' }}>TODAY</div></div><div><div className='text-lg font-bold' style={{ color: '#f97316' }}>${(status?.weekEarned || 0).toFixed(2)}</div><div className='text-[9px]' style={{ color: 'rgba(255,255,255,0.25)' }}>WEEK</div></div></div>
              <div className='flex gap-1.5 mb-3'><input value={newEarn.amount} onChange={e => setNewEarn(p => ({ ...p, amount: e.target.value }))} placeholder='$0' type='number' step='0.01' className='w-20 bg-transparent text-xs py-2 px-3 rounded-lg outline-none' style={{ border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)' }} /><input value={newEarn.platform} onChange={e => setNewEarn(p => ({ ...p, platform: e.target.value }))} placeholder='Platform' className='flex-1 bg-transparent text-xs py-2 px-3 rounded-lg outline-none' style={{ border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)' }} /><button onClick={logEarning} className='px-3 py-2 rounded-lg text-xs' style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}>Log</button></div>
              {(status?.recentEarnings || []).slice(0, 5).map((e: any, i: number) => (<div key={i} className='flex items-center justify-between px-3 py-1.5 rounded-lg mb-0.5' style={{ background: 'rgba(255,255,255,0.015)' }}><span className='text-xs' style={{ color: 'rgba(255,255,255,0.4)' }}>{e.platform || '?'}</span><span className='text-xs font-medium' style={{ color: '#10b981' }}>${(e.amount || 0).toFixed(2)}</span></div>))}
            </Section>

            {/* Settings */}
            <Section title='Settings' icon={<Settings size={14} />} expanded={expSec === 'settings'} onToggle={() => setExpSec(expSec === 'settings' ? null : 'settings')}>
              <div className='space-y-4'>
                <div><label className='text-[10px] block mb-1.5' style={{ color: 'rgba(255,255,255,0.3)' }}>OPENROUTER API KEY</label><div className='flex gap-1.5'><input value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder='sk-or-v1-...' className='flex-1 bg-transparent text-xs py-2 px-3 rounded-lg outline-none' style={{ border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)' }} /><button onClick={saveKey} className='px-3 py-2 rounded-lg text-xs' style={{ background: 'rgba(0,229,255,0.1)', color: '#00e5ff', border: '1px solid rgba(0,229,255,0.2)' }}>Save</button></div></div>
                <div><label className='text-[10px] block mb-1.5' style={{ color: 'rgba(255,255,255,0.3)' }}>AI MODEL</label><Select value={cfg.llm_model || ''} onValueChange={v => updateCfg('llm_model', v)}><SelectTrigger className='w-full bg-transparent text-xs py-2 rounded-lg outline-none' style={{ border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)' }}><SelectValue placeholder='Select model' /></SelectTrigger><SelectContent style={{ background: '#0c1225', border: '1px solid rgba(255,255,255,0.08)' }}>{['nvidia/nemotron-3-super-120b-a12b:free','meta-llama/llama-3.1-8b-instruct:free','google/gemma-2-9b-it:free','mistralai/mistral-7b-instruct:free','deepseek/deepseek-chat:free'].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select></div>
                <div className='flex items-center justify-between'><Label className='text-xs' style={{ color: 'rgba(255,255,255,0.5)' }}>Voice</Label><Switch checked={voice} onCheckedChange={v => { setVoice(v); updateCfg('voice_enabled', String(v)) }} /></div>
                <div className='flex items-center justify-between'><Label className='text-xs' style={{ color: 'rgba(255,255,255,0.5)' }}>Proactive Mode</Label><Switch checked={cfg.proactive_mode === 'true'} onCheckedChange={v => updateCfg('proactive_mode', String(v))} /></div>
                <div><label className='text-[10px] block mb-1.5' style={{ color: 'rgba(255,255,255,0.3)' }}>AGENT NAME</label><input value={cfg.agent_name || ''} onChange={e => updateCfg('agent_name', e.target.value)} className='w-full bg-transparent text-xs py-2 px-3 rounded-lg outline-none' style={{ border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)' }} /></div>
              </div>
            </Section>

          </div>
        </div>
      </div>
    </div>
  )
}
"""

with open('/home/z/my-project/src/app/page.tsx', 'w') as f:
    f.write(page)
print(f'Written {len(page)} chars')
