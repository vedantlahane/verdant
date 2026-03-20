// createGridMaterials.ts

import * as THREE from 'three';
import { FADE_START, FADE_END } from '../constants';
import { detectDarkMode } from '../utils';

function createFadeShaderMaterial(
  baseOpacity: number,
  fadeStart: number,
  fadeEnd: number,
  color: string,
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: false,
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uBaseOpacity: { value: baseOpacity },
      uFadeStart: { value: fadeStart },
      uFadeEnd: { value: fadeEnd },
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

function lineMat(color: string, opacity: number): THREE.LineBasicMaterial {
  return new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    depthTest: false,
  });
}

function meshMat(color: string, opacity: number, side: THREE.Side = THREE.DoubleSide): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    side,
    depthWrite: false,
    depthTest: false,
  });
}

export interface GridMaterials {
  // XZ plane grid
  xzMinor: THREE.ShaderMaterial;
  xzMajor: THREE.ShaderMaterial;

  // YZ / XY plane grids
  yzMinor: THREE.LineBasicMaterial;
  yzMajor: THREE.LineBasicMaterial;
  xyMinor: THREE.LineBasicMaterial;
  xyMajor: THREE.LineBasicMaterial;

  // Panels
  xzPanel: THREE.MeshBasicMaterial;
  yzPanel: THREE.MeshBasicMaterial;
  xyPanel: THREE.MeshBasicMaterial;

  // Axes
  xAxis: THREE.LineBasicMaterial;
  yAxis: THREE.LineBasicMaterial;
  zAxis: THREE.LineBasicMaterial;
  zAxisNeg: THREE.LineBasicMaterial;

  // Origin
  crosshair: THREE.LineBasicMaterial;
  ring: THREE.MeshBasicMaterial;
  sphere: THREE.MeshBasicMaterial;

  // Ticks
  tickX: THREE.MeshBasicMaterial;
  tickY: THREE.MeshBasicMaterial;
  tickZ: THREE.MeshBasicMaterial;

  // Arrows
  arrowX: THREE.MeshBasicMaterial;
  arrowY: THREE.MeshBasicMaterial;
  arrowZ: THREE.MeshBasicMaterial;
  arrowZFar: THREE.MeshBasicMaterial;
}

interface Palette {
  gridColor: string;
  gridMinorOpacity: number;
  gridMajorOpacity: number;
  yzColor: string;
  xyColor: string;
  yzMinorOpacity: number;
  yzMajorOpacity: number;
  xyMinorOpacity: number;
  xyMajorOpacity: number;
  xzPanelColor: string;
  yzPanelColor: string;
  xyPanelColor: string;
  xzPanelOpacity: number;
  yzPanelOpacity: number;
  xyPanelOpacity: number;
  xAxisOpacity: number;
  yAxisOpacity: number;
  zAxisOpacity: number;
  zAxisNegOpacity: number;
  originColor: string;
  crosshairOpacity: number;
  ringOpacity: number;
  sphereOpacity: number;
  tickOpacityXY: number;
  tickOpacityZ: number;
  arrowOpacityXY: number;
  arrowOpacityZ: number;
  arrowOpacityZFar: number;
}

const DARK_PALETTE: Palette = {
  gridColor: '#ffffff',
  gridMinorOpacity: 0.14,
  gridMajorOpacity: 0.26,
  yzColor: '#81c784',
  xyColor: '#64b5f6',
  yzMinorOpacity: 0.07,
  yzMajorOpacity: 0.14,
  xyMinorOpacity: 0.07,
  xyMajorOpacity: 0.14,
  xzPanelColor: '#90a4ae',
  yzPanelColor: '#81c784',
  xyPanelColor: '#64b5f6',
  xzPanelOpacity: 0.05,
  yzPanelOpacity: 0.04,
  xyPanelOpacity: 0.04,
  xAxisOpacity: 0.48,
  yAxisOpacity: 0.45,
  zAxisOpacity: 0.52,
  zAxisNegOpacity: 0.66,
  originColor: '#ffffff',
  crosshairOpacity: 0.5,
  ringOpacity: 0.12,
  sphereOpacity: 0.4,
  tickOpacityXY: 0.2,
  tickOpacityZ: 0.2,
  arrowOpacityXY: 0.45,
  arrowOpacityZ: 0.5,
  arrowOpacityZFar: 0.75,
};

const LIGHT_PALETTE: Palette = {
  gridColor: '#1f2937',
  gridMinorOpacity: 0.30,
  gridMajorOpacity: 0.48,
  yzColor: '#1b5e20',
  xyColor: '#0d47a1',
  yzMinorOpacity: 0.12,
  yzMajorOpacity: 0.22,
  xyMinorOpacity: 0.12,
  xyMajorOpacity: 0.22,
  xzPanelColor: '#1f2937',
  yzPanelColor: '#2e7d32',
  xyPanelColor: '#1565c0',
  xzPanelOpacity: 0.08,
  yzPanelOpacity: 0.07,
  xyPanelOpacity: 0.07,
  xAxisOpacity: 0.86,
  yAxisOpacity: 0.84,
  zAxisOpacity: 0.9,
  zAxisNegOpacity: 0.95,
  originColor: '#111111',
  crosshairOpacity: 0.35,
  ringOpacity: 0.08,
  sphereOpacity: 0.3,
  tickOpacityXY: 0.42,
  tickOpacityZ: 0.44,
  arrowOpacityXY: 0.8,
  arrowOpacityZ: 0.85,
  arrowOpacityZFar: 0.95,
};

export function createGridMaterials(isDark: boolean): GridMaterials {
  const p = isDark ? DARK_PALETTE : LIGHT_PALETTE;

  return {
    xzMinor: createFadeShaderMaterial(p.gridMinorOpacity, FADE_START, FADE_END, p.gridColor),
    xzMajor: createFadeShaderMaterial(p.gridMajorOpacity, FADE_START, FADE_END, p.gridColor),

    yzMinor: lineMat(p.yzColor, p.yzMinorOpacity),
    yzMajor: lineMat(p.yzColor, p.yzMajorOpacity),
    xyMinor: lineMat(p.xyColor, p.xyMinorOpacity),
    xyMajor: lineMat(p.xyColor, p.xyMajorOpacity),

    xzPanel: meshMat(p.xzPanelColor, p.xzPanelOpacity),
    yzPanel: meshMat(p.yzPanelColor, p.yzPanelOpacity),
    xyPanel: meshMat(p.xyPanelColor, p.xyPanelOpacity),

    xAxis: lineMat('#e57373', p.xAxisOpacity),
    yAxis: lineMat('#81c784', p.yAxisOpacity),
    zAxis: lineMat('#64b5f6', p.zAxisOpacity),
    zAxisNeg: lineMat('#1e88e5', p.zAxisNegOpacity),

    crosshair: lineMat(p.originColor, p.crosshairOpacity),
    ring: meshMat(p.originColor, p.ringOpacity),
    sphere: meshMat(p.originColor, p.sphereOpacity, THREE.FrontSide),

    tickX: meshMat('#e57373', p.tickOpacityXY),
    tickY: meshMat('#81c784', p.tickOpacityXY),
    tickZ: meshMat('#64b5f6', p.tickOpacityZ),

    arrowX: meshMat('#e57373', p.arrowOpacityXY),
    arrowY: meshMat('#81c784', p.arrowOpacityXY),
    arrowZ: meshMat('#64b5f6', p.arrowOpacityZ),
    arrowZFar: meshMat('#1e88e5', p.arrowOpacityZFar),
  };
}

export function disposeGridMaterials(m: GridMaterials): void {
  for (const value of Object.values(m)) {
    if (value && typeof value.dispose === 'function') {
      value.dispose();
    }
  }
}