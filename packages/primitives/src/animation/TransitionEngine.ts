import * as THREE from 'three';

export type AnimationType = 'fade' | 'scale' | 'slide';

export interface AnimationState {
  type: AnimationType;
  progress: number; // 0 to 1, eased
  isEntering: boolean;
  isExiting: boolean;
  isComplete: boolean;
}

const DEFAULT_ENTER_DURATION = 300;
const DEFAULT_EXIT_DURATION = 200;

/** Simple ease-in-out cubic */
function easeInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

interface AnimationRecord {
  type: AnimationType;
  isEntering: boolean;
  isExiting: boolean;
  startTime: number;
  duration: number;
  resolve: () => void;
}

interface LayoutRecord {
  startPositions: Map<string, THREE.Vector3>;
  targetPositions: Map<string, THREE.Vector3>;
  startTime: number;
  duration: number;
  resolve: () => void;
}

export class TransitionEngine {
  private animations = new Map<string, AnimationRecord>();
  private layoutTransition: LayoutRecord | null = null;
  private currentPositions = new Map<string, THREE.Vector3>();

  playEnter(nodeId: string, type: AnimationType, duration?: number): void {
    const d = duration ?? DEFAULT_ENTER_DURATION;
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    // Resolve any pending exit promise immediately (interrupted)
    const existing = this.animations.get(nodeId);
    if (existing) {
      existing.resolve();
    }
    this.animations.set(nodeId, {
      type,
      isEntering: true,
      isExiting: false,
      startTime: now,
      duration: d,
      resolve: () => {},
    });
  }

  playExit(nodeId: string, type: AnimationType, duration?: number): Promise<void> {
    const d = duration ?? DEFAULT_EXIT_DURATION;
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    // Resolve any pending animation immediately
    const existing = this.animations.get(nodeId);
    if (existing) {
      existing.resolve();
    }
    return new Promise<void>((resolve) => {
      this.animations.set(nodeId, {
        type,
        isEntering: false,
        isExiting: true,
        startTime: now,
        duration: d,
        resolve,
      });
    });
  }

  playLayoutTransition(
    positions: Map<string, THREE.Vector3>,
    duration?: number,
  ): Promise<void> {
    const d = duration ?? 500;
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();

    // Snapshot current positions
    const startPositions = new Map<string, THREE.Vector3>();
    for (const [id, target] of positions) {
      const current = this.currentPositions.get(id);
      startPositions.set(id, current ? current.clone() : target.clone());
    }

    if (this.layoutTransition) {
      this.layoutTransition.resolve();
    }

    return new Promise<void>((resolve) => {
      this.layoutTransition = {
        startPositions,
        targetPositions: positions,
        startTime: now,
        duration: d,
        resolve,
      };
    });
  }

  getAnimationState(nodeId: string): AnimationState | null {
    const record = this.animations.get(nodeId);
    if (!record) return null;

    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const elapsed = now - record.startTime;
    const rawProgress = Math.min(elapsed / record.duration, 1);
    const progress = easeInOut(rawProgress);
    const isComplete = rawProgress >= 1;

    return {
      type: record.type,
      progress: record.isEntering ? progress : 1 - progress,
      isEntering: record.isEntering && !isComplete,
      isExiting: record.isExiting && !isComplete,
      isComplete,
    };
  }

  tick(now: number): void {
    for (const [nodeId, record] of this.animations) {
      const elapsed = now - record.startTime;
      if (elapsed >= record.duration) {
        record.resolve();
        this.animations.delete(nodeId);
      }
    }

    if (this.layoutTransition) {
      const lt = this.layoutTransition;
      const elapsed = now - lt.startTime;
      const rawProgress = Math.min(elapsed / lt.duration, 1);
      const progress = easeInOut(rawProgress);

      for (const [id, target] of lt.targetPositions) {
        const start = lt.startPositions.get(id) ?? target;
        let current = this.currentPositions.get(id);
        if (!current) {
          current = new THREE.Vector3();
          this.currentPositions.set(id, current);
        }
        current.lerpVectors(start, target, progress);
      }

      if (rawProgress >= 1) {
        lt.resolve();
        this.layoutTransition = null;
      }
    }
  }

  /** Returns true while an exit animation is in progress for the given node */
  isExiting(nodeId: string): boolean {
    const record = this.animations.get(nodeId);
    if (!record || !record.isExiting) return false;
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const elapsed = now - record.startTime;
    return elapsed < record.duration;
  }

  /** Get the interpolated position for a node during layout transition */
  getLayoutPosition(nodeId: string): THREE.Vector3 | null {
    return this.currentPositions.get(nodeId) ?? null;
  }
}
