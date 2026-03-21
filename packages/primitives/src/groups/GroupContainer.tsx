import React, { useRef } from 'react';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

export interface GroupContainerProps {
  label?: string;
  color?: string;
  opacity?: number;
  collapsed?: boolean;
  children?: React.ReactNode;
}

export function GroupContainer({
  label,
  color = '#ffffff',
  opacity = 0.05,
  collapsed = false,
  children,
}: GroupContainerProps) {
  const meshRef = useRef<THREE.Mesh>(null!);

  return (
    <group>
      {/* Semi-transparent boundary box */}
      <mesh ref={meshRef}>
        <boxGeometry args={[4, 4, 4]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={opacity}
          depthWrite={false}
          side={THREE.DoubleSide}
          wireframe={false}
        />
      </mesh>

      {/* Wireframe outline */}
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(4, 4, 4)]} />
        <lineBasicMaterial color={color} transparent opacity={0.3} />
      </lineSegments>

      {label && (
        <Html position={[0, 2.2, 0]} center pointerEvents="none">
          <div
            style={{
              color: '#ffffff',
              fontSize: '11px',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              textShadow: '0 0 4px #000000',
              background: 'rgba(0,0,0,0.4)',
              padding: '2px 6px',
              borderRadius: '3px',
            }}
          >
            {label}
          </div>
        </Html>
      )}

      {!collapsed && children}
    </group>
  );
}
