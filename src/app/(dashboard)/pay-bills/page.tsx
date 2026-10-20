'use client';

import { useState } from 'react';

const CATEGORIES = [
  { id: 'electricity', name: 'Electricity', color: '#F59E0B', icon: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />' },
  { id: 'water', name: 'Water', color: '#3B82F6', icon: '<path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />' },
  { id: 'internet', name: 'Internet', color: '#06B6D4', icon: '<path d="M5 12.55a11 11 0 0 1 14.08 0" /><path d="M1.42 9a16 16 0 0 1 21.16 0" /><path d="M8.53 16.11a6 6 0 0 1 6.95 0" /><circle cx="12" cy="20" r="1" />' },
  { id: 'gas', name: 'Gas', color: '#F97316', icon: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />' },
  { id: 'phone', name: 'Phone/Airtime', color: '#22C55E', icon: '<rect x="5" y="2" width="14" height="20" rx="2" ry="2" /><line x1="12" y1="18" x2="12.01" y2="18" />' },
  { id: 'tv', name: 'TV/Cable', color: '#2563EB', icon: '<rect x="2" y="7" width="20" height="15" rx="2" ry="2" /><polyline points="17 2 12 7 7 2" />' },
  { id: 'insurance', name: 'Insurance', color: '#EC4899', icon: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />' },
  { id: 'rent', name: 'Rent/Mortgage', color: '#3B82F6', icon: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />' },
];

const RECENT = [
  { name: 'Electric Company', amount: 142.50, status: 'Paid', statusColor: '#22C55E', date: 'Jul 28' },
  { name: 'Internet Provider', amount: 79.99, status: 'Paid', statusColor: '#22C55E', date: 'Jul 25' },
  { name: 'Water Utility', amount: 45.00, status: 'Pending', statusColor: '#F59E0B', date: 'Aug 1' },
  { name: 'Insurance Premium', amount: 220.00, status: 'Paid', statusColor: '#22C55E', date: 'Jul 20' },
];

export default function PayBillsPage() {
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [accountNum, setAccountNum] = useState('');
  const [amount, setAmount] = useState('');
  const [payDate, setPayDate] = useState('');

  const selectedCat = CATEGORIES.find(c => c.id === selected);

  const handlePay = async () => {
    setError(''); setSuccess('');
    if (!accountNum || !amount || parseFloat(amount) <= 0) { setError('Fill in all required fields'); return; }
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/bills', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ category: selected, accountNumber: accountNum, amount: parseFloat(amount), paymentDate: payDate || new Date().toISOString() }) });
      const data = await res.json();
      if (data.success) { setSuccess(`Payment of $${parseFloat(amount).toFixed(2)} to ${selectedCat?.name} submitted!`); setAccountNum(''); setAmount(''); setPayDate(''); setSelected(null); }
      else setError(data.error?.message || 'Payment failed');
    } catch { setError('Network error'); } finally { setLoading(false); }
  };

  const inputCls = 'w-full bg-[#1a1a1a] border border-border rounded-lg px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#2563EB] transition-colors';

  return (
    <div className="space-y-5">
      {!selected ? (
        <>
          <p className="text-gray-400 text-sm">Select a bill category to pay</p>
          <div className="grid grid-cols-2 gap-3">
            {CATEGORIES.map(cat => (
              <button key={cat.id} onClick={() => setSelected(cat.id)} className="bg-card border border-border rounded-xl p-4 hover:border-[#2563EB]/40 transition-all text-left group">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-transform group-hover:scale-110" style={{ backgroundColor: `${cat.color}15`, color: cat.color }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: cat.icon }} />
                </div>
                <p className="text-white text-sm font-semibold mb-1">{cat.name}</p>
                <span className="text-xs font-medium" style={{ color: cat.color }}>Tap to pay</span>
              </button>
            ))}
          </div>
          {error && <div className="bg-red-900/30 border border-red-800/50 text-red-400 text-sm rounded-lg px-4 py-3">{error}</div>}
          {success && <div className="bg-green-900/30 border border-green-800/50 text-green-400 text-sm rounded-lg px-4 py-3">{success}</div>}
          <div>
            <h3 className="text-white font-semibold text-sm mb-3">Recent Payments</h3>
            <div className="space-y-2">{RECENT.map(p => (
              <div key={p.name} className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>
                </div>
                <div className="flex-1 min-w-0"><p className="text-white text-sm font-semibold truncate">{p.name}</p><p className="text-gray-600 text-xs">{p.date}</p></div>
                <div className="text-right shrink-0">
                  <p className="text-white text-sm font-semibold">${p.amount.toFixed(2)}</p>
                  <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full mt-0.5" style={{ color: p.statusColor, backgroundColor: `${p.statusColor}15` }}>{p.status}</span>
                </div>
              </div>))}</div>
          </div>
        </>
      ) : (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <button onClick={() => { setSelected(null); setError(''); setSuccess(''); }} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm mb-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
            Back to categories
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${selectedCat!.color}15`, color: selectedCat!.color }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: selectedCat!.icon }} />
            </div>
            <div><h3 className="text-white font-semibold">Pay {selectedCat!.name}</h3><p className="text-gray-500 text-xs">Enter your bill details below</p></div>
          </div>
          {error && <div className="bg-red-900/30 border border-red-800/50 text-red-400 text-sm rounded-lg px-4 py-3">{error}</div>}
          {success && <div className="bg-green-900/30 border border-green-800/50 text-green-400 text-sm rounded-lg px-4 py-3">{success}</div>}
          <div><label className="block text-gray-300 text-sm font-medium mb-1.5">Account / Customer Number *</label><input type="text" value={accountNum} onChange={e => setAccountNum(e.target.value)} placeholder="Enter your account number" className={inputCls} /></div>
          <div><label className="block text-gray-300 text-sm font-medium mb-1.5">Amount (USD) *</label><div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span><input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className={inputCls + ' pl-8'} /></div></div>
          <div><label className="block text-gray-300 text-sm font-medium mb-1.5">Payment Date</label><input type="date" value={payDate} onChange={e => setPayDate(e.target.value)} className={inputCls} /></div>
          <div className="bg-[#111] border border-border rounded-lg p-3"><div className="flex justify-between text-sm"><span className="text-gray-500">Convenience fee</span><span className="text-white">$1.50</span></div></div>
          <button onClick={handlePay} disabled={loading} className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors text-sm">{loading ? 'Processing...' : `Pay $${amount ? parseFloat(amount).toFixed(2) : '0.00'}`}</button>
        </div>
      )}
</div>
  );
}