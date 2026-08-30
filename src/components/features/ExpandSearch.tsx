'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';

export default function ExpandSearch() {
  const [expanded, setExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (expanded) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [expanded]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && expanded) {
        setExpanded(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [expanded]);

  return (
    <div className="relative flex items-center">
      <div
        className={`flex items-center rounded-full border border-white/20 bg-white/10 overflow-hidden transition-all duration-300 ${
          expanded ? 'w-[280px] pl-3 pr-1 py-1 ring-2 ring-emerald-500/50' : 'w-9 h-9'
        }`}
      >
        {expanded ? (
          <input
            ref={inputRef}
            type="text"
            placeholder="Search..."
            onBlur={() => setExpanded(false)}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
        ) : null}
        <button
          onClick={() => setExpanded(!expanded)}
          className={`flex items-center justify-center flex-shrink-0 transition-colors ${
            expanded ? 'w-7 h-7 rounded-full hover:bg-white/10' : 'w-full h-full'
          }`}
          aria-label={expanded ? 'Close search' : 'Open search'}
        >
          {expanded ? (
            <X className="w-4 h-4 text-muted-foreground" />
          ) : (
            <Search className="w-4 h-4 text-foreground" />
          )}
        </button>
      </div>
    </div>
  );
}
