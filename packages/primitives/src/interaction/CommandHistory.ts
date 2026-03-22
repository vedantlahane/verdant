// primitives/src/interaction/CommandHistory.ts

// ── Command Interface ───────────────────────────────────────

export interface Command {
  /** Apply the command. */
  execute(): void;
  /** Reverse the command. */
  undo(): void;
  /** Human-readable description (for UI display). */
  description?: string;
}

// ── Batch Command ───────────────────────────────────────────

/**
 * Groups multiple commands into a single undo/redo unit.
 */
export class BatchCommand implements Command {
  readonly description: string;

  constructor(
    private readonly _commands: Command[],
    description?: string,
  ) {
    this.description = description ?? `Batch (${_commands.length} actions)`;
  }

  execute(): void {
    for (const cmd of this._commands) {
      cmd.execute();
    }
  }

  undo(): void {
    // Undo in reverse order
    for (let i = this._commands.length - 1; i >= 0; i--) {
      this._commands[i].undo();
    }
  }
}

// ── Options & Listener ──────────────────────────────────────

export interface CommandHistoryOptions {
  /** Maximum number of commands to keep. @default 100 */
  maxDepth?: number;
  /** Called whenever the history state changes (push/undo/redo/clear). */
  onChange?: (state: CommandHistoryState) => void;
}

export interface CommandHistoryState {
  canUndo: boolean;
  canRedo: boolean;
  /** Index of the current command (-1 if empty). */
  pointer: number;
  /** Total commands in the stack. */
  size: number;
  /** Description of the current command (at pointer). */
  currentDescription: string | undefined;
}

// ── Implementation ──────────────────────────────────────────

/**
 * Undo/redo command history with configurable max depth.
 *
 * - `push(command)` → executes the command and adds it to the stack.
 *   If the pointer is not at the top, truncates future commands first.
 * - `undo()` → reverses the current command and moves pointer back.
 * - `redo()` → re-executes the next command and moves pointer forward.
 * - `clear()` → resets the stack entirely.
 *
 * @example
 * ```ts
 * const history = new CommandHistory({ maxDepth: 50 });
 * history.push({ execute: () => move(1), undo: () => move(-1) });
 * history.undo();  // moves back
 * history.redo();  // moves forward again
 * ```
 */
export class CommandHistory {
  private _stack: Command[] = [];
  private _pointer = -1;
  private readonly _maxDepth: number;
  private readonly _listeners = new Set<(state: CommandHistoryState) => void>();

  constructor(options: CommandHistoryOptions = {}) {
    this._maxDepth = options.maxDepth ?? 100;
    if (options.onChange) {
      this._listeners.add(options.onChange);
    }
  }

  /**
   * Subscribe to history state changes.
   * Returns a function to unsubscribe.
   */
  subscribe(listener: (state: CommandHistoryState) => void): () => void {
    this._listeners.add(listener);
    // Initial call to sync listener
    listener(this._getState());
    return () => this._listeners.delete(listener);
  }

  // ── Queries ─────────────────────────────────────────────

  get canUndo(): boolean {
    return this._pointer >= 0;
  }

  get canRedo(): boolean {
    return this._pointer < this._stack.length - 1;
  }

  /** Number of commands currently in the stack. */
  get size(): number {
    return this._stack.length;
  }

  /** Current pointer position (-1 if empty). */
  get pointer(): number {
    return this._pointer;
  }

  /** The command at the current pointer, or undefined if empty. */
  peek(): Command | undefined {
    if (this._pointer < 0) return undefined;
    return this._stack[this._pointer];
  }

  /** Description of the command that would be undone. */
  get undoDescription(): string | undefined {
    return this.peek()?.description;
  }

  /** Description of the command that would be redone. */
  get redoDescription(): string | undefined {
    if (!this.canRedo) return undefined;
    return this._stack[this._pointer + 1]?.description;
  }

  // ── Mutations ─────────────────────────────────────────

  /**
   * Push and execute a command.
   *
   * If the pointer is not at the top (due to undos), all commands
   * above the pointer are discarded before pushing.
   */
  push(command: Command): void {
    // Truncate future commands
    if (this._pointer < this._stack.length - 1) {
      this._stack = this._stack.slice(0, this._pointer + 1);
    }

    this._stack.push(command);
    this._pointer = this._stack.length - 1;

    // Enforce max depth
    if (this._stack.length > this._maxDepth) {
      const excess = this._stack.length - this._maxDepth;
      this._stack = this._stack.slice(excess);
      this._pointer = this._stack.length - 1;
    }

    this._emitChange();
  }

  /** Undo the current command. No-op if nothing to undo. */
  undo(): boolean {
    if (!this.canUndo) return false;
    this._stack[this._pointer].undo();
    this._pointer--;
    this._emitChange();
    return true;
  }

  /** Redo the next command. No-op if nothing to redo. */
  redo(): boolean {
    if (!this.canRedo) return false;
    this._pointer++;
    this._stack[this._pointer].execute();
    this._emitChange();
    return true;
  }

  /** Clear the entire history stack. */
  clear(): void {
    this._stack = [];
    this._pointer = -1;
    this._emitChange();
  }

  // ── Private ─────────────────────────────────────────────

  private _getState(): CommandHistoryState {
    return {
      canUndo: this.canUndo,
      canRedo: this.canRedo,
      pointer: this._pointer,
      size: this._stack.length,
      currentDescription: this.peek()?.description,
    };
  }

  private _emitChange(): void {
    const state = this._getState();
    for (const listener of this._listeners) {
      listener(state);
    }
  }
}