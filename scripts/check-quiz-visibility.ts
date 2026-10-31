/**
 * Default-presentation integration audit for EVERY shipped quiz model part.
 * Muscle context is opaque with a selected-only, cleared-depth x-ray pass;
 * skeleton context is translucent. Isolated targets contain only the selected
 * source part. Therefore other parts do not occlude the default target pass. This checks target framing and its own
 * renderable surface, not browser compositing or anatomical proficiency.
 * Run: node --import tsx scripts/check-quiz-visibility.ts
 */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { fitDistance } from '../src/components/BoneViewer';
import { getPromptContextIds, modelPromptPools } from '../src/modelQuiz';

const failures: string[] = [];
for (const collection of ['muscles', 'skeleton'] as const) {
  const bytes = await readFile(new URL(`../public/models/${collection}.glb`, import.meta.url));
  const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  gltf.scene.rotation.x = -Math.PI / 2;
  gltf.scene.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(gltf.scene);
  const center = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(new THREE.Vector3());
  const factor = 5.3 / Math.max(size.x, size.y, size.z);
  const holder = new THREE.Group();
  holder.add(gltf.scene);
  holder.scale.setScalar(factor);
  holder.position.copy(center).multiplyScalar(-factor);
  holder.updateMatrixWorld(true);
  const nodes = new Map(gltf.scene.children.map(node => [node.userData.partId as string, node]));
  const nodeBounds = new Map([...nodes].map(([id, node]) => [id, new THREE.Box3().setFromObject(node)]));
  const modes = { focus: 0, context: 0, isolate: 0 };
  for (const question of modelPromptPools[collection]) {
    const target = nodes.get(question.partId!);
    assert.ok(target, `${question.id}: source geometry is missing`);
    const mode = question.presentation ?? 'focus';
    modes[mode]++;
    const targetBounds = nodeBounds.get(question.partId!)!;
    const framingBounds = targetBounds.clone();
    const contextIds = getPromptContextIds(question) ?? [];
    if (mode === 'context') {
      assert.ok(contextIds.length > 0, `${question.id}: positional identification requires neighboring anatomy`);
      for (const id of contextIds) {
        assert.ok(nodes.has(id), `${question.id}: unknown context part ${id}`);
        framingBounds.union(nodeBounds.get(id)!);
      }
    }
    const cameraTarget = framingBounds.getCenter(new THREE.Vector3());
    const framingSize = framingBounds.getSize(new THREE.Vector3());
    const nearScale = mode === 'isolate' ? 5.3 / Math.max(framingSize.x, framingSize.y, framingSize.z) : 1;
    if (mode !== 'isolate') framingSize.multiplyScalar(2).max(new THREE.Vector3(0.35, 0.35, 0.35));
    const targetMeshes: THREE.Mesh[] = [];
    const samples: THREE.Vector3[] = [];
    target.traverse(child => {
      if (!(child instanceof THREE.Mesh)) return;
      targetMeshes.push(child);
      const points = child.geometry.getAttribute('position');
      const stride = Math.max(1, Math.floor(points.count / 12));
      for (let index = 0; index < points.count; index += stride) samples.push(new THREE.Vector3().fromBufferAttribute(points, index).applyMatrix4(child.matrixWorld));
    });
    for (const aspect of [0.8, 1.6]) {
      const distance = fitDistance(framingSize, question.view, aspect);
      const positions = { anterior: [0, 0, distance], posterior: [0, 0, -distance], medial: [distance, 0, 0], lateral: [-distance, 0, 0] } as const;
      // Express isolation's uniform scaling in camera/clip distances instead of
      // mutating the shared source assembly for each part (same projection).
      const camera = new THREE.PerspectiveCamera(34, aspect, 0.01 / nearScale, 150 / nearScale);
      camera.position.set(...positions[question.view]).add(cameraTarget);
      camera.lookAt(cameraTarget);
      camera.updateMatrixWorld();
      let inView = 0;
      let surfaceHits = 0;
      for (const point of samples) {
        const projected = point.clone().project(camera);
        if (projected.z >= 1 || projected.z < -1 || Math.abs(projected.x) > 0.98 || Math.abs(projected.y) > 0.98) continue;
        inView++;
        const raycaster = new THREE.Raycaster();
        raycaster.set(camera.position, point.clone().sub(camera.position).normalize());
        if (raycaster.intersectObjects(targetMeshes, false).length > 0) surfaceHits++;
      }
      const context = `${question.id} (${question.answer}), ${question.view}, ${mode}, aspect ${aspect}`;
      if (inView < Math.min(4, samples.length)) failures.push(`${context}: only ${inView}/${samples.length} sampled vertices in view`);
      if (surfaceHits === 0) failures.push(`${context}: no front-facing target surface intersects sampled rays`);
    }
  }
  console.log(`${collection}: checked ${modelPromptPools[collection].length} source parts at 2 viewport ratios (${modes.focus} focused, ${modes.context} regional context, ${modes.isolate} isolated).`);
}
assert.deepEqual(failures, [], `Default model presentation failures:\n${failures.join('\n')}`);
