// GroupBox.tsx

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { VrdGroup } from '@verdant/parser';
import { ThemeColors } from '@verdant/themes';

// Lazy singletons — SSR safe
let _boxGeo: THREE.BoxGeometry | null = null;
let _edgesGeo: THREE.EdgesGeometry | null = null;

function getBoxGeo(): THREE.BoxGeometry {
  if (!_boxGeo) _boxGeo = new THREE.BoxGeometry(1, 1, 1);
  return _boxGeo;
}

function getEdgesGeo(): THREE.EdgesGeometry {
  if (!_edgesGeo) _edgesGeo = new THREE.EdgesGeometry(getBoxGeo());
  return _edgesGeo;
}

interface GroupBoxProps {
  group: VrdGroup;
  positions: Record<string, [number, number, number]>;
  themeColors: ThemeColors;
}

export const GroupBox = React.memo(function GroupBox({
  group,
  positions,
  themeColors,
}: GroupBoxProps) {
  const childPositions = useMemo(
    () =>
      group.children
        .map((id) => positions[id])
        .filter(Boolean) as [number, number, number][],
    [group.children, positions],
  );

  const bounds = useMemo(() => {
    if (childPositions.length === 0) return null;
    const pad = 1.5;
    let minX = Infinity,
      maxX = -Infinity;
    let minY = Infinity,
      maxY = -Infinity;
    let minZ = Infinity,
      maxZ = -Infinity;

    for (const [x, y, z] of childPositions) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      if (z < minZ) minZ = z;
      if (z > maxZ) maxZ = z;
    }

    return {
      cx: (minX + maxX) / 2,
      cy: (minY + maxY) / 2,
      cz: (minZ + maxZ) / 2,
      sx: maxX - minX + pad * 2,
      sy: maxY - minY + pad * 2,
      sz: Math.max(maxZ - minZ + pad * 2, 0.1),
    };
  }, [childPositions]);

  if (!bounds) return null;

  const boxGeo = getBoxGeo();
  const edgesGeo = getEdgesGeo();

  return (
    <group position={[bounds.cx, bounds.cy, bounds.cz]}>
      <mesh geometry={boxGeo} scale={[bounds.sx, bounds.sy, bounds.sz]}>
        <meshBasicMaterial
          color={themeColors.accent}
          transparent
          opacity={0.04}
          depthWrite={false}
        />
      </mesh>
      <lineSegments geometry={edgesGeo} scale={[bounds.sx, bounds.sy, bounds.sz]}>
        <lineBasicMaterial
          color={themeColors.accent}
          transparent
          opacity={0.2}
        />
      </lineSegments>
    </group>
  );
});