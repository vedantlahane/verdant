// primitives/src/interaction/SelectionManager.ts

import * as THREE from 'three';

// ── Listener type ───────────────────────────────────────────

export type SelectionChangeListener = (selectedIds: ReadonlySet<string>) => void;

/**
 * Manages node selection state.
 *
 * **No Node.js dependency** — uses a simple listener array instead of `EventEmitter`.
 *
 * @example
 * ```ts
 * const sm = new SelectionManager();
 * sm.onChange((ids) => console.log('Selected:', [...ids]));
 * sm.select('node-1');           // single select
 * sm.select('node-2', true);     // additive (shift-click)
 * sm.toggle('node-1');           // deselect node-1
 * sm.selectBox(bounds, nodeMap); // box select
 * ```
 */
export class SelectionManager {
  private _selectedIds = new Set<string>();
  private _listeners: SelectionChangeListener[] = [];

  // ── Queries ─────────────────────────────────────────────

  /** Read-only view of currently selected IDs. */
  get selectedIds(): ReadonlySet<string> {
    return this._selectedIds;
  }

  /** Number of selected nodes. */
  get count(): number {
    return this._selectedIds.size;
  }

  /** Check if a specific node is selected. */
  isSelected(id: string): boolean {
    return this._selectedIds.has(id);
  }

  // ── Mutations ─────────────────────────────────────────────

  /**
   * Select a node.
   *
   * @param id - Node ID to select.
   * @param additive - If `true`, add to existing selection (shift-click).
   *                   If `false`, replace selection (default).
   */
  select(id: string, additive = false): void {
    if (!additive) {
      this._selectedIds = new Set();
    }
    this._selectedIds.add(id);
    this._emit();
  }

  /**
   * Toggle a node's selection state.
   * If selected → deselect. If not selected → add to selection.
   */
  toggle(id: string): void {
    if (this._selectedIds.has(id)) {
      this._selectedIds.delete(id);
    } else {
      this._selectedIds.add(id);
    }
    this._emit();
  }

  /** Deselect a specific node. No-op if not selected. */
  deselect(id: string): void {
    if (this._selectedIds.delete(id)) {
      this._emit();
    }
  }

  /** Clear all selections. No-op if already empty. */
  clearSelection(): void {
    if (this._selectedIds.size === 0) return;
    this._selectedIds = new Set();
    this._emit();
  }

  /** Select all provided IDs, replacing the current selection. */
  selectAll(ids: Iterable<string>): void {
    this._selectedIds = new Set(ids);
    this._emit();
  }

  /**
   * Box-select: select all nodes whose bounding box intersects the selection box.
   *
   * @param bounds - World-space selection box.
   * @param nodeBounds - Map of nodeId → world-space bounding box.
   * @param additive - If `true`, add to existing selection.
   */
  selectBox(
    bounds: THREE.Box3,
    nodeBounds: Map<string, THREE.Box3>,
    additive = false,
  ): void {
    if (!additive) {
      this._selectedIds = new Set();
    }
    for (const [id, box] of nodeBounds) {
      if (bounds.intersectsBox(box)) {
        this._selectedIds.add(id);
      }
    }
    this._emit();
  }

  // ── Events ────────────────────────────────────────────────

  /** Register a listener for selection changes. Returns an unsubscribe function. */
  onChange(listener: SelectionChangeListener): () => void {
    this._listeners.push(listener);
    return () => {
      const idx = this._listeners.indexOf(listener);
      if (idx >= 0) this._listeners.splice(idx, 1);
    };
  }

  /** Remove all listeners. */
  removeAllListeners(): void {
    this._listeners = [];
  }

  // ── Private ─────────────────────────────────────────────

  private _emit(): void {
    // Defensive copy so listeners can't mutate internal state
    const snapshot = new Set(this._selectedIds);
    for (const listener of this._listeners) {
      listener(snapshot);
    }
  }
}