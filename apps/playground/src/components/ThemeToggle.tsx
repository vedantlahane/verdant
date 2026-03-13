"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { ThemeMode } from "./useThemeMode";

interface ThemeToggleProps {
  mode: ThemeMode;
  onChange: (mode: ThemeMode) => void;
  compact?: boolean;
  className?: string;
}

const OPTIONS: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "system", label: "System", icon: Monitor },
  { value: "dark", label: "Dark", icon: Moon },
];

export function ThemeToggle({ mode, onChange, compact = false, className = "" }: ThemeToggleProps) {
  return (
    <div
      className={[
        "inline-flex items-center rounded-full border border-[color:var(--border-subtle)] bg-[color:var(--surface-soft)]/85 p-1 text-[color:var(--text-secondary)] shadow-[0_18px_40px_rgba(0,0,0,0.16)] backdrop-blur-xl",
        className,
      ].join(" ")}
      role="tablist"
      aria-label="Theme switcher"
    >
      {OPTIONS.map((option) => {
        const Icon = option.icon;
        const isActive = option.value === mode;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={[
              "inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm transition-all",
              compact ? "justify-center" : "",
              isActive
                ? "bg-[color:var(--surface-strong)] text-[color:var(--text-primary)] shadow-[0_10px_30px_rgba(0,0,0,0.18)]"
                : "hover:text-[color:var(--text-primary)]",
            ].join(" ")}
            aria-pressed={isActive}
          >
            <Icon className="h-4 w-4" />
            {!compact && <span>{option.label}</span>}
          </button>
        );
      })}
    </div>
  );
}
