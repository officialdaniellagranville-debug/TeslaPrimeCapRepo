'use client';

import { useState, useEffect } from 'react';

interface Transaction { id: string; type: string; amount: number; status: string; description?: string; createdAt: string; }

export default function SavingsStatementPage() {
  const [txns, setTxns] = useState<Transaction[]>([]);
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

  const totalCredits = filtered.filter(t => t.type === 'credit' || t.type === 'deposit').reduce((s, t) => s + t.amount, 0);
  const totalDebits = filtered.filter(t => t.type === 'debit' || t.type === 'withdrawal').reduce((s, t) => s + t.amount, 0);
  const statusBadge = (s: string) => {
    const m: Record<string, string> = { confirmed: 'bg-green-900/30 text-green-400', completed: 'bg-green-900/30 text-green-400', pending: 'bg-yellow-900/30 text-yellow-400' };
    return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${m[s] || 'bg-gray-700/50 text-gray-400'}`}>{s}</span>;
  };

  return (
    <div className="space-y-5">
      <div className="flex gap-3 flex-wrap">
        <div className="bg-card border border-border rounded-xl p-4 flex-1 min-w-[140px]"><p className="text-gray-500 text-xs">Total Deposits</p><p className="text-green-400 font-bold text-lg mt-1">+${totalCredits.toFixed(2)}</p></div>
        <div className="bg-card border border-border rounded-xl p-4 flex-1 min-w-[140px]"><p className="text-gray-500 text-xs">Total Withdrawals</p><p className="text-red-400 font-bold text-lg mt-1">-${totalDebits.toFixed(2)}</p></div>
        <div className="bg-card border border-border rounded-xl p-4 flex-1 min-w-[140px]"><p className="text-gray-500 text-xs">Net Change</p><p className={`font-bold text-lg mt-1 ${(totalCredits - totalDebits) >= 0 ? 'text-green-400' : 'text-red-400'}`}>${(totalCredits - totalDebits).toFixed(2)}</p></div>
      </div>
      <div className="flex gap-3 items-end">
        <div className="flex-1"><label className="block text-gray-300 text-xs font-medium mb-1">From</label><input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-full bg-[#1a1a1a] border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#2563EB]" /></div>
        <div className="flex-1"><label className="block text-gray-300 text-xs font-medium mb-1">To</label><input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-full bg-[#1a1a1a] border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#2563EB]" /></div>
        <button className="bg-white/5 hover:bg-white/10 border border-border px-4 py-2 rounded-lg text-sm text-gray-300 hover:text-white transition-colors whitespace-nowrap">Export PDF</button>
      </div>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {loading ? (<div className="text-center text-gray-500 py-10 text-sm">Loading...</div>) : filtered.length === 0 ? (<div className="text-center text-gray-500 py-10 text-sm">No transactions found</div>) : (
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-border bg-white/[0.02]"><th className="text-left text-gray-500 font-medium px-4 py-3">Date</th><th className="text-left text-gray-500 font-medium px-4 py-3">Description</th><th className="text-right text-gray-500 font-medium px-4 py-3">Amount</th><th className="text-right text-gray-500 font-medium px-4 py-3">Status</th></tr></thead><tbody>{filtered.map(t => (<tr key={t.id} className="border-b border-border/50 last:border-0 hover:bg-white/[0.02]"><td className="text-gray-300 px-4 py-3 text-xs whitespace-nowrap">{new Date(t.createdAt).toLocaleDateString()}</td><td className="text-white px-4 py-3 text-xs capitalize max-w-[200px] truncate">{t.description || t.type}</td><td className={`px-4 py-3 text-right font-medium text-xs ${(t.type === 'credit' || t.type === 'deposit') ? 'text-green-400' : 'text-red-400'}`}>{(t.type === 'credit' || t.type === 'deposit') ? '+' : '-'}${t.amount?.toFixed(2)}</td><td className="px-4 py-3 text-right">{statusBadge(t.status)}</td></tr>))}</tbody></table></div>
        )}
      </div>
</div>
  );
}