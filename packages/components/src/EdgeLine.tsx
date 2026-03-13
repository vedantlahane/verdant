import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { QuadraticBezierLine, Text } from '@react-three/drei';
import * as THREE from 'three';
import { EdgeProps } from './types';

export function EdgeLine({ from, to, label, color = '#ffffff', animated, style = 'solid' }: EdgeProps) {
  const lineRef = useRef<any>(null);

  useFrame((state, delta) => {
    if (animated && lineRef.current?.material) {
      if (lineRef.current.material.dashOffset === undefined) {
          lineRef.current.material.dashOffset = 0;
      }
      lineRef.current.material.dashOffset -= delta * 2;
    }
  });

  const fromV = new THREE.Vector3(...from);
  const toV = new THREE.Vector3(...to);
  const mid = new THREE.Vector3().addVectors(fromV, toV).multiplyScalar(0.5);
  
  // Bulge the curve up proportional to standard vector distance to create smooth bridges
  mid.y += (fromV.distanceTo(toV) * 0.25);

  return (
    <group>
      <QuadraticBezierLine
        ref={lineRef}
        start={fromV}
        end={toV}
        mid={mid}
        color={color}
        lineWidth={2}
        dashed={style === 'dashed' || animated}
        dashSize={0.2}
        dashScale={2}
        gapSize={0.2}
      />
      {label && (
        <Text
           position={[mid.x, mid.y + 0.3, mid.z]}
           fontSize={0.25}
           color="#ffffff"
           anchorX="center"
           anchorY="middle"
           outlineWidth={0.02}
           outlineColor="#000000"
        >
          {label}
        </Text>
      )}
    </group>
  );
}
