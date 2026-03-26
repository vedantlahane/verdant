// parser/scope.ts — Indent-based scope stack management

// ── Scope Types ──

interface ScopeBase {
  readonly indent: number;
  readonly line: number;
}

export interface RootScope extends ScopeBase {
  readonly type: 'root';
}

export interface GroupScope extends ScopeBase {
  readonly type: 'group';
  readonly groupId: string;
}

export interface NodeScope extends ScopeBase {
  readonly type: 'node';
  readonly nodeId: string;
}

export interface EdgeScope extends ScopeBase {
  readonly type: 'edge';
  readonly edgeIndex: number;
}

export interface AnimationScope extends ScopeBase {
  readonly type: 'animation';
  readonly timelineName: string;
}

export type Scope = RootScope | GroupScope | NodeScope | EdgeScope | AnimationScope;

/**
 * Manages the indent-based scope stack during parsing.
 * The stack always has at least one element (the root scope).
 */
export class ScopeStack {
  private readonly _stack: Scope[] = [
    { type: 'root', indent: -1, line: 0 },
  ];

  /** Current (innermost) scope. */
  get current(): Scope {
    return this._stack[this._stack.length - 1];
  }

  /** Number of scopes (including root). */
  get depth(): number {
    return this._stack.length;
  }

  /** Push a new scope onto the stack. */
  push(scope: Scope): void {
    this._stack.push(scope);
  }

  /**
   * Pop scopes until the current scope's indent is less than `indent`.
   * This handles dedentation — when a line is less indented than the
   * current scope, we pop back to the appropriate parent.
   */
  popToIndent(indent: number): void {
    while (this._stack.length > 1 && this.current.indent >= indent) {
      this._stack.pop();
    }
  }

  /**
   * Find the nearest enclosing group scope, or null if at root level.
   */
  findParentGroup(): GroupScope | null {
    for (let i = this._stack.length - 1; i >= 0; i--) {
      if (this._stack[i].type === 'group') {
        return this._stack[i] as GroupScope;
      }
    }
    return null;
  }

  /**
   * Check if currently inside a scope of the given type.
   */
  isInside(type: Scope['type']): boolean {
    return this._stack.some((s) => s.type === type);
  }

  /** Create a group scope. */
  static group(groupId: string, indent: number, line: number): GroupScope {
    return { type: 'group', groupId, indent, line };
  }

  /** Create a node scope. */
  static node(nodeId: string, indent: number, line: number): NodeScope {
    return { type: 'node', nodeId, indent, line };
  }

  /** Create an edge scope. */
  static edge(edgeIndex: number, indent: number, line: number): EdgeScope {
    return { type: 'edge', edgeIndex, indent, line };
  }

  /** Create an animation scope. */
  static animation(timelineName: string, indent: number, line: number): AnimationScope {
    return { type: 'animation', timelineName, indent, line };
  }
}
