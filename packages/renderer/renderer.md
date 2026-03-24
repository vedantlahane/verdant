```markdown
# renderer.md
# Verdant Renderer — Complete Architecture Reference
> **Last updated:** 2025-01-XX
> **Purpose:** Eliminate need to share full source files during refactoring sessions.
> Every file, type, constant, data flow, known issue, and design decision is documented here.

---

## Table of Contents

1. [High-Level Architecture](#1-high-level-architecture)
2. [Directory Structure](#2-directory-structure)
3. [Dependency Graph](#3-dependency-graph)
4. [Data Flow](#4-data-flow)
5. [File Reference](#5-file-reference)
   - [Root Files](#51-root-files)
   - [grid/](#52-grid)
   - [nodes/](#53-nodes)
   - [hooks/](#54-hooks)
   - [measurement/](#55-measurement)
   - [renderer/](#56-renderer)
   - [camera/](#57-camera)
6. [Store Schema](#6-store-schema)
7. [Type Definitions](#7-type-definitions)
8. [Constants Reference](#8-constants-reference)
9. [Design Patterns](#9-design-patterns)
10. [Performance Architecture](#10-performance-architecture)
11. [Known Issues & Status](#11-known-issues--status)
12. [External Dependencies](#12-external-dependencies)
13. [Public API Surface](#13-public-api-surface)

---

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  VerdantRenderer.tsx                                            │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  R3F <Canvas>                                             │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │  <PrimitivesProvider>                               │  │  │
│  │  │  ┌───────────────────────────────────────────────┐  │  │  │
│  │  │  │  SceneContent.tsx (forwardRef)                │  │  │  │
│  │  │  │  ├── InfiniteAxes (fade lines + ticks + labels)│ │  │  │
│  │  │  │  ├── PivotIndicator (orbit target gizmo)     │  │  │  │
│  │  │  │  ├── NodeReferenceBox (origin-to-node cuboids)│  │  │  │
│  │  │  │  ├── MeasurementLinesGroup → DimensionLine[]  │  │  │  │
│  │  │  │  ├── NodesLayer → DraggableNode[]             │  │  │  │
│  │  │  │  ├── EdgesLayer → EdgeLine[]                  │  │  │  │
│  │  │  │  ├── GroupsLayer → GroupContainer/NestedGroup  │  │  │  │
│  │  │  │  ├── OrbitControls                            │  │  │  │
│  │  │  │  └── SceneLighting                            │  │  │  │
│  │  │  └───────────────────────────────────────────────┘  │  │  │
│  │  │  <CameraTracker />                                  │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
│  <MinimapOverlay />                                             │
│  <ContextMenuOverlay />                                         │
└─────────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
   Zustand Store        localStorage         @verdant/primitives
   (store.ts)       (store.persistence.ts)   (SelectionManager,
                                              CommandHistory,
                                              TransitionEngine)
```

**Core pattern:** VRD AST → Zustand store → React Three Fiber scene graph → Three.js WebGL/WebGPU

**State ownership:**
- **Zustand store** owns: AST, positions, selection, hover, theme, context menu, undo depth
- **@verdant/primitives** owns: SelectionManager, CommandHistory, TransitionEngine
- **Bidirectional sync** between store ↔ primitives via `usePrimitivesSync` hook
- **localStorage** persists: positions, selectedNodeId, themeName, camera view state

---

## 2. Directory Structure

```
src/
├── index.ts                    # Public barrel export
├── shared.ts                   # __DEV__ flag (consolidated)
├── constants.ts                # All magic numbers & config values
├── types.ts                    # All TypeScript types & interfaces
├── utils.ts                    # Pure utility functions (Vec3, hashing, projection, zoomToFit)
├── store.ts                    # Zustand store (singleton, module-scoped)
├── store.persistence.ts        # localStorage read/write with AST-signature keys
├── layout.ts                   # Layout algorithms (grid, circular, hierarchical, force-directed)
├── VerdantRenderer.tsx         # Top-level component (Canvas, providers, overlays)
├── SceneContent.tsx            # Main 3D scene orchestrator (forwardRef)
│
├── grid/
│   ├── index.ts                # Barrel export with architecture docs
│   ├── RaycastFloor.tsx        # Invisible plane for raycasting (currently unused after double-click rework)
│   ├── AxisLines.tsx           # Simple 3-line axes (currently unused — replaced by InfiniteAxes)
│   ├── InfiniteAxes.tsx        # Fading axes + ticks + number labels (active)
│   ├── PivotIndicator.tsx      # Orbit target gizmo
│   └── NodeReferenceBox.tsx    # Per-node wireframe cuboid from origin
│
├── nodes/
│   ├── index.ts                # Barrel export
│   ├── DraggableNode.tsx       # Drag wrapper + custom arePropsEqual
│   └── nodeMap.ts              # Type string → React component registry
│
├── hooks/
│   ├── index.ts                # Barrel export with hook catalog
│   ├── useAutoRotate.ts        # Idle-triggered camera rotation
│   ├── useCursorTracking.ts    # Pointer → world-space projection
│   ├── useDraggable.ts         # Zero-alloc drag loop
│   ├── useKeyboardNavigation.ts# Keyboard shortcuts (Tab, F, Ctrl+Z/Y)
│   ├── usePrimitivesSync.ts    # Store ↔ primitives bidirectional sync
│   └── useViewPersistence.ts   # Throttled camera state persistence
│
├── measurement/
│   ├── index.ts                # Barrel export
│   ├── MeasurementLinesGroup.tsx # Maps data → DimensionLine components
│   └── DimensionLine.tsx       # Single dashed line + wings + label
│
├── renderer/
│   ├── index.ts                # Barrel export
│   ├── detectWebGPU.ts         # 3-stage WebGPU availability check
│   ├── createRenderer.ts       # Factory: WebGL/WebGPU renderer creation
│   └── useRenderer.ts          # React hook: "instant WebGL, optional WebGPU upgrade"
│
└── camera/
    ├── index.ts                # Barrel export
    └── CameraTracker.tsx       # useFrame-based camera state emitter
```

---

## 3. Dependency Graph

```
VerdantRenderer.tsx
├── store.ts
├── store.persistence.ts
├── SceneContent.tsx
│   ├── grid/InfiniteAxes.tsx ← constants, types, store, utils
│   ├── grid/PivotIndicator.tsx ← constants, types, utils, store
│   ├── grid/NodeReferenceBox.tsx ← constants, types, store, utils
│   ├── nodes/DraggableNode.tsx
│   │   ├── nodes/nodeMap.ts ← @verdant/nodes
│   │   └── hooks/useDraggable.ts ← store, utils
│   ├── measurement/MeasurementLinesGroup.tsx
│   │   └── measurement/DimensionLine.tsx ← constants, types
│   ├── hooks/useAutoRotate.ts ← constants
│   ├── hooks/useCursorTracking.ts ← types
│   ├── hooks/useKeyboardNavigation.ts ← store, utils (zoomToFit)
│   ├── hooks/usePrimitivesSync.ts ← store, constants
│   └── hooks/useViewPersistence.ts ← types, constants
├── renderer/useRenderer.ts
│   └── renderer/detectWebGPU.ts
├── camera/CameraTracker.tsx ← constants, types
├── layout.ts ← constants, utils
├── utils.ts ← types, constants
├── constants.ts ← types
├── types.ts (leaf — no internal imports)
└── shared.ts (leaf — no internal imports)
```

**Critical constraint:** `utils.ts` must NOT import from any component file. `zoomToFit` lives in `utils.ts` to avoid circular imports.

---

## 4. Data Flow

### 4.1 AST Ingestion

```
VrdAST (from @verdant/parser)
  │
  ▼
VerdantRenderer.tsx: useEffect → setAst(ast)
  │
  ▼
store.ts setAst():
  ├── Read persisted state from localStorage
  ├── Determine: first load vs incremental update vs layout change
  ├── First load / layout change → computeLayout() [layout.ts]
  │   └── Returns Map<string, MutVec3>
  ├── Incremental → keep existing positions + computePositionsForNewNodes()
  ├── Apply user position overrides (node.props.position)
  ├── Resolve theme (AST config > persisted > current)
  ├── Resolve selection (current > persisted, validated against node IDs)
  └── Commit to store + schedule persistence
```

### 4.2 Drag Flow

```
Pointer down on DraggableNode
  │
  ▼
useDraggable.onPointerDown:
  ├── Establish drag plane (perpendicular to camera at node depth)
  ├── Compute pointer offset from node center
  ├── Set pointer capture
  ├── Disable OrbitControls
  └── setDraggingNode(nodeId)

Pointer move (60fps)
  │
  ▼
useDraggable.onPointerMove:
  ├── Project pointer onto drag plane (zero alloc — reuse raycaster+vectors)
  ├── Subtract offset → new world position
  ├── Validate (reject NaN/Infinity)
  ├── Write to positionRef (immediate visual feedback)
  └── store.updateNodePosition(id, pos)
      └── Shallow spread: { ...positions, [id]: pos }
          └── schedulePersist (debounced 300ms)

Pointer up
  │
  ▼
useDraggable.onPointerUp:
  ├── Release pointer capture
  ├── Re-enable OrbitControls
  └── setDraggingNode(null)
```

### 4.3 Selection Flow

```
Click on node (after drag disambiguation via hasMovedRef)
  │
  ▼
DraggableNode.handleClick → SceneContent.handleNodeClick
  ├── store.selectNode(id) → sets selectionSet + selectedNodeId
  ├── Project position to screen coords
  └── Call onNodeClick callback

  ↕ Bidirectional sync (usePrimitivesSync)

primitives SelectionManager.onChange → store.setSelectionSet
store.selectNode → primitives SelectionManager.select
```

### 4.4 Double-Click-to-Pivot Flow

```
Native dblclick on canvas element
  │
  ▼
SceneContent useEffect handler:
  ├── Convert clientX/Y → NDC
  ├── Build plane perpendicular to camera at orbit target depth
  ├── Raycast from NDC onto plane → world hit point
  ├── Compute offset = hit - currentTarget
  ├── camera.position += offset (preserves viewing direction)
  ├── controls.target = hit
  └── setOrbitTarget(hit) → triggers PivotIndicator re-render
```

### 4.5 Persistence Flow

```
Any state change (selectNode, updateNodePosition, setTheme)
  │
  ▼
schedulePersist(get) → debounced 300ms
  │
  ▼
writePersistedState(ast, positions, selectedNodeId, themeName)
  ├── Compute AST signature (DJB2 hash of sorted node IDs + edge pairs)
  ├── Key: "verdant:renderer:v1:{base36hash}"
  └── JSON.stringify → localStorage.setItem

Camera view changes (OrbitControls onChange)
  │
  ▼
useViewPersistence → throttled 180ms
  ├── Key: "verdant:renderer:view:v1:{base36hash}"
  └── Writes: { position: Vec3, target: Vec3, fov: number }
```

---

## 5. File Reference

### 5.1 Root Files

#### `shared.ts`
- **Exports:** `__DEV__` (boolean)
- **Logic:** `process.env.NODE_ENV !== 'production'`
- **Consumers:** `store.persistence.ts`, `createRenderer.ts`
- **Note:** Consolidated from duplicated inline checks (Bug #25)

#### `constants.ts`
- **Exports:** ~70 named constants across 12 sections
- **Sections:** Layout, Infinite Axes, Axis Tick Marks, Negative Axis Colors, Node Reference Box, Pivot Indicator, Axis Gizmo, Measurement Lines, Camera & Controls, Rendering, Persistence, Safety Limits
- **Legacy section:** `GRID_SIZE`, `AXIS_LENGTH`, `MAJOR_STEP`, `MINOR_STEP`, `FADE_START`, `FADE_END` — all `@deprecated`
- **Key values:** See [Section 8](#8-constants-reference)

#### `types.ts`
- **Exports:** 15 types/interfaces + 1 const (`CONTEXT_MENU_CLOSED`)
- **Core types:** `Vec3`, `MutVec3`, `AxisId`
- **Component props:** `VerdantRendererProps`, `SceneContentProps`, `VerdantRendererHandle`
- **Data:** `CameraData`, `CursorData`, `MeasurementLine`, `SceneBounds`, `PersistedViewState`, `NodeClickInfo`, `ScreenPoint`, `ContextMenuState`
- **Deprecated:** `TickData`
- **`ContextMenuState`** is a discriminated union (visible:true | visible:false) preventing invalid states

#### `utils.ts`
- **Exports:** 12 functions + 1 const
- **Vec3:** `VEC3_ORIGIN`, `vec3Distance`, `vec3DistanceSq`, `isFiniteVec3`, `sanitizeVec3`
- **Set:** `setsEqual`
- **Scene:** `computeSceneBounds`, `zoomToFit`, `projectToScreen`
- **Random/Hash:** `seededRandom` (Park-Miller LCG), `hashString` (DJB2), `hashForStorageKey`
- **Groups:** `safeGroupWalk` (iterative DFS, cycle detection, max depth)
- **DOM:** `detectDarkMode` (data-theme attr > --page-bg CSS var > dark fallback)
- **Deprecated:** `sanitizePosition` (use `sanitizeVec3`)
- **Module-scoped pooled objects:** `_projVec` (Vector3), `_zoomOffset` (Vector3)
- **Critical:** This file must NOT import from any component file to avoid circular deps

#### `store.ts`
- **Exports:** `useRendererStore` (Zustand hook), `cancelPendingPersist`, `flushPendingPersist`
- **Middleware:** `subscribeWithSelector` for efficient slice subscriptions
- **Full schema:** See [Section 6](#6-store-schema)
- **Module-scoped state:** `persistTimer` (debounce timer — one per app, prevents multi-instance)
- **Helper functions (internal):** `resolveTheme`, `resolveSelection`, `buildNodeIndex`, `computeFirstLoadPositions`, `computeIncrementalPositions`, `applyUserPositionOverrides`
- **Frozen singletons:** `EMPTY_SET`, `EMPTY_DIAGNOSTICS`, `EMPTY_NODE_INDEX`

#### `store.persistence.ts`
- **Exports:** `readPersistedState`, `writePersistedState`, `getAstViewStorageKey`, `readViewState`, `writeViewState`, `clearAllPersistedState`, `clearPersistedStateForAst`
- **Type:** `PersistedRendererState { positions, selectedNodeId, themeName }`
- **Key scheme:** `verdant:renderer:v1:{base36hash}` / `verdant:renderer:view:v1:{base36hash}`
- **AST signature:** DJB2 of sorted node IDs + edge from→to:label pairs
- **Validation:** Full runtime validation on read (Vec3 shape, finite check, type checks)
- **Safety:** SSR guard (`typeof window`), quota exceeded silently ignored, key length limit

#### `layout.ts`
- **Exports:** `computeLayout`, `computePositionsForNewNodes`
- **Types:** `LayoutType` (`'auto'|'grid'|'circular'|'hierarchical'|'forced'`), `LayoutDirection` (`'TB'|'LR'`)
- **Internal buffer:** `PositionBuffer` — flat `Float64Array` x/y/z with ID↔index mapping
- **Algorithms:**
  - **Grid:** `Math.ceil(sqrt(n))` columns, centered on origin
  - **Circular:** circumference-based radius, angle offset -π/2
  - **Hierarchical:** delegates to `@verdant/primitives HierarchicalLayout`, supports LR rotation
  - **Force-directed (default):** Fruchterman-Reingold variant, O(n²) repulsion, edge attraction, group cohesion, overlap penalty, simulated annealing with linear temperature decay
- **Post-processing pipeline:** sanitize → enforce minimum distances → sanitize → apply user overrides
- **Deterministic:** Seeded PRNG from hashed node IDs for reproducible layouts
- **`computePositionsForNewNodes`:** Places near connected neighbors or centroid, enforces distances across ALL nodes (but only writes back new positions — partial effectiveness issue noted)

#### `VerdantRenderer.tsx`
- **Component:** Top-level, `React.forwardRef<VerdantRendererHandle>`
- **Responsibilities:**
  - Create R3F Canvas with renderer config from `useRenderer`
  - Hydrate Zustand store from AST (`useEffect → setAst`)
  - Load persisted camera view state
  - Provide `PrimitivesProvider` context
  - Bridge imperative handle (undo/redo/zoomToFit/resetCamera)
  - Render overlays (Minimap, ContextMenu) outside Canvas
  - External callback emissions via `useExternalCallback` (with equality check for sets)
- **Internal components:** `ContextMenuOverlay` (memo), `MinimapOverlay` (memo)
- **Internal hook:** `useExternalCallback<T>` — fires callback only when value changes (skips first render, uses optional equality fn)
- **`astConfigToPrimitivesConfig`:** Converts VrdConfig → PrimitivesConfig (minimap, post-processing, bloom, undo history)

#### `SceneContent.tsx`
- **Component:** `React.forwardRef<VerdantRendererHandle, SceneContentProps>`
- **Responsibilities:**
  - Wire all hooks (autoRotate, cursorTracking, keyboard, primitives sync, view persistence)
  - Manage orbit target state for PivotIndicator
  - Double-click-to-pivot via native canvas dblclick handler
  - Node click → selection + screen projection + callback
  - Hover management (cursor style changes)
  - Context menu on right-click
  - Imperative handle (undo/redo/zoomToFit/resetCamera)
- **Sub-components (all `React.memo`):**
  - `EdgesLayer` — maps `ast.edges` → `EdgeLine` components
  - `GroupsLayer` — uses `safeGroupWalk`, `computeGroupBounds`, renders `GroupContainer`/`NestedGroup`
  - `NodesLayer` — maps `ast.nodes` → `DraggableNode` components
  - `SceneLighting` — ambient + directional (shadow) + point
- **Internal functions:** `useMeasurementLines`, `collectGroupNodeIds`, `computeGroupBounds`
- **Module-scoped pooled objects:** `_dblClickRaycaster`, `_dblClickNDC`, `_dblClickNormal`, `_dblClickPlane`, `_dblClickHit`, `_dblClickOffset`
- **OrbitControls config:** damping 0.05, distance 3–80, auto-rotate on idle

---

### 5.2 grid/

#### `grid/RaycastFloor.tsx`
- **Status:** Available but currently UNUSED (removed from SceneContent after double-click rework)
- **Renders:** Invisible 10,000×10,000 PlaneGeometry at Y=-0.004
- **Geometry:** Module-level singleton (never disposed — intentional for reuse)
- **Potential future use:** Drag-to-ground-plane snapping

#### `grid/AxisLines.tsx`
- **Status:** Available but currently UNUSED (replaced by InfiniteAxes)
- **Renders:** 3 colored `lineSegments` through origin + small white sphere
- **Dynamic extent:** Reads `positions` from store → `computeSceneBounds` → axes extend to cover all nodes + `AXIS_EXTENT_PADDING`
- **Module-level singletons:** `MAT_X/Y/Z` (LineBasicMaterial, opacity 0.6), `ORIGIN_GEO/MAT`
- **Cleanup:** Disposes per-render geometries via useEffect return

#### `grid/InfiniteAxes.tsx` ★ ACTIVE
- **Renders:**
  - Fade segments: 5 distance-based opacity bands per axis × 2 directions = 30 line segments
  - Positive direction: full axis colors (`AXIS_COLOR_X/Y/Z`)
  - Negative direction: muted colors (`AXIS_COLOR_X_NEG/Y_NEG/Z_NEG`)
  - Tick marks: perpendicular line at every `AXIS_TICK_INTERVAL` (5u) up to `AXIS_TICK_RANGE` (500u)
  - Tick labels: HTML overlays at every `AXIS_TICK_LABEL_INTERVAL` (10u) up to `AXIS_LABEL_RANGE` (100u)
  - Origin sphere (0.08 radius, white, 50% opacity)
- **Negative label colors:** Labels at negative values use `AXIS_COLORS_NEG`
- **Dependencies:** store (themeColors for dark mode), `detectDarkMode`, constants
- **Performance note:** 60 HTML overlay elements (3 axes × 20 labels). Consider LOD for large scenes.
- **Sub-component:** `TickLabel` (memo) — positioned via `Html` from drei, `distanceFactor=20`

#### `grid/PivotIndicator.tsx` ★ ACTIVE
- **Props:** `{ target: Vec3 }`
- **Renders:**
  - 3 local axis lines at pivot position (length = `PIVOT_AXIS_LENGTH` = 2.5)
  - White center sphere (0.05 radius)
  - 3 dashed reference lines from pivot to world axes (e.g., pivot→(pivot.x, 0, pivot.z))
  - HTML coordinate label "(x, y, z)" at pivot
- **Module-level materials:** `LOCAL_MAT_X/Y/Z`, `REF_MAT_X/Y/Z`, `CENTER_GEO/MAT`
- **Geometry lifecycle:** Created in useMemo(pivot), disposed in useEffect cleanup
- **Line distances:** Computed once in useEffect (not per-frame)

#### `grid/NodeReferenceBox.tsx` ★ ACTIVE
- **Props:** `{ mode?: 'selected' | 'all' }`
- **Renders:** Per-node dashed wireframe cuboid from (0,0,0) to (x,y,z)
  - X-parallel edges → red dashed
  - Y-parallel edges → green dashed
  - Z-parallel edges → blue dashed
  - Coordinate labels at edge midpoints + combined label near node
- **Edge skip:** Hides edge when dimension < `REFERENCE_BOX_MIN_DIM` (0.1)
- **Mode 'selected':** Only selected + hovered nodes, full opacity, with labels
- **Mode 'all':** Every node at faint opacity, labels only for active nodes
- **Sub-component:** `CoordLabel` (memo), `SingleNodeBox` (memo)
- **Geometry lifecycle:** Per SingleNodeBox — create in useMemo, dispose in useEffect

---

### 5.3 nodes/

#### `nodes/nodeMap.ts`
- **Registry:** `NODE_REGISTRY` — frozen Record mapping lowercase type strings to components
- **Supported types (21 keys → 10 components):**
  - `server` → ServerNode
  - `database`, `db` → DatabaseNode
  - `cache`, `redis` → CacheNode
  - `gateway`, `api` → GatewayNode
  - `service`, `microservice` → ServiceNode
  - `user`, `client` → UserNode
  - `queue`, `mq` → QueueNode
  - `cloud`, `cdn` → CloudNode
  - `storage`, `s3`, `blob` → StorageNode
  - `monitor`, `metrics`, `observability` → MonitorNode
- **Fallback:** `ServerNode` for unknown types
- **API:** `getNodeComponent(type)`, `isKnownNodeType(type)`, `getRegisteredNodeTypes()`
- **Deprecated:** `NODE_MAP` (direct registry access)

#### `nodes/DraggableNode.tsx`
- **Props interface:** `DraggableNodeProps` — node, position, isSelected, isHovered, color, controlsRef, onNodeClick, onHoverEnter, onHoverLeave
- **Renders:** `<group onPointer*>` wrapping the resolved node component
- **Drag:** Delegates to `useDraggable` hook (returns handlers + `hasMovedRef`)
- **Click disambiguation:** Reads `hasMovedRef.current` inside handleClick — if moved, suppresses click
- **Custom `arePropsEqual`:** Checks 17 fields individually:
  - Identity: node.id, node.type
  - Visual: isSelected, isHovered, color
  - Position: value equality on all 3 components
  - Node props: label, size, glow, shape, status, badges, ports, subtitle, enterAnimation, bindings, visible, locked, breathe, animationDuration
  - Callbacks: onNodeClick, onHoverEnter, onHoverLeave (referential)
- **`buildNodeProps`:** Extracts from `node.props` with `as` casts (no runtime validation)

---

### 5.4 hooks/

#### `hooks/useAutoRotate.ts`
- **Signature:** `useAutoRotate(controlsRef, enabled) → { isInteractingRef, handleInteractionStart, handleInteractionEnd }`
- **Logic:** useFrame increments idle timer; sets `autoRotate=true` after `AUTO_ROTATE_IDLE_THRESHOLD` (3s)
- **Bug #6 fix:** useEffect clears autoRotate when `enabled` flips to false
- **Used by:** SceneContent (wired to OrbitControls onStart/onEnd)

#### `hooks/useCursorTracking.ts`
- **Signature:** `useCursorTracking(controlsRef, onCursorMove?) → void`
- **Logic:** Projects pointer onto camera-facing plane at orbit target depth
- **useFrame:** Updates plane normal + coplanar point each frame
- **useEffect:** Adds pointermove/pointerleave listeners to canvas
- **Pooled objects:** `raycaster` (useMemo), `plane/normal` (useRef), `hitPoint/ndc` (useMemo)
- **Output:** Calls `onCursorMove({ x, y, z })` with 1-decimal precision, or `null` on miss/leave

#### `hooks/useDraggable.ts`
- **Signature:** `useDraggable(options) → DraggableHandlers { onPointerDown, onPointerMove, onPointerUp, hasMovedRef }`
- **Options:** `{ nodeId, positionRef, onDragStart, onDragEnd }`
- **Internal state:** `DragState` ref — all Three.js objects allocated once (lazy init)
  - `raycaster`, `plane`, `offset`, `intersection`, `ndc`, `camDir`, `worldPos`, `startPos`
- **Drag plane:** Perpendicular to camera at node's world position depth
- **Movement threshold:** 0.05 world units (for click vs drag disambiguation)
- **Validation:** Rejects NaN/Infinity positions via `isFiniteVec3`
- **Safety:** useEffect cleanup cancels drag if component unmounts mid-drag
- **Store interactions:** `updateNodePosition`, `setDraggingNode`

#### `hooks/useKeyboardNavigation.ts`
- **Signature:** `useKeyboardNavigation(controlsRef) → void`
- **Shortcuts:**
  - `Tab` / `Shift+Tab` — cycle focus through node IDs
  - `Enter` / `Space` — select focused node
  - `F` — zoom to fit (calls `zoomToFit` from utils)
  - `Ctrl+Z` — undo
  - `Ctrl+Shift+Z` / `Ctrl+Y` — redo
- **Focus tracking:** `focusedIdxRef` (useRef, persists across effect re-runs)
- **Guard:** `isEditorFocused` skips when Monaco editor, inputs, textareas, or contentEditable is focused
- **Bug #14 fix:** focusedIdx moved from closure variable to ref

#### `hooks/usePrimitivesSync.ts`
- **Signature:** `usePrimitivesSync() → void`
- **Syncs:**
  - `commandHistory.subscribe` → `setUndoDepth`, `setCanRedo`
  - `selectionManager.onChange` → `setSelectionSet`
  - Enter animations: iterates `ast.nodes`, calls `transitionEngine.playEnter`
  - Layout transitions: `transitionEngine.playLayoutTransition` with position Map
- **Bug #1 fix:** Skips layout transitions while `draggingNodeId` is non-null
- **Bug #1 fix:** Tracks `prevPositionsRef` to skip when positions reference hasn't changed

#### `hooks/useViewPersistence.ts`
- **Signature:** `useViewPersistence(controlsRef, onViewChange?) → (() => void) | undefined`
- **Returns:** Stable callback for OrbitControls `onChange`, or `undefined` if no persistence needed
- **Throttle:** `VIEW_PERSIST_THROTTLE_MS` (180ms) via `performance.now()` comparison
- **Reads from controls:** `camera position`, `target`, `fov`
- **Emits:** `PersistedViewState` to callback

---

### 5.5 measurement/

#### `measurement/MeasurementLinesGroup.tsx`
- **Props:** `{ lines: readonly MeasurementLine[], accentColor?: string }`
- **Default accent:** `'#52B788'`
- **Returns null** when `lines.length === 0` (no empty group in scene graph)
- **Keys:** `${fromId}-${toId}-${index}` (handles parallel edges)
- **Custom `arePropsEqual`:** Fast-path referential, then per-line shallow comparison of all 10 fields

#### `measurement/DimensionLine.tsx`
- **Props:** `MeasurementLine & { accentColor: string }`
- **Renders:**
  - Dashed line between from/to (LineDashedMaterial)
  - Perpendicular wing markers at both endpoints (LineBasicMaterial)
  - HTML label at midpoint (distance in units + optional edge label + direction arrow)
- **Color:** Outgoing = accentColor, incoming = `'#e57373'` (red)
- **Animation:** Fade-in via useFrame, opacity interpolates at `MEASUREMENT_FADE_SPEED` (4)
- **Memo key:** `endpointKey` — string serialization of both Vec3 endpoints
- **Pooled objects:** `_wingDir`, `_wingPerp`, `_wingUp`, `_wingRight` (module-scoped)
- **Bug #8 fix:** Temporary Line for computeLineDistances is detached from geometry before disposal

---

### 5.6 renderer/

#### `renderer/detectWebGPU.ts`
- **Exports:** `isWebGPUAvailable` (async), `isWebGPUAvailableSync`, `detectBestBackend`, `_resetDetectionCache` (test-only)
- **3-stage check:** navigator.gpu → requestAdapter → requestDevice → device.destroy()
- **Caching:** Module-scoped `_cachedResult` / `_cachedPromise` (deduplicates concurrent calls)
- **Never throws** — catches all errors, returns false

#### `renderer/createRenderer.ts`
- **Exports:** `createWebGLRenderer` (sync), `createWebGPURenderer` (async), `createOptimalRenderer` (async, fallback)
- **WebGPU:** Dynamic import `three/webgpu`, calls `renderer.init()` (async GPU device)
- **Type cast:** `renderer as unknown as THREE.WebGLRenderer` for R3F compatibility
- **`createOptimalRenderer`:** Tries WebGPU, catches any error → falls back to WebGL
- **Note:** These factory functions are currently NOT called by the app — `useRenderer` provides plain WebGL config to Canvas

#### `renderer/useRenderer.ts`
- **Exports:** `useRenderer(options?) → UseRendererResult`
- **Strategy:** Mount immediately with WebGL, detect WebGPU in parallel, set backend state
- **Returns:** `{ backend, isDetected, canvasKey, remount, glConfig, handleCreated }`
- **Context recovery:** Listens for `webglcontextlost`/`webglcontextrestored` on canvas, increments `canvasKey` to force remount
- **Known issue:** `glConfig` is always plain WebGL config regardless of `backend` state — WebGPU is detected but never activated

---

### 5.7 camera/

#### `camera/CameraTracker.tsx`
- **Not provided in code review** — summarized from usage
- **Mounted in:** VerdantRenderer (conditionally, when `onCameraChange` is provided)
- **Behavior:** useFrame reads camera state every `CAMERA_EMIT_FRAME_INTERVAL` (8) frames
- **Emits:** `CameraData` { position, fov, distance, effectiveFov, axisProjections }

---

## 6. Store Schema

```typescript
interface RendererState {
  // ── Data ──
  ast: VrdAST | null;                              // Parsed VRD document
  nodeIndex: ReadonlyMap<string, VrdNode>;          // id → node lookup
  positions: Record<string, Vec3>;                  // id → [x,y,z]
  diagnostics: readonly VrdDiagnostic[];            // Parser warnings/errors

  // ── Selection ──
  selectionSet: ReadonlySet<string>;                // Multi-select set
  selectedNodeId: string | null;                    // Primary selection (first in set)

  // ── Interaction ──
  hoveredNodeId: string | null;                     // Pointer hover target
  draggingNodeId: string | null;                    // Active drag (null when idle)

  // ── Status ──
  undoDepth: number;                                // Undo stack depth
  canRedo: boolean;                                 // Redo availability
  layoutName: LayoutType;                           // Current layout algorithm
  fps: number;                                      // Rounded FPS (from CameraTracker)

  // ── Theme ──
  themeName: string;                                // Theme key (e.g., 'moss')
  themeColors: ThemeColors;                         // Resolved color palette

  // ── Overlay ──
  contextMenu: ContextMenuState;                    // Discriminated union

  // ── Actions (22 total) ──
  setAst(ast, diagnostics?)                         // Full AST replacement
  selectNode(id | null)                             // Single select
  toggleNodeSelection(id)                           // Toggle in multi-set
  selectMultiple(ids[])                             // Replace set
  clearSelection()                                  // Empty set
  hoverNode(id | null)                              // Hover state
  setDraggingNode(id | null)                        // Drag lock
  updateNodePosition(id, Vec3)                      // Single position update
  batchUpdatePositions(Map<id, Vec3>)               // Bulk position update
  setTheme(name)                                    // Theme switch
  getNodeColor(type, customColor?) → string         // Derived (not a true action)
  setSelectionSet(Set<string>)                      // External sync
  setUndoDepth(number)                              // External sync
  setCanRedo(boolean)                               // External sync
  setFps(number)                                    // Rounded, skip if equal
  setContextMenu(ContextMenuState)                  // Open menu
  closeContextMenu()                                // Close (skip if already closed)
}
```

**Optimization guards (skip set if unchanged):**
- `hoverNode` — checks `hoveredNodeId === id`
- `setDraggingNode` — checks `draggingNodeId === id`
- `updateNodePosition` — checks 0.001 threshold per component
- `setUndoDepth` — checks `undoDepth === depth`
- `setCanRedo` — checks `canRedo === val`
- `setFps` — rounds first, checks equality

---

## 7. Type Definitions

| Type | Shape | Used By |
|------|-------|---------|
| `Vec3` | `readonly [number, number, number]` | Everywhere — positions, targets, directions |
| `MutVec3` | `[number, number, number]` | Layout buffers, internal writes |
| `AxisId` | `'x' \| 'y' \| 'z'` | Grid, reference lines, gizmo |
| `CameraData` | `{ position, fov, distance, effectiveFov, axisProjections }` | CameraTracker → onCameraChange |
| `CursorData` | `{ x, y, z }` | useCursorTracking → onCursorMove |
| `PersistedViewState` | `{ position: Vec3, target: Vec3, fov: number }` | View persistence |
| `MeasurementLine` | `{ from, to, fromId, toId, label?, direction }` | Measurement subsystem |
| `SceneBounds` | `{ min, max, maxExtent, center }` | Axis extent, zoomToFit |
| `ContextMenuState` | Discriminated union (visible:true \| visible:false) | Store, ContextMenu overlay |
| `NodeClickInfo` | `{ nodeId, screenX, screenY }` | onNodeClick callback |
| `ScreenPoint` | `{ x, y }` | projectToScreen return |
| `VerdantRendererProps` | 15 props (ast, theme, callbacks, etc.) | Top-level component |
| `SceneContentProps` | 7 props (decoupled from VerdantRendererProps) | Internal scene component |
| `VerdantRendererHandle` | `{ undo, redo, zoomToFit, resetCamera }` | Imperative ref API |
| `TickData` | `{ pos, axis, val }` | **@deprecated** |

---

## 8. Constants Reference

### Layout
| Constant | Value | Purpose |
|----------|-------|---------|
| `MIN_NODE_DISTANCE` | 4.5 | Minimum separation between nodes |
| `FORCE_ITERATIONS` | 150 | Force-directed simulation steps |
| `MIN_DISTANCE_PASSES` | 10 | Separation enforcement iterations |
| `NEW_NODE_DISTANCE_PASSES` | 20 | Separation iterations for new nodes |
| `FORCE_INITIAL_TEMPERATURE` | 3.0 | Max displacement per iteration |
| `FORCE_CENTERING_GRAVITY` | 0.995 | Centering pull (1.0 = no pull) |
| `FORCE_Y_SPREAD_RATIO` | 1.2 | Y-axis spread in initial placement |
| `FORCE_GROUP_COHESION_DIVISOR` | 0.5 | Group sibling attraction strength |
| `FORCE_OVERLAP_PENALTY` | 5 | Hard penalty for overlapping nodes |

### Axes & Grid
| Constant | Value | Purpose |
|----------|-------|---------|
| `AXIS_COLOR_X` | `'#e57373'` | Positive X axis color |
| `AXIS_COLOR_Y` | `'#81c784'` | Positive Y axis color |
| `AXIS_COLOR_Z` | `'#64b5f6'` | Positive Z axis color |
| `AXIS_COLOR_X_NEG` | `'#af4c4c'` | Negative X axis (muted) |
| `AXIS_COLOR_Y_NEG` | `'#5a8f5d'` | Negative Y axis (muted) |
| `AXIS_COLOR_Z_NEG` | `'#4580b8'` | Negative Z axis (muted) |
| `AXIS_FADE_SEGMENTS` | 5 segments, 0→50000 | Distance-based opacity bands |
| `AXIS_MAX_EXTENT` | 50000 | Half-length of axis lines |
| `AXIS_EXTENT_PADDING` | 5 | Extra extent beyond scene bounds |
| `MIN_AXIS_EXTENT` | 10 | Minimum axis half-extent |
| `AXIS_TICK_INTERVAL` | 5 | Minor tick spacing |
| `AXIS_TICK_LABEL_INTERVAL` | 10 | Major tick / label spacing |
| `AXIS_TICK_SIZE` | 0.15 | Tick mark half-length |
| `AXIS_TICK_RANGE` | 500 | Tick mark extent |
| `AXIS_LABEL_RANGE` | 100 | HTML label extent (limits DOM elements) |
| `AXIS_TICK_OPACITY` | 0.35 | Tick mark opacity |
| `AXIS_LABEL_OPACITY` | 0.6 | Label opacity |
| `AXIS_LABEL_FONT_SIZE` | `'7px'` | Tick label font size |

### Measurement
| Constant | Value | Purpose |
|----------|-------|---------|
| `DASH_SIZE` | 0.3 | Dash length |
| `GAP_SIZE` | 0.2 | Gap length |
| `WING_HALF_WIDTH` | 0.25 | Endpoint wing size |
| `MEASUREMENT_LINE_OPACITY` | 0.55 | Line target opacity |
| `MEASUREMENT_WING_OPACITY` | 0.45 | Wing target opacity |
| `MEASUREMENT_FADE_SPEED` | 4 | Fade-in speed (1/speed seconds) |

### Camera & Controls
| Constant | Value | Purpose |
|----------|-------|---------|
| `DEFAULT_CAMERA_POSITION` | `[0, 8, 16]` | Initial camera position |
| `DEFAULT_CAMERA_FOV` | 45 | Field of view (degrees) |
| `DEFAULT_CAMERA_TARGET` | `[0, 0, 0]` | Initial look-at |
| `AUTO_ROTATE_IDLE_THRESHOLD` | 3 | Seconds before auto-rotate |
| `AUTO_ROTATE_SPEED` | 0.5 | Rotation speed |
| `ORBIT_MIN_DISTANCE` | 3 | Minimum zoom distance |
| `ORBIT_MAX_DISTANCE` | 80 | Maximum zoom distance |
| `ORBIT_DAMPING_FACTOR` | 0.05 | Control damping |
| `CAMERA_EMIT_FRAME_INTERVAL` | 8 | Frames between emissions |

### Rendering & Persistence
| Constant | Value | Purpose |
|----------|-------|---------|
| `DPR_RANGE` | `[1, 1.5]` | Pixel ratio clamp |
| `INSTANCING_THRESHOLD` | 10 | Nodes before instancing (TODO) |
| `PERSIST_DEBOUNCE_MS` | 300 | State write debounce |
| `VIEW_PERSIST_THROTTLE_MS` | 180 | Camera write throttle |
| `MAX_GROUP_DEPTH` | 100 | Group traversal depth limit |
| `MAX_LOCALSTORAGE_KEY_LENGTH` | 200 | Key length safety limit |

---

## 9. Design Patterns

### 9.1 Zero-Allocation Hot Paths
Module-scoped `THREE.Vector3`/`Vector2`/`Raycaster` instances are reused across calls. Safe because JS is single-threaded and these functions are fully synchronous.
- `utils.ts`: `_projVec`, `_zoomOffset`
- `SceneContent.tsx`: `_dblClick*` (6 objects)
- `DimensionLine.tsx`: `_wingDir`, `_wingPerp`, `_wingUp`, `_wingRight`

### 9.2 Custom `arePropsEqual` Comparators
Used on `React.memo` for high-frequency components to avoid re-renders:
- `DraggableNode` — 17 field checks including value equality on Vec3
- `MeasurementLinesGroup` — per-line shallow comparison of all 10 fields

### 9.3 Frozen Empty Collections
`EMPTY_SET`, `EMPTY_DIAGNOSTICS`, `EMPTY_NODE_INDEX` — prevents new object allocation when resetting to empty state.

### 9.4 Discriminated Union for State
`ContextMenuState` uses `visible: true | false` discriminant — makes impossible states unrepresentable.

### 9.5 Iterative Tree Walk with Cycle Detection
`safeGroupWalk` — stack-based DFS with visited set and configurable max depth. Prevents infinite loops from circular group references in user-authored VRD files.

### 9.6 Debounced + Throttled Persistence
State changes → debounced write (300ms). Camera changes → throttled write (180ms). Prevents write storms during drag and smooth camera movements.

### 9.7 Deterministic Layout
`seededRandom(hashString(nodeIds))` ensures same AST always produces same layout. Important for reproducibility across page reloads when no persisted positions exist.

---

## 10. Performance Architecture

### 10.1 Current Bottlenecks

| Issue | Impact | Location |
|-------|--------|----------|
| `updateNodePosition` spreads entire positions object per drag frame | O(n) per frame at 60fps | store.ts |
| `EdgesLayer` re-renders ALL edges when any position changes | Entire edge list re-evaluates | SceneContent.tsx |
| `InfiniteAxes` creates 60 HTML overlays for tick labels | DOM overhead | InfiniteAxes.tsx |
| `NodeReferenceBox` in 'all' mode creates geometry per node | 300 geometries for 100 nodes | NodeReferenceBox.tsx |
| Force-directed layout is O(n²) | 37.5M calculations at n=500 | layout.ts |
| Module-level THREE geometries allocated at import time | Bundle evaluation cost | RaycastFloor, AxisLines |

### 10.2 Mitigations in Place
- Flat `Float64Array` buffers for layout (cache-friendly)
- Pre-built edge/group pair indices for force simulation
- `useMemo` on geometry creation with proper disposal
- Skip guards on store setters (hover, drag, fps, undo)
- `subscribeWithSelector` middleware for slice-based subscriptions
- `CAMERA_EMIT_FRAME_INTERVAL` throttles camera data emissions

### 10.3 Future Optimizations (Noted in Code)
- Barnes-Hut tree for O(n log n) repulsion
- InstancedMesh rendering for same-shape nodes (threshold: 10)
- Position map with version counter instead of object spread
- Per-edge memoization or instanced edge rendering

---

## 11. Known Issues & Status

### 🔴 Bugs (Incorrect Behavior)

| ID | Status | File | Description |
|----|--------|------|-------------|
| B1 | **PATCHED** | useDraggable + DraggableNode | `hasMoved` was read at render time (stale). Fixed: return `hasMovedRef` |
| B2 | **PATCHED** | SceneContent | PivotIndicator received stale ref. Fixed: `useState` for orbitTarget |
| B3 | **PATCHED** | SceneContent | Context menu checked `selectedNodeId != null` instead of intersection. Fixed: check `e.intersections` |
| B4 | **PATCHED** | SceneContent ↔ useKeyboardNavigation | Circular import via `zoomToFit`. Fixed: moved to utils.ts |
| B5 | **PATCHED** | PivotIndicator | Geometry leak (no useEffect cleanup). Fixed: added disposal |
| B6 | **PATCHED** | PivotIndicator | `computeLineDistances` in useFrame (60×/sec). Fixed: moved to useEffect |
| B7 | **PATCHED** | grid/NodeReferenceBox | Duplicate file. Fixed: deleted duplicate |
| B8 | **OPEN** | DraggableNode | `arePropsEqual` uses `!==` on object/array props (badges, ports, bindings). Needs deep/shallow compare |
| B9 | **OPEN** | renderer/useRenderer | Detects WebGPU but never activates it. `glConfig` is always WebGL. Factory functions unused |
| B10 | **PATCHED** | layout.ts | Dead variable `allNodes`. Fixed: removed |

### 🟡 Architecture Issues

| ID | Status | Description |
|----|--------|-------------|
| A1 | **PATCHED** | zoomToFit moved from SceneContent to utils |
| A2 | **DOCUMENTED** | AxisLines vs InfiniteAxes — AxisLines unused, InfiniteAxes active |
| A3 | **OPEN** | `getNodeColor` is a derived selector mixed into actions |
| A4 | **OPEN** | Singleton store prevents multi-instance usage |
| A5 | **PATCHED** | NodesLayer now uses `selectionSet.has()` for multi-select |
| A6 | **PATCHED** | `detectDarkMode` usage consistent (useMemo + themeColors trigger) |
| A7 | **PATCHED** | Background color uses `themeColors.sceneBg` with fallback |
| A8 | **OPEN** | `enforceMinimumDistances` partially effective for incremental placement |
| A9 | **PATCHED** | `setAst` uses `schedulePersist` instead of synchronous write |

### 🔵 Code Quality

| ID | Status | Description |
|----|--------|-------------|
| Q1 | **OPEN** | `e: any` for all pointer events — should be `ThreeEvent<PointerEvent>` |
| Q2 | **OPEN** | `controlsRef: React.RefObject<any>` in hooks — should use OrbitControlsImpl type |
| Q3 | **OPEN** | `commandHistory as any` for `.pointer` access |
| Q4 | **PATCHED** | Removed deprecated `sanitizePosition` |
| Q5 | **OPEN** | No error boundary around Canvas |
| Q6 | **PATCHED** | Added `displayName` to forwardRef components |
| Q7 | **OPEN** | `buildNodeProps` casts from `node.props` with no runtime validation |
| Q8 | **PATCHED** | Removed deprecated public exports (GRID_SIZE, AXIS_LENGTH, TickData) |

---

## 12. External Dependencies

| Package | Used For | Import Locations |
|---------|----------|-----------------|
| `three` | 3D math, geometry, materials | Everywhere |
| `@react-three/fiber` | React ↔ Three.js bridge | SceneContent, hooks, CameraTracker |
| `@react-three/drei` | OrbitControls, Html overlays | SceneContent, InfiniteAxes, PivotIndicator, NodeReferenceBox, DimensionLine |
| `zustand` | State management | store.ts |
| `zustand/middleware` | `subscribeWithSelector` | store.ts |
| `@verdant/parser` | `VrdAST`, `VrdNode`, `VrdEdge`, `VrdGroup`, `VrdDiagnostic`, `VrdConfig` | store, layout, VerdantRenderer |
| `@verdant/primitives` | `PrimitivesProvider`, `usePrimitives`, `BaseEdge`, `GroupContainer`, `NestedGroup`, `Minimap`, `ContextMenu`, `HierarchicalLayout`, `NodeProps`, `PrimitivesConfig` | SceneContent, hooks, VerdantRenderer, layout, DraggableNode |
| `@verdant/themes` | `ThemeColors`, `THEME_COLORS`, `DEFAULT_NODE_COLORS` | store.ts |
| `@verdant/nodes` | `ServerNode`, `DatabaseNode`, `CacheNode`, etc. (10 components) | nodeMap.ts |

---

## 13. Public API Surface

### Components
- `VerdantRenderer` — top-level, accepts `VerdantRendererProps`, exposes `VerdantRendererHandle` via ref

### Store
- `useRendererStore` — Zustand hook for reading/writing renderer state
- `cancelPendingPersist()` — cancel debounced localStorage write
- `flushPendingPersist()` — immediately flush pending write

### Layout
- `computeLayout(nodes, edges, layoutType, groups?, direction?)` → `Map<string, MutVec3>`
- `computePositionsForNewNodes(newNodes, existingPositions, edges)` → `Record<string, MutVec3>`

### Utilities
- `zoomToFit(positions, camera, controls)`
- `projectToScreen(worldPos, camera, size)` → `ScreenPoint`
- `detectDarkMode()` → `boolean`
- `computeSceneBounds(positions)` → `SceneBounds`
- `setsEqual(a, b)` → `boolean`
- `VEC3_ORIGIN` — frozen `[0,0,0]`

### Node Registry
- `getNodeComponent(type)` → React component
- `isKnownNodeType(type)` → boolean
- `getRegisteredNodeTypes()` → string[]
- `FALLBACK_NODE` — ServerNode

### Measurement
- `MeasurementLinesGroup` — component

### Persistence
- `clearAllPersistedState()`
- `clearPersistedStateForAst(ast)`

### Renderer / WebGPU
- `isWebGPUAvailable()` → `Promise<boolean>`
- `isWebGPUAvailableSync()` → `boolean`
- `detectBestBackend(preferWebGPU?)` → `Promise<RendererBackend>`
- `createWebGLRenderer(canvas, config?)` → `RendererResult`
- `createWebGPURenderer(canvas, config?)` → `Promise<RendererResult>`
- `createOptimalRenderer(canvas, backend, config?)` → `Promise<RendererResult>`
- `useRenderer(options?)` → `UseRendererResult`

### Constants (selected public exports)
- `MIN_NODE_DISTANCE`, `AXIS_COLOR_X/Y/Z`, `AXIS_COLOR_X_NEG/Y_NEG/Z_NEG`
- `AXIS_EXTENT_PADDING`, `AXIS_LABEL_RANGE`, `MIN_AXIS_EXTENT`
- `DEFAULT_CAMERA_POSITION`, `DEFAULT_CAMERA_FOV`, `DEFAULT_CAMERA_TARGET`
- `ORBIT_MIN_DISTANCE`, `ORBIT_MAX_DISTANCE`, `INSTANCING_THRESHOLD`

### Types (all re-exported from index.ts)
- `Vec3`, `MutVec3`, `AxisId`
- `VerdantRendererProps`, `SceneContentProps`, `VerdantRendererHandle`
- `CameraData`, `CursorData`, `MeasurementLine`, `SceneBounds`
- `PersistedViewState`, `NodeClickInfo`, `ScreenPoint`, `ContextMenuState`
- `RendererBackend`, `RendererConfig`, `RendererResult`
- `UseRendererOptions`, `UseRendererResult`
- `PersistedRendererState`
- `CONTEXT_MENU_CLOSED`
```


```markdown
---

## 14. Rendering Pipeline Detail

### 14.1 Frame Lifecycle

```
R3F requestAnimationFrame loop
  │
  ├── useFrame callbacks (in mount order):
  │   ├── useAutoRotate — increment idle timer, toggle autoRotate
  │   ├── useCursorTracking — update projection plane normal
  │   ├── CameraTracker — emit camera data every 8 frames
  │   └── DimensionLine(s) — fade-in opacity interpolation
  │
  ├── React reconciliation (only on state changes):
  │   ├── Store selectors trigger component re-renders
  │   ├── Memo comparators gate unnecessary updates
  │   └── Three.js objects created/disposed via useMemo/useEffect
  │
  └── Three.js render pass:
      ├── renderOrder -1: (reserved for future grid lines)
      ├── renderOrder  0: NodeReferenceBox edges, edges, groups, nodes
      ├── renderOrder  1: InfiniteAxes lines, tick marks
      ├── renderOrder  2: Origin sphere, center spheres
      └── CSS3DRenderer: Html overlays (tick labels, coord labels, measurement labels)
```

### 14.2 Render Order Map

| renderOrder | Component | What |
|-------------|-----------|------|
| -1 | (reserved) | Future grid lines layer |
| 0 | NodeReferenceBox | Dashed cuboid edges |
| 0 | EdgesLayer | Edge lines between nodes |
| 0 | GroupsLayer | Group containers |
| 0 | NodesLayer | Node meshes |
| 1 | InfiniteAxes | Main axis lines + tick marks |
| 2 | InfiniteAxes | Origin sphere |
| 2 | PivotIndicator | Center sphere |
| (HTML) | InfiniteAxes | Tick number labels |
| (HTML) | PivotIndicator | Coordinate label |
| (HTML) | NodeReferenceBox | Coordinate labels |
| (HTML) | DimensionLine | Distance labels |

### 14.3 Three.js Object Ownership

**Module-level singletons (never disposed — live for app lifetime):**

| Object | File | Type |
|--------|------|------|
| `_geometry` (10k plane) | RaycastFloor.tsx | PlaneGeometry |
| `MAT_X/Y/Z` | AxisLines.tsx | LineBasicMaterial |
| `ORIGIN_GEO` (0.06 sphere) | AxisLines.tsx | SphereGeometry |
| `ORIGIN_MAT` | AxisLines.tsx | MeshBasicMaterial |
| `ORIGIN_GEO` (0.08 sphere) | InfiniteAxes.tsx | SphereGeometry |
| `ORIGIN_MAT` | InfiniteAxes.tsx | MeshBasicMaterial |
| `LOCAL_MAT_X/Y/Z` | PivotIndicator.tsx | LineBasicMaterial |
| `REF_MAT_X/Y/Z` | PivotIndicator.tsx | LineDashedMaterial |
| `CENTER_GEO` (0.05 sphere) | PivotIndicator.tsx | SphereGeometry |
| `CENTER_MAT` | PivotIndicator.tsx | MeshBasicMaterial |

> ⚠️ Naming collision: `ORIGIN_GEO` and `ORIGIN_MAT` exist in BOTH AxisLines.tsx and InfiniteAxes.tsx.
> They are separate module-scoped variables (different files = different modules).
> But if someone consolidates these files, they will collide.

**Per-render geometries (disposed via useEffect cleanup):**

| Component | Creates | When |
|-----------|---------|------|
| AxisLines | 3 line geometries (x/y/z) | positions change |
| InfiniteAxes | 30 fade line geos + 3 tick geos + 30 materials | mount only (empty deps) |
| PivotIndicator | 3 local axis geos + 3 reference line geos | pivot changes |
| NodeReferenceBox/SingleNodeBox | 3 edge geos + 3 dashed materials per node | position/opacity changes |
| DimensionLine | 1 line geo + 1 line material + 1 wing geo + 1 wing material | endpoint changes |

---

## 15. Layout Algorithm Details

### 15.1 Algorithm Selection

```
ast.config.layout value → LayoutType
  │
  ├── 'grid'          → computeGridLayout
  ├── 'circular'      → computeCircularLayout
  ├── 'hierarchical'  → computeHierarchicalLayout
  ├── 'forced'        → computeForceDirectedLayout
  └── 'auto' / default → computeForceDirectedLayout
```

### 15.2 Force-Directed Internals

```
Initialization:
  ├── Deterministic seed = hashString(sorted nodeIds joined by ',')
  ├── Random positions within ±k on X/Z, ±k×1.2 on Y
  └── k = max(sqrt(n × 30 / n), MIN_NODE_DISTANCE)

Per iteration (150 total):
  ├── Temperature = (remaining / total) × 3.0
  │
  ├── Repulsive forces O(n²):
  │   └── F = k²/dist + overlap_penalty
  │
  ├── Attractive forces O(|E|):
  │   └── F = dist²/k (along edges)
  │
  ├── Group cohesion O(|G_pairs|):
  │   └── F = dist²/(k × 0.5) (between group siblings)
  │
  ├── Apply displacements (clamped by temperature):
  │   └── scale = min(displacement_length, temperature) / displacement_length
  │
  └── Centering gravity:
      └── pos *= 0.995 (gentle pull toward origin)

Post-processing:
  ├── sanitize (NaN/Infinity → 0)
  ├── enforceMinimumDistances (10 passes)
  ├── sanitize again
  └── applyUserPositions (node.props.position overrides)
```

### 15.3 Internal Buffer Format

```typescript
interface PositionBuffer {
  x: Float64Array;          // x[i] = X position of node i
  y: Float64Array;          // y[i] = Y position of node i
  z: Float64Array;          // z[i] = Z position of node i
  idToIndex: Map<string, number>;  // "server-1" → 0
  indexToId: string[];              // 0 → "server-1"
  length: number;                   // === nodes.length
}
```

**Why Float64Array:** Avoids precision loss during 150 iterations of force accumulation. Float32 causes visible layout drift for >50 nodes.

### 15.4 Minimum Distance Enforcement

```
For each pass (up to 10):
  For each pair (i, j):
    if dist < MIN_NODE_DISTANCE:
      push both apart by (minDist - dist) / 2 along connecting vector
    if dist ≈ 0:
      apply deterministic jitter (seeded RNG, seed=42)
  if no pair moved: break early
```

---

## 16. Persistence Schema

### 16.1 Storage Keys

```
Renderer state:  "verdant:renderer:v1:{base36hash}"
Camera view:     "verdant:renderer:view:v1:{base36hash}"
```

**Hash input:** Sorted node IDs joined by `|`, then `__`, then sorted edge signatures `from->to:label` joined by `|`.

**Hash algorithm:** DJB2 → unsigned 32-bit → base-36 string.

### 16.2 Stored Payloads

**Renderer state:**
```json
{
  "positions": {
    "server-1": [2.5, 0, -3.1],
    "db-1": [-1.0, 0, 4.2]
  },
  "selectedNodeId": "server-1",
  "themeName": "moss"
}
```

**View state:**
```json
{
  "position": [0, 8, 16],
  "target": [0, 0, 0],
  "fov": 45
}
```

### 16.3 Validation on Read

Every field is validated at read time:
- Positions: must be Array of 3 finite numbers
- selectedNodeId: must be string or null
- themeName: must be string (defaults to 'moss')
- View position/target: Array of 3 finite numbers
- View fov: finite number

If validation fails → returns null → fresh layout computation.

### 16.4 Key Stability

The AST signature is based on **node IDs and edge structure only**, NOT node properties. This means:
- Changing a node's color/label/size → same key → positions preserved ✓
- Adding/removing a node → different key → fresh lookup (may find nothing → new layout)
- Reordering nodes in source → same key (IDs are sorted) ✓

---

## 17. Theme System

### 17.1 Resolution Priority

```
1. ast.config.theme (VRD file declares theme)
2. Persisted themeName (localStorage)
3. Current store.themeName
4. Fallback: 'moss'
```

### 17.2 Color Usage

| Color Key | Used For |
|-----------|----------|
| `themeColors.accent` | Default edge color, group container color, fallback node color |
| `themeColors.edgeDefault` | Edge layer default color |
| `themeColors.sceneBg` | Canvas background color (with fallback) |
| `themeColors.nodeDefaults[type]` | Per-type node color |

### 17.3 Dark Mode Detection

```
Priority:
1. document.documentElement.dataset.theme === 'dark' → true
2. document.documentElement.dataset.theme === 'light' → false
3. CSS --page-bg value in known light set → false
4. Fallback → true (assume dark)
```

**Known light backgrounds:** `#ffffff`, `#fff`, `rgb(255, 255, 255)`, `white`

---

## 18. Keyboard Shortcuts

| Key | Modifier | Action | Guard |
|-----|----------|--------|-------|
| `Tab` | — | Focus next node | Not in editor |
| `Shift+Tab` | — | Focus previous node | Not in editor |
| `Enter` | — | Select focused node | Not in editor |
| `Space` | — | Select focused node | Not in editor |
| `F` | — | Zoom to fit all nodes | Not in editor, no Ctrl |
| `Z` | `Ctrl/Cmd` | Undo | Not in editor |
| `Z` | `Ctrl/Cmd+Shift` | Redo | Not in editor |
| `Y` | `Ctrl/Cmd` | Redo | Not in editor |

**Editor focus detection:** Skips shortcuts when target is `.monaco-editor`, `[data-keybinding-context]`, `<input>`, `<textarea>`, or `contentEditable`.

---

## 19. WebGPU Integration Status

### Current State: DETECTION ONLY

```
detectWebGPU.ts     ✅ 3-stage detection with caching
createRenderer.ts   ✅ Factory functions exist for WebGL + WebGPU
useRenderer.ts      ⚠️  Detects backend but glConfig is always WebGL
VerdantRenderer.tsx  ⚠️  Canvas receives glConfig (always WebGL)
```

### What Would Need to Change for WebGPU Activation

1. `useRenderer.ts` — when `backend === 'webgpu'`, either:
   - Pass WebGPU-specific config to Canvas `gl` prop, OR
   - Use `createOptimalRenderer` to create the renderer outside Canvas
2. `VerdantRenderer.tsx` — may need to use `frameloop="demand"` or custom render loop
3. Three.js materials — WebGPURenderer handles standard materials internally (no TSL required for basic usage)
4. Testing — need physical WebGPU-capable hardware/browser

---

## 20. Component Prop Chains

### Node Click Flow

```
VerdantRendererProps.onNodeClick
  → SceneContentProps.onNodeClick
    → SceneContent.handleNodeClick (adds screen projection)
      → NodesLayer.onNodeClick
        → DraggableNode.onNodeClick
          → DraggableNode.handleClick (checks hasMovedRef, stops propagation)
            → buildNodeProps → Component.onClick
```

### Selection Flow

```
User clicks node
  → DraggableNode.handleClick
    → SceneContent.handleNodeClick
      → store.selectNode(id)
        → selectionSet = new Set([id])
        → schedulePersist

  ↕ Sync (usePrimitivesSync)

primitives.selectionManager.onChange
  → store.setSelectionSet(ids)
```

### Hover Flow

```
User hovers node
  → DraggableNode.handlePointerOver (stopPropagation)
    → SceneContent.handleHoverEnter
      → store.hoverNode(id)
      → document.body.cursor = 'grab'

User leaves node
  → DraggableNode.onPointerOut (from buildNodeProps)
    → SceneContent.handleHoverLeave
      → store.hoverNode(null)
      → document.body.cursor = ''
```

---

## 21. SSR / Edge Runtime Safety

| Function | SSR Guard | Notes |
|----------|-----------|-------|
| `detectDarkMode` | `typeof document === 'undefined' → true` | Dark mode fallback |
| `safeRead/safeWrite` | `typeof window === 'undefined' → null/noop` | Persistence |
| `clearAllPersistedState` | `typeof window === 'undefined' → return` | Cleanup |
| `schedulePersist` | `typeof window === 'undefined' → return` | Debounce |
| `detectWebGPU` | `typeof navigator === 'undefined' → false` | WebGPU check |
| `useViewPersistence` | Uses `performance.now()` — **NO guard** | ⚠️ Missing |
| `handleHoverEnter/Leave` | `typeof document !== 'undefined'` check | Cursor style |

---

## 22. Testing Considerations

### Resetable Module State

| State | Reset Function | File |
|-------|---------------|------|
| WebGPU detection cache | `_resetDetectionCache()` | detectWebGPU.ts |
| Persist timer | `cancelPendingPersist()` | store.ts |
| Zustand store | `useRendererStore.setState(initialState)` | store.ts |

### Mocking Points

| What | Why |
|------|-----|
| `@verdant/primitives` usePrimitives | Returns SelectionManager, CommandHistory, TransitionEngine |
| `@verdant/themes` THEME_COLORS | Control theme resolution |
| `@verdant/nodes` components | Avoid rendering full node meshes in unit tests |
| `window.localStorage` | Persistence tests |
| `navigator.gpu` | WebGPU detection tests |
| `THREE.WebGLRenderer` | Renderer creation tests |

### Components That Return null

These components return `null` under certain conditions — test both branches:

| Component | Returns null when |
|-----------|-------------------|
| `SceneContent` | `ast === null` |
| `EdgesLayer` | `ast === null` |
| `NodesLayer` | `ast === null` |
| `GroupsLayer` | `groupData.length === 0` |
| `NodeReferenceBox` | `nodes.length === 0` |
| `MeasurementLinesGroup` | `lines.length === 0` |
| `MinimapOverlay` | `config === null/undefined` |

---

## 23. Migration & Deprecation Tracker

### Completed Removals
- `BlueprintGroundPlane` → replaced by InfiniteAxes + RaycastFloor
- `createGridGeometries` → replaced by InfiniteAxes internal builders
- `createGridMaterials` → replaced by InfiniteAxes internal builders
- `AxisLabelSprite` → replaced by drei `<Html>` overlays in InfiniteAxes
- `TICK_EVERY` constant → removed (Bug #18, never imported)

### Pending Deprecation Removals
- `sanitizePosition` in utils.ts — **REMOVED** (PATCH 12)
- `GRID_SIZE`, `AXIS_LENGTH`, `MAJOR_STEP`, `MINOR_STEP`, `FADE_START`, `FADE_END` in constants.ts — still defined, removed from public exports
- `TickData` type — still defined, removed from public exports
- `NODE_MAP` in nodeMap.ts — still exported with `@deprecated` tag

### Files Available but Unused
- `grid/RaycastFloor.tsx` — kept for potential future ground-plane features
- `grid/AxisLines.tsx` — kept as lightweight alternative to InfiniteAxes

---

## 24. Conventions

### Naming
- Components: PascalCase (`DraggableNode`, `InfiniteAxes`)
- Hooks: camelCase with `use` prefix (`useDraggable`, `useAutoRotate`)
- Constants: UPPER_SNAKE_CASE (`MIN_NODE_DISTANCE`, `AXIS_COLOR_X`)
- Types: PascalCase (`Vec3`, `SceneBounds`, `RendererState`)
- Internal helpers: camelCase (`createFadeLines`, `buildEdgePairs`)
- Module-scoped pooled objects: underscore prefix (`_projVec`, `_dblClickOffset`)
- Frozen singletons: UPPER_SNAKE_CASE (`EMPTY_SET`, `VEC3_ORIGIN`)

### File Structure
Each file follows the pattern:
```
1. Imports
2. ═══ Types ═══
3. ═══ Helpers / Builders ═══
4. ═══ Module-level singletons ═══
5. ═══ Sub-components (React.memo) ═══
6. ═══ Main Component / Export ═══
```

### Comments
- Section headers use `═══` box-drawing characters
- Bug fixes marked with `← CHANGED` / `← NEW` and bug reference number
- Deprecated items use `@deprecated` JSDoc tag with migration guidance
- Performance notes in component/function JSDoc headers

### React Patterns
- All sub-components wrapped in `React.memo`
- Custom `arePropsEqual` on high-frequency components
- `useCallback` for all event handlers passed as props
- `useMemo` for geometry/material creation with `useEffect` cleanup for disposal
- `useRef` for mutable state that shouldn't trigger re-renders (drag state, idle timers)
- `React.forwardRef` with `useImperativeHandle` for parent-accessible APIs
```

---

This completes the `renderer.md`. The full file covers:

- **24 sections** spanning architecture, every file, store schema, all types, all constants, rendering pipeline, layout algorithms, persistence schema, theme system, keyboard shortcuts, WebGPU status, prop chains, SSR safety, testing considerations, deprecation tracking, and code conventions
- **Every function, component, hook, and constant** documented with its purpose, location, and dependencies
- **All known issues** with their status (patched/open)
- **Data flow diagrams** for the 5 major flows (AST ingestion, drag, selection, double-click pivot, persistence)
- **Three.js object ownership** table (which file owns which geometry/material, lifecycle)

For future refactoring sessions, share this file + describe what you want to change. No need to paste source code.