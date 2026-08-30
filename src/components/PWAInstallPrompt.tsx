'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * PWAInstallPrompt
 * Detects the `beforeinstallprompt` event and shows a dismissible install banner.
 * Uses sessionStorage so the dismissal resets per browser session.
 */
export default function PWAInstallPrompt({ className = '' }: { className?: string }) {
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if already dismissed this session
    if (sessionStorage.getItem('pwa-install-dismissed')) {
      setDismissed(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    (deferredPrompt as any).prompt();
    const { outcome } = await (deferredPrompt as any).userChoice;
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setShowPrompt(false);
    setDismissed(true);
    sessionStorage.setItem('pwa-install-dismissed', '1');
  }, []);

  if (!showPrompt || dismissed) return null;

  return (
    <div className={`fixed bottom-16 left-2 right-2 z-50 max-w-lg mx-auto animate-slide-up ${className}`}>
      <div className="bg-[#1a1a1a]/95 backdrop-blur-md border border-[#CC0000]/30 rounded-xl p-4 shadow-2xl shadow-[#CC0000]/10">
        <div className="flex items-center gap-3">
          {/* Icon */}
          <div className="w-10 h-10 rounded-xl bg-[#CC0000]/10 border border-[#CC0000]/20 flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 5.362l2.475-3.026s4.245.09 8.471 2.054c-1.082 1.636-3.231 2.438-3.231 2.438-.146-1.439-1.154-1.79-4.354-1.79L12 24 8.619 5.034c-3.18 0-4.188.354-4.335 1.792 0 0-2.146-.795-3.229-2.43C5.28 2.431 9.525 2.34 9.525 2.34L12 5.362z" fill="#CC0000"/>
            </svg>
          </div>

          {/* Text */}
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-semibold">Install Tesla Prime Capital</p>
            <p className="text-gray-500 text-xs mt-0.5">Add to home screen for quick access</p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleDismiss}
              className="text-gray-500 text-xs font-medium px-3 py-1.5 rounded-lg hover:text-gray-300 transition-colors"
            >
              Not now
            </button>
            <button
              onClick={handleInstall}
              className="bg-[#CC0000] hover:bg-[#a30000] text-white text-xs font-bold px-4 py-1.5 rounded-lg transition-colors"
            >
              Install
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
