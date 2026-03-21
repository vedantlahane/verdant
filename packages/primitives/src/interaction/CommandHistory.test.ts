import { describe, it, expect, vi } from 'vitest';
import * as fc from 'fast-check';
import { CommandHistory, Command } from './CommandHistory';

// Helper: create a simple counter command
function makeCounterCommand(state: { value: number }, nextValue: number): Command {
  const prevValue = state.value;
  return {
    execute: () => { state.value = nextValue; },
    undo: () => { state.value = prevValue; },
  };
}

// ─── Unit Tests ───────────────────────────────────────────────────────────────

describe('CommandHistory — unit tests', () => {
  it('starts with canUndo=false and canRedo=false', () => {
    const history = new CommandHistory();
    expect(history.canUndo).toBe(false);
    expect(history.canRedo).toBe(false);
  });

  it('canUndo becomes true after push', () => {
    const history = new CommandHistory();
    const state = { value: 0 };
    history.push(makeCounterCommand(state, 1));
    expect(history.canUndo).toBe(true);
    expect(history.canRedo).toBe(false);
  });

  it('undo calls command.undo and moves pointer back', () => {
    const history = new CommandHistory();
    const state = { value: 0 };
    // capture prev before mutating state
    const cmd = makeCounterCommand(state, 42);
    state.value = 42;
    history.push(cmd);
    history.undo();
    expect(state.value).toBe(0);
    expect(history.canUndo).toBe(false);
    expect(history.canRedo).toBe(true);
  });

  it('redo calls command.execute and advances pointer', () => {
    const history = new CommandHistory();
    const state = { value: 0 };
    const cmd = makeCounterCommand(state, 42);
    state.value = 42;
    history.push(cmd);
    history.undo();
    history.redo();
    expect(state.value).toBe(42);
    expect(history.canUndo).toBe(true);
    expect(history.canRedo).toBe(false);
  });

  it('undo is a no-op when canUndo is false', () => {
    const history = new CommandHistory();
    expect(() => history.undo()).not.toThrow();
  });

  it('redo is a no-op when canRedo is false', () => {
    const history = new CommandHistory();
    expect(() => history.redo()).not.toThrow();
  });

  it('push while pointer is not at top discards commands above', () => {
    const history = new CommandHistory();
    const state = { value: 0 };
    const cmd1 = makeCounterCommand(state, 1); state.value = 1; history.push(cmd1);
    const cmd2 = makeCounterCommand(state, 2); state.value = 2; history.push(cmd2);
    const cmd3 = makeCounterCommand(state, 3); state.value = 3; history.push(cmd3);
    history.undo(); // pointer at cmd2
    history.undo(); // pointer at cmd1
    // Push new command — cmd2 and cmd3 should be discarded
    const cmd4 = makeCounterCommand(state, 99); state.value = 99; history.push(cmd4);
    expect(history.canRedo).toBe(false);
    history.undo();
    expect(state.value).toBe(1);
  });

  it('respects maxDepth by dropping oldest commands', () => {
    const history = new CommandHistory({ maxDepth: 3 });
    const state = { value: 0 };
    for (let i = 1; i <= 5; i++) {
      state.value = i;
      history.push(makeCounterCommand(state, i));
    }
    // Only 3 commands should remain; undo 3 times should exhaust the stack
    history.undo();
    history.undo();
    history.undo();
    expect(history.canUndo).toBe(false);
  });

  it('clear resets the history', () => {
    const history = new CommandHistory();
    const state = { value: 0 };
    state.value = 1; history.push(makeCounterCommand(state, 1));
    state.value = 2; history.push(makeCounterCommand(state, 2));
    history.undo();
    history.clear();
    expect(history.canUndo).toBe(false);
    expect(history.canRedo).toBe(false);
  });

  it('execute is called on redo, not on push', () => {
    const history = new CommandHistory();
    const executeSpy = vi.fn();
    const undoSpy = vi.fn();
    const cmd: Command = { execute: executeSpy, undo: undoSpy };
    history.push(cmd);
    expect(executeSpy).not.toHaveBeenCalled();
    history.undo();
    history.redo();
    expect(executeSpy).toHaveBeenCalledTimes(1);
    expect(undoSpy).toHaveBeenCalledTimes(1);
  });
});

// ─── Property Tests ───────────────────────────────────────────────────────────

describe('CommandHistory — property tests', () => {
  // Feature: production-grade-primitives, Property 11: Command history undo/redo round trip
  // Validates: Requirements 6.1, 6.2, 6.3
  it('undo all then redo all returns to post-execution state', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: -1000, max: 1000 }), { minLength: 1, maxLength: 20 }),
        (values) => {
          const history = new CommandHistory({ maxDepth: 100 });
          const state = { value: 0 };
          for (const v of values) {
            const prev = state.value;
            state.value = v;
            history.push({ execute: () => { state.value = v; }, undo: () => { state.value = prev; } });
          }
          const finalValue = state.value;
          while (history.canUndo) history.undo();
          while (history.canRedo) history.redo();
          expect(state.value).toBe(finalValue);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: production-grade-primitives, Property 12: Command history stack truncation on new command
  // Validates: Requirements 6.4
  it('pushing a new command while pointer is not at top discards commands above and canRedo becomes false', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 20 }),  // total commands to push initially
        fc.integer({ min: 1, max: 20 }),  // number of undos to perform
        (total, undoCount) => {
          const actualUndos = Math.min(undoCount, total);
          const history = new CommandHistory({ maxDepth: 100 });
          const state = { value: 0 };

          for (let i = 1; i <= total; i++) {
            const v = i;
            const prev = state.value;
            state.value = v;
            history.push({ execute: () => { state.value = v; }, undo: () => { state.value = prev; } });
          }

          for (let i = 0; i < actualUndos; i++) {
            history.undo();
          }

          // Only push a new command if we actually undid something (pointer not at top)
          if (actualUndos > 0) {
            const newVal = 9999;
            const prev = state.value;
            state.value = newVal;
            history.push({ execute: () => { state.value = newVal; }, undo: () => { state.value = prev; } });
            expect(history.canRedo).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: production-grade-primitives, Property 13: canUndo and canRedo reflect stack state
  // Validates: Requirements 6.6
  it('canUndo and canRedo correctly reflect the stack state after any sequence of operations', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.oneof(
            fc.constant({ op: 'push' as const }),
            fc.constant({ op: 'undo' as const }),
            fc.constant({ op: 'redo' as const }),
          ),
          { minLength: 1, maxLength: 30 }
        ),
        (ops) => {
          const history = new CommandHistory({ maxDepth: 100 });
          const state = { value: 0 };
          let pointer = -1;
          let stackSize = 0;

          for (const { op } of ops) {
            if (op === 'push') {
              const v = state.value + 1;
              const prev = state.value;
              state.value = v;
              history.push({ execute: () => { state.value = v; }, undo: () => { state.value = prev; } });
              // Truncate above pointer, then add
              stackSize = pointer + 1 + 1;
              pointer = stackSize - 1;
            } else if (op === 'undo' && pointer >= 0) {
              history.undo();
              pointer--;
            } else if (op === 'redo' && pointer < stackSize - 1) {
              history.redo();
              pointer++;
            }
          }

          // canUndo iff pointer >= 0 (at least one command below or at pointer)
          expect(history.canUndo).toBe(pointer >= 0);
          // canRedo iff pointer < stackSize - 1
          expect(history.canRedo).toBe(pointer < stackSize - 1);
        }
      ),
      { numRuns: 100 }
    );
  });
});
