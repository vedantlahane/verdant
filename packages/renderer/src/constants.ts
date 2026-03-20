// constants.ts

/** Minimum world-unit distance between any two nodes */
export const MIN_NODE_DISTANCE = 4.5;

/** Grid dimensions */
export const GRID_SIZE = 40;
export const AXIS_Y_LENGTH = 40;
export const MAJOR_STEP = 4;
export const MINOR_STEP = 1;
export const AXIS_LENGTH = GRID_SIZE;
export const TICK_EVERY = 1;
export const TICK_SIZE = 0.12;
export const FADE_START = GRID_SIZE * 0.3;
export const FADE_END = GRID_SIZE * 0.95;

/** Measurement lines */
export const DASH_SIZE = 0.3;
export const GAP_SIZE = 0.2;
export const WING_HALF_WIDTH = 0.25;

/** Safety limits */
export const MAX_GROUP_DEPTH = 100;
export const MAX_LOCALSTORAGE_KEY_LENGTH = 200;

/** Layout */
export const FORCE_ITERATIONS = 150;
export const MIN_DISTANCE_PASSES = 10;
export const NEW_NODE_DISTANCE_PASSES = 20;