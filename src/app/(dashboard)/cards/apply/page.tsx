'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { CreditCard, ShoppingBag, Check, Truck, Zap, Shield, Globe } from 'lucide-react';

const PHYSICAL_OPTIONS = [
  { id: 'visa-standard', brand: 'Visa', name: 'Visa Standard', price: 0, color: 'from-[#2563EB] to-[#1D4ED8]', desc: 'No annual fee. Perfect for everyday purchases.' },
  { id: 'visa-gold', brand: 'Visa', name: 'Visa Gold', price: 25, color: 'from-[#D4A843] to-[#B8860B]', desc: 'Higher limits, travel insurance, concierge access.' },
  { id: 'mastercard-platinum', brand: 'Mastercard', name: 'Mastercard Platinum', price: 50, color: 'from-[#1a1a2e] to-[#16213e]', desc: 'Premium perks, airport lounge access, purchase protection.' },
];

export default function ApplyForCardPage() {
  const router = useRouter();
  const params = useSearchParams();
  const initialTab = params.get('type') === 'physical' ? 'physical' : 'virtual';
  const [tab, setTab] = useState<'virtual' | 'physical'>(initialTab);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [cardData, setCardData] = useState<any>(null);
  const [selectedPlan, setSelectedPlan] = useState(PHYSICAL_OPTIONS[0]);
  const [address, setAddress] = useState({ name: '', line1: '', line2: '', city: '', state: '', zip: '', country: 'US' });
  const [error, setError] = useState('');
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const applyVirtual = async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/cards', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ type: 'virtual', cardBrand: 'Visa', color: '#2563EB' }),
      });
      const d = await res.json();
      if (d.success) { setCardData(d.data); setSuccess(true); }
      else setError(d.error?.message || 'Failed to issue card');
    } catch { setError('Network error'); } finally { setLoading(false); }
  };

  const applyPhysical = async () => {
    if (!address.name || !address.line1 || !address.city || !address.zip) { setError('Please fill in all required address fields'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/cards', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ type: 'physical', cardBrand: selectedPlan.brand, planId: selectedPlan.id, shippingAddress: address, fee: selectedPlan.price }),
      });
      const d = await res.json();
      if (d.success) { setSuccess(true); }
      else setError(d.error?.message || 'Failed to order card');
    } catch { setError('Network error'); } finally { setLoading(false); }
  };

  const CardPreview = ({ color, brand, lastFour }: { color: string; brand: string; lastFour?: string }) => (
    <div className="max-w-[360px] aspect-[1.586/1] rounded-2xl relative overflow-hidden mx-auto" style={{ background: `linear-gradient(135deg, ${color.includes('#') ? color : '#2563EB'}, ${color.includes('from') ? '' : '#1E3A8A'})` }}>
      {color.includes('from') ? <div className={`absolute inset-0 bg-gradient-to-br ${color}`} /> : null}
      <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
      <div className="absolute bottom-0 left-0 w-36 h-36 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4" />
      <div className="relative z-10 flex flex-col justify-between h-full p-6">
        <div className="flex justify-between items-start">
          <p className="text-white/70 text-xs font-medium">CoreWealth Bank</p>
          <svg width="36" height="22" viewBox="0 0 36 22" fill="none"><text x="0" y="16" fill="white" fontSize="16" fontWeight="bold" fontFamily="serif" fontStyle="italic">{brand === 'Mastercard' ? 'MC' : 'VISA'}</text></svg>
        </div>
        <div>
          <p className="text-white text-lg font-mono tracking-[0.2em]">{lastFour ? `•••• •••• •••• ${lastFour}` : '•••• •••• •••• ••••'}</p>
          <div className="flex justify-between items-end mt-4">
            <div><p className="text-white/50 text-[9px] uppercase">Card Holder</p><p className="text-white text-xs font-medium">YOUR NAME</p></div>
            <div className="text-right"><p className="text-white/50 text-[9px] uppercase">Expires</p><p className="text-white text-xs font-medium">12/28</p></div>
          </div>
        </div>
      </div>
    </div>
  );

  if (success && tab === 'virtual' && cardData) {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center"><Check className="w-7 h-7 text-green-400" /></div>
          <h2 className="text-2xl font-bold text-white mb-2">Virtual Card Issued!</h2>
          <p className="text-gray-400 text-sm">Your card is ready to use immediately for online purchases.</p>
        </div>
        <CardPreview color="from-[#2563EB] to-[#1E3A8A]" brand="Visa" lastFour={cardData.lastFour} />
        <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
          <div className="flex justify-between text-sm"><span className="text-gray-500">Card Number</span><span className="text-white font-mono">{cardData.cardNumber || `•••• •••• •••• ${cardData.lastFour}`}</span></div>
          <div className="flex justify-between text-sm"><span className="text-gray-500">CVV</span><span className="text-white font-mono">{cardData.cvv || '•••'}</span></div>
          <div className="flex justify-between text-sm"><span className="text-gray-500">Expiry</span><span className="text-white">{cardData.expiryMonth || '12'}/{cardData.expiryYear || '28'}</span></div>
          <div className="flex justify-between text-sm"><span className="text-gray-500">Status</span><span className="text-green-400">Active</span></div>
        </div>
        <div className="flex gap-3">
          <Link href="/cards/manage" className="flex-1 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-semibold py-3 rounded-xl text-center transition-colors">Manage Card</Link>
          <Link href="/cards" className="flex-1 bg-white/5 border border-white/10 text-white text-sm font-semibold py-3 rounded-xl text-center transition-colors">Back to Cards</Link>
        </div>
</div>
    );
  }

  if (success && tab === 'physical') {
    return (
      <div className="max-w-lg mx-auto text-center space-y-6">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center"><Truck className="w-7 h-7 text-green-400" /></div>
        <h2 className="text-2xl font-bold text-white mb-2">Card Ordered!</h2>
        <p className="text-gray-400 text-sm">Your {selectedPlan.name} is being prepared and will ship within 2-3 business days. Estimated delivery: 7-10 business days.</p>
        <CardPreview color={selectedPlan.color} brand={selectedPlan.brand} />
        <div className="flex gap-3">
          <Link href="/cards/tracking" className="flex-1 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-semibold py-3 rounded-xl text-center transition-colors flex items-center justify-center gap-2"><Truck className="w-4 h-4" /> Track Delivery</Link>
          <Link href="/cards" className="flex-1 bg-white/5 border border-white/10 text-white text-sm font-semibold py-3 rounded-xl text-center transition-colors">Back to Cards</Link>
        </div>
</div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div><h2 className="text-white font-bold text-lg">Apply for a Card</h2><p className="text-gray-500 text-sm mt-0.5">Choose between an instant virtual card or a physical card delivered to you</p></div>

      {/* Tab Switcher */}
      <div className="flex bg-[#111] rounded-xl p-1">
        <button onClick={() => setTab('virtual')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${tab === 'virtual' ? 'bg-[#2563EB] text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>
          <Zap className="w-4 h-4" /> Virtual Card
        </button>
        <button onClick={() => setTab('physical')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${tab === 'physical' ? 'bg-[#2563EB] text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>
          <ShoppingBag className="w-4 h-4" /> Physical Card
        </button>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl px-4 py-3">{error}</div>}

      {tab === 'virtual' ? (
        <div className="space-y-6">
          <CardPreview color="from-[#2563EB] to-[#1E3A8A]" brand="Visa" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[{ icon: <Zap className="w-5 h-5" />, t: 'Instant Issuance', d: 'Get your card number immediately' }, { icon: <Shield className="w-5 h-5" />, t: 'Secure Online', d: 'Perfect for safe online shopping' }, { icon: <Globe className="w-5 h-5" />, t: 'Global Acceptance', d: 'Use anywhere Visa is accepted' }].map(f => (
              <div key={f.t} className="bg-card border border-border rounded-xl p-4 text-center"><div className="w-10 h-10 mx-auto mb-2 rounded-lg bg-[#2563EB]/10 flex items-center justify-center text-[#60A5FA]">{f.icon}</div><p className="text-white text-sm font-semibold">{f.t}</p><p className="text-gray-500 text-xs mt-1">{f.d}</p></div>
            ))}
          </div>
          <button onClick={applyVirtual} disabled={loading} className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white font-semibold py-3.5 rounded-xl transition-colors text-sm">
            {loading ? 'Issuing Card...' : 'Request Virtual Card — Free'}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-white font-semibold">Choose Your Card</h3>
            <div className="space-y-3">
              {PHYSICAL_OPTIONS.map(opt => (
                <button key={opt.id} onClick={() => setSelectedPlan(opt)} className={`w-full text-left rounded-2xl border-2 p-4 transition-all ${selectedPlan.id === opt.id ? 'border-[#2563EB] bg-[#2563EB]/5' : 'border-border bg-card hover:border-white/20'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-8 rounded-lg bg-gradient-to-br ${opt.color} flex items-center justify-center`}><CreditCard className="w-5 h-5 text-white" /></div>
                      <div><p className="text-white font-semibold text-sm">{opt.name}</p><p className="text-gray-500 text-xs">{opt.brand}</p></div>
                    </div>
                    <p className="text-white font-bold">{opt.price === 0 ? 'Free' : `$${opt.price}`}</p>
                  </div>
                  <p className="text-gray-400 text-xs">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <h3 className="text-white font-semibold">Shipping Address</h3>
            <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
              {[
                { key: 'name', label: 'Full Name', placeholder: 'John Doe', req: true },
                { key: 'line1', label: 'Address Line 1', placeholder: '123 Main Street', req: true },
                { key: 'line2', label: 'Address Line 2', placeholder: 'Apt 4B' },
              ].map(f => (
                <div key={f.key}><label className="block text-gray-300 text-sm font-medium mb-1.5">{f.label}</label><input type="text" value={address[f.key as keyof typeof address]} onChange={e => setAddress(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#2563EB]/60 transition-all" /></div>
              ))}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { key: 'city', label: 'City', placeholder: 'New York' },
                  { key: 'state', label: 'State', placeholder: 'NY' },
                  { key: 'zip', label: 'ZIP Code', placeholder: '10001' },
                  { key: 'country', label: 'Country', placeholder: 'US' },
                ].map(f => (
                  <div key={f.key}><label className="block text-gray-300 text-sm font-medium mb-1.5">{f.label}</label><input type="text" value={address[f.key as keyof typeof address]} onChange={e => setAddress(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#2563EB]/60 transition-all" /></div>
                ))}
              </div>
            </div>
          </div>
          <div className="bg-card border border-border rounded-2xl p-4 flex items-center justify-between">
            <span className="text-gray-400 text-sm">One-time card fee</span>
            <span className="text-white font-bold text-lg">{selectedPlan.price === 0 ? 'Free' : `$${selectedPlan.price}.00`}</span>
          </div>
          <button onClick={applyPhysical} disabled={loading} className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white font-semibold py-3.5 rounded-xl transition-colors text-sm">
            {loading ? 'Processing...' : `Order ${selectedPlan.name}${selectedPlan.price > 0 ? ` — $${selectedPlan.price}.00` : ''}`}
          </button>
        </div>
      )}
</div>
  );
}
