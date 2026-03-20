import React, { useEffect, useMemo, useCallback, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { useRendererStore } from './store';
import { SceneContent } from './SceneContent';
import { CameraTracker } from './camera/CameraTracker';
import {
  getAstViewStorageKey,
  readViewState,
  writeViewState,
} from './store.persistence';
import { VerdantRendererProps, PersistedViewState } from './types';

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
  const setAst = useRendererStore((s) => s.setAst);
  const setTheme = useRendererStore((s) => s.setTheme);
  const [canvasKey, setCanvasKey] = useState(0);

  const viewStorageKey = useMemo(() => getAstViewStorageKey(ast), [ast]);
  const initialView = useMemo(() => readViewState(viewStorageKey), [viewStorageKey]);

  useEffect(() => { setAst(ast); }, [ast, setAst]);
  useEffect(() => { setTheme(theme); }, [theme, setTheme]);

  const bg = theme === 'light' ? '#ffffff' : '#000000';

  const cameraPosition = useMemo<[number, number, number]>(
    () => initialView?.position ?? [0, 8, 16],
    [initialView],
  );

  const cameraFov = useMemo<number>(
    () => initialView?.fov ?? 45,
    [initialView],
  );

  const handleViewChange = useCallback(
    (view: PersistedViewState) => {
      writeViewState(viewStorageKey, view);
    },
    [viewStorageKey],
  );

  // ── WebGL context loss recovery ──
  const handleCreated = useCallback((state: any) => {
    const canvas = state.gl.domElement as HTMLCanvasElement;

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      if (typeof console !== 'undefined') {
        console.warn('[VerdantRenderer] WebGL context lost — will attempt recovery');
      }
    };

    const handleContextRestored = () => {
      if (typeof console !== 'undefined') {
        console.info('[VerdantRenderer] WebGL context restored — remounting canvas');
      }
      setCanvasKey((k) => k + 1);
    };

    canvas.addEventListener('webglcontextlost', handleContextLost);
    canvas.addEventListener('webglcontextrestored', handleContextRestored);

    // Cleanup when canvas unmounts
    return () => {
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      canvas.removeEventListener('webglcontextrestored', handleContextRestored);
    };
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