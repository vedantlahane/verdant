"use client";

import { useMemo } from "react";
import type { CameraData } from "@repo/renderer";

interface AxisGizmoProps {
  cameraData: CameraData;
}

interface AxisRender {
  id: string;
  color: string;
  label: string;
  x2: number;
  y2: number;
  depth: number;
  opacity: number;
}

const SIZE = 56;
const CX = SIZE / 2;
const CY = SIZE / 2;
const RADIUS = 18;

const AXES_DEF = [
  { id: "x", color: "#e57373", label: "X" },
  { id: "y", color: "#81c784", label: "Y" },
  { id: "z", color: "#64b5f6", label: "Z" },
] as const;

export function AxisGizmo({ cameraData }: AxisGizmoProps) {
  const axes = useMemo<AxisRender[]>(() => {
    const ap = cameraData.axisProjections;
    const projs = { x: ap.x, y: ap.y, z: ap.z };

    return AXES_DEF
      .map((def) => {
        const p = projs[def.id];
        // p[0] = view-space X (right), p[1] = view-space Y (up), p[2] = view-space Z (toward viewer)
        const depth = p[2];
        return {
          id: def.id,
          color: def.color,
          label: def.label,
          x2: CX + p[0] * RADIUS,
          y2: CY - p[1] * RADIUS, // SVG Y is flipped
          depth,
          // Axes facing the viewer are brighter
          opacity: 0.25 + 0.75 * Math.max(0, (depth + 1) / 2),
        };
      })
      // Painter's algorithm: draw far axes first
      .sort((a, b) => a.depth - b.depth);
  }, [cameraData]);

  return (
    <svg
      width={SIZE}
      height={SIZE}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      style={{ overflow: "visible" }}
      role="img"
      aria-label="Camera orientation gizmo"
    >
      {/* Faint ring for context */}
      <circle
        cx={CX}
        cy={CY}
        r={RADIUS + 2}
        fill="none"
        stroke="var(--border)"
        strokeWidth={0.5}
        opacity={0.3}
      />

      {/* Origin dot */}
      <circle
        cx={CX}
        cy={CY}
        r={1.5}
        fill="var(--text-muted)"
        opacity={0.4}
      />

      {/* Axis lines + endpoints + labels (back-to-front) */}
      {axes.map((a) => {
        // Offset label away from center
        const dx = a.x2 - CX;
        const dy = a.y2 - CY;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const labelX = a.x2 + (dx / len) * 7;
        const labelY = a.y2 + (dy / len) * 7;
        const anchor = dx > 2 ? "start" : dx < -2 ? "end" : "middle";

        return (
          <g key={a.id} opacity={a.opacity}>
            {/* Axis line */}
            <line
              x1={CX}
              y1={CY}
              x2={a.x2}
              y2={a.y2}
              stroke={a.color}
              strokeWidth={1.5}
              strokeLinecap="round"
            />
            {/* Endpoint dot */}
            <circle cx={a.x2} cy={a.y2} r={2.5} fill={a.color} />
            {/* Label */}
            <text
              x={labelX}
              y={labelY + 2.5}
              fill={a.color}
              fontSize={7}
              fontFamily="var(--font-mono)"
              fontWeight={600}
              textAnchor={anchor}
              style={{ userSelect: "none" }}
            >
              {a.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
