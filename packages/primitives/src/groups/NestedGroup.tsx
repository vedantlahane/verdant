// primitives/src/groups/NestedGroup.tsx

import React, { useMemo } from 'react';
import { GroupContainer } from './GroupContainer';

export interface NestedGroupProps {
  /** Group display name. */
  label?: string;
  /** Base color (auto-tinted by depth). @default "#ffffff" */
  color?: string;
  /** Whether this group is collapsed. @default false */
  collapsed?: boolean;
  /** Nesting depth (0 = root). @default 0 */
  depth?: number;
  /** Bounding box size. Auto-reduced per depth level. */
  size?: [number, number, number];
  children?: React.ReactNode;
}

/** Maximum supported nesting depth. Beyond this, styling stops changing. */
const MAX_VISUAL_DEPTH = 6;

/**
 * Darken a hex color by a factor (0 = black, 1 = original).
 */
function darkenColor(hex: string, factor: number): string {
  const match = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!match) return hex;
  const r = Math.round(parseInt(match[1], 16) * factor);
  const g = Math.round(parseInt(match[2], 16) * factor);
  const b = Math.round(parseInt(match[3], 16) * factor);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Renders a `GroupContainer` that adapts its visual properties based on nesting depth.
 *
 * Each depth level:
 * - Slightly darkens the color
 * - Reduces fill opacity
 * - Shrinks the bounding box
 * - Offsets position to nest visually inside the parent
 */
export function NestedGroup({
  label,
  color = '#ffffff',
  collapsed = false,
  depth = 0,
  size,
  children,
}: NestedGroupProps) {
  const effectiveDepth = Math.min(depth, MAX_VISUAL_DEPTH);

  // ── Depth-based visual adjustments ──
  const depthColor = useMemo(
    () => darkenColor(color, Math.max(0.5, 1 - effectiveDepth * 0.08)),
    [color, effectiveDepth],
  );

  const depthOpacity = Math.max(0.02, 0.06 - effectiveDepth * 0.008);

  // Scale down bounding box per depth level
  const depthSize = useMemo<[number, number, number]>(() => {
    if (size) {
      const factor = Math.max(0.6, 1 - effectiveDepth * 0.08);
      return [size[0] * factor, size[1] * factor, size[2] * factor];
    }
    const base = Math.max(2, 4 - effectiveDepth * 0.4);
    return [base, base, base];
  }, [size, effectiveDepth]);

  // Offset inward per depth level
  const offset = effectiveDepth * 0.2;

  return (
    <group position={[offset, offset * 0.5, 0]}>
      <GroupContainer
        label={label}
        color={depthColor}
        opacity={depthOpacity}
        size={depthSize}
        collapsed={collapsed}
      >
        {children}
      </GroupContainer>
    </group>
  );
}