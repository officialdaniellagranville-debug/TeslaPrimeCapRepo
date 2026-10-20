'use client';

import { useState, useEffect } from 'react';

interface Beneficiary { id: string; name: string; bankName: string; accountNumber: string; swiftCode?: string; country?: string; }
interface Wallet { id: string; type: string; balance: number; }

const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'CHF'];
const PURPOSES = ['Business Payment', 'Family Support', 'Education', 'Real Estate', 'Investment', 'Medical', 'Legal', 'Other'];

export default function WireTransferPage() {
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState({ beneficiaryId: '', recipientName: '', bankName: '', accountNumber: '', routingNumber: '', swiftCode: '', address: '', country: '', amount: '', currency: 'USD', purpose: '' });
  const [walletId, setWalletId] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch('/api/beneficiaries', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).then(d => { if (d.success) setBeneficiaries(d.data || []); }).catch(() => {});
    fetch('/api/wallet', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).then(d => { const w = d.data?.wallets || []; setWallets(w); if (w.length) setWalletId(w[0].id); }).catch(() => {});
  }, []);

  const selectBeneficiary = (id: string) => {
    const b = beneficiaries.find(x => x.id === id);
    if (b) setForm(p => ({ ...p, beneficiaryId: b.id, recipientName: b.name, bankName: b.bankName, accountNumber: b.accountNumber, swiftCode: b.swiftCode || '', country: b.country || '' }));
  };

  const handleSubmit = async () => {
    setError(''); setSuccess('');
    if (!form.recipientName || !form.bankName || !form.accountNumber || !form.amount || !form.purpose) { setError('Fill all required fields'); return; }
    if (reviewing) {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/transfers', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ ...form, amount: parseFloat(form.amount), type: 'wire', walletId }) });
        const data = await res.json();
        if (data.success) { setSuccess('Wire transfer submitted successfully!'); setReviewing(false); setForm({ beneficiaryId: '', recipientName: '', bankName: '', accountNumber: '', routingNumber: '', swiftCode: '', address: '', country: '', amount: '', currency: 'USD', purpose: '' }); }
        else setError(data.error?.message || 'Failed');
      } catch { setError('Network error'); } finally { setLoading(false); }
    } else { setReviewing(true); }
  };

  const fee = 25;
  const amt = parseFloat(form.amount) || 0;
  const inputCls = 'w-full bg-[#1a1a1a] border border-border rounded-lg px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#2563EB] transition-colors';
  const selectCls = 'w-full bg-[#1a1a1a] border border-border rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-[#2563EB] transition-colors appearance-none';

  return (
    <div className="space-y-5">
      {error && <div className="bg-red-900/30 border border-red-800/50 text-red-400 text-sm rounded-lg px-4 py-3">{error}</div>}
      {success && <div className="bg-green-900/30 border border-green-800/50 text-green-400 text-sm rounded-lg px-4 py-3">{success}</div>}

      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-[#2563EB]/10 flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/></svg>
          </div>
          <div><h3 className="text-white font-semibold text-sm">Wire Transfer</h3><p className="text-gray-500 text-xs">Send funds to any bank worldwide</p></div>
        </div>

        {!reviewing ? (
          <>
            {beneficiaries.length > 0 && <div><label className="block text-gray-300 text-sm font-medium mb-1.5">Or select a saved beneficiary</label><select value={form.beneficiaryId} onChange={e => selectBeneficiary(e.target.value)} className={selectCls}><option value="">Select...</option>{beneficiaries.map(b => <option key={b.id} value={b.id}>{b.name} — {b.bankName}</option>)}</select></div>}

            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-gray-300 text-sm font-medium mb-1.5">Recipient Name *</label><input type="text" value={form.recipientName} onChange={e => setForm(p => ({ ...p, recipientName: e.target.value }))} placeholder="Full legal name" className={inputCls} /></div>
              <div><label className="block text-gray-300 text-sm font-medium mb-1.5">Bank Name *</label><input type="text" value={form.bankName} onChange={e => setForm(p => ({ ...p, bankName: e.target.value }))} placeholder="Recipient bank" className={inputCls} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-gray-300 text-sm font-medium mb-1.5">Account Number *</label><input type="text" value={form.accountNumber} onChange={e => setForm(p => ({ ...p, accountNumber: e.target.value }))} placeholder="Account number" className={inputCls} /></div>
              <div><label className="block text-gray-300 text-sm font-medium mb-1.5">Routing Number</label><input type="text" value={form.routingNumber} onChange={e => setForm(p => ({ ...p, routingNumber: e.target.value }))} placeholder="Routing number" className={inputCls} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-gray-300 text-sm font-medium mb-1.5">SWIFT/BIC Code</label><input type="text" value={form.swiftCode} onChange={e => setForm(p => ({ ...p, swiftCode: e.target.value }))} placeholder="e.g. CHASUS33" className={inputCls} /></div>
              <div><label className="block text-gray-300 text-sm font-medium mb-1.5">Country</label><input type="text" value={form.country} onChange={e => setForm(p => ({ ...p, country: e.target.value }))} placeholder="Country" className={inputCls} /></div>
            </div>
            <div><label className="block text-gray-300 text-sm font-medium mb-1.5">Address</label><input type="text" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} placeholder="Recipient address" className={inputCls} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-gray-300 text-sm font-medium mb-1.5">Amount (USD) *</label><div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span><input type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} placeholder="0.00" className={inputCls + ' pl-8'} /></div></div>
              <div><label className="block text-gray-300 text-sm font-medium mb-1.5">Currency</label><select value={form.currency} onChange={e => setForm(p => ({ ...p, currency: e.target.value }))} className={selectCls}>{CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
            </div>
            <div><label className="block text-gray-300 text-sm font-medium mb-1.5">Purpose of Transfer *</label><select value={form.purpose} onChange={e => setForm(p => ({ ...p, purpose: e.target.value }))} className={selectCls}><option value="">Select purpose</option>{PURPOSES.map(p => <option key={p} value={p}>{p}</option>)}</select></div>
            <div><label className="block text-gray-300 text-sm font-medium mb-1.5">Debit From</label><select value={walletId} onChange={e => setWalletId(e.target.value)} className={selectCls}>{wallets.map(w => <option key={w.id} value={w.id}>{w.type === 'live' ? 'Checking' : 'Savings'} — ${w.balance.toLocaleString()}</option>)}</select></div>
            <div className="bg-[#111] border border-border rounded-lg p-3"><div className="flex justify-between text-sm"><span className="text-gray-500">Wire transfer fee</span><span className="text-white">${fee.toFixed(2)}</span></div><div className="flex justify-between text-sm mt-1 font-bold"><span className="text-white">Total debit</span><span className="text-[#2563EB]">${(amt + fee).toFixed(2)}</span></div></div>
            <button onClick={handleSubmit} className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold py-3 rounded-lg transition-colors text-sm">Review & Confirm</button>
          </>
        ) : (
          <>
            <div className="bg-[#111] border border-[#2563EB]/30 rounded-xl p-4 space-y-3">
              <h4 className="text-white font-semibold text-sm mb-2">Confirm Transfer Details</h4>
              <div className="grid grid-cols-2 gap-2 text-sm"><div><p className="text-gray-500 text-xs">Recipient</p><p className="text-white font-medium">{form.recipientName}</p></div><div><p className="text-gray-500 text-xs">Bank</p><p className="text-white font-medium">{form.bankName}</p></div><div><p className="text-gray-500 text-xs">Account</p><p className="text-white font-mono">{form.accountNumber}</p></div><div><p className="text-gray-500 text-xs">SWIFT</p><p className="text-white font-mono">{form.swiftCode || 'N/A'}</p></div><div><p className="text-gray-500 text-xs">Amount</p><p className="text-white font-bold">${amt.toFixed(2)} {form.currency}</p></div><div><p className="text-gray-500 text-xs">Purpose</p><p className="text-white">{form.purpose}</p></div></div>
              <div className="border-t border-border pt-3 flex justify-between text-sm font-bold"><span className="text-white">Total (incl. ${fee} fee)</span><span className="text-[#2563EB]">${(amt + fee).toFixed(2)}</span></div>
            </div>
            <div className="flex gap-3"><button onClick={() => setReviewing(false)} className="flex-1 bg-white/5 hover:bg-white/10 border border-border text-white font-semibold py-3 rounded-lg transition-colors text-sm">Edit</button><button onClick={handleSubmit} disabled={loading} className="flex-1 bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors text-sm">{loading ? 'Sending...' : 'Confirm & Send'}</button></div>
          </>
        )}
      </div>
</div>
  );
}