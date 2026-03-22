// primitives/src/interaction/DragManager.ts

import * as THREE from 'three';
import type { SelectionManager } from './SelectionManager';
import type { CommandHistory, Command } from './CommandHistory';

// ── Pre-allocated vectors ──
const _delta = new THREE.Vector3();
const _snapped = new THREE.Vector3();

// ── MoveCommand ─────────────────────────────────────────────

class MoveCommand implements Command {
  readonly description: string;

  constructor(
    private readonly _nodePositions: Map<string, THREE.Vector3>,
    private readonly _snapshots: Map<string, THREE.Vector3>,
    private readonly _delta: THREE.Vector3,
  ) {
    this.description = `Move ${_snapshots.size} node${_snapshots.size === 1 ? '' : 's'}`;
  }

  execute(): void {
    for (const [id, snapshot] of this._snapshots) {
      const pos = this._nodePositions.get(id);
      if (pos) pos.copy(snapshot).add(this._delta);
    }
  }

  undo(): void {
    for (const [id, snapshot] of this._snapshots) {
      const pos = this._nodePositions.get(id);
      if (pos) pos.copy(snapshot);
    }
  }
}

// ── Options ─────────────────────────────────────────────────

export interface DragManagerOptions {
  /** Enable snap-to-grid. @default false */
  snapEnabled?: boolean;
  /** Grid cell size for snapping. @default 1.0 */
  snapGridSize?: number;
  /** Minimum pointer movement to start a drag (prevents accidental drags). @default 0.1 */
  dragThreshold?: number;
  /** Set of node IDs that cannot be dragged. */
  lockedNodeIds?: Set<string>;
}

// ── DragManager ─────────────────────────────────────────────

/**
 * Manages multi-node drag operations with snap-to-grid, locked node
 * support, and undo/redo integration.
 *
 * On drag start: snapshots positions of all selected nodes.
 * On drag move: translates all selected (non-locked) nodes by delta.
 * On drag end: pushes a `MoveCommand` to `CommandHistory`.
 */
export class DragManager {
  private _isDragging = false;
  private _hasExceededThreshold = false;
  private readonly _dragStartPointer = new THREE.Vector3();
  private _snapshots = new Map<string, THREE.Vector3>();

  private _snapEnabled: boolean;
  private _snapGridSize: number;
  private _dragThreshold: number;
  private _lockedNodeIds: Set<string>;

  constructor(
    private readonly _selectionManager: SelectionManager,
    private readonly _commandHistory: CommandHistory,
    private readonly _nodePositions: Map<string, THREE.Vector3>,
    options: DragManagerOptions = {},
  ) {
    this._snapEnabled = options.snapEnabled ?? false;
    this._snapGridSize = options.snapGridSize ?? 1.0;
    this._dragThreshold = options.dragThreshold ?? 0.1;
    this._lockedNodeIds = options.lockedNodeIds ?? new Set();
  }

  // ── Queries ─────────────────────────────────────────────

  get isDragging(): boolean {
    return this._isDragging;
  }

  // ── Configuration ─────────────────────────────────────────

  setSnapEnabled(enabled: boolean): void {
    this._snapEnabled = enabled;
  }

  setSnapGridSize(size: number): void {
    this._snapGridSize = Math.max(0.1, size);
  }

  setLockedNodeIds(ids: Set<string>): void {
    this._lockedNodeIds = ids;
  }

  // ── Drag Lifecycle ────────────────────────────────────────

  startDrag(pointerPosition: THREE.Vector3): void {
    this._isDragging = true;
    this._hasExceededThreshold = false;
    this._dragStartPointer.copy(pointerPosition);

    // Snapshot positions of all selected NON-LOCKED nodes
    this._snapshots.clear();
    for (const id of this._selectionManager.selectedIds) {
      if (this._lockedNodeIds.has(id)) continue;
      const pos = this._nodePositions.get(id);
      if (pos) {
        this._snapshots.set(id, pos.clone());
      }
    }
  }

  moveDrag(pointerPosition: THREE.Vector3): void {
    if (!this._isDragging || this._snapshots.size === 0) return;

    _delta.subVectors(pointerPosition, this._dragStartPointer);

    // Check threshold
    if (!this._hasExceededThreshold) {
      if (_delta.length() < this._dragThreshold) return;
      this._hasExceededThreshold = true;
    }

    for (const [id, snapshot] of this._snapshots) {
      const pos = this._nodePositions.get(id);
      if (!pos) continue;

      // Apply delta to snapshot
      pos.copy(snapshot).add(_delta);

      // Snap to grid
      if (this._snapEnabled) {
        const g = this._snapGridSize;
        pos.x = Math.round(pos.x / g) * g;
        pos.y = Math.round(pos.y / g) * g;
        pos.z = Math.round(pos.z / g) * g;
      }
    }
  }

  endDrag(): void {
    if (!this._isDragging) return;

    // Only push command if we actually moved
    if (this._hasExceededThreshold && this._snapshots.size > 0) {
      // Compute final delta from first node
      const firstId = this._snapshots.keys().next().value;
      const finalDelta = new THREE.Vector3();

      if (firstId) {
        const currentPos = this._nodePositions.get(firstId);
        const snapshotPos = this._snapshots.get(firstId);
        if (currentPos && snapshotPos) {
          finalDelta.subVectors(currentPos, snapshotPos);
        }
      }

      const command = new MoveCommand(
        this._nodePositions,
        new Map(this._snapshots), // defensive copy
        finalDelta.clone(),       // must clone — not the pre-allocated one
      );
      this._commandHistory.push(command);
    }

    this._isDragging = false;
    this._hasExceededThreshold = false;
    this._snapshots.clear();
  }

  /** Cancel an in-progress drag without pushing to history. Restores original positions. */
  cancelDrag(): void {
    if (!this._isDragging) return;

    // Restore snapshots
    for (const [id, snapshot] of this._snapshots) {
      const pos = this._nodePositions.get(id);
      if (pos) pos.copy(snapshot);
    }

    this._isDragging = false;
    this._hasExceededThreshold = false;
    this._snapshots.clear();
  }
}