import { BoxGeometry, CapsuleGeometry, ConeGeometry, CylinderGeometry, IcosahedronGeometry, OctahedronGeometry, PlaneGeometry, SphereGeometry, TorusGeometry, Vector3, Shape, ExtrudeGeometry } from 'three';
import type { ShapeDefinition, NodePort } from './ShapeDefinition';
import { ShapeRegistry } from '../registry/ShapeRegistry';

export { CubeShape } from './CubeShape';
export { CylinderShape } from './CylinderShape';
export { DiamondShape } from './DiamondShape';
export { SphereShape } from './SphereShape';
export { TorusShape } from './TorusShape';
export { HexagonShape } from './HexagonShape';
export { PentagonShape } from './PentagonShape';
export { OctagonShape } from './OctagonShape';
export { RingShape } from './RingShape';
export { BoxShape } from './BoxShape';
export { ConeShape } from './ConeShape';
export { CapsuleShape } from './CapsuleShape';
export { IcosahedronShape } from './IcosahedronShape';
export { PlaneShape } from './PlaneShape';

export type { ShapeDefinition, NodePort } from './ShapeDefinition';

// ---------------------------------------------------------------------------
// Port helpers
// ---------------------------------------------------------------------------

function port(name: string, x: number, y: number, z: number, fx: number, fy: number, fz: number): NodePort {
  return {
    name,
    localPosition: new Vector3(x, y, z),
    facingDirection: new Vector3(fx, fy, fz).normalize(),
  };
}

/** Standard 4-port layout: top, bottom, left, right */
function cardinalPorts(halfH: number, halfW: number): NodePort[] {
  return [
    port('top',    0,  halfH, 0,  0,  1, 0),
    port('bottom', 0, -halfH, 0,  0, -1, 0),
    port('left',  -halfW, 0,  0, -1,  0, 0),
    port('right',  halfW, 0,  0,  1,  0, 0),
  ];
}

// ---------------------------------------------------------------------------
// Definitions
// ---------------------------------------------------------------------------

export const cubeDefinition: ShapeDefinition = {
  name: 'cube',
  geometryFactory: () => new BoxGeometry(1, 1, 1),
  defaultPorts: cardinalPorts(0.5, 0.5),
  defaultMaterialConfig: { color: '#4287f5', metalness: 0.2, roughness: 0.6 },
};

export const sphereDefinition: ShapeDefinition = {
  name: 'sphere',
  geometryFactory: () => new SphereGeometry(0.7, 32, 32),
  defaultPorts: cardinalPorts(0.7, 0.7),
  defaultMaterialConfig: { color: '#8b5cf6', metalness: 0.2, roughness: 0.5 },
};

export const cylinderDefinition: ShapeDefinition = {
  name: 'cylinder',
  geometryFactory: () => new CylinderGeometry(0.5, 0.5, 1, 24),
  defaultPorts: cardinalPorts(0.5, 0.5),
  defaultMaterialConfig: { color: '#42f554', metalness: 0.2, roughness: 0.7 },
};

export const diamondDefinition: ShapeDefinition = {
  name: 'diamond',
  geometryFactory: () => new OctahedronGeometry(0.7, 0),
  defaultPorts: cardinalPorts(0.7, 0.7),
  defaultMaterialConfig: { color: '#f59e0b', metalness: 0.2, roughness: 0.6 },
};

export const hexagonDefinition: ShapeDefinition = {
  name: 'hexagon',
  geometryFactory: () => new CylinderGeometry(0.7, 0.7, 0.6, 6),
  defaultPorts: cardinalPorts(0.3, 0.7),
  defaultMaterialConfig: { color: '#ef4444', metalness: 0.2, roughness: 0.6 },
};

export const torusDefinition: ShapeDefinition = {
  name: 'torus',
  geometryFactory: () => new TorusGeometry(0.5, 0.2, 16, 100),
  defaultPorts: cardinalPorts(0.7, 0.7),
  defaultMaterialConfig: { color: '#06b6d4', metalness: 0.2, roughness: 0.6 },
};

export const pentagonDefinition: ShapeDefinition = {
  name: 'pentagon',
  geometryFactory: () => new CylinderGeometry(0.7, 0.7, 0.2, 5),
  defaultPorts: cardinalPorts(0.1, 0.7),
  defaultMaterialConfig: { color: '#10b981', metalness: 0.2, roughness: 0.6 },
};

export const octagonDefinition: ShapeDefinition = {
  name: 'octagon',
  geometryFactory: () => new CylinderGeometry(0.7, 0.7, 0.2, 8),
  defaultPorts: cardinalPorts(0.1, 0.7),
  defaultMaterialConfig: { color: '#f97316', metalness: 0.2, roughness: 0.6 },
};

export const ringDefinition: ShapeDefinition = {
  name: 'ring',
  geometryFactory: () => new TorusGeometry(0.5, 0.08, 16, 100),
  defaultPorts: cardinalPorts(0.58, 0.58),
  defaultMaterialConfig: { color: '#a78bfa', metalness: 0.3, roughness: 0.5 },
};

export const boxDefinition: ShapeDefinition = {
  name: 'box',
  geometryFactory: () => new BoxGeometry(1, 1, 1),
  defaultPorts: cardinalPorts(0.5, 0.5),
  defaultMaterialConfig: { color: '#64748b', metalness: 0.2, roughness: 0.6 },
};

export const coneDefinition: ShapeDefinition = {
  name: 'cone',
  geometryFactory: () => new ConeGeometry(0.5, 1, 32),
  defaultPorts: [
    port('top',    0,  0.5, 0,  0,  1, 0),
    port('bottom', 0, -0.5, 0,  0, -1, 0),
    port('left',  -0.25, 0, 0, -1,  0, 0),
    port('right',  0.25, 0, 0,  1,  0, 0),
  ],
  defaultMaterialConfig: { color: '#ec4899', metalness: 0.2, roughness: 0.6 },
};

export const capsuleDefinition: ShapeDefinition = {
  name: 'capsule',
  geometryFactory: () => new CapsuleGeometry(0.3, 0.8, 4, 8),
  defaultPorts: cardinalPorts(0.7, 0.3),
  defaultMaterialConfig: { color: '#14b8a6', metalness: 0.2, roughness: 0.5 },
};

export const starDefinition: ShapeDefinition = {
  name: 'star',
  geometryFactory: () => {
    const starShape = new Shape();
    const innerRadius = 0.3;
    const outerRadius = 0.7;
    const spikes = 5;
    const step = Math.PI / spikes;
    starShape.moveTo(outerRadius, 0);
    for (let i = 1; i < spikes * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      starShape.lineTo(Math.cos(i * step) * radius, Math.sin(i * step) * radius);
    }
    starShape.closePath();
    return new ExtrudeGeometry(starShape, { depth: 0.2, bevelEnabled: false });
  },
  defaultPorts: cardinalPorts(0.7, 0.7),
  defaultMaterialConfig: { color: '#fbbf24', metalness: 0.4, roughness: 0.3 },
};

export const heartDefinition: ShapeDefinition = {
  name: 'heart',
  geometryFactory: () => {
    const heartShape = new Shape();
    const x = 0, y = 0;
    heartShape.moveTo(x + 5, y + 5);
    heartShape.bezierCurveTo(x + 5, y + 5, x + 4, y, x, y);
    heartShape.bezierCurveTo(x - 6, y, x - 6, y + 7, x - 6, y + 7);
    heartShape.bezierCurveTo(x - 6, y + 11, x - 3, y + 15.4, x + 5, y + 19);
    heartShape.bezierCurveTo(x + 12, y + 15.4, x + 16, y + 11, x + 16, y + 7);
    heartShape.bezierCurveTo(x + 16, y + 7, x + 16, y, x + 10, y);
    heartShape.bezierCurveTo(x + 7, y, x + 5, y + 5, x + 5, y + 5);
    
    // Scale and center heart
    const scale = 0.05;
    const geo = new ExtrudeGeometry(heartShape, { depth: 4, bevelEnabled: false });
    geo.scale(scale, -scale, scale);
    geo.translate(-0.25, 0.45, -0.1);
    return geo;
  },
  defaultPorts: cardinalPorts(0.7, 0.7),
  defaultMaterialConfig: { color: '#f43f5e', metalness: 0.1, roughness: 0.7 },
};

export const BUILTIN_SHAPE_DEFINITIONS: ShapeDefinition[] = [
  cubeDefinition,
  sphereDefinition,
  cylinderDefinition,
  diamondDefinition,
  hexagonDefinition,
  torusDefinition,
  pentagonDefinition,
  octagonDefinition,
  ringDefinition,
  boxDefinition,
  coneDefinition,
  capsuleDefinition,
  starDefinition,
  heartDefinition,
];

/**
 * Registers all 14 built-in shapes into the provided registry.
 */
export function registerAllBuiltInShapes(registry: ShapeRegistry): void {
  BUILTIN_SHAPE_DEFINITIONS.forEach(def => registry.register(def.name, def));
}
