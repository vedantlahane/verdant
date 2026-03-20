// useDraggable.ts

import { useRef, useCallback } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { useRendererStore } from '../store';

export function useDraggable(
  nodeId: string,
  currentPositionRef: React.MutableRefObject<[number, number, number]>,
  onDragStart: () => void,
  onDragEnd: () => void,
) {
  const { camera, gl } = useThree();
  const updateNodePosition = useRendererStore((s) => s.updateNodePosition);
  const setDraggingNode = useRendererStore((s) => s.setDraggingNode);

  const isDragging = useRef(false);
  const dragPlane = useRef(new THREE.Plane());
  const offset = useRef(new THREE.Vector3());
  const raycaster = useRef(new THREE.Raycaster());
  const intersection = useRef(new THREE.Vector3());

  const onPointerDown = useCallback(
    (e: any) => {
      e.stopPropagation();

      const pos = currentPositionRef.current;
      const camDir = new THREE.Vector3();
      camera.getWorldDirection(camDir);
      dragPlane.current.setFromNormalAndCoplanarPoint(
        camDir,
        new THREE.Vector3(...pos),
      );

      const rect = gl.domElement.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.current.setFromCamera(ndc, camera);
      raycaster.current.ray.intersectPlane(dragPlane.current, intersection.current);
      offset.current.copy(intersection.current).sub(new THREE.Vector3(...pos));

      isDragging.current = true;
      setDraggingNode(nodeId);
      onDragStart();

      gl.domElement.style.cursor = 'grabbing';
      e.target.setPointerCapture(e.pointerId);
    },
    // currentPositionRef is a stable ref — no stale closure
    [camera, gl, nodeId, onDragStart, setDraggingNode, currentPositionRef],
  );

  const onPointerMove = useCallback(
    (e: any) => {
      if (!isDragging.current) return;
      e.stopPropagation();

      const rect = gl.domElement.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.current.setFromCamera(ndc, camera);

      if (!raycaster.current.ray.intersectPlane(dragPlane.current, intersection.current)) {
        return;
      }

      const newPos: [number, number, number] = [
        intersection.current.x - offset.current.x,
        intersection.current.y - offset.current.y,
        intersection.current.z - offset.current.z,
      ];

      // Sanitize
      if (!Number.isFinite(newPos[0]) || !Number.isFinite(newPos[1]) || !Number.isFinite(newPos[2])) {
        return;
      }

      currentPositionRef.current = newPos;
      updateNodePosition(nodeId, newPos);
    },
    [camera, gl, nodeId, updateNodePosition, currentPositionRef],
  );

  const onPointerUp = useCallback(
    (e: any) => {
      if (!isDragging.current) return;
      isDragging.current = false;
      setDraggingNode(null);
      onDragEnd();
      gl.domElement.style.cursor = '';
      try {
        e.target.releasePointerCapture(e.pointerId);
      } catch {
        // Pointer capture may already be released
      }
    },
    [gl, onDragEnd, setDraggingNode],
  );

  return { onPointerDown, onPointerMove, onPointerUp };
}