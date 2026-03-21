import { EventEmitter } from 'events';
import * as THREE from 'three';

export class SelectionManager extends EventEmitter {
  private _selectedIds: Set<string> = new Set();

  get selectedIds(): ReadonlySet<string> {
    return this._selectedIds;
  }

  select(id: string, additive = false): void {
    if (!additive) {
      this._selectedIds = new Set();
    }
    this._selectedIds.add(id);
    this.emit('selectionChange', new Set(this._selectedIds));
  }

  deselect(id: string): void {
    if (this._selectedIds.delete(id)) {
      this.emit('selectionChange', new Set(this._selectedIds));
    }
  }

  clearSelection(): void {
    if (this._selectedIds.size > 0) {
      this._selectedIds = new Set();
      this.emit('selectionChange', new Set(this._selectedIds));
    }
  }

  selectBox(bounds: THREE.Box3, nodeBounds: Map<string, THREE.Box3>): void {
    const newSelection = new Set<string>();
    for (const [id, box] of nodeBounds) {
      if (bounds.intersectsBox(box)) {
        newSelection.add(id);
      }
    }
    this._selectedIds = newSelection;
    this.emit('selectionChange', new Set(this._selectedIds));
  }

  on(event: 'selectionChange', handler: (ids: Set<string>) => void): this;
  on(event: string, handler: (...args: unknown[]) => void): this;
  on(event: string, handler: (...args: unknown[]) => void): this {
    return super.on(event, handler);
  }
}
