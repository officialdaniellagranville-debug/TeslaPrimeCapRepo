'use client';

import { useEffect, useRef } from 'react';
import {
  Wallet,
  PiggyBank,
  Landmark,
  CreditCard,
  Building2,
  Smartphone,
  Receipt,
  Camera,
  TrendingUp,
  Banknote,
  CircleDollarSign,
} from 'lucide-react';

interface MegaMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (page: string) => void;
}

interface MenuItem {
  title: string;
  icon: React.ReactNode;
}

const COLUMNS: { heading: string; items: MenuItem[] }[] = [
  {
    heading: 'Accounts',
    items: [
      { title: 'Deposit Accounts', icon: <Wallet className="w-5 h-5" /> },
      { title: 'Savings Accounts', icon: <PiggyBank className="w-5 h-5" /> },
      { title: 'Money Market', icon: <CircleDollarSign className="w-5 h-5" /> },
      { title: 'Certificates', icon: <Landmark className="w-5 h-5" /> },
    ],
  },
  {
    heading: 'Borrowing',
    items: [
      { title: 'Credit Cards', icon: <CreditCard className="w-5 h-5" /> },
      { title: 'Personal Loans', icon: <Banknote className="w-5 h-5" /> },
      { title: 'Auto Loans', icon: <Building2 className="w-5 h-5" /> },
      { title: 'Mortgages', icon: <Building2 className="w-5 h-5" /> },
    ],
  },
  {
    heading: 'Services',
    items: [
      { title: 'Digital Wallet', icon: <Smartphone className="w-5 h-5" /> },
      { title: 'Bill Pay', icon: <Receipt className="w-5 h-5" /> },
      { title: 'Mobile Deposit', icon: <Camera className="w-5 h-5" /> },
      { title: 'Investments', icon: <TrendingUp className="w-5 h-5" /> },
    ],
  },
];

export default function MegaMenu({ isOpen, onClose, onNavigate }: MegaMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        ref={ref}
        className="mega-menu absolute left-1/2 -translate-x-1/2 top-full mt-2 w-[90vw] max-w-3xl glass-card border border-white/20 bg-background/95 backdrop-blur-xl rounded-2xl shadow-2xl p-6 z-50 animate-in fade-in slide-in-from-top-2 duration-200"
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {COLUMNS.map((col) => (
            <div key={col.heading}>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-emerald-500 mb-3">
                {col.heading}
              </h4>
              <div className="space-y-1">
                {col.items.map((item) => (
                  <button
                    key={item.title}
                    onClick={() => {
                      onNavigate('services');
                      onClose();
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors text-left group"
                  >
                    <div className="w-9 h-9 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-500/25 transition-colors">
                      {item.icon}
                    </div>
                    <span className="text-sm font-medium text-foreground group-hover:text-emerald-400 transition-colors">
                      {item.title}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
