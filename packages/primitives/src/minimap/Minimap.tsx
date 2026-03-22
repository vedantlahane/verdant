// primitives/src/minimap/Minimap.tsx

import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import type { MinimapConfig } from '../provider/PrimitivesConfig';

// ── Public Types ────────────────────────────────────────────

export interface MinimapNode {
  id: string;
  position: [number, number, number];
  color?: string;
  size?: number;
  selected?: boolean;
}

export interface MinimapEdge {
  fromPosition: [number, number, number];
  toPosition: [number, number, number];
  color?: string;
}

export interface MinimapGroup {
  id: string;
  bounds: { min: [number, number]; max: [number, number] };
  color?: string;
}

export interface MinimapProps {
  nodes: MinimapNode[];
  edges?: MinimapEdge[];
  groups?: MinimapGroup[];
  camera?: { position: [number, number, number]; zoom?: number };
  viewportSize?: { width: number; height: number };
  config?: MinimapConfig;
  onPan?: (worldPosition: [number, number]) => void;
}

// ── Constants ───────────────────────────────────────────────

const DEFAULT_WIDTH = 200;
const DEFAULT_HEIGHT = 150;
const NODE_RADIUS = 4;
const SELECTED_RADIUS = 6;
const PADDING = 16;
const EDGE_OPACITY = 0.25;

// ── Helpers ─────────────────────────────────────────────────

function getPositionStyle(
  position: MinimapConfig['position'],
): React.CSSProperties {
  switch (position) {
    case 'top-left': return { top: PADDING, left: PADDING };
    case 'top-right': return { top: PADDING, right: PADDING };
    case 'bottom-left': return { bottom: PADDING, left: PADDING };
    case 'bottom-right':
    default: return { bottom: PADDING, right: PADDING };
  }
}

interface WorldBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

function computeWorldBounds(
  nodes: MinimapNode[],
  groups?: MinimapGroup[],
): WorldBounds {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const node of nodes) {
    const [x, , z] = node.position; // XZ plane = 2D minimap
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (z < minY) minY = z;
    if (z > maxY) maxY = z;
  }

  if (groups) {
    for (const group of groups) {
      const { min, max } = group.bounds;
      if (min[0] < minX) minX = min[0];
      if (min[1] < minY) minY = min[1];
      if (max[0] > maxX) maxX = max[0];
      if (max[1] > maxY) maxY = max[1];
    }
  }

  // Fallback when empty
  if (!isFinite(minX)) {
    return { minX: -10, minY: -10, maxX: 10, maxY: 10 };
  }

  // Margin so edge nodes aren't clipped
  const marginX = Math.max((maxX - minX) * 0.1, 1);
  const marginY = Math.max((maxY - minY) * 0.1, 1);

  return {
    minX: minX - marginX,
    minY: minY - marginY,
    maxX: maxX + marginX,
    maxY: maxY + marginY,
  };
}

function worldToCanvas(
  wx: number,
  wz: number,
  bounds: WorldBounds,
  canvasW: number,
  canvasH: number,
): [number, number] {
  const rangeX = bounds.maxX - bounds.minX || 1;
  const rangeY = bounds.maxY - bounds.minY || 1;
  return [
    ((wx - bounds.minX) / rangeX) * canvasW,
    ((wz - bounds.minY) / rangeY) * canvasH,
  ];
}

function canvasToWorld(
  cx: number,
  cy: number,
  bounds: WorldBounds,
  canvasW: number,
  canvasH: number,
): [number, number] {
  const rangeX = bounds.maxX - bounds.minX || 1;
  const rangeY = bounds.maxY - bounds.minY || 1;
  return [
    (cx / canvasW) * rangeX + bounds.minX,
    (cy / canvasH) * rangeY + bounds.minY,
  ];
}

// ── Component ───────────────────────────────────────────────

export function Minimap({
  nodes,
  edges,
  groups,
  camera,
  viewportSize,
  config,
  onPan,
}: MinimapProps): React.ReactElement | null {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDragging = useRef(false);
  const rafRef = useRef<number>(0);

  // ── Dimensions ──
  const scale = config?.scale ?? 1;
  const width = Math.round(DEFAULT_WIDTH * scale);
  const height = Math.round(DEFAULT_HEIGHT * scale);
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

  // ── Memoize bounds ──
  const bounds = useMemo(
    () => computeWorldBounds(nodes, groups),
    [nodes, groups],
  );

  // ── Draw function ──
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;

    // Scale for HiDPI
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cW = width;
    const cH = height;

    // ── Background ──
    ctx.clearRect(0, 0, cW, cH);
    ctx.fillStyle = 'rgba(15, 15, 25, 0.88)';
    ctx.beginPath();
    ctx.roundRect(0, 0, cW, cH, 6);
    ctx.fill();

    // ── Border ──
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(0.5, 0.5, cW - 1, cH - 1, 6);
    ctx.stroke();

    // ── Group boundaries ──
    if (groups && groups.length > 0) {
      for (const group of groups) {
        const [x1, y1] = worldToCanvas(group.bounds.min[0], group.bounds.min[1], bounds, cW, cH);
        const [x2, y2] = worldToCanvas(group.bounds.max[0], group.bounds.max[1], bounds, cW, cH);
        ctx.strokeStyle = group.color
          ? `${group.color}80`
          : 'rgba(100, 160, 255, 0.35)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
      }
    }

    // ── Edges ──
    if (edges && edges.length > 0) {
      ctx.lineWidth = 0.5;
      for (const edge of edges) {
        const [fx, , fz] = edge.fromPosition;
        const [tx, , tz] = edge.toPosition;
        const [x1, y1] = worldToCanvas(fx, fz, bounds, cW, cH);
        const [x2, y2] = worldToCanvas(tx, tz, bounds, cW, cH);

        ctx.strokeStyle = edge.color
          ? `${edge.color}${Math.round(EDGE_OPACITY * 255).toString(16).padStart(2, '0')}`
          : `rgba(255, 255, 255, ${EDGE_OPACITY})`;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    }

    // ── Nodes ──
    for (const node of nodes) {
      const [wx, , wz] = node.position;
      const [cx, cy] = worldToCanvas(wx, wz, bounds, cW, cH);
      const isSelected = node.selected === true;
      const radius = isSelected
        ? SELECTED_RADIUS * (node.size ?? 1)
        : NODE_RADIUS * (node.size ?? 1);

      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = node.color ?? '#4a9eff';
      ctx.fill();

      // Selection ring
      if (isSelected) {
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, radius + 2, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // ── Viewport indicator ──
    if (camera && viewportSize) {
      const zoom = camera.zoom ?? 1;
      const [camX, , camZ] = camera.position;
      const halfW = (viewportSize.width / 2) / zoom;
      const halfH = (viewportSize.height / 2) / zoom;

      const [vx1, vy1] = worldToCanvas(camX - halfW, camZ - halfH, bounds, cW, cH);
      const [vx2, vy2] = worldToCanvas(camX + halfW, camZ + halfH, bounds, cW, cH);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.fillRect(vx1, vy1, vx2 - vx1, vy2 - vy1);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.strokeRect(vx1, vy1, vx2 - vx1, vy2 - vy1);
      ctx.setLineDash([]);
    }
  }, [nodes, edges, groups, camera, viewportSize, bounds, width, height, dpr]);

  // ── Redraw via RAF (once per frame max) ──
  useEffect(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [draw]);

  // ── Interaction helpers ──
  const getCanvasPos = useCallback(
    (clientX: number, clientY: number): [number, number] => {
      const canvas = canvasRef.current;
      if (!canvas) return [0, 0];
      const rect = canvas.getBoundingClientRect();
      return [clientX - rect.left, clientY - rect.top];
    },
    [],
  );

  const handleInteraction = useCallback(
    (cx: number, cy: number) => {
      if (!onPan) return;
      const [wx, wz] = canvasToWorld(cx, cy, bounds, width, height);
      onPan([wx, wz]);
    },
    [bounds, width, height, onPan],
  );

  // ── Mouse handlers ──
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      e.stopPropagation();
      isDragging.current = true;
      const [cx, cy] = getCanvasPos(e.clientX, e.clientY);
      handleInteraction(cx, cy);
    },
    [getCanvasPos, handleInteraction],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDragging.current) return;
      const [cx, cy] = getCanvasPos(e.clientX, e.clientY);
      handleInteraction(cx, cy);
    },
    [getCanvasPos, handleInteraction],
  );

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  // ── Touch handlers ──
  const handleTouchStart = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      isDragging.current = true;
      const touch = e.touches[0];
      const [cx, cy] = getCanvasPos(touch.clientX, touch.clientY);
      handleInteraction(cx, cy);
    },
    [getCanvasPos, handleInteraction],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      if (!isDragging.current) return;
      const touch = e.touches[0];
      const [cx, cy] = getCanvasPos(touch.clientX, touch.clientY);
      handleInteraction(cx, cy);
    },
    [getCanvasPos, handleInteraction],
  );

  const handleTouchEnd = useCallback(() => {
    isDragging.current = false;
  }, []);

  const positionStyle = getPositionStyle(config?.position);
  const opacity = config?.opacity ?? 1;

  return (
    <canvas
      ref={canvasRef}
      width={Math.round(width * dpr)}
      height={Math.round(height * dpr)}
      aria-label="Minimap: overview of the diagram"
      style={{
        position: 'absolute',
        ...positionStyle,
        width,
        height,
        cursor: 'crosshair',
        borderRadius: 6,
        zIndex: 100,
        opacity,
        pointerEvents: 'auto',
        touchAction: 'none',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    />
  );
}