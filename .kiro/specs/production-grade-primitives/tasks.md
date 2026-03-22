# Implementation Plan: production-grade-primitives

## Overview

Incremental upgrade of `@verdant/primitives` from v1 to v2.0 in TypeScript. Each phase builds on the previous, starting with critical memory fixes, then adding subsystems sprint by sprint, and wiring everything together through the `PrimitivesProvider` context. All property-based tests use **fast-check** with `numRuns: 100`.

## Tasks

---

### Fix Now: Geometry and Material Memory Management

- [x] 1. Implement `SharedGeometryPool`
  - Create `packages/primitives/src/geometry/SharedGeometryPool.ts`
  - Implement `acquire(key, factory)`, `release(key)`, `getStats()`, and `dispose()` with a `Map<string, { geometry, refCount }>` internal store
  - `acquire` increments refCount if key exists, otherwise calls factory and stores with refCount 1
  - `release` decrements refCount; when it reaches 0, calls `geometry.dispose()` and removes the key
  - `getStats()` returns `{ cachedCount, totalReferenceCount }`
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [ ]* 1.1 Write property test for geometry pool deduplication and reference counting
    - **Property 1: Geometry pool deduplication and reference counting**
    - **Validates: Requirements 1.1, 1.2, 1.5**

  - [ ]* 1.2 Write property test for geometry pool disposal on zero references
    - **Property 2: Geometry pool disposal on zero references**
    - **Validates: Requirements 1.3**

- [x] 2. Implement `MaterialCache`
  - Create `packages/primitives/src/materials/MaterialCache.ts`
  - Implement `acquire(config)`, `release(config)`, and `dispose()` with a `Map<string, { material, refCount }>` store
  - Derive cache key via `JSON.stringify(config, Object.keys(config).sort())`
  - `release` calls `material.dispose()` when refCount reaches 0
  - _Requirements: 2.1, 2.2, 2.3_

  - [ ]* 2.1 Write property test for material cache deduplication
    - **Property 3: Material cache deduplication and reference counting**
    - **Validates: Requirements 2.1, 2.2**

  - [ ]* 2.2 Write property test for material disposal on zero references
    - **Property 4: Material disposal on zero references**
    - **Validates: Requirements 2.3**

- [x] 3. Implement `StatusMaterials`
  - Create `packages/primitives/src/materials/StatusMaterials.ts`
  - Define `StatusColorConfig` interface and default colors: healthy `#22c55e`, warning `#f59e0b`, error `#ef4444`, unknown `#6b7280`
  - Export `createStatusMaterials(config?: StatusColorConfig)` returning a `Record<NodeStatus, THREE.MeshStandardMaterial>`
  - _Requirements: 2.4, 2.5, 11.2, 11.3, 11.4, 11.5, 11.6_

  - [ ]* 3.1 Write property test for status material mapping
    - **Property 27: Status material mapping**
    - **Validates: Requirements 2.5, 11.2, 11.3, 11.4, 11.5**

- [x] 4. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

---

### Sprint 1: Provider, Plugin System, Core Interaction

- [x] 5. Set up `PrimitivesProvider` context scaffold
  - Create `packages/primitives/src/provider/PrimitivesConfig.ts` with `PrimitivesConfig`, `StatusColorConfig`, `PostProcessingConfig`, `MinimapConfig` interfaces
  - Create `packages/primitives/src/provider/PrimitivesContext.ts` with `PrimitivesContextValue` interface and `usePrimitives()` hook
  - Create `packages/primitives/src/provider/PrimitivesProvider.tsx` that instantiates all subsystems and provides them via context; subsystems are disposed on unmount
  - _Requirements: 20.1_

- [x] 6. Implement `NodeRegistry` and `ShapeRegistry` (instance-scoped)
  - Create `packages/primitives/src/registry/NodeRegistry.ts` — replace the module-singleton with a class: `register(type, component, options?)`, `get(type)`, `list()`
  - Create `packages/primitives/src/registry/ShapeRegistry.ts` — class with `register(name, definition)`, `get(name)`, `list()`; throws `InvalidShapeDefinitionError` if `geometryFactory` is missing
  - Create `packages/primitives/src/registry/PluginSystem.ts` implementing `install(plugin)` and `listPlugins()`; throws `PluginConflictError` on duplicate node type key
  - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5, 20.6_

  - [ ]* 6.1 Write property test for plugin conflict detection
    - **Property 14: Plugin conflict detection**
    - **Validates: Requirements 20.5**

  - [ ]* 6.2 Write property test for plugin registry instance isolation
    - **Property 15: Plugin registry instance isolation**
    - **Validates: Requirements 20.1**

- [x] 7. Implement `GeometryFactory` and register built-in shapes
  - Create `packages/primitives/src/geometry/GeometryFactory.ts`
  - `createGeometry(shapeName, params?)` looks up `ShapeRegistry`, calls `ShapeDefinition.geometryFactory`, delegates to `SharedGeometryPool.acquire`
  - Create `packages/primitives/src/shapes/ShapeDefinition.ts` with `NodePort` and `ShapeDefinition` interfaces
  - Register all 14 built-in shapes (6 existing + 8 new from Sprint 2 list) in `packages/primitives/src/shapes/index.ts` as `ShapeDefinition` objects with `defaultPorts`
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [ ]* 7.1 Write property test for shape registry idempotent lookup
    - **Property 5: Shape registry idempotent lookup**
    - **Validates: Requirements 8.4**

  - [ ]* 7.2 Write property test for all registered shapes producing valid geometry
    - **Property 6: All registered shapes produce valid geometry**
    - **Validates: Requirements 8.2**

  - [ ]* 7.3 Write property test for all registered shapes declaring valid default ports
    - **Property 7: All registered shapes declare valid default ports**
    - **Validates: Requirements 3.1, 8.3**

- [x] 8. Implement `CommandHistory`
  - Create `packages/primitives/src/interaction/CommandHistory.ts`
  - Implement `push(command)`, `undo()`, `redo()`, `clear()`, `canUndo`, `canRedo`
  - `push` while pointer is not at top discards all commands above the pointer
  - Configurable `maxDepth` (default 100); oldest commands are dropped when exceeded
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [ ]* 8.1 Write property test for undo/redo round trip
    - **Property 11: Command history undo/redo round trip**
    - **Validates: Requirements 6.1, 6.2, 6.3**

  - [ ]* 8.2 Write property test for stack truncation on new command
    - **Property 12: Command history stack truncation on new command**
    - **Validates: Requirements 6.4**

  - [ ]* 8.3 Write property test for canUndo/canRedo reflecting stack state
    - **Property 13: canUndo and canRedo reflect stack state**
    - **Validates: Requirements 6.6**

- [x] 9. Implement `SelectionManager`
  - Create `packages/primitives/src/interaction/SelectionManager.ts` extending `EventEmitter`
  - Implement `select(id, additive?)`, `deselect(id)`, `clearSelection()`, `selectBox(bounds, nodeRegistry)`, `selectedIds`
  - Emit `selectionChange` event with the new `Set<string>` on every change
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ]* 9.1 Write property test for modifier key additivity
    - **Property 8: Selection modifier key additivity**
    - **Validates: Requirements 5.1**

  - [ ]* 9.2 Write property test for selection clear on empty-area click
    - **Property 9: Selection clear on empty-area click**
    - **Validates: Requirements 5.2**

  - [ ]* 9.3 Write property test for box select intersects correct nodes
    - **Property 10: Box select intersects correct nodes**
    - **Validates: Requirements 5.3**

- [x] 10. Implement `DragManager` and multi-node drag
  - Create `packages/primitives/src/interaction/DragManager.ts`
  - On drag start, snapshot positions of all `SelectionManager.selectedIds`
  - On drag move, translate all selected nodes by the same delta
  - On drag end, push a `MoveCommand` to `CommandHistory`
  - _Requirements: 5.6, 6.1_

- [x] 11. Implement `TransitionEngine` and `EnterExit` animations
  - Create `packages/primitives/src/animation/TransitionEngine.ts` with `playEnter`, `playExit`, `playLayoutTransition`
  - Create `packages/primitives/src/animation/EnterExit.ts` implementing `fade`, `scale`, and `slide` animation types using `useFrame` interpolation
  - `playExit` returns a `Promise<void>` that resolves only after the animation completes; component stays mounted and non-interactive during exit
  - Default enter duration 300ms, exit duration 200ms; respect per-node `animationDuration` override
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [ ]* 11.1 Write property test for exit animation blocking unmount
    - **Property 26: Exit animation blocks unmount**
    - **Validates: Requirements 4.2, 4.6**

- [x] 12. Implement `NodePort` system and `EdgeRouter` port resolution
  - Create `packages/primitives/src/nodes/NodePorts.tsx` — renders port indicators (diameter ≤ 0.15 world units) when parent node is hovered
  - Create `packages/primitives/src/edges/EdgePorts.ts` — resolves `fromPort`/`toPort` names to world positions; falls back to node center with `console.warn` if port not found
  - Create `packages/primitives/src/edges/EdgeRouter.ts` with `computePath(from, to, algorithm, obstacles?)` supporting `straight`, `curved`, and `orthogonal` routing
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ]* 12.1 Write property test for port fallback on unknown port name
    - **Property 23: Port fallback on unknown port name**
    - **Validates: Requirements 3.4**

- [x] 13. Implement orthogonal edge routing
  - Extend `EdgeRouter.computePath` for `orthogonal` algorithm: produce axis-aligned segments only, avoid obstacle bounding boxes
  - Fall back to `curved` routing with `console.warn` if no collision-free orthogonal path is found after N iterations
  - _Requirements: 14.1, 14.2, 14.3, 14.4_

  - [ ]* 13.1 Write property test for orthogonal path segment axis-alignment
    - **Property 21: Orthogonal path segment axis-alignment**
    - **Validates: Requirements 14.1**

  - [ ]* 13.2 Write property test for orthogonal path collision avoidance
    - **Property 22: Orthogonal path collision avoidance**
    - **Validates: Requirements 14.2**

- [x] 14. Implement camera controls: zoom-to-fit and focus-node
  - Create `packages/primitives/src/interaction/CameraControls.ts`
  - `zoomToFit(nodes)`: compute bounding box of all visible nodes, animate camera to fit with ≥10% padding over 600ms using ease-in-out; if no nodes, return to default position
  - `focusNode(nodeId)`: animate camera to center the node at comfortable distance over 400ms using ease-in-out
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 15. Implement `InstancedRenderer`, `FrustumCulling`, `LODController`, and `ObjectPool`
  - Create `packages/primitives/src/performance/ObjectPool.ts` — pre-allocates and reuses `THREE.Vector3`, `THREE.Matrix4`, `THREE.Quaternion` instances
  - Create `packages/primitives/src/performance/FrustumCulling.ts` — skips update/render for nodes outside camera frustum
  - Create `packages/primitives/src/performance/LODController.ts` — swaps geometry to lower-detail variant when projected screen size < 20px
  - Create `packages/primitives/src/performance/InstancedRenderer.tsx` — consolidates 10+ same-shape nodes into a single `InstancedMesh` draw call
  - _Requirements: 21.1, 21.2, 21.3, 21.4_

- [x] 16. Upgrade `BaseNode` to v2 (backward-compatible)
  - Move `packages/primitives/src/BaseNode.tsx` to `packages/primitives/src/nodes/BaseNode.tsx`
  - Add optional v2 props: `id`, `status`, `badges`, `shape`, `enterAnimation`, `exitAnimation`, `animationDuration`, `ports`, `bindings`
  - Integrate `useGeometryPool` and `useMaterialCache` hooks; node never calls `.dispose()` directly
  - Apply `StatusMaterials` based on `status` prop within one frame of prop change
  - Render `NodePorts` when hovered; render `NodeBadge` components from `badges` array (warn + skip on duplicate position)
  - Wire `TransitionEngine` for enter/exit animations
  - Render ARIA live region with label and status on keyboard focus
  - _Requirements: 2.5, 11.1, 11.2, 11.3, 11.4, 11.5, 12.1, 12.2, 12.3, 12.4, 12.5, 17.4_

  - [ ]* 16.1 Write property test for badge position uniqueness enforcement
    - **Property 17: Badge position uniqueness enforcement**
    - **Validates: Requirements 12.5**

  - [ ]* 16.2 Write property test for ARIA live region content on focus
    - **Property 30: ARIA live region content on focus**
    - **Validates: Requirements 17.4**

- [x] 17. Upgrade `BaseEdge` to v2 (backward-compatible)
  - Move `packages/primitives/src/BaseEdge.tsx` to `packages/primitives/src/edges/BaseEdge.tsx`
  - Add optional v2 props: `id`, `fromNodeId`, `toNodeId`, `fromPort`, `toPort`, `routing`, `flowParticles`
  - Delegate path computation to `EdgeRouter`; recompute on node position change within the same frame
  - _Requirements: 3.2, 3.3, 3.4, 9.1_

- [x] 18. Implement `FlowParticles`
  - Create `packages/primitives/src/edges/FlowParticles.tsx`
  - Render `count` (default 5) particles traveling along the edge path at `speed` seconds per traversal (default 2.0)
  - `color` defaults to parent edge color
  - On edge removal, dispose all particle geometry and material instances via their respective pool/cache
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [ ]* 18.1 Write property test for flow particle disposal on edge removal
    - **Property 16: Flow particle disposal on edge removal**
    - **Validates: Requirements 9.5**

- [x] 19. Implement `KeyboardNav` and canvas accessibility
  - Create `packages/primitives/src/interaction/KeyboardNav.ts`
  - Tab/Shift+Tab moves focus between nodes; Enter/Space triggers primary action; `F` triggers zoom-to-fit; Delete/Backspace deletes selected; Escape clears selection
  - Render a visible focus indicator distinct from hover/selection states
  - Add `aria-label` to the canvas element summarizing diagram content
  - Wire Ctrl+Z / Cmd+Z to `CommandHistory.undo()` and Ctrl+Y / Cmd+Shift+Z to `CommandHistory.redo()`
  - _Requirements: 6.2, 6.3, 17.1, 17.2, 17.3, 17.4, 17.5, 17.6_

- [x] 20. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

---

### Sprint 2: Shape Expansion, Groups, Status, Badges, Layout

- [x] 21. Add 8 new shape files
  - Create shape files in `packages/primitives/src/shapes/`: `PentagonShape.tsx`, `OctagonShape.tsx`, `RingShape.tsx`, `BoxShape.tsx`, `ConeShape.tsx`, `CapsuleShape.tsx`, `IcosahedronShape.tsx`, `PlaneShape.tsx`
  - Each file exports a React component and a `ShapeDefinition` with `geometryFactory` and `defaultPorts`
  - Register all 8 in `packages/primitives/src/shapes/index.ts`
  - _Requirements: 8.1, 8.2, 8.3_

- [x] 22. Implement `GroupContainer`, `GroupCollapse`, and `NestedGroup`
  - Create `packages/primitives/src/groups/GroupContainer.tsx` — renders a visual boundary around child nodes; accepts `collapsed` prop
  - Create `packages/primitives/src/groups/GroupCollapse.tsx` — when `collapsed` transitions to `true`, plays exit animations for children then hides them; renders proxy node with group label and child-count badge; reroutes edges to proxy center
  - Create `packages/primitives/src/groups/NestedGroup.tsx` — supports groups containing other groups
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 23. Implement `NodeBadge` component
  - Create `packages/primitives/src/nodes/NodeBadge.tsx`
  - Renders badge at `top-right`, `top-left`, `bottom-right`, or `bottom-left` relative to node bounding box
  - Scales proportionally with parent node `size` prop
  - _Requirements: 12.1, 12.2, 12.3, 12.4_

- [x] 24. Implement hierarchical layout algorithm
  - Create `packages/primitives/src/layout/HierarchicalLayout.ts`
  - Assign layers via longest-path from root (each node's layer > max layer of all predecessors)
  - Break cycles by reversing minimum edges to produce a DAG before layering
  - Minimize edge crossings with configurable optimization passes (default 3)
  - Trigger `TransitionEngine.playLayoutTransition` over 500ms when layout is applied
  - _Requirements: 13.1, 13.2, 13.3, 13.4_

  - [ ]* 24.1 Write property test for hierarchical layout layer invariant
    - **Property 28: Hierarchical layout layer invariant**
    - **Validates: Requirements 13.1**

- [x] 25. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

---

### Sprint 3: Export, Context Menu, Accessibility Polish

- [x] 26. Implement PNG and SVG export
  - Create `packages/primitives/src/export/PNGExport.ts` — renders scene to offscreen canvas, returns `Promise<Blob>`; supports `scale` option 1–4 (default 2); snapshots scene state before starting, never mutates live scene
  - Create `packages/primitives/src/export/SVGExport.ts` — produces SVG document with node positions, shapes, labels, and edge paths as SVG primitives; returns `Promise<string>`
  - Both reject with `ExportError` on failure
  - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

  - [ ]* 26.1 Write property test for export not mutating scene state
    - **Property 29: Export does not mutate scene state**
    - **Validates: Requirements 15.4**

- [x] 27. Implement `ContextMenu`
  - Create `packages/primitives/src/interaction/ContextMenu.tsx`
  - Appears at pointer position within 16ms on right-click of a node or edge
  - Displays element-type-relevant actions; closes on action selection, outside click, or Escape
  - Supports custom action registration via `PluginSystem.registerContextAction`
  - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5_

- [x] 28. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

---

### Sprint 4: Post-Processing and Data Binding

- [x] 29. Implement `PostProcessingPipeline`
  - Create `packages/primitives/src/postprocessing/PostProcessingPipeline.tsx`
  - When `postProcessing` is enabled in `PrimitivesConfig`, apply bloom pass (configurable `intensity`, `threshold`, `radius`) and outline pass on selected nodes (configurable `color`, `thickness`)
  - When `postProcessing` is disabled, do not import or initialize any post-processing passes (zero bundle overhead)
  - _Requirements: 18.1, 18.2, 18.3_

- [x] 30. Implement `DataBinding`
  - Create `packages/primitives/src/databinding/DataBinding.ts`
  - `bind(config)` subscribes to an RxJS-compatible observable and updates the target node/edge property within one rendered frame on each emission
  - Supports binding to `status`, `label`, `color`, and `badges`
  - On observable error: log via `console.error`, set node `status` to `'unknown'`, keep subscription alive
  - `unbind(nodeId, property?)` and `dispose()` unsubscribe all associated observables
  - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5_

  - [ ]* 30.1 Write property test for data binding property update on emission
    - **Property 18: Data binding property update on emission**
    - **Validates: Requirements 19.2, 19.3**

  - [ ]* 30.2 Write property test for data binding cleanup on dispose
    - **Property 19: Data binding cleanup on dispose**
    - **Validates: Requirements 19.4**

  - [ ]* 30.3 Write property test for data binding error handling sets status to unknown
    - **Property 20: Data binding error handling sets status to unknown**
    - **Validates: Requirements 19.5**

- [x] 31. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

---

### Sprint 5: GLTF Import/Export and Minimap

- [x] 32. Implement GLTF import and export
  - Create `packages/primitives/src/export/GLTFExport.ts` — serializes scene graph (node meshes, edge paths, labels, group boundaries) into a valid GLTF 2.0 document; includes node metadata (`id`, `type`, `label`, `status`) as GLTF extras; returns `Promise<Blob>`; rejects with `ExportError` on failure
  - Extend `GeometryFactory` to handle `CustomShape` with `gltfUrl`: load GLTF, extract first mesh, register as shape geometry; fall back to `box` geometry with `console.error` on load failure
  - _Requirements: 22.1, 22.2, 22.3, 22.4_

  - [ ]* 32.1 Write property test for GLTF export round trip preserving scene structure
    - **Property 24: GLTF export round trip preserves scene structure**
    - **Validates: Requirements 22.2, 22.4**

  - [ ]* 32.2 Write property test for GLTF load failure falling back to box geometry
    - **Property 25: GLTF load failure falls back to box geometry**
    - **Validates: Requirements 22.3**

- [x] 33. Implement `Minimap`
  - Create `packages/primitives/src/minimap/Minimap.tsx`
  - When `minimap` is enabled in `PrimitivesConfig`, render a scaled-down top-down projection of all nodes and group boundaries in a corner overlay
  - Display a viewport indicator rectangle for the current camera's visible area
  - On click/drag within minimap, pan camera to center the clicked position in the main viewport
  - Update node positions within one rendered frame of any position change
  - _Requirements: 23.1, 23.2, 23.3, 23.4_

- [x] 34. Wire everything together and update public exports
  - Update `packages/primitives/src/index.ts` to export all new public APIs: `PrimitivesProvider`, `usePrimitives`, upgraded `BaseNode`, `BaseEdge`, all shape components, `NodeBadge`, `GroupContainer`, `NestedGroup`, `Minimap`, `ContextMenu`, type exports
  - Update `packages/primitives/src/types.ts` with all v2 type additions (`NodeStatus`, `NodeBadge`, `FlowParticleConfig`, `AnimationType`, etc.)
  - Verify `packages/nodes` consumers (`ServerNode`, etc.) still compile without modification (backward-compat check)
  - Add `fast-check` as a dev dependency: `pnpm add -D fast-check` in `packages/primitives`
  - _Requirements: all_

- [x] 35. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests use `fast-check` with `numRuns: 100` and a comment tag: `// Feature: production-grade-primitives, Property N: <title>`
- All Three.js object lifecycle (dispose) is managed by `SharedGeometryPool` and `MaterialCache` — components never call `.dispose()` directly
- Backward compatibility with v1 `NodeProps` and `EdgeLineProps` is preserved throughout
