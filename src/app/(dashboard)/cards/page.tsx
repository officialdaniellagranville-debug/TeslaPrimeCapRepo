'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { CreditCard, Plus, Snowflake, ChevronRight, Shield, Eye, EyeOff, AlertCircle, Settings } from 'lucide-react';

interface CardData {
  id: string; type: string; status: string; lastFour?: string;
  expiryMonth?: string; expiryYear?: string; cardBrand?: string;
  color?: string; spendingLimit?: number; monthlySpend?: number;
  frozen: boolean;
}

const MOCK_TRANSACTIONS = [
  { id: 't1', merchant: 'Amazon', amount: -89.99, date: '2024-12-15', status: 'Completed', icon: 'A' },
  { id: 't2', merchant: 'Starbucks', amount: -6.50, date: '2024-12-14', status: 'Completed', icon: 'S' },
  { id: 't3', merchant: 'Netflix', amount: -15.99, date: '2024-12-13', status: 'Completed', icon: 'N' },
  { id: 't4', merchant: 'Whole Foods', amount: -127.43, date: '2024-12-12', status: 'Completed', icon: 'W' },
  { id: 't5', merchant: 'Uber', amount: -24.00, date: '2024-12-11', status: 'Pending', icon: 'U' },
];

function ChipIcon() {
  return (
    <svg width="42" height="32" viewBox="0 0 42 32" fill="none">
      <rect x="1" y="1" width="40" height="30" rx="4" fill="#D4AF37" stroke="#B8962E" strokeWidth="1" />
      <line x1="1" y1="12" x2="41" y2="12" stroke="#B8962E" strokeWidth="0.8" />
      <line x1="1" y1="20" x2="41" y2="20" stroke="#B8962E" strokeWidth="0.8" />
      <line x1="14" y1="1" x2="14" y2="31" stroke="#B8962E" strokeWidth="0.8" />
      <line x1="28" y1="1" x2="28" y2="31" stroke="#B8962E" strokeWidth="0.8" />
    </svg>
  );
}

function ContactlessIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round">
      <path d="M8.5 16.5a5 5 0 0 1 0-9" />
      <path d="M5.5 19.5a9 9 0 0 1 0-15" />
      <path d="M2 22a13 13 0 0 1 0-20" />
    </svg>
  );
}

function VisaLogo() {
  return (
    <svg width="48" height="16" viewBox="0 0 48 16" fill="none">
      <text x="0" y="13" fill="white" fontSize="14" fontWeight="bold" fontFamily="serif" fontStyle="italic">VISA</text>
    </svg>
  );
}

export default function CardsPage() {
  const [cards, setCards] = useState<CardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPin, setShowPin] = useState(false);
  const [pinModal, setPinModal] = useState(false);
  const [limitModal, setLimitModal] = useState(false);
  const [spendingLimit, setSpendingLimit] = useState('5000');
  const [cardTilt, setCardTilt] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    fetch('/api/cards', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => { if (d.success) setCards(d.data || []); }).catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const toggleFreeze = async (card: CardData) => {
    try {
      const res = await fetch('/api/cards', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ cardId: card.id, action: card.frozen ? 'unfreeze' : 'freeze' }),
      });
      const d = await res.json();
      if (d.success) setCards(prev => prev.map(c => c.id === card.id ? { ...c, frozen: !c.frozen, status: !c.frozen ? 'frozen' : 'active' } : c));
    } catch {}
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setCardTilt({ x: y * -12, y: x * 12 });
  };

  const handleMouseLeave = () => setCardTilt({ x: 0, y: 0 });

  const statusColor = (s: string) => {
    const m: Record<string, string> = { active: 'text-green-400 bg-green-400/10', frozen: 'text-blue-400 bg-blue-400/10', pending: 'text-yellow-400 bg-yellow-400/10', cancelled: 'text-red-400 bg-red-400/10' };
    return m[s] || 'text-gray-400 bg-gray-400/10';
  };

  const primaryCard = cards.length > 0 ? cards[0] : null;
  const frozen = primaryCard?.frozen || false;
  const lastFour = primaryCard?.lastFour || '4521';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-white font-bold text-lg">Your Cards</h2>
          <p className="text-gray-500 text-sm mt-0.5">Manage your virtual and physical cards</p>
        </div>
        <div className="flex gap-3">
          <Link href="/cards/apply?type=virtual" className="flex items-center gap-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors">
            <Plus className="w-4 h-4" /> Virtual Card
          </Link>
          <Link href="/cards/apply?type=physical" className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors">
            <Plus className="w-4 h-4" /> Physical Card
          </Link>
        </div>
      </div>

      {/* Premium Visual Bank Card */}
      <div className="flex justify-center">
        <div
          ref={cardRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="w-full max-w-[400px] aspect-[1.586/1] rounded-2xl relative overflow-hidden cursor-pointer select-none"
          style={{
            background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 40%, #1E3A8A 100%)',
            transform: `perspective(800px) rotateX(${cardTilt.x}deg) rotateY(${cardTilt.y}deg)`,
            transition: 'transform 0.15s ease-out',
          }}
        >
          {/* Decorative circles */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-36 h-36 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-white/[0.02] rounded-full" />

          {/* Shine overlay */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `linear-gradient(${105 + cardTilt.y * 2}deg, transparent 30%, rgba(255,255,255,0.06) 45%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.06) 55%, transparent 70%)`,
              transition: 'background 0.15s ease-out',
            }}
          />

          {/* Frozen overlay */}
          {frozen && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-20">
              <Snowflake className="w-14 h-14 text-blue-300 animate-pulse" />
            </div>
          )}

          {/* Card content */}
          <div className="relative z-10 flex flex-col justify-between h-full p-6 sm:p-7">
            {/* Top row */}
            <div className="flex justify-between items-start">
              <div>
                <p className="text-white/90 text-sm font-bold tracking-wide">CoreWealth</p>
                <p className="text-white/40 text-[9px] uppercase tracking-widest mt-0.5">Platinum Debit</p>
              </div>
              <div className="flex items-center gap-2">
                <ContactlessIcon />
                <VisaLogo />
              </div>
            </div>

            {/* Chip + Number */}
            <div className="space-y-4">
              <ChipIcon />
              <p className="text-white text-base sm:text-lg font-mono tracking-[0.22em]">
                •••• •••• •••• {lastFour}
              </p>
            </div>

            {/* Bottom row */}
            <div className="flex justify-between items-end">
              <div>
                <p className="text-white/40 text-[8px] uppercase tracking-wider">Card Holder</p>
                <p className="text-white/90 text-xs sm:text-sm font-medium tracking-wide">COREWEALTH MEMBER</p>
              </div>
              <div className="text-right">
                <p className="text-white/40 text-[8px] uppercase tracking-wider">Expires</p>
                <p className="text-white/90 text-xs sm:text-sm font-mono">12/28</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Card Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {primaryCard ? [
          {
            label: frozen ? 'Unfreeze Card' : 'Freeze Card',
            icon: <Snowflake className="w-4 h-4" />,
            action: () => toggleFreeze(primaryCard),
            active: frozen,
          },
          {
            label: 'View PIN',
            icon: showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />,
            action: () => setPinModal(true),
            active: false,
          },
          {
            label: 'Report Lost',
            icon: <AlertCircle className="w-4 h-4" />,
            action: () => {},
            active: false,
            danger: true,
          },
          {
            label: 'Spending Limit',
            icon: <Settings className="w-4 h-4" />,
            action: () => setLimitModal(true),
            active: false,
          },
        ].map((action, i) => (
          <button
            key={i}
            onClick={action.action}
            className={`bg-white/5 border border-white/10 backdrop-blur rounded-xl p-4 flex flex-col items-center gap-2 transition-all hover:bg-white/10 ${action.active ? 'border-blue-400/30' : ''} ${'danger' in action && action.danger ? 'hover:border-red-400/30 hover:text-red-400' : ''}`}
          >
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${action.active ? 'bg-blue-500/10 text-blue-400' : 'bg-[#2563EB]/10 text-[#60A5FA]'}`}>
              {action.icon}
            </div>
            <span className="text-white text-xs font-medium">{action.label}</span>
          </button>
        )) : (
          [0, 1, 2, 3].map(i => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col items-center gap-2 animate-pulse">
              <div className="w-9 h-9 rounded-lg bg-white/5" />
              <div className="w-16 h-3 rounded bg-white/5" />
            </div>
          ))
        )}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { href: '/cards/apply', label: 'Apply for Card', desc: 'Get a new virtual or physical card' },
          { href: '/cards/manage', label: 'Manage Card', desc: 'Card settings and controls' },
          { href: '/cards/tracking', label: 'Card Tracking', desc: 'Track physical card delivery' },
        ].map(link => (
          <Link key={link.href} href={link.href} className="bg-white/5 border border-white/10 backdrop-blur rounded-xl p-4 flex items-center gap-3 hover:bg-white/10 hover:border-[#2563EB]/20 transition-all group">
            <div className="w-9 h-9 rounded-lg bg-[#2563EB]/10 flex items-center justify-center text-[#60A5FA] shrink-0">
              <CreditCard className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium">{link.label}</p>
              <p className="text-gray-500 text-xs">{link.desc}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-[#60A5FA] transition-colors" />
          </Link>
        ))}
      </div>

      {/* Recent Card Transactions */}
      <div className="bg-white/5 border border-white/10 backdrop-blur rounded-xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <h3 className="text-white font-semibold text-sm">Recent Card Transactions</h3>
          <Link href="/transactions" className="text-[#60A5FA] text-xs font-medium hover:underline">View All</Link>
        </div>
        <div className="divide-y divide-white/5">
          {MOCK_TRANSACTIONS.map(tx => (
            <div key={tx.id} className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors">
              <div className="w-9 h-9 rounded-full bg-[#2563EB]/10 flex items-center justify-center text-[#60A5FA] text-xs font-bold shrink-0">
                {tx.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{tx.merchant}</p>
                <p className="text-gray-500 text-xs">{new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-red-400 text-sm font-mono font-medium">-${Math.abs(tx.amount).toFixed(2)}</p>
                <p className={`text-[10px] ${tx.status === 'Completed' ? 'text-green-400' : 'text-yellow-400'}`}>{tx.status}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Card Features */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: <Shield className="w-5 h-5" />, title: 'Instant Freeze', desc: 'Lock your card instantly if misplaced. Unlock anytime.' },
          { icon: <CreditCard className="w-5 h-5" />, title: 'Spending Limits', desc: 'Set daily, weekly, or monthly spending caps.' },
          { icon: <Eye className="w-5 h-5" />, title: 'Virtual Cards', desc: 'Get a virtual card instantly for online purchases.' },
        ].map(f => (
          <div key={f.title} className="bg-white/5 border border-white/10 backdrop-blur rounded-xl p-4 flex gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#2563EB]/10 flex items-center justify-center text-[#60A5FA] shrink-0">{f.icon}</div>
            <div>
              <p className="text-white font-semibold text-sm">{f.title}</p>
              <p className="text-gray-500 text-xs mt-0.5 leading-relaxed">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* PIN Modal */}
      {pinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0d1117] border border-white/10 rounded-2xl p-6 max-w-sm w-full space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-semibold">Card PIN</h3>
              <button onClick={() => setPinModal(false)} className="text-gray-500 hover:text-white transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <div className="flex items-center gap-3 justify-center py-4">
              <span className="text-white text-3xl font-mono tracking-[0.5em]">
                {showPin ? '••••' : '****'}
              </span>
            </div>
            <button
              onClick={() => setShowPin(!showPin)}
              className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-medium py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {showPin ? 'Hide PIN' : 'Reveal PIN'}
            </button>
            <p className="text-gray-500 text-xs text-center">For security, your PIN is masked by default</p>
          </div>
        </div>
      )}

      {/* Spending Limit Modal */}
      {limitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0d1117] border border-white/10 rounded-2xl p-6 max-w-sm w-full space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-semibold">Set Spending Limit</h3>
              <button onClick={() => setLimitModal(false)} className="text-gray-500 hover:text-white transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <div>
              <label className="text-gray-400 text-xs font-medium block mb-1.5">Monthly Spending Limit ($)</label>
              <input
                type="number"
                value={spendingLimit}
                onChange={e => setSpendingLimit(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-mono outline-none focus:border-[#2563EB]/50 transition-colors"
              />
            </div>
            <div className="grid grid-cols-4 gap-2">
              {['1000', '2500', '5000', '10000'].map(v => (
                <button
                  key={v}
                  onClick={() => setSpendingLimit(v)}
                  className={`text-xs py-2 rounded-lg font-medium transition-colors ${spendingLimit === v ? 'bg-[#2563EB] text-white' : 'bg-white/5 text-gray-400 hover:text-white'}`}
                >
                  ${Number(v).toLocaleString()}
                </button>
              ))}
            </div>
            <button
              onClick={() => setLimitModal(false)}
              className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-sm py-3 rounded-xl transition-colors"
            >
              Save Limit
            </button>
          </div>
        </div>
      )}
</div>
  );
}
