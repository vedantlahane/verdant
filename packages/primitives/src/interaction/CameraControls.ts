import * as THREE from 'three';

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

export class CameraControls {
  private camera: THREE.PerspectiveCamera;
  private rafId: number | null = null;

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
  }

  private cancelAnimation(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private animate(
    from: THREE.Vector3,
    to: THREE.Vector3,
    duration: number
  ): Promise<void> {
    this.cancelAnimation();

    return new Promise<void>((resolve) => {
      const start = performance.now();
      const current = from.clone();

      const step = (now: number) => {
        const elapsed = now - start;
        const t = Math.min(elapsed / duration, 1);
        const eased = easeInOut(t);

        current.lerpVectors(from, to, eased);
        this.camera.position.copy(current);
        this.camera.lookAt(0, 0, 0);

        if (t < 1) {
          this.rafId = requestAnimationFrame(step);
        } else {
          this.rafId = null;
          resolve();
        }
      };

      this.rafId = requestAnimationFrame(step);
    });
  }

  zoomToFit(nodes: Map<string, THREE.Box3>): Promise<void> {
    const from = this.camera.position.clone();

    if (nodes.size === 0) {
      return this.animate(from, new THREE.Vector3(0, 0, 10), 600);
    }

    const union = new THREE.Box3();
    for (const box of nodes.values()) {
      union.union(box);
    }

    const sphere = new THREE.Sphere();
    union.getBoundingSphere(sphere);

    const target = new THREE.Vector3(
      sphere.center.x,
      sphere.center.y,
      sphere.center.z + sphere.radius * 2.2
    );

    return this.animate(from, target, 600);
  }

  focusNode(nodeId: string, nodeBox: THREE.Box3): Promise<void> {
    const from = this.camera.position.clone();

    const center = new THREE.Vector3();
    nodeBox.getCenter(center);

    const size = new THREE.Vector3();
    nodeBox.getSize(size);
    const nodeSize = Math.max(size.x, size.y, size.z);

    const target = new THREE.Vector3(
      center.x,
      center.y,
      center.z + nodeSize * 3
    );

    return this.animate(from, target, 400);
  }

  dispose(): void {
    this.cancelAnimation();
  }
}
