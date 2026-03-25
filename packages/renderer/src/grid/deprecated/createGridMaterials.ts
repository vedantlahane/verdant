// grid/createGridMaterials.ts

import { Color, DoubleSide, FrontSide, LineBasicMaterial, MeshBasicMaterial, ShaderMaterial, Side } from 'three';
import { FADE_START, FADE_END } from '../../constants';

// ═══════════════════════════════════════════════════════════════════
//  Types
// ═══════════════════════════════════════════════════════════════════

export interface GridMaterials {
  // XZ plane grid (uses fade shader)
  readonly xzMinor: ShaderMaterial;
  readonly xzMajor: ShaderMaterial;

  // YZ / XY plane grids
  readonly yzMinor: ShaderMaterial;
  readonly yzMajor: ShaderMaterial;
  readonly xyMinor: ShaderMaterial;
  readonly xyMajor: ShaderMaterial;

  // Translucent panels
  readonly xzPanel: MeshBasicMaterial;
  readonly yzPanel: MeshBasicMaterial;
  readonly xyPanel: MeshBasicMaterial;

  // Axes
  readonly xAxis: LineBasicMaterial;
  readonly yAxis: LineBasicMaterial;
  readonly zAxis: LineBasicMaterial;
  readonly zAxisNeg: LineBasicMaterial;

  // Origin markers
  readonly crosshair: LineBasicMaterial;
  readonly ring: MeshBasicMaterial;
  readonly sphere: MeshBasicMaterial;

  // Tick marks
  readonly tickX: MeshBasicMaterial;
  readonly tickY: MeshBasicMaterial;
  readonly tickZ: MeshBasicMaterial;

  // Axis arrows
  readonly arrowX: MeshBasicMaterial;
  readonly arrowY: MeshBasicMaterial;
  readonly arrowZ: MeshBasicMaterial;
  readonly arrowZFar: MeshBasicMaterial;
}

// ═══════════════════════════════════════════════════════════════════
//  Color Palette
//
//  Separates visual design (palette) from material construction
//  (factory functions). Adding a new theme is just a new Palette.
// ═══════════════════════════════════════════════════════════════════

interface Palette {
  // Grid lines
  readonly gridColor: string;
  readonly gridMinorOpacity: number;
  readonly gridMajorOpacity: number;

  // Secondary planes
  readonly yzColor: string;
  readonly xyColor: string;
  readonly yzMinorOpacity: number;
  readonly yzMajorOpacity: number;
  readonly xyMinorOpacity: number;
  readonly xyMajorOpacity: number;

  // Panels
  readonly xzPanelColor: string;
  readonly yzPanelColor: string;
  readonly xyPanelColor: string;
  readonly xzPanelOpacity: number;
  readonly yzPanelOpacity: number;
  readonly xyPanelOpacity: number;

  // Axes
  readonly xAxisColor: string;
  readonly yAxisColor: string;
  readonly zAxisColor: string;
  readonly zAxisNegColor: string;
  readonly xAxisOpacity: number;
  readonly yAxisOpacity: number;
  readonly zAxisOpacity: number;
  readonly zAxisNegOpacity: number;

  // Origin
  readonly originColor: string;
  readonly crosshairOpacity: number;
  readonly ringOpacity: number;
  readonly sphereOpacity: number;

  // Ticks
  readonly tickXColor: string;
  readonly tickYColor: string;
  readonly tickZColor: string;
  readonly tickOpacityXY: number;
  readonly tickOpacityZ: number;

  // Arrows
  readonly arrowXColor: string;
  readonly arrowYColor: string;
  readonly arrowZColor: string;
  readonly arrowZFarColor: string;
  readonly arrowOpacityXY: number;
  readonly arrowOpacityZ: number;
  readonly arrowOpacityZFar: number;
}

// ═══════════════════════════════════════════════════════════════════
//  Palettes
// ═══════════════════════════════════════════════════════════════════

const DARK_PALETTE: Readonly<Palette> = Object.freeze({
  gridColor: '#fdfeff38',
  gridMinorOpacity: 0.14,
  gridMajorOpacity: 0.26,

  yzColor: '#81c784',
  xyColor: '#64b5f6',
  yzMinorOpacity: 0.07,
  yzMajorOpacity: 0.14,
  xyMinorOpacity: 0.07,
  xyMajorOpacity: 0.14,

  xzPanelColor: '#10224a',
  yzPanelColor: '#81c784',
  xyPanelColor: '#64b5f6',
  xzPanelOpacity: 0.05,
  yzPanelOpacity: 0.04,
  xyPanelOpacity: 0.04,

  xAxisColor: '#e57373',
  yAxisColor: '#81c784',
  zAxisColor: '#64b5f6',
  zAxisNegColor: '#1e88e5',
  xAxisOpacity: 0.48,
  yAxisOpacity: 0.45,
  zAxisOpacity: 0.52,
  zAxisNegOpacity: 0.66,

  originColor: '#ffffff',
  crosshairOpacity: 0.5,
  ringOpacity: 0.12,
  sphereOpacity: 0.4,

  tickXColor: '#f08e8e',
  tickYColor: '#acf1b0',
  tickZColor: '#84c3f6',
  tickOpacityXY: 0.2,
  tickOpacityZ: 0.2,

  arrowXColor: '#e57373',
  arrowYColor: '#adeeb0',
  arrowZColor: '#88c2f2',
  arrowZFarColor: '#1e88e5',
  arrowOpacityXY: 0.45,
  arrowOpacityZ: 0.5,
  arrowOpacityZFar: 0.75,
});

const LIGHT_PALETTE: Readonly<Palette> = Object.freeze({
  gridColor: 'rgba(163, 156, 211, 0.84)',
  gridMinorOpacity: 0.30,
  gridMajorOpacity: 0.48,

  yzColor: '#1b5e20',
  xyColor: '#0d47a1',
  yzMinorOpacity: 0.12,
  yzMajorOpacity: 0.22,
  xyMinorOpacity: 0.12,
  xyMajorOpacity: 0.22,

  xzPanelColor: '#ffffff',
  yzPanelColor: '#2e7d32',
  xyPanelColor: '#1565c0',
  xzPanelOpacity: 0.08,
  yzPanelOpacity: 0.07,
  xyPanelOpacity: 0.07,

  xAxisColor: '#e57373',
  yAxisColor: '#81c784',
  zAxisColor: '#64b5f6',
  zAxisNegColor: '#1e88e5',
  xAxisOpacity: 0.86,
  yAxisOpacity: 0.84,
  zAxisOpacity: 0.9,
  zAxisNegOpacity: 0.95,

  originColor: '#111111',
  crosshairOpacity: 0.35,
  ringOpacity: 0.08,
  sphereOpacity: 0.3,

  tickXColor: '#f08e8e',
  tickYColor: '#acf1b0',
  tickZColor: '#84c3f6',
  tickOpacityXY: 0.42,
  tickOpacityZ: 0.44,

  arrowXColor: '#e57373',
  arrowYColor: '#adeeb0',
  arrowZColor: '#88c2f2',
  arrowZFarColor: '#1e88e5',
  arrowOpacityXY: 0.8,
  arrowOpacityZ: 0.85,
  arrowOpacityZFar: 0.95,
});

// ═══════════════════════════════════════════════════════════════════
//  Color Parsing
//
//  Three.js Color constructor doesn't handle:
//    - #RRGGBBAA hex (8-digit)
//    - #RGBA hex (4-digit)
//  We need to extract the alpha and apply it to opacity separately.
// ═══════════════════════════════════════════════════════════════════

interface NormalizedColor {
  readonly hex: string;
  readonly alpha: number;
}

/**
 * Parse a CSS color string and extract a separate alpha component.
 *
 * Supported formats:
 *   - `#RGB`           → full opacity
 *   - `#RRGGBB`        → full opacity
 *   - `#RGBA`          → expanded, alpha extracted
 *   - `#RRGGBBAA`      → alpha extracted
 *   - `rgba(r, g, b, a)` → alpha extracted
 *   - `rgb(r, g, b)`   → full opacity
 *   - Named colors / other → passed through, full opacity
 */
function parseColor(color: string): NormalizedColor {
  // 4-digit or 8-digit hex with alpha
  const hexAlphaMatch = color.match(/^#([0-9a-f]{4}|[0-9a-f]{8})$/i);
  if (hexAlphaMatch) {
    const raw = hexAlphaMatch[1];
    const expanded =
      raw.length === 4
        ? raw[0] + raw[0] + raw[1] + raw[1] + raw[2] + raw[2] + raw[3] + raw[3]
        : raw;

    const rgbHex = expanded.slice(0, 6);
    const alphaHex = expanded.slice(6, 8);
    const alpha = clamp01(parseInt(alphaHex, 16) / 255);
    return { hex: `#${rgbHex}`, alpha };
  }

  // rgba() or rgb()
  const rgbaMatch = color.match(
    /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([0-9.]+))?\s*\)/i,
  );
  if (rgbaMatch) {
    const r = Number(rgbaMatch[1]);
    const g = Number(rgbaMatch[2]);
    const b = Number(rgbaMatch[3]);
    const a = rgbaMatch[4] !== undefined ? clamp01(Number(rgbaMatch[4])) : 1.0;

    const threeColor = new Color(`rgb(${r},${g},${b})`);
    return { hex: `#${threeColor.getHexString()}`, alpha: a };
  }

  // Standard 3/6-digit hex or named color → full opacity
  return { hex: color, alpha: 1.0 };
}

function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

// ═══════════════════════════════════════════════════════════════════
//  Material Factory Functions
// ═══════════════════════════════════════════════════════════════════

/** Common transparent material properties to avoid repetition */
const TRANSPARENT_OPTS = {
  transparent: true,
  depthWrite: false,
  depthTest: true,
} as const;

/**
 * Create a ShaderMaterial that fades grid lines based on
 * world-space XZ distance from origin.
 *
 * This is used only for the ground (XZ) plane — the YZ and XY
 * planes use simpler LineBasicMaterial since they don't need
 * distance-based fading.
 */
function createFadeMaterial(
  baseOpacity: number,
  fadeStart: number,
  fadeEnd: number,
  color: string,
): ShaderMaterial {
  const parsed = parseColor(color);
  const finalOpacity = clamp01(baseOpacity * parsed.alpha);

  return new ShaderMaterial({
    ...TRANSPARENT_OPTS,
    uniforms: {
      uColor: { value: new Color(parsed.hex) },
      uBaseOpacity: { value: finalOpacity },
      uFadeStart: { value: fadeStart },
      uFadeEnd: { value: fadeEnd },
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorldPos;
      void main() {
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPos = worldPos.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uBaseOpacity;
      uniform float uFadeStart;
      uniform float uFadeEnd;
      varying vec3 vWorldPos;
      void main() {
        float dist = length(vWorldPos - cameraPosition);
        float fade = 1.0 - smoothstep(uFadeStart, uFadeEnd, dist);
        gl_FragColor = vec4(uColor, uBaseOpacity * fade);
      }
    `,
  });
}

function createLineMaterial(
  color: string,
  opacity: number,
): LineBasicMaterial {
  return new LineBasicMaterial({
    color,
    opacity,
    ...TRANSPARENT_OPTS,
  });
}

function createMeshMaterial(
  color: string,
  opacity: number,
  side: Side = DoubleSide,
): MeshBasicMaterial {
  return new MeshBasicMaterial({
    color,
    opacity,
    side,
    ...TRANSPARENT_OPTS,
  });
}

// ═══════════════════════════════════════════════════════════════════
//  Public API
// ═══════════════════════════════════════════════════════════════════

/**
 * Create all materials for the coordinate grid.
 *
 * Callers MUST call `disposeGridMaterials` on unmount to free
 * GPU resources (shader programs, uniform buffers).
 *
 * @param isDark - Whether to use the dark or light color palette.
 */
export function createGridMaterials(isDark: boolean): GridMaterials {
  const p = isDark ? DARK_PALETTE : LIGHT_PALETTE;

  return {
    // XZ ground plane — fading shader
    xzMinor: createFadeMaterial(p.gridMinorOpacity, FADE_START, FADE_END, p.gridColor),
    xzMajor: createFadeMaterial(p.gridMajorOpacity, FADE_START, FADE_END, p.gridColor),

    // YZ / XY secondary planes — now also using spherical fading shader
    yzMinor: createFadeMaterial(p.yzMinorOpacity, FADE_START, FADE_END, p.yzColor),
    yzMajor: createFadeMaterial(p.yzMajorOpacity, FADE_START, FADE_END, p.yzColor),
    xyMinor: createFadeMaterial(p.xyMinorOpacity, FADE_START, FADE_END, p.xyColor),
    xyMajor: createFadeMaterial(p.xyMajorOpacity, FADE_START, FADE_END, p.xyColor),

    // Panels
    xzPanel: createMeshMaterial(p.xzPanelColor, p.xzPanelOpacity),
    yzPanel: createMeshMaterial(p.yzPanelColor, p.yzPanelOpacity),
    xyPanel: createMeshMaterial(p.xyPanelColor, p.xyPanelOpacity),

    // Axes
    xAxis: createLineMaterial(p.xAxisColor, p.xAxisOpacity),
    yAxis: createLineMaterial(p.yAxisColor, p.yAxisOpacity),
    zAxis: createLineMaterial(p.zAxisColor, p.zAxisOpacity),
    zAxisNeg: createLineMaterial(p.zAxisNegColor, p.zAxisNegOpacity),

    // Origin
    crosshair: createLineMaterial(p.originColor, p.crosshairOpacity),
    ring: createMeshMaterial(p.originColor, p.ringOpacity),
    sphere: createMeshMaterial(p.originColor, p.sphereOpacity, FrontSide),

    // Ticks
    tickX: createMeshMaterial(p.tickXColor, p.tickOpacityXY),
    tickY: createMeshMaterial(p.tickYColor, p.tickOpacityXY),
    tickZ: createMeshMaterial(p.tickZColor, p.tickOpacityZ),

    // Arrows
    arrowX: createMeshMaterial(p.arrowXColor, p.arrowOpacityXY),
    arrowY: createMeshMaterial(p.arrowYColor, p.arrowOpacityXY),
    arrowZ: createMeshMaterial(p.arrowZColor, p.arrowOpacityZ),
    arrowZFar: createMeshMaterial(p.arrowZFarColor, p.arrowOpacityZFar),
  };
}

/**
 * Dispose all materials in the collection.
 *
 * For ShaderMaterials this also frees the compiled shader program.
 * Safe to call multiple times — `Material.dispose()` is idempotent.
 */
export function disposeGridMaterials(materials: GridMaterials): void {
  const values = Object.values(materials);
  for (let i = 0; i < values.length; i++) {
    const mat = values[i];
    if (mat && typeof (mat as any).dispose === 'function') {
      (mat as any).dispose();
    }
  }
}