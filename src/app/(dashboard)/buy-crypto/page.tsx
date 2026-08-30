'use client';

import { useState } from 'react';
import ChatWidget from '@/components/ChatWidget';

const CRYPTOS = [
  { id: 'btc', name: 'Bitcoin', symbol: 'BTC', price: 67432.50, color: '#F7931A', icon: '<circle cx="12" cy="12" r="10" /><text x="12" y="16" text-anchor="middle" fill="white" font-size="10" font-weight="bold" font-family="sans-serif">B</text>' },
  { id: 'eth', name: 'Ethereum', symbol: 'ETH', price: 3521.80, color: '#627EEA', icon: '<circle cx="12" cy="12" r="10" /><text x="12" y="16" text-anchor="middle" fill="white" font-size="10" font-weight="bold" font-family="sans-serif">E</text>' },
  { id: 'usdt', name: 'Tether', symbol: 'USDT', price: 1.00, color: '#26A17B', icon: '<circle cx="12" cy="12" r="10" /><text x="12" y="16" text-anchor="middle" fill="white" font-size="10" font-weight="bold" font-family="sans-serif">T</text>' },
  { id: 'bnb', name: 'BNB', symbol: 'BNB', price: 584.20, color: '#F3BA2F', icon: '<circle cx="12" cy="12" r="10" /><text x="12" y="16" text-anchor="middle" fill="white" font-size="10" font-weight="bold" font-family="sans-serif">B</text>' },
  { id: 'sol', name: 'Solana', symbol: 'SOL', price: 172.45, color: '#9945FF', icon: '<circle cx="12" cy="12" r="10" /><text x="12" y="16" text-anchor="middle" fill="white" font-size="10" font-weight="bold" font-family="sans-serif">S</text>' },
  { id: 'xrp', name: 'XRP', symbol: 'XRP', price: 0.62, color: '#00AAE4', icon: '<circle cx="12" cy="12" r="10" /><text x="12" y="16" text-anchor="middle" fill="white" font-size="10" font-weight="bold" font-family="sans-serif">X</text>' },
];

const QUICK_AMOUNTS = [100, 500, 1000, 5000];

export default function BuyCryptoPage() {
  const [selected, setSelected] = useState(0);
  const [amount, setAmount] = useState('');
  const [payMethod, setPayMethod] = useState('debit');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const crypto = CRYPTOS[selected];
  const usdAmount = parseFloat(amount) || 0;
  const coinAmount = usdAmount / crypto.price;
  const networkFee = 2.99;
  const processingFee = usdAmount * 0.015;
  const total = usdAmount + networkFee + processingFee;

  const handleBuy = async () => {
    setError(''); setSuccess('');
    if (usdAmount < 10) { setError('Minimum purchase is $10'); return; }
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/crypto/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ cryptoId: crypto.id, amount: usdAmount, payMethod, networkFee, processingFee })
      });
      const data = await res.json();
      if (data.success) { setSuccess(`Successfully purchased ${coinAmount.toFixed(6)} ${crypto.symbol}!`); setAmount(''); }
      else setError(data.error?.message || 'Purchase failed');
    } catch { setError('Network error'); } finally { setLoading(false); }
  };

  const inputCls = 'w-full bg-[#1a1a1a] border border-border rounded-lg px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#2563EB] transition-colors';

  return (
    <div className="space-y-5">
      {error && <div className="bg-red-900/30 border border-red-800/50 text-red-400 text-sm rounded-lg px-4 py-3">{error}</div>}
      {success && <div className="bg-green-900/30 border border-green-800/50 text-green-400 text-sm rounded-lg px-4 py-3">{success}</div>}

      {/* Crypto Selector */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h3 className="text-white font-semibold text-sm">Select Cryptocurrency</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {CRYPTOS.map((c, i) => (
            <button key={c.id} onClick={() => setSelected(i)} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${selected === i ? 'border-[#2563EB] bg-[#2563EB]/10' : 'border-border bg-white/[0.02] hover:border-white/20'}`}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: c.color }}>
                <svg width="20" height="20" viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: c.icon }} />
              </div>
              <div className="text-left"><p className="text-white text-sm font-semibold">{c.symbol}</p><p className="text-gray-500 text-[10px]">${c.price.toLocaleString()}</p></div>
            </button>
          ))}
        </div>
      </div>

      {/* Amount & Payment */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h3 className="text-white font-semibold text-sm">Payment Details</h3>
        <div><label className="block text-gray-300 text-sm font-medium mb-1.5">Amount (USD)</label>
          <div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span><input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className={inputCls + ' pl-8'} /></div>
          <div className="flex gap-2 mt-2">{QUICK_AMOUNTS.map(a => (<button key={a} onClick={() => setAmount(String(a))} className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${amount === String(a) ? 'bg-[#2563EB] text-white' : 'bg-white/5 text-gray-400 hover:text-white'}`}>${a.toLocaleString()}</button>))}</div>
        </div>
        <div><label className="block text-gray-300 text-sm font-medium mb-1.5">Payment Method</label>
          <div className="space-y-2">
            {[{ id: 'debit', label: 'CoreWealth Debit Card', sub: '**** 4521' }, { id: 'credit', label: 'CoreWealth Credit Card', sub: '**** 7890' }].map(m => (
              <button key={m.id} onClick={() => setPayMethod(m.id)} className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${payMethod === m.id ? 'border-[#2563EB] bg-[#2563EB]/10' : 'border-border hover:border-white/20'}`}>
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#2563EB] to-[#1D4ED8] flex items-center justify-center"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg></div>
                <div><p className="text-white text-sm font-semibold">{m.label}</p><p className="text-gray-500 text-xs">{m.sub}</p></div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <h3 className="text-white font-semibold text-sm">Transaction Summary</h3>
        <div className="space-y-2">
          <div className="flex justify-between text-sm"><span className="text-gray-500">You pay</span><span className="text-white font-medium">${usdAmount.toFixed(2)}</span></div>
          <div className="flex justify-between text-sm"><span className="text-gray-500">You receive</span><span className="text-[#60A5FA] font-medium">{coinAmount.toFixed(6)} {crypto.symbol}</span></div>
          <div className="border-t border-border pt-2"><div className="flex justify-between text-sm"><span className="text-gray-500">Network fee</span><span className="text-white">${networkFee.toFixed(2)}</span></div><div className="flex justify-between text-sm mt-1"><span className="text-gray-500">Processing fee (1.5%)</span><span className="text-white">${processingFee.toFixed(2)}</span></div><div className="flex justify-between text-sm font-bold mt-2 pt-2 border-t border-border"><span className="text-white">Total</span><span className="text-[#2563EB]">${total.toFixed(2)}</span></div></div>
        </div>
      </div>

      <button onClick={handleBuy} disabled={loading || usdAmount < 10} className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white font-semibold py-3.5 rounded-xl transition-colors text-sm shadow-[0_4px_20px_rgba(124,58,237,0.3)]">{loading ? 'Processing...' : `Buy ${crypto.symbol}`}</button>
      <ChatWidget />
    </div>
  );
}