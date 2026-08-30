'use client';

import { useState, useRef, useEffect } from 'react';
import { Bell, ArrowDownToLine, CheckCircle, ShieldAlert, ArrowRightLeft, Banknote, TrendingUp, FileText, Settings } from 'lucide-react';

interface Notification {
  id: number;
  title: string;
  description: string;
  time: string;
  unread: boolean;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
}

const NOTIFICATIONS: Notification[] = [
  {
    id: 1,
    title: 'Deposit Received',
    description: 'Your salary of $4,500.00 has been deposited',
    time: '2 hours ago',
    unread: true,
    icon: <ArrowDownToLine className="w-3.5 h-3.5" />,
    iconBg: 'bg-emerald-500/15',
    iconColor: 'text-emerald-500',
  },
  {
    id: 2,
    title: 'Bill Payment',
    description: 'Electric bill of $142.50 paid successfully',
    time: '5 hours ago',
    unread: true,
    icon: <CheckCircle className="w-3.5 h-3.5" />,
    iconBg: 'bg-emerald-500/15',
    iconColor: 'text-emerald-500',
  },
  {
    id: 3,
    title: 'Security Alert',
    description: 'New login detected from Chrome on Windows',
    time: '1 day ago',
    unread: true,
    icon: <ShieldAlert className="w-3.5 h-3.5" />,
    iconBg: 'bg-amber-500/15',
    iconColor: 'text-amber-500',
  },
  {
    id: 4,
    title: 'Transfer Complete',
    description: '$1,000.00 transferred to Savings',
    time: '1 day ago',
    unread: false,
    icon: <ArrowRightLeft className="w-3.5 h-3.5" />,
    iconBg: 'bg-sky-500/15',
    iconColor: 'text-sky-500',
  },
  {
    id: 5,
    title: 'Loan Payment',
    description: 'Monthly payment of $850.00 processed',
    time: '2 days ago',
    unread: false,
    icon: <Banknote className="w-3.5 h-3.5" />,
    iconBg: 'bg-sky-500/15',
    iconColor: 'text-sky-500',
  },
  {
    id: 6,
    title: 'Rate Update',
    description: 'Savings APY increased to 4.50%',
    time: '3 days ago',
    unread: false,
    icon: <TrendingUp className="w-3.5 h-3.5" />,
    iconBg: 'bg-emerald-500/15',
    iconColor: 'text-emerald-500',
  },
  {
    id: 7,
    title: 'Statement Ready',
    description: 'July 2026 statement is available',
    time: '5 days ago',
    unread: false,
    icon: <FileText className="w-3.5 h-3.5" />,
    iconBg: 'bg-sky-500/15',
    iconColor: 'text-sky-500',
  },
  {
    id: 8,
    title: 'System Update',
    description: 'Scheduled maintenance on Aug 5, 2-4 AM EST',
    time: '1 week ago',
    unread: false,
    icon: <Settings className="w-3.5 h-3.5" />,
    iconBg: 'bg-red-500/15',
    iconColor: 'text-red-500',
  },
];

export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState(NOTIFICATIONS);
  const ref = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => n.unread).length;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-9 h-9 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-foreground" />
        {unreadCount > 0 && (
          <span className="notification-dot absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center border-2 border-background">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 glass-card border border-white/20 bg-background/95 backdrop-blur-xl rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <h3 className="font-semibold text-sm text-foreground">Notifications</h3>
            <button
              onClick={markAllRead}
              className="text-xs text-emerald-500 hover:text-emerald-400 transition-colors"
            >
              Mark all read
            </button>
          </div>

          {/* Notification List */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`flex items-start gap-3 px-4 py-3 hover:bg-white/5 transition-colors cursor-pointer relative border-b border-white/5 last:border-0 ${
                  n.unread ? 'bg-emerald-500/5' : ''
                }`}
              >
                {n.unread && (
                  <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-emerald-500" />
                )}
                <div
                  className={`w-8 h-8 rounded-full ${n.iconBg} ${n.iconColor} flex items-center justify-center flex-shrink-0 ml-1`}
                >
                  {n.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium text-foreground truncate ${n.unread ? '' : 'opacity-80'}`}>
                    {n.title}
                  </p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {n.description}
                  </p>
                  <p className="text-[10px] text-muted-foreground/70 mt-1">{n.time}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-white/10">
            <button className="w-full text-center text-xs text-emerald-500 hover:text-emerald-400 font-medium transition-colors">
              View All
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
