// packages/components/src/edges/EdgeLine.tsx

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Line } from '@react-three/drei';
import * as THREE from 'three';
import { EdgeLineProps } from '../types';

export function EdgeLine({
  from,
  to,
  label,
  animated = false,
  style = 'solid',
  color = '#52B788',
  width = 1.5,
}: EdgeLineProps) {
  const dashRef = useRef<any>(null);

  // Midpoint for label placement
  const midpoint = useMemo<[number, number, number]>(() => [
    (from[0] + to[0]) / 2,
    (from[1] + to[1]) / 2 + 0.4,  // Slightly above the line
    (from[2] + to[2]) / 2,
  ], [from, to]);

  // Curved path: slight arc via control point
  const points = useMemo(() => {
    const start = new THREE.Vector3(...from);
    const end = new THREE.Vector3(...to);
    const mid = new THREE.Vector3(
      (from[0] + to[0]) / 2,
      (from[1] + to[1]) / 2 + 0.6,  // Gentle arc upward
      (from[2] + to[2]) / 2,
    );
    const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
    return curve.getPoints(32);
  }, [from, to]);

  // Animated dash offset
  useFrame(({ clock }) => {
    if (!dashRef.current) return;
    if (animated || style === 'animated') {
      dashRef.current.material.dashOffset = -clock.getElapsedTime() * 0.5;
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

      {/* Arrow head at destination */}
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

      {/* Label */}
      {label && (
        <Text
          position={midpoint}
          fontSize={0.22}
          color={color}
          anchorX="center"
          anchorY="bottom"
          outlineWidth={0.015}
          outlineColor="#000000"
        >
          {label}
        </Text>
      )}
    </group>
  );
}