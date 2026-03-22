// primitives/src/interaction/KeyboardNav.ts

import type { SelectionManager } from './SelectionManager';
import type { CommandHistory } from './CommandHistory';

// ── Options ─────────────────────────────────────────────────

export interface KeyboardNavOptions {
  nodeIds: string[];
  selectionManager: SelectionManager;
  commandHistory: CommandHistory;
  onZoomToFit?: () => void;
  onDeleteSelected?: (ids: ReadonlySet<string>) => void;
  /** Called when Enter/Space is pressed on a focused node. */
  onNodeAction?: (nodeId: string) => void;
  /** Called when focused node changes (for rendering focus indicator). */
  onFocusChange?: (nodeId: string | null) => void;
}

/**
 * Keyboard navigation manager for the 3D scene.
 *
 * **Keyboard bindings:**
 *
 * | Key              | Action                           |
 * |------------------|----------------------------------|
 * | Tab              | Focus next node                  |
 * | Shift+Tab        | Focus previous node              |
 * | Enter / Space    | Select focused node              |
 * | Escape           | Clear selection + clear focus     |
 * | Delete/Backspace | Delete selected nodes            |
 * | F                | Zoom to fit all nodes            |
 * | Ctrl+A           | Select all nodes                 |
 * | Ctrl+Z           | Undo                             |
 * | Ctrl+Shift+Z / Ctrl+Y | Redo                       |
 */
export class KeyboardNav {
  private _nodeIds: string[];
  private _focusedNodeId: string | null = null;
  private _selectionManager: SelectionManager;
  private _commandHistory: CommandHistory;
  private _onZoomToFit?: () => void;
  private _onDeleteSelected?: (ids: ReadonlySet<string>) => void;
  private _onNodeAction?: (nodeId: string) => void;
  private _onFocusChange?: (nodeId: string | null) => void;

  private _element: HTMLElement | null = null;
  private _handler: ((e: KeyboardEvent) => void) | null = null;

  constructor(options: KeyboardNavOptions) {
    this._nodeIds = [...options.nodeIds];
    this._selectionManager = options.selectionManager;
    this._commandHistory = options.commandHistory;
    this._onZoomToFit = options.onZoomToFit;
    this._onDeleteSelected = options.onDeleteSelected;
    this._onNodeAction = options.onNodeAction;
    this._onFocusChange = options.onFocusChange;
  }

  // ── Queries ─────────────────────────────────────────────

  get focusedNodeId(): string | null {
    return this._focusedNodeId;
  }

  // ── Lifecycle ─────────────────────────────────────────────

  /** Attach keyboard listener to an element (typically the canvas container). */
  attach(element: HTMLElement): void {
    this.detach();
    this._element = element;
    this._handler = (e: KeyboardEvent) => this._handleKeyDown(e);
    element.addEventListener('keydown', this._handler);

    // Make element focusable if not already
    if (!element.hasAttribute('tabindex')) {
      element.setAttribute('tabindex', '0');
    }
  }

  /** Remove keyboard listener. */
  detach(): void {
    if (this._element && this._handler) {
      this._element.removeEventListener('keydown', this._handler);
    }
    this._element = null;
    this._handler = null;
  }

  /** Update the list of navigable node IDs (call when nodes change). */
  updateNodeIds(nodeIds: string[]): void {
    this._nodeIds = [...nodeIds];
    // If focused node was removed, clear focus
    if (this._focusedNodeId !== null && !this._nodeIds.includes(this._focusedNodeId)) {
      this._setFocus(null);
    }
  }

  /** Clean up all listeners and state. */
  dispose(): void {
    this.detach();
    this._focusedNodeId = null;
  }

  // ── Private ─────────────────────────────────────────────

  private _setFocus(nodeId: string | null): void {
    if (this._focusedNodeId === nodeId) return;
    this._focusedNodeId = nodeId;
    this._onFocusChange?.(nodeId);
  }

  private _handleKeyDown(e: KeyboardEvent): void {
    const ctrl = e.ctrlKey || e.metaKey;

    // ── Ctrl+Shift+Z / Ctrl+Y → Redo ──
    if (ctrl && e.shiftKey && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      this._commandHistory.redo();
      return;
    }
    if (ctrl && e.key.toLowerCase() === 'y') {
      e.preventDefault();
      this._commandHistory.redo();
      return;
    }

    // ── Ctrl+Z → Undo ──
    if (ctrl && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      this._commandHistory.undo();
      return;
    }

    // ── Ctrl+A → Select All ──
    if (ctrl && e.key.toLowerCase() === 'a') {
      e.preventDefault();
      for (const id of this._nodeIds) {
        this._selectionManager.select(id, true);
      }
      return;
    }

    // ── Non-modifier keys ──
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
        e.preventDefault();
        if (this._focusedNodeId !== null) {
          // Select the focused node
          this._selectionManager.select(this._focusedNodeId, e.shiftKey);
          // Trigger action callback
          this._onNodeAction?.(this._focusedNodeId);
        }
        break;
      }

      case 'f':
      case 'F': {
        // Don't intercept if user is typing in an input
        if (ctrl) break;
        this._onZoomToFit?.();
        break;
      }

      case 'Delete':
      case 'Backspace': {
        // Don't intercept if user is typing in an input
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') break;

        if (this._selectionManager.selectedIds.size > 0) {
          this._onDeleteSelected?.(this._selectionManager.selectedIds);
        }
        break;
      }

      case 'Escape': {
        this._selectionManager.clearSelection();
        this._setFocus(null);
        break;
      }
    }
  }

  private _focusNext(): void {
    if (this._nodeIds.length === 0) return;
    if (this._focusedNodeId === null) {
      this._setFocus(this._nodeIds[0]);
      return;
    }
    const idx = this._nodeIds.indexOf(this._focusedNodeId);
    this._setFocus(this._nodeIds[(idx + 1) % this._nodeIds.length]);
  }

  private _focusPrev(): void {
    if (this._nodeIds.length === 0) return;
    if (this._focusedNodeId === null) {
      this._setFocus(this._nodeIds[this._nodeIds.length - 1]);
      return;
    }
    const idx = this._nodeIds.indexOf(this._focusedNodeId);
    this._setFocus(
      this._nodeIds[(idx - 1 + this._nodeIds.length) % this._nodeIds.length],
    );
  }
}