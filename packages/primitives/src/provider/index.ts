// primitives/src/provider — context provider and configuration

export { PrimitivesProvider } from './PrimitivesProvider';
export { usePrimitives, usePrimitivesOptional, PrimitivesContext } from './PrimitivesContext';
export type { PrimitivesContextValue } from './PrimitivesContext';

export type {
  PrimitivesConfig,
  MinimapConfig,
  PostProcessingConfig,
  BloomConfig,
  OutlineConfig,
  SnapConfig,
  AnimationConfig,
  LabelConfig,
  VerdantPlugin,
  PluginRegistryAPI,
  StatusColorConfig,
} from './PrimitivesConfig';
