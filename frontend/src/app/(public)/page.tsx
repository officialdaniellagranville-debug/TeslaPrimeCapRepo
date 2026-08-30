'use client';

import { useState, useEffect, useRef, type ReactNode } from 'react';

// ─── Intersection Observer Hook ─────────────────────────────────────────────
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, isVisible };
}

function FadeIn({
  children,
  className = '',
  delay = 0,
  direction = 'up',
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
}) {
  const { ref, isVisible } = useInView(0.1);
  const transforms: Record<string, string> = {
    up: 'translateY(40px)',
    down: 'translateY(-40px)',
    left: 'translateX(40px)',
    right: 'translateX(-40px)',
  };

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0) translateX(0)' : transforms[direction],
        transition: `opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1) ${delay}s, transform 0.8s cubic-bezier(0.16, 1, 0.3, 1) ${delay}s`,
      }}
    >
      {children}
    </div>
  );
}

// ─── Section Wrapper ────────────────────────────────────────────────────────
function Section({
  id,
  children,
  className = '',
}: {
  id?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={`px-6 md:px-12 lg:px-20 xl:px-32 ${className}`}>
      {children}
    </section>
  );
}

// ─── Navbar ─────────────────────────────────────────────────────────────────
function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const links = [
    { label: 'Plans', href: '#plans' },
    { label: 'About', href: '#features' },
    { label: 'Features', href: '#how-it-works' },
    { label: 'FAQ', href: '#faq' },
    { label: 'Contact', href: '#footer' },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-tesla-dark/80 backdrop-blur-xl border-b border-tesla-gray-700/50'
          : 'bg-transparent'
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 md:px-12 lg:px-20 xl:px-32">
        {/* Logo */}
        <a href="#" className="flex flex-col leading-none select-none">
          <span className="text-lg font-bold tracking-[0.25em] text-tesla-white">TESLA</span>
          <span className="text-[10px] font-light tracking-[0.35em] text-tesla-gray-300">
            PRIME CAPITAL
          </span>
        </a>

        {/* Desktop Links */}
        <div className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-[13px] font-medium tracking-wide text-tesla-gray-300 transition-colors hover:text-tesla-white"
            >
              {l.label}
            </a>
          ))}
        </div>

        {/* Desktop Buttons */}
        <div className="hidden items-center gap-4 md:flex">
          <button className="text-[13px] font-medium tracking-wide text-tesla-gray-300 transition-colors hover:text-tesla-white">
            Login
          </button>
          <button className="btn-tesla rounded bg-tesla-red px-6 py-2.5 text-[13px] font-medium tracking-wide text-tesla-white transition-all hover:brightness-110">
            Get Started
          </button>
        </div>

        {/* Mobile Hamburger */}
        <button
          className="flex flex-col gap-[5px] md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          <span
            className={`block h-[1.5px] w-6 bg-tesla-white transition-all duration-300 ${
              mobileOpen ? 'translate-y-[6.5px] rotate-45' : ''
            }`}
          />
          <span
            className={`block h-[1.5px] w-6 bg-tesla-white transition-all duration-300 ${
              mobileOpen ? 'opacity-0' : ''
            }`}
          />
          <span
            className={`block h-[1.5px] w-6 bg-tesla-white transition-all duration-300 ${
              mobileOpen ? '-translate-y-[6.5px] -rotate-45' : ''
            }`}
          />
        </button>
      </div>

      {/* Mobile Menu */}
      <div
        className={`overflow-hidden border-t border-tesla-gray-700/30 bg-tesla-dark/95 backdrop-blur-xl transition-all duration-500 md:hidden ${
          mobileOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0 border-t-0'
        }`}
      >
        <div className="flex flex-col gap-1 px-6 py-4">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setMobileOpen(false)}
              className="rounded-lg px-4 py-3 text-sm font-medium text-tesla-gray-300 transition-colors hover:bg-tesla-gray-900 hover:text-tesla-white"
            >
              {l.label}
            </a>
          ))}
          <div className="mt-3 flex flex-col gap-3 border-t border-tesla-gray-700/30 pt-4">
            <button className="w-full rounded-lg border border-tesla-gray-600 px-6 py-2.5 text-sm font-medium text-tesla-white transition-colors hover:bg-tesla-gray-900">
              Login
            </button>
            <button className="btn-tesla w-full rounded-lg bg-tesla-red px-6 py-2.5 text-sm font-medium text-tesla-white transition-all hover:brightness-110">
              Get Started
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

// ─── Hero ───────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 text-center">
      {/* Subtle radial gradient behind text */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_40%,rgba(204,0,0,0.04)_0%,transparent_70%)]" />

      <FadeIn>
        <h1 className="max-w-4xl text-[clamp(2.5rem,7vw,5.5rem)] font-bold leading-[0.95] tracking-[-0.03em] text-tesla-white">
          The Future of
          <br />
          Investment
        </h1>
      </FadeIn>

      <FadeIn delay={0.15}>
        <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-tesla-gray-300 md:text-lg">
          Premium managed investment plans with guaranteed daily returns.
          Built for those who demand more from their capital.
        </p>
      </FadeIn>

      <FadeIn delay={0.3}>
        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
          <button className="btn-tesla h-12 w-full rounded bg-tesla-red px-10 text-sm font-medium tracking-wide text-tesla-white transition-all hover:brightness-110 sm:w-auto">
            Start Investing
          </button>
          <a
            href="#plans"
            className="h-12 flex w-full items-center justify-center rounded border border-tesla-gray-500 px-10 text-sm font-medium tracking-wide text-tesla-white transition-colors hover:border-tesla-white sm:w-auto"
          >
            View Plans
          </a>
        </div>
      </FadeIn>

      {/* Stats Row */}
      <FadeIn delay={0.5}>
        <div className="mt-20 flex flex-col items-center gap-6 border-t border-tesla-gray-700/40 pt-10 sm:flex-row sm:gap-12 md:gap-20">
          {[
            { value: '$10M+', label: 'Total Investments' },
            { value: '15,000+', label: 'Active Users' },
            { value: '99.9%', label: 'Uptime' },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-xl font-semibold tracking-tight text-tesla-white md:text-2xl">
                {s.value}
              </p>
              <p className="mt-1 text-xs tracking-wide text-tesla-gray-400 md:text-sm">{s.label}</p>
            </div>
          ))}
        </div>
      </FadeIn>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#525252" strokeWidth="1.5">
          <path d="M12 5v14M19 12l-7 7-7-7" />
        </svg>
      </div>
    </section>
  );
}

// ─── Investment Plans ───────────────────────────────────────────────────────
const plans = [
  {
    name: 'Basic',
    range: '$200 – $4,999',
    daily: '0.5%',
    duration: '30 Days',
    featured: false,
  },
  {
    name: 'Silver',
    range: '$5,000 – $9,999',
    daily: '0.8%',
    duration: '21 Days',
    featured: false,
  },
  {
    name: 'Gold',
    range: '$10,000 – $49,999',
    daily: '1.2%',
    duration: '14 Days',
    featured: false,
  },
  {
    name: 'Platinum',
    range: '$50,000 – $100,000',
    daily: '1.8%',
    duration: '7 Days',
    featured: true,
  },
];

function PlansSection() {
  return (
    <Section id="plans" className="py-28 md:py-36">
      <FadeIn className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight text-tesla-white md:text-4xl lg:text-5xl">
          Investment Plans
        </h2>
        <p className="mt-4 text-base leading-relaxed text-tesla-gray-400">
          Choose the tier that matches your investment goals. Higher tiers unlock
          greater daily returns and faster payout cycles.
        </p>
      </FadeIn>

      <div className="mx-auto mt-16 grid max-w-6xl gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {plans.map((p, i) => (
          <FadeIn key={p.name} delay={i * 0.1}>
            <div
              className={`card-tesla group relative flex h-full flex-col rounded-xl p-6 md:p-7 ${
                p.featured
                  ? 'border-tesla-red/40 shadow-[0_0_30px_rgba(204,0,0,0.08)]'
                  : ''
              }`}
            >
              {p.featured && (
                <span className="absolute -top-3 left-6 rounded bg-tesla-red px-3 py-0.5 text-[10px] font-semibold tracking-widest text-tesla-white uppercase">
                  Popular
                </span>
              )}

              <h3 className="text-lg font-semibold text-tesla-white">{p.name}</h3>
              <p className="mt-1 text-sm text-tesla-gray-400">{p.range}</p>

              <div className="mt-6 flex-1">
                <p className="text-4xl font-bold tracking-tight text-tesla-white md:text-5xl">
                  {p.daily}
                </p>
                <p className="mt-1 text-xs tracking-wide text-tesla-gray-500">Daily Returns</p>
              </div>

              <div className="mt-4 flex items-center gap-2 border-t border-tesla-gray-700/50 pt-4">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a3a3a3" strokeWidth="1.5">
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <path d="M16 2v4M8 2v4M3 10h18" />
                </svg>
                <span className="text-sm text-tesla-gray-300">{p.duration}</span>
              </div>

              <button
                className={`btn-tesla mt-6 w-full rounded py-3 text-sm font-medium tracking-wide transition-all ${
                  p.featured
                    ? 'bg-tesla-red text-tesla-white hover:brightness-110'
                    : 'border border-tesla-gray-600 text-tesla-white hover:border-tesla-white'
                }`}
              >
                Invest Now
              </button>
            </div>
          </FadeIn>
        ))}
      </div>
    </Section>
  );
}

// ─── Features ───────────────────────────────────────────────────────────────
const features = [
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
        <polyline points="16 7 22 7 22 13" />
      </svg>
    ),
    title: 'Daily Returns',
    desc: 'Earn guaranteed returns every single day. Your earnings are credited automatically to your account balance with full transparency.',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
    title: 'Secure Platform',
    desc: 'Military-grade AES-256 encryption protects your assets and personal data. Multi-factor authentication and cold storage for all funds.',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
    ),
    title: 'Crypto Payments',
    desc: 'Bitcoin, Ethereum, and USDT accepted instantly. Deposit and withdraw in the cryptocurrency of your choice with zero hidden fees.',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <line x1="2" y1="10" x2="22" y2="10" />
      </svg>
    ),
    title: 'Gift Card Deposits',
    desc: 'Alternative deposit method via major gift card brands. Seamless conversion to your investment balance within minutes.',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    title: 'Referral Program',
    desc: 'Earn 10% commission on every referral deposit. Build a network and generate passive income through our multi-tier referral system.',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
    title: '24/7 Support',
    desc: 'Dedicated support team available around the clock. Reach us via live chat, email, or phone for immediate assistance.',
  },
];

function FeaturesSection() {
  return (
    <Section id="features" className="py-28 md:py-36">
      <FadeIn className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight text-tesla-white md:text-4xl lg:text-5xl">
          Why TeslaPrimeCapital
        </h2>
        <p className="mt-4 text-base leading-relaxed text-tesla-gray-400">
          Engineered for performance. Designed for trust. Every feature built
          to deliver a superior investment experience.
        </p>
      </FadeIn>

      <div className="mx-auto mt-16 grid max-w-6xl gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f, i) => (
          <FadeIn key={f.title} delay={i * 0.08}>
            <div className="card-tesla flex h-full flex-col rounded-xl p-6 md:p-7">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-tesla-gray-900 border border-tesla-gray-700 text-tesla-gray-300">
                {f.icon}
              </div>
              <h3 className="mt-5 text-base font-semibold text-tesla-white">{f.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-tesla-gray-400">{f.desc}</p>
            </div>
          </FadeIn>
        ))}
      </div>
    </Section>
  );
}

// ─── How It Works ───────────────────────────────────────────────────────────
const steps = [
  {
    num: '01',
    title: 'Create Account',
    desc: 'Sign up and complete KYC verification. The process takes less than 5 minutes with our streamlined onboarding.',
  },
  {
    num: '02',
    title: 'Choose Plan',
    desc: 'Select from our premium investment tiers. Each plan is designed to match different capital sizes and return objectives.',
  },
  {
    num: '03',
    title: 'Earn Daily',
    desc: 'Watch your returns accumulate daily. Withdraw profits anytime or reinvest to compound your earnings automatically.',
  },
];

function HowItWorksSection() {
  return (
    <Section id="how-it-works" className="py-28 md:py-36">
      <FadeIn className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight text-tesla-white md:text-4xl lg:text-5xl">
          How It Works
        </h2>
        <p className="mt-4 text-base leading-relaxed text-tesla-gray-400">
          Three simple steps to start earning. No complexity, no hidden steps.
        </p>
      </FadeIn>

      <div className="mx-auto mt-16 grid max-w-5xl gap-8 md:grid-cols-3 md:gap-6">
        {steps.map((s, i) => (
          <FadeIn key={s.num} delay={i * 0.15}>
            <div className="relative flex flex-col items-start md:items-center md:text-center">
              {/* Connector line (desktop) */}
              {i < steps.length - 1 && (
                <div className="absolute top-8 right-0 hidden h-[1px] w-[calc(50%+1.5rem)] translate-x-[calc(50%+1.5rem)] bg-tesla-gray-700/50 md:block" />
              )}

              <span className="text-5xl font-bold tracking-tight text-tesla-red md:text-6xl">
                {s.num}
              </span>
              <h3 className="mt-4 text-lg font-semibold text-tesla-white">{s.title}</h3>
              <p className="mt-2 max-w-xs text-sm leading-relaxed text-tesla-gray-400">
                {s.desc}
              </p>
            </div>
          </FadeIn>
        ))}
      </div>
    </Section>
  );
}

// ─── Testimonials ───────────────────────────────────────────────────────────
const testimonials = [
  {
    quote:
      'TeslaPrimeCapital has completely transformed my approach to investing. The daily returns are consistent, and the platform is incredibly intuitive. I\'ve never felt more confident about my financial future.',
    name: 'Michael R.',
    role: 'Verified Investor',
    stars: 5,
  },
  {
    quote:
      'I was skeptical at first, but the transparency and professionalism here won me over. The crypto deposit feature is seamless, and my withdrawals are processed within hours. Truly premium service.',
    name: 'Sarah L.',
    role: 'Gold Tier Member',
    stars: 5,
  },
  {
    quote:
      'The referral program alone has been a game-changer for me. I earn passively from my investments and from my network. The support team is responsive and genuinely helpful around the clock.',
    name: 'David K.',
    role: 'Platinum Investor',
    stars: 5,
  },
];

function StarRating({ count }: { count: number }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill={i < count ? '#CC0000' : 'none'}
          stroke={i < count ? '#CC0000' : '#525252'}
          strokeWidth="1.5"
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </div>
  );
}

function TestimonialsSection() {
  return (
    <Section className="py-28 md:py-36">
      <FadeIn className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight text-tesla-white md:text-4xl lg:text-5xl">
          What Our Investors Say
        </h2>
        <p className="mt-4 text-base leading-relaxed text-tesla-gray-400">
          Real experiences from verified members of the TeslaPrimeCapital community.
        </p>
      </FadeIn>

      <div className="mx-auto mt-16 grid max-w-6xl gap-5 md:grid-cols-3">
        {testimonials.map((t, i) => (
          <FadeIn key={t.name} delay={i * 0.1}>
            <div className="card-tesla flex h-full flex-col rounded-xl p-6 md:p-7">
              <StarRating count={t.stars} />
              <p className="mt-4 flex-1 text-sm leading-relaxed text-tesla-gray-300">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="mt-6 flex items-center gap-3 border-t border-tesla-gray-700/50 pt-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-tesla-gray-800 text-sm font-semibold text-tesla-gray-300">
                  {t.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-medium text-tesla-white">{t.name}</p>
                  <p className="text-xs text-tesla-gray-500">{t.role}</p>
                </div>
              </div>
            </div>
          </FadeIn>
        ))}
      </div>
    </Section>
  );
}

// ─── FAQ ────────────────────────────────────────────────────────────────────
const faqs = [
  {
    q: 'How do I get started?',
    a: 'Getting started is simple. Create your free account, complete the quick KYC verification process, fund your account using your preferred payment method, and select an investment plan that matches your goals. The entire setup takes less than 5 minutes.',
  },
  {
    q: 'What payment methods are accepted?',
    a: 'We accept Bitcoin (BTC), Ethereum (ETH), and Tether (USDT) for cryptocurrency deposits. Additionally, we support major gift card brands including Amazon, Apple, Google Play, and Visa/Mastercard gift cards as an alternative deposit method.',
  },
  {
    q: 'How are daily returns calculated?',
    a: 'Daily returns are calculated based on your active investment plan\'s stated percentage rate and are applied to your principal balance every 24 hours. Returns are credited automatically to your available balance and can be withdrawn or reinvested at any time.',
  },
  {
    q: 'What is the withdrawal process?',
    a: 'Withdrawals can be initiated from your dashboard at any time. Select your preferred withdrawal method, enter the amount, and submit. Crypto withdrawals are processed within 1-6 hours. There are no hidden withdrawal fees on any plan tier.',
  },
  {
    q: 'Is my investment secure?',
    a: 'Absolutely. We employ military-grade AES-256 encryption, multi-factor authentication, and cold wallet storage for all cryptocurrency holdings. Our infrastructure is protected by enterprise-grade DDoS mitigation and undergoes regular third-party security audits.',
  },
  {
    q: 'How does the referral program work?',
    a: 'Share your unique referral link with friends and colleagues. When they sign up and make their first deposit, you earn a 10% commission on their deposit amount. There is no limit to the number of referrals you can make, and commissions are credited instantly to your balance.',
  },
];

function FAQItem({ q, a, isOpen, toggle }: { q: string; a: string; isOpen: boolean; toggle: () => void }) {
  return (
    <div className="border-b border-tesla-gray-700/40">
      <button
        onClick={toggle}
        className="flex w-full items-center justify-between py-5 text-left transition-colors hover:text-tesla-white group"
      >
        <span className="pr-8 text-base font-medium text-tesla-gray-300 group-hover:text-tesla-white md:text-lg">
          {q}
        </span>
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className={`shrink-0 text-tesla-gray-500 transition-transform duration-300 ${
            isOpen ? 'rotate-180' : ''
          }`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      <div
        className={`overflow-hidden transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isOpen ? 'max-h-60 opacity-100 pb-5' : 'max-h-0 opacity-0'
        }`}
      >
        <p className="text-sm leading-relaxed text-tesla-gray-400">{a}</p>
      </div>
    </div>
  );
}

function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <Section id="faq" className="py-28 md:py-36">
      <FadeIn className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight text-tesla-white md:text-4xl lg:text-5xl">
          Frequently Asked Questions
        </h2>
        <p className="mt-4 text-base leading-relaxed text-tesla-gray-400">
          Everything you need to know about investing with TeslaPrimeCapital.
        </p>
      </FadeIn>

      <FadeIn delay={0.1}>
        <div className="mx-auto mt-12 max-w-3xl divide-y-0">
          {faqs.map((f, i) => (
            <FAQItem
              key={i}
              q={f.q}
              a={f.a}
              isOpen={openIndex === i}
              toggle={() => setOpenIndex(openIndex === i ? null : i)}
            />
          ))}
        </div>
      </FadeIn>
    </Section>
  );
}

// ─── CTA Section ────────────────────────────────────────────────────────────
function CTASection() {
  return (
    <section className="px-6 md:px-12 lg:px-20 xl:px-32">
      <FadeIn>
        <div className="mx-auto flex max-w-5xl flex-col items-center rounded-2xl bg-tesla-red px-6 py-20 text-center md:px-12 md:py-28">
          <h2 className="text-3xl font-bold tracking-tight text-tesla-white md:text-4xl lg:text-5xl">
            Ready to Start Earning?
          </h2>
          <p className="mt-4 max-w-lg text-base leading-relaxed text-white/80">
            Join thousands of investors who are already earning daily returns.
            Your capital works harder with TeslaPrimeCapital.
          </p>
          <button className="btn-tesla mt-10 h-13 rounded bg-tesla-white px-10 py-3.5 text-sm font-semibold tracking-wide text-tesla-dark transition-all hover:bg-tesla-gray-50">
            Get Started Now
          </button>
        </div>
      </FadeIn>
    </section>
  );
}

// ─── Footer ─────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer id="footer" className="mt-28 border-t border-tesla-gray-700/40 bg-tesla-gray-900">
      <div className="px-6 py-16 md:px-12 lg:px-20 xl:px-32">
        <div className="mx-auto grid max-w-6xl gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Company */}
          <div>
            <a href="#" className="flex flex-col leading-none select-none">
              <span className="text-lg font-bold tracking-[0.25em] text-tesla-white">TESLA</span>
              <span className="text-[10px] font-light tracking-[0.35em] text-tesla-gray-400">
                PRIME CAPITAL
              </span>
            </a>
            <p className="mt-4 text-sm leading-relaxed text-tesla-gray-500">
              A premium managed investment platform delivering consistent daily returns
              through diversified, high-yield strategies.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-semibold tracking-wide text-tesla-white uppercase">Quick Links</h4>
            <ul className="mt-4 flex flex-col gap-3">
              {['Plans', 'About', 'FAQ', 'Contact'].map((l) => (
                <li key={l}>
                  <a href={`#${l.toLowerCase()}`} className="text-sm text-tesla-gray-500 transition-colors hover:text-tesla-white">
                    {l}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-sm font-semibold tracking-wide text-tesla-white uppercase">Legal</h4>
            <ul className="mt-4 flex flex-col gap-3">
              {['Terms of Service', 'Privacy Policy', 'Risk Disclosure'].map((l) => (
                <li key={l}>
                  <a href="#" className="text-sm text-tesla-gray-500 transition-colors hover:text-tesla-white">
                    {l}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-sm font-semibold tracking-wide text-tesla-white uppercase">Support</h4>
            <ul className="mt-4 flex flex-col gap-3">
              {[
                { label: 'Help Center', href: '#' },
                { label: 'Live Chat', href: '#' },
                { label: 'Email', href: '#' },
              ].map((l) => (
                <li key={l.label}>
                  <a href={l.href} className="text-sm text-tesla-gray-500 transition-colors hover:text-tesla-white">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-tesla-gray-700/30 px-6 py-6 md:px-12 lg:px-20 xl:px-32">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-xs text-tesla-gray-500">
            &copy; 2024 TeslaPrimeCapital. All rights reserved.
          </p>

          {/* Social Icons */}
          <div className="flex items-center gap-5">
            {/* X / Twitter */}
            <a href="#" aria-label="Twitter" className="text-tesla-gray-500 transition-colors hover:text-tesla-white">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
            {/* LinkedIn */}
            <a href="#" aria-label="LinkedIn" className="text-tesla-gray-500 transition-colors hover:text-tesla-white">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
            </a>
            {/* Telegram */}
            <a href="#" aria-label="Telegram" className="text-tesla-gray-500 transition-colors hover:text-tesla-white">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ─── Page (Main Export) ─────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <main className="min-h-screen bg-tesla-dark text-tesla-white">
      <Navbar />
      <Hero />
      <PlansSection />
      <FeaturesSection />
      <HowItWorksSection />
      <TestimonialsSection />
      <FAQSection />
      <CTASection />
      <Footer />
    </main>
  );
}