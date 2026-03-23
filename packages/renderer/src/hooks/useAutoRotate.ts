// hooks/useAutoRotate.ts

import { useRef, useCallback, useEffect } from 'react';              // ← CHANGED: added useEffect
import { useFrame } from '@react-three/fiber';
import { AUTO_ROTATE_IDLE_THRESHOLD } from '../constants';

interface AutoRotateResult {
  readonly isInteractingRef: React.MutableRefObject<boolean>;
  readonly handleInteractionStart: () => void;
  readonly handleInteractionEnd: () => void;
}

export function useAutoRotate(
  controlsRef: React.RefObject<any>,
  enabled: boolean,
): AutoRotateResult {
  const idleTimer = useRef(0);
  const isInteractingRef = useRef(false);

  // Bug #6 fix: when `enabled` flips to false, immediately clear       ← NEW
  // autoRotate on the controls. The old code just returned early
  // from useFrame without resetting the flag.
  useEffect(() => {                                                    // ← NEW
    if (!enabled && controlsRef.current) {
      controlsRef.current.autoRotate = false;
      idleTimer.current = 0;
    }
  }, [enabled, controlsRef]);

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