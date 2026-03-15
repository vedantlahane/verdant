"use client";

import React, { useState, useEffect, useRef, useId, HTMLAttributes } from "react";

/* ── Leaf SVG matching the logo ── */
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

interface Particle {
  id: string;
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

export interface LeafRainProps extends HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
  className?: string;
  spawnInterval?: number;
}

export function LeafRain({
  children,
  className = "",
  spawnInterval = 25, // ms between leaf drops (lower = fills faster)
  onMouseEnter,
  onMouseLeave,
  ...props
}: LeafRainProps) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const [leaves, setLeaves] = useState<Particle[]>([]);
  const [isActive, setIsActive] = useState(false);
  const gradientId = useId();

  // Mutable refs for the physics loop to avoid React re-renders for math
  const leavesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number>(0);
  const columnsRef = useRef<number[]>([]);
  const lastSpawnRef = useRef<number>(0);

  const colWidth = 12; // Width of each stacking column
  const pileDensity = 8; // How much height a single leaf adds to the pile

  const handleMouseEnter = (e: React.MouseEvent<HTMLSpanElement>) => {
    setIsActive(true);
    if (onMouseEnter) onMouseEnter(e);
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLSpanElement>) => {
    setIsActive(false);
    if (onMouseLeave) onMouseLeave(e);
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.offsetWidth;
    const height = container.offsetHeight;
    const numCols = Math.max(1, Math.floor(width / colWidth));

    if (isActive) {
      // Setup/Reset the floor physics if it was previously removed
      if (columnsRef.current.length !== numCols || columnsRef.current[0] < 0) {
        columnsRef.current = new Array(numCols).fill(0);
      }
    } else {
      // Un-hovering removes the floor, causing the pile to fall out
      columnsRef.current.fill(-1000);
      leavesRef.current.forEach((leaf) => {
        leaf.settled = false;
        leaf.speedY = 2 + Math.random() * 4; // Add gravity variation
      });
    }

    const animate = (time: number) => {
      // 1. Spawning
      if (isActive) {
        if (time - lastSpawnRef.current > spawnInterval) {
          // Find columns that haven't completely filled to the top
          const availableCols = columnsRef.current
            .map((h, i) => ({ h, i }))
            .filter((col) => col.h < height + 20);

          // Only spawn if there is still room in the container
          if (availableCols.length > 0) {
            const randomCol =
              availableCols[Math.floor(Math.random() * availableCols.length)];
            const colIndex = randomCol.i;
            const baseX = colIndex * colWidth + (Math.random() * colWidth - colWidth / 2);
            const size = 14 + Math.random() * 14;

            leavesRef.current.push({
              id: Math.random().toString(36).substring(2, 9),
              baseX,
              x: baseX,
              y: -size,
              rotation: Math.random() * 360,
              size,
              speedY: 1.5 + Math.random() * 2,
              swaySpeed: 0.002 + Math.random() * 0.003,
              swayAmount: 5 + Math.random() * 10,
              colIndex,
              settled: false,
              opacity: 0.4 + Math.random() * 0.6,
            });
            lastSpawnRef.current = time;
          }
        }
      }

      // 2. Physics & Movement
      let stillMoving = false;
      const activeLeaves: Particle[] = [];

      leavesRef.current.forEach((leaf) => {
        if (!leaf.settled) {
          stillMoving = true;
          leaf.y += leaf.speedY;
          leaf.x = leaf.baseX + Math.sin(time * leaf.swaySpeed) * leaf.swayAmount;
          leaf.rotation += 1.2;

          // The current floor height for this specific leaf's column
          const floorY = height - columnsRef.current[leaf.colIndex] - leaf.size * 0.5;

          if (isActive && leaf.y >= floorY) {
            // Leaf hit the pile
            leaf.y = floorY;
            leaf.settled = true;
            // Increase the pile height for this column
            columnsRef.current[leaf.colIndex] += pileDensity;
            activeLeaves.push(leaf);
          } else if (leaf.y > height + 100) {
            // Leaf fell out of bounds (cleanup)
          } else {
            activeLeaves.push(leaf);
          }
        } else {
          // Already settled in the pile
          activeLeaves.push(leaf);
        }
      });

      leavesRef.current = activeLeaves;

      // 3. Render State Update
      if (isActive || stillMoving) {
        setLeaves([...leavesRef.current]);
        animationRef.current = requestAnimationFrame(animate);
      } else if (leavesRef.current.length === 0 && leaves.length > 0) {
        setLeaves([]);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isActive, spawnInterval]);

  return (
    <span
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative inline-block overflow-hidden ${className}`}
      {...props}
    >
      {/* Single gradient definition shared across all leaves to save DOM nodes 
      */}
      <svg width="0" height="0" className="absolute pointer-events-none">
        <defs>
          <linearGradient id={gradientId} x1="10" y1="8" x2="40" y2="37">
            <stop stopColor="#95D5B2" />
            <stop offset="0.55" stopColor="#52B788" />
            <stop offset="1" stopColor="#2D6A4F" />
          </linearGradient>
        </defs>
      </svg>

      {/* Children Content (Elevated above leaves) */}
      <span className="relative z-10">{children}</span>

      {/* Physics Layer */}
      <span className="absolute inset-0 z-0 pointer-events-none" aria-hidden="true">
        {leaves.map((leaf) => (
          <RainLeaf
            key={leaf.id}
            gradientId={gradientId}
            size={leaf.size}
            style={{
              position: "absolute",
              left: leaf.x,
              top: leaf.y,
              transform: `rotate(${leaf.rotation}deg)`,
              opacity: leaf.opacity,
              transition: leaf.settled ? "none" : "top 0.05s linear, left 0.05s linear",
            }}
          />
        ))}
      </span>
    </span>
  );
}

export default LeafRain;