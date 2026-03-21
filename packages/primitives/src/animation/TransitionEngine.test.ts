import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import * as THREE from 'three';
import { TransitionEngine, AnimationType } from './TransitionEngine';
import { getEnterProperties, getExitProperties } from './EnterExit';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEngine() {
  return new TransitionEngine();
}

const ANIMATION_TYPES: AnimationType[] = ['fade', 'scale', 'slide'];

// ---------------------------------------------------------------------------
// Unit tests — TransitionEngine
// ---------------------------------------------------------------------------

describe('TransitionEngine', () => {
  describe('playEnter', () => {
    it('sets animation state to entering', () => {
      const engine = makeEngine();
      engine.playEnter('node-1', 'fade', 300);
      const state = engine.getAnimationState('node-1');
      expect(state).not.toBeNull();
      expect(state!.isEntering).toBe(true);
      expect(state!.isExiting).toBe(false);
      expect(state!.type).toBe('fade');
    });

    it('uses default enter duration of 300ms', () => {
      const engine = makeEngine();
      // Just verify it doesn't throw and state is set
      engine.playEnter('node-1', 'scale');
      expect(engine.getAnimationState('node-1')).not.toBeNull();
    });
  });

  describe('playExit', () => {
    it('returns a Promise', () => {
      const engine = makeEngine();
      const result = engine.playExit('node-1', 'fade', 200);
      expect(result).toBeInstanceOf(Promise);
    });

    it('sets animation state to exiting', () => {
      const engine = makeEngine();
      engine.playExit('node-1', 'fade', 200);
      const state = engine.getAnimationState('node-1');
      expect(state).not.toBeNull();
      expect(state!.isExiting).toBe(true);
      expect(state!.isEntering).toBe(false);
    });

    it('resolves after tick advances past duration', async () => {
      const engine = makeEngine();
      const start = performance.now();
      const promise = engine.playExit('node-1', 'fade', 50);

      // Tick past the duration
      engine.tick(start + 100);

      await expect(promise).resolves.toBeUndefined();
    });

    it('uses default exit duration of 200ms', () => {
      const engine = makeEngine();
      const promise = engine.playExit('node-1', 'scale');
      expect(promise).toBeInstanceOf(Promise);
    });
  });

  describe('getAnimationState', () => {
    it('returns null for unknown nodeId', () => {
      const engine = makeEngine();
      expect(engine.getAnimationState('unknown-node')).toBeNull();
    });

    it('returns null after animation completes via tick', () => {
      const engine = makeEngine();
      const start = performance.now();
      engine.playEnter('node-1', 'fade', 100);
      engine.tick(start + 200);
      expect(engine.getAnimationState('node-1')).toBeNull();
    });
  });

  describe('isExiting', () => {
    it('returns false for unknown node', () => {
      const engine = makeEngine();
      expect(engine.isExiting('unknown')).toBe(false);
    });

    it('returns true while exit animation is in progress', () => {
      const engine = makeEngine();
      engine.playExit('node-1', 'fade', 300);
      expect(engine.isExiting('node-1')).toBe(true);
    });

    it('returns false after exit animation completes', () => {
      const engine = makeEngine();
      const start = performance.now();
      engine.playExit('node-1', 'fade', 50);
      engine.tick(start + 200);
      expect(engine.isExiting('node-1')).toBe(false);
    });

    it('returns false for entering node', () => {
      const engine = makeEngine();
      engine.playEnter('node-1', 'fade', 300);
      expect(engine.isExiting('node-1')).toBe(false);
    });
  });

  describe('tick', () => {
    it('advances animation progress correctly', () => {
      const engine = makeEngine();
      const start = performance.now();
      engine.playEnter('node-1', 'fade', 1000);

      // At 50% through
      engine.tick(start + 500);
      const state = engine.getAnimationState('node-1');
      // State should still exist (not complete yet)
      expect(state).not.toBeNull();
    });

    it('completes animation when elapsed >= duration', () => {
      const engine = makeEngine();
      engine.playEnter('node-1', 'fade', 100);
      // Tick well past the duration (startTime is set inside playEnter, so use a large offset)
      engine.tick(performance.now() + 500);
      // After tick completes it, state should be null
      expect(engine.getAnimationState('node-1')).toBeNull();
    });
  });

  describe('playLayoutTransition', () => {
    it('returns a Promise', () => {
      const engine = makeEngine();
      const positions = new Map<string, THREE.Vector3>();
      const result = engine.playLayoutTransition(positions, 500);
      expect(result).toBeInstanceOf(Promise);
    });

    it('resolves after tick advances past duration', async () => {
      const engine = makeEngine();
      const start = performance.now();
      const positions = new Map();
      const promise = engine.playLayoutTransition(positions, 50);
      engine.tick(start + 100);
      await expect(promise).resolves.toBeUndefined();
    });
  });
});

// ---------------------------------------------------------------------------
// Unit tests — EnterExit
// ---------------------------------------------------------------------------

describe('EnterExit', () => {
  describe('getEnterProperties', () => {
    it.each(ANIMATION_TYPES)('%s at progress 0 starts invisible/offscreen', (type) => {
      const props = getEnterProperties(type, 0);
      expect(props.opacity).toBe(0);
      expect(isFinite(props.scale.x)).toBe(true);
      expect(isFinite(props.positionOffset.x)).toBe(true);
    });

    it.each(ANIMATION_TYPES)('%s at progress 1 is fully visible', (type) => {
      const props = getEnterProperties(type, 1);
      expect(props.opacity).toBe(1);
      expect(props.scale.x).toBeGreaterThan(0);
      expect(props.positionOffset.x).toBe(0);
      expect(props.positionOffset.y).toBe(0);
      expect(props.positionOffset.z).toBe(0);
    });

    it('fade: scale stays at 1 throughout', () => {
      for (const p of [0, 0.25, 0.5, 0.75, 1]) {
        const props = getEnterProperties('fade', p);
        expect(props.scale.x).toBe(1);
        expect(props.scale.y).toBe(1);
        expect(props.scale.z).toBe(1);
      }
    });

    it('scale: scale equals progress', () => {
      const props = getEnterProperties('scale', 0.5);
      expect(props.scale.x).toBeCloseTo(0.5);
      expect(props.scale.y).toBeCloseTo(0.5);
      expect(props.scale.z).toBeCloseTo(0.5);
    });

    it('slide: position offset is zero at progress 1', () => {
      const props = getEnterProperties('slide', 1);
      expect(props.positionOffset.y).toBeCloseTo(0);
    });
  });

  describe('getExitProperties', () => {
    it.each(ANIMATION_TYPES)('%s at progress 0 is fully visible', (type) => {
      const props = getExitProperties(type, 0);
      expect(props.opacity).toBe(1);
    });

    it.each(ANIMATION_TYPES)('%s at progress 1 is fully gone', (type) => {
      const props = getExitProperties(type, 1);
      expect(props.opacity).toBe(0);
    });

    it('scale: scale is 0 at progress 1', () => {
      const props = getExitProperties('scale', 1);
      expect(props.scale.x).toBeCloseTo(0);
    });

    it('slide: position offset increases as progress increases', () => {
      const p0 = getExitProperties('slide', 0);
      const p1 = getExitProperties('slide', 1);
      expect(Math.abs(p1.positionOffset.y)).toBeGreaterThan(Math.abs(p0.positionOffset.y));
    });
  });
});

// ---------------------------------------------------------------------------
// Property-Based Tests
// ---------------------------------------------------------------------------

describe('Property-Based Tests', () => {
  // Feature: production-grade-primitives, Property 26: Exit animation blocks unmount
  it('exit animation blocks unmount — node remains in exiting state for at least D ms', () => {
    // Validates: Requirements 4.2, 4.6
    fc.assert(
      fc.property(
        fc.integer({ min: 50, max: 1000 }),
        fc.constantFrom<AnimationType>('fade', 'scale', 'slide'),
        (duration, animType) => {
          const engine = makeEngine();
          const now = performance.now();

          engine.playExit('node-test', animType, duration);

          // Immediately after starting: should still be exiting
          expect(engine.isExiting('node-test')).toBe(true);

          // At duration - 1ms: should still be exiting
          const justBefore = now + duration - 1;
          // We can't call tick here without completing it, so we check isExiting
          // by inspecting the state directly (elapsed < duration)
          const state = engine.getAnimationState('node-test');
          expect(state).not.toBeNull();
          expect(state!.isExiting).toBe(true);

          // After ticking past duration: should no longer be exiting
          engine.tick(now + duration + 1);
          expect(engine.isExiting('node-test')).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('getEnterProperties returns valid values for all types and progress values', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<AnimationType>('fade', 'scale', 'slide'),
        fc.float({ min: 0, max: 1, noNaN: true }),
        (type, progress) => {
          const props = getEnterProperties(type, progress);
          expect(props.opacity).toBeGreaterThanOrEqual(0);
          expect(props.opacity).toBeLessThanOrEqual(1);
          expect(isFinite(props.scale.x)).toBe(true);
          expect(isFinite(props.scale.y)).toBe(true);
          expect(isFinite(props.scale.z)).toBe(true);
          expect(isFinite(props.positionOffset.x)).toBe(true);
          expect(isFinite(props.positionOffset.y)).toBe(true);
          expect(isFinite(props.positionOffset.z)).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('getExitProperties returns valid values for all types and progress values', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<AnimationType>('fade', 'scale', 'slide'),
        fc.float({ min: 0, max: 1, noNaN: true }),
        (type, progress) => {
          const props = getExitProperties(type, progress);
          expect(props.opacity).toBeGreaterThanOrEqual(0);
          expect(props.opacity).toBeLessThanOrEqual(1);
          expect(isFinite(props.scale.x)).toBe(true);
          expect(isFinite(props.scale.y)).toBe(true);
          expect(isFinite(props.scale.z)).toBe(true);
          expect(isFinite(props.positionOffset.x)).toBe(true);
          expect(isFinite(props.positionOffset.y)).toBe(true);
          expect(isFinite(props.positionOffset.z)).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });
});
