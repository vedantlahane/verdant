import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, Line } from '@react-three/drei';
import * as THREE from 'three';
import { EdgeLineProps } from './types';

export function BaseEdge({
  from,
  to,
  label,
  animated = false,
  style = 'solid',
  color = '#52B788',
  width = 1.5,
}: EdgeLineProps) {
  const dashRef = useRef<any>(null);

  const midpoint = useMemo<[number, number, number]>(() => [
    (from[0] + to[0]) / 2,
    (from[1] + to[1]) / 2 + 0.4,
    (from[2] + to[2]) / 2,
  ], [from, to]);

  const points = useMemo(() => {
    const start = new THREE.Vector3(...from);
    const end = new THREE.Vector3(...to);
    const mid = new THREE.Vector3(
      (from[0] + to[0]) / 2,
      (from[1] + to[1]) / 2 + 0.6,
      (from[2] + to[2]) / 2,
    );
    const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
    return curve.getPoints(32);
  }, [from, to]);

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
        position={[
          to[0] + (from[0] - to[0]) * 0.05,
          to[1] + (from[1] - to[1]) * 0.05 + 0.05,
          to[2] + (from[2] - to[2]) * 0.05,
        ]}
        onUpdate={(self) => {
          self.lookAt(new THREE.Vector3(...to));
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
    </group>
  );
}
