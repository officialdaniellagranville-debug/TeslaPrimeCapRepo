'use client';

import { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

const features = [
  'Instant push notifications for transactions',
  'Biometric login with Face ID & fingerprint',
  'Snap & deposit checks from your phone',
  'Free peer-to-peer payments',
];

export default function AppDownloadSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="app-download"
      ref={sectionRef}
      className="relative py-24 sm:py-32 overflow-hidden"
      style={{ background: '#060A13' }}
    >
      {/* Ambient glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{
          background:
            'radial-gradient(circle, rgba(37,99,235,0.08) 0%, transparent 70%)',
        }}
      />

      <div
        className={`relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 transition-all duration-1000 ${
          visible
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-8'
        }`}
      >
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* ─── LEFT: Phone mockup ─── */}
          <div className="flex justify-center lg:justify-end">
            <div className="group relative" style={{ perspective: '1000px' }}>
              {/* Blue glow behind phone */}
              <div
                className="absolute inset-0 rounded-[2.5rem] blur-3xl opacity-40 group-hover:opacity-60 transition-opacity duration-500"
                style={{
                  background:
                    'radial-gradient(circle, rgba(37,99,235,0.5) 0%, transparent 70%)',
                }}
              />

              {/* Phone frame */}
              <div
                className="relative w-[280px] sm:w-[300px] rounded-[2.5rem] border-2 border-white/10 overflow-hidden transition-transform duration-500 group-hover:[transform:rotateY(-8deg)_rotateX(4deg)]"
                style={{
                  background: 'linear-gradient(145deg, #0f1629, #0a0e1a)',
                  boxShadow:
                    '0 25px 80px rgba(37,99,235,0.15), 0 0 0 1px rgba(255,255,255,0.05)',
                }}
              >
                {/* Notch */}
                <div className="flex justify-center pt-2">
                  <div className="w-24 h-6 bg-black rounded-b-2xl" />
                </div>

                {/* Status bar */}
                <div className="flex justify-between items-center px-6 py-1 text-[10px] text-gray-400">
                  <span className="font-semibold">9:41</span>
                  <div className="flex items-center gap-1">
                    {/* Signal bars */}
                    <svg width="14" height="10" viewBox="0 0 14 10" fill="currentColor" className="text-gray-400">
                      <rect x="0" y="7" width="2.5" height="3" rx="0.5" />
                      <rect x="3.5" y="5" width="2.5" height="5" rx="0.5" />
                      <rect x="7" y="2.5" width="2.5" height="7.5" rx="0.5" />
                      <rect x="10.5" y="0" width="2.5" height="10" rx="0.5" />
                    </svg>
                    {/* Battery */}
                    <svg width="20" height="10" viewBox="0 0 20 10" fill="none" className="text-gray-400">
                      <rect x="0.5" y="0.5" width="17" height="9" rx="1.5" stroke="currentColor" />
                      <rect x="2" y="2" width="12" height="6" rx="0.5" fill="#34D399" />
                      <rect x="18" y="3" width="2" height="4" rx="0.5" fill="currentColor" />
                    </svg>
                  </div>
                </div>

                {/* App content */}
                <div className="px-4 pb-6">
                  {/* Logo */}
                  <div className="flex items-center gap-2 mb-4 mt-1">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#2563EB] to-[#1D4ED8] flex items-center justify-center">
                      <span className="text-white font-bold text-[10px]">CW</span>
                    </div>
                    <span className="text-white text-xs font-semibold">CoreWealth</span>
                  </div>

                  {/* Balance card */}
                  <div
                    className="rounded-2xl p-4 mb-4 relative overflow-hidden"
                    style={{
                      background: 'linear-gradient(135deg, #2563EB, #1E3A8A)',
                    }}
                  >
                    {/* Card decorative circles */}
                    <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-white/10" />
                    <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-white/5" />
                    <p className="text-blue-200 text-[10px] mb-1">Total Balance</p>
                    <p className="text-white text-xl font-bold tracking-tight">
                      $12,450<span className="text-base">.00</span>
                    </p>
                    <div className="flex items-center gap-1 mt-2">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#34D399]" />
                      <span className="text-[#93C5FD] text-[9px]">Checking Account •••• 4829</span>
                    </div>
                  </div>

                  {/* Quick actions */}
                  <div className="grid grid-cols-4 gap-2 mb-4">
                    {[
                      { label: 'Transfer', icon: 'M7 17l9.2-9.2M17 17V7H7' },
                      { label: 'Pay', icon: 'M12 2v20M2 12h20' },
                      { label: 'Deposit', icon: 'M12 5v14M19 12l-7 7-7-7' },
                      { label: 'Cards', icon: 'M3 10h18M3 6h18M3 14h12M3 18h10' },
                    ].map((a) => (
                      <div
                        key={a.label}
                        className="flex flex-col items-center gap-1"
                      >
                        <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#60A5FA"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d={a.icon} />
                          </svg>
                        </div>
                        <span className="text-[9px] text-gray-500">{a.label}</span>
                      </div>
                    ))}
                  </div>

                  {/* Transactions list */}
                  <div>
                    <p className="text-[10px] text-gray-500 font-medium mb-2">Recent Transactions</p>
                    {[
                      { name: 'Netflix', amount: '-$15.99', color: '#F87171' },
                      { name: 'Salary', amount: '+$4,200.00', color: '#34D399' },
                      { name: 'Amazon', amount: '-$89.50', color: '#F87171' },
                    ].map((t) => (
                      <div
                        key={t.name}
                        className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center">
                            <div className="w-1.5 h-1.5 rounded-full" style={{ background: t.color }} />
                          </div>
                          <span className="text-[11px] text-gray-300">{t.name}</span>
                        </div>
                        <span className="text-[11px] font-semibold" style={{ color: t.color }}>
                          {t.amount}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Home indicator */}
                <div className="flex justify-center pb-2">
                  <div className="w-28 h-1 rounded-full bg-white/20" />
                </div>
              </div>
            </div>
          </div>

          {/* ─── RIGHT: Content ─── */}
          <div className="lg:pl-4">
            <div
              className="rounded-2xl border border-white/5 p-8 sm:p-10"
              style={{
                background: 'rgba(255,255,255,0.03)',
                backdropFilter: 'blur(16px)',
              }}
            >
              {/* Label */}
              <p className="text-xs font-semibold uppercase tracking-widest text-[#60A5FA] mb-4">
                Mobile Banking
              </p>

              {/* Headline */}
              <h2 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-4">
                Your Bank in Your Pocket
              </h2>

              {/* Description */}
              <p className="text-gray-400 leading-relaxed mb-8 max-w-md">
                Download the CoreWealth app for instant access to your accounts,
                cards, and investments. Available on all devices.
              </p>

              {/* Feature list */}
              <ul className="space-y-3 mb-8">
                {features.map((f) => (
                  <li key={f} className="flex items-start gap-3">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="mt-0.5 shrink-0"
                    >
                      <circle cx="12" cy="12" r="10" stroke="#2563EB" strokeWidth="1.5" />
                      <path
                        d="M8 12.5l2.5 2.5 5.5-5.5"
                        stroke="#2563EB"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span className="text-sm text-gray-300">{f}</span>
                  </li>
                ))}
              </ul>

              {/* QR code + buttons row */}
              <div className="flex flex-col sm:flex-row items-start gap-6">
                {/* QR Code */}
                <div className="shrink-0">
                  <div className="bg-white rounded-xl p-3 shadow-lg shadow-black/20">
                    <QRCodeSVG
                      value="https://corewealth-production.up.railway.app"
                      size={100}
                      bgColor="#ffffff"
                      fgColor="#060A13"
                      level="M"
                    />
                  </div>
                  <p className="text-[11px] text-gray-500 text-center mt-2">
                    Scan to download
                  </p>
                </div>

                {/* Store buttons */}
                <div className="flex flex-col gap-3 flex-1 sm:max-w-[220px]">
                  {/* App Store */}
                  <a
                    href="#"
                    className="flex items-center gap-3 px-5 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors duration-200"
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                    </svg>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-gray-400 leading-tight">
                        Download on the
                      </span>
                      <span className="text-sm text-white font-semibold leading-tight">
                        App Store
                      </span>
                    </div>
                  </a>

                  {/* Google Play */}
                  <a
                    href="#"
                    className="flex items-center gap-3 px-5 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors duration-200"
                  >
                    <svg width="22" height="24" viewBox="0 0 22 24" fill="none">
                      <path d="M1.22 0.31C0.89 0.64 0.7 1.16 0.7 1.83v20.34c0 0.67 0.19 1.19 0.52 1.52l0.08 0.07L12.17 12.55v-0.26L1.3 0.24 1.22 0.31z" fill="#4285F4"/>
                      <path d="M15.89 16.27l-3.72-3.72v-0.26l3.72-3.72 0.09 0.05 4.4 2.51c1.26 0.71 1.26 1.88 0 2.59l-4.4 2.51-0.09-0.05z" fill="#FBBC04"/>
                      <path d="M15.98 16.22L12.17 12.41 1.22 23.69c0.42 0.38 1.09 0.42 1.86 0l13.9-7.96" fill="#EA4335"/>
                      <path d="M15.98 8.59L3.08 0.63C2.31 0.21 1.64 0.25 1.22 0.63l10.95 11.28 3.81-3.81z" fill="#34A853"/>
                    </svg>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-gray-400 leading-tight">
                        Get it on
                      </span>
                      <span className="text-sm text-white font-semibold leading-tight">
                        Google Play
                      </span>
                    </div>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
