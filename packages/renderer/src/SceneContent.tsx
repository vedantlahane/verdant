// SceneContent.tsx

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import {
  BaseEdge as EdgeLine,
  GroupContainer,
  NestedGroup,
  usePrimitives,
} from '@verdant/primitives';
import { useRendererStore } from './store';
import type { VrdAST } from '@verdant/parser';
import { projectToScreen } from './utils';
import { BlueprintGroundPlane } from './grid/BlueprintGroundPlane';
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
  CursorData,
  PersistedViewState,
  VerdantRendererHandle,
} from './types';
import { VEC3_ORIGIN, VEC3_ORIGIN as ORIGIN } from './utils';
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
//  Measurement Lines Hook
//
//  Computes the set of measurement lines connecting the active
//  (selected) node to its neighbors via edges.
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
//  Edge Rendering
//
//  Extracted to avoid re-creating edge element arrays when only
//  node selection or hover state changes.
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
            label={edge.props.label}
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
//  Groups Rendering
// ═══════════════════════════════════════════════════════════════════

interface GroupsLayerProps {
  readonly accentColor: string;
}

const GroupsLayer = React.memo(function GroupsLayer({
  accentColor,
}: GroupsLayerProps) {
  const ast = useRendererStore((s) => s.ast);
  const positions = useRendererStore((s) => s.positions);

  if (!ast) return null;

  // Render all groups mapped to their absolute positions as flat children.
  const flatGroups: Array<{ group: VrdAST['groups'][number]; depth: number }> = [];
  const getSubtreeGroups = (groups: typeof ast.groups, depth: number) => {
    for (const g of groups) {
      flatGroups.push({ group: g, depth });
      getSubtreeGroups(g.groups, depth + 1);
    }
  };
  getSubtreeGroups(ast.groups, 0);

  // Helper to recursively collect all node IDs for bounds calculation
  const getGroupNodeIds = (group: VrdAST['groups'][number]): string[] => {
    let ids = [...group.children];
    for (const childGroup of group.groups) {
      ids = ids.concat(getGroupNodeIds(childGroup));
    }
    return ids;
  };

  return (
    <>
      {flatGroups.map(({ group, depth }) => {
        const nodeIds = getGroupNodeIds(group);
        let minX = Infinity, minY = Infinity, minZ = Infinity;
        let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
        let hasValid = false;

        for (const id of nodeIds) {
          const p = positions[id];
          if (p) {
            hasValid = true;
            if (p[0] < minX) minX = p[0];
            if (p[0] > maxX) maxX = p[0];
            if (p[1] < minY) minY = p[1];
            if (p[1] > maxY) maxY = p[1];
            if (p[2] < minZ) minZ = p[2];
            if (p[2] > maxZ) maxZ = p[2];
          }
        }

        const padding = 2.5;
        let position: [number, number, number] = [0, 0, 0];
        let size: [number, number, number] = [4, 4, 4];

        if (hasValid) {
          const w = Math.max(maxX - minX + padding * 2, 4);
          const h = Math.max(maxY - minY + padding * 2, 4);
          const d = Math.max(maxZ - minZ + padding * 2, 4);
          size = [w, h, d];
          position = [
            (minX + maxX) / 2,
            (minY + maxY) / 2,
            (minZ + maxZ) / 2,
          ];
        }

        const collapsed = group.props?.collapsed === true;
        const GroupComponent = depth > 0 ? NestedGroup : GroupContainer;

        return (
          <GroupComponent
            key={group.id}
            label={group.label}
            color={accentColor}
            collapsed={collapsed}
            size={size}
            position={position}
            depth={depth}
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
  readonly controlsRef: React.RefObject<any>;
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
  const selectedNodeId = useRendererStore((s) => s.selectedNodeId);
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
            isSelected={selectedNodeId === node.id}
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

    const { camera, size } = useThree();

  const controlsRef = useRef<any>(null);

  // Resolve active node: external prop takes priority over store
  const activeNodeId = externalSelectedId ?? selectedNodeId;

    const { commandHistory } = usePrimitives();

    const zoomToFit = useCallback(() => {
      if (!ast || ast.nodes.length === 0 || !controlsRef.current) return;

      const box = new THREE.Box3();
      for (const node of ast.nodes) {
        const pos = positions[node.id];
        if (pos) {
          box.expandByPoint(new THREE.Vector3(pos[0], pos[1], pos[2]));
        }
      }

      if (box.isEmpty()) return;

      const center = new THREE.Vector3();
      box.getCenter(center);

      const size = new THREE.Vector3();
      box.getSize(size);

      // Get max dimension for scaling
      const maxDim = Math.max(size.x, size.y, size.z, 20); // enforce min bounding bounds
      const fov = (camera as THREE.PerspectiveCamera).fov ?? 45;

      // Distance to fit the box
      let distance = maxDim / (2 * Math.tan((Math.PI * fov) / 360));
      // Buffer factor
      distance = Math.max(distance * 1.5, 30);

      // New camera position: relative to center
      const offset = new THREE.Vector3(0, 0.5, 1).normalize().multiplyScalar(distance);
      const newPos = center.clone().add(offset);

      // Apply
      camera.position.set(newPos.x, newPos.y, newPos.z);
      controlsRef.current.target.set(center.x, center.y, center.z);
      controlsRef.current.update();
    }, [ast, positions, camera]);

    const resetCamera = useCallback(() => {
      if (!controlsRef.current) return;
      camera.position.set(
        DEFAULT_CAMERA_POSITION[0],
        DEFAULT_CAMERA_POSITION[1],
        DEFAULT_CAMERA_POSITION[2],
      );
      (camera as THREE.PerspectiveCamera).fov = DEFAULT_CAMERA_FOV;
      camera.updateProjectionMatrix();

      controlsRef.current.target.set(
        DEFAULT_CAMERA_TARGET[0],
        DEFAULT_CAMERA_TARGET[1],
        DEFAULT_CAMERA_TARGET[2],
      );
      controlsRef.current.update();
    }, [camera]);

    React.useImperativeHandle(
      ref,
      () => ({
        undo: () => commandHistory?.undo(),
        redo: () => commandHistory?.redo(),
        zoomToFit,
        resetCamera,
      }),
      [commandHistory, zoomToFit, resetCamera],
    );

    // ── Hooks ──

    const { isInteractingRef, handleInteractionStart, handleInteractionEnd } =
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

  const handleContextMenu = useCallback(
    (e: any) => {
      e.stopPropagation();
      const nativeEvent = e.nativeEvent as MouseEvent | undefined;
      setContextMenu({
        visible: true,
        x: nativeEvent?.clientX ?? 0,
        y: nativeEvent?.clientY ?? 0,
        targetId: selectedNodeId ?? undefined,
        targetType: 'node',
      });
    },
    [selectedNodeId, setContextMenu],
  );

  const handleDoubleClick = useCallback((e: any) => {
    e.stopPropagation();
    if (!controlsRef.current) return;
    
    // Shift rotation pivot to exactly where the user double-clicks (cursor pointer)
    const newTarget = e.point as THREE.Vector3;
    const controls = controlsRef.current;
    
    // Mathematically shift the camera by the same relative offset to prevent screen-jump
    const offset = new THREE.Vector3().subVectors(newTarget, controls.target);
    camera.position.add(offset);
    
    controls.target.copy(newTarget);
    controls.update();
  }, [camera]);

  if (!ast) return null;

  return (
    <group onDoubleClick={handleDoubleClick}>
      <SceneLighting />

      {showCoordinateSystem && <BlueprintGroundPlane />}

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
        ref={controlsRef}
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
});