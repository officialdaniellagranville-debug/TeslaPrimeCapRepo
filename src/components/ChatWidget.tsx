'use client';

import { useState, useEffect, useRef, useCallback, Component, type ReactNode, type ErrorInfo } from 'react';

interface ChatMessage {
  id: string;
  senderType: 'user' | 'admin';
  message: string;
  createdAt: string;
  isRead: boolean;
}

// ── Inline Error Boundary ──
interface EBProps { children: ReactNode; }
interface EBState { hasError: boolean; }
class ChatErrorBoundary extends Component<EBProps, EBState> {
  constructor(props: EBProps) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(err: Error, info: ErrorInfo) {
    console.error('[ChatWidget] Render error:', err?.message, info.componentStack);
  }
  render() {
    if (this.state.hasError) return null; // Silent fail — don't break the page
    return this.props.children;
  }
}

/**
 * Built-in Tesla Support Chat Widget
 * Shows Tesla logo + "Tesla Support" branding
 * Works for ALL users (logged in or not)
 * Logged-out users see "Sign in to chat" prompt
 * Logged-in users can send/receive messages
 */
function ChatWidgetInner() {
  // Safely read token from localStorage (no zustand dependency for button render)
  const [token, setToken] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Read token from localStorage on mount (client-only)
  useEffect(() => {
    try {
      const t = localStorage.getItem('token');
      setToken(t);
    } catch {}
  }, []);

  // Listen for storage changes (login/logout in other tabs)
  useEffect(() => {
    const handler = () => {
      try {
        const t = localStorage.getItem('token');
        setToken(t);
      } catch {}
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, []);

  // Fetch messages
  const fetchMessages = useCallback(async (silent = false) => {
    if (!token) return;
    if (!silent) setLoading(true);
    try {
      const res = await fetch('/api/chat/messages?limit=100', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && data.data?.messages) {
        setMessages(data.data.messages);
        const unread = data.data.messages.filter(
          (m: ChatMessage) => m.senderType === 'admin' && !m.isRead
        ).length;
        setUnreadCount(unread);
      }
    } catch {
      // ignore
    }
    if (!silent) setLoading(false);
  }, [token]);

  // Initial load and polling
  useEffect(() => {
    if (!token) return;
    fetchMessages();

    const startPolling = () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      const interval = open ? 5000 : 15000;
      pollingRef.current = setInterval(() => fetchMessages(true), interval);
    };

    startPolling();
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [token, open, fetchMessages]);

  // Scroll to bottom when messages change or chat opens
  useEffect(() => {
    if (open) scrollToBottom();
  }, [messages, open, scrollToBottom]);

  // Focus input when opening
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [open]);

  const sendMessage = async () => {
    if (!input.trim() || !token || sending) return;
    const msg = input.trim();
    setInput('');
    setSending(true);

    const tempId = `temp-${Date.now()}`;
    setMessages(prev => [...prev, {
      id: tempId,
      senderType: 'user',
      message: msg,
      createdAt: new Date().toISOString(),
      isRead: true,
    } as ChatMessage]);
    scrollToBottom();

    try {
      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: msg }),
      });
      const data = await res.json();
      if (data.success) {
        setMessages(prev => prev.map(m => m.id === tempId ? data.data : m));
      } else {
        setMessages(prev => prev.filter(m => m.id !== tempId));
        setInput(msg);
      }
    } catch {
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setInput(msg);
    }
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <>
      {/* Chat FAB Button — ALWAYS visible */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-20 right-4 z-[9999] w-14 h-14 rounded-full bg-[#CC0000] hover:bg-[#ff1a1a] text-white shadow-lg shadow-[#CC0000]/30 flex items-center justify-center transition-all hover:scale-105 active:scale-95"
        aria-label="Chat with Tesla Support"
        style={{ position: 'fixed', bottom: '80px', right: '16px', zIndex: 9999 }}
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-white text-[#CC0000] rounded-full flex items-center justify-center text-[10px] font-bold px-1">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </>
        )}
      </button>

      {/* Chat Window */}
      {open && (
        <div 
          className="fixed right-4 w-[340px] max-w-[calc(100vw-2rem)] h-[440px] max-h-[calc(100vh-10rem)] bg-[#1a1a1a] border border-tesla-border rounded-2xl shadow-2xl shadow-black/50 flex flex-col overflow-hidden"
          style={{ position: 'fixed', bottom: '144px', right: '16px', zIndex: 9999 }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-tesla-border bg-[#111] shrink-0">
            <div className="w-9 h-9 rounded-full bg-[#CC0000]/15 border border-[#CC0000]/30 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 5.362l2.475-3.026s4.245.09 8.471 2.054c-1.082 1.636-3.231 2.438-3.231 2.438-.146-1.439-1.154-1.79-4.354-1.79L12 24 8.619 5.034c-3.18 0-4.188.354-4.335 1.792 0 0-2.146-.795-3.229-2.43C5.28 2.431 9.525 2.34 9.525 2.34L12 5.362h-.004.004zm0-3.899c3.415-.03 7.326.528 11.328 2.28.535-.968.672-1.395.672-1.395C19.625.612 15.528.015 12 0 8.472.015 4.375.61 0 2.349c0 0 .195.525.672 1.396C4.674 1.989 8.585 1.435 12 1.46V1.463z" fill="#CC0000"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-white font-semibold text-sm leading-tight">Tesla Support</h4>
              <p className="text-green-400 text-[11px] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                Online
              </p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="w-7 h-7 rounded-lg hover:bg-white/10 text-gray-500 hover:text-white flex items-center justify-center transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="w-6 h-6 border-2 border-[#CC0000]/30 border-t-[#CC0000] rounded-full animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#CC0000]/10 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-7 h-7" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 5.362l2.475-3.026s4.245.09 8.471 2.054c-1.082 1.636-3.231 2.438-3.231 2.438-.146-1.439-1.154-1.79-4.354-1.79L12 24 8.619 5.034c-3.18 0-4.188.354-4.335 1.792 0 0-2.146-.795-3.229-2.43C5.28 2.431 9.525 2.34 9.525 2.34L12 5.362h-.004.004zm0-3.899c3.415-.03 7.326.528 11.328 2.28.535-.968.672-1.395.672-1.395C19.625.612 15.528.015 12 0 8.472.015 4.375.61 0 2.349c0 0 .195.525.672 1.396C4.674 1.989 8.585 1.435 12 1.46V1.463z" fill="#CC0000"/>
                  </svg>
                </div>
                <p className="text-white font-medium text-sm">Tesla Support</p>
                <p className="text-gray-500 text-xs">Hi! How can we help you today?</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.senderType === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] ${msg.senderType === 'user' ? 'order-2' : 'order-1'}`}>
                    {msg.senderType === 'admin' && (
                      <div className="flex items-center gap-1.5 mb-1">
                        <div className="w-4 h-4 rounded-full bg-[#CC0000]/15 flex items-center justify-center">
                          <svg viewBox="0 0 24 24" className="w-2.5 h-2.5" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 5.362l2.475-3.026s4.245.09 8.471 2.054c-1.082 1.636-3.231 2.438-3.231 2.438-.146-1.439-1.154-1.79-4.354-1.79L12 24 8.619 5.034c-3.18 0-4.188.354-4.335 1.792 0 0-2.146-.795-3.229-2.43C5.28 2.431 9.525 2.34 9.525 2.34L12 5.362h-.004.004zm0-3.899c3.415-.03 7.326.528 11.328 2.28.535-.968.672-1.395.672-1.395C19.625.612 15.528.015 12 0 8.472.015 4.375.61 0 2.349c0 0 .195.525.672 1.396C4.674 1.989 8.585 1.435 12 1.46V1.463z" fill="#CC0000"/>
                          </svg>
                        </div>
                        <span className="text-[10px] text-gray-500 font-medium">Tesla Support</span>
                      </div>
                    )}
                    <div className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                      msg.senderType === 'user'
                        ? 'bg-[#CC0000] text-white rounded-br-sm'
                        : 'bg-white/10 text-gray-200 rounded-bl-sm'
                    }`}>
                      {msg.message}
                    </div>
                    <p className={`text-[9px] text-gray-600 mt-0.5 ${msg.senderType === 'user' ? 'text-right' : 'text-left'}`}>
                      {formatTime(msg.createdAt)}
                    </p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-tesla-border px-3 py-2.5 bg-[#111] shrink-0">
            {!token ? (
              <div className="text-center">
                <p className="text-gray-500 text-xs mb-2">Sign in to chat with support</p>
                <a
                  href="/login"
                  className="inline-flex items-center gap-1.5 bg-[#CC0000] hover:bg-[#ff1a1a] text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                  Sign In
                </a>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message..."
                  disabled={sending}
                  className="flex-1 bg-white/5 border border-tesla-border rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#CC0000]/50 transition-colors disabled:opacity-50"
                />
                <button
                  onClick={sendMessage}
                  disabled={sending || !input.trim()}
                  className="w-10 h-10 rounded-xl bg-[#CC0000] hover:bg-[#ff1a1a] disabled:opacity-30 disabled:hover:bg-[#CC0000] text-white flex items-center justify-center transition-all shrink-0"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// Export wrapped in error boundary so a render crash never breaks the page
export default function ChatWidget() {
  return (
    <ChatErrorBoundary>
      <ChatWidgetInner />
    </ChatErrorBoundary>
  );
}
