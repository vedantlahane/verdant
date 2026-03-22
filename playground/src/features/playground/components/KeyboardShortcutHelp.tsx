// features/playground/components/KeyboardShortcutHelp.tsx

"use client";

import { memo } from "react";
import { X } from "lucide-react";

interface KeyboardShortcutHelpProps {
  readonly open: boolean;
  readonly onClose: () => void;
}

// ── Data (frozen, pattern 8) ──

const SHORTCUTS = Object.freeze([
  Object.freeze({ key: "?", description: "Toggle shortcut help" }),
  Object.freeze({ key: "Escape", description: "Close inspector → panel → help (priority chain)" }),
  Object.freeze({ key: "⌘B / Ctrl+B", description: "Toggle schema panel" }),
  Object.freeze({ key: "⌘K / Ctrl+K", description: "Open AI assistant" }),
  Object.freeze({ key: "⌘⇧E / Ctrl+Shift+E", description: "Export PNG" }),
  Object.freeze({ key: "G", description: "Toggle coordinate system" }),
  Object.freeze({ key: "F", description: "Fullscreen" }),
] as const);

// ── Frozen style objects (pattern 5: no inline allocations in JSX) ──

const OVERLAY_STYLE = Object.freeze({
  position: "fixed",
  inset: 0,
  zIndex: 1000,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
} as const) as React.CSSProperties;

const BACKDROP_STYLE = Object.freeze({
  position: "absolute",
  inset: 0,
  background: "rgba(0,0,0,0.5)",
} as const) as React.CSSProperties;

const CARD_STYLE = Object.freeze({
  position: "relative",
  background: "var(--bg-panel, #1e1e2e)",
  border: "1px solid var(--border, #313244)",
  borderRadius: 8,
  width: 420,
  maxWidth: "calc(100vw - 32px)",
  maxHeight: "calc(100vh - 64px)",
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
} as const) as React.CSSProperties;

const HEADER_STYLE = Object.freeze({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "12px 16px",
  borderBottom: "1px solid var(--border, #313244)",
} as const) as React.CSSProperties;

const HEADER_TITLE_STYLE = Object.freeze({
  fontSize: 14,
  fontWeight: 600,
  color: "var(--text, #cdd6f4)",
} as const) as React.CSSProperties;

const CLOSE_BTN_STYLE = Object.freeze({
  background: "none",
  border: "none",
  cursor: "pointer",
  color: "var(--text-muted, #6c7086)",
  display: "flex",
  alignItems: "center",
  padding: 4,
  borderRadius: 4,
} as const) as React.CSSProperties;

const LIST_STYLE = Object.freeze({
  overflowY: "auto",
  padding: "8px 0",
} as const) as React.CSSProperties;

const ROW_STYLE = Object.freeze({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "6px 16px",
  gap: 16,
} as const) as React.CSSProperties;

const DESC_STYLE = Object.freeze({
  fontSize: 12,
  color: "var(--text-muted, #6c7086)",
  flexShrink: 0,
} as const) as React.CSSProperties;

const KBD_STYLE = Object.freeze({
  fontSize: 11,
  fontFamily: "monospace",
  color: "var(--text, #cdd6f4)",
  background: "var(--bg-surface, #181825)",
  border: "1px solid var(--border, #313244)",
  borderRadius: 4,
  padding: "2px 6px",
  whiteSpace: "nowrap",
  flexShrink: 0,
} as const) as React.CSSProperties;

const ICON_SIZE = 16;

/**
 * Keyboard shortcut help overlay.
 *
 * Escape dismissal is handled by `useKeyboardShortcuts` priority chain —
 * this component does NOT register its own Escape listener (avoids conflict).
 *
 * Memoized — only re-renders when `open` changes.
 */
export const KeyboardShortcutHelp = memo(function KeyboardShortcutHelp({
  open,
  onClose,
}: KeyboardShortcutHelpProps) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
      style={OVERLAY_STYLE}
    >
      {/* Backdrop */}
      <div onClick={onClose} style={BACKDROP_STYLE} />

      {/* Card */}
      <div style={CARD_STYLE}>
        {/* Header */}
        <div style={HEADER_STYLE}>
          <span style={HEADER_TITLE_STYLE}>Keyboard Shortcuts</span>
          <button
            onClick={onClose}
            aria-label="Close keyboard shortcuts"
            style={CLOSE_BTN_STYLE}
          >
            <X size={ICON_SIZE} />
          </button>
        </div>

        {/* Shortcut list */}
        <div style={LIST_STYLE}>
          {SHORTCUTS.map(({ key, description }) => (
            <div key={key} style={ROW_STYLE}>
              <span style={DESC_STYLE}>{description}</span>
              <kbd style={KBD_STYLE}>{key}</kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
},
function helpPropsAreEqual(prev, next) {
  return prev.open === next.open && prev.onClose === next.onClose;
});