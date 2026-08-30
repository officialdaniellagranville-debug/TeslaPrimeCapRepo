'use client';

import { useState, useEffect, createContext, useContext, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SidebarContextType {
  isOpen: boolean;
  setIsOpen: (v: boolean) => void;
  toggle: () => void;
}

const SidebarContext = createContext<SidebarContextType>({
  isOpen: false,
  setIsOpen: () => {},
  toggle: () => {},
});

export const useSidebar = () => useContext(SidebarContext);

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: 'grid' },
  { href: '/investments', label: 'Investments', icon: 'trending-up' },
  { href: '/deposit', label: 'Deposit', icon: 'arrow-down-circle' },
  { href: '/withdraw', label: 'Withdraw', icon: 'arrow-up-circle' },
  { href: '/referral', label: 'Referral', icon: 'users' },
  { href: '/kyc', label: 'KYC Verification', icon: 'shield' },
  { href: '/notifications', label: 'Notifications', icon: 'bell', badge: 3 },
  { href: '/support', label: 'Support', icon: 'message-circle' },
  { href: '/profile', label: 'Profile', icon: 'user' },
];

function NavIcon({ icon, className }: { icon: string; className?: string }) {
  const cls = className || 'w-5 h-5';
  switch (icon) {
    case 'grid':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
        </svg>
      );
    case 'trending-up':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" />
        </svg>
      );
    case 'arrow-down-circle':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><polyline points="8 12 12 16 16 12" />
        </svg>
      );
    case 'arrow-up-circle':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="8" /><polyline points="8 12 12 8 16 12" />
        </svg>
      );
    case 'users':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case 'shield':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      );
    case 'bell':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      );
    case 'message-circle':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
      );
    case 'user':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
        </svg>
      );
    case 'log-out':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
        </svg>
      );
    case 'menu':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      );
    case 'x':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      );
    default:
      return null;
  }
}

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/investments': 'Investment Plans',
  '/deposit': 'Deposit Funds',
  '/withdraw': 'Withdraw Funds',
  '/referral': 'Referral Program',
  '/kyc': 'KYC Verification',
  '/notifications': 'Notifications',
  '/support': 'Support Center',
  '/profile': 'Profile Settings',
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [demoMode, setDemoMode] = useState(true);
  const isMobile = useSyncExternalStore(
    (cb) => {
      const mql = window.matchMedia('(max-width: 1023px)');
      mql.addEventListener('change', cb);
      return () => mql.removeEventListener('change', cb);
    },
    () => window.innerWidth < 1024,
    () => false
  );

  useEffect(() => {
    const handlePopState = () => {
      if (window.innerWidth < 1024) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const pageTitle = pageTitles[pathname] || 'Dashboard';

  return (
    <SidebarContext.Provider value={{ isOpen: sidebarOpen, setIsOpen: setSidebarOpen, toggle: () => setSidebarOpen(!sidebarOpen) }}>
      <div className="min-h-screen bg-black flex">
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/60 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`fixed top-0 left-0 h-full w-64 bg-tesla-gray-900 border-r border-tesla-gray-700 z-50 transition-transform duration-300 lg:translate-x-0 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="px-6 pt-6 pb-4 border-b border-tesla-gray-700">
              <div className="text-xl font-bold tracking-wider text-white">TESLA</div>
              <div className="text-[10px] tracking-[0.3em] text-tesla-gray-400 mt-0.5">PRIME CAPITAL</div>

              {/* Demo/Live Toggle */}
              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={() => setDemoMode(false)}
                  className={`px-2.5 py-1 text-[10px] font-medium tracking-wider transition-colors ${
                    !demoMode
                      ? 'bg-green-600/20 text-green-400 border border-green-600/40'
                      : 'text-tesla-gray-500 border border-tesla-gray-700 hover:text-white'
                  }`}
                >
                  LIVE
                </button>
                <button
                  onClick={() => setDemoMode(true)}
                  className={`px-2.5 py-1 text-[10px] font-medium tracking-wider transition-colors ${
                    demoMode
                      ? 'bg-yellow-600/20 text-yellow-400 border border-yellow-600/40'
                      : 'text-tesla-gray-500 border border-tesla-gray-700 hover:text-white'
                  }`}
                >
                  DEMO
                </button>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-4 px-3">
              <ul className="space-y-0.5">
                {navItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={`flex items-center gap-3 px-3 py-2.5 text-sm transition-colors duration-200 ${
                          isActive
                            ? 'bg-tesla-gray-700 text-white border-l-2 border-tesla-red'
                            : 'text-tesla-gray-400 hover:text-white hover:bg-tesla-gray-800 border-l-2 border-transparent'
                        }`}
                        onClick={() => {
                          if (isMobile) setSidebarOpen(false);
                        }}
                      >
                        <NavIcon icon={item.icon} className="w-[18px] h-[18px] flex-shrink-0" />
                        <span className="flex-1">{item.label}</span>
                        {item.badge && (
                          <span className="w-5 h-5 flex items-center justify-center bg-tesla-red text-white text-[10px] font-bold rounded-sm">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>

            {/* Bottom user info */}
            <div className="border-t border-tesla-gray-700 px-4 py-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 flex items-center justify-center bg-tesla-gray-700 text-white text-xs font-bold rounded-sm">
                  JD
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white truncate">john@example.com</div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] px-1.5 py-0.5 bg-tesla-gray-700 text-tesla-gray-300 rounded-sm font-medium">
                      Investor
                    </span>
                  </div>
                </div>
              </div>
              <Link
                href="/"
                className="flex items-center gap-2 px-3 py-2 mt-3 text-sm text-tesla-gray-400 hover:text-tesla-red transition-colors"
              >
                <NavIcon icon="log-out" className="w-4 h-4" />
                <span>Logout</span>
              </Link>
            </div>
          </div>
        </aside>

        {/* Main area */}
        <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
          {/* Top header */}
          <header className="sticky top-0 z-30 bg-black border-b border-tesla-gray-700 h-14 flex items-center justify-between px-4 lg:px-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden text-white hover:text-tesla-red transition-colors"
                aria-label="Toggle menu"
              >
                <NavIcon icon={sidebarOpen ? 'x' : 'menu'} className="w-6 h-6" />
              </button>
              <h1 className="text-lg font-medium text-white">{pageTitle}</h1>
            </div>

            <div className="flex items-center gap-4">
              <Link href="/notifications" className="relative text-tesla-gray-400 hover:text-white transition-colors">
                <NavIcon icon="bell" className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-tesla-red rounded-full" />
              </Link>
              <div className="w-8 h-8 flex items-center justify-center bg-tesla-gray-700 text-white text-xs font-bold rounded-sm">
                JD
              </div>
            </div>
          </header>

          {/* Content */}
          <main className="flex-1 p-4 lg:p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarContext.Provider>
  );
}
