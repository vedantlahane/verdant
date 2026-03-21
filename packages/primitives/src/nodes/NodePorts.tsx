import React from 'react';
import type { NodePort } from '../shapes/ShapeDefinition';

interface NodePortsProps {
  ports: NodePort[];
  hovered: boolean;
  scale: number;
}

/**
 * Renders small sphere port indicators when the parent node is hovered.
 * Each sphere has a diameter ≤ 0.15 world units (radius 0.075).
 */
export function NodePorts({ ports, hovered, scale }: NodePortsProps) {
  if (!hovered) return null;

  return (
    <>
      {ports.map((port) => {
        const x = port.localPosition.x * scale;
        const y = port.localPosition.y * scale;
        const z = port.localPosition.z * scale;
        return (
          <mesh key={port.name} position={[x, y, z]}>
            <sphereGeometry args={[0.075, 8, 8]} />
            <meshStandardMaterial color="#ffffff" emissive="#aaaaff" emissiveIntensity={0.5} />
          </mesh>
        );
      })}
    </>
  );
}
