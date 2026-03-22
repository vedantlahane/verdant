# Requirements Document

## Introduction

The `@verdant/primitives` v2 library is complete with all subsystems built: SharedGeometryPool, MaterialCache, SelectionManager, CommandHistory, EdgeRouter, FlowParticles, TransitionEngine, NodePorts, GroupCollapse, HierarchicalLayout, Minimap, ContextMenu, KeyboardNav, PostProcessing, DataBinding, Export (PNG/SVG/GLTF), NodeBadge, StatusMaterials, and 14 shapes. None of these are yet wired to the renderer, playground, parser, or nodes packages.

This spec covers the five-phase integration layer that connects all completed primitives to the rest of the stack: (1) extending the `.vrd` DSL parser to support new syntax, (2) wiring all primitives into the renderer, (3) updating the nodes package to use v2 APIs, (4) building the playground UI for all new features, and (5) validating correctness and performance through integration tests, benchmarks, visual regression, and accessibility audits.

---

## Glossary

- **Parser**: The `@verdant/parser` package — parses `.vrd` DSL source into a `VrdAST`.
- **VrdAST**: The abstract syntax tree produced by the Parser, consumed by the Renderer.
- **VrdNode**: An AST node entry with `id`, `type`, `props`, and optional `groupId`.
- **VrdEdge**: An AST edge entry with `from`, `to`, and `props`.
- **VrdGroup**: An AST group entry with `id`, `label`, `children`, and nested `groups`.
- **VrdConfig**: The top-level config block in a `.vrd` file (theme, layout, minimap, etc.).
- **Pretty_Printer**: A module that serializes a `VrdAST` back into valid `.vrd` source text.
- **Renderer**: The `@verdant/renderer` package — consumes `VrdAST` and renders the 3D scene.
- **VerdantRenderer**: The root React component exported by the Renderer package.
- **PrimitivesProvider**: The React context provider from `@verdant/primitives` that initializes all subsystem instances.
- **PrimitivesConfig**: The configuration object passed to `PrimitivesProvider` (minimap, post-processing, status colors, etc.).
- **BaseNode_v2**: The upgraded `BaseNode` component from `@verdant/primitives` supporting status, badges, ports, and animations.
- **BaseEdge_v2**: The upgraded `BaseEdge` component from `@verdant/primitives` supporting routing, flow particles, and port endpoints.
- **SelectionManager**: The primitives subsystem tracking which nodes and edges are currently selected.
- **CommandHistory**: The primitives subsystem providing undo/redo over reversible mutations.
- **DragManager**: The primitives subsystem handling pointer-driven node repositioning.
- **KeyboardNav**: The primitives subsystem mapping keyboard input to navigation and interaction.
- **ContextMenu**: The primitives overlay component providing right-click actions on nodes and edges.
- **Minimap**: The primitives overlay component showing a scaled-down top-down projection of the scene.
- **PostProcessing**: The primitives pipeline applying bloom and outline effects to the scene.
- **TransitionEngine**: The primitives subsystem driving enter, exit, and layout-change animations.
- **HierarchicalLayout**: The primitives layout algorithm arranging nodes in directed layers.
- **InstancedRenderer**: The primitives subsystem consolidating same-shape nodes into single draw calls.
- **FrustumCulling**: The primitives subsystem skipping render work for off-screen nodes.
- **LODController**: The primitives subsystem swapping geometry detail based on projected screen size.
- **GroupContainer**: The primitives component rendering a visual boundary around a group of nodes.
- **NestedGroup**: The primitives component supporting groups within groups.
- **NodeRegistry**: The per-provider lookup table mapping node type strings to React components.
- **Nodes_Package**: The `@verdant/nodes` package containing 10 domain-specific node components.
- **Playground**: The Next.js application at `playground/` providing the interactive `.vrd` editor and 3D canvas.
- **Inspector_Panel**: The Playground UI panel showing properties of the currently selected node or edge.
- **Toolbar**: The Playground UI bar providing undo/redo, zoom, export, layout, and toggle controls.
- **Status_Bar**: The Playground UI bar showing selection count, undo depth, layout name, and performance stats.
- **Monaco**: The Monaco Editor instance embedded in the Playground for `.vrd` source editing.
- **DataBinding**: The primitives subsystem mapping reactive observables to node/edge visual properties.
- **EdgeRouter**: The primitives subsystem computing edge paths (straight, curved, orthogonal).
- **FlowParticles**: The primitives subsystem animating particles along edges to indicate data flow.
- **NodeBadge**: The primitives overlay component rendering count or icon indicators on nodes.
- **NodePort**: A named attachment point on a node surface used as an edge connection anchor.
- **NodeStatus**: An enumerated state (`healthy`, `warning`, `error`, `unknown`) driving node visual styling.
- **ShapeType**: One of the 14 registered shape names (cube, sphere, cylinder, diamond, hexagon, torus, pentagon, octagon, ring, box, cone, capsule, icosahedron, plane).
- **LayoutType_v2**: Extended layout values: `auto`, `grid`, `circular`, `hierarchical`, `forced`.
- **RoutingType**: Edge routing algorithm values: `straight`, `curved`, `orthogonal`.
- **AnimationType**: Node enter/exit animation values: `fade`, `scale`, `slide`.
- **ExportFormat**: Supported export formats: `png`, `svg`, `gltf`.

---

## Requirements

### Requirement 1: Parser — Shape Syntax

**User Story:** As a diagram author, I want to declare a node's 3D shape in the `.vrd` DSL, so that the renderer displays the correct geometry without requiring code changes.

#### Acceptance Criteria

1. WHEN a node block contains `shape: <value>`, THE Parser SHALL parse the value and store it in `VrdNode.props.shape`.
2. THE Parser SHALL accept all 14 registered ShapeType values (`cube`, `sphere`, `cylinder`, `diamond`, `hexagon`, `torus`, `pentagon`, `octagon`, `ring`, `box`, `cone`, `capsule`, `icosahedron`, `plane`) as valid `shape` values without emitting a warning.
3. IF a `shape` value is not one of the 14 registered ShapeType values, THEN THE Parser SHALL emit a warning diagnostic identifying the unrecognized shape name.
4. THE Pretty_Printer SHALL serialize `VrdNode.props.shape` back to `shape: <value>` in the output source.
5. FOR ALL valid `.vrd` source texts containing `shape:` declarations, parsing then pretty-printing then parsing SHALL produce an equivalent `VrdAST` (round-trip property).

---

### Requirement 2: Parser — Node Status and Badges

**User Story:** As a diagram author, I want to declare a node's operational status and badge decorators in the `.vrd` DSL, so that the renderer can display health indicators without manual prop wiring.

#### Acceptance Criteria

1. WHEN a node block contains `status: <value>`, THE Parser SHALL parse the value and store it in `VrdNode.props.status`.
2. THE Parser SHALL accept `healthy`, `warning`, `error`, and `unknown` as valid `status` values without emitting a warning.
3. IF a `status` value is not one of the four valid NodeStatus values, THEN THE Parser SHALL emit a warning diagnostic.
4. WHEN a node block contains a badge declaration of the form `badge <position>: <content>` (e.g. `badge top-right: 3` or `badge top-left: icon:shield`), THE Parser SHALL parse it and append a NodeBadge entry to `VrdNode.props.badges`.
5. THE Parser SHALL accept `top-right`, `top-left`, `bottom-right`, and `bottom-left` as valid badge position values.
6. THE Pretty_Printer SHALL serialize `VrdNode.props.status` and `VrdNode.props.badges` back to their original DSL form.
7. FOR ALL valid `.vrd` source texts containing `status:` and `badge` declarations, parsing then pretty-printing then parsing SHALL produce an equivalent `VrdAST` (round-trip property).

---

### Requirement 3: Parser — Named Ports

**User Story:** As a diagram author, I want to declare named connection ports on nodes in the `.vrd` DSL, so that edges can reference specific attachment points.

#### Acceptance Criteria

1. WHEN a node block contains a port declaration of the form `port <name>: <side>` (e.g. `port http-in: top`), THE Parser SHALL parse it and append a port entry to `VrdNode.props.ports`.
2. THE Parser SHALL accept `top`, `bottom`, `left`, `right`, `front`, and `back` as valid port side values.
3. IF a port side value is not one of the six valid values, THEN THE Parser SHALL emit a warning diagnostic.
4. THE Pretty_Printer SHALL serialize `VrdNode.props.ports` back to `port <name>: <side>` declarations.
5. FOR ALL valid `.vrd` source texts containing `port` declarations, parsing then pretty-printing then parsing SHALL produce an equivalent `VrdAST` (round-trip property).

---

### Requirement 4: Parser — Node Animation Properties

**User Story:** As a diagram author, I want to declare enter and exit animations on nodes in the `.vrd` DSL, so that structural changes are animated without code changes.

#### Acceptance Criteria

1. WHEN a node block contains `enter: <value>`, THE Parser SHALL parse the value and store it in `VrdNode.props.enterAnimation`.
2. WHEN a node block contains `exit: <value>`, THE Parser SHALL parse the value and store it in `VrdNode.props.exitAnimation`.
3. WHEN a node block contains `animation-duration: <value>`, THE Parser SHALL parse the numeric value (in milliseconds) and store it in `VrdNode.props.animationDuration`.
4. THE Parser SHALL accept `fade`, `scale`, and `slide` as valid animation type values for `enter` and `exit`.
5. IF an `enter` or `exit` value is not one of the three valid AnimationType values, THEN THE Parser SHALL emit a warning diagnostic.
6. THE Pretty_Printer SHALL serialize animation properties back to their original DSL form.
7. FOR ALL valid `.vrd` source texts containing animation declarations, parsing then pretty-printing then parsing SHALL produce an equivalent `VrdAST` (round-trip property).

---

### Requirement 5: Parser — Port-to-Port Edge Syntax

**User Story:** As a diagram author, I want to write port-to-port edge connections using dot notation in the `.vrd` DSL, so that connection topology is explicit without verbose property blocks.

#### Acceptance Criteria

1. WHEN an edge declaration uses the form `<nodeId>.<portName> -> <nodeId>.<portName>` (e.g. `a.http-out -> b.http-in`), THE Parser SHALL parse it as a directed edge with `VrdEdge.props.fromPort` and `VrdEdge.props.toPort` set to the respective port names.
2. WHEN an edge declaration uses the form `<nodeId>.<portName> <-> <nodeId>.<portName>`, THE Parser SHALL parse it as a bidirectional edge with `fromPort`, `toPort`, and `bidirectional: true`.
3. THE Pretty_Printer SHALL serialize edges with `fromPort` and `toPort` back to dot-notation form.
4. FOR ALL valid `.vrd` source texts containing port-to-port edge syntax, parsing then pretty-printing then parsing SHALL produce an equivalent `VrdAST` (round-trip property).

---

### Requirement 6: Parser — Edge Routing and Flow Properties

**User Story:** As a diagram author, I want to declare edge routing algorithm and flow particle settings in the `.vrd` DSL, so that the renderer applies the correct visual treatment without code changes.

#### Acceptance Criteria

1. WHEN an edge block contains `routing: <value>`, THE Parser SHALL parse the value and store it in `VrdEdge.props.routing`.
2. THE Parser SHALL accept `straight`, `curved`, and `orthogonal` as valid RoutingType values.
3. WHEN an edge block contains `flow: true`, THE Parser SHALL set `VrdEdge.props.flow` to `true`.
4. WHEN an edge block contains `flow-speed: <value>`, THE Parser SHALL parse the numeric value and store it in `VrdEdge.props.flowSpeed`.
5. WHEN an edge block contains `flow-count: <value>`, THE Parser SHALL parse the integer value and store it in `VrdEdge.props.flowCount`.
6. WHEN an edge block contains `flow-color: <value>`, THE Parser SHALL parse the color string and store it in `VrdEdge.props.flowColor`.
7. THE Pretty_Printer SHALL serialize all edge routing and flow properties back to their original DSL form.
8. FOR ALL valid `.vrd` source texts containing routing and flow declarations, parsing then pretty-printing then parsing SHALL produce an equivalent `VrdAST` (round-trip property).

---

### Requirement 7: Parser — Group Collapse and Layout

**User Story:** As a diagram author, I want to declare group collapse state and per-group layout algorithm in the `.vrd` DSL, so that the renderer respects these settings on load.

#### Acceptance Criteria

1. WHEN a group block contains `collapsed: true`, THE Parser SHALL set `VrdGroup.props.collapsed` to `true`.
2. WHEN a group block contains `layout: <value>`, THE Parser SHALL parse the value and store it in `VrdGroup.props.layout`.
3. THE Parser SHALL accept `auto`, `grid`, `circular`, `hierarchical`, and `forced` as valid per-group layout values.
4. THE Pretty_Printer SHALL serialize `collapsed` and `layout` group properties back to their original DSL form.
5. FOR ALL valid `.vrd` source texts containing group property declarations, parsing then pretty-printing then parsing SHALL produce an equivalent `VrdAST` (round-trip property).

---

### Requirement 8: Parser — Extended Config Keys

**User Story:** As a diagram author, I want to configure minimap, post-processing, grid, and layout settings in the `.vrd` config block, so that the renderer applies these settings without code changes.

#### Acceptance Criteria

1. THE Parser SHALL recognize and store the following new config keys without emitting unknown-key warnings: `minimap`, `post-processing`, `bloom-intensity`, `snap-to-grid`, `grid-size`, `direction`, `layer-spacing`, `node-spacing`.
2. WHEN the config block contains `layout: hierarchical` or `layout: forced`, THE Parser SHALL store the value in `VrdConfig.layout` without emitting a warning.
3. THE Pretty_Printer SHALL serialize all recognized config keys back to their original DSL form.
4. FOR ALL valid `.vrd` source texts containing the new config keys, parsing then pretty-printing then parsing SHALL produce an equivalent `VrdAST` (round-trip property).

---

### Requirement 9: Parser — Animation Timeline Blocks

**User Story:** As a diagram author, I want to declare animation timeline sequences in the `.vrd` DSL, so that coordinated multi-node animations can be authored without code.

#### Acceptance Criteria

1. WHEN the source contains an `animation` block with a name identifier, THE Parser SHALL parse it and store the timeline descriptor in `VrdAST.config` under the key `animations`.
2. WHEN an animation block contains `duration: <value>`, THE Parser SHALL parse the numeric value in milliseconds.
3. WHEN an animation block contains `target: <nodeId>` and `property: <propName>` and `from: <value>` and `to: <value>` entries, THE Parser SHALL store them as keyframe entries on the timeline.
4. THE Pretty_Printer SHALL serialize animation timeline blocks back to their original DSL form.
5. FOR ALL valid `.vrd` source texts containing animation timeline blocks, parsing then pretty-printing then parsing SHALL produce an equivalent `VrdAST` (round-trip property).

---

### Requirement 10: Parser — Updated AST Types and Validation

**User Story:** As a library maintainer, I want the AST types and validation rules to reflect all new DSL syntax, so that downstream consumers receive well-typed, validated data.

#### Acceptance Criteria

1. THE `VrdNode.props` type SHALL include typed optional fields for: `shape`, `status`, `badges`, `ports`, `enterAnimation`, `exitAnimation`, and `animationDuration`.
2. THE `VrdEdge.props` type SHALL include typed optional fields for: `routing`, `flow`, `flowSpeed`, `flowCount`, and `flowColor`.
3. THE `VrdGroup.props` type SHALL include typed optional fields for: `collapsed` and `layout`.
4. THE `VrdConfig` type SHALL include typed optional fields for all new config keys defined in Requirement 8.
5. WHEN the Parser validates an AST, THE Validator SHALL check that `status` values are one of the four valid NodeStatus values and emit an error diagnostic for invalid values.
6. WHEN the Parser validates an AST, THE Validator SHALL check that `routing` values are one of the three valid RoutingType values and emit an error diagnostic for invalid values.


---

### Requirement 11: Renderer — PrimitivesProvider Integration

**User Story:** As a library maintainer, I want the renderer's Canvas to be wrapped in a PrimitivesProvider, so that all primitives subsystems are available to every scene component.

#### Acceptance Criteria

1. THE VerdantRenderer SHALL wrap its Canvas in a PrimitivesProvider, passing a PrimitivesConfig derived from the current VrdAST config block.
2. WHEN the VrdAST config contains `minimap: true`, THE PrimitivesConfig passed to PrimitivesProvider SHALL have `minimap.enabled` set to `true`.
3. WHEN the VrdAST config contains `post-processing: true`, THE PrimitivesConfig passed to PrimitivesProvider SHALL have `postProcessing.enabled` set to `true`.
4. WHEN the VrdAST config contains `bloom-intensity: <value>`, THE PrimitivesConfig SHALL set `postProcessing.bloomIntensity` to that value.
5. THE VerdantRenderer SHALL re-derive PrimitivesConfig whenever the VrdAST config block changes, without remounting the PrimitivesProvider.

---

### Requirement 12: Renderer — Node Rendering with v2 BaseNode

**User Story:** As a library maintainer, I want the renderer to use BaseNode_v2 for all nodes, so that status, badges, ports, shapes, and animations are rendered from AST data.

#### Acceptance Criteria

1. THE Renderer SHALL replace all uses of the legacy BaseNode with BaseNode_v2 from `@verdant/primitives`.
2. WHEN a VrdNode has `props.shape` set, THE Renderer SHALL pass that value as the `shape` prop to BaseNode_v2.
3. WHEN a VrdNode has `props.status` set, THE Renderer SHALL pass that value as the `status` prop to BaseNode_v2.
4. WHEN a VrdNode has `props.badges` set, THE Renderer SHALL pass that array as the `badges` prop to BaseNode_v2.
5. WHEN a VrdNode has `props.ports` set, THE Renderer SHALL pass that array as the `ports` prop to BaseNode_v2.
6. WHEN a VrdNode has `props.enterAnimation`, `props.exitAnimation`, or `props.animationDuration` set, THE Renderer SHALL pass those values to BaseNode_v2.
7. WHEN a VrdNode is added to the scene, THE Renderer SHALL pass the node's `id` as the `id` prop to BaseNode_v2 so the TransitionEngine can identify it.

---

### Requirement 13: Renderer — Edge Rendering with v2 BaseEdge

**User Story:** As a library maintainer, I want the renderer to use BaseEdge_v2 for all edges, so that routing, flow particles, and port endpoints are rendered from AST data.

#### Acceptance Criteria

1. THE Renderer SHALL replace all uses of the legacy BaseEdge with BaseEdge_v2 from `@verdant/primitives`.
2. WHEN a VrdEdge has `props.routing` set, THE Renderer SHALL pass that value as the `routing` prop to BaseEdge_v2.
3. WHEN a VrdEdge has `props.flow` set to `true`, THE Renderer SHALL construct a FlowParticleConfig from `props.flowSpeed`, `props.flowCount`, and `props.flowColor` and pass it as the `flowParticles` prop to BaseEdge_v2.
4. WHEN a VrdEdge has `props.fromPort` set, THE Renderer SHALL pass that value as the `fromPort` prop to BaseEdge_v2.
5. WHEN a VrdEdge has `props.toPort` set, THE Renderer SHALL pass that value as the `toPort` prop to BaseEdge_v2.
6. THE Renderer SHALL pass `fromNodeId` and `toNodeId` to BaseEdge_v2 so the EdgeRouter can resolve port world positions.

---

### Requirement 14: Renderer — Layout Algorithm Selector

**User Story:** As a diagram author, I want the renderer to apply the layout algorithm specified in the VrdAST config, so that diagrams are automatically arranged according to the declared strategy.

#### Acceptance Criteria

1. WHEN the VrdAST config has `layout: hierarchical`, THE Renderer SHALL invoke the HierarchicalLayout algorithm to compute node positions.
2. WHEN the VrdAST config has `layout: forced`, THE Renderer SHALL invoke a force-directed layout algorithm to compute node positions.
3. WHEN the VrdAST config has `layout: grid`, `layout: circular`, or `layout: auto`, THE Renderer SHALL invoke the corresponding existing layout algorithm.
4. WHEN the layout algorithm changes between AST updates, THE Renderer SHALL trigger a LayoutTransition animation via the TransitionEngine, interpolating all node positions over 500ms.
5. WHEN the VrdAST config has `direction: <value>` (e.g. `LR`, `TB`), THE Renderer SHALL pass that value to the HierarchicalLayout algorithm as the flow direction.

---

### Requirement 15: Renderer — Interaction Subsystems

**User Story:** As a library maintainer, I want the renderer to wire SelectionManager, CommandHistory, DragManager, and KeyboardNav from the PrimitivesProvider, so that all interaction is handled by the primitives layer.

#### Acceptance Criteria

1. THE Renderer SHALL use the SelectionManager from PrimitivesContext for all node and edge selection state, replacing the current `selectedNodeId` store field.
2. WHEN a node is dragged to a new position, THE Renderer SHALL record a move command in the CommandHistory via the DragManager.
3. WHEN the user triggers undo (Ctrl+Z / Cmd+Z) while the canvas has focus, THE Renderer SHALL call `CommandHistory.undo()`.
4. WHEN the user triggers redo (Ctrl+Y / Cmd+Shift+Z) while the canvas has focus, THE Renderer SHALL call `CommandHistory.redo()`.
5. THE Renderer SHALL wire KeyboardNav from PrimitivesContext to handle Tab/Shift+Tab focus traversal, Enter/Space activation, and the `F` zoom-to-fit shortcut within the canvas.
6. WHEN the SelectionManager emits a `selectionChange` event, THE Renderer SHALL propagate the updated selection to the playground via the existing `onNodeClick` callback interface or an extended equivalent.

---

### Requirement 16: Renderer — Overlay Components

**User Story:** As a library maintainer, I want the renderer to render the Minimap, ContextMenu, and PostProcessing overlays from the primitives layer, so that these features are available without additional wiring in the playground.

#### Acceptance Criteria

1. WHEN `PrimitivesConfig.minimap.enabled` is `true`, THE Renderer SHALL render the Minimap component from `@verdant/primitives` as an overlay within the Canvas.
2. WHEN `PrimitivesConfig.postProcessing.enabled` is `true`, THE Renderer SHALL activate the PostProcessing pipeline from `@verdant/primitives`.
3. WHEN the user right-clicks a node or edge, THE Renderer SHALL render the ContextMenu component from `@verdant/primitives` at the pointer position.
4. THE ContextMenu SHALL include at minimum the following actions: delete selected, duplicate node, zoom to fit, and collapse/expand group (when a group node is right-clicked).
5. WHEN `PrimitivesConfig.minimap.enabled` is `false` or absent, THE Renderer SHALL not render the Minimap component.

---

### Requirement 17: Renderer — Performance Subsystems

**User Story:** As a library maintainer, I want the renderer to use InstancedRenderer, FrustumCulling, and LODController from the primitives layer, so that large diagrams render at acceptable frame rates.

#### Acceptance Criteria

1. THE Renderer SHALL delegate same-shape node batching to the InstancedRenderer from `@verdant/primitives` when 10 or more nodes share the same shape type.
2. THE Renderer SHALL enable FrustumCulling from `@verdant/primitives` so that nodes outside the camera frustum are skipped each frame.
3. THE Renderer SHALL enable the LODController from `@verdant/primitives` so that node geometry detail is reduced when projected screen size falls below 20 pixels.
4. WHEN the scene contains 200 nodes and 300 edges, THE Renderer SHALL maintain a frame rate of at least 60 fps as measured over a 5-second window on a mid-range GPU.
5. WHEN the scene contains 500 nodes, THE Renderer SHALL maintain a frame rate of at least 30 fps as measured over a 5-second window on a mid-range GPU.

---

### Requirement 18: Renderer — Group Rendering

**User Story:** As a library maintainer, I want the renderer to use GroupContainer and NestedGroup from the primitives layer, so that group collapse, expand, and nested group rendering work correctly.

#### Acceptance Criteria

1. THE Renderer SHALL render each VrdGroup using the GroupContainer component from `@verdant/primitives`.
2. WHEN a VrdGroup has `props.collapsed: true`, THE Renderer SHALL pass `collapsed={true}` to the GroupContainer, causing child nodes to be hidden and a proxy node to be shown.
3. WHEN a VrdGroup contains nested VrdGroup entries, THE Renderer SHALL render them using the NestedGroup component from `@verdant/primitives`.
4. WHEN a group's collapsed state changes at runtime (via ContextMenu or keyboard), THE Renderer SHALL update the corresponding VrdGroup in the store and trigger the appropriate TransitionEngine animations.
5. WHEN a group is collapsed, THE Renderer SHALL route edges that connected to child nodes to the proxy node's center via the EdgeRouter.

---

### Requirement 19: Nodes Package — v2 Migration

**User Story:** As a library maintainer, I want all 10 node components in the Nodes_Package to use BaseNode_v2, so that they automatically gain status, badge, port, and animation support.

#### Acceptance Criteria

1. THE Nodes_Package SHALL update all 10 node components (CacheNode, CloudNode, DatabaseNode, GatewayNode, MonitorNode, QueueNode, ServerNode, ServiceNode, StorageNode, UserNode) to import BaseNode from `@verdant/primitives` nodes path rather than the legacy path.
2. EACH node component SHALL declare a `defaultPorts` constant defining at least one named NodePort appropriate to the node's semantic role.
3. EACH node component SHALL declare a `defaultStatus` value of `unknown` as the fallback when no `status` prop is provided.
4. EACH node component SHALL register itself with the NodeRegistry via the PluginSystem on module load.
5. WHEN a node component receives a `status` prop, THE node component SHALL pass it through to BaseNode_v2 without modification.

---

### Requirement 20: Playground — Toolbar Controls

**User Story:** As a playground user, I want a toolbar with controls for undo/redo, zoom, export, layout, minimap, post-processing, and grid snap, so that I can access all diagram operations without editing the `.vrd` source.

#### Acceptance Criteria

1. THE Toolbar SHALL include an undo button that calls `CommandHistory.undo()` and is disabled when `CommandHistory.canUndo` is `false`.
2. THE Toolbar SHALL include a redo button that calls `CommandHistory.redo()` and is disabled when `CommandHistory.canRedo` is `false`.
3. THE Toolbar SHALL include a zoom-to-fit button that triggers the camera zoom-to-fit action.
4. THE Toolbar SHALL include an export dropdown with options for PNG, SVG, and GLTF formats, each triggering the corresponding export subsystem.
5. THE Toolbar SHALL include a layout selector dropdown with options for `auto`, `grid`, `circular`, `hierarchical`, and `forced`, updating the VrdAST config and triggering a layout transition.
6. THE Toolbar SHALL include a minimap toggle button that enables or disables the Minimap overlay.
7. THE Toolbar SHALL include a post-processing toggle button that enables or disables the PostProcessing pipeline.
8. THE Toolbar SHALL include a grid-snap toggle button that enables or disables snap-to-grid behavior during node dragging.

---

### Requirement 21: Playground — Status Bar

**User Story:** As a playground user, I want a status bar showing selection count, undo depth, layout name, and performance stats, so that I have situational awareness while editing.

#### Acceptance Criteria

1. THE Status_Bar SHALL display the count of currently selected nodes and edges, updating within one rendered frame of a selection change.
2. THE Status_Bar SHALL display the current undo stack depth (number of available undo steps).
3. THE Status_Bar SHALL display the name of the currently active layout algorithm.
4. THE Status_Bar SHALL display the current frames-per-second (FPS) as reported by the renderer, updated at most once per second.
5. WHEN no nodes are selected, THE Status_Bar SHALL display "No selection" for the selection count field.

---

### Requirement 22: Playground — Inspector Panel

**User Story:** As a playground user, I want an inspector panel that shows and edits the properties of the selected node or edge, so that I can configure status, badges, ports, routing, and flow without editing raw source.

#### Acceptance Criteria

1. WHEN a node is selected, THE Inspector_Panel SHALL display the node's current `status` value and allow the user to change it via a dropdown, updating the `.vrd` source accordingly.
2. WHEN a node is selected, THE Inspector_Panel SHALL display the node's current `badges` array and allow the user to add, edit, or remove badge entries.
3. WHEN a node is selected, THE Inspector_Panel SHALL display the node's declared `ports` and allow the user to add or remove port entries.
4. WHEN an edge is selected, THE Inspector_Panel SHALL display the edge's current `routing` value and allow the user to change it via a dropdown.
5. WHEN an edge is selected, THE Inspector_Panel SHALL display the edge's flow settings (`flow`, `flow-speed`, `flow-count`, `flow-color`) and allow the user to toggle and configure them.
6. WHEN a group node is selected, THE Inspector_Panel SHALL display a collapse/expand toggle that updates `VrdGroup.props.collapsed` in the source.
7. WHEN the user edits a property in the Inspector_Panel, THE Inspector_Panel SHALL update the `.vrd` source in the Monaco editor and re-parse within 100ms.

---

### Requirement 23: Playground — Keyboard Shortcuts and Help Overlay

**User Story:** As a playground user, I want keyboard shortcuts for common actions and a help overlay listing them, so that I can work efficiently without reaching for the mouse.

#### Acceptance Criteria

1. THE Playground SHALL support the following keyboard shortcuts: `Ctrl+Z` / `Cmd+Z` for undo, `Ctrl+Y` / `Cmd+Shift+Z` for redo, `F` for zoom-to-fit, `Delete` / `Backspace` for deleting selected elements, `Escape` for clearing selection, and `?` for toggling the help overlay.
2. WHEN the `?` key is pressed, THE Playground SHALL display a help overlay listing all available keyboard shortcuts with their descriptions.
3. WHEN the help overlay is visible and the user presses `Escape` or `?`, THE Playground SHALL close the help overlay.
4. THE keyboard shortcuts SHALL not fire when the Monaco editor has focus, to avoid interfering with text editing.

---

### Requirement 24: Playground — Monaco Autocomplete and Syntax Highlighting

**User Story:** As a diagram author, I want Monaco to autocomplete and syntax-highlight all new `.vrd` keywords, so that authoring is fast and errors are visible immediately.

#### Acceptance Criteria

1. THE Monaco language definition SHALL include all new keywords as completion items: `shape`, `status`, `badge`, `port`, `enter`, `exit`, `animation-duration`, `routing`, `flow`, `flow-speed`, `flow-count`, `flow-color`, `collapsed`, `minimap`, `post-processing`, `bloom-intensity`, `snap-to-grid`, `grid-size`, `direction`, `layer-spacing`, `node-spacing`.
2. WHEN the user types `shape:` in a node block, THE Monaco autocomplete SHALL suggest all 14 ShapeType values.
3. WHEN the user types `status:` in a node block, THE Monaco autocomplete SHALL suggest `healthy`, `warning`, `error`, and `unknown`.
4. WHEN the user types `routing:` in an edge block, THE Monaco autocomplete SHALL suggest `straight`, `curved`, and `orthogonal`.
5. THE Monaco syntax highlighting SHALL apply distinct token colors to the new keywords, distinguishing them from node type identifiers and string values.

---

### Requirement 25: Playground — Preset Demos

**User Story:** As a playground user, I want new preset diagrams demonstrating the integration features, so that I can explore the new capabilities without writing `.vrd` source from scratch.

#### Acceptance Criteria

1. THE Playground SHALL include at least one new preset demonstrating hierarchical layout with `direction: LR` and at least 8 nodes.
2. THE Playground SHALL include at least one new preset demonstrating flow particles on edges with `flow: true` and `flow-speed` configured.
3. THE Playground SHALL include at least one new preset demonstrating group collapse with at least one collapsed group.
4. THE Playground SHALL include at least one new preset demonstrating node status states, showing all four NodeStatus values across different nodes.
5. THE Playground SHALL include at least one new preset demonstrating post-processing with `post-processing: true` and `bloom-intensity` configured.

---

### Requirement 26: Testing — Integration Tests

**User Story:** As a library maintainer, I want integration tests covering the full parser-to-renderer pipeline and key interaction flows, so that regressions are caught before release.

#### Acceptance Criteria

1. THE integration test suite SHALL include a test that parses a `.vrd` source containing all new syntax (shapes, status, badges, ports, routing, flow, collapse, new config keys) and verifies the resulting VrdAST contains the expected values.
2. THE integration test suite SHALL include a test that mounts a VerdantRenderer with a VrdAST containing a node with `status: error` and verifies the rendered node uses the error StatusMaterials.
3. THE integration test suite SHALL include a test that exercises the full selection flow: click node → verify SelectionManager.selectedIds contains the node ID → click empty area → verify selection is cleared.
4. THE integration test suite SHALL include a test that exercises undo/redo: move a node → undo → verify node returns to original position → redo → verify node returns to moved position.
5. THE integration test suite SHALL include a test that triggers PNG, SVG, and GLTF export and verifies each returns a non-empty result without mutating the scene.
6. THE integration test suite SHALL include a test that collapses a group, verifies child nodes are hidden and a proxy node is shown, then expands the group and verifies child nodes reappear.

---

### Requirement 27: Testing — Performance Benchmarks

**User Story:** As a library maintainer, I want automated performance benchmarks for large diagrams, so that frame rate regressions are detected before release.

#### Acceptance Criteria

1. THE benchmark suite SHALL include a test rendering 100 nodes and 150 edges and asserting a sustained frame rate of at least 60 fps over a 5-second window.
2. THE benchmark suite SHALL include a test rendering 500 nodes and 700 edges and asserting a sustained frame rate of at least 30 fps over a 5-second window.
3. THE benchmark suite SHALL include a test rendering 1000 nodes and asserting the renderer does not crash and produces at least 10 fps.
4. THE benchmark suite SHALL include a memory leak detection test that mounts and unmounts a 200-node scene 10 times and asserts that heap memory after the final unmount does not exceed heap memory before the first mount by more than 10 MB.
5. WHEN a benchmark assertion fails, THE benchmark suite SHALL report the measured frame rate and the threshold that was not met.

---

### Requirement 28: Testing — Visual Regression Snapshots

**User Story:** As a library maintainer, I want visual regression snapshots for all 14 shapes, node states, themes, and group configurations, so that unintended visual changes are caught automatically.

#### Acceptance Criteria

1. THE visual regression suite SHALL include a snapshot for each of the 14 ShapeType values rendered at default size with no status.
2. THE visual regression suite SHALL include a snapshot for each of the four NodeStatus values (`healthy`, `warning`, `error`, `unknown`) applied to a cube node.
3. THE visual regression suite SHALL include snapshots for both the light and dark themes applied to a 5-node diagram.
4. THE visual regression suite SHALL include a snapshot of a collapsed group and a snapshot of the same group expanded.
5. WHEN a visual regression snapshot differs from the baseline by more than 0.1% of pixels, THE suite SHALL fail and report the differing snapshot name and pixel difference percentage.

---

### Requirement 29: Testing — Accessibility Audit

**User Story:** As a library maintainer, I want an automated accessibility audit covering keyboard navigation, ARIA attributes, and color contrast, so that the integration meets baseline accessibility standards.

#### Acceptance Criteria

1. THE accessibility audit SHALL verify that all 10 node components in the Nodes_Package render an ARIA live region announcing the node's label and status when the node receives keyboard focus.
2. THE accessibility audit SHALL verify that the canvas element rendered by VerdantRenderer has a non-empty `aria-label` attribute.
3. THE accessibility audit SHALL verify that Tab and Shift+Tab key presses move focus between nodes in a predictable order without trapping focus.
4. THE accessibility audit SHALL verify that the ContextMenu is reachable via keyboard (right-click equivalent key or application key) and that all menu items are focusable and activatable via Enter or Space.
5. THE accessibility audit SHALL verify that the status color pairs (healthy green, warning amber, error red, unknown grey) each meet a minimum contrast ratio of 3:1 against the default background colors for both light and dark themes.
