'use client';

import { useRef, useEffect, useCallback } from 'react';

/* ─── 3D Math Helpers ─── */
function rotateY(p: [number, number, number], angle: number): [number, number, number] {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return [p[0] * cos - p[2] * sin, p[1], p[0] * sin + p[2] * cos];
}

function rotateX(p: [number, number, number], angle: number): [number, number, number] {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return [p[0], p[1] * cos - p[2] * sin, p[1] * sin + p[2] * cos];
}

function project(p: [number, number, number], cx: number, cy: number, radius: number, fov: number): [number, number, number] {
  const z = p[2] + fov;
  const scale = fov / Math.max(z, 0.01);
  return [p[0] * scale * radius + cx, p[1] * scale * radius + cy, p[2]];
}

/* ─── Generate connection arc pairs (lat/lon pairs) ─── */
const CONNECTIONS: Array<{
  from: [number, number];
  to: [number, number];
  phase: number;
  speed: number;
}> = [];

const cities: [number, number][] = [
  [40.7, -74], [51.5, -0.1], [48.8, 2.3], [35.6, 139.7], [-33.8, 151.2],
  [1.3, 103.8], [55.7, 37.6], [-23.5, -46.6], [19.4, -99.1], [28.6, 77.2],
  [31.2, 121.4], [37.5, 127], [22.3, 114.1], [-1.3, 36.8], [25.2, 55.2],
];

// Create random connections between city pairs
for (let i = 0; i < 12; i++) {
  const a = cities[i % cities.length];
  const b = cities[(i * 3 + 5) % cities.length];
  CONNECTIONS.push({
    from: a,
    to: b,
    phase: Math.random() * Math.PI * 2,
    speed: 0.3 + Math.random() * 0.4,
  });
}

/* ─── Convert lat/lon to 3D point on unit sphere ─── */
function latLonTo3D(lat: number, lon: number): [number, number, number] {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return [
    -Math.sin(phi) * Math.cos(theta),
    Math.cos(phi),
    Math.sin(phi) * Math.sin(theta),
  ];
}

/* ─── Globe3D Component ─── */
interface Globe3DProps {
  className?: string;
  style?: React.CSSProperties;
}

export default function Globe3D({ className = '', style }: Globe3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const sizeRef = useRef(0);
  const animFrameRef = useRef(0);
  const tiltRef = useRef(0);
  const targetTiltRef = useRef(0);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    const size = Math.min(w, h);

    if (size !== sizeRef.current) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      sizeRef.current = size;
    }

    ctx.clearRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;
    const radius = size * 0.38;
    const fov = 3.5;
    const time = performance.now() / 1000;
    const rotationY = time * 0.15;

    // Smooth tilt interpolation
    tiltRef.current += (targetTiltRef.current - tiltRef.current) * 0.05;
    const tiltX = tiltRef.current * 0.3;

    // ─── Outer glow ───
    const glowGrad = ctx.createRadialGradient(cx, cy, radius * 0.8, cx, cy, radius * 1.6);
    glowGrad.addColorStop(0, 'rgba(37, 99, 235, 0.08)');
    glowGrad.addColorStop(0.5, 'rgba(37, 99, 235, 0.03)');
    glowGrad.addColorStop(1, 'rgba(37, 99, 235, 0)');
    ctx.fillStyle = glowGrad;
    ctx.fillRect(0, 0, w, h);

    // ─── Draw latitude lines ───
    const latCount = 9;
    for (let i = 1; i < latCount; i++) {
      const lat = -90 + (180 / latCount) * i;
      ctx.beginPath();
      let started = false;

      for (let j = 0; j <= 72; j++) {
        const lon = -180 + (360 / 72) * j;
        let p = latLonTo3D(lat, lon);
        p = rotateY(p, rotationY);
        p = rotateX(p, tiltX);
        const [sx, sy, sz] = project(p, cx, cy, radius, fov);

        if (sz > 0) {
          if (!started) {
            ctx.moveTo(sx, sy);
            started = true;
          } else {
            ctx.lineTo(sx, sy);
          }
        } else {
          started = false;
        }
      }

      ctx.strokeStyle = 'rgba(37, 99, 235, 0.18)';
      ctx.lineWidth = 0.6;
      ctx.stroke();
    }

    // ─── Draw longitude lines ───
    const lonCount = 18;
    for (let i = 0; i < lonCount; i++) {
      const lon = -180 + (360 / lonCount) * i;
      ctx.beginPath();
      let started = false;

      for (let j = 0; j <= 36; j++) {
        const lat = -90 + (180 / 36) * j;
        let p = latLonTo3D(lat, lon);
        p = rotateY(p, rotationY);
        p = rotateX(p, tiltX);
        const [sx, sy, sz] = project(p, cx, cy, radius, fov);

        if (sz > 0) {
          if (!started) {
            ctx.moveTo(sx, sy);
            started = true;
          } else {
            ctx.lineTo(sx, sy);
          }
        } else {
          started = false;
        }
      }

      ctx.strokeStyle = 'rgba(37, 99, 235, 0.18)';
      ctx.lineWidth = 0.6;
      ctx.stroke();
    }

    // ─── Draw intersection dots ───
    for (let i = 0; i <= latCount; i++) {
      const lat = -90 + (180 / latCount) * i;
      for (let j = 0; j < lonCount; j++) {
        const lon = -180 + (360 / lonCount) * j;
        let p = latLonTo3D(lat, lon);
        p = rotateY(p, rotationY);
        p = rotateX(p, tiltX);
        const [sx, sy, sz] = project(p, cx, cy, radius, fov);

        if (sz > 0.1) {
          const brightness = 0.3 + sz * 0.4;
          ctx.beginPath();
          ctx.arc(sx, sy, 1.2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(96, 165, 250, ${brightness})`;
          ctx.fill();
        }
      }
    }

    // ─── Draw equator highlight ───
    ctx.beginPath();
    let eqStarted = false;
    for (let j = 0; j <= 72; j++) {
      const lon = -180 + (360 / 72) * j;
      let p = latLonTo3D(0, lon);
      p = rotateY(p, rotationY);
      p = rotateX(p, tiltX);
      const [sx, sy, sz] = project(p, cx, cy, radius, fov);
      if (sz > 0) {
        if (!eqStarted) {
          ctx.moveTo(sx, sy);
          eqStarted = true;
        } else {
          ctx.lineTo(sx, sy);
        }
      } else {
        eqStarted = false;
      }
    }
    ctx.strokeStyle = 'rgba(37, 99, 235, 0.35)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // ─── Draw connection arcs ───
    CONNECTIONS.forEach((conn) => {
      const from3D = latLonTo3D(conn.from[0], conn.from[1]);
      const to3D = latLonTo3D(conn.to[0], conn.to[1]);

      // Midpoint elevated above sphere surface for arc effect
      const mid: [number, number, number] = [
        (from3D[0] + to3D[0]) / 2,
        (from3D[1] + to3D[1]) / 2,
        (from3D[2] + to3D[2]) / 2,
      ];
      const midLen = Math.sqrt(mid[0] ** 2 + mid[1] ** 2 + mid[2] ** 2);
      const elevation = 1.4 + 0.3 * Math.sin(time * conn.speed + conn.phase);
      const elevatedMid: [number, number, number] = [
        (mid[0] / Math.max(midLen, 0.01)) * elevation,
        (mid[1] / Math.max(midLen, 0.01)) * elevation,
        (mid[2] / Math.max(midLen, 0.01)) * elevation,
      ];

      // Draw quadratic bezier through elevated midpoint
      const segments = 24;
      ctx.beginPath();
      let arcStarted = false;
      let visibleSegments = 0;

      for (let s = 0; s <= segments; s++) {
        const t = s / segments;
        // Quadratic bezier: B(t) = (1-t)^2*P0 + 2(1-t)t*P1 + t^2*P2
        const p0 = from3D;
        const p1 = elevatedMid;
        const p2 = to3D;
        const pt: [number, number, number] = [
          (1 - t) * (1 - t) * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0],
          (1 - t) * (1 - t) * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1],
          (1 - t) * (1 - t) * p0[2] + 2 * (1 - t) * t * p1[2] + t * t * p2[2],
        ];

        let rotated = rotateY(pt, rotationY);
        rotated = rotateX(rotated, tiltX);
        const [sx, sy, sz] = project(rotated, cx, cy, radius, fov);

        if (sz > 0) {
          if (!arcStarted) {
            ctx.moveTo(sx, sy);
            arcStarted = true;
          } else {
            ctx.lineTo(sx, sy);
          }
          visibleSegments++;
        } else {
          arcStarted = false;
        }
      }

      // Animated dash offset
      const dashOffset = (time * conn.speed * 30 + conn.phase * 50) % 20;
      ctx.setLineDash([6, 8]);
      ctx.lineDashOffset = -dashOffset;
      ctx.strokeStyle = 'rgba(37, 99, 235, 0.15)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw endpoint dots if visible
      [from3D, to3D].forEach((point) => {
        let rp = rotateY(point, rotationY);
        rp = rotateX(rp, tiltX);
        const [sx, sy, sz] = project(rp, cx, cy, radius, fov);
        if (sz > 0.1) {
          ctx.beginPath();
          ctx.arc(sx, sy, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(96, 165, 250, 0.7)';
          ctx.fill();

          // Glow around endpoint
          const dotGlow = ctx.createRadialGradient(sx, sy, 0, sx, sy, 8);
          dotGlow.addColorStop(0, 'rgba(37, 99, 235, 0.3)');
          dotGlow.addColorStop(1, 'rgba(37, 99, 235, 0)');
          ctx.fillStyle = dotGlow;
          ctx.fillRect(sx - 8, sy - 8, 16, 16);
        }
      });
    });

    // ─── Subtle sphere rim highlight ───
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    const rimGrad = ctx.createRadialGradient(cx - radius * 0.3, cy - radius * 0.3, 0, cx, cy, radius);
    rimGrad.addColorStop(0, 'rgba(96, 165, 250, 0.04)');
    rimGrad.addColorStop(0.7, 'rgba(37, 99, 235, 0)');
    rimGrad.addColorStop(0.95, 'rgba(37, 99, 235, 0.12)');
    rimGrad.addColorStop(1, 'rgba(37, 99, 235, 0.04)');
    ctx.fillStyle = rimGrad;
    ctx.fill();

    animFrameRef.current = requestAnimationFrame(draw);
  }, []);

  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [draw]);

  // ─── Mouse parallax ───
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5; // -0.5 to 0.5
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      mouseRef.current = { x, y };
      targetTiltRef.current = y * 0.8 + x * 0.3;
    };

    const handleMouseLeave = () => {
      targetTiltRef.current = 0;
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);
    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  // ─── ResizeObserver for responsiveness ───
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const observer = new ResizeObserver(() => {
      sizeRef.current = 0; // Force resize on next draw
    });

    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{
        width: '100%',
        height: '100%',
        display: 'block',
        ...style,
      }}
    />
  );
}
