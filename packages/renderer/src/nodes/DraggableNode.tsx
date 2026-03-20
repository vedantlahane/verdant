// DraggableNode.tsx

import React, { useCallback, useRef } from 'react';
import { NodeProps } from '@verdant/primitives';
import { useDraggable } from '../hooks/useDraggable';
import { NODE_MAP, FALLBACK_NODE } from './nodeMap';

interface DraggableNodeProps {
  node: { id: string; type: string; props: Record<string, unknown> };
  position: [number, number, number];
  isSelected: boolean;
  isHovered: boolean;
  color: string;
  controlsRef: React.MutableRefObject<any>;
  onNodeClick: (nodeId: string, pos: [number, number, number], e: any) => void;
  onHoverEnter: (id: string) => void;
  onHoverLeave: () => void;
}

export const DraggableNode = React.memo(function DraggableNode({
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
  const Component = NODE_MAP[node.type.toLowerCase()] ?? FALLBACK_NODE;

  // Stable ref — useDraggable reads from this, no stale closure
  const positionRef = useRef<[number, number, number]>(position);
  positionRef.current = position;

  const handleDragStart = useCallback(() => {
    if (controlsRef.current) controlsRef.current.enabled = false;
  }, [controlsRef]);

  const handleDragEnd = useCallback(() => {
    if (controlsRef.current) controlsRef.current.enabled = true;
  }, [controlsRef]);

  const { onPointerDown, onPointerMove, onPointerUp } = useDraggable(
    node.id,
    positionRef,
    handleDragStart,
    handleDragEnd,
  );

  const handleClick = useCallback(
    (e: any) => onNodeClick(node.id, positionRef.current, e),
    [node.id, onNodeClick],
  );

  const handlePointerOver = useCallback(
    (e: any) => {
      e.stopPropagation();
      onHoverEnter(node.id);
    },
    [node.id, onHoverEnter],
  );

  const nodeProps: NodeProps = {
    label: (node.props.label as string) || node.id,
    position,
    selected: isSelected,
    hovered: isHovered,
    color,
    size: (node.props.size as string) || 'md',
    glow: node.props.glow === true,
    onClick: handleClick,
    onPointerOver: handlePointerOver,
    onPointerOut: onHoverLeave,
  };

  return (
    <group
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <Component {...nodeProps} />
    </group>
  );
});