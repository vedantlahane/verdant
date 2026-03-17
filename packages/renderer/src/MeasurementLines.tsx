"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";

// ============================================
// Types
// ============================================

export interface MeasurementLine {
  from: [number, number, number];
  to: [number, number, number];
  fromId: string;
  toId: string;
  label?: string;
  direction: "outgoing" | "incoming";
}

interface MeasurementLinesProps {
  lines: MeasurementLine[];
  accentColor?: string;
}

// ============================================
// Dashed line material (shared)
// ============================================

const DASH_SCALE = 0.15;
const DASH_SIZE = 0.3;
const GAP_SIZE = 0.2;

// ============================================
// Single dimension line
// ============================================

function DimensionLine({
  from,
  to,
  label,
  direction,
  accentColor,
}: MeasurementLine & { accentColor: string }) {
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();

  // ── Geometry ──
  const lineGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute([...from, ...to], 3),
    );
    geo.computeBoundingSphere();
    return geo;
  }, [from, to]);

  // ── Distance ──
  const distance = useMemo(() => {
    const dx = to[0] - from[0];
    const dy = to[1] - from[1];
    const dz = to[2] - from[2];
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }, [from, to]);

  // ── Midpoint (for label) ──
  const midpoint = useMemo<[number, number, number]>(
    () => [
      (from[0] + to[0]) / 2,
      (from[1] + to[1]) / 2,
      (from[2] + to[2]) / 2,
    ],
    [from, to],
  );

  // ── Offset midpoint slightly upward so label doesn't overlap the line ──
  const labelPos = useMemo<[number, number, number]>(
    () => [midpoint[0], midpoint[1] + 0.3, midpoint[2]],
    [midpoint],
  );

  // ── Perpendicular offset for dimension-line "wings" ──
  const wingGeo = useMemo(() => {
    const dir = new THREE.Vector3(
      to[0] - from[0],
      to[1] - from[1],
      to[2] - from[2],
    ).normalize();

    // Get a perpendicular vector (cross with world up, fallback to right)
    const up = new THREE.Vector3(0, 1, 0);
    let perp = new THREE.Vector3().crossVectors(dir, up);
    if (perp.lengthSq() < 0.001) {
      perp = new THREE.Vector3().crossVectors(
        dir,
        new THREE.Vector3(1, 0, 0),
      );
    }
    perp.normalize().multiplyScalar(0.2);

    const wingSize = 0.2;
    const verts: number[] = [];

    // Wing at "from" end
    verts.push(
      from[0] + perp.x * wingSize,
      from[1] + perp.y * wingSize,
      from[2] + perp.z * wingSize,
      from[0] - perp.x * wingSize,
      from[1] - perp.y * wingSize,
      from[2] - perp.z * wingSize,
    );

    // Wing at "to" end
    verts.push(
      to[0] + perp.x * wingSize,
      to[1] + perp.y * wingSize,
      to[2] + perp.z * wingSize,
      to[0] - perp.x * wingSize,
      to[1] - perp.y * wingSize,
      to[2] - perp.z * wingSize,
    );

    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(verts, 3),
    );
    return geo;
  }, [from, to]);

  // ── Animate opacity in ──
  const materialRef = useRef<THREE.LineDashedMaterial>(null);
  const wingMatRef = useRef<THREE.LineBasicMaterial>(null);
  const opacityRef = useRef(0);

  useFrame((_, delta) => {
    opacityRef.current = Math.min(1, opacityRef.current + delta * 4);
    const o = opacityRef.current * 0.5;
    if (materialRef.current) materialRef.current.opacity = o;
    if (wingMatRef.current) wingMatRef.current.opacity = o * 0.8;
  });

  const lineColor =
    direction === "outgoing" ? accentColor : "#e57373";

  return (
    <group ref={groupRef}>
      {/* ── Dashed measurement line ── */}
      <lineSegments geometry={lineGeo}>
        {/* @ts-ignore */}
        <lineDashedMaterial
          ref={materialRef}
          color={lineColor}
          dashSize={DASH_SIZE}
          gapSize={GAP_SIZE}
          scale={DASH_SCALE}
          transparent
          opacity={0}
          depthWrite={false}
        />
      </lineSegments>

      {/* ── End wings (perpendicular ticks) ── */}
      <lineSegments geometry={wingGeo}>
        <lineBasicMaterial
          ref={wingMatRef}
          color={lineColor}
          transparent
          opacity={0}
          depthWrite={false}
        />
      </lineSegments>

      {/* ── Distance label (HTML overlay) ── */}
      <Html
        position={labelPos}
        center
        distanceFactor={18}
        style={{
          pointerEvents: "none",
          userSelect: "none",
          opacity: opacityRef.current,
          transition: "opacity 200ms ease",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "9px",
            letterSpacing: "0.12em",
            color: lineColor,
            background: "color-mix(in srgb, var(--page-bg) 85%, transparent)",
            backdropFilter: "blur(4px)",
            WebkitBackdropFilter: "blur(4px)",
            padding: "2px 6px",
            borderRadius: "1px",
            border: `1px solid color-mix(in srgb, ${lineColor} 25%, transparent)`,
            whiteSpace: "nowrap",
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          <span style={{ opacity: 0.5 }}>
            {direction === "outgoing" ? "→" : "←"}
          </span>
          <span>{distance.toFixed(1)}u</span>
          {label && (
            <span style={{ opacity: 0.6, marginLeft: "2px" }}>
              "{label}"
            </span>
          )}
        </div>
      </Html>
    </group>
  );
}

// ============================================
// Measurement Lines Group
// ============================================

export function MeasurementLinesGroup({
  lines,
  accentColor = "#52B788",
}: MeasurementLinesProps) {
  if (lines.length === 0) return null;

  return (
    <group>
      {lines.map((line, i) => (
        <DimensionLine
          key={`${line.fromId}-${line.toId}-${i}`}
          {...line}
          accentColor={accentColor}
        />
      ))}
    </group>
  );
}
