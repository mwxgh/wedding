'use client';

import { useEffect, useRef } from 'react';

type Shape = 'heart' | 'petal' | 'sparkle';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rotation: number;
  spin: number;
  life: number;
  maxLife: number;
  color: string;
  shape: Shape;
  sway: number;
}

export interface LoveCursorProps {
  /** Particle colors. Defaults to the wedding rose/gold palette. */
  colors?: string[];
  /** Pixels the pointer must travel before the next trail particle. */
  spacing?: number;
  /** Particles released on click/tap. */
  burst?: number;
  /** Upper bound of live particles, to keep slow devices smooth. */
  maxParticles?: number;
}

const DEFAULT_COLORS = ['#b5838d', '#e8a0b4', '#f4c2c2', '#c9a96e', '#8e5b66'];

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const pick = <T,>(items: readonly T[]) =>
  items[Math.floor(Math.random() * items.length)]!;

function drawHeart(ctx: CanvasRenderingContext2D, s: number) {
  ctx.beginPath();
  ctx.moveTo(0, s * 0.3);
  ctx.bezierCurveTo(-s, -s * 0.4, -s * 0.45, -s * 1.15, 0, -s * 0.5);
  ctx.bezierCurveTo(s * 0.45, -s * 1.15, s, -s * 0.4, 0, s * 0.3);
  ctx.fill();
}

function drawPetal(ctx: CanvasRenderingContext2D, s: number) {
  ctx.beginPath();
  ctx.moveTo(0, -s);
  ctx.quadraticCurveTo(s * 0.75, -s * 0.2, 0, s);
  ctx.quadraticCurveTo(-s * 0.75, -s * 0.2, 0, -s);
  ctx.fill();
}

function drawSparkle(ctx: CanvasRenderingContext2D, s: number) {
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    ctx.lineTo(Math.cos(a) * s, Math.sin(a) * s);
    ctx.lineTo(
      Math.cos(a + Math.PI / 4) * s * 0.28,
      Math.sin(a + Math.PI / 4) * s * 0.28,
    );
  }
  ctx.closePath();
  ctx.fill();
}

const DRAW: Record<Shape, typeof drawHeart> = {
  heart: drawHeart,
  petal: drawPetal,
  sparkle: drawSparkle,
};

/**
 * Hearts and petals that drift from the pointer, plus a heart burst on click.
 * Renders a fixed, click-through canvas; disabled for reduced-motion users.
 */
export function LoveCursor({
  colors = DEFAULT_COLORS,
  spacing = 16,
  burst = 14,
  maxParticles = 160,
}: LoveCursorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const particles: Particle[] = [];
    let frame = 0;
    let last: { x: number; y: number } | null = null;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const spawn = (x: number, y: number, p: Partial<Particle>) => {
      if (particles.length >= maxParticles) particles.shift();
      const maxLife = p.maxLife ?? rand(50, 80);
      particles.push({
        x,
        y,
        vx: rand(-0.4, 0.4),
        vy: rand(-0.6, -0.1),
        size: rand(5, 9),
        rotation: rand(-0.4, 0.4),
        spin: rand(-0.03, 0.03),
        color: pick(colors),
        shape: 'heart',
        sway: rand(0, Math.PI * 2),
        ...p,
        life: maxLife,
        maxLife,
      });
    };

    const tick = () => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]!;
        p.life -= 1;
        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }
        p.sway += 0.05;
        if (p.shape === 'petal') {
          // petals flutter down, hearts and sparkles float up
          p.vy = Math.min(p.vy + 0.02, 0.9);
          p.x += p.vx + Math.sin(p.sway) * 0.6;
        } else {
          p.vy -= 0.008;
          p.x += p.vx + Math.sin(p.sway) * 0.25;
        }
        p.y += p.vy;
        p.vx *= 0.98;
        p.rotation += p.spin;

        const t = p.life / p.maxLife;
        ctx.save();
        ctx.globalAlpha = Math.min(1, t * 1.6) * 0.9;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        DRAW[p.shape](ctx, p.size * (0.6 + 0.4 * t));
        ctx.restore();
      }
      frame = particles.length ? requestAnimationFrame(tick) : 0;
    };

    const wake = () => {
      if (!frame) frame = requestAnimationFrame(tick);
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      const { clientX: x, clientY: y } = e;
      if (last && Math.hypot(x - last.x, y - last.y) < spacing) return;
      last = { x, y };
      const roll = Math.random();
      spawn(x, y, {
        shape: roll < 0.55 ? 'heart' : roll < 0.85 ? 'petal' : 'sparkle',
        color: roll >= 0.85 ? '#c9a96e' : pick(colors),
      });
      wake();
    };

    const onDown = (e: PointerEvent) => {
      const { clientX: x, clientY: y } = e;
      for (let i = 0; i < burst; i++) {
        const angle = (i / burst) * Math.PI * 2 + rand(-0.2, 0.2);
        const speed = rand(1.5, 3.5);
        spawn(x, y, {
          shape: i % 4 === 0 ? 'sparkle' : 'heart',
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 1,
          size: rand(6, 11),
          maxLife: rand(45, 70),
        });
      }
      wake();
    };

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      cancelAnimationFrame(frame);
    };
  }, [colors, spacing, burst, maxParticles]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-50 size-full"
    />
  );
}
