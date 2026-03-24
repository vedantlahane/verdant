// measurement/index.ts
//
// Measurement / dimension line subsystem.
//
// Architecture:
//   MeasurementLinesGroup — Thin mapper from MeasurementLine[] data
//                           to DimensionLine components. Custom arePropsEqual
//                           does per-line shallow comparison to avoid
//                           re-rendering all lines when parent reconstructs
//                           the array with same data.
//
//   DimensionLine         — (Internal) Single measurement between two points.
//                           Renders dashed line + perpendicular wing markers
//                           + HTML distance label. Fade-in animation via
//                           useFrame opacity interpolation.
//
// Public API:
//   Only MeasurementLinesGroup is public. DimensionLine is an implementation
//   detail — import it directly only for testing.
//
// Dependencies:
//   - @react-three/fiber (useFrame)
//   - @react-three/drei (Html)
//   - constants (DASH_SIZE, GAP_SIZE, WING_HALF_WIDTH, opacities, fade speed)
//   - types (MeasurementLine, Vec3)
//
// Key design decisions:
//   - DimensionLine uses `vec3Key` (string serialization) as a memo
//     dependency instead of array references, since Vec3 tuples are
//     recreated frequently.
//   - Temporary THREE.Line for computeLineDistances is detached from
//     its geometry before disposal (Bug #8 fix).
//   - Wing perpendicular direction uses module-scoped reusable vectors.

export { MeasurementLinesGroup } from './MeasurementLinesGroup';
// DimensionLine intentionally not exported — internal implementation detail
