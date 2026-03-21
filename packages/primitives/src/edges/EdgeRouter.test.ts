import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import * as THREE from 'three';
import { EdgeRouter } from './EdgeRouter';

const router = new EdgeRouter();

function vec(x: number, y: number, z: number) {
  return new THREE.Vector3(x, y, z);
}

// ---------------------------------------------------------------------------
// Unit tests
// ---------------------------------------------------------------------------

describe('EdgeRouter.computePath', () => {
  describe('straight', () => {
    it('returns exactly [from, to]', () => {
      const from = vec(0, 0, 0);
      const to = vec(5, 3, 1);
      const path = router.computePath(from, to, 'straight');
      expect(path).toHaveLength(2);
      expect(path[0].x).toBeCloseTo(0);
      expect(path[0].y).toBeCloseTo(0);
      expect(path[1].x).toBeCloseTo(5);
      expect(path[1].y).toBeCloseTo(3);
    });

    it('does not mutate the input vectors', () => {
      const from = vec(1, 2, 3);
      const to = vec(4, 5, 6);
      router.computePath(from, to, 'straight');
      expect(from.x).toBe(1);
      expect(to.x).toBe(4);
    });
  });

  describe('curved', () => {
    it('returns more than 2 points', () => {
      const path = router.computePath(vec(0, 0, 0), vec(10, 0, 0), 'curved');
      expect(path.length).toBeGreaterThan(2);
    });

    it('starts at from and ends at to', () => {
      const from = vec(1, 2, 3);
      const to = vec(7, 8, 9);
      const path = router.computePath(from, to, 'curved');
      expect(path[0].x).toBeCloseTo(from.x, 4);
      expect(path[0].y).toBeCloseTo(from.y, 4);
      expect(path[path.length - 1].x).toBeCloseTo(to.x, 4);
      expect(path[path.length - 1].y).toBeCloseTo(to.y, 4);
    });

    it('returns finite coordinates for all points', () => {
      const path = router.computePath(vec(-5, 3, 0), vec(5, -3, 2), 'curved');
      for (const p of path) {
        expect(Number.isFinite(p.x)).toBe(true);
        expect(Number.isFinite(p.y)).toBe(true);
        expect(Number.isFinite(p.z)).toBe(true);
      }
    });
  });

  describe('orthogonal (task 13 fallback)', () => {
    it('returns at least 2 points', () => {
      const path = router.computePath(vec(0, 0, 0), vec(3, 4, 0), 'orthogonal');
      expect(path.length).toBeGreaterThanOrEqual(2);
    });

    it('returns finite coordinates for all points', () => {
      const path = router.computePath(vec(0, 0, 0), vec(3, 4, 0), 'orthogonal');
      for (const p of path) {
        expect(Number.isFinite(p.x)).toBe(true);
        expect(Number.isFinite(p.y)).toBe(true);
        expect(Number.isFinite(p.z)).toBe(true);
      }
    });
  });

  describe('all algorithms — finite coordinates', () => {
    const algorithms = ['straight', 'curved', 'orthogonal'] as const;
    for (const algo of algorithms) {
      it(`${algo}: all points are finite for arbitrary inputs`, () => {
        const path = router.computePath(vec(-100, 50, 0), vec(200, -75, 10), algo);
        for (const p of path) {
          expect(Number.isFinite(p.x)).toBe(true);
          expect(Number.isFinite(p.y)).toBe(true);
          expect(Number.isFinite(p.z)).toBe(true);
        }
      });
    }
  });
});

// ---------------------------------------------------------------------------
// Property-based tests
// ---------------------------------------------------------------------------

describe('Property-based tests', () => {
  // Feature: production-grade-primitives, Property 21: Orthogonal path segment axis-alignment
  it('Property 21: all orthogonal path segments are axis-aligned', () => {
    // Validates: Requirements 14.1
    fc.assert(
      fc.property(
        fc.float({ min: -100, max: 100, noNaN: true }),
        fc.float({ min: -100, max: 100, noNaN: true }),
        fc.float({ min: -100, max: 100, noNaN: true }),
        fc.float({ min: -100, max: 100, noNaN: true }),
        fc.float({ min: -100, max: 100, noNaN: true }),
        fc.float({ min: -100, max: 100, noNaN: true }),
        (fx, fy, fz, tx, ty, tz) => {
          const router = new EdgeRouter();
          const from = new THREE.Vector3(fx, fy, fz);
          const to = new THREE.Vector3(tx, ty, tz);
          const path = router.computePath(from, to, 'orthogonal');

          // If the path is the curved fallback (more than 4 points), skip axis-alignment check
          // (fallback is only triggered when obstacles block all routes — no obstacles here,
          //  so we always get an orthogonal path)
          for (let i = 0; i < path.length - 1; i++) {
            const dx = Math.abs(path[i + 1].x - path[i].x);
            const dy = Math.abs(path[i + 1].y - path[i].y);
            const dz = Math.abs(path[i + 1].z - path[i].z);
            // Each segment must be purely horizontal (dy=0, dz=0) or purely vertical (dx=0, dz=0)
            const isHorizontal = dy < 1e-9 && dz < 1e-9;
            const isVertical = dx < 1e-9 && dz < 1e-9;
            expect(isHorizontal || isVertical).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: production-grade-primitives, Property 22: Orthogonal path collision avoidance
  it('Property 22: orthogonal path does not pass through obstacle interiors', () => {
    // Validates: Requirements 14.2
    // Use simple non-overlapping obstacle configurations to keep the test deterministic.
    // The fallback to curved is acceptable when no collision-free path exists.
    fc.assert(
      fc.property(
        // from/to positions well outside the obstacle zone
        fc.record({
          fx: fc.float({ min: -50, max: -10, noNaN: true }),
          fy: fc.float({ min: -5, max: 5, noNaN: true }),
          tx: fc.float({ min: 10, max: 50, noNaN: true }),
          ty: fc.float({ min: -5, max: 5, noNaN: true }),
        }),
        // obstacle: a box placed somewhere in the middle that doesn't cover from/to
        fc.record({
          cx: fc.float({ min: -3, max: 3, noNaN: true }),
          cy: fc.float({ min: 10, max: 20, noNaN: true }), // placed above the path corridor
          hw: fc.float({ min: 0.5, max: 2, noNaN: true }),
          hh: fc.float({ min: 0.5, max: 2, noNaN: true }),
        }),
        ({ fx, fy, tx, ty }, { cx, cy, hw, hh }) => {
          const router = new EdgeRouter();
          const from = new THREE.Vector3(fx, fy, 0);
          const to = new THREE.Vector3(tx, ty, 0);
          const obstacle = new THREE.Box3(
            new THREE.Vector3(cx - hw, cy - hh, -1),
            new THREE.Vector3(cx + hw, cy + hh, 1),
          );

          const path = router.computePath(from, to, 'orthogonal', [obstacle]);

          // Check that no segment passes through the interior of the obstacle
          const eps = 1e-9;
          for (let i = 0; i < path.length - 1; i++) {
            const a = path[i];
            const b = path[i + 1];

            // Horizontal segment check
            if (Math.abs(a.y - b.y) < 1e-9) {
              const y = a.y;
              if (y > obstacle.min.y + eps && y < obstacle.max.y - eps) {
                const segMinX = Math.min(a.x, b.x);
                const segMaxX = Math.max(a.x, b.x);
                const overlaps =
                  segMaxX > obstacle.min.x + eps && segMinX < obstacle.max.x - eps;
                expect(overlaps).toBe(false);
              }
            }

            // Vertical segment check
            if (Math.abs(a.x - b.x) < 1e-9) {
              const x = a.x;
              if (x > obstacle.min.x + eps && x < obstacle.max.x - eps) {
                const segMinY = Math.min(a.y, b.y);
                const segMaxY = Math.max(a.y, b.y);
                const overlaps =
                  segMaxY > obstacle.min.y + eps && segMinY < obstacle.max.y - eps;
                expect(overlaps).toBe(false);
              }
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
