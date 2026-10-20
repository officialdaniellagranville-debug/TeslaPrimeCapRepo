'use client';

import { useState, useEffect, ReactNode } from 'react';
import { useAuthStore } from '@/store/useAuthStore';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

type FilterType = 'all' | 'unread';

function TypeIcon({ type, isRead }: { type: string; isRead: boolean }) {
  const configs: Record<string, { color: string; bg: string; icon: ReactNode }> = {
    investment: {
      color: 'text-green-400',
      bg: isRead ? 'bg-green-500/10' : 'bg-green-500/15 ring-2 ring-green-500/30',
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>,
    },
    deposit: {
      color: 'text-blue-400',
      bg: isRead ? 'bg-blue-500/10' : 'bg-blue-500/15 ring-2 ring-blue-500/30',
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 19 5 12" /></svg>,
    },
    withdrawal: {
      color: 'text-amber-400',
      bg: isRead ? 'bg-amber-500/10' : 'bg-amber-500/15 ring-2 ring-amber-500/30',
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" /></svg>,
    },
    security: {
      color: 'text-red-400',
      bg: isRead ? 'bg-red-500/10' : 'bg-red-500/15 ring-2 ring-red-500/30',
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>,
    },
    kyc: {
      color: 'text-purple-400',
      bg: isRead ? 'bg-purple-500/10' : 'bg-purple-500/15 ring-2 ring-purple-500/30',
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>,
    },
  };
  const cfg = configs[type] || configs.investment;
  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${cfg.bg} ${cfg.color}`}>
      {cfg.icon}
    </div>
  );
}

export default function NotificationsPage() {
  const { token } = useAuthStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetch('/api/notifications?limit=50', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data) {
          setNotifications(d.data.notifications || []);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/notifications?id=${id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch {}
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter((n) => !n.isRead);
    if (unread.length === 0) return;
    setMarkingAll(true);
    try {
      await Promise.allSettled(
        unread.map((n) =>
          fetch(`/api/notifications?id=${n.id}`, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          })
        )
      );
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {} finally {
      setMarkingAll(false);
    }
  };

  const filtered = filter === 'unread'
    ? notifications.filter((n) => !n.isRead)
    : notifications;

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white font-bold text-lg">Notifications</h2>
          <p className="text-gray-500 text-sm mt-0.5">Stay updated on your investment activity</p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            disabled={markingAll}
            className="text-[#CC0000] text-xs font-semibold hover:underline disabled:opacity-50"
          >
            {markingAll ? 'Marking...' : `Mark all read (${unreadCount})`}
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {(['all', 'unread'] as FilterType[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              filter === f
                ? 'bg-[#CC0000] text-white'
                : 'bg-[#1a1a1a] text-gray-400 hover:text-white border border-tesla-border'
            }`}
          >
            {f === 'all' ? 'All' : 'Unread'}
            {f === 'unread' && unreadCount > 0 && (
              <span className="ml-1.5 bg-[#CC0000]/20 text-[#CC0000] px-1.5 py-0.5 rounded-full text-[10px]">{unreadCount}</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-tesla-card border border-tesla-border rounded-xl p-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-700" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-800 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-gray-800 rounded w-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-tesla-card border border-tesla-border rounded-xl p-10 text-center">
          <div className="text-gray-600 text-4xl mb-3">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </div>
          <p className="text-gray-500 text-sm">
            {filter === 'unread' ? 'All caught up!' : 'No notifications yet'}
          </p>
          <p className="text-gray-600 text-xs mt-1">
            {filter === 'unread' ? 'You have no unread notifications.' : "We'll notify you about account activity here."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((n) => (
            <div
              key={n.id}
              onClick={() => !n.isRead && markAsRead(n.id)}
              className={`bg-tesla-card border rounded-xl p-4 transition-colors cursor-pointer ${!n.isRead ? 'border-[#CC0000]/30' : 'border-tesla-border'}`}
            >
              <div className="flex items-start gap-3">
                <TypeIcon type={n.type} isRead={n.isRead} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className={`text-sm font-semibold ${!n.isRead ? 'text-white' : 'text-gray-300'}`}>
                      {n.title}
                    </h3>
                    <span className="text-gray-600 text-xs whitespace-nowrap">{formatTime(n.createdAt)}</span>
                  </div>
                  <p className="text-gray-500 text-sm mt-1 leading-relaxed">{n.message}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
</div>
  );
}
