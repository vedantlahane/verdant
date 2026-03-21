import { SelectionManager } from './SelectionManager';
import { CommandHistory } from './CommandHistory';

export interface KeyboardNavOptions {
  nodeIds: string[];
  selectionManager: SelectionManager;
  commandHistory: CommandHistory;
  onZoomToFit?: () => void;
  onDeleteSelected?: (ids: ReadonlySet<string>) => void;
  onNodeAction?: (nodeId: string) => void;
}

export class KeyboardNav {
  private _nodeIds: string[];
  private _focusedNodeId: string | null = null;
  private _selectionManager: SelectionManager;
  private _commandHistory: CommandHistory;
  private _onZoomToFit?: () => void;
  private _onDeleteSelected?: (ids: ReadonlySet<string>) => void;
  private _onNodeAction?: (nodeId: string) => void;
  private _element: HTMLElement | null = null;
  private _handler: ((e: KeyboardEvent) => void) | null = null;

  constructor(options: KeyboardNavOptions) {
    this._nodeIds = [...options.nodeIds];
    this._selectionManager = options.selectionManager;
    this._commandHistory = options.commandHistory;
    this._onZoomToFit = options.onZoomToFit;
    this._onDeleteSelected = options.onDeleteSelected;
    this._onNodeAction = options.onNodeAction;
  }

  get focusedNodeId(): string | null {
    return this._focusedNodeId;
  }

  attach(element: HTMLElement): void {
    if (this._element) {
      this.detach();
    }
    this._element = element;
    this._handler = (e: KeyboardEvent) => this._handleKeyDown(e);
    element.addEventListener('keydown', this._handler);
  }

  detach(): void {
    if (this._element && this._handler) {
      this._element.removeEventListener('keydown', this._handler);
    }
    this._element = null;
    this._handler = null;
  }

  updateNodeIds(nodeIds: string[]): void {
    this._nodeIds = [...nodeIds];
    // If focused node no longer exists, clear focus
    if (this._focusedNodeId !== null && !this._nodeIds.includes(this._focusedNodeId)) {
      this._focusedNodeId = null;
    }
  }

  dispose(): void {
    this.detach();
  }

  private _handleKeyDown(e: KeyboardEvent): void {
    const ctrl = e.ctrlKey || e.metaKey;

    // Ctrl+Shift+Z or Cmd+Shift+Z → redo
    if (ctrl && e.shiftKey && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (this._commandHistory.canRedo) {
        this._commandHistory.redo();
      }
      return;
    }

    // Ctrl+Y → redo
    if (ctrl && e.key.toLowerCase() === 'y') {
      e.preventDefault();
      if (this._commandHistory.canRedo) {
        this._commandHistory.redo();
      }
      return;
    }

    // Ctrl+Z / Cmd+Z → undo
    if (ctrl && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (this._commandHistory.canUndo) {
        this._commandHistory.undo();
      }
      return;
    }

    switch (e.key) {
      case 'Tab': {
        e.preventDefault();
        if (this._nodeIds.length === 0) break;
        if (e.shiftKey) {
          this._focusPrev();
        } else {
          this._focusNext();
        }
        break;
      }

      case 'Enter':
      case ' ': {
        if (this._focusedNodeId !== null && this._onNodeAction) {
          this._onNodeAction(this._focusedNodeId);
        }
        break;
      }

      case 'f':
      case 'F': {
        if (this._onZoomToFit) {
          this._onZoomToFit();
        }
        break;
      }

      case 'Delete':
      case 'Backspace': {
        if (this._onDeleteSelected) {
          this._onDeleteSelected(this._selectionManager.selectedIds);
        }
        break;
      }

      case 'Escape': {
        this._selectionManager.clearSelection();
        break;
      }
    }
  }

  private _focusNext(): void {
    if (this._nodeIds.length === 0) return;
    if (this._focusedNodeId === null) {
      this._focusedNodeId = this._nodeIds[0];
      return;
    }
    const idx = this._nodeIds.indexOf(this._focusedNodeId);
    this._focusedNodeId = this._nodeIds[(idx + 1) % this._nodeIds.length];
  }

  private _focusPrev(): void {
    if (this._nodeIds.length === 0) return;
    if (this._focusedNodeId === null) {
      this._focusedNodeId = this._nodeIds[this._nodeIds.length - 1];
      return;
    }
    const idx = this._nodeIds.indexOf(this._focusedNodeId);
    this._focusedNodeId = this._nodeIds[(idx - 1 + this._nodeIds.length) % this._nodeIds.length];
  }
}
