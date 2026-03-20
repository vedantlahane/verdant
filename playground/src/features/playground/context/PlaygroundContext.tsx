"use client";

import { createContext, useContext } from "react";
import type { PlaygroundState } from "../types";

const PlaygroundContext = createContext<PlaygroundState | null>(null);

export function PlaygroundProvider({
  value,
  children,
}: {
  value: PlaygroundState;
  children: React.ReactNode;
}) {
  return (
    <PlaygroundContext.Provider value={value}>
      {children}
    </PlaygroundContext.Provider>
  );
}

export function usePlayground(): PlaygroundState {
  const ctx = useContext(PlaygroundContext);
  if (!ctx) {
    throw new Error("usePlayground must be used within <PlaygroundProvider>");
  }
  return ctx;
}