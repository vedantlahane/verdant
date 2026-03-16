"use client";

import React, { useEffect, useRef, useCallback, HTMLAttributes } from "react";

export function RainLeaf({
  size = 24,
  gradientId,
  className = "",
  style,
}: {
  size?: number;
  gradientId: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      aria-hidden="true"
      className={className}
      style={style}
    >
      <path
        d="M34 7c-9 1-16 5-20 12-3 5-3 11-1 16 5 0 11-1 16-5C36 24 40 17 41 8c-2-1-4-1-7-1Z"
        fill={`url(#${gradientId})`}
      />
      <path
        d="M15 34c6-5 11-10 16-17"
        stroke="rgba(255,255,255,0.45)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

const SPRITE_SIZE = 48;

function createLeafSprite(colors: [string, string, string]): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = SPRITE_SIZE;
  c.height = SPRITE_SIZE;
  const ctx = c.getContext("2d")!;

  const grad = ctx.createLinearGradient(10, 8, 40, 37);
  grad.addColorStop(0, colors[0]);
  grad.addColorStop(0.55, colors[1]);
  grad.addColorStop(1, colors[2]);

  ctx.fillStyle = grad;
  ctx.fill(
    new Path2D(
      "M34 7c-9 1-16 5-20 12-3 5-3 11-1 16 5 0 11-1 16-5C36 24 40 17 41 8c-2-1-4-1-7-1Z"
    )
  );

  ctx.strokeStyle = "rgba(255,255,255,0.45)";
  ctx.lineWidth = 1.5;
  ctx.lineCap = "round";
  ctx.stroke(new Path2D("M15 34c6-5 11-10 16-17"));

  return c;
}

interface Particle {
  baseX: number;
  x: number;
  y: number;
  rotation: number;
  size: number;
  speedY: number;
  swaySpeed: number;
  swayAmount: number;
  colIndex: number;
  settled: boolean;
  opacity: number;
}

export interface LeafRainProps extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  spawnInterval?: number;
  maxLeaves?: number;
}

export function LeafRain({
  children,
  className = "",
  spawnInterval = 25,
  maxLeaves = 500,
  onMouseEnter,
  onMouseLeave,
  ...props
}: LeafRainProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const S = useRef({
    active: false,
    running: false,
    frame: 0,
    lastSpawn: 0,
    leaves: [] as Particle[],
    columns: [] as number[],
    sprite: null as HTMLCanvasElement | null,
  });

  const cfg = useRef({ spawnInterval, maxLeaves });
  cfg.current = { spawnInterval, maxLeaves };

  const COL_W = 12;
  const PILE_H = 8;
  const DEG2RAD = Math.PI / 180;

  const tick = useCallback((time: number) => {
    const s = S.current;
    const { spawnInterval: interval, maxLeaves: cap } = cfg.current;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !s.sprite) {
      s.running = false;
      return;
    }

    const w = container.offsetWidth;
    const h = container.offsetHeight;
    const dpr = devicePixelRatio || 1;

    const bw = (w * dpr) | 0;
    const bh = (h * dpr) | 0;
    if (canvas.width !== bw || canvas.height !== bh) {
      canvas.width = bw;
      canvas.height = bh;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
    }

    const ctx = canvas.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const { leaves, columns, sprite } = s;
    const numCols = columns.length;

    if (s.active && leaves.length < cap && time - s.lastSpawn > interval) {
      let available: number[] | null = null;
      for (let i = 0; i < numCols; i++) {
        if (columns[i] < h + 20) {
          (available ??= []).push(i);
        }
      }
      if (available) {
        const ci = available[(Math.random() * available.length) | 0];
        const baseX = ci * COL_W + Math.random() * COL_W - COL_W / 2;
        const size = 14 + Math.random() * 14;
        leaves.push({
          baseX,
          x: baseX,
          y: -size,
          rotation: Math.random() * 360,
          size,
          speedY: 1.5 + Math.random() * 2,
          swaySpeed: 0.002 + Math.random() * 0.003,
          swayAmount: 5 + Math.random() * 10,
          colIndex: ci,
          settled: false,
          opacity: 0.4 + Math.random() * 0.6,
        });
        s.lastSpawn = time;
      }
    }

    let alive = 0;
    let anyMoving = false;

    for (let i = 0, len = leaves.length; i < len; i++) {
      const p = leaves[i];

      if (!p.settled) {
        anyMoving = true;
        p.y += p.speedY;
        p.x = p.baseX + Math.sin(time * p.swaySpeed) * p.swayAmount;
        p.rotation += 1.2;

        const floor = h - columns[p.colIndex] - p.size * 0.5;

        if (s.active && p.y >= floor) {
          p.y = floor;
          p.settled = true;
          columns[p.colIndex] += PILE_H;
        } else if (p.y > h + 100) {
          continue;
        }
      }

      const hs = p.size * 0.5;
      ctx.save();
      ctx.globalAlpha = p.opacity;
      ctx.translate(p.x + hs, p.y + hs);
      ctx.rotate(p.rotation * DEG2RAD);
      ctx.drawImage(sprite, -hs, -hs, p.size, p.size);
      ctx.restore();

      leaves[alive++] = p;
    }
    leaves.length = alive;

    if (s.active || anyMoving || alive > 0) {
      s.frame = requestAnimationFrame(tick);
    } else {
      ctx.clearRect(0, 0, w, h);
      s.running = false;
    }
  }, []);

  const startLoop = useCallback(() => {
    const s = S.current;
    if (s.running) return;
    s.running = true;
    s.frame = requestAnimationFrame(tick);
  }, [tick]);

  const handleMouseEnter = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const s = S.current;
      s.active = true;

      const el = containerRef.current;
      if (!el) return;

      const numCols = Math.max(1, (el.offsetWidth / COL_W) | 0);
      if (s.columns.length !== numCols || s.columns[0] < 0) {
        s.columns = new Array(numCols).fill(0);
      }

      // (Re)create the sprite on every mouse enter so it reflects
      // the current CSS custom properties (theme changes).
      const cs = getComputedStyle(el);
      s.sprite = createLeafSprite([
        cs.getPropertyValue("--accent-light").trim() || "#95D5B2",
        cs.getPropertyValue("--accent").trim() || "#52B788",
        cs.getPropertyValue("--accent-dark").trim() || "#2D6A4F",
      ]);

      startLoop();
      onMouseEnter?.(e);
    },
    [onMouseEnter, startLoop]
  );

  const handleMouseLeave = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const s = S.current;
      s.active = false;
      s.columns.fill(-1000);
      for (const p of s.leaves) {
        p.settled = false;
        p.speedY = 2 + Math.random() * 4;
      }
      onMouseLeave?.(e);
    },
    [onMouseLeave]
  );

  useEffect(() => {
    return () => {
      cancelAnimationFrame(S.current.frame);
      S.current.running = false;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative overflow-hidden ${className}`}
      {...props}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-0 pointer-events-none"
        aria-hidden="true"
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export default LeafRain;