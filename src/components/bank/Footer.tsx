'use client';

import Link from 'next/link';
import CoreWealthLogo from '@/components/CoreWealthLogo';

const companyLinks: { label: string; href: string }[] = [
  { label: 'About Us', href: '/about' },
  { label: 'Careers', href: '#' },
  { label: 'Press', href: '#' },
  { label: 'Blog', href: '/blog' },
];

const productLinks: { label: string; href: string }[] = [
  { label: 'Checking', href: '/register' },
  { label: 'Savings', href: '/register' },
  { label: 'Cards', href: '/register' },
  { label: 'Investments', href: '/register' },
  { label: 'Wire Transfers', href: '/register' },
  { label: 'Download App', href: '/#app-download' },
];

const legalLinks: { label: string; href: string }[] = [
  { label: 'Terms of Service', href: '/terms' },
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'AML Policy', href: '/aml-policy' },
  { label: 'Cookie Policy', href: '#' },
];

const socialLinks = [
  {
    label: 'Twitter / X',
    href: 'https://twitter.com/corewealthbank',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    label: 'LinkedIn',
    href: 'https://linkedin.com/company/corewealthbank',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
  },
  {
    label: 'Telegram',
    href: 'https://t.me/corewealthbank',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
      </svg>
    ),
  },
];

const trustBadges = [
  {
    label: 'FDIC Insured',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L3 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z" />
      </svg>
    ),
  },
  {
    label: 'Equal Housing Lender',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" />
      </svg>
    ),
  },
  {
    label: '256-bit Encryption',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0110 0v4" />
      </svg>
    ),
  },
  {
    label: 'SOC 2 Certified',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 12l2 2 4-4" />
        <path d="M12 2l3.09 1.636L18.18 5.636l1.636 3.09L21 12l-1.636 3.274L18.18 18.364l-3.09 1.636L12 22l-3.09-1.636L5.82 18.364 4.182 15.274 2 12l1.636-3.274L5.82 5.636l3.09-1.636L12 2z" />
      </svg>
    ),
  },
];

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">
      {children}
    </h3>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  const isExternal = href.startsWith('http');
  return (
    <li>
      {isExternal ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-gray-500 hover:text-[#60A5FA] transition-colors duration-200"
        >
          {children}
        </a>
      ) : (
        <Link
          href={href}
          className="text-sm text-gray-500 hover:text-[#60A5FA] transition-colors duration-200"
        >
          {children}
        </Link>
      )}
    </li>
  );
}

export default function Footer() {
  return (
    <footer className="mt-auto relative bg-[#060A13] border-t border-white/[0.06]">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#2563EB]/[0.03] to-transparent pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-6 pt-14 pb-8">
        {/* Branding section */}
        <div className="flex flex-col items-center text-center mb-10">
          <CoreWealthLogo variant="wordmark" className="h-10 mb-4" />
          <p className="text-sm text-gray-400 max-w-md leading-relaxed">
            Modern digital banking built for security, speed, and your financial growth. Trusted by thousands worldwide.
          </p>
        </div>

        {/* Trust badges */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-12">
          {trustBadges.map((badge) => (
            <div
              key={badge.label}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs text-gray-400"
            >
              <span className="text-[#60A5FA]">{badge.icon}</span>
              {badge.label}
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="border-t border-white/[0.06] mb-10" />

        {/* Links grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
          {/* Company */}
          <div>
            <SectionTitle>Company</SectionTitle>
            <ul className="flex flex-col gap-2.5">
              {companyLinks.map((l) => (
                <FooterLink key={l.label} href={l.href}>{l.label}</FooterLink>
              ))}
            </ul>
          </div>

          {/* Products */}
          <div>
            <SectionTitle>Products</SectionTitle>
            <ul className="flex flex-col gap-2.5">
              {productLinks.map((l) => (
                <FooterLink key={l.label} href={l.href}>{l.label}</FooterLink>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <SectionTitle>Legal</SectionTitle>
            <ul className="flex flex-col gap-2.5">
              {legalLinks.map((l) => (
                <FooterLink key={l.label} href={l.href}>{l.label}</FooterLink>
              ))}
            </ul>
          </div>

          {/* Connect */}
          <div>
            <SectionTitle>Connect</SectionTitle>
            <div className="flex items-center gap-3">
              {socialLinks.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="flex items-center justify-center w-9 h-9 rounded-lg bg-white/[0.04] border border-white/[0.08] text-gray-500 hover:text-[#60A5FA] hover:bg-white/[0.08] hover:border-[#2563EB]/30 transition-all duration-200"
                >
                  {s.icon}
                </a>
              ))}
            </div>
            <div className="mt-4">
              <p className="text-xs text-gray-500 leading-relaxed">
                Follow us for the latest updates, product launches, and financial insights.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="relative border-t border-white/[0.06]">
        <div className="mx-auto max-w-7xl px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-500">
            &copy; {new Date().getFullYear()} CoreWealth Bank. All rights reserved.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-gray-500">
            <span>Member FDIC</span>
            <span className="text-gray-700">|</span>
            <span>Equal Housing Lender</span>
            <span className="text-gray-700">|</span>
            <span>NMLS #1234567</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
