'use client';

import { useEffect, useRef, useState } from 'react';

const SERVICES = [
  {
    title: 'Personal Banking',
    desc: 'Everyday banking with zero monthly fees, instant transfers, and a full-featured mobile experience designed for your lifestyle.',
    img: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&h=300&fit=crop&q=80',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <path d="M2 10h20" />
      </svg>
    ),
    tag: 'Popular',
  },
  {
    title: 'Business Banking',
    desc: 'Dedicated business accounts with team management, invoicing, payroll integration, and commercial-grade treasury tools.',
    img: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=300&fit=crop&q=80',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
        <rect x="4" y="2" width="16" height="20" rx="2" />
        <path d="M9 22V12h6v10" />
        <path d="M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01" />
      </svg>
    ),
    tag: null,
  },
  {
    title: 'Wealth Management',
    desc: 'Build and protect your wealth with diversified portfolios, personalized advisory, and automated rebalancing strategies.',
    img: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=400&h=300&fit=crop&q=80',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
        <polyline points="16 7 22 7 22 13" />
      </svg>
    ),
    tag: 'Wealth',
  },
  {
    title: 'International Transfers',
    desc: 'Send money globally with competitive FX rates, real-time tracking, and transparent fees. Available in 180+ countries.',
    img: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400&h=300&fit=crop&q=80',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20" />
        <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
        <path d="M3 12h4l3-9 4 18 3-9h4" />
      </svg>
    ),
    tag: 'Global',
  },
  {
    title: 'Crypto Services',
    desc: 'Buy, sell, and hold Bitcoin, Ethereum, and more directly from your account. Real-time prices and secure custody.',
    img: 'https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=400&h=300&fit=crop&q=80',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
        <path d="M11.767 19.089c4.924.868 6.14-6.025 1.216-6.894m-1.216 6.894L5.86 18.047m5.908 1.042-.347 1.97m1.563-8.864c4.924.869 6.14-6.025 1.215-6.893m-1.215 6.893-3.94-.694m5.155-6.2L8.29 4.26m5.908 1.042.348-1.97M7.48 20.364l3.126-17.727" />
      </svg>
    ),
    tag: 'Crypto',
  },
  {
    title: 'Cards & Payments',
    desc: 'Virtual and physical debit/credit cards with real-time controls, spending limits, and instant freeze capabilities.',
    img: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=400&h=300&fit=crop&q=80',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
        <rect x="1" y="4" width="22" height="16" rx="2" />
        <line x1="1" y1="10" x2="23" y2="10" />
        <path d="M6 15h4" />
      </svg>
    ),
    tag: null,
  },
];

/* ─── Intersection Observer fade-in wrapper ─── */
function FadeInView({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setVisible(true), delay);
          observer.unobserve(el);
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [delay]);

  return (
    <div
      ref={ref}
      className="transition-all duration-700"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(32px)',
      }}
    >
      {children}
    </div>
  );
}

export default function ServicesSection({ onNavigate }: { onNavigate?: (page: string) => void }) {
  return (
    <section id="services" className="relative py-20 sm:py-28 overflow-hidden">
      {/* Background glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full opacity-15 pointer-events-none blur-[100px]"
        style={{ background: 'radial-gradient(circle, #2563EB 0%, transparent 70%)' }}
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative">
        {/* Section Header */}
        <FadeInView>
          <div className="text-center mb-14 sm:mb-16">
            <p className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: '#60A5FA' }}>
              Our Services
            </p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
              Everything You Need,{' '}
              <span
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage: 'linear-gradient(135deg, #2563EB 0%, #60A5FA 50%, #93C5FD 100%)',
                  WebkitBackgroundClip: 'text',
                }}
              >
                All In One Place
              </span>
            </h2>
            <p className="mt-4 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
              Comprehensive banking solutions designed around your financial goals — from everyday spending to long-term wealth building.
            </p>
          </div>
        </FadeInView>

        {/* Services Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {SERVICES.map((s, i) => (
            <FadeInView key={s.title} delay={i * 100}>
              <div
                className="group relative rounded-2xl overflow-hidden transition-all duration-500 cursor-pointer"
                style={{
                  background: 'rgba(13,19,33,0.5)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                }}
                onClick={() => onNavigate?.('services')}
                onMouseEnter={(e) => {
                  const el = e.currentTarget;
                  el.style.borderColor = 'rgba(124,58,237,0.5)';
                  el.style.boxShadow = '0 20px 56px rgba(0,0,0,0.45), 0 0 50px rgba(124,58,237,0.15), 0 0 100px rgba(124,58,237,0.06)';
                  el.style.transform = 'translateY(-4px)';
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget;
                  el.style.borderColor = 'rgba(255,255,255,0.06)';
                  el.style.boxShadow = '0 8px 32px rgba(0,0,0,0.3)';
                  el.style.transform = 'translateY(0)';
                }}
              >
                {/* Image area */}
                <div className="relative h-44 overflow-hidden">
                  <img
                    src={s.img}
                    alt={s.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    loading="lazy"
                  />
                  {/* Gradient overlay */}
                  <div
                    className="absolute inset-0"
                    style={{
                      background: 'linear-gradient(to top, rgba(13,19,33,0.95) 0%, rgba(13,19,33,0.3) 60%, rgba(13,19,33,0.1) 100%)',
                    }}
                  />
                  {/* Tag badge */}
                  {s.tag && (
                    <div
                      className="absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-semibold"
                      style={{
                        background: 'rgba(124,58,237,0.25)',
                        border: '1px solid rgba(124,58,237,0.4)',
                        color: '#93C5FD',
                      }}
                    >
                      {s.tag}
                    </div>
                  )}
                </div>

                {/* Content area */}
                <div className="p-5 flex flex-col gap-4">
                  {/* Icon + Title row */}
                  <div className="flex items-center gap-3">
                    <div
                      className="shrink-0 flex items-center justify-center w-12 h-12 rounded-xl transition-all duration-300 group-hover:scale-110"
                      style={{
                        background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                        boxShadow: '0 4px 16px rgba(124,58,237,0.35)',
                      }}
                    >
                      <span className="text-white">{s.icon}</span>
                    </div>
                    <h3 className="text-lg font-semibold text-white">{s.title}</h3>
                  </div>

                  <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
                    {s.desc}
                  </p>

                  <button
                    className="inline-flex items-center gap-1.5 text-sm font-medium transition-colors w-fit group/btn"
                    style={{ color: '#60A5FA' }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = '#ffffff'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = '#60A5FA'; }}
                  >
                    Learn More
                    <svg
                      className="w-4 h-4 transition-transform group-hover/btn:translate-x-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>

                {/* Shine effect overlay on hover */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none rounded-2xl"
                  style={{
                    background: 'linear-gradient(105deg, transparent 30%, rgba(124,58,237,0.05) 45%, rgba(124,58,237,0.08) 50%, rgba(124,58,237,0.05) 55%, transparent 70%)',
                  }}
                />
              </div>
            </FadeInView>
          ))}
        </div>
      </div>
    </section>
  );
}
