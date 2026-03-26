// primitives/src/nodes/NodePorts.tsx

import React, { useRef, useMemo, useState, useCallback, useEffect } from 'react';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { Group, MeshStandardMaterial, SphereGeometry } from 'three';
import type { NodePort } from '../shapes/ShapeDefinition';

interface NodePortsProps {
  ports: NodePort[];
  hovered: boolean;
  scale: number;
}

// ── Shared geometry for all ports (module-level singleton) ──
const _portGeometry = new SphereGeometry(0.075, 8, 8);

// ── Direction-based colors ──
const PORT_COLORS: Record<string, string> = {
  in: '#4ade80',            // green
  out: '#f87171',           // red
  bidirectional: '#60a5fa', // blue
};

const DEFAULT_PORT_COLOR = '#d4d4d8'; // zinc-300

/**
 * Renders small sphere port indicators when the parent node is hovered.
 * Each sphere has a diameter ≤ 0.15 world units.
 *
 * - Green = input port
 * - Red = output port
 * - Blue = bidirectional port
 *
 * Shows port name tooltip on individual port hover.
 */
export function NodePorts({ ports, hovered, scale }: NodePortsProps) {
  const groupRef = useRef<Group>(null!);
  const opacityRef = useRef(0);
  const [hoveredPort, setHoveredPort] = useState<string | null>(null);

  // ── Validate ports ──
  const validPorts = useMemo(() => {
    if (!Array.isArray(ports)) return [];
    return ports.filter((port): port is NodePort => {
      if (!port?.localPosition) return false;
      const { x, y, z } = port.localPosition;
      return (
        port.name != null &&
        Number.isFinite(x) &&
        Number.isFinite(y) &&
        Number.isFinite(z)
      );
    });
  }, [ports]);

  // ── Pre-create materials per direction (shared across ports) ──
  const materials = useMemo(() => {
    const result: Record<string, MeshStandardMaterial> = {};
    for (const [dir, color] of Object.entries(PORT_COLORS)) {
      result[dir] = new MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.5,
        transparent: true,
        opacity: 0,
      });
    }
    result.default = new MeshStandardMaterial({
      color: DEFAULT_PORT_COLOR,
      emissive: DEFAULT_PORT_COLOR,
      emissiveIntensity: 0.3,
      transparent: true,
      opacity: 0,
    });
    return result;
  }, []);

  // ── Cleanup materials on unmount ──
  useEffect(() => {
    return () => {
      for (const mat of Object.values(materials)) {
        mat.dispose();
      }
    };
  }, [materials]);

  // ── Animate opacity fade in/out ──
  useFrame((_, delta) => {
    const targetOpacity = hovered ? 1.0 : 0.0;
    opacityRef.current += (targetOpacity - opacityRef.current) * Math.min(1, delta * 8);

    // Update all material opacities
    for (const mat of Object.values(materials)) {
      mat.opacity = opacityRef.current;
    }

    // Hide group entirely when fully transparent
    if (groupRef.current) {
      groupRef.current.visible = opacityRef.current > 0.01;
    }
  });

  // ── Port hover handlers ──
  const handlePortOver = useCallback((name: string) => (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHoveredPort(name);
  }, []);

  const handlePortOut = useCallback(() => {
    setHoveredPort(null);
  }, []);

  if (validPorts.length === 0) return null;

  return (
    <group ref={groupRef}>
      {validPorts.map((port) => {
        const { x, y, z } = port.localPosition;
        const material = materials.default;

        return (
          <group key={port.name}>
            <mesh
              geometry={_portGeometry}
              material={material}
              position={[x * scale, y * scale, z * scale]}
              onPointerOver={handlePortOver(port.name)}
              onPointerOut={handlePortOut}
            />
            {/* Port name tooltip */}
            {hoveredPort === port.name && (
              <Html
                position={[x * scale, y * scale + 0.2, z * scale]}
                center
                sprite
                pointerEvents="none"
              >
                <div
                  style={{
                    background: 'rgba(0,0,0,0.75)',
                    color: '#ffffff',
                    fontSize: '10px',
                    padding: '2px 6px',
                    borderRadius: '3px',
                    whiteSpace: 'nowrap',
                    userSelect: 'none',
                  }}
                >
                  {port.name}
                </div>
              </Html>
            )}
          </group>
        );
      })}
    </group>
  );
}