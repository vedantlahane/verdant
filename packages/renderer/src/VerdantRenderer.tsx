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
import { VrdAST, VrdGroup } from '@verdant/parser';
import { useRendererStore } from './store';
import { ThemeColors } from '@verdant/themes';

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
} from '@verdant/nodes';

import { BaseEdge as EdgeLine, NodeProps } from '@verdant/primitives';

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

export interface CursorData {
  x: number;
  y: number;
  z: number;
}

export interface VerdantRendererProps {
  ast: VrdAST;
  theme?: string;
  width?: string | number;
  height?: string | number;
  className?: string;
  autoRotate?: boolean;
  showCoordinateSystem?: boolean;
  onNodeClick?: (info: {
    nodeId: string;
    screenX: number;
    screenY: number;
  }) => void;
  onCameraChange?: (data: CameraData) => void;
  onCursorMove?: (data: CursorData | null) => void;
  selectedNodeId?: string | null;
}

interface PersistedViewState {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
}

function getAstViewStorageKey(ast: VrdAST): string {
  const nodes = ast.nodes.map((n) => n.id).sort().join('|');
  const edges = ast.edges
    .map((e) => `${e.from}->${e.to}:${String(e.props.label ?? '')}`)
    .sort()
    .join('|');
  return `verdant:renderer:view:v1:${nodes}__${edges}`;
}

function readViewState(storageKey: string): PersistedViewState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedViewState;
    if (!parsed || !Array.isArray(parsed.position) || !Array.isArray(parsed.target)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeViewState(storageKey: string, view: PersistedViewState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(view));
  } catch {
    // Ignore storage failures.
  }
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
    depthTest: false,
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
    const label = `${tick.axis.toUpperCase()} ${tick.val > 0 ? '+' : ''}${tick.val}`;
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 96;
    const ctx = canvas.getContext('2d')!;
    ctx.font = 'bold 36px monospace';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, 128, 52);

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
    tick.axis === 'x' ? [tick.pos[0], 0.22, 0.85] :
    tick.axis === 'z' ? [0.85, 0.22, tick.pos[2]] :
    [0.85, tick.pos[1], 0.2];

  return (
    <sprite position={pos} scale={[1.4, 0.55, 1]} renderOrder={20}>
      <spriteMaterial
        map={texture}
        transparent
        depthWrite={false}
        depthTest={false}
        opacity={0.68}
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
  const AXIS_Y_LENGTH = 40;
  const MAJOR_STEP  = 4;
  const MINOR_STEP  = 1;
  const AXIS_LENGTH = GRID_SIZE;
  const TICK_EVERY  = 1;
  const TICK_SIZE   = 0.12;
  const FADE_START  = GRID_SIZE * 0.3;
  const FADE_END    = GRID_SIZE * 0.95;

  // ── XZ axis lines ──
  const xAxisGeo = useMemo(() => makeLineGeo([-AXIS_LENGTH, 0.015, 0, AXIS_LENGTH, 0.015, 0]), []);
  const yAxisGeo = useMemo(() => makeLineGeo([0, -AXIS_Y_LENGTH, 0, 0, AXIS_Y_LENGTH, 0]), []);
  const zAxisPosGeo = useMemo(() => makeLineGeo([0, 0.03, 0, 0, 0.03, AXIS_LENGTH]), []);
  const zAxisNegGeo = useMemo(() => makeLineGeo([0, 0.03, -AXIS_LENGTH, 0, 0.03, 0]), []);

  useEffect(() => () => { xAxisGeo.dispose(); yAxisGeo.dispose(); zAxisPosGeo.dispose(); zAxisNegGeo.dispose(); },
    [xAxisGeo, yAxisGeo, zAxisPosGeo, zAxisNegGeo]);

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

  // ── Plane fills (panels) ──
  const xzPanelGeo = useMemo(() => new THREE.PlaneGeometry(GRID_SIZE * 2, GRID_SIZE * 2), []);
  const yzPanelGeo = useMemo(() => new THREE.PlaneGeometry(GRID_SIZE * 2, GRID_SIZE * 2), []);
  const xyPanelGeo = useMemo(() => new THREE.PlaneGeometry(GRID_SIZE * 2, GRID_SIZE * 2), []);
  const xzPanelMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: '#90a4ae', transparent: true, opacity: 0.045, side: THREE.DoubleSide, depthWrite: false, depthTest: false }),
    [],
  );
  const yzPanelMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: '#81c784', transparent: true, opacity: 0.04, side: THREE.DoubleSide, depthWrite: false, depthTest: false }),
    [],
  );
  const xyPanelMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: '#64b5f6', transparent: true, opacity: 0.04, side: THREE.DoubleSide, depthWrite: false, depthTest: false }),
    [],
  );
  useEffect(
    () => () => {
      xzPanelGeo.dispose();
      yzPanelGeo.dispose();
      xyPanelGeo.dispose();
      xzPanelMat.dispose();
      yzPanelMat.dispose();
      xyPanelMat.dispose();
    },
    [xyPanelGeo, xyPanelMat, xzPanelGeo, xzPanelMat, yzPanelGeo, yzPanelMat],
  );

  // ── Origin decorations ──
  const crosshairGeo = useMemo(() => {
    const s = 0.5;
    return makeLineGeo([-s, 0.005, 0, s, 0.005, 0, 0, 0.005, -s, 0, 0.005, s]);
  }, []);
  useEffect(() => () => crosshairGeo.dispose(), [crosshairGeo]);

  // ── Tick data ──
  const ticks = useMemo(() => {
    const result: { pos: [number, number, number]; axis: 'x' | 'y' | 'z'; val: number }[] = [];
    result.push({ pos: [0, 0, 0], axis: 'x', val: 0 });

    const shouldLabel = (v: number): boolean => {
      if (v === 0) return true;
      return (Math.abs(v) - 1) % 4 === 0;
    };

    const count = Math.floor(AXIS_LENGTH / TICK_EVERY);
    for (let i = -count; i <= count; i++) {
      if (i === 0) continue;
      const v = i * TICK_EVERY;
      if (!shouldLabel(v)) continue;
      result.push({ pos: [v, 0, 0],  axis: 'x', val: v });
      result.push({ pos: [0, 0, v],  axis: 'z', val: v });
    }
    const yCount = Math.floor(AXIS_Y_LENGTH / TICK_EVERY);
    for (let i = -yCount; i <= yCount; i++) {
      if (i === 0) continue;
      const v = i * TICK_EVERY;
      if (!shouldLabel(v)) continue;
      result.push({ pos: [0, v, 0], axis: 'y', val: v });
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
    () => new THREE.LineBasicMaterial({ color: '#81c784', transparent: true, opacity: 0.07, depthWrite: false, depthTest: false }),
    [],
  );
  const yzMajorMat = useMemo(
    () => new THREE.LineBasicMaterial({ color: '#81c784', transparent: true, opacity: 0.14, depthWrite: false, depthTest: false }),
    [],
  );
  const xyMinorMat = useMemo(
    () => new THREE.LineBasicMaterial({ color: '#64b5f6', transparent: true, opacity: 0.07, depthWrite: false, depthTest: false }),
    [],
  );
  const xyMajorMat = useMemo(
    () => new THREE.LineBasicMaterial({ color: '#64b5f6', transparent: true, opacity: 0.14, depthWrite: false, depthTest: false }),
    [],
  );
  useEffect(() => () => {
    yzMinorMat.dispose(); yzMajorMat.dispose();
    xyMinorMat.dispose(); xyMajorMat.dispose();
  }, [yzMinorMat, yzMajorMat, xyMinorMat, xyMajorMat]);

  // ── Theme sync ──
  const { themeColors } = useRendererStore();
  useEffect(() => {
    const root = typeof document !== 'undefined' ? document.documentElement : null;
    const dataTheme = root?.dataset?.theme;
    const pageBg = root
      ? getComputedStyle(root).getPropertyValue('--page-bg').trim().toLowerCase()
      : '';
    const isDark =
      dataTheme === 'dark' ||
      (pageBg !== '' && pageBg !== '#ffffff' && pageBg !== 'rgb(255, 255, 255)' && pageBg !== 'white');

    const gridColor = isDark ? '#ffffff' : '#1f2937';
    xzMinorMat.uniforms.uColor.value.set(gridColor);
    xzMajorMat.uniforms.uColor.value.set(gridColor);
    xzMinorMat.uniforms.uBaseOpacity.value = isDark ? 0.14 : 0.30;
    xzMajorMat.uniforms.uBaseOpacity.value = isDark ? 0.26 : 0.48;
    xzMinorMat.uniformsNeedUpdate = true;
    xzMajorMat.uniformsNeedUpdate = true;

    yzMinorMat.color.set(isDark ? '#81c784' : '#1b5e20');
    yzMajorMat.color.set(isDark ? '#81c784' : '#2e7d32');
    xyMinorMat.color.set(isDark ? '#64b5f6' : '#0d47a1');
    xyMajorMat.color.set(isDark ? '#64b5f6' : '#1565c0');
    yzMinorMat.opacity = isDark ? 0.07 : 0.12;
    yzMajorMat.opacity = isDark ? 0.14 : 0.22;
    xyMinorMat.opacity = isDark ? 0.07 : 0.12;
    xyMajorMat.opacity = isDark ? 0.14 : 0.22;

    xzPanelMat.color.set(isDark ? '#90a4ae' : '#1f2937');
    yzPanelMat.color.set(isDark ? '#81c784' : '#2e7d32');
    xyPanelMat.color.set(isDark ? '#64b5f6' : '#1565c0');
    xzPanelMat.opacity = isDark ? 0.05 : 0.08;
    yzPanelMat.opacity = isDark ? 0.04 : 0.07;
    xyPanelMat.opacity = isDark ? 0.04 : 0.07;

    xAxisMat.opacity = isDark ? 0.48 : 0.86;
    yAxisMat.opacity = isDark ? 0.45 : 0.84;
    zAxisMat.opacity = isDark ? 0.52 : 0.9;
    zAxisNegMat.opacity = isDark ? 0.66 : 0.95;

    const originColor = isDark ? '#ffffff' : '#111111';
    crosshairMat.color.set(originColor);
    ringMat.color.set(originColor);
    sphereMat.color.set(originColor);
    crosshairMat.opacity = isDark ? 0.5 : 0.35;
    ringMat.opacity = isDark ? 0.12 : 0.08;
    sphereMat.opacity = isDark ? 0.4 : 0.3;

    tickMatX.opacity = isDark ? 0.2 : 0.42;
    tickMatY.opacity = isDark ? 0.2 : 0.42;
    tickMatZ.opacity = isDark ? 0.2 : 0.44;

    arrowMatX.opacity = isDark ? 0.45 : 0.8;
    arrowMatY.opacity = isDark ? 0.45 : 0.8;
    arrowMatZ.opacity = isDark ? 0.5 : 0.85;
    arrowMatZFar.opacity = isDark ? 0.75 : 0.95;
  }, [themeColors, xzMinorMat, xzMajorMat]);

  // ── Hoisted materials (no inline re-creation per render) ──
  const xAxisMat = useMemo(() => new THREE.LineBasicMaterial({ color: '#e57373', transparent: true, opacity: 0.35, depthWrite: false, depthTest: false }), []);
  const yAxisMat = useMemo(() => new THREE.LineBasicMaterial({ color: '#81c784', transparent: true, opacity: 0.30, depthWrite: false, depthTest: false }), []);
  const zAxisMat = useMemo(() => new THREE.LineBasicMaterial({ color: '#64b5f6', transparent: true, opacity: 0.35, depthWrite: false, depthTest: false }), []);
  const zAxisNegMat = useMemo(() => new THREE.LineBasicMaterial({ color: '#1e88e5', transparent: true, opacity: 0.35, depthWrite: false, depthTest: false }), []);
  const crosshairMat = useMemo(() => new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.5, depthWrite: false, depthTest: false }), []);
  const ringMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false, depthTest: false }), []);
  const sphereMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.4, depthWrite: false, depthTest: false }), []);

  useEffect(() => () => {
    xAxisMat.dispose(); yAxisMat.dispose(); zAxisMat.dispose(); zAxisNegMat.dispose();
    crosshairMat.dispose(); ringMat.dispose(); sphereMat.dispose();
  }, [xAxisMat, yAxisMat, zAxisMat, zAxisNegMat, crosshairMat, ringMat, sphereMat]);

  // ── Shared geometries for origin decorations ──
  const ringGeo = useMemo(() => new THREE.RingGeometry(0.35, 0.4, 32), []);
  const sphereGeo = useMemo(() => new THREE.SphereGeometry(0.06, 12, 12), []);
  useEffect(() => () => { ringGeo.dispose(); sphereGeo.dispose(); }, [ringGeo, sphereGeo]);

  // ── Tick materials (one per axis color — shared across all ticks of that axis) ──
  const tickMatX = useMemo(() => new THREE.MeshBasicMaterial({ color: '#e57373', transparent: true, opacity: 0.20, depthWrite: false, depthTest: false }), []);
  const tickMatY = useMemo(() => new THREE.MeshBasicMaterial({ color: '#81c784', transparent: true, opacity: 0.20, depthWrite: false, depthTest: false }), []);
  const tickMatZ = useMemo(() => new THREE.MeshBasicMaterial({ color: '#64b5f6', transparent: true, opacity: 0.20, depthWrite: false, depthTest: false }), []);
  const tickGeo = useMemo(() => new THREE.BoxGeometry(TICK_SIZE, TICK_SIZE, TICK_SIZE), []);
  useEffect(() => () => { tickMatX.dispose(); tickMatY.dispose(); tickMatZ.dispose(); tickGeo.dispose(); }, [tickMatX, tickMatY, tickMatZ, tickGeo]);

  // ── Arrow geometries and materials (shared) ──
  const arrowGeo = useMemo(() => new THREE.ConeGeometry(0.12, 0.4, 8), []);
  const arrowMatX = useMemo(() => new THREE.MeshBasicMaterial({ color: '#e57373', transparent: true, opacity: 0.3, depthWrite: false, depthTest: false }), []);
  const arrowMatY = useMemo(() => new THREE.MeshBasicMaterial({ color: '#81c784', transparent: true, opacity: 0.3, depthWrite: false, depthTest: false }), []);
  const arrowMatZ = useMemo(() => new THREE.MeshBasicMaterial({ color: '#64b5f6', transparent: true, opacity: 0.3, depthWrite: false, depthTest: false }), []);
  const arrowMatZFar = useMemo(() => new THREE.MeshBasicMaterial({ color: '#1e88e5', transparent: true, opacity: 0.3, depthWrite: false, depthTest: false }), []);
  useEffect(() => () => { arrowGeo.dispose(); arrowMatX.dispose(); arrowMatY.dispose(); arrowMatZ.dispose(); arrowMatZFar.dispose(); }, [arrowGeo, arrowMatX, arrowMatY, arrowMatZ, arrowMatZFar]);

  return (
    <group>
      {/* ── XZ plane (ground) ── */}
      <mesh position={[0, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]} geometry={xzPanelGeo} material={xzPanelMat} renderOrder={0} />
      <lineSegments geometry={xzMinorGeo} material={xzMinorMat} renderOrder={1} />
      <lineSegments geometry={xzMajorGeo} material={xzMajorMat} renderOrder={2} />

      {/* ── YZ plane ── */}
      <mesh position={[0, 0, 0]} rotation={[0, Math.PI / 2, 0]} geometry={yzPanelGeo} material={yzPanelMat} renderOrder={2} />
      <lineSegments geometry={yzMinorGeo} material={yzMinorMat} renderOrder={3} />
      <lineSegments geometry={yzMajorGeo} material={yzMajorMat} renderOrder={4} />

      {/* ── XY plane ── */}
      <mesh position={[0, 0, 0]} rotation={[0, 0, 0]} geometry={xyPanelGeo} material={xyPanelMat} renderOrder={4} />
      <lineSegments geometry={xyMinorGeo} material={xyMinorMat} renderOrder={5} />
      <lineSegments geometry={xyMajorGeo} material={xyMajorMat} renderOrder={6} />

      {/* ── X axis (red) ── */}
      <lineSegments geometry={xAxisGeo} material={xAxisMat} renderOrder={8} />

      {/* ── Y axis (green) ── */}
      <lineSegments geometry={yAxisGeo} material={yAxisMat} renderOrder={8} />

      {/* ── Z axis (blue) ── */}
      <lineSegments geometry={zAxisPosGeo} material={zAxisMat} renderOrder={9} />
      <lineSegments geometry={zAxisNegGeo} material={zAxisNegMat} renderOrder={10} />

      {/* ── Origin ── */}
      <lineSegments geometry={crosshairGeo} material={crosshairMat} renderOrder={11} />
      <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]} geometry={ringGeo} material={ringMat} renderOrder={11} />
      <mesh position={[0, 0.01, 0]} geometry={sphereGeo} material={sphereMat} renderOrder={11} />

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
      <mesh position={[AXIS_LENGTH, 0.03, 0]} rotation={[0, 0, -Math.PI / 2]} geometry={arrowGeo} material={arrowMatX} renderOrder={12} />
      <mesh position={[0, AXIS_Y_LENGTH, 0]} geometry={arrowGeo} material={arrowMatY} renderOrder={12} />
      <mesh position={[0, -AXIS_Y_LENGTH, 0]} rotation={[Math.PI, 0, 0]} geometry={arrowGeo} material={arrowMatY} renderOrder={12} />
      <mesh position={[0, 0.03, AXIS_LENGTH]} rotation={[Math.PI / 2, 0, 0]} geometry={arrowGeo} material={arrowMatZ} renderOrder={12} />
      <mesh position={[0, 0.03, -AXIS_LENGTH]} rotation={[-Math.PI / 2, 0, 0]} geometry={arrowGeo} material={arrowMatZFar} renderOrder={13} />
      <mesh position={[0, 0.04, -AXIS_LENGTH]} geometry={sphereGeo} scale={[1.35, 1.35, 1.35]} material={arrowMatZFar} renderOrder={13} />

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
  showCoordinateSystem: boolean;
  onNodeClick?: VerdantRendererProps['onNodeClick'];
  onCursorMove?: VerdantRendererProps['onCursorMove'];
  selectedNodeId?: string | null;
  initialTarget?: [number, number, number];
  onViewChange?: (view: PersistedViewState) => void;
}

function SceneContent({
  autoRotate,
  showCoordinateSystem,
  onNodeClick,
  onCursorMove,
  selectedNodeId: externalSelectedId,
  initialTarget = [0, 0, 0],
  onViewChange,
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
  const gl = useThree((s) => s.gl);
  const controlsRef    = useRef<any>(null);
  const idleTimerRef   = useRef(0);
  const isInteractingRef = useRef(false);
  const lastViewPersistRef = useRef(0);
  const cursorRaycaster = useMemo(() => new THREE.Raycaster(), []);
  const cursorPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);
  const cursorPoint = useMemo(() => new THREE.Vector3(), []);

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

  useEffect(() => {
    if (!controlsRef.current) return;
    controlsRef.current.target.set(...initialTarget);
    controlsRef.current.update();
  }, [initialTarget]);

  useEffect(() => {
    if (!onCursorMove) return;

    const canvas = gl.domElement;
    const handleMove = (ev: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const ndc = new THREE.Vector2(
        ((ev.clientX - rect.left) / rect.width) * 2 - 1,
        -((ev.clientY - rect.top) / rect.height) * 2 + 1,
      );

      cursorRaycaster.setFromCamera(ndc, camera);
      const hit = cursorRaycaster.ray.intersectPlane(cursorPlane, cursorPoint);
      if (!hit) {
        onCursorMove(null);
        return;
      }

      onCursorMove({
        x: Math.round(cursorPoint.x * 10) / 10,
        y: Math.round(cursorPoint.y * 10) / 10,
        z: Math.round(cursorPoint.z * 10) / 10,
      });
    };

    const handleLeave = () => onCursorMove(null);

    canvas.addEventListener('pointermove', handleMove);
    canvas.addEventListener('pointerleave', handleLeave);

    return () => {
      canvas.removeEventListener('pointermove', handleMove);
      canvas.removeEventListener('pointerleave', handleLeave);
    };
  }, [camera, cursorPlane, cursorPoint, cursorRaycaster, gl, onCursorMove]);

  if (!ast) return null;

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 20, 10]} intensity={1.0} castShadow shadow-mapSize={[1024, 1024]} />
      <pointLight position={[-10, -10, -10]} intensity={0.2} />

      {showCoordinateSystem && <BlueprintGroundPlane />}

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
        onChange={() => {
          if (!onViewChange || !controlsRef.current) return;
          const now = performance.now();
          if (now - lastViewPersistRef.current < 180) return;
          lastViewPersistRef.current = now;
          const cam = controlsRef.current.object as THREE.PerspectiveCamera;
          const t = controlsRef.current.target as THREE.Vector3;
          onViewChange({
            position: [cam.position.x, cam.position.y, cam.position.z],
            target: [t.x, t.y, t.z],
            fov: cam.fov,
          });
        }}
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
  showCoordinateSystem = true,
  onNodeClick,
  onCameraChange,
  onCursorMove,
  selectedNodeId,
}: VerdantRendererProps) {
  const setAst   = useRendererStore((s) => s.setAst);
  const setTheme = useRendererStore((s) => s.setTheme);
  const [canvasKey, setCanvasKey] = useState(0);
  const viewStorageKey = useMemo(() => getAstViewStorageKey(ast), [ast]);
  const initialView = useMemo(() => readViewState(viewStorageKey), [viewStorageKey]);

  useEffect(() => { setAst(ast); }, [ast, setAst]);
  useEffect(() => { setTheme(theme); }, [theme, setTheme]);

  // Pure black or white canvas background depending on mode
  const bg = theme === 'light' ? '#ffffff' : '#000000';

  const cameraPosition = useMemo<[number, number, number]>(
    () => initialView?.position ?? [0, 8, 16],
    [initialView],
  );
  const cameraFov = useMemo<number>(() => initialView?.fov ?? 45, [initialView]);

  const handleViewChange = useCallback(
    (view: PersistedViewState) => {
      writeViewState(viewStorageKey, view);
    },
    [viewStorageKey],
  );

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
        camera={{ position: cameraPosition, fov: cameraFov }}
        gl={{ antialias: true, alpha: false, powerPreference: 'default' }}
        dpr={[1, 1.5]}
        onCreated={handleCreated}
      >
        <color attach="background" args={[bg]} />
        <SceneContent
          autoRotate={autoRotate}
          showCoordinateSystem={showCoordinateSystem}
          onNodeClick={onNodeClick}
          onCursorMove={onCursorMove}
          selectedNodeId={selectedNodeId}
          initialTarget={initialView?.target ?? [0, 0, 0]}
          onViewChange={handleViewChange}
        />
        {onCameraChange && <CameraTracker onCameraChange={onCameraChange} />}
      </Canvas>
    </div>
  );
}