// features/playground/context/PlaygroundContext.tsx

"use client";

import { createContext, useContext } from "react";
import type { PlaygroundState } from "../types";

const PlaygroundContext = createContext<PlaygroundState | null>(null);

interface PlaygroundProviderProps {
  readonly value: PlaygroundState;
  readonly children: React.ReactNode;
}

/**
 * Provides playground state to all descendant components.
 *
 * Currently wraps the monolithic `PlaygroundState` object.
 * For fine-grained subscriptions, use `usePlaygroundSelector`
 * or access individual fields from the returned state.
 */
export function PlaygroundProvider({ value, children }: PlaygroundProviderProps) {
  return (
    <PlaygroundContext.Provider value={value}>
      {children}
    </PlaygroundContext.Provider>
  );
}

/**
 * Access the full playground state from context.
 * Must be called within a `<PlaygroundProvider>`.
 *
 * @throws Error if used outside provider boundary
 */
export function usePlayground(): PlaygroundState {
  const ctx = useContext(PlaygroundContext);
  if (!ctx) {
    throw new Error("usePlayground must be used within <PlaygroundProvider>");
  }
  return ctx;
}