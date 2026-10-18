'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';

const TickerTapeWidget = dynamic(() => import('@/components/TickerTapeWidget'), { ssr: false });
const GoogleTranslate = dynamic(() => import('@/components/GoogleTranslate'), { ssr: false });
const ChatWidget = dynamic(() => import('@/components/ChatWidget'), { ssr: false });

const navLinks = [
  { label: 'Home', href: '/' },
  { label: 'Plans', href: '/plans' },
  { label: 'How to Invest', href: '/how-to-invest' },
  { label: 'Blog', href: '/blog' },
  { label: 'About', href: '/about' },
  { label: 'FAQ', href: '/faq' },
  { label: 'Contact', href: '/contact' },
];

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showBackTop, setShowBackTop] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [liveCount, setLiveCount] = useState(12847);

  // Theme toggle
  useEffect(() => {
    const saved = localStorage.getItem('theme') as 'dark' | 'light' | null;
    if (saved && saved !== 'dark') document.documentElement.classList.toggle('light', saved === 'light');
  }, []);
  useEffect(() => { setTheme(localStorage.getItem('theme') as 'dark' | 'light' || 'dark'); }, []);
  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next); localStorage.setItem('theme', next);
    document.documentElement.classList.toggle('light', next === 'light');
  };

  // Live investor counter animation
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveCount(prev => prev + Math.floor(Math.random() * 5) - 2);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
      setShowBackTop(window.scrollY > 500);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-tesla-dark text-white">
      {/* Top gradient accent bar */}
      <div className="fixed top-0 left-0 right-0 h-[3px] z-[60] bg-gradient-to-r from-transparent via-[#CC0000] to-transparent" />

      {/* Navbar */}
      <nav className={`fixed top-[3px] left-0 right-0 z-50 transition-all duration-500 ${scrolled ? 'bg-tesla-dark/95 backdrop-blur-2xl border-b border-white/8 shadow-[0_4px_30px_rgba(0,0,0,0.3)]' : 'bg-tesla-dark/70 backdrop-blur-xl border-b border-white/5'}`}>
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10">
          <div className="flex items-center justify-between h-20">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-[#CC0000]/10 border border-[#CC0000]/20 flex items-center justify-center group-hover:bg-[#CC0000]/20 group-hover:border-[#CC0000]/40 group-hover:shadow-[0_0_20px_rgba(204,0,0,0.15)] transition-all duration-300">
                <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 5.362l2.475-3.026s4.245.09 8.471 2.054c-1.082 1.636-3.231 2.438-3.231 2.438-.146-1.439-1.154-1.79-4.354-1.79L12 24 8.619 5.034c-3.18 0-4.188.354-4.335 1.792 0 0-2.146-.795-3.229-2.43C5.28 2.431 9.525 2.34 9.525 2.34L12 5.362h-.004.004zm0-3.899c3.415-.03 7.326.528 11.328 2.28.535-.968.672-1.395.672-1.395C19.625.612 15.528.015 12 0 8.472.015 4.375.61 0 2.349c0 0 .195.525.672 1.396C4.674 1.989 8.585 1.435 12 1.46V1.463z" fill="#CC0000"/>
                </svg>
              </div>
              <span className="text-white font-black text-xl tracking-tight">Tesla<span className="text-[#CC0000]">Prime</span></span>
            </Link>
            <div className="hidden lg:flex items-center gap-10">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-sm font-semibold transition-all duration-300 relative ${pathname === link.href ? 'text-white' : 'text-gray-400 hover:text-white'}`}
                >
                  {link.label}
                  {pathname === link.href && (
                    <span className="absolute -bottom-1.5 left-0 right-0 h-[2px] bg-[#CC0000] rounded-full shadow-[0_0_8px_rgba(204,0,0,0.5)]" />
                  )}
                </Link>
              ))}
            </div>
            <div className="hidden lg:flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-green-400 text-xs font-medium bg-green-400/10 border border-green-400/20 px-3 py-1.5 rounded-lg">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                <span>{liveCount.toLocaleString()} investors online</span>
              </div>
              <button onClick={toggleTheme} className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-white transition-colors rounded-xl hover:bg-white/5" aria-label="Toggle theme">
                {theme === 'dark' ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                )}
              </button>
              <GoogleTranslate />
              <Link href="/login" className="text-gray-300 hover:text-white text-sm font-semibold px-5 py-2.5 transition-all duration-300 hover:bg-white/5 rounded-xl">Sign In</Link>
              <Link href="/register" className="btn-red text-sm py-2.5 px-7 pulse-ring !rounded-xl">Get Started</Link>
            </div>
            <button onClick={() => setMobileOpen(!mobileOpen)} className="lg:hidden text-white p-2.5 rounded-xl hover:bg-white/5 transition-colors">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {mobileOpen ? <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></> : <><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></>}
              </svg>
            </button>
          </div>
        </div>
        {/* Mobile menu */}
        <div className={`lg:hidden overflow-hidden transition-all duration-500 ease-in-out ${mobileOpen ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="bg-tesla-dark/98 backdrop-blur-2xl border-t border-white/5 px-6 py-6 space-y-1">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)} className={`block text-sm font-semibold py-3 px-4 rounded-xl transition-all ${pathname === link.href ? 'text-white bg-[#CC0000]/10 border-l-2 border-[#CC0000]' : 'text-gray-300 hover:text-white hover:bg-white/5'}`}>{link.label}</Link>
            ))}
            <div className="pt-4 mt-3 border-t border-white/5 flex flex-col gap-3">
              <Link href="/login" onClick={() => setMobileOpen(false)} className="text-gray-300 hover:text-white text-sm font-semibold py-3 px-4 rounded-xl hover:bg-white/5 text-center">Sign In</Link>
              <Link href="/register" onClick={() => setMobileOpen(false)} className="btn-red text-center text-sm pulse-ring">Get Started</Link>
            </div>
            <div className="pt-3 flex justify-center">
              <GoogleTranslate />
            </div>
            <div className="pt-2 flex justify-center">
              <button onClick={toggleTheme} className="flex items-center gap-2 text-gray-400 hover:text-white text-sm py-2 px-4 rounded-xl hover:bg-white/5 transition-colors">
                {theme === 'dark' ? (
                  <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/></svg> Light Mode</>
                ) : (
                  <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg> Dark Mode</>
                )}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Light mode overrides */}
      <style dangerouslySetInnerHTML={{ __html: `
        html.light body, html.light .bg-tesla-dark { background-color: #f5f5f5 !important; }
        html.light .bg-tesla-card { background-color: #ffffff !important; border-color: #e5e5e5 !important; }
        html.light .text-white { color: #111827 !important; }
        html.light .text-gray-400 { color: #6b7280 !important; }
        html.light .text-gray-500 { color: #9ca3af !important; }
        html.light .text-gray-600 { color: #d1d5db !important; }
        html.light .text-gray-700 { color: #e5e7eb !important; }
        html.light .border-tesla-border { border-color: #e5e7eb !important; }
        html.light header, html.light nav { background-color: rgba(255,255,255,0.95) !important; }
        html.light .heading-gradient { color: #111827 !important; }
      ` }} />

      {/* Stock Ticker Tape — sticky below navbar */}
      <div className="sticky top-[83px] z-40 bg-tesla-dark">
        <TickerTapeWidget />
      </div>

      {/* Main Content */}
      <main>{children}</main>

      {/* Back to top */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className={`fixed bottom-8 right-8 z-50 w-12 h-12 rounded-full bg-[#CC0000]/90 hover:bg-[#CC0000] text-white flex items-center justify-center shadow-[0_4px_25px_rgba(204,0,0,0.3)] transition-all duration-300 hover:scale-110 ${showBackTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}
        aria-label="Back to top"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15" /></svg>
      </button>

      {/* Footer */}
      <footer className="border-t border-tesla-border bg-tesla-card/50 relative overflow-hidden mt-20">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[200px] bg-[#CC0000]/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 py-20 relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-10 mb-16">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-8 h-8 rounded-lg bg-[#CC0000]/10 border border-[#CC0000]/20 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-4 h-4" xmlns="http://www.w3.org/2000/svg"><path d="M12.743 0L7.79 12.276h3.166l.546-1.397h5.506l.546 1.397h3.166L15.257 0h-2.514zM12 4.583l1.835 4.744h-3.67L12 4.583zM7.79 12.276L.1 24h23.8l-7.69-11.724H7.79z" fill="#CC0000"/></svg>
                </div>
                <span className="text-white font-bold text-sm">TeslaPrime</span>
              </div>
              <p className="text-gray-500 text-sm leading-relaxed mb-6">Professional investment management with daily returns you can count on. Backed by institutional-grade technology and transparent operations.</p>
              <div className="flex gap-3">
                {[
                  { label: 'X', path: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z' },
                  { label: 'LinkedIn', path: 'M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-4 0v7h-4v-7a6 6 0 016-6zM2 9h4v12H2zM4 6a2 2 0 100-4 2 2 0 000 4z' },
                  { label: 'Telegram', path: 'M22 2L11 13M22 2l-7 20-4-9-9-4z' },
                ].map((s) => (
                  <a key={s.label} href="#" className="w-10 h-10 rounded-xl bg-white/5 hover:bg-[#CC0000]/15 border border-white/5 hover:border-[#CC0000]/30 flex items-center justify-center transition-all duration-300 group" aria-label={s.label}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500 group-hover:text-[#CC0000] transition-colors"><path d={s.path} /></svg>
                  </a>
                ))}
              </div>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-white font-bold text-sm mb-5 tracking-wide">Company</h4>
              <ul className="space-y-3">
                {[
                  { label: 'About Us', href: '/about' },
                  { label: 'Contact', href: '/contact' },
                  { label: 'Investment Plans', href: '/plans' },
                  { label: 'How to Invest', href: '/how-to-invest' },
                  { label: 'Blog', href: '/blog' },
                ].map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-gray-500 hover:text-[#CC0000] text-sm transition-colors duration-300 relative group">
                      {l.label}
                      <span className="absolute bottom-0 left-0 w-0 h-[1px] bg-[#CC0000] group-hover:w-full transition-all duration-300" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h4 className="text-white font-bold text-sm mb-5 tracking-wide">Resources</h4>
              <ul className="space-y-3">
                {[
                  { label: 'FAQ', href: '/faq' },
                  { label: 'Support Center', href: '/contact' },
                  { label: 'Market Data', href: '/' },
                  { label: 'Referral Program', href: '/register' },
                ].map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-gray-500 hover:text-[#CC0000] text-sm transition-colors duration-300 relative group">
                      {l.label}
                      <span className="absolute bottom-0 left-0 w-0 h-[1px] bg-[#CC0000] group-hover:w-full transition-all duration-300" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-white font-bold text-sm mb-5 tracking-wide">Legal</h4>
              <ul className="space-y-3">
                {[
                  { label: 'Privacy Policy', href: '/privacy' },
                  { label: 'Terms of Service', href: '/terms' },
                  { label: 'Risk Disclosure', href: '/risk-disclosure' },
                  { label: 'AML Policy', href: '/aml-policy' },
                ].map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-gray-500 hover:text-[#CC0000] text-sm transition-colors duration-300 relative group">
                      {l.label}
                      <span className="absolute bottom-0 left-0 w-0 h-[1px] bg-[#CC0000] group-hover:w-full transition-all duration-300" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Newsletter */}
            <div>
              <h4 className="text-white font-bold text-sm mb-5 tracking-wide">Stay Updated</h4>
              <p className="text-gray-500 text-sm mb-5 leading-relaxed">Get market insights and investment tips delivered to your inbox weekly.</p>
              <div className="flex gap-2">
                <input type="email" placeholder="your@email.com" className="flex-1 min-w-0 bg-[#1a1a1a] border border-tesla-border rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#CC0000] transition-colors" />
                <button className="btn-red text-xs py-2.5 px-4 shrink-0 !rounded-xl">Subscribe</button>
              </div>
            </div>
          </div>

          {/* Testimonials Section */}
          <div className="border-t border-tesla-border pt-12 mb-4">
            <h4 className="text-white font-bold text-center text-sm mb-8">What Our Investors Say</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { name: 'Michael R.', loc: 'New York, US', text: 'I\'ve been investing with TeslaPrime for 6 months. The daily returns are consistent and the withdrawal process is incredibly smooth. Highly recommend to anyone looking for passive income.', rating: 5 },
                { name: 'Sarah K.', loc: 'London, UK', text: 'The platform is very intuitive and the support team is always responsive. I started with the Silver plan and have already seen significant growth in my portfolio. Truly professional service.', rating: 5 },
                { name: 'David L.', loc: 'Toronto, Canada', text: 'What impressed me most is the transparency. Real-time tracking of my investments, clear payout schedules, and no hidden fees. This is how investment platforms should operate.', rating: 5 },
              ].map((t, i) => (
                <div key={i} className="bg-[#111] border border-tesla-border rounded-xl p-5">
                  <div className="flex gap-0.5 mb-3">
                    {[...Array(t.rating)].map((_, j) => (
                      <svg key={j} viewBox="0 0 24 24" className="w-4 h-4" fill="#00B67A"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                    ))}
                  </div>
                  <p className="text-gray-400 text-xs leading-relaxed mb-4">&ldquo;{t.text}&rdquo;</p>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[#CC0000]/15 border border-[#CC0000]/20 flex items-center justify-center text-[#CC0000] text-xs font-bold">{t.name.charAt(0)}</div>
                    <div>
                      <p className="text-white text-xs font-semibold">{t.name}</p>
                      <p className="text-gray-600 text-[10px]">{t.loc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Trustpilot Reviews Section — prominent */}
          <div className="border-t border-tesla-border pt-12 mb-10">
            <div className="flex flex-col items-center text-center">
              {/* Trustpilot wordmark */}
              <div className="flex items-center gap-2 mb-4">
                <svg viewBox="0 0 150 150" className="w-8 h-8" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M75 0L91.5 53.25H146.75L101.1 85.5L117.6 138.75L75 105L32.4 138.75L48.9 85.5L3.25 53.25H58.5L75 0Z" fill="#00B67A"/>
                </svg>
                <span className="text-[#00B67A] text-xl font-bold tracking-wide">Trustpilot</span>
              </div>
              {/* Star rating */}
              <div className="flex items-center gap-1 mb-2">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} viewBox="0 0 24 24" className="w-6 h-6" fill="#00B67A"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                ))}
              </div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-white font-bold text-2xl">4.8</span>
                <span className="text-gray-500 text-sm">out of 5</span>
              </div>
              <p className="text-gray-400 text-sm mb-2">Based on <span className="text-white font-semibold">2,847 reviews</span></p>
              <p className="text-gray-500 text-xs mb-6">Verified investors worldwide trust TeslaPrime</p>
              {/* Mini review snippets */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full max-w-3xl mb-6">
                {[
                  { name: 'James W.', text: 'Outstanding returns and excellent customer support. Best platform I\'ve used.', stars: 5 },
                  { name: 'Priya M.', text: 'Very transparent and reliable. Daily payouts are always on time.', stars: 5 },
                  { name: 'Alex T.', text: 'Professional service with real results. My portfolio has grown significantly.', stars: 5 },
                ].map((r, i) => (
                  <div key={i} className="bg-[#0a0a0a] border border-tesla-border rounded-xl p-4 text-left">
                    <div className="flex gap-0.5 mb-2">
                      {[...Array(r.stars)].map((_, j) => (
                        <svg key={j} viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="#00B67A"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                      ))}
                    </div>
                    <p className="text-gray-400 text-xs leading-relaxed mb-2">&ldquo;{r.text}&rdquo;</p>
                    <p className="text-white text-xs font-semibold">{r.name}</p>
                  </div>
                ))}
              </div>
              <a
                href="https://www.trustpilot.com/review/teslaprime.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-[#00B67A] hover:bg-[#00a06b] text-white text-sm font-semibold px-8 py-3.5 rounded-xl transition-colors shadow-lg shadow-[#00B67A]/20"
              >
                <span>See all reviews on Trustpilot</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              </a>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-tesla-border pt-10">
            <div className="flex flex-col md:flex-row items-center justify-between gap-5">
              <p className="text-gray-600 text-xs">&copy; {new Date().getFullYear()} TeslaPrime. All rights reserved.</p>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 text-gray-600">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                  <span className="text-xs">SSL Secured</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
                  <span className="text-xs">256-bit Encryption</span>
                </div>
              </div>
            </div>
            <p className="text-gray-700 text-[10px] mt-5 text-center leading-relaxed max-w-3xl mx-auto">
              Risk Disclaimer: Investing involves risk. Past performance does not guarantee future results. The value of your investment may go up or down. Please read our full risk disclosure before making any investment decisions. TeslaPrime is not a registered broker-dealer or financial advisor.
            </p>
          </div>
        </div>
      </footer>
      <ChatWidget />
    </div>
  );
}
