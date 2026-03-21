import React from 'react';
import { Html } from '@react-three/drei';
import type { NodeBadge as NodeBadgeType } from '../types';

interface NodeBadgeProps {
  badge: NodeBadgeType;
  nodeScale: number;
}

const POSITION_MAP: Record<NodeBadgeType['position'], [number, number, number]> = {
  'top-right':    [ 0.6,  0.6, 0],
  'top-left':     [-0.6,  0.6, 0],
  'bottom-right': [ 0.6, -0.6, 0],
  'bottom-left':  [-0.6, -0.6, 0],
};

/**
 * Renders a small Html overlay badge at the given position relative to the node bounding box.
 */
export function NodeBadge({ badge, nodeScale }: NodeBadgeProps) {
  const [bx, by, bz] = POSITION_MAP[badge.position];
  const pos: [number, number, number] = [bx * nodeScale, by * nodeScale, bz * nodeScale];

  return (
    <Html position={pos} center pointerEvents="none">
      <div
        style={{
          background: badge.color ?? '#ef4444',
          color: '#ffffff',
          borderRadius: '50%',
          width: '16px',
          height: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '9px',
          fontWeight: 'bold',
          lineHeight: 1,
          userSelect: 'none',
        }}
      >
        {badge.content}
      </div>
    </Html>
  );
}
