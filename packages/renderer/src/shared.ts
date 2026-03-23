// shared.ts
//
// Shared constants that were duplicated across files (Bug #25).

/**
 * Development mode flag.
 * Consolidated from store.persistence.ts and VerdantRenderer.tsx.
 */
export const __DEV__ =
  typeof process !== 'undefined' &&
  process.env?.NODE_ENV !== 'production';