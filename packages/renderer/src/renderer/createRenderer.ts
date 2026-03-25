// renderer/createRenderer.ts

import { WebGLRenderer } from 'three';
import type { RendererBackend } from './detectWebGPU';
import { __DEV__ } from '../shared';

// ═══════════════════════════════════════════════════════════════════
//  Types
// ═══════════════════════════════════════════════════════════════════

export interface RendererConfig {
  readonly antialias?: boolean;
  readonly alpha?: boolean;
  readonly powerPreference?: 'default' | 'high-performance' | 'low-power';
  readonly pixelRatio?: number | [number, number];
}

export interface RendererResult {
  /** The Three.js renderer instance (WebGPU or WebGL) */
  readonly renderer: WebGLRenderer;  // WebGPURenderer extends WebGLRenderer's interface
  /** Which backend is actually in use */
  readonly backend: RendererBackend;
  /** Clean up GPU resources */
  readonly dispose: () => void;
}

const DEFAULT_CONFIG: RendererConfig = {
  antialias: true,
  alpha: false,
  powerPreference: 'default',
};

// ═══════════════════════════════════════════════════════════════════
//  WebGL Renderer (synchronous)
// ═══════════════════════════════════════════════════════════════════

export function createWebGLRenderer(
  canvas: HTMLCanvasElement,
  config: RendererConfig = DEFAULT_CONFIG,
): RendererResult {
  const renderer = new WebGLRenderer({
    canvas,
    antialias: config.antialias ?? true,
    alpha: config.alpha ?? false,
    powerPreference: config.powerPreference ?? 'default',
  });

  if (__DEV__) {
    console.info('[VerdantRenderer] Using WebGL backend');
  }

  return {
    renderer,
    backend: 'webgl',
    dispose: () => {
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}

// ═══════════════════════════════════════════════════════════════════
//  WebGPU Renderer (async)
//
//  Uses dynamic import of `three/webgpu` to:
//  1. Keep WebGPU code out of the main bundle for unsupported browsers
//  2. Avoid errors on systems where the import path doesn't exist
//  3. Allow tree-shaking of the WebGPU module when unused
//
//  The WebGPURenderer from Three.js 0.183+ is designed to work
//  with standard Three.js materials (MeshBasicMaterial, etc.) —
//  it converts them to node-based materials internally.
// ═══════════════════════════════════════════════════════════════════

export async function createWebGPURenderer(
  canvas: HTMLCanvasElement,
  config: RendererConfig = DEFAULT_CONFIG,
): Promise<RendererResult> {
  // Dynamic import — only loaded when WebGPU is actually used
  const { WebGPURenderer } = await import(
    /* webpackChunkName: "webgpu-renderer" */
    'three/webgpu'
  );

  const renderer = new WebGPURenderer({
    canvas,
    antialias: config.antialias ?? true,
    alpha: config.alpha ?? false,
    powerPreference: config.powerPreference ?? 'default',
  });

  // WebGPURenderer.init() is async — it requests the GPU adapter and device
  await renderer.init();

  if (__DEV__) {
    console.info('[VerdantRenderer] Using WebGPU backend');
  }

  return {
    renderer: renderer as unknown as WebGLRenderer,  // R3F expects WebGLRenderer type
    backend: 'webgpu',
    dispose: () => {
      renderer.dispose();
    },
  };
}

// ═══════════════════════════════════════════════════════════════════
//  Optimal Renderer Factory
//
//  Tries WebGPU first, falls back to WebGL on any failure.
//  Designed to never throw — always returns a working renderer.
// ═══════════════════════════════════════════════════════════════════

export async function createOptimalRenderer(
  canvas: HTMLCanvasElement,
  backend: RendererBackend,
  config: RendererConfig = DEFAULT_CONFIG,
): Promise<RendererResult> {
  if (backend === 'webgpu') {
    try {
      return await createWebGPURenderer(canvas, config);
    } catch (err) {
      if (__DEV__) {
        console.warn(
          '[VerdantRenderer] WebGPU renderer creation failed, falling back to WebGL:',
          err,
        );
      }
      // Fall through to WebGL
    }
  }

  return createWebGLRenderer(canvas, config);
}