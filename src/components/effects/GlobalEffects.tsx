'use client';

import { useEffect, useState, useRef } from 'react';
import { useTheme } from 'next-themes';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  opacity: number;
}

export default function GlobalEffects() {
  const { resolvedTheme } = useTheme();
  const isTouchDevice = typeof window !== 'undefined'
    ? ('ontouchstart' in window || navigator.maxTouchPoints > 0)
    : true;
  const mousePosRef = useRef({ x: 0, y: 0 });
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const gradientRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const dotPosRef = useRef({ x: 0, y: 0 });
  const ringPosRef = useRef({ x: 0, y: 0 });
  const animFrameRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
      mousePosRef.current = { x: e.clientX, y: e.clientY };
      setMousePos({ x: e.clientX, y: e.clientY });

      if (dotRef.current) {
        dotRef.current.style.left = `${e.clientX - 4}px`;
        dotRef.current.style.top = `${e.clientY - 4}px`;
      }
    };

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const isInteractive =
        target.tagName === 'BUTTON' ||
        target.tagName === 'A' ||
        target.closest('button') ||
        target.closest('a') ||
        target.closest('[role="button"]') ||
        target.closest('[data-cursor-hover]');
      if (isInteractive) {
        dotRef.current?.classList.add('hovering');
        ringRef.current?.classList.add('hovering');
      }
    };

    const handleMouseOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const isInteractive =
        target.tagName === 'BUTTON' ||
        target.tagName === 'A' ||
        target.closest('button') ||
        target.closest('a') ||
        target.closest('[role="button"]') ||
        target.closest('[data-cursor-hover]');
      if (isInteractive) {
        dotRef.current?.classList.remove('hovering');
        ringRef.current?.classList.remove('hovering');
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('mouseout', handleMouseOut);

    const animateRing = () => {
      ringPosRef.current.x += (mouseRef.current.x - ringPosRef.current.x) * 0.15;
      ringPosRef.current.y += (mouseRef.current.y - ringPosRef.current.y) * 0.15;
      if (ringRef.current) {
        ringRef.current.style.left = `${ringPosRef.current.x - 18}px`;
        ringRef.current.style.top = `${ringPosRef.current.y - 18}px`;
      }
      animFrameRef.current = requestAnimationFrame(animateRing);
    };
    animFrameRef.current = requestAnimationFrame(animateRing);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('mouseout', handleMouseOut);
      cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  // Particle field
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const PARTICLE_COUNT = 50;
    const CONNECTION_DIST = 120;

    const createParticle = (): Particle => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      radius: Math.random() * 1.5 + 0.5,
      opacity: Math.random() * 0.5 + 0.2,
    });

    const updateParticle = (p: Particle) => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0) p.x = canvas.width;
      if (p.x > canvas.width) p.x = 0;
      if (p.y < 0) p.y = canvas.height;
      if (p.y > canvas.height) p.y = 0;
    };

    const drawParticle = (p: Particle, drawCtx: CanvasRenderingContext2D, color: string) => {
      drawCtx.beginPath();
      drawCtx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      drawCtx.fillStyle = color;
      drawCtx.globalAlpha = p.opacity;
      drawCtx.fill();
      drawCtx.globalAlpha = 1;
    };

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particlesRef.current.push(createParticle());
    }

    let particleAnimFrame: number;
    const animateParticles = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const isDark = resolvedTheme === 'dark';
      const dotColor = isDark ? '#10B981' : '#059669';
      const lineColor = isDark
        ? 'rgba(16, 185, 129, 0.08)'
        : 'rgba(5, 150, 105, 0.06)';

      particlesRef.current.forEach((p) => {
        updateParticle(p);
        drawParticle(p, ctx, dotColor);
      });

      // Draw connections
      for (let i = 0; i < particlesRef.current.length; i++) {
        for (let j = i + 1; j < particlesRef.current.length; j++) {
          const a = particlesRef.current[i];
          const b = particlesRef.current[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONNECTION_DIST) {
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = lineColor;
            ctx.globalAlpha = 1 - dist / CONNECTION_DIST;
            ctx.lineWidth = 0.5;
            ctx.stroke();
            ctx.globalAlpha = 1;
          }
        }
      }

      particleAnimFrame = requestAnimationFrame(animateParticles);
    };
    particleAnimFrame = requestAnimationFrame(animateParticles);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(particleAnimFrame);
      particlesRef.current = [];
    };
  }, [resolvedTheme]);

  const isDark = resolvedTheme === 'dark';

  return (
    <>
      {/* Grain overlay */}
      <div className="grain-overlay" />

      {/* Particle field canvas */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none"
        style={{ zIndex: 9997 }}
      />

      {/* Custom cursor (desktop only) */}
      {!isTouchDevice && (
        <div className="custom-cursor">
          <div ref={dotRef} className="cursor-dot" />
          <div ref={ringRef} className="cursor-ring" />
        </div>
      )}

      {/* Mouse-following radial gradient */}
      <div
        ref={gradientRef}
        className="fixed pointer-events-none"
        style={{
          zIndex: 9996,
          width: '600px',
          height: '600px',
          borderRadius: '50%',
          background: isDark
            ? 'radial-gradient(circle, rgba(16,185,129,0.04) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(16,185,129,0.02) 0%, transparent 70%)',
          left: mousePos.x - 300,
          top: mousePos.y - 300,
          transform: 'translate3d(0,0,0)',
          transition: 'left 0.3s ease-out, top 0.3s ease-out',
        }}
      />
    </>
  );
}
