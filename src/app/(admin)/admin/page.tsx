'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

const TradingViewWidget = dynamic(() => import('@/components/TradingViewWidget'), { ssr: false });
const VehicleManagement = dynamic(() => import('@/components/VehicleManagement'), { ssr: false });

function TeslaTLogo({ className = 'w-7 h-7' }: { className?: string }) {
  return (
    <div className={`w-8 h-8 rounded-lg bg-[#CC0000]/10 border border-[#CC0000]/20 flex items-center justify-center ${className}`}>
      <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 5.362l2.475-3.026s4.245.09 8.471 2.054c-1.082 1.636-3.231 2.438-3.231 2.438-.146-1.439-1.154-1.79-4.354-1.79L12 24 8.619 5.034c-3.18 0-4.188.354-4.335 1.792 0 0-2.146-.795-3.229-2.43C5.28 2.431 9.525 2.34 9.525 2.34L12 5.362h-.004.004zm0-3.899c3.415-.03 7.326.528 11.328 2.28.535-.968.672-1.395.672-1.395C19.625.612 15.528.015 12 0 8.472.015 4.375.61 0 2.349c0 0 .195.525.672 1.396C4.674 1.989 8.585 1.435 12 1.46V1.463z" fill="#CC0000"/>
      </svg>
    </div>
  );
}

const navItems = [
  { label: 'Dashboard', key: 'dashboard', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg> },
  { label: 'Users', key: 'users', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg> },
  { label: 'Deposits', key: 'deposits', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 19 5 12" /></svg> },
  { label: 'Withdrawals', key: 'withdrawals', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" /></svg> },
  { label: 'KYC Review', key: 'kyc', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 4h18v16H3z" /><path d="M3 10h18" /></svg> },
  { label: 'Market', key: 'market', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg> },
  { label: 'Trade Control', key: 'trade-control', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg> },
  { label: 'Support Chat', key: 'support-chat', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg> },
  { label: 'Messages', key: 'messages', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg> },
  { label: 'Audit Log', key: 'audit', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg> },
  { label: 'Vehicles', key: 'vehicles', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" rx="2" /><path d="M16 8h2a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h0" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></svg> },
  { label: 'Settings', key: 'settings', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg> },
];

function apiCall(url: string, options?: RequestInit) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null;
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers as Record<string, string> || {}),
    },
  });
}

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    active: 'bg-green-900/30 text-green-400',
    suspended: 'bg-red-900/30 text-red-400',
    banned: 'bg-red-900/50 text-red-300',
    pending: 'bg-yellow-900/30 text-yellow-400',
    pending_verification: 'bg-yellow-900/30 text-yellow-400',
    confirmed: 'bg-green-900/30 text-green-400',
    approved: 'bg-green-900/30 text-green-400',
    rejected: 'bg-red-900/30 text-red-400',
    completed: 'bg-green-900/30 text-green-400',
    processing: 'bg-blue-900/30 text-blue-400',
    failed: 'bg-red-900/30 text-red-400',
    expired: 'bg-gray-700/50 text-gray-400',
    closed: 'bg-gray-700/50 text-gray-400',
  };
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${map[status] || 'bg-gray-700/50 text-gray-400'}`}>{status}</span>;
};

/* ── SLIDESHOW EDITOR ── */
const DEFAULT_SLIDESHOW = [
  { name: 'Model S', tagline: 'Redefine Speed', price: 'From $89,990', specs: '405 mi range', image: 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=1400&q=80&auto=format&fit=crop', accent: '#CC0000' },
  { name: 'Model 3', tagline: 'Built for Everyone', price: 'From $38,990', specs: '358 mi range', image: 'https://images.unsplash.com/photo-1536700503339-1e4b06520771?w=1400&q=80&auto=format&fit=crop', accent: '#3B82F6' },
  { name: 'Model X', tagline: 'Beyond SUV', price: 'From $94,990', specs: '348 mi range', image: 'https://images.unsplash.com/photo-1554744512-d6c603f27c54?w=1400&q=80&auto=format&fit=crop', accent: '#F59E0B' },
  { name: 'Model Y', tagline: 'Versatility Meets Performance', price: 'From $44,990', specs: '310 mi range', image: 'https://images.unsplash.com/photo-1617788138017-80ad40651399?w=1400&q=80&auto=format&fit=crop', accent: '#22C55E' },
  { name: 'Cybertruck', tagline: 'Built for Any Planet', price: 'From $79,990', specs: '340 mi range', image: 'https://images.unsplash.com/photo-1619767886558-efdc259cde1a?w=1400&q=80&auto=format&fit=crop', accent: '#8B8B8B' },
  { name: 'Model S Plaid', tagline: 'Ultimate Performance', price: 'From $109,990', specs: '396 mi range', image: 'https://images.unsplash.com/photo-1525609004556-c46c40d5f3f9?w=1400&q=80&auto=format&fit=crop', accent: '#A855F7' },
];
const ACCENT_OPTIONS = ['#CC0000','#3B82F6','#F59E0B','#22C55E','#8B8B8B','#A855F7','#EC4899','#F97316','#06B6D4'];

function SlideshowEditor({ token, showToast }: { token: string | null; showToast: (msg: string) => void }) {
  const [models, setModels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editIdx, setEditIdx] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/settings');
      const data = await res.json();
      if (data.success && data.data?.slideshowModels && Array.isArray(data.data.slideshowModels) && data.data.slideshowModels.length > 0) {
        setModels(data.data.slideshowModels);
      } else {
        setModels(DEFAULT_SLIDESHOW.map(m => ({ ...m })));
      }
    } catch {
      setModels(DEFAULT_SLIDESHOW.map(m => ({ ...m })));
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ slideshowModels: models }),
      });
      const data = await res.json();
      if (data.success) showToast('Slideshow saved!');
      else showToast(data.error?.message || 'Save failed');
    } catch { showToast('Save failed'); }
    setSaving(false);
  };

  const updateModel = (idx: number, field: string, value: string) => {
    setModels(prev => prev.map((m, i) => i === idx ? { ...m, [field]: value } : m));
  };

  const addModel = () => {
    setModels(prev => [...prev, { name: 'New Model', tagline: 'Your tagline here', price: 'From $0', specs: 'Specs here', image: '', accent: '#CC0000' }]);
    setEditIdx(models.length);
  };

  const removeModel = (idx: number) => {
    if (!confirm('Remove this model from the slideshow?')) return;
    setModels(prev => prev.filter((_, i) => i !== idx));
    if (editIdx === idx) setEditIdx(null);
    else if (editIdx !== null && editIdx > idx) setEditIdx(editIdx - 1);
  };

  const moveModel = (idx: number, dir: number) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= models.length) return;
    const arr = [...models];
    [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
    setModels(arr);
  };

  if (loading) return <div className="text-center text-gray-500 py-6 text-sm">Loading slideshow...</div>;

  return (
    <div className="bg-tesla-card border border-tesla-border rounded-xl p-6">
      <div className="flex items-center justify-between mb-1">
        <h4 className="text-white font-medium">Homepage Slideshow Models</h4>
        <div className="flex items-center gap-2">
          <button onClick={addModel} className="inline-flex items-center gap-1.5 bg-[#CC0000] hover:bg-[#ff1a1a] text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            Add Model
          </button>
          <button onClick={save} disabled={saving} className="bg-white/5 hover:bg-white/10 text-white text-xs font-medium px-4 py-1.5 rounded-lg border border-tesla-border transition-colors disabled:opacity-50">
            {saving ? 'Saving...' : 'Save All'}
          </button>
        </div>
      </div>
      <p className="text-gray-500 text-xs mb-5">Manage the Tesla models shown in the homepage slideshow. Edit names, photos, prices, and colors.</p>

      <div className="space-y-3">
        {models.map((model, idx) => (
          <div key={idx} className="border border-tesla-border rounded-xl overflow-hidden bg-[#111]">
            {/* Header row - always visible */}
            <div className="flex items-center gap-3 p-3 cursor-pointer hover:bg-white/5 transition-colors" onClick={() => setEditIdx(editIdx === idx ? null : idx)}>
              {model.image ? (
                <img src={model.image} alt={model.name} className="w-16 h-10 rounded-lg object-cover border border-tesla-border shrink-0" />
              ) : (
                <div className="w-16 h-10 rounded-lg bg-white/5 border border-tesla-border shrink-0 flex items-center justify-center text-gray-600 text-[10px]">No img</div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-white text-sm font-medium truncate">{model.name}</span>
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: model.accent }} />
                </div>
                <p className="text-gray-500 text-xs truncate">{model.tagline} &middot; {model.price}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={(e) => { e.stopPropagation(); moveModel(idx, -1); }} disabled={idx === 0} className="p-1 rounded hover:bg-white/10 text-gray-500 hover:text-white disabled:opacity-30 transition-colors">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="18 15 12 9 6 15" /></svg>
                </button>
                <button onClick={(e) => { e.stopPropagation(); moveModel(idx, 1); }} disabled={idx === models.length - 1} className="p-1 rounded hover:bg-white/10 text-gray-500 hover:text-white disabled:opacity-30 transition-colors">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
                </button>
                <button onClick={(e) => { e.stopPropagation(); removeModel(idx); }} className="p-1 rounded hover:bg-red-900/30 text-gray-500 hover:text-red-400 transition-colors">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                </button>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`text-gray-500 transition-transform ${editIdx === idx ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9" /></svg>
              </div>
            </div>

            {/* Expandable edit form */}
            {editIdx === idx && (
              <div className="border-t border-tesla-border p-4 space-y-4 bg-black/20">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-gray-400 text-xs font-medium mb-1.5 block">Model Name</label>
                    <input type="text" value={model.name} onChange={(e) => updateModel(idx, 'name', e.target.value)} className="w-full bg-[#1a1a1a] border border-tesla-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#CC0000] transition-colors" />
                  </div>
                  <div>
                    <label className="text-gray-400 text-xs font-medium mb-1.5 block">Tagline</label>
                    <input type="text" value={model.tagline} onChange={(e) => updateModel(idx, 'tagline', e.target.value)} className="w-full bg-[#1a1a1a] border border-tesla-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#CC0000] transition-colors" />
                  </div>
                  <div>
                    <label className="text-gray-400 text-xs font-medium mb-1.5 block">Price Text</label>
                    <input type="text" value={model.price} onChange={(e) => updateModel(idx, 'price', e.target.value)} className="w-full bg-[#1a1a1a] border border-tesla-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#CC0000] transition-colors" />
                  </div>
                  <div>
                    <label className="text-gray-400 text-xs font-medium mb-1.5 block">Specs Text</label>
                    <input type="text" value={model.specs} onChange={(e) => updateModel(idx, 'specs', e.target.value)} className="w-full bg-[#1a1a1a] border border-tesla-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#CC0000] transition-colors" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-gray-400 text-xs font-medium mb-1.5 block">Image URL</label>
                    <input type="text" value={model.image} onChange={(e) => updateModel(idx, 'image', e.target.value)} placeholder="https://..." className="w-full bg-[#1a1a1a] border border-tesla-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#CC0000] transition-colors" />
                    {model.image && (
                      <div className="mt-2 w-full h-32 rounded-lg overflow-hidden border border-tesla-border">
                        <img src={model.image} alt={model.name} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-gray-400 text-xs font-medium mb-1.5 block">Accent Color</label>
                    <div className="flex items-center gap-2 flex-wrap">
                      {ACCENT_OPTIONS.map(c => (
                        <button key={c} onClick={() => updateModel(idx, 'accent', c)} className={`w-7 h-7 rounded-lg border-2 transition-all ${model.accent === c ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'}`} style={{ backgroundColor: c }} />
                      ))}
                      <input type="text" value={model.accent} onChange={(e) => updateModel(idx, 'accent', e.target.value)} className="w-20 bg-[#1a1a1a] border border-tesla-border rounded-lg px-2 py-1 text-xs text-white font-mono focus:outline-none focus:border-[#CC0000] transition-colors" />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {models.length === 0 && (
        <div className="text-center text-gray-500 py-6 text-sm">No models in slideshow. Click "Add Model" to get started.</div>
      )}
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [deposits, setDeposits] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [kycList, setKycList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [depositFilter, setDepositFilter] = useState('');
  const [withdrawalFilter, setWithdrawalFilter] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [settingsPhotoUrl, setSettingsPhotoUrl] = useState<string | null>(null);
  const [elonPhotoUrl, setElonPhotoUrl] = useState<string | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [messageDialog, setMessageDialog] = useState<{type: 'kyc'|'deposit'|'withdrawal', id: string, action: 'approve'|'reject', defaultReason?: string} | null>(null);
  const [dialogMessage, setDialogMessage] = useState('');
  const [dialogAttachment, setDialogAttachment] = useState('');
  // Payment addresses state
  const [paymentAddresses, setPaymentAddresses] = useState<any[]>([]);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [editingAddress, setEditingAddress] = useState<any | null>(null);
  const [addrForm, setAddrForm] = useState({ label: '', currency: 'BTC', network: '', address: '', qrCodeUrl: '', isActive: true, sortOrder: 0 });
  // Messages state
  const [msgSubject, setMsgSubject] = useState('');
  const [msgBody, setMsgBody] = useState('');
  const [msgType, setMsgType] = useState('custom');
  const [msgSendEmail, setMsgSendEmail] = useState(true);
  const [msgBroadcast, setMsgBroadcast] = useState(true);
  const [msgSelectedUsers, setMsgSelectedUsers] = useState<string[]>([]);
  const [msgSending, setMsgSending] = useState(false);

  // Audit log state
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotal, setAuditTotal] = useState(0);

  // User detail modal state
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userDetail, setUserDetail] = useState<any>(null);
  const [userDetailLoading, setUserDetailLoading] = useState(false);
  // Fund editing state
  const [fundEditWalletType, setFundEditWalletType] = useState<string>('live');
  const [fundEditAmount, setFundEditAmount] = useState<string>('');
  const [fundEditMode, setFundEditMode] = useState<'adjust' | 'set'>('adjust');
  const [fundEditLoading, setFundEditLoading] = useState(false);
  // KYC Code state
  const [kycCodeValue, setKycCodeValue] = useState('');
  const [kycCodeMessage, setKycCodeMessage] = useState('');
  const [kycCodeNotify, setKycCodeNotify] = useState(true);
  const [kycCodeLoading, setKycCodeLoading] = useState(false);
  const [confirmPurchaseLoading, setConfirmPurchaseLoading] = useState(false);
  // Standalone KYC Code Generator state (on KYC Review tab)
  const [kycGenUserId, setKycGenUserId] = useState('');
  const [kycGenCode, setKycGenCode] = useState('');
  const [kycGenMessage, setKycGenMessage] = useState('');
  const [kycGenNotify, setKycGenNotify] = useState(true);
  const [kycGenLoading, setKycGenLoading] = useState(false);

  // ── Trade Control (chart spike) state ──
  // Admin picks a user, picks a direction + magnitude, and fires a "spike"
  // that visibly jumps that user's ActiveTradeChart on their next poll.
  const [spikeUserId, setSpikeUserId] = useState<string>('');
  const [spikeDirection, setSpikeDirection] = useState<'up' | 'down'>('up');
  const [spikeMagnitude, setSpikeMagnitude] = useState<number>(10);
  const [spikeMessage, setSpikeMessage] = useState<string>('');
  const [spikeLoading, setSpikeLoading] = useState(false);
  const [spikeHistory, setSpikeHistory] = useState<any[]>([]);
  const [spikeHistoryLoading, setSpikeHistoryLoading] = useState(false);

  // ── Support Chat state ──
  const [chatConversations, setChatConversations] = useState<any[]>([]);
  const [chatConversationsLoading, setChatConversationsLoading] = useState(false);
  const [chatSelectedUserId, setChatSelectedUserId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatMessagesLoading, setChatMessagesLoading] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatSending, setChatSending] = useState(false);
  const [chatSearchTerm, setChatSearchTerm] = useState('');

  // Auth check — verify admin access server-side, not just localStorage
  const [authChecking, setAuthChecking] = useState(true);
  useEffect(() => {
    const adminToken = localStorage.getItem('adminToken');
    const adminUser = localStorage.getItem('adminUser');
    if (!adminToken || !adminUser) {
      router.replace('/admin/login');
      return;
    }
    try {
      const parsed = JSON.parse(adminUser);
      if (!parsed.adminRecord) {
        router.replace('/admin/login');
        return;
      }
    } catch { router.replace('/admin/login'); return; }

    // Also verify the token is still valid server-side
    fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then((res) => res.json()).then((data) => {
      if (!data.success || !data.data?.adminRecord) {
        // Token invalid or user is not admin — clear and redirect
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        router.replace('/admin/login');
      } else {
        setAuthed(true);
      }
    }).catch(() => {
      setAuthed(true); // Allow on network error, API calls will fail naturally
    }).finally(() => setAuthChecking(false));
  }, [router]);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const fetchStats = useCallback(async () => {
    try {
      const res = await apiCall('/api/admin/stats');
      const data = await res.json();
      if (data.success) setStats(data.data);
    } catch (e) { console.error(e); }
  }, []);

  const fetchUsers = useCallback(async (search = '') => {
    try {
      const res = await apiCall(`/api/admin/users?limit=100${search ? `&search=${search}` : ''}`);
      const data = await res.json();
      if (data.success) setUsers(data.data.users);
    } catch (e) { console.error(e); }
  }, []);

  const fetchDeposits = useCallback(async (status = '') => {
    try {
      const res = await apiCall(`/api/admin/deposits?limit=100${status ? `&status=${status}` : ''}`);
      const data = await res.json();
      if (data.success) setDeposits(data.data.deposits);
    } catch (e) { console.error(e); }
  }, []);

  const fetchWithdrawals = useCallback(async (status = '') => {
    try {
      const res = await apiCall(`/api/admin/withdrawals?limit=100${status ? `&status=${status}` : ''}`);
      const data = await res.json();
      if (data.success) setWithdrawals(data.data.withdrawals);
    } catch (e) { console.error(e); }
  }, []);

  const fetchKyc = useCallback(async (status = '') => {
    try {
      const res = await apiCall(`/api/admin/kyc?limit=100${status ? `&status=${status}` : ''}`);
      const data = await res.json();
      if (data.success) setKycList(data.data.verifications);
    } catch (e) { console.error(e); }
  }, []);

  const fetchPaymentAddresses = useCallback(async () => {
    setAddressesLoading(true);
    try {
      const res = await apiCall('/api/admin/payment-addresses');
      const data = await res.json();
      if (data.success) setPaymentAddresses(data.data.addresses || []);
    } catch (e) { console.error(e); }
    setAddressesLoading(false);
  }, []);

  const fetchAuditLog = useCallback(async (page: number) => {
    setAuditLoading(true);
    try {
      const res = await apiCall(`/api/admin/audit-log?page=${page}&limit=20`);
      const data = await res.json();
      if (data.success) {
        setAuditLogs(data.data.logs || []);
        setAuditTotal(data.data.total || 0);
      }
    } catch (e) { console.error(e); }
    setAuditLoading(false);
  }, []);

  const fetchUserDetail = useCallback(async (userId: string) => {
    setUserDetailLoading(true);
    try {
      const res = await apiCall(`/api/admin/users/${userId}`);
      const data = await res.json();
      if (data.success) setUserDetail(data.data);
      else showToast(data.error?.message || 'Failed to fetch user');
    } catch { showToast('Network error'); }
    setUserDetailLoading(false);
  }, []);

  const openUserDetail = (userId: string) => {
    setSelectedUserId(userId);
    setFundEditAmount('');
    setFundEditMode('adjust');
    setFundEditWalletType('live');
    setUserDetail(null);
    fetchUserDetail(userId);
  };

  // ── Trade Control: spike a user's chart ──
  const fetchSpikeHistory = useCallback(async () => {
    setSpikeHistoryLoading(true);
    try {
      const res = await apiCall('/api/admin/chart-spike');
      const data = await res.json();
      if (data.success) setSpikeHistory(data.data.spikes || []);
    } catch (e) { console.error(e); }
    setSpikeHistoryLoading(false);
  }, []);

  const fireSpike = async () => {
    if (!spikeUserId) { showToast('Select a user first'); return; }
    if (spikeMagnitude <= 0 || spikeMagnitude > 100) { showToast('Magnitude must be between 0.1 and 100'); return; }
    setSpikeLoading(true);
    try {
      const res = await apiCall('/api/admin/chart-spike', {
        method: 'POST',
        body: JSON.stringify({
          userId: spikeUserId,
          direction: spikeDirection,
          magnitudePct: spikeMagnitude,
          message: spikeMessage.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        const target = users.find((u: any) => u.id === spikeUserId);
        showToast(`Spike fired: ${spikeDirection === 'up' ? '+' : '-'}${spikeMagnitude}% → ${target?.email || data.data?.targetEmail || 'user'}`);
        setSpikeMessage('');
        fetchSpikeHistory();
      } else {
        showToast(data.error?.message || 'Failed to fire spike');
      }
    } catch { showToast('Network error'); }
    setSpikeLoading(false);
  };

  const quickSpike = (userId: string, direction: 'up' | 'down', magnitudePct: number) => {
    setSpikeUserId(userId);
    setSpikeDirection(direction);
    setSpikeMagnitude(magnitudePct);
    // fire on next tick so state settles
    setTimeout(() => {
      (async () => {
        setSpikeLoading(true);
        try {
          const res = await apiCall('/api/admin/chart-spike', {
            method: 'POST',
            body: JSON.stringify({ userId, direction, magnitudePct }),
          });
          const data = await res.json();
          if (data.success) {
            const target = users.find((u: any) => u.id === userId);
            showToast(`Quick spike: ${direction === 'up' ? '+' : '-'}${magnitudePct}% → ${target?.email || 'user'}`);
            fetchSpikeHistory();
          } else {
            showToast(data.error?.message || 'Failed');
          }
        } catch { showToast('Network error'); }
        setSpikeLoading(false);
      })();
    }, 50);
  };

  const closeUserDetail = () => {
    setSelectedUserId(null);
    setUserDetail(null);
    setFundEditAmount('');
    setKycCodeValue('');
    setKycCodeMessage('');
    setKycCodeNotify(true);
  };

  // Quick-generate KYC code (NO email — client must purchase first)
  const quickSendKycCode = async (userId: string) => {
    const code = 'KYC-' + Math.random().toString(36).substring(2, 8).toUpperCase();
 setKycCodeLoading(true);
    try {
      const res = await apiCall(`/api/admin/users/${userId}/kyc-code`, {
        method: 'POST',
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`KYC code ${code} generated. Client notified to purchase.`);
      } else {
        showToast(data.error?.message || 'Failed to generate code');
      }
    } catch { showToast('Network error'); }
    setKycCodeLoading(false);
  };

  // Confirm purchase & send code email
  const confirmPurchase = async (userId: string) => {
    setConfirmPurchaseLoading(true);
    try {
      const res = await apiCall(`/api/admin/users/${userId}/kyc-code`, {
        method: 'POST',
        body: JSON.stringify({ action: 'confirm_purchase' }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Purchase confirmed! Code sent to client email.');
      } else {
        showToast(data.error?.message || 'Failed to confirm');
      }
    } catch { showToast('Network error'); }
    setConfirmPurchaseLoading(false);
  };

  // Standalone KYC Code Generator submit
  const submitKycGenCode = async () => {
    if (!kycGenUserId || !kycGenCode.trim()) { showToast('Select a user and enter a code'); return; }
    setKycGenLoading(true);
    try {
      const res = await apiCall(`/api/admin/users/${kycGenUserId}/kyc-code`, {
        method: 'POST',
        body: JSON.stringify({ code: kycGenCode.trim(), adminMessage: kycGenMessage.trim() || undefined }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`KYC code generated: ${kycGenCode.trim()}. Client notified to purchase.`);
        setKycGenCode('');
        setKycGenMessage('');
      } else {
        showToast(data.error?.message || 'Failed');
      }
    } catch { showToast('Network error'); }
    setKycGenLoading(false);
  };

  // Quick generate code from KYC review table row
  const quickSendCodeForRow = async (userId: string) => {
    const code = 'KYC-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    try {
      const res = await apiCall(`/api/admin/users/${userId}/kyc-code`, {
        method: 'POST',
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (data.success) showToast(`Code ${code} generated. Client notified to purchase.`);
      else showToast(data.error?.message || 'Failed');
    } catch { showToast('Network error'); }
  };

  const handleFundEdit = async () => {
    if (!selectedUserId || !fundEditAmount) return;
    const amount = parseFloat(fundEditAmount);
    if (isNaN(amount)) { showToast('Enter a valid number'); return; }
    if (fundEditMode === 'adjust' && amount === 0) { showToast('Amount cannot be zero'); return; }
    if (fundEditMode === 'set' && amount < 0) { showToast('Balance cannot be negative'); return; }
    setFundEditLoading(true);
    try {
      const body: any = { userId: selectedUserId, walletType: fundEditWalletType };
      if (fundEditMode === 'adjust') {
        body.action = 'adjust_balance';
        body.amount = amount;
      } else {
        body.action = 'set_balance';
        body.balance = amount;
      }
      const res = await apiCall('/api/admin/users', { method: 'PATCH', body: JSON.stringify(body) });
      const data = await res.json();
      if (data.success) {
        showToast(`Funds ${fundEditMode === 'adjust' ? 'adjusted' : 'set'} successfully`);
        fetchUserDetail(selectedUserId);
        fetchUsers(searchTerm);
        setFundEditAmount('');
      } else {
        showToast(data.error?.message || 'Failed to update funds');
      }
    } catch { showToast('Network error'); }
    setFundEditLoading(false);
  };

  useEffect(() => { fetchStats(); }, [fetchStats]);

  useEffect(() => {
    if (activeTab === 'dashboard') { fetchStats(); fetchUsers(); }
    if (activeTab === 'users') fetchUsers(searchTerm);
    if (activeTab === 'deposits') fetchDeposits(depositFilter);
    if (activeTab === 'withdrawals') fetchWithdrawals(withdrawalFilter);
    if (activeTab === 'kyc') fetchKyc();
    if (activeTab === 'messages') fetchUsers('');
    if (activeTab === 'support-chat') {
      setChatConversationsLoading(true);
      apiCall('/api/admin/chat').then(r => r.json()).then(d => {
        if (d.success) setChatConversations(d.data.conversations || []);
      }).catch(() => {}).finally(() => setChatConversationsLoading(false));
    }
    if (activeTab === 'audit') fetchAuditLog(1);
    if (activeTab === 'trade-control') {
      // Need user list for the dropdown, plus recent spike history
      fetchUsers('');
      fetchSpikeHistory();
    }
    if (activeTab === 'settings') {
      apiCall('/api/admin/settings').then(r => r.json()).then(d => {
        if (d.success) {
          if (d.data?.aboutPhotoUrl) setSettingsPhotoUrl(d.data.aboutPhotoUrl);
          if (d.data?.elonPhotoUrl) setElonPhotoUrl(d.data.elonPhotoUrl);
        }
      }).catch(() => {});
      fetchPaymentAddresses();
    }
  }, [activeTab, depositFilter, withdrawalFilter]);

  const updateUserStatus = async (userId: string, status: string) => {
    setActionLoading(userId);
    try {
      const res = await apiCall('/api/admin/users', {
        method: 'PATCH',
        body: JSON.stringify({ userId, action: 'status', value: status }),
      });
      const data = await res.json();
      if (data.success) { showToast(`User ${status} successfully`); fetchUsers(searchTerm); fetchStats(); }
      else showToast(data.error?.message || 'Action failed');
    } catch { showToast('Network error'); }
    setActionLoading(null);
  };

  const handleDepositAction = async (depositId: string, action: 'approve' | 'reject') => {
    setMessageDialog({ type: 'deposit', id: depositId, action });
    setDialogMessage('');
    setDialogAttachment('');
  };

  const executeDepositAction = async () => {
    if (!messageDialog) return;
    setActionLoading(messageDialog.id);
    setMessageDialog(null);
    try {
      const res = await apiCall('/api/admin/deposits', {
        method: 'PATCH',
        body: JSON.stringify({
          depositId: messageDialog.id,
          action: messageDialog.action,
          reason: messageDialog.action === 'reject' ? dialogMessage || undefined : undefined,
          adminMessage: dialogMessage || undefined,
          attachmentUrl: dialogAttachment || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) { showToast(`Deposit ${messageDialog.action}d, email sent to user`); fetchDeposits(depositFilter); fetchStats(); }
      else showToast(data.error?.message || 'Action failed');
    } catch { showToast('Network error'); }
    setActionLoading(null);
  };

  const handleWithdrawalAction = async (withdrawalId: string, action: 'approve' | 'reject') => {
    setActionLoading(withdrawalId);
    const reason = action === 'reject' ? prompt('Rejection reason:') : undefined;
    if (action === 'reject' && reason === null) { setActionLoading(null); return; }
    try {
      const res = await apiCall('/api/admin/withdrawals', {
        method: 'PATCH',
        body: JSON.stringify({ withdrawalId, action, reason }),
      });
      const data = await res.json();
      if (data.success) { showToast(`Withdrawal ${action}d`); fetchWithdrawals(withdrawalFilter); fetchStats(); }
      else showToast(data.error?.message || 'Action failed');
    } catch { showToast('Network error'); }
    setActionLoading(null);
  };

  const handleKycAction = async (verificationId: string, action: 'approve' | 'reject') => {
    setMessageDialog({ type: 'kyc', id: verificationId, action });
    setDialogMessage('');
    setDialogAttachment('');
  };

  const executeKycAction = async () => {
    if (!messageDialog) return;
    setActionLoading(messageDialog.id);
    setMessageDialog(null);
    try {
      const res = await apiCall('/api/admin/kyc', {
        method: 'PATCH',
        body: JSON.stringify({
          verificationId: messageDialog.id,
          action: messageDialog.action,
          reason: messageDialog.action === 'reject' ? dialogMessage || undefined : undefined,
          adminMessage: dialogMessage || undefined,
          attachmentUrl: dialogAttachment || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) { showToast(`KYC ${messageDialog.action}d, email sent to user`); fetchKyc(); fetchStats(); }
      else showToast(data.error?.message || 'Action failed');
    } catch { showToast('Network error'); }
    setActionLoading(null);
  };

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); fetchUsers(searchTerm); };

  const saveElonUrl = async (url?: string) => {
    const inputUrl = url || (document.getElementById('elonUrlInput') as HTMLInputElement)?.value.trim();
    if (!inputUrl) return;
    setSettingsLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ elonPhotoUrl: inputUrl }),
      });
      const data = await res.json();
      if (data.success) { setElonPhotoUrl(data.data.elonPhotoUrl); showToast('CEO photo URL updated!'); }
      else showToast(data.error?.message || 'Update failed');
    } catch { showToast('Update failed'); }
    setSettingsLoading(false);
  };

  // Don't render admin panel while checking auth or if not authed
  if (authChecking || !authed) {
    return (
      <div className="min-h-screen bg-tesla-dark flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#CC0000]/30 border-t-[#CC0000] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-tesla-dark text-white flex">
      {toast && (
        <div className="fixed top-4 right-4 z-[100] bg-tesla-card border border-tesla-border rounded-lg px-4 py-3 text-sm shadow-xl animate-fade-in">
          {toast}
        </div>
      )}

      {/* Message Dialog Modal */}
      {messageDialog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setMessageDialog(null)}>
          <div className="bg-[#1a1a1a] border border-tesla-border rounded-2xl p-6 max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-white font-semibold mb-1">
              {messageDialog.action === 'approve' ? 'Approve' : 'Reject'} {messageDialog.type === 'kyc' ? 'KYC' : messageDialog.type === 'deposit' ? 'Deposit' : 'Withdrawal'}
            </h3>
            <p className="text-gray-500 text-xs mb-4">
              {messageDialog.action === 'approve'
                ? 'Add an optional message and the user will receive an email notification.'
                : 'Provide a reason for rejection. The user will be notified via email.'}
            </p>
            <textarea
              value={dialogMessage}
              onChange={e => setDialogMessage(e.target.value)}
              placeholder={messageDialog.action === 'reject' ? 'Rejection reason / billing message...' : 'Optional message to the user (e.g. billing details, instructions)...'}
              rows={4}
              className="w-full bg-[#111] border border-tesla-border rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#CC0000] transition-colors resize-none mb-3"
            />
            <input
              type="text"
              value={dialogAttachment}
              onChange={e => setDialogAttachment(e.target.value)}
              placeholder="Attachment URL (optional — document, receipt, invoice...)"
              className="w-full bg-[#111] border border-tesla-border rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#CC0000] transition-colors mb-5"
            />
            <div className="flex gap-3 justify-end">
              <button onClick={() => setMessageDialog(null)} className="px-5 py-2.5 text-sm text-gray-400 hover:text-white border border-tesla-border rounded-xl transition-colors">Cancel</button>
              <button onClick={() => { if (messageDialog.type === 'kyc') executeKycAction(); else executeDepositAction(); }}
                className={`px-5 py-2.5 text-sm font-medium text-white rounded-xl transition-colors ${messageDialog.action === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>
                Confirm &amp; Send Email
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Detail Modal — Fund Management */}
      {selectedUserId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={closeUserDetail}>
          <div className="bg-[#1a1a1a] border border-tesla-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            {userDetailLoading ? (
              <div className="p-10 text-center">
                <svg className="animate-spin h-8 w-8 mx-auto text-[#CC0000] mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeOpacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>
                <p className="text-gray-400 text-sm">Loading user details...</p>
              </div>
            ) : userDetail ? (
              <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-white font-bold text-lg">
                      {userDetail.profile?.firstName || '—'} {userDetail.profile?.lastName || ''}
                    </h3>
                    <p className="text-gray-500 text-sm">{userDetail.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {statusBadge(userDetail.status)}
                    {/* Quick KYC Code button right in the header */}
                    <button
                      onClick={() => quickSendKycCode(selectedUserId)}
                      disabled={kycCodeLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#CC0000]/10 border border-[#CC0000]/30 text-[#CC0000] text-xs font-bold rounded-lg hover:bg-[#CC0000]/20 transition-colors disabled:opacity-50"
                      title="Auto-generate a KYC verification code (client must purchase first)"
                    >
                      {kycCodeLoading ? (
                        <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeOpacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                      )}
                      Generate KYC Code
                    </button>
                    <button
                      onClick={() => confirmPurchase(selectedUserId)}
                      disabled={confirmPurchaseLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600/10 border border-green-600/30 text-green-400 text-xs font-bold rounded-lg hover:bg-green-600/20 transition-colors disabled:opacity-50"
                      title="Confirm client purchased the code & send it to their email"
                    >
                      {confirmPurchaseLoading ? (
                        <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeOpacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                      )}
                      Confirm Purchase &amp; Send
                    </button>
                    <button onClick={closeUserDetail} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    </button>
                  </div>
                </div>

                {/* User Info Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'KYC Level', value: userDetail.kycLevel || 'LEVEL_0', badge: true },
                    { label: 'Email Verified', value: userDetail.emailVerified ? 'Yes' : 'No' },
                    { label: '2FA', value: userDetail.twoFactorEnabled ? 'Enabled' : 'Disabled' },
                    { label: 'Joined', value: userDetail.createdAt ? new Date(userDetail.createdAt).toLocaleDateString() : '—' },
                    { label: 'Last Login', value: userDetail.lastLoginAt ? new Date(userDetail.lastLoginAt).toLocaleDateString() : 'Never' },
                    { label: 'Referrals', value: userDetail._count?.referrals?.toString() || '0' },
                    { label: 'Deposits', value: `$${(userDetail.deposits?.filter((d: any) => d.status === 'confirmed').reduce((s: number, d: any) => s + (d.amount || 0), 0) || 0).toLocaleString()}` },
                    { label: 'Investments', value: `$${(userDetail.investments?.filter((i: any) => i.status === 'active').reduce((s: number, i: any) => s + (i.amount || 0), 0) || 0).toLocaleString()}` },
                  ].map((item, i) => (
                    <div key={i} className="bg-[#111] border border-tesla-border rounded-lg p-3">
                      <p className="text-gray-500 text-[10px] font-medium uppercase tracking-wider">{item.label}</p>
                      {item.badge ? (
                        <p className="mt-1">{statusBadge(item.value)}</p>
                      ) : (
                        <p className="text-white text-sm font-semibold mt-0.5">{item.value}</p>
                      )}
                    </div>
                  ))}
                </div>

                {/* Wallet Balances & Fund Management */}
                <div className="space-y-4">
                  <h4 className="text-white font-semibold text-sm flex items-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#CC0000" strokeWidth="1.5"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a4 4 0 0 0-8 0v2" /></svg>
                    Wallet Balances &amp; Fund Management
                  </h4>

                  {/* Wallet cards */}
                  {userDetail.wallets && userDetail.wallets.length > 0 ? (
                    <div className="space-y-3">
                      {userDetail.wallets.map((wallet: any) => (
                        <div key={wallet.id} className={`border rounded-xl p-4 transition-all ${fundEditWalletType === wallet.type ? 'border-[#CC0000]/50 bg-[#CC0000]/5' : 'border-tesla-border bg-[#111]'}`}>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-bold px-2 py-0.5 rounded ${wallet.type === 'live' ? 'bg-green-600/15 text-green-400' : 'bg-blue-600/15 text-blue-400'}`}>
                                {wallet.type.toUpperCase()} WALLET
                              </span>
                            </div>
                            <button
                              onClick={() => { setFundEditWalletType(wallet.type); setFundEditAmount(''); }}
                              className={`text-xs font-medium px-3 py-1 rounded-lg transition-colors ${fundEditWalletType === wallet.type ? 'bg-[#CC0000] text-white' : 'bg-white/5 text-gray-400 hover:text-white border border-tesla-border'}`}
                            >
                              {fundEditWalletType === wallet.type ? 'Editing' : 'Edit'}
                            </button>
                          </div>
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <p className="text-gray-500 text-[10px] uppercase tracking-wider">Total Balance</p>
                              <p className="text-white font-bold text-lg">${(wallet.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                            </div>
                            <div>
                              <p className="text-gray-500 text-[10px] uppercase tracking-wider">Available</p>
                              <p className="text-green-400 font-semibold">${(wallet.availableBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                            </div>
                            <div>
                              <p className="text-gray-500 text-[10px] uppercase tracking-wider">Locked</p>
                              <p className="text-yellow-400 font-semibold">${(wallet.lockedBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-gray-500 py-6 text-sm bg-[#111] border border-tesla-border rounded-xl">
                      No wallets found for this user
                    </div>
                  )}

                  {/* Fund Edit Controls */}
                  {fundEditWalletType && userDetail.wallets?.some((w: any) => w.type === fundEditWalletType) && (
                    <div className="bg-[#111] border border-tesla-border rounded-xl p-5 space-y-4">
                      <h5 className="text-white text-sm font-medium">Modify {fundEditWalletType.toUpperCase()} Wallet</h5>

                      {/* Mode toggle */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setFundEditMode('adjust'); setFundEditAmount(''); }}
                          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all border ${fundEditMode === 'adjust' ? 'bg-[#CC0000]/10 border-[#CC0000]/30 text-[#CC0000]' : 'bg-white/5 border-tesla-border text-gray-500 hover:border-gray-600'}`}
                        >
                          Adjust (+/-)
                        </button>
                        <button
                          onClick={() => { setFundEditMode('set'); setFundEditAmount(''); }}
                          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all border ${fundEditMode === 'set' ? 'bg-[#CC0000]/10 border-[#CC0000]/30 text-[#CC0000]' : 'bg-white/5 border-tesla-border text-gray-500 hover:border-gray-600'}`}
                        >
                          Set Exact Amount
                        </button>
                      </div>

                      <div>
                        <label className="block text-gray-400 text-xs font-medium mb-1.5">
                          {fundEditMode === 'adjust' ? 'Amount (use positive to add, negative to deduct)' : 'Set balance to this exact amount ($)'}
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium">$</span>
                          <input
                            type="number"
                            value={fundEditAmount}
                            onChange={(e) => setFundEditAmount(e.target.value)}
                            placeholder={fundEditMode === 'adjust' ? 'e.g. 500 or -200' : 'e.g. 10000'}
                            className="w-full bg-[#1a1a1a] border border-tesla-border rounded-lg pl-7 pr-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#CC0000] transition-colors"
                          />
                        </div>
                      </div>

                      {fundEditMode === 'adjust' && fundEditAmount && !isNaN(parseFloat(fundEditAmount)) && parseFloat(fundEditAmount) !== 0 && (
                        <div className="bg-[#1a1a1a] rounded-lg px-4 py-3 border border-tesla-border/50">
                          <p className="text-xs text-gray-500 mb-1">Preview</p>
                          {(() => {
                            const currentWallet = userDetail.wallets?.find((w: any) => w.type === fundEditWalletType);
                            const currentBal = currentWallet?.balance || 0;
                            const amt = parseFloat(fundEditAmount);
                            const newBal = currentBal + amt;
                            return (
                              <p className={`text-sm font-semibold ${newBal < 0 ? 'text-red-400' : 'text-green-400'}`}>
                                Current: ${currentBal.toLocaleString(undefined, { minimumFractionDigits: 2 })} → New: ${newBal.toLocaleString(undefined, { minimumFractionDigits: 2 })} ({amt > 0 ? '+' : ''}{amt})
                              </p>
                            );
                          })()}
                        </div>
                      )}

                      <div className="flex items-center gap-3 pt-1">
                        <button
                          onClick={handleFundEdit}
                          disabled={fundEditLoading || !fundEditAmount || isNaN(parseFloat(fundEditAmount)) || (fundEditMode === 'adjust' && parseFloat(fundEditAmount) === 0)}
                          className={`flex-1 font-medium py-3 rounded-xl transition-colors text-sm flex items-center justify-center gap-2 ${
                            fundEditMode === 'set'
                              ? 'bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white'
                              : parseFloat(fundEditAmount) > 0
                                ? 'bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white'
                                : 'bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white'
                          }`}
                        >
                          {fundEditLoading ? (
                            <>
                              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeOpacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>
                              Processing...
                            </>
                          ) : fundEditMode === 'set' ? (
                            <>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /></svg>
                              Set Balance
                            </>
                          ) : (
                            <>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 19 5 12" /></svg>
                              {parseFloat(fundEditAmount) > 0 ? 'Add Funds' : 'Deduct Funds'}
                            </>
                          )}
                        </button>
                        <button onClick={() => setFundEditAmount('')} className="px-4 py-3 bg-white/5 hover:bg-white/10 text-gray-400 text-sm rounded-xl border border-tesla-border transition-colors">
                          Clear
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Recent Deposits */}
                {userDetail.deposits && userDetail.deposits.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-white font-semibold text-sm">Recent Deposits</h4>
                    <div className="bg-[#111] border border-tesla-border rounded-xl overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead><tr className="border-b border-tesla-border">
                            <th className="text-left text-gray-500 font-medium px-3 py-2">Amount</th>
                            <th className="text-left text-gray-500 font-medium px-3 py-2">Method</th>
                            <th className="text-left text-gray-500 font-medium px-3 py-2">Status</th>
                            <th className="text-right text-gray-500 font-medium px-3 py-2">Date</th>
                          </tr></thead>
                          <tbody>
                            {userDetail.deposits.slice(0, 5).map((d: any) => (
                              <tr key={d.id} className="border-b border-tesla-border/50 last:border-0">
                                <td className="text-green-400 font-medium px-3 py-2">${(d.amount || 0).toLocaleString()}</td>
                                <td className="text-gray-400 px-3 py-2 capitalize">{d.method}</td>
                                <td className="px-3 py-2">{statusBadge(d.status)}</td>
                                <td className="text-gray-500 px-3 py-2 text-right">{new Date(d.createdAt).toLocaleDateString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* KYC Verification Code */}
                <div className="space-y-4">
                  <h4 className="text-white font-semibold text-sm flex items-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#CC0000" strokeWidth="1.5"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                    KYC Verification Code
                  </h4>
                  <p className="text-gray-500 text-xs">Generate and assign a KYC verification code to this user. They must enter this code to submit Level 1 KYC documents.</p>
                  <div className="bg-[#111] border border-tesla-border rounded-xl p-5 space-y-4">
                    {/* Generate button */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => setKycCodeValue('KYC-' + Math.random().toString(36).substring(2, 8).toUpperCase())}
                        className="px-4 py-2.5 bg-[#CC0000]/10 border border-[#CC0000]/30 text-[#CC0000] text-xs font-bold rounded-lg hover:bg-[#CC0000]/20 transition-colors"
                      >
                        Auto-Generate Code
                      </button>
                      <button
                        onClick={() => setKycCodeValue('')}
                        className="px-4 py-2.5 bg-white/5 border border-tesla-border text-gray-400 text-xs font-medium rounded-lg hover:bg-white/10 transition-colors"
                      >
                        Clear
                      </button>
                    </div>
                    {/* Code input */}
                    <div>
                      <label className="block text-gray-400 text-xs font-medium mb-1.5">Verification Code</label>
                      <input
                        type="text"
                        value={kycCodeValue}
                        onChange={(e) => setKycCodeValue(e.target.value)}
                        placeholder="Enter or auto-generate a code"
                        className="w-full bg-[#1a1a1a] border border-tesla-border rounded-lg px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#CC0000] transition-colors font-mono tracking-widest text-center"
                      />
                    </div>
                    {/* Optional message to user */}
                    <div>
                      <label className="block text-gray-400 text-xs font-medium mb-1.5">Message to User (optional)</label>
                      <input
                        type="text"
                        value={kycCodeMessage}
                        onChange={(e) => setKycCodeMessage(e.target.value)}
                        placeholder="e.g. Please use this code to complete your KYC verification"
                        maxLength={200}
                        className="w-full bg-[#1a1a1a] border border-tesla-border rounded-lg px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#CC0000] transition-colors"
                      />
                    </div>
                    {/* Notify toggle */}
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={kycCodeNotify}
                        onChange={(e) => setKycCodeNotify(e.target.checked)}
                        className="accent-[#CC0000]"
                      />
                      <span className="text-gray-400 text-xs">Send email notification to user with purchase instructions</span>
                    </label>
                    {/* Submit */}
                    <button
                      onClick={async () => {
                        if (!kycCodeValue.trim() || !selectedUserId) return;
                        setKycCodeLoading(true);
                        try {
                          const res = await apiCall(`/api/admin/users/${selectedUserId}/kyc-code`, {
                            method: 'POST',
                            body: JSON.stringify({
                              code: kycCodeValue.trim(),
                              adminMessage: kycCodeMessage.trim() || undefined,
                            }),
                          });
                          const data = await res.json();
                          if (data.success) {
                            showToast(`KYC code set: ${kycCodeValue.trim()}. Client notified to purchase.`);
                            setKycCodeValue('');
                            setKycCodeMessage('');
                          } else {
                            showToast(data.error?.message || 'Failed to set KYC code');
                          }
                        } catch {
                          showToast('Failed to set KYC code');
                        }
                        setKycCodeLoading(false);
                      }}
                      disabled={kycCodeLoading || !kycCodeValue.trim()}
                      className="w-full py-3 rounded-xl bg-[#CC0000] hover:bg-red-700 disabled:opacity-50 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2"
                    >
                      {kycCodeLoading ? (
                        <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeOpacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>Setting Code...</>
                      ) : (
                        <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>Set KYC Code</>
                      )}
                    </button>
                    {/* Confirm Purchase button */}
                    <button
                      onClick={() => confirmPurchase(selectedUserId!)}
                      disabled={confirmPurchaseLoading}
                      className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2"
                    >
                      {confirmPurchaseLoading ? (
                        <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeOpacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>Confirming...</>
                      ) : (
                        <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>Confirm Purchase &amp; Send Code to Email</>
                      )}
                    </button>
                  </div>
                </div>

                {/* Recent Investments */}
                {userDetail.investments && userDetail.investments.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-white font-semibold text-sm">Recent Investments</h4>
                    <div className="bg-[#111] border border-tesla-border rounded-xl overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead><tr className="border-b border-tesla-border">
                            <th className="text-left text-gray-500 font-medium px-3 py-2">Plan</th>
                            <th className="text-left text-gray-500 font-medium px-3 py-2">Amount</th>
                            <th className="text-left text-gray-500 font-medium px-3 py-2">Return</th>
                            <th className="text-left text-gray-500 font-medium px-3 py-2">Status</th>
                            <th className="text-right text-gray-500 font-medium px-3 py-2">Date</th>
                          </tr></thead>
                          <tbody>
                            {userDetail.investments.slice(0, 5).map((inv: any) => (
                              <tr key={inv.id} className="border-b border-tesla-border/50 last:border-0">
                                <td className="text-white font-medium px-3 py-2">{inv.plan?.name || '—'}</td>
                                <td className="text-blue-400 font-medium px-3 py-2">${(inv.amount || 0).toLocaleString()}</td>
                                <td className="text-green-400 px-3 py-2">${(inv.expectedReturn || 0).toLocaleString()}</td>
                                <td className="px-3 py-2">{statusBadge(inv.status)}</td>
                                <td className="text-gray-500 px-3 py-2 text-right">{new Date(inv.createdAt).toLocaleDateString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-10 text-center">
                <p className="text-gray-500 text-sm">Failed to load user details</p>
              </div>
            )}
          </div>
        </div>
      )}

      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-tesla-card border-r border-tesla-border flex flex-col transition-transform lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center gap-2.5 px-5 h-16 border-b border-tesla-border">
          <TeslaTLogo />
          <span className="font-bold text-sm">Tesla Admin</span>
          <button className="lg:hidden ml-auto text-gray-400" onClick={() => setSidebarOpen(false)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
        <nav className="flex-1 py-4 px-3 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => { setActiveTab(item.key); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === item.key ? 'bg-[#CC0000]/10 text-[#CC0000]' : 'text-gray-400 hover:text-white hover:bg-[#2a2a2a]'
              }`}
            >
              {item.icon}
              {item.label}
              {item.key === 'deposits' && stats?.pendingDeposits > 0 && (
                <span className="ml-auto bg-yellow-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{stats.pendingDeposits}</span>
              )}
              {item.key === 'withdrawals' && stats?.pendingWithdrawals > 0 && (
                <span className="ml-auto bg-yellow-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{stats.pendingWithdrawals}</span>
              )}
              {item.key === 'kyc' && stats?.pendingKyc > 0 && (
                <span className="ml-auto bg-yellow-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{stats.pendingKyc}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-tesla-border">
          <button onClick={() => { localStorage.removeItem('token'); localStorage.removeItem('adminUser'); localStorage.removeItem('user'); router.push('/admin/login'); }} className="text-gray-500 hover:text-red-400 text-xs transition-colors">
            Sign Out
          </button>
          <Link href="/" className="text-gray-500 hover:text-gray-300 text-xs block mt-2 transition-colors">
            &larr; Back to Main Site
          </Link>
        </div>
      </aside>

      {sidebarOpen && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <main className="flex-1 lg:ml-64">
        <header className="sticky top-0 z-30 bg-tesla-dark/95 backdrop-blur-md border-b border-tesla-border h-14 flex items-center px-4 gap-3">
          <button className="lg:hidden text-gray-400" onClick={() => setSidebarOpen(true)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
          </button>
          <h1 className="font-semibold">{navItems.find((n) => n.key === activeTab)?.label || 'Dashboard'}</h1>
        </header>
        <div className="p-4 sm:p-6 max-w-7xl">

          {/* DASHBOARD TAB */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Total Users', value: stats?.totalUsers?.toLocaleString() || '—', color: 'text-white', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg> },
                  { label: 'Total Deposits', value: `$${(stats?.totalDeposits || 0).toLocaleString()}`, color: 'text-green-400', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 19 5 12" /></svg> },
                  { label: 'Active Investments', value: stats?.activeInvestments?.toString() || '—', color: 'text-blue-400', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg> },
                  { label: 'Total Investments', value: `$${(stats?.totalInvestments || 0).toLocaleString()}`, color: 'text-purple-400', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a4 4 0 0 0-8 0v2" /></svg> },
                ].map((s, i) => (
                  <div key={i} className="bg-tesla-card border border-tesla-border rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-gray-500 text-xs font-medium">{s.label}</p>
                      <span className="text-gray-600">{s.icon}</span>
                    </div>
                    <p className={`text-lg sm:text-xl font-bold ${s.color}`}>{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Pending actions row */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Pending KYC', value: stats?.pendingKyc || 0, color: 'text-yellow-400', tab: 'kyc' },
                  { label: 'Pending Deposits', value: stats?.pendingDeposits || 0, color: 'text-green-400', tab: 'deposits' },
                  { label: 'Pending Withdrawals', value: stats?.pendingWithdrawals || 0, color: 'text-red-400', tab: 'withdrawals' },
                ].map((s, i) => (
                  <button key={i} onClick={() => setActiveTab(s.tab)} className="bg-tesla-card border border-tesla-border rounded-xl p-4 text-left hover:border-gray-500 transition-colors">
                    <p className="text-gray-500 text-xs font-medium mb-1">{s.label}</p>
                    <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  </button>
                ))}
              </div>

              <div className="bg-tesla-card border border-tesla-border rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-semibold text-sm">Recent Users</h3>
                  <button onClick={() => setActiveTab('users')} className="text-[#CC0000] text-xs hover:underline">View All</button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-tesla-border">
                      <th className="text-left text-gray-500 font-medium px-3 py-2">Name</th>
                      <th className="text-left text-gray-500 font-medium px-3 py-2 hidden sm:table-cell">Email</th>
                      <th className="text-left text-gray-500 font-medium px-3 py-2">Status</th>
                      <th className="text-right text-gray-500 font-medium px-3 py-2">Joined</th>
                    </tr></thead>
                    <tbody>
                      {(stats?.recentUsers || users.slice(0, 5)).map((u: any) => (
                        <tr key={u.id} className="border-b border-tesla-border/50 last:border-0">
                          <td className="text-white px-3 py-2.5 font-medium">{u.profile?.firstName || '—'} {u.profile?.lastName || ''}</td>
                          <td className="text-gray-400 px-3 py-2.5 hidden sm:table-cell">{u.email}</td>
                          <td className="px-3 py-2.5">{statusBadge(u.status)}</td>
                          <td className="text-gray-500 px-3 py-2.5 text-right text-xs">{new Date(u.createdAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                      {(stats?.recentUsers || users).length === 0 && (
                        <tr><td colSpan={4} className="text-center text-gray-500 py-8">No users yet</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* USERS TAB */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              <form onSubmit={handleSearch} className="flex gap-2">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name or email..."
                  className="flex-1 bg-tesla-card border border-tesla-border rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#CC0000]"
                />
                <button type="submit" className="bg-tesla-card border border-tesla-border hover:border-gray-500 px-4 py-2.5 rounded-lg text-sm transition-colors">Search</button>
                <button type="button" onClick={() => { setSearchTerm(''); fetchUsers(''); }} className="bg-tesla-card border border-tesla-border hover:border-gray-500 px-4 py-2.5 rounded-lg text-sm transition-colors">Clear</button>
              </form>
              <div className="bg-tesla-card border border-tesla-border rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-tesla-border">
                      <th className="text-left text-gray-500 font-medium px-4 py-3">Name</th>
                      <th className="text-left text-gray-500 font-medium px-4 py-3 hidden sm:table-cell">Email</th>
                      <th className="text-left text-gray-500 font-medium px-4 py-3">Status</th>
                      <th className="text-left text-gray-500 font-medium px-4 py-3 hidden md:table-cell">KYC</th>
                      <th className="text-left text-gray-500 font-medium px-4 py-3 hidden lg:table-cell">Wallets</th>
                      <th className="text-right text-gray-500 font-medium px-4 py-3">Actions</th>
                    </tr></thead>
                    <tbody>
                      {users.map((u: any) => (
                        <tr key={u.id} className="border-b border-tesla-border/50 last:border-0">
                          <td className="text-white px-4 py-3 font-medium">{u.profile?.firstName || '—'} {u.profile?.lastName || ''}</td>
                          <td className="text-gray-400 px-4 py-3 hidden sm:table-cell">{u.email}</td>
                          <td className="px-4 py-3">{statusBadge(u.status)}</td>
                          <td className="px-4 py-3 hidden md:table-cell">{statusBadge(u.kycLevel || 'LEVEL_0')}</td>
                          <td className="px-4 py-3 hidden lg:table-cell text-xs text-gray-400">
                            {u.wallets?.map((w: any) => `${w.type}: $${(w.balance||0).toLocaleString()}`).join(' | ') || '—'}
                          </td>
                          <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                            <button onClick={() => openUserDetail(u.id)} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors">Edit Funds</button>
                            {u.status !== 'active' && (
                              <button onClick={() => updateUserStatus(u.id, 'active')} disabled={actionLoading === u.id} className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors">Activate</button>
                            )}
                            {u.status !== 'suspended' && u.status !== 'banned' && (
                              <button onClick={() => updateUserStatus(u.id, 'suspended')} disabled={actionLoading === u.id} className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors">Suspend</button>
                            )}
                          </td>
                        </tr>
                      ))}
                      {users.length === 0 && <tr><td colSpan={6} className="text-center text-gray-500 py-8">No users found</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* DEPOSITS TAB */}
          {activeTab === 'deposits' && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {['', 'pending', 'pending_verification', 'confirmed', 'rejected'].map((s) => (
                  <button key={s} onClick={() => setDepositFilter(s)} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${depositFilter === s ? 'border-[#CC0000] text-[#CC0000]' : 'border-tesla-border text-gray-400 hover:text-white'}`}>
                    {s || 'All'}
                  </button>
                ))}
              </div>
              <div className="bg-tesla-card border border-tesla-border rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-tesla-border">
                      <th className="text-left text-gray-500 font-medium px-4 py-3">User</th>
                      <th className="text-left text-gray-500 font-medium px-4 py-3">Amount</th>
                      <th className="text-left text-gray-500 font-medium px-4 py-3 hidden sm:table-cell">Method</th>
                      <th className="text-left text-gray-500 font-medium px-4 py-3">Status</th>
                      <th className="text-left text-gray-500 font-medium px-4 py-3 hidden md:table-cell">Date</th>
                      <th className="text-right text-gray-500 font-medium px-4 py-3">Actions</th>
                    </tr></thead>
                    <tbody>
                      {deposits.map((d: any) => (
                        <tr key={d.id} className="border-b border-tesla-border/50 last:border-0">
                          <td className="text-white px-4 py-3">
                            <div className="font-medium">{d.user?.profile?.firstName || '—'} {d.user?.profile?.lastName || ''}</div>
                            <div className="text-gray-500 text-xs">{d.user?.email}</div>
                          </td>
                          <td className="text-green-400 font-semibold px-4 py-3">${d.amount?.toLocaleString()}</td>
                          <td className="text-gray-400 px-4 py-3 hidden sm:table-cell capitalize">{d.method?.replace('_', ' ')}</td>
                          <td className="px-4 py-3">{statusBadge(d.status)}</td>
                          <td className="text-gray-500 px-4 py-3 text-xs hidden md:table-cell">{new Date(d.createdAt).toLocaleDateString()}</td>
                          <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                            {(d.status === 'pending' || d.status === 'pending_verification') && (
                              <>
                                <button onClick={() => handleDepositAction(d.id, 'approve')} disabled={actionLoading === d.id} className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors">Approve</button>
                                <button onClick={() => handleDepositAction(d.id, 'reject')} disabled={actionLoading === d.id} className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors">Reject</button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                      {deposits.length === 0 && <tr><td colSpan={6} className="text-center text-gray-500 py-12">No deposits found</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* WITHDRAWALS TAB */}
          {activeTab === 'withdrawals' && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {['', 'pending', 'processing', 'completed', 'rejected'].map((s) => (
                  <button key={s} onClick={() => setWithdrawalFilter(s)} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${withdrawalFilter === s ? 'border-[#CC0000] text-[#CC0000]' : 'border-tesla-border text-gray-400 hover:text-white'}`}>
                    {s || 'All'}
                  </button>
                ))}
              </div>
              <div className="bg-tesla-card border border-tesla-border rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-tesla-border">
                      <th className="text-left text-gray-500 font-medium px-4 py-3">User</th>
                      <th className="text-left text-gray-500 font-medium px-4 py-3">Amount</th>
                      <th className="text-left text-gray-500 font-medium px-4 py-3 hidden sm:table-cell">Destination</th>
                      <th className="text-left text-gray-500 font-medium px-4 py-3">Status</th>
                      <th className="text-left text-gray-500 font-medium px-4 py-3 hidden md:table-cell">Date</th>
                      <th className="text-right text-gray-500 font-medium px-4 py-3">Actions</th>
                    </tr></thead>
                    <tbody>
                      {withdrawals.map((w: any) => (
                        <tr key={w.id} className="border-b border-tesla-border/50 last:border-0">
                          <td className="text-white px-4 py-3">
                            <div className="font-medium">{w.user?.profile?.firstName || '—'} {w.user?.profile?.lastName || ''}</div>
                            <div className="text-gray-500 text-xs">{w.user?.email}</div>
                          </td>
                          <td className="text-red-400 font-semibold px-4 py-3">${w.amount?.toLocaleString()}</td>
                          <td className="text-gray-400 px-4 py-3 hidden sm:table-cell capitalize">{w.destinationType}</td>
                          <td className="px-4 py-3">{statusBadge(w.status)}</td>
                          <td className="text-gray-500 px-4 py-3 text-xs hidden md:table-cell">{new Date(w.createdAt).toLocaleDateString()}</td>
                          <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                            {w.status === 'pending' && (
                              <>
                                <button onClick={() => handleWithdrawalAction(w.id, 'approve')} disabled={actionLoading === w.id} className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors">Approve</button>
                                <button onClick={() => handleWithdrawalAction(w.id, 'reject')} disabled={actionLoading === w.id} className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors">Reject</button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                      {withdrawals.length === 0 && <tr><td colSpan={6} className="text-center text-gray-500 py-12">No withdrawals found</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* KYC TAB */}
          {activeTab === 'kyc' && (
            <div className="space-y-4">
              {/* ─── KYC Code Generator (always visible) ─── */}
              <div className="bg-tesla-card border border-[#CC0000]/20 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[#CC0000]/10 flex items-center justify-center">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#CC0000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                    </div>
                    <div>
                      <h3 className="text-white font-semibold text-sm">KYC Code Generator</h3>
                      <p className="text-gray-500 text-[10px]">Generate and send a verification code to any user</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* User select */}
                  <div>
                    <label className="block text-gray-400 text-xs uppercase tracking-wider mb-1.5">User</label>
                    <select
                      value={kycGenUserId}
                      onChange={(e) => setKycGenUserId(e.target.value)}
                      className="w-full bg-[#111] border border-tesla-border text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#CC0000]"
                    >
                      <option value="">— Select user —</option>
                      {users.map((u: any) => (
                        <option key={u.id} value={u.id}>
                          {u.email}{u.profile?.firstName ? ` (${u.profile.firstName})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Code */}
                  <div>
                    <label className="block text-gray-400 text-xs uppercase tracking-wider mb-1.5">Verification Code</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={kycGenCode}
                        onChange={(e) => setKycGenCode(e.target.value)}
                        placeholder="Enter or auto-generate"
                        className="flex-1 bg-[#111] border border-tesla-border rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#CC0000] font-mono tracking-widest text-center"
                      />
                      <button
                        onClick={() => setKycGenCode('KYC-' + Math.random().toString(36).substring(2, 8).toUpperCase())}
                        className="px-3 py-2.5 bg-[#CC0000]/10 border border-[#CC0000]/30 text-[#CC0000] text-xs font-bold rounded-lg hover:bg-[#CC0000]/20 transition-colors whitespace-nowrap"
                      >
                        Auto
                      </button>
                    </div>
                  </div>

                  {/* Submit */}
                  <div>
                    <label className="block text-gray-400 text-xs uppercase tracking-wider mb-1.5">Action</label>
                    <div className="flex gap-2">
                      <button
                        onClick={submitKycGenCode}
                        disabled={kycGenLoading || !kycGenUserId || !kycGenCode.trim()}
                        className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#CC0000] hover:bg-[#a30000] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg transition-colors"
                      >
                        {kycGenLoading ? (
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeOpacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                        )}
                        Send Code
                      </button>
                      <label className="flex items-center gap-1.5 px-3 py-2.5 bg-white/5 border border-tesla-border rounded-lg cursor-pointer hover:bg-white/10 transition-colors" title="Also send email">
                        <input
                          type="checkbox"
                          checked={kycGenNotify}
                          onChange={(e) => setKycGenNotify(e.target.checked)}
                          className="w-3.5 h-3.5 accent-[#CC0000]"
                        />
                        <span className="text-gray-400 text-[10px] whitespace-nowrap">Email</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Optional message */}
                {kycGenUserId && (
                  <div>
                    <label className="block text-gray-400 text-xs uppercase tracking-wider mb-1.5">Message to User (optional)</label>
                    <input
                      type="text"
                      value={kycGenMessage}
                      onChange={(e) => setKycGenMessage(e.target.value)}
                      placeholder="e.g. Please use this code to complete your KYC verification"
                      maxLength={200}
                      className="w-full bg-[#111] border border-tesla-border rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#CC0000]"
                    />
                  </div>
                )}
              </div>

              {/* ─── KYC Review Table ─── */}
              <div className="bg-tesla-card border border-tesla-border rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-tesla-border">
                      <th className="text-left text-gray-500 font-medium px-4 py-3">User</th>
                      <th className="text-left text-gray-500 font-medium px-4 py-3 hidden sm:table-cell">Email</th>
                      <th className="text-left text-gray-500 font-medium px-4 py-3">Level</th>
                      <th className="text-left text-gray-500 font-medium px-4 py-3">Status</th>
                      <th className="text-left text-gray-500 font-medium px-4 py-3 hidden md:table-cell">Submitted</th>
                      <th className="text-right text-gray-500 font-medium px-4 py-3">Actions</th>
                    </tr></thead>
                    <tbody>
                      {kycList.map((k: any) => (
                        <tr key={k.id} className="border-b border-tesla-border/50 last:border-0">
                          <td className="text-white px-4 py-3 font-medium">{k.user?.profile?.firstName || '—'} {k.user?.profile?.lastName || ''}</td>
                          <td className="text-gray-400 px-4 py-3 hidden sm:table-cell">{k.user?.email}</td>
                          <td className="px-4 py-3 text-xs font-mono text-gray-300">{k.level}</td>
                          <td className="px-4 py-3">{statusBadge(k.status)}</td>
                          <td className="text-gray-500 px-4 py-3 text-xs hidden md:table-cell">{k.submittedAt ? new Date(k.submittedAt).toLocaleDateString() : '—'}</td>
                          <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                            <button
                              onClick={() => quickSendCodeForRow(k.userId)}
                              className="bg-[#CC0000]/15 border border-[#CC0000]/30 text-[#CC0000] text-xs font-medium px-2.5 py-1.5 rounded-lg hover:bg-[#CC0000]/25 transition-colors"
                              title="Auto-generate and send KYC code"
                            >
                              Send Code
                            </button>
                            {k.status === 'pending' && (
                              <>
                                <button onClick={() => handleKycAction(k.id, 'approve')} disabled={actionLoading === k.id} className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors">Approve</button>
                                <button onClick={() => handleKycAction(k.id, 'reject')} disabled={actionLoading === k.id} className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors">Reject</button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                      {kycList.length === 0 && <tr><td colSpan={6} className="text-center text-gray-500 py-12">No KYC submissions found</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* MARKET TAB */}
          {activeTab === 'market' && (
            <div className="space-y-4">
              <h3 className="text-white font-semibold text-sm">TSLA Live Chart</h3>
              <div className="bg-tesla-card border border-tesla-border rounded-xl overflow-hidden !p-0">
                <div className="px-5 py-3 border-b border-tesla-border flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-white font-bold">NASDAQ:TSLA</span>
                    <span className="text-gray-500 text-sm">Tesla, Inc.</span>
                  </div>
                </div>
                <TradingViewWidget />
              </div>
            </div>
          )}

          {/* TRADE CONTROL TAB */}
          {activeTab === 'trade-control' && (
            <div className="space-y-6">
              {/* Spike builder */}
              <div className="bg-tesla-card border border-tesla-border rounded-xl p-6">
                <div className="flex items-center gap-2 mb-1">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#CC0000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                  <h3 className="text-white font-semibold text-sm">Spike a User&apos;s Trade Chart</h3>
                </div>
                <p className="text-gray-500 text-xs mb-5">
                  Fires a one-time visible jump on the target user&apos;s <span className="text-gray-300">ActiveTradeChart</span>.
                  They will see the spike within ~5 seconds (next poll). The chart only runs if the user has at least one active investment.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {/* Target user */}
                  <div>
                    <label className="block text-gray-400 text-xs uppercase tracking-wider mb-2">Target User</label>
                    <select
                      value={spikeUserId}
                      onChange={(e) => setSpikeUserId(e.target.value)}
                      className="w-full bg-tesla-gray-900 border border-tesla-border text-white text-sm rounded-md px-3 py-2 focus:outline-none focus:border-[#CC0000]"
                    >
                      <option value="">— Select a user —</option>
                      {users.map((u: any) => (
                        <option key={u.id} value={u.id}>
                          {u.email}{u.profile?.firstName ? ` (${u.profile.firstName})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Direction */}
                  <div>
                    <label className="block text-gray-400 text-xs uppercase tracking-wider mb-2">Direction</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSpikeDirection('up')}
                        className={`flex-1 px-4 py-2 rounded-md text-sm font-semibold border transition-colors ${
                          spikeDirection === 'up'
                            ? 'bg-green-900/40 text-green-400 border-green-700/60'
                            : 'bg-tesla-gray-900 text-gray-400 border-tesla-border hover:border-gray-500'
                        }`}
                      >
                        ▲ Up
                      </button>
                      <button
                        onClick={() => setSpikeDirection('down')}
                        className={`flex-1 px-4 py-2 rounded-md text-sm font-semibold border transition-colors ${
                          spikeDirection === 'down'
                            ? 'bg-red-900/40 text-red-400 border-red-700/60'
                            : 'bg-tesla-gray-900 text-gray-400 border-tesla-border hover:border-gray-500'
                        }`}
                      >
                        ▼ Down
                      </button>
                    </div>
                  </div>

                  {/* Magnitude */}
                  <div>
                    <label className="block text-gray-400 text-xs uppercase tracking-wider mb-2">
                      Magnitude: <span className="text-white font-bold">{spikeMagnitude}%</span>
                    </label>
                    <input
                      type="range"
                      min={1}
                      max={50}
                      step={0.5}
                      value={spikeMagnitude}
                      onChange={(e) => setSpikeMagnitude(Number(e.target.value))}
                      className="w-full accent-[#CC0000]"
                    />
                    <div className="flex gap-1 mt-2">
                      {[5, 10, 15, 25, 50].map((preset) => (
                        <button
                          key={preset}
                          onClick={() => setSpikeMagnitude(preset)}
                          className="px-2 py-1 text-[10px] font-semibold rounded border border-tesla-border text-gray-400 hover:text-white hover:border-gray-500"
                        >
                          {preset}%
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Message */}
                  <div>
                    <label className="block text-gray-400 text-xs uppercase tracking-wider mb-2">
                      Message <span className="text-gray-600">(optional, shown on user&apos;s chart banner)</span>
                    </label>
                    <input
                      type="text"
                      value={spikeMessage}
                      onChange={(e) => setSpikeMessage(e.target.value)}
                      maxLength={140}
                      placeholder="e.g. Earnings beat — market moving!"
                      className="w-full bg-tesla-gray-900 border border-tesla-border text-white text-sm rounded-md px-3 py-2 focus:outline-none focus:border-[#CC0000]"
                    />
                  </div>
                </div>

                {/* Fire button */}
                <button
                  onClick={fireSpike}
                  disabled={spikeLoading || !spikeUserId}
                  className="w-full md:w-auto px-6 py-3 rounded-md bg-[#CC0000] text-white text-sm font-bold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {spikeLoading ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                      Firing…
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                      </svg>
                      Fire Spike ({spikeDirection === 'up' ? '+' : '-'}{spikeMagnitude}%)
                    </>
                  )}
                </button>
              </div>

              {/* Quick spike per user */}
              {users.length > 0 && (
                <div className="bg-tesla-card border border-tesla-border rounded-xl p-6">
                  <h3 className="text-white font-semibold text-sm mb-1">Quick Spike</h3>
                  <p className="text-gray-500 text-xs mb-4">Click a preset to instantly fire that spike at the user.</p>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-left text-xs text-gray-500 uppercase tracking-wider border-b border-tesla-border">
                          <th className="py-2 pr-4">User</th>
                          <th className="py-2 pr-4">Quick Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.slice(0, 20).map((u: any) => (
                          <tr key={u.id} className="border-b border-tesla-border/50">
                            <td className="py-3 pr-4">
                              <div className="text-white text-sm font-medium">{u.email}</div>
                              {u.profile?.firstName && (
                                <div className="text-gray-500 text-xs">{u.profile.firstName} {u.profile.lastName}</div>
                              )}
                            </td>
                            <td className="py-3 pr-4">
                              <div className="flex flex-wrap gap-1">
                                <button onClick={() => quickSpike(u.id, 'up', 5)} className="px-2 py-1 text-[10px] font-bold rounded bg-green-900/30 text-green-400 border border-green-700/40 hover:bg-green-900/50">+5%</button>
                                <button onClick={() => quickSpike(u.id, 'up', 10)} className="px-2 py-1 text-[10px] font-bold rounded bg-green-900/30 text-green-400 border border-green-700/40 hover:bg-green-900/50">+10%</button>
                                <button onClick={() => quickSpike(u.id, 'up', 25)} className="px-2 py-1 text-[10px] font-bold rounded bg-green-900/30 text-green-400 border border-green-700/40 hover:bg-green-900/50">+25%</button>
                                <button onClick={() => quickSpike(u.id, 'down', 5)} className="px-2 py-1 text-[10px] font-bold rounded bg-red-900/30 text-red-400 border border-red-700/40 hover:bg-red-900/50">-5%</button>
                                <button onClick={() => quickSpike(u.id, 'down', 10)} className="px-2 py-1 text-[10px] font-bold rounded bg-red-900/30 text-red-400 border border-red-700/40 hover:bg-red-900/50">-10%</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Recent spikes history */}
              <div className="bg-tesla-card border border-tesla-border rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-semibold text-sm">Recent Spikes</h3>
                  <button onClick={fetchSpikeHistory} className="text-xs text-[#CC0000] hover:underline">
                    {spikeHistoryLoading ? 'Refreshing…' : 'Refresh'}
                  </button>
                </div>
                {spikeHistory.length === 0 ? (
                  <p className="text-gray-500 text-xs text-center py-6">No spikes fired yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-left text-xs text-gray-500 uppercase tracking-wider border-b border-tesla-border">
                          <th className="py-2 pr-4">When</th>
                          <th className="py-2 pr-4">User</th>
                          <th className="py-2 pr-4">Move</th>
                          <th className="py-2 pr-4">Message</th>
                          <th className="py-2 pr-4">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {spikeHistory.map((s: any) => (
                          <tr key={s.id} className="border-b border-tesla-border/50">
                            <td className="py-3 pr-4 text-gray-400 text-xs">
                              {new Date(s.createdAt).toLocaleString()}
                            </td>
                            <td className="py-3 pr-4 text-white text-xs">
                              {s.userEmail || s.userId}
                            </td>
                            <td className="py-3 pr-4">
                              <span className={`text-xs font-bold ${s.direction === 'up' ? 'text-green-400' : 'text-red-400'}`}>
                                {s.direction === 'up' ? '+' : '-'}{Number(s.magnitudePct).toFixed(2)}%
                              </span>
                            </td>
                            <td className="py-3 pr-4 text-gray-400 text-xs max-w-xs truncate">
                              {s.message || <span className="text-gray-600">—</span>}
                            </td>
                            <td className="py-3 pr-4">
                              {s.consumed ? (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-800/50 text-gray-400">DELIVERED</span>
                              ) : (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-900/30 text-yellow-400 border border-yellow-700/40">PENDING</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SUPPORT CHAT TAB */}
          {activeTab === 'support-chat' && (
            <div className="space-y-0">
              <div className="bg-tesla-card border border-tesla-border rounded-xl overflow-hidden">
                <div className="flex h-[600px]">
                  {/* Conversations List */}
                  <div className="w-72 border-r border-tesla-border flex flex-col shrink-0">
                    <div className="p-3 border-b border-tesla-border">
                      <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#CC0000" strokeWidth="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                        Live Chat
                      </h3>
                      <input
                        type="text"
                        value={chatSearchTerm}
                        onChange={async (e) => {
                          setChatSearchTerm(e.target.value);
                          setChatConversationsLoading(true);
                          try {
                            const res = await apiCall(`/api/admin/chat?search=${encodeURIComponent(e.target.value)}`);
                            const data = await res.json();
                            if (data.success) setChatConversations(data.data.conversations || []);
                          } catch { /* ignore */ }
                          setChatConversationsLoading(false);
                        }}
                        placeholder="Search users..."
                        className="mt-2 w-full bg-[#111] border border-tesla-border rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#CC0000]/50 transition-colors"
                      />
                    </div>
                    <div className="flex-1 overflow-y-auto">
                      {chatConversationsLoading ? (
                        <div className="p-4 text-center text-gray-500 text-xs">Loading...</div>
                      ) : chatConversations.length === 0 ? (
                        <div className="p-4 text-center text-gray-600 text-xs">No conversations yet</div>
                      ) : (
                        chatConversations.map((conv: any) => (
                          <button
                            key={conv.userId}
                            onClick={async () => {
                              setChatSelectedUserId(conv.userId);
                              setChatMessagesLoading(true);
                              try {
                                const res = await apiCall(`/api/admin/chat/${conv.userId}`);
                                const data = await res.json();
                                if (data.success) setChatMessages(data.data.messages || []);
                              } catch { /* ignore */ }
                              setChatMessagesLoading(false);
                            }}
                            className={`w-full text-left px-3 py-3 border-b border-tesla-border/50 hover:bg-white/5 transition-colors ${chatSelectedUserId === conv.userId ? 'bg-white/10 border-l-2 border-l-[#CC0000]' : ''}`}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-white text-xs font-medium truncate">{conv.user?.email || 'User'}</span>
                              {conv.unreadByAdmin > 0 && (
                                <span className="min-w-[16px] h-4 bg-[#CC0000] rounded-full flex items-center justify-center text-white text-[9px] font-bold px-1 shrink-0">{conv.unreadByAdmin}</span>
                              )}
                            </div>
                            {conv.lastMessage && (
                              <p className="text-gray-500 text-[10px] mt-0.5 truncate">
                                {conv.lastMessage.senderType === 'admin' ? 'You: ' : ''}{conv.lastMessage.message}
                              </p>
                            )}
                            {conv.lastMessage?.createdAt && (
                              <p className="text-gray-600 text-[9px] mt-0.5">
                                {new Date(conv.lastMessage.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </p>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Chat Messages */}
                  <div className="flex-1 flex flex-col min-w-0">
                    {chatSelectedUserId ? (
                      <>
                        {/* Chat Header */}
                        <div className="flex items-center gap-3 px-4 py-3 border-b border-tesla-border bg-[#111] shrink-0">
                          <div className="w-9 h-9 rounded-full bg-[#CC0000]/15 border border-[#CC0000]/30 flex items-center justify-center shrink-0">
                            <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
                              <path d="M12 5.362l2.475-3.026s4.245.09 8.471 2.054c-1.082 1.636-3.231 2.438-3.231 2.438-.146-1.439-1.154-1.79-4.354-1.79L12 24 8.619 5.034c-3.18 0-4.188.354-4.335 1.792 0 0-2.146-.795-3.229-2.43C5.28 2.431 9.525 2.34 9.525 2.34L12 5.362h-.004.004zm0-3.899c3.415-.03 7.326.528 11.328 2.28.535-.968.672-1.395.672-1.395C19.625.612 15.528.015 12 0 8.472.015 4.375.61 0 2.349c0 0 .195.525.672 1.396C4.674 1.989 8.585 1.435 12 1.46V1.463z" fill="#CC0000"/>
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-white font-semibold text-sm leading-tight truncate">
                              {chatConversations.find((c: any) => c.userId === chatSelectedUserId)?.user?.email || 'User'}
                            </h4>
                            <p className="text-[#CC0000] text-[11px] font-medium">Tesla Support</p>
                          </div>
                          <span className="text-[10px] text-gray-600">Replying as support</span>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
                          {chatMessagesLoading ? (
                            <div className="flex items-center justify-center h-full">
                              <div className="w-6 h-6 border-2 border-[#CC0000]/30 border-t-[#CC0000] rounded-full animate-spin" />
                            </div>
                          ) : chatMessages.length === 0 ? (
                            <div className="flex items-center justify-center h-full text-center">
                              <p className="text-gray-600 text-xs">No messages yet. Start the conversation!</p>
                            </div>
                          ) : (
                            chatMessages.map((msg: any) => (
                              <div key={msg.id} className={`flex ${msg.senderType === 'admin' ? 'justify-end' : 'justify-start'}`}>
                                <div className="max-w-[75%]">
                                  {msg.senderType === 'user' && (
                                    <p className="text-[10px] text-gray-500 mb-0.5 ml-1">User</p>
                                  )}
                                  <div className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                                    msg.senderType === 'admin'
                                      ? 'bg-[#CC0000] text-white rounded-br-sm'
                                      : 'bg-white/10 text-gray-200 rounded-bl-sm'
                                  }`}>
                                    {msg.message}
                                  </div>
                                  <p className={`text-[9px] text-gray-600 mt-0.5 ${msg.senderType === 'admin' ? 'text-right mr-1' : 'ml-1'}`}>
                                    {new Date(msg.createdAt).toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}
                                  </p>
                                </div>
                              </div>
                            ))
                          )}
                        </div>

                        {/* Input */}
                        <div className="border-t border-tesla-border px-3 py-2.5 bg-[#111] shrink-0">
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={chatInput}
                              onChange={(e) => setChatInput(e.target.value)}
                              onKeyDown={async (e) => {
                                if (e.key === 'Enter' && chatInput.trim() && !chatSending) {
                                  const msg = chatInput.trim();
                                  setChatInput('');
                                  setChatSending(true);
                                  try {
                                    const res = await apiCall('/api/admin/chat', {
                                      method: 'POST',
                                      body: JSON.stringify({ userId: chatSelectedUserId, message: msg }),
                                    });
                                    const data = await res.json();
                                    if (data.success) {
                                      setChatMessages(prev => [...prev, data.data]);
                                      // Refresh conversation list
                                      const convRes = await apiCall('/api/admin/chat');
                                      const convData = await convRes.json();
                                      if (convData.success) setChatConversations(convData.data.conversations || []);
                                    } else {
                                      showToast(data.error?.message || 'Failed to send');
                                      setChatInput(msg);
                                    }
                                  } catch {
                                    showToast('Network error');
                                    setChatInput(msg);
                                  }
                                  setChatSending(false);
                                }
                              }}
                              placeholder="Type as Tesla Support..."
                              disabled={chatSending}
                              className="flex-1 bg-white/5 border border-tesla-border rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#CC0000]/50 transition-colors disabled:opacity-50"
                            />
                            <button
                              onClick={async () => {
                                if (!chatInput.trim() || chatSending || !chatSelectedUserId) return;
                                const msg = chatInput.trim();
                                setChatInput('');
                                setChatSending(true);
                                try {
                                  const res = await apiCall('/api/admin/chat', {
                                    method: 'POST',
                                    body: JSON.stringify({ userId: chatSelectedUserId, message: msg }),
                                  });
                                  const data = await res.json();
                                  if (data.success) {
                                    setChatMessages(prev => [...prev, data.data]);
                                    const convRes = await apiCall('/api/admin/chat');
                                    const convData = await convRes.json();
                                    if (convData.success) setChatConversations(convData.data.conversations || []);
                                  } else {
                                    showToast(data.error?.message || 'Failed to send');
                                    setChatInput(msg);
                                  }
                                } catch {
                                  showToast('Network error');
                                  setChatInput(msg);
                                }
                                setChatSending(false);
                              }}
                              disabled={chatSending || !chatInput.trim()}
                              className="w-10 h-10 rounded-xl bg-[#CC0000] hover:bg-[#ff1a1a] disabled:opacity-30 text-white flex items-center justify-center transition-all shrink-0"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-center gap-3">
                        <div className="w-14 h-14 rounded-full bg-[#CC0000]/10 flex items-center justify-center">
                          <svg viewBox="0 0 24 24" className="w-8 h-8" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 5.362l2.475-3.026s4.245.09 8.471 2.054c-1.082 1.636-3.231 2.438-3.231 2.438-.146-1.439-1.154-1.79-4.354-1.79L12 24 8.619 5.034c-3.18 0-4.188.354-4.335 1.792 0 0-2.146-.795-3.229-2.43C5.28 2.431 9.525 2.34 9.525 2.34L12 5.362h-.004.004zm0-3.899c3.415-.03 7.326.528 11.328 2.28.535-.968.672-1.395.672-1.395C19.625.612 15.528.015 12 0 8.472.015 4.375.61 0 2.349c0 0 .195.525.672 1.396C4.674 1.989 8.585 1.435 12 1.46V1.463z" fill="#CC0000"/>
                          </svg>
                        </div>
                        <p className="text-white font-medium text-sm">Tesla Support Chat</p>
                        <p className="text-gray-500 text-xs max-w-xs">Select a conversation from the left to start chatting with users as Tesla Support.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MESSAGES TAB */}
          {activeTab === 'messages' && (
            <div className="space-y-6">
              <div className="bg-tesla-card border border-tesla-border rounded-xl p-6">
                <h3 className="text-white font-semibold mb-1 flex items-center gap-2">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#CC0000" strokeWidth="1.5"><path d="M22 2L11 13"/><path d="M22 2L15 22L11 13L2 9L22 2Z"/></svg>
                  Send Message to Clients
                </h3>
                <p className="text-gray-500 text-xs mb-5">Broadcast announcements, billing notices, or custom messages. Messages appear as in-app notifications and optionally as emails.</p>

                {/* Recipient toggle */}
                <div className="mb-5">
                  <label className="block text-gray-400 text-xs font-medium mb-2">Recipients</label>
                  <div className="flex gap-3">
                    <button onClick={() => setMsgBroadcast(true)} className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all border ${msgBroadcast ? 'bg-[#CC0000]/10 border-[#CC0000]/30 text-[#CC0000]' : 'bg-white/5 border-tesla-border text-gray-500 hover:border-gray-600'}`}>
                      All Users (Broadcast)
                    </button>
                    <button onClick={() => setMsgBroadcast(false)} className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all border ${!msgBroadcast ? 'bg-[#CC0000]/10 border-[#CC0000]/30 text-[#CC0000]' : 'bg-white/5 border-tesla-border text-gray-500 hover:border-gray-600'}`}>
                      Selected Users
                    </button>
                  </div>
                </div>

                {/* User picker */}
                {!msgBroadcast && (
                  <div className="mb-5">
                    <label className="block text-gray-400 text-xs font-medium mb-2">Select Users</label>
                    <div className="max-h-48 overflow-y-auto border border-tesla-border rounded-lg bg-[#111]">
                      {users.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 text-sm">No users found. They will appear here when registered.</div>
                      ) : (
                        users.map(u => (
                          <label key={u.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 cursor-pointer border-b border-tesla-border/50 last:border-0">
                            <input type="checkbox" checked={msgSelectedUsers.includes(u.id)} onChange={(e) => {
                              if (e.target.checked) setMsgSelectedUsers([...msgSelectedUsers, u.id]);
                              else setMsgSelectedUsers(msgSelectedUsers.filter(id => id !== u.id));
                            }} className="accent-[#CC0000] w-4 h-4" />
                            <span className="text-sm text-gray-300">{u.email}</span>
                            <span className="ml-auto text-[10px] text-gray-600 capitalize">{u.status}</span>
                          </label>
                        ))
                      )}
                    </div>
                    <p className="text-xs text-gray-600 mt-1.5">{msgSelectedUsers.length} user(s) selected</p>
                  </div>
                )}

                {/* Message type */}
                <div className="mb-5">
                  <label className="block text-gray-400 text-xs font-medium mb-2">Message Type</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: 'custom', label: 'Custom', desc: 'General message' },
                      { value: 'billing', label: 'Billing', desc: 'Payment notice' },
                      { value: 'announcement', label: 'Announcement', desc: 'Platform update' },
                    ].map(t => (
                      <button key={t.value} onClick={() => setMsgType(t.value)} className={`py-3 px-3 rounded-lg text-center transition-all border ${msgType === t.value ? 'bg-[#CC0000]/10 border-[#CC0000]/30 text-[#CC0000]' : 'bg-white/5 border-tesla-border text-gray-500 hover:border-gray-600'}`}>
                        <p className="text-sm font-medium">{t.label}</p>
                        <p className="text-[10px] text-gray-600 mt-0.5">{t.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Subject */}
                <div className="mb-5">
                  <label className="block text-gray-400 text-xs font-medium mb-2">Subject</label>
                  <input type="text" value={msgSubject} onChange={e => setMsgSubject(e.target.value)} placeholder="Enter message subject..." className="w-full bg-[#111] border border-tesla-border rounded-lg px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#CC0000] transition-colors" />
                </div>

                {/* Message body */}
                <div className="mb-5">
                  <label className="block text-gray-400 text-xs font-medium mb-2">Message</label>
                  <textarea value={msgBody} onChange={e => setMsgBody(e.target.value)} placeholder="Type your message to clients... Include billing details, payment instructions, announcements, or any important information." rows={6} className="w-full bg-[#111] border border-tesla-border rounded-lg px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#CC0000] transition-colors resize-none" />
                </div>

                {/* Email toggle */}
                <div className="flex items-center justify-between py-3 px-4 rounded-lg bg-white/5 border border-tesla-border mb-6">
                  <div className="flex items-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13"/><path d="M22 2L15 22L11 13L2 9L22 2Z"/></svg>
                    <span className="text-sm text-gray-400">Also send as email</span>
                    <span className="text-xs text-gray-600">(requires email configuration)</span>
                  </div>
                  <button onClick={() => setMsgSendEmail(!msgSendEmail)} className={`w-11 h-6 rounded-full transition-all relative ${msgSendEmail ? 'bg-[#CC0000]' : 'bg-gray-700'}`}>
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${msgSendEmail ? 'left-6' : 'left-1'}`} />
                  </button>
                </div>

                {/* Send button */}
                <button
                  onClick={async () => {
                    if (!msgSubject.trim() || !msgBody.trim()) { showToast('Subject and message are required'); return; }
                    if (!msgBroadcast && msgSelectedUsers.length === 0) { showToast('Select at least one user'); return; }
                    setMsgSending(true);
                    try {
                      const payload: any = {
                        subject: msgSubject.trim(),
                        message: msgBody.trim(),
                        type: msgType,
                        sendEmail: msgSendEmail,
                      };
                      if (msgBroadcast) payload.allUsers = true;
                      else payload.userIds = msgSelectedUsers;
                      const res = await apiCall('/api/admin/messages', { method: 'POST', body: JSON.stringify(payload) });
                      const data = await res.json();
                      if (data.success) {
                        showToast(`Message sent to ${data.data?.recipients || 0} users!`);
                        setMsgSubject(''); setMsgBody(''); setMsgSelectedUsers([]);
                      } else showToast(data.error?.message || 'Failed to send');
                    } catch { showToast('Network error'); }
                    setMsgSending(false);
                  }}
                  disabled={msgSending}
                  className="w-full bg-[#CC0000] hover:bg-[#ff1a1a] disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
                >
                  {msgSending ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeOpacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>
                      Sending...
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13"/><path d="M22 2L15 22L11 13L2 9L22 2Z"/></svg>
                      {msgBroadcast ? 'Broadcast to All Users' : `Send to ${msgSelectedUsers.length} User(s)`}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* AUDIT LOG TAB */}
          {activeTab === 'audit' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-semibold text-sm">Audit Log</h3>
                <span className="text-gray-500 text-xs">{auditTotal} total entries</span>
              </div>

              {auditLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="bg-tesla-card border border-tesla-border rounded-lg p-4 animate-pulse">
                      <div className="flex gap-3">
                        <div className="h-4 w-24 bg-gray-700 rounded" />
                        <div className="h-4 w-16 bg-gray-700 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="bg-tesla-card border border-tesla-border rounded-xl p-10 text-center">
                  <p className="text-gray-500 text-sm">No audit log entries found.</p>
                  <p className="text-gray-600 text-xs mt-1">Admin actions will appear here as you manage users, deposits, and withdrawals.</p>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    {auditLogs.map((log: any) => {
                      let parsedDetails: any = null;
                      try { parsedDetails = log.details ? JSON.parse(log.details) : null; } catch { /* ignore */ }

                      const actionColors: Record<string, string> = {
                        update_status: 'bg-blue-600/15 text-blue-400',
                        update_kyc_level: 'bg-purple-600/15 text-purple-400',
                        email_verify: 'bg-green-600/15 text-green-400',
                        adjust_balance: 'bg-amber-600/15 text-amber-400',
                        delete_user: 'bg-red-600/15 text-red-400',
                        approve_deposit: 'bg-green-600/15 text-green-400',
                        reject_deposit: 'bg-red-600/15 text-red-400',
                        approve_withdrawal: 'bg-green-600/15 text-green-400',
                        reject_withdrawal: 'bg-red-600/15 text-red-400',
                        approve_kyc: 'bg-green-600/15 text-green-400',
                        reject_kyc: 'bg-red-600/15 text-red-400',
                      };

                      return (
                        <div key={log.id} className="bg-tesla-card border border-tesla-border rounded-lg p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${actionColors[log.action] || 'bg-gray-600/15 text-gray-400'}`}>
                                  {log.action?.replace(/_/g, ' ') || 'Unknown'}
                                </span>
                                {log.adminEmail && (
                                  <span className="text-gray-500 text-xs">by {log.adminEmail}</span>
                                )}
                              </div>
                              {log.userEmail && (
                                <p className="text-gray-400 text-xs mt-1">Target: {log.userEmail}</p>
                              )}
                              {parsedDetails && (
                                <div className="mt-1.5 bg-[#1a1a1a] rounded px-2.5 py-1.5 text-[11px] text-gray-500 font-mono max-w-md truncate">
                                  {typeof parsedDetails === 'string' ? parsedDetails : JSON.stringify(parsedDetails)}
                                </div>
                              )}
                            </div>
                            <span className="text-gray-600 text-[10px] whitespace-nowrap shrink-0">
                              {log.createdAt ? new Date(log.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {auditTotal > 20 && (
                    <div className="flex items-center justify-between pt-2">
                      <button
                        onClick={() => { const p = auditPage - 1; setAuditPage(p); fetchAuditLog(p); }}
                        disabled={auditPage <= 1}
                        className="px-4 py-2 rounded-lg text-xs font-semibold border border-tesla-border text-gray-400 hover:text-white hover:border-gray-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <span className="text-gray-500 text-xs">Page {auditPage}</span>
                      <button
                        onClick={() => { const p = auditPage + 1; setAuditPage(p); fetchAuditLog(p); }}
                        disabled={auditLogs.length < 20}
                        className="px-4 py-2 rounded-lg text-xs font-semibold border border-tesla-border text-gray-400 hover:text-white hover:border-gray-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* VEHICLES TAB */}
          {activeTab === 'vehicles' && (
            <VehicleManagement showToast={showToast} />
          )}

          {/* SETTINGS TAB */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <h3 className="text-white font-semibold text-sm">Site Settings</h3>

              {/* About Page Photo */}
              <div className="bg-tesla-card border border-tesla-border rounded-xl p-6">
                <h4 className="text-white font-medium mb-1">About Page Photo</h4>
                <p className="text-gray-500 text-xs mb-5">Upload a photo for the About page leadership section. Max 5MB. JPG, PNG, WebP.</p>

                <div className="flex flex-col sm:flex-row items-start gap-6">
                  <div className="w-40 h-40 rounded-2xl overflow-hidden border border-tesla-border bg-[#1a1a1a] shrink-0">
                    {settingsPhotoUrl ? (
                      <img src={settingsPhotoUrl} alt="Current About Photo" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs">No photo set</div>
                    )}
                  </div>
                  <div className="flex flex-col gap-3 flex-1">
                    <label className="cursor-pointer inline-flex items-center gap-2 bg-[#CC0000] hover:bg-[#ff1a1a] text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                      {settingsLoading ? 'Uploading...' : 'Upload Photo'}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (file.size > 5 * 1024 * 1024) { showToast('File too large. Max 5MB.'); return; }
                          setSettingsLoading(true);
                          try {
                            const fd = new FormData();
                            fd.append('photo', file);
                            fd.append('target', 'about');
                            const token = localStorage.getItem('adminToken');
                            const res = await fetch('/api/admin/settings', { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: fd });
                            const data = await res.json();
                            if (data.success) { setSettingsPhotoUrl(data.data.aboutPhotoUrl); showToast('Photo updated!'); }
                            else showToast(data.error?.message || 'Upload failed');
                          } catch { showToast('Upload failed'); }
                          setSettingsLoading(false);
                        }}
                      />
                    </label>
                    <input type="text" placeholder="Or paste an image URL..." className="bg-[#1a1a1a] border border-tesla-border rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#CC0000] transition-colors" defaultValue={settingsPhotoUrl || ''} id="aboutUrlInput"
                      onKeyDown={async (e) => { if (e.key === 'Enter') { const url = (e.target as HTMLInputElement).value.trim(); if (!url) return; setSettingsLoading(true); try { const token = localStorage.getItem('adminToken'); const res = await fetch('/api/admin/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ aboutPhotoUrl: url }) }); const data = await res.json(); if (data.success) { setSettingsPhotoUrl(data.data.aboutPhotoUrl); showToast('Photo URL updated!'); } else showToast(data.error?.message || 'Update failed'); } catch { showToast('Update failed'); } setSettingsLoading(false); } }}
                    />
                    <button onClick={async () => { const url = (document.getElementById('aboutUrlInput') as HTMLInputElement)?.value.trim(); if (!url) return; setSettingsLoading(true); try { const token = localStorage.getItem('adminToken'); const res = await fetch('/api/admin/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ aboutPhotoUrl: url }) }); const data = await res.json(); if (data.success) { setSettingsPhotoUrl(data.data.aboutPhotoUrl); showToast('Photo URL updated!'); } else showToast(data.error?.message || 'Update failed'); } catch { showToast('Update failed'); } setSettingsLoading(false); }} className="bg-white/5 hover:bg-white/10 text-white text-xs font-medium px-4 py-2 rounded-lg border border-tesla-border transition-colors self-start">Save URL</button>
                  </div>
                </div>
              </div>

              {/* Payment Addresses */}
              <div className="bg-tesla-card border border-tesla-border rounded-xl p-6">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-white font-medium">Payment Addresses</h4>
                  <button
                    onClick={() => { setEditingAddress(null); setAddrForm({ label: '', currency: 'BTC', network: '', address: '', qrCodeUrl: '', isActive: true, sortOrder: 0 }); setShowAddAddress(true); }}
                    className="inline-flex items-center gap-1.5 bg-[#CC0000] hover:bg-[#ff1a1a] text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                    Add Address
                  </button>
                </div>
                <p className="text-gray-500 text-xs mb-4">Manage cryptocurrency wallet addresses shown to users on the deposit page.</p>

                {addressesLoading && paymentAddresses.length === 0 ? (
                  <div className="text-center text-gray-500 py-6 text-sm">Loading addresses...</div>
                ) : paymentAddresses.length === 0 && !showAddAddress ? (
                  <div className="text-center text-gray-500 py-6 text-sm">No payment addresses configured. Click "Add Address" to create one.</div>
                ) : (
                  <div className="space-y-3">
                    {paymentAddresses.map((addr: any) => (
                      <div key={addr.id} className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${addr.isActive ? 'bg-[#1a1a1a] border-tesla-border' : 'bg-[#111] border-tesla-border/50 opacity-50'}`}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-white text-sm font-medium">{addr.label}</span>
                            <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-[#CC0000]/10 text-[#CC0000]">{addr.currency}</span>
                            {addr.network && <span className="text-gray-500 text-[10px]">{addr.network}</span>}
                            {!addr.isActive && <span className="text-[10px] text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">Inactive</span>}
                          </div>
                          <div className="text-gray-400 text-xs font-mono truncate" title={addr.address}>{addr.address}</div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => { setEditingAddress(addr); setAddrForm({ label: addr.label, currency: addr.currency, network: addr.network || '', address: addr.address, qrCodeUrl: addr.qrCodeUrl || '', isActive: addr.isActive, sortOrder: addr.sortOrder }); setShowAddAddress(true); }}
                            className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors" title="Edit"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                          </button>
                          <button
                            onClick={async () => {
                              if (!confirm(`Delete ${addr.label} (${addr.currency}) address?`)) return;
                              setAddressesLoading(true);
                              try {
                                const res = await apiCall(`/api/admin/payment-addresses?id=${addr.id}`, { method: 'DELETE' });
                                const data = await res.json();
                                if (data.success) { showToast('Address deleted'); fetchPaymentAddresses(); }
                                else showToast(data.error?.message || 'Delete failed');
                              } catch { showToast('Delete failed'); }
                              setAddressesLoading(false);
                            }}
                            className="p-1.5 rounded-lg hover:bg-red-900/30 text-gray-400 hover:text-red-400 transition-colors" title="Delete"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                          </button>
                          <button
                            onClick={async () => {
                              setAddressesLoading(true);
                              try {
                                const res = await apiCall('/api/admin/payment-addresses', { method: 'PUT', body: JSON.stringify({ id: addr.id, isActive: !addr.isActive }) });
                                const data = await res.json();
                                if (data.success) { showToast(addr.isActive ? 'Address deactivated' : 'Address activated'); fetchPaymentAddresses(); }
                                else showToast(data.error?.message || 'Toggle failed');
                              } catch { showToast('Toggle failed'); }
                              setAddressesLoading(false);
                            }}
                            className={`p-1.5 rounded-lg transition-colors ${addr.isActive ? 'hover:bg-yellow-900/30 text-green-400 hover:text-yellow-400' : 'hover:bg-green-900/30 text-gray-400 hover:text-green-400'}`} title={addr.isActive ? 'Deactivate' : 'Activate'}
                          >
                            {addr.isActive ? (
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                            ) : (
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add/Edit Address Form */}
                {showAddAddress && (
                  <div className="mt-4 bg-[#111] border border-tesla-border rounded-xl p-4 space-y-3">
                    <h5 className="text-white text-sm font-medium">{editingAddress ? 'Edit Address' : 'New Payment Address'}</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-gray-400 text-xs font-medium mb-1">Label</label>
                        <input type="text" value={addrForm.label} onChange={e => setAddrForm({ ...addrForm, label: e.target.value })} placeholder="e.g. Main BTC Wallet" className="w-full bg-[#1a1a1a] border border-tesla-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#CC0000] transition-colors" />
                      </div>
                      <div>
                        <label className="block text-gray-400 text-xs font-medium mb-1">Currency</label>
                        <select value={addrForm.currency} onChange={e => setAddrForm({ ...addrForm, currency: e.target.value })} className="w-full bg-[#1a1a1a] border border-tesla-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#CC0000] transition-colors">
                          <option value="BTC">Bitcoin (BTC)</option>
                          <option value="ETH">Ethereum (ETH)</option>
                          <option value="USDT">Tether (USDT)</option>
                          <option value="USDC">USD Coin (USDC)</option>
                          <option value="BNB">Binance Coin (BNB)</option>
                          <option value="SOL">Solana (SOL)</option>
                          <option value="XRP">Ripple (XRP)</option>
                          <option value="ADA">Cardano (ADA)</option>
                          <option value="DOGE">Dogecoin (DOGE)</option>
                          <option value="TRON">TRON (TRX)</option>
                          <option value="LTC">Litecoin (LTC)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-gray-400 text-xs font-medium mb-1">Network (optional)</label>
                        <input type="text" value={addrForm.network} onChange={e => setAddrForm({ ...addrForm, network: e.target.value })} placeholder="e.g. ERC-20, TRC-20, Bitcoin" className="w-full bg-[#1a1a1a] border border-tesla-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#CC0000] transition-colors" />
                      </div>
                      <div>
                        <label className="block text-gray-400 text-xs font-medium mb-1">Sort Order</label>
                        <input type="number" value={addrForm.sortOrder} onChange={e => setAddrForm({ ...addrForm, sortOrder: parseInt(e.target.value) || 0 })} className="w-full bg-[#1a1a1a] border border-tesla-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#CC0000] transition-colors" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-gray-400 text-xs font-medium mb-1">Wallet Address</label>
                      <input type="text" value={addrForm.address} onChange={e => setAddrForm({ ...addrForm, address: e.target.value })} placeholder="Enter the wallet address" className="w-full bg-[#1a1a1a] border border-tesla-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#CC0000] transition-colors font-mono" />
                    </div>
                    <div>
                      <label className="block text-gray-400 text-xs font-medium mb-1">QR Code URL (optional)</label>
                      <input type="text" value={addrForm.qrCodeUrl} onChange={e => setAddrForm({ ...addrForm, qrCodeUrl: e.target.value })} placeholder="Paste QR code image URL" className="w-full bg-[#1a1a1a] border border-tesla-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#CC0000] transition-colors" />
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="addrActive" checked={addrForm.isActive} onChange={e => setAddrForm({ ...addrForm, isActive: e.target.checked })} className="accent-[#CC0000]" />
                      <label htmlFor="addrActive" className="text-gray-300 text-sm">Active (visible to users)</label>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={async () => {
                          if (!addrForm.label.trim() || !addrForm.address.trim()) { showToast('Label and address are required'); return; }
                          setAddressesLoading(true);
                          try {
                            const method = editingAddress ? 'PUT' : 'POST';
                            const body = editingAddress ? { ...addrForm, id: editingAddress.id } : addrForm;
                            const res = await apiCall('/api/admin/payment-addresses', { method, body: JSON.stringify(body) });
                            const data = await res.json();
                            if (data.success) {
                              showToast(editingAddress ? 'Address updated!' : 'Address created!');
                              setShowAddAddress(false);
                              setEditingAddress(null);
                              fetchPaymentAddresses();
                            } else {
                              showToast(data.error?.message || 'Save failed');
                            }
                          } catch { showToast('Save failed'); }
                          setAddressesLoading(false);
                        }}
                        disabled={addressesLoading}
                        className="bg-[#CC0000] hover:bg-[#ff1a1a] disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                      >
                        {addressesLoading ? 'Saving...' : editingAddress ? 'Update Address' : 'Create Address'}
                      </button>
                      <button onClick={() => { setShowAddAddress(false); setEditingAddress(null); }} className="bg-white/5 hover:bg-white/10 text-gray-300 text-sm px-4 py-2 rounded-lg border border-tesla-border transition-colors">Cancel</button>
                    </div>
                  </div>
                )}
              </div>

              {/* Elon Photo (Homepage Hero) */}
              <div className="bg-tesla-card border border-tesla-border rounded-xl p-6">
                <h4 className="text-white font-medium mb-1">Homepage Hero Photo (CEO Portrait)</h4>
                <p className="text-gray-500 text-xs mb-5">Upload a photo displayed on the homepage hero section. This appears as a circular portrait. Max 5MB.</p>

                <div className="flex flex-col sm:flex-row items-start gap-6">
                  <div className="w-40 h-40 rounded-full overflow-hidden border-4 border-[#CC0000]/30 bg-[#1a1a1a] shrink-0">
                    {elonPhotoUrl ? (
                      <img src={elonPhotoUrl} alt="Current CEO Photo" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs">No photo set</div>
                    )}
                  </div>
                  <div className="flex flex-col gap-3 flex-1">
                    <label className="cursor-pointer inline-flex items-center gap-2 bg-[#CC0000] hover:bg-[#ff1a1a] text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                      {settingsLoading ? 'Uploading...' : 'Upload CEO Photo'}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (file.size > 5 * 1024 * 1024) { showToast('File too large. Max 5MB.'); return; }
                          setSettingsLoading(true);
                          try {
                            const fd = new FormData();
                            fd.append('photo', file);
                            fd.append('target', 'elon');
                            const token = localStorage.getItem('adminToken');
                            const res = await fetch('/api/admin/settings', { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: fd });
                            const data = await res.json();
                            if (data.success) { setElonPhotoUrl(data.data.elonPhotoUrl); showToast('CEO photo updated!'); }
                            else showToast(data.error?.message || 'Upload failed');
                          } catch { showToast('Upload failed'); }
                          setSettingsLoading(false);
                        }}
                      />
                    </label>
                    <input type="text" placeholder="Or paste CEO photo URL..." className="bg-[#1a1a1a] border border-tesla-border rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#CC0000] transition-colors" defaultValue={elonPhotoUrl || ''} id="elonUrlInput"
                      onKeyDown={(e) => { if (e.key === 'Enter') { saveElonUrl((e.target as HTMLInputElement).value.trim()); } }}
                    />
                    <button onClick={() => saveElonUrl()} className="bg-white/5 hover:bg-white/10 text-white text-xs font-medium px-4 py-2 rounded-lg border border-tesla-border transition-colors self-start">Save URL</button>
                  </div>
                </div>
              </div>

              {/* Homepage Slideshow */}
              <SlideshowEditor token={typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null} showToast={showToast} />
            </div>
          )}

        </div>
      </main>
    </div>
  );
}