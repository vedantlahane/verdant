// renderer/detectWebGPU.ts

/**
 * WebGPU feature detection.
 *
 * Three-stage check:
 * 1. navigator.gpu exists (API available)
 * 2. requestAdapter succeeds (driver available)
 * 3. requestDevice succeeds (can create a device)
 *
 * Results are cached after first call — the GPU situation doesn't
 * change during a page session.
 */

export type RendererBackend = 'webgpu' | 'webgl';

let _cachedResult: boolean | null = null;
let _cachedPromise: Promise<boolean> | null = null;

/**
 * Check if WebGPU is available and functional.
 *
 * This is async because `requestAdapter()` and `requestDevice()`
 * are both async GPU operations. The result is cached.
 *
 * @returns `true` if WebGPU can be used for rendering
 */
export async function isWebGPUAvailable(): Promise<boolean> {
  // Return cached result immediately if available
  if (_cachedResult !== null) return _cachedResult;

  // Deduplicate concurrent calls
  if (_cachedPromise) return _cachedPromise;

  _cachedPromise = detectWebGPU();
  _cachedResult = await _cachedPromise;
  _cachedPromise = null;

  return _cachedResult;
}

/**
 * Synchronous check — returns the cached result or `false` if
 * detection hasn't completed yet.
 *
 * Useful for code paths that can't await (e.g., render functions).
 */
export function isWebGPUAvailableSync(): boolean {
  return _cachedResult === true;
}

async function detectWebGPU(): Promise<boolean> {
  try {
    // Stage 1: API exists
    if (typeof navigator === 'undefined' || !navigator.gpu) {
      return false;
    }

    // Stage 2: Adapter available (physical GPU accessible)
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      return false;
    }

    // Stage 3: Device creation works (not blocked by policy/error)
    const device = await adapter.requestDevice();
    if (!device) {
      return false;
    }

    // Clean up the test device — we'll create a real one in the renderer
    device.destroy();

    return true;
  } catch {
    // Any error in the chain → WebGPU not usable
    return false;
  }
}

/**
 * Determine which renderer backend to use.
 *
 * @param preferWebGPU — Set to `false` to force WebGL even if WebGPU
 *   is available (useful for debugging or A/B testing).
 */
export async function detectBestBackend(
  preferWebGPU: boolean = true,
): Promise<RendererBackend> {
  if (!preferWebGPU) return 'webgl';
  const available = await isWebGPUAvailable();
  return available ? 'webgpu' : 'webgl';
}

/**
 * Reset the cached detection result.
 * Only useful in tests.
 *
 * @internal
 */
export function _resetDetectionCache(): void {
  _cachedResult = null;
  _cachedPromise = null;
}