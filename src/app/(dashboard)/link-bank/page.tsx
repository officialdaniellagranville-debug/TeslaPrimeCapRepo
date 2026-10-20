'use client';

import { useState } from 'react';
import { Search, Landmark, Check, Trash2, ChevronRight, AlertCircle } from 'lucide-react';

const POPULAR_BANKS = [
  { name: 'Chase', color: '#0A6EBD', letter: 'C' },
  { name: 'Bank of America', color: '#E31837', letter: 'B' },
  { name: 'Wells Fargo', color: '#D71E28', letter: 'W' },
  { name: 'Citibank', color: '#003B70', letter: 'C' },
  { name: 'US Bank', color: '#D71E28', letter: 'U' },
  { name: 'PNC', color: '#0064A8', letter: 'P' },
  { name: 'Capital One', color: '#004C9B', letter: 'C' },
  { name: 'TD Bank', color: '#34A853', letter: 'T' },
];

interface LinkedBank {
  id: string;
  name: string;
  last4: string;
  type: 'checking' | 'savings';
  status: 'Connected' | 'Pending';
  connectedAt: string;
}

const MOCK_LINKED: LinkedBank[] = [
  { id: 'lb1', name: 'Chase', last4: '7832', type: 'checking', status: 'Connected', connectedAt: '2024-11-15' },
  { id: 'lb2', name: 'Bank of America', last4: '4091', type: 'savings', status: 'Pending', connectedAt: '2024-12-01' },
];

export default function LinkBankPage() {
  const [search, setSearch] = useState('');
  const [linkedBanks, setLinkedBanks] = useState<LinkedBank[]>(MOCK_LINKED);
  const [showManual, setShowManual] = useState(false);
  const [showLinked, setShowLinked] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [manualForm, setManualForm] = useState({
    bankName: '',
    routingNumber: '',
    accountNumber: '',
    accountType: 'checking' as 'checking' | 'savings',
    holderName: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const filteredBanks = POPULAR_BANKS.filter(b =>
    b.name.toLowerCase().includes(search.toLowerCase())
  );

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleLinkBank = (bank: typeof POPULAR_BANKS[0]) => {
    if (linkedBanks.find(b => b.name === bank.name)) {
      showToast(`${bank.name} is already linked`);
      return;
    }
    const newBank: LinkedBank = {
      id: `lb${Date.now()}`,
      name: bank.name,
      last4: String(Math.floor(1000 + Math.random() * 9000)),
      type: 'checking',
      status: 'Pending',
      connectedAt: new Date().toISOString().split('T')[0],
    };
    setLinkedBanks(prev => [newBank, ...prev]);
    showToast(`${bank.name} linking initiated — verification in progress`);
  };

  const handleUnlink = (id: string) => {
    setLinkedBanks(prev => prev.filter(b => b.id !== id));
    showToast('Bank account unlinked');
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.bankName || !manualForm.routingNumber || !manualForm.accountNumber || !manualForm.holderName) {
      showToast('Please fill in all fields');
      return;
    }
    setSubmitting(true);
    setTimeout(() => {
      const newBank: LinkedBank = {
        id: `lb${Date.now()}`,
        name: manualForm.bankName,
        last4: manualForm.accountNumber.slice(-4),
        type: manualForm.accountType,
        status: 'Pending',
        connectedAt: new Date().toISOString().split('T')[0],
      };
      setLinkedBanks(prev => [newBank, ...prev]);
      setManualForm({ bankName: '', routingNumber: '', accountNumber: '', accountType: 'checking', holderName: '' });
      setShowManual(false);
      setSubmitting(false);
      showToast('Bank account submitted for verification');
    }, 1500);
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-[#2563EB]/20 via-[#2563EB]/5 to-transparent border border-[#2563EB]/20 rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#2563EB]/20 flex items-center justify-center shrink-0">
            <Landmark className="w-6 h-6 text-[#60A5FA]" />
          </div>
          <div>
            <h2 className="text-white font-bold text-lg">Link External Bank</h2>
            <p className="text-gray-400 text-sm mt-1 leading-relaxed">
              Connect your external bank accounts for faster transfers, easy funding, and seamless money movement between institutions.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-5">
          {[
            { icon: '⚡', title: 'Faster Transfers', desc: 'Instant ACH transfers' },
            { icon: '💰', title: 'Easy Funding', desc: 'Fund in one click' },
            { icon: '🔄', title: 'Auto Sync', desc: 'Balance tracking' },
          ].map(f => (
            <div key={f.title} className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
              <span className="text-lg">{f.icon}</span>
              <p className="text-white text-xs font-semibold mt-1">{f.title}</p>
              <p className="text-gray-500 text-[10px] mt-0.5">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Already Linked Banks */}
      {linkedBanks.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-semibold text-sm">Linked Accounts ({linkedBanks.length})</h3>
            <button onClick={() => setShowLinked(!showLinked)} className="text-[#60A5FA] text-xs font-medium hover:underline">
              {showLinked ? 'Hide' : 'Show'}
            </button>
          </div>
          {showLinked && linkedBanks.map(bank => (
            <div key={bank.id} className="bg-white/5 border border-white/10 backdrop-blur rounded-xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#2563EB]/10 flex items-center justify-center shrink-0">
                <span className="text-[#60A5FA] font-bold text-sm">{bank.name[0]}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm">{bank.name}</p>
                <p className="text-gray-500 text-xs">••••{bank.last4} · {bank.type.charAt(0).toUpperCase() + bank.type.slice(1)}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-semibold uppercase px-2.5 py-1 rounded-full ${bank.status === 'Connected' ? 'text-green-400 bg-green-400/10' : 'text-yellow-400 bg-yellow-400/10'}`}>
                  {bank.status}
                </span>
                <button
                  onClick={() => handleUnlink(bank.id)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          type="text"
          placeholder="Search for your bank..."
          value={search}
          onChange={e => { setSearch(e.target.value); setShowManual(false); }}
          className="w-full bg-white/5 border border-white/10 backdrop-blur rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-gray-500 outline-none focus:border-[#2563EB]/50 transition-colors"
        />
      </div>

      {/* Popular Banks Grid */}
      {!showManual && (
        <div className="space-y-3">
          <h3 className="text-white font-semibold text-sm">Popular Banks</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {filteredBanks.map(bank => {
              const isLinked = linkedBanks.some(b => b.name === bank.name && b.status === 'Connected');
              return (
                <button
                  key={bank.name}
                  onClick={() => !isLinked && handleLinkBank(bank)}
                  disabled={isLinked}
                  className={`bg-white/5 border border-white/10 backdrop-blur rounded-xl p-4 flex flex-col items-center gap-2.5 transition-all hover:bg-white/10 hover:border-[#2563EB]/20 ${isLinked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ backgroundColor: `${bank.color}20` }}>
                    <span className="font-bold text-lg" style={{ color: bank.color }}>{bank.letter}</span>
                  </div>
                  <div className="text-center">
                    <p className="text-white text-xs font-medium leading-tight">{bank.name}</p>
                    {isLinked && <p className="text-green-400 text-[10px] mt-1 font-medium">Connected</p>}
                  </div>
                </button>
              );
            })}
          </div>

          {search && filteredBanks.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500 text-sm">No banks found matching &quot;{search}&quot;</p>
            </div>
          )}

          {/* Manual Entry Toggle */}
          <button
            onClick={() => setShowManual(true)}
            className="w-full bg-white/5 border border-white/10 backdrop-blur rounded-xl p-4 flex items-center justify-between hover:bg-white/10 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-500/10 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-gray-400" />
              </div>
              <div className="text-left">
                <p className="text-white text-sm font-medium">Can&apos;t find your bank?</p>
                <p className="text-gray-500 text-xs">Enter your bank details manually</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-[#60A5FA] transition-colors" />
          </button>
        </div>
      )}

      {/* Manual Entry Form */}
      {showManual && (
        <div className="bg-white/5 border border-white/10 backdrop-blur rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-semibold text-sm">Manual Bank Entry</h3>
            <button onClick={() => setShowManual(false)} className="text-gray-500 hover:text-white text-xs">Back to banks</button>
          </div>
          <form onSubmit={handleManualSubmit} className="space-y-4">
            <div>
              <label className="text-gray-400 text-xs font-medium block mb-1.5">Bank Name</label>
              <input
                type="text"
                value={manualForm.bankName}
                onChange={e => setManualForm(f => ({ ...f, bankName: e.target.value }))}
                placeholder="e.g. Chase, Bank of America"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 outline-none focus:border-[#2563EB]/50 transition-colors"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-gray-400 text-xs font-medium block mb-1.5">Routing Number</label>
                <input
                  type="text"
                  value={manualForm.routingNumber}
                  onChange={e => setManualForm(f => ({ ...f, routingNumber: e.target.value.replace(/\D/g, '').slice(0, 9) }))}
                  placeholder="9 digits"
                  maxLength={9}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 outline-none focus:border-[#2563EB]/50 transition-colors font-mono"
                />
              </div>
              <div>
                <label className="text-gray-400 text-xs font-medium block mb-1.5">Account Number</label>
                <input
                  type="text"
                  value={manualForm.accountNumber}
                  onChange={e => setManualForm(f => ({ ...f, accountNumber: e.target.value.replace(/\D/g, '').slice(0, 17) }))}
                  placeholder="Up to 17 digits"
                  maxLength={17}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 outline-none focus:border-[#2563EB]/50 transition-colors font-mono"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-gray-400 text-xs font-medium block mb-1.5">Account Type</label>
                <div className="flex bg-white/5 border border-white/10 rounded-xl p-1">
                  {(['checking', 'savings'] as const).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setManualForm(f => ({ ...f, accountType: t }))}
                      className={`flex-1 py-2.5 rounded-lg text-xs font-medium transition-all ${manualForm.accountType === t ? 'bg-[#2563EB] text-white' : 'text-gray-400 hover:text-white'}`}
                    >
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-gray-400 text-xs font-medium block mb-1.5">Account Holder Name</label>
                <input
                  type="text"
                  value={manualForm.holderName}
                  onChange={e => setManualForm(f => ({ ...f, holderName: e.target.value }))}
                  placeholder="Full name on account"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 outline-none focus:border-[#2563EB]/50 transition-colors"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white font-semibold text-sm py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {submitting ? (
                <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Verifying...</>
              ) : (
                <>Link Bank Account</>
              )}
            </button>
          </form>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 bg-[#2563EB]/20 border border-[#2563EB]/30 text-[#60A5FA] text-xs font-medium px-4 py-2 rounded-full animate-fade-in">
          {toast}
        </div>
      )}
</div>
  );
}
