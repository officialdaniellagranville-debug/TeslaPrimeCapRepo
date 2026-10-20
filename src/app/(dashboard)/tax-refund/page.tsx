'use client';

import { useState, useEffect } from 'react';

const TAX_YEARS = ['2024', '2023', '2022', '2021'];
const REFUND_TYPES = ['Federal', 'State', 'Property', 'Business'];
const FILING_STATUSES = ['Single', 'Married Filing Jointly', 'Head of Household', 'Married Filing Separately'];

interface Wallet { id: string; type: string; balance: number; }
interface RefundRequest { id: string; taxYear: string; refundType: string; amount: number; status: string; createdAt: string; }

export default function TaxRefundPage() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [refunds, setRefunds] = useState<RefundRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [taxYear, setTaxYear] = useState('2024');
  const [refundType, setRefundType] = useState('Federal');
  const [amount, setAmount] = useState('');
  const [filingStatus, setFilingStatus] = useState('Single');
  const [walletId, setWalletId] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch('/api/wallet', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).then(d => { if (d.success) { const w = d.data?.wallets || []; setWallets(w); if (w.length > 0) setWalletId(w[0].id); } }).catch(() => {});
  }, []);

  const handleSubmit = async () => {
    setError(''); setSuccess('');
    if (!amount || parseFloat(amount) <= 0 || !walletId) { setError('Fill all required fields'); return; }
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/tax-refund', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ taxYear, refundType, amount: parseFloat(amount), filingStatus, walletId, notes }) });
      const data = await res.json();
      if (data.success) { setSuccess('Tax refund request submitted! We will process it within 5-7 business days.'); setAmount(''); setNotes(''); }
      else setError(data.error?.message || 'Submission failed');
    } catch { setError('Network error'); } finally { setLoading(false); }
  };

  const statusColor = (s: string) => ({ pending: 'text-yellow-400 bg-yellow-900/30', processing: 'text-blue-400 bg-blue-900/30', approved: 'text-green-400 bg-green-900/30', completed: 'text-green-400 bg-green-900/30', rejected: 'text-red-400 bg-red-900/30' }[s] || 'text-gray-400 bg-gray-700/50');
  const inputCls = 'w-full bg-[#1a1a1a] border border-border rounded-lg px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#2563EB] transition-colors';
  const selectCls = 'w-full bg-[#1a1a1a] border border-border rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-[#2563EB] transition-colors appearance-none';

  return (
    <div className="space-y-5">
      {error && <div className="bg-red-900/30 border border-red-800/50 text-red-400 text-sm rounded-lg px-4 py-3">{error}</div>}
      {success && <div className="bg-green-900/30 border border-green-800/50 text-green-400 text-sm rounded-lg px-4 py-3">{success}</div>}

      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-[#2563EB]/10 flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          </div>
          <div><h3 className="text-white font-semibold text-sm">Tax Refund Request</h3><p className="text-gray-500 text-xs">Submit a tax refund request to your account</p></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="block text-gray-300 text-sm font-medium mb-1.5">Tax Year</label><select value={taxYear} onChange={e => setTaxYear(e.target.value)} className={selectCls}>{TAX_YEARS.map(y => <option key={y} value={y}>{y}</option>)}</select></div>
          <div><label className="block text-gray-300 text-sm font-medium mb-1.5">Refund Type</label><select value={refundType} onChange={e => setRefundType(e.target.value)} className={selectCls}>{REFUND_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
        </div>
        <div><label className="block text-gray-300 text-sm font-medium mb-1.5">Filing Status</label><select value={filingStatus} onChange={e => setFilingStatus(e.target.value)} className={selectCls}>{FILING_STATUSES.map(f => <option key={f} value={f}>{f}</option>)}</select></div>
        <div><label className="block text-gray-300 text-sm font-medium mb-1.5">Expected Refund Amount (USD)</label><div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span><input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className={inputCls + ' pl-8'} /></div></div>
        <div><label className="block text-gray-300 text-sm font-medium mb-1.5">Deposit To</label><select value={walletId} onChange={e => setWalletId(e.target.value)} className={selectCls}>{wallets.map(w => <option key={w.id} value={w.id}>{w.type === 'live' ? 'Checking' : 'Savings'} — ${w.balance.toLocaleString()}</option>)}</select></div>
        <div><label className="block text-gray-300 text-sm font-medium mb-1.5">Additional Notes</label><textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any additional information about your refund..." rows={3} className={inputCls + ' resize-none'} /></div>
        <button onClick={handleSubmit} disabled={loading} className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors text-sm">{loading ? 'Submitting...' : 'Submit Refund Request'}</button>
      </div>

      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center gap-3 mb-4"><div className="w-10 h-10 rounded-lg bg-[#2563EB]/10 flex items-center justify-center"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div><div><h3 className="text-white font-semibold text-sm">Processing Timeline</h3><p className="text-gray-500 text-xs">Tax refund requests typically take 5-7 business days</p></div></div>
        <div className="grid grid-cols-3 gap-3 text-center"><div className="bg-white/5 rounded-lg p-3"><p className="text-white text-xs font-semibold">Submitted</p><p className="text-gray-500 text-[10px] mt-1">Day 0</p></div><div className="bg-white/5 rounded-lg p-3"><p className="text-white text-xs font-semibold">Under Review</p><p className="text-gray-500 text-[10px] mt-1">Day 1-3</p></div><div className="bg-white/5 rounded-lg p-3"><p className="text-white text-xs font-semibold">Deposited</p><p className="text-gray-500 text-[10px] mt-1">Day 5-7</p></div></div>
      </div>
</div>
  );
}