// grid/index.ts
//
// 3D coordinate grid and spatial reference subsystem.
// Replaces legacy BlueprintGroundPlane + createGridGeometries +
// createGridMaterials + AxisLabelSprite.
//
// Architecture:
//
//   RaycastFloor     — Invisible 10k×10k plane at Y=-0.004 for pointer
//                      raycasting (double-click-to-pivot, cursor tracking).
//                      Never rendered visually. Singleton geometry.
//
//   AxisLines        — Three colored lines through origin (X=red, Y=green,
//                      Z=blue). Dynamic extent based on computeSceneBounds.
//                      Lightweight — used by default in SceneContent.
//
//   InfiniteAxes     — Enhanced axis visualization with distance-based fade
//                      segments, tick marks, and HTML number labels. Heavier
//                      (36 HTML overlays). Not currently wired into
//                      SceneContent — available for opt-in via future
//                      `axisStyle` config flag.
//
//   PivotIndicator   — Gizmo at the orbit target (pivot point). Shows local
//                      XYZ axes, origin sphere, dashed reference lines to
//                      world axes, and coordinate label.
//
//   NodeReferenceBox — Per-node dashed wireframe cuboid from origin to node
//                      position. Edges colored by parallel axis. Supports
//                      'selected' mode (only active nodes) and 'all' mode
//                      (every node, faint).
//
// Dependencies:
//   - store (positions, selectionSet, hoveredNodeId, themeColors)
//   - utils (computeSceneBounds, detectDarkMode)
//   - constants (axis colors, extents, tick intervals, opacities)
//   - @react-three/drei (Html — used by InfiniteAxes, PivotIndicator,
//     NodeReferenceBox for coordinate labels)

export { RaycastFloor } from './RaycastFloor';
export { AxisLines } from './AxisLines';

/**
 * Enhanced axis visualization with fade, ticks, and labels.
 * Not currently used in SceneContent — available for opt-in via
 * a future `axisStyle: 'infinite' | 'simple'` config flag.
 */
export { InfiniteAxes } from './InfiniteAxes';

export { PivotIndicator } from './PivotIndicator';
export type { PivotIndicatorProps } from './PivotIndicator';

export { NodeReferenceBox } from './NodeReferenceBox';
export type { NodeReferenceBoxProps } from './NodeReferenceBox';
