import type * as THREE from 'three';
import type { MaterialConfig } from '../materials/MaterialCache';

export interface NodePort {
  name: string;
  localPosition: THREE.Vector3;
  facingDirection: THREE.Vector3;
}

export interface ShapeDefinition {
  name: string;
  geometryFactory: (params?: Record<string, number>) => THREE.BufferGeometry;
  defaultPorts: NodePort[];
  defaultMaterialConfig: MaterialConfig;
  lodVariants?: Array<{
    maxScreenPixels: number;
    geometryFactory: () => THREE.BufferGeometry;
  }>;
}
