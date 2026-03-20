// types.ts
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

export interface PersistedViewState {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
}

export interface MeasurementLine {
  from: [number, number, number];
  to: [number, number, number];
  fromId: string;
  toId: string;
  label?: string;
  direction: 'outgoing' | 'incoming';
}

export interface TickData {
  pos: [number, number, number];
  axis: 'x' | 'y' | 'z';
  val: number;
}

export interface VerdantRendererProps {
  ast: import('@verdant/parser').VrdAST;
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