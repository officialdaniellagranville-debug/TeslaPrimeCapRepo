'use client';

import dynamic from 'next/dynamic';
import { type ReactNode, Component, type ErrorInfo } from 'react';

// Dynamic import with ssr:false to avoid hydration issues
const ChatWidget = dynamic(() => import('@/components/ChatWidget'), { 
  ssr: false,
  loading: () => null, // No loading indicator — widget appears instantly on client
});

// Error boundary so a dynamic import failure never breaks the page
interface Props { children: ReactNode; }
interface State { hasError: boolean; }
class WidgetLoaderBoundary extends Component<Props, State> {
  constructor(props: Props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(err: Error, info: ErrorInfo) {
    console.error('[ChatWidgetLoader] Failed to load:', err?.message, info.componentStack);
  }
  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

export default function ChatWidgetLoader() {
  return (
    <WidgetLoaderBoundary>
      <ChatWidget />
    </WidgetLoaderBoundary>
  );
}
