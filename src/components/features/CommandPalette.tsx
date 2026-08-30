'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search,
  Home,
  Wrench,
  Percent,
  HelpCircle,
  Phone,
  UserPlus,
  LogIn,
  LayoutDashboard,
  Moon,
  Sun,
  Shield,
} from 'lucide-react';
import { useTheme } from 'next-themes';

interface Command {
  id: string;
  label: string;
  page: string;
  icon: React.ReactNode;
  shortcut?: string;
}

const COMMANDS: Command[] = [
  { id: 'home', label: 'Go to Home', page: 'home', icon: <Home className="w-4 h-4" /> },
  { id: 'services', label: 'Go to Services', page: 'services', icon: <Wrench className="w-4 h-4" /> },
  { id: 'rates', label: 'Go to Rates', page: 'rates', icon: <Percent className="w-4 h-4" /> },
  { id: 'tools', label: 'Go to Tools', page: 'tools', icon: <Wrench className="w-4 h-4" /> },
  { id: 'faq', label: 'Go to FAQ', page: 'faq', icon: <HelpCircle className="w-4 h-4" /> },
  { id: 'contact', label: 'Go to Contact', page: 'contact', icon: <Phone className="w-4 h-4" /> },
  { id: 'signup', label: 'Open Account', page: 'signup', icon: <UserPlus className="w-4 h-4" /> },
  { id: 'login', label: 'Sign In', page: 'login', icon: <LogIn className="w-4 h-4" /> },
  { id: 'dashboard', label: 'Go to Dashboard', page: 'dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
  { id: 'theme', label: 'Toggle Dark/Light Mode', page: 'theme', icon: <Moon className="w-4 h-4" />, shortcut: '' },
  { id: 'admin', label: 'Open Admin Panel', page: 'admin', icon: <Shield className="w-4 h-4" /> },
];

interface CommandPaletteProps {
  onNavigate: (page: string) => void;
}

export default function CommandPalette({ onNavigate }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { theme, setTheme } = useTheme();

  const filtered = COMMANDS.filter((cmd) =>
    cmd.label.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = useCallback(
    (cmd: Command) => {
      if (cmd.page === 'theme') {
        setTheme(theme === 'dark' ? 'light' : 'dark');
      } else if (cmd.page === 'admin') {
        window.location.href = '/bank-admin';
      } else {
        onNavigate(cmd.page);
      }
      setOpen(false);
    },
    [onNavigate, theme, setTheme]
  );

  const handleToggle = useCallback(() => {
    setOpen((prev) => !prev);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        handleToggle();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleToggle]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filtered.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % filtered.length);
    } else if (e.key === 'Enter' && filtered[selectedIndex]) {
      e.preventDefault();
      handleSelect(filtered[selectedIndex]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setSelectedIndex(0);
  };

  const handleClose = () => {
    setOpen(false);
    setSearch('');
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center pt-[15vh]"
      onClick={handleClose}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg mx-4 glass-card border border-white/20 bg-background/95 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
          <Search className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          <input
            ref={inputRef}
            value={search}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a command..."
            className="flex-1 bg-transparent text-foreground text-sm placeholder:text-muted-foreground outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white/10 text-[10px] text-muted-foreground font-mono">
            ESC
          </kbd>
        </div>
        {filtered.length > 0 ? (
          <div className="max-h-72 overflow-y-auto p-2">
            {filtered.map((cmd, idx) => (
              <button
                key={cmd.id}
                onClick={() => handleSelect(cmd)}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors text-left ${
                  idx === selectedIndex
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : 'text-foreground hover:bg-white/5'
                }`}
              >
                <span className={idx === selectedIndex ? 'text-emerald-400' : 'text-muted-foreground'}>
                  {cmd.id === 'theme'
                    ? theme === 'dark'
                      ? <Sun className="w-4 h-4" />
                      : <Moon className="w-4 h-4" />
                    : cmd.icon}
                </span>
                <span className="flex-1 font-medium">{cmd.label}</span>
                {cmd.shortcut !== undefined && (
                  <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-white/10 text-[10px] text-muted-foreground font-mono">
                    {cmd.shortcut || '⌘K'}
                  </kbd>
                )}
              </button>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No commands found.
          </div>
        )}
        <div className="flex items-center gap-4 px-4 py-2.5 border-t border-white/10 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded bg-white/10 font-mono text-[10px]">↑↓</kbd>
            Navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded bg-white/10 font-mono text-[10px]">↵</kbd>
            Select
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded bg-white/10 font-mono text-[10px]">esc</kbd>
            Close
          </span>
        </div>
      </div>
    </div>
  );
}
