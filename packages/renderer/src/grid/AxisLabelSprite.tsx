// grid/AxisLabelSprite.tsx

import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { TickData, Vec3 } from '../types';

// ═══════════════════════════════════════════════════════════════════
//  Constants
// ═══════════════════════════════════════════════════════════════════

const CANVAS_WIDTH = 256;
const CANVAS_HEIGHT = 96;
const FONT = 'bold 36px monospace';
const TEXT_CENTER_X = CANVAS_WIDTH / 2; // 128
const TEXT_CENTER_Y = CANVAS_HEIGHT / 2 + 4; // 52 (slight visual offset)

const SPRITE_SCALE: Vec3 = [1.4, 0.55, 1];
const SPRITE_RENDER_ORDER = 20;
const SPRITE_OPACITY = 0.68;

/** Y-offset above the axis line for label readability */
const LABEL_Y_OFFSET = 0.22;

/** Lateral offset from the axis line to avoid overlap */
const LABEL_LATERAL_OFFSET = 0.85;

const AXIS_COLORS: Readonly<Record<string, string>> = {
  x: '#e57373',
  y: '#81c784',
  z: '#64b5f6',
};

// ═══════════════════════════════════════════════════════════════════
//  Label Position Computation
//
//  Each axis label is placed beside its axis:
//    X ticks → along X axis, offset in Z
//    Y ticks → along Y axis, offset in X
//    Z ticks → along Z axis, offset in X
// ═══════════════════════════════════════════════════════════════════

function computeLabelPosition(tick: TickData): Vec3 {
  switch (tick.axis) {
    case 'x':
      return [tick.pos[0], LABEL_Y_OFFSET, LABEL_LATERAL_OFFSET];
    case 'z':
      return [LABEL_LATERAL_OFFSET, LABEL_Y_OFFSET, tick.pos[2]];
    case 'y':
      return [LABEL_LATERAL_OFFSET, tick.pos[1], LABEL_Y_OFFSET - 0.02];
    default:
      return [0, 0, 0];
  }
}

// ═══════════════════════════════════════════════════════════════════
//  Canvas Texture Generation
//
//  Creates a 2D canvas texture with the axis label text.
//  The canvas is created once per tick value change and disposed
//  on cleanup / re-render.
//
//  SSR-safe: returns null when `document` is unavailable.
// ═══════════════════════════════════════════════════════════════════

function createLabelTexture(
  axis: string,
  val: number,
): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;

  const color = AXIS_COLORS[axis] ?? '#ffffff';
  const sign = val > 0 ? '+' : '';
  const label = `${axis.toUpperCase()} ${sign}${val}`;

  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;

  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.font = FONT;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, TEXT_CENTER_X, TEXT_CENTER_Y);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;

  return texture;
}

// ═══════════════════════════════════════════════════════════════════
//  Component
// ═══════════════════════════════════════════════════════════════════

interface AxisLabelSpriteProps {
  readonly tick: TickData;
}

/**
 * Renders a single axis tick label as a billboard sprite.
 *
 * The sprite always faces the camera (billboard behavior is built
 * into Three.js `<sprite>`). Text is rendered to a 2D canvas and
 * uploaded as a texture.
 *
 * Memoized on `tick.axis` and `tick.val` — position changes alone
 * don't require re-creating the texture.
 */
export const AxisLabelSprite = React.memo(
  function AxisLabelSprite({ tick }: AxisLabelSpriteProps) {
    const textureRef = useRef<THREE.CanvasTexture | null>(null);

    // Create texture when axis/val changes, dispose on cleanup
    const texture = useMemo(() => {
      // Dispose previous texture if replacing
      if (textureRef.current) {
        textureRef.current.dispose();
        textureRef.current = null;
      }

      const tex = createLabelTexture(tick.axis, tick.val);
      textureRef.current = tex;
      return tex;
    }, [tick.axis, tick.val]);

    // Ensure disposal on unmount (even if memo deps didn't change)
    useEffect(() => {
      return () => {
        if (textureRef.current) {
          textureRef.current.dispose();
          textureRef.current = null;
        }
      };
    }, []);

    const position = useMemo(
      () => computeLabelPosition(tick),
      [tick],
    );

    if (!texture) return null;

    return (
      <sprite
        position={position}
        scale={SPRITE_SCALE}
        renderOrder={SPRITE_RENDER_ORDER}
      >
        <spriteMaterial
          map={texture}
          transparent
          depthWrite={false}
          depthTest={false}
          opacity={SPRITE_OPACITY}
        />
      </sprite>
    );
  },
  // Custom comparator: only re-render if axis or val changes.
  // Position is derived from axis + tick.pos which is part of the tick object.
  (prev, next) =>
    prev.tick.axis === next.tick.axis &&
    prev.tick.val === next.tick.val &&
    prev.tick.pos[0] === next.tick.pos[0] &&
    prev.tick.pos[1] === next.tick.pos[1] &&
    prev.tick.pos[2] === next.tick.pos[2],
);