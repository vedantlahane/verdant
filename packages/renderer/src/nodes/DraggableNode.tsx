// nodes/DraggableNode.tsx

import React, { useCallback, useRef } from 'react';
import type { NodeProps, SizeKey, NodeStatus, AnimationType, NodeBadgeType, DataBindingConfig, NodePort } from '@verdant/primitives';
import { useDraggable } from '../hooks/useDraggable';
import { getNodeComponent } from './nodeMap';
import type { Vec3, MutVec3 } from '../types';

const vec3Eq = (a: Vec3, b: Vec3) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];

// ═══════════════════════════════════════════════════════════════════
//  Types
// ═══════════════════════════════════════════════════════════════════

export interface DraggableNodeProps {
  readonly node: Readonly<{
    id: string;
    type: string;
    props: Readonly<Record<string, unknown>>;
  }>;
  readonly position: Vec3;
  readonly isSelected: boolean;
  readonly isHovered: boolean;
  readonly color: string;
  readonly controlsRef: React.RefObject<any>;
  readonly onNodeClick: (nodeId: string, pos: Vec3, e: any) => void;
  readonly onHoverEnter: (id: string) => void;
  readonly onHoverLeave: () => void;
}

// ═══════════════════════════════════════════════════════════════════
//  Node Props Builder
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
): NodeProps & { type: string } {
  return {
    type: node.type,
    label: (node.props.label as string) || node.id,
    position,
    selected: isSelected,
    hovered: isHovered,
    color,
    size: (node.props.size as SizeKey) || 'md',
    glow: node.props.glow === true,
    shape: node.props.shape as string | undefined,
    status: node.props.status as NodeStatus | undefined,
    badges: node.props.badges as NodeBadgeType[] | undefined,          // Bug #13: now tracked in comparator
    ports: node.props.ports as NodePort[] | undefined,                // Bug #13: now tracked in comparator
    subtitle: node.props.subtitle as string | undefined,               // Bug #13: now tracked in comparator
    enterAnimation: node.props.enterAnimation as AnimationType | undefined, // Bug #13: now tracked in comparator
    bindings: node.props.bindings as DataBindingConfig | undefined,   // Bug #13: now tracked in comparator
    visible: node.props.visible as boolean | undefined,                // Bug #13: now tracked in comparator
    locked: node.props.locked as boolean | undefined,                  // Bug #13: now tracked in comparator
    breathe: node.props.breathe as boolean | undefined,
    animationDuration: node.props.animationDuration as number | undefined,
    onClick,
    onPointerOver,
    onPointerOut,
  };
}

// ═══════════════════════════════════════════════════════════════════
//  Component
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

    const positionRef = useRef<MutVec3>(position as MutVec3);
    positionRef.current = position as MutVec3;

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

    const { onPointerDown, onPointerMove, onPointerUp, hasMovedRef } =
      useDraggable({
        nodeId: node.id,
        positionRef,
        onDragStart: handleDragStart,
        onDragEnd: handleDragEnd,
      });

    const handleClick = useCallback(
      (e: any) => {
        if (hasMovedRef.current) return;
        onNodeClick(node.id, positionRef.current, e);
      },
      [node.id, onNodeClick, hasMovedRef],
    );

    const handlePointerOver = useCallback(
      (e: any) => {
        e.stopPropagation();
        onHoverEnter(node.id);
      },
      [node.id, onHoverEnter],
    );

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
    // Node identity
    if (prev.node.id !== next.node.id) return false;
    if (prev.node.type !== next.node.type) return false;

    // Visual state
    if (prev.isSelected !== next.isSelected) return false;
    if (prev.isHovered !== next.isHovered) return false;
    if (prev.color !== next.color) return false;

    // Position (value equality)
    if (!vec3Eq(prev.position, next.position)) return false;

    // Node props that affect rendering
    if (prev.node.props.label !== next.node.props.label) return false;
    if (prev.node.props.size !== next.node.props.size) return false;
    if (prev.node.props.glow !== next.node.props.glow) return false;
    if (prev.node.props.shape !== next.node.props.shape) return false;
    if (prev.node.props.status !== next.node.props.status) return false;

    // Bug #13 fix: previously missing from comparator                 ← CHANGED
    if (prev.node.props.badges !== next.node.props.badges) return false;
    if (prev.node.props.ports !== next.node.props.ports) return false;
    if (prev.node.props.subtitle !== next.node.props.subtitle) return false;
    if (prev.node.props.enterAnimation !== next.node.props.enterAnimation) return false;
    if (prev.node.props.bindings !== next.node.props.bindings) return false;
    if (prev.node.props.visible !== next.node.props.visible) return false;
    if (prev.node.props.locked !== next.node.props.locked) return false;
    if (prev.node.props.breathe !== next.node.props.breathe) return false;
    if (prev.node.props.animationDuration !== next.node.props.animationDuration) return false;

    // Callback identity
    if (prev.onNodeClick !== next.onNodeClick) return false;
    if (prev.onHoverEnter !== next.onHoverEnter) return false;
    if (prev.onHoverLeave !== next.onHoverLeave) return false;

    return true;
  },
);