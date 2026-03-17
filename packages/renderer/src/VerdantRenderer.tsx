import React, { useEffect, useRef, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
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
  onNodeClick?: (info: {
    nodeId: string;
    screenX: number;
    screenY: number;
  }) => void;
}

// ============================================
// Node type → Component map
// ============================================

const NODE_MAP: Record<string, React.ComponentType<NodeProps>> = {
  server: ServerNode,
  database: DatabaseNode,
  cache: CacheNode,
  gateway: GatewayNode,
  service: ServiceNode,
  user: UserNode,
  client: UserNode,
  queue: QueueNode,
  cloud: CloudNode,
  storage: StorageNode,
  monitor: MonitorNode,
};

// ============================================
// Helper: project 3D position → screen coords
// ============================================

function projectToScreen(
  worldPos: [number, number, number],
  camera: THREE.Camera,
  size: { width: number; height: number },
): { x: number; y: number } {
  const vec = new THREE.Vector3(...worldPos);
  vec.project(camera);
  return {
    x: ((vec.x + 1) / 2) * size.width,
    y: ((-vec.y + 1) / 2) * size.height,
  };
}

// ============================================
// Scene Content (lives inside Canvas)
// ============================================

interface SceneContentProps {
  autoRotate: boolean;
  onNodeClick?: VerdantRendererProps['onNodeClick'];
}

function SceneContent({ autoRotate, onNodeClick }: SceneContentProps) {
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

  const { camera, size } = useThree();
  const controlsRef = useRef<any>(null);
  const idleTimerRef = useRef(0);
  const isInteractingRef = useRef(false);

  // ── Auto-rotation: pause on interaction, resume after 3s ──
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

  // ── Click handler with screen-space projection ──
  const handleNodeClick = useCallback(
    (nodeId: string, position: [number, number, number], e: any) => {
      e.stopPropagation();
      selectNode(nodeId);

      if (onNodeClick) {
        const screen = projectToScreen(position, camera, size);
        onNodeClick({
          nodeId,
          screenX: screen.x,
          screenY: screen.y,
        });
      }
    },
    [camera, size, selectNode, onNodeClick],
  );

  const handlePointerMissed = useCallback(() => {
    selectNode(null);
  }, [selectNode]);

  if (!ast) return null;

  return (
    <>
      {/* ── Lighting ── */}
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[10, 20, 10]}
        intensity={1.2}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <pointLight position={[-10, -10, -10]} intensity={0.3} />

      {/* ── Ground grid ── */}
      <gridHelper
        args={[40, 40, themeColors.accent, `${themeColors.accent}22`]}
        position={[0, -2, 0]}
      />

      {/* ── Fog ── */}
      <fog attach="fog" args={[themeColors.background, 20, 60]} />

      {/* ── Nodes + Edges + Groups ── */}
      <group onPointerMissed={handlePointerMissed}>
        {/* Nodes */}
        {ast.nodes.map((node) => {
          const position = positions[node.id] || [0, 0, 0];
          const isSelected = selectedNodeId === node.id;
          const isHovered = hoveredNodeId === node.id;
          const color = getNodeColor(
            node.type,
            node.props.color as string,
          );

          const Component =
            NODE_MAP[node.type.toLowerCase()] || ServerNode;

          const props: NodeProps = {
            label: (node.props.label as string) || node.id,
            position,
            selected: isSelected,
            hovered: isHovered,
            color,
            size: (node.props.size as string) || 'md',
            glow: node.props.glow === true,
            onClick: (e) => handleNodeClick(node.id, position, e),
            onPointerOver: (e) => {
              e.stopPropagation();
              hoverNode(node.id);
              document.body.style.cursor = 'pointer';
            },
            onPointerOut: () => {
              hoverNode(null);
              document.body.style.cursor = '';
            },
          };

          return <Component key={node.id} {...props} />;
        })}

        {/* Edges */}
        {ast.edges.map((edge, i) => {
          const fromPos = positions[edge.from];
          const toPos = positions[edge.to];
          if (!fromPos || !toPos) return null;

          return (
            <EdgeLine
              key={`edge-${edge.from}-${edge.to}-${i}`}
              from={fromPos}
              to={toPos}
              label={edge.props.label}
              animated={
                edge.props.style === 'animated' || !edge.props.style
              }
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

          const padding = 1.5;
          let minX = Infinity,
            maxX = -Infinity;
          let minY = Infinity,
            maxY = -Infinity;
          let minZ = Infinity,
            maxZ = -Infinity;

          childPositions.forEach(([x, y, z]) => {
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
            minZ = Math.min(minZ, z);
            maxZ = Math.max(maxZ, z);
          });

          const cx = (minX + maxX) / 2;
          const cy = (minY + maxY) / 2;
          const cz = (minZ + maxZ) / 2;
          const sx = maxX - minX + padding * 2;
          const sy = maxY - minY + padding * 2;
          const sz = Math.max(maxZ - minZ + padding * 2, 0.1);

          const boxGeo = new THREE.BoxGeometry(sx, sy, sz);

          return (
            <group key={`group-${group.id}`}>
              {/* Fill */}
              <mesh position={[cx, cy, cz]}>
                <boxGeometry args={[sx, sy, sz]} />
                <meshBasicMaterial
                  color={themeColors.accent}
                  transparent
                  opacity={0.06}
                  depthWrite={false}
                />
              </mesh>
              {/* Wireframe */}
              <lineSegments position={[cx, cy, cz]}>
                <edgesGeometry args={[boxGeo]} />
                <lineBasicMaterial
                  color={themeColors.accent}
                  transparent
                  opacity={0.25}
                />
              </lineSegments>
            </group>
          );
        })}
      </group>

      {/* ── Controls ── */}
      <OrbitControls
        ref={controlsRef}
        makeDefault
        enableDamping
        dampingFactor={0.05}
        minDistance={3}
        maxDistance={50}
        autoRotate={autoRotate}
        autoRotateSpeed={0.5}
        onStart={() => {
          isInteractingRef.current = true;
        }}
        onEnd={() => {
          isInteractingRef.current = false;
        }}
      />
    </>
  );
}

// ============================================
// Main Renderer
// ============================================

export function VerdantRenderer({
  ast,
  theme = "moss",
  width = "100%",
  height = "100%",
  className,
  autoRotate = true,
  onNodeClick,
}: VerdantRendererProps) {
  const { setAst, setTheme } = useRendererStore();

  useEffect(() => { setAst(ast); }, [ast, setAst]);
  useEffect(() => { setTheme(theme); }, [theme, setTheme]);

  // Background is ALWAYS page-bg (black or white). No theme-colored backgrounds.
  const bg = typeof document !== "undefined"
    ? getComputedStyle(document.documentElement).getPropertyValue("--page-bg").trim() || "#000000"
    : "#000000";

  const cameraConfig = useMemo(() => ({
    position: [0, 6, 12] as [number, number, number],
    fov: ast.config.camera === "orthographic" ? undefined : 45,
  }), [ast.config.camera]);

  return (
    <div className={className} style={{ width, height, overflow: "hidden" }}>
      <Canvas
        style={{ width: "100%", height: "100%" }}
        camera={{ position: cameraConfig.position, fov: cameraConfig.fov || 45 }}
        gl={{ preserveDrawingBuffer: true, antialias: true, alpha: true }}
        dpr={[1, 2]}
      >
        <color attach="background" args={[bg]} />
        <SceneContent autoRotate={autoRotate} onNodeClick={onNodeClick} />
      </Canvas>
    </div>
  );
}