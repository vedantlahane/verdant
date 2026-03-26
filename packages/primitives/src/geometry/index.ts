// primitives/src/geometry — shared geometry pool and factory

export { SharedGeometryPool } from './SharedGeometryPool';
export type { GeometryPoolStats } from './SharedGeometryPool';

export {
  GeometryFactory,
  createGeometry,
  releaseGeometry,
  loadCustomShape,
  ShapeNotFoundError,
} from './GeometryFactory';
export type { GLTFLoaderInterface } from './GeometryFactory';
