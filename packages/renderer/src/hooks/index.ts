// hooks/index.ts
//
// Custom React hooks for the 3D renderer.
//
// Hook catalog:
//
//   useAutoRotate        — Idle-triggered camera auto-rotation.
//                          Tracks interaction state via refs; activates
//                          OrbitControls.autoRotate after idle threshold.
//                          Cleanly disables on `enabled=false`.
//
//   useCursorTracking    — Projects pointer position onto a camera-facing
//                          plane at the orbit target depth. Emits world-space
//                          coordinates via callback. All vectors pooled.
//
//   useDraggable         — Zero-alloc drag loop using pointer capture +
//                          plane projection. Returns event handlers and a
//                          hasMovedRef (ref, not value) for click vs drag
//                          disambiguation. All Three.js objects reused.
//
//   useKeyboardNavigation — Tab focus cycling, undo/redo (Ctrl+Z/Y),
//                          zoom-to-fit (F). focusedIdx stored in ref to
//                          survive effect re-runs.
//
//   usePrimitivesSync    — Bidirectional sync between @verdant/primitives
//                          (SelectionManager, CommandHistory, TransitionEngine)
//                          and the Zustand store. Skips layout transitions
//                          during drag.
//
//   useViewPersistence   — Throttled camera state persistence via
//                          OrbitControls onChange. Returns undefined when
//                          no persistence callback is provided.
//
// Dependencies:
//   - store (useRendererStore)
//   - @react-three/fiber (useThree, useFrame)
//   - @verdant/primitives (usePrimitives)
//   - utils (zoomToFit, isFiniteVec3)
//   - constants (thresholds, intervals)

export { useAutoRotate } from './useAutoRotate';
export { useCursorTracking } from './useCursorTracking';
export { useDraggable } from './useDraggable';
export type { DraggableHandlers, UseDraggableOptions } from './useDraggable';
export { useKeyboardNavigation } from './useKeyboardNavigation';
export { usePrimitivesSync } from './usePrimitivesSync';
export { useViewPersistence } from './useViewPersistence';
