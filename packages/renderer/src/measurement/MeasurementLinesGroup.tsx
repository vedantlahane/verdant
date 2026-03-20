// MeasurementLinesGroup.tsx

import React from 'react';
import { MeasurementLine } from '../types';
import { DimensionLine } from './DimensionLine';

interface MeasurementLinesGroupProps {
  lines: MeasurementLine[];
  accentColor?: string;
}

export function MeasurementLinesGroup({
  lines,
  accentColor = '#52B788',
}: MeasurementLinesGroupProps) {
  if (lines.length === 0) return null;

  return (
    <group>
      {lines.map((line, i) => (
        <DimensionLine
          key={`${line.fromId}-${line.toId}-${i}`}
          {...line}
          accentColor={accentColor}
        />
      ))}
    </group>
  );
}