'use client';

import { type ReactNode, Component, type ErrorInfo } from 'react';
import dynamic from 'next/dynamic';

const GoogleTranslate = dynamic(() => import('@/components/GoogleTranslate'), { ssr: false });

// ── Error Boundary for auth pages ──
interface Props { children: ReactNode; }
interface State { hasError: boolean; error: Error | null; }
class AuthErrorBoundary extends Component<Props, State> {
  constructor(props: Props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('[Auth Error Boundary]', error, info.componentStack); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-tesla-dark flex flex-col items-center justify-center px-4">
          <div className="w-full max-w-md text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[#CC0000]/10 border border-[#CC0000]/30 flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#CC0000" strokeWidth="1.5"><path d="M12 9v4"/><circle cx="12" cy="16" r="0.5" fill="#CC0000"/><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>
            </div>
            <h2 className="text-white text-xl font-bold mb-2">Something went wrong</h2>
            <p className="text-gray-500 text-sm mb-6">An error occurred on this page.</p>
            <button onClick={() => this.setState({ hasError: false, error: null })} className="bg-[#CC0000] hover:bg-[#a30000] text-white font-semibold px-5 py-2.5 rounded-lg transition-colors text-sm">Try Again</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <AuthErrorBoundary>
      <div className="fixed top-4 right-4 z-50">
        <GoogleTranslate />
      </div>
      {children}
    </AuthErrorBoundary>
  );
}
