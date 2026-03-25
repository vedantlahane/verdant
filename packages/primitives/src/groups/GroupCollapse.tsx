// primitives/src/groups/GroupCollapse.tsx

import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Html } from '@react-three/drei';
import { BoxGeometry } from 'three';
import { usePrimitivesOptional } from '../provider/PrimitivesContext';

export interface GroupCollapseProps {
  /** Whether the group is currently collapsed. */
  collapsed: boolean;
  /** Group display name. */
  label: string;
  /** Number of children (shown as badge on proxy node). */
  childCount: number;
  /** Group color for proxy node. */
  color?: string;
  children?: React.ReactNode;
  /** Called after collapse animation completes. */
  onCollapseComplete?: () => void;
  /** Called after expand animation completes. */
  onExpandComplete?: () => void;
}

// ── Shared geometry for proxy node ──
const _proxyGeometry = new BoxGeometry(1.5, 1.5, 1.5);

export function GroupCollapse({
  collapsed,
  label,
  childCount,
  color = '#4a5568',
  children,
  onCollapseComplete,
  onExpandComplete,
}: GroupCollapseProps) {
  const ctx = usePrimitivesOptional();
  const transitionEngine = ctx?.transitionEngine ?? null;

  const prevCollapsed = useRef(collapsed);
  const [showChildren, setShowChildren] = useState(!collapsed);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const proxyId = useMemo(
    () => `group-collapse-${label}-${Math.random().toString(36).slice(2, 8)}`,
    [label],
  );

  useEffect(() => {
    const wasCollapsed = prevCollapsed.current;
    prevCollapsed.current = collapsed;

    // No change
    if (collapsed === wasCollapsed) return;

    if (collapsed && !wasCollapsed) {
      // ── Collapsing ──
      setIsTransitioning(true);

      if (transitionEngine) {
        transitionEngine.playExit(proxyId, 'scale', 200).then(() => {
          setShowChildren(false);
          setIsTransitioning(false);
          onCollapseComplete?.();
        });
      } else {
        setShowChildren(false);
        setIsTransitioning(false);
        onCollapseComplete?.();
      }
    } else if (!collapsed && wasCollapsed) {
      // ── Expanding ──
      setShowChildren(true);
      setIsTransitioning(true);

      if (transitionEngine) {
        transitionEngine.playEnter(proxyId, 'scale', 250);
        // Enter animations are fire-and-forget
        setTimeout(() => {
          setIsTransitioning(false);
          onExpandComplete?.();
        }, 250);
      } else {
        setIsTransitioning(false);
        onExpandComplete?.();
      }
    }
  }, [collapsed, label, transitionEngine, proxyId, onCollapseComplete, onExpandComplete]);

  // ── Collapsed: render proxy node ──
  if (collapsed && !showChildren) {
    return (
      <group>
        <mesh geometry={_proxyGeometry}>
          <meshStandardMaterial
            color={color}
            transparent
            opacity={0.8}
            metalness={0.1}
            roughness={0.7}
          />
        </mesh>

        {/* Collapsed indicator dots */}
        <mesh position={[0, 0, 0.8]}>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.6} />
        </mesh>
        <mesh position={[-0.15, 0, 0.8]}>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.4} />
        </mesh>
        <mesh position={[0.15, 0, 0.8]}>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.4} />
        </mesh>

        <Html position={[0, 1.2, 0]} center pointerEvents="none">
          <div
            style={{
              color: '#ffffff',
              fontSize: '11px',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              textShadow: '0 0 4px #000000',
              background: 'rgba(0,0,0,0.6)',
              padding: '3px 8px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>▸</span>
            <span>{label}</span>
            <span
              style={{
                background: color,
                borderRadius: '10px',
                padding: '1px 6px',
                fontSize: '10px',
                fontWeight: 700,
              }}
            >
              {childCount}
            </span>
          </div>
        </Html>
      </group>
    );
  }

  // ── Expanded: render children ──
  return (
    <group>
      {showChildren ? children : null}
    </group>
  );
}