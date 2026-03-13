import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { NodeProps } from './types';

export function BaseNode({
  label,
  position = [0, 0, 0],
  size = 'md',
  selected,
  onClick,
  children
}: NodeProps & { children: React.ReactNode }) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  let scale = 1;
  if (typeof size === 'number') scale = size;
  else if (size === 'sm') scale = 0.75;
  else if (size === 'lg') scale = 1.5;

  let targetScale = hovered ? scale * 1.1 : scale;

  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), delta * 15);
    }
  });

  return (
    <group 
      position={position} 
      ref={groupRef}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
      onPointerOut={(e) => { e.stopPropagation(); setHovered(false); document.body.style.cursor = 'default'; }}
      onClick={(e) => { e.stopPropagation(); if (onClick) onClick(e); }}
    >
      <group>
        {children}
      </group>
      
      {/* Floating Label Below */}
      {label && (
        <Text
          position={[0, -1.2, 0]}
          fontSize={0.3}
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
