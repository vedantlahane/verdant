"use client";

import { useEffect, useMemo, useState, useCallback } from "react";

export type ThemeMode = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "verdant-theme";

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function getStoredTheme(defaultMode: ThemeMode): ThemeMode {
  if (typeof window === "undefined") return defaultMode;
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "light" || saved === "dark" || saved === "system") {
      return saved;
    }
  } catch {
    // localStorage might be unavailable (incognito, etc.)
  }
  return defaultMode;
}

export function useThemeMode(defaultMode: ThemeMode = "system") {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() =>
    getStoredTheme(defaultMode)
  );
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(() =>
    getSystemTheme()
  );

  const resolvedTheme = useMemo<ResolvedTheme>(
    () => (themeMode === "system" ? systemTheme : themeMode),
    [themeMode, systemTheme]
  );

  // Listen to system theme changes
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () =>
      setSystemTheme(mq.matches ? "dark" : "light");
    handler();
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Apply to DOM
  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme;
    document.documentElement.style.colorScheme = resolvedTheme;
  }, [resolvedTheme]);

  const setThemeMode = useCallback((nextMode: ThemeMode) => {
    setThemeModeState(nextMode);
    try {
      window.localStorage.setItem(STORAGE_KEY, nextMode);
    } catch {
      // Silently fail if localStorage unavailable
    }
  }, []);

  return {
    themeMode,
    resolvedTheme,
    setThemeMode,
  };
}