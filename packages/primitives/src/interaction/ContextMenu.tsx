import React, { useEffect, useRef } from 'react';

export interface ContextAction {
  id: string;
  label: string;
  elementType: 'node' | 'edge' | 'both';
  handler: (elementId: string) => void;
}

export interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  elementId: string;
  elementType: 'node' | 'edge';
}

export interface ContextMenuProps {
  state: ContextMenuState;
  actions: ContextAction[];
  onClose: () => void;
}

export function ContextMenu({ state, actions, onClose }: ContextMenuProps): React.ReactElement | null {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!state.visible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
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
  }, [state.visible, onClose]);

  if (!state.visible) return null;

  const filteredActions = actions.filter(
    (a) => a.elementType === 'both' || a.elementType === state.elementType
  );

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        left: state.x,
        top: state.y,
        zIndex: 9999,
        background: '#fff',
        border: '1px solid #ccc',
        borderRadius: 4,
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        minWidth: 120,
        padding: '4px 0',
      }}
      role="menu"
    >
      {filteredActions.map((action) => (
        <button
          key={action.id}
          role="menuitem"
          style={{
            display: 'block',
            width: '100%',
            padding: '6px 12px',
            background: 'none',
            border: 'none',
            textAlign: 'left',
            cursor: 'pointer',
            fontSize: 14,
          }}
          onClick={() => {
            action.handler(state.elementId);
            onClose();
          }}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}
