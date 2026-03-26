// parser/builder.ts — Type-safe mutable AST builder

import type {
  VrdAST,
  VrdNode,
  VrdNodeProps,
  VrdEdge,
  VrdEdgeProps,
  VrdGroup,
  VrdGroupProps,
  VrdConfig,
  VrdAnimationTimeline,
  VrdAnimationKeyframe,
  SourceLocation,
} from './types';
import type { DiagnosticCollector } from './errors';
import type { GroupScope } from './scope';

// ── Mutable internal types (never exposed publicly) ──

interface MutableGroup {
  id: string;
  label?: string;
  children: string[];
  groups: MutableGroup[];
  parentGroupId?: string;
  props: VrdGroupProps;
  loc?: SourceLocation;
}

interface MutableTimeline {
  name: string;
  duration: number;
  keyframes: VrdAnimationKeyframe[];
  /** Accumulator for multi-line keyframe parsing. */
  pendingKeyframe: Partial<VrdAnimationKeyframe>;
}

/**
 * Encapsulates mutable AST construction during parsing.
 * All mutation is contained here — the parser only calls builder methods.
 * The final `build()` returns a frozen AST.
 */
export class ASTBuilder {
  private readonly _config: VrdConfig = {};
  private readonly _nodes: VrdNode[] = [];
  private readonly _edges: VrdEdge[] = [];
  private readonly _topLevelGroups: MutableGroup[] = [];

  private readonly _groupMap = new Map<string, MutableGroup>();
  private readonly _nodeMap = new Map<string, VrdNode>();
  private readonly _declaredNodeIds = new Set<string>();
  private readonly _timelines: MutableTimeline[] = [];

  private readonly _diag: DiagnosticCollector;

  constructor(diagnostics: DiagnosticCollector) {
    this._diag = diagnostics;
  }

  // ── Queries ──

  get declaredNodeIds(): ReadonlySet<string> {
    return this._declaredNodeIds;
  }

  get config(): VrdConfig {
    return this._config;
  }

  getNode(id: string): VrdNode | undefined {
    return this._nodeMap.get(id);
  }

  getGroup(id: string): MutableGroup | undefined {
    return this._groupMap.get(id);
  }

  getEdge(index: number): VrdEdge | undefined {
    return this._edges[index];
  }

  getTimeline(name: string): MutableTimeline | undefined {
    return this._timelines.find((t) => t.name === name);
  }

  get edgeCount(): number {
    return this._edges.length;
  }

  // ── Config ──

  setConfig(key: string, value: unknown): void {
    (this._config as Record<string, unknown>)[key] = value;
  }

  // ── Nodes ──

  addNode(
    id: string,
    type: string,
    props: VrdNodeProps,
    lineNum: number,
    parentGroup: GroupScope | null,
  ): void {
    if (this._declaredNodeIds.has(id)) {
      this._diag.warning(
        lineNum,
        `Duplicate node ID "${id}". Previous declaration will be overwritten.`,
      );
      // Remove old node — O(1) via filter on build, but remove from map now
      const oldIndex = this._nodes.findIndex((n) => n.id === id);
      if (oldIndex !== -1) this._nodes.splice(oldIndex, 1);
    }

    const node: VrdNode = {
      id,
      type,
      props,
      groupId: parentGroup?.groupId,
      loc: { line: lineNum, col: 0 },
    };

    this._nodes.push(node);
    this._nodeMap.set(id, node);
    this._declaredNodeIds.add(id);

    // Register in parent group
    if (parentGroup) {
      const group = this._groupMap.get(parentGroup.groupId);
      if (group && !group.children.includes(id)) {
        group.children.push(id);
      }
    }
  }

  /** Update a mutable copy of node props. Returns the props object for mutation. */
  getNodeProps(id: string): VrdNodeProps | undefined {
    const node = this._nodeMap.get(id);
    return node?.props;
  }

  // ── Edges ──

  addEdge(edge: VrdEdge): number {
    this._edges.push(edge);
    return this._edges.length - 1;
  }

  /** Get edge props for mutation during block parsing. */
  getEdgeProps(index: number): VrdEdgeProps | undefined {
    return this._edges[index]?.props;
  }

  // ── Groups ──

  addGroup(
    id: string,
    label: string | undefined,
    lineNum: number,
    parentGroupId: string | undefined,
  ): void {
    if (this._groupMap.has(id)) {
      this._diag.warning(lineNum, `Duplicate group ID "${id}". Previous group will be merged.`);
    }

    const group: MutableGroup = {
      id,
      label,
      children: [],
      groups: [],
      parentGroupId,
      props: {},
      loc: { line: lineNum, col: 0 },
    };

    this._groupMap.set(id, group);

    if (parentGroupId) {
      const parent = this._groupMap.get(parentGroupId);
      if (parent) {
        parent.groups.push(group);
      } else {
        this._topLevelGroups.push(group);
      }
    } else {
      this._topLevelGroups.push(group);
    }
  }

  getGroupProps(id: string): VrdGroupProps | undefined {
    return this._groupMap.get(id)?.props;
  }

  setGroupLabel(id: string, label: string): void {
    const group = this._groupMap.get(id);
    if (group) group.label = label;
  }

  // ── Animations ──

  addTimeline(name: string): void {
    this._timelines.push({
      name,
      duration: 0,
      keyframes: [],
      pendingKeyframe: {},
    });
  }

  setTimelineDuration(name: string, duration: number): void {
    const t = this.getTimeline(name);
    if (t) t.duration = duration;
  }

  /** Set a field on the pending keyframe accumulator. */
  setPendingKeyframeField(
    name: string,
    field: keyof VrdAnimationKeyframe,
    value: unknown,
  ): void {
    const t = this.getTimeline(name);
    if (!t) return;
    (t.pendingKeyframe as Record<string, unknown>)[field] = value;
  }

  /** Flush the pending keyframe into the timeline's keyframe array. */
  flushPendingKeyframe(name: string): void {
    const t = this.getTimeline(name);
    if (!t) return;

    const pk = t.pendingKeyframe;
    t.keyframes.push({
      target: (pk.target as string) ?? '',
      property: (pk.property as string) ?? '',
      from: pk.from,
      to: pk.to,
    });
    t.pendingKeyframe = {};
  }

  // ── Build ──

  /** Freeze and return the final AST. */
  build(): VrdAST {
    // Attach timelines to config
    if (this._timelines.length > 0) {
      this._config.animations = this._timelines.map((t) => ({
        name: t.name,
        duration: t.duration,
        keyframes: Object.freeze([...t.keyframes]),
      }));
    }

    return {
      config: this._config,
      nodes: Object.freeze([...this._nodes]),
      edges: Object.freeze([...this._edges]),
      groups: Object.freeze(this._topLevelGroups.map(freezeGroup)),
    };
  }

  // ── Helpers ──

  resolveFullId(localId: string, parentGroup: GroupScope | null): string {
    return parentGroup ? `${parentGroup.groupId}.${localId}` : localId;
  }
}

/** Deep-freeze a mutable group tree into the readonly VrdGroup shape. */
function freezeGroup(group: MutableGroup): VrdGroup {
  return Object.freeze({
    id: group.id,
    label: group.label,
    children: Object.freeze([...group.children]),
    groups: Object.freeze(group.groups.map(freezeGroup)),
    parentGroupId: group.parentGroupId,
    props: Object.freeze({ ...group.props }),
    loc: group.loc,
  });
}
