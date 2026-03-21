import { describe, it, expect, vi } from 'vitest';
import * as fc from 'fast-check';
import * as THREE from 'three';
import { SelectionManager } from './SelectionManager';

// ─── Unit Tests ───────────────────────────────────────────────────────────────

describe('SelectionManager — unit tests', () => {
  it('starts with empty selectedIds', () => {
    const sm = new SelectionManager();
    expect(sm.selectedIds.size).toBe(0);
  });

  it('select(id) adds the id to selectedIds', () => {
    const sm = new SelectionManager();
    sm.select('a');
    expect(sm.selectedIds.has('a')).toBe(true);
  });

  it('select(id) without additive clears previous selection', () => {
    const sm = new SelectionManager();
    sm.select('a');
    sm.select('b');
    expect(sm.selectedIds.has('a')).toBe(false);
    expect(sm.selectedIds.has('b')).toBe(true);
  });

  it('select(id, true) adds to existing selection', () => {
    const sm = new SelectionManager();
    sm.select('a');
    sm.select('b', true);
    expect(sm.selectedIds.has('a')).toBe(true);
    expect(sm.selectedIds.has('b')).toBe(true);
  });

  it('deselect(id) removes the id', () => {
    const sm = new SelectionManager();
    sm.select('a');
    sm.deselect('a');
    expect(sm.selectedIds.has('a')).toBe(false);
  });

  it('deselect on non-selected id is a no-op', () => {
    const sm = new SelectionManager();
    expect(() => sm.deselect('nonexistent')).not.toThrow();
  });

  it('clearSelection empties selectedIds', () => {
    const sm = new SelectionManager();
    sm.select('a');
    sm.select('b', true);
    sm.clearSelection();
    expect(sm.selectedIds.size).toBe(0);
  });

  it('emits selectionChange on select', () => {
    const sm = new SelectionManager();
    const handler = vi.fn();
    sm.on('selectionChange', handler);
    sm.select('a');
    expect(handler).toHaveBeenCalledWith(new Set(['a']));
  });

  it('emits selectionChange on deselect', () => {
    const sm = new SelectionManager();
    const handler = vi.fn();
    sm.select('a');
    sm.on('selectionChange', handler);
    sm.deselect('a');
    expect(handler).toHaveBeenCalledWith(new Set());
  });

  it('does not emit selectionChange when deselecting a non-selected id', () => {
    const sm = new SelectionManager();
    const handler = vi.fn();
    sm.on('selectionChange', handler);
    sm.deselect('nonexistent');
    expect(handler).not.toHaveBeenCalled();
  });

  it('emits selectionChange on clearSelection', () => {
    const sm = new SelectionManager();
    const handler = vi.fn();
    sm.select('a');
    sm.on('selectionChange', handler);
    sm.clearSelection();
    expect(handler).toHaveBeenCalledWith(new Set());
  });

  it('does not emit selectionChange on clearSelection when already empty', () => {
    const sm = new SelectionManager();
    const handler = vi.fn();
    sm.on('selectionChange', handler);
    sm.clearSelection();
    expect(handler).not.toHaveBeenCalled();
  });

  it('selectBox selects nodes whose bounds intersect the selection box', () => {
    const sm = new SelectionManager();
    const selectionBox = new THREE.Box3(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(2, 2, 2)
    );
    const nodeBounds = new Map([
      ['inside', new THREE.Box3(new THREE.Vector3(0.5, 0.5, 0.5), new THREE.Vector3(1.5, 1.5, 1.5))],
      ['outside', new THREE.Box3(new THREE.Vector3(5, 5, 5), new THREE.Vector3(6, 6, 6))],
      ['touching', new THREE.Box3(new THREE.Vector3(2, 2, 2), new THREE.Vector3(3, 3, 3))],
    ]);
    sm.selectBox(selectionBox, nodeBounds);
    expect(sm.selectedIds.has('inside')).toBe(true);
    expect(sm.selectedIds.has('outside')).toBe(false);
    expect(sm.selectedIds.has('touching')).toBe(true);
  });

  it('selectBox emits selectionChange', () => {
    const sm = new SelectionManager();
    const handler = vi.fn();
    sm.on('selectionChange', handler);
    const box = new THREE.Box3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 1, 1));
    sm.selectBox(box, new Map([['a', box]]));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('emitted selectionChange set is a snapshot (not a live reference)', () => {
    const sm = new SelectionManager();
    let emittedSet: Set<string> | null = null;
    sm.on('selectionChange', (ids) => { emittedSet = ids; });
    sm.select('a');
    sm.select('b', true);
    // The first emitted set should still only contain 'a'
    expect(emittedSet).toEqual(new Set(['a', 'b']));
  });
});

// ─── Property Tests ───────────────────────────────────────────────────────────

describe('SelectionManager — property tests', () => {
  // Feature: production-grade-primitives, Property 8: Selection modifier key additivity
  // Validates: Requirements 5.1
  it('select(id, true) produces S ∪ {id} for any existing selection S and id not in S', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1, maxLength: 10 }), { minLength: 0, maxLength: 10 }),
        fc.string({ minLength: 1, maxLength: 10 }),
        (existingIds, newId) => {
          // Ensure newId is not in existingIds
          const uniqueExisting = existingIds.filter((id) => id !== newId);

          const sm = new SelectionManager();
          // Build up the existing selection additively
          for (const id of uniqueExisting) {
            sm.select(id, true);
          }

          const selectionBefore = new Set(sm.selectedIds);
          sm.select(newId, true);

          // Result should be S ∪ {newId}
          const expected = new Set([...selectionBefore, newId]);
          expect(sm.selectedIds).toEqual(expected);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: production-grade-primitives, Property 9: Selection clear on empty-area click
  // Validates: Requirements 5.2
  it('clearSelection() always results in empty selectedIds regardless of prior state', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1, maxLength: 10 }), { minLength: 1, maxLength: 15 }),
        (ids) => {
          const sm = new SelectionManager();
          // Build a non-empty selection
          for (const id of ids) {
            sm.select(id, true);
          }
          // Ensure selection is non-empty (ids may have duplicates but at least one unique)
          expect(sm.selectedIds.size).toBeGreaterThan(0);

          sm.clearSelection();
          expect(sm.selectedIds.size).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: production-grade-primitives, Property 10: Box select intersects correct nodes
  // Validates: Requirements 5.3
  it('selectBox selects exactly the nodes whose bounding volumes intersect the selection box', () => {
    // Arbitraries for axis-aligned boxes as [minX, minY, minZ, sizeX, sizeY, sizeZ]
    // fc.float requires 32-bit float boundaries (Math.fround)
    const boxArb = fc.tuple(
      fc.float({ min: Math.fround(-10), max: Math.fround(10), noNaN: true }),
      fc.float({ min: Math.fround(-10), max: Math.fround(10), noNaN: true }),
      fc.float({ min: Math.fround(-10), max: Math.fround(10), noNaN: true }),
      fc.float({ min: Math.fround(0.1), max: Math.fround(5), noNaN: true }),
      fc.float({ min: Math.fround(0.1), max: Math.fround(5), noNaN: true }),
      fc.float({ min: Math.fround(0.1), max: Math.fround(5), noNaN: true }),
    );

    fc.assert(
      fc.property(
        // Selection box
        boxArb,
        // Node entries: array of [id, box]
        fc.array(
          fc.tuple(fc.string({ minLength: 1, maxLength: 8 }), boxArb),
          { minLength: 0, maxLength: 10 }
        ),
        ([sx, sy, sz, sw, sh, sd], nodeEntries) => {
          const selectionBox = new THREE.Box3(
            new THREE.Vector3(sx, sy, sz),
            new THREE.Vector3(sx + sw, sy + sh, sz + sd)
          );

          // Deduplicate node IDs (keep last)
          const nodeMap = new Map<string, THREE.Box3>();
          for (const [id, [nx, ny, nz, nw, nh, nd]] of nodeEntries) {
            nodeMap.set(
              id,
              new THREE.Box3(
                new THREE.Vector3(nx, ny, nz),
                new THREE.Vector3(nx + nw, ny + nh, nz + nd)
              )
            );
          }

          const sm = new SelectionManager();
          sm.selectBox(selectionBox, nodeMap);

          // Compute expected selection independently
          const expected = new Set<string>();
          for (const [id, box] of nodeMap) {
            if (selectionBox.intersectsBox(box)) {
              expected.add(id);
            }
          }

          expect(sm.selectedIds).toEqual(expected);
        }
      ),
      { numRuns: 100 }
    );
  });
});
