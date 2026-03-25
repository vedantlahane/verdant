// primitives/src/nodes/BaseNode.tsx

import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { BackSide, DoubleSide, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, Vector3 } from 'three';
import { NodeProps, SIZE_SCALE } from '../types';
import { NodePorts } from './NodePorts';
import { NodeBadge } from './NodeBadge';
import { getEnterProperties, getExitProperties } from '../animation/EnterExit';
import { usePrimitivesOptional } from '../provider/PrimitivesContext';

interface BaseNodeProps extends NodeProps {
  children: React.ReactNode;
}

// ── Pre-allocated objects (shared across all BaseNode instances) ──
const _targetScale = new Vector3();

// ── Status fallback colors (when no PrimitivesProvider) ──
const STATUS_FALLBACK_COLORS: Record<string, string> = {
  healthy: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  unknown: '#6b7280',
};

function resolveSizeScale(size: string): number {
  return Object.prototype.hasOwnProperty.call(SIZE_SCALE, size)
    ? SIZE_SCALE[size as keyof typeof SIZE_SCALE]
    : SIZE_SCALE.md;
}

export function BaseNode({
  label,
  position,
  selected = false,
  hovered: hoveredProp = false,
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
  breathe = true,
  locked = false,
  visible = true,
  subtitle,
}: BaseNodeProps) {
  const groupRef = useRef<Group>(null!);
  const glowRef = useRef<Mesh>(null!);
  const lastOpacity = useRef<number | null>(null);
  const scale = resolveSizeScale(size);

  // ── Context (optional — works without provider) ──
  const ctx = usePrimitivesOptional();

  // ── Internal hover state ──
  const [internalHovered, setInternalHovered] = useState(false);
  const isHovered = hoveredProp || internalHovered;

  // ── Focus tracking for ARIA ──
  const [isFocused, setIsFocused] = useState(false);

  // ── Resolve color from status ──
  const resolvedColor = useMemo(() => {
    if (status) {
      if (ctx?.statusMaterials[status]) {
        return '#' + ctx.statusMaterials[status].color.getHexString();
      }
      return STATUS_FALLBACK_COLORS[status] ?? color;
    }
    return color;
  }, [status, ctx, color]);

  // ── Deduplicate badges by position ──
  const dedupedBadges = useMemo(() => {
    if (!badges?.length) return [];
    const seen = new Set<string>();
    return badges.filter((badge) => {
      if (seen.has(badge.position)) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn(`[BaseNode] Duplicate badge position "${badge.position}" on node "${id ?? label}" — skipping.`);
        }
        return false;
      }
      seen.add(badge.position);
      return true;
    });
  }, [badges, id, label]);

  // ── Enter animation (side effect, runs once on mount) ──
  useEffect(() => {
    if (id && enterAnimation && ctx?.transitionEngine) {
      ctx.transitionEngine.playEnter(id, enterAnimation, animationDuration);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally run only on mount

  // ── Label config from context ──
  const labelConfig = ctx?.config?.labels;
  const labelColor = labelConfig?.color ?? '#ffffff';
  const labelFontSize = labelConfig?.fontSize ?? 12;
  const labelBg = labelConfig?.showBackground
    ? (labelConfig.backgroundColor ?? 'rgba(0,0,0,0.5)')
    : 'transparent';

  // ── Breathing config ──
  const shouldBreathe = breathe && (ctx?.config?.animation?.breathe !== false);

  // ── Pointer handlers ──
  const handlePointerOver = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setInternalHovered(true);
    if (!locked) document.body.style.cursor = 'pointer';
    onPointerOver?.(e);
  }, [locked, onPointerOver]);

  const handlePointerOut = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setInternalHovered(false);
    document.body.style.cursor = 'default';
    onPointerOut?.(e);
  }, [onPointerOut]);

  const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onClick?.(e);
  }, [onClick]);

  // ── Single useFrame for ALL per-frame logic ──
  useFrame(() => {
    if (!groupRef.current) return;

    const t = performance.now() / 1000;

    // ── 1. Breathing ──
    let baseY = position[1];
    if (shouldBreathe) {
      const nodeIndex = position[0] * 7 + position[2] * 13;
      baseY += Math.sin(t * 0.8 + nodeIndex) * 0.05;
    }

    // ── 2. Animation overlay ──
    let animScale = scale;
    let animOpacity: number | null = null;

    if (id && ctx?.transitionEngine) {
      const animState = ctx.transitionEngine.getAnimationState(id);
      if (animState) {
        const props = animState.isEntering
          ? getEnterProperties(animState.type, animState.progress)
          : animState.isExiting
            ? getExitProperties(animState.type, 1 - animState.progress)
            : null;

        if (props) {
          baseY += props.offsetY;
          animScale = scale * props.scaleX;
          animOpacity = props.opacity;
        }
      }
    }

    groupRef.current.position.y = baseY;

    // ── 3. Scale lerp ──
    const ts = selected ? animScale * 1.08 : isHovered ? animScale * 1.04 : animScale;
    _targetScale.set(ts, ts, ts);
    groupRef.current.scale.lerp(_targetScale, 0.1);

    // ── 4. Glow opacity ──
    if (glowRef.current) {
      const mat = glowRef.current.material as MeshBasicMaterial;
      const target = selected ? 0.25 : isHovered ? 0.15 : glow ? 0.08 : 0;
      mat.opacity += (target - mat.opacity) * 0.1;
    }

    // ── 5. Animation opacity (only traverse when changed) ──
    if (animOpacity !== null && animOpacity !== lastOpacity.current) {
      lastOpacity.current = animOpacity;
      groupRef.current.traverse((obj) => {
        if ((obj as Mesh).isMesh) {
          const mat = (obj as Mesh).material as MeshStandardMaterial;
          if (mat && 'opacity' in mat) {
            mat.transparent = true;
            mat.opacity = animOpacity!;
          }
        }
      });
    } else if (animOpacity === null && lastOpacity.current !== null) {
      // Reset opacity when animation ends
      lastOpacity.current = null;
      groupRef.current.traverse((obj) => {
        if ((obj as Mesh).isMesh) {
          const mat = (obj as Mesh).material as MeshStandardMaterial;
          if (mat && 'opacity' in mat) {
            mat.opacity = 1;
            mat.transparent = false;
          }
        }
      });
    }
  });

  // ── Don't render if not visible ──
  if (!visible) return null;

  // ── Label Y offset based on node size ──
  const labelY = -(0.8 + scale * 0.5);

  return (
    <group
      ref={groupRef}
      position={[position[0], position[1], position[2]]}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      userData={{ nodeId: id, locked }}
    >
      {/* ── Glow sphere (backface, always present but invisible by default) ── */}
      <mesh ref={glowRef} scale={[2, 2, 2]}>
        <sphereGeometry args={[0.8, 16, 16]} />
        <meshBasicMaterial
          color={resolvedColor}
          transparent
          opacity={0}
          depthWrite={false}
          side={BackSide}
        />
      </mesh>

      {/* ── Selection ring ── */}
      {selected && (
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.6, 0]}>
          <ringGeometry args={[0.9 * scale, 1.05 * scale, 32]} />
          <meshBasicMaterial
            color={resolvedColor}
            transparent
            opacity={0.4}
            side={DoubleSide}
          />
        </mesh>
      )}

      {/* ── Focus indicator (distinct from selection) ── */}
      {isFocused && !selected && (
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.6, 0]}>
          <ringGeometry args={[1.0 * scale, 1.1 * scale, 32]} />
          <meshBasicMaterial
            color="#60a5fa"
            transparent
            opacity={0.6}
            side={DoubleSide}
          />
        </mesh>
      )}

      {/* ── Shape content (children) ── */}
      {children}

      {/* ── Node ports (visible on hover) ── */}
      {ports && ports.length > 0 && (
        <NodePorts ports={ports} hovered={isHovered} scale={scale} />
      )}

      {/* ── Badges ── */}
      {dedupedBadges.map((badge) => (
        <NodeBadge key={badge.position} badge={badge} nodeScale={scale} />
      ))}

      {/* ── Label + subtitle ── */}
      <Html
        position={[0, labelY, 0]}
        center
        transform
        sprite
        pointerEvents="none"
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '2px',
            padding: labelBg !== 'transparent' ? '3px 8px' : '0',
            borderRadius: '4px',
            backgroundColor: labelBg,
          }}
        >
          <div
            style={{
              color: labelColor,
              fontSize: `${labelFontSize}px`,
              lineHeight: 1,
              whiteSpace: 'nowrap',
              fontWeight: selected ? 600 : 400,
              textShadow: labelBg === 'transparent'
                ? '0 0 2px #000000, 0 0 6px #000000'
                : 'none',
            }}
          >
            {label}
          </div>
          {subtitle && (
            <div
              style={{
                color: labelColor,
                fontSize: `${Math.max(9, labelFontSize - 2)}px`,
                lineHeight: 1,
                whiteSpace: 'nowrap',
                opacity: 0.7,
                textShadow: labelBg === 'transparent'
                  ? '0 0 2px #000000'
                  : 'none',
              }}
            >
              {subtitle}
            </div>
          )}
        </div>
      </Html>

      {/* ── ARIA live region (screen reader support) ── */}
      {isFocused && (
        <Html position={[0, 0, 0]} pointerEvents="none">
          <div
            role="status"
            aria-live="polite"
            aria-label={
              [
                label,
                status ? `status: ${status}` : '',
                selected ? 'selected' : '',
              ]
                .filter(Boolean)
                .join(', ')
            }
            style={{
              position: 'absolute',
              width: '1px',
              height: '1px',
              overflow: 'hidden',
              clip: 'rect(0,0,0,0)',
              whiteSpace: 'nowrap',
            }}
          />
        </Html>
      )}
    </group>
  );
}