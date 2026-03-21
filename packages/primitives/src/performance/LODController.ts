import * as THREE from 'three';

export interface LODVariant {
  /** Maximum projected screen size (in pixels) at which this variant is used. */
  maxScreenPixels: number;
  geometryFactory: () => THREE.BufferGeometry;
}

/**
 * Selects the appropriate LOD variant based on the projected screen size of an
 * object at a given world position.
 */
export class LODController {
  constructor(
    private readonly camera: THREE.PerspectiveCamera,
    private readonly rendererSize: { width: number; height: number }
  ) {}

  /**
   * Computes the projected screen size (in pixels) of a sphere with the given
   * radius at the given world position.
   *
   * Formula: (radius / distance) * (height / (2 * tan(fov/2))) * 2
   */
  projectScreenSize(worldPosition: THREE.Vector3, radius: number): number {
    const distance = this.camera.position.distanceTo(worldPosition);
    if (distance <= 0) return Infinity;
    const fovRad = THREE.MathUtils.degToRad(this.camera.fov);
    const halfFovTan = Math.tan(fovRad / 2);
    return (radius / distance) * (this.rendererSize.height / (2 * halfFovTan)) * 2;
  }

  /**
   * Returns the index of the best LOD variant for the current projected screen size.
   * Variants are sorted ascending by maxScreenPixels; the first variant whose
   * maxScreenPixels >= projectedSize is chosen. Falls back to the last variant.
   */
  getVariantIndex(worldPosition: THREE.Vector3, variants: LODVariant[]): number {
    if (variants.length === 0) return 0;

    const sorted = variants
      .map((v, i) => ({ v, i }))
      .sort((a, b) => a.v.maxScreenPixels - b.v.maxScreenPixels);

    const projectedSize = this.projectScreenSize(worldPosition, 1);

    for (const { v, i } of sorted) {
      if (v.maxScreenPixels >= projectedSize) {
        return i;
      }
    }

    // All thresholds exceeded — return the last variant in the sorted order
    return sorted[sorted.length - 1].i;
  }
}
