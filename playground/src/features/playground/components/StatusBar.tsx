"use client";

import { useMemo } from "react";
import { usePlayground } from "../context/PlaygroundContext";

export function StatusBar() {
  const {
    nodeCount,
    edgeCount,
    errorCount,
    showCoordinateSystem,
    toggleCoordinateSystem,
    cameraData,
    cursorData,
    schemaTab,
  } = usePlayground();

  const camReadout = useMemo(
    () =>
      `cam: ${cameraData.position[0].toFixed(1)}, ${cameraData.position[1].toFixed(1)}, ${cameraData.position[2].toFixed(1)}`,
    [cameraData.position],
  );

  const zoomReadout = `dist: ${cameraData.distance.toFixed(1)} · fov: ${cameraData.fov}° · effFov: ${cameraData.effectiveFov.toFixed(1)}°`;

  const cursorReadout = cursorData
    ? `cursor: (${cursorData.x.toFixed(1)}, ${cursorData.y.toFixed(1)}, ${cursorData.z.toFixed(1)})`
    : "cursor: (-, -, -)";

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

      <span>⌘B schema · ⌘K ai</span>
    </div>
  );
}