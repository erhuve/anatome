// Integration check using shipped OBJ geometry, actual question data and shared
// viewer configuration. Run: node --import tsx scripts/check-anatomy.ts
// This checks geometry/marker math without claiming browser or anatomy validation.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { landmarks, fitDistance } from '../src/components/BoneViewer.tsx';
import { bones, preferredLandmarkView, questions, type BoneId, type View } from '../src/content.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'public/models/manifest.json'), 'utf8'));
const aspects = [0.9, 1.4, 2.2];
type Marker = { point: THREE.Vector3; normal: THREE.Vector3 };
type Specimen = { meshes: THREE.Mesh[]; markers: Map<string, Marker>; size: THREE.Vector3 };

function loadSpecimen(bone: BoneId): Specimen {
  const object = new OBJLoader().parse(fs.readFileSync(path.join(root, `public/models/${bone}.obj`), 'utf8'));
  object.rotation.x = -Math.PI / 2;
  object.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(object);
  const center = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(new THREE.Vector3());
  const factor = 5.3 / Math.max(size.x, size.y, size.z);
  object.scale.setScalar(factor);
  object.position.copy(center).multiplyScalar(-factor);
  object.updateMatrixWorld(true);
  size.multiplyScalar(factor);
  assert.ok(object.matrixWorld.determinant() > 0, `${bone}: transforms must preserve handedness`);
  const meshes: THREE.Mesh[] = [];
  object.traverse(child => { if (child instanceof THREE.Mesh) meshes.push(child); });
  const markers = new Map<string, Marker>();
  for (const landmark of landmarks[bone]) {
    const target = new THREE.Vector3(...landmark.source);
    let best = Infinity;
    const point = new THREE.Vector3();
    const normal = new THREE.Vector3();
    for (const mesh of meshes) {
      const positions = mesh.geometry.getAttribute('position');
      const normals = mesh.geometry.getAttribute('normal');
      for (let index = 0; index < positions.count; index++) {
        const candidate = new THREE.Vector3().fromBufferAttribute(positions, index);
        const squaredDistance = candidate.distanceToSquared(target);
        if (squaredDistance < best) {
          best = squaredDistance;
          point.copy(candidate);
          normal.fromBufferAttribute(normals, index);
        }
      }
    }
    point.applyMatrix4(object.matrixWorld);
    normal.transformDirection(object.matrixWorld);
    point.addScaledVector(normal, 0.035);
    markers.set(landmark.id, { point, normal });
  }
  assert.deepEqual([...markers.keys()], bones[bone].landmarks.map(l => l.id), `${bone}: content/renderer landmark IDs and order must agree`);
  return { meshes, markers, size };
}

function cameraFor(specimen: Specimen, view: View, aspect: number) {
  const distance = fitDistance(specimen.size, view, aspect);
  const positions: Record<View, [number, number, number]> = { anterior: [0, 0, distance], posterior: [0, 0, -distance], medial: [distance, 0, 0], lateral: [-distance, 0, 0] };
  const camera = new THREE.PerspectiveCamera(34, aspect, 0.01, 100);
  camera.position.set(...positions[view]);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
  return camera;
}

const specimens = Object.fromEntries((Object.keys(bones) as BoneId[]).map(bone => [bone, loadSpecimen(bone)])) as Record<BoneId, Specimen>;
function assertMarkerVisible(bone: BoneId, landmark: string, view: View, reason: string) {
  const specimen = specimens[bone];
  const marker = specimen.markers.get(landmark);
  assert.ok(marker, `${reason}: unknown landmark ${landmark}`);
  for (const aspect of aspects) {
    const camera = cameraFor(specimen, view, aspect);
    const projected = marker.point.clone().project(camera);
    const towardCamera = camera.position.clone().sub(marker.point).normalize();
    const distance = camera.position.distanceTo(marker.point);
    const raycaster = new THREE.Raycaster();
    raycaster.set(camera.position, marker.point.clone().sub(camera.position).normalize());
    const hits = raycaster.intersectObjects(specimen.meshes, false);
    const context = `${reason}, ${view}, aspect ${aspect}`;
    assert.ok(projected.z < 1 && Math.abs(projected.x) < 0.96 && Math.abs(projected.y) < 0.95, `${context}: marker outside viewport`);
    assert.ok(marker.normal.dot(towardCamera) > -0.1, `${context}: marker faces away`);
    assert.ok(!hits.length || hits[0].distance >= distance - 0.09, `${context}: marker occluded by specimen`);
  }
}

let atlasCount = 0;
for (const bone of Object.keys(bones) as BoneId[]) {
  for (const landmark of bones[bone].landmarks) {
    assertMarkerVisible(bone, landmark.id, preferredLandmarkView(landmark.id), `atlas ${landmark.id}`);
    atlasCount++;
  }
}
let markedCount = 0;
for (const question of questions.filter(q => q.bone && q.landmark)) {
  assert.ok(question.answer >= 0 && question.answer < question.options.length, `${question.id}: invalid answer`);
  assertMarkerVisible(question.bone!, question.landmark!, question.view ?? 'anterior', question.id);
  markedCount++;
}
for (const question of questions.filter(q => q.id.startsWith('visual-side'))) {
  const model = manifest.models.find((m: { file: string; name: string }) => m.file === `${question.bone}.obj`);
  assert.ok(model?.name.startsWith('Right '), `${question.id}: expected unreflected right specimen`);
  assert.equal(question.options[question.answer], 'Right', `${question.id}: answer contradicts model provenance`);
}
const screenX = (bone: BoneId, id: string, view: View) => specimens[bone].markers.get(id)!.point.clone().project(cameraFor(specimens[bone], view, 1.4)).x;
assert.ok(screenX('femur', 'femur-head', 'anterior') > screenX('femur', 'greater-trochanter', 'anterior'), 'Right femur: medial head should be screen-right in anterior view');
assert.ok(screenX('humerus', 'humerus-head', 'posterior') < screenX('humerus', 'greater-tubercle', 'posterior'), 'Right humerus: medial head should be screen-left in posterior view');
assert.ok(screenX('scapula', 'glenoid', 'posterior') > screenX('scapula', 'scapula-spine', 'posterior'), 'Right scapula: lateral glenoid should be screen-right in posterior view');
console.log(`Anatomy integration checks passed: ${atlasCount} atlas landmarks and ${markedCount} marked questions across ${aspects.length} aspect ratios; 3 right-side questions and anatomical screen-direction checks.`);
