// renderer/index.ts

export type { RendererBackend } from './detectWebGPU';
export {
  isWebGPUAvailable,
  isWebGPUAvailableSync,
  detectBestBackend,
} from './detectWebGPU';

export type { RendererConfig, RendererResult } from './createRenderer';
export {
  createWebGLRenderer,
  createWebGPURenderer,
  createOptimalRenderer,
} from './createRenderer';

export type { UseRendererOptions, UseRendererResult } from './useRenderer';
export { useRenderer } from './useRenderer';