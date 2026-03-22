// hooks/useAutoRotate.ts

import { useRef, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { AUTO_ROTATE_IDLE_THRESHOLD } from '../constants';

interface AutoRotateResult {
  readonly isInteractingRef: React.MutableRefObject<boolean>;
  readonly handleInteractionStart: () => void;
  readonly handleInteractionEnd: () => void;
}

/**
 * Manages auto-rotation with idle detection.
 *
 * Auto-rotate activates after the user has not interacted for
 * AUTO_ROTATE_IDLE_THRESHOLD seconds. Any pointer/scroll interaction
 * resets the idle timer and disables auto-rotate immediately.
 */
export function useAutoRotate(
  controlsRef: React.RefObject<any>,
  enabled: boolean,
): AutoRotateResult {
  const idleTimer = useRef(0);
  const isInteractingRef = useRef(false);

  useFrame((_, delta) => {
    if (!controlsRef.current || !enabled) return;

    if (isInteractingRef.current) {
      idleTimer.current = 0;
    } else {
      idleTimer.current += delta;
      controlsRef.current.autoRotate =
        idleTimer.current > AUTO_ROTATE_IDLE_THRESHOLD;
    }
  });

  const handleInteractionStart = useCallback(() => {
    isInteractingRef.current = true;
    idleTimer.current = 0;
    if (controlsRef.current) {
      controlsRef.current.autoRotate = false;
    }
  }, [controlsRef]);

  const handleInteractionEnd = useCallback(() => {
    isInteractingRef.current = false;
  }, []);

  return { isInteractingRef, handleInteractionStart, handleInteractionEnd };
}