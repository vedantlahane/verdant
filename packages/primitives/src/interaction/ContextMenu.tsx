// primitives/src/interaction/ContextMenu.tsx

import React, { useEffect, useRef, useCallback, useState, useMemo } from 'react';

// ── Types ───────────────────────────────────────────────────

export interface ContextAction {
  id: string;
  label: string;
  /** Which element types this action applies to. */
  appliesTo: Array<'node' | 'edge' | 'group' | 'canvas'>;
  /** Handler called when the action is selected. */
  handler: (context: { targetId?: string; targetType?: string }) => void;
  /** Icon identifier (emoji or icon key). */
  icon?: string;
  /** Keyboard shortcut hint (display only). */
  shortcut?: string;
  /** If true, render a separator line before this action. */
  separator?: boolean;
  /** Disable the action (grayed out, not clickable). */
  disabled?: boolean;
}

export interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  targetId?: string;
  targetType: 'node' | 'edge' | 'group' | 'canvas';
}

export interface ContextMenuProps {
  state: ContextMenuState;
  actions: ContextAction[];
  onClose: () => void;
  /** Color scheme. @default "dark" */
  theme?: 'dark' | 'light';
}

// ── Styles ──────────────────────────────────────────────────

const THEMES = {
  dark: {
    bg: 'rgba(30, 30, 40, 0.95)',
    border: 'rgba(255, 255, 255, 0.12)',
    text: '#e2e8f0',
    textDisabled: '#64748b',
    hover: 'rgba(255, 255, 255, 0.08)',
    separator: 'rgba(255, 255, 255, 0.08)',
    shortcut: '#64748b',
    shadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
  },
  light: {
    bg: 'rgba(255, 255, 255, 0.98)',
    border: 'rgba(0, 0, 0, 0.1)',
    text: '#1e293b',
    textDisabled: '#94a3b8',
    hover: 'rgba(0, 0, 0, 0.05)',
    separator: 'rgba(0, 0, 0, 0.08)',
    shortcut: '#94a3b8',
    shadow: '0 4px 16px rgba(0, 0, 0, 0.12)',
  },
} as const;

// ── Component ───────────────────────────────────────────────

export function ContextMenu({
  state,
  actions,
  onClose,
  theme = 'dark',
}: ContextMenuProps): React.ReactElement | null {
  const menuRef = useRef<HTMLDivElement>(null);
  const [focusIndex, setFocusIndex] = useState(-1);
  const colors = THEMES[theme];

  // ── Memoize filtered actions for this element type ──
  const filteredActions = useMemo(
    () =>
      actions.filter(
        (a) => a.appliesTo.includes(state.targetType),
      ),
    [actions, state.targetType],
  );

  // ── Memoize enabled indices to prevent listener re-attachment ──
  const enabledIndices = useMemo(
    () =>
      filteredActions
        .map((a, i) => (a.disabled ? -1 : i))
        .filter((i) => i >= 0),
    [filteredActions],
  );

  // ── Close on Escape or outside click ──
  useEffect(() => {
    if (!state.visible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          onClose();
          break;

        case 'ArrowDown': {
          e.preventDefault();
          const currentIdx = enabledIndices.indexOf(focusIndex);
          const nextIdx = enabledIndices[(currentIdx + 1) % enabledIndices.length];
          setFocusIndex(nextIdx ?? -1);
          break;
        }

        case 'ArrowUp': {
          e.preventDefault();
          const currentIdx = enabledIndices.indexOf(focusIndex);
          const prevIdx =
            enabledIndices[
              (currentIdx - 1 + enabledIndices.length) % enabledIndices.length
            ];
          setFocusIndex(prevIdx ?? -1);
          break;
        }

        case 'Enter':
        case ' ': {
          e.preventDefault();
          if (focusIndex >= 0 && focusIndex < filteredActions.length) {
            const action = filteredActions[focusIndex];
            if (!action.disabled) {
              action.handler({
                targetId: state.targetId,
                targetType: state.targetType,
              });
              onClose();
            }
          }
          break;
        }
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, [state.visible, state.targetId, state.targetType, onClose, focusIndex, filteredActions, enabledIndices]);

  // Reset focus when menu opens
  useEffect(() => {
    if (state.visible) {
      setFocusIndex(-1);
    }
  }, [state.visible]);

  if (!state.visible || filteredActions.length === 0) return null;

  // ── Position clamping (keep menu within viewport) ──
  const menuWidth = 200;
  const menuHeight = filteredActions.length * 32 + 8;
  const x = Math.min(state.x, window.innerWidth - menuWidth - 8);
  const y = Math.min(state.y, window.innerHeight - menuHeight - 8);

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label="Context menu"
      style={{
        position: 'fixed',
        left: x,
        top: y,
        zIndex: 9999,
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        borderRadius: 8,
        boxShadow: colors.shadow,
        minWidth: menuWidth,
        padding: '4px 0',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      {filteredActions.map((action, index) => (
        <React.Fragment key={action.id}>
          {/* Separator */}
          {action.separator && index > 0 && (
            <div
              style={{
                height: 1,
                background: colors.separator,
                margin: '4px 8px',
              }}
            />
          )}

          {/* Action button */}
          <button
            role="menuitem"
            aria-disabled={action.disabled}
            tabIndex={-1}
            style={{
              display: 'flex',
              alignItems: 'center',
              width: '100%',
              padding: '6px 12px',
              background: index === focusIndex ? colors.hover : 'none',
              border: 'none',
              textAlign: 'left',
              cursor: action.disabled ? 'default' : 'pointer',
              fontSize: 13,
              fontFamily: 'inherit',
              color: action.disabled ? colors.textDisabled : colors.text,
              opacity: action.disabled ? 0.5 : 1,
              gap: '8px',
              borderRadius: 4,
              margin: '0 4px',
              outline: index === focusIndex ? `2px solid #60a5fa` : 'none',
              outlineOffset: -2,
            }}
            onMouseEnter={() => setFocusIndex(index)}
            onClick={() => {
              if (action.disabled) return;
              action.handler({
                targetId: state.targetId,
                targetType: state.targetType,
              });
              onClose();
            }}
          >
            {/* Icon */}
            {action.icon && (
              <span style={{ fontSize: 14, width: 18, textAlign: 'center' }}>
                {action.icon}
              </span>
            )}

            {/* Label */}
            <span style={{ flex: 1 }}>{action.label}</span>

            {/* Shortcut */}
            {action.shortcut && (
              <span
                style={{
                  fontSize: 11,
                  color: colors.shortcut,
                  marginLeft: 12,
                }}
              >
                {action.shortcut}
              </span>
            )}
          </button>
        </React.Fragment>
      ))}
    </div>
  );
}