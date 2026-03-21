import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { NodeProps, SIZE_SCALE } from '../types';
import { NodePorts } from './NodePorts';
import { NodeBadge } from './NodeBadge';
import { getEnterProperties, getExitProperties } from '../animation/EnterExit';
import { usePrimitives } from '../provider/PrimitivesContext';
import type { TransitionEngine } from '../animation/TransitionEngine';

interface BaseNodeProps extends NodeProps {
  children: React.ReactNode;
}

/** Safely attempt to get the primitives context — returns null if outside provider */
function tryUsePrimitives() {
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return usePrimitives();
  } catch {
    return null;
  }
}

const STATUS_FALLBACK: Record<string, string> = {
  healthy: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  unknown: '#6b7280',
};

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
  // v2 props
  id,
  status,
  badges,
  enterAnimation,
  exitAnimation,
  animationDuration,
  ports,
}: BaseNodeProps) {
  const groupRef = useRef<THREE.Group>(null!);
  const glowRef = useRef<THREE.Mesh>(null!);
  const scale = SIZE_SCALE[size] || 1.0;
  const [focused] = useState(false);

  // Safely get context (may be null if outside PrimitivesProvider)
  const ctx = tryUsePrimitives();

  // Resolve color from status material or fallback
  let resolvedColor = color;
  if (status) {
    if (ctx) {
      const mat = ctx.statusMaterials[status];
      if (mat) {
        resolvedColor = '#' + mat.color.getHexString();
      }
    } else {
      resolvedColor = STATUS_FALLBACK[status] ?? color;
    }
  }

  // Deduplicate badges by position
  const seenPositions = new Set<string>();
  const dedupedBadges = (badges ?? []).filter((badge) => {
    if (seenPositions.has(badge.position)) {
      console.warn(`[BaseNode] Duplicate badge position '${badge.position}' — skipping.`);
      return false;
    }
    seenPositions.add(badge.position);
    return true;
  });

  // Get transition engine from context
  const transitionEngine: TransitionEngine | null = ctx?.transitionEngine ?? null;

  // Trigger enter animation on mount
  const didEnter = useRef(false);
  if (id && enterAnimation && transitionEngine && !didEnter.current) {
    didEnter.current = true;
    transitionEngine.playEnter(id, enterAnimation, animationDuration);
  }

  useFrame(() => {
    if (!groupRef.current) return;
    const t = performance.now() / 1000;
    const nodeIndex = position[0] * 7 + position[2] * 13;
    const breathe = Math.sin(t * 0.8 + nodeIndex) * 0.05;

    let baseY = position[1] + breathe;
    let animScale = scale;
    let animOpacity: number | null = null;

    // Apply transition animation if available
    if (id && transitionEngine) {
      const animState = transitionEngine.getAnimationState(id);
      if (animState) {
        let props;
        if (animState.isEntering) {
          props = getEnterProperties(animState.type, animState.progress);
        } else if (animState.isExiting) {
          props = getExitProperties(animState.type, 1 - animState.progress);
        }
        if (props) {
          baseY += props.positionOffset.y;
          animScale = scale * props.scale.x;
          animOpacity = props.opacity;
        }
      }
    }

    groupRef.current.position.y = baseY;

    const targetScale = selected ? animScale * 1.08 : hovered ? animScale * 1.04 : animScale;
    groupRef.current.scale.lerp(
      new THREE.Vector3(targetScale, targetScale, targetScale),
      0.1
    );

    // Apply opacity to children if animating
    if (animOpacity !== null) {
      groupRef.current.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const mesh = obj as THREE.Mesh;
          const mat = mesh.material as THREE.Material;
          if (mat && 'opacity' in mat) {
            (mat as THREE.MeshStandardMaterial).transparent = true;
            (mat as THREE.MeshStandardMaterial).opacity = animOpacity as number;
          }
        }
      });
    }
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
          color={resolvedColor}
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
            color={resolvedColor}
            transparent
            opacity={0.4}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {children}

      {ports && ports.length > 0 && (
        <NodePorts ports={ports} hovered={hovered} scale={scale} />
      )}

      {dedupedBadges.map((badge) => (
        <NodeBadge key={badge.position} badge={badge} nodeScale={scale} />
      ))}

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

      {/* ARIA live region on keyboard focus */}
      {focused && (
        <Html position={[0, 0, 0]} pointerEvents="none">
          <div
            aria-live="polite"
            aria-label={status ? `${label}, status: ${status}` : label}
            style={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0,0,0,0)' }}
          />
        </Html>
      )}
    </group>
  );
}
