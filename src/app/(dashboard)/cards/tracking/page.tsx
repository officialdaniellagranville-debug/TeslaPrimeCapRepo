'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Truck, Package, MapPin, Clock, Copy, Check, ArrowRight, CreditCard } from 'lucide-react';

const STEPS = [
  { key: 'ordered', label: 'Order Placed', icon: <Package className="w-5 h-5" />, desc: 'Your card order has been confirmed' },
  { key: 'processing', label: 'Processing', icon: <Clock className="w-5 h-5" />, desc: 'Your card is being personalized' },
  { key: 'shipped', label: 'Shipped', icon: <Truck className="w-5 h-5" />, desc: 'Card is on its way to you' },
  { key: 'in_transit', label: 'In Transit', icon: <MapPin className="w-5 h-5" />, desc: 'Out for delivery in your area' },
  { key: 'delivered', label: 'Delivered', icon: <Check className="w-5 h-5" />, desc: 'Card has been delivered' },
];

export default function TrackingPage() {
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    fetch('/api/cards', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setCards((d.data || []).filter((c: any) => c.type === 'physical'))).catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const getStepIndex = (status?: string) => {
    const m: Record<string, number> = { ordered: 0, processing: 1, shipped: 2, in_transit: 3, delivered: 4, pending: 0, active: 4 };
    return m[status || ''] ?? -1;
  };

  const formatDate = (d?: string) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Pending';

  if (loading) return <div className="space-y-4"><div className="h-[300px] bg-card border border-border rounded-2xl animate-pulse" /></div>;

  const physicalCards = cards;
  if (physicalCards.length === 0) return (
    <div className="text-center py-16 space-y-4">
      <div className="w-16 h-16 mx-auto rounded-2xl bg-white/5 flex items-center justify-center"><Truck className="w-7 h-7 text-gray-600" /></div>
      <h3 className="text-white font-semibold text-lg">No Physical Card Orders</h3>
      <p className="text-gray-500 text-sm">Order a physical card to track its delivery here.</p>
      <Link href="/cards/apply?type=physical" className="inline-flex items-center gap-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-semibold px-6 py-3 rounded-xl transition-colors"><CreditCard className="w-4 h-4" /> Order Physical Card</Link>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div><h2 className="text-white font-bold text-lg">Card Delivery Tracking</h2><p className="text-gray-500 text-sm mt-0.5">Monitor your physical card delivery status</p></div>

      {physicalCards.map(card => {
        const currentStep = getStepIndex(card.shippingStatus);
        const isDelivered = card.shippingStatus === 'delivered';
        return (
          <div key={card.id} className="bg-card border border-border rounded-2xl p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-8 rounded-lg bg-gradient-to-br from-[#2563EB] to-[#1E3A8A] flex items-center justify-center"><CreditCard className="w-5 h-5 text-white" /></div>
                <div><p className="text-white font-semibold text-sm">{card.cardBrand || 'Visa'} Physical Card</p><p className="text-gray-500 text-xs">•••• {card.lastFour || '0000'}</p></div>
              </div>
              <span className={`text-xs font-semibold px-3 py-1 rounded-full ${isDelivered ? 'text-green-400 bg-green-400/10' : 'text-yellow-400 bg-yellow-400/10'}`}>{isDelivered ? 'Delivered' : 'In Progress'}</span>
            </div>

            {/* Timeline */}
            <div className="relative pl-8">
              {STEPS.map((step, i) => {
                const reached = i <= currentStep;
                const isCurrent = i === currentStep;
                const dateField = ['orderedAt', null, 'shippedAt', null, 'deliveredAt'][i];
                const date = dateField ? card[dateField] : null;
                return (
                  <div key={step.key} className="relative pb-8 last:pb-0">
                    <div className={`absolute -left-8 top-0.5 w-6 h-6 rounded-full flex items-center justify-center text-xs ${reached ? 'bg-[#2563EB] text-white' : 'bg-white/5 text-gray-600 border border-border'} ${isCurrent ? 'ring-4 ring-[#2563EB]/20' : ''}`}>{reached ? step.icon : <span className="w-2 h-2 bg-gray-600 rounded-full" />}</div>
                    <div className={`${i < STEPS.length - 1 ? 'border-l-2 border-white/5 ml-[-20px] pl-4 pb-0' : 'ml-[-20px] pl-4'}`}>
                      <div className="flex items-center gap-2">
                        <p className={`text-sm font-medium ${reached ? 'text-white' : 'text-gray-600'}`}>{step.label}</p>
                        {date && <span className="text-gray-500 text-xs">{formatDate(date)}</span>}
                      </div>
                      <p className={`text-xs mt-0.5 ${reached ? 'text-gray-400' : 'text-gray-700'}`}>{step.desc}</p>
                      {isCurrent && card.shippingCarrier && <p className="text-[#60A5FA] text-xs mt-1">Carrier: {card.shippingCarrier}</p>}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Tracking Number */}
            {card.trackingNumber && (
              <div className="bg-[#111] rounded-xl p-4 flex items-center justify-between">
                <div><p className="text-gray-500 text-xs">Tracking Number</p><p className="text-white font-mono text-sm mt-0.5">{card.trackingNumber}</p></div>
                <button onClick={() => { navigator.clipboard.writeText(card.trackingNumber); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="text-gray-400 hover:text-[#2563EB] transition-colors">{copied ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5" />}</button>
              </div>
            )}

            {/* Estimated Delivery */}
            {!isDelivered && card.orderedAt && (
              <div className="bg-[#2563EB]/5 border border-[#2563EB]/20 rounded-xl p-4 flex items-center gap-3">
                <Clock className="w-5 h-5 text-[#60A5FA] shrink-0" />
                <div><p className="text-white text-sm font-medium">Estimated Delivery</p><p className="text-gray-400 text-xs">7-10 business days from order date ({formatDate(card.orderedAt)})</p></div>
              </div>
            )}
          </div>
        );
      })}
</div>
  );
}
