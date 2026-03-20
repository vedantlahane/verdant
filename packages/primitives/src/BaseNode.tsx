import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { NodeProps, SIZE_SCALE } from './types';

interface BaseNodeProps extends NodeProps {
  children: React.ReactNode;
}

export function BaseNode({
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
}: BaseNodeProps) {
  const groupRef = useRef<THREE.Group>(null!);
  const glowRef = useRef<THREE.Mesh>(null!);
  const scale = SIZE_SCALE[size] || 1.0;

  useFrame(() => {
    if (!groupRef.current) return;
    const t = performance.now() / 1000;
    const nodeIndex = position[0] * 7 + position[2] * 13;
    const breathe = Math.sin(t * 0.8 + nodeIndex) * 0.05;
    groupRef.current.position.y = position[1] + breathe;
  });

  useFrame(() => {
    if (!groupRef.current) return;
    const targetScale = selected ? scale * 1.08 : hovered ? scale * 1.04 : scale;
    groupRef.current.scale.lerp(
      new THREE.Vector3(targetScale, targetScale, targetScale),
      0.1
    );
  });

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

      {children}

      <Html
        position={[0, -1.2, 0]}
        center
        transform
        sprite
        pointerEvents="none"
      >
        <div
          style={{
            color: '#ffffff',
            fontSize: '12px',
            lineHeight: 1,
            whiteSpace: 'nowrap',
            textShadow: '0 0 2px #000000, 0 0 6px #000000',
          }}
        >
          {label}
        </div>
      </Html>
    </group>
  );
}
