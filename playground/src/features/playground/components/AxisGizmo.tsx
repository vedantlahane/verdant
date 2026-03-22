// features/playground/components/AxisGizmo.tsx

"use client";

import { useMemo, memo } from "react";
import type { CameraData } from "@verdant/renderer";

// ── Types ──

interface AxisGizmoProps {
  readonly cameraData: CameraData;
}

interface AxisRender {
  readonly id: string;
  readonly color: string;
  readonly label: string;
  readonly x2: number;
  readonly y2: number;
  readonly depth: number;
  readonly opacity: number;
}

// ── Module-level constants (frozen, pattern 8) ──

const SIZE = 76;
const CX = SIZE / 2;
const CY = SIZE / 2;
const RADIUS = 26;
/** Label offset from axis endpoint in px */
const LABEL_OFFSET = 7;
/** Threshold for text-anchor decision */
const ANCHOR_THRESHOLD = 2;

const AXES_DEF = Object.freeze([
  Object.freeze({ id: "x", color: "#e57373", label: "X" }),
  Object.freeze({ id: "y", color: "#81c784", label: "Y" }),
  Object.freeze({ id: "z", color: "#64b5f6", label: "Z" }),
] as const);

const SVG_STYLE = Object.freeze({ overflow: "visible" } as const);
const VIEWBOX = `0 0 ${SIZE} ${SIZE}`;
const TEXT_STYLE = Object.freeze({ userSelect: "none" } as const) as React.CSSProperties;

/**
 * Camera orientation gizmo — shows X/Y/Z axis projections
 * as an SVG overlay. Painter's algorithm sorts axes by depth.
 *
 * Memoized with deep comparison on axisProjections.
 */
export const AxisGizmo = memo(function AxisGizmo({ cameraData }: AxisGizmoProps) {
  const axes = useMemo<AxisRender[]>(() => {
    const ap = cameraData.axisProjections;

    return (
      AXES_DEF.map((def) => {
        const p = ap[def.id as keyof typeof ap];
        const depth = p[2];
        return {
          id: def.id,
          color: def.color,
          label: def.label,
          x2: CX + p[0] * RADIUS,
          y2: CY - p[1] * RADIUS,
          depth,
          opacity: 0.25 + 0.75 * Math.max(0, (depth + 1) / 2),
        };
      })
        // Painter's algorithm: far axes rendered first
        .sort((a, b) => a.depth - b.depth)
    );
  }, [cameraData.axisProjections]);

  return (
    <svg
      width={SIZE}
      height={SIZE}
      viewBox={VIEWBOX}
      style={SVG_STYLE}
      role="img"
      aria-label="Camera orientation gizmo"
    >
      <circle
        cx={CX}
        cy={CY}
        r={RADIUS + 2}
        fill="none"
        stroke="var(--border)"
        strokeWidth={0.5}
        opacity={0.3}
      />
      <circle
        cx={CX}
        cy={CY}
        r={1.5}
        fill="var(--text-muted)"
        opacity={0.4}
      />
      {axes.map((a) => {
        const dx = a.x2 - CX;
        const dy = a.y2 - CY;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const labelX = a.x2 + (dx / len) * LABEL_OFFSET;
        const labelY = a.y2 + (dy / len) * LABEL_OFFSET + 2.5;
        const anchor =
          dx > ANCHOR_THRESHOLD
            ? "start"
            : dx < -ANCHOR_THRESHOLD
              ? "end"
              : "middle";

        return (
          <g key={a.id} opacity={a.opacity}>
            <line
              x1={CX}
              y1={CY}
              x2={a.x2}
              y2={a.y2}
              stroke={a.color}
              strokeWidth={1.5}
              strokeLinecap="round"
            />
            <circle cx={a.x2} cy={a.y2} r={2.5} fill={a.color} />
            <text
              x={labelX}
              y={labelY}
              fill={a.color}
              fontSize={7}
              fontFamily="var(--font-mono)"
              fontWeight={600}
              textAnchor={anchor}
              style={TEXT_STYLE}
            >
              {a.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
},
function axisGizmoPropsAreEqual(prev, next) {
  const a = prev.cameraData.axisProjections;
  const b = next.cameraData.axisProjections;
  return (
    a.x[0] === b.x[0] && a.x[1] === b.x[1] && a.x[2] === b.x[2] &&
    a.y[0] === b.y[0] && a.y[1] === b.y[1] && a.y[2] === b.y[2] &&
    a.z[0] === b.z[0] && a.z[1] === b.z[1] && a.z[2] === b.z[2]
  );
});