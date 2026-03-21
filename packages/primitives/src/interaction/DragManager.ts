import * as THREE from 'three';
import { SelectionManager } from './SelectionManager';
import { CommandHistory, Command } from './CommandHistory';

class MoveCommand implements Command {
  readonly description = 'Move nodes';

  constructor(
    private readonly nodePositions: Map<string, THREE.Vector3>,
    private readonly snapshots: Map<string, THREE.Vector3>,
    private readonly delta: THREE.Vector3,
  ) {}

  execute(): void {
    for (const [id, snapshot] of this.snapshots) {
      const pos = this.nodePositions.get(id);
      if (pos) {
        pos.copy(snapshot).add(this.delta);
      }
    }
  }

  undo(): void {
    for (const [id, snapshot] of this.snapshots) {
      const pos = this.nodePositions.get(id);
      if (pos) {
        pos.copy(snapshot);
      }
    }
  }
}

export class DragManager {
  private _isDragging = false;
  private dragStartPointer = new THREE.Vector3();
  private snapshots = new Map<string, THREE.Vector3>();

  constructor(
    private readonly selectionManager: SelectionManager,
    private readonly commandHistory: CommandHistory,
    private readonly nodePositions: Map<string, THREE.Vector3>,
  ) {}

  get isDragging(): boolean {
    return this._isDragging;
  }

  startDrag(pointerPosition: THREE.Vector3): void {
    this._isDragging = true;
    this.dragStartPointer.copy(pointerPosition);

    // Snapshot positions of all selected nodes
    this.snapshots = new Map();
    for (const id of this.selectionManager.selectedIds) {
      const pos = this.nodePositions.get(id);
      if (pos) {
        this.snapshots.set(id, pos.clone());
      }
    }
  }

  moveDrag(pointerPosition: THREE.Vector3): void {
    if (!this._isDragging) return;

    const delta = new THREE.Vector3().subVectors(pointerPosition, this.dragStartPointer);

    for (const [id, snapshot] of this.snapshots) {
      const pos = this.nodePositions.get(id);
      if (pos) {
        pos.copy(snapshot).add(delta);
      }
    }
  }

  endDrag(): void {
    if (!this._isDragging) return;

    // Compute final delta from start to current positions
    const firstId = [...this.snapshots.keys()][0];
    let finalDelta = new THREE.Vector3();
    if (firstId) {
      const currentPos = this.nodePositions.get(firstId);
      const snapshotPos = this.snapshots.get(firstId);
      if (currentPos && snapshotPos) {
        finalDelta = new THREE.Vector3().subVectors(currentPos, snapshotPos);
      }
    }

    const command = new MoveCommand(
      this.nodePositions,
      new Map(this.snapshots),
      finalDelta,
    );
    this.commandHistory.push(command);

    this._isDragging = false;
    this.snapshots = new Map();
  }
}
