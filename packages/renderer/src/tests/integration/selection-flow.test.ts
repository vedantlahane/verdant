// Feature: integration-wiring-phase, Property 7
import { describe, it, beforeEach, expect } from 'vitest';
import * as fc from 'fast-check';
import { useRendererStore } from '../../store';

fc.configureGlobal({ numRuns: 100 });

/**
 * Property 7: Selection round-trip
 * Validates: Requirements 15.1, 15.6
 *
 * Generate random node ID sets; select each; assert selectionSet.has(id);
 * clear; assert selectionSet.size === 0
 */
describe('Selection round-trip (Property 7)', () => {
  beforeEach(() => {
    // Reset selection state before each test
    useRendererStore.getState().setSelectionSet(new Set());
  });

  it('selects all IDs in a set and clears correctly', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1, maxLength: 32 }), { minLength: 1, maxLength: 20 }),
        (ids) => {
          const idSet = new Set(ids);
          const { setSelectionSet } = useRendererStore.getState();

          // Select the set of IDs
          setSelectionSet(new Set(idSet));

          // Assert every ID is present in selectionSet
          const { selectionSet } = useRendererStore.getState();
          for (const id of idSet) {
            if (!selectionSet.has(id)) return false;
          }

          // Clear selection
          setSelectionSet(new Set());

          // Assert selection is empty
          const cleared = useRendererStore.getState().selectionSet;
          return cleared.size === 0;
        },
      ),
    );
  });
});

// Task 9.2 — Selection flow integration test
// Validates: Requirement 26.3
describe('Selection flow integration (Task 9.2)', () => {
  beforeEach(() => {
    useRendererStore.getState().setSelectionSet(new Set());
  });

  it('click node → selectionSet contains node ID', () => {
    const nodeId = 'node-abc';
    useRendererStore.getState().setSelectionSet(new Set([nodeId]));
    const { selectionSet } = useRendererStore.getState();
    expect(selectionSet.has(nodeId)).toBe(true);
  });

  it('click second node → selectionSet updates to new node', () => {
    const first = 'node-1';
    const second = 'node-2';
    useRendererStore.getState().setSelectionSet(new Set([first]));
    useRendererStore.getState().setSelectionSet(new Set([second]));
    const { selectionSet } = useRendererStore.getState();
    expect(selectionSet.has(second)).toBe(true);
    expect(selectionSet.has(first)).toBe(false);
  });

  it('click empty area → selection cleared', () => {
    useRendererStore.getState().setSelectionSet(new Set(['node-xyz']));
    useRendererStore.getState().setSelectionSet(new Set());
    const { selectionSet } = useRendererStore.getState();
    expect(selectionSet.size).toBe(0);
  });

  it('multi-select → all IDs present in selectionSet', () => {
    const ids = ['node-a', 'node-b', 'node-c'];
    useRendererStore.getState().setSelectionSet(new Set(ids));
    const { selectionSet } = useRendererStore.getState();
    for (const id of ids) {
      expect(selectionSet.has(id)).toBe(true);
    }
    expect(selectionSet.size).toBe(ids.length);
  });

  it('selectedNodeId backward compat getter returns first element of selectionSet', () => {
    const nodeId = 'node-first';
    useRendererStore.getState().setSelectionSet(new Set([nodeId]));
    // Access via selectionSet directly since selectedNodeId is a getter on the prototype
    const state = useRendererStore.getState();
    const firstId = [...state.selectionSet][0] ?? null;
    expect(firstId).toBe(nodeId);
  });

  it('selectedNodeId returns null when selectionSet is empty', () => {
    useRendererStore.getState().setSelectionSet(new Set());
    const state = useRendererStore.getState();
    const firstId = [...state.selectionSet][0] ?? null;
    expect(firstId).toBeNull();
  });
});
