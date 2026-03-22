// primitives/src/export/PNGExport.ts

import * as THREE from 'three';

export class ExportError extends Error {
  constructor(message: string, cause?: unknown) {
    super(`[PNGExport] ${message}`);
    this.name = 'ExportError';
    if (cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = cause;
    }
  }
}

export interface SceneSnapshotNode {
  id: string;
  label: string;
  position: [number, number, number];
  color?: string;
}

export interface SceneSnapshotEdge {
  id: string;
  from: [number, number, number];
  to: [number, number, number];
  color?: string;
}

export interface SceneSnapshot {
  nodes: SceneSnapshotNode[];
  edges: SceneSnapshotEdge[];
  cameraPosition?: [number, number, number];
}

export interface PNGExportOptions {
  /** Resolution multiplier (1 = native, 2 = 2x, etc.). @default 2 */
  scale?: number;
  /** Background color. @default transparent */
  backgroundColor?: string | null;
  /** MIME type. @default "image/png" */
  mimeType?: 'image/png' | 'image/jpeg' | 'image/webp';
  /** JPEG/WebP quality (0-1). @default 0.92 */
  quality?: number;
}

/**
 * Renders the current scene to an offscreen canvas and returns a `Blob`.
 *
 * **Scene-safe:** Snapshots renderer state before capture and restores after.
 * Never mutates the live scene.
 *
 * @param renderer - The WebGL renderer.
 * @param scene - The scene to render.
 * @param camera - The camera to render from.
 * @param options - Export options.
 * @returns `Promise<Blob>` containing the image data.
 * @throws {ExportError} on failure.
 */
export async function exportPNG(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  options: PNGExportOptions = {},
): Promise<Blob> {
  const scale = Math.max(1, Math.min(4, options.scale ?? 2));
  const mimeType = options.mimeType ?? 'image/png';
  const quality = options.quality ?? 0.92;

  try {
    // ── Snapshot current state ──
    const originalSize = renderer.getSize(new THREE.Vector2());
    const originalPixelRatio = renderer.getPixelRatio();
    const originalClearColor = renderer.getClearColor(new THREE.Color());
    const originalClearAlpha = renderer.getClearAlpha();
    const originalAutoClear = renderer.autoClear;

    // ── Configure for export ──
    const width = Math.round(originalSize.x * scale);
    const height = Math.round(originalSize.y * scale);

    renderer.setSize(width, height, false);
    renderer.setPixelRatio(1); // We handle scaling via setSize

    if (options.backgroundColor) {
      renderer.setClearColor(new THREE.Color(options.backgroundColor), 1);
    } else {
      renderer.setClearColor(new THREE.Color(0x000000), 0); // Transparent
    }

    renderer.autoClear = true;

    // ── Render ──
    renderer.render(scene, camera);

    // ── Extract pixels ──
    const canvas = renderer.domElement;

    // ── Restore original state ──
    renderer.setSize(originalSize.x, originalSize.y, false);
    renderer.setPixelRatio(originalPixelRatio);
    renderer.setClearColor(originalClearColor, originalClearAlpha);
    renderer.autoClear = originalAutoClear;

    // Force a re-render to restore the live view
    renderer.render(scene, camera);

    // ── Convert to blob ──
    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new ExportError('canvas.toBlob returned null'));
          }
        },
        mimeType,
        quality,
      );
    });
  } catch (err) {
    throw new ExportError(
      `Failed to export: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

/**
 * Convenience wrapper: exports and triggers a browser download.
 */
export async function downloadPNG(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  filename = 'verdant-export.png',
  options?: PNGExportOptions,
): Promise<void> {
  const blob = await exportPNG(renderer, scene, camera, options);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Default export for convenience ──
export const PNGExport = { exportPNG, downloadPNG };