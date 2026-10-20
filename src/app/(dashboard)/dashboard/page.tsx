'use client';

import { useState, useEffect, Component, type ReactNode, type ErrorInfo } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useAuthStore } from '@/store/useAuthStore';
import TeslaLogo from '@/components/TeslaLogo';
import ActiveTradeChart from '@/components/ActiveTradeChart';
import WithdrawalNotification from '@/components/WithdrawalNotification';
import HowToInvestSlider from '@/components/HowToInvestSlider';

// ── Safe wrapper for external widgets ──
class WidgetErrorBoundary extends Component<{ children: ReactNode; fallback?: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: Error) {
    console.error('[Widget Error Boundary]', error?.message);
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback || null;
    }
    return this.props.children;
  }
}

// Dynamic imports for TradingView widgets (no SSR)
const TickerTapeWidget = dynamic(() => import('@/components/TickerTapeWidget'), { ssr: false });
const TradingViewAdvancedChart = dynamic(() => import('@/components/TradingViewAdvancedChart'), { ssr: false });
const TradingViewTechnicalAnalysis = dynamic(() => import('@/components/TradingViewTechnicalAnalysis'), { ssr: false });

// ── Elon Musk Hero Section ──
function HeroSection() {
  const [elonPhoto, setElonPhoto] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/settings')
      .then(r => r.json())
      .then(d => { if (d.success && d.data?.elonPhotoUrl) setElonPhoto(d.data.elonPhotoUrl); })
      .catch(() => {});
  }, []);

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a0505] via-[#2a0a0a] to-tesla-card border border-[#CC0000]/15">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#CC0000] rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#CC0000] rounded-full blur-[100px]" />
      </div>
      <div className="relative p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row items-center gap-5">
          {/* Elon Photo - show admin uploaded photo or empty placeholder */}
          <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden border-2 border-[#CC0000]/30 shrink-0 bg-tesla-card flex items-center justify-center">
            {elonPhoto ? (
              <img src={elonPhoto} alt="Tesla CEO" className="w-full h-full object-cover" />
            ) : (
              <svg viewBox="0 0 24 24" className="w-10 h-10 text-[#CC0000]/30" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            )}
          </div>
          <div className="text-center sm:text-left flex-1">
            <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
              <TeslaLogo variant="compact" className="h-8" />
            </div>
            <h2 className="text-white text-lg sm:text-xl font-bold mt-1 leading-tight">
              A New Approach to Trading
            </h2>
            <p className="text-gray-400 text-xs mt-2 leading-relaxed max-w-md">
              Tesla Prime Capital gives you the best financial solution. Invest in the future of sustainable energy and AI-driven technology with industry-leading returns.
            </p>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-3">
              <Link href="/investments" className="bg-[#CC0000] hover:bg-[#a30000] text-white text-xs font-semibold px-5 py-2.5 rounded-lg transition-colors">
                Start Investing
              </Link>
              <Link href="/market" className="border border-tesla-border hover:border-gray-500 text-gray-300 hover:text-white text-xs font-semibold px-5 py-2.5 rounded-lg transition-colors">
                Explore Markets
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Tesla Vehicles Promo Section ──
function VehiclesPromoSection() {
  return (
    <div className="bg-gradient-to-br from-[#CC0000]/15 via-[#1a1a1a] to-[#1a1a1a] border border-[#CC0000]/30 rounded-2xl p-5 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-40 h-40 bg-[#CC0000]/5 rounded-full blur-[60px] pointer-events-none" />
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-xl bg-[#CC0000]/20 border border-[#CC0000]/30 flex items-center justify-center shrink-0">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#CC0000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 17h14M5 17a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1l2-3h8l2 3h1a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2M5 17l-1 2h16l-1-2"/><circle cx="7.5" cy="13" r="1.5"/><circle cx="16.5" cy="13" r="1.5"/></svg>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="text-white text-sm font-bold">Buy Tesla Vehicles</p>
              <span className="bg-[#CC0000]/20 text-[#CC0000] text-[9px] font-bold px-1.5 py-0.5 rounded-full animate-pulse">NEW</span>
            </div>
            <p className="text-gray-500 text-xs">Order Model S, 3, X, Y, Cybertruck & track delivery</p>
          </div>
        </div>
        <div className="flex items-center gap-2 mb-4">
          {['Model S', 'Model 3', 'Model X', 'Model Y', 'Cybertruck'].map((name) => (
            <span key={name} className="bg-[#111] border border-tesla-border text-gray-400 text-[10px] px-2 py-1 rounded-lg">{name}</span>
          ))}
        </div>
        <Link href="/vehicles" className="w-full flex items-center justify-center gap-2 bg-[#CC0000] hover:bg-[#a30000] text-white text-xs font-bold py-3 rounded-xl transition-colors">
          <span>Browse & Order Tesla Vehicles</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </Link>
      </div>
    </div>
  );
}

// ── Stats Counter Section ──
function StatsSection() {
  const stats = [
    { label: 'Years In Business', value: '10+', icon: '📅' },
    { label: 'Happy Investors', value: '5M+', icon: '👥' },
    { label: 'Total Payouts', value: '$2.4B+', icon: '💰' },
    { label: 'Countries', value: '180+', icon: '🌍' },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {stats.map((s) => (
        <div key={s.label} className="bg-tesla-card border border-tesla-border rounded-xl p-3 text-center hover:border-[#CC0000]/20 transition-colors">
          <span className="text-lg">{s.icon}</span>
          <p className="text-white text-lg font-bold mt-1">{s.value}</p>
          <p className="text-gray-500 text-[10px]">{s.label}</p>
        </div>
      ))}
    </div>
  );
}

// ── Core Features Section ──
function FeaturesSection() {
  const features = [
    { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#CC0000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>, title: 'Strong Security', desc: '256-bit SSL encryption protects all your data and transactions' },
    { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#CC0000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>, title: 'Legal Compliance', desc: 'Fully registered and regulated under international financial laws' },
    { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#CC0000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>, title: 'Cross Platform', desc: 'Access your account from any device — desktop, tablet, or mobile' },
    { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#CC0000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>, title: '24/7 Support', desc: 'Round-the-clock customer support via live chat and email' },
    { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#CC0000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>, title: 'World Coverage', desc: 'Global reach with investors from over 180 countries worldwide' },
    { icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#CC0000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>, title: 'Advanced Reporting', desc: 'Detailed transaction history, statements, and performance reports' },
  ];
  return (
    <div>
      <div className="text-center mb-4">
        <h2 className="text-white font-bold text-sm">Core Features</h2>
        <p className="text-gray-500 text-[10px]">Why we are above others</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {features.map((f) => (
          <div key={f.title} className="bg-tesla-card border border-tesla-border rounded-xl p-4 hover:border-[#CC0000]/30 transition-colors group">
            <div className="w-10 h-10 bg-[#CC0000]/10 rounded-lg flex items-center justify-center mb-3 group-hover:bg-[#CC0000]/20 transition-colors">
              {f.icon}
            </div>
            <p className="text-white text-xs font-semibold mb-1">{f.title}</p>
            <p className="text-gray-500 text-[10px] leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── News Data ──
const news = [
  { title: 'Tesla Stock Rises as Musk Announces New AI Partnership', source: 'Reuters', time: '2 hours ago', sentiment: 'bullish', summary: 'Tesla shares jumped 3.2% after CEO Elon Musk revealed a strategic AI partnership that could revolutionize autonomous driving capabilities across the fleet.' },
  { title: 'Tesla Q4 Deliveries Exceed Wall Street Expectations', source: 'Bloomberg', time: '4 hours ago', sentiment: 'bullish', summary: 'Tesla delivered 510,000 vehicles in Q4, surpassing analyst estimates of 485,000. Model Y remained the best-selling EV globally for the third consecutive quarter.' },
  { title: 'Tesla Energy Division Reports Record Revenue Growth', source: 'CNBC', time: '6 hours ago', sentiment: 'bullish', summary: 'Tesla Energy reported a 40% year-over-year revenue increase driven by massive Megapack deployments and growing Powerwall demand across residential markets.' },
  { title: 'Goldman Sachs Raises Tesla Price Target to $520', source: 'MarketWatch', time: '8 hours ago', sentiment: 'bullish', summary: 'Goldman Sachs upgraded Tesla from Neutral to Buy, setting a 12-month price target of $520 citing strong FSD adoption rates and improving margins.' },
];

const investmentPlans = [
  { name: 'Starter', min: '$500', return: '3.5%', duration: '7 days', badge: 'Popular', color: 'bg-[#CC0000]/10 text-[#CC0000]' },
  { name: 'Growth', min: '$5,000', return: '5.2%', duration: '14 days', badge: 'Best Value', color: 'bg-green-900/30 text-green-400' },
  { name: 'Premium', min: '$25,000', return: '7.8%', duration: '30 days', badge: 'High Yield', color: 'bg-yellow-900/30 text-yellow-400' },
  { name: 'Elite', min: '$100,000', return: '12.5%', duration: '60 days', badge: 'VIP', color: 'bg-purple-900/30 text-purple-400' },
];

interface Transaction {
  id: string;
  type: string;
  amount: number;
  status: string;
  createdAt: string;
}

function txStatusColor(status: string) {
  const s = (status || '').toLowerCase();
  if (s === 'completed' || s === 'approved' || s === 'confirmed') return 'text-green-400';
  if (s === 'pending' || s === 'pending_verification') return 'text-yellow-400';
  return 'text-gray-500';
}

function txStatusLabel(status: string) {
  const s = (status || '').toLowerCase();
  if (s === 'completed' || s === 'approved' || s === 'confirmed') return 'Confirmed';
  if (s === 'pending' || s === 'pending_verification') return 'Pending';
  if (s === 'rejected' || s === 'failed') return 'Rejected';
  return status;
}

function formatTxTime(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

// ── MAIN DASHBOARD ──
export default function DashboardPage() {
  const { user } = useAuthStore();
  const [greeting, setGreeting] = useState('');
  const [userName, setUserName] = useState('Investor');
  const [recentTx, setRecentTx] = useState<Transaction[]>([]);
  const [investedAmount, setInvestedAmount] = useState(0);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 17) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');
    if (user?.profile?.firstName) setUserName(user.profile.firstName);
    else if (user?.email) setUserName(user.email.split('@')[0]);
  }, [user]);

  // Fetch real recent transactions
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch('/api/wallet/transactions?type=all&limit=6', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data) {
          const list = d.data.transactions || d.data || [];
          setRecentTx(Array.isArray(list) ? list : []);
        }
      })
      .catch(() => {});
  }, []);

  // Fetch user's active investments to drive the live trade chart.
  // The chart's startBalance and movement amplitude scale with this
  // total — bigger position = bigger visible swings. When 0, the
  // chart shows a 'start investing' placeholder instead of a live line.
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch('/api/investments/active', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.success && Array.isArray(d.data)) {
          const total = d.data.reduce((sum: number, inv: any) => {
            const amt = Number(inv?.amount ?? 0);
            return Number.isFinite(amt) ? sum + amt : sum;
          }, 0);
          setInvestedAmount(Number(total.toFixed(2)));
        }
      })
      .catch(() => {});
  }, []);

  // Find live wallet, fallback to first available wallet
  const activeWallet = user?.wallets?.find(w => w.type === 'live') || user?.wallets?.[0] || null;

  return (
    <div className="space-y-5 -mx-4 px-4">
      {/* ── TICKER TAPE ── */}
      <div className="-mx-4 px-0">
        <WidgetErrorBoundary fallback={null}>
          <TickerTapeWidget />
        </WidgetErrorBoundary>
      </div>

      {/* ── HERO SECTION WITH ELON ── */}
      <HeroSection />

      {/* ── GREETING ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {user?.profile?.avatarUrl && (
            <img src={user.profile.avatarUrl} alt={userName} className="w-10 h-10 rounded-full object-cover border border-tesla-border shrink-0" />
          )}
          <div>
            <p className="text-gray-500 text-xs">{greeting}</p>
            <h1 className="text-white text-lg font-bold">{userName}</h1>
          </div>
        </div>
        <div className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-green-900/30 text-green-400 border border-green-700/40">
          Live Account
        </div>
      </div>

      {/* ── BALANCE CARD ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#CC0000]/20 via-tesla-card to-tesla-card border border-[#CC0000]/20 rounded-2xl p-5">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#CC0000]/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-[#CC0000]/5 rounded-full translate-y-1/2 -translate-x-1/2" />
        <div className="relative">
          <div className="flex items-center justify-between mb-4">
            <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">Total Balance</p>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-green-400 text-[10px] font-medium">LIVE</span>
            </div>
          </div>
          <p className="text-white text-3xl font-bold mb-1">${activeWallet?.balance?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</p>
          <div className="flex items-center gap-4 mt-3">
            <div>
              <p className="text-gray-500 text-[10px] uppercase">Available</p>
              <p className="text-white text-sm font-semibold">${activeWallet?.availableBalance?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</p>
            </div>
            <div className="w-px h-8 bg-tesla-border" />
            <div>
              <p className="text-gray-500 text-[10px] uppercase">Locked</p>
              <p className="text-white text-sm font-semibold">${activeWallet?.lockedBalance?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── QUICK ACTIONS ── */}
      <div className="grid grid-cols-5 gap-2">
        {[
          { href: '/deposit', label: 'Deposit', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>, color: 'bg-green-900/20 text-green-400 border-green-800/30' },
          { href: '/withdraw', label: 'Withdraw', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>, color: 'bg-blue-900/20 text-blue-400 border-blue-800/30' },
          { href: '/investments', label: 'Invest', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>, color: 'bg-[#CC0000]/10 text-[#CC0000] border-[#CC0000]/20' },
          { href: '/vehicles', label: 'Vehicles', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M5 17h14M5 17a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1l2-3h8l2 3h1a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2M5 17l-1 2h16l-1-2"/><circle cx="7.5" cy="13" r="1.5"/><circle cx="16.5" cy="13" r="1.5"/></svg>, color: 'bg-amber-900/20 text-amber-400 border-amber-800/30' },
          { href: '/referral', label: 'Refer', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>, color: 'bg-purple-900/20 text-purple-400 border-purple-800/30' },
        ].map((action) => (
          <Link key={action.href} href={action.href} className={`flex flex-col items-center gap-2 p-3 rounded-xl border ${action.color} transition-all hover:scale-[1.02] active:scale-95`}>
            {action.icon}
            <span className="text-[10px] font-semibold">{action.label}</span>
          </Link>
        ))}
      </div>

      {/* ── ACTIVE TRADE CHART (Live indicator) ── */}
      {/* Chart only renders the live line if the user has at least one
          active investment. Admin can spike it from the admin panel. */}
      <ActiveTradeChart
        investedAmount={investedAmount}
        ticker="TSLA"
      />

      {/* ── TSLA CHART ── */}
      <WidgetErrorBoundary fallback={
        <div className="bg-tesla-card border border-tesla-border rounded-2xl overflow-hidden p-8 text-center">
          <p className="text-gray-600 text-xs">Chart unavailable. Please try refreshing the page.</p>
        </div>
      }>
      <div className="bg-tesla-card border border-tesla-border rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-tesla-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TeslaLogo variant="icon" className="w-5 h-5" />
            <div>
              <p className="text-white text-sm font-bold">TSLA</p>
              <p className="text-gray-500 text-[10px]">Tesla, Inc. &middot; NASDAQ</p>
            </div>
          </div>
        </div>
        <TradingViewAdvancedChart symbol="NASDAQ:TSLA" interval="D" />
      </div>
      </WidgetErrorBoundary>

      {/* ── TECHNICAL ANALYSIS ── */}
      <div className="bg-tesla-card border border-tesla-border rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-tesla-border">
          <p className="text-white text-sm font-semibold">Technical Analysis</p>
          <p className="text-gray-500 text-[10px]">Buy/Sell signals based on popular indicators</p>
        </div>
        <div className="p-2">
          <WidgetErrorBoundary fallback={<p className="text-gray-600 text-xs p-4 text-center">Technical analysis unavailable</p>}>
            <TradingViewTechnicalAnalysis symbol="NASDAQ:TSLA" />
          </WidgetErrorBoundary>
        </div>
      </div>

      {/* ── INVESTMENT PLANS ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white font-bold text-sm">Investment Plans</h2>
          <Link href="/investments" className="text-[#CC0000] text-xs font-medium hover:underline">View All</Link>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
          {investmentPlans.map((plan) => (
            <div key={plan.name} className="min-w-[150px] bg-tesla-card border border-tesla-border rounded-xl p-4 flex-shrink-0 hover:border-[#CC0000]/30 transition-colors">
              <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full inline-block mb-3 ${plan.color}`}>{plan.badge}</span>
              <p className="text-white text-sm font-bold">{plan.name}</p>
              <p className="text-green-400 text-lg font-bold">{plan.return}</p>
              <p className="text-gray-500 text-[10px] mt-1">Min: {plan.min} &middot; {plan.duration}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── TESLA VEHICLES PROMO ── */}
      <VehiclesPromoSection />

      {/* ── STATS COUNTERS ── */}
      <StatsSection />

      {/* ── CORE FEATURES ── */}
      <FeaturesSection />

      {/* ── RECENT ACTIVITY (Real Data) ── */}
      <div>
        <div className="text-center mb-4">
          <h2 className="text-white font-bold text-sm">Recent Activity</h2>
          <p className="text-gray-500 text-[10px]">Your latest transactions</p>
        </div>
        <div className="space-y-2">
          {recentTx.length === 0 ? (
            <div className="bg-tesla-card border border-tesla-border rounded-xl p-8 text-center">
              <p className="text-gray-600 text-xs">No transactions yet</p>
              <p className="text-gray-700 text-[10px] mt-1">Make your first deposit to get started</p>
            </div>
          ) : (
            recentTx.map((tx) => (
              <div key={tx.id} className="bg-tesla-card border border-tesla-border rounded-xl p-3 flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-[9px] font-bold shrink-0 ${
                  tx.type?.toLowerCase() === 'deposit' ? 'bg-green-600/20 text-green-400' :
                  tx.type?.toLowerCase() === 'withdrawal' ? 'bg-yellow-600/20 text-yellow-400' :
                  tx.type?.toLowerCase() === 'investment' ? 'bg-blue-600/20 text-blue-400' :
                  'bg-purple-600/20 text-purple-400'
                }`}>
                  {tx.type?.charAt(0)?.toUpperCase() || 'T'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-[11px] font-medium capitalize">{tx.type} <span className="text-gray-500">{txStatusColor(tx.status).includes('green') ? 'completed' : txStatusLabel(tx.status).toLowerCase()}</span></p>
                  <p className="text-gray-600 text-[9px]">{formatTxTime(tx.createdAt)}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-xs font-bold ${tx.type?.toLowerCase() === 'withdrawal' ? 'text-red-400' : 'text-green-400'}`}>
                    {tx.type?.toLowerCase() === 'withdrawal' ? '-' : '+'}${tx.amount?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                  </p>
                  <p className={`text-[9px] ${txStatusColor(tx.status)}`}>{txStatusLabel(tx.status)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── NEWS ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TeslaLogo variant="icon" className="w-5 h-5" />
            <h2 className="text-white font-bold text-sm">TSLA Top Stories</h2>
          </div>
          <Link href="/market" className="text-[#CC0000] text-xs font-medium hover:underline">See All</Link>
        </div>
        <div className="space-y-3">
          {news.map((article, i) => (
            <div key={i} className="bg-tesla-card border border-tesla-border rounded-xl p-4 hover:border-[#CC0000]/20 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[#CC0000] text-[10px] font-bold">{article.source}</span>
                <span className="text-gray-700 text-[10px]">&middot;</span>
                <span className="text-gray-600 text-[10px]">{article.time}</span>
                <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded bg-green-900/30 text-green-400">{article.sentiment.toUpperCase()}</span>
              </div>
              <h4 className="text-white text-sm font-semibold leading-snug mb-1">{article.title}</h4>
              <p className="text-gray-500 text-xs leading-relaxed">{article.summary}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── REFERRAL ── */}
      <div className="bg-gradient-to-br from-[#CC0000]/10 via-tesla-card to-tesla-card border border-[#CC0000]/20 rounded-2xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-[#CC0000]/20 flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#CC0000" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <div>
            <p className="text-white text-sm font-bold">Refer & Earn</p>
            <p className="text-gray-500 text-xs">Earn up to 10% commission</p>
          </div>
          <Link href="/referral" className="ml-auto text-[#CC0000] text-xs font-bold hover:underline">Details →</Link>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-[#1a1a1a] border border-tesla-border rounded-lg px-3 py-2.5 text-xs text-gray-400 truncate">
            {`${process.env.NEXT_PUBLIC_APP_URL || 'https://teslaprimecap.com'}/ref/${user?.referralCode || '------'}`}
          </div>
          <button onClick={() => navigator.clipboard.writeText(`${process.env.NEXT_PUBLIC_APP_URL || 'https://teslaprimecap.com'}/ref/` + (user?.referralCode || ''))} className="w-10 h-10 bg-[#CC0000] rounded-lg flex items-center justify-center shrink-0 hover:bg-[#a30000] transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          </button>
        </div>
      </div>

      {/* ── MARKET QUICK STATS ── */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { name: 'Nasdaq', price: '19,842.31', change: '+1.24%', up: true },
          { name: 'S&P 500', price: '5,987.15', change: '+0.68%', up: true },
          { name: 'BTC/USD', price: '$68,420', change: '-0.93%', up: false },
          { name: 'ETH/USD', price: '$3,845', change: '+1.57%', up: true },
        ].map((item) => (
          <div key={item.name} className="bg-tesla-card border border-tesla-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-gray-500 text-[10px] uppercase font-medium">{item.name}</p>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={item.up ? '#22C55E' : '#ef4444'} strokeWidth="2"><polyline points={item.up ? "22 7 13.5 15.5 8.5 10.5 2 17" : "22 17 13.5 8.5 8.5 13.5 2 7"}/></svg>
            </div>
            <p className="text-white text-base font-bold">{item.price}</p>
            <p className={`text-[10px] font-medium ${item.up ? 'text-green-400' : 'text-red-400'}`}>{item.change}</p>
          </div>
        ))}
      </div>

      {/* ── HOW TO INVEST (3D SLIDER) ── */}
      <div className="bg-gradient-to-b from-tesla-card to-transparent border border-tesla-border rounded-2xl p-5 sm:p-6">
        <div className="text-center mb-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#CC0000]/10 border border-[#CC0000]/20 mb-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#CC0000] animate-pulse" />
            <span className="text-[#CC0000] text-[10px] font-bold uppercase tracking-wider">For You</span>
          </div>
          <h2 className="text-white font-bold text-lg sm:text-xl mb-1">How to Invest</h2>
          <p className="text-gray-500 text-xs">A 5-step walkthrough — auto-playing</p>
        </div>
        <WidgetErrorBoundary fallback={null}>
          <HowToInvestSlider />
        </WidgetErrorBoundary>
      </div>

      {/* ── FOOTER ── */}
      <div className="text-center pt-2 pb-2">
        <div className="flex items-center justify-center gap-3 mb-2">
          <span className="text-gray-600 text-[10px]">256-bit SSL</span>
          <span className="text-gray-600 text-[10px]">Secured</span>
          <span className="text-gray-600 text-[10px]">24/7</span>
        </div>
        <TeslaLogo variant="wordmark" className="h-6 mx-auto mb-2 opacity-30" />
        <p className="text-gray-700 text-[10px]">&copy; {new Date().getFullYear()} Tesla Prime Capital. All rights reserved.</p>
      </div>

      <WidgetErrorBoundary fallback={null}>
</WidgetErrorBoundary>

      {/* ── LIVE WITHDRAWAL NOTIFICATIONS ── */}
      <WidgetErrorBoundary fallback={null}>
        <WithdrawalNotification />
      </WidgetErrorBoundary>
    </div>
  );
}
