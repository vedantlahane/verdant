// camera/index.ts
//
// Camera subsystem.
//
// Architecture:
//   CameraTracker — useFrame-based emitter that reads camera state
//                   every N frames (CAMERA_EMIT_FRAME_INTERVAL) and
//                   calls onCameraChange with position, fov, distance,
//                   effectiveFov, and axis projections.
//
// Dependencies:
//   - @react-three/fiber (useFrame, useThree)
//   - constants (CAMERA_EMIT_FRAME_INTERVAL)
//   - types (CameraData, Vec3)
//
// Note: Camera creation and initial positioning is handled by R3F's
// <Canvas camera={...}> prop in VerdantRenderer.tsx. OrbitControls
// are configured in SceneContent.tsx. This module only handles
// camera state observation/emission.

export { CameraTracker } from './CameraTracker';
