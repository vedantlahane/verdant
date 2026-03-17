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

import {
  MeasurementLinesGroup,
  MeasurementLine,
} from "./MeasurementLines";

// ============================================
// Props
// ============================================

export interface CameraData {
  position: [number, number, number];
  fov: number;
  /** World axes projected into view space (x-right, y-up, z-toward-viewer) */
  axisProjections: {
    x: [number, number, number];
    y: [number, number, number];
    z: [number, number, number];
  };
}

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
  onCameraChange?: (data: CameraData) => void;
  selectedNodeId?: string | null;
}

// ============================================
// Node type → Component
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
// 3D → 2D screen projection
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

function CameraTracker({
  onCameraChange,
}: {
  onCameraChange: (data: CameraData) => void;
}) {
  const { camera } = useThree();
  const frameCount = useRef(0);
  const lastEmit = useRef('');

  // Reusable objects — no GC pressure inside useFrame
  const _invQ = useMemo(() => new THREE.Quaternion(), []);
  const _v = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    frameCount.current++;
    if (frameCount.current % 8 !== 0) return; // ~7.5 updates/sec at 60fps

    const px = Math.round(camera.position.x * 10) / 10;
    const py = Math.round(camera.position.y * 10) / 10;
    const pz = Math.round(camera.position.z * 10) / 10;
    const fov = Math.round(
      (camera as THREE.PerspectiveCamera).fov ?? 45,
    );

    // Project world axes into camera (view) space
    _invQ.copy(camera.quaternion).invert();

    _v.set(1, 0, 0).applyQuaternion(_invQ);
    const ax: [number, number, number] = [
      Math.round(_v.x * 100) / 100,
      Math.round(_v.y * 100) / 100,
      Math.round(_v.z * 100) / 100,
    ];

    _v.set(0, 1, 0).applyQuaternion(_invQ);
    const ay: [number, number, number] = [
      Math.round(_v.x * 100) / 100,
      Math.round(_v.y * 100) / 100,
      Math.round(_v.z * 100) / 100,
    ];

    _v.set(0, 0, 1).applyQuaternion(_invQ);
    const az: [number, number, number] = [
      Math.round(_v.x * 100) / 100,
      Math.round(_v.y * 100) / 100,
      Math.round(_v.z * 100) / 100,
    ];

    // Dedup: skip if nothing changed
    const key = `${px},${py},${pz},${fov},${ax[0]},${ax[1]},${ay[0]},${ay[1]},${az[0]},${az[1]}`;
    if (key === lastEmit.current) return;
    lastEmit.current = key;

    onCameraChange({
      position: [px, py, pz],
      fov,
      axisProjections: { x: ax, y: ay, z: az },
    });
  });

  return null;
}

// ============================================
// Blueprint Ground Plane
// ============================================

/** Re-usable line geometry builder */
function makeLineGeo(points: number[]): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(points, 3),
  );
  return geo;
}

function BlueprintGroundPlane() {
  // ── Config ──
  const GRID_SIZE = 40;          // total extent in each direction from origin
  const MAJOR_STEP = 4;          // major grid every 4 units
  const MINOR_STEP = 1;          // minor grid every 1 unit
  const AXIS_LENGTH = GRID_SIZE;
  const TICK_EVERY = 2;          // tick marks along axes
  const TICK_SIZE = 0.12;
  const FADE_START = GRID_SIZE * 0.3;
  const FADE_END = GRID_SIZE * 0.95;

  // ── Axis geometries ──
  const xAxisGeo = useMemo(
    () => makeLineGeo([-AXIS_LENGTH, 0, 0, AXIS_LENGTH, 0, 0]),
    [],
  );
  const yAxisGeo = useMemo(
    () => makeLineGeo([0, 0, 0, 0, AXIS_LENGTH * 0.6, 0]),
    [],
  );
  const zAxisGeo = useMemo(
    () => makeLineGeo([0, 0, -AXIS_LENGTH, 0, 0, AXIS_LENGTH]),
    [],
  );

  // ── Minor grid lines (Y=0 plane) ──
  const minorLines = useMemo(() => {
    const verts: number[] = [];
    for (let i = -GRID_SIZE; i <= GRID_SIZE; i += MINOR_STEP) {
      if (i % MAJOR_STEP === 0) continue; // skip majors
      if (i === 0) continue;              // skip origin
      // Lines parallel to Z
      verts.push(i, 0, -GRID_SIZE, i, 0, GRID_SIZE);
      // Lines parallel to X
      verts.push(-GRID_SIZE, 0, i, GRID_SIZE, 0, i);
    }
    return makeLineGeo(verts);
  }, []);

  // ── Major grid lines (Y=0 plane) ──
  const majorLines = useMemo(() => {
    const verts: number[] = [];
    for (let i = -GRID_SIZE; i <= GRID_SIZE; i += MAJOR_STEP) {
      if (i === 0) continue; // skip axes
      // Lines parallel to Z
      verts.push(i, 0, -GRID_SIZE, i, 0, GRID_SIZE);
      // Lines parallel to X
      verts.push(-GRID_SIZE, 0, i, GRID_SIZE, 0, i);
    }
    return makeLineGeo(verts);
  }, []);

  // ── Tick marks along axes ──
  const ticks = useMemo(() => {
    const result: {
      pos: [number, number, number];
      axis: 'x' | 'y' | 'z';
    }[] = [];
    const count = Math.floor(AXIS_LENGTH / TICK_EVERY);
    for (let i = -count; i <= count; i++) {
      if (i === 0) continue;
      const v = i * TICK_EVERY;
      result.push({ pos: [v, 0, 0], axis: 'x' });
      result.push({ pos: [0, 0, v], axis: 'z' });
    }
    // Y axis ticks (shorter range)
    const yCount = Math.floor((AXIS_LENGTH * 0.6) / TICK_EVERY);
    for (let i = 1; i <= yCount; i++) {
      result.push({ pos: [0, i * TICK_EVERY, 0], axis: 'y' });
    }
    return result;
  }, []);

  // ── Origin crosshair (flat on Y=0) ──
  const crosshairGeo = useMemo(() => {
    const s = 0.5;
    return makeLineGeo([
      -s, 0.005, 0, s, 0.005, 0,
      0, 0.005, -s, 0, 0.005, s,
    ]);
  }, []);

  // ── Fade shader material for grid lines ──
  const fadeGridMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        uColor: { value: new THREE.Color('#ffffff') },
        uBaseOpacity: { value: 0.06 },
        uFadeStart: { value: FADE_START },
        uFadeEnd: { value: FADE_END },
      },
      vertexShader: `
        varying vec3 vWorldPos;
        void main() {
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPos = worldPos.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uBaseOpacity;
        uniform float uFadeStart;
        uniform float uFadeEnd;
        varying vec3 vWorldPos;
        void main() {
          float dist = length(vWorldPos.xz);
          float fade = 1.0 - smoothstep(uFadeStart, uFadeEnd, dist);
          gl_FragColor = vec4(uColor, uBaseOpacity * fade);
        }
      `,
    });
  }, []);

  const fadeMajorMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        uColor: { value: new THREE.Color('#ffffff') },
        uBaseOpacity: { value: 0.12 },
        uFadeStart: { value: FADE_START },
        uFadeEnd: { value: FADE_END },
      },
      vertexShader: `
        varying vec3 vWorldPos;
        void main() {
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPos = worldPos.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uBaseOpacity;
        uniform float uFadeStart;
        uniform float uFadeEnd;
        varying vec3 vWorldPos;
        void main() {
          float dist = length(vWorldPos.xz);
          float fade = 1.0 - smoothstep(uFadeStart, uFadeEnd, dist);
          gl_FragColor = vec4(uColor, uBaseOpacity * fade);
        }
      `,
    });
  }, []);

  // ── Sync grid color to theme ──
  const { themeColors } = useRendererStore();

  useEffect(() => {
    const isDark =
      typeof document !== 'undefined' &&
      getComputedStyle(document.documentElement)
        .getPropertyValue('--page-bg')
        .trim() !== '#FFFFFF';

    const gridColor = isDark ? '#ffffff' : '#000000';
    fadeGridMaterial.uniforms.uColor.value.set(gridColor);
    fadeMajorMaterial.uniforms.uColor.value.set(gridColor);
  }, [themeColors, fadeGridMaterial, fadeMajorMaterial]);

  return (
    <group>
      {/* ── Minor grid (faint, fades with distance) ── */}
      <lineSegments geometry={minorLines} material={fadeGridMaterial} />

      {/* ── Major grid (slightly stronger, fades with distance) ── */}
      <lineSegments geometry={majorLines} material={fadeMajorMaterial} />

      {/* ── X axis (red) ── */}
      <lineSegments geometry={xAxisGeo}>
        <lineBasicMaterial
          color="#e57373"
          transparent
          opacity={0.3}
          depthWrite={false}
        />
      </lineSegments>

      {/* ── Y axis (green) — points up ── */}
      <lineSegments geometry={yAxisGeo}>
        <lineBasicMaterial
          color="#81c784"
          transparent
          opacity={0.25}
          depthWrite={false}
        />
      </lineSegments>

      {/* ── Z axis (blue) ── */}
      <lineSegments geometry={zAxisGeo}>
        <lineBasicMaterial
          color="#64b5f6"
          transparent
          opacity={0.3}
          depthWrite={false}
        />
      </lineSegments>

      {/* ── Origin crosshair ── */}
      <lineSegments geometry={crosshairGeo}>
        <lineBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.5}
          depthWrite={false}
        />
      </lineSegments>

      {/* ── Origin ring ── */}
      <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.35, 0.4, 32]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.12}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* ── Origin dot ── */}
      <mesh position={[0, 0.01, 0]}>
        <sphereGeometry args={[0.06, 12, 12]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.4} />
      </mesh>

      {/* ── Tick marks ── */}
      {ticks.map((tick, i) => {
        const color =
          tick.axis === 'x'
            ? '#e57373'
            : tick.axis === 'y'
              ? '#81c784'
              : '#64b5f6';

        return (
          <mesh key={i} position={tick.pos}>
            <boxGeometry args={[TICK_SIZE, TICK_SIZE, TICK_SIZE]} />
            <meshBasicMaterial
              color={color}
              transparent
              opacity={0.15}
              depthWrite={false}
            />
          </mesh>
        );
      })}

      {/* ── Axis endpoint arrows (subtle) ── */}
      {/* X+ */}
      <mesh position={[AXIS_LENGTH, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <coneGeometry args={[0.12, 0.4, 8]} />
        <meshBasicMaterial color="#e57373" transparent opacity={0.25} />
      </mesh>
      {/* Y+ */}
      <mesh position={[0, AXIS_LENGTH * 0.6, 0]}>
        <coneGeometry args={[0.12, 0.4, 8]} />
        <meshBasicMaterial color="#81c784" transparent opacity={0.25} />
      </mesh>
      {/* Z+ */}
      <mesh position={[0, 0, AXIS_LENGTH]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.12, 0.4, 8]} />
        <meshBasicMaterial color="#64b5f6" transparent opacity={0.25} />
      </mesh>
    </group>
  );
}

// ============================================
// Scene Content
// ============================================

interface SceneContentProps {
  autoRotate: boolean;
  onNodeClick?: VerdantRendererProps['onNodeClick'];
  selectedNodeId?: string | null;
}

function SceneContent({
  autoRotate,
  onNodeClick,
  selectedNodeId: externalSelectedId,
}: SceneContentProps) {
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

  // ── Use external selection if provided ──
  const activeNodeId = externalSelectedId ?? selectedNodeId;

  // ── Build measurement lines for selected node ──
  const measurementLines = useMemo<MeasurementLine[]>(() => {
    if (!activeNodeId || !ast) return [];

    const lines: MeasurementLine[] = [];

    // Outgoing edges
    ast.edges
      .filter((e) => e.from === activeNodeId)
      .forEach((edge) => {
        const fromPos = positions[edge.from];
        const toPos = positions[edge.to];
        if (!fromPos || !toPos) return;
        lines.push({
          from: fromPos,
          to: toPos,
          fromId: edge.from,
          toId: edge.to,
          label: edge.props.label as string,
          direction: "outgoing",
        });
      });

    // Incoming edges
    ast.edges
      .filter((e) => e.to === activeNodeId)
      .forEach((edge) => {
        const fromPos = positions[edge.from];
        const toPos = positions[edge.to];
        if (!fromPos || !toPos) return;
        lines.push({
          from: fromPos,
          to: toPos,
          fromId: edge.from,
          toId: edge.to,
          label: edge.props.label as string,
          direction: "incoming",
        });
      });

    return lines;
  }, [activeNodeId, ast, positions]);

  // Auto-rotation: pause on interaction, resume after 3s
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

  const handleNodeClick = useCallback(
    (nodeId: string, position: [number, number, number], e: any) => {
      e.stopPropagation();
      selectNode(nodeId);
      if (onNodeClick) {
        const screen = projectToScreen(position, camera, size);
        onNodeClick({ nodeId, screenX: screen.x, screenY: screen.y });
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
      {/* ── Lighting (neutral, no colored tints) ── */}
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[10, 20, 10]}
        intensity={1.0}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <pointLight position={[-10, -10, -10]} intensity={0.2} />

      {/* ── Blueprint ground plane (replaces AxisLines) ── */}
      <BlueprintGroundPlane />

      {/* ── Measurement dimension lines ── */}
      <MeasurementLinesGroup
        lines={measurementLines}
        accentColor={themeColors.accent}
      />

      {/* ── Nodes + Edges + Groups ── */}
      <group onPointerMissed={handlePointerMissed}>
        {/* Nodes */}
        {ast.nodes.map((node) => {
          const position = positions[node.id] || [0, 0, 0];
          const isSelected = selectedNodeId === node.id;
          const isHovered = hoveredNodeId === node.id;
          const color = getNodeColor(node.type, node.props.color as string);
          const Component = NODE_MAP[node.type.toLowerCase()] || ServerNode;

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

          const boxGeo = new THREE.BoxGeometry(sx, sy, sz);

          return (
            <group key={`group-${group.id}`}>
              {/* Fill */}
              <mesh position={[cx, cy, cz]}>
                <boxGeometry args={[sx, sy, sz]} />
                <meshBasicMaterial
                  color={themeColors.accent}
                  transparent
                  opacity={0.04}
                  depthWrite={false}
                />
              </mesh>
              {/* Wireframe edges */}
              <lineSegments position={[cx, cy, cz]}>
                {/* @ts-ignore */}
                <edgesGeometry args={[boxGeo]} />
                <lineBasicMaterial
                  color={themeColors.accent}
                  transparent
                  opacity={0.2}
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
        onStart={() => { isInteractingRef.current = true; }}
        onEnd={() => { isInteractingRef.current = false; }}
      />
    </>
  );
}

// ============================================
// Main Renderer
// ============================================

export function VerdantRenderer({
  ast,
  theme = 'moss',
  width = '100%',
  height = '100%',
  className,
  autoRotate = true,
  onNodeClick,
  onCameraChange,
  selectedNodeId,
}: VerdantRendererProps) {
  const { setAst, setTheme } = useRendererStore();

  useEffect(() => { setAst(ast); }, [ast, setAst]);
  useEffect(() => { setTheme(theme); }, [theme, setTheme]);

  const bg = useMemo(() => {
    if (typeof document === 'undefined') return '#000000';
    const val = getComputedStyle(document.documentElement)
      .getPropertyValue('--page-bg')
      .trim();
    if (val === '#FFFFFF' || val === '#ffffff') return '#ffffff';
    return '#000000';
  }, [theme]);

  const cameraPosition = useMemo<[number, number, number]>(
    () => [0, 6, 12],
    [],
  );

  return (
    <div className={className} style={{ width, height, overflow: 'hidden' }}>
      <Canvas
        style={{ width: '100%', height: '100%' }}
        camera={{ position: cameraPosition, fov: 45 }}
        gl={{
          preserveDrawingBuffer: true,
          antialias: true,
          alpha: false,
        }}
        dpr={[1, 2]}
      >
        <color attach="background" args={[bg]} />
        <SceneContent
          autoRotate={autoRotate}
          onNodeClick={onNodeClick}
          selectedNodeId={selectedNodeId}
        />
        {/* ── Camera bridge: emits position to outer UI ── */}
        {onCameraChange && (
          <CameraTracker onCameraChange={onCameraChange} />
        )}
      </Canvas>
    </div>
  );
}