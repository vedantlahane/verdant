// SceneContent.tsx

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PerspectiveCamera, Plane, Raycaster, Vector2, Vector3 } from 'three';
import { useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import {
  BaseEdge as EdgeLine,
  GroupContainer,
  NestedGroup,
  usePrimitives,
} from '@verdant/primitives';
import type { VrdAST } from '@verdant/parser';
import { useRendererStore } from './store';
import { projectToScreen, safeGroupWalk, computeSceneBounds, VEC3_ORIGIN, zoomToFit } from './utils';
import type { SceneBounds } from './types';

// ── New grid system (Phase 1) ──                                   ← CHANGED
import { InfiniteAxes } from './grid/InfiniteAxes';
import { PivotIndicator } from './grid/PivotIndicator';
import { NodeReferenceBox } from './grid/NodeReferenceBox';

import { DraggableNode } from './nodes/DraggableNode';
import { MeasurementLinesGroup } from './measurement/MeasurementLinesGroup';
import { useAutoRotate } from './hooks/useAutoRotate';
import { useCursorTracking } from './hooks/useCursorTracking';
import { useKeyboardNavigation } from './hooks/useKeyboardNavigation';
import { usePrimitivesSync } from './hooks/usePrimitivesSync';
import { useViewPersistence } from './hooks/useViewPersistence';
import type {
  SceneContentProps,
  MeasurementLine,
  Vec3,
  VerdantRendererHandle,
} from './types';
import {
  AUTO_ROTATE_SPEED,
  ORBIT_MIN_DISTANCE,
  ORBIT_MAX_DISTANCE,
  ORBIT_DAMPING_FACTOR,
  DEFAULT_CAMERA_POSITION,
  DEFAULT_CAMERA_FOV,
  DEFAULT_CAMERA_TARGET,
} from './constants';

// ═══════════════════════════════════════════════════════════════════
//  Typed Controls Ref (Bug fix — replaces 8+ `React.RefObject<any>`)
// ═══════════════════════════════════════════════════════════════════

/** Structural type for drei OrbitControls ref */
interface OrbitControlsImpl {
  target: Vector3;
  update: () => void;
  autoRotate: boolean;
  autoRotateSpeed: number;
  enabled: boolean;
}

// ═══════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════
//  Measurement Lines Hook
// ═══════════════════════════════════════════════════════════════════

function useMeasurementLines(
  activeNodeId: string | null,
): readonly MeasurementLine[] {
  const ast = useRendererStore((s) => s.ast);
  const positions = useRendererStore((s) => s.positions);

  return useMemo(() => {
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
}

// ═══════════════════════════════════════════════════════════════════
//  Group Utilities (Bug #16 — centralized using safeGroupWalk)
// ═══════════════════════════════════════════════════════════════════

/** Collect all descendant node IDs for a group (including nested subgroups) */
function collectGroupNodeIds(group: VrdAST['groups'][number]): string[] {
  const ids: string[] = [...group.children];
  safeGroupWalk(group.groups, (child) => {
    ids.push(...child.children);
  });
  return ids;
}

/** Compute axis-aligned bounds from a set of node positions with padding */
function computeGroupBounds(
  nodeIds: string[],
  positions: Readonly<Record<string, Vec3>>,
  padding: number,
): { position: [number, number, number]; size: [number, number, number]; hasValid: boolean } {
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  let hasValid = false;

  for (const id of nodeIds) {
    const p = positions[id];
    if (!p) continue;
    hasValid = true;
    if (p[0] < minX) minX = p[0];
    if (p[0] > maxX) maxX = p[0];
    if (p[1] < minY) minY = p[1];
    if (p[1] > maxY) maxY = p[1];
    if (p[2] < minZ) minZ = p[2];
    if (p[2] > maxZ) maxZ = p[2];
  }

  if (!hasValid) {
    return { position: [0, 0, 0], size: [4, 4, 4], hasValid: false };
  }

  return {
    position: [
      (minX + maxX) / 2,
      (minY + maxY) / 2,
      (minZ + maxZ) / 2,
    ],
    size: [
      Math.max(maxX - minX + padding * 2, 4),
      Math.max(maxY - minY + padding * 2, 4),
      Math.max(maxZ - minZ + padding * 2, 4),
    ],
    hasValid: true,
  };
}

// ═══════════════════════════════════════════════════════════════════
//  Edge Rendering
// ═══════════════════════════════════════════════════════════════════

interface EdgesLayerProps {
  readonly accentColor: string;
}

const EdgesLayer = React.memo(function EdgesLayer({
  accentColor,
}: EdgesLayerProps) {
  const ast = useRendererStore((s) => s.ast);
  const positions = useRendererStore((s) => s.positions);

  if (!ast) return null;

  return (
    <>
      {ast.edges.map((edge, i) => {
        const fromPos = positions[edge.from];
        const toPos = positions[edge.to];
        if (!fromPos || !toPos) return null;

        const flowParticles =
          edge.props.flow === true
            ? {
                speed: edge.props.flowSpeed as number | undefined,
                count: edge.props.flowCount as number | undefined,
                color: edge.props.flowColor as string | undefined,
              }
            : undefined;

        return (
          <EdgeLine
            key={`edge-${edge.from}-${edge.to}-${i}`}
            from={fromPos}
            to={toPos}
            label={edge.props.label ?? ''}
            animated={edge.props.style === 'animated' || !edge.props.style}
            style={edge.props.style || 'solid'}
            color={edge.props.color || accentColor}
            width={edge.props.width}
            routing={edge.props.routing}
            fromPort={edge.props.fromPort}
            toPort={edge.props.toPort}
            fromNodeId={edge.from}
            toNodeId={edge.to}
            flowParticles={flowParticles}
          />
        );
      })}
    </>
  );
});

// ═══════════════════════════════════════════════════════════════════
//  Groups Rendering (Bug #9, #16 — memoized + safeGroupWalk)
// ═══════════════════════════════════════════════════════════════════

interface GroupsLayerProps {
  readonly accentColor: string;
}

const GroupsLayer = React.memo(function GroupsLayer({
  accentColor,
}: GroupsLayerProps) {
  const ast = useRendererStore((s) => s.ast);
  const positions = useRendererStore((s) => s.positions);

  const groupData = useMemo(() => {                                   // ← CHANGED: memoized (Bug #9)
    if (!ast) return [];

    const result: Array<{
      id: string;
      label: string;
      depth: number;
      collapsed: boolean;
      position: [number, number, number];
      size: [number, number, number];
    }> = [];

    safeGroupWalk(ast.groups, (group, depth) => {                     // ← CHANGED: uses safeGroupWalk (Bug #16)
      const nodeIds = collectGroupNodeIds(group);
      const bounds = computeGroupBounds(nodeIds, positions, 2.5);

      result.push({
        id: group.id,
        label: group.label ?? '',
        depth,
        collapsed: group.props?.collapsed === true,
        position: bounds.position,
        size: bounds.size,
      });
    });

    return result;
  }, [ast, positions]);

  if (groupData.length === 0) return null;

  return (
    <>
      {groupData.map((g) => {
        const GroupComponent = g.depth > 0 ? NestedGroup : GroupContainer;
        return (
          <GroupComponent
            key={g.id}
            label={g.label}
            color={accentColor}
            collapsed={g.collapsed}
            size={g.size}
            position={g.position}
            depth={g.depth}
          />
        );
      })}
    </>
  );
});

// ═══════════════════════════════════════════════════════════════════
//  Nodes Rendering
// ═══════════════════════════════════════════════════════════════════

interface NodesLayerProps {
  readonly controlsRef: React.RefObject<OrbitControlsImpl | null>;    // ← CHANGED: typed ref
  readonly onNodeClick: (nodeId: string, pos: Vec3, e: any) => void;
  readonly onHoverEnter: (id: string) => void;
  readonly onHoverLeave: () => void;
}

const NodesLayer = React.memo(function NodesLayer({
  controlsRef,
  onNodeClick,
  onHoverEnter,
  onHoverLeave,
}: NodesLayerProps) {
  const ast = useRendererStore((s) => s.ast);
  const positions = useRendererStore((s) => s.positions);
  const selectionSet = useRendererStore((s) => s.selectionSet);
  const hoveredNodeId = useRendererStore((s) => s.hoveredNodeId);
  const getNodeColor = useRendererStore((s) => s.getNodeColor);

  if (!ast) return null;

  return (
    <>
      {ast.nodes.map((node) => {
        const position = positions[node.id] ?? VEC3_ORIGIN;
        return (
          <DraggableNode
            key={node.id}
            node={node}
            position={position}
            isSelected={selectionSet.has(node.id)}
            isHovered={hoveredNodeId === node.id}
            color={getNodeColor(
              node.type,
              node.props.color as string | undefined,
            )}
            controlsRef={controlsRef}
            onNodeClick={onNodeClick}
            onHoverEnter={onHoverEnter}
            onHoverLeave={onHoverLeave}
          />
        );
      })}
    </>
  );
});

// ═══════════════════════════════════════════════════════════════════
//  Lighting
// ═══════════════════════════════════════════════════════════════════

const SHADOW_MAP_SIZE: [number, number] = [1024, 1024];

const SceneLighting = React.memo(function SceneLighting() {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[10, 20, 10]}
        intensity={1.0}
        castShadow
        shadow-mapSize={SHADOW_MAP_SIZE}
      />
      <pointLight position={[-10, -10, -10]} intensity={0.2} />
    </>
  );
});

// ═══════════════════════════════════════════════════════════════════
//  Double-click pivot — pooled objects (zero alloc)
// ═══════════════════════════════════════════════════════════════════

const _dblClickRaycaster = new Raycaster();
const _dblClickNDC = new Vector2();
const _dblClickNormal = new Vector3();
const _dblClickPlane = new Plane();
const _dblClickHit = new Vector3();
const _dblClickOffset = new Vector3();

// ═══════════════════════════════════════════════════════════════════
//  Main Component
// ═══════════════════════════════════════════════════════════════════

export const SceneContent = React.forwardRef<
  VerdantRendererHandle,
  SceneContentProps
>(
  (
    {
      autoRotate,
      showCoordinateSystem,
      onNodeClick,
      onCursorMove,
      selectedNodeId: externalSelectedId,
      initialTarget = VEC3_ORIGIN,
      onViewChange,
    },
    ref,
  ) => {
    const ast = useRendererStore((s) => s.ast);
    const themeColors = useRendererStore((s) => s.themeColors);
    const selectNode = useRendererStore((s) => s.selectNode);
    const hoverNode = useRendererStore((s) => s.hoverNode);
    const setContextMenu = useRendererStore((s) => s.setContextMenu);
    const selectedNodeId = useRendererStore((s) => s.selectedNodeId);
    const positions = useRendererStore((s) => s.positions);

    const { camera, gl, size } = useThree();

    const controlsRef = useRef<OrbitControlsImpl | null>(null);       // ← CHANGED: typed ref

    // Track orbit target for PivotIndicator (useState so mutations trigger re-render)
    const [orbitTarget, setOrbitTarget] = React.useState<Vec3>(initialTarget);

    const activeNodeId = externalSelectedId ?? selectedNodeId;

    const { commandHistory } = usePrimitives();

    // ── Unified zoomToFit (Bug #2) ──                              ← CHANGED

    const handleZoomToFit = useCallback(() => {
      zoomToFit(positions, camera, controlsRef.current);
    }, [positions, camera]);

    const resetCamera = useCallback(() => {
      if (!controlsRef.current) return;
      camera.position.set(
        DEFAULT_CAMERA_POSITION[0],
        DEFAULT_CAMERA_POSITION[1],
        DEFAULT_CAMERA_POSITION[2],
      );
      (camera as PerspectiveCamera).fov = DEFAULT_CAMERA_FOV;
      camera.updateProjectionMatrix();

      controlsRef.current.target.set(
        DEFAULT_CAMERA_TARGET[0],
        DEFAULT_CAMERA_TARGET[1],
        DEFAULT_CAMERA_TARGET[2],
      );
      controlsRef.current.update();
      setOrbitTarget(DEFAULT_CAMERA_TARGET);
    }, [camera]);

    React.useImperativeHandle(
      ref,
      () => ({
        undo: () => commandHistory?.undo(),
        redo: () => commandHistory?.redo(),
        zoomToFit: handleZoomToFit,
        resetCamera,
      }),
      [commandHistory, handleZoomToFit, resetCamera],
    );

    // ── Hooks ──

    const { handleInteractionStart, handleInteractionEnd } =
      useAutoRotate(controlsRef, autoRotate);

    useCursorTracking(controlsRef, onCursorMove);

    usePrimitivesSync();

    useKeyboardNavigation(controlsRef);

    const handleControlsChange = useViewPersistence(controlsRef, onViewChange);

    // ── Measurement lines ──

    const measurementLines = useMeasurementLines(activeNodeId);

    // ── Initial camera target ──

    useEffect(() => {
      if (!controlsRef.current) return;
      controlsRef.current.target.set(
        initialTarget[0],
        initialTarget[1],
        initialTarget[2],
      );
      controlsRef.current.update();
      setOrbitTarget(initialTarget);
    }, [initialTarget]);

    // ── Interaction callbacks ──

    const handleNodeClick = useCallback(
      (nodeId: string, position: Vec3, e: any) => {
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

    const handlePointerMissed = useCallback(
      () => selectNode(null),
      [selectNode],
    );

    // Bug #12 fix: detect whether we're clicking a node or empty canvas
    const handleContextMenu = useCallback(
      (e: any) => {
        e.stopPropagation();
        const nativeEvent = e.nativeEvent as MouseEvent | undefined;

        // Check whether the event actually intersected a scene object
        // (not just whether something happens to be selected)
        const hitNodeId =
          e.intersections?.length > 0 && e.object?.userData?.nodeId
            ? (e.object.userData.nodeId as string)
            : undefined;

        setContextMenu({
          visible: true,
          x: nativeEvent?.clientX ?? 0,
          y: nativeEvent?.clientY ?? 0,
          targetId: hitNodeId,
          targetType: hitNodeId ? 'node' : 'canvas',
        });
      },
      [setContextMenu],
    );

    // ── Double-click-to-pivot via native handler ──
    // Uses camera-perpendicular plane at orbit target depth, so it works
    // at ANY click position — no dependency on RaycastFloor geometry.
    useEffect(() => {
      const canvas = gl.domElement;

      const onDblClick = (event: MouseEvent) => {
        if (!controlsRef.current) return;

        const rect = canvas.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return;

        _dblClickNDC.set(
          ((event.clientX - rect.left) / rect.width) * 2 - 1,
          -((event.clientY - rect.top) / rect.height) * 2 + 1,
        );

        // Project onto plane perpendicular to camera at current orbit target depth
        camera.getWorldDirection(_dblClickNormal);
        _dblClickPlane.setFromNormalAndCoplanarPoint(
          _dblClickNormal,
          controlsRef.current.target,
        );

        _dblClickRaycaster.setFromCamera(_dblClickNDC, camera);
        const hit = _dblClickRaycaster.ray.intersectPlane(
          _dblClickPlane,
          _dblClickHit,
        );
        if (!hit) return;

        // Shift camera + orbit target together so view direction is preserved
        _dblClickOffset.subVectors(_dblClickHit, controlsRef.current.target);
        camera.position.add(_dblClickOffset);
        controlsRef.current.target.copy(_dblClickHit);
        controlsRef.current.update();

        setOrbitTarget([_dblClickHit.x, _dblClickHit.y, _dblClickHit.z]);
      };

      canvas.addEventListener('dblclick', onDblClick);
      return () => canvas.removeEventListener('dblclick', onDblClick);
    }, [camera, gl, setOrbitTarget]);

    if (!ast) return null;

    return (
      <group>
        <SceneLighting />

        {showCoordinateSystem && (
          <>
            <InfiniteAxes />
            <PivotIndicator target={orbitTarget} />
            <NodeReferenceBox mode="selected" />
          </>
        )}

        <MeasurementLinesGroup
          lines={measurementLines}
          accentColor={themeColors.accent}
        />

        <group
          onPointerMissed={handlePointerMissed}
          onContextMenu={handleContextMenu}
        >
          <NodesLayer
            controlsRef={controlsRef}
            onNodeClick={handleNodeClick}
            onHoverEnter={handleHoverEnter}
            onHoverLeave={handleHoverLeave}
          />
          <EdgesLayer accentColor={themeColors.edgeDefault} />
          <GroupsLayer accentColor={themeColors.accent} />
        </group>

        <OrbitControls
          ref={controlsRef as React.RefObject<any>}
          makeDefault
          enableDamping
          dampingFactor={ORBIT_DAMPING_FACTOR}
          minDistance={ORBIT_MIN_DISTANCE}
          maxDistance={ORBIT_MAX_DISTANCE}
          autoRotate={autoRotate}
          autoRotateSpeed={AUTO_ROTATE_SPEED}
          onChange={handleControlsChange}
          onStart={handleInteractionStart}
          onEnd={handleInteractionEnd}
        />
      </group>
    );
  },
);

SceneContent.displayName = 'SceneContent';