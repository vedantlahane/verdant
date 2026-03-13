
"use client";

import { useEffect, useMemo, useState } from "react";

export type ThemeMode = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "verdant-theme";

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") {
    return "dark";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getStoredTheme(defaultMode: ThemeMode): ThemeMode {
  if (typeof window === "undefined") {
    return defaultMode;
  }

  const savedMode = window.localStorage.getItem(STORAGE_KEY);
  return savedMode === "light" || savedMode === "dark" || savedMode === "system" ? savedMode : defaultMode;
}

export function useThemeMode(defaultMode: ThemeMode = "system") {
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => getStoredTheme(defaultMode));
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(() => getSystemTheme());

  const resolvedTheme = useMemo<ResolvedTheme>(
    () => (themeMode === "system" ? systemTheme : themeMode),
    [themeMode, systemTheme],
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => setSystemTheme(mediaQuery.matches ? "dark" : "light");

    handleChange();
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme;
    document.documentElement.style.colorScheme = resolvedTheme;
  }, [resolvedTheme]);

  const updateThemeMode = (nextMode: ThemeMode) => {
    setThemeMode(nextMode);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, nextMode);
    }
  };

  return {
    themeMode,
    resolvedTheme,
    setThemeMode: updateThemeMode,
  };
}