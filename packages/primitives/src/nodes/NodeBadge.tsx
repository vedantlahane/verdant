// primitives/src/nodes/NodeBadge.tsx

import React, { useMemo } from 'react';
import { Html } from '@react-three/drei';
import type { NodeBadge as NodeBadgeType, BadgePosition } from '../types';

interface NodeBadgeProps {
  badge: NodeBadgeType;
  nodeScale: number;
}

/** Base offset for each badge position, scaled by nodeScale. */
const BADGE_OFFSETS: Record<BadgePosition, [number, number]> = {
  'top-right':    [ 0.55,  0.55],
  'top-left':     [-0.55,  0.55],
  'bottom-right': [ 0.55, -0.55],
  'bottom-left':  [-0.55, -0.55],
};

/**
 * Determine if content is a short number (render as circle)
 * or longer text (render as pill).
 */
function isNumericBadge(content: string): boolean {
  return /^\d{1,3}$/.test(content.trim());
}

/**
 * Check if content is an icon reference (prefixed with `icon:`).
 */
function isIconBadge(content: string): boolean {
  return content.startsWith('icon:');
}

/** Simple icon mapping — extend as needed or integrate a real icon library. */
const ICON_MAP: Record<string, string> = {
  shield: '🛡️',
  lock: '🔒',
  warning: '⚠️',
  error: '❌',
  check: '✅',
  star: '⭐',
  fire: '🔥',
  clock: '🕐',
  gear: '⚙️',
  cloud: '☁️',
};

/**
 * Renders a small overlay badge at the specified corner of a node.
 *
 * Supports:
 * - Numeric content (circular badge)
 * - Text content (pill-shaped badge)
 * - Icon content (`icon:shield` → emoji/icon)
 */
export function NodeBadge({ badge, nodeScale }: NodeBadgeProps) {
  const [offsetX, offsetY] = BADGE_OFFSETS[badge.position];

  const pos = useMemo<[number, number, number]>(() => [
    offsetX * nodeScale,
    offsetY * nodeScale,
    0.5 * nodeScale, // Z-offset: render in front of node
  ], [offsetX, offsetY, nodeScale]);

  const bgColor = badge.color ?? '#ef4444';

  // Determine display content
  let displayContent: string;
  let isCircle: boolean;

  if (isIconBadge(badge.content)) {
    const iconKey = badge.content.slice(5); // remove "icon:"
    displayContent = ICON_MAP[iconKey] ?? '?';
    isCircle = true;
  } else {
    displayContent = badge.content;
    isCircle = isNumericBadge(badge.content);
  }

  return (
    <Html position={pos} center pointerEvents="none" zIndexRange={[100, 0]}>
      <div
        style={{
          background: bgColor,
          color: '#ffffff',
          borderRadius: isCircle ? '50%' : '8px',
          minWidth: isCircle ? '18px' : 'auto',
          height: isCircle ? '18px' : 'auto',
          padding: isCircle ? '0' : '2px 6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '10px',
          fontWeight: 700,
          lineHeight: 1,
          userSelect: 'none',
          boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
          border: '1px solid rgba(255,255,255,0.2)',
          whiteSpace: 'nowrap',
        }}
      >
        {displayContent}
      </div>
    </Html>
  );
}