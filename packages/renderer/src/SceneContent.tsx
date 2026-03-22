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
} from './types';
import { VEC3_ORIGIN } from './utils';
import {
  AUTO_ROTATE_SPEED,
  ORBIT_MIN_DISTANCE,
  ORBIT_MAX_DISTANCE,
  ORBIT_DAMPING_FACTOR,
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

  if (!ast || ast.groups.length === 0) return null;

  // Build a set of all group IDs that appear as children of other groups
  const nestedGroupIds = useMemo(() => {
    if (!ast) return new Set<string>();
    const nested = new Set<string>();
    const collectNested = (groups: typeof ast.groups) => {
      for (const g of groups) {
        for (const child of g.groups) {
          nested.add(child.id);
        }
        collectNested(g.groups);
      }
    };
    collectNested(ast.groups);
    return nested;
  }, [ast]);

  const renderGroup = useCallback(
    (group: (typeof ast.groups)[number], isNested: boolean) => {
      const collapsed = group.props?.collapsed === true;
      const GroupComponent = isNested ? NestedGroup : GroupContainer;
      return (
        <GroupComponent
          key={group.id}
          label={group.label}
          color={accentColor}
          collapsed={collapsed}
        >
          {group.groups.map((child) => renderGroup(child, true))}
        </GroupComponent>
      );
    },
    [accentColor],
  );

  return (
    <>
      {ast.groups.map((group) =>
        renderGroup(group, nestedGroupIds.has(group.id)),
      )}
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

export function SceneContent({
  autoRotate,
  showCoordinateSystem,
  onNodeClick,
  onCursorMove,
  selectedNodeId: externalSelectedId,
  initialTarget = VEC3_ORIGIN,
  onViewChange,
}: SceneContentProps) {
  const ast = useRendererStore((s) => s.ast);
  const themeColors = useRendererStore((s) => s.themeColors);
  const selectNode = useRendererStore((s) => s.selectNode);
  const hoverNode = useRendererStore((s) => s.hoverNode);
  const setContextMenu = useRendererStore((s) => s.setContextMenu);
  const selectedNodeId = useRendererStore((s) => s.selectedNodeId);

  const { camera, size } = useThree();
  const controlsRef = useRef<any>(null);

  // Resolve active node: external prop takes priority over store
  const activeNodeId = externalSelectedId ?? selectedNodeId;

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

  if (!ast) return null;

  return (
    <>
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
    </>
  );
}