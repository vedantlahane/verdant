import React, {
  useEffect,
  useRef,
  useMemo,
  useCallback,
  useState,
} from 'react';
import * as THREE from 'three';
import { extend, Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { VrdAST, VrdGroup } from '@repo/parser';
import { useRendererStore } from './store';
import { ThemeColors } from '@repo/themes';

extend({ EdgesGeometry: THREE.EdgesGeometry });

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

import { MeasurementLinesGroup, MeasurementLine } from './MeasurementLines';

// ============================================
// Props
// ============================================

export interface CameraData {
  position: [number, number, number];
  fov: number;
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
// Reusable screen-projection vector (no per-click alloc)
// ============================================

const _projVec = new THREE.Vector3();

function projectToScreen(
  worldPos: [number, number, number],
  camera: THREE.Camera,
  size: { width: number; height: number },
): { x: number; y: number } {
  _projVec.set(...worldPos).project(camera);
  return {
    x: ((_projVec.x + 1) / 2) * size.width,
    y: ((-_projVec.y + 1) / 2) * size.height,
  };
}

// ============================================
// Camera Tracker
// ============================================

function CameraTracker({
  onCameraChange,
}: {
  onCameraChange: (data: CameraData) => void;
}) {
  const { camera } = useThree();
  const frameCount = useRef(0);
  const lastEmit = useRef('');
  const _invQ = useMemo(() => new THREE.Quaternion(), []);
  const _v = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    frameCount.current++;
    if (frameCount.current % 8 !== 0) return;

    const px = Math.round(camera.position.x * 10) / 10;
    const py = Math.round(camera.position.y * 10) / 10;
    const pz = Math.round(camera.position.z * 10) / 10;
    const fov = Math.round((camera as THREE.PerspectiveCamera).fov ?? 45);

    _invQ.copy(camera.quaternion).invert();

    const round = (v: THREE.Vector3): [number, number, number] => [
      Math.round(v.x * 100) / 100,
      Math.round(v.y * 100) / 100,
      Math.round(v.z * 100) / 100,
    ];

    const ax = round(_v.set(1, 0, 0).applyQuaternion(_invQ));
    const ay = round(_v.set(0, 1, 0).applyQuaternion(_invQ));
    const az = round(_v.set(0, 0, 1).applyQuaternion(_invQ));

    const key = `${px},${py},${pz},${fov},${ax},${ay},${az}`;
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

function makeLineGeo(points: number[]): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  return geo;
}

function createFadeShaderMaterial(baseOpacity: number, fadeStart: number, fadeEnd: number) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uColor:       { value: new THREE.Color('#ffffff') },
      uBaseOpacity: { value: baseOpacity },
      uFadeStart:   { value: fadeStart },
      uFadeEnd:     { value: fadeEnd },
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
}

// ============================================
// Axis Labels Component
// ============================================

interface AxisLabelSpriteProps {
  tick: { pos: [number, number, number]; axis: 'x' | 'y' | 'z'; val: number };
}

function AxisLabelSprite({ tick }: AxisLabelSpriteProps) {
  const [texture, setTexture] = React.useState<THREE.CanvasTexture | null>(null);

  useEffect(() => {
    const color = tick.axis === 'x' ? '#e57373' : tick.axis === 'y' ? '#81c784' : '#64b5f6';
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.font = 'bold 28px monospace';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(tick.val), 64, 34);

    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    setTexture(tex);

    return () => {
      tex.dispose();
    };
  }, [tick.axis, tick.val]);

  if (!texture) return null;

  const pos: [number, number, number] =
    tick.axis === 'x' ? [tick.pos[0], 0.15, 0.5] :
    tick.axis === 'z' ? [0.5, 0.15, tick.pos[2]] :
    [0.5, tick.pos[1], 0.15];

  return (
    <sprite position={pos} scale={[0.9, 0.45, 1]}>
      <spriteMaterial
        map={texture}
        transparent
        depthWrite={false}
        depthTest={false}
        opacity={0.5}
      />
    </sprite>
  );
}

function BlueprintGroundPlaneHierarchy({ ticks }: { ticks: any[] }) {
  return (
    <group>
      {ticks.map((t, i) => (
        <AxisLabelSprite key={`${t.axis}-${t.val}-${i}`} tick={t} />
      ))}
    </group>
  );
}

function BlueprintGroundPlane() {
  const GRID_SIZE   = 40;
  const MAJOR_STEP  = 4;
  const MINOR_STEP  = 1;
  const AXIS_LENGTH = GRID_SIZE;
  const TICK_EVERY  = 4;
  const TICK_SIZE   = 0.12;
  const FADE_START  = GRID_SIZE * 0.3;
  const FADE_END    = GRID_SIZE * 0.95;

  // ── XZ axis lines ──
  const xAxisGeo = useMemo(() => makeLineGeo([-AXIS_LENGTH, 0, 0, AXIS_LENGTH, 0, 0]), []);
  const yAxisGeo = useMemo(() => makeLineGeo([0, 0, 0, 0, AXIS_LENGTH * 0.6, 0]), []);
  const zAxisGeo = useMemo(() => makeLineGeo([0, 0, -AXIS_LENGTH, 0, 0, AXIS_LENGTH]), []);

  useEffect(() => () => { xAxisGeo.dispose(); yAxisGeo.dispose(); zAxisGeo.dispose(); },
    [xAxisGeo, yAxisGeo, zAxisGeo]);

  // ── XZ plane grid (major + minor) ──
  const xzMinorGeo = useMemo(() => {
    const v: number[] = [];
    for (let i = -GRID_SIZE; i <= GRID_SIZE; i += MINOR_STEP) {
      if (i % MAJOR_STEP === 0 || i === 0) continue;
      v.push(i, 0, -GRID_SIZE, i, 0, GRID_SIZE);
      v.push(-GRID_SIZE, 0, i, GRID_SIZE, 0, i);
    }
    return makeLineGeo(v);
  }, []);

  const xzMajorGeo = useMemo(() => {
    const v: number[] = [];
    for (let i = -GRID_SIZE; i <= GRID_SIZE; i += MAJOR_STEP) {
      if (i === 0) continue;
      v.push(i, 0, -GRID_SIZE, i, 0, GRID_SIZE);
      v.push(-GRID_SIZE, 0, i, GRID_SIZE, 0, i);
    }
    return makeLineGeo(v);
  }, []);

  useEffect(() => () => { xzMinorGeo.dispose(); xzMajorGeo.dispose(); },
    [xzMinorGeo, xzMajorGeo]);

  // ── YZ plane grid (X=0) ──
  const yzMinorGeo = useMemo(() => {
    const v: number[] = [];
    for (let i = -GRID_SIZE; i <= GRID_SIZE; i += MINOR_STEP) {
      if (i % MAJOR_STEP === 0 || i === 0) continue;
      v.push(0, i, -GRID_SIZE, 0, i, GRID_SIZE);
      v.push(0, -GRID_SIZE, i, 0, GRID_SIZE, i);
    }
    return makeLineGeo(v);
  }, []);

  const yzMajorGeo = useMemo(() => {
    const v: number[] = [];
    for (let i = -GRID_SIZE; i <= GRID_SIZE; i += MAJOR_STEP) {
      if (i === 0) continue;
      v.push(0, i, -GRID_SIZE, 0, i, GRID_SIZE);
      v.push(0, -GRID_SIZE, i, 0, GRID_SIZE, i);
    }
    return makeLineGeo(v);
  }, []);

  useEffect(() => () => { yzMinorGeo.dispose(); yzMajorGeo.dispose(); },
    [yzMinorGeo, yzMajorGeo]);

  // ── XY plane grid (Z=0) ──
  const xyMinorGeo = useMemo(() => {
    const v: number[] = [];
    for (let i = -GRID_SIZE; i <= GRID_SIZE; i += MINOR_STEP) {
      if (i % MAJOR_STEP === 0 || i === 0) continue;
      v.push(-GRID_SIZE, i, 0, GRID_SIZE, i, 0);
      v.push(i, -GRID_SIZE, 0, i, GRID_SIZE, 0);
    }
    return makeLineGeo(v);
  }, []);

  const xyMajorGeo = useMemo(() => {
    const v: number[] = [];
    for (let i = -GRID_SIZE; i <= GRID_SIZE; i += MAJOR_STEP) {
      if (i === 0) continue;
      v.push(-GRID_SIZE, i, 0, GRID_SIZE, i, 0);
      v.push(i, -GRID_SIZE, 0, i, GRID_SIZE, 0);
    }
    return makeLineGeo(v);
  }, []);

  useEffect(() => () => { xyMinorGeo.dispose(); xyMajorGeo.dispose(); },
    [xyMinorGeo, xyMajorGeo]);

  // ── Origin decorations ──
  const crosshairGeo = useMemo(() => {
    const s = 0.5;
    return makeLineGeo([-s, 0.005, 0, s, 0.005, 0, 0, 0.005, -s, 0, 0.005, s]);
  }, []);
  useEffect(() => () => crosshairGeo.dispose(), [crosshairGeo]);

  // ── Tick data ──
  const ticks = useMemo(() => {
    const result: { pos: [number, number, number]; axis: 'x' | 'y' | 'z'; val: number }[] = [];
    const count = Math.floor(AXIS_LENGTH / TICK_EVERY);
    for (let i = -count; i <= count; i++) {
      if (i === 0) continue;
      const v = i * TICK_EVERY;
      result.push({ pos: [v, 0, 0],  axis: 'x', val: v });
      result.push({ pos: [0, 0, v],  axis: 'z', val: v });
    }
    const yCount = Math.floor((AXIS_LENGTH * 0.6) / TICK_EVERY);
    for (let i = 1; i <= yCount; i++) {
      result.push({ pos: [0, i * TICK_EVERY, 0], axis: 'y', val: i * TICK_EVERY });
    }
    return result;
  }, []);

  // ── Fade materials ──
  const xzMinorMat = useMemo(() => createFadeShaderMaterial(0.06, FADE_START, FADE_END), []);
  const xzMajorMat = useMemo(() => createFadeShaderMaterial(0.12, FADE_START, FADE_END), []);
  useEffect(() => () => { xzMinorMat.dispose(); xzMajorMat.dispose(); },
    [xzMinorMat, xzMajorMat]);

  // ── Orthogonal plane materials ──
  const yzMinorMat = useMemo(
    () => new THREE.LineBasicMaterial({ color: '#81c784', transparent: true, opacity: 0.04, depthWrite: false }),
    [],
  );
  const yzMajorMat = useMemo(
    () => new THREE.LineBasicMaterial({ color: '#81c784', transparent: true, opacity: 0.08, depthWrite: false }),
    [],
  );
  const xyMinorMat = useMemo(
    () => new THREE.LineBasicMaterial({ color: '#64b5f6', transparent: true, opacity: 0.04, depthWrite: false }),
    [],
  );
  const xyMajorMat = useMemo(
    () => new THREE.LineBasicMaterial({ color: '#64b5f6', transparent: true, opacity: 0.08, depthWrite: false }),
    [],
  );
  useEffect(() => () => {
    yzMinorMat.dispose(); yzMajorMat.dispose();
    xyMinorMat.dispose(); xyMajorMat.dispose();
  }, [yzMinorMat, yzMajorMat, xyMinorMat, xyMajorMat]);

  // ── Theme sync ──
  const { themeColors } = useRendererStore();
  useEffect(() => {
    const isDark =
      typeof document !== 'undefined' &&
      getComputedStyle(document.documentElement)
        .getPropertyValue('--page-bg')
        .trim()
        .toLowerCase() !== '#ffffff';

    const gridColor = isDark ? '#ffffff' : '#000000';
    xzMinorMat.uniforms.uColor.value.set(gridColor);
    xzMajorMat.uniforms.uColor.value.set(gridColor);
    xzMinorMat.uniformsNeedUpdate = true;
    xzMajorMat.uniformsNeedUpdate = true;
  }, [themeColors, xzMinorMat, xzMajorMat]);

  // ── Hoisted materials (no inline re-creation per render) ──
  const xAxisMat = useMemo(() => new THREE.LineBasicMaterial({ color: '#e57373', transparent: true, opacity: 0.35, depthWrite: false }), []);
  const yAxisMat = useMemo(() => new THREE.LineBasicMaterial({ color: '#81c784', transparent: true, opacity: 0.30, depthWrite: false }), []);
  const zAxisMat = useMemo(() => new THREE.LineBasicMaterial({ color: '#64b5f6', transparent: true, opacity: 0.35, depthWrite: false }), []);
  const crosshairMat = useMemo(() => new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.5, depthWrite: false }), []);
  const ringMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false }), []);
  const sphereMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.4 }), []);

  useEffect(() => () => {
    xAxisMat.dispose(); yAxisMat.dispose(); zAxisMat.dispose();
    crosshairMat.dispose(); ringMat.dispose(); sphereMat.dispose();
  }, [xAxisMat, yAxisMat, zAxisMat, crosshairMat, ringMat, sphereMat]);

  // ── Shared geometries for origin decorations ──
  const ringGeo = useMemo(() => new THREE.RingGeometry(0.35, 0.4, 32), []);
  const sphereGeo = useMemo(() => new THREE.SphereGeometry(0.06, 12, 12), []);
  useEffect(() => () => { ringGeo.dispose(); sphereGeo.dispose(); }, [ringGeo, sphereGeo]);

  // ── Tick materials (one per axis color — shared across all ticks of that axis) ──
  const tickMatX = useMemo(() => new THREE.MeshBasicMaterial({ color: '#e57373', transparent: true, opacity: 0.20, depthWrite: false }), []);
  const tickMatY = useMemo(() => new THREE.MeshBasicMaterial({ color: '#81c784', transparent: true, opacity: 0.20, depthWrite: false }), []);
  const tickMatZ = useMemo(() => new THREE.MeshBasicMaterial({ color: '#64b5f6', transparent: true, opacity: 0.20, depthWrite: false }), []);
  const tickGeo = useMemo(() => new THREE.BoxGeometry(TICK_SIZE, TICK_SIZE, TICK_SIZE), []);
  useEffect(() => () => { tickMatX.dispose(); tickMatY.dispose(); tickMatZ.dispose(); tickGeo.dispose(); }, [tickMatX, tickMatY, tickMatZ, tickGeo]);

  // ── Arrow geometries and materials (shared) ──
  const arrowGeo = useMemo(() => new THREE.ConeGeometry(0.12, 0.4, 8), []);
  const arrowMatX = useMemo(() => new THREE.MeshBasicMaterial({ color: '#e57373', transparent: true, opacity: 0.3 }), []);
  const arrowMatY = useMemo(() => new THREE.MeshBasicMaterial({ color: '#81c784', transparent: true, opacity: 0.3 }), []);
  const arrowMatZ = useMemo(() => new THREE.MeshBasicMaterial({ color: '#64b5f6', transparent: true, opacity: 0.3 }), []);
  const arrowMatZFar = useMemo(() => new THREE.MeshBasicMaterial({ color: '#64b5f6', transparent: true, opacity: 0.15 }), []);
  useEffect(() => () => { arrowGeo.dispose(); arrowMatX.dispose(); arrowMatY.dispose(); arrowMatZ.dispose(); arrowMatZFar.dispose(); }, [arrowGeo, arrowMatX, arrowMatY, arrowMatZ, arrowMatZFar]);

  return (
    <group>
      {/* ── XZ plane (ground) ── */}
      <lineSegments geometry={xzMinorGeo} material={xzMinorMat} />
      <lineSegments geometry={xzMajorGeo} material={xzMajorMat} />

      {/* ── YZ plane ── */}
      <lineSegments geometry={yzMinorGeo} material={yzMinorMat} />
      <lineSegments geometry={yzMajorGeo} material={yzMajorMat} />

      {/* ── XY plane ── */}
      <lineSegments geometry={xyMinorGeo} material={xyMinorMat} />
      <lineSegments geometry={xyMajorGeo} material={xyMajorMat} />

      {/* ── X axis (red) ── */}
      <lineSegments geometry={xAxisGeo} material={xAxisMat} />

      {/* ── Y axis (green) ── */}
      <lineSegments geometry={yAxisGeo} material={yAxisMat} />

      {/* ── Z axis (blue) ── */}
      <lineSegments geometry={zAxisGeo} material={zAxisMat} />

      {/* ── Origin ── */}
      <lineSegments geometry={crosshairGeo} material={crosshairMat} />
      <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]} geometry={ringGeo} material={ringMat} />
      <mesh position={[0, 0.01, 0]} geometry={sphereGeo} material={sphereMat} />

      {/* ── Tick marks (shared geo+mat per axis) ── */}
      {ticks.map((tick, i) => (
        <mesh
          key={i}
          position={tick.pos}
          geometry={tickGeo}
          material={tick.axis === 'x' ? tickMatX : tick.axis === 'y' ? tickMatY : tickMatZ}
        />
      ))}

      {/* ── Axis arrows (shared geo+mat) ── */}
      <mesh position={[AXIS_LENGTH, 0, 0]} rotation={[0, 0, -Math.PI / 2]} geometry={arrowGeo} material={arrowMatX} />
      <mesh position={[0, AXIS_LENGTH * 0.6, 0]} geometry={arrowGeo} material={arrowMatY} />
      <mesh position={[0, 0, AXIS_LENGTH]} rotation={[Math.PI / 2, 0, 0]} geometry={arrowGeo} material={arrowMatZ} />
      <mesh position={[0, 0, -AXIS_LENGTH]} rotation={[-Math.PI / 2, 0, 0]} geometry={arrowGeo} material={arrowMatZFar} />

      {/* ── Axis labels ── */}
      <BlueprintGroundPlaneHierarchy ticks={ticks} />
    </group>
  );
}

// ============================================
// Drag Hook — any axis, plane perpendicular to camera
// ============================================

function useDraggable(
  nodeId: string,
  currentPosition: [number, number, number],
  onDragStart: () => void,
  onDragEnd: () => void,
) {
  const { camera, gl } = useThree();
  const updateNodePosition = useRendererStore((s) => s.updateNodePosition);
  const setDraggingNode = useRendererStore((s) => s.setDraggingNode);

  const isDragging = useRef(false);
  const dragPlane  = useRef(new THREE.Plane());
  const offset     = useRef(new THREE.Vector3());
  const raycaster  = useRef(new THREE.Raycaster());
  const intersection = useRef(new THREE.Vector3());

  const onPointerDown = useCallback(
    (e: any) => {
      e.stopPropagation();

      // ── Build drag plane: perpendicular to camera, passing through node ──
      const camDir = new THREE.Vector3();
      camera.getWorldDirection(camDir);
      dragPlane.current.setFromNormalAndCoplanarPoint(
        camDir,
        new THREE.Vector3(...currentPosition),
      );

      // ── Calculate offset from click point to node center ──
      const rect = gl.domElement.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.current.setFromCamera(ndc, camera);
      raycaster.current.ray.intersectPlane(dragPlane.current, intersection.current);
      offset.current.copy(intersection.current).sub(new THREE.Vector3(...currentPosition));

      isDragging.current = true;
      setDraggingNode(nodeId);
      onDragStart();

      gl.domElement.style.cursor = 'grabbing';
      e.target.setPointerCapture(e.pointerId);
    },
    [camera, gl, currentPosition, nodeId, onDragStart, setDraggingNode],
  );

  const onPointerMove = useCallback(
    (e: any) => {
      if (!isDragging.current) return;
      e.stopPropagation();

      const rect = gl.domElement.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.current.setFromCamera(ndc, camera);

      if (!raycaster.current.ray.intersectPlane(dragPlane.current, intersection.current)) return;

      const newPos: [number, number, number] = [
        intersection.current.x - offset.current.x,
        intersection.current.y - offset.current.y,
        intersection.current.z - offset.current.z,
      ];
      updateNodePosition(nodeId, newPos);
    },
    [camera, gl, nodeId, updateNodePosition],
  );

  const onPointerUp = useCallback(
    (e: any) => {
      if (!isDragging.current) return;
      isDragging.current = false;
      setDraggingNode(null);
      onDragEnd();
      gl.domElement.style.cursor = '';
      e.target.releasePointerCapture(e.pointerId);
    },
    [gl, onDragEnd, setDraggingNode],
  );

  return { onPointerDown, onPointerMove, onPointerUp };
}

// ============================================
// Draggable Node Wrapper
// ============================================

interface DraggableNodeProps {
  node: { id: string; type: string; props: Record<string, unknown> };
  position: [number, number, number];
  isSelected: boolean;
  isHovered: boolean;
  color: string;
  controlsRef: React.MutableRefObject<any>;
  onNodeClick: (nodeId: string, pos: [number, number, number], e: any) => void;
  onHoverEnter: (id: string) => void;
  onHoverLeave: () => void;
}

function DraggableNode({
  node,
  position,
  isSelected,
  isHovered,
  color,
  controlsRef,
  onNodeClick,
  onHoverEnter,
  onHoverLeave,
}: DraggableNodeProps) {
  const Component = NODE_MAP[node.type.toLowerCase()] ?? ServerNode;

  const handleDragStart = useCallback(() => {
    if (controlsRef.current) controlsRef.current.enabled = false;
  }, [controlsRef]);

  const handleDragEnd = useCallback(() => {
    if (controlsRef.current) controlsRef.current.enabled = true;
  }, [controlsRef]);

  const { onPointerDown, onPointerMove, onPointerUp } = useDraggable(
    node.id,
    position,
    handleDragStart,
    handleDragEnd,
  );

  const nodeProps: NodeProps = {
    label: (node.props.label as string) || node.id,
    position,
    selected: isSelected,
    hovered: isHovered,
    color,
    size: (node.props.size as string) || 'md',
    glow: node.props.glow === true,
    onClick: (e) => onNodeClick(node.id, position, e),
    onPointerOver: (e) => {
      e.stopPropagation();
      onHoverEnter(node.id);
    },
    onPointerOut: () => onHoverLeave(),
  };

  return (
    <group
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <Component {...nodeProps} />
    </group>
  );
}

// ============================================
// Group Bounding Box
// ============================================

const SHARED_BOX_GEO   = new THREE.BoxGeometry(1, 1, 1);
const SHARED_EDGES_GEO = new THREE.EdgesGeometry(SHARED_BOX_GEO);

interface GroupBoxProps {
  group: VrdGroup;
  positions: Record<string, [number, number, number]>;
  themeColors: ThemeColors;
}

function GroupBox({ group, positions, themeColors }: GroupBoxProps) {
  // ── All hooks must come before any conditional returns ──
  const childPositions = useMemo(
    () =>
      group.children
        .map((id) => positions[id])
        .filter(Boolean) as [number, number, number][],
    [group.children, positions],
  );

  const bounds = useMemo(() => {
    if (childPositions.length === 0) return null;
    const pad = 1.5;
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
    childPositions.forEach(([x, y, z]) => {
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
    });
    return {
      cx: (minX + maxX) / 2,
      cy: (minY + maxY) / 2,
      cz: (minZ + maxZ) / 2,
      sx: maxX - minX + pad * 2,
      sy: maxY - minY + pad * 2,
      sz: Math.max(maxZ - minZ + pad * 2, 0.1),
    };
  }, [childPositions]);

  if (!bounds) return null;

  return (
    <group position={[bounds.cx, bounds.cy, bounds.cz]}>
      <mesh geometry={SHARED_BOX_GEO} scale={[bounds.sx, bounds.sy, bounds.sz]}>
        <meshBasicMaterial
          color={themeColors.accent}
          transparent
          opacity={0.04}
          depthWrite={false}
        />
      </mesh>
      <lineSegments geometry={SHARED_EDGES_GEO} scale={[bounds.sx, bounds.sy, bounds.sz]}>
        <lineBasicMaterial
          color={themeColors.accent}
          transparent
          opacity={0.2}
        />
      </lineSegments>
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
  const ast            = useRendererStore((s) => s.ast);
  const positions      = useRendererStore((s) => s.positions);
  const selectedNodeId = useRendererStore((s) => s.selectedNodeId);
  const hoveredNodeId  = useRendererStore((s) => s.hoveredNodeId);
  const themeColors    = useRendererStore((s) => s.themeColors);
  const selectNode     = useRendererStore((s) => s.selectNode);
  const hoverNode      = useRendererStore((s) => s.hoverNode);
  const getNodeColor   = useRendererStore((s) => s.getNodeColor);

  const { camera, size } = useThree();
  const controlsRef    = useRef<any>(null);
  const idleTimerRef   = useRef(0);
  const isInteractingRef = useRef(false);

  const activeNodeId = externalSelectedId ?? selectedNodeId;

  // ── Measurement lines ──
  const measurementLines = useMemo<MeasurementLine[]>(() => {
    if (!activeNodeId || !ast) return [];
    const lines: MeasurementLine[] = [];

    ast.edges
      .filter((e) => e.from === activeNodeId || e.to === activeNodeId)
      .forEach((edge) => {
        const fromPos = positions[edge.from];
        const toPos   = positions[edge.to];
        if (!fromPos || !toPos) return;
        lines.push({
          from: fromPos, to: toPos,
          fromId: edge.from, toId: edge.to,
          label: edge.props.label as string,
          direction: edge.from === activeNodeId ? 'outgoing' : 'incoming',
        });
      });

    return lines;
  }, [activeNodeId, ast, positions]);

  // ── Auto-rotate: pause on interaction, resume after 3s idle ──
  useFrame((_, delta) => {
    if (!controlsRef.current || !autoRotate) return;
    if (isInteractingRef.current) {
      idleTimerRef.current = 0;
    } else {
      idleTimerRef.current += delta;
      controlsRef.current.autoRotate = idleTimerRef.current > 3;
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

  const handleHoverEnter = useCallback(
    (id: string) => {
      hoverNode(id);
      document.body.style.cursor = 'grab';
    },
    [hoverNode],
  );

  const handleHoverLeave = useCallback(() => {
    hoverNode(null);
    document.body.style.cursor = '';
  }, [hoverNode]);

  const handlePointerMissed = useCallback(() => selectNode(null), [selectNode]);

  if (!ast) return null;

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 20, 10]} intensity={1.0} castShadow shadow-mapSize={[1024, 1024]} />
      <pointLight position={[-10, -10, -10]} intensity={0.2} />

      <BlueprintGroundPlane />

      <MeasurementLinesGroup lines={measurementLines} accentColor={themeColors.accent} />

      <group onPointerMissed={handlePointerMissed}>
        {ast.nodes.map((node) => {
          const position  = positions[node.id] ?? [0, 0, 0];
          const isSelected = selectedNodeId === node.id;
          const isHovered  = hoveredNodeId  === node.id;
          const color      = getNodeColor(node.type, node.props.color as string);

          return (
            <DraggableNode
              key={node.id}
              node={node}
              position={position}
              isSelected={isSelected}
              isHovered={isHovered}
              color={color}
              controlsRef={controlsRef}
              onNodeClick={handleNodeClick}
              onHoverEnter={handleHoverEnter}
              onHoverLeave={handleHoverLeave}
            />
          );
        })}

        {ast.edges.map((edge, i) => {
          const fromPos = positions[edge.from];
          const toPos   = positions[edge.to];
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

        {ast.groups.map((group) => (
          <GroupBox
            key={`group-${group.id}`}
            group={group}
            positions={positions}
            themeColors={themeColors}
          />
        ))}
      </group>

      <OrbitControls
        ref={controlsRef}
        makeDefault
        enableDamping
        dampingFactor={0.05}
        minDistance={3}
        maxDistance={80}
        autoRotate={autoRotate}
        autoRotateSpeed={0.5}
        onStart={() => {
          isInteractingRef.current = true;
          idleTimerRef.current = 0;
          if (controlsRef.current) controlsRef.current.autoRotate = false;
        }}
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
  const setAst   = useRendererStore((s) => s.setAst);
  const setTheme = useRendererStore((s) => s.setTheme);
  const [canvasKey, setCanvasKey] = useState(0);

  useEffect(() => { setAst(ast); }, [ast, setAst]);
  useEffect(() => { setTheme(theme); }, [theme, setTheme]);

  // Pure black or white canvas background depending on mode
  const bg = theme === 'light' ? '#ffffff' : '#000000';

  const cameraPosition = useMemo<[number, number, number]>(() => [0, 8, 16], []);

  // Handle WebGL context loss: listen for the event and auto-remount
  const handleCreated = useCallback((state: any) => {
    const canvas = state.gl.domElement as HTMLCanvasElement;
    const handleContextLost = (e: Event) => {
      e.preventDefault();
      console.warn('WebGL context lost — will attempt recovery');
    };
    const handleContextRestored = () => {
      console.info('WebGL context restored — remounting canvas');
      setCanvasKey((k) => k + 1);
    };
    canvas.addEventListener('webglcontextlost', handleContextLost);
    canvas.addEventListener('webglcontextrestored', handleContextRestored);
  }, []);

  return (
    <div className={className} style={{ width, height, overflow: 'hidden' }}>
      <Canvas
        key={canvasKey}
        style={{ width: '100%', height: '100%' }}
        camera={{ position: cameraPosition, fov: 45 }}
        gl={{ antialias: true, alpha: false, powerPreference: 'default' }}
        dpr={[1, 1.5]}
        onCreated={handleCreated}
      >
        <color attach="background" args={[bg]} />
        <SceneContent
          autoRotate={autoRotate}
          onNodeClick={onNodeClick}
          selectedNodeId={selectedNodeId}
        />
        {onCameraChange && <CameraTracker onCameraChange={onCameraChange} />}
      </Canvas>
    </div>
  );
}