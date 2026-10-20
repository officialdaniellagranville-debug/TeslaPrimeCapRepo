'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Snowflake, Eye, EyeOff, Settings, AlertTriangle, Copy, Check, DollarSign, Lock, CreditCard } from 'lucide-react';

export default function ManageCardPage() {
  const params = useSearchParams();
  const cardId = params.get('id');
  const [card, setCard] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCvv, setShowCvv] = useState(false);
  const [showFullNumber, setShowFullNumber] = useState(false);
  const [copied, setCopied] = useState('');
  const [limitModal, setLimitModal] = useState(false);
  const [newLimit, setNewLimit] = useState('');
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    Promise.all([
      fetch('/api/cards', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch('/api/wallet/transactions', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ]).then(([cardsData, txData]) => {
      const allCards = cardsData.data || [];
      const c = cardId ? allCards.find((x: any) => x.id === cardId) : allCards[0];
      if (c) { setCard(c); setNewLimit(String(c.spendingLimit || '')); }
      setTransactions((txData.data?.transactions || txData.data || []).slice(0, 10));
    }).catch(() => {}).finally(() => setLoading(false));
  }, [token, cardId]);

  const toggleFreeze = async () => {
    if (!card) return;
    try {
      const res = await fetch('/api/cards', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ cardId: card.id, action: card.frozen ? 'unfreeze' : 'freeze' }),
      });
      const d = await res.json();
      if (d.success) setCard(p => ({ ...p, frozen: !p.frozen }));
    } catch {}
  };

  const saveLimit = async () => {
    if (!card || !newLimit) return;
    try {
      const res = await fetch('/api/cards', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ cardId: card.id, action: 'set_limit', spendingLimit: parseFloat(newLimit) }),
      });
      const d = await res.json();
      if (d.success) { setCard(p => ({ ...p, spendingLimit: parseFloat(newLimit) })); setLimitModal(false); }
    } catch {}
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text); setCopied(label); setTimeout(() => setCopied(''), 2000);
  };

  if (loading) return <div className="space-y-4"><div className="h-[240px] bg-card border border-border rounded-2xl animate-pulse" /><div className="h-[300px] bg-card border border-border rounded-2xl animate-pulse" /></div>;

  if (!card) return <div className="text-center py-16"><p className="text-gray-500">Card not found</p></div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div><h2 className="text-white font-bold text-lg">Card Management</h2><p className="text-gray-500 text-sm mt-0.5">Manage your {card.cardBrand || 'Visa'} {card.type} card</p></div>

      {/* Card Display */}
      <div className="max-w-[380px] aspect-[1.586/1] rounded-2xl relative overflow-hidden mx-auto group transition-transform duration-500 hover:[transform:perspective(1000px)_rotateY(-6deg)_rotateX(4deg)_translateZ(12px)]" style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 40%, #1E3A8A 100%)' }}>
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-36 h-36 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4" />
        <div className="relative z-10 flex flex-col justify-between h-full p-7">
          <div className="flex justify-between items-start">
            <div><p className="text-white/70 text-xs font-medium">CoreWealth Bank</p><p className="text-white/50 text-[10px] mt-0.5">{card.type === 'virtual' ? 'Virtual' : 'Physical'} {card.cardBrand}</p></div>
            <svg width="40" height="24" viewBox="0 0 40 24" fill="none"><text x="0" y="18" fill="white" fontSize="18" fontWeight="bold" fontFamily="serif" fontStyle="italic">{card.cardBrand === 'Mastercard' ? 'MC' : 'VISA'}</text></svg>
          </div>
          <div>
            <p className="text-white text-xl font-mono tracking-[0.2em]">{showFullNumber ? (card.cardNumber || '') : (card.lastFour ? `•••• •••• •••• ${card.lastFour}` : '•••• •••• •••• ••••')}</p>
            <div className="flex justify-between items-end mt-4">
              <div><p className="text-white/50 text-[9px] uppercase">Card Holder</p><p className="text-white text-sm font-medium">COREWEALTH MEMBER</p></div>
              <div className="text-right"><p className="text-white/50 text-[9px] uppercase">Expires</p><p className="text-white text-sm font-medium">{card.expiryMonth || '12'}/{card.expiryYear || '28'}</p></div>
            </div>
          </div>
        </div>
        {card.frozen && <div className="absolute inset-0 bg-black/30 flex items-center justify-center z-20"><Snowflake className="w-12 h-12 text-blue-300" /></div>}
      </div>

      {/* Quick Controls */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: card.frozen ? <Snowflake className="w-5 h-5" /> : <Snowflake className="w-5 h-5" />, label: card.frozen ? 'Unfreeze Card' : 'Freeze Card', color: 'text-blue-400 bg-blue-400/10', onClick: toggleFreeze },
          { icon: <DollarSign className="w-5 h-5" />, label: 'Set Limit', color: 'text-[#60A5FA] bg-[#2563EB]/10', onClick: () => setLimitModal(true) },
          { icon: <Eye className="w-5 h-5" />, label: showFullNumber ? 'Hide Number' : 'Show Number', color: 'text-green-400 bg-green-400/10', onClick: () => setShowFullNumber(!showFullNumber) },
          { icon: <Settings className="w-5 h-5" />, label: 'Card Details', color: 'text-gray-400 bg-white/5', onClick: () => {} },
        ].map((btn) => (
          <button key={btn.label} onClick={btn.onClick} className={`flex flex-col items-center gap-2 p-4 rounded-xl border border-border bg-card hover:border-[#2563EB]/30 transition-colors`}>
            <div className={`w-10 h-10 rounded-lg ${btn.color} flex items-center justify-center`}>{btn.icon}</div>
            <span className="text-gray-300 text-xs font-medium">{btn.label}</span>
          </button>
        ))}
      </div>

      {/* Card Details */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
        <h3 className="text-white font-semibold text-sm">Card Details</h3>
        {[
          { label: 'Card Number', value: card.cardNumber || (card.lastFour ? `•••• •••• •••• ${card.lastFour}` : 'N/A'), copyable: !!card.cardNumber },
          { label: 'CVV', value: showCvv ? (card.cvv || '•••') : '•••', copyable: !!card.cvv && showCvv },
          { label: 'Expiry', value: `${card.expiryMonth || '12'}/${card.expiryYear || '28'}` },
          { label: 'Status', value: card.frozen ? 'Frozen' : (card.status || 'Active') },
          { label: 'Type', value: card.type === 'virtual' ? 'Virtual Card' : 'Physical Card' },
          { label: 'Spending Limit', value: card.spendingLimit ? `$${Number(card.spendingLimit).toLocaleString()}.00` : 'No limit set' },
          { label: 'Monthly Spend', value: card.monthlySpend ? `$${Number(card.monthlySpend).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '$0.00' },
        ].map(row => (
          <div key={row.label} className="flex items-center justify-between py-1.5">
            <span className="text-gray-500 text-sm">{row.label}</span>
            <div className="flex items-center gap-2">
              <span className="text-white text-sm font-medium font-mono">{row.value}</span>
              {row.label === 'CVV' && <button onClick={() => setShowCvv(!showCvv)} className="text-gray-500 hover:text-white">{showCvv ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>}
              {row.copyable && <button onClick={() => copyToClipboard(row.value, row.label)} className="text-gray-500 hover:text-[#2563EB]">{copied === row.label ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}</button>}
            </div>
          </div>
        ))}
      </div>

      {/* Spending Limit Modal */}
      {limitModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setLimitModal(false)}>
          <div className="bg-[#111] border border-white/10 rounded-2xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <h3 className="text-white font-bold text-lg mb-1">Set Spending Limit</h3>
            <p className="text-gray-500 text-sm mb-5">Enter your monthly spending limit in USD.</p>
            <input type="number" value={newLimit} onChange={e => setNewLimit(e.target.value)} placeholder="5000" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#2563EB]/60 transition-all mb-4" />
            <div className="flex gap-3">
              <button onClick={() => setLimitModal(false)} className="flex-1 bg-white/5 text-white text-sm font-medium py-2.5 rounded-xl transition-colors">Cancel</button>
              <button onClick={saveLimit} className="flex-1 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-semibold py-2.5 rounded-xl transition-colors">Save Limit</button>
            </div>
          </div>
        </div>
      )}

      {/* Recent Transactions */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <h3 className="text-white font-semibold text-sm mb-4">Recent Transactions</h3>
        {transactions.length === 0 ? <p className="text-gray-500 text-sm text-center py-8">No transactions yet</p> : (
          <div className="space-y-2">{transactions.slice(0, 5).map((tx: any) => (
            <div key={tx.id} className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#2563EB]/10 flex items-center justify-center"><CreditCard className="w-4 h-4 text-[#60A5FA]" /></div>
                <div><p className="text-white text-sm">{tx.description || tx.type || 'Transaction'}</p><p className="text-gray-500 text-xs">{new Date(tx.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p></div>
              </div>
              <span className={`text-sm font-medium ${tx.type === 'credit' || tx.type === 'deposit' ? 'text-green-400' : 'text-white'}`}>{tx.type === 'credit' || tx.type === 'deposit' ? '+' : '-'}${Number(tx.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
          ))}</div>
        )}
      </div>
</div>
  );
}
