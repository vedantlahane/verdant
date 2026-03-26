// primitives/src/materials — material cache and status materials

export { MaterialCache } from './MaterialCache';
export type { MaterialConfig, MaterialCacheStats } from './MaterialCache';

export {
  StatusMaterials,
  createStatusMaterials,
  disposeStatusMaterials,
} from './StatusMaterials';
export type { StatusColorConfig, NodeStatus } from './StatusMaterials';
