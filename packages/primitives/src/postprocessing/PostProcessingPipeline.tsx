import React from 'react';

export interface PostProcessingPipelineProps {
  enabled: boolean;
  bloom?: {
    intensity?: number;   // default 1.0
    threshold?: number;   // default 0.5
    radius?: number;      // default 0.4
  };
  outline?: {
    color?: string;       // default '#ffffff'
    thickness?: number;   // default 2
  };
  selectedIds?: Set<string>;
}

/**
 * PostProcessingPipeline
 *
 * When `enabled` is false, returns null immediately — zero bundle overhead,
 * no post-processing code is evaluated or imported.
 *
 * When `enabled` is true, holds the resolved configuration ready for
 * integration with a post-processing library (e.g. @react-three/postprocessing).
 * The bloom and outline pass parameters are normalised to their defaults here
 * so consumers always receive fully-resolved values.
 */
export function PostProcessingPipeline({
  enabled,
  bloom,
  outline,
  selectedIds,
}: PostProcessingPipelineProps): React.ReactElement | null {
  if (!enabled) {
    return null;
  }

  // Resolved configuration with defaults applied
  const resolvedBloom = {
    intensity: bloom?.intensity ?? 1.0,
    threshold: bloom?.threshold ?? 0.5,
    radius: bloom?.radius ?? 0.4,
  };

  const resolvedOutline = {
    color: outline?.color ?? '#ffffff',
    thickness: outline?.thickness ?? 2,
  };

  // Placeholder element that carries the resolved config as data attributes.
  // Replace the inner content with actual <EffectComposer> passes once
  // @react-three/postprocessing is available in the project.
  return (
    <group
      name="post-processing-pipeline"
      userData={{
        bloom: resolvedBloom,
        outline: resolvedOutline,
        selectedIds: selectedIds ? Array.from(selectedIds) : [],
      }}
    />
  );
}

export default PostProcessingPipeline;
