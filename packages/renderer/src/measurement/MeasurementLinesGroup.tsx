// measurement/MeasurementLinesGroup.tsx

import React from 'react';
import type { MeasurementLine } from '../types';
import { DimensionLine } from './DimensionLine';

// ═══════════════════════════════════════════════════════════════════
//  Constants
// ═══════════════════════════════════════════════════════════════════

const DEFAULT_ACCENT_COLOR = '#52B788';

// ═══════════════════════════════════════════════════════════════════
//  Component
//
//  Thin wrapper that maps MeasurementLine data to DimensionLine
//  components. The actual rendering logic lives in DimensionLine.
//
//  Memoized to prevent re-renders when unrelated parent state
//  changes (e.g., hover, camera movement). Only re-renders when
//  the `lines` array reference or `accentColor` changes.
// ═══════════════════════════════════════════════════════════════════

interface MeasurementLinesGroupProps {
  readonly lines: readonly MeasurementLine[];
  readonly accentColor?: string;
}

/**
 * Renders a group of measurement/dimension lines in the 3D scene.
 *
 * Each line connects two node positions with a dashed line,
 * perpendicular wing markers, and a distance label.
 *
 * Key design decisions:
 * - Stable keys use `fromId-toId-index` to handle multiple edges
 *   between the same pair of nodes (parallel edges).
 * - Returns `null` when empty to avoid an unnecessary `<group>` in
 *   the Three.js scene graph (fewer traversal nodes for the renderer).
 * - Individual `DimensionLine` components are memoized, so adding/
 *   removing a line only mounts/unmounts the affected component —
 *   existing lines are not re-rendered.
 */
export const MeasurementLinesGroup = React.memo(
  function MeasurementLinesGroup({
    lines,
    accentColor = DEFAULT_ACCENT_COLOR,
  }: MeasurementLinesGroupProps) {
    if (lines.length === 0) return null;

    return (
      <group>
        {lines.map((line, i) => (
          <DimensionLine
            key={`${line.fromId}-${line.toId}-${i}`}
            from={line.from}
            to={line.to}
            fromId={line.fromId}
            toId={line.toId}
            label={line.label}
            direction={line.direction}
            accentColor={accentColor}
          />
        ))}
      </group>
    );
  },
  (prev, next) => {
    // Fast path: referential equality
    if (prev.lines === next.lines && prev.accentColor === next.accentColor) {
      return true;
    }

    // Accent color change → full re-render
    if (prev.accentColor !== next.accentColor) return false;

    // Length change → structural change
    if (prev.lines.length !== next.lines.length) return false;

    // Per-line shallow comparison
    // This avoids re-rendering all DimensionLines when the parent
    // reconstructs the `lines` array with the same data (common
    // during SceneContent re-renders triggered by hover/camera).
    const prevLines = prev.lines;
    const nextLines = next.lines;

    for (let i = 0; i < prevLines.length; i++) {
      const p = prevLines[i];
      const n = nextLines[i];

      if (
        p.fromId !== n.fromId ||
        p.toId !== n.toId ||
        p.direction !== n.direction ||
        p.label !== n.label ||
        p.from[0] !== n.from[0] ||
        p.from[1] !== n.from[1] ||
        p.from[2] !== n.from[2] ||
        p.to[0] !== n.to[0] ||
        p.to[1] !== n.to[1] ||
        p.to[2] !== n.to[2]
      ) {
        return false;
      }
    }

    return true;
  },
);