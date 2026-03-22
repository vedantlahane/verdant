// nodes/DraggableNode.tsx

import React, { useCallback, useRef } from 'react';
import type { NodeProps } from '@verdant/primitives';
import { useDraggable } from '../hooks/useDraggable';
import type { DraggableHandlers } from '../hooks/useDraggable';
import { getNodeComponent } from './nodeMap';
import type { Vec3, MutVec3 } from '../types';

// ═══════════════════════════════════════════════════════════════════
//  Types
// ═══════════════════════════════════════════════════════════════════

export interface DraggableNodeProps {
  /** VRD node data (id, type, props) */
  readonly node: Readonly<{
    id: string;
    type: string;
    props: Readonly<Record<string, unknown>>;
  }>;

  /** Current world-space position */
  readonly position: Vec3;

  /** Whether this node is in the selection set */
  readonly isSelected: boolean;

  /** Whether the pointer is over this node */
  readonly isHovered: boolean;

  /** Resolved color (custom or theme-derived) */
  readonly color: string;

  /** Ref to the OrbitControls — disabled during drag */
  readonly controlsRef: React.RefObject<any>;

  /** Click handler — receives node ID, position, and event */
  readonly onNodeClick: (nodeId: string, pos: Vec3, e: any) => void;

  /** Pointer enter handler */
  readonly onHoverEnter: (id: string) => void;

  /** Pointer leave handler */
  readonly onHoverLeave: () => void;
}

// ═══════════════════════════════════════════════════════════════════
//  Node Props Builder
//
//  Builds the props object passed to the visual node component.
//  Extracted to keep the render body clean and to enable future
//  extension (e.g., adding badge/port/status props).
// ═══════════════════════════════════════════════════════════════════

function buildNodeProps(
  node: DraggableNodeProps['node'],
  position: Vec3,
  isSelected: boolean,
  isHovered: boolean,
  color: string,
  onClick: (e: any) => void,
  onPointerOver: (e: any) => void,
  onPointerOut: () => void,
): NodeProps {
  return {
    label: (node.props.label as string) || node.id,
    position,
    selected: isSelected,
    hovered: isHovered,
    color,
    size: (node.props.size as string) || 'md',
    glow: node.props.glow === true,
    shape: node.props.shape as string | undefined,
    status: node.props.status as any,
    badges: node.props.badges as any,
    ports: node.props.ports as any,
    onClick,
    onPointerOver,
    onPointerOut,
  };
}

// ═══════════════════════════════════════════════════════════════════
//  Component
//
//  Wraps a visual node component with drag behavior.
//
//  Separation of concerns:
//  - Visual appearance: delegated to the node component from nodeMap
//  - Drag mechanics: delegated to useDraggable hook
//  - This component: glues them together + handles controls toggle
//
//  Performance:
//  - React.memo with custom comparator avoids re-render when
//    the positions record gets a new reference but this node's
//    position hasn't changed
//  - positionRef is updated on every render (via assignment, not
//    setState) so the drag hook always reads the latest position
//    without causing re-renders
//  - Event handlers are stable useCallback refs
// ═══════════════════════════════════════════════════════════════════

export const DraggableNode = React.memo(
  function DraggableNode({
    node,
    position,
    isSelected,
    isHovered,
    color,
    controlsRef,
    onNodeClick,
    onHoverEnter,
    onHoverLeave,
  }: DraggableNodeProps) {
    const Component = getNodeComponent(node.type);

    // Mutable ref for the drag hook — updated every render
    // so the hook always reads the latest position without
    // being a dependency (which would recreate the callbacks)
    const positionRef = useRef<MutVec3>(position as MutVec3);
    positionRef.current = position as MutVec3;

    // ── Drag callbacks ──

    const handleDragStart = useCallback(() => {
      if (controlsRef.current) {
        controlsRef.current.enabled = false;
      }
    }, [controlsRef]);

    const handleDragEnd = useCallback(() => {
      if (controlsRef.current) {
        controlsRef.current.enabled = true;
      }
    }, [controlsRef]);

    const { onPointerDown, onPointerMove, onPointerUp, hasMoved } =
      useDraggable({
        nodeId: node.id,
        positionRef,
        onDragStart: handleDragStart,
        onDragEnd: handleDragEnd,
      });

    // ── Interaction callbacks ──

    const handleClick = useCallback(
      (e: any) => {
        if (hasMoved) return;
        onNodeClick(node.id, positionRef.current, e);
      },
      [node.id, onNodeClick, hasMoved], // Added hasMoved dependency
    );

    const handlePointerOver = useCallback(
      (e: any) => {
        e.stopPropagation();
        onHoverEnter(node.id);
      },
      [node.id, onHoverEnter],
    );

    // ── Build props ──

    const nodeProps = buildNodeProps(
      node,
      position,
      isSelected,
      isHovered,
      color,
      handleClick,
      handlePointerOver,
      onHoverLeave,
    );

    return (
      <group
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <Component {...nodeProps} />
      </group>
    );
  },
  (prev, next) => {
    // Node identity changed
    if (prev.node.id !== next.node.id) return false;
    if (prev.node.type !== next.node.type) return false;

    // Visual state changed
    if (prev.isSelected !== next.isSelected) return false;
    if (prev.isHovered !== next.isHovered) return false;
    if (prev.color !== next.color) return false;

    // Position changed (value equality, not reference)
    const pp = prev.position;
    const np = next.position;
    if (pp[0] !== np[0] || pp[1] !== np[1] || pp[2] !== np[2]) return false;

    // Node props that affect rendering
    if (prev.node.props.label !== next.node.props.label) return false;
    if (prev.node.props.size !== next.node.props.size) return false;
    if (prev.node.props.glow !== next.node.props.glow) return false;
    if (prev.node.props.shape !== next.node.props.shape) return false;
    if (prev.node.props.status !== next.node.props.status) return false;

    // Callback identity (stable refs from parent — should not change)
    if (prev.onNodeClick !== next.onNodeClick) return false;
    if (prev.onHoverEnter !== next.onHoverEnter) return false;
    if (prev.onHoverLeave !== next.onHoverLeave) return false;

    return true;
  },
);