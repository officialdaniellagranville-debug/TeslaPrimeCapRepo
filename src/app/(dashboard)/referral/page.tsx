'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/useAuthStore';

const markets = [
  { name: 'S&P 500', value: '5,998.74', change: '+1.23%', up: true },
  { name: 'NASDAQ', value: '19,211.10', change: '+1.67%', up: true },
  { name: 'DOW', value: '42,875.44', change: '-0.32%', up: false },
  { name: 'BTC', value: '$104,230', change: '+3.45%', up: true },
];

interface ReferralData {
  referralCode: string;
  totalReferrals: number;
  totalCommissionsEarned: number;
  pendingCommissions?: number;
  funnel?: {
    totalReferred: number;
    kycCompleted: number;
    firstDeposit: number;
    vehicleOrders?: number;
  };
}

export default function ReferralPage() {
  const [copied, setCopied] = useState(false);
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const { user, token } = useAuthStore();

  const baseUrl = typeof window !== 'undefined'
    ? window.location.origin
    : (process.env.NEXT_PUBLIC_APP_URL || 'https://teslaprimecap.com');
  const code = user?.referralCode || data?.referralCode || '--------';
  const referralLink = `${baseUrl}/ref/${code}`;

  const fetchReferralData = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/referral', { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (json.success && json.data) setData(json.data);
    } catch {} finally { setLoading(false); }
  }, [token]);

  useEffect(() => { fetchReferralData(); }, [fetchReferralData]);

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareText = `Join me on Tesla Prime Capital and start earning daily returns! Use my referral link: ${referralLink}`;

  const totalEarnings = data?.totalCommissionsEarned ?? 0;
  const pendingCommissions = data?.pendingCommissions ?? 0;
  const totalReferrals = data?.totalReferrals ?? 0;
  const funnel = data?.funnel ?? { totalReferred: 0, kycCompleted: 0, firstDeposit: 0, vehicleOrders: 0 };

  const funnelSteps = [
    { label: 'Total Referred', value: funnel.totalReferred, color: '#CC0000', pct: 100 },
    { label: 'KYC Completed', value: funnel.kycCompleted, color: '#F59E0B', pct: funnel.totalReferred > 0 ? Math.round((funnel.kycCompleted / funnel.totalReferred) * 100) : 0 },
    { label: 'First Deposit', value: funnel.firstDeposit, color: '#22C55E', pct: funnel.totalReferred > 0 ? Math.round((funnel.firstDeposit / funnel.totalReferred) * 100) : 0 },
    { label: 'Vehicle Orders', value: funnel.vehicleOrders || 0, color: '#3B82F6', pct: funnel.totalReferred > 0 ? Math.round(((funnel.vehicleOrders || 0) / funnel.totalReferred) * 100) : 0 },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-white font-bold text-lg">Referral Program</h2>
        <p className="text-gray-500 text-sm mt-0.5">Invite friends and earn bonus rewards on deposits & vehicle orders</p>
      </div>

      {/* Referral Stats */}
      <div className="bg-tesla-card border border-tesla-border rounded-xl p-5">
        <div className="grid grid-cols-2 gap-4 mb-5">
          <div>
            <p className="text-gray-500 text-xs font-medium mb-1">Total Earnings</p>
            <p className="text-white text-2xl font-bold">
              {loading ? <span className="inline-block w-16 h-7 bg-[#1a1a1a] rounded animate-pulse" /> : `$${totalEarnings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            </p>
          </div>
          <div>
            <p className="text-gray-500 text-xs font-medium mb-1">Total Referrals</p>
            <p className="text-white text-2xl font-bold">
              {loading ? <span className="inline-block w-10 h-7 bg-[#1a1a1a] rounded animate-pulse" /> : totalReferrals}
            </p>
          </div>
        </div>
        {pendingCommissions > 0 && (
          <div className="mb-4 bg-[#1a1a1a] rounded-lg px-3 py-2 flex items-center justify-between">
            <span className="text-yellow-400 text-xs font-medium">Pending Commissions</span>
            <span className="text-yellow-400 text-sm font-bold">${pendingCommissions.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        )}

        {/* Referral Link */}
        <div className="bg-[#1a1a1a] rounded-lg p-3 flex items-center gap-2">
          <input type="text" readOnly value={referralLink} className="flex-1 bg-transparent text-gray-300 text-sm font-mono outline-none min-w-0 truncate" />
          <button onClick={handleCopy} className="shrink-0 bg-[#CC0000] hover:bg-[#a30000] text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors">
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Conversion Funnel */}
      {!loading && (
        <div className="bg-tesla-card border border-tesla-border rounded-xl p-5">
          <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-[#CC0000] rounded-full" />
            Conversion Funnel
          </h3>
          <div className="space-y-0">
            {funnelSteps.map((step, i) => (
              <div key={step.label}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-gray-400 text-xs font-medium">{step.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-white text-sm font-bold">{step.value}</span>
                    {i > 0 && <span className="text-gray-600 text-xs">{step.pct}%</span>}
                  </div>
                </div>
                <div className="w-full h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden mb-3">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${step.pct}%`, backgroundColor: step.color, opacity: 0.85 }} />
                </div>
                {i < funnelSteps.length - 1 && (
                  <div className="flex justify-center mb-2">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 2v8M2 6l4 4 4-4" stroke="#333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Reward tiers info */}
          <div className="mt-5 pt-4 border-t border-tesla-border">
            <p className="text-gray-500 text-[10px] font-medium mb-2 uppercase tracking-wider">Reward Tiers</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-[#1a1a1a] rounded-lg p-3">
                <p className="text-green-400 text-xs font-semibold">Investment Deposit</p>
                <p className="text-gray-500 text-[10px] mt-0.5">10% of deposit amount</p>
              </div>
              <div className="bg-[#1a1a1a] rounded-lg p-3">
                <p className="text-blue-400 text-xs font-semibold">Vehicle Order</p>
                <p className="text-gray-500 text-[10px] mt-0.5">5% of 10% deposit</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Share on Social */}
      <div className="bg-tesla-card border border-tesla-border rounded-xl p-5">
        <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
          <span className="w-2 h-2 bg-[#CC0000] rounded-full" />
          Share on Social
        </h3>
        <div className="flex gap-3">
          <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-[#1a1a1a] hover:bg-white/10 border border-tesla-border text-gray-300 px-4 py-2.5 rounded-lg transition-colors">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
            <span className="text-xs font-medium">X</span>
          </a>
          <a href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-[#1a1a1a] hover:bg-green-500/20 border border-tesla-border text-gray-300 px-4 py-2.5 rounded-lg transition-colors">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
            <span className="text-xs font-medium">WhatsApp</span>
          </a>
          <a href={`https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent('Join me on Tesla Prime Capital!')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-[#1a1a1a] hover:bg-blue-500/20 border border-tesla-border text-gray-300 px-4 py-2.5 rounded-lg transition-colors">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" /></svg>
            <span className="text-xs font-medium">Telegram</span>
          </a>
        </div>
      </div>

      {/* Market Overview */}
      <div>
        <h3 className="text-white font-semibold text-sm mb-3">Market Overview</h3>
        <div className="grid grid-cols-2 gap-3">
          {markets.map((m) => (
            <div key={m.name} className="bg-tesla-card border border-tesla-border rounded-xl p-4">
              <p className="text-gray-500 text-xs font-medium">{m.name}</p>
              <p className="text-white font-bold text-lg mt-0.5">{m.value}</p>
              <span className={`text-xs font-semibold ${m.up ? 'text-green-400' : 'text-red-400'}`}>{m.change}</span>
            </div>
          ))}
        </div>
      </div>
</div>
  );
}
