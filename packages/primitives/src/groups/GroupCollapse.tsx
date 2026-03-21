import React, { useRef, useState, useEffect } from 'react';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { usePrimitives } from '../provider/PrimitivesContext';

export interface GroupCollapseProps {
  collapsed: boolean;
  label: string;
  childCount: number;
  children?: React.ReactNode;
  onCollapseComplete?: () => void;
}

/** Safely attempt to get the primitives context — returns null if outside provider */
function tryUsePrimitives() {
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return usePrimitives();
  } catch {
    return null;
  }
}

export function GroupCollapse({
  collapsed,
  label,
  childCount,
  children,
  onCollapseComplete,
}: GroupCollapseProps) {
  const ctx = tryUsePrimitives();
  const transitionEngine = ctx?.transitionEngine ?? null;

  const prevCollapsed = useRef(collapsed);
  const [showChildren, setShowChildren] = useState(!collapsed);

  useEffect(() => {
    const wasCollapsed = prevCollapsed.current;
    prevCollapsed.current = collapsed;

    if (collapsed && !wasCollapsed) {
      // Collapsing: play exit animations then hide children
      if (transitionEngine) {
        const proxyId = `group-collapse-proxy-${label}`;
        transitionEngine.playExit(proxyId, 'fade').then(() => {
          setShowChildren(false);
          onCollapseComplete?.();
        });
      } else {
        setShowChildren(false);
        onCollapseComplete?.();
      }
    } else if (!collapsed && wasCollapsed) {
      // Expanding: show children and play enter animations
      setShowChildren(true);
      if (transitionEngine) {
        const proxyId = `group-collapse-proxy-${label}`;
        transitionEngine.playEnter(proxyId, 'fade');
      }
    }
  }, [collapsed, label, transitionEngine, onCollapseComplete]);

  if (collapsed) {
    // Render proxy node with label and child count badge
    return (
      <group>
        <mesh>
          <boxGeometry args={[1.5, 1.5, 1.5]} />
          <meshStandardMaterial color="#4a5568" transparent opacity={0.8} />
        </mesh>
        <Html position={[0, 1.2, 0]} center pointerEvents="none">
          <div
            style={{
              color: '#ffffff',
              fontSize: '11px',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              textShadow: '0 0 4px #000000',
              background: 'rgba(0,0,0,0.5)',
              padding: '2px 6px',
              borderRadius: '3px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span>{label}</span>
            <span
              style={{
                background: '#4299e1',
                borderRadius: '10px',
                padding: '0 5px',
                fontSize: '10px',
              }}
            >
              {childCount}
            </span>
          </div>
        </Html>
      </group>
    );
  }

  return <>{showChildren ? children : null}</>;
}
