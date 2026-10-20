'use client';

import { useState, useEffect } from 'react';

interface Wallet { id: string; type: string; balance: number; availableBalance: number; }
interface Beneficiary { id: string; name: string; bankName: string; accountNumber: string; country: string; };

const TABS = ['Internal', 'Local', 'International'] as const;
type Tab = typeof TABS[number];

const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'CHF', 'JPY'];
const PURPOSES = ['Family Support', 'Business Payment', 'Education', 'Medical', 'Investment', 'Gift', 'Other'];

export default function TransferPage() {
  const [tab, setTab] = useState<Tab>('Internal');
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Internal transfer state
  const [fromWallet, setFromWallet] = useState('');
  const [toWallet, setToWallet] = useState('');
  const [intAmount, setIntAmount] = useState('');

  // Local transfer state
  const [localBeneficiary, setLocalBeneficiary] = useState('');
  const [localAmount, setLocalAmount] = useState('');
  const [localNote, setLocalNote] = useState('');

  // International transfer state
  const [intnlBeneficiary, setIntnlBeneficiary] = useState('');
  const [intnlAmount, setIntnlAmount] = useState('');
  const [intnlCurrency, setIntnlCurrency] = useState('USD');
  const [intnlPurpose, setIntnlPurpose] = useState('');
  const [intnlSwift, setIntnlSwift] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch('/api/wallet', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => { if (d.success) setWallets(d.data?.wallets || []); }).catch(() => {});
    fetch('/api/beneficiaries', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => { if (d.success) setBeneficiaries(d.data || []); }).catch(() => {});
  }, []);

  const submitInternal = async () => {
    setError(''); setSuccess('');
    if (!fromWallet || !toWallet || !intAmount || parseFloat(intAmount) <= 0) { setError('Fill all fields'); return; }
    if (fromWallet === toWallet) { setError('Source and destination must differ'); return; }
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/transfers', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ fromWalletId: fromWallet, toWalletId: toWallet, amount: parseFloat(intAmount), type: 'internal' }) });
      const data = await res.json();
      if (data.success) { setSuccess('Transfer completed successfully!'); setIntAmount(''); }
      else setError(data.error?.message || 'Transfer failed');
    } catch { setError('Network error'); } finally { setLoading(false); }
  };

  const submitLocal = async () => {
    setError(''); setSuccess('');
    if (!localBeneficiary || !localAmount || parseFloat(localAmount) <= 0) { setError('Select beneficiary and enter amount'); return; }
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/transfers', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ beneficiaryId: localBeneficiary, amount: parseFloat(localAmount), note: localNote, type: 'local' }) });
      const data = await res.json();
      if (data.success) { setSuccess('Local transfer initiated!'); setLocalAmount(''); setLocalNote(''); }
      else setError(data.error?.message || 'Transfer failed');
    } catch { setError('Network error'); } finally { setLoading(false); }
  };

  const submitInternational = async () => {
    setError(''); setSuccess('');
    if (!intnlBeneficiary || !intnlAmount || !intnlPurpose || !intnlSwift) { setError('Fill all required fields'); return; }
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/transfers', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ beneficiaryId: intnlBeneficiary, amount: parseFloat(intnlAmount), currency: intnlCurrency, purpose: intnlPurpose, swiftCode: intnlSwift, type: 'international' }) });
      const data = await res.json();
      if (data.success) { setSuccess('International transfer submitted!'); setIntnlAmount(''); setIntnlSwift(''); setIntnlPurpose(''); }
      else setError(data.error?.message || 'Transfer failed');
    } catch { setError('Network error'); } finally { setLoading(false); }
  };

  const inputCls = 'w-full bg-[#1a1a1a] border border-border rounded-lg px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#2563EB] transition-colors';
  const selectCls = 'w-full bg-[#1a1a1a] border border-border rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-[#2563EB] transition-colors appearance-none';

  return (
    <div className="space-y-5">
      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-white/5 rounded-xl">
        {TABS.map(t => (
          <button key={t} onClick={() => { setTab(t); setError(''); setSuccess(''); }} className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${tab === t ? 'bg-[#2563EB] text-white shadow-[0_2px_12px_rgba(124,58,237,0.4)]' : 'text-gray-400 hover:text-white'}`}>{t}</button>
        ))}
      </div>

      {error && <div className="bg-red-900/30 border border-red-800/50 text-red-400 text-sm rounded-lg px-4 py-3">{error}</div>}
      {success && <div className="bg-green-900/30 border border-green-800/50 text-green-400 text-sm rounded-lg px-4 py-3">{success}</div>}

      {/* INTERNAL TRANSFER */}
      {tab === 'Internal' && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-[#2563EB]/10 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
            </div>
            <div><h3 className="text-white font-semibold text-sm">Internal Transfer</h3><p className="text-gray-500 text-xs">Free instant transfers between your accounts</p></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-gray-300 text-sm font-medium mb-1.5">From</label>
              <select value={fromWallet} onChange={e => setFromWallet(e.target.value)} className={selectCls}><option value="">Select account</option>{wallets.map(w => <option key={w.id} value={w.id}>{w.type === 'live' ? 'Checking' : 'Savings'} — ${w.balance.toLocaleString()}</option>)}</select></div>
            <div><label className="block text-gray-300 text-sm font-medium mb-1.5">To</label>
              <select value={toWallet} onChange={e => setToWallet(e.target.value)} className={selectCls}><option value="">Select account</option>{wallets.map(w => <option key={w.id} value={w.id}>{w.type === 'live' ? 'Checking' : 'Savings'} — ${w.balance.toLocaleString()}</option>)}</select></div>
          </div>
          <div><label className="block text-gray-300 text-sm font-medium mb-1.5">Amount (USD)</label><div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span><input type="number" value={intAmount} onChange={e => setIntAmount(e.target.value)} placeholder="0.00" className={inputCls + ' pl-8'} /></div></div>
          <button onClick={submitInternal} disabled={loading} className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors text-sm">{loading ? 'Processing...' : 'Transfer Now'}</button>
        </div>
      )}

      {/* LOCAL TRANSFER */}
      {tab === 'Local' && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-[#2563EB]/10 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18"/><path d="M3 7v1a3 3 0 0 0 6 0V7"/><path d="M9 7v1a3 3 0 0 0 6 0V7"/><path d="M15 7v1a3 3 0 0 0 6 0V7"/><path d="M3 7h18l-1.5-4H4.5L3 7z"/></svg>
            </div>
            <div><h3 className="text-white font-semibold text-sm">Local Transfer</h3><p className="text-gray-500 text-xs">Send to a saved beneficiary</p></div>
          </div>
          <div><label className="block text-gray-300 text-sm font-medium mb-1.5">Beneficiary</label>
            <select value={localBeneficiary} onChange={e => setLocalBeneficiary(e.target.value)} className={selectCls}><option value="">Select beneficiary</option>{beneficiaries.map(b => <option key={b.id} value={b.id}>{b.name} — {b.bankName} (****{b.accountNumber?.slice(-4)})</option>)}</select>
            {beneficiaries.length === 0 && <p className="text-gray-600 text-xs mt-1.5">No beneficiaries yet. <a href="/beneficiaries" className="text-[#60A5FA] hover:underline">Add one first</a></p>}</div>
          <div><label className="block text-gray-300 text-sm font-medium mb-1.5">Amount (USD)</label><div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span><input type="number" value={localAmount} onChange={e => setLocalAmount(e.target.value)} placeholder="0.00" className={inputCls + ' pl-8'} /></div></div>
          <div><label className="block text-gray-300 text-sm font-medium mb-1.5">Note (optional)</label><input type="text" value={localNote} onChange={e => setLocalNote(e.target.value)} placeholder="Payment reference" className={inputCls} /></div>
          <button onClick={submitLocal} disabled={loading} className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors text-sm">{loading ? 'Processing...' : 'Send Transfer'}</button>
        </div>
      )}

      {/* INTERNATIONAL TRANSFER */}
      {tab === 'International' && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-[#2563EB]/10 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/></svg>
            </div>
            <div><h3 className="text-white font-semibold text-sm">International Wire Transfer</h3><p className="text-gray-500 text-xs">Send money worldwide</p></div>
          </div>
          <div><label className="block text-gray-300 text-sm font-medium mb-1.5">Beneficiary</label>
            <select value={intnlBeneficiary} onChange={e => setIntnlBeneficiary(e.target.value)} className={selectCls}><option value="">Select beneficiary</option>{beneficiaries.map(b => <option key={b.id} value={b.id}>{b.name} — {b.country || 'N/A'} (****{b.accountNumber?.slice(-4)})</option>)}</select></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-gray-300 text-sm font-medium mb-1.5">Amount (USD)</label><div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span><input type="number" value={intnlAmount} onChange={e => setIntnlAmount(e.target.value)} placeholder="0.00" className={inputCls + ' pl-8'} /></div></div>
            <div><label className="block text-gray-300 text-sm font-medium mb-1.5">Currency</label><select value={intnlCurrency} onChange={e => setIntnlCurrency(e.target.value)} className={selectCls}>{CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
          </div>
          <div><label className="block text-gray-300 text-sm font-medium mb-1.5">Purpose of Transfer</label><select value={intnlPurpose} onChange={e => setIntnlPurpose(e.target.value)} className={selectCls}><option value="">Select purpose</option>{PURPOSES.map(p => <option key={p} value={p}>{p}</option>)}</select></div>
          <div><label className="block text-gray-300 text-sm font-medium mb-1.5">SWIFT/BIC Code</label><input type="text" value={intnlSwift} onChange={e => setIntnlSwift(e.target.value)} placeholder="e.g. CHASUS33" className={inputCls} /></div>
          <div className="bg-[#111] border border-border rounded-lg p-3 space-y-1.5"><div className="flex justify-between text-sm"><span className="text-gray-500">Transfer fee</span><span className="text-white">$25.00</span></div><div className="flex justify-between text-sm"><span className="text-gray-500">Exchange rate</span><span className="text-white">1.00 {intnlCurrency}</span></div></div>
          <button onClick={submitInternational} disabled={loading} className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors text-sm">{loading ? 'Processing...' : 'Send International Transfer'}</button>
        </div>
      )}
</div>
  );
}