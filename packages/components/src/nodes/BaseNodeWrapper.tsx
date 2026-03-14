// packages/components/src/nodes/BaseNodeWrapper.tsx

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { NodeProps, SIZE_SCALE } from '../types';

interface BaseNodeWrapperProps extends NodeProps {
  children: React.ReactNode;
}

export function BaseNodeWrapper({
  label,
  position,
  selected = false,
  hovered = false,
  color = '#4287f5',
  size = 'md',
  glow = false,
  onClick,
  onPointerOver,
  onPointerOut,
  children,
}: BaseNodeWrapperProps) {
  const groupRef = useRef<THREE.Group>(null!);
  const glowRef = useRef<THREE.Mesh>(null!);
  const scale = SIZE_SCALE[size] || 1.0;

  // Breathing animation: gentle sine wave float
  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    const nodeIndex = position[0] * 7 + position[2] * 13; // unique phase per node
    const breathe = Math.sin(t * 0.8 + nodeIndex) * 0.05;
    groupRef.current.position.y = position[1] + breathe;
  });

  // Selection / hover scale animation
  useFrame(() => {
    if (!groupRef.current) return;
    const targetScale = selected ? scale * 1.08 : hovered ? scale * 1.04 : scale;
    groupRef.current.scale.lerp(
      new THREE.Vector3(targetScale, targetScale, targetScale),
      0.1
    );
  });

  // Glow intensity animation
  useFrame(() => {
    if (!glowRef.current) return;
    const mat = glowRef.current.material as THREE.MeshBasicMaterial;
    const targetOpacity = selected ? 0.25 : hovered ? 0.15 : glow ? 0.08 : 0;
    mat.opacity += (targetOpacity - mat.opacity) * 0.1;
  });

  return (
    <group
      ref={groupRef}
      position={[position[0], position[1], position[2]]}
      onClick={onClick}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
    >
      {/* Glow sphere behind node */}
      <mesh ref={glowRef} scale={[2, 2, 2]}>
        <sphereGeometry args={[0.8, 16, 16]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0}
          depthWrite={false}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Selection outline ring */}
      {selected && (
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.6, 0]}>
          <ringGeometry args={[0.9 * scale, 1.05 * scale, 32]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.4}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* Actual node geometry (passed as children) */}
      {children}

      {/* Floating label below */}
      <Text
        position={[0, -1.2, 0]}
        fontSize={0.28}
        color="#ffffff"
        anchorX="center"
        anchorY="top"
        outlineWidth={0.02}
        outlineColor="#000000"
        maxWidth={3}
      >
        {label}
      </Text>
    </group>
  );
}