// camera/CameraTracker.tsx

import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import type { CameraData, Vec3 } from '../types';
import { CAMERA_EMIT_FRAME_INTERVAL } from '../constants';

interface CameraTrackerProps {
  readonly onCameraChange: (data: CameraData) => void;
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

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

  const inverseQuaternion = useMemo(() => new THREE.Quaternion(), []);
  const workVec = useMemo(() => new THREE.Vector3(), []);
  const targetVec = useMemo(() => new THREE.Vector3(), []);

  useFrame((state) => {
    frameCount.current++;
    if (frameCount.current % CAMERA_EMIT_FRAME_INTERVAL !== 0) return;

    // ── Bug #7 fix: guard PerspectiveCamera ──                     ← CHANGED
    const isPerspective = camera instanceof THREE.PerspectiveCamera;
    const fov = isPerspective ? Math.round(camera.fov) : 45;         // ← CHANGED

    const px = round1(camera.position.x);
    const py = round1(camera.position.y);
    const pz = round1(camera.position.z);

    let distance = 0;
    let effectiveFov = fov;

    const controls = (state as any).controls;
    if (controls?.target) {
      targetVec.copy(controls.target);
      distance = round1(camera.position.distanceTo(targetVec));

      if (baselineDistance.current === null) {
        baselineDistance.current = distance;
      }

      const baseDist = baselineDistance.current || distance;

      if (isPerspective && baseDist > 0) {                            // ← CHANGED: guard
        const halfFovRad = THREE.MathUtils.degToRad(fov) * 0.5;
        const effRad = 2 * Math.atan(Math.tan(halfFovRad) * (distance / baseDist));
        effectiveFov = round1(THREE.MathUtils.radToDeg(effRad));
      }
    }

    inverseQuaternion.copy(camera.quaternion).invert();

    const ax = computeAxisProjection(workVec, 1, 0, 0, inverseQuaternion);
    const ay = computeAxisProjection(workVec, 0, 1, 0, inverseQuaternion);
    const az = computeAxisProjection(workVec, 0, 0, 1, inverseQuaternion);

    const key = `${px},${py},${pz},${fov},${distance},${effectiveFov},${ax[0]},${ax[1]},${ax[2]},${ay[0]},${ay[1]},${ay[2]},${az[0]},${az[1]},${az[2]}`;

    if (key === lastEmitKey.current) return;
    lastEmitKey.current = key;

    onCameraChange({
      position: [px, py, pz],
      fov,
      distance,
      effectiveFov,
      axisProjections: { x: ax, y: ay, z: az },
    });
  });

  return null;
}