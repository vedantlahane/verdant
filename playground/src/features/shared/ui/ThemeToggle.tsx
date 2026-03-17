"use client";

import { useState, useEffect } from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { ThemeMode } from "../hooks/useThemeMode";

const OPTIONS: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light theme", icon: Sun },
  { value: "dark", label: "Dark theme", icon: Moon },
  { value: "system", label: "System theme", icon: Monitor },
];

interface ThemeToggleProps {
  mode: ThemeMode;
  onChange: (m: ThemeMode) => void;
}

export function ThemeToggle({ mode, onChange }: ThemeToggleProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  /* ── Until mounted, render a static placeholder that matches
       the server HTML exactly (all aria-selected="false") ── */
  if (!mounted) {
    return (
      <div
        className="inline-flex rounded-full p-1"
        style={{
          border: "1px solid var(--border)",
          background: "var(--surface)",
        }}
        role="tablist"
        aria-label="Theme switcher"
      >
        {OPTIONS.map((option) => {
          const Icon = option.icon;
          return (
            <button
              key={option.value}
              type="button"
              role="tab"
              className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm transition-colors"
              style={{ color: "var(--text-muted)" }}
              aria-selected={false}
              aria-label={option.label}
              tabIndex={-1}
            >
              <Icon className="h-3.5 w-3.5" />
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      className="inline-flex rounded-full p-1"
      style={{
        border: "1px solid var(--border)",
        background: "var(--surface)",
      }}
      role="tablist"
      aria-label="Theme switcher"
    >
      {OPTIONS.map((option) => {
        const isActive = mode === option.value;
        const Icon = option.icon;

        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            onClick={() => onChange(option.value)}
            className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm transition-colors"
            style={{
              background: isActive ? "var(--elevated)" : "transparent",
              color: isActive ? "var(--text-primary)" : "var(--text-muted)",
              boxShadow: isActive
                ? "0 1px 3px rgba(0,0,0,0.15)"
                : "none",
            }}
            aria-selected={isActive}
            aria-label={option.label}
            tabIndex={isActive ? 0 : -1}
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
        );
      })}
    </div>
  );
}