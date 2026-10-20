'use client';

import { Component, type ReactNode, type ErrorInfo } from 'react';
import dynamic from 'next/dynamic';

// ── Safe wrapper for external widgets ──
class WidgetErrorBoundary extends Component<{ children: ReactNode; fallback?: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[Widget Error]', error?.message, info?.componentStack);
  }
  render() {
    if (this.state.hasError) return this.props.fallback || null;
    return this.props.children;
  }
}

const TradingViewAdvancedChart = dynamic(() => import('@/components/TradingViewAdvancedChart'), { ssr: false });
const TradingViewMarketOverview = dynamic(() => import('@/components/TradingViewMarketOverview'), { ssr: false });
const TradingViewCryptoScreener = dynamic(() => import('@/components/TradingViewCryptoScreener'), { ssr: false });

const news = [
  {
    title: 'Tesla Stock Rises as Musk Announces New AI Partnership',
    source: 'Reuters', time: '2 hours ago', sentiment: 'bullish',
    summary: 'Tesla shares jumped 3.2% after CEO Elon Musk revealed a strategic AI partnership that could revolutionize autonomous driving capabilities across the fleet.',
  },
  {
    title: 'Tesla Q4 Deliveries Exceed Wall Street Expectations',
    source: 'Bloomberg', time: '4 hours ago', sentiment: 'bullish',
    summary: 'Tesla delivered 510,000 vehicles in Q4, surpassing analyst estimates of 485,000. Model Y remained the best-selling EV globally.',
  },
  {
    title: 'Tesla Energy Division Reports Record Revenue Growth',
    source: 'CNBC', time: '6 hours ago', sentiment: 'bullish',
    summary: 'Tesla Energy reported a 40% year-over-year revenue increase driven by massive Megapack deployments and growing Powerwall demand.',
  },
  {
    title: 'Goldman Sachs Raises Tesla Price Target to $520',
    source: 'MarketWatch', time: '8 hours ago', sentiment: 'bullish',
    summary: 'Goldman Sachs upgraded Tesla from Neutral to Buy, setting a 12-month price target of $520 citing strong FSD adoption rates.',
  },
  {
    title: 'Tesla Expands Supercharger Network to 60,000 Stations Worldwide',
    source: 'The Verge', time: '12 hours ago', sentiment: 'neutral',
    summary: 'Tesla announced its Supercharger network has reached 60,000 stalls globally with plans to open 15,000 more to non-Tesla EVs.',
  },
  {
    title: 'Musk Says Tesla Robotaxi Launch Expected by Q3 2026',
    source: 'Financial Times', time: '1 day ago', sentiment: 'bullish',
    summary: 'Elon Musk confirmed that Tesla\'s dedicated robotaxi vehicle is on track for a limited launch in select markets by Q3 2026.',
  },
];

const tabItems = ['Overview', 'Tech Stocks', 'Crypto', 'News'];

export default function MarketPage() {
  return (
    <div className="space-y-5 -mx-4 px-4">
      {/* Header */}
      <div>
        <h1 className="text-white font-bold text-lg">Market Overview</h1>
        <p className="text-gray-500 text-xs mt-0.5">Real-time market data, charts, and analysis</p>
      </div>

      {/* ── MAIN TSLA CHART ── */}
      <div className="bg-tesla-card border border-tesla-border rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-tesla-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#CC0000] flex items-center justify-center">
              <span className="text-white text-xs font-bold">T</span>
            </div>
            <div>
              <p className="text-white text-sm font-bold">TSLA - Tesla, Inc.</p>
              <p className="text-gray-500 text-[10px]">NASDAQ &middot; Real-time</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-white text-base font-bold">$430.60</p>
            <p className="text-red-400 text-xs font-medium">-2.05 (-$9.02)</p>
          </div>
        </div>
        <WidgetErrorBoundary fallback={
          <div className="p-8 text-center bg-[#1a1a1a]">
            <p className="text-gray-600 text-xs">Chart unavailable. Please try refreshing.</p>
          </div>
        }>
          <TradingViewAdvancedChart symbol="NASDAQ:TSLA" interval="D" />
        </WidgetErrorBoundary>
      </div>

      {/* ── MARKET OVERVIEW WIDGET (Indices / Tech / Crypto) ── */}
      <div className="bg-tesla-card border border-tesla-border rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-tesla-border">
          <p className="text-white text-sm font-semibold">Global Markets</p>
          <p className="text-gray-500 text-[10px]">Indices, tech stocks, and crypto overview</p>
        </div>
        <div className="p-1">
          <WidgetErrorBoundary fallback={
            <div className="p-8 text-center bg-[#1a1a1a]">
              <p className="text-gray-600 text-xs">Market data unavailable. Please try refreshing.</p>
            </div>
          }>
            <TradingViewMarketOverview />
          </WidgetErrorBoundary>
        </div>
      </div>

      {/* ── MARKET STATS GRID ── */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { name: 'Nasdaq 100', price: '19,842.31', change: '+1.24%', up: true },
          { name: 'S&P 500', price: '5,987.15', change: '+0.68%', up: true },
          { name: 'Dow Jones', price: '42,156.78', change: '-0.12%', up: false },
          { name: 'Russell 2000', price: '2,134.56', change: '+0.94%', up: true },
        ].map((item) => (
          <div key={item.name} className="bg-tesla-card border border-tesla-border rounded-xl p-3">
            <p className="text-gray-500 text-[10px] uppercase font-medium">{item.name}</p>
            <p className="text-white text-sm font-bold mt-0.5">{item.price}</p>
            <p className={`text-[10px] font-medium ${item.up ? 'text-green-400' : 'text-red-400'}`}>{item.change}</p>
          </div>
        ))}
      </div>

      {/* ── CRYPTO SCREENER ── */}
      <div className="bg-tesla-card border border-tesla-border rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-tesla-border">
          <p className="text-white text-sm font-semibold">Crypto Market</p>
          <p className="text-gray-500 text-[10px]">Top cryptocurrencies by market cap</p>
        </div>
        <WidgetErrorBoundary fallback={
            <div className="p-8 text-center bg-[#1a1a1a]">
              <p className="text-gray-600 text-xs">Crypto data unavailable. Please try refreshing.</p>
            </div>
          }>
            <TradingViewCryptoScreener />
          </WidgetErrorBoundary>
      </div>

      {/* ── NEWS ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-full bg-[#CC0000] flex items-center justify-center">
            <span className="text-white text-[8px] font-bold">T</span>
          </div>
          <h2 className="text-white font-bold text-sm">Latest Market News</h2>
        </div>
        <div className="space-y-3">
          {news.map((article, i) => (
            <div key={i} className="bg-tesla-card border border-tesla-border rounded-xl p-4 hover:border-[#CC0000]/20 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[#CC0000] text-[10px] font-bold">{article.source}</span>
                <span className="text-gray-700 text-[10px]">&middot;</span>
                <span className="text-gray-600 text-[10px]">{article.time}</span>
                <span className={`ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded ${
                  article.sentiment === 'bullish' ? 'bg-green-900/30 text-green-400' :
                  article.sentiment === 'bearish' ? 'bg-red-900/30 text-red-400' :
                  'bg-gray-800 text-gray-400'
                }`}>{article.sentiment.toUpperCase()}</span>
              </div>
              <h4 className="text-white text-sm font-semibold leading-snug mb-1.5">{article.title}</h4>
              <p className="text-gray-500 text-xs leading-relaxed">{article.summary}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── FOOTER ── */}
      <div className="text-center pt-2 pb-2">
        <p className="text-gray-700 text-[10px]">&copy; {new Date().getFullYear()} TeslaPrime. All rights reserved.</p>
      </div>
</div>
  );
}