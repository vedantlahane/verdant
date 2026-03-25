import { BoxGeometry, CapsuleGeometry, ConeGeometry, CylinderGeometry, IcosahedronGeometry, OctahedronGeometry, PlaneGeometry, SphereGeometry, TorusGeometry, Vector3 } from 'three';
import type { ShapeDefinition, NodePort } from './ShapeDefinition';

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
// 6 existing shapes
// ---------------------------------------------------------------------------

export const cubeDefinition: ShapeDefinition = {
  name: 'cube',
  geometryFactory: (params) => {
    const w = params?.width ?? 1;
    const h = params?.height ?? 1;
    const d = params?.depth ?? 1;
    return new BoxGeometry(w, h, d);
  },
  defaultPorts: cardinalPorts(0.5, 0.5),
  defaultMaterialConfig: { color: '#4287f5', metalness: 0.2, roughness: 0.6 },
};

export const sphereDefinition: ShapeDefinition = {
  name: 'sphere',
  geometryFactory: (params) => {
    const r = params?.radius ?? 0.7;
    const ws = params?.widthSegments ?? 32;
    const hs = params?.heightSegments ?? 32;
    return new SphereGeometry(r, ws, hs);
  },
  defaultPorts: cardinalPorts(0.7, 0.7),
  defaultMaterialConfig: { color: '#8b5cf6', metalness: 0.2, roughness: 0.5 },
};

export const cylinderDefinition: ShapeDefinition = {
  name: 'cylinder',
  geometryFactory: (params) => {
    const rt = params?.radiusTop ?? 0.5;
    const rb = params?.radiusBottom ?? 0.5;
    const h  = params?.height ?? 1;
    const seg = params?.radialSegments ?? 24;
    return new CylinderGeometry(rt, rb, h, seg);
  },
  defaultPorts: cardinalPorts(0.5, 0.5),
  defaultMaterialConfig: { color: '#42f554', metalness: 0.2, roughness: 0.7 },
};

export const diamondDefinition: ShapeDefinition = {
  name: 'diamond',
  geometryFactory: (params) => {
    const r = params?.radius ?? 0.7;
    const detail = params?.detail ?? 0;
    return new OctahedronGeometry(r, detail);
  },
  defaultPorts: cardinalPorts(0.7, 0.7),
  defaultMaterialConfig: { color: '#f59e0b', metalness: 0.2, roughness: 0.6 },
};

export const hexagonDefinition: ShapeDefinition = {
  name: 'hexagon',
  geometryFactory: (params) => {
    const r = params?.radius ?? 0.7;
    const h = params?.height ?? 0.6;
    return new CylinderGeometry(r, r, h, 6);
  },
  defaultPorts: cardinalPorts(0.3, 0.7),
  defaultMaterialConfig: { color: '#ef4444', metalness: 0.2, roughness: 0.6 },
};

export const torusDefinition: ShapeDefinition = {
  name: 'torus',
  geometryFactory: (params) => {
    const r  = params?.radius ?? 0.5;
    const t  = params?.tube ?? 0.2;
    const rs = params?.radialSegments ?? 16;
    const ts = params?.tubularSegments ?? 100;
    return new TorusGeometry(r, t, rs, ts);
  },
  defaultPorts: cardinalPorts(0.7, 0.7),
  defaultMaterialConfig: { color: '#06b6d4', metalness: 0.2, roughness: 0.6 },
};

// ---------------------------------------------------------------------------
// 8 new shapes
// ---------------------------------------------------------------------------

export const pentagonDefinition: ShapeDefinition = {
  name: 'pentagon',
  geometryFactory: (params) => {
    const r = params?.radius ?? 0.7;
    const h = params?.height ?? 0.1;
    return new CylinderGeometry(r, r, h, 5);
  },
  defaultPorts: cardinalPorts(0.05, 0.7),
  defaultMaterialConfig: { color: '#10b981', metalness: 0.2, roughness: 0.6 },
};

export const octagonDefinition: ShapeDefinition = {
  name: 'octagon',
  geometryFactory: (params) => {
    const r = params?.radius ?? 0.7;
    const h = params?.height ?? 0.1;
    return new CylinderGeometry(r, r, h, 8);
  },
  defaultPorts: cardinalPorts(0.05, 0.7),
  defaultMaterialConfig: { color: '#f97316', metalness: 0.2, roughness: 0.6 },
};

export const ringDefinition: ShapeDefinition = {
  name: 'ring',
  geometryFactory: (params) => {
    const r  = params?.radius ?? 0.5;
    const t  = params?.tube ?? 0.08;
    const rs = params?.radialSegments ?? 16;
    const ts = params?.tubularSegments ?? 100;
    return new TorusGeometry(r, t, rs, ts);
  },
  defaultPorts: cardinalPorts(0.58, 0.58),
  defaultMaterialConfig: { color: '#a78bfa', metalness: 0.3, roughness: 0.5 },
};

export const boxDefinition: ShapeDefinition = {
  name: 'box',
  geometryFactory: (params) => {
    const w = params?.width ?? 1;
    const h = params?.height ?? 1;
    const d = params?.depth ?? 1;
    return new BoxGeometry(w, h, d);
  },
  defaultPorts: cardinalPorts(0.5, 0.5),
  defaultMaterialConfig: { color: '#64748b', metalness: 0.2, roughness: 0.6 },
};

export const coneDefinition: ShapeDefinition = {
  name: 'cone',
  geometryFactory: (params) => {
    const r  = params?.radius ?? 0.5;
    const h  = params?.height ?? 1;
    const seg = params?.radialSegments ?? 32;
    return new ConeGeometry(r, h, seg);
  },
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
  geometryFactory: (params) => {
    const r  = params?.radius ?? 0.3;
    const l  = params?.length ?? 0.8;
    const cs = params?.capSegments ?? 4;
    const rs = params?.radialSegments ?? 8;
    return new CapsuleGeometry(r, l, cs, rs);
  },
  defaultPorts: cardinalPorts(0.7, 0.3),
  defaultMaterialConfig: { color: '#14b8a6', metalness: 0.2, roughness: 0.5 },
};

export const icosahedronDefinition: ShapeDefinition = {
  name: 'icosahedron',
  geometryFactory: (params) => {
    const r = params?.radius ?? 0.7;
    const detail = params?.detail ?? 0;
    return new IcosahedronGeometry(r, detail);
  },
  defaultPorts: cardinalPorts(0.7, 0.7),
  defaultMaterialConfig: { color: '#6366f1', metalness: 0.3, roughness: 0.4 },
};

export const planeDefinition: ShapeDefinition = {
  name: 'plane',
  geometryFactory: (params) => {
    const w = params?.width ?? 1;
    const h = params?.height ?? 1;
    return new PlaneGeometry(w, h);
  },
  defaultPorts: [
    port('top',    0,  0.5, 0,  0,  1, 0),
    port('bottom', 0, -0.5, 0,  0, -1, 0),
    port('left',  -0.5, 0,  0, -1,  0, 0),
    port('right',  0.5, 0,  0,  1,  0, 0),
  ],
  defaultMaterialConfig: { color: '#94a3b8', metalness: 0.1, roughness: 0.8 },
};

// ---------------------------------------------------------------------------
// BUILTIN_SHAPE_DEFINITIONS — all 14 built-in shapes
// ---------------------------------------------------------------------------

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
  icosahedronDefinition,
  planeDefinition,
];
