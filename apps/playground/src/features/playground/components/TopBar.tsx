import Link from "next/link";
import { Wand2, Share2, ImageIcon, Sun, Moon } from "lucide-react";
import { Leaf } from "./Leaf";

interface TopBarProps {
  onAiClick: () => void;
  onShareClick: () => void;
  onExportPngClick: () => void;
  onThemeToggle: () => void;
  resolvedTheme: "light" | "dark";
}

export function TopBar({
  onAiClick,
  onShareClick,
  onExportPngClick,
  onThemeToggle,
  resolvedTheme,
}: TopBarProps) {
  return (
    <header className="playground-topbar">
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="group flex items-center gap-2.5 rounded-full border border-[color:var(--border-subtle)] bg-[color:var(--surface)]/60 px-3.5 py-2 backdrop-blur-xl transition hover:bg-[color:var(--surface)]/80"
        >
          <Leaf />
          <span className="text-sm font-medium lowercase tracking-wider text-[color:var(--text-primary)]">
            playground
          </span>
        </Link>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onAiClick}
          className="playground-btn"
        >
          <Wand2 className="h-3.5 w-3.5 text-[color:var(--accent-primary)]" />
          <span className="hidden sm:inline">AI</span>
        </button>

        <button
          type="button"
          onClick={onShareClick}
          className="playground-btn"
          aria-label="Share"
        >
          <Share2 className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Share</span>
        </button>

        <button
          type="button"
          onClick={onExportPngClick}
          className="playground-btn"
          aria-label="Export PNG"
        >
          <ImageIcon className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">PNG</span>
        </button>

        <button
          type="button"
          onClick={onThemeToggle}
          className="playground-btn-icon"
          aria-label="Toggle theme"
        >
          {resolvedTheme === "dark" ? (
            <Sun className="h-3.5 w-3.5" />
          ) : (
            <Moon className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
    </header>
  );
}
