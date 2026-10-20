'use client';

import dynamic from 'next/dynamic';

/**
 * Client wrapper for ChatWidget so it can be used in the root (server) layout.
 * Uses next/dynamic with ssr:false to avoid hydration issues.
 */
const ChatWidget = dynamic(() => import('@/components/ChatWidget'), { ssr: false });

export default function ChatWidgetLoader() {
  return <ChatWidget />;
}
