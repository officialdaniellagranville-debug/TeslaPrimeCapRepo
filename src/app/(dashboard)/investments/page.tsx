'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import ActiveTradeChart from '@/components/ActiveTradeChart';
import InvestmentCorrelationChart from '@/components/InvestmentCorrelationChart';

const TradingViewWidget = dynamic(() => import('@/components/TradingViewWidget'), { ssr: false });
const HowToInvestSlideshow = dynamic(() => import('@/components/HowToInvestSlideshow'), { ssr: false });

// Fallback hardcoded plans — used if /api/plans fails. The dashboard will
// prefer the API response so that admins can disable plans and have them
// disappear from the UI in real time.
const FALLBACK_PLANS = [
  { id: 'basic',    name: 'Basic',    badge: 'STARTER',  badgeColor: 'bg-gray-600',   min: 200,   max: 4999,   daily: 0.5, duration: 30, model: 'Model 3', image: '/images/model-3.jpg' },
  { id: 'silver',   name: 'Silver',   badge: 'POPULAR',  badgeColor: 'bg-[#CC0000]',  min: 5000,  max: 9999,   daily: 0.8, duration: 21, model: 'Model Y', image: '/images/model-y.jpg' },
  { id: 'gold',     name: 'Gold',     badge: 'PREMIUM',  badgeColor: 'bg-amber-600',  min: 10000, max: 49999,  daily: 1.2, duration: 14, model: 'Model S', image: '/images/model-s.jpg' },
  { id: 'platinum', name: 'Platinum', badge: 'ELITE',    badgeColor: 'bg-purple-600', min: 50000, max: 100000, daily: 1.8, duration: 7,  model: 'Model X', image: '/images/model-x.jpg' },
];

interface ActiveInvestment {
  id: string;
  amount: number;
  dailyReturn: number;
  totalReturn: number;
  expectedReturn: number;
  startDate: string;
  endDate: string | null;
  plan: {
    name: string;
    tierName: string;
    dailyReturnRate: number;
    duration: number;
    durationUnit: string;
  };
}

function daysBetween(a: string | Date, b: string | Date): number {
  const ms = Math.abs(new Date(b).getTime() - new Date(a).getTime());
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

export default function InvestmentsPage() {
  const [modal, setModal] = useState<number | null>(null);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeInvestments, setActiveInvestments] = useState<ActiveInvestment[]>([]);
  const [investmentsLoading, setInvestmentsLoading] = useState(true);
  // Plans fetched from API (real-time, admin-controllable). Falls back to hardcoded list on error.
  const [plans, setPlans] = useState<typeof FALLBACK_PLANS>(FALLBACK_PLANS);

  const selectedPlan = modal !== null ? plans[modal] : null;
  const numAmount = parseFloat(amount) || 0;
  const dailyReturn = selectedPlan ? (numAmount * selectedPlan.daily) / 100 : 0;
  const totalReturn = dailyReturn * (selectedPlan?.duration || 0);

  useEffect(() => {
    fetchActiveInvestments();
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const res = await fetch('/api/plans');
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.data) && data.data.length > 0) {
        // Map API plans to the shape the UI expects
        const mapped = data.data.map((p: any) => {
          const tierLower = (p.tierName || p.name || '').toLowerCase();
          const fallback = FALLBACK_PLANS.find(fp => fp.id === p.slug || fp.name.toLowerCase() === tierLower);
          return {
            id: p.slug || p.id,
            name: p.tierName || (fallback?.name ?? p.name),
            badge: fallback?.badge ?? 'PLAN',
            badgeColor: fallback?.badgeColor ?? 'bg-gray-600',
            min: Number(p.minAmount),
            max: Number(p.maxAmount || 0),
            daily: Number(p.dailyReturnRate),
            duration: p.duration,
            model: fallback?.model ?? 'Tesla',
            image: fallback?.image ?? '/images/model-3.jpg',
          };
        });
        setPlans(mapped);
      }
    } catch {
      // silent — keep fallback plans
    }
  };

  const fetchActiveInvestments = async () => {
    setInvestmentsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch('/api/investments/active', { headers });
      const data = await res.json();
      if (res.ok) {
        setActiveInvestments(data.data || data.success ? (data.data || []) : (Array.isArray(data) ? data : []));
      }
    } catch {
      // silent
    } finally {
      setInvestmentsLoading(false);
    }
  };

  const handleInvest = async () => {
    if (!selectedPlan || !amount || numAmount < selectedPlan.min || numAmount > selectedPlan.max) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch('/api/investments', {
        method: 'POST',
        headers,
        body: JSON.stringify({ planId: selectedPlan.id || selectedPlan.name.toLowerCase(), amount: numAmount, mode: 'live' }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setModal(null);
        setAmount('');
        fetchActiveInvestments();
      } else {
        alert(data.error?.message || 'Investment failed');
      }
    } catch {
      alert('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-white font-bold text-lg">Investment Plans</h2>
        <p className="text-gray-500 text-sm mt-0.5">Choose a plan and start earning daily returns</p>
      </div>

      {/* Active Investments Section */}
      <div className="bg-tesla-card border border-tesla-border rounded-xl p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-4">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <h3 className="text-white font-semibold text-sm">Active Investments</h3>
        </div>

        {investmentsLoading ? (
          <div className="space-y-3">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="animate-pulse bg-[#1a1a1a] rounded-lg p-4">
                <div className="flex justify-between mb-2">
                  <div className="h-4 w-24 bg-tesla-border rounded" />
                  <div className="h-4 w-20 bg-tesla-border rounded" />
                </div>
                <div className="h-2.5 w-full bg-tesla-border rounded-full" />
                <div className="flex justify-between mt-2">
                  <div className="h-3 w-16 bg-tesla-border rounded" />
                  <div className="h-3 w-16 bg-tesla-border rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : activeInvestments.length === 0 ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[#1a1a1a] flex items-center justify-center">
              <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <p className="text-gray-400 text-sm font-medium">No active investments</p>
            <p className="text-gray-600 text-xs mt-1">Choose a plan below to get started.</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto pr-1 custom-scrollbar">
            {activeInvestments.map((inv) => {
              const startDate = new Date(inv.startDate);
              const endDate = inv.endDate ? new Date(inv.endDate) : new Date(startDate.getTime() + inv.plan.duration * 24 * 60 * 60 * 1000);
              const now = new Date();
              const totalDays = Math.max(1, daysBetween(startDate, endDate));
              const daysElapsed = Math.min(totalDays, daysBetween(startDate, now));
              const daysRemaining = Math.max(0, totalDays - daysElapsed);
              const progress = Math.min(100, (daysElapsed / totalDays) * 100);

              return (
                <div key={inv.id} className="bg-[#1a1a1a] rounded-lg p-4 border border-tesla-border">
                  {/* Header Row */}
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="text-white font-semibold text-sm">
                        {inv.plan?.tierName || inv.plan?.name || 'Plan'}
                      </h4>
                      <p className="text-gray-500 text-xs mt-0.5">
                        Started {startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-bold text-sm">${inv.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      <p className="text-green-400 text-xs font-medium">+{inv.plan?.dailyReturnRate || inv.dailyReturn}%/day</p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-2">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-gray-400">
                        {daysElapsed} / {totalDays} days
                      </span>
                      <span className="text-gray-500">{Math.round(progress)}%</span>
                    </div>
                    <div className="w-full h-2.5 bg-[#0d0d0d] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500 ease-out"
                        style={{
                          width: `${progress}%`,
                          background: progress >= 100
                            ? 'linear-gradient(90deg, #22c55e, #16a34a)'
                            : 'linear-gradient(90deg, #22c55e, #4ade80)',
                        }}
                      />
                    </div>
                  </div>

                  {/* Stats Row */}
                  <div className="flex items-center justify-between text-xs mt-3 pt-3 border-t border-tesla-border">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="text-gray-500 text-[10px]">Expected Return</p>
                        <p className="text-green-400 font-semibold">
                          +${inv.expectedReturn.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div className="w-px h-6 bg-tesla-border" />
                      <div>
                        <p className="text-gray-500 text-[10px]">Days Remaining</p>
                        <p className="text-white font-semibold">{daysRemaining} day{daysRemaining !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    {progress >= 100 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-600/20 text-green-400 border border-green-600/30">
                        COMPLETED
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Active Trade Chart (Live indicator) */}
      <ActiveTradeChart
        investedAmount={activeInvestments.reduce((sum, inv) => sum + Number(inv.amount || 0), 0)}
      />

      {/* TradingView Chart */}
      <div className="bg-tesla-card border border-tesla-border rounded-xl overflow-hidden !p-0">
        <div className="px-4 py-2.5 border-b border-tesla-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-white font-bold text-sm">NASDAQ:TSLA</span>
            <span className="text-gray-500 text-xs">Live</span>
          </div>
        </div>
        <TradingViewWidget />
      </div>

      {/* Investment Correlation Chart */}
      <InvestmentCorrelationChart />

      {/* How to Invest 3D Slideshow */}
      <HowToInvestSlideshow />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {plans.map((plan, i) => (
          <div key={i} className="bg-tesla-card border border-tesla-border rounded-xl overflow-hidden hover:border-[#CC0000]/40 transition-colors">
            <div className="relative h-32">
              <img src={plan.image} alt={plan.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-tesla-card via-transparent to-transparent" />
              <span className={`absolute top-2 left-2 ${plan.badgeColor} text-white text-[10px] font-bold px-2 py-0.5 rounded-full`}>{plan.badge}</span>
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-white font-semibold">{plan.name} <span className="text-gray-500 text-xs font-normal">&middot; {plan.model}</span></h3>
                <span className="text-[#CC0000] font-bold">{plan.daily}%/day</span>
              </div>
              <p className="text-gray-500 text-xs mb-3">${plan.min.toLocaleString()} — ${plan.max.toLocaleString()} &middot; {plan.duration} days</p>
              <button
                onClick={() => { setModal(i); setAmount(''); }}
                className="w-full bg-[#CC0000] hover:bg-[#a30000] text-white text-sm font-semibold py-2.5 rounded-lg transition-colors"
              >
                Invest Now
              </button>
            </div>
          </div>
        ))}
      </div>

      {modal !== null && selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setModal(null)} />
          <div className="relative w-full sm:max-w-md bg-tesla-card border border-tesla-border rounded-t-2xl sm:rounded-2xl overflow-hidden animate-scale-in max-h-[90vh] overflow-y-auto">
            <div className="relative h-36">
              <img src={selectedPlan.image} alt={selectedPlan.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-tesla-card via-transparent to-transparent" />
              <button onClick={() => setModal(null)} className="absolute top-3 right-3 w-8 h-8 bg-black/40 rounded-full flex items-center justify-center text-white hover:bg-black/60 transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <div className="p-5">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-white font-bold text-lg">{selectedPlan.name} Plan <span className="text-gray-500 text-sm font-normal">&middot; {selectedPlan.model}</span></h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full text-white ${selectedPlan.badgeColor}`}>{selectedPlan.badge}</span>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-400 mb-5">
                <span>{selectedPlan.daily}% daily</span>
                <span>{selectedPlan.duration} days</span>
                <span>${selectedPlan.min.toLocaleString()}—${selectedPlan.max.toLocaleString()}</span>
              </div>
              <label className="block text-gray-300 text-sm font-medium mb-1.5">Investment Amount ($)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={`$${selectedPlan.min} — $${selectedPlan.max}`}
                className="w-full bg-[#1a1a1a] border border-tesla-border rounded-lg px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#CC0000] transition-colors"
              />
              {numAmount > 0 && numAmount >= selectedPlan.min && numAmount <= selectedPlan.max && (
                <div className="mt-3 bg-[#1a1a1a] rounded-lg p-3 space-y-1.5 text-sm">
                  <div className="flex justify-between"><span className="text-gray-400">Daily Return</span><span className="text-green-400 font-medium">+${dailyReturn.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Duration</span><span className="text-white">{selectedPlan.duration} days</span></div>
                  <div className="border-t border-tesla-border pt-1.5 flex justify-between"><span className="text-gray-300 font-medium">Total Return</span><span className="text-green-400 font-bold">+${totalReturn.toFixed(2)}</span></div>
                </div>
              )}
              {numAmount > 0 && (numAmount < selectedPlan.min || numAmount > selectedPlan.max) && (
                <p className="text-red-400 text-xs mt-2">Amount must be between ${selectedPlan.min.toLocaleString()} and ${selectedPlan.max.toLocaleString()}</p>
              )}
              <button
                onClick={handleInvest}
                disabled={loading || !amount || numAmount < selectedPlan.min || numAmount > selectedPlan.max}
                className="w-full mt-5 bg-[#CC0000] hover:bg-[#a30000] disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors text-sm"
              >
                {loading ? 'Processing...' : `Invest $${(numAmount || 0).toLocaleString()}`}
              </button>
            </div>
          </div>
        </div>
      )}
</div>
  );
}
