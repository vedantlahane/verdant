// primitives/src/edges/BaseEdge.tsx

import React, { useRef, useMemo, useState, useCallback } from 'react';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import { Html, Line } from '@react-three/drei';
import * as THREE from 'three';
import type { EdgeLineProps, EdgeStyle } from '../types';
import { EdgeRouter } from './EdgeRouter';
import { FlowParticles } from './FlowParticles';
import { usePrimitivesOptional } from '../provider/PrimitivesContext';

// ── Pre-allocated objects (module-level, reused across all edges) ──
const _dirVec = new THREE.Vector3();
const _defaultUp = new THREE.Vector3(0, 1, 0);

// ── Shared cone geometry for all arrowheads ──
const _arrowGeometry = new THREE.ConeGeometry(0.06, 0.15, 6);

/**
 * Computes the position at parameter `t ∈ [0, 1]` along a polyline path.
 * Writes result into `out` to avoid allocation.
 */
function getPointOnPath(path: THREE.Vector3[], t: number, out: THREE.Vector3): THREE.Vector3 {
  if (path.length === 0) return out.set(0, 0, 0);
  if (path.length === 1) return out.copy(path[0]);

  let totalLen = 0;
  for (let i = 1; i < path.length; i++) {
    totalLen += path[i].distanceTo(path[i - 1]);
  }
  if (totalLen === 0) return out.copy(path[0]);

  const target = t * totalLen;
  let accum = 0;
  for (let i = 1; i < path.length; i++) {
    const segLen = path[i].distanceTo(path[i - 1]);
    if (accum + segLen >= target) {
      const localT = segLen === 0 ? 0 : (target - accum) / segLen;
      return out.lerpVectors(path[i - 1], path[i], localT);
    }
    accum += segLen;
  }
  return out.copy(path[path.length - 1]);
}

export function BaseEdge({
  from,
  to,
  label,
  animated = false,
  style = 'solid',
  color = '#52B788',
  width = 1.5,
  routing,
  flowParticles,
  id,
  fromNodeId,
  toNodeId,
  fromPort,
  toPort,
  selected = false,
  hovered: hoveredProp = false,
}: EdgeLineProps) {
  const ctx = usePrimitivesOptional(); // ✅ Always called, returns null if no provider
  const lineRef = useRef<any>(null);   // ✅ Ref on Line, not group
  const [internalHovered, setInternalHovered] = useState(false);
  const isHovered = hoveredProp || internalHovered;

  // ── Resolve edge style ──
  const resolvedStyle: EdgeStyle = (animated ? 'animated' : style) as EdgeStyle;

  // ── Compute path points ──
  const points = useMemo(() => {
    const fromVec = new THREE.Vector3(...from);
    const toVec = new THREE.Vector3(...to);

    if (routing) {
      return EdgeRouter.computePath(fromVec, toVec, routing);
    }

    // Default curved bezier
    const dist = fromVec.distanceTo(toVec);
    const arcHeight = Math.min(0.6, dist * 0.15);
    const mid = new THREE.Vector3(
      (from[0] + to[0]) / 2,
      (from[1] + to[1]) / 2 + arcHeight,
      (from[2] + to[2]) / 2,
    );
    const curve = new THREE.QuadraticBezierCurve3(fromVec, mid, toVec);
    return curve.getPoints(32);
  }, [from, to, routing]);

  // ── Compute arrowhead orientation from curve tangent ──
  const { arrowPosition, arrowQuaternion } = useMemo(() => {
    if (points.length < 2) {
      return {
        arrowPosition: [0, 0, 0] as [number, number, number],
        arrowQuaternion: new THREE.Quaternion(),
      };
    }

    const tip = points[points.length - 1];
    const prev = points[points.length - 2];

    // Tangent direction at end of curve
    _dirVec.subVectors(tip, prev).normalize();

    // Cone geometry default axis is +Y → rotate to tangent direction
    const quat = new THREE.Quaternion().setFromUnitVectors(_defaultUp, _dirVec);

    // Position slightly before tip so cone point meets the endpoint
    const pos = new THREE.Vector3().lerpVectors(prev, tip, 0.92);

    return {
      arrowPosition: pos.toArray() as [number, number, number],
      arrowQuaternion: quat,
    };
  }, [points]);

  // ── Compute label position at actual curve midpoint ──
  const labelPosition = useMemo<[number, number, number]>(() => {
    const mid = new THREE.Vector3();
    getPointOnPath(points, 0.5, mid);
    // Offset slightly above the path for readability
    return [mid.x, mid.y + 0.3, mid.z];
  }, [points]);

  // ── Animate dash offset ──
  useFrame(() => {
    if (!lineRef.current?.material) return;
    if (resolvedStyle === 'animated' || resolvedStyle === 'dashed') {
      lineRef.current.material.dashOffset = -(performance.now() / 2000);
    }
  });

  // ── Visual properties based on state ──
  const resolvedColor = selected ? '#fbbf24' : isHovered ? '#93c5fd' : color;
  const resolvedWidth = selected ? width * 1.8 : isHovered ? width * 1.3 : width;
  const resolvedOpacity = selected ? 0.9 : isHovered ? 0.8 : 0.6;

  const isDashed =
    resolvedStyle === 'dashed' ||
    resolvedStyle === 'animated' ||
    resolvedStyle === 'dotted';
  const dashSize = resolvedStyle === 'dotted' ? 0.08 : 0.2;
  const gapSize = resolvedStyle === 'dotted' ? 0.12 : 0.15;

  // ── Pointer handlers ──
  const handlePointerOver = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setInternalHovered(true);
    document.body.style.cursor = 'pointer';
  }, []);

  const handlePointerOut = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setInternalHovered(false);
    document.body.style.cursor = 'default';
  }, []);

  return (
    <group
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      {/* ── Edge line ── */}
      {isDashed ? (
        <Line
          ref={lineRef}
          points={points}
          color={resolvedColor}
          lineWidth={resolvedWidth}
          dashed
          dashSize={dashSize}
          gapSize={gapSize}
          transparent
          opacity={resolvedOpacity + 0.1}
        />
      ) : (
        <Line
          ref={lineRef}
          points={points}
          color={resolvedColor}
          lineWidth={resolvedWidth}
          transparent
          opacity={resolvedOpacity}
        />
      )}

      {/* ── Arrowhead ── */}
      <mesh
        geometry={_arrowGeometry}
        position={arrowPosition}
        quaternion={arrowQuaternion}
      >
        <meshBasicMaterial
          color={resolvedColor}
          transparent
          opacity={selected ? 1.0 : 0.8}
        />
      </mesh>

      {/* ── Selection glow (wider transparent line behind) ── */}
      {(selected || isHovered) && (
        <Line
          points={points}
          color={resolvedColor}
          lineWidth={resolvedWidth * 3}
          transparent
          opacity={selected ? 0.15 : 0.08}
        />
      )}

      {/* ── Label ── */}
      {label && (
        <Html
          position={labelPosition}
          center
          transform
          sprite
          pointerEvents="none"
        >
          <div
            style={{
              color: resolvedColor,
              fontSize: '11px',
              lineHeight: 1,
              whiteSpace: 'nowrap',
              padding: '2px 6px',
              borderRadius: '3px',
              backgroundColor: selected
                ? 'rgba(0,0,0,0.6)'
                : 'rgba(0,0,0,0.3)',
              textShadow: '0 0 2px #000000',
            }}
          >
            {label}
          </div>
        </Html>
      )}

      {/* ── Flow particles ── */}
      {flowParticles && (
        <FlowParticles
          path={points}
          count={flowParticles.count}
          speed={flowParticles.speed}
          size={flowParticles.size}
          color={flowParticles.color ?? color}
          geometryPool={ctx?.geometryPool}
          materialCache={ctx?.materialCache}
        />
      )}
    </group>
  );
}