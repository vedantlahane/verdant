// renderer/useRenderer.ts

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import type { RendererBackend } from './detectWebGPU';
import { detectBestBackend } from './detectWebGPU';
import type { RendererConfig } from './createRenderer';
import { createOptimalRenderer } from './createRenderer';

// ═══════════════════════════════════════════════════════════════════
//  Types
// ═══════════════════════════════════════════════════════════════════

export interface UseRendererOptions {
  /** Renderer configuration (antialias, alpha, etc.) */
  readonly config?: RendererConfig;
  /** Set to false to force WebGL even if WebGPU is available */
  readonly preferWebGPU?: boolean;
}

export interface UseRendererResult {
  /** Which backend is active */
  readonly backend: RendererBackend;
  /** Whether detection is complete */
  readonly isDetected: boolean;
  /** Increment to force Canvas remount (context recovery) */
  readonly canvasKey: number;
  /** Trigger Canvas remount (for context recovery) */
  readonly remount: () => void;
  /** R3F Canvas `gl` prop config */
  readonly glConfig: any;
  /** R3F Canvas onCreated handler */
  readonly handleCreated: (state: any) => void;
}

// ═══════════════════════════════════════════════════════════════════
//  Hook

//  Strategy: "Instant WebGL, optional WebGPU upgrade"
//
//  1. Mount immediately with WebGL config (zero delay)
//  2. In parallel, detect WebGPU availability
//  3. If WebGPU available, the NEXT mount (or explicit remount)
//     will use WebGPU
//  4. If WebGPU unavailable, continue with WebGL (no change)
//
//  This means the first render is always WebGL. If WebGPU is
//  detected, a single remount occurs to switch backends.
//  For most users this is imperceptible (<100ms).
// ═══════════════════════════════════════════════════════════════════

export function useRenderer(
  options: UseRendererOptions = {},
): UseRendererResult {
  const { config, preferWebGPU = true } = options;

  const [backend, setBackend] = useState<RendererBackend>('webgl');
  const [isDetected, setIsDetected] = useState(false);
  const [canvasKey, setCanvasKey] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // ── WebGPU Detection ──
  useEffect(() => {
    let cancelled = false;

    detectBestBackend(preferWebGPU).then((best) => {
      if (cancelled) return;
      setBackend(best);
      setIsDetected(true);
    });

    return () => {
      cancelled = true;
    };
  }, [preferWebGPU]);

  // ── GL Config ──
  const glConfig = useMemo(() => {
    const baseConfig = {
      antialias: config?.antialias ?? true,
      alpha: config?.alpha ?? false,
      powerPreference: config?.powerPreference ?? ('default' as const),
    };

    if (backend === 'webgpu') {
      return async (canvas: HTMLCanvasElement) => {
        const { renderer } = await createOptimalRenderer(
          canvas,
          'webgpu',
          baseConfig
        );
        return renderer;
      };
    }

    return Object.freeze(baseConfig);
  }, [backend, config?.antialias, config?.alpha, config?.powerPreference]);

  // ── Context Recovery ──
  const handleCreated = useCallback((state: any) => {
    canvasRef.current = state.gl.domElement as HTMLCanvasElement;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleContextLost = (e: Event) => {
      e.preventDefault();
    };

    const handleContextRestored = () => {
      setCanvasKey((k) => k + 1);
    };

    canvas.addEventListener('webglcontextlost', handleContextLost);
    canvas.addEventListener('webglcontextrestored', handleContextRestored);

    return () => {
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      canvas.removeEventListener('webglcontextrestored', handleContextRestored);
    };
  }, [canvasKey, backend]);

  const remount = useCallback(() => setCanvasKey((k) => k + 1), []);

  return {
    backend,
    isDetected,
    canvasKey,
    remount,
    glConfig,
    handleCreated,
  };
}