# Requirements Document

## Introduction

This document defines the production-grade upgrade of `@verdant/primitives` from its current v1 state (6 shapes, basic hover/select, module singleton registry) to a full v2.0 library capable of powering complex, interactive 3D architecture diagrams at scale. The upgrade is organized into five sprints plus a "fix now" phase, covering geometry management, shape expansion, edge routing, animation, interaction, grouping, layout, export, accessibility, and a plugin architecture.

---

## Glossary

- **Primitives**: The `@verdant/primitives` package — the core 3D rendering library for `@verdant`.
- **BaseNode**: The foundational React Three Fiber component that all node types extend.
- **BaseEdge**: The foundational component that renders connections between nodes.
- **SharedGeometryPool**: A subsystem that caches and reuses Three.js geometry instances across nodes of the same shape type.
- **GeometryFactory**: A factory that creates or retrieves geometry from the SharedGeometryPool.
- **LODManager**: A subsystem that selects geometry detail level based on camera distance.
- **MaterialCache**: A subsystem that deduplicates Three.js material instances by their configuration key.
- **StatusMaterials**: A set of pre-built materials representing node status states (healthy, warning, error, unknown).
- **AnimatedMaterial**: A material variant that supports shader-driven animation properties (e.g., pulse, flow).
- **ShapeDefinition**: A declarative descriptor object that defines a shape's geometry, default material, and metadata.
- **CompoundShape**: A shape composed of multiple geometry primitives rendered as a single logical unit.
- **CustomShape**: A shape loaded from an external GLTF/OBJ mesh file.
- **NodePort**: A named attachment point on a node surface used as an edge connection anchor.
- **NodeBadge**: A small overlay indicator rendered on a node to convey secondary information (count, status icon).
- **NodeStatus**: An enumerated state value (healthy, warning, error, unknown) that drives visual styling.
- **NodeLabel**: The text annotation rendered near a node, with configurable position and style.
- **NodeInteraction**: The subsystem handling pointer events, hover, focus, and selection for nodes.
- **EdgeRouter**: A subsystem that computes edge paths using a specified routing algorithm (straight, curved, orthogonal).
- **FlowParticles**: An animated particle system that travels along an edge to indicate data flow direction.
- **EdgeLabel**: A text annotation rendered at the midpoint of an edge.
- **EdgePort**: The specific NodePort that an edge connects to on its source or target node.
- **GroupContainer**: A visual boundary rendered around a set of nodes that belong to the same logical group.
- **GroupCollapse**: The behavior of collapsing a group so its children are hidden and replaced by a single proxy node.
- **NestedGroup**: A group that contains other groups, forming a hierarchy.
- **TransitionEngine**: The subsystem that drives declarative enter, exit, and layout-change animations.
- **EnterExit**: Animations played when nodes or edges are added to or removed from the scene.
- **LayoutTransition**: An animation that interpolates node positions when the layout algorithm produces a new arrangement.
- **Timeline**: A sequenced animation descriptor that coordinates multiple animated properties over time.
- **SelectionManager**: The subsystem that tracks which nodes and edges are currently selected.
- **DragManager**: The subsystem that handles pointer-driven node repositioning.
- **CommandHistory**: A stack-based undo/redo system that records reversible mutations.
- **ContextMenu**: A pointer-triggered overlay menu offering actions on the selected element.
- **KeyboardNav**: The subsystem that maps keyboard input to navigation and interaction actions.
- **NodeRegistry**: The lookup table mapping node type strings to their React components.
- **ShapeRegistry**: The lookup table mapping shape type strings to their ShapeDefinition objects.
- **PluginSystem**: The extension mechanism that allows third-party packages to register nodes, shapes, and behaviors.
- **InstancedRenderer**: A renderer that uses Three.js `InstancedMesh` to draw many identical shapes in a single draw call.
- **FrustumCulling**: The process of skipping rendering for objects outside the camera's view frustum.
- **LODController**: The component that coordinates LODManager decisions and swaps geometry at runtime.
- **ObjectPool**: A reusable object cache that avoids repeated allocation and garbage collection of Three.js objects.
- **DataBinding**: A mechanism that maps external reactive data sources to node and edge visual properties.
- **VrdAST**: The parsed abstract syntax tree produced by `@verdant/parser`, consumed by the renderer.
- **GLTF**: GL Transmission Format — a standard 3D asset interchange format.

---

## Requirements

### Requirement 1: Shared Geometry and Disposal (Fix Now)

**User Story:** As a library maintainer, I want geometry instances to be shared and properly disposed, so that the application does not leak GPU memory when nodes are added or removed.

#### Acceptance Criteria

1. THE SharedGeometryPool SHALL maintain at most one Three.js geometry instance per unique shape-and-parameter combination.
2. WHEN a node component mounts, THE GeometryFactory SHALL retrieve the geometry from the SharedGeometryPool rather than constructing a new instance.
3. WHEN a node component unmounts and no other mounted component references its geometry, THE SharedGeometryPool SHALL dispose of that geometry from GPU memory.
4. THE SharedGeometryPool SHALL expose a `getStats()` method returning the count of currently cached geometries and total reference count.
5. WHEN the same geometry is requested with identical parameters by N concurrent nodes, THE SharedGeometryPool SHALL hold exactly one geometry instance with a reference count of N.

---

### Requirement 2: Material Deduplication and Disposal (Fix Now)

**User Story:** As a library maintainer, I want materials to be deduplicated and disposed correctly, so that GPU memory usage scales with unique material configurations rather than node count.

#### Acceptance Criteria

1. THE MaterialCache SHALL store at most one Three.js material instance per unique configuration key.
2. WHEN a node requests a material with a given color, opacity, and emissive value, THE MaterialCache SHALL return the cached instance if one exists with identical parameters.
3. WHEN a material's reference count reaches zero, THE MaterialCache SHALL call `dispose()` on the Three.js material object.
4. THE StatusMaterials SHALL provide pre-built material instances for the states: `healthy`, `warning`, `error`, and `unknown`.
5. WHEN a node's `status` prop changes, THE BaseNode SHALL swap to the corresponding StatusMaterials instance within one rendered frame.

---

### Requirement 3: Edge Connection Ports (Sprint 1)

**User Story:** As a diagram author, I want edges to connect to named ports on nodes, so that connection topology is explicit and visually precise.

#### Acceptance Criteria

1. THE ShapeDefinition SHALL declare zero or more named NodePorts, each with a local-space position and a facing direction vector.
2. WHEN an edge specifies a `fromPort` or `toPort` property, THE EdgeRouter SHALL compute the edge path origin or terminus from the corresponding NodePort world position.
3. WHEN a node is dragged to a new position, THE EdgeRouter SHALL recompute all edge paths connected to that node's ports within the same frame.
4. IF a `fromPort` or `toPort` value references a port name not defined on the target node, THEN THE BaseEdge SHALL fall back to the node's center position and emit a console warning.
5. THE NodePort SHALL be rendered as a visible indicator when the parent node is hovered, with a diameter no larger than 0.15 world units.

---

### Requirement 4: Enter and Exit Animations (Sprint 1)

**User Story:** As a diagram author, I want nodes and edges to animate when they appear or disappear, so that structural changes are visually communicated rather than jarring.

#### Acceptance Criteria

1. WHEN a node is added to the scene, THE TransitionEngine SHALL play the node's configured enter animation over a duration of 300ms by default.
2. WHEN a node is removed from the scene, THE TransitionEngine SHALL play the node's configured exit animation before unmounting the component, with a default duration of 200ms.
3. THE EnterExit subsystem SHALL support at minimum the following enter animation types: `fade`, `scale`, and `slide`.
4. THE EnterExit subsystem SHALL support at minimum the following exit animation types: `fade`, `scale`, and `slide`.
5. WHERE a custom enter or exit duration is specified on a node, THE TransitionEngine SHALL use that duration instead of the default.
6. WHEN an exit animation is in progress, THE node SHALL remain visible and non-interactive until the animation completes.

---

### Requirement 5: Multi-Select and Box Select (Sprint 1)

**User Story:** As a diagram user, I want to select multiple nodes at once, so that I can perform bulk operations like move, delete, or group.

#### Acceptance Criteria

1. WHEN the user holds the platform modifier key (Ctrl on Windows/Linux, Cmd on macOS) and clicks a node, THE SelectionManager SHALL add that node to the current selection without deselecting others.
2. WHEN the user clicks an empty area of the canvas without the modifier key held, THE SelectionManager SHALL clear the current selection.
3. WHEN the user initiates a pointer drag on an empty canvas area, THE SelectionManager SHALL render a rectangular box-select region and select all nodes whose bounding volumes intersect the box upon pointer release.
4. THE SelectionManager SHALL expose a `selectedIds` property returning the set of currently selected node and edge IDs.
5. WHEN the selection changes, THE SelectionManager SHALL emit a `selectionChange` event with the new set of selected IDs.
6. WHILE two or more nodes are selected, THE DragManager SHALL translate all selected nodes together when any one of them is dragged.

---

### Requirement 6: Undo and Redo (Sprint 1)

**User Story:** As a diagram user, I want to undo and redo changes, so that I can recover from mistakes without restarting.

#### Acceptance Criteria

1. THE CommandHistory SHALL record every reversible mutation (node move, add, remove, property change, group change) as a command object with `execute` and `undo` methods.
2. WHEN the user triggers undo (Ctrl+Z / Cmd+Z), THE CommandHistory SHALL call `undo()` on the most recent command and move the pointer back by one.
3. WHEN the user triggers redo (Ctrl+Y / Cmd+Shift+Z), THE CommandHistory SHALL call `execute()` on the next command in the stack and advance the pointer.
4. WHEN a new command is recorded while the undo pointer is not at the top of the stack, THE CommandHistory SHALL discard all commands above the current pointer position.
5. THE CommandHistory SHALL support a configurable maximum stack depth, defaulting to 100 entries.
6. THE CommandHistory SHALL expose `canUndo` and `canRedo` boolean properties reflecting the current stack state.

---

### Requirement 7: Zoom to Fit and Focus Node (Sprint 1)

**User Story:** As a diagram user, I want to zoom the camera to fit all nodes or focus on a specific node, so that I can quickly orient myself in large diagrams.

#### Acceptance Criteria

1. WHEN the zoom-to-fit action is triggered, THE camera SHALL animate to a position and field-of-view that fits all visible nodes within the viewport with a padding of at least 10% on each side, completing within 600ms.
2. WHEN a focus-node action is triggered with a node ID, THE camera SHALL animate to center that node in the viewport at a comfortable viewing distance, completing within 400ms.
3. IF the zoom-to-fit action is triggered with no visible nodes in the scene, THEN THE camera SHALL return to its default position.
4. THE zoom-to-fit and focus-node animations SHALL use an eased interpolation curve (ease-in-out) rather than linear interpolation.

---

### Requirement 8: Expanded Shape Library (Sprint 2)

**User Story:** As a diagram author, I want at least 8 additional shape types beyond the current 6, so that I can represent a wider range of architecture components with distinct visual identities.

#### Acceptance Criteria

1. THE ShapeRegistry SHALL include the following shapes in addition to the existing six: `pentagon`, `octagon`, `ring`, `box`, `cone`, `capsule`, `icosahedron`, and `plane`.
2. WHEN a node's `shape` prop is set to any registered shape name, THE GeometryFactory SHALL produce the correct geometry for that shape.
3. THE ShapeDefinition for each shape SHALL declare default NodePort positions appropriate to the shape's geometry.
4. FOR ALL registered shapes, THE ShapeRegistry SHALL return a ShapeDefinition when queried by name, and querying by the same name twice SHALL return an equivalent definition (idempotent lookup).

---

### Requirement 9: Flow Particles on Edges (Sprint 2)

**User Story:** As a diagram author, I want animated particles to flow along edges, so that data flow direction and activity are visually apparent.

#### Acceptance Criteria

1. WHEN an edge's `style` prop is set to `flow`, THE FlowParticles subsystem SHALL render a configurable number of particles traveling from the source node to the target node along the edge path.
2. THE FlowParticles subsystem SHALL support a `speed` property controlling particle travel time in seconds per full traversal, defaulting to 2.0 seconds.
3. THE FlowParticles subsystem SHALL support a `count` property controlling the number of simultaneous particles, defaulting to 5.
4. THE FlowParticles subsystem SHALL support a `color` property that defaults to the parent edge's color.
5. WHEN an edge is removed from the scene, THE FlowParticles subsystem SHALL dispose of all particle geometry and material instances associated with that edge.

---

### Requirement 10: Group Collapse and Expand (Sprint 2)

**User Story:** As a diagram user, I want to collapse and expand node groups, so that I can reduce visual complexity when exploring large diagrams.

#### Acceptance Criteria

1. WHEN a GroupContainer's `collapsed` prop is set to `true`, THE GroupCollapse subsystem SHALL hide all child node and edge components and render a single proxy node in their place.
2. WHEN a GroupContainer's `collapsed` prop transitions from `true` to `false`, THE TransitionEngine SHALL play enter animations for all child nodes.
3. WHEN a GroupContainer's `collapsed` prop transitions from `false` to `true`, THE TransitionEngine SHALL play exit animations for all child nodes before hiding them.
4. THE proxy node rendered during collapse SHALL display the group's label and a badge showing the count of hidden child nodes.
5. WHILE a group is collapsed, THE EdgeRouter SHALL route edges that connected to child nodes to connect instead to the proxy node's center.

---

### Requirement 11: Node Status States (Sprint 2)

**User Story:** As a diagram author, I want nodes to visually reflect operational status, so that users can identify healthy, degraded, or failed components at a glance.

#### Acceptance Criteria

1. THE BaseNode SHALL accept a `status` prop with values: `healthy`, `warning`, `error`, and `unknown`.
2. WHEN a node's `status` is `healthy`, THE BaseNode SHALL apply the StatusMaterials healthy material (default green tint).
3. WHEN a node's `status` is `warning`, THE BaseNode SHALL apply the StatusMaterials warning material (default amber tint) and render a pulsing glow effect.
4. WHEN a node's `status` is `error`, THE BaseNode SHALL apply the StatusMaterials error material (default red tint) and render a pulsing glow effect at twice the frequency of the warning state.
5. WHEN a node's `status` is `unknown`, THE BaseNode SHALL apply the StatusMaterials unknown material (default grey tint) with no glow effect.
6. WHERE a custom `statusColors` configuration is provided to the Primitives provider, THE StatusMaterials SHALL use those colors instead of the defaults.

---

### Requirement 12: Node Badges and Decorators (Sprint 2)

**User Story:** As a diagram author, I want to attach small badge indicators to nodes, so that I can surface counts, icons, or status symbols without cluttering the label.

#### Acceptance Criteria

1. THE BaseNode SHALL accept a `badges` prop containing an array of NodeBadge descriptors.
2. EACH NodeBadge descriptor SHALL specify at minimum: `position` (one of: `top-right`, `top-left`, `bottom-right`, `bottom-left`), `content` (a string or icon identifier), and an optional `color`.
3. WHEN a node has one or more badges, THE BaseNode SHALL render each badge at its specified position relative to the node's bounding box.
4. THE NodeBadge SHALL scale proportionally with the parent node's `size` prop.
5. IF two badges are assigned the same `position`, THEN THE BaseNode SHALL render only the last badge in the array at that position and emit a console warning.

---

### Requirement 13: Hierarchical Layout Algorithm (Sprint 2)

**User Story:** As a diagram author, I want a hierarchical layout option, so that directed graphs are automatically arranged in a top-down tree structure.

#### Acceptance Criteria

1. WHEN the diagram's `layout` config is set to `hierarchical`, THE layout engine SHALL arrange nodes in horizontal layers where each node's layer is determined by its longest path from a root node.
2. WHEN the hierarchical layout is computed, THE LayoutTransition SHALL animate all nodes from their previous positions to their new positions over 500ms.
3. THE hierarchical layout SHALL minimize edge crossings between adjacent layers using a configurable number of optimization passes, defaulting to 3.
4. WHEN the hierarchical layout is applied to a graph with cycles, THE layout engine SHALL break cycles by reversing the minimum number of edges required to produce a DAG before computing layers.

---

### Requirement 14: Orthogonal Edge Routing (Sprint 3)

**User Story:** As a diagram author, I want edges to route around nodes using right-angle paths, so that diagrams look structured and avoid visual clutter from overlapping lines.

#### Acceptance Criteria

1. WHEN an edge's `routing` prop is set to `orthogonal`, THE EdgeRouter SHALL compute a path consisting exclusively of horizontal and vertical segments connecting the source and target NodePorts.
2. THE orthogonal EdgeRouter SHALL avoid routing paths through the bounding volumes of other nodes in the scene.
3. WHEN a node is moved, THE EdgeRouter SHALL recompute all orthogonal paths connected to that node within one animation frame.
4. IF no collision-free orthogonal path exists between two ports, THEN THE EdgeRouter SHALL fall back to a curved path and emit a console warning.

---

### Requirement 15: PNG and SVG Export (Sprint 3)

**User Story:** As a diagram user, I want to export the diagram as a PNG or SVG file, so that I can include it in documentation or share it with stakeholders.

#### Acceptance Criteria

1. WHEN the PNG export action is triggered, THE export subsystem SHALL render the current scene to an offscreen canvas and produce a PNG blob at the canvas's current pixel resolution.
2. WHEN the SVG export action is triggered, THE export subsystem SHALL produce an SVG document that faithfully represents node positions, shapes, labels, and edge paths as SVG primitives.
3. THE PNG export SHALL support a `scale` option (1–4) that multiplies the output resolution, defaulting to 2 for retina quality.
4. WHEN an export is in progress, THE export subsystem SHALL not alter the visible scene state or camera position.
5. IF an export operation fails, THEN THE export subsystem SHALL reject the returned Promise with a descriptive error message.

---

### Requirement 16: Context Menu (Sprint 3)

**User Story:** As a diagram user, I want a right-click context menu on nodes and edges, so that I can access common actions without leaving the canvas.

#### Acceptance Criteria

1. WHEN the user right-clicks a node or edge, THE ContextMenu SHALL appear at the pointer position within 16ms.
2. THE ContextMenu SHALL display actions relevant to the clicked element type (node or edge).
3. WHEN the user selects an action from the ContextMenu, THE ContextMenu SHALL close and execute the action.
4. WHEN the user clicks outside the ContextMenu or presses Escape, THE ContextMenu SHALL close without executing any action.
5. THE ContextMenu SHALL support registration of custom actions via the PluginSystem.

---

### Requirement 17: Keyboard Navigation and Accessibility (Sprint 3)

**User Story:** As a keyboard or screen reader user, I want to navigate and interact with the diagram using only the keyboard, so that the library is accessible to users who cannot use a pointer device.

#### Acceptance Criteria

1. THE KeyboardNav subsystem SHALL allow focus to move between nodes using the Tab and Shift+Tab keys.
2. WHEN a node has keyboard focus, THE KeyboardNav subsystem SHALL render a visible focus indicator on that node distinct from the hover and selection states.
3. WHEN a focused node receives the Enter or Space key, THE KeyboardNav subsystem SHALL trigger the node's primary action (equivalent to a pointer click).
4. THE BaseNode SHALL render an ARIA live region announcing the node's label and status when the node receives focus.
5. WHEN the diagram is rendered, THE canvas element SHALL have a descriptive `aria-label` attribute summarizing the diagram content.
6. THE KeyboardNav subsystem SHALL support the following shortcuts: `F` for zoom-to-fit, `Delete`/`Backspace` for deleting selected elements, `Escape` for clearing selection.

---

### Requirement 18: Post-Processing Effects (Sprint 4)

**User Story:** As a diagram author, I want optional post-processing effects like bloom and outline, so that selected or highlighted nodes stand out visually.

#### Acceptance Criteria

1. WHERE post-processing is enabled in the Primitives provider configuration, THE rendering pipeline SHALL apply a bloom pass to emissive surfaces with configurable `intensity`, `threshold`, and `radius` parameters.
2. WHEN a node is selected, THE rendering pipeline SHALL apply an outline effect to that node's geometry with a configurable `color` and `thickness`.
3. WHERE post-processing is disabled, THE Primitives library SHALL not import or initialize any post-processing passes, ensuring zero bundle-size overhead for that code path.

---

### Requirement 19: Real-Time Data Binding (Sprint 4)

**User Story:** As an application developer, I want to bind live data sources to node and edge visual properties, so that the diagram reflects the current state of a running system without manual updates.

#### Acceptance Criteria

1. THE DataBinding subsystem SHALL accept a `bindings` configuration mapping node or edge IDs to reactive data source observables (compatible with the RxJS Observable interface).
2. WHEN a bound data source emits a new value, THE DataBinding subsystem SHALL update the corresponding node or edge visual property within one rendered frame.
3. THE DataBinding subsystem SHALL support binding to at minimum the following node properties: `status`, `label`, `color`, and `badges`.
4. WHEN a DataBinding subscription is torn down (component unmount or explicit unsubscribe), THE DataBinding subsystem SHALL unsubscribe from all associated observables.
5. IF a bound observable emits an error, THEN THE DataBinding subsystem SHALL log the error, set the affected node's status to `unknown`, and continue operating.

---

### Requirement 20: Plugin Architecture (Sprint 1 / Ongoing)

**User Story:** As a third-party package author, I want a stable plugin API, so that I can register custom node types, shapes, and behaviors without forking the core library.

#### Acceptance Criteria

1. THE PluginSystem SHALL replace the current module-singleton NodeRegistry with an instance-scoped registry that is initialized per Primitives provider.
2. THE PluginSystem SHALL expose a `registerNode(type, component, options)` method that adds a node type to the NodeRegistry.
3. THE PluginSystem SHALL expose a `registerShape(name, definition)` method that adds a ShapeDefinition to the ShapeRegistry.
4. THE PluginSystem SHALL expose a `registerContextAction(elementType, action)` method that adds an entry to the ContextMenu for the specified element type.
5. WHEN two plugins register the same node type key, THE PluginSystem SHALL throw an error identifying the conflicting key and the names of both plugins.
6. THE PluginSystem SHALL expose a `listPlugins()` method returning the names and versions of all registered plugins.

---

### Requirement 21: Instanced Rendering and Performance (Sprint 1 / Ongoing)

**User Story:** As an application developer, I want the library to render large diagrams (200+ nodes) at 60 fps, so that the user experience remains smooth at scale.

#### Acceptance Criteria

1. WHEN the scene contains 10 or more nodes of the same shape type, THE InstancedRenderer SHALL consolidate those nodes into a single `InstancedMesh` draw call.
2. THE FrustumCulling subsystem SHALL skip update and render work for nodes whose bounding volumes are outside the camera frustum.
3. THE LODController SHALL switch a node's geometry to a lower-detail variant when the node's projected screen size falls below 20 pixels.
4. THE ObjectPool SHALL pre-allocate and reuse Three.js `Vector3`, `Matrix4`, and `Quaternion` instances to reduce per-frame garbage collection pressure.
5. WHEN the scene contains 200 nodes and 300 edges on a device with a mid-range GPU, THE Primitives library SHALL maintain a frame rate of at least 60 fps as measured over a 5-second window.

---

### Requirement 22: GLTF Import and Export (Sprint 5)

**User Story:** As a diagram author, I want to import custom 3D meshes from GLTF files and export the full diagram scene as GLTF, so that I can use branded assets and share 3D-native representations.

#### Acceptance Criteria

1. WHEN a CustomShape is configured with a `gltfUrl` property, THE GeometryFactory SHALL load the GLTF file, extract the first mesh, and register it as a usable shape geometry.
2. WHEN the GLTF export action is triggered, THE export subsystem SHALL serialize the current scene graph — including node meshes, edge paths, labels, and group boundaries — into a valid GLTF 2.0 document.
3. IF a GLTF file fails to load, THEN THE GeometryFactory SHALL fall back to the `box` shape geometry and emit a console error with the failed URL.
4. THE GLTF export SHALL include node metadata (id, type, label, status) as GLTF extras on each mesh node.

---

### Requirement 23: Minimap Navigation Aid (Sprint 5)

**User Story:** As a diagram user, I want a minimap overlay showing the full diagram extent, so that I can orient myself and navigate quickly in large diagrams.

#### Acceptance Criteria

1. WHERE the minimap is enabled in the Primitives provider configuration, THE minimap SHALL render a scaled-down top-down projection of all nodes and group boundaries in a corner overlay.
2. THE minimap SHALL display a viewport indicator rectangle representing the current camera's visible area.
3. WHEN the user clicks or drags within the minimap, THE camera SHALL pan to center the clicked position in the main viewport.
4. THE minimap SHALL update its node positions within one rendered frame of any node position change.

