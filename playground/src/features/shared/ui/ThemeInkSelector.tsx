"use client";

import React from "react";
import { THEMES_LIST } from "@repo/themes";

interface ThemeInkSelectorProps {
  activeTheme: typeof THEMES_LIST[0];
  onSelect: (theme: typeof THEMES_LIST[0]) => void;
  mounted: boolean;
  columns?: number;
}

export function ThemeInkSelector({ activeTheme, onSelect, mounted, columns = 8 }: ThemeInkSelectorProps) {
  return (
    <div 
      className="grid gap-1 bg-[var(--border)] p-[1px] relative z-10"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {THEMES_LIST.map((t) => {
        const isActive = mounted && activeTheme.name === t.name;
        return (
          <button
            key={t.name}
            type="button"
            onClick={() => onSelect(t)}
            className="flex flex-col items-center justify-center gap-2 p-3 font-ui text-[10px] transition-colors hover:bg-[var(--accent-faint)] bg-[var(--page-bg)]"
          >
            <span
              className="inline-block h-2 w-2 rounded-full transition-transform duration-300"
              style={{ 
                backgroundColor: t.color,
                boxShadow: isActive ? `0 0 0 2px var(--page-bg), 0 0 0 3px ${t.color}` : 'none',
                transform: isActive ? 'scale(1.1)' : 'scale(1)'
              }}
            />
            <span className={`font-medium capitalize truncate w-full text-center ${isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
              {t.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}