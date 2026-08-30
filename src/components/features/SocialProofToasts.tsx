'use client';

import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface ToastEntry {
  id: number;
  text: string;
  initials: string;
}

const ENTRIES: Omit<ToastEntry, 'id'>[] = [
  { text: 'Sarah M. from New York just opened a Premium Account', initials: 'SM' },
  { text: 'James K. from Los Angeles transferred $5,000', initials: 'JK' },
  { text: 'Emily R. from Chicago applied for a Mortgage', initials: 'ER' },
  { text: 'Michael D. from Houston earned 4.50% APY on Savings', initials: 'MD' },
  { text: 'Lisa T. from Phoenix set up Bill Pay', initials: 'LT' },
  { text: 'David W. from San Diego opened a Business Account', initials: 'DW' },
  { text: 'Anna P. from Dallas deposited a check via mobile', initials: 'AP' },
  { text: 'Robert J. from Miami activated 2FA Security', initials: 'RJ' },
  { text: 'Jennifer L. from Seattle started an Investment Plan', initials: 'JL' },
  { text: 'Chris B. from Boston got approved for a Personal Loan', initials: 'CB' },
  { text: 'Amanda S. from Atlanta set up Auto-Savings', initials: 'AS' },
  { text: 'Thomas H. from Denver opened a High-Yield Savings', initials: 'TH' },
  { text: 'Nicole V. from Portland paid bills worth $2,340', initials: 'NV' },
  { text: 'Kevin M. from Las Vegas downloaded our Mobile App', initials: 'KM' },
  { text: 'Rachel G. from Minneapolis activated Digital Wallet', initials: 'RG' },
];

function getAvatarColor(initials: string): string {
  const colors = ['bg-emerald-500', 'bg-teal-500', 'bg-cyan-500', 'bg-amber-500', 'bg-rose-500', 'bg-violet-500'];
  return colors[initials.charCodeAt(0) % colors.length];
}

export default function SocialProofToasts() {
  const [toast, setToast] = useState<ToastEntry | null>(null);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const shownCountRef = useRef(0);
  const pauseUntilRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (dismissed) return;

    const showNext = () => {
      if (dismissed) return;

      const now = Date.now();
      if (now < pauseUntilRef.current) {
        const delay = pauseUntilRef.current - now;
        timeoutRef.current = setTimeout(showNext, delay);
        return;
      }

      const entry = ENTRIES[Math.floor(Math.random() * ENTRIES.length)];
      const newToast: ToastEntry = { id: Date.now(), ...entry };
      setToast(newToast);
      setVisible(true);
      shownCountRef.current += 1;

      hideTimeoutRef.current = setTimeout(() => {
        setVisible(false);
        setTimeout(() => {
          setToast(null);
          const interval = 8000 + Math.random() * 4000;
          if (shownCountRef.current >= 5) {
            shownCountRef.current = 0;
            pauseUntilRef.current = Date.now() + 30000;
            timeoutRef.current = setTimeout(showNext, 30000);
          } else {
            timeoutRef.current = setTimeout(showNext, interval);
          }
        }, 300);
      }, 4000);
    };

    timeoutRef.current = setTimeout(showNext, 5000);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, [dismissed]);

  const handleDismiss = () => {
    setVisible(false);
    setDismissed(true);
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    setTimeout(() => setToast(null), 300);
  };

  if (!toast) return null;

  return (
    <div className="fixed bottom-6 left-6 z-50 max-w-xs">
      <div
        className={`glass-card border border-white/20 bg-background/90 backdrop-blur-xl rounded-xl p-3 shadow-lg flex items-start gap-3 transition-all duration-300 ${
          visible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'
        }`}
      >
        <div className="relative flex-shrink-0">
          <div className={`w-9 h-9 rounded-full ${getAvatarColor(toast.initials)} flex items-center justify-center text-white text-xs font-bold`}>
            {toast.initials}
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-background" />
        </div>
        <p className="text-sm text-foreground leading-snug flex-1 pr-4">{toast.text}</p>
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 w-5 h-5 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors -mt-0.5 -mr-1"
          aria-label="Dismiss notification"
        >
          <X className="w-3 h-3 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}
