// primitives/src/groups/GroupContainer.tsx

import React, { useMemo } from 'react';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

export interface GroupContainerProps {
  /** Group display name. */
  label?: string;
  /** Border and tint color. @default "#ffffff" */
  color?: string;
  /** Fill opacity. @default 0.05 */
  opacity?: number;
  /** Bounding box size `[width, height, depth]`. @default [4, 4, 4] */
  size?: [number, number, number];
  /** Whether children are hidden (collapsed). @default false */
  collapsed?: boolean;
  /** Border style. @default "solid" */
  borderStyle?: 'solid' | 'dashed';
  /** Optional world or relative position. */
  position?: [number, number, number];
  children?: React.ReactNode;
}

export function GroupContainer({
  label,
  color = '#ffffff',
  opacity = 0.05,
  size = [4, 4, 4],
  collapsed = false,
  borderStyle = 'solid',
  position,
  children,
}: GroupContainerProps) {
  const [w, h, d] = size;

  // ── Pre-create geometries (recreate only when size changes) ──
  const boxGeometry = useMemo(
    () => new THREE.BoxGeometry(w, h, d),
    [w, h, d],
  );

  const edgesGeometry = useMemo(
    () => new THREE.EdgesGeometry(boxGeometry),
    [boxGeometry],
  );

  // ── Border material ──
  const borderOpacity = collapsed ? 0.15 : 0.3;

  return (
    <group position={position}>
      {/* ── Semi-transparent fill ── */}
      <mesh geometry={boxGeometry}>
        <meshBasicMaterial
          color={color}
          transparent
          opacity={collapsed ? opacity * 0.5 : opacity}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* ── Wireframe border ── */}
      <lineSegments geometry={edgesGeometry}>
        <lineBasicMaterial
          color={color}
          transparent
          opacity={borderOpacity}
          linewidth={1}
        />
      </lineSegments>

      {/* ── Header label ── */}
      {label && (
        <Html
          position={[0, h / 2 + 0.3, 0]}
          center
          pointerEvents="none"
        >
          <div
            style={{
              color: '#ffffff',
              fontSize: '11px',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              textShadow: '0 0 4px #000000',
              background: collapsed
                ? 'rgba(0,0,0,0.6)'
                : 'rgba(0,0,0,0.4)',
              padding: '3px 8px',
              borderRadius: '4px',
              borderLeft: `3px solid ${color}`,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>{collapsed ? '▸' : '▾'}</span>
            <span>{label}</span>
          </div>
        </Html>
      )}

      {/* ── Children (hidden when collapsed) ── */}
      {!collapsed && children}
    </group>
  );
}