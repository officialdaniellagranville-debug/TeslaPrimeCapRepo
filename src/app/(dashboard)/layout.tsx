'use client';

import { type ReactNode, Component, type ErrorInfo, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Sun, Moon } from 'lucide-react';
import dynamic from 'next/dynamic';
import TeslaLogo from '@/components/TeslaLogo';
import NotificationWatcher from '@/components/NotificationWatcher';
import KycCodeGate from '@/components/KycCodeGate';
import { useAuthStore } from '@/store/useAuthStore';

const GoogleTranslate = dynamic(() => import('@/components/GoogleTranslate'), { ssr: false });

// ── Error Boundary to prevent full-page crash ──
interface Props { children: ReactNode; }
interface State { hasError: boolean; error: Error | null; }
class DashboardErrorBoundary extends Component<Props, State> {
  constructor(props: Props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[Dashboard Error Boundary]', error?.message, error?.stack, info.componentStack);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-tesla-dark flex flex-col items-center justify-center px-4">
          <div className="w-full max-w-md text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[#CC0000]/10 border border-[#CC0000]/30 flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#CC0000" strokeWidth="1.5"><path d="M12 9v4"/><circle cx="12" cy="16" r="0.5" fill="#CC0000"/><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>
            </div>
            <h2 className="text-white text-xl font-bold mb-2">Something went wrong</h2>
            <p className="text-gray-500 text-sm mb-2">An unexpected error occurred on this page.</p>
            {this.state.error?.message && (
              <p className="text-red-400/70 text-[10px] font-mono mb-3 break-all max-w-xs">{this.state.error.message}</p>
            )}
            <p className="text-gray-600 text-xs mb-6">Please try refreshing the page or sign in again.</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }} className="bg-[#CC0000] hover:bg-[#a30000] text-white font-semibold px-5 py-2.5 rounded-lg transition-colors text-sm">Refresh</button>
              <Link href="/login" className="border border-tesla-border hover:border-gray-500 text-gray-300 hover:text-white font-semibold px-5 py-2.5 rounded-lg transition-colors text-sm">Sign In</Link>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const titles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/investments': 'Investments',
  '/deposit': 'Deposit',
  '/withdraw': 'Withdraw',
  '/kyc': 'KYC Verification',
  '/profile': 'Profile',
  '/referral': 'Referrals',
  '/notifications': 'Notifications',
  '/support': 'Support',
  '/security': 'Security',
  '/market': 'Market Overview',
  '/transactions': 'Transaction History',
  '/vehicles': 'Tesla Vehicles',
  '/tracking': 'Track Vehicle',
  '/cards': 'Cards',
  '/beneficiaries': 'Beneficiaries',
  '/pay-bills': 'Pay Bills',
  '/wire-transfer': 'Wire Transfer',
  '/internal-transfer': 'Internal Transfer',
  '/receive-funds': 'Receive Funds',
  '/link-bank': 'Link Bank',
  '/buy-crypto': 'Buy Crypto',
  '/savings-statement': 'Savings Statement',
  '/checking-statement': 'Checking Statement',
  '/crypto-statement': 'Crypto Statement',
  '/tax-refund': 'Tax Refund',
};

const bottomNav = [
  { href: '/dashboard', label: 'Home', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg> },
  { href: '/investments', label: 'Invest', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg> },
  { href: '/vehicles', label: 'Vehicles', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 17h14M5 17a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1l2-3h8l2 3h1a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2M5 17l-1 2h16l-1-2"/><circle cx="7.5" cy="13" r="1.5"/><circle cx="16.5" cy="13" r="1.5"/></svg> },
  { href: '/tracking', label: 'Track', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg> },
  { href: '/deposit', label: 'Deposit', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg> },
  { href: '/withdraw', label: 'Withdraw', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg> },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const title = titles[pathname] || 'Dashboard';
  const { user, token, isLoading, fetchUser } = useAuthStore();

  // Unread notification count for the bell badge
  const [unreadCount, setUnreadCount] = useState(0);
  const [toast, setToast] = useState<{ title: string; body: string } | null>(null);
  const handleUnreadChange = useCallback((count: number) => setUnreadCount(count), []);
  const handleNewNotification = useCallback((title: string, body: string) => {
    setToast({ title, body });
    setTimeout(() => setToast(null), 5000); // Auto-dismiss after 5s
  }, []);

  // Theme toggle using useSyncExternalStore to avoid setState-in-effect
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  useEffect(() => {
    // Apply saved theme on mount (DOM-only, no setState)
    const saved = localStorage.getItem('theme') as 'dark' | 'light' | null;
    if (saved && (saved === 'dark' || saved === 'light') && saved !== 'dark') {
      document.documentElement.classList.toggle('light', saved === 'light');
    }
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setTheme(localStorage.getItem('theme') as 'dark' | 'light' || 'dark'); }, []);
  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('theme', next);
    document.documentElement.classList.toggle('light', next === 'light');
  };

  // Refresh user data on every navigation so wallet changes from admin reflect immediately
  useEffect(() => {
    if (token && !isLoading) {
      fetchUser();
    }
  }, [pathname]); // re-fetch on route change

  // If we have a token but no user data, fetch it from the API
  useEffect(() => {
    if (token && !user && !isLoading) {
      fetchUser();
    }
  }, [token, user, isLoading, fetchUser]);

  // If no token at all, redirect to login
  useEffect(() => {
    if (!token && !isLoading) {
      router.replace('/login');
    }
  }, [token, isLoading, router]);

  // Show loading state while fetching user data
  if (isLoading && !user) {
    return (
      <div className="min-h-screen min-h-[100dvh] bg-tesla-dark flex flex-col items-center justify-center">
        <TeslaLogo variant="compact" className="h-8 mb-4 opacity-50" />
        <div className="w-6 h-6 border-2 border-[#CC0000]/30 border-t-[#CC0000] rounded-full animate-spin" />
      </div>
    );
  }

  // Derive user initials for header avatar
  const firstName = user?.profile?.firstName || '';
  const lastName = user?.profile?.lastName || '';
  const userInitials = [firstName?.charAt(0), lastName?.charAt(0)].filter(Boolean).join('').toUpperCase() || (user?.email?.charAt(0)?.toUpperCase() || 'U');
  const userAvatarUrl = user?.profile?.avatarUrl || null;

  return (
    <DashboardErrorBoundary>
      <style dangerouslySetInnerHTML={{ __html: `
        html.light body, html.light .bg-tesla-dark { background-color: #f5f5f5 !important; }
        html.light .bg-tesla-card { background-color: #ffffff !important; border-color: #e5e5e5 !important; }
        html.light .text-white { color: #111827 !important; }
        html.light .text-gray-400 { color: #6b7280 !important; }
        html.light .text-gray-500 { color: #9ca3af !important; }
        html.light .border-tesla-border { border-color: #e5e7eb !important; }
        html.light header { background-color: rgba(255,255,255,0.95) !important; }
        html.light nav { background-color: rgba(255,255,255,0.95) !important; }
      ` }} />
      {/* KYC Code Gate — blocks entire dashboard until code is entered */}
      <KycCodeGate />
      <div className="min-h-screen min-h-[100dvh] bg-tesla-dark flex flex-col">
        <header className="sticky top-0 z-40 bg-tesla-dark/95 backdrop-blur-md border-b border-tesla-border shrink-0">
          <div className="flex items-center justify-between h-14 px-4 max-w-4xl w-full mx-auto">
            <div className="flex items-center gap-2.5 min-w-0">
              <TeslaLogo variant="compact" className="h-8 shrink-0" />
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <Link href="/notifications" className="relative text-gray-400 hover:text-white transition-colors">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 bg-[#CC0000] rounded-full flex items-center justify-center text-white text-[9px] font-bold px-1 animate-[pulse_2s_infinite]">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Link>
              <button
                onClick={toggleTheme}
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
                aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <GoogleTranslate />
              <Link href="/profile" className="w-8 h-8 rounded-full bg-[#CC0000] flex items-center justify-center text-white text-xs font-bold overflow-hidden shrink-0">
                {userAvatarUrl ? (
                  <img src={userAvatarUrl} alt={userInitials} className="w-full h-full object-cover" />
                ) : (
                  userInitials
                )}
              </Link>
            </div>
          </div>
        </header>
        <main className="flex-1 px-4 py-5 pb-24 max-w-4xl w-full mx-auto animate-fade-in overflow-x-hidden">
          {children}
        </main>
        {/* Bottom Nav */}
        <nav className="fixed bottom-0 left-0 right-0 z-40 bg-tesla-card/95 backdrop-blur-md border-t border-tesla-border safe-bottom">
          <div className="flex items-center justify-around h-14 md:h-16 max-w-lg mx-auto">
            {bottomNav.map((item) => {
              const active = pathname === item.href;
              return (
                <Link key={item.href} href={item.href} className={`flex flex-col items-center gap-0.5 py-1 px-2 transition-colors ${active ? 'text-[#CC0000]' : 'text-gray-500'}`}>
                  {item.icon}
                  <span className="text-[10px] font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
        <NotificationWatcher onUnreadChange={handleUnreadChange} onNewNotification={handleNewNotification} />
        
        {/* In-app notification toast */}
        {toast && (
          <div className="fixed top-16 right-4 z-[200] max-w-sm w-full animate-slide-down pointer-events-auto">
            <div className="bg-[#1a1a1a] border border-[#CC0000]/40 rounded-xl p-4 shadow-2xl shadow-[#CC0000]/10">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-[#CC0000]/15 flex items-center justify-center shrink-0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#CC0000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-semibold">{toast.title}</p>
                  <p className="text-gray-400 text-xs mt-0.5 line-clamp-2">{toast.body}</p>
                </div>
                <button onClick={() => setToast(null)} className="text-gray-500 hover:text-white transition-colors shrink-0">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
              </div>
              <div className="mt-2 pt-2 border-t border-tesla-border">
                <Link href="/notifications" className="text-[#CC0000] text-[10px] font-bold hover:underline">View all notifications</Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardErrorBoundary>
  );
}
