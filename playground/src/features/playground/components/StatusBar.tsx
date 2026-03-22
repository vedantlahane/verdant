// features/playground/components/StatusBar.tsx

"use client";

import { memo, useMemo } from "react";
import { usePlayground } from "../context/PlaygroundContext";

/**
 * Bottom status bar — shows node/edge counts, camera readout,
 * cursor position, selection info, and shortcut hints.
 *
 * Reads from PlaygroundContext. Memoized to avoid re-renders
 * from unrelated context changes.
 */
export const StatusBar = memo(function StatusBar() {
  const {
    nodeCount,
    edgeCount,
    errorCount,
    showCoordinateSystem,
    toggleCoordinateSystem,
    cameraData,
    cursorData,
    schemaTab,
    selectionCount,
    undoDepth,
    layoutName,
    fps,
  } = usePlayground();

  const camReadout = useMemo(
    () =>
      `cam: ${cameraData.position[0].toFixed(1)}, ${cameraData.position[1].toFixed(1)}, ${cameraData.position[2].toFixed(1)}`,
    [cameraData.position],
  );

  const zoomReadout = useMemo(
    () =>
      `dist: ${cameraData.distance.toFixed(1)} · fov: ${cameraData.fov}° · effFov: ${cameraData.effectiveFov.toFixed(1)}°`,
    [cameraData.distance, cameraData.fov, cameraData.effectiveFov],
  );

  const cursorReadout = useMemo(
    () =>
      cursorData
        ? `cursor: (${cursorData.x.toFixed(1)}, ${cursorData.y.toFixed(1)}, ${cursorData.z.toFixed(1)})`
        : "cursor: (-, -, -)",
    [cursorData],
  );

  const selectionReadout = useMemo(
    () => (selectionCount > 0 ? `${selectionCount} selected` : "No selection"),
    [selectionCount],
  );

  return (
    <div className="pg-status">
      <span className="pg-status-left">
        {nodeCount}n · {edgeCount}e
        {errorCount > 0 && <> · {errorCount}⊘</>}
        <button
          type="button"
          className="pg-status-toggle"
          onClick={toggleCoordinateSystem}
        >
          {showCoordinateSystem ? "hide coords" : "show coords"}
        </button>
      </span>

      <span className="pg-status-cam">
        {camReadout} · {zoomReadout}
        {showCoordinateSystem ? ` · ${cursorReadout}` : ""}
      </span>

      <span className="pg-status-info">
        {selectionReadout} · {undoDepth} undo · {layoutName} · {fps}fps
      </span>

      <span>⌘B schema · ⌘K ai</span>
    </div>
  );
});