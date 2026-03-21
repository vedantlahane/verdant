import * as THREE from 'three';
import { AnimationType } from './TransitionEngine';

export interface AnimationProperties {
  opacity: number;
  scale: THREE.Vector3;
  positionOffset: THREE.Vector3;
}

const SLIDE_OFFSET = 0.5; // world units to slide from/to

/**
 * Compute Three.js property values for an enter animation at a given progress (0→1).
 * progress = 0 means animation start (invisible/offscreen), progress = 1 means fully visible.
 */
export function getEnterProperties(type: AnimationType, progress: number): AnimationProperties {
  const p = Math.max(0, Math.min(1, progress));

  switch (type) {
    case 'fade':
      return {
        opacity: p,
        scale: new THREE.Vector3(1, 1, 1),
        positionOffset: new THREE.Vector3(0, 0, 0),
      };

    case 'scale':
      return {
        opacity: p,
        scale: new THREE.Vector3(p, p, p),
        positionOffset: new THREE.Vector3(0, 0, 0),
      };

    case 'slide':
      return {
        opacity: p,
        scale: new THREE.Vector3(1, 1, 1),
        // Slides in from below (negative Y offset that shrinks to 0)
        positionOffset: new THREE.Vector3(0, SLIDE_OFFSET * (p - 1), 0),
      };

    default:
      return {
        opacity: p,
        scale: new THREE.Vector3(1, 1, 1),
        positionOffset: new THREE.Vector3(0, 0, 0),
      };
  }
}

/**
 * Compute Three.js property values for an exit animation at a given progress (0→1).
 * progress = 0 means animation start (fully visible), progress = 1 means fully gone.
 */
export function getExitProperties(type: AnimationType, progress: number): AnimationProperties {
  const p = Math.max(0, Math.min(1, progress));
  const inv = 1 - p; // 1 at start, 0 at end

  switch (type) {
    case 'fade':
      return {
        opacity: inv,
        scale: new THREE.Vector3(1, 1, 1),
        positionOffset: new THREE.Vector3(0, 0, 0),
      };

    case 'scale':
      return {
        opacity: inv,
        scale: new THREE.Vector3(inv, inv, inv),
        positionOffset: new THREE.Vector3(0, 0, 0),
      };

    case 'slide':
      return {
        opacity: inv,
        scale: new THREE.Vector3(1, 1, 1),
        // Slides out downward (increasing negative Y offset)
        positionOffset: new THREE.Vector3(0, -SLIDE_OFFSET * p, 0),
      };

    default:
      return {
        opacity: inv,
        scale: new THREE.Vector3(1, 1, 1),
        positionOffset: new THREE.Vector3(0, 0, 0),
      };
  }
}
