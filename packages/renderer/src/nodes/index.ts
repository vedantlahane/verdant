// nodes/index.ts
//
// Node rendering subsystem.
//
// Architecture:
//   DraggableNode — Wrapper that adds pointer-capture drag behavior
//                   to any node component. Uses useDraggable hook for
//                   zero-alloc plane projection. Custom arePropsEqual
//                   comparator prevents re-renders during drag.
//
//   nodeMap       — Registry mapping VRD type strings (case-insensitive)
//                   to React components from @verdant/nodes.
//                   Fallback: ServerNode for unknown types.
//
// Dependencies:
//   - hooks/useDraggable (pointer capture + plane projection)
//   - store (positions, draggingNodeId, updateNodePosition)
//   - @verdant/primitives (NodeProps type)
//   - @verdant/nodes (all node component implementations)
//
// Key design decisions:
//   - DraggableNode.memo comparator checks node.props individually
//     (not referential equality on the props object) to avoid
//     re-renders when parent reconstructs AST with same data.
//   - nodeMap keys are lowercase-normalized at lookup time.
//   - FALLBACK_NODE is ServerNode (generic box appearance).

export { DraggableNode } from './DraggableNode';
export type { DraggableNodeProps } from './DraggableNode';

export {
  getNodeComponent,
  isKnownNodeType,
  getRegisteredNodeTypes,
  FALLBACK_NODE,
  /** @deprecated Use getNodeComponent(type) instead */
  NODE_MAP,
} from './nodeMap';
