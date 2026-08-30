'use client';

import { useState, useEffect } from 'react';

interface CurrencyPair {
  flag: string;
  name: string;
  rate: string;
  change: number;
}

const pairs: CurrencyPair[] = [
  { flag: '🇺🇸', name: 'USD/EUR', rate: '0.9234', change: 0.12 },
  { flag: '🇬🇧', name: 'USD/GBP', rate: '0.7918', change: -0.08 },
  { flag: '🇯🇵', name: 'USD/JPY', rate: '154.32', change: 0.24 },
  { flag: '🇨🇭', name: 'USD/CHF', rate: '0.8812', change: -0.15 },
  { flag: '🇨🇦', name: 'USD/CAD', rate: '1.3645', change: 0.06 },
  { flag: '🇦🇺', name: 'USD/AUD', rate: '1.5312', change: -0.11 },
  { flag: '🇪🇺', name: 'EUR/GBP', rate: '0.8571', change: 0.03 },
  { flag: '🇯🇵', name: 'EUR/JPY', rate: '167.08', change: 0.18 },
  { flag: '🇬🇧', name: 'GBP/JPY', rate: '194.92', change: -0.21 },
  { flag: '₿', name: 'BTC/USD', rate: '104,832', change: 1.42 },
  { flag: 'Ξ', name: 'ETH/USD', rate: '3,847', change: -0.67 },
  { flag: '🥇', name: 'XAU/USD', rate: '2,918.40', change: 0.33 },
];

function TickerItem({ pair, mobile }: { pair: CurrencyPair; mobile: boolean }) {
  const isPositive = pair.change >= 0;
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap px-5 text-xs">
      <span className="text-sm">{pair.flag}</span>
      <span className="text-gray-300 font-medium">{pair.name}</span>
      <span className="text-white font-semibold tabular-nums">{pair.rate}</span>
      {!mobile && (
        <span
          className={`font-medium tabular-nums ${
            isPositive ? 'text-[#34D399]' : 'text-[#F87171]'
          }`}
        >
          {isPositive ? '▲' : '▼'}
          {Math.abs(pair.change).toFixed(2)}%
        </span>
      )}
    </span>
  );
}

export default function RateTicker() {
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return (
    <div className="relative w-full h-10 bg-[#0A0E1A] border-b border-white/5 overflow-hidden z-[60]">
      {/* Left fade */}
      <div className="absolute left-0 top-0 bottom-0 w-16 z-10 pointer-events-none bg-gradient-to-r from-[#0A0E1A] to-transparent" />
      {/* Right fade */}
      <div className="absolute right-0 top-0 bottom-0 w-16 z-10 pointer-events-none bg-gradient-to-l from-[#0A0E1A] to-transparent" />

      <style jsx>{`
        @keyframes ticker-scroll {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }
        .ticker-track {
          animation: ticker-scroll 40s linear infinite;
        }
        .ticker-track:hover {
          animation-play-state: paused;
        }
      `}</style>

      <div className="ticker-track flex items-center h-full">
        {/* First set */}
        {pairs.map((p, i) => (
          <TickerItem key={`a-${i}`} pair={p} mobile={mobile} />
        ))}
        {/* Duplicate for seamless loop */}
        {pairs.map((p, i) => (
          <TickerItem key={`b-${i}`} pair={p} mobile={mobile} />
        ))}
      </div>
    </div>
  );
}
