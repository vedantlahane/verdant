// SceneContent.tsx

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { BaseEdge as EdgeLine } from '@verdant/primitives';
import { useRendererStore } from './store';
import { projectToScreen } from './utils';
import { BlueprintGroundPlane } from './grid/BlueprintGroundPlane';
import { DraggableNode } from './nodes/DraggableNode';
import { GroupBox } from './groups/GroupBox';
import { MeasurementLinesGroup } from './measurement/MeasurementLinesGroup';
import { MeasurementLine, VerdantRendererProps, PersistedViewState, CursorData } from './types';

interface SceneContentProps {
  autoRotate: boolean;
  showCoordinateSystem: boolean;
  onNodeClick?: VerdantRendererProps['onNodeClick'];
  onCursorMove?: (data: CursorData | null) => void;
  selectedNodeId?: string | null;
  initialTarget?: [number, number, number];
  onViewChange?: (view: PersistedViewState) => void;
}

export function SceneContent({
  autoRotate,
  showCoordinateSystem,
  onNodeClick,
  onCursorMove,
  selectedNodeId: externalSelectedId,
  initialTarget = [0, 0, 0],
  onViewChange,
}: SceneContentProps) {
  const ast = useRendererStore((s) => s.ast);
  const positions = useRendererStore((s) => s.positions);
  const selectedNodeId = useRendererStore((s) => s.selectedNodeId);
  const hoveredNodeId = useRendererStore((s) => s.hoveredNodeId);
  const themeColors = useRendererStore((s) => s.themeColors);
  const selectNode = useRendererStore((s) => s.selectNode);
  const hoverNode = useRendererStore((s) => s.hoverNode);
  const getNodeColor = useRendererStore((s) => s.getNodeColor);

  const { camera, size } = useThree();
  const gl = useThree((s) => s.gl);
  const controlsRef = useRef<any>(null);
  const idleTimerRef = useRef(0);
  const isInteractingRef = useRef(false);
  const lastViewPersistRef = useRef(0);

  // Cursor tracking reusable objects
  const cursorRaycaster = useMemo(() => new THREE.Raycaster(), []);
  const cursorPlaneRef = useRef(new THREE.Plane());
  const cursorNormalRef = useRef(new THREE.Vector3());
  const cursorPoint = useMemo(() => new THREE.Vector3(), []);

  const activeNodeId = externalSelectedId ?? selectedNodeId;

  // ── Measurement lines ──
  const measurementLines = useMemo<MeasurementLine[]>(() => {
    if (!activeNodeId || !ast) return [];
    const lines: MeasurementLine[] = [];

    for (const edge of ast.edges) {
      if (edge.from !== activeNodeId && edge.to !== activeNodeId) continue;

      const fromPos = positions[edge.from];
      const toPos = positions[edge.to];
      if (!fromPos || !toPos) continue;

      lines.push({
        from: fromPos,
        to: toPos,
        fromId: edge.from,
        toId: edge.to,
        label: edge.props.label as string | undefined,
        direction: edge.from === activeNodeId ? 'outgoing' : 'incoming',
      });
    }

    return lines;
  }, [activeNodeId, ast, positions]);

  // ── Auto-rotate with idle detection ──
  useFrame((_, delta) => {
    if (!controlsRef.current || !autoRotate) return;
    if (isInteractingRef.current) {
      idleTimerRef.current = 0;
    } else {
      idleTimerRef.current += delta;
      controlsRef.current.autoRotate = idleTimerRef.current > 3;
    }
  });

  // ── Cursor plane sync ──
  useFrame(() => {
    if (!controlsRef.current) return;

    camera.getWorldDirection(cursorNormalRef.current);
    const target = controlsRef.current.target as THREE.Vector3;
    cursorPlaneRef.current.setFromNormalAndCoplanarPoint(
      cursorNormalRef.current,
      target,
    );
  });

  // ── Callbacks ──
  const handleNodeClick = useCallback(
    (nodeId: string, position: [number, number, number], e: any) => {
      e.stopPropagation();
      selectNode(nodeId);
      if (onNodeClick) {
        const screen = projectToScreen(position, camera, size);
        onNodeClick({ nodeId, screenX: screen.x, screenY: screen.y });
      }
    },
    [camera, size, selectNode, onNodeClick],
  );

  const handleHoverEnter = useCallback(
    (id: string) => {
      hoverNode(id);
      if (typeof document !== 'undefined') {
        document.body.style.cursor = 'grab';
      }
    },
    [hoverNode],
  );

  const handleHoverLeave = useCallback(() => {
    hoverNode(null);
    if (typeof document !== 'undefined') {
      document.body.style.cursor = '';
    }
  }, [hoverNode]);

  const handlePointerMissed = useCallback(() => selectNode(null), [selectNode]);

  // ── Initial camera target ──
  useEffect(() => {
    if (!controlsRef.current) return;
    controlsRef.current.target.set(...initialTarget);
    controlsRef.current.update();
  }, [initialTarget]);

  // ── Cursor tracking ──
  useEffect(() => {
    if (!onCursorMove) return;

    const canvas = gl.domElement;

    const handleMove = (ev: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const ndc = new THREE.Vector2(
        ((ev.clientX - rect.left) / rect.width) * 2 - 1,
        -((ev.clientY - rect.top) / rect.height) * 2 + 1,
      );

      cursorRaycaster.setFromCamera(ndc, camera);
      const hit = cursorRaycaster.ray.intersectPlane(cursorPlaneRef.current, cursorPoint);
      if (!hit) {
        onCursorMove(null);
        return;
      }

      onCursorMove({
        x: Math.round(cursorPoint.x * 10) / 10,
        y: Math.round(cursorPoint.y * 10) / 10,
        z: Math.round(cursorPoint.z * 10) / 10,
      });
    };

    const handleLeave = () => onCursorMove(null);

    canvas.addEventListener('pointermove', handleMove);
    canvas.addEventListener('pointerleave', handleLeave);

    return () => {
      canvas.removeEventListener('pointermove', handleMove);
      canvas.removeEventListener('pointerleave', handleLeave);
    };
  }, [camera, cursorPoint, cursorRaycaster, gl, onCursorMove]);

  // ── View persistence handler ──
  const handleControlsChange = useCallback(() => {
    if (!onViewChange || !controlsRef.current) return;
    const now = performance.now();
    if (now - lastViewPersistRef.current < 180) return;
    lastViewPersistRef.current = now;

    const cam = controlsRef.current.object as THREE.PerspectiveCamera;
    const t = controlsRef.current.target as THREE.Vector3;
    onViewChange({
      position: [cam.position.x, cam.position.y, cam.position.z],
      target: [t.x, t.y, t.z],
      fov: cam.fov,
    });
  }, [onViewChange]);

  const handleInteractionStart = useCallback(() => {
    isInteractingRef.current = true;
    idleTimerRef.current = 0;
    if (controlsRef.current) controlsRef.current.autoRotate = false;
  }, []);

  const handleInteractionEnd = useCallback(() => {
    isInteractingRef.current = false;
  }, []);

  if (!ast) return null;

  return (
    <>
      {/* ── Lighting ── */}
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[10, 20, 10]}
        intensity={1.0}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <pointLight position={[-10, -10, -10]} intensity={0.2} />

      {/* ── Ground plane ── */}
      {showCoordinateSystem && <BlueprintGroundPlane />}

      {/* ── Measurement lines ── */}
      <MeasurementLinesGroup
        lines={measurementLines}
        accentColor={themeColors.accent}
      />

      {/* ── Scene objects ── */}
      <group onPointerMissed={handlePointerMissed}>
        {/* Nodes */}
        {ast.nodes.map((node) => {
          const position = positions[node.id] ?? [0, 0, 0];
          const isSelected = selectedNodeId === node.id;
          const isHovered = hoveredNodeId === node.id;
          const color = getNodeColor(
            node.type,
            node.props.color as string | undefined,
          );

          return (
            <DraggableNode
              key={node.id}
              node={node}
              position={position}
              isSelected={isSelected}
              isHovered={isHovered}
              color={color}
              controlsRef={controlsRef}
              onNodeClick={handleNodeClick}
              onHoverEnter={handleHoverEnter}
              onHoverLeave={handleHoverLeave}
            />
          );
        })}

        {/* Edges */}
        {ast.edges.map((edge, i) => {
          const fromPos = positions[edge.from];
          const toPos = positions[edge.to];
          if (!fromPos || !toPos) return null;

          return (
            <EdgeLine
              key={`edge-${edge.from}-${edge.to}-${i}`}
              from={fromPos}
              to={toPos}
              label={edge.props.label}
              animated={edge.props.style === 'animated' || !edge.props.style}
              style={edge.props.style || 'solid'}
              color={edge.props.color || themeColors.edgeDefault}
              width={edge.props.width}
            />
          );
        })}

        {/* Groups */}
        {ast.groups.map((group) => (
          <GroupBox
            key={`group-${group.id}`}
            group={group}
            positions={positions}
            themeColors={themeColors}
          />
        ))}
      </group>

      {/* ── Controls ── */}
      <OrbitControls
        ref={controlsRef}
        makeDefault
        enableDamping
        dampingFactor={0.05}
        minDistance={3}
        maxDistance={80}
        autoRotate={autoRotate}
        autoRotateSpeed={0.5}
        onChange={handleControlsChange}
        onStart={handleInteractionStart}
        onEnd={handleInteractionEnd}
      />
    </>
  );
}