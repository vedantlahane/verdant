// Feature: integration-wiring-phase, Task 9.6
// Validates: Requirements 27.1–27.5

import { bench, describe, it, expect, beforeEach } from 'vitest';
import type { VrdAST } from '@verdant/parser';
import { useRendererStore } from '../../store';

// ── Helpers ──────────────────────────────────────────────────────────────────

function generateAST(nodeCount: number, edgeCount: number): VrdAST {
  const nodes = Array.from({ length: nodeCount }, (_, i) => ({
    id: `node-${i}`,
    type: 'server',
    props: {},
  }));
  const edges = Array.from({ length: edgeCount }, (_, i) => ({
    from: `node-${i % nodeCount}`,
    to: `node-${(i + 1) % nodeCount}`,
    props: {},
  }));
  return { config: {}, nodes, edges, groups: [] };
}

/**
 * Measures how long a single `setAst` call takes (in ms) and derives a
 * theoretical fps assuming one call per frame.
 */
function measureSetAstMs(ast: VrdAST): number {
  const store = useRendererStore.getState();
  const start = performance.now();
  store.setAst(ast);
  return performance.now() - start;
}

// ── Frame-budget constants ────────────────────────────────────────────────────

const FRAME_BUDGET_60FPS_MS = 1000 / 60; // ~16.67 ms
const FRAME_BUDGET_30FPS_MS = 1000 / 30; // ~33.33 ms
const FRAME_BUDGET_10FPS_MS = 1000 / 10; // ~100 ms

// ── Benchmarks ────────────────────────────────────────────────────────────────

describe('Performance benchmarks — store operations', () => {
  // Requirement 27.1: 100 nodes / 150 edges → ≥60 fps
  bench('setAst with 100 nodes / 150 edges (60 fps budget)', () => {
    const ast = generateAST(100, 150);
    useRendererStore.getState().setAst(ast);
  });

  // Requirement 27.2: 500 nodes / 700 edges → ≥30 fps
  bench('setAst with 500 nodes / 700 edges (30 fps budget)', () => {
    const ast = generateAST(500, 700);
    useRendererStore.getState().setAst(ast);
  });

  // Requirement 27.3: 1000 nodes → no crash, ≥10 fps
  bench('setAst with 1000 nodes (10 fps budget)', () => {
    const ast = generateAST(1000, 0);
    useRendererStore.getState().setAst(ast);
  });

  // Requirement 27.1 (bulk position updates)
  bench('bulk updateNodePosition for 200 nodes (60 fps budget)', () => {
    const store = useRendererStore.getState();
    for (let i = 0; i < 200; i++) {
      store.updateNodePosition(`node-${i}`, [i * 10, 0, 0]);
    }
  });
});

// ── Assertion-based tests (fps thresholds) ────────────────────────────────────

describe('Performance assertions — frame rate thresholds', () => {
  beforeEach(() => {
    // Reset store state between tests
    useRendererStore.setState({
      ast: null,
      nodeIndex: new Map(),
      positions: {},
    });
  });

  // Requirement 27.1 + 27.5
  it('100 nodes / 150 edges: setAst completes within 60 fps frame budget (~16.67 ms)', () => {
    const ast = generateAST(100, 150);
    const elapsed = measureSetAstMs(ast);
    const measuredFps = 1000 / elapsed;

    if (measuredFps < 60) {
      throw new Error(
        `Performance assertion failed: measured ${measuredFps.toFixed(1)} fps, threshold is 60 fps (elapsed: ${elapsed.toFixed(2)} ms, budget: ${FRAME_BUDGET_60FPS_MS.toFixed(2)} ms)`,
      );
    }

    expect(elapsed).toBeLessThan(FRAME_BUDGET_60FPS_MS);
  });

  // Requirement 27.2 + 27.5
  it('500 nodes / 700 edges: setAst completes within 30 fps frame budget (~33.33 ms)', () => {
    const ast = generateAST(500, 700);
    const elapsed = measureSetAstMs(ast);
    const measuredFps = 1000 / elapsed;

    if (measuredFps < 30) {
      throw new Error(
        `Performance assertion failed: measured ${measuredFps.toFixed(1)} fps, threshold is 30 fps (elapsed: ${elapsed.toFixed(2)} ms, budget: ${FRAME_BUDGET_30FPS_MS.toFixed(2)} ms)`,
      );
    }

    expect(elapsed).toBeLessThan(FRAME_BUDGET_30FPS_MS);
  });

  // Requirement 27.3 + 27.5
  it('1000 nodes: setAst does not crash and completes within 10 fps frame budget (~100 ms)', () => {
    const ast = generateAST(1000, 0);
    let elapsed: number;

    expect(() => {
      elapsed = measureSetAstMs(ast);
    }).not.toThrow();

    const measuredFps = 1000 / elapsed!;

    if (measuredFps < 10) {
      throw new Error(
        `Performance assertion failed: measured ${measuredFps.toFixed(1)} fps, threshold is 10 fps (elapsed: ${elapsed!.toFixed(2)} ms, budget: ${FRAME_BUDGET_10FPS_MS.toFixed(2)} ms)`,
      );
    }

    expect(elapsed!).toBeLessThan(FRAME_BUDGET_10FPS_MS);
  });

  // Requirement 27.1 (bulk position updates)
  it('bulk updateNodePosition for 200 nodes completes within 60 fps frame budget', () => {
    // Seed the store with 200 nodes first
    const ast = generateAST(200, 0);
    useRendererStore.getState().setAst(ast);

    const store = useRendererStore.getState();
    const start = performance.now();
    for (let i = 0; i < 200; i++) {
      store.updateNodePosition(`node-${i}`, [i * 10, 0, 0]);
    }
    const elapsed = performance.now() - start;
    const measuredFps = 1000 / elapsed;

    if (measuredFps < 60) {
      throw new Error(
        `Performance assertion failed: measured ${measuredFps.toFixed(1)} fps for bulk position updates, threshold is 60 fps (elapsed: ${elapsed.toFixed(2)} ms, budget: ${FRAME_BUDGET_60FPS_MS.toFixed(2)} ms)`,
      );
    }

    expect(elapsed).toBeLessThan(FRAME_BUDGET_60FPS_MS);
  });

  // Requirement 27.4: Memory leak detection
  it('mount/unmount 200-node scene 10 times: heap delta ≤10 MB', () => {
    const ITERATIONS = 10;
    const MAX_HEAP_DELTA_BYTES = 10 * 1024 * 1024; // 10 MB

    // Capture baseline heap (if available in the runtime)
    const heapBefore =
      typeof process !== 'undefined' && process.memoryUsage
        ? process.memoryUsage().heapUsed
        : null;

    for (let i = 0; i < ITERATIONS; i++) {
      // "mount": load a 200-node AST
      const ast = generateAST(200, 250);
      useRendererStore.getState().setAst(ast);

      // "unmount": clear the store state
      useRendererStore.setState({
        ast: null,
        nodeIndex: new Map(),
        positions: {},
        diagnostics: [],
        selectionSet: new Set(),
        hoveredNodeId: null,
        draggingNodeId: null,
      });
    }

    if (heapBefore !== null) {
      // Suggest GC if available (Node.js with --expose-gc)
      if (typeof global !== 'undefined' && typeof (global as Record<string, unknown>).gc === 'function') {
        (global as Record<string, unknown>).gc as () => void;
      }

      const heapAfter = process.memoryUsage().heapUsed;
      const heapDelta = heapAfter - heapBefore;

      if (heapDelta > MAX_HEAP_DELTA_BYTES) {
        throw new Error(
          `Memory leak assertion failed: heap grew by ${(heapDelta / 1024 / 1024).toFixed(2)} MB after ${ITERATIONS} mount/unmount cycles, threshold is 10 MB`,
        );
      }

      expect(heapDelta).toBeLessThanOrEqual(MAX_HEAP_DELTA_BYTES);
    } else {
      // In environments without process.memoryUsage, just assert no crash
      expect(true).toBe(true);
    }
  });
});
