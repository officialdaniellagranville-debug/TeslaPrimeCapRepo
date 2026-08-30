'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRightLeft, CreditCard, Bitcoin, QrCode } from 'lucide-react';

const STORAGE_KEY = 'corewealth_onboarded';

const features = [
  {
    icon: ArrowRightLeft,
    title: 'Instant Transfers',
    desc: 'Send money locally & internationally',
  },
  {
    icon: CreditCard,
    title: 'Virtual Cards',
    desc: 'Instant virtual cards for online payments',
  },
  {
    icon: Bitcoin,
    title: 'Buy Crypto',
    desc: 'Purchase Bitcoin & Ethereum instantly',
  },
  {
    icon: QrCode,
    title: 'Receive Funds',
    desc: 'Share your QR code to receive payments',
  },
];

export default function OnboardingWalkthrough() {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [screen, setScreen] = useState(0);
  const [slideDir, setSlideDir] = useState<'left' | 'right'>('left');
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    const onboarded = localStorage.getItem(STORAGE_KEY);
    if (!onboarded) {
      const t = setTimeout(() => setShow(true), 600);
      return () => clearTimeout(t);
    }
  }, []);

  const dismiss = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setShow(false);
  }, []);

  const goTo = useCallback(
    (idx: number, dir: 'left' | 'right') => {
      if (animating) return;
      setSlideDir(dir);
      setAnimating(true);
      setTimeout(() => {
        setScreen(idx);
        setAnimating(false);
      }, 150);
    },
    [animating]
  );

  const handleNext = () => {
    if (screen < 2) goTo(screen + 1, 'left');
  };

  const handleBack = () => {
    if (screen > 0) goTo(screen - 1, 'right');
  };

  if (!show) return null;

  const isLastScreen = screen === 2;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-sm onboard-fade-in">
      <div className="relative w-full max-w-md mx-4 overflow-hidden rounded-3xl border border-white/10 bg-[#0B1120]/95 backdrop-blur-xl shadow-2xl shadow-black/50">
        {/* Skip link on screens 0 and 1 */}
        {!isLastScreen && (
          <button
            onClick={dismiss}
            className="absolute top-4 right-4 z-20 text-white/40 text-xs font-medium hover:text-white/70 transition-colors"
          >
            Skip
          </button>
        )}

        <div className="relative overflow-hidden">
          {/* Screen 0 - Welcome */}
          <div
            className={[
              'px-8 pt-12 pb-8 transition-all duration-300 ease-in-out',
              screen === 0 && !animating
                ? 'opacity-100 translate-x-0'
                : screen === 0 && animating
                  ? 'opacity-0 -translate-x-full'
                  : 'hidden',
            ].filter(Boolean).join(' ')}
          >
            <div className="relative w-48 h-48 mx-auto mb-8">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#2563EB]/20 to-[#1E3A8A]/10 animate-[pulse_3s_ease-in-out_infinite]" />
              <div className="absolute top-4 left-4 w-20 h-20 rounded-2xl bg-[#2563EB]/10 border border-[#2563EB]/20 rotate-12" />
              <div className="absolute bottom-6 right-4 w-16 h-16 rounded-full bg-[#93C5FD]/10 border border-[#93C5FD]/15" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#2563EB] to-[#1E3A8A] flex items-center justify-center shadow-lg shadow-[#2563EB]/30">
                  <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <polyline points="9 12 11 14 15 10" />
                  </svg>
                </div>
              </div>
            </div>

            <h2 className="text-white text-2xl font-bold text-center mb-3">
              Welcome to CoreWealth
            </h2>
            <p className="text-white/50 text-sm text-center leading-relaxed">
              Your account is set up and ready. Here&apos;s a quick tour of your
              banking dashboard.
            </p>
          </div>

          {/* Screen 1 - Key Features */}
          <div
            className={[
              'px-8 pt-12 pb-8 transition-all duration-300 ease-in-out',
              screen === 1 && !animating
                ? 'opacity-100 translate-x-0'
                : screen === 1 && animating
                  ? 'opacity-0 -translate-x-full'
                  : 'hidden',
            ].filter(Boolean).join(' ')}
          >
            <div className="w-14 h-14 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-[#2563EB] to-[#1E3A8A] flex items-center justify-center shadow-lg shadow-[#2563EB]/30">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
            </div>

            <h2 className="text-white text-2xl font-bold text-center mb-2">
              Everything You Need
            </h2>
            <p className="text-white/50 text-sm text-center leading-relaxed mb-8">
              Powerful financial tools, all in one secure platform.
            </p>

            <div className="grid grid-cols-2 gap-4">
              {features.map((f) => {
                const Icon = f.icon;
                return (
                  <div
                    key={f.title}
                    className="flex flex-col items-center text-center p-4 rounded-2xl bg-white/[0.03] border border-white/5"
                  >
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#2563EB]/20 to-[#1E3A8A]/20 border border-[#2563EB]/20 flex items-center justify-center mb-2.5">
                      <Icon size={20} className="text-[#60A5FA]" />
                    </div>
                    <p className="text-white text-xs font-semibold mb-0.5">{f.title}</p>
                    <p className="text-white/40 text-[10px] leading-snug">{f.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Screen 2 - Get Started */}
          <div
            className={[
              'px-8 pt-12 pb-8 transition-all duration-300 ease-in-out',
              screen === 2 && !animating
                ? 'opacity-100 translate-x-0'
                : screen === 2 && animating
                  ? 'opacity-0 -translate-x-full'
                  : 'hidden',
            ].filter(Boolean).join(' ')}
          >
            <div className="w-24 h-24 mx-auto mb-8 rounded-full bg-gradient-to-br from-[#2563EB] to-[#1E3A8A] flex items-center justify-center shadow-lg shadow-[#2563EB]/30">
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>

            <h2 className="text-white text-2xl font-bold text-center mb-3">
              You&apos;re All Set!
            </h2>
            <p className="text-white/50 text-sm text-center leading-relaxed mb-8">
              Complete your identity verification to unlock full access to all
              features including higher limits and card delivery.
            </p>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  dismiss();
                  router.push('/kyc');
                }}
                className="w-full py-3 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-semibold transition-colors shadow-lg shadow-[#2563EB]/25"
              >
                Complete Verification
              </button>
              <button
                onClick={dismiss}
                className="w-full py-3 rounded-xl border border-white/10 text-white/60 hover:text-white hover:border-white/20 text-sm font-semibold transition-colors"
              >
                Skip for Now
              </button>
            </div>
            <p className="text-white/30 text-[10px] text-center mt-4">
              You can verify anytime from Settings &gt; Verification
            </p>
          </div>
        </div>

        {/* Bottom navigation */}
        {!isLastScreen && (
          <div className="px-8 pb-8 pt-2 flex items-center justify-between">
            <div className="w-8">
              {screen > 0 && (
                <button
                  onClick={handleBack}
                  className="w-8 h-8 flex items-center justify-center text-white/40 hover:text-white/70 transition-colors"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </button>
              )}
            </div>

            <div className="flex gap-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === screen ? 'w-6 bg-[#2563EB]' : 'w-1.5 bg-white/20'
                  }`}
                />
              ))}
            </div>

            <button
              onClick={handleNext}
              className="w-8 h-8 flex items-center justify-center bg-[#2563EB] hover:bg-[#1D4ED8] rounded-full text-white transition-colors shadow-md shadow-[#2563EB]/30"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        )}

        {isLastScreen && (
          <div className="pb-8 pt-2 flex justify-center">
            <div className="flex gap-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === screen ? 'w-6 bg-[#2563EB]' : 'w-1.5 bg-white/20'
                  }`}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes onboardFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .onboard-fade-in { animation: onboardFadeIn 300ms ease-out; }
      ` }} />
    </div>
  );
}
