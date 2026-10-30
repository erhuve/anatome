import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { systemParts, type SystemId } from '../src/systemData';

type ManifestPart = { id: string; name: string; sourceId: string; vertices: number; triangles: number; sourceBounds: { min: number[]; max: number[] } };
const manifest = JSON.parse(await readFile(new URL('../public/models/systems.json', import.meta.url), 'utf8')) as Record<SystemId, { parts: ManifestPart[]; assetSha256: string; assetBytes: number }>;
for (const system of ['skeleton', 'muscles'] as const) {
  const bytes = await readFile(new URL(`../public/models/${system}.glb`, import.meta.url));
  assert.equal(bytes.byteLength, manifest[system].assetBytes, `${system}: packaged asset size`);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), manifest[system].assetSha256, `${system}: packaged asset checksum`);
  const gltf = await new Promise<Awaited<ReturnType<GLTFLoader['parseAsync']>>>((resolve, reject) => new GLTFLoader().parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '', resolve, reject));
  const nodes = gltf.scene.children;
  assert.equal(nodes.length, systemParts[system].length, `${system}: every listed part has a node`);
  assert.equal(new Set(nodes.map(n => n.userData.partId)).size, nodes.length, `${system}: unique structure IDs`);
  let triangles = 0;
  for (const part of systemParts[system]) {
    const node = nodes.find(n => n.userData.partId === part.id);
    assert.ok(node, `Missing mesh for ${part.id} ${part.name}`);
    assert.equal(node.userData.anatomicalName, part.name);
    assert.equal(node.userData.sourceId, part.sourceId);
    assert.equal(node.userData.kind, part.kind);
    const source = manifest[system].parts.find(p => p.id === part.id)!;
    let vertexCount = 0, triangleCount = 0;
    const bounds = new THREE.Box3();
    node.traverse(child => {
      if (!(child instanceof THREE.Mesh)) return;
      child.geometry.computeBoundingBox(); bounds.union(child.geometry.boundingBox!);
      const positions = child.geometry.getAttribute('position'), normals = child.geometry.getAttribute('normal');
      vertexCount += positions.count; triangleCount += child.geometry.index!.count / 3;
      assert.equal(normals.count, positions.count, `${part.id}: normals retained`);
      for (let i = 0; i < positions.count; i++) {
        assert.ok(Number.isFinite(positions.getX(i)) && Number.isFinite(positions.getY(i)) && Number.isFinite(positions.getZ(i)), `${part.id}: finite geometry`);
      }
    });
    assert.equal(vertexCount, source.vertices, `${part.id}: vertex count`);
    assert.equal(triangleCount, source.triangles, `${part.id}: triangle count`);
    for (let axis = 0; axis < 3; axis++) {
      assert.ok(Math.abs(bounds.min.getComponent(axis) - source.sourceBounds.min[axis]) < .0003, `${part.id}: original min coordinate ${axis}`);
      assert.ok(Math.abs(bounds.max.getComponent(axis) - source.sourceBounds.max[axis]) < .0003, `${part.id}: original max coordinate ${axis}`);
    }
    const middleX = bounds.getCenter(new THREE.Vector3()).x;
    if (/\bright\b/i.test(part.name)) assert.ok(middleX < 0, `${part.id}: source right side stays at negative X`);
    if (/\bleft\b/i.test(part.name)) assert.ok(middleX > 0, `${part.id}: source left side stays at positive X`);
    triangles += triangleCount;
  }
  gltf.scene.rotation.x = -Math.PI / 2;
  gltf.scene.updateMatrixWorld(true);
  gltf.scene.traverse(node => assert.ok(node.matrixWorld.determinant() > 0, `${system}: proper rotation without reflection`));
  for (const node of nodes) {
    const part = manifest[system].parts.find(p => p.id === node.userData.partId)!;
    const expected = new THREE.Box3(new THREE.Vector3(...part.sourceBounds.min as [number, number, number]), new THREE.Vector3(...part.sourceBounds.max as [number, number, number])).applyMatrix4(gltf.scene.matrixWorld);
    const observed = new THREE.Box3().setFromObject(node);
    assert.ok(observed.min.distanceTo(expected.min) < .0006 && observed.max.distanceTo(expected.max) < .0006, `${part.id}: anatomical coordinate rotation preserved`);
  }
  console.log(`${system}: ${nodes.length} source-named parts, ${triangles.toLocaleString()} triangles; identifiers, geometry bounds, side preservation and rotation passed.`);
}
