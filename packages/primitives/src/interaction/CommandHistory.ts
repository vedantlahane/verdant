export interface Command {
  execute(): void;
  undo(): void;
  description?: string;
}

export interface CommandHistoryOptions {
  maxDepth?: number; // default 100
}

export class CommandHistory {
  private stack: Command[] = [];
  private pointer = -1; // index of the last executed command
  private readonly maxDepth: number;

  constructor(options: CommandHistoryOptions = {}) {
    this.maxDepth = options.maxDepth ?? 100;
  }

  get canUndo(): boolean {
    return this.pointer >= 0;
  }

  get canRedo(): boolean {
    return this.pointer < this.stack.length - 1;
  }

  push(command: Command): void {
    // Discard all commands above the current pointer
    this.stack = this.stack.slice(0, this.pointer + 1);

    this.stack.push(command);
    this.pointer = this.stack.length - 1;

    // Enforce maxDepth by dropping oldest commands
    if (this.stack.length > this.maxDepth) {
      const excess = this.stack.length - this.maxDepth;
      this.stack = this.stack.slice(excess);
      this.pointer = this.stack.length - 1;
    }
  }

  undo(): void {
    if (!this.canUndo) return;
    this.stack[this.pointer].undo();
    this.pointer--;
  }

  redo(): void {
    if (!this.canRedo) return;
    this.pointer++;
    this.stack[this.pointer].execute();
  }

  clear(): void {
    this.stack = [];
    this.pointer = -1;
  }
}
