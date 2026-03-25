// primitives/src/animation/TransitionEngine.ts

import { Vector3 } from 'three';
import type { AnimationType } from '../types';

export type { AnimationType };

// ── Defaults ────────────────────────────────────────────────

const DEFAULT_ENTER_DURATION = 300;
const DEFAULT_EXIT_DURATION = 200;
const DEFAULT_LAYOUT_DURATION = 500;

// ── Easing ──────────────────────────────────────────────────

/** Cubic ease-in-out. */
function easeInOutCubic(t: number): number {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** Get current high-resolution time. */
function _now(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

// ── Internal Records ────────────────────────────────────────

interface AnimationRecord {
  type: AnimationType;
  isEntering: boolean;
  isExiting: boolean;
  startTime: number;
  duration: number;
  resolve: () => void;
}

interface LayoutRecord {
  startPositions: Map<string, Vector3>;
  targetPositions: Map<string, Vector3>;
  startTime: number;
  duration: number;
  resolve: () => void;
}

// ── Public State ────────────────────────────────────────────

export interface AnimationState {
  type: AnimationType;
  /** Eased progress 0→1. For enter: 0=start, 1=done. For exit: 1=start, 0=done. */
  progress: number;
  isEntering: boolean;
  isExiting: boolean;
  isComplete: boolean;
}

// ── Pre-allocated temp vector ───────────────────────────────

const _lerpVec = new Vector3();

/**
 * Manages enter/exit node animations and layout transitions.
 *
 * - `playEnter` / `playExit` → per-node animations
 * - `playLayoutTransition` → smooth repositioning of all nodes
 * - `tick()` → call once per frame to advance all animations
 * - `getAnimationState()` → read by BaseNode in useFrame
 */
export class TransitionEngine {
  private _animations = new Map<string, AnimationRecord>();
  private _layoutTransition: LayoutRecord | null = null;
  private _currentPositions = new Map<string, Vector3>();
  private _lastTickTime = 0;

  // ── Enter / Exit ────────────────────────────────────────

  /**
   * Start an enter animation for a node. Resolves any pending animation
   * on the same node immediately (interruption).
   */
  playEnter(
    nodeId: string,
    type: AnimationType,
    duration?: number,
  ): void {
    this._interruptExisting(nodeId);

    this._animations.set(nodeId, {
      type,
      isEntering: true,
      isExiting: false,
      startTime: _now(),
      duration: duration ?? DEFAULT_ENTER_DURATION,
      resolve: () => {},
    });
  }

  /**
   * Start an exit animation for a node. Returns a `Promise<void>` that
   * resolves only when the animation completes. The component should stay
   * mounted and non-interactive until the promise resolves.
   */
  playExit(
    nodeId: string,
    type: AnimationType,
    duration?: number,
  ): Promise<void> {
    this._interruptExisting(nodeId);

    return new Promise<void>((resolve) => {
      this._animations.set(nodeId, {
        type,
        isEntering: false,
        isExiting: true,
        startTime: _now(),
        duration: duration ?? DEFAULT_EXIT_DURATION,
        resolve,
      });
    });
  }

  /**
   * Query the current animation state for a node.
   * Returns `null` if the node has no active animation.
   *
   * Automatically cleans up completed animations.
   */
  getAnimationState(nodeId: string): AnimationState | null {
    const record = this._animations.get(nodeId);
    if (!record) return null;

    const now = _now();
    const elapsed = now - record.startTime;
    const rawProgress = Math.min(elapsed / record.duration, 1);
    const eased = easeInOutCubic(rawProgress);
    const isComplete = rawProgress >= 1;

    // Auto-cleanup completed animations
    if (isComplete) {
      record.resolve();
      this._animations.delete(nodeId);
    }

    return {
      type: record.type,
      progress: record.isEntering ? eased : 1 - eased,
      isEntering: record.isEntering && !isComplete,
      isExiting: record.isExiting && !isComplete,
      isComplete,
    };
  }

  // ── Layout Transitions ──────────────────────────────────

  /**
   * Smoothly transition all nodes to new positions.
   * Snapshots current positions as start, lerps to targets over `duration` ms.
   */
  playLayoutTransition(
    targetPositions: Map<string, Vector3>,
    duration?: number,
  ): Promise<void> {
    // Resolve any in-flight layout transition
    if (this._layoutTransition) {
      this._layoutTransition.resolve();
    }

    const now = _now();
    const d = duration ?? DEFAULT_LAYOUT_DURATION;

    // Snapshot current positions as start
    const startPositions = new Map<string, Vector3>();
    for (const [id, target] of targetPositions) {
      const current = this._currentPositions.get(id);
      startPositions.set(id, current ? current.clone() : target.clone());
    }

    return new Promise<void>((resolve) => {
      this._layoutTransition = {
        startPositions,
        targetPositions,
        startTime: now,
        duration: d,
        resolve,
      };
    });
  }

  /**
   * Get the interpolated position for a node during a layout transition.
   * Returns `null` if no layout transition is active or the node isn't part of it.
   */
  getLayoutPosition(nodeId: string): Vector3 | null {
    return this._currentPositions.get(nodeId) ?? null;
  }

  // ── Frame Tick ──────────────────────────────────────────

  /**
   * Advance all animations. Call once per frame (e.g. from a single `useFrame`).
   * Safe to call multiple times per frame (idempotent within same timestamp).
   */
  tick(now?: number): void {
    const t = now ?? _now();

    // Debounce: skip if called multiple times in the same millisecond
    if (t === this._lastTickTime) return;
    this._lastTickTime = t;

    // ── Node animations ──
    for (const [nodeId, record] of this._animations) {
      const elapsed = t - record.startTime;
      if (elapsed >= record.duration) {
        record.resolve();
        this._animations.delete(nodeId);
      }
    }

    // ── Layout transition ──
    if (this._layoutTransition) {
      const lt = this._layoutTransition;
      const elapsed = t - lt.startTime;
      const rawProgress = Math.min(elapsed / lt.duration, 1);
      const eased = easeInOutCubic(rawProgress);

      for (const [id, target] of lt.targetPositions) {
        const start = lt.startPositions.get(id) ?? target;

        let current = this._currentPositions.get(id);
        if (!current) {
          current = new Vector3();
          this._currentPositions.set(id, current);
        }
        // Use pre-allocated vector then copy to avoid allocation in hot loop
        _lerpVec.lerpVectors(start, target, eased);
        current.copy(_lerpVec);
      }

      if (rawProgress >= 1) {
        lt.resolve();
        this._layoutTransition = null;
      }
    }
  }

  // ── Queries ─────────────────────────────────────────────

  /** Returns `true` if any animation is in progress for the given node. */
  isAnimating(nodeId: string): boolean {
    return this._animations.has(nodeId);
  }

  /** Returns `true` while an exit animation is in progress for the given node. */
  isExiting(nodeId: string): boolean {
    const record = this._animations.get(nodeId);
    if (!record?.isExiting) return false;
    return (_now() - record.startTime) < record.duration;
  }

  /** Returns `true` if a layout transition is currently in progress. */
  get isLayoutTransitioning(): boolean {
    return this._layoutTransition !== null;
  }

  /** Total number of active node animations. */
  get activeCount(): number {
    return this._animations.size;
  }

  // ── Cleanup ─────────────────────────────────────────────

  /** Cancel and resolve all active animations immediately. */
  clear(): void {
    for (const record of this._animations.values()) {
      record.resolve();
    }
    this._animations.clear();

    if (this._layoutTransition) {
      this._layoutTransition.resolve();
      this._layoutTransition = null;
    }

    this._currentPositions.clear();
  }

  // ── Private ─────────────────────────────────────────────

  private _interruptExisting(nodeId: string): void {
    const existing = this._animations.get(nodeId);
    if (existing) {
      existing.resolve();
      this._animations.delete(nodeId);
    }
  }
}