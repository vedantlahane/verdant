"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
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

const DASH_SIZE = 0.3;
const GAP_SIZE  = 0.2;

// ============================================
// Single Dimension Line
// ============================================

function DimensionLine({
  from,
  to,
  label,
  direction,
  accentColor,
}: MeasurementLine & { accentColor: string }) {
  const lineColor = direction === "outgoing" ? accentColor : "#e57373";

  // ── Main line geometry (with computeLineDistances for dashes) ──
  const { lineGeo, lineMat } = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute([...from, ...to], 3),
    );

        // Required for LineDashedMaterial to render dashes
    const tmpLine = new THREE.Line(geo);
    tmpLine.computeLineDistances();
    const finalGeo = tmpLine.geometry;

    const mat = new THREE.LineDashedMaterial({
      color: lineColor,
      dashSize: DASH_SIZE,
      gapSize: GAP_SIZE,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });

    return { lineGeo: finalGeo, lineMat: mat };
  }, [from, to, lineColor]);

  // ── Dispose on unmount ──
  useEffect(() => {
    return () => {
      lineGeo.dispose();
      lineMat.dispose();
    };
  }, [lineGeo, lineMat]);

  // ── Wing geometry (perpendicular ticks at each end) ──
  const { wingGeo, wingMat } = useMemo(() => {
    const dir = new THREE.Vector3(
      to[0] - from[0],
      to[1] - from[1],
      to[2] - from[2],
    ).normalize();

    const up = new THREE.Vector3(0, 1, 0);
    let perp = new THREE.Vector3().crossVectors(dir, up);
    if (perp.lengthSq() < 0.001) {
      perp = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(1, 0, 0));
    }
    perp.normalize().multiplyScalar(0.2);

    const W = 0.2;
    const verts: number[] = [
      // Wing at "from"
      from[0] + perp.x * W, from[1] + perp.y * W, from[2] + perp.z * W,
      from[0] - perp.x * W, from[1] - perp.y * W, from[2] - perp.z * W,
      // Wing at "to"
      to[0] + perp.x * W, to[1] + perp.y * W, to[2] + perp.z * W,
      to[0] - perp.x * W, to[1] - perp.y * W, to[2] - perp.z * W,
    ];

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));

    const mat = new THREE.LineBasicMaterial({
      color: lineColor,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });

    return { wingGeo: geo, wingMat: mat };
  }, [from, to, lineColor]);

  useEffect(() => {
    return () => {
      wingGeo.dispose();
      wingMat.dispose();
    };
  }, [wingGeo, wingMat]);

  // ── Distance (world units) ──
  const distance = useMemo(() => {
    const dx = to[0] - from[0];
    const dy = to[1] - from[1];
    const dz = to[2] - from[2];
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }, [from, to]);

  // ── Label position: midpoint + slight offset perpendicular to line ──
  const labelPos = useMemo<[number, number, number]>(() => {
    return [
      (from[0] + to[0]) / 2,
      (from[1] + to[1]) / 2 + 0.35,
      (from[2] + to[2]) / 2,
    ];
  }, [from, to]);

  // ── Animate opacity in on mount — drive via ref to avoid React re-renders ──
  const opacityRef  = useRef(0);
  const labelDivRef = useRef<HTMLDivElement>(null);

  useFrame((_, delta) => {
    opacityRef.current = Math.min(1, opacityRef.current + delta * 4);
    const o = opacityRef.current;

    // Drive Three.js material opacity directly (no setState)
    lineMat.opacity  = o * 0.55;
    wingMat.opacity  = o * 0.45;

    // Drive HTML label opacity via DOM ref (no setState)
    if (labelDivRef.current) {
      labelDivRef.current.style.opacity = String(o);
    }
  });

  return (
    <group>
      {/* ── Dashed line ── */}
      <lineSegments geometry={lineGeo} material={lineMat} />

      {/* ── End wings ── */}
      <lineSegments geometry={wingGeo} material={wingMat} />

      {/* ── Label ── */}
      <Html
        position={labelPos}
        center
        distanceFactor={18}
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        <div
          ref={labelDivRef}
          style={{
            opacity: 0,  // start hidden; useFrame drives it via ref
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