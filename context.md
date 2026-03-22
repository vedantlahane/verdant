# Verdant project map and context

## Overview

Verdant is a monorepo with the following top-level folders:
- `.kiro/`: architecture requirements and design docs.
- `.turbo/`: Turborepo cache.
- `community/`: example host platform node packs (`nodes-aws`, `nodes-docker`, `nodes-gcp`, `nodes-hardware`, `nodes-k8s`).
- `packages/`: main packages.
- `playground/`: Next.js app for interactive demos and manual QA.
- `tools/cli/`: optional CLI helpers.

### Packages in `packages/`
- `nodes/`: node visuals and templates for cloud/infra concepts.
- `parser/`: custom DSL parser, model compiler, and validation.
- `primitives/`: independent rendering primitives, interactions, and systems.
- `renderer/`: Three.js/React Three Fiber renderer + camera/grid + scene wiring.
- `sdk/`: external public API bundling (entry point).
- `themes/`: theme values, color palettes, and exports.

## package dependencies (in code)
- `playground` depends on `@verdant/sdk` plus local environment libs.
- `@verdant/sdk` re-exports from: `@verdant/parser`, `@verdant/primitives`, `@verdant/renderer`, `@verdant/nodes`, `@verdant/themes`.
- `@verdant/renderer` depends on `@verdant/primitives` and `@verdant/themes` for node shapes, materials, and grid styling.
- `@verdant/primitives` is the core domain: nodes/edges, groups, interaction/commands, export, provider context.
- `@verdant/nodes` uses `@verdant/primitives` to define domain node components and registers them.
- `@verdant/parser` is standalone; outputs AST used by `renderer` / `sdk`.

## Directory + key files (accurate, detailed)

### `packages/nodes/src`
- `index.ts`: exports all node components.
- `registry.ts`: instantiates a shared `NodeRegistry` (from primitives).
- `[Name]Node.tsx`: node visuals (ServerNode, DatabaseNode, etc.)
  - each renders a <BaseNode> from primitives, plus 3D geometry (RoundedBox, Sphere, etc.), default status/ports, and registers by key.
- `tests/nodes.property.test.ts`: property-input tests for node metadata.

### `packages/parser/src`
- `index.ts`: public parser API.
- `parser.ts`: parsing function to AST, includes full grammar and node/edge extraction.
- `patterns.ts`: regex patterns / tokens.
- `printer.ts`: AST -> human-readable DSL serialization.
- `validate.ts`: schema validation for AST and shape semantics.
- `values.ts`: values helpers and normalization.
- `tests/`: parser, printer property tests.

### `packages/primitives/src`
- `index.ts`: bundle exports for primitives public API.
- `types.ts`: NodeProps, EdgeLineProps, NodeStatus, NodePort, etc.

#### Node components
- `nodes/BaseNode.tsx`: reusable nodes with selection, hover, animation, ports, badges, label overlays.
- `nodes/BaseEdge.tsx`: edge path, dashed animation, arrowheads, labels, flow particles.
- `nodes/NodePorts.tsx`: port point markers around nodes (fixed bug for missing `localPosition`).
- `nodes/NodeBadge.tsx`: life/status badges on nodes.
- `nodes/NodeRegistry.ts`: plugin/registry for node renderers.

#### Shapes
- `shapes/*.tsx`: 3D geometry primitives (BoxShape, SphereShape, TorusShape, etc.).
- `shapes/ShapeDefinition.ts`: shape metadata + port model.
- `shapes/index.ts`: shape exports.

#### Interaction + Logic
- `interaction/*`: `SelectionManager.ts`, `DragManager.ts`, `CommandHistory.ts`, `ContextMenu.tsx`, `KeyboardNav.ts`.
- `groups/*`: `GroupContainer.tsx`, `NestedGroup.tsx`, `GroupCollapse.tsx`.
- `layout/HierarchicalLayout.ts`.
- `dataBinding/*`, `export/*` (GLTF/PNG/SVG), `geometry/*`, `materials/*`, `minimap/*`, `animation/*`, `performance/*`, `postprocessing/*`.

#### Provider
- `provider/PrimitivesContext.ts`: React context value.
- `provider/PrimitivesProvider.tsx`: instantiates component, bus/interop, managers, and yields context.
- `provider/PrimitivesConfig.ts`: config type.

#### Registry
- `registry/NodeRegistry.ts`, `ShapeRegistry.ts`, `PluginSystem.ts`.

### `packages/renderer/src`
- `index.tsx`: renderer entry path (consumes presets, hooks, set up application-level controls).
- `VerdantRenderer.tsx`: high-level component `VerdantRenderer` (scene provider + canvas + layout). uses `PrimitivesProvider`.
- `SceneContent.tsx`: consumes AST and store state to render nodes/edges/groups via primitives + renderer-specific features.
- `store.ts`, `store.persistence.ts`: Zustand store for selected, hovered, camera, context menus, etc.
- `layout.ts`, `types.ts`, `utils.ts`, `constants.ts`.

#### Grid
- `grid/*`: `BlueprintGroundPlane`, `createGridGeometries`, `createGridMaterials` (RGBA fix here), `AxisLabelSprite`.

#### Nodes
- `nodes/nodeMap.ts`: maps node type names to node components (`@verdant/primitives` BaseNode wrappers).
- `nodes/DraggableNode.tsx`.

#### Measurement
- `measurement/DimensionLine.tsx`, `MeasurementLinesGroup.tsx`.

#### Hooks
- `hooks/useDraggable.ts` etc.

#### Tests
- `tests/` integration tests for AST conversion, selection flow, group collapse, undo/redo; property tests.

### `packages/sdk/src`
- `index.ts`: top-level entry re-exporting all 3rd-party API surface from packages above, mapping long import chain.

### `packages/themes/src`
- `colors.ts`: base color helpers.
- `types.ts`: theme type definitions.
- palette files (`fern.ts`, `dusk.ts`, etc.): color object sets.
- `index.ts`: exports all themes and defaults.

### `playground` app
- `playground/src/app/page.tsx`: main page using `VerdantRenderer` and controls.
- `playground/src/features/*`: interactive UI panels, sidebar, search, etc.
- `playground/src/tests/*`: hope tests.
- `playground/package.json`: app dependencies.

## Integration path (how data flows at runtime)

1. In playground, app code calls API using `@verdant/sdk`.
2. `sdk/index.ts` exports renderer and parser utilities, e.g. `createSceneFromJson`, `VerdantRenderer`.
3. When user submits node graph DSL, `parser` yields AST + validation.
4. `renderer` (SceneContent) consumes AST and pagination from store to produce `BaseNode`, `BaseEdge`, `GroupContainer`, etc.
5. Node visuals are implemented in `primitives` plus optional `nodes` package out-of-the-box shapes; plugin system extends it.
6. `primitives` uses internal state managers (`SelectionManager`, etc.) and `PrimitivesContext` to share services.

## Dependency graph edges (direct imports)

- `@verdant/primitives` → `@react-three/fiber`, `@react-three/drei`, `three`.
- `@verdant/renderer` → `@verdant/primitives`, `@verdant/themes`, `zustand`, `three`, `@react-three/fiber`, `@react-three/drei`.
- `@verdant/nodes` → `@verdant/primitives`.
- `@verdant/sdk` → all the above.
- `playground` → `@verdant/sdk`.

## Notes on prior issue we fixed

- `NodePorts.tsx` originally accesses `port.localPosition` without null-check. fixed by safe filter.
- `createGridMaterials.ts` original `LIGHT_PALETTE.gridColor = 'rgba(...)'` triggered Three.js alpha ignore warning; now normalized to `#rrggbb` with opacity.

## How to use this map

- Update this file with any new package or top-level major feature added.
- Use `npm run test` (or `pnpm test` in each package) to verify behavior after changes.
- For architecture tickets, refer to `.kiro/specs/*` requirement files (especially `production-grade-primitives/tasks.md`).

