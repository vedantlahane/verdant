import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, Line } from '@react-three/drei';
import * as THREE from 'three';
import { EdgeLineProps } from '../types';
import { EdgeRouter } from './EdgeRouter';
import { FlowParticles } from './FlowParticles';
import { usePrimitives } from '../provider/PrimitivesContext';

function tryUsePrimitives() {
  try {
    return usePrimitives();
  } catch {
    return null;
  }
}

export function BaseEdge({
  from,
  to,
  label,
  animated = false,
  style = 'solid',
  color = '#52B788',
  width = 1.5,
  routing,
  flowParticles,
  id: _id,
  fromNodeId: _fromNodeId,
  toNodeId: _toNodeId,
  fromPort: _fromPort,
  toPort: _toPort,
}: EdgeLineProps) {
  const ctx = tryUsePrimitives();
  const dashRef = useRef<any>(null);

  const midpoint = useMemo<[number, number, number]>(() => [
    (from[0] + to[0]) / 2,
    (from[1] + to[1]) / 2 + 0.4,
    (from[2] + to[2]) / 2,
  ], [from, to]);

  const points = useMemo(() => {
    const fromVec = new THREE.Vector3(...from);
    const toVec = new THREE.Vector3(...to);

    if (routing) {
      const router = new EdgeRouter();
      return router.computePath(fromVec, toVec, routing);
    }

    // Default v1 bezier curve
    const mid = new THREE.Vector3(
      (from[0] + to[0]) / 2,
      (from[1] + to[1]) / 2 + 0.6,
      (from[2] + to[2]) / 2,
    );
    const curve = new THREE.QuadraticBezierCurve3(fromVec, mid, toVec);
    return curve.getPoints(32);
  }, [from, to, routing]);

  useFrame(() => {
    if (!dashRef.current) return;
    if (animated || style === 'animated') {
      const elapsed = performance.now() / 1000;
      dashRef.current.material.dashOffset = -elapsed * 0.5;
    }
  });

  const isDashed = style === 'dashed' || style === 'animated' || style === 'dotted';
  const dashSize = style === 'dotted' ? 0.08 : 0.2;
  const gapSize = style === 'dotted' ? 0.12 : 0.15;

  // Determine arrowhead position/direction from last two path points
  const arrowTip = points[points.length - 1];
  const arrowBase = points[points.length - 2] ?? points[0];
  const arrowPos: [number, number, number] = [
    arrowTip.x + (arrowBase.x - arrowTip.x) * 0.05,
    arrowTip.y + (arrowBase.y - arrowTip.y) * 0.05 + 0.05,
    arrowTip.z + (arrowBase.z - arrowTip.z) * 0.05,
  ];

  return (
    <group>
      {isDashed ? (
        <group ref={dashRef}>
          <Line
            points={points}
            color={color}
            lineWidth={width}
            dashed
            dashSize={dashSize}
            gapSize={gapSize}
            transparent
            opacity={0.7}
          />
        </group>
      ) : (
        <Line
          points={points}
          color={color}
          lineWidth={width}
          transparent
          opacity={0.6}
        />
      )}

      <mesh
        position={arrowPos}
        onUpdate={(self) => {
          self.lookAt(arrowTip);
        }}
      >
        <coneGeometry args={[0.06, 0.15, 6]} />
        <meshBasicMaterial color={color} transparent opacity={0.8} />
      </mesh>

      {label && (
        <Html
          position={midpoint}
          center
          transform
          sprite
          pointerEvents="none"
        >
          <div
            style={{
              color,
              fontSize: '11px',
              lineHeight: 1,
              whiteSpace: 'nowrap',
              textShadow: '0 0 2px #000000, 0 0 6px #000000',
            }}
          >
            {label}
          </div>
        </Html>
      )}

      {flowParticles && (
        <FlowParticles
          path={points}
          count={flowParticles.count}
          speed={flowParticles.speed}
          color={flowParticles.color ?? color}
          geometryPool={ctx?.geometryPool}
          materialCache={ctx?.materialCache}
        />
      )}
    </group>
  );
}
