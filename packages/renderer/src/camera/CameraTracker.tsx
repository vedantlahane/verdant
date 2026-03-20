// CameraTracker.tsx
import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { CameraData } from '../types';

interface CameraTrackerProps {
  onCameraChange: (data: CameraData) => void;
}

export function CameraTracker({ onCameraChange }: CameraTrackerProps) {
  const { camera } = useThree();
  const frameCount = useRef(0);
  const lastEmit = useRef('');
  const _invQ = useMemo(() => new THREE.Quaternion(), []);
  const _v = useMemo(() => new THREE.Vector3(), []);
  const _target = useMemo(() => new THREE.Vector3(), []);
  const initialDistance = useRef<number | null>(null);

  useFrame((state) => {
    frameCount.current++;
    if (frameCount.current % 8 !== 0) return;

    const px = Math.round(camera.position.x * 10) / 10;
    const py = Math.round(camera.position.y * 10) / 10;
    const pz = Math.round(camera.position.z * 10) / 10;

    const perspCam = camera as THREE.PerspectiveCamera;
    const fov = Math.round(perspCam.fov ?? 45);

    let distance = 0;
    let effectiveFov = fov; // starts same as actual fov

    const controls = (state as any).controls;
    if (controls?.target) {
      _target.copy(controls.target);
      distance = Math.round(camera.position.distanceTo(_target) * 10) / 10;

      // Set baseline distance once
      if (initialDistance.current === null) {
        initialDistance.current = distance;
      }

      const baseDist = initialDistance.current || distance;
      const fovRad = THREE.MathUtils.degToRad(fov);

      // ✅ FIX: distance / baseDist (not baseDist / distance)
      // Closer → smaller effFov (narrower visible area)
      // Farther → larger effFov  (wider visible area)
      const eff = 2 * Math.atan(Math.tan(fovRad / 2) * (distance / baseDist));
      effectiveFov = Math.round(THREE.MathUtils.radToDeg(eff) * 10) / 10;
      //                        ─────────────────────────────────────────────
      //                        ✅ also: round to 1 decimal, not integer
    }

    _invQ.copy(camera.quaternion).invert();

    const round = (v: THREE.Vector3): [number, number, number] => [
      Math.round(v.x * 100) / 100,
      Math.round(v.y * 100) / 100,
      Math.round(v.z * 100) / 100,
    ];

    const ax = round(_v.set(1, 0, 0).applyQuaternion(_invQ));
    const ay = round(_v.set(0, 1, 0).applyQuaternion(_invQ));
    const az = round(_v.set(0, 0, 1).applyQuaternion(_invQ));

    const key = `${px},${py},${pz},${fov},${distance},${effectiveFov},${ax},${ay},${az}`;
    if (key === lastEmit.current) return;
    lastEmit.current = key;

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