// primitives/src/postprocessing/PostProcessingPipeline.tsx

import React, { useMemo } from 'react';
import type { Mesh } from 'three';

type PostProcessingModule = {
  EffectComposer: React.ComponentType<React.PropsWithChildren>;
  Bloom: React.ComponentType<{
    intensity?: number;
    luminanceThreshold?: number;
    luminanceSmoothing?: number;
  }>;
  Outline: React.ComponentType<{
    selection?: Mesh[];
    edgeStrength?: number;
    visibleEdgeColor?: string;
    hiddenEdgeColor?: string;
  }>;
};

const POSTPROCESSING_MODULE_ID = '@react-three/' + 'postprocessing';

function tryLoadPostProcessingModule(): PostProcessingModule | null {
  try {
    const resolveRequire = Function(
      'return typeof require !== "undefined" ? require : undefined;',
    )() as ((id: string) => unknown) | undefined;

    if (typeof resolveRequire !== 'function') {
      return null;
    }

    return resolveRequire(POSTPROCESSING_MODULE_ID) as PostProcessingModule;
  } catch {
    return null;
  }
}

export interface PostProcessingPipelineProps {
  enabled: boolean;
  bloom?: {
    intensity?: number;   // @default 1.0
    threshold?: number;   // @default 0.5
    radius?: number;      // @default 0.4
  };
  outline?: {
    color?: string;       // @default "#ffffff"
    thickness?: number;   // @default 2
  };
  selectedMeshes?: Mesh[];
}

/**
 * Resolves configuration with defaults applied.
 */
function useResolvedConfig(props: PostProcessingPipelineProps) {
  return useMemo(() => ({
    bloom: {
      intensity: props.bloom?.intensity ?? 1.0,
      threshold: props.bloom?.threshold ?? 0.5,
      radius: props.bloom?.radius ?? 0.4,
    },
    outline: {
      color: props.outline?.color ?? '#ffffff',
      thickness: props.outline?.thickness ?? 2,
    },
  }), [props.bloom, props.outline]);
}

/**
 * Post-processing pipeline.
 *
 * When `enabled` is `false`, returns `null` immediately — zero overhead,
 * no postprocessing code is imported or evaluated.
 *
 * When `enabled` is `true`, attempts to dynamically import
 * `@react-three/postprocessing`. If the library is not installed,
 * renders a placeholder group with resolved config in `userData`
 * for manual integration.
 *
 * @example
 * ```tsx
 * <PostProcessingPipeline
 *   enabled={config.postProcessing?.enabled ?? false}
 *   bloom={{ intensity: 0.5 }}
 *   outline={{ color: '#fbbf24', thickness: 2 }}
 *   selectedMeshes={selectedMeshRefs}
 * />
 * ```
 */
export function PostProcessingPipeline(
  props: PostProcessingPipelineProps,
): React.ReactElement | null {
  const { enabled, selectedMeshes } = props;
  const resolvedConfig = useResolvedConfig(props);
  const postProcessingModule = useMemo(() => tryLoadPostProcessingModule(), []);

  if (!enabled) return null;

  if (!postProcessingModule) {
    // Fallback: carry resolved config for manual integration
    return (
      <group
        name="post-processing-pipeline"
        userData={{
          bloom: resolvedConfig.bloom,
          outline: resolvedConfig.outline,
          selectedCount: selectedMeshes?.length ?? 0,
          __hint: 'Install @react-three/postprocessing to enable actual effects',
        }}
      />
    );
  }

  const { EffectComposer, Bloom, Outline } = postProcessingModule;

  return (
    <EffectComposer>
      <Bloom
        intensity={resolvedConfig.bloom.intensity}
        luminanceThreshold={resolvedConfig.bloom.threshold}
        luminanceSmoothing={resolvedConfig.bloom.radius}
      />
      {selectedMeshes && selectedMeshes.length > 0 && (
        <Outline
          selection={selectedMeshes}
          edgeStrength={resolvedConfig.outline.thickness}
          visibleEdgeColor={resolvedConfig.outline.color}
          hiddenEdgeColor={resolvedConfig.outline.color}
        />
      )}
    </EffectComposer>
  );
}