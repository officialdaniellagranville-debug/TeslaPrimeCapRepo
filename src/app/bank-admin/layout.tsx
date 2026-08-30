'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Diamond, Star, Percent, Info, Phone, Briefcase,
  MessageSquare, HelpCircle, Wallet, Image, Code, Menu, X, ArrowLeft
} from 'lucide-react';

const SIDEBAR_LINKS = [
  { href: '/bank-admin/hero', label: 'Hero', icon: Star },
  { href: '/bank-admin/rates', label: 'Rates', icon: Percent },
  { href: '/bank-admin/about', label: 'About', icon: Info },
  { href: '/bank-admin/contact', label: 'Contact', icon: Phone },
  { href: '/bank-admin/services', label: 'Services', icon: Briefcase },
  { href: '/bank-admin/testimonials', label: 'Testimonials', icon: MessageSquare },
  { href: '/bank-admin/faq', label: 'FAQ', icon: HelpCircle },
  { href: '/bank-admin/dashboard-edit', label: 'Dashboard Data', icon: Wallet },
  { href: '/bank-admin/photos', label: 'Photos', icon: Image },
  { href: '/bank-admin/api-status', label: 'API Status', icon: Code },
];

export default function BankAdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isActive = (href: string) => pathname === href;

  return (
    <div className="min-h-screen flex bg-[#0F172A]" style={{ color: '#F1F5F9' }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-[#0D1321] border-r border-white/[0.06] flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Logo */}
        <div className="p-5 border-b border-white/[0.06]">
          <Link href="/bank-admin/hero" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Diamond className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="gradient-text-animated font-bold text-base leading-tight block">VaultEdge</span>
              <span className="text-xs text-muted-foreground leading-tight">Admin Panel</span>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <div className="space-y-1">
            {SIDEBAR_LINKS.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                    active
                      ? 'bg-emerald-500/15 text-emerald-400 shadow-sm shadow-emerald-500/10'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                  }`}
                >
                  <link.icon className={`w-[18px] h-[18px] shrink-0 ${active ? 'text-emerald-400' : 'text-slate-500 group-hover:text-slate-400'}`} />
                  {link.label}
                  {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Back to site */}
        <div className="p-3 border-t border-white/[0.06]">
          <Link
            href="/"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:text-slate-300 hover:bg-white/[0.04] transition-all duration-200"
          >
            <ArrowLeft className="w-[18px] h-[18px]" />
            Back to Site
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 lg:pl-64 min-h-screen flex flex-col">
        {/* Mobile header */}
        <header className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 bg-[#0D1321]/90 backdrop-blur-xl border-b border-white/[0.06] lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-white/[0.06] transition-colors"
            aria-label="Open sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Diamond className="w-5 h-5 text-emerald-500" />
            <span className="font-semibold text-sm">VaultEdge Admin</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
