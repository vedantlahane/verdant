import React, { useEffect, useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import { VrdAST } from '@repo/parser';
import { useRendererStore } from './store';

import {
  ServerNode,
  DatabaseNode,
  CacheNode,
  GatewayNode,
  ServiceNode,
  UserNode,
  QueueNode,
  CloudNode,
  StorageNode,
  MonitorNode,
  EdgeLine,
  NodeProps,
} from '@repo/components';

// ============================================
// Props
// ============================================

export interface VerdantRendererProps {
  ast: VrdAST;
  theme?: string;
  width?: string | number;
  height?: string | number;
  className?: string;
  autoRotate?: boolean;
}

// ============================================
// Component Type → React Component Map
// ============================================

const NODE_COMPONENT_MAP: Record<string, React.ComponentType<NodeProps>> = {
  server:   ServerNode,
  database: DatabaseNode,
  cache:    CacheNode,
  gateway:  GatewayNode,
  service:  ServiceNode,
  user:     UserNode,
  client:   UserNode,
  queue:    QueueNode,
  cloud:    CloudNode,
  storage:  StorageNode,
  monitor:  MonitorNode,
};

// ============================================
// Scene Content (inside Canvas)
// ============================================

function SceneContent({ autoRotate = true }: { autoRotate?: boolean }) {
  const {
    ast,
    positions,
    selectedNodeId,
    hoveredNodeId,
    selectNode,
    hoverNode,
    getNodeColor,
    themeColors,
  } = useRendererStore();

  const controlsRef = useRef<any>(null);
  const idleTimerRef = useRef<number>(0);
  const isInteractingRef = useRef(false);

  // Auto-rotation: pause on interaction, resume after 3s idle
  useFrame((_, delta) => {
    if (!controlsRef.current || !autoRotate) return;

    if (isInteractingRef.current) {
      controlsRef.current.autoRotate = false;
      idleTimerRef.current = 0;
    } else {
      idleTimerRef.current += delta;
      if (idleTimerRef.current > 3) {
        controlsRef.current.autoRotate = true;
      }
    }
  });

  const handlePointerMissed = () => {
    selectNode(null);
  };

  if (!ast) return null;

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[10, 20, 10]}
        intensity={1.2}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <pointLight position={[-10, -10, -10]} intensity={0.3} />

      {/* Ground plane (subtle grid) */}
      <gridHelper
        args={[40, 40, themeColors.accent, `${themeColors.accent}22`]}
        position={[0, -2, 0]}
        rotation={[0, 0, 0]}
      />

      {/* Fog for depth */}
      <fog attach="fog" args={[themeColors.background, 20, 60]} />

      {/* Nodes */}
      <group onPointerMissed={handlePointerMissed}>
        {ast.nodes.map((node) => {
          const position = positions[node.id] || [0, 0, 0];
          const isSelected = selectedNodeId === node.id;
          const isHovered = hoveredNodeId === node.id;
          const color = getNodeColor(node.type, node.props.color as string);

          const commonProps: NodeProps = {
            label: (node.props.label as string) || node.id,
            position,
            selected: isSelected,
            hovered: isHovered,
            color,
            size: (node.props.size as string) || 'md',
            glow: node.props.glow === true,
            onClick: (e) => {
              e.stopPropagation();
              selectNode(node.id);
            },
            onPointerOver: (e) => {
              e.stopPropagation();
              hoverNode(node.id);
            },
            onPointerOut: () => {
              hoverNode(null);
            },
          };

          const Component =
            NODE_COMPONENT_MAP[node.type.toLowerCase()] || ServerNode;

          return <Component key={node.id} {...commonProps} />;
        })}

        {/* Edges */}
        {ast.edges.map((edge, index) => {
          const fromPos = positions[edge.from];
          const toPos = positions[edge.to];

          if (!fromPos || !toPos) return null;

          return (
            <EdgeLine
              key={`edge-${edge.from}-${edge.to}-${index}`}
              from={fromPos}
              to={toPos}
              label={edge.props.label}
              animated={edge.props.style === 'animated' || !edge.props.style}
              style={edge.props.style || 'solid'}
              color={edge.props.color || themeColors.edgeDefault}
              width={edge.props.width}
            />
          );
        })}

        {/* Group bounding boxes */}
        {ast.groups.map((group) => {
          const childPositions = group.children
            .map((id) => positions[id])
            .filter(Boolean) as [number, number, number][];

          if (childPositions.length === 0) return null;

          // Calculate bounding box
          const padding = 1.5;
          let minX = Infinity, maxX = -Infinity;
          let minY = Infinity, maxY = -Infinity;
          let minZ = Infinity, maxZ = -Infinity;

          childPositions.forEach(([x, y, z]) => {
            minX = Math.min(minX, x); maxX = Math.max(maxX, x);
            minY = Math.min(minY, y); maxY = Math.max(maxY, y);
            minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
          });

          const cx = (minX + maxX) / 2;
          const cy = (minY + maxY) / 2;
          const cz = (minZ + maxZ) / 2;
          const sx = maxX - minX + padding * 2;
          const sy = maxY - minY + padding * 2;
          const sz = Math.max(maxZ - minZ + padding * 2, 0.1);

          return (
            <group key={`group-${group.id}`}>
              {/* Bounding box wireframe */}
              <mesh position={[cx, cy, cz]}>
                <boxGeometry args={[sx, sy, sz]} />
                <meshBasicMaterial
                  color={themeColors.accent}
                  transparent
                  opacity={0.06}
                  depthWrite={false}
                />
              </mesh>
              <lineSegments position={[cx, cy, cz]}>
                <edgesGeometry
                  args={[new THREE.BoxGeometry(sx, sy, sz)]}
                />
                <lineBasicMaterial
                  color={themeColors.accent}
                  transparent
                  opacity={0.25}
                />
              </lineSegments>
              {/* Group label */}
              {/* TODO: Use Text from @react-three/drei for group label */}
            </group>
          );
        })}
      </group>

      {/* Controls */}
      <OrbitControls
        ref={controlsRef}
        makeDefault
        enableDamping
        dampingFactor={0.05}
        minDistance={3}
        maxDistance={50}
        autoRotate={autoRotate}
        autoRotateSpeed={0.5}
        onStart={() => { isInteractingRef.current = true; }}
        onEnd={() => { isInteractingRef.current = false; }}
      />
    </>
  );
}

// ============================================
// Main Renderer Component
// ============================================

import * as THREE from 'three';

export function VerdantRenderer({
  ast,
  theme = 'moss',
  width = '100%',
  height = '100%',
  className,
  autoRotate = true,
}: VerdantRendererProps) {
  const { setAst, setTheme, themeColors } = useRendererStore();

  useEffect(() => {
    setAst(ast);
  }, [ast, setAst]);

  useEffect(() => {
    setTheme(theme);
  }, [theme, setTheme]);

  const cameraConfig = useMemo(() => {
    const type = ast.config.camera || 'perspective';
    return {
      fov: type === 'perspective' ? 45 : undefined,
      position: [0, 6, 12] as [number, number, number],
      orthographic: type === 'orthographic',
    };
  }, [ast.config.camera]);

  return (
    <div
      className={className}
      style={{
        width,
        height,
        background: themeColors.background,
        borderRadius: '1rem',
        overflow: 'hidden',
      }}
    >
      <Canvas
        style={{ width: '100%', height: '100%' }}
        camera={{
          position: cameraConfig.position,
          fov: cameraConfig.fov || 45,
        }}
        gl={{
          preserveDrawingBuffer: true,
          antialias: true,
          alpha: true,
        }}
        dpr={[1, 2]}
      >
        <color attach="background" args={[themeColors.background]} />
        <SceneContent autoRotate={autoRotate} />
      </Canvas>
    </div>
  );
}