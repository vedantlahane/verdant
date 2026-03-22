# Design Document: Integration Wiring Phase

## Overview

This document describes the technical design for wiring the completed `@verdant/primitives` v2
subsystems into the parser, renderer, nodes, and playground packages. The work is organized into
five sequential phases that can be executed in parallel within each phase but must respect
cross-phase dependencies.

The central data flow is:

```
.vrd source
    │
    ▼
@verdant/parser  ──►  VrdAST
                          │
                          ▼
              @verdant/renderer (VerdantRenderer)
                          │
                    PrimitivesProvider
                          │
              ┌───────────┼───────────┐
              ▼           ▼           ▼
         BaseNode_v2  BaseEdge_v2  GroupContainer
              │
         @verdant/nodes (10 domain components)
```

The playground wraps the renderer and exposes all subsystem controls through its UI layer.

---

## Architecture

### Package Dependency Graph

```
playground (Next.js)
    ├── @verdant/renderer
    │       ├── @verdant/primitives   ← all subsystems
    │       └── @verdant/parser       ← VrdAST types
    ├── @verdant/nodes
    │       └── @verdant/primitives   ← BaseNode_v2, NodeRegistry
    └── @verdant/themes
```

### Phase Execution Order

```
Phase 1 (Parser)  ──► Phase 2 (Renderer)  ──► Phase 4 (Playground)
                  ──► Phase 3 (Nodes)     ──► Phase 4 (Playground)
                                          ──► Phase 5 (Testing)
```

Phases 2 and 3 can proceed in parallel once Phase 1 is complete.
Phase 4 depends on Phases 2 and 3. Phase 5 depends on Phase 4.

### Key Design Decisions

1. **PrimitivesProvider placement**: Wraps the R3F `<Canvas>` interior (inside `onCreated`
   callback scope), not the outer div, so all subsystems have access to the Three.js renderer
   context. The config is derived from `VrdAST.config` via a pure mapping function
   `astConfigToPrimitivesConfig` that is memoized on the config reference.

2. **Store migration**: `selectedNodeId: string | null` is replaced by a `selectionSet: Set<string>`
   that mirrors `SelectionManager.selectedIds`. The store subscribes to `selectionChange` events
   and writes back to React state. This keeps Zustand as the single source of truth for React
   rendering while SelectionManager owns the interaction logic.

3. **Pretty_Printer as a new module**: Added at `packages/parser/src/printer.ts`. It is a pure
   function `printVrd(ast: VrdAST): string` with no side effects. It is exported from the
   package index alongside the parser.

4. **Nodes migration**: All 10 node components already import `BaseNode` from
   `@verdant/primitives` — the import path is already correct. The migration adds `defaultPorts`,
   `defaultStatus`, and NodeRegistry registration to each component file.

5. **Forced layout**: Implemented directly in `packages/renderer/src/layout.ts` as
   `computeForceDirectedLayout` already exists. The `LayoutType` union is extended to include
   `'hierarchical' | 'forced'` and the switch statement gains two new cases.

---

## Components and Interfaces

### Phase 1 — Parser

#### 1.1 `packages/parser/src/types.ts` — Type Extensions

```typescript
// Extended enums
export type ShapeType =
  | 'cube' | 'cylinder' | 'diamond' | 'sphere' | 'torus'
  | 'hexagon' | 'pentagon' | 'octagon' | 'ring' | 'box'
  | 'cone' | 'capsule' | 'icosahedron' | 'plane';

export type LayoutType = 'auto' | 'grid' | 'circular' | 'hierarchical' | 'forced';
export type NodeStatus = 'healthy' | 'warning' | 'error' | 'unknown';
export type AnimationType = 'fade' | 'scale' | 'slide';
export type RoutingType = 'straight' | 'curved' | 'orthogonal';
export type PortSide = 'top' | 'bottom' | 'left' | 'right' | 'front' | 'back';
export type BadgePosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';

// New sub-types
export interface VrdBadge {
  position: BadgePosition;
  content: string;
}

export interface VrdPort {
  name: string;
  side: PortSide;
}

export interface VrdAnimationKeyframe {
  target: string;
  property: string;
  from: unknown;
  to: unknown;
}

export interface VrdAnimationTimeline {
  name: string;
  duration: number;
  keyframes: VrdAnimationKeyframe[];
}

// Extended prop interfaces
export interface VrdNodeProps {
  label?: string;
  color?: string;
  size?: NodeSize;
  glow?: boolean;
  icon?: string;
  position?: { x: number; y: number; z: number };
  // v2 additions
  shape?: ShapeType;
  status?: NodeStatus;
  badges?: VrdBadge[];
  ports?: VrdPort[];
  enterAnimation?: AnimationType;
  exitAnimation?: AnimationType;
  animationDuration?: number;
  [key: string]: unknown;
}

export interface VrdEdgeProps {
  label?: string;
  style?: EdgeStyle;
  color?: string;
  width?: number;
  bidirectional?: boolean;
  fromPort?: string;
  toPort?: string;
  // v2 additions
  routing?: RoutingType;
  flow?: boolean;
  flowSpeed?: number;
  flowCount?: number;
  flowColor?: string;
  [key: string]: unknown;
}

export interface VrdGroupProps {
  collapsed?: boolean;
  layout?: LayoutType;
  [key: string]: unknown;
}

// VrdGroup.props changes from Record<string,unknown> to VrdGroupProps
export interface VrdGroup {
  id: string;
  label?: string;
  children: string[];
  groups: VrdGroup[];
  parentGroupId?: string;
  props: VrdGroupProps;
  loc?: SourceLocation;
}

export interface VrdConfig {
  theme?: string;
  layout?: LayoutType;
  camera?: CameraType;
  pack?: string;
  // v2 additions
  minimap?: boolean;
  'post-processing'?: boolean;
  'bloom-intensity'?: number;
  'snap-to-grid'?: boolean;
  'grid-size'?: number;
  direction?: string;
  'layer-spacing'?: number;
  'node-spacing'?: number;
  animations?: VrdAnimationTimeline[];
  [key: string]: unknown;
}

// Updated validation sets
export const VALID_LAYOUTS: ReadonlySet<string> = new Set([
  'auto', 'grid', 'circular', 'hierarchical', 'forced',
]);
export const VALID_SHAPES: ReadonlySet<string> = new Set([
  'cube', 'cylinder', 'diamond', 'sphere', 'torus',
  'hexagon', 'pentagon', 'octagon', 'ring', 'box',
  'cone', 'capsule', 'icosahedron', 'plane',
]);
export const VALID_STATUSES: ReadonlySet<string> = new Set([
  'healthy', 'warning', 'error', 'unknown',
]);
export const VALID_ANIMATION_TYPES: ReadonlySet<string> = new Set([
  'fade', 'scale', 'slide',
]);
export const VALID_ROUTING_TYPES: ReadonlySet<string> = new Set([
  'straight', 'curved', 'orthogonal',
]);
export const VALID_PORT_SIDES: ReadonlySet<string> = new Set([
  'top', 'bottom', 'left', 'right', 'front', 'back',
]);
export const VALID_BADGE_POSITIONS: ReadonlySet<string> = new Set([
  'top-right', 'top-left', 'bottom-right', 'bottom-left',
]);
export const KNOWN_CONFIG_KEYS: ReadonlySet<string> = new Set([
  'theme', 'layout', 'camera', 'pack', 'title', 'description',
  'minimap', 'post-processing', 'bloom-intensity', 'snap-to-grid',
  'grid-size', 'direction', 'layer-spacing', 'node-spacing',
]);
```

#### 1.2 `packages/parser/src/patterns.ts` — New Regex Patterns

```typescript
// Port-to-port directed edge: `a.http-out -> b.http-in`
// Captures: [nodeId, portName, nodeId, portName, optional label]
export const PORT_EDGE_INLINE_RE = new RegExp(
  `^(${ID_PATTERN})\\.(${ID_PATTERN})\\s*->\\s*(${ID_PATTERN})\\.(${ID_PATTERN})(?:\\s*:\\s*"([^"]*)")?$`
);

// Port-to-port directed edge block: `a.http-out -> b.http-in:`
export const PORT_EDGE_BLOCK_RE = new RegExp(
  `^(${ID_PATTERN})\\.(${ID_PATTERN})\\s*->\\s*(${ID_PATTERN})\\.(${ID_PATTERN})\\s*:$`
);

// Port-to-port bidirectional: `a.port <-> b.port`
export const PORT_BIDI_EDGE_INLINE_RE = new RegExp(
  `^(${ID_PATTERN})\\.(${ID_PATTERN})\\s*<->\\s*(${ID_PATTERN})\\.(${ID_PATTERN})(?:\\s*:\\s*"([^"]*)")?$`
);

// Port-to-port bidirectional block
export const PORT_BIDI_EDGE_BLOCK_RE = new RegExp(
  `^(${ID_PATTERN})\\.(${ID_PATTERN})\\s*<->\\s*(${ID_PATTERN})\\.(${ID_PATTERN})\\s*:$`
);

// Badge KV: `badge top-right: 3` or `badge top-left: icon:shield`
// Captured as a KV where key = "badge top-right", value = content
// Handled in handleNodeKV by detecting key prefix "badge "
// No separate regex needed — KV_RE already captures `badge top-right: 3`
// The key will be `badge top-right` and value will be `3`

// Port KV: `port http-in: top`
// Also handled by KV_RE — key = `port http-in`, value = `top`

// Animation block: `animation <name>:`
export const ANIMATION_BLOCK_RE = new RegExp(
  `^animation\\s+(${ID_PATTERN})\\s*:$`
);
```

The port-to-port patterns must be checked **before** the regular edge patterns in the parse loop,
since `a.port -> b.port` would otherwise match `EDGE_INLINE_RE` with `a.port` as the full node ID.

#### 1.3 `packages/parser/src/parser.ts` — KV Handler Extensions

**`handleNodeKV` additions:**

```typescript
case 'shape': {
  const val = rawVal.trim();
  if (!VALID_SHAPES.has(val)) {
    diag(lineNum, 'warning', `Invalid shape "${val}" on node "${node.id}". Valid shapes: ${[...VALID_SHAPES].join(', ')}`);
  }
  node.props.shape = val as ShapeType;
  break;
}

case 'status': {
  const val = rawVal.trim();
  if (!VALID_STATUSES.has(val)) {
    diag(lineNum, 'warning', `Invalid status "${val}" on node "${node.id}". Valid: healthy, warning, error, unknown`);
  }
  node.props.status = val as NodeStatus;
  break;
}

case 'enter': {
  const val = rawVal.trim();
  if (!VALID_ANIMATION_TYPES.has(val)) {
    diag(lineNum, 'warning', `Invalid enter animation "${val}". Valid: fade, scale, slide`);
  }
  node.props.enterAnimation = val as AnimationType;
  break;
}

case 'exit': {
  const val = rawVal.trim();
  if (!VALID_ANIMATION_TYPES.has(val)) {
    diag(lineNum, 'warning', `Invalid exit animation "${val}". Valid: fade, scale, slide`);
  }
  node.props.exitAnimation = val as AnimationType;
  break;
}

case 'animation-duration': {
  const val = Number(rawVal);
  if (!Number.isFinite(val) || val < 0) {
    diag(lineNum, 'warning', `Invalid animation-duration "${rawVal}". Expected non-negative number (ms).`);
  } else {
    node.props.animationDuration = val;
  }
  break;
}

// Badge: key is "badge top-right", value is content
// Detected by key.startsWith('badge ')
default:
  if (key.startsWith('badge ')) {
    const position = key.slice(6).trim() as BadgePosition;
    if (!VALID_BADGE_POSITIONS.has(position)) {
      diag(lineNum, 'warning', `Invalid badge position "${position}". Valid: top-right, top-left, bottom-right, bottom-left`);
    } else {
      if (!node.props.badges) node.props.badges = [];
      node.props.badges.push({ position, content: rawVal.trim() });
    }
    break;
  }
  if (key.startsWith('port ')) {
    const portName = key.slice(5).trim();
    const side = rawVal.trim() as PortSide;
    if (!VALID_PORT_SIDES.has(side)) {
      diag(lineNum, 'warning', `Invalid port side "${side}". Valid: top, bottom, left, right, front, back`);
    } else {
      if (!node.props.ports) node.props.ports = [];
      node.props.ports.push({ name: portName, side });
    }
    break;
  }
  // ... existing default
```

**`handleEdgeKV` additions:**

```typescript
case 'routing': {
  const val = rawVal.trim();
  if (!VALID_ROUTING_TYPES.has(val)) {
    diag(lineNum, 'warning', `Invalid routing "${val}". Valid: straight, curved, orthogonal`);
  }
  edge.props.routing = val as RoutingType;
  break;
}
case 'flow':
  edge.props.flow = rawVal.trim() === 'true';
  break;
case 'flow-speed': {
  const val = Number(rawVal);
  if (Number.isFinite(val) && val > 0) edge.props.flowSpeed = val;
  else diag(lineNum, 'warning', `Invalid flow-speed "${rawVal}". Expected positive number.`);
  break;
}
case 'flow-count': {
  const val = parseInt(rawVal, 10);
  if (Number.isInteger(val) && val > 0) edge.props.flowCount = val;
  else diag(lineNum, 'warning', `Invalid flow-count "${rawVal}". Expected positive integer.`);
  break;
}
case 'flow-color':
  edge.props.flowColor = rawVal.trim();
  break;
```

**`handleGroupKV` additions:**

```typescript
case 'collapsed':
  group.props.collapsed = rawVal.trim() === 'true';
  break;
case 'layout': {
  const val = rawVal.trim();
  if (!VALID_LAYOUTS.has(val)) {
    diag(lineNum, 'warning', `Invalid group layout "${val}". Valid: ${[...VALID_LAYOUTS].join(', ')}`);
  }
  group.props.layout = val as LayoutType;
  break;
}
```

**Port-to-port edge parsing** (added before regular edge checks in the main loop):

```typescript
// ── 0a. Port-to-port directed edge block ──
match = trimmed.match(PORT_EDGE_BLOCK_RE);
if (match) {
  const edge: VrdEdge = {
    from: match[1], to: match[3],
    props: { fromPort: match[2], toPort: match[4] },
    loc: { line: lineNum, col: indent + 1 },
  };
  ast.edges.push(edge);
  stack.push({ type: 'edge', edgeIndex: ast.edges.length - 1, indent, line: lineNum });
  continue;
}

// ── 0b. Port-to-port directed edge inline ──
match = trimmed.match(PORT_EDGE_INLINE_RE);
if (match) {
  const edge: VrdEdge = {
    from: match[1], to: match[3],
    props: { fromPort: match[2], toPort: match[4] },
    loc: { line: lineNum, col: indent + 1 },
  };
  if (match[5] !== undefined) edge.props.label = match[5];
  ast.edges.push(edge);
  continue;
}
// (similar for PORT_BIDI variants)
```

**Animation timeline block** (new scope type `AnimationScope`):

```typescript
interface AnimationScope extends ScopeBase {
  type: 'animation';
  timelineName: string;
}

// In main loop, after group check:
match = trimmed.match(ANIMATION_BLOCK_RE);
if (match) {
  const name = match[1];
  if (!ast.config.animations) ast.config.animations = [];
  ast.config.animations.push({ name, duration: 0, keyframes: [] });
  stack.push({ type: 'animation', timelineName: name, indent, line: lineNum });
  continue;
}

// In KV handler for animation scope:
function handleAnimationKV(key, rawVal, lineNum, ast, timelineName, diag) {
  const timeline = ast.config.animations?.find(t => t.name === timelineName);
  if (!timeline) return;
  switch (key) {
    case 'duration': timeline.duration = Number(rawVal); break;
    case 'target': /* store pending keyframe target */ break;
    case 'property': /* store pending keyframe property */ break;
    case 'from': /* store pending keyframe from */ break;
    case 'to': /* flush pending keyframe to timeline.keyframes */ break;
  }
}
```

#### 1.4 `packages/parser/src/validate.ts` — Validation Extensions

Add calls to new validators in `validateAst`:

```typescript
validateNodeV2Properties(ast, diagnostics);  // shape, status, animation types
validateEdgeV2Properties(ast, diagnostics);  // routing
```

```typescript
function validateNodeV2Properties(ast: VrdAST, diags: VrdDiagnostic[]): void {
  for (const node of ast.nodes) {
    if (node.props.status && !VALID_STATUSES.has(node.props.status as string)) {
      diags.push({ line: node.loc?.line ?? 0, severity: 'error',
        message: `Invalid status "${node.props.status}" on node "${node.id}".` });
    }
    if (node.props.shape && !VALID_SHAPES.has(node.props.shape as string)) {
      diags.push({ line: node.loc?.line ?? 0, severity: 'warning',
        message: `Invalid shape "${node.props.shape}" on node "${node.id}".` });
    }
  }
}

function validateEdgeV2Properties(ast: VrdAST, diags: VrdDiagnostic[]): void {
  for (const edge of ast.edges) {
    if (edge.props.routing && !VALID_ROUTING_TYPES.has(edge.props.routing as string)) {
      diags.push({ line: edge.loc?.line ?? 0, severity: 'error',
        message: `Invalid routing "${edge.props.routing}".` });
    }
  }
}
```

#### 1.5 `packages/parser/src/printer.ts` — Pretty Printer (new file)

```typescript
import type { VrdAST, VrdNode, VrdEdge, VrdGroup, VrdConfig } from './types';

export function printVrd(ast: VrdAST): string {
  const lines: string[] = [];
  printConfig(ast.config, lines);
  if (lines.length > 0) lines.push('');
  for (const node of ast.nodes) {
    if (!node.groupId) printNode(node, lines, '');
  }
  for (const edge of ast.edges) printEdge(edge, lines);
  for (const group of ast.groups) printGroup(group, ast, lines, '');
  return lines.join('\n');
}

function printConfig(config: VrdConfig, lines: string[]): void {
  const keys = ['theme','layout','camera','minimap','post-processing',
    'bloom-intensity','snap-to-grid','grid-size','direction',
    'layer-spacing','node-spacing'];
  for (const key of keys) {
    if (config[key] !== undefined) lines.push(`${key}: ${config[key]}`);
  }
  if (config.animations) {
    for (const timeline of config.animations) {
      lines.push(`animation ${timeline.name}:`);
      lines.push(`  duration: ${timeline.duration}`);
      for (const kf of timeline.keyframes) {
        lines.push(`  target: ${kf.target}`);
        lines.push(`  property: ${kf.property}`);
        lines.push(`  from: ${kf.from}`);
        lines.push(`  to: ${kf.to}`);
      }
    }
  }
}

function printNode(node: VrdNode, lines: string[], indent: string): void {
  const hasProps = Object.keys(node.props).some(k => node.props[k] !== undefined);
  if (hasProps) {
    lines.push(`${indent}${node.type} ${node.id}:`);
    printNodeProps(node, lines, indent + '  ');
  } else {
    lines.push(`${indent}${node.type} ${node.id}`);
  }
}

function printNodeProps(node: VrdNode, lines: string[], indent: string): void {
  const p = node.props;
  if (p.label)             lines.push(`${indent}label: "${p.label}"`);
  if (p.color)             lines.push(`${indent}color: ${p.color}`);
  if (p.size)              lines.push(`${indent}size: ${p.size}`);
  if (p.glow)              lines.push(`${indent}glow: true`);
  if (p.icon)              lines.push(`${indent}icon: ${p.icon}`);
  if (p.shape)             lines.push(`${indent}shape: ${p.shape}`);
  if (p.status)            lines.push(`${indent}status: ${p.status}`);
  if (p.enterAnimation)    lines.push(`${indent}enter: ${p.enterAnimation}`);
  if (p.exitAnimation)     lines.push(`${indent}exit: ${p.exitAnimation}`);
  if (p.animationDuration !== undefined)
                           lines.push(`${indent}animation-duration: ${p.animationDuration}`);
  if (p.badges) {
    for (const b of p.badges) lines.push(`${indent}badge ${b.position}: ${b.content}`);
  }
  if (p.ports) {
    for (const port of p.ports) lines.push(`${indent}port ${port.name}: ${port.side}`);
  }
  if (p.position) {
    const pos = p.position as { x: number; y: number; z: number };
    lines.push(`${indent}position: ${pos.x},${pos.y},${pos.z}`);
  }
}

function printEdge(edge: VrdEdge, lines: string[]): void {
  const p = edge.props;
  const fromStr = p.fromPort ? `${edge.from}.${p.fromPort}` : edge.from;
  const toStr   = p.toPort   ? `${edge.to}.${p.toPort}`     : edge.to;
  const arrow   = p.bidirectional ? '<->' : '->';
  const label   = p.label ? `: "${p.label}"` : '';
  const hasBlockProps = p.routing || p.flow || p.flowSpeed !== undefined
    || p.flowCount !== undefined || p.flowColor || p.style || p.color
    || p.width !== undefined;
  if (hasBlockProps) {
    lines.push(`${fromStr} ${arrow} ${toStr}:`);
    if (p.style)                    lines.push(`  style: ${p.style}`);
    if (p.color)                    lines.push(`  color: ${p.color}`);
    if (p.width !== undefined)      lines.push(`  width: ${p.width}`);
    if (p.label)                    lines.push(`  label: "${p.label}"`);
    if (p.routing)                  lines.push(`  routing: ${p.routing}`);
    if (p.flow)                     lines.push(`  flow: true`);
    if (p.flowSpeed !== undefined)  lines.push(`  flow-speed: ${p.flowSpeed}`);
    if (p.flowCount !== undefined)  lines.push(`  flow-count: ${p.flowCount}`);
    if (p.flowColor)                lines.push(`  flow-color: ${p.flowColor}`);
  } else {
    lines.push(`${fromStr} ${arrow} ${toStr}${label}`);
  }
}

function printGroup(group: VrdGroup, ast: VrdAST, lines: string[], indent: string): void {
  const labelStr = group.label ? ` "${group.label}"` : '';
  lines.push(`${indent}group ${group.id}${labelStr}:`);
  if (group.props.collapsed) lines.push(`${indent}  collapsed: true`);
  if (group.props.layout)    lines.push(`${indent}  layout: ${group.props.layout}`);
  for (const childId of group.children) {
    const node = ast.nodes.find(n => n.id === childId);
    if (node) printNode(node, lines, indent + '  ');
  }
  for (const nested of group.groups) printGroup(nested, ast, lines, indent + '  ');
}
```

Export from `packages/parser/src/index.ts`:
```typescript
export { printVrd } from './printer';
```

---

### Phase 2 — Renderer

#### 2.1 `packages/renderer/src/store.ts` — Store Extensions

```typescript
export interface RendererState {
  // ... existing fields ...

  // Replace selectedNodeId with selectionSet
  selectionSet: Set<string>;
  selectedNodeId: string | null;  // kept for backward compat, derived from selectionSet

  // New fields
  undoDepth: number;
  layoutName: LayoutType;
  fps: number;

  // New actions
  setSelectionSet: (ids: Set<string>) => void;
  setUndoDepth: (depth: number) => void;
  setFps: (fps: number) => void;
}
```

The `selectedNodeId` getter returns the first element of `selectionSet` (or null) for backward
compatibility with existing `onNodeClick` consumers.

`LayoutType` in `store.ts` and `layout.ts` is extended to `'auto' | 'grid' | 'circular' | 'hierarchical' | 'forced'`.

#### 2.2 `packages/renderer/src/layout.ts` — Layout Extensions

```typescript
export type LayoutType = 'auto' | 'grid' | 'circular' | 'hierarchical' | 'forced';

export function computeLayout(
  nodes: VrdNode[],
  edges: VrdEdge[],
  layoutType: LayoutType,
  groups: VrdGroup[] = [],
  direction?: string,  // new param for hierarchical
): Map<string, Position3D> {
  switch (layoutType) {
    case 'hierarchical':
      return computeHierarchicalLayout(nodes, edges, direction);
    case 'forced':
      // reuses existing computeForceDirectedLayout
      return computeForceDirectedLayout(nodes, edges, groups, new Map());
    // ... existing cases
  }
}

function computeHierarchicalLayout(
  nodes: VrdNode[],
  edges: VrdEdge[],
  direction = 'TB',
): Map<string, Position3D> {
  const layout = new HierarchicalLayout({
    nodeSpacingX: 4,
    nodeSpacingY: 4,
  });
  const result = layout.compute(
    nodes.map(n => ({ id: n.id })),
    edges.map(e => ({ from: e.from, to: e.to })),
  );
  // Apply direction rotation: LR rotates x/y axes
  const positions = new Map<string, Position3D>();
  for (const [id, vec] of result.positions) {
    if (direction === 'LR') {
      positions.set(id, { x: vec.y, y: 0, z: vec.x });
    } else {
      positions.set(id, { x: vec.x, y: 0, z: -vec.y });
    }
  }
  return positions;
}
```

#### 2.3 `packages/renderer/src/VerdantRenderer.tsx` — PrimitivesProvider Wiring

```typescript
import { PrimitivesProvider } from '@verdant/primitives';
import type { PrimitivesConfig } from '@verdant/primitives';

function astConfigToPrimitivesConfig(config: VrdConfig): PrimitivesConfig {
  return {
    minimap: {
      enabled: config.minimap === true,
    },
    postProcessing: {
      enabled: config['post-processing'] === true,
      bloom: {
        intensity: typeof config['bloom-intensity'] === 'number'
          ? config['bloom-intensity'] : 1.0,
      },
    },
    maxUndoHistory: 100,
  };
}

export function VerdantRenderer({ ast, ... }: VerdantRendererProps) {
  const primitivesConfig = useMemo(
    () => astConfigToPrimitivesConfig(ast.config),
    [ast.config],
  );

  return (
    <div ...>
      <Canvas ...>
        <PrimitivesProvider config={primitivesConfig}>
          <SceneContent ... />
          {onCameraChange && <CameraTracker ... />}
        </PrimitivesProvider>
      </Canvas>
    </div>
  );
}
```

The `PrimitivesProvider` is placed **inside** the `<Canvas>` so its subsystems have access to
the R3F context. The config object is memoized on `ast.config` reference — it is re-derived
only when the config block changes, not on every AST update.

#### 2.4 `packages/renderer/src/SceneContent.tsx` — v2 Component Wiring

```typescript
import { BaseNode, BaseEdge, GroupContainer, NestedGroup,
         Minimap, ContextMenu, usePrimitives } from '@verdant/primitives';

export function SceneContent({ ... }) {
  const { selectionManager, commandHistory, dragManager,
          transitionEngine } = usePrimitives();
  const setSelectionSet = useRendererStore(s => s.setSelectionSet);
  const setUndoDepth = useRendererStore(s => s.setUndoDepth);

  // Sync SelectionManager → store
  useEffect(() => {
    const handler = (ids: Set<string>) => {
      setSelectionSet(new Set(ids));
      setUndoDepth(commandHistory.canUndo
        ? (commandHistory as any).pointer + 1 : 0);
    };
    selectionManager.on('selectionChange', handler);
    return () => { selectionManager.off('selectionChange', handler); };
  }, [selectionManager, commandHistory, setSelectionSet, setUndoDepth]);

  // Keyboard: undo/redo
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === 'z' && !e.shiftKey) { commandHistory.undo(); e.preventDefault(); }
      if (mod && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        commandHistory.redo(); e.preventDefault();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [commandHistory]);

  // Node rendering: v2 BaseNode
  // Edge rendering: v2 BaseEdge
  // Group rendering: GroupContainer / NestedGroup
  // Overlays: Minimap, ContextMenu (conditional on config)
}
```

**Node rendering** replaces `<DraggableNode>` with direct `<BaseNode>` usage:

```typescript
{ast.nodes.map((node) => {
  const position = positions[node.id] ?? [0, 0, 0];
  const isSelected = selectionSet.has(node.id);
  const NodeComponent = nodeRegistry.get(node.type) ?? DefaultNode;

  return (
    <NodeComponent
      key={node.id}
      id={node.id}
      label={node.props.label ?? node.id}
      position={position}
      selected={isSelected}
      hovered={hoveredNodeId === node.id}
      color={getNodeColor(node.type, node.props.color as string)}
      size={node.props.size as string}
      glow={node.props.glow as boolean}
      shape={node.props.shape}
      status={node.props.status}
      badges={node.props.badges}
      ports={node.props.ports}
      enterAnimation={node.props.enterAnimation}
      exitAnimation={node.props.exitAnimation}
      animationDuration={node.props.animationDuration}
      onClick={(e) => handleNodeClick(node.id, position, e)}
      onPointerOver={() => handleHoverEnter(node.id)}
      onPointerOut={handleHoverLeave}
    />
  );
})}
```

**Edge rendering** replaces `<EdgeLine>` with `<BaseEdge>`:

```typescript
{ast.edges.map((edge, i) => {
  const fromPos = positions[edge.from];
  const toPos = positions[edge.to];
  if (!fromPos || !toPos) return null;

  const flowParticles = edge.props.flow ? {
    speed: edge.props.flowSpeed,
    count: edge.props.flowCount,
    color: edge.props.flowColor,
  } : undefined;

  return (
    <BaseEdge
      key={`edge-${i}`}
      from={fromPos}
      to={toPos}
      fromNodeId={edge.from}
      toNodeId={edge.to}
      fromPort={edge.props.fromPort}
      toPort={edge.props.toPort}
      label={edge.props.label}
      style={edge.props.style}
      color={edge.props.color ?? themeColors.edgeDefault}
      width={edge.props.width}
      routing={edge.props.routing}
      flowParticles={flowParticles}
    />
  );
})}
```

**Group rendering** replaces `<GroupBox>` with `<GroupContainer>` / `<NestedGroup>`:

```typescript
function renderGroup(group: VrdGroup, depth = 0) {
  const Component = depth === 0 ? GroupContainer : NestedGroup;
  return (
    <Component
      key={group.id}
      groupId={group.id}
      label={group.label}
      collapsed={group.props.collapsed ?? false}
      childIds={group.children}
      positions={positions}
    >
      {group.groups.map(nested => renderGroup(nested, depth + 1))}
    </Component>
  );
}
```

**Overlay rendering** (conditional):

```typescript
const primitivesConfig = usePrimitives().config;

// Inside return:
{primitivesConfig.minimap?.enabled && <Minimap />}
{/* PostProcessing is activated via PrimitivesProvider config, not a separate component */}
{contextMenuTarget && (
  <ContextMenu
    target={contextMenuTarget}
    onClose={() => setContextMenuTarget(null)}
    actions={buildContextMenuActions(contextMenuTarget)}
  />
)}
```

#### 2.5 Performance Subsystems

`InstancedRenderer`, `FrustumCulling`, and `LODController` are activated by passing them to
`PrimitivesProvider` via the context. The renderer checks node count to decide whether to
activate instancing:

```typescript
// In SceneContent, after getting primitives context:
useEffect(() => {
  if (ast && ast.nodes.length >= 10) {
    // Group nodes by shape, activate instanced rendering per shape group
    const shapeGroups = groupNodesByShape(ast.nodes);
    // InstancedRenderer.activate(shapeGroups) — called via context
  }
}, [ast]);
```

`FrustumCulling` and `LODController` are always active when the provider is mounted — they
are opt-out rather than opt-in, controlled by `PrimitivesConfig`.

---

### Phase 3 — Nodes Package

#### 3.1 Migration Pattern

All 10 node components follow the same migration pattern. The import path is already correct
(`@verdant/primitives` re-exports `BaseNode` from `./nodes/BaseNode`). The changes are:

1. Add `defaultPorts` constant
2. Add `defaultStatus` constant
3. Register with NodeRegistry on module load
4. Pass `status` prop through to `BaseNode`

**Template:**

```typescript
import React from 'react';
import { BaseNode, NodeProps, NodeRegistry } from '@verdant/primitives';

// Default ports appropriate to this node's semantic role
export const defaultPorts = [
  { name: 'in',  side: 'left'  as const },
  { name: 'out', side: 'right' as const },
];

export const defaultStatus = 'unknown' as const;

export function ServerNode(props: NodeProps) {
  const { color = '#4287f5', status = defaultStatus } = props;
  return (
    <BaseNode {...props} status={status} ports={props.ports ?? defaultPorts}>
      {/* existing geometry */}
    </BaseNode>
  );
}

// Self-registration — runs once on module import
NodeRegistry.register('server', ServerNode);
```

#### 3.2 Default Ports Per Node Type

| Node | Ports |
|------|-------|
| ServerNode | `in: left`, `out: right`, `health: top` |
| DatabaseNode | `read: left`, `write: right`, `replica: bottom` |
| CacheNode | `get: left`, `set: right` |
| GatewayNode | `ingress: left`, `egress: right`, `admin: top` |
| QueueNode | `enqueue: left`, `dequeue: right` |
| ServiceNode | `in: left`, `out: right` |
| CloudNode | `in: left`, `out: right` |
| MonitorNode | `metrics: left`, `alerts: right` |
| StorageNode | `read: left`, `write: right` |
| UserNode | `request: right` |

#### 3.3 NodeRegistry Registration

`NodeRegistry` in `@verdant/primitives` exposes a static `register(type, component)` method.
Each node file calls this at module load time. The playground's `useMonacoLanguage` hook
already imports from `@verdant/nodes`, so the registrations fire when the playground loads.

The renderer's `SceneContent` accesses the registry via `usePrimitives().nodeRegistry` to
look up the component for each `VrdNode.type`.

---

### Phase 4 — Playground

#### 4.1 `playground/src/features/playground/components/TopBar.tsx` — Toolbar Additions

New props added to `TopBarProps`:

```typescript
interface TopBarProps {
  // existing
  onShareClick: () => void;
  onExportPngClick: () => void;
  onThemeToggle: () => void;
  resolvedTheme: 'light' | 'dark';
  // new
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onZoomToFit: () => void;
  onExport: (format: 'png' | 'svg' | 'gltf') => void;
  activeLayout: LayoutType;
  onLayoutChange: (layout: LayoutType) => void;
  minimapEnabled: boolean;
  onMinimapToggle: () => void;
  postProcessingEnabled: boolean;
  onPostProcessingToggle: () => void;
  snapToGrid: boolean;
  onSnapToGridToggle: () => void;
}
```

The toolbar renders a left cluster (brand, undo/redo, layout selector) and a right cluster
(minimap toggle, post-processing toggle, grid-snap toggle, export dropdown, share, theme, overflow).

Undo/redo buttons use `aria-disabled` when `canUndo`/`canRedo` is false.

Layout selector is a `<select>` element with options: auto, grid, circular, hierarchical, forced.

Export dropdown replaces the single PNG button with a menu: PNG, SVG, GLTF.

#### 4.2 `playground/src/features/playground/components/StatusBar.tsx` — Data Wiring

New fields consumed from `PlaygroundContext`:

```typescript
// Added to PlaygroundContext:
selectionCount: number;   // derived from selectionSet.size
undoDepth: number;        // from store.undoDepth
layoutName: LayoutType;   // from store.layoutName
fps: number;              // from store.fps, updated ≤1/sec
```

StatusBar display:
```
{selectionCount > 0 ? `${selectionCount} selected` : 'No selection'} · {undoDepth} undo · {layoutName} · {fps}fps
```

#### 4.3 `playground/src/features/playground/components/NodeInspector.tsx` — Inspector Extensions

The inspector gains three new sections when a node is selected:

**Status section** (node only):
```tsx
<select value={node.props.status ?? ''} onChange={e => updateNodeProp('status', e.target.value)}>
  <option value="">none</option>
  <option value="healthy">healthy</option>
  <option value="warning">warning</option>
  <option value="error">error</option>
  <option value="unknown">unknown</option>
</select>
```

**Badges section** (node only): list of badge entries with add/remove buttons.

**Ports section** (node only): list of port entries with add/remove buttons.

When an edge is selected (detected by `target.edgeIndex !== undefined`):

**Routing section**:
```tsx
<select value={edge.props.routing ?? 'straight'} onChange={...}>
  <option value="straight">straight</option>
  <option value="curved">curved</option>
  <option value="orthogonal">orthogonal</option>
</select>
```

**Flow section**: toggle + speed/count/color inputs.

When a group is selected:

**Collapse toggle**: checkbox bound to `group.props.collapsed`.

All edits call `updateSource(nodeId, key, value)` which uses the Pretty_Printer to regenerate
the `.vrd` source and calls `state.setCode(newSource)`. The re-parse happens automatically
via the existing debounced parse hook, completing within 100ms.

```typescript
function updateNodeProp(nodeId: string, key: string, value: unknown): void {
  const newAst = deepCloneAst(ast);
  const node = newAst.nodes.find(n => n.id === nodeId);
  if (!node) return;
  (node.props as Record<string, unknown>)[key] = value;
  state.setCode(printVrd(newAst));
}
```

#### 4.4 `playground/src/features/playground/components/KeyboardShortcutHelp.tsx` — New Component

```typescript
interface KeyboardShortcutHelpProps {
  open: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  { key: 'Ctrl+Z / ⌘Z',       description: 'Undo' },
  { key: 'Ctrl+Y / ⌘⇧Z',      description: 'Redo' },
  { key: 'F',                  description: 'Zoom to fit' },
  { key: 'Delete / Backspace', description: 'Delete selected' },
  { key: 'Escape',             description: 'Clear selection' },
  { key: '?',                  description: 'Toggle this help' },
];
```

Rendered as a modal overlay with `role="dialog"` and `aria-modal="true"`. Closed by `Escape` or `?`.

#### 4.5 `playground/src/features/playground/hooks/useMonacoLanguage.ts` — Autocomplete Additions

New completion items added to the existing `provideCompletionItems` handler:

```typescript
// New keyword completions
const NEW_KEYWORDS = [
  'shape', 'status', 'badge', 'port', 'enter', 'exit', 'animation-duration',
  'routing', 'flow', 'flow-speed', 'flow-count', 'flow-color',
  'collapsed', 'minimap', 'post-processing', 'bloom-intensity',
  'snap-to-grid', 'grid-size', 'direction', 'layer-spacing', 'node-spacing',
];

// Value completions triggered after `shape: `
const SHAPE_VALUES = [
  'cube','sphere','cylinder','diamond','hexagon','torus',
  'pentagon','octagon','ring','box','cone','capsule','icosahedron','plane',
];

// Value completions triggered after `status: `
const STATUS_VALUES = ['healthy', 'warning', 'error', 'unknown'];

// Value completions triggered after `routing: `
const ROUTING_VALUES = ['straight', 'curved', 'orthogonal'];
```

Context-aware completions: when the cursor is after `shape:`, `status:`, or `routing:`,
suggest the corresponding value set instead of generic keywords.

#### 4.6 Preset Additions

New presets added to `playground/src/features/playground/presets/`:

```
presets/
  hierarchical-microservices.vrd   # 8+ nodes, direction: LR
  flow-pipeline.vrd                # flow: true, flow-speed configured
  collapsed-groups.vrd             # collapsed group example
  node-status-demo.vrd             # all 4 NodeStatus values
  bloom-showcase.vrd               # post-processing: true, bloom-intensity
```

Each preset is a `.vrd` string exported as a TypeScript constant and registered in the
existing preset registry.

---

### Phase 5 — Testing

#### 5.1 Integration Test Architecture

Location: `packages/renderer/src/tests/integration/` and `packages/parser/src/tests/`

Test runner: Vitest. React component tests use `@testing-library/react` with a mock R3F canvas.

**Parser pipeline test** (`parser-pipeline.test.ts`):
```typescript
it('parses all v2 syntax into correct VrdAST', () => {
  const source = `
    layout: hierarchical
    direction: LR
    minimap: true
    post-processing: true
    bloom-intensity: 1.5

    server api:
      shape: cube
      status: healthy
      badge top-right: 3
      port http-in: left
      port http-out: right
      enter: fade
      animation-duration: 300

    database db:
      shape: cylinder
      status: warning

    api.http-out -> db.http-in:
      routing: curved
      flow: true
      flow-speed: 2
      flow-count: 5
      flow-color: #52B788

    group backend "Backend":
      collapsed: false
      layout: hierarchical
  `;
  const { ast, diagnostics } = parseVrdSafe(source);
  expect(diagnostics.filter(d => d.severity === 'error')).toHaveLength(0);
  expect(ast.nodes[0].props.shape).toBe('cube');
  expect(ast.nodes[0].props.status).toBe('healthy');
  // ... etc
});
```

**Selection flow test** (`selection-flow.test.ts`):
Tests that clicking a node updates `SelectionManager.selectedIds` and that clicking empty
space clears it.

**Undo/redo test** (`undo-redo.test.ts`):
Tests the move → undo → verify position → redo → verify position cycle.

**Export test** (`export.test.ts`):
Mounts renderer, calls `PNGExport.capture()`, `SVGExport.capture()`, `GLTFExport.capture()`,
verifies each returns a non-empty result.

**Group collapse test** (`group-collapse.test.ts`):
Mounts renderer with a collapsed group, verifies child nodes are not rendered, expands,
verifies they reappear.

#### 5.2 Performance Benchmark Setup

Location: `packages/renderer/src/tests/benchmarks/`

Uses `vitest-bench` or a custom harness that mounts the renderer in a headless WebGL context
(via `gl` npm package) and measures frame time over a 5-second window.

```typescript
bench('200 nodes 300 edges @ 60fps', async () => {
  const ast = generateAst(200, 300);
  const fps = await measureFps(ast, 5000);
  expect(fps).toBeGreaterThanOrEqual(60);
});
```

#### 5.3 Visual Regression Approach

Uses `@playwright/test` with `toHaveScreenshot()`. Each test navigates to the playground with
a preset URL parameter, waits for the canvas to stabilize (no frame delta > 1ms for 500ms),
then captures a screenshot.

Threshold: 0.1% pixel difference tolerance.

Snapshots stored in `playground/tests/snapshots/`.

#### 5.4 Accessibility Audit Approach

Uses `axe-core` via `@axe-core/playwright` in the Playwright test suite.

Additional manual checks:
- Tab order verification via keyboard simulation
- Contrast ratio checks using `color-contrast` npm package against the theme color pairs

---

## Data Models

### VrdAST (extended)

```
VrdAST
├── config: VrdConfig
│   ├── theme?: string
│   ├── layout?: LayoutType          // now includes 'hierarchical' | 'forced'
│   ├── minimap?: boolean            // NEW
│   ├── post-processing?: boolean    // NEW
│   ├── bloom-intensity?: number     // NEW
│   ├── snap-to-grid?: boolean       // NEW
│   ├── grid-size?: number           // NEW
│   ├── direction?: string           // NEW
│   ├── layer-spacing?: number       // NEW
│   ├── node-spacing?: number        // NEW
│   └── animations?: VrdAnimationTimeline[]  // NEW
├── nodes: VrdNode[]
│   └── props: VrdNodeProps
│       ├── shape?: ShapeType        // NEW (14 values)
│       ├── status?: NodeStatus      // NEW
│       ├── badges?: VrdBadge[]      // NEW
│       ├── ports?: VrdPort[]        // NEW
│       ├── enterAnimation?: AnimationType   // NEW
│       ├── exitAnimation?: AnimationType    // NEW
│       └── animationDuration?: number       // NEW
├── edges: VrdEdge[]
│   └── props: VrdEdgeProps
│       ├── routing?: RoutingType    // NEW
│       ├── flow?: boolean           // NEW
│       ├── flowSpeed?: number       // NEW
│       ├── flowCount?: number       // NEW
│       └── flowColor?: string       // NEW
└── groups: VrdGroup[]
    └── props: VrdGroupProps         // changed from Record<string,unknown>
        ├── collapsed?: boolean      // NEW
        └── layout?: LayoutType      // NEW
```

### PrimitivesConfig (derived from VrdConfig)

```typescript
function astConfigToPrimitivesConfig(config: VrdConfig): PrimitivesConfig {
  return {
    minimap: { enabled: config.minimap === true },
    postProcessing: {
      enabled: config['post-processing'] === true,
      bloom: { intensity: config['bloom-intensity'] as number ?? 1.0 },
    },
    maxUndoHistory: 100,
  };
}
```

### RendererState (extended)

```
RendererState
├── selectionSet: Set<string>        // replaces selectedNodeId
├── selectedNodeId: string | null    // derived, backward compat
├── undoDepth: number                // NEW
├── layoutName: LayoutType           // NEW
└── fps: number                      // NEW
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Parser round-trip

*For any* valid `VrdAST` containing any combination of v2 node props (shape, status, badges, ports, animation), v2 edge props (routing, flow, fromPort, toPort), v2 group props (collapsed, layout), and v2 config keys, pretty-printing the AST to `.vrd` source and then parsing the result should produce an AST that is structurally equivalent to the original.

**Validates: Requirements 1.5, 2.7, 3.5, 4.7, 5.4, 6.8, 7.5, 8.4, 9.5**

---

### Property 2: Invalid enum values produce diagnostics

*For any* node with a `shape` value not in the 14 valid ShapeType values, or a `status` value not in `{healthy, warning, error, unknown}`, or an `enter`/`exit` value not in `{fade, scale, slide}`, or an edge with a `routing` value not in `{straight, curved, orthogonal}`, the parser SHALL emit at least one diagnostic with severity `warning` or `error`.

**Validates: Requirements 1.3, 2.3, 3.3, 4.5, 10.5, 10.6**

---

### Property 3: Port-to-port edge parsing preserves port names

*For any* pair of node IDs and port names, an edge written as `nodeA.portX -> nodeB.portY` should parse to a `VrdEdge` where `from === nodeA`, `to === nodeB`, `props.fromPort === portX`, and `props.toPort === portY`.

**Validates: Requirements 5.1, 5.2**

---

### Property 4: AST config → PrimitivesConfig mapping is total

*For any* `VrdConfig` object, `astConfigToPrimitivesConfig` should return a `PrimitivesConfig` where `minimap.enabled` equals `config.minimap === true`, `postProcessing.enabled` equals `config['post-processing'] === true`, and `postProcessing.bloom.intensity` equals `config['bloom-intensity']` when present or `1.0` otherwise.

**Validates: Requirements 11.2, 11.3, 11.4**

---

### Property 5: VrdNode v2 props are passed through to BaseNode

*For any* `VrdNode` with v2 props set (shape, status, badges, ports, enterAnimation, exitAnimation, animationDuration), the `NodeProps` object constructed by the renderer for that node should contain the same values for each corresponding prop.

**Validates: Requirements 12.2, 12.3, 12.4, 12.5, 12.6, 12.7**

---

### Property 6: VrdEdge v2 props are passed through to BaseEdge

*For any* `VrdEdge` with v2 props set (routing, flow, flowSpeed, flowCount, flowColor, fromPort, toPort), the `EdgeLineProps` object constructed by the renderer should contain the same values, with `flowParticles` constructed from the flow fields when `flow === true`.

**Validates: Requirements 13.2, 13.3, 13.4, 13.5, 13.6**

---

### Property 7: Selection round-trip

*For any* node ID in the scene, calling `SelectionManager.select(id)` should result in `selectionSet.has(id) === true` in the renderer store, and calling `SelectionManager.clearSelection()` should result in `selectionSet.size === 0`.

**Validates: Requirements 15.1, 15.6**

---

### Property 8: Undo/redo position round-trip

*For any* node and any new position, moving the node to the new position and then calling `CommandHistory.undo()` should restore the node to its original position, and calling `CommandHistory.redo()` should return it to the new position.

**Validates: Requirements 15.2, 15.3, 15.4**

---

### Property 9: Status bar data reflects store state

*For any* renderer store state, the values displayed in the StatusBar (selection count, undo depth, layout name) should equal the corresponding values in the store at the time of the last render.

**Validates: Requirements 21.1, 21.2, 21.3**

---

### Property 10: Node status prop pass-through in domain nodes

*For any* domain node component (all 10) and any `NodeStatus` value, passing `status` as a prop should result in `BaseNode` receiving the same `status` value without modification.

**Validates: Requirement 19.5**

---

### Property 11: Inspector source update round-trip

*For any* node property edit in the Inspector Panel, the updated `.vrd` source should parse back to a `VrdAST` where the edited node's prop equals the value that was set in the inspector.

**Validates: Requirement 22.7**

---

## Error Handling

### Parser Errors

- **Unrecognized syntax**: emits `error` diagnostic, parsing continues (recovery mode)
- **Invalid enum values**: emits `warning` diagnostic, value is stored as-is for tooling
- **Invalid numeric values**: emits `warning` diagnostic, prop is not set
- **Port-to-port edge referencing undeclared node**: emits `warning` in validation pass
- **Animation timeline with missing required fields**: emits `warning`, timeline stored partially

### Renderer Errors

- **Missing node position**: falls back to `[0, 0, 0]`
- **Unknown node type**: falls back to `DefaultNode` (cube shape)
- **PrimitivesProvider not mounted**: `BaseNode` and `BaseEdge` use `tryUsePrimitives()` pattern
  (already implemented) — gracefully degrade without context
- **Layout computation failure**: catches errors, falls back to `auto` layout
- **WebGL context loss**: existing recovery mechanism (remount via `canvasKey`) is preserved

### Playground Errors

- **Export failure**: `toast.error()` notification, no state mutation
- **Inspector source update parse error**: shows inline error, does not apply the update
- **Monaco language registration failure**: logged to console, editor falls back to plain text

---

## Testing Strategy

### Unit Tests

Unit tests focus on specific examples, edge cases, and pure functions:

- `packages/parser/src/tests/parser.test.ts`: extend existing test suite with cases for each
  new KV type (shape, status, badge, port, enter, exit, animation-duration, routing, flow-*,
  collapsed, layout, new config keys, port-to-port edges, animation blocks)
- `packages/parser/src/tests/printer.test.ts`: new file testing `printVrd` for each prop type
- `packages/renderer/src/tests/astConfigToPrimitivesConfig.test.ts`: unit tests for the
  mapping function
- `packages/nodes/src/tests/`: verify `defaultPorts`, `defaultStatus`, and NodeRegistry
  registration for each of the 10 nodes

### Property-Based Tests

Property-based tests use **fast-check** (already available in the monorepo) with a minimum of
100 iterations per property.

Each test is tagged with a comment referencing the design property:
```typescript
// Feature: integration-wiring-phase, Property 1: Parser round-trip
```

**Property 1 — Parser round-trip** (`packages/parser/src/tests/printer.property.test.ts`):
Generate random `VrdAST` objects with arbitrary combinations of v2 props using fast-check
arbitraries. For each generated AST, call `printVrd(ast)` then `parseVrdSafe(result)` and
assert structural equivalence.

**Property 2 — Invalid enum values produce diagnostics** (`parser.property.test.ts`):
Generate random strings not in the valid sets for shape, status, animation type, routing.
Parse a node/edge block containing each invalid value and assert at least one diagnostic
with severity `warning` or `error` is emitted.

**Property 3 — Port-to-port edge parsing** (`parser.property.test.ts`):
Generate random valid node IDs and port names (alphanumeric + hyphens). Construct a
port-to-port edge string and parse it. Assert `fromPort` and `toPort` match the generated names.

**Property 4 — Config mapping** (`astConfigToPrimitivesConfig.property.test.ts`):
Generate random `VrdConfig` objects with boolean and numeric fields. Assert the mapping
function produces the correct `PrimitivesConfig` for all inputs.

**Property 5 — Node prop pass-through** (`renderer.property.test.ts`):
Generate random `VrdNode` objects with v2 props. Call the renderer's node-props-builder
function and assert all v2 props are present in the output.

**Property 6 — Edge prop pass-through** (`renderer.property.test.ts`):
Same pattern for edges.

**Property 7 — Selection round-trip** (`selection.property.test.ts`):
Generate random sets of node IDs. Select each, verify presence. Clear, verify empty.

**Property 8 — Undo/redo position round-trip** (`undo-redo.property.test.ts`):
Generate random node IDs and position pairs. Move, undo, verify original. Redo, verify new.

**Property 9 — Status bar data** (`statusbar.property.test.ts`):
Generate random store states. Render StatusBar. Assert displayed values match store.

**Property 10 — Node status pass-through** (`nodes.property.test.ts`):
For each of the 10 node components, generate random `NodeStatus` values. Render the component
and assert `BaseNode` receives the same status.

**Property 11 — Inspector source update round-trip** (`inspector.property.test.ts`):
Generate random node prop values. Apply via inspector update function. Parse result. Assert
the prop value in the AST matches the input.

### Dual Testing Approach

Unit tests and property tests are complementary:
- Unit tests catch concrete bugs with specific inputs (e.g., `shape: cube` parses correctly)
- Property tests verify general correctness across all valid inputs

Property tests are configured with `fc.configureGlobal({ numRuns: 100 })` at the test suite
level. Each property test references its design document property via the tag comment.
