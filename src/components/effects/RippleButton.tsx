'use client';

import { useCallback, ReactNode, MouseEvent, useRef, ButtonHTMLAttributes } from 'react';

interface RippleButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  className?: string;
}

export default function RippleButton({
  children,
  className = '',
  onClick,
  ...props
}: RippleButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleClick = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      const btn = buttonRef.current;
      if (!btn) return;

      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const size = Math.max(rect.width, rect.height) * 2;

      const wave = document.createElement('span');
      wave.className = 'ripple-wave';
      wave.style.width = `${size}px`;
      wave.style.height = `${size}px`;
      wave.style.left = `${x - size / 2}px`;
      wave.style.top = `${y - size / 2}px`;

      btn.appendChild(wave);

      setTimeout(() => {
        wave.remove();
      }, 600);

      if (onClick) {
        onClick(e);
      }
    },
    [onClick]
  );

  return (
    <button
      ref={buttonRef}
      className={`ripple ${className}`}
      onClick={handleClick}
      {...props}
    >
      {children}
    </button>
  );
}
