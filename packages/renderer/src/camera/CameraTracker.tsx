// camera/CameraTracker.tsx

import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import type { CameraData, Vec3 } from '../types';
import { CAMERA_EMIT_FRAME_INTERVAL } from '../constants';

// ═══════════════════════════════════════════════════════════════════
//  CameraTracker
//
//  Emits camera state to the parent via `onCameraChange` at a
//  throttled rate (every N frames). Renders nothing — this is a
//  pure side-effect component.
//
//  Key design decisions:
//  - Reusable THREE objects allocated once via useMemo (not useRef,
//    which doesn't participate in React's lifecycle cleanup).
//  - String-key deduplication prevents emitting identical data
//    when the camera hasn't moved (e.g., idle auto-rotate paused).
//  - effectiveFov scales with distance ratio so the HUD can show
//    "how much of the scene is visible" independent of physical zoom.
// ═══════════════════════════════════════════════════════════════════

interface CameraTrackerProps {
  readonly onCameraChange: (data: CameraData) => void;
}

/** Round to 1 decimal place — balances precision vs dedup key stability */
function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

/** Round to 2 decimal places — for axis projections */
function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

/**
 * Compute the axis projection vector by rotating a unit axis
 * through the camera's inverse quaternion.
 *
 * The vector is mutated in-place for zero allocation.
 */
function computeAxisProjection(
  axis: THREE.Vector3,
  x: number,
  y: number,
  z: number,
  invQ: THREE.Quaternion,
): Vec3 {
  axis.set(x, y, z).applyQuaternion(invQ);
  return [round2(axis.x), round2(axis.y), round2(axis.z)];
}

export function CameraTracker({ onCameraChange }: CameraTrackerProps) {
  const { camera } = useThree();
  const frameCount = useRef(0);
  const lastEmitKey = useRef('');
  const baselineDistance = useRef<number | null>(null);

  // Reusable THREE objects — allocated once per mount
  const inverseQuaternion = useMemo(() => new THREE.Quaternion(), []);
  const workVec = useMemo(() => new THREE.Vector3(), []);
  const targetVec = useMemo(() => new THREE.Vector3(), []);

  useFrame((state) => {
    // ── Frame throttle ──
    frameCount.current++;
    if (frameCount.current % CAMERA_EMIT_FRAME_INTERVAL !== 0) return;

    // ── Position ──
    const px = round1(camera.position.x);
    const py = round1(camera.position.y);
    const pz = round1(camera.position.z);

    // ── FOV ──
    const perspCam = camera as THREE.PerspectiveCamera;
    const fov = Math.round(perspCam.fov ?? 45);

    // ── Distance & effective FOV ──
    let distance = 0;
    let effectiveFov = fov;

    const controls = (state as any).controls;
    if (controls?.target) {
      targetVec.copy(controls.target);
      distance = round1(camera.position.distanceTo(targetVec));

      // Establish baseline on first measurement
      if (baselineDistance.current === null) {
        baselineDistance.current = distance;
      }

      const baseDist = baselineDistance.current || distance;

      // effectiveFov scales with distance:
      //   closer → smaller (narrower visible area)
      //   farther → larger (wider visible area)
      //
      // Formula: 2 × atan(tan(fov/2) × (distance / baseDist))
      const halfFovRad = THREE.MathUtils.degToRad(fov) * 0.5;
      const effRad = 2 * Math.atan(Math.tan(halfFovRad) * (distance / baseDist));
      effectiveFov = round1(THREE.MathUtils.radToDeg(effRad));
    }

    // ── Axis projections ──
    inverseQuaternion.copy(camera.quaternion).invert();

    const ax = computeAxisProjection(workVec, 1, 0, 0, inverseQuaternion);
    const ay = computeAxisProjection(workVec, 0, 1, 0, inverseQuaternion);
    const az = computeAxisProjection(workVec, 0, 0, 1, inverseQuaternion);

    // ── Deduplication ──
    // Concatenating rounded numbers is cheaper than deep-comparing
    // the previous CameraData object every frame.
    const key = `${px},${py},${pz},${fov},${distance},${effectiveFov},${ax[0]},${ax[1]},${ax[2]},${ay[0]},${ay[1]},${ay[2]},${az[0]},${az[1]},${az[2]}`;

    if (key === lastEmitKey.current) return;
    lastEmitKey.current = key;

    // ── Emit ──
    onCameraChange({
      position: [px, py, pz],
      fov,
      distance,
      effectiveFov,
      axisProjections: { x: ax, y: ay, z: az },
    });
  });

  // Render nothing — pure side-effect component
  return null;
}