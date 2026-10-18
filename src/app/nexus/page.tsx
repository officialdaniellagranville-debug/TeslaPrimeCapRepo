'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Mic, MicOff, Send, Brain, ListTodo, DollarSign, Settings,
  MessageSquare, Plus, Trash2, CheckCircle, Clock, AlertCircle,
  Play, X, Volume2, VolumeX, ChevronUp, Server, Shield, ImagePlus,
  Wifi, WifiOff, Radio, Search, Code, FileDown, ChevronDown, ExternalLink, Copy, Check
} from 'lucide-react'
import JarvisFace from '@/components/JarvisFace'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type ToolStep = { tool: string; label: string; input: string; output: string; duration: number }
type Msg = { id: string; role: string; content: string; created_at?: string; toolSteps?: ToolStep[] }
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

function Section({ title, icon, count, expanded, onToggle, children }: { title: string; icon: React.ReactNode; count?: number; expanded: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div className='mb-2'>
      <div className='flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200' style={{ background: expanded ? 'rgba(0,229,255,0.04)' : 'rgba(255,255,255,0.015)', border: `1px solid ${expanded ? 'rgba(0,229,255,0.1)' : 'rgba(255,255,255,0.03)'}` }} onClick={onToggle}>
        <span style={{ color: '#00e5ff' }}>{icon}</span>
        <span className='text-xs font-semibold tracking-widest uppercase' style={{ color: 'rgba(255,255,255,0.55)' }}>{title}</span>
        {count !== undefined && <span className='ml-auto text-[10px] px-1.5 py-0.5 rounded-full font-mono' style={{ background: 'rgba(0,229,255,0.08)', color: 'rgba(0,229,255,0.6)' }}>{count}</span>}
        <span className='text-[10px] ml-1 transition-transform duration-200' style={{ color: 'rgba(255,255,255,0.2)', transform: expanded ? 'rotate(180deg)' : 'rotate(0)', display: 'inline-block' }}>▾</span>
      </div>
      {expanded && <div className='mt-2 pl-1'>{children}</div>}
    </div>
  )
}

export default function Home() {
  const [input, setInput] = useState('')
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [typing, setTyping] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [status, setStatus] = useState<S | null>(null)
  const [convId, setConvId] = useState<string | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [platforms, setPlatforms] = useState<Plat[]>([])
  const [memories, setMemories] = useState<Mem[]>([])
  const [cfg, setCfg] = useState<Record<string, string>>({})
  const [voice, setVoice] = useState(true)
  const [listening, setListening] = useState(false)
  const [speechOk, setSpeechOk] = useState(false)
  const [ttsOk, setTtsOk] = useState(false)
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

  const orb = typing ? 'thinking' : listening ? 'listening' : speaking ? 'speaking' : 'idle'
  const [faceSize, setFaceSize] = useState(260)
  useEffect(() => { setFaceSize(window.innerWidth < 400 ? 200 : window.innerWidth < 768 ? 240 : 300) }, [])

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

  const speak = useCallback((t: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const clean = t.replace(/[*#_`~]/g, "").replace(/\n+/g, ". ").replace(/\s+/g, " ").substring(0, 800)
    const u = new SpeechSynthesisUtterance(clean)
    u.rate = 1.05
    u.pitch = 0.85
    u.volume = 1
    const voices = window.speechSynthesis.getVoices()
    const preferred = voices.find(v => v.name.includes('Google') && v.lang.startsWith('en'))
      || voices.find(v => v.name.includes('Samantha'))
      || voices.find(v => v.name.includes('Daniel'))
      || voices.find(v => v.lang.startsWith('en') && v.name.includes('Female'))
      || voices.find(v => v.lang.startsWith('en'))
    if (preferred) u.voice = preferred
    u.onstart = () => setSpeaking(true)
    u.onend = () => setSpeaking(false)
    u.onerror = () => setSpeaking(false)
    window.speechSynthesis.speak(u)
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      setTtsOk(true)
      const loadVoices = () => window.speechSynthesis.getVoices()
      loadVoices()
      window.speechSynthesis.onvoiceschanged = loadVoices
    }
  }, [])

  const toggleListen = useCallback(() => {
    if (!recRef.current) return
    listening ? recRef.current.stop() : recRef.current.start()
  }, [listening])

  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [expandedTools, setExpandedTools] = useState<Record<string, boolean>>({})

  const copyCode = useCallback((id: string, code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }, [])

  const downloadFile = useCallback((content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  }, [])

  const send = useCallback(async (text?: string) => {
    const msg = text || input.trim()
    if (!msg || typing) return
    setInput('')
    const userMsgId = Date.now().toString()
    const botMsgId = (Date.now()+1).toString()
    setMsgs(p => [...p, { id: userMsgId, role: 'user', content: msg, created_at: new Date().toISOString() }, { id: botMsgId, role: 'assistant', content: '', created_at: new Date().toISOString(), toolSteps: [] as ToolStep[] }])
    setTyping(true)
    let fullText = ''
    const toolSteps: ToolStep[] = []
    try {
      const res = await fetch('/api/agent/chat/stream', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: msg, conversationId: convId }) })
      if (!res.ok) throw new Error('Stream failed')
      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let evtType = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        for (const line of lines) {
          if (line.startsWith('event: ')) { evtType = line.slice(7).trim(); continue }
          if (line.startsWith('data: ')) {
            const payload = line.slice(6)
            if (evtType === 'token') {
              try { const d = JSON.parse(payload); fullText += d.text; setMsgs(p => p.map(m => m.id === botMsgId ? { ...m, content: fullText } : m)) } catch {}
            } else if (evtType === 'tool_start') {
              try { const d = JSON.parse(payload); toolSteps.push({ tool: d.tool, label: d.label, input: '', output: '', duration: 0 }); setMsgs(p => p.map(m => m.id === botMsgId ? { ...m, toolSteps: [...toolSteps] } : m)) } catch {}
            } else if (evtType === 'tool_result') {
              try { const d = JSON.parse(payload); const last = toolSteps[toolSteps.length - 1]; if (last) { last.output = d.output; last.duration = d.duration } setMsgs(p => p.map(m => m.id === botMsgId ? { ...m, toolSteps: [...toolSteps] } : m)) } catch {}
            } else if (evtType === 'done') {
              try {
                const d = JSON.parse(payload)
                if (d.isNew) setConvId(d.conversationId)
                if (d.toolSteps?.length) { toolSteps.length = 0; d.toolSteps.forEach((s: ToolStep) => toolSteps.push(s)); setMsgs(p => p.map(m => m.id === botMsgId ? { ...m, toolSteps: [...toolSteps] } : m)) }
                if (d.shouldSpeak && voice && ttsOk) speak(fullText)
              } catch {}
            } else if (evtType === 'error') {
              try { const d = JSON.parse(payload); fullText = 'Error: ' + d.message; setMsgs(p => p.map(m => m.id === botMsgId ? { ...m, content: fullText } : m)) } catch {}
            }
            evtType = ''
          }
        }
      }
    } catch {
      setMsgs(p => p.map(m => m.id === botMsgId ? { ...m, content: fullText || 'Connection error. Check your network.' } : m))
    }
    setTyping(false); loadStatus()
    if (expSec === 'memory') api('/api/agent/memory').then(r => setMemories(r.memories || [])).catch(() => {})
  }, [convId, input, typing, voice, ttsOk, speak, loadStatus, expSec])

  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string
      setImagePreview(base64)
      setMsgs(p => [...p, { id: Date.now().toString(), role: 'user', content: `[Image: ${f.name}]`, created_at: new Date().toISOString() }])
      setTyping(true)
      try {
        const r = await api('/api/agent/chat', { method: 'POST', body: JSON.stringify({ message: `The user sent an image named "${f.name}". Note: I cannot see images. Let them know and ask what they'd like to do with it.`, conversationId: convId }) })
        if (r.isNew) setConvId(r.conversationId)
        setMsgs(p => [...p, { id: (Date.now()+1).toString(), role: 'assistant', content: r.response, created_at: new Date().toISOString(), toolSteps: r.toolSteps || [] }])
        if (voice && ttsOk) speak(r.response)
      } catch {}
      setTyping(false); setImagePreview(null)
    }
    reader.readAsDataURL(f)
    e.target.value = ''
  }

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

  useEffect(() => {
    if (!status?.proactiveMode || !status?.hasApiKey) return
    const iv = setInterval(async () => {
      try {
        const r = await api('/api/agent/proactive')
        if (r.message) {
          setMsgs(p => [...p, { id: 'p-' + Date.now(), role: 'assistant', content: r.message, created_at: new Date().toISOString() }])
          if (voice && ttsOk) speak(r.message)
        }
      } catch {}
    }, 300000)
    return () => clearInterval(iv)
  }, [status?.proactiveMode, status?.hasApiKey, voice, ttsOk, speak])

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
  const faceState = !online ? 'offline' : orb
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const now = new Date()
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })

  return (
    <div className='min-h-screen flex flex-col overflow-hidden relative' style={{ background: '#020617', color: '#fff' }}>
      <style>{`
        @keyframes pulse-orb{0%,100%{transform:scale(1);opacity:.6}50%{transform:scale(1.05);opacity:1}}
        @keyframes spin-slow{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes spin-rev{from{transform:rotate(360deg)}to{transform:rotate(0deg)}}
        @keyframes fade-up{from{transform:translateY(12px);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes wf{0%,100%{height:4px}50%{height:var(--wh,16px)}}
        @keyframes scan{from{top:-40%}to{top:140%}}
        @keyframes pulse-listen{0%,100%{transform:scale(1);opacity:.5}50%{transform:scale(1.15);opacity:.9}}
        @keyframes ring-exp{0%,100%{transform:scale(1);opacity:.3}50%{transform:scale(1.2);opacity:.6}}
        @keyframes glow{0%,100%{box-shadow:0 0 20px rgba(0,229,255,0.15)}50%{box-shadow:0 0 40px rgba(0,229,255,0.3)}}
        @keyframes speak-pulse{0%,100%{box-shadow:0 0 20px rgba(0,229,255,0.2),0 0 60px rgba(0,229,255,0.1)}50%{box-shadow:0 0 30px rgba(0,229,255,0.4),0 0 80px rgba(0,229,255,0.2)}}
        @keyframes wave{0%{transform:scaleY(1)}50%{transform:scaleY(var(--s,1.5))}100%{transform:scaleY(1)}}
        @keyframes grid-scan{0%{opacity:.03}50%{opacity:.06}100%{opacity:.03}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
        @keyframes typing-dot{0%,60%,100%{opacity:.3;transform:translateY(0)}30%{opacity:1;transform:translateY(-4px)}}
        @keyframes face-breath{0%,100%{transform:scale(1)}50%{transform:scale(1.018)}}
        @keyframes face-tilt{0%,100%{transform:rotate(0deg)}50%{transform:rotate(1.5deg)}}
        @keyframes face-lean{0%,100%{transform:scale(1)}50%{transform:scale(1.035)}}
        @keyframes eye-drift{0%,100%{transform:translate(0,0)}20%{transform:translate(3px,-1px)}45%{transform:translate(-2px,1px)}70%{transform:translate(4px,2px)}90%{transform:translate(-1px,-2px)}}
        @keyframes eye-focus-pulse{0%,100%{opacity:.5;transform:scale(1)}50%{opacity:1;transform:scale(1.2)}}
        @keyframes mouth-wave{0%,100%{transform:scaleY(.25);opacity:.35}50%{transform:scaleY(var(--mh,1.2));opacity:.85}}
        @keyframes scan-sweep{from{stroke-dashoffset:500}to{stroke-dashoffset:0}}
        @keyframes hud-pulse{0%,100%{opacity:.12}50%{opacity:.55}}
        @keyframes iris-widen{0%,100%{transform:scale(1)}50%{transform:scale(1.4)}}
        @keyframes speak-aura{0%,100%{filter:drop-shadow(0 0 10px rgba(0,229,255,0.15))}50%{filter:drop-shadow(0 0 25px rgba(0,229,255,0.4))}}
        @keyframes jf-cw{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes jf-ccw{from{transform:rotate(360deg)}to{transform:rotate(0deg)}}
        @keyframes listen-ring-p{0%,100%{transform:scale(1);opacity:.1}50%{transform:scale(1.1);opacity:.35}}
        @keyframes particle-float{0%{opacity:0;transform:translateY(0)}15%{opacity:.5}85%{opacity:.5}100%{opacity:0;transform:translateY(-25px)}}
        .fi{animation:fade-up .4s ease-out forwards;opacity:0}
        .sb::-webkit-scrollbar{width:2px}.sb::-webkit-scrollbar-track{background:transparent}.sb::-webkit-scrollbar-thumb{background:rgba(0,229,255,0.15);border-radius:9px}
        .glass{background:rgba(2,6,23,0.7);backdrop-filter:blur(20px) saturate(1.5);-webkit-backdrop-filter:blur(20px) saturate(1.5)}
        .glow-border{border:1px solid rgba(0,229,255,0.08);box-shadow:0 0 15px rgba(0,229,255,0.03),inset 0 0 15px rgba(0,229,255,0.01)}
        .glow-text{text-shadow:0 0 20px rgba(0,229,255,0.3)}
      `}</style>

      <div className='absolute inset-0 pointer-events-none' style={{ zIndex: 0 }}>
        <div className='absolute inset-0' style={{ backgroundImage: 'radial-gradient(rgba(0,229,255,0.03) 1px, transparent 1px)', backgroundSize: '32px 32px', animation: 'grid-scan 8s ease-in-out infinite' }} />
        <div className='absolute top-0 left-1/2 -translate-x-1/2' style={{ width: 600, height: 400, background: 'radial-gradient(ellipse, rgba(0,229,255,0.04) 0%, transparent 70%)', filter: 'blur(40px)' }} />
      </div>

      <div className='flex-shrink-0 flex items-center justify-between px-5 pt-4 pb-2' style={{ zIndex: 20 }}>
        <div className='flex items-center gap-3'>
          <div className='flex items-center gap-2 px-3 py-1.5 rounded-full glass glow-border'>
            <div className='w-2 h-2 rounded-full' style={{ background: online ? '#00e5ff' : '#ef4444', boxShadow: online ? '0 0 10px rgba(0,229,255,0.6)' : '0 0 10px rgba(239,68,68,0.4)', animation: online ? 'pulse-orb 2s ease-in-out infinite' : 'none' }} />
            <span className='text-[11px] font-bold tracking-[0.2em] uppercase' style={{ color: online ? '#00e5ff' : 'rgba(255,255,255,0.35)' }}>{status?.agentName || 'NEXUS'}</span>
          </div>
          <div className='hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-full' style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
            {online ? <Wifi size={10} style={{ color: 'rgba(0,229,255,0.5)' }} /> : <WifiOff size={10} style={{ color: 'rgba(239,68,68,0.4)' }} />}
            <span className='text-[10px] font-mono' style={{ color: 'rgba(255,255,255,0.25)' }}>{timeStr}</span>
          </div>
        </div>
        <div className='flex items-center gap-2'>
          <div className='hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full' style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.1)' }}>
            <DollarSign size={10} style={{ color: 'rgba(16,185,129,0.6)' }} />
            <span className='text-[10px] font-mono font-medium' style={{ color: 'rgba(16,185,129,0.7)' }}>${(status?.todayEarned || 0).toFixed(2)}</span>
          </div>
          <button onClick={newConvo} className='w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110' style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}><Plus size={14} style={{ color: 'rgba(255,255,255,0.35)' }} /></button>
          <button onClick={() => { setVoice(!voice); if (speaking) window.speechSynthesis?.cancel() }} className='w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110' style={{ background: voice ? 'rgba(0,229,255,0.08)' : 'rgba(255,255,255,0.03)', border: `1px solid ${voice ? 'rgba(0,229,255,0.2)' : 'rgba(255,255,255,0.06)'}` }}>{voice ? <Volume2 size={14} style={{ color: '#00e5ff' }} /> : <VolumeX size={14} style={{ color: 'rgba(255,255,255,0.2)' }} />}</button>
        </div>
      </div>

      <div className='flex-1 overflow-y-auto sb px-4 py-2' style={{ zIndex: 10 }}>
        {msgs.length === 0 ? (
          <div className='flex flex-col items-center justify-center' style={{ height: 'calc(100vh - 200px)' }}>
            <JarvisFace state={faceState} size={faceSize} />
            <div className='text-center'>
              <p className='text-lg font-light tracking-wide mb-2 glow-text' style={{ color: 'rgba(0,229,255,0.6)' }}>{online ? greeting : 'OFFLINE'}</p>
              <p className='text-[13px] mb-1' style={{ color: 'rgba(255,255,255,0.3)' }}>{online ? (orb === 'idle' ? 'Tap the mic or type a message' : '') : 'Set your API key to activate NEXUS'}</p>
              {online && orb === 'idle' && <div className='flex flex-wrap justify-center gap-2 mt-4 max-w-xs'>
                {['Search web', 'Write code', 'Build websites', 'Run calculations'].map(cap => (
                  <span key={cap} className='px-2.5 py-1 rounded-full text-[10px] font-mono tracking-wide' style={{ background: 'rgba(0,229,255,0.04)', border: '1px solid rgba(0,229,255,0.08)', color: 'rgba(0,229,255,0.4)' }}>{cap}</span>
                ))}
              </div>}
              {!online && <button onClick={() => setPanel(true)} className='mt-3 px-4 py-2 rounded-full text-[11px] font-medium tracking-wider transition-all duration-200 hover:scale-105' style={{ background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.2)', color: '#00e5ff' }}>OPEN SETTINGS</button>}
              {online && <p className='text-[10px] mt-4 font-mono' style={{ color: 'rgba(255,255,255,0.12)' }}>{dateStr} · {status?.memoryCount || 0} memories loaded</p>}
            </div>
          </div>
        ) : (
          <div className='flex flex-col gap-4 pb-4 max-w-2xl mx-auto w-full'>
            {msgs.map(m => {
              const toolIcon = (t: string) => t === 'web_search' ? <Search size={12} /> : t === 'web_fetch' ? <ExternalLink size={12} /> : t === 'code_execute' ? <Code size={12} /> : <FileDown size={12} />
              const renderContent = (text: string) => {
                const parts: React.ReactNode[] = []
                const codeBlockRe = /```(\w*)\n?([\s\S]*?)```/g
                let lastIndex = 0
                let match
                let codeIdx = 0
                while ((match = codeBlockRe.exec(text)) !== null) {
                  if (match.index > lastIndex) parts.push(<span key={`t${codeIdx}`}>{text.substring(lastIndex, match.index)}</span>)
                  const lang = match[1] || 'code'
                  const code = match[2]
                  const cid = `${m.id}-code-${codeIdx}`
                  const isHtml = lang === 'html' || lang === 'htm'
                  const isDownloadable = ['html', 'css', 'javascript', 'js', 'typescript', 'ts', 'python', 'py', 'json', 'xml', 'sql', 'sh', 'bash', 'yaml', 'yml', 'md', 'jsx', 'tsx', 'java', 'cpp', 'c', 'go', 'rs', 'rb', 'php'].includes(lang)
                  const filename = `nexus-${lang === 'javascript' ? 'js' : lang === 'typescript' ? 'ts' : lang}.${lang === 'htm' ? 'html' : lang || 'txt'}`
                  parts.push(
                    <div key={cid} className='my-2 rounded-xl overflow-hidden' style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div className='flex items-center justify-between px-3 py-1.5' style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <span className='text-[10px] font-mono tracking-wider uppercase' style={{ color: 'rgba(255,255,255,0.3)' }}>{lang}</span>
                        <div className='flex items-center gap-2'>
                          {isHtml && <button onClick={() => { const w = window.open('', '_blank'); if(w){w.document.write(code);w.document.close()} }} className='flex items-center gap-1 px-2 py-0.5 rounded text-[10px] transition-colors hover:text-white' style={{ color: 'rgba(0,229,255,0.6)' }}><ExternalLink size={10} />Preview</button>}
                          {isDownloadable && <button onClick={() => downloadFile(code, filename)} className='flex items-center gap-1 px-2 py-0.5 rounded text-[10px] transition-colors hover:text-white' style={{ color: 'rgba(16,185,129,0.6)' }}><FileDown size={10} />Save</button>}
                          <button onClick={() => copyCode(cid, code)} className='flex items-center gap-1 px-2 py-0.5 rounded text-[10px] transition-colors hover:text-white' style={{ color: copiedId === cid ? 'rgba(16,185,129,0.8)' : 'rgba(255,255,255,0.3)' }}>{copiedId === cid ? <Check size={10} /> : <Copy size={10} />}{copiedId === cid ? 'Copied' : 'Copy'}</button>
                        </div>
                      </div>
                      <pre className='p-3 overflow-x-auto sb text-[12px] leading-relaxed font-mono' style={{ color: 'rgba(255,255,255,0.7)', margin: 0, maxHeight: 400 }}>{code}</pre>
                    </div>
                  )
                  codeIdx++
                  lastIndex = match.index + match[0].length
                }
                if (lastIndex < text.length) parts.push(<span key={`tail`}>{text.substring(lastIndex)}</span>)
                return parts
              }
              return (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} fi`}>
                {m.role === 'assistant' && (
                  <div className='flex-shrink-0 mr-2.5 mt-0.5' style={{ filter: 'drop-shadow(0 0 6px rgba(0,229,255,0.2))' }}>
                    <JarvisFace state={speaking && !typing ? 'speaking' : 'idle'} size={28} />
                  </div>
                )}
                <div className='max-w-[85%] rounded-2xl px-4 py-3 text-[13.5px] leading-relaxed' style={{
                  background: m.role === 'user' ? 'linear-gradient(135deg, rgba(0,229,255,0.08) 0%, rgba(0,229,255,0.02) 100%)' : 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
                  border: m.role === 'user' ? '1px solid rgba(0,229,255,0.12)' : '1px solid rgba(255,255,255,0.05)',
                  color: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(16px)', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  boxShadow: m.role === 'user' ? '0 4px 20px rgba(0,229,255,0.05)' : '0 4px 20px rgba(0,0,0,0.2)'
                }}>
                  {m.role === 'assistant' && m.toolSteps && m.toolSteps.length > 0 && (
                    <div className='mb-3 space-y-1.5'>
                      {m.toolSteps.map((step, i) => {
                        const sid = `${m.id}-tool-${i}`
                        const exp = expandedTools[sid]
                        return (
                          <div key={sid} className='rounded-lg overflow-hidden' style={{ background: 'rgba(0,229,255,0.03)', border: '1px solid rgba(0,229,255,0.08)' }}>
                            <button onClick={() => setExpandedTools(p => ({ ...p, [sid]: !exp }))} className='w-full flex items-center gap-2 px-2.5 py-2 text-left'>
                              <span style={{ color: '#00e5ff' }}>{toolIcon(step.tool)}</span>
                              <span className='flex-1 text-[11px] font-mono truncate' style={{ color: 'rgba(0,229,255,0.7)' }}>{step.label}</span>
                              <span className='text-[9px] font-mono px-1.5 py-0.5 rounded' style={{ background: 'rgba(0,229,255,0.06)', color: 'rgba(0,229,255,0.4)' }}>{step.duration}ms</span>
                              <ChevronDown size={11} style={{ color: 'rgba(255,255,255,0.2)', transform: exp ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }} />
                            </button>
                            {exp && <div className='px-2.5 pb-2'>
                              <pre className='text-[10px] font-mono p-2 rounded overflow-x-auto sb' style={{ background: 'rgba(0,0,0,0.3)', color: 'rgba(255,255,255,0.5)', maxHeight: 150, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{step.output}</pre>
                            </div>}
                          </div>
                        )
                      })}
                    </div>
                  )}
                  {m.role === 'assistant' ? renderContent(m.content) : m.content}
                  <div className='mt-1.5 flex items-center gap-2' style={{ fontSize: 9, color: 'rgba(255,255,255,0.15)' }}>
                    <span>{ft(m.created_at)}</span>
                    {m.role === 'assistant' && voice && ttsOk && <button onClick={() => speak(m.content)} style={{ color: 'rgba(0,229,255,0.3)' }}><Volume2 size={10} /></button>}
                  </div>
                </div>
              </div>
              )
            })}
            {typing && (
              <div className='flex justify-start fi'>
                <div className='flex-shrink-0 mr-2.5 mt-0.5' style={{ filter: 'drop-shadow(0 0 6px rgba(0,229,255,0.2))' }}>
                  <JarvisFace state='thinking' size={28} />
                </div>
                <div className='rounded-2xl px-5 py-4 flex items-center gap-2' style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  {[0,1,2].map(i => <div key={i} className='w-2 h-2 rounded-full' style={{ background: 'rgba(0,229,255,0.5)', animation: `typing-dot 1.4s ease-in-out infinite ${i*0.2}s` }} />)}
                </div>
              </div>
            )}
            {speaking && !typing && (
              <div className='flex justify-center fi'>
                <div className='flex items-center gap-1.5 px-4 py-2 rounded-full' style={{ background: 'rgba(0,229,255,0.04)', border: '1px solid rgba(0,229,255,0.08)' }}>
                  <Radio size={10} style={{ color: 'rgba(0,229,255,0.5)' }} />
                  {[1,2,3,4,5,6,7,8].map(i => <div key={i} className='w-[2px] rounded-full' style={{ height: 6, background: 'rgba(0,229,255,0.35)', animation: `wave 0.8s ease-in-out infinite ${i*0.08}s`, '--s': `${0.8 + Math.random()}` }} />)}
                  <span className='text-[10px] ml-1' style={{ color: 'rgba(0,229,255,0.4)' }}>SPEAKING</span>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>
        )}
      </div>

      <div className='flex-shrink-0 px-4 pb-3 pt-2' style={{ zIndex: 20 }}>
        {imagePreview && <div className='mb-2 flex items-center gap-2 px-2'><img src={imagePreview} className='w-12 h-12 rounded-lg object-cover' style={{ border: '1px solid rgba(0,229,255,0.2)' }} /><button onClick={() => setImagePreview(null)}><X size={14} style={{ color: 'rgba(255,255,255,0.3)' }} /></button></div>}
        <div className='flex items-center gap-2.5 max-w-2xl mx-auto w-full'>
          <button onClick={toggleListen} className='relative flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105' style={{ background: listening ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.03)', border: listening ? '1.5px solid rgba(239,68,68,0.4)' : '1px solid rgba(255,255,255,0.06)' }}>
            {listening && <div className='absolute inset-0 rounded-full' style={{ border: '2px solid rgba(239,68,68,0.15)', animation: 'ring-exp 0.8s ease-in-out infinite' }} />}
            {listening ? <Mic size={19} style={{ color: '#ef4444' }} /> : speechOk ? <Mic size={19} style={{ color: 'rgba(255,255,255,0.4)' }} /> : <MicOff size={19} style={{ color: 'rgba(255,255,255,0.15)' }} />}
          </button>
          <div className='flex-1 relative'>
            <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }} placeholder={listening ? 'Listening...' : online ? `Message ${status?.agentName || 'NEXUS'}...` : 'Type here...'} className='w-full bg-transparent text-sm py-3 px-1 outline-none' style={{ color: 'rgba(255,255,255,0.85)', borderBottom: '1px solid rgba(255,255,255,0.06)' }} disabled={typing} />
          </div>
          <button onClick={() => fileRef.current?.click()} className='flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105' style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}><ImagePlus size={15} style={{ color: 'rgba(255,255,255,0.3)' }} /></button>
          <input ref={fileRef} type='file' accept='image/*' className='hidden' onChange={handleImage} />
          {input.trim() && <button onClick={() => send()} className='flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110' style={{ background: 'linear-gradient(135deg, rgba(0,229,255,0.15) 0%, rgba(0,229,255,0.05) 100%)', border: '1px solid rgba(0,229,255,0.25)', boxShadow: '0 0 15px rgba(0,229,255,0.1)' }}><Send size={15} style={{ color: '#00e5ff' }} /></button>}
          <button onClick={() => setPanel(!panel)} className='flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105' style={{ background: panel ? 'rgba(0,229,255,0.08)' : 'rgba(255,255,255,0.03)', border: panel ? '1px solid rgba(0,229,255,0.15)' : '1px solid rgba(255,255,255,0.05)' }}><ChevronUp size={15} className='transition-transform duration-300' style={{ color: panel ? '#00e5ff' : 'rgba(255,255,255,0.25)', transform: panel ? 'rotate(180deg)' : 'rotate(0)' }} /></button>
        </div>
        {(listening || typing) && <div className='flex items-center justify-center gap-[4px] mt-2.5 h-5'>
          {[1,2,3,4,5,6,7].map(i => <div key={i} style={{ width: 2.5, height: 4, borderRadius: 2, background: listening ? 'rgba(239,68,68,0.4)' : 'rgba(0,229,255,0.25)', animation: `wf 1s ease-in-out infinite ${i*0.1}s`, '--wh': `${10 + i*3}px` }} />)}
          <span className='ml-2 text-[10px] font-mono' style={{ color: listening ? 'rgba(239,68,68,0.3)' : 'rgba(0,229,255,0.2)' }}>{listening ? 'RECEIVING AUDIO' : 'PROCESSING'}</span>
        </div>}
      </div>

      <div className='flex-shrink-0 transition-transform duration-500 ease-out' style={{ transform: panel ? 'translateY(0)' : 'translateY(100%)', zIndex: 30, maxHeight: '60vh' }}>
        <div className='rounded-t-3xl overflow-hidden' style={{ background: 'rgba(2,6,23,0.98)', backdropFilter: 'blur(30px)', border: '1px solid rgba(255,255,255,0.05)', borderBottom: 'none' }}>
          <div className='flex justify-center pt-2.5 pb-1'><div className='w-10 h-1 rounded-full' style={{ background: 'rgba(255,255,255,0.1)' }} /></div>
          <div className='overflow-y-auto sb px-4 pb-8' style={{ maxHeight: 'calc(60vh - 20px)' }}>

            <Section title='Tasks' icon={<ListTodo size={14} />} count={tasks.length} expanded={expSec === 'tasks'} onToggle={() => setExpSec(expSec === 'tasks' ? null : 'tasks')}>
              <div className='flex gap-1.5 mb-2'><input value={newTask.title} onChange={e => setNewTask(p => ({ ...p, title: e.target.value }))} onKeyDown={e => e.key === 'Enter' && createTask()} placeholder='New task...' className='flex-1 bg-transparent text-xs py-2 px-3 rounded-lg outline-none' style={{ border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)' }} /><button onClick={createTask} className='px-2.5 py-2 rounded-lg' style={{ background: 'rgba(0,229,255,0.08)', color: '#00e5ff', border: '1px solid rgba(0,229,255,0.15)' }}><Plus size={13} /></button></div>
              {tasks.length === 0 && <p className='text-[11px] text-center py-2' style={{ color: 'rgba(255,255,255,0.15)' }}>No tasks yet</p>}
              {tasks.map(t => (<div key={t.id} className='flex items-center gap-2 px-3 py-2 rounded-lg mb-1' style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.03)' }}><button onClick={() => updateTask(t.id, { status: t.status === 'completed' ? 'pending' : 'completed' })}>{t.status === 'completed' ? <CheckCircle size={13} style={{ color: '#10b981' }} /> : t.status === 'running' ? <Play size={13} style={{ color: '#f97316' }} /> : <Clock size={13} style={{ color: 'rgba(255,255,255,0.2)' }} />}</button><span className={`flex-1 text-xs truncate ${t.status === 'completed' ? 'line-through' : ''}`} style={{ color: t.status === 'completed' ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.6)' }}>{t.title}</span><button onClick={() => deleteTask(t.id)}><Trash2 size={11} style={{ color: 'rgba(255,255,255,0.1)' }} /></button></div>))}
            </Section>

            <Section title='Platforms' icon={<Server size={14} />} count={platforms.length} expanded={expSec === 'platforms'} onToggle={() => setExpSec(expSec === 'platforms' ? null : 'platforms')}>
              <div className='flex gap-1.5 mb-2'><input value={newPlat.platform} onChange={e => setNewPlat(p => ({ ...p, platform: e.target.value }))} placeholder='Platform' className='flex-1 bg-transparent text-xs py-2 px-3 rounded-lg outline-none' style={{ border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)' }} /><input value={newPlat.email} onChange={e => setNewPlat(p => ({ ...p, email: e.target.value }))} placeholder='Email' className='flex-1 bg-transparent text-xs py-2 px-3 rounded-lg outline-none' style={{ border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)' }} /><button onClick={createPlat} className='px-2.5 py-2 rounded-lg' style={{ background: 'rgba(0,229,255,0.08)', color: '#00e5ff', border: '1px solid rgba(0,229,255,0.15)' }}><Plus size={13} /></button></div>
              {platforms.length === 0 && <p className='text-[11px] text-center py-2' style={{ color: 'rgba(255,255,255,0.15)' }}>No platforms</p>}
              {platforms.map(p => (<div key={p.id} className='flex items-center gap-2 px-3 py-2 rounded-lg mb-1' style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.03)' }}><Shield size={12} style={{ color: '#00e5ff' }} /><div className='flex-1 min-w-0'><div className='text-xs truncate' style={{ color: 'rgba(255,255,255,0.6)' }}>{p.platform}</div><div className='text-[10px] truncate' style={{ color: 'rgba(255,255,255,0.25)' }}>{p.email} · ${p.total_earned?.toFixed(2) || 0}</div></div><button onClick={() => deletePlat(p.id)}><Trash2 size={11} style={{ color: 'rgba(255,255,255,0.1)' }} /></button></div>))}
            </Section>

            <Section title='Memory' icon={<Brain size={14} />} count={memories.length} expanded={expSec === 'memory'} onToggle={() => setExpSec(expSec === 'memory' ? null : 'memory')}>
              <div className='flex gap-1.5 mb-2'><Textarea value={newMem.content} onChange={e => setNewMem(p => ({ ...p, content: e.target.value }))} placeholder='Remember this...' className='flex-1 bg-transparent text-xs py-2 px-3 rounded-lg outline-none resize-none' rows={2} style={{ border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)' }} /><button onClick={createMem} className='self-end px-2.5 py-2 rounded-lg' style={{ background: 'rgba(0,229,255,0.08)', color: '#00e5ff', border: '1px solid rgba(0,229,255,0.15)' }}><Plus size={13} /></button></div>
              {memories.length === 0 && <p className='text-[11px] text-center py-2' style={{ color: 'rgba(255,255,255,0.15)' }}>No memories yet. I learn as we talk.</p>}
              {memories.slice(0, 10).map(m => (<div key={m.id} className='flex items-start gap-2 px-3 py-2 rounded-lg mb-1' style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.03)' }}><span className='text-[9px] px-1.5 py-0.5 rounded shrink-0 mt-0.5' style={{ background: 'rgba(0,229,255,0.08)', color: '#00e5ff' }}>{m.category}</span><span className='flex-1 text-xs leading-relaxed' style={{ color: 'rgba(255,255,255,0.5)' }}>{m.content}</span><button onClick={() => deleteMem(m.id)} className='shrink-0 mt-0.5'><Trash2 size={10} style={{ color: 'rgba(255,255,255,0.1)' }} /></button></div>))}
            </Section>

            <Section title='Earnings' icon={<DollarSign size={14} />} count={status?.recentEarnings?.length || 0} expanded={expSec === 'earnings'} onToggle={() => setExpSec(expSec === 'earnings' ? null : 'earnings')}>
              <div className='grid grid-cols-3 gap-2 mb-3 text-center'><div className='p-3 rounded-xl' style={{ background: 'rgba(0,229,255,0.03)', border: '1px solid rgba(0,229,255,0.06)' }}><div className='text-xl font-bold font-mono' style={{ color: '#00e5ff' }}>${(status?.totalEarned || 0).toFixed(2)}</div><div className='text-[9px] mt-1 tracking-widest' style={{ color: 'rgba(255,255,255,0.2)' }}>TOTAL</div></div><div className='p-3 rounded-xl' style={{ background: 'rgba(16,185,129,0.03)', border: '1px solid rgba(16,185,129,0.06)' }}><div className='text-xl font-bold font-mono' style={{ color: '#10b981' }}>${(status?.todayEarned || 0).toFixed(2)}</div><div className='text-[9px] mt-1 tracking-widest' style={{ color: 'rgba(255,255,255,0.2)' }}>TODAY</div></div><div className='p-3 rounded-xl' style={{ background: 'rgba(249,115,22,0.03)', border: '1px solid rgba(249,115,22,0.06)' }}><div className='text-xl font-bold font-mono' style={{ color: '#f97316' }}>${(status?.weekEarned || 0).toFixed(2)}</div><div className='text-[9px] mt-1 tracking-widest' style={{ color: 'rgba(255,255,255,0.2)' }}>WEEK</div></div></div>
              <div className='flex gap-1.5 mb-3'><input value={newEarn.amount} onChange={e => setNewEarn(p => ({ ...p, amount: e.target.value }))} placeholder='$0' type='number' step='0.01' className='w-20 bg-transparent text-xs py-2 px-3 rounded-lg outline-none' style={{ border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)' }} /><input value={newEarn.platform} onChange={e => setNewEarn(p => ({ ...p, platform: e.target.value }))} placeholder='Platform' className='flex-1 bg-transparent text-xs py-2 px-3 rounded-lg outline-none' style={{ border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)' }} /><button onClick={logEarning} className='px-3 py-2 rounded-lg text-xs' style={{ background: 'rgba(16,185,129,0.08)', color: '#10b981', border: '1px solid rgba(16,185,129,0.15)' }}>Log</button></div>
              {(status?.recentEarnings || []).slice(0, 5).map((e: any, i: number) => (<div key={i} className='flex items-center justify-between px-3 py-2 rounded-lg mb-0.5' style={{ background: 'rgba(255,255,255,0.015)' }}><span className='text-xs' style={{ color: 'rgba(255,255,255,0.4)' }}>{e.platform || '?'}</span><span className='text-xs font-medium font-mono' style={{ color: '#10b981' }}>${(e.amount || 0).toFixed(2)}</span></div>))}
            </Section>

            <Section title='Settings' icon={<Settings size={14} />} expanded={expSec === 'settings'} onToggle={() => setExpSec(expSec === 'settings' ? null : 'settings')}>
              <div className='space-y-4'>
                <div><label className='text-[10px] block mb-1.5 tracking-wider' style={{ color: 'rgba(255,255,255,0.25)' }}>OPENROUTER API KEY</label><div className='flex gap-1.5'><input value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder='sk-or-v1-...' type='password' className='flex-1 bg-transparent text-xs py-2.5 px-3 rounded-lg outline-none' style={{ border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)' }} /><button onClick={saveKey} className='px-4 py-2.5 rounded-lg text-xs font-medium' style={{ background: 'rgba(0,229,255,0.08)', color: '#00e5ff', border: '1px solid rgba(0,229,255,0.15)' }}>Save</button></div></div>
                <div><label className='text-[10px] block mb-1.5 tracking-wider' style={{ color: 'rgba(255,255,255,0.25)' }}>AI MODEL</label><Select value={cfg.llm_model || ''} onValueChange={v => updateCfg('llm_model', v)}><SelectTrigger className='w-full bg-transparent text-xs py-2.5 rounded-lg outline-none' style={{ border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)' }}><SelectValue placeholder='Select model' /></SelectTrigger><SelectContent style={{ background: '#0c1225', border: '1px solid rgba(255,255,255,0.08)' }}>{['openrouter/free','google/gemma-4-31b-it:free','google/gemma-4-26b-a4b-it:free','nvidia/nemotron-3-ultra-550b-a55b:free','nvidia/nemotron-3-super-120b-a12b:free','meta-llama/llama-3.1-8b-instruct:free','deepseek/deepseek-chat:free'].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select></div>
                <div className='flex items-center justify-between'><Label className='text-xs' style={{ color: 'rgba(255,255,255,0.4)' }}>Voice Output</Label><Switch checked={voice} onCheckedChange={v => { setVoice(v); updateCfg('voice_enabled', String(v)) }} /></div>
                <div className='flex items-center justify-between'><Label className='text-xs' style={{ color: 'rgba(255,255,255,0.4)' }}>Proactive Mode</Label><Switch checked={cfg.proactive_mode === 'true'} onCheckedChange={v => updateCfg('proactive_mode', String(v))} /></div>
                <div><label className='text-[10px] block mb-1.5 tracking-wider' style={{ color: 'rgba(255,255,255,0.25)' }}>AGENT NAME</label><input value={cfg.agent_name || ''} onChange={e => updateCfg('agent_name', e.target.value)} className='w-full bg-transparent text-xs py-2.5 px-3 rounded-lg outline-none' style={{ border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)' }} /></div>
                <div className='flex items-center justify-between'><Label className='text-xs' style={{ color: cfg.agent_paused === 'true' ? 'rgba(239,68,68,0.6)' : 'rgba(255,255,255,0.4)' }}>{cfg.agent_paused === 'true' ? 'PAUSED' : 'Pause Agent'}</Label><Switch checked={cfg.agent_paused === 'true'} onCheckedChange={v => updateCfg('agent_paused', String(v))} /></div>
              </div>
            </Section>

          </div>
        </div>
      </div>
    </div>
  )
}