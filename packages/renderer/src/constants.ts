// constants.ts

import type { Vec3 } from './types';

// ═══════════════════════════════════════════════════════════════════
//  Layout
// ═══════════════════════════════════════════════════════════════════

/** Minimum world-unit distance between any two nodes after layout */
export const MIN_NODE_DISTANCE = 4.5;

/** Number of iterations for force-directed layout simulation */
export const FORCE_ITERATIONS = 150;

/** Separation enforcement passes during full layout computation */
export const MIN_DISTANCE_PASSES = 10;

/** Separation enforcement passes for incrementally added nodes */
export const NEW_NODE_DISTANCE_PASSES = 20;

/**
 * Initial temperature for force-directed simulated annealing.
 * Controls maximum displacement per iteration — decays linearly to 0.
 */
export const FORCE_INITIAL_TEMPERATURE = 3.0;

/** Centering gravity multiplier applied each iteration (0–1; closer to 1 = weaker pull) */
export const FORCE_CENTERING_GRAVITY = 0.995;

/**
 * Y-axis spread ratio relative to X/Z in initial random placement.
 * < 1.0 flattens the initial cloud; > 1.0 makes it taller.
 */
export const FORCE_Y_SPREAD_RATIO = 1.2;

/**
 * Group cohesion divisor — lower = stronger pull between group siblings.
 * Expressed as fraction of `k` in `(dist² / (k * GROUP_COHESION_DIVISOR))`.
 */
export const FORCE_GROUP_COHESION_DIVISOR = 0.5;

/**
 * Hard overlap penalty multiplier when two nodes are closer than MIN_NODE_DISTANCE.
 * Applied as `(MIN_NODE_DISTANCE - dist) * OVERLAP_PENALTY`.
 */
export const FORCE_OVERLAP_PENALTY = 5;

// ═══════════════════════════════════════════════════════════════════
//  Coordinate Grid
// ═══════════════════════════════════════════════════════════════════

/** Half-extent of the ground grid in world units (grid spans [-GRID_SIZE, +GRID_SIZE]) */
export const GRID_SIZE = 40;

/** Full extent of the Y-axis above and below origin */
export const AXIS_Y_LENGTH = 40;

/** Major grid line spacing (world units) */
export const MAJOR_STEP = 4;

/** Minor grid line spacing (world units) */
export const MINOR_STEP = 1;

/** Length of each axis line from origin to arrow tip */
export const AXIS_LENGTH = GRID_SIZE;

/** World-unit distance between tick marks */
export const TICK_EVERY = 1;

/** Half-extent of each tick mark cube (world units) */
export const TICK_SIZE = 0.12;

/** Distance from origin where grid fade begins */
export const FADE_START = GRID_SIZE * 0.3; // 12

/** Distance from origin where grid is fully transparent */
export const FADE_END = GRID_SIZE * 0.95; // 38

// ═══════════════════════════════════════════════════════════════════
//  Measurement Lines
// ═══════════════════════════════════════════════════════════════════

/** Dash segment length for dashed measurement lines */
export const DASH_SIZE = 0.3;

/** Gap segment length for dashed measurement lines */
export const GAP_SIZE = 0.2;

/** Half-width of perpendicular wing markers at measurement endpoints */
export const WING_HALF_WIDTH = 0.25;

/** Target opacity for measurement line body (after fade-in completes) */
export const MEASUREMENT_LINE_OPACITY = 0.55;

/** Target opacity for measurement wing markers (after fade-in completes) */
export const MEASUREMENT_WING_OPACITY = 0.45;

/** Fade-in speed multiplier: opacity reaches 1.0 in ~(1/SPEED) seconds */
export const MEASUREMENT_FADE_SPEED = 4;

// ═══════════════════════════════════════════════════════════════════
//  Camera & Controls
// ═══════════════════════════════════════════════════════════════════

/** Default camera position when no persisted view state exists */
export const DEFAULT_CAMERA_POSITION: Vec3 = [0, 8, 16];

/** Default camera field of view (degrees) */
export const DEFAULT_CAMERA_FOV = 45;

/** Default orbit target (look-at point) */
export const DEFAULT_CAMERA_TARGET: Vec3 = [0, 0, 0];

/** Seconds of idle time (no pointer/scroll) before auto-rotate activates */
export const AUTO_ROTATE_IDLE_THRESHOLD = 3;

/** Auto-rotate angular speed (passed to OrbitControls.autoRotateSpeed) */
export const AUTO_ROTATE_SPEED = 0.5;

/** OrbitControls minimum camera-to-target distance */
export const ORBIT_MIN_DISTANCE = 3;

/** OrbitControls maximum camera-to-target distance */
export const ORBIT_MAX_DISTANCE = 80;

/** OrbitControls damping coefficient (higher = snappier, lower = more inertia) */
export const ORBIT_DAMPING_FACTOR = 0.05;

/**
 * CameraTracker skips this many frames between emissions.
 * At 60fps, `8` → ~7.5 emissions/sec. Reduces callback pressure
 * without perceptibly stale HUD data.
 */
export const CAMERA_EMIT_FRAME_INTERVAL = 8;

// ═══════════════════════════════════════════════════════════════════
//  Rendering
// ═══════════════════════════════════════════════════════════════════

/**
 * Device pixel ratio clamp range [min, max].
 * Cap at 1.5 to avoid GPU pressure on retina displays while
 * maintaining acceptable sharpness.
 */
export const DPR_RANGE: readonly [number, number] = [1, 1.5];

/**
 * Minimum nodes sharing the same shape type to activate instanced rendering.
 * Below this threshold, individual mesh renders are cheaper due to
 * instancing setup overhead.
 */
export const INSTANCING_THRESHOLD = 10;

// ═══════════════════════════════════════════════════════════════════
//  Persistence
// ═══════════════════════════════════════════════════════════════════

/**
 * Debounce delay (ms) for writing renderer state (positions, selection,
 * theme) to localStorage. Prevents write storms during rapid interaction.
 */
export const PERSIST_DEBOUNCE_MS = 300;

/**
 * Minimum interval (ms) between camera view state writes.
 * Throttles the high-frequency `onChange` events from OrbitControls.
 */
export const VIEW_PERSIST_THROTTLE_MS = 180;

// ═══════════════════════════════════════════════════════════════════
//  Safety Limits
// ═══════════════════════════════════════════════════════════════════

/** Maximum traversal depth for nested VrdGroup trees (prevents stack/loop explosion) */
export const MAX_GROUP_DEPTH = 100;

/**
 * Maximum byte-length for localStorage keys.
 * Enforced in persistence layer to avoid browser limits and
 * performance degradation from very long keys.
 */
export const MAX_LOCALSTORAGE_KEY_LENGTH = 200;