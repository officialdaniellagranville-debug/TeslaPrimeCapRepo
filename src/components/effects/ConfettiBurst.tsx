'use client';

import { useMemo, useRef } from 'react';

interface ConfettiBurstProps {
  active: boolean;
  duration?: number;
}

const COLORS = ['#10B981', '#06b6d4', '#22d3ee', '#8b5cf6', '#f59e0b', '#34D399', '#6EE7B7'];

function randomBetween(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

interface Piece {
  id: number;
  x: number;
  color: string;
  width: number;
  height: number;
  delay: number;
}

export default function ConfettiBurst({ active, duration = 3000 }: ConfettiBurstProps) {
  const counterRef = useRef(0);
  const pieces = useMemo(() => {
    if (!active) return [];
    counterRef.current += 1;
    return Array.from({ length: 80 }, (_, i) => ({
      id: counterRef.current * 1000 + i,
      x: randomBetween(5, 95),
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      width: randomBetween(6, 12),
      height: randomBetween(6, 12),
      delay: randomBetween(0, 800),
    })) as Piece[];
  }, [active]);

  if (pieces.length === 0) return null;

  return (
    <div
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 99999 }}
      aria-hidden="true"
    >
      {pieces.map((piece) => (
        <div
          key={piece.id}
          className="confetti-piece"
          style={{
            left: `${piece.x}%`,
            top: '-10px',
            width: `${piece.width}px`,
            height: `${piece.height}px`,
            backgroundColor: piece.color,
            borderRadius: piece.id % 3 === 0 ? '50%' : '2px',
            animationDelay: `${piece.delay}ms`,
            animationDuration: `${duration}ms`,
          }}
        />
      ))}
    </div>
  );
}
