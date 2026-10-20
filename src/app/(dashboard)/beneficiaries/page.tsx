'use client';

import { useState, useEffect } from 'react';

interface Beneficiary { id: string; name: string; bankName: string; accountNumber: string; routingNumber?: string; swiftCode?: string; country?: string; relationship?: string; createdAt: string; }

const RELATIONSHIPS = ['Personal', 'Business', 'Family'];
const COUNTRY_FLAGS: Record<string, string> = { US: '🇺🇸', GB: '🇬🇧', CA: '🇨🇦', AU: '🇦🇺', DE: '🇩🇪', FR: '🇫🇷', NG: '🇳🇬', GH: '🇬🇭', KE: '🇰🇪', IN: '🇮🇳' };

export default function BeneficiariesPage() {
  const [list, setList] = useState<Beneficiary[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', bankName: '', accountNumber: '', routingNumber: '', swiftCode: '', country: 'US', relationship: 'Personal' });

  const fetchList = () => {
    const token = localStorage.getItem('token');
    if (token) fetch('/api/beneficiaries', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).then(d => { if (d.success) setList(d.data || []); }).catch(() => {});
  };

  useEffect(() => { fetchList(); }, []);

  const handleSubmit = async () => {
    setError('');
    if (!form.name || !form.bankName || !form.accountNumber) { setError('Name, bank, and account number are required'); return; }
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/beneficiaries', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(form) });
      const data = await res.json();
      if (data.success) { setSuccess('Beneficiary added!'); setShowForm(false); setForm({ name: '', bankName: '', accountNumber: '', routingNumber: '', swiftCode: '', country: 'US', relationship: 'Personal' }); fetchList(); }
      else setError(data.error?.message || 'Failed to add');
    } catch { setError('Network error'); } finally { setLoading(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this beneficiary?')) return;
    const token = localStorage.getItem('token');
    await fetch(`/api/beneficiaries?id=${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }).then(() => fetchList());
  };

  const filtered = list.filter(b => b.name.toLowerCase().includes(search.toLowerCase()) || b.bankName.toLowerCase().includes(search.toLowerCase()));
  const inputCls = 'w-full bg-[#1a1a1a] border border-border rounded-lg px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#2563EB] transition-colors';
  const selectCls = 'w-full bg-[#1a1a1a] border border-border rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-[#2563EB] transition-colors appearance-none';

  return (
    <div className="space-y-5">
      {error && <div className="bg-red-900/30 border border-red-800/50 text-red-400 text-sm rounded-lg px-4 py-3">{error}</div>}
      {success && <div className="bg-green-900/30 border border-green-800/50 text-green-400 text-sm rounded-lg px-4 py-3">{success}</div>}

      <div className="flex gap-3">
        <div className="relative flex-1"><svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search beneficiaries..." className={inputCls + ' pl-10'} /></div>
        <button onClick={() => setShowForm(!showForm)} className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold px-4 py-3 rounded-lg transition-colors text-sm whitespace-nowrap">{showForm ? 'Cancel' : '+ Add'}</button>
      </div>

      {showForm && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <h3 className="text-white font-semibold text-sm">New Beneficiary</h3>
          <div><label className="block text-gray-300 text-sm font-medium mb-1.5">Full Name *</label><input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="John Doe" className={inputCls} /></div>
          <div className="grid grid-cols-2 gap-3"><div><label className="block text-gray-300 text-sm font-medium mb-1.5">Bank Name *</label><input type="text" value={form.bankName} onChange={e => setForm(p => ({ ...p, bankName: e.target.value }))} placeholder="Bank name" className={inputCls} /></div><div><label className="block text-gray-300 text-sm font-medium mb-1.5">Account Number *</label><input type="text" value={form.accountNumber} onChange={e => setForm(p => ({ ...p, accountNumber: e.target.value }))} placeholder="Account number" className={inputCls} /></div></div>
          <div className="grid grid-cols-2 gap-3"><div><label className="block text-gray-300 text-sm font-medium mb-1.5">Routing Number</label><input type="text" value={form.routingNumber} onChange={e => setForm(p => ({ ...p, routingNumber: e.target.value }))} placeholder="Routing number" className={inputCls} /></div><div><label className="block text-gray-300 text-sm font-medium mb-1.5">SWIFT Code</label><input type="text" value={form.swiftCode} onChange={e => setForm(p => ({ ...p, swiftCode: e.target.value }))} placeholder="e.g. CHASUS33" className={inputCls} /></div></div>
          <div className="grid grid-cols-2 gap-3"><div><label className="block text-gray-300 text-sm font-medium mb-1.5">Country</label><select value={form.country} onChange={e => setForm(p => ({ ...p, country: e.target.value }))} className={selectCls}><option value="US">United States</option><option value="GB">United Kingdom</option><option value="CA">Canada</option><option value="AU">Australia</option><option value="NG">Nigeria</option><option value="GH">Ghana</option><option value="KE">Kenya</option></select></div><div><label className="block text-gray-300 text-sm font-medium mb-1.5">Relationship</label><select value={form.relationship} onChange={e => setForm(p => ({ ...p, relationship: e.target.value }))} className={selectCls}>{RELATIONSHIPS.map(r => <option key={r} value={r}>{r}</option>)}</select></div></div>
          <button onClick={handleSubmit} disabled={loading} className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors text-sm">{loading ? 'Saving...' : 'Add Beneficiary'}</button>
        </div>
      )}

      <div className="space-y-2">
        {filtered.length === 0 ? (<div className="text-center text-gray-500 py-10 text-sm">{search ? 'No beneficiaries match your search' : 'No beneficiaries yet. Add one to get started.'}</div>) : filtered.map(b => (
          <div key={b.id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-[#2563EB]/15 flex items-center justify-center text-lg shrink-0">{COUNTRY_FLAGS[b.country || 'US'] || '🏦'}</div>
            <div className="flex-1 min-w-0"><p className="text-white text-sm font-semibold truncate">{b.name}</p><p className="text-gray-500 text-xs">{b.bankName} — ****{b.accountNumber?.slice(-4)}</p><div className="flex items-center gap-2 mt-1"><span className="text-[10px] text-[#60A5FA] bg-[#2563EB]/10 px-2 py-0.5 rounded-full">{b.relationship || 'Personal'}</span>{b.country && <span className="text-[10px] text-gray-500">{b.country}</span>}</div></div>
            <button onClick={() => handleDelete(b.id)} className="text-gray-600 hover:text-red-400 transition-colors p-2"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
          </div>
        ))}
      </div>
</div>
  );
}