import { ExportError } from './PNGExport';
export { ExportError };

// ---------------------------------------------------------------------------
// GLTF 2.0 types (minimal)
// ---------------------------------------------------------------------------

interface GLTFAsset {
  version: '2.0';
  generator?: string;
}

interface GLTFScene {
  nodes: number[];
  name?: string;
}

interface GLTFNode {
  name?: string;
  mesh?: number;
  translation?: [number, number, number];
  extras?: Record<string, unknown>;
}

interface GLTFMesh {
  name?: string;
  primitives: GLTFPrimitive[];
}

interface GLTFPrimitive {
  attributes: Record<string, number>;
  indices?: number;
  material?: number;
  mode?: number;
}

interface GLTFMaterial {
  name?: string;
  pbrMetallicRoughness?: {
    baseColorFactor?: [number, number, number, number];
    metallicFactor?: number;
    roughnessFactor?: number;
  };
}

interface GLTFAccessor {
  bufferView: number;
  componentType: number;
  count: number;
  type: string;
  min?: number[];
  max?: number[];
}

interface GLTFBufferView {
  buffer: number;
  byteOffset: number;
  byteLength: number;
  target?: number;
}

interface GLTFBuffer {
  byteLength: number;
  uri?: string;
}

interface GLTFDocument {
  asset: GLTFAsset;
  scene: number;
  scenes: GLTFScene[];
  nodes: GLTFNode[];
  meshes?: GLTFMesh[];
  materials?: GLTFMaterial[];
  accessors?: GLTFAccessor[];
  bufferViews?: GLTFBufferView[];
  buffers?: GLTFBuffer[];
  extras?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Scene description accepted by GLTFExport
// ---------------------------------------------------------------------------

export interface GLTFSceneNode {
  id: string;
  type: string;
  label: string;
  status: string;
  position: [number, number, number];
  shape: string;
}

export interface GLTFSceneEdge {
  id: string;
  from: [number, number, number];
  to: [number, number, number];
}

export interface GLTFSceneDescription {
  nodes: GLTFSceneNode[];
  edges: GLTFSceneEdge[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Encode a Float32Array as a base64 data URI */
function float32ToDataUri(data: Float32Array): string {
  const bytes = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const b64 = btoa(binary);
  return `data:application/octet-stream;base64,${b64}`;
}

/** Build a minimal box geometry buffer (8 vertices, 12 triangles) */
function buildBoxPositions(
  cx: number,
  cy: number,
  cz: number,
  halfSize = 0.4
): Float32Array {
  const s = halfSize;
  // 8 corners of a box
  const verts: number[] = [
    cx - s, cy - s, cz - s,
    cx + s, cy - s, cz - s,
    cx + s, cy + s, cz - s,
    cx - s, cy + s, cz - s,
    cx - s, cy - s, cz + s,
    cx + s, cy - s, cz + s,
    cx + s, cy + s, cz + s,
    cx - s, cy + s, cz + s,
  ];
  return new Float32Array(verts);
}

/** Build indices for a box (12 triangles = 36 indices) */
function buildBoxIndices(): Uint16Array {
  return new Uint16Array([
    0, 1, 2,  0, 2, 3, // front
    4, 6, 5,  4, 7, 6, // back
    0, 4, 5,  0, 5, 1, // bottom
    2, 6, 7,  2, 7, 3, // top
    0, 3, 7,  0, 7, 4, // left
    1, 5, 6,  1, 6, 2, // right
  ]);
}

/** Build a line segment (2 points) for an edge */
function buildLinePositions(
  from: [number, number, number],
  to: [number, number, number]
): Float32Array {
  return new Float32Array([...from, ...to]);
}

// ---------------------------------------------------------------------------
// GLTFExport
// ---------------------------------------------------------------------------

export class GLTFExport {
  /**
   * Serializes a scene description into a valid GLTF 2.0 JSON document.
   * Node metadata (id, type, label, status) is stored in each mesh node's extras.
   * Returns Promise<Blob> (application/json).
   * Rejects with ExportError on failure.
   */
  export(scene: GLTFSceneDescription): Promise<Blob> {
    return new Promise<Blob>((resolve, reject) => {
      try {
        const gltfNodes: GLTFNode[] = [];
        const gltfMeshes: GLTFMesh[] = [];
        const gltfMaterials: GLTFMaterial[] = [];
        const gltfAccessors: GLTFAccessor[] = [];
        const gltfBufferViews: GLTFBufferView[] = [];
        const bufferChunks: Uint8Array[] = [];
        let byteOffset = 0;

        // Default material
        gltfMaterials.push({
          name: 'default',
          pbrMetallicRoughness: {
            baseColorFactor: [0.26, 0.53, 0.85, 1.0],
            metallicFactor: 0.2,
            roughnessFactor: 0.6,
          },
        });

        // Edge material
        gltfMaterials.push({
          name: 'edge',
          pbrMetallicRoughness: {
            baseColorFactor: [0.53, 0.53, 0.53, 1.0],
            metallicFactor: 0.0,
            roughnessFactor: 1.0,
          },
        });

        const sceneNodeIndices: number[] = [];

        // ---- Nodes ----
        for (const node of scene.nodes) {
          const [cx, cy, cz] = node.position;

          // Positions buffer
          const positions = buildBoxPositions(cx, cy, cz);
          const posBytes = new Uint8Array(positions.buffer, positions.byteOffset, positions.byteLength);
          bufferChunks.push(posBytes);
          const posBufferView = gltfBufferViews.length;
          gltfBufferViews.push({
            buffer: 0,
            byteOffset,
            byteLength: posBytes.byteLength,
            target: 34962, // ARRAY_BUFFER
          });
          byteOffset += posBytes.byteLength;

          const posAccessor = gltfAccessors.length;
          gltfAccessors.push({
            bufferView: posBufferView,
            componentType: 5126, // FLOAT
            count: 8,
            type: 'VEC3',
          });

          // Indices buffer
          const indices = buildBoxIndices();
          const idxBytes = new Uint8Array(indices.buffer, indices.byteOffset, indices.byteLength);
          bufferChunks.push(idxBytes);
          const idxBufferView = gltfBufferViews.length;
          gltfBufferViews.push({
            buffer: 0,
            byteOffset,
            byteLength: idxBytes.byteLength,
            target: 34963, // ELEMENT_ARRAY_BUFFER
          });
          byteOffset += idxBytes.byteLength;

          const idxAccessor = gltfAccessors.length;
          gltfAccessors.push({
            bufferView: idxBufferView,
            componentType: 5123, // UNSIGNED_SHORT
            count: 36,
            type: 'SCALAR',
          });

          const meshIndex = gltfMeshes.length;
          gltfMeshes.push({
            name: `node_${node.id}`,
            primitives: [
              {
                attributes: { POSITION: posAccessor },
                indices: idxAccessor,
                material: 0,
                mode: 4, // TRIANGLES
              },
            ],
          });

          const gltfNodeIndex = gltfNodes.length;
          gltfNodes.push({
            name: node.label,
            mesh: meshIndex,
            translation: node.position,
            extras: {
              id: node.id,
              type: node.type,
              label: node.label,
              status: node.status,
            },
          });
          sceneNodeIndices.push(gltfNodeIndex);
        }

        // ---- Edges ----
        for (const edge of scene.edges) {
          const linePositions = buildLinePositions(edge.from, edge.to);
          const lineBytes = new Uint8Array(linePositions.buffer, linePositions.byteOffset, linePositions.byteLength);
          bufferChunks.push(lineBytes);
          const lineBufferView = gltfBufferViews.length;
          gltfBufferViews.push({
            buffer: 0,
            byteOffset,
            byteLength: lineBytes.byteLength,
            target: 34962,
          });
          byteOffset += lineBytes.byteLength;

          const lineAccessor = gltfAccessors.length;
          gltfAccessors.push({
            bufferView: lineBufferView,
            componentType: 5126,
            count: 2,
            type: 'VEC3',
          });

          const meshIndex = gltfMeshes.length;
          gltfMeshes.push({
            name: `edge_${edge.id}`,
            primitives: [
              {
                attributes: { POSITION: lineAccessor },
                material: 1,
                mode: 1, // LINES
              },
            ],
          });

          const gltfNodeIndex = gltfNodes.length;
          gltfNodes.push({
            name: `edge_${edge.id}`,
            mesh: meshIndex,
            extras: { id: edge.id },
          });
          sceneNodeIndices.push(gltfNodeIndex);
        }

        // ---- Assemble buffer ----
        const totalBytes = bufferChunks.reduce((sum, c) => sum + c.byteLength, 0);
        const combined = new Uint8Array(totalBytes);
        let writeOffset = 0;
        for (const chunk of bufferChunks) {
          combined.set(chunk, writeOffset);
          writeOffset += chunk.byteLength;
        }

        const bufferUri = float32ToDataUri(new Float32Array(combined.buffer));

        const document: GLTFDocument = {
          asset: { version: '2.0', generator: '@verdant/primitives GLTFExport' },
          scene: 0,
          scenes: [{ nodes: sceneNodeIndices, name: 'Scene' }],
          nodes: gltfNodes,
          meshes: gltfMeshes,
          materials: gltfMaterials,
          accessors: gltfAccessors,
          bufferViews: gltfBufferViews,
          buffers: [{ byteLength: totalBytes, uri: bufferUri }],
          extras: {
            verdantNodes: scene.nodes.map((n) => ({
              id: n.id,
              type: n.type,
              label: n.label,
              status: n.status,
            })),
          },
        };

        const json = JSON.stringify(document);
        const blob = new Blob([json], { type: 'model/gltf+json' });
        resolve(blob);
      } catch (err) {
        reject(new ExportError('GLTF export failed', err));
      }
    });
  }
}
