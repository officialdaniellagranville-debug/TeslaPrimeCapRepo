'use client';

import { useState, useCallback, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Sheet, SheetContent, SheetTrigger,
  SheetHeader, SheetTitle, SheetClose,
} from '@/components/ui/sheet';
import CoreWealthLogo from '@/components/CoreWealthLogo';

const NAV_LINKS = [
  { label: 'About', href: '/about' },
  { label: 'Services', href: '#services' },
  { label: 'Tools', href: '/plans' },
  { label: 'FAQ', href: '/faq' },
  { label: 'Contact', href: '/contact' },
] as const;

interface NavbarProps {
  currentPage?: string;
  onNavigate?: (page: string) => void;
}

function useScrolled(threshold = 10) {
  const subscribe = useCallback(
    (cb: () => void) => {
      window.addEventListener('scroll', cb, { passive: true });
      return () => window.removeEventListener('scroll', cb);
    }, [],
  );
  return useSyncExternalStore(subscribe, () => window.scrollY > threshold, () => false);
}

const HamburgerIcon = () => (
  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
    <path d="M3 6h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M3 11h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M3 16h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export default function Navbar({ currentPage, onNavigate }: NavbarProps) {
  const scrolled = useScrolled();
  const [open, setOpen] = useState(false);

  const handleNav = (label: string, href: string) => {
    // If the link is a hash (e.g. #services), let the browser handle scrolling
    // Otherwise call the SPA navigate handler
    if (!href.startsWith('#')) {
      onNavigate?.(label.toLowerCase());
    }
    setOpen(false);
  };

  return (
    <header className={`sticky top-0 z-50 w-full transition-all duration-300 bg-[#060A13]/80 backdrop-blur-xl ${
      scrolled ? 'border-b border-white/10 shadow-[0_1px_30px_rgba(124,58,237,0.08)]' : ''
    }`}>
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <CoreWealthLogo variant="compact" />

        {/* Desktop nav links */}
        <ul className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map(({ label, href }) => {
            const active = currentPage === label.toLowerCase();
            return (
              <li key={label}>
                <Link href={href} scroll={true} onClick={(e) => handleNav(label, href)}>
                  <span
                    className={`relative inline-block px-4 py-2 text-sm font-medium transition-colors duration-200 cursor-pointer ${
                      active ? 'text-[#2563EB]' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {label}
                    {active && <span className="absolute inset-x-2 -bottom-[9px] h-0.5 rounded-full bg-[#2563EB]" />}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Desktop right actions */}
        <div className="hidden md:flex items-center gap-3">
          <Link href="/login"><Button variant="ghost" className="h-9 px-4 text-sm text-gray-300 hover:text-white hover:bg-white/5">Sign In</Button></Link>
          <Link href="/register"><Button className="h-9 px-5 text-sm bg-[#2563EB] hover:bg-[#1D4ED8] text-white">Open Account</Button></Link>
        </div>

        {/* Mobile hamburger */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button className="flex md:hidden h-9 w-9 items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors" aria-label="Open navigation menu">
              <HamburgerIcon />
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72 bg-[#060A13]/95 backdrop-blur-xl border-l border-white/10 p-0">
            <SheetHeader className="px-6 pt-6 pb-2">
              <SheetTitle className="text-white"><CoreWealthLogo variant="compact" /></SheetTitle>
            </SheetHeader>
            <div className="flex flex-col gap-1 px-3 py-4">
              {NAV_LINKS.map(({ label, href }) => {
                const active = currentPage === label.toLowerCase();
                return (
                  <SheetClose asChild key={label}>
                    <Link href={href} scroll={true} onClick={(e) => handleNav(label, href)}>
                      <span
                        className={`flex items-center rounded-lg px-4 py-3 text-sm font-medium transition-colors duration-200 cursor-pointer ${
                          active ? 'bg-[#2563EB]/10 text-[#2563EB]' : 'text-gray-400 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        {label}
                        {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#2563EB]" />}
                      </span>
                    </Link>
                  </SheetClose>
                );
              })}
            </div>
            <div className="border-t border-white/10 flex flex-col gap-3 px-6 py-5">
              <SheetClose asChild><Link href="/login"><Button variant="ghost" className="w-full h-11 text-sm text-gray-300 hover:text-white hover:bg-white/5">Sign In</Button></Link></SheetClose>
              <SheetClose asChild><Link href="/register"><Button className="w-full h-11 text-sm bg-[#2563EB] hover:bg-[#1D4ED8] text-white">Open Account</Button></Link></SheetClose>
            </div>
          </SheetContent>
        </Sheet>
      </nav>
    </header>
  );
}
