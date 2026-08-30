'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Globe3D from '@/components/bank/Globe3D';

interface HeroSectionProps {
  currentPage?: string;
  onNavigate: (page: string) => void;
}

const SLIDES = [
  {
    img: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=1600&h=900&fit=crop&q=80',
    alt: 'Modern banking cards and technology',
  },
  {
    img: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1600&h=900&fit=crop&q=80',
    alt: 'Financial dashboard analytics',
  },
  {
    img: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=1600&h=900&fit=crop&q=80',
    alt: 'Modern architecture and finance',
  },
  {
    img: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1600&h=900&fit=crop&q=80',
    alt: 'Banking cards and mobile payments',
  },
] as const;

const STATS = [
  { value: '2.4', prefix: '$', suffix: 'B+', label: 'Assets Under Management', icon: 'banknote' },
  { value: '150', prefix: '', suffix: 'K+', label: 'Active Clients', icon: 'users' },
  { value: '99.99', prefix: '', suffix: '%', label: 'Uptime', icon: 'clock' },
  { value: '4.9', prefix: '', suffix: '/5', label: 'Client Rating', icon: 'star' },
] as const;

const TRUST_ITEMS = [
  { label: 'FDIC Insured', icon: 'shield' },
  { label: '256-bit Encryption', icon: 'lock' },
  { label: 'SOC 2 Certified', icon: 'check-circle' },
  { label: 'PCI DSS Compliant', icon: 'shield-check' },
] as const;

/* ─── Inline SVG Icon Components ─── */
function ShieldIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function ShieldCheckIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  );
}

function BanknoteStatIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="12" x="2" y="6" rx="2" />
      <circle cx="12" cy="12" r="2" />
      <path d="M6 12h.01M18 12h.01" />
    </svg>
  );
}

function UsersStatIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function ClockStatIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function StarStatIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 6.91-1.01z" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

const STAT_ICON_MAP: Record<string, () => React.ReactNode> = {
  banknote: BanknoteStatIcon,
  users: UsersStatIcon,
  clock: ClockStatIcon,
  star: StarStatIcon,
};

const TRUST_ICON_MAP: Record<string, () => React.ReactNode> = {
  shield: ShieldIcon,
  lock: LockIcon,
  'check-circle': CheckCircleIcon,
  'shield-check': ShieldCheckIcon,
};

/* ─── Animated counter hook ─── */
function useAnimatedCounter(target: string, duration: number = 2500) {
  const num = parseFloat(target);
  const hasDecimals = target.includes('.');
  const decimals = hasDecimals ? target.split('.')[1].length : 0;
  const [display, setDisplay] = useState(() => '0');
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const startTime = Date.now();

    const tick = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = num * eased;

      if (hasDecimals) {
        setDisplay(current.toFixed(decimals));
      } else {
        setDisplay(Math.floor(current).toLocaleString());
      }

      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        setDisplay(hasDecimals ? num.toFixed(decimals) : Math.floor(num).toLocaleString());
      }
    };

    requestAnimationFrame(tick);
  }, [target, duration, num, decimals, hasDecimals]);

  return display;
}

/* ─── Particle / Sparkle component ─── */
function Particles() {
  const particles = useRef(
    Array.from({ length: 30 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      size: Math.random() * 3 + 1,
      duration: Math.random() * 8 + 6,
      delay: Math.random() * 10,
      opacity: Math.random() * 0.4 + 0.1,
    }))
  ).current;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-[5]">
      <style>{`
        @keyframes particleFloat {
          0% { transform: translateY(100vh) scale(0); opacity: 0; }
          10% { opacity: var(--p-opacity); }
          90% { opacity: var(--p-opacity); }
          100% { transform: translateY(-20vh) scale(1); opacity: 0; }
        }
      `}</style>
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.left}%`,
            bottom: 0,
            width: p.size,
            height: p.size,
            background: 'linear-gradient(135deg, #60A5FA, #2563EB)',
            boxShadow: '0 0 6px rgba(96, 165, 250, 0.5)',
            '--p-opacity': p.opacity,
            animation: `particleFloat ${p.duration}s ${p.delay}s infinite ease-out`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

/* ─── Stat Item Component ─── */
function StatItem({ stat, delay }: { stat: typeof STATS[number]; delay: number }) {
  const animatedValue = useAnimatedCounter(stat.value, 2500);
  const [visible, setVisible] = useState(false);
  const IconComponent = STAT_ICON_MAP[stat.icon];

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      className={`flex flex-col items-center gap-2 px-4 py-4 rounded-xl transition-all duration-700 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
      style={{ background: 'rgba(255,255,255,0.04)' }}
    >
      {IconComponent && (
        <div
          className="flex items-center justify-center w-10 h-10 rounded-xl mb-1"
          style={{ background: 'rgba(37, 99, 235, 0.2)' }}
        >
          <span style={{ color: '#60A5FA' }}>
            <IconComponent />
          </span>
        </div>
      )}
      <div
        className="text-2xl sm:text-3xl font-bold text-white"
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        {stat.prefix}{animatedValue}{stat.suffix}
      </div>
      <div className="text-xs sm:text-sm text-center" style={{ color: 'rgba(255,255,255,0.45)' }}>{stat.label}</div>
    </div>
  );
}

/* ─── Main Hero Section ─── */
export default function HeroSection({ currentPage, onNavigate }: HeroSectionProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const goToNext = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
  }, []);

  useEffect(() => {
    const interval = setInterval(goToNext, 5000);
    return () => clearInterval(interval);
  }, [goToNext]);

  const scrollToServices = () => {
    const el = document.getElementById('services');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden" style={{ background: '#060A13' }}>
      {/* ─── Full-bleed background slideshow ─── */}
      {SLIDES.map((slide, i) => (
        <div
          key={i}
          className="absolute inset-0 transition-opacity duration-[2000ms] ease-in-out"
          style={{
            opacity: currentSlide === i ? 0.6 : 0,
            backgroundImage: `url(${slide.img})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      ))}

      {/* ─── Lightened dark overlay (lets images show through) ─── */}
      <div className="absolute inset-0 z-[2]">
        <style>{`
          @keyframes meshMove1 {
            0%, 100% { transform: translate(0, 0) scale(1); }
            33% { transform: translate(5%, -8%) scale(1.1); }
            66% { transform: translate(-3%, 5%) scale(0.95); }
          }
          @keyframes meshMove2 {
            0%, 100% { transform: translate(0, 0) scale(1); }
            33% { transform: translate(-6%, 4%) scale(1.05); }
            66% { transform: translate(4%, -6%) scale(1.1); }
          }
          @keyframes meshMove3 {
            0%, 100% { transform: translate(0, 0) scale(1); }
            33% { transform: translate(3%, 6%) scale(1.08); }
            66% { transform: translate(-5%, -4%) scale(0.97); }
          }
          @keyframes heroFadeIn {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes gradientShift {
            0%, 100% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
          }
        `}</style>
        {/* MUCH lighter overlay so banking photos show through */}
        <div
          className="absolute inset-0"
          style={{
            background: `
              linear-gradient(135deg, rgba(6,10,19,0.6) 0%, rgba(6,10,19,0.4) 30%, rgba(6,10,19,0.3) 55%, rgba(6,10,19,0.5) 100%),
              linear-gradient(to top, rgba(6,10,19,0.7) 0%, rgba(6,10,19,0.15) 50%, rgba(6,10,19,0.6) 100%)
            `,
          }}
        />
        {/* Animated mesh orbs */}
        <div
          className="absolute -top-40 -left-40 w-[700px] h-[700px] rounded-full opacity-30 blur-[140px]"
          style={{
            background: 'radial-gradient(circle, #2563EB 0%, #1E3A8A 40%, transparent 70%)',
            animation: 'meshMove1 20s ease-in-out infinite',
          }}
        />
        <div
          className="absolute top-1/3 -right-48 w-[500px] h-[500px] rounded-full opacity-20 blur-[120px]"
          style={{
            background: 'radial-gradient(circle, #60A5FA 0%, #2563EB 50%, transparent 70%)',
            animation: 'meshMove2 25s ease-in-out infinite',
          }}
        />
        <div
          className="absolute -bottom-32 left-1/3 w-[450px] h-[450px] rounded-full opacity-15 blur-[100px]"
          style={{
            background: 'radial-gradient(circle, #1D4ED8 0%, #1E3A8A 50%, transparent 70%)',
            animation: 'meshMove3 18s ease-in-out infinite',
          }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-10 blur-[150px]"
          style={{
            background: 'radial-gradient(circle, #93C5FD 0%, transparent 60%)',
            animation: 'meshMove1 22s ease-in-out infinite reverse',
          }}
        />
      </div>

      {/* ─── Particle / Sparkle effects ─── */}
      <Particles />

      {/* ─── 3D Globe: desktop right side, mobile background ─── */}
      <div className="hidden lg:block absolute right-0 top-0 w-[45%] h-full z-[3] pointer-events-none">
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-[500px] h-[500px] pointer-events-auto">
            <Globe3D />
          </div>
        </div>
      </div>
      <div className="lg:hidden absolute inset-0 z-[3] flex items-center justify-center pointer-events-none opacity-30">
        <div className="w-[280px] h-[280px]">
          <Globe3D />
        </div>
      </div>

      {/* ─── Slide indicators ─── */}
      <div className="absolute bottom-28 sm:bottom-32 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentSlide(i)}
            className="rounded-full transition-all duration-500"
            aria-label={`Go to slide ${i + 1}`}
            style={{
              width: currentSlide === i ? 28 : 8,
              height: 8,
              background: currentSlide === i
                ? 'linear-gradient(90deg, #2563EB, #60A5FA)'
                : 'rgba(255,255,255,0.25)',
              boxShadow: currentSlide === i ? '0 0 12px rgba(37, 99, 235, 0.5)' : 'none',
            }}
          />
        ))}
      </div>

      {/* ─── Main content: two-column on desktop, centered on mobile ─── */}
      <div
        className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-36 sm:pt-32 sm:pb-40 lg:pt-0 lg:pb-32"
        style={{ animation: 'heroFadeIn 1s ease-out forwards' }}
      >
        <div className="lg:flex lg:items-center lg:gap-8">
          {/* Left column: text content (60% on desktop) */}
          <div className="lg:w-[60%] flex flex-col items-center lg:items-start text-center lg:text-left">
            {/* Trust badge pill */}
            <div
              className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full mb-8"
              style={{
                background: 'rgba(37, 99, 235, 0.12)',
                border: '1px solid rgba(37, 99, 235, 0.25)',
              }}
            >
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#34D399' }} />
              <span className="text-sm font-medium" style={{ color: '#93C5FD' }}>
                Trusted by 150,000+ clients worldwide
              </span>
            </div>

            {/* Main headline */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.08] max-w-5xl lg:max-w-none">
              <span className="text-white">Banking Reimagined for the</span>
              <br className="hidden sm:block" />
              <span className="text-white sm:hidden"> </span>
              <span
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage: 'linear-gradient(135deg, #60A5FA 0%, #2563EB 35%, #93C5FD 65%, #60A5FA 100%)',
                  backgroundSize: '200% 200%',
                  WebkitBackgroundClip: 'text',
                  animation: 'gradientShift 4s ease-in-out infinite',
                }}
              >
                Modern World
              </span>
            </h1>

            {/* Subheadline */}
            <p
              className="mt-6 text-base sm:text-lg md:text-xl max-w-2xl leading-relaxed"
              style={{ color: 'rgba(255,255,255,0.6)' }}
            >
              Experience seamless financial services with institutional-grade security, instant transfers, and 24/7 access to your wealth.
            </p>

            {/* CTA Buttons */}
            <div className="mt-10 flex flex-col sm:flex-row items-center lg:items-start gap-4">
              <a
                href="/register"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-base font-semibold text-white transition-all duration-300 hover:scale-[1.03] group"
                style={{
                  background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                  boxShadow: '0 4px 24px rgba(37, 99, 235, 0.4), 0 0 60px rgba(37, 99, 235, 0.12)',
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLElement).style.boxShadow = '0 8px 36px rgba(37, 99, 235, 0.55), 0 0 80px rgba(37, 99, 235, 0.2)';
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLElement).style.boxShadow = '0 4px 24px rgba(37, 99, 235, 0.4), 0 0 60px rgba(37, 99, 235, 0.12)';
                }}
              >
                Open Account
                <span className="transition-transform group-hover:translate-x-1">
                  <ArrowRightIcon />
                </span>
              </a>
              <button
                onClick={scrollToServices}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-base font-semibold transition-all duration-300 hover:scale-[1.03]"
                style={{
                  color: '#60A5FA',
                  border: '1.5px solid rgba(37, 99, 235, 0.4)',
                  background: 'rgba(37, 99, 235, 0.08)',
                }}
              >
                Learn More
                <span className="transition-transform">
                  <ChevronDownIcon />
                </span>
              </button>
            </div>

            {/* ─── Animated Stats Counter ─── */}
            <div className="mt-16 sm:mt-20 w-full max-w-4xl">
              <div
                className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 p-3 sm:p-4 rounded-2xl"
                style={{
                  background: 'rgba(37, 99, 235, 0.06)',
                  border: '1px solid rgba(37, 99, 235, 0.12)',
                  backdropFilter: 'blur(12px)',
                }}
              >
                {STATS.map((stat, i) => (
                  <StatItem key={stat.label} stat={stat} delay={800 + i * 200} />
                ))}
              </div>
            </div>

            {/* ─── Trust Bar ─── */}
            <div className="mt-8 sm:mt-10 w-full max-w-4xl">
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 sm:gap-4">
                {TRUST_ITEMS.map((item) => {
                  const IconComp = TRUST_ICON_MAP[item.icon];
                  return (
                    <div
                      key={item.label}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300 hover:bg-white/[0.06]"
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.08)',
                      }}
                    >
                      {IconComp && <span style={{ color: '#34D399' }}><IconComp /></span>}
                      <span className="text-xs sm:text-sm font-medium" style={{ color: 'rgba(255,255,255,0.6)' }}>{item.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right column: spacer on desktop (globe is absolutely positioned) */}
          <div className="hidden lg:block lg:w-[40%]" />
        </div>
      </div>
    </section>
  );
}
