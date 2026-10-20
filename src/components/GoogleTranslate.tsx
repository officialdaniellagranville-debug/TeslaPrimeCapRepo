'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

const languages = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'pt', label: 'Português', flag: '🇧🇷' },
  { code: 'it', label: 'Italiano', flag: '🇮🇹' },
  { code: 'nl', label: 'Nederlands', flag: '🇳🇱' },
  { code: 'pl', label: 'Polski', flag: '🇵🇱' },
  { code: 'tr', label: 'Türkçe', flag: '🇹🇷' },
  { code: 'ru', label: 'Русский', flag: '🇷🇺' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦' },
  { code: 'zh-CN', label: '中文', flag: '🇨🇳' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
  { code: 'ko', label: '한국어', flag: '🇰🇷' },
  { code: 'hi', label: 'हिन्दी', flag: '🇮🇳' },
  { code: 'id', label: 'Bahasa', flag: '🇮🇩' },
  { code: 'ms', label: 'Malay', flag: '🇲🇾' },
  { code: 'th', label: 'ไทย', flag: '🇹🇭' },
  { code: 'vi', label: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'sw', label: 'Swahili', flag: '🇰🇪' },
];

export default function GoogleTranslate() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState('en');
  const [translateReady, setTranslateReady] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Load Google Translate script on mount
  useEffect(() => {
    if (document.getElementById('google-translate-script')) {
      setTranslateReady(true);
      return;
    }

    window.googleTranslateElementInit = () => {
      try {
        new (window as any).google.translate.TranslateElement(
          { pageLanguage: 'en', autoDisplay: false, includedLanguages: languages.map(l => l.code).join(',') },
          'google_translate_element'
        );
        setTranslateReady(true);
      } catch (err) {
        console.error('Google Translate init error:', err);
      }
    };

    const script = document.createElement('script');
    script.id = 'google-translate-script';
    script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    script.async = true;
    document.body.appendChild(script);

    // Fallback: if script doesn't call callback within 5s, mark as ready anyway
    setTimeout(() => setTranslateReady(true), 5000);
  }, []);

  // Click outside to close — use mousedown but check menuRef too
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      // If click is inside the menu or on the toggle button, don't close
      if (menuRef.current && menuRef.current.contains(e.target as Node)) return;
      if (buttonRef.current && buttonRef.current.contains(e.target as Node)) return;
      setOpen(false);
    };
    // Use mousedown with a tiny delay so the button's own click handler runs first
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handler);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handler);
    };
  }, [open]);

  const changeLanguage = useCallback((code: string) => {
    setSelected(code);
    setOpen(false);

    if (code === 'en') {
      // Reset to English — clear googtrans cookie and reload without hash
      document.cookie = 'googtrans=; path=/; max-age=0';
      const hash = window.location.hash;
      if (hash.includes('googtrans')) {
        window.location.href = window.location.pathname;
      }
      return;
    }

    // Method 1: Use the Google Translate combo select
    const select = document.querySelector('.goog-te-combo') as HTMLSelectElement;
    if (select) {
      select.value = code;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      return;
    }

    // Method 2: Use the googtrans cookie (fallback when GT widget not loaded)
    document.cookie = `googtrans=/en/${code}; path=/; max-age=31536000`;
    window.location.reload();
  }, []);

  const currentLang = languages.find(l => l.code === selected) || languages[0];

  return (
    <>
      {/* Hidden element required by Google Translate API */}
      <div id="google_translate_element" style={{ position: 'absolute', left: '-9999px', top: '-9999px', width: '1px', height: '1px', overflow: 'hidden' }} />

      {/* Hide Google Translate's default top bar & UI chrome */}
      <style dangerouslySetInnerHTML={{ __html: `
        body { top: 0 !important; }
        .goog-te-banner-frame { display: none !important; }
        .skiptranslate { display: none !important; }
        .goog-te-spinner-pos { display: none !important; }
        .goog-te-combo { display: none !important; }
      ` }} />

      <div className="relative inline-flex">
        <button
          ref={buttonRef}
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1.5 text-gray-400 hover:text-white text-sm font-medium px-2 py-1.5 rounded-lg hover:bg-white/5 transition-all duration-300"
          aria-label="Change language"
          aria-expanded={open}
          aria-haspopup="listbox"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
          <span className="text-xs">{currentLang.flag}</span>
        </button>

        {open && (
          <div
            ref={menuRef}
            className="absolute right-0 top-full mt-2 w-56 bg-[#1a1a1a] border border-tesla-border rounded-xl shadow-2xl shadow-black/50 overflow-hidden z-[9999]"
            role="listbox"
            aria-label="Select language"
          >
            <div className="p-2.5 border-b border-tesla-border/50">
              <p className="text-gray-500 text-[10px] font-medium uppercase tracking-wider px-2">Select Language</p>
            </div>
            <div className="max-h-[320px] overflow-y-auto p-1">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => changeLanguage(lang.code)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    selected === lang.code
                      ? 'bg-[#CC0000]/10 text-[#CC0000]'
                      : 'text-gray-300 hover:bg-white/5 hover:text-white'
                  }`}
                  role="option"
                  aria-selected={selected === lang.code}
                >
                  <span className="text-base">{lang.flag}</span>
                  <span className="flex-1 text-left">{lang.label}</span>
                  {selected === lang.code && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

declare global {
  interface Window {
    googleTranslateElementInit?: () => void;
    google: any;
  }
}
