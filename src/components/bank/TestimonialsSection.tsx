'use client';

import { useEffect, useRef, useState } from 'react';

const TESTIMONIALS = [
  {
    name: 'Sarah Mitchell',
    role: 'Small Business Owner',
    location: 'New York, NY',
    since: '2021',
    initials: 'SM',
    color: '#2563EB',
    quote: 'Switching my business accounts to CoreWealth was the best decision I made. The fee-free checking and dedicated business support have saved me thousands over the past three years. Their digital platform is by far the best I have used.',
    rating: 5,
  },
  {
    name: 'James Patterson',
    role: 'Retired Teacher',
    location: 'Austin, TX',
    since: '2018',
    initials: 'JP',
    color: '#60A5FA',
    quote: 'I needed a bank that respects my savings goals with competitive rates and no hidden fees. CoreWealth delivers exactly that with the personal touch I remember from community banking. Their 4.25% APY is unmatched.',
    rating: 5,
  },
  {
    name: 'Priya Sharma',
    role: 'Software Engineer',
    location: 'San Francisco, CA',
    since: '2022',
    initials: 'PS',
    color: '#1D4ED8',
    quote: 'The mobile banking experience is seamless. I manage all my accounts, transfer funds internationally, and deposit checks from my phone. The biometric login and real-time fraud alerts give me complete peace of mind.',
    rating: 5,
  },
  {
    name: 'Marcus Chen',
    role: 'Freelance Designer',
    location: 'Portland, OR',
    since: '2020',
    initials: 'MC',
    color: '#93C5FD',
    quote: "As a freelancer, I need flexible banking that keeps up with irregular income. CoreWealth's budgeting tools, overdraft protection, and instant transfers have been a game-changer for managing my cash flow.",
    rating: 4,
  },
];

/* ─── Gold star ratings ─── */
function GoldStars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          className="w-4.5 h-4.5 transition-all duration-300"
          viewBox="0 0 20 20"
          fill={i < rating ? '#FACC15' : 'rgba(255,255,255,0.12)'}
          style={i < rating ? { filter: 'drop-shadow(0 0 4px rgba(250,204,21,0.5))' } : {}}
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.37-2.448a1 1 0 00-1.176 0l-3.37 2.448c-.784.57-1.838-.197-1.539-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.063 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z" />
        </svg>
      ))}
    </div>
  );
}

/* ─── Large decorative quote mark ─── */
function QuoteIcon() {
  return (
    <svg
      className="w-10 h-10"
      viewBox="0 0 24 24"
      fill="currentColor"
      style={{ color: 'rgba(124,58,237,0.25)' }}
    >
      <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
    </svg>
  );
}

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
      { threshold: 0.1, rootMargin: '0px 0px -30px 0px' }
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
        transform: visible ? 'translateY(0)' : 'translateY(28px)',
      }}
    >
      {children}
    </div>
  );
}

/* ─── Initials Avatar ─── */
function Avatar({ initials, color }: { initials: string; color: string }) {
  return (
    <div
      className="w-12 h-12 rounded-full shrink-0 flex items-center justify-center text-sm font-bold text-white transition-all duration-300"
      style={{
        background: `linear-gradient(135deg, ${color} 0%, ${color}CC 100%)`,
        boxShadow: `0 4px 12px ${color}40`,
        border: '2px solid rgba(255,255,255,0.1)',
      }}
    >
      {initials}
    </div>
  );
}

export default function TestimonialsSection() {
  return (
    <section className="relative py-20 sm:py-28 overflow-hidden">
      {/* Background glow */}
      <div
        className="absolute bottom-0 left-1/4 w-[600px] h-[400px] rounded-full opacity-10 pointer-events-none blur-[100px]"
        style={{ background: 'radial-gradient(circle, #2563EB 0%, transparent 70%)' }}
      />
      <div
        className="absolute top-1/4 right-1/4 w-[400px] h-[300px] rounded-full opacity-8 pointer-events-none blur-[80px]"
        style={{ background: 'radial-gradient(circle, #60A5FA 0%, transparent 70%)' }}
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative">
        {/* Section Header */}
        <FadeInView>
          <div className="text-center mb-14 sm:mb-16">
            <p className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: '#60A5FA' }}>
              Testimonials
            </p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
              Trusted by{' '}
              <span
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage: 'linear-gradient(135deg, #2563EB 0%, #60A5FA 50%, #93C5FD 100%)',
                  WebkitBackgroundClip: 'text',
                }}
              >
                Thousands
              </span>
            </h2>
            <p className="mt-4 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
              Real stories from real members who have transformed their financial lives with CoreWealth.
            </p>
          </div>
        </FadeInView>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {TESTIMONIALS.map((t, i) => (
            <FadeInView key={t.name} delay={i * 100}>
              <div
                className="group relative rounded-xl p-6 sm:p-7 flex flex-col gap-5 transition-all duration-500"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget;
                  el.style.borderColor = 'rgba(124,58,237,0.35)';
                  el.style.boxShadow = '0 20px 56px rgba(0,0,0,0.35), 0 0 40px rgba(124,58,237,0.1)';
                  el.style.transform = 'translateY(-4px)';
                  el.style.background = 'rgba(255,255,255,0.07)';
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget;
                  el.style.borderColor = 'rgba(255,255,255,0.1)';
                  el.style.boxShadow = '0 8px 32px rgba(0,0,0,0.2)';
                  el.style.transform = 'translateY(0)';
                  el.style.background = 'rgba(255,255,255,0.05)';
                }}
              >
                {/* Large decorative quote + Stars row */}
                <div className="flex items-start justify-between">
                  <QuoteIcon />
                  <GoldStars rating={t.rating} />
                </div>

                {/* Quote text */}
                <p className="text-sm sm:text-base leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>
                  &ldquo;{t.quote}&rdquo;
                </p>

                {/* Author */}
                <div
                  className="flex items-center gap-4 pt-4"
                  style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <Avatar initials={t.initials} color={t.color} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{t.name}</p>
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
                      {t.role} &middot; {t.location}
                    </p>
                  </div>
                  <div
                    className="px-3 py-1 rounded-full text-xs font-medium shrink-0"
                    style={{
                      background: 'rgba(124,58,237,0.12)',
                      color: '#60A5FA',
                    }}
                  >
                    Since {t.since}
                  </div>
                </div>

                {/* Hover glow overlay */}
                <div
                  className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                  style={{
                    background: 'radial-gradient(ellipse at 50% 0%, rgba(124,58,237,0.06) 0%, transparent 60%)',
                  }}
                />
              </div>
            </FadeInView>
          ))}
        </div>

        {/* Bottom trust bar */}
        <FadeInView delay={400}>
          <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-6">
            <div className="flex items-center gap-2">
              <div className="flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-5 h-5" viewBox="0 0 20 20" fill="#FACC15" style={{ filter: 'drop-shadow(0 0 4px rgba(250,204,21,0.4))' }}>
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.37-2.448a1 1 0 00-1.176 0l-3.37 2.448c-.784.57-1.838-.197-1.539-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.063 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z" />
                  </svg>
                ))}
              </div>
              <span className="text-sm font-semibold text-white">4.9 out of 5</span>
            </div>
            <div className="hidden sm:block w-px h-6" style={{ background: 'rgba(255,255,255,0.15)' }} />
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Based on 12,000+ verified member reviews
            </p>
          </div>
        </FadeInView>
      </div>
    </section>
  );
}
