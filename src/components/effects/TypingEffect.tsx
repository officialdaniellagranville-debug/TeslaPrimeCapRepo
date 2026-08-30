'use client';

import { useState, useEffect, useRef } from 'react';

interface TypingEffectProps {
  text: string;
  speed?: number;
  delay?: number;
  className?: string;
}

export default function TypingEffect({
  text,
  speed = 40,
  delay = 0,
  className = '',
}: TypingEffectProps) {
  const [displayed, setDisplayed] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const indexRef = useRef(0);
  const hasStartedRef = useRef(false);

  useEffect(() => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

    const delayTimeout = setTimeout(() => {
      setIsTyping(true);
      indexRef.current = 0;
      setDisplayed('');

      const interval = setInterval(() => {
        indexRef.current++;
        if (indexRef.current <= text.length) {
          setDisplayed(text.slice(0, indexRef.current));
        } else {
          setIsTyping(false);
          clearInterval(interval);
        }
      }, speed);

      return () => clearInterval(interval);
    }, delay);

    return () => clearTimeout(delayTimeout);
  }, [text, speed, delay]);

  return (
    <span className={className}>
      {displayed}
      {isTyping && (
        <span
          className="inline-block w-0.5 h-[1em] ml-0.5 align-middle"
          style={{
            borderRight: '2px solid #10B981',
            animation: 'blink 1s step-end infinite',
          }}
        />
      )}
      <style jsx>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </span>
  );
}
