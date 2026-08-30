'use client';

import { useState, useRef, useEffect } from 'react';
import { Plus, Send, Download, Headphones, QrCode } from 'lucide-react';

interface FABButtonProps {
  onNavigate: (page: string) => void;
}

const ACTIONS = [
  { label: 'Transfer', icon: Send, page: 'dashboard' },
  { label: 'Deposit', icon: Download, page: 'dashboard' },
  { label: 'Support', icon: Headphones, page: 'contact' },
  { label: 'Scan QR', icon: QrCode, page: '' },
];

export default function FABButton({ onNavigate }: FABButtonProps) {
  const [expanded, setExpanded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setExpanded(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside as unknown as EventListener);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside as unknown as EventListener);
    };
  }, []);

  const handleAction = (page: string) => {
    setExpanded(false);
    if (page) onNavigate(page);
  };

  return (
    <div className="fixed bottom-[5.5rem] right-5 z-40 md:hidden" ref={ref}>
      {expanded && (
        <div className="absolute bottom-full right-0 mb-3 flex flex-col items-end gap-2">
          {ACTIONS.map((action, i) => {
            const Icon = action.icon;
            return (
              <div
                key={action.label}
                className={`flex items-center gap-2 transition-all duration-200 ${
                  expanded
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-0 translate-y-2 pointer-events-none'
                }`}
                style={{
                  transitionDelay: expanded ? `${(ACTIONS.length - 1 - i) * 50}ms` : '0ms',
                }}
              >
                <span className="glass-card bg-background/90 backdrop-blur-xl border border-white/20 px-3 py-1.5 rounded-lg text-xs font-medium text-foreground shadow-lg whitespace-nowrap">
                  {action.label}
                </span>
                <button
                  onClick={() => handleAction(action.page)}
                  className="w-11 h-11 rounded-full bg-white/15 backdrop-blur-xl border border-white/20 text-white flex items-center justify-center shadow-lg hover:bg-white/25 active:scale-95 transition-all"
                  aria-label={action.label}
                >
                  <Icon className="w-5 h-5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <button
        onClick={() => setExpanded(!expanded)}
        className={`w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/30 flex items-center justify-center transition-all duration-300 active:scale-95 ${
          expanded ? 'rotate-45' : ''
        }`}
        aria-label={expanded ? 'Close actions' : 'Open actions'}
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
}
