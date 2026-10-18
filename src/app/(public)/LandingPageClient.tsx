'use client';

import { useState, useEffect, useRef, useCallback, type ReactNode } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import WithdrawalNotification from '@/components/WithdrawalNotification';

const TradingViewWidget = dynamic(() => import('@/components/TradingViewWidget'), { ssr: false });

/* ── Shared Components ── */
function FadeIn({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} className={`transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

function AnimatedCounter({ value, suffix = '' }: { value: string; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [hasAnimated, setHasAnimated] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting && !hasAnimated) { setHasAnimated(true); } }, { threshold: 0.5 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasAnimated]);
  const numericPart = parseFloat(value.replace(/[^0-9.]/g, ''));
  const prefix = value.match(/^[^0-9]*/)?.[0] || '';
  const decimalPlaces = value.includes('.') ? value.split('.')[1]?.replace(/[^0-9]/g, '').length || 0 : 0;
  useEffect(() => {
    if (!hasAnimated || !ref.current) return;
    const duration = 2000;
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = numericPart * eased;
      if (ref.current) {
        let display: string;
        if (decimalPlaces > 0) { display = current.toFixed(decimalPlaces); }
        else if (numericPart >= 1000) { display = Math.round(current).toLocaleString(); }
        else { display = Math.round(current).toString(); }
        ref.current.textContent = prefix + display + suffix;
      }
      if (progress >= 1) clearInterval(interval);
    }, 16);
    return () => clearInterval(interval);
  }, [hasAnimated, numericPart, prefix, suffix, decimalPlaces]);
  return <span ref={ref} className="count-up" suppressHydrationWarning>{prefix}0{suffix}</span>;
}

function ScrollProgress() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(docHeight > 0 ? (scrollTop / docHeight) * 100 : 0);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  return <div className="scroll-progress" style={{ width: `${progress}%` }} />;
}

/* ── Data ── */
const plans = [
  { name: 'Basic', badge: 'STARTER', badgeBg: 'bg-gradient-to-r from-gray-600 to-gray-800', min: '$200', max: '$4,999', daily: '0.5%', duration: '30 Days', model: 'Model 3', image: 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=1200&q=80&auto=format&fit=crop', features: ['Daily profit accrual', 'Capital return included', '24/7 support access'] },
  { name: 'Silver', badge: 'POPULAR', badgeBg: 'bg-gradient-to-r from-[#CC0000] to-[#ff1a1a]', min: '$5,000', max: '$9,999', daily: '0.8%', duration: '21 Days', model: 'Model S', image: 'https://images.unsplash.com/photo-1536700503339-1e4b06520771?w=1200&q=80&auto=format&fit=crop', features: ['Higher daily returns', 'Priority withdrawals', 'Dedicated account manager'], popular: true },
  { name: 'Gold', badge: 'PREMIUM', badgeBg: 'bg-gradient-to-r from-amber-500 to-yellow-500', min: '$10,000', max: '$49,999', daily: '1.2%', duration: '14 Days', model: 'Model X', image: 'https://images.unsplash.com/photo-1554744512-d6c603f27c54?w=1200&q=80&auto=format&fit=crop', features: ['Premium daily rates', 'Instant profit withdrawal', 'Portfolio insurance'] },
  { name: 'Platinum', badge: 'ELITE', badgeBg: 'bg-gradient-to-r from-purple-500 to-indigo-500', min: '$50,000', max: '$100,000', daily: '1.8%', duration: '7 Days', model: 'Cybertruck', image: 'https://images.unsplash.com/photo-1617788138017-80ad40651399?w=1200&q=80&auto=format&fit=crop', features: ['Maximum daily returns', 'Zero-fee withdrawals', 'VIP concierge service'] },
];

const stats = [
  { value: '$2.4B', label: 'Assets Under Management', suffix: '+', icon: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5' },
  { value: '45000', label: 'Active Investors', suffix: '+', icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a3 3 0 100-6 3 3 0 000 6z' },
  { value: '99.9', label: 'Platform Uptime', suffix: '%', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
  { value: '24', label: 'Expert Support', suffix: '/7', icon: 'M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M5.636 18.364l3.536-3.536m0-5.656L5.636 5.636m12.728 0L5.636 18.364M18.364 18.364L5.636 5.636' },
];

const features = [
  { title: 'Managed Portfolios', desc: 'Expert fund managers allocate your capital across diversified strategies for optimal risk-adjusted returns. Our team monitors global markets 24/7 to capitalize on every opportunity.', icon: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5' },
  { title: 'Daily Profit Accrual', desc: 'Transparent, real-time profit tracking and instant crediting to your account every single day. Watch your capital grow with compound interest reinvestment.', icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' },
  { title: 'Bank-Grade Security', desc: '256-bit encryption, multi-factor authentication, cold storage for digital assets, and full regulatory compliance. Your funds are protected by institutional-grade infrastructure.', icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' },
  { title: 'Instant Withdrawals', desc: 'Access your funds whenever you need. Processed within minutes, not days. Gold and Platinum investors enjoy zero withdrawal fees on all transactions.', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
];

const steps = [
  { step: '01', title: 'Create Account', desc: 'Sign up in under 2 minutes with your email. Verify your identity and secure your account with two-factor authentication for maximum protection.', icon: 'M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a3 3 0 100-6 3 3 0 000 6z' },
  { step: '02', title: 'Choose a Plan', desc: 'Select from four investment tiers — Basic, Silver, Gold, or Platinum — each offering different daily returns, durations, and exclusive premium perks.', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  { step: '03', title: 'Earn Returns', desc: 'Your capital starts generating daily returns immediately. Withdraw earnings or reinvest to compound. Track everything from your real-time dashboard.', icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' },
];

const testimonials = [
  { name: 'David M.', location: 'New York, USA', plan: 'Gold Investor', text: 'TeslaPrime has completely transformed my investment strategy. The daily returns are consistent and the withdrawal process is seamless. I have been investing for 8 months and the results exceed my expectations.', avatar: 'D', photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face', roi: '+42% in 8 months' },
  { name: 'Sarah K.', location: 'London, UK', plan: 'Platinum Investor', text: 'The VIP support and zero-fee withdrawals make Platinum the best plan. My portfolio has grown over 40% in just 3 months.', avatar: 'S', photo: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&h=150&fit=crop&crop=face', roi: '+40% in 3 months' },
  { name: 'James T.', location: 'Sydney, AU', plan: 'Silver Investor', text: 'As a first-time investor, the platform made everything simple. The 0.8% daily returns are exactly as advertised and my account manager has been incredibly helpful.', avatar: 'J', photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face', roi: '+18% in 4 months' },
  { name: 'Amara O.', location: 'Lagos, NG', plan: 'Gold Investor', text: 'I was skeptical at first but TeslaPrime proved me wrong. The returns are real, the support team responds within minutes, and I have successfully withdrawn multiple times.', avatar: 'A', photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face', roi: '+35% in 6 months' },
  { name: 'Robert L.', location: 'Toronto, CA', plan: 'Platinum Investor', text: 'After retiring, I needed a reliable income source. TeslaPrime delivers exactly what they promise. My daily earnings are consistent and the platform is incredibly easy to navigate.', avatar: 'R', photo: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face', roi: '+28% in 5 months' },
  { name: 'Mei L.', location: 'Singapore', plan: 'Silver Investor', text: 'The referral program is fantastic. I have referred several colleagues and we all earn together. The platform transparency with real-time tracking sets it apart.', avatar: 'M', photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face', roi: '+15% in 3 months' },
];

/* ── Live User Counter ── */
function LiveUserCounter() {
  const [onlineCount, setOnlineCount] = useState(1247);
  const [todayDeposits, setTodayDeposits] = useState(384);
  const [todayTrades, setTodayTrades] = useState(2847);

  useEffect(() => {
    const interval = setInterval(() => {
      setOnlineCount(prev => {
        const delta = Math.floor(Math.random() * 21) - 10;
        return Math.max(800, prev + delta);
      });
      setTodayDeposits(prev => Math.max(100, prev + (Math.random() > 0.7 ? 1 : 0)));
      setTodayTrades(prev => prev + Math.floor(Math.random() * 3));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <FadeIn delay={200}>
      <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 mt-10">
        <div className="flex items-center gap-2.5 bg-black/30 border border-white/5 rounded-full px-5 py-2.5">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-gray-400 text-xs sm:text-sm">Users Online:</span>
          <span className="text-white font-bold text-sm sm:text-base tabular-nums" suppressHydrationWarning>{onlineCount.toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-2.5 bg-black/30 border border-white/5 rounded-full px-5 py-2.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          <span className="text-gray-400 text-xs sm:text-sm">Deposits Today:</span>
          <span className="text-white font-bold text-sm sm:text-base tabular-nums" suppressHydrationWarning>${todayDeposits.toLocaleString()}K</span>
        </div>
        <div className="flex items-center gap-2.5 bg-black/30 border border-white/5 rounded-full px-5 py-2.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#CC0000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>
          <span className="text-gray-400 text-xs sm:text-sm">Trades Today:</span>
          <span className="text-white font-bold text-sm sm:text-base tabular-nums" suppressHydrationWarning>{todayTrades.toLocaleString()}</span>
        </div>
      </div>
    </FadeIn>
  );
}

/* ── Pop-up Testimonial Component ── */
function TestimonialPopup() {
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [paused, setPaused] = useState(false);

  const show = useCallback((i: number) => {
    setExiting(false);
    setVisible(true);
    const hideTimer = setTimeout(() => {
      setExiting(true);
      setTimeout(() => { setVisible(false); setExiting(false); }, 500);
    }, 6000);
    return () => clearTimeout(hideTimer);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => show(0), 8000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (paused) return;
    const interval = setInterval(() => {
      const next = (idx + 1) % testimonials.length;
      setIdx(next);
      show(next);
    }, 18000);
    return () => clearInterval(interval);
  }, [idx, paused, show]);

  const t = testimonials[idx % testimonials.length];
  if (!visible || !t) return null;

  return (
    <div
      className={`fixed bottom-6 right-6 z-[998] max-w-sm transition-all duration-500 ${exiting ? 'opacity-0 translate-y-6 scale-95' : 'opacity-100 translate-y-0 scale-100'}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="bg-tesla-card/95 backdrop-blur-xl border border-tesla-border rounded-2xl shadow-2xl shadow-black/50 overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-[#CC0000] to-[#ff1a1a]" />
        <div className="p-5">
          <div className="flex items-start gap-3 mb-3">
            {t.photo ? (
              <img src={t.photo} alt={t.name} className="w-10 h-10 rounded-full object-cover border-2 border-[#CC0000]/30 shrink-0" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#CC0000] to-[#8B0000] flex items-center justify-center text-white text-sm font-bold shrink-0">{t.avatar}</div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold">{t.name}</p>
              <p className="text-gray-500 text-[11px]">{t.location} &middot; {t.plan}</p>
            </div>
            <button onClick={() => { setExiting(true); setTimeout(() => setVisible(false), 500); }} className="text-gray-600 hover:text-gray-400 transition-colors shrink-0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>
          <div className="flex gap-0.5 mb-2">
            {[...Array(5)].map((_, i) => <svg key={i} width="12" height="12" viewBox="0 0 24 24" fill="#F59E0B" stroke="none"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>)}
          </div>
          <p className="text-gray-300 text-xs leading-relaxed line-clamp-3">&ldquo;{t.text}&rdquo;</p>
        </div>
      </div>
    </div>
  );
}

const faqs = [
  { q: 'How does TeslaPrime generate returns?', a: 'Our fund managers deploy capital across diversified strategies including equities, crypto assets, algorithmic trading, and sustainable energy investments. By spreading risk across multiple asset classes and employing AI-driven analytics, we maintain consistent daily returns while minimizing exposure to any single market downturn.' },
  { q: 'Is my initial investment protected?', a: 'Yes, your principal is returned in full at the end of your plan duration. We maintain a capital reserve fund specifically designated to ensure all investor principals are secured regardless of market conditions. This reserve is regularly audited and maintained at a ratio that exceeds our total outstanding investment obligations.' },
  { q: 'How do I withdraw my earnings?', a: 'Navigate to Withdraw in your dashboard, enter the amount and your receiving wallet address. For verified accounts, withdrawals are processed within minutes. Gold and Platinum plan investors enjoy zero withdrawal fees. All applicable fees are clearly displayed before you confirm any transaction.' },
  { q: 'What deposit methods are accepted?', a: 'We accept Cryptocurrency (Bitcoin, Ethereum, USDT, and other major tokens) and Gift Cards (Amazon, Apple, Google Play, Steam, and other major retailers). Crypto deposits are confirmed within minutes after blockchain confirmation. Gift card deposits are verified and credited within 1-3 business hours.' },
  { q: 'How does the referral program work?', a: 'Share your unique referral link with friends. When they register and make their first deposit, you earn up to 10% commission on their deposit amount. There is no limit to the number of people you can refer, and commissions are credited instantly to your available balance.' },
];

/* ── TESLA MODEL SLIDESHOW ── */
const slideshowModels = [
  {
    name: 'Model S',
    tagline: 'Redefine Speed',
    price: 'From $89,990',
    specs: '405 mi range  \u00B7  1.99s 0-60  \u00B7  670 hp',
    image: 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=1400&q=80&auto=format&fit=crop',
    accent: '#CC0000',
  },
  {
    name: 'Model 3',
    tagline: 'Built for Everyone',
    price: 'From $38,990',
    specs: '358 mi range  \u00B7  5.8s 0-60  \u00B7  283 hp',
    image: 'https://images.unsplash.com/photo-1536700503339-1e4b06520771?w=1400&q=80&auto=format&fit=crop',
    accent: '#3B82F6',
  },
  {
    name: 'Model X',
    tagline: 'Beyond SUV',
    price: 'From $94,990',
    specs: '348 mi range  \u00B7  3.8s 0-60  \u00B7  670 hp',
    image: 'https://images.unsplash.com/photo-1554744512-d6c603f27c54?w=1400&q=80&auto=format&fit=crop',
    accent: '#F59E0B',
  },
  {
    name: 'Model Y',
    tagline: 'Versatility Meets Performance',
    price: 'From $44,990',
    specs: '310 mi range  \u00B7  4.8s 0-60  \u00B7  384 hp',
    image: 'https://images.unsplash.com/photo-1617788138017-80ad40651399?w=1400&q=80&auto=format&fit=crop',
    accent: '#22C55E',
  },
  {
    name: 'Cybertruck',
    tagline: 'Built for Any Planet',
    price: 'From $79,990',
    specs: '340 mi range  \u00B7  2.6s 0-60  \u00B7  845 hp',
    image: 'https://images.unsplash.com/photo-1619767886558-efdc259cde1a?w=1400&q=80&auto=format&fit=crop',
    accent: '#8B8B8B',
  },
  {
    name: 'Model S Plaid',
    tagline: 'Ultimate Performance',
    price: 'From $109,990',
    specs: '396 mi range  \u00B7  1.99s 0-60  \u00B7  1,020 hp',
    image: 'https://images.unsplash.com/photo-1525609004556-c46c40d5f3f9?w=1400&q=80&auto=format&fit=crop',
    accent: '#A855F7',
  },
];

function TeslaModelSlideshow({ models: serverModels }: { models?: any[] }) {
  // Use server-provided models or fall back to defaults
  const models = (serverModels && serverModels.length > 0) ? serverModels : slideshowModels;
  const [current, setCurrent] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const goTo = useCallback((idx: number) => {
    if (isTransitioning || idx === current) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrent(idx);
      setTimeout(() => setIsTransitioning(false), 50);
    }, 400);
  }, [current, isTransitioning]);

  const next = useCallback(() => {
    goTo((current + 1) % models.length);
  }, [current, goTo, models.length]);

  const prev = useCallback(() => {
    goTo((current - 1 + models.length) % models.length);
  }, [current, goTo, models.length]);

  useEffect(() => {
    if (paused) return;
    timerRef.current = setInterval(() => {
      goTo((current + 1) % models.length);
    }, 5000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [current, paused, goTo]);

  const m = models[current];

  return (
    <div
      className="relative w-full overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Background image with crossfade */}
      <div className="relative h-[420px] sm:h-[480px] lg:h-[540px]">
        {models.map((model, i) => (
          <div
            key={i}
            className="absolute inset-0 transition-all duration-[800ms] ease-in-out"
            style={{
              opacity: i === current ? 1 : 0,
              transform: i === current ? 'scale(1)' : 'scale(1.05)',
              zIndex: i === current ? 1 : 0,
            }}
          >
            <img
              src={model.image}
              alt={model.name}
              className="w-full h-full object-cover"
              loading={i === 0 ? 'eager' : 'lazy'}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-tesla-dark via-tesla-dark/80 to-tesla-dark/30" />
            <div className="absolute inset-0 bg-gradient-to-t from-tesla-dark via-transparent to-tesla-dark/40" />
          </div>
        ))}

        {/* Content overlay */}
        <div className="absolute inset-0 z-10 flex items-center">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <div
              className="max-w-lg transition-all duration-500"
              style={{
                opacity: isTransitioning ? 0 : 1,
                transform: isTransitioning ? 'translateY(20px)' : 'translateY(0)',
              }}
            >
              <div
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase mb-5"
                style={{
                  backgroundColor: `${m.accent}18`,
                  color: m.accent,
                  border: `1px solid ${m.accent}30`,
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: m.accent }} />
                {m.name}
              </div>
              <h3 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-3 leading-tight">
                {m.tagline}
              </h3>
              <p className="text-gray-300 text-base sm:text-lg mb-2 font-medium">
                {m.price}
              </p>
              <p className="text-gray-500 text-sm mb-8 tracking-wide">
                {m.specs}
              </p>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-bold text-sm text-white transition-all duration-300 hover:scale-105 shadow-lg"
                style={{
                  backgroundColor: m.accent,
                  boxShadow: `0 4px 25px ${m.accent}40`,
                }}
              >
                Configure & Order
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              </Link>
            </div>
          </div>
        </div>

        {/* Navigation arrows */}
        <button
          onClick={prev}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-black/60 transition-all duration-300"
          aria-label="Previous model"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <button
          onClick={next}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-black/60 transition-all duration-300"
          aria-label="Next model"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>

      {/* Dot indicators + model name strip */}
      <div className="relative z-10 bg-gradient-to-b from-tesla-dark to-transparent -mt-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-2">
          <div className="flex items-center justify-center gap-3">
            {models.map((model, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className="group flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300"
                style={{
                  backgroundColor: i === current ? `${model.accent}18` : 'transparent',
                  border: `1px solid ${i === current ? `${model.accent}40` : 'transparent'}`,
                }}
              >
                <span
                  className="block rounded-full transition-all duration-300"
                  style={{
                    width: i === current ? '24px' : '8px',
                    height: '8px',
                    backgroundColor: i === current ? model.accent : '#4B5563',
                  }}
                />
                <span
                  className="text-xs font-semibold transition-all duration-300 hidden sm:block"
                  style={{
                    color: i === current ? '#fff' : '#6B7280',
                    maxWidth: i === current ? '80px' : '0',
                    opacity: i === current ? 1 : 0,
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {model.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── MAIN COMPONENT ── */
export default function LandingPageClient() {
  const [faqOpen, setFaqOpen] = useState<number | null>(null);
  const [elonPhoto, setElonPhoto] = useState<string | null>(null);
  const [slideshowServerModels, setSlideshowServerModels] = useState<any[] | null>(null);

  useEffect(() => {
    fetch('/api/admin/settings')
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          if (d.data?.elonPhotoUrl) setElonPhoto(d.data.elonPhotoUrl);
        }
      })
      .catch(() => {});
    // Fetch featured vehicles from DB for slideshow
    fetch('/api/vehicles?featured=true')
      .then(r => r.json())
      .then(d => {
        if (d.success && Array.isArray(d.data) && d.data.length > 0) {
          const accentColors = ['#CC0000', '#3B82F6', '#F59E0B', '#22C55E', '#8B8B8B', '#A855F7', '#EC4899', '#F97316'];
          const mapped = d.data.map((v: any, idx: number) => ({
            name: v.name,
            tagline: v.category === 'Sedan' ? 'Engineered for Excellence' : v.category === 'SUV' ? 'Beyond Boundaries' : v.category === 'Pickup' ? 'Built for Any Planet' : 'The Future Drives Tesla',
            price: `From $${Number(v.basePrice).toLocaleString()}`,
            specs: `${v.specs?.range || ''} mi range  ·  ${v.specs?.acceleration || ''} 0-60  ·  ${v.specs?.horsepower || ''} hp`,
            image: v.imageUrl || '',
            accent: accentColors[idx % accentColors.length],
          }));
          setSlideshowServerModels(mapped);
        }
      })
      .catch(() => {});
  }, []);

  // No default photo — shows uploaded/admin-set photo only

  return (
    <div className="min-h-screen bg-tesla-dark text-white page-enter">
      <ScrollProgress />

      {/* ══════════ HERO ══════════ */}
      <section className="relative pt-44 pb-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto overflow-hidden">
        <div className="float-orb float-orb-lg" style={{ top: '5%', left: '-8%' }} />
        <div className="float-orb float-orb-md" style={{ top: '25%', right: '-5%' }} />
        <div className="float-orb float-orb-sm" style={{ bottom: '15%', left: '35%' }} />
        <div className="bg-gradient-hero relative z-10">
          <FadeIn>
            <div className="text-center max-w-4xl mx-auto">
              {/* Elon Musk Portrait */}
              <div className="mb-10 flex justify-center">
                <div className="relative group">
                  {elonPhoto ? (
                    <img
                      src={elonPhoto}
                      alt="Tesla CEO"
                      className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border-4 border-[#CC0000]/40 shadow-[0_0_40px_rgba(204,0,0,0.2)] group-hover:border-[#CC0000]/70 group-hover:shadow-[0_0_60px_rgba(204,0,0,0.3)] transition-all duration-500"
                    />
                  ) : (
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-[#CC0000]/40 flex items-center justify-center bg-[#111]">
                      <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="#CC0000" strokeWidth="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    </div>
                  )}
                  <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#CC0000] flex items-center justify-center shadow-lg">
                    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="white"><path d="M12 5.362l2.475-3.026s4.245.09 8.471 2.054c-1.082 1.636-3.231 2.438-3.231 2.438-.146-1.439-1.154-1.79-4.354-1.79L12 24 8.619 5.034c-3.18 0-4.188.354-4.335 1.792 0 0-2.146-.795-3.229-2.43C5.28 2.431 9.525 2.34 9.525 2.34L12 5.362h-.004.004zm0-3.899c3.415-.03 7.326.528 11.328 2.28.535-.968.672-1.395.672-1.395C19.625.612 15.528.015 12 0 8.472.015 4.375.61 0 2.349c0 0 .195.525.672 1.396C4.674 1.989 8.585 1.435 12 1.46V1.463z"/></svg>
                  </div>
                </div>
              </div>

              <div className="inline-flex items-center gap-3 bg-[#CC0000]/10 border border-[#CC0000]/20 rounded-full px-6 py-2.5 mb-8">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#CC0000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
                <span className="text-[#CC0000] text-sm font-medium tracking-wide">Trusted by 45,000+ investors worldwide</span>
              </div>
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black leading-[1.1] tracking-tight mb-8 text-shadow-subtle">
                Invest Smarter.<br />
                <span className="gradient-text-animated">Earn Daily Returns.</span>
              </h1>
              <p className="text-gray-400 text-lg sm:text-xl lg:text-2xl max-w-2xl mx-auto mb-12 leading-relaxed font-light">
                TeslaPrime offers professionally managed investment plans with daily returns up to <span className="text-white font-semibold">1.8%</span>. Institutional-grade security meets effortless investing.
              </p>
              <div className="flex flex-col sm:flex-row gap-5 justify-center">
                <Link href="/register" className="btn-red text-lg px-10 py-4 pulse-ring magnetic-hover rounded-2xl">
                  Start Investing Now
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                </Link>
                <Link href="/plans" className="btn-ghost text-lg px-10 py-4 magnetic-hover rounded-2xl">
                  View Investment Plans
                </Link>
              </div>
              <LiveUserCounter />
            </div>
          </FadeIn>
        </div>

        {/* Board Members / Team Photo */}
        <FadeIn delay={300}>
          <div className="mt-16 relative max-w-5xl mx-auto">
            <div className="relative rounded-2xl overflow-hidden border border-tesla-border shadow-[0_8px_40px_rgba(0,0,0,0.4)]">
              <img
                src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200&q=80&fit=crop"
                alt="TeslaPrime Leadership Team"
                className="w-full h-48 sm:h-56 md:h-64 object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-tesla-dark via-tesla-dark/60 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
                <p className="text-white font-bold text-sm sm:text-base mb-1">Our Leadership</p>
                <p className="text-gray-400 text-xs sm:text-sm">A team of seasoned investment professionals driving your financial success</p>
              </div>
            </div>
          </div>
        </FadeIn>
      </section>

      <hr className="section-divider" />

      {/* ══════════ STATS BAR ══════════ */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-tesla-card/40 border-y border-tesla-border">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">
            {stats.map((s, i) => (
              <FadeIn key={i} delay={i * 150}>
                <div className="text-center group">
                  <div className="w-14 h-14 mx-auto bg-[#CC0000]/10 rounded-2xl flex items-center justify-center mb-5 group-hover:bg-[#CC0000]/20 group-hover:shadow-[0_0_30px_rgba(204,0,0,0.2)] transition-all duration-500">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#CC0000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d={s.icon} /></svg>
                  </div>
                  <div className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-2 tracking-tight">
                    <AnimatedCounter value={s.value} suffix={s.suffix} />
                  </div>
                  <div className="text-gray-500 text-sm font-medium tracking-wide">{s.label}</div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <hr className="section-divider" />

      {/* ══════════ TESLA MODEL SHOWCASE ══════════ */}
      <section className="relative">
        <FadeIn>
          <TeslaModelSlideshow models={slideshowServerModels ?? undefined} />
        </FadeIn>
      </section>

      <hr className="section-divider" />

      {/* ══════════ LIVE CHART ══════════ */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-tesla-card/30 relative overflow-hidden">
        <div className="float-orb float-orb-md" style={{ top: '-15%', right: '8%' }} />
        <div className="max-w-7xl mx-auto relative z-10">
          <FadeIn>
            <div className="text-center mb-14">
              <div className="inline-flex items-center gap-2 mb-4">
                <span className="glow-dot" />
                <span className="text-green-400 text-sm font-bold tracking-widest uppercase">Live Market Data</span>
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-5 heading-gradient">TSLA Live Chart</h2>
              <p className="text-gray-400 max-w-2xl mx-auto text-base leading-relaxed">Real-time Tesla stock performance powered by TradingView. Track the market that drives our investment strategy.</p>
            </div>
          </FadeIn>
          <FadeIn delay={200}>
            <div className="glass-card card-shine noise-overlay !p-0 overflow-hidden animated-border">
              <div className="px-6 py-4 border-b border-tesla-border flex items-center justify-between bg-black/20">
                <div className="flex items-center gap-4">
                  <span className="text-white font-bold text-lg">NASDAQ:TSLA</span>
                  <span className="text-gray-500 text-sm hidden sm:inline">Tesla, Inc.</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="glow-dot" />
                  <span className="text-xs text-gray-500 font-medium">Live</span>
                </div>
              </div>
              <TradingViewWidget />
            </div>
          </FadeIn>
        </div>
      </section>

      <hr className="section-divider" />

      {/* ══════════ INVESTMENT PLANS ══════════ */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative overflow-hidden">
        <div className="float-orb float-orb-lg" style={{ bottom: '-20%', left: '-12%' }} />
        <div className="float-orb float-orb-sm" style={{ top: '10%', right: '-3%' }} />
        <div className="relative z-10">
          <FadeIn>
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-5 heading-gradient">Investment Plans</h2>
              <p className="text-gray-400 max-w-2xl mx-auto text-base leading-relaxed">Choose the plan that fits your investment goals. Higher tiers unlock higher daily returns and exclusive premium perks.</p>
            </div>
          </FadeIn>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {plans.map((plan, i) => (
              <FadeIn key={i} delay={i * 150}>
                <div className={`plan-card glass-card card-shine group tilt-card h-full flex flex-col ${plan.popular ? 'ring-1 ring-[#CC0000]/40' : ''}`}>
                  <div className="relative h-56 overflow-hidden bg-black">
                    <img src={plan.image} alt={`${plan.name} Plan - ${plan.model}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" loading="lazy" />
                    <div className="absolute inset-0 bg-gradient-to-t from-tesla-dark via-tesla-dark/50 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-transparent" />
                    <span className={`absolute top-4 left-4 ${plan.badgeBg} text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg tracking-wide`}>{plan.badge}</span>
                    {plan.popular && <div className="absolute -top-px left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#CC0000] to-transparent" />}
                  </div>
                  <div className="p-6 bg-gradient-card-glow flex-1 flex flex-col">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                        <span className="text-gray-500 text-xs font-medium tracking-wider uppercase">{plan.model}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[#CC0000] text-3xl font-black">{plan.daily}</span>
                        <span className="text-gray-500 text-xs block">daily</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm mb-5 py-3 px-4 bg-black/30 rounded-xl border border-white/5">
                      <span className="text-gray-300 font-medium">{plan.min} — {plan.max}</span>
                      <span className="text-gray-500">{plan.duration}</span>
                    </div>
                    <ul className="space-y-3 mb-6 flex-1">
                      {plan.features.map((f, j) => (
                        <li key={j} className="flex items-center gap-3 text-gray-300 text-sm">
                          <div className="w-5 h-5 rounded-full bg-[#CC0000]/10 flex items-center justify-center shrink-0">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#CC0000" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                          </div>
                          {f}
                        </li>
                      ))}
                    </ul>
                    <Link href="/register" className={`block w-full text-center text-sm font-bold py-3.5 rounded-xl transition-all duration-300 ${plan.popular ? 'btn-red pulse-ring' : 'bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:border-[#CC0000]/30'}`}>
                      Invest Now
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="inline ml-1"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                    </Link>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
          <div className="text-center mt-14">
            <Link href="/plans" className="inline-flex items-center gap-2 text-[#CC0000] hover:text-[#ff1a1a] font-semibold transition-colors group">
              View Full Plan Details with ROI Calculator
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-1 transition-transform"><polyline points="9 18 15 12 9 6"/></svg>
            </Link>
          </div>
        </div>
      </section>

      <hr className="section-divider" />

      {/* ══════════ WHY CHOOSE US ══════════ */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-tesla-card/30 relative overflow-hidden">
        <div className="float-orb float-orb-sm" style={{ top: '15%', left: '3%' }} />
        <div className="float-orb float-orb-md" style={{ bottom: '5%', right: '5%' }} />
        <div className="max-w-7xl mx-auto relative z-10">
          <FadeIn>
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-5 heading-gradient">Why Choose Us</h2>
              <p className="text-gray-400 max-w-2xl mx-auto text-base leading-relaxed">Cutting-edge technology with institutional-grade fund management. Every feature designed for your success.</p>
            </div>
          </FadeIn>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((item, i) => (
              <FadeIn key={i} delay={i * 150}>
                <div className="dash-card card-shine noise-overlay p-8 group tilt-card relative overflow-hidden h-full">
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#CC0000]/0 to-transparent group-hover:via-[#CC0000]/60 transition-all duration-500" />
                  <div className="w-16 h-16 bg-gradient-to-br from-[#CC0000]/20 to-[#CC0000]/5 rounded-2xl flex items-center justify-center mb-6 group-hover:shadow-[0_0_30px_rgba(204,0,0,0.3)] transition-all duration-500 group-hover:scale-110">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#CC0000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d={item.icon} /></svg>
                  </div>
                  <h3 className="text-white font-bold text-xl mb-3">{item.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
          <div className="text-center mt-14">
            <Link href="/about" className="inline-flex items-center gap-2 text-[#CC0000] hover:text-[#ff1a1a] font-semibold transition-colors group">
              Learn More About Our Company
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-1 transition-transform"><polyline points="9 18 15 12 9 6"/></svg>
            </Link>
          </div>
        </div>
      </section>

      <hr className="section-divider" />

      {/* ══════════ SECURITY & TRUST BADGES ══════════ */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-tesla-card/30 relative overflow-hidden">
        <div className="max-w-7xl mx-auto relative z-10">
          <FadeIn>
            <div className="text-center mb-14">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-5 heading-gradient">Enterprise-Grade Security</h2>
              <p className="text-gray-400 max-w-2xl mx-auto text-base leading-relaxed">Your funds and data are protected by the same security infrastructure trusted by leading financial institutions worldwide.</p>
            </div>
          </FadeIn>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {[
              { icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', label: '256-bit SSL Encryption', color: '#22C55E' },
              { icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', label: 'Two-Factor Auth (2FA)', color: '#3B82F6' },
              { icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', label: 'Cold Storage Assets', color: '#CC0000' },
              { icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', label: 'SOC2 Compliance', color: '#F59E0B' },
              { icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', label: '$10M Insurance Fund', color: '#8B5CF6' },
              { icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', label: 'DDoS Protection', color: '#EC4899' },
            ].map((badge, i) => (
              <FadeIn key={i} delay={i * 100}>
                <div className="bg-black/20 border border-white/5 rounded-2xl p-5 text-center group hover:border-white/10 hover:bg-black/30 transition-all duration-300">
                  <div className="w-12 h-12 mx-auto rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: `${badge.color}15` }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={badge.color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d={badge.icon} /><polyline points="9 12 11 14 15 10" /></svg>
                  </div>
                  <p className="text-gray-300 text-xs font-semibold leading-tight">{badge.label}</p>
                </div>
              </FadeIn>
            ))}
          </div>
          <FadeIn delay={600}>
            <div className="mt-12 flex flex-wrap items-center justify-center gap-8">
              {['Cloudflare', 'Norton', 'McAfee Secure', 'ISO 27001', 'PCI DSS'].map((name) => (
                <div key={name} className="text-gray-600 text-xs font-medium tracking-wider uppercase opacity-60 hover:opacity-100 transition-opacity">{name}</div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      <hr className="section-divider" />

      {/* ══════════ HOW TO START ══════════ */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative overflow-hidden">
        <div className="float-orb float-orb-lg" style={{ top: '-15%', right: '-10%' }} />
        <div className="relative z-10">
          <FadeIn>
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-5 heading-gradient">How to Get Started</h2>
              <p className="text-gray-400 max-w-2xl mx-auto text-base leading-relaxed">Start earning daily returns in three simple steps. No complicated setup, no hidden requirements.</p>
            </div>
          </FadeIn>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 relative">
            <div className="hidden md:block absolute top-[72px] left-[20%] right-[20%] h-[1px] bg-gradient-to-r from-[#CC0000]/20 via-[#CC0000]/40 to-[#CC0000]/20" />
            {steps.map((item, i) => (
              <FadeIn key={i} delay={i * 200}>
                <div className="dash-card card-shine p-8 relative group">
                  <span className="text-[#CC0000]/[0.06] text-8xl font-black absolute top-2 right-4 group-hover:text-[#CC0000]/10 transition-colors select-none">{item.step}</span>
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#CC0000]/20 to-transparent flex items-center justify-center mb-5 relative">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#CC0000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d={item.icon} /></svg>
                  </div>
                  <h3 className="text-white font-bold text-xl mb-3 relative">{item.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed relative">{item.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
          <div className="text-center mt-14">
            <Link href="/how-to-invest" className="inline-flex items-center gap-2 text-[#CC0000] hover:text-[#ff1a1a] font-semibold transition-colors group">
              Read the Full Investment Guide
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-1 transition-transform"><polyline points="9 18 15 12 9 6"/></svg>
            </Link>
          </div>
        </div>
      </section>

      <hr className="section-divider" />

      {/* ══════════ TESTIMONIALS ══════════ */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-tesla-card/30 relative overflow-hidden">
        <div className="float-orb float-orb-md" style={{ top: '10%', left: '-5%' }} />
        <div className="max-w-7xl mx-auto relative z-10">
          <FadeIn>
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-5 heading-gradient">What Investors Say</h2>
              <p className="text-gray-400 max-w-2xl mx-auto text-base leading-relaxed">Real feedback from real investors. Join thousands who are already growing their wealth with TeslaPrime.</p>
            </div>
          </FadeIn>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {testimonials.map((t, i) => (
              <FadeIn key={i} delay={i * 150}>
                <div className="dash-card card-shine noise-overlay p-8 group tilt-card h-full flex flex-col">
                  <div className="flex items-center gap-1 mb-5">
                    {[...Array(5)].map((_, j) => (
                      <svg key={j} width="16" height="16" viewBox="0 0 24 24" fill="#CC0000" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                    ))}
                  </div>
                  <p className="text-gray-300 text-sm leading-relaxed mb-6 flex-1">&ldquo;{t.text}&rdquo;</p>
                  {t.roi && (
                    <div className="mb-4 px-3 py-1.5 bg-green-900/20 border border-green-700/30 rounded-lg inline-flex items-center gap-2">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                      <span className="text-green-400 text-xs font-bold">{t.roi} ROI</span>
                    </div>
                  )}
                  <div className="flex items-center gap-4 pt-5 border-t border-tesla-border">
                    {t.photo ? (
                      <img src={t.photo} alt={t.name} className="w-12 h-12 rounded-full object-cover border-2 border-[#CC0000]/30" loading="lazy" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#CC0000] to-[#800000] flex items-center justify-center text-white font-bold text-lg">{t.avatar}</div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-white font-semibold text-sm">{t.name}</p>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="#3B82F6" stroke="none"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                      </div>
                      <p className="text-gray-500 text-xs">{t.location} &middot; {t.plan}</p>
                    </div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <hr className="section-divider" />

      {/* ══════════ COMMUNITY & SOCIAL ══════════ */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-tesla-card/30 relative overflow-hidden">
        <div className="max-w-7xl mx-auto relative z-10">
          <FadeIn>
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-5 heading-gradient">Join Our Community</h2>
              <p className="text-gray-400 max-w-2xl mx-auto text-base leading-relaxed">Stay connected with thousands of investors. Follow us for market updates, investment tips, and community events.</p>
            </div>
          </FadeIn>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { name: 'Telegram', desc: 'Join 12,000+ members in our official group for real-time signals and support.', color: '#229ED9', followers: '12.4K', url: 'https://t.me/TeslaPrime', iconPath: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z' },
              { name: 'Twitter / X', desc: 'Follow for daily market insights, strategies, and platform announcements.', color: '#ffffff', followers: '28.5K', url: 'https://twitter.com/TeslaPrimeCap', iconPath: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z' },
              { name: 'Instagram', desc: 'Behind-the-scenes content, success stories, and educational investment posts.', color: '#E4405F', followers: '15.2K', url: '#', iconPath: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z' },
              { name: 'LinkedIn', desc: 'Connect with our team and network with fellow investors professionally.', color: '#0A66C2', followers: '8.7K', url: '#', iconPath: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z' },
            ].map((social, i) => (
              <FadeIn key={i} delay={i * 150}>
                <a href={social.url} target="_blank" rel="noopener noreferrer" className="block bg-black/20 border border-white/5 rounded-2xl p-6 group hover:border-white/10 hover:bg-black/30 transition-all duration-300 h-full">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${social.color}20` }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill={social.color} stroke="none"><path d={social.iconPath}/></svg>
                    </div>
                    <div>
                      <p className="text-white font-bold text-sm">{social.name}</p>
                      <p className="text-gray-500 text-xs">{social.followers} followers</p>
                    </div>
                  </div>
                  <p className="text-gray-400 text-xs leading-relaxed mb-4">{social.desc}</p>
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold transition-colors" style={{ color: social.color }}>
                    Join Now
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                  </span>
                </a>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <hr className="section-divider" />

      {/* ══════════ FAQ ══════════ */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <FadeIn>
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-5 heading-gradient">Frequently Asked Questions</h2>
              <p className="text-gray-400 text-base">Get answers to the most common questions about our platform.</p>
            </div>
          </FadeIn>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <FadeIn key={i} delay={i * 80}>
                <div
                  className={`bg-tesla-card border rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer ${faqOpen === i ? 'border-[#CC0000]/30 shadow-[0_0_25px_rgba(204,0,0,0.08)]' : 'border-tesla-border hover:border-white/10'}`}
                  onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                >
                  <div className="flex items-center justify-between p-6">
                    <p className="text-white font-semibold text-sm sm:text-base pr-4">{faq.q}</p>
                    <div className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 ${faqOpen === i ? 'bg-[#CC0000]/20 rotate-180' : 'bg-white/5'}`}>
                      <svg className="w-4 h-4 text-gray-400 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                    </div>
                  </div>
                  <div className={`overflow-hidden transition-all duration-500 ease-in-out ${faqOpen === i ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                    <div className="px-6 pb-6 text-gray-400 text-sm leading-relaxed border-t border-tesla-border pt-5">{faq.a}</div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
          <div className="text-center mt-14">
            <Link href="/faq" className="inline-flex items-center gap-2 text-[#CC0000] hover:text-[#ff1a1a] font-semibold transition-colors group">
              View All 15+ FAQ Questions
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-1 transition-transform"><polyline points="9 18 15 12 9 6"/></svg>
            </Link>
          </div>
        </div>
      </section>

      <hr className="section-divider" />

      {/* ══════════ CTA ══════════ */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="float-orb float-orb-lg" style={{ top: '-25%', left: '30%' }} />
        <FadeIn>
          <div className="max-w-4xl mx-auto relative z-10">
            <div className="animated-border">
              <div className="relative overflow-hidden rounded-3xl">
                <div className="absolute inset-0 bg-gradient-to-br from-[#CC0000]/15 via-[#CC0000]/5 to-transparent rounded-3xl" />
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#CC0000]/8 rounded-full blur-[120px]" />
                <div className="relative bg-tesla-dark/90 rounded-3xl p-10 sm:p-16 text-center noise-overlay">
                  <div className="inline-flex items-center gap-3 bg-[#CC0000]/10 border border-[#CC0000]/20 rounded-full px-6 py-2.5 mb-8">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#CC0000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg>
                    <span className="text-[#CC0000] text-sm font-medium">Join 45,000+ investors today</span>
                  </div>
                  <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-5 relative">Ready to Start <span className="gradient-text-animated">Earning</span>?</h2>
                  <p className="text-gray-400 max-w-lg mx-auto mb-10 relative text-base leading-relaxed">Your financial future starts with a single decision. Create a free account and start earning daily returns in under 5 minutes.</p>
                  <div className="flex flex-col sm:flex-row gap-5 justify-center">
                    <Link href="/register" className="btn-red text-lg px-10 py-4 pulse-ring magnetic-hover rounded-2xl">
                      Create Free Account
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                    </Link>
                    <Link href="/contact" className="btn-ghost text-lg px-10 py-4 magnetic-hover rounded-2xl">
                      Talk to Our Team
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </FadeIn>
      </section>

      <TestimonialPopup />
      <WithdrawalNotification />
    </div>
  );
}
