'use client';

import { useState, useEffect } from 'react';

interface CryptoTxn { id: string; type: string; amount: number; cryptoAmount?: number; cryptoSymbol?: string; usdEquivalent?: number; status: string; description?: string; createdAt: string; }

export default function CryptoStatementPage() {
  const [txns, setTxns] = useState<CryptoTxn[]>([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch('/api/wallet/transactions', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => { setTxns(d.data?.transactions || d.data || []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const filtered = txns.filter(t => {
    if (from && new Date(t.createdAt) < new Date(from)) return false;
    if (to && new Date(t.createdAt) > new Date(to + 'T23:59:59')) return false;
    return true;
  });

  const totalBought = filtered.filter(t => t.type === 'buy' || t.type === 'credit').reduce((s, t) => s + (t.usdEquivalent || t.amount), 0);
  const totalSold = filtered.filter(t => t.type === 'sell' || t.type === 'debit').reduce((s, t) => s + (t.usdEquivalent || t.amount), 0);
  const statusBadge = (s: string) => {
    const m: Record<string, string> = { confirmed: 'bg-green-900/30 text-green-400', completed: 'bg-green-900/30 text-green-400', pending: 'bg-yellow-900/30 text-yellow-400', processing: 'bg-blue-900/30 text-blue-400' };
    return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${m[s] || 'bg-gray-700/50 text-gray-400'}`}>{s}</span>;
  };

  return (
    <div className="space-y-5">
      <div className="flex gap-3 flex-wrap">
        <div className="bg-card border border-border rounded-xl p-4 flex-1 min-w-[140px]"><p className="text-gray-500 text-xs">Total Purchased</p><p className="text-green-400 font-bold text-lg mt-1">${totalBought.toFixed(2)}</p></div>
        <div className="bg-card border border-border rounded-xl p-4 flex-1 min-w-[140px]"><p className="text-gray-500 text-xs">Total Sold</p><p className="text-red-400 font-bold text-lg mt-1">${totalSold.toFixed(2)}</p></div>
        <div className="bg-card border border-border rounded-xl p-4 flex-1 min-w-[140px]"><p className="text-gray-500 text-xs">Transactions</p><p className="text-[#60A5FA] font-bold text-lg mt-1">{filtered.length}</p></div>
      </div>
      <div className="flex gap-3 items-end">
        <div className="flex-1"><label className="block text-gray-300 text-xs font-medium mb-1">From</label><input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-full bg-[#1a1a1a] border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#2563EB]" /></div>
        <div className="flex-1"><label className="block text-gray-300 text-xs font-medium mb-1">To</label><input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-full bg-[#1a1a1a] border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#2563EB]" /></div>
        <button className="bg-white/5 hover:bg-white/10 border border-border px-4 py-2 rounded-lg text-sm text-gray-300 hover:text-white transition-colors whitespace-nowrap">Export CSV</button>
      </div>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {loading ? (<div className="text-center text-gray-500 py-10 text-sm">Loading...</div>) : filtered.length === 0 ? (<div className="text-center text-gray-500 py-10 text-sm">No crypto transactions found</div>) : (
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-border bg-white/[0.02]"><th className="text-left text-gray-500 font-medium px-4 py-3">Date</th><th className="text-left text-gray-500 font-medium px-4 py-3">Description</th><th className="text-right text-gray-500 font-medium px-4 py-3">Crypto</th><th className="text-right text-gray-500 font-medium px-4 py-3">USD Value</th><th className="text-right text-gray-500 font-medium px-4 py-3">Status</th></tr></thead><tbody>{filtered.map(t => (<tr key={t.id} className="border-b border-border/50 last:border-0 hover:bg-white/[0.02]"><td className="text-gray-300 px-4 py-3 text-xs whitespace-nowrap">{new Date(t.createdAt).toLocaleDateString()}</td><td className="text-white px-4 py-3 text-xs capitalize max-w-[160px] truncate">{t.description || t.type}</td><td className="text-[#60A5FA] px-4 py-3 text-right text-xs font-medium">{t.cryptoAmount?.toFixed(6) || '—'} {t.cryptoSymbol || ''}</td><td className={`px-4 py-3 text-right font-medium text-xs ${(t.type === 'buy' || t.type === 'credit') ? 'text-green-400' : 'text-red-400'}`}>${(t.usdEquivalent || t.amount)?.toFixed(2)}</td><td className="px-4 py-3 text-right">{statusBadge(t.status)}</td></tr>))}</tbody></table></div>
        )}
      </div>
</div>
  );
}