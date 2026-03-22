# Implementation Plan: Integration Wiring Phase

## Overview

Wire `@verdant/primitives` v2 into the parser, renderer, nodes, and playground packages across
five sequential phases. Phases 2 and 3 can proceed in parallel once Phase 1 is complete.
Phase 4 depends on Phases 2 and 3. Phase 5 depends on Phase 4.

## Tasks

- [x] 1. Phase 1 — Parser: extend types and validation sets
  - [x] 1.1 Extend `packages/parser/src/types.ts` with all v2 types
    - Add `ShapeType` union (cone, capsule, icosahedron, plane to existing 10)
    - Add `LayoutType` union (hierarchical, forced to existing 3)
    - Add `NodeStatus`, `AnimationType`, `RoutingType`, `PortSide`, `BadgePosition` type aliases
    - Add `VrdBadge`, `VrdPort`, `VrdAnimationKeyframe`, `VrdAnimationTimeline` interfaces
    - Extend `VrdNodeProps` with shape, status, badges, ports, enterAnimation, exitAnimation, animationDuration
    - Extend `VrdEdgeProps` with routing, flow, flowSpeed, flowCount, flowColor
    - Add `VrdGroupProps` interface; change `VrdGroup.props` from `Record<string,unknown>` to `VrdGroupProps`
    - Extend `VrdConfig` with minimap, post-processing, bloom-intensity, snap-to-grid, grid-size, direction, layer-spacing, node-spacing, animations
    - Add `VALID_SHAPES`, `VALID_STATUSES`, `VALID_ANIMATION_TYPES`, `VALID_ROUTING_TYPES`, `VALID_PORT_SIDES`, `VALID_BADGE_POSITIONS` readonly sets
    - Update `KNOWN_CONFIG_KEYS` with all new config keys
    - _Requirements: 1.1, 1.2, 2.1, 2.2, 3.1, 3.2, 4.1–4.4, 5.1, 6.1, 6.2, 7.1–7.3, 8.1, 8.2, 9.1, 10.1–10.4_


  - [x] 1.2 Add new regex patterns to `packages/parser/src/patterns.ts`
    - Add `PORT_EDGE_INLINE_RE` for `nodeA.port -> nodeB.port` syntax
    - Add `PORT_EDGE_BLOCK_RE` for `nodeA.port -> nodeB.port:` block syntax
    - Add `PORT_BIDI_EDGE_INLINE_RE` for `nodeA.port <-> nodeB.port` syntax
    - Add `PORT_BIDI_EDGE_BLOCK_RE` for bidirectional block syntax
    - Add `ANIMATION_BLOCK_RE` for `animation <name>:` blocks
    - _Requirements: 5.1, 5.2, 9.1_

  - [x] 1.3 Extend `handleNodeKV` in `packages/parser/src/parser.ts`
    - Add `shape` case: validate against `VALID_SHAPES`, store in `node.props.shape`
    - Add `status` case: validate against `VALID_STATUSES`, store in `node.props.status`
    - Add `enter` case: validate against `VALID_ANIMATION_TYPES`, store in `node.props.enterAnimation`
    - Add `exit` case: validate against `VALID_ANIMATION_TYPES`, store in `node.props.exitAnimation`
    - Add `animation-duration` case: parse numeric ms, store in `node.props.animationDuration`
    - Add `badge <position>` prefix detection in default case: parse position + content, push to `node.props.badges`
    - Add `port <name>` prefix detection in default case: parse side, push to `node.props.ports`
    - _Requirements: 1.1, 1.3, 2.1, 2.3, 2.4, 2.5, 3.1, 3.3, 4.1–4.5_

  - [x] 1.4 Extend `handleEdgeKV` and `handleGroupKV` in `packages/parser/src/parser.ts`
    - Add `routing` case to `handleEdgeKV`: validate against `VALID_ROUTING_TYPES`
    - Add `flow`, `flow-speed`, `flow-count`, `flow-color` cases to `handleEdgeKV`
    - Add `collapsed` case to `handleGroupKV`
    - Add `layout` case to `handleGroupKV`: validate against `VALID_LAYOUTS`
    - _Requirements: 6.1–6.6, 7.1–7.3_

  - [x] 1.5 Add port-to-port edge parsing and animation block parsing to main loop in `parser.ts`
    - Check `PORT_EDGE_BLOCK_RE` and `PORT_EDGE_INLINE_RE` before regular edge patterns
    - Check `PORT_BIDI_EDGE_BLOCK_RE` and `PORT_BIDI_EDGE_INLINE_RE` before regular edge patterns
    - Add `AnimationScope` type to scope stack; detect `ANIMATION_BLOCK_RE` in main loop
    - Implement `handleAnimationKV` for duration, target, property, from, to keys
    - Update `handleConfigKV` to recognize all new config keys without unknown-key warnings
    - _Requirements: 5.1, 5.2, 8.1, 8.2, 9.1–9.3_

  - [x] 1.6 Extend `packages/parser/src/validate.ts` with v2 validators
    - Implement `validateNodeV2Properties`: check status and shape against valid sets, emit error diagnostics
    - Implement `validateEdgeV2Properties`: check routing against valid set, emit error diagnostics
    - Call both validators from `validateAst`
    - _Requirements: 10.5, 10.6_


  - [x] 1.7 Create `packages/parser/src/printer.ts` — Pretty Printer
    - Implement `printVrd(ast: VrdAST): string` as a pure function
    - Implement `printConfig`: serialize all known config keys and animation timeline blocks
    - Implement `printNode` / `printNodeProps`: serialize all v2 node props (shape, status, badges, ports, animations)
    - Implement `printEdge`: use dot-notation for port edges; serialize routing and flow props as block when present
    - Implement `printGroup`: serialize collapsed and layout props; recurse into nested groups
    - Export `printVrd` from `packages/parser/src/index.ts`
    - _Requirements: 1.4, 2.6, 3.4, 4.6, 5.3, 6.7, 7.4, 8.3, 9.4_

  - [x] 1.8 Write property test for parser round-trip
    - **Property 1: Parser round-trip** — generate random `VrdAST` objects with v2 props; `printVrd` → `parseVrdSafe` → assert structural equivalence
    - **Validates: Requirements 1.5, 2.7, 3.5, 4.7, 5.4, 6.8, 7.5, 8.4, 9.5**
    - File: `packages/parser/src/tests/printer.property.test.ts`
    - Tag: `// Feature: integration-wiring-phase, Property 1`
    - Min 100 runs via `fc.configureGlobal({ numRuns: 100 })`

  - [x] 1.9 Write property test for invalid enum diagnostics
    - **Property 2: Invalid enum values produce diagnostics** — generate strings not in valid sets; parse and assert ≥1 diagnostic with severity warning/error
    - **Validates: Requirements 1.3, 2.3, 3.3, 4.5, 10.5, 10.6**
    - File: `packages/parser/src/tests/printer.property.test.ts`
    - Tag: `// Feature: integration-wiring-phase, Property 2`

  - [x] 1.10 Write property test for port-to-port edge parsing
    - **Property 3: Port-to-port edge parsing preserves port names** — generate valid node IDs and port names; construct edge string; parse; assert fromPort/toPort match
    - **Validates: Requirements 5.1, 5.2**
    - File: `packages/parser/src/tests/printer.property.test.ts`
    - Tag: `// Feature: integration-wiring-phase, Property 3`

  - [x] 1.11 Extend `packages/parser/src/tests/parser.test.ts` with v2 syntax cases
    - Add test cases for each new KV type: shape, status, badge, port, enter, exit, animation-duration
    - Add test cases for routing, flow-*, collapsed, layout, new config keys
    - Add test cases for port-to-port edge syntax (inline and block, directed and bidirectional)
    - Add test cases for animation timeline blocks
    - _Requirements: 1.1–1.5, 2.1–2.7, 3.1–3.5, 4.1–4.7, 5.1–5.4, 6.1–6.8, 7.1–7.5, 8.1–8.4, 9.1–9.5_

- [x] 2. Checkpoint — Parser phase complete
  - Ensure all parser tests pass, ask the user if questions arise.


- [x] 3. Phase 2 — Renderer: store and layout extensions
  - [x] 3.1 Extend `packages/renderer/src/store.ts`
    - Replace `selectedNodeId: string | null` with `selectionSet: Set<string>`
    - Keep `selectedNodeId` as a derived getter returning `[...selectionSet][0] ?? null` for backward compat
    - Add `undoDepth: number`, `layoutName: LayoutType`, `fps: number` fields
    - Add `setSelectionSet`, `setUndoDepth`, `setFps` actions
    - _Requirements: 15.1, 15.6, 21.1, 21.2, 21.3, 21.4_

  - [x] 3.2 Extend `packages/renderer/src/layout.ts`
    - Extend `LayoutType` to include `'hierarchical' | 'forced'`
    - Add `direction` parameter to `computeLayout`
    - Implement `computeHierarchicalLayout` using `HierarchicalLayout` from `@verdant/primitives`; apply direction rotation for LR vs TB
    - Add `'forced'` case reusing existing `computeForceDirectedLayout`
    - _Requirements: 14.1–14.5_

  - [x] 3.3 Wire `PrimitivesProvider` in `packages/renderer/src/VerdantRenderer.tsx`
    - Implement `astConfigToPrimitivesConfig(config: VrdConfig): PrimitivesConfig` pure mapping function
    - Memoize config derivation on `ast.config` reference via `useMemo`
    - Wrap `<Canvas>` interior with `<PrimitivesProvider config={primitivesConfig}>`
    - Update `VerdantRendererProps` with `onSelectionChange` and `onUndoDepthChange` callbacks
    - _Requirements: 11.1–11.5_

  - [x] 3.4 Write property test for astConfigToPrimitivesConfig mapping
    - **Property 4: AST config → PrimitivesConfig mapping is total** — generate random `VrdConfig` objects; assert minimap.enabled, postProcessing.enabled, bloom.intensity are correctly derived
    - **Validates: Requirements 11.2, 11.3, 11.4**
    - File: `packages/renderer/src/tests/astConfigToPrimitivesConfig.property.test.ts`
    - Tag: `// Feature: integration-wiring-phase, Property 4`

  - [x] 3.5 Replace `<DraggableNode>` with v2 `<BaseNode>` in `packages/renderer/src/SceneContent.tsx`
    - Import `BaseNode`, `BaseEdge`, `GroupContainer`, `NestedGroup`, `Minimap`, `ContextMenu`, `usePrimitives` from `@verdant/primitives`
    - Pass all v2 props to `<BaseNode>`: shape, status, badges, ports, enterAnimation, exitAnimation, animationDuration, id
    - _Requirements: 12.1–12.7_

  - [x] 3.6 Write property test for VrdNode v2 prop pass-through
    - **Property 5: VrdNode v2 props are passed through to BaseNode** — generate random `VrdNode` with v2 props; assert renderer constructs matching `NodeProps`
    - **Validates: Requirements 12.2–12.7**
    - File: `packages/renderer/src/tests/renderer.property.test.ts`
    - Tag: `// Feature: integration-wiring-phase, Property 5`

  - [x] 3.7 Replace `<EdgeLine>` with v2 `<BaseEdge>` in `SceneContent.tsx`
    - Pass routing, flowParticles (constructed from flow/flowSpeed/flowCount/flowColor), fromPort, toPort, fromNodeId, toNodeId
    - _Requirements: 13.1–13.6_

  - [x] 3.8 Write property test for VrdEdge v2 prop pass-through
    - **Property 6: VrdEdge v2 props are passed through to BaseEdge** — generate random `VrdEdge` with v2 props; assert renderer constructs matching `EdgeLineProps` including flowParticles when flow===true
    - **Validates: Requirements 13.2–13.6**
    - File: `packages/renderer/src/tests/renderer.property.test.ts`
    - Tag: `// Feature: integration-wiring-phase, Property 6`

  - [x] 3.9 Replace `<GroupBox>` with `<GroupContainer>` / `<NestedGroup>` in `SceneContent.tsx`
    - Render top-level groups with `<GroupContainer>`, nested groups with `<NestedGroup>`
    - Pass `collapsed`, `childIds`, `positions` props; handle collapsed state changes via ContextMenu/keyboard
    - Route edges to proxy node center when group is collapsed via EdgeRouter
    - _Requirements: 18.1–18.5_

  - [x] 3.10 Wire interaction subsystems in `SceneContent.tsx`
    - Subscribe to `SelectionManager.selectionChange` event; sync to store via `setSelectionSet`
    - Wire keyboard undo/redo (Ctrl+Z, Ctrl+Y, Cmd+Shift+Z) to `CommandHistory.undo()` / `.redo()`; update `undoDepth` via `setUndoDepth`
    - Wire `KeyboardNav` for Tab/Shift+Tab focus traversal, Enter/Space activation, F zoom-to-fit
    - Wire `FrustumCulling` and `LODController` via `PrimitivesProvider` config (always active)
    - Activate `InstancedRenderer` when ≥10 nodes share the same shape type
    - Wire `TransitionEngine` for enter/exit/layout-change animations (500ms layout transitions)
    - Wire `CameraControls` zoom-to-fit
    - _Requirements: 14.4, 15.1–15.6, 16.1–16.5, 17.1–17.3_

  - [x] 3.11 Write property test for selection round-trip
    - **Property 7: Selection round-trip** — generate random node ID sets; select each; assert `selectionSet.has(id)`; clear; assert `selectionSet.size === 0`
    - **Validates: Requirements 15.1, 15.6**
    - File: `packages/renderer/src/tests/integration/selection-flow.test.ts`
    - Tag: `// Feature: integration-wiring-phase, Property 7`

  - [x] 3.12 Write property test for undo/redo position round-trip
    - **Property 8: Undo/redo position round-trip** — generate random node + position pairs; move → undo → assert original position → redo → assert new position
    - **Validates: Requirements 15.2, 15.3, 15.4**
    - File: `packages/renderer/src/tests/integration/undo-redo.test.ts`
    - Tag: `// Feature: integration-wiring-phase, Property 8`

  - [x] 3.13 Add conditional `<Minimap>` and `<ContextMenu>` overlays in `SceneContent.tsx`
    - Render `<Minimap>` when `primitivesConfig.minimap.enabled === true`
    - Render `<ContextMenu>` on right-click with actions: delete selected, duplicate node, zoom to fit, collapse/expand group
    - _Requirements: 16.1, 16.3, 16.4, 16.5_

- [x] 4. Checkpoint — Renderer phase complete
  - Ensure all renderer tests pass, ask the user if questions arise.


- [x] 5. Phase 3 — Nodes: v2 migration for all 10 domain components
  - [x] 5.1 Migrate `CacheNode`, `CloudNode`, `DatabaseNode`, `GatewayNode`, `MonitorNode` in `packages/nodes/src/`
    - Add `defaultPorts` constant per node (CacheNode: get/set; CloudNode: in/out; DatabaseNode: read/write/replica; GatewayNode: ingress/egress/admin; MonitorNode: metrics/alerts)
    - Add `defaultStatus = 'unknown' as const`
    - Pass `status={props.status ?? defaultStatus}` and `ports={props.ports ?? defaultPorts}` to `<BaseNode>`
    - Call `NodeRegistry.register('<type>', Component)` at module load for each
    - _Requirements: 19.1–19.5_

  - [x] 5.2 Migrate `QueueNode`, `ServerNode`, `ServiceNode`, `StorageNode`, `UserNode` in `packages/nodes/src/`
    - Add `defaultPorts` constant per node (QueueNode: enqueue/dequeue; ServerNode: in/out/health; ServiceNode: in/out; StorageNode: read/write; UserNode: request)
    - Add `defaultStatus = 'unknown' as const`
    - Pass `status` and `ports` through to `<BaseNode>`
    - Call `NodeRegistry.register('<type>', Component)` at module load for each
    - _Requirements: 19.1–19.5_

  - [x] 5.3 Write property test for node status prop pass-through
    - **Property 10: Node status prop pass-through in all 10 domain nodes** — for each of the 10 components, generate random `NodeStatus` values; render; assert `BaseNode` receives the same status
    - **Validates: Requirement 19.5**
    - File: `packages/nodes/src/tests/nodes.property.test.ts`
    - Tag: `// Feature: integration-wiring-phase, Property 10`

- [x] 6. Checkpoint — Nodes phase complete
  - Ensure all node tests pass, ask the user if questions arise.

- [x] 7. Phase 4 — Playground: toolbar, status bar, inspector, shortcuts, autocomplete, presets
  - [x] 7.1 Extend `playground/src/features/playground/components/TopBar.tsx`
    - Add undo/redo buttons with `aria-disabled` when `canUndo`/`canRedo` is false; wire to `onUndo`/`onRedo` props
    - Add zoom-to-fit button wired to `onZoomToFit`
    - Replace single PNG export button with export dropdown (PNG / SVG / GLTF) wired to `onExport(format)`
    - Add layout selector `<select>` with options: auto, grid, circular, hierarchical, forced; wire to `onLayoutChange`
    - Add minimap toggle, post-processing toggle, grid-snap toggle buttons
    - _Requirements: 20.1–20.8_

  - [x] 7.2 Wire `playground/src/features/playground/components/StatusBar.tsx`
    - Read `selectionCount` (from `selectionSet.size`), `undoDepth`, `layoutName`, `fps` from store/context
    - Display: `"{N} selected" | "No selection" · {undoDepth} undo · {layoutName} · {fps}fps`
    - Update FPS display at most once per second
    - _Requirements: 21.1–21.5_

  - [x] 7.3 Write property test for status bar data reflection
    - **Property 9: Status bar data reflects store state** — generate random store states; render StatusBar; assert displayed values match store
    - **Validates: Requirements 21.1, 21.2, 21.3**
    - File: `packages/renderer/src/tests/statusbar.property.test.ts`
    - Tag: `// Feature: integration-wiring-phase, Property 9`

  - [x] 7.4 Extend `playground/src/features/playground/components/NodeInspector.tsx`
    - Add status dropdown for selected nodes (none/healthy/warning/error/unknown)
    - Add badges list with add/remove controls for selected nodes
    - Add ports list with add/remove controls for selected nodes
    - Add routing dropdown for selected edges (straight/curved/orthogonal)
    - Add flow toggle + speed/count/color inputs for selected edges
    - Add collapse/expand toggle for selected groups
    - All edits call `printVrd(newAst)` to regenerate source and `state.setCode(newSource)`
    - _Requirements: 22.1–22.7_

  - [x] 7.5 Write property test for inspector source update round-trip
    - **Property 11: Inspector source update round-trip** — generate random node prop values; apply via inspector update function; parse result; assert prop value in AST matches input
    - **Validates: Requirement 22.7**
    - File: `playground/src/tests/inspector.property.test.ts`
    - Tag: `// Feature: integration-wiring-phase, Property 11`

  - [x] 7.6 Create `playground/src/features/playground/components/KeyboardShortcutHelp.tsx`
    - Modal overlay with `role="dialog"` and `aria-modal="true"` listing all shortcuts
    - Closed by `Escape` or `?`; opened by `?` key
    - _Requirements: 23.2, 23.3_

  - [x] 7.7 Extend `playground/src/features/playground/hooks/useKeyboardShortcuts.ts`
    - Add `?` key handler to open/close `KeyboardShortcutHelp` overlay
    - Guard all shortcuts so they do not fire when Monaco editor has focus
    - _Requirements: 23.1, 23.4_

  - [x] 7.8 Extend `playground/src/features/playground/hooks/useMonacoLanguage.ts`
    - Add all new keywords as completion items: shape, status, badge, port, enter, exit, animation-duration, routing, flow, flow-speed, flow-count, flow-color, collapsed, minimap, post-processing, bloom-intensity, snap-to-grid, grid-size, direction, layer-spacing, node-spacing
    - Add context-aware value completions: after `shape:` suggest 14 ShapeType values; after `status:` suggest 4 NodeStatus values; after `routing:` suggest 3 RoutingType values
    - _Requirements: 24.1–24.5_

  - [x] 7.9 Add 5 new preset `.vrd` files to `playground/src/features/playground/presets/`
    - `hierarchical-microservices.vrd`: ≥8 nodes, `layout: hierarchical`, `direction: LR`
    - `flow-pipeline.vrd`: `flow: true`, `flow-speed` configured on edges
    - `collapsed-groups.vrd`: at least one collapsed group
    - `node-status-demo.vrd`: all 4 NodeStatus values across nodes
    - `bloom-showcase.vrd`: `post-processing: true`, `bloom-intensity` configured
    - Register each in the existing preset registry
    - _Requirements: 25.1–25.5_

- [x] 8. Checkpoint — Playground phase complete
  - Ensure all playground tests pass, ask the user if questions arise.


- [x] 9. Phase 5 — Testing: integration tests, benchmarks, visual regression, accessibility
  - [x] 9.1 Write parser pipeline integration test
    - File: `packages/renderer/src/tests/integration/parser-pipeline.test.ts`
    - Parse a `.vrd` source containing all new syntax (shapes, status, badges, ports, routing, flow, collapse, new config keys)
    - Assert resulting `VrdAST` contains expected values with zero error diagnostics
    - _Requirements: 26.1_

  - [x] 9.2 Write selection flow integration test
    - File: `packages/renderer/src/tests/integration/selection-flow.test.ts`
    - Mount renderer; click node → assert `SelectionManager.selectedIds` contains node ID; click empty area → assert selection cleared
    - _Requirements: 26.3_

  - [x] 9.3 Write undo/redo integration test
    - File: `packages/renderer/src/tests/integration/undo-redo.test.ts`
    - Move node → undo → assert original position → redo → assert moved position
    - _Requirements: 26.4_

  - [x] 9.4 Write export integration test
    - File: `packages/renderer/src/tests/integration/export.test.ts`
    - Mount renderer; call `PNGExport.capture()`, `SVGExport.capture()`, `GLTFExport.capture()`; assert each returns non-empty result without mutating scene
    - _Requirements: 26.5_

  - [x] 9.5 Write group collapse integration test
    - File: `packages/renderer/src/tests/integration/group-collapse.test.ts`
    - Mount renderer with collapsed group; assert child nodes not rendered and proxy node shown; expand; assert child nodes reappear
    - _Requirements: 26.6_

  - [x] 9.6 Write performance benchmarks
    - File: `packages/renderer/src/tests/benchmarks/performance.bench.ts`
    - Benchmark 100 nodes / 150 edges: assert ≥60 fps over 5s
    - Benchmark 500 nodes / 700 edges: assert ≥30 fps over 5s
    - Benchmark 1000 nodes: assert no crash and ≥10 fps
    - Memory leak test: mount/unmount 200-node scene 10 times; assert heap delta ≤10 MB
    - _Requirements: 27.1–27.5_

  - [x] 9.7 Write visual regression snapshots
    - Directory: `playground/tests/visual/`
    - Snapshot each of the 14 ShapeType values at default size with no status
    - Snapshot each of the 4 NodeStatus values on a cube node
    - Snapshot light and dark themes on a 5-node diagram
    - Snapshot collapsed group and expanded group
    - Fail when pixel difference > 0.1%
    - _Requirements: 28.1–28.5_

  - [x] 9.8 Write accessibility audit tests
    - Directory: `playground/tests/a11y/`
    - Verify all 10 node components render ARIA live region with label and status on focus
    - Verify canvas has non-empty `aria-label`
    - Verify Tab/Shift+Tab moves focus without trapping
    - Verify ContextMenu is keyboard-reachable and all items activatable via Enter/Space
    - Verify status color pairs meet 3:1 contrast ratio for both themes
    - _Requirements: 29.1–29.5_

- [x] 10. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass across all packages, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Phases 2 and 3 can be executed in parallel once Phase 1 (tasks 1–2) is complete
- Phase 4 (tasks 7–8) depends on both Phase 2 and Phase 3 being complete
- Phase 5 (tasks 9–10) depends on Phase 4 being complete
- Property tests use fast-check with `fc.configureGlobal({ numRuns: 100 })` and are tagged with `// Feature: integration-wiring-phase, Property N`
- Unit tests and property tests are complementary: unit tests catch concrete bugs, property tests verify general correctness
