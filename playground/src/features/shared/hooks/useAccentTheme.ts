"use client";

import { useState, useEffect } from "react";
import { THEMES_LIST } from "@verdant/themes";

const ACCENT_STORAGE_KEY = "verdant-accent-theme";

export function useAccentTheme() {
  const [activeTheme, setActiveTheme] = useState(THEMES_LIST[0]);
  const [mounted, setMounted] = useState(false);

  // Load from storage on mount
  useEffect(() => {
    setMounted(true);
    const saved = window.localStorage.getItem(ACCENT_STORAGE_KEY);
    if (saved) {
      const found = THEMES_LIST.find((t) => t.name === saved);
      if (found) setActiveTheme(found);
    }
  }, []);

  // Sync CSS variables whenever theme changes
  useEffect(() => {
    if (typeof window === "undefined") return;

    const root = document.documentElement;
    root.style.setProperty("--accent", activeTheme.color);
    root.style.setProperty("--accent-faint", `${activeTheme.color}15`);
    root.style.setProperty("--topo", `${activeTheme.color}0D`);
    root.style.setProperty("--accent-light", activeTheme.color);
    root.style.setProperty("--accent-dark", activeTheme.color);

    if (mounted) {
      try {
        window.localStorage.setItem(ACCENT_STORAGE_KEY, activeTheme.name);
      } catch (e) {}
    }
  }, [activeTheme, mounted]);

  return { activeTheme, setActiveTheme, mounted };
}