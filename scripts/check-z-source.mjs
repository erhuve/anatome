/** Independent source check; needs the pinned FBX downloaded into ../research-assets. */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
const root = new URL('../', import.meta.url);
const raw = await readFile(new URL('../../research-assets/MuscularSystem100.fbx', import.meta.url));
const report = JSON.parse(await readFile(new URL('public/models/systems.json', root), 'utf8')).muscles;
assert.equal(createHash('sha256').update(raw).digest('hex'), report.sourceSha256);
const source = new FBXLoader().parse(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength), '');
source.updateMatrixWorld(true);
const sourceById = new Map(); source.traverse(o => { if (o instanceof THREE.Mesh) sourceById.set(o.ID, o); });
const bytes = await readFile(new URL('public/models/muscles.glb', root));
const runtime = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
const runtimeById = new Map(runtime.scene.children.map(o => [o.userData.partId, o]));
const v = new THREE.Vector3(), values = new Float32Array(3), bits = new Uint32Array(values.buffer);
const key = (x, y, z) => { values[0] = x; values[1] = y; values[2] = z; return `${bits[0]},${bits[1]},${bits[2]}`; };
let checked = 0;
for (const part of report.parts) {
  const original = sourceById.get(part.sourceNodeId), packed = runtimeById.get(part.id);
  assert.ok(original && packed, `${part.id}: source and packaged mesh exist`);
  assert.equal(original.userData.originalName, part.sourceName);
  assert.equal(original.geometry.index?.count / 3 || original.geometry.attributes.position.count / 3, part.triangles);
  const expected = new Set(), actual = new Set();
  const sourcePositions = original.geometry.attributes.position, packedPositions = packed.geometry.attributes.position;
  for (let i = 0; i < sourcePositions.count; i++) {
    v.fromBufferAttribute(sourcePositions, i).applyMatrix4(original.matrixWorld);
    expected.add(key(10 * v.x, -10 * v.z, 10 * v.y));
  }
  for (let i = 0; i < packedPositions.count; i++) actual.add(key(packedPositions.getX(i), packedPositions.getY(i), packedPositions.getZ(i)));
  assert.equal(actual.size, expected.size, `${part.id}: all unique source positions retained`);
  for (const point of expected) assert.ok(actual.has(point), `${part.id}: source position is unchanged after exact unit/axis conversion`);
  checked += expected.size;
}
console.log(`${report.parts.length} Z-Anatomy source nodes and ${checked.toLocaleString()} unique vertex positions independently match the pinned FBX; no decimation, altered pose, or invented counterparts.`);
