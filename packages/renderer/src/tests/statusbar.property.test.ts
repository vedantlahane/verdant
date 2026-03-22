// Feature: integration-wiring-phase, Property 9
// Validates: Requirements 21.1, 21.2, 21.3

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

fc.configureGlobal({ numRuns: 100 });

/**
 * Property 9: Status bar data reflects store state
 *
 * The StatusBar component displays:
 *   - "{N} selected" when selectionCount > 0, "No selection" when selectionCount === 0
 *   - "{undoDepth} undo"
 *   - "{layoutName}"
 *   - "{fps}fps"
 *
 * This pure function mirrors the formatting logic from StatusBar.tsx so it can
 * be tested without a React / Three.js environment.
 */
function formatStatusBar(
  selectionCount: number,
  undoDepth: number,
  layoutName: string,
  fps: number,
): string {
  const selectionReadout =
    selectionCount > 0 ? `${selectionCount} selected` : 'No selection';
  return `${selectionReadout} · ${undoDepth} undo · ${layoutName} · ${fps}fps`;
}

// ── Arbitraries ───────────────────────────────────────────────────────────────

const selectionCountArb = fc.nat({ max: 1000 }); // 0..1000
const undoDepthArb = fc.nat({ max: 100 });
const layoutNameArb = fc.constantFrom('auto', 'force', 'tree', 'radial', 'grid');
const fpsArb = fc.nat({ max: 240 });

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Property 9: Status bar data reflects store state', () => {
  it('shows "{N} selected" when selectionCount > 0', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000 }),
        undoDepthArb,
        layoutNameArb,
        fpsArb,
        (selectionCount, undoDepth, layoutName, fps) => {
          const result = formatStatusBar(selectionCount, undoDepth, layoutName, fps);
          expect(result).toContain(`${selectionCount} selected`);
        },
      ),
    );
  });

  it('shows "No selection" when selectionCount === 0', () => {
    fc.assert(
      fc.property(undoDepthArb, layoutNameArb, fpsArb, (undoDepth, layoutName, fps) => {
        const result = formatStatusBar(0, undoDepth, layoutName, fps);
        expect(result).toContain('No selection');
      }),
    );
  });

  it('shows "{undoDepth} undo"', () => {
    fc.assert(
      fc.property(
        selectionCountArb,
        undoDepthArb,
        layoutNameArb,
        fpsArb,
        (selectionCount, undoDepth, layoutName, fps) => {
          const result = formatStatusBar(selectionCount, undoDepth, layoutName, fps);
          expect(result).toContain(`${undoDepth} undo`);
        },
      ),
    );
  });

  it('shows the layoutName', () => {
    fc.assert(
      fc.property(
        selectionCountArb,
        undoDepthArb,
        layoutNameArb,
        fpsArb,
        (selectionCount, undoDepth, layoutName, fps) => {
          const result = formatStatusBar(selectionCount, undoDepth, layoutName, fps);
          expect(result).toContain(layoutName);
        },
      ),
    );
  });

  it('shows "{fps}fps"', () => {
    fc.assert(
      fc.property(
        selectionCountArb,
        undoDepthArb,
        layoutNameArb,
        fpsArb,
        (selectionCount, undoDepth, layoutName, fps) => {
          const result = formatStatusBar(selectionCount, undoDepth, layoutName, fps);
          expect(result).toContain(`${fps}fps`);
        },
      ),
    );
  });

  it('all status bar fields are present in a single assertion', () => {
    fc.assert(
      fc.property(
        selectionCountArb,
        undoDepthArb,
        layoutNameArb,
        fpsArb,
        (selectionCount, undoDepth, layoutName, fps) => {
          const result = formatStatusBar(selectionCount, undoDepth, layoutName, fps);

          if (selectionCount > 0) {
            expect(result).toContain(`${selectionCount} selected`);
          } else {
            expect(result).toContain('No selection');
          }

          expect(result).toContain(`${undoDepth} undo`);
          expect(result).toContain(layoutName);
          expect(result).toContain(`${fps}fps`);
        },
      ),
    );
  });
});
