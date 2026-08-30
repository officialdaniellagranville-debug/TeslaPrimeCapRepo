'use client';

import { useState, type ReactNode } from 'react';

type NotifType = 'all' | 'deposits' | 'withdrawals' | 'investments' | 'system';

interface Notification {
  id: number;
  type: 'deposit' | 'withdrawal' | 'investment' | 'system';
  title: string;
  message: string;
  time: string;
  unread: boolean;
}

const allNotifications: Notification[] = [
  { id: 1, type: 'deposit', title: 'Deposit Confirmed', message: 'Your deposit of $5,000.00 via BTC has been confirmed and credited to your account.', time: '2 hours ago', unread: true },
  { id: 2, type: 'withdrawal', title: 'Withdrawal Processing', message: 'Your withdrawal request of $1,332.00 is being processed. Expected completion within 24-48 hours.', time: '5 hours ago', unread: true },
  { id: 3, type: 'investment', title: 'Daily Earning Credited', message: 'Your Gold Plan investment earned $180.00 today. This has been added to your balance.', time: '12 hours ago', unread: true },
  { id: 4, type: 'system', title: 'Scheduled Maintenance', message: 'Platform maintenance scheduled for July 22, 2026 from 2:00 AM - 4:00 AM UTC.', time: '1 day ago', unread: false },
  { id: 5, type: 'investment', title: 'Investment Completed', message: 'Your Basic Plan investment of $2,000.00 has matured. Total earnings: $300.00.', time: '2 days ago', unread: false },
  { id: 6, type: 'deposit', title: 'Deposit Received', message: 'Your deposit of $2,000.00 via USDT has been received and is pending confirmation.', time: '3 days ago', unread: false },
  { id: 7, type: 'system', title: 'Security Update', message: 'We have updated our security protocols. Please review your account settings.', time: '5 days ago', unread: false },
];

function NotifIcon({ type }: { type: string }) {
  const iconMap: Record<string, ReactNode> = {
    deposit: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><polyline points="8 12 12 16 16 12" />
      </svg>
    ),
    withdrawal: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="8" /><polyline points="8 12 12 8 16 12" />
      </svg>
    ),
    investment: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" />
      </svg>
    ),
    system: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    ),
  };
  return iconMap[type] || iconMap.system;
}

const filterMap: Record<NotifType, string[]> = {
  all: ['deposit', 'withdrawal', 'investment', 'system'],
  deposits: ['deposit'],
  withdrawals: ['withdrawal'],
  investments: ['investment'],
  system: ['system'],
};

export default function NotificationsPage() {
  const [filter, setFilter] = useState<NotifType>('all');
  const [notifications, setNotifications] = useState(allNotifications);

  const filtered = filter === 'all'
    ? notifications
    : notifications.filter((n) => filterMap[filter].includes(n.type));

  const unreadCount = notifications.filter((n) => n.unread).length;

  const markAllRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, unread: false })));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white">Notifications</h2>
          <p className="text-tesla-gray-400 text-sm mt-1">{unreadCount} unread notifications</p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="text-sm text-tesla-red hover:underline"
          >
            Mark All as Read
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 bg-tesla-gray-900 border border-tesla-gray-700 w-fit flex-wrap">
        {(['all', 'deposits', 'withdrawals', 'investments', 'system'] as NotifType[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 text-xs font-medium tracking-wide transition-colors rounded-sm capitalize ${
              filter === f
                ? 'bg-tesla-red text-white'
                : 'text-tesla-gray-400 hover:text-white'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Notification List */}
      {filtered.length === 0 ? (
        <div className="bg-tesla-gray-900 border border-tesla-gray-700 p-12 text-center">
          <svg className="w-10 h-10 mx-auto text-tesla-gray-600 mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <line x1="18" y1="2" x2="18" y2="4" />
          </svg>
          <p className="text-tesla-gray-400 text-sm">No notifications to display.</p>
        </div>
      ) : (
        <div className="space-y-1">
          {filtered.map((notif) => (
            <div
              key={notif.id}
              className={`bg-tesla-gray-900 border p-4 flex items-start gap-4 transition-colors ${
                notif.unread ? 'border-l-2 border-l-tesla-red border-tesla-gray-700' : 'border-tesla-gray-700'
              } hover:bg-tesla-gray-800/50`}
            >
              <div className={`mt-0.5 flex-shrink-0 ${notif.unread ? 'text-tesla-red' : 'text-tesla-gray-500'}`}>
                <NotifIcon type={notif.type} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className={`text-sm font-medium ${notif.unread ? 'text-white' : 'text-tesla-gray-300'}`}>
                    {notif.title}
                  </h4>
                  {notif.unread && (
                    <span className="w-1.5 h-1.5 bg-tesla-red rounded-full flex-shrink-0" />
                  )}
                </div>
                <p className="text-xs text-tesla-gray-400 mt-1 leading-relaxed">{notif.message}</p>
                <p className="text-[10px] text-tesla-gray-500 mt-2">{notif.time}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
