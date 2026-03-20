// AxisLabelSprite.tsx

import React, { useEffect, useState } from 'react';
import * as THREE from 'three';
import { TickData } from '../types';

interface AxisLabelSpriteProps {
  tick: TickData;
}

const AXIS_COLORS: Record<string, string> = {
  x: '#e57373',
  y: '#81c784',
  z: '#64b5f6',
};

export function AxisLabelSprite({ tick }: AxisLabelSpriteProps) {
  const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const color = AXIS_COLORS[tick.axis] ?? '#ffffff';
    const label = `${tick.axis.toUpperCase()} ${tick.val > 0 ? '+' : ''}${tick.val}`;

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 96;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

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
    tick.axis === 'x'
      ? [tick.pos[0], 0.22, 0.85]
      : tick.axis === 'z'
        ? [0.85, 0.22, tick.pos[2]]
        : [0.85, tick.pos[1], 0.2];

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