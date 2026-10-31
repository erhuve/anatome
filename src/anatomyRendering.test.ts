import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { CONTEXT_LAYER, DEFAULT_CONTEXT_OPACITY, normalizeContextOpacity, renderAnatomy, TARGET_LAYER } from './anatomyRendering';

function fixture() {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera();
  camera.layers.set(4);
  camera.position.set(2, 3, 4);
  const target = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial());
  target.layers.set(TARGET_LAYER);
  const context = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial({ transparent: true, opacity: .28, depthWrite: false }));
  context.layers.set(CONTEXT_LAYER);
  scene.add(target, context);
  const depth = new THREE.MeshDepthMaterial({ colorWrite: false, depthWrite: true });
  const calls: Array<{ clear: boolean; target?: boolean; context?: boolean; override?: THREE.Material | null }> = [];
  const renderer = {
    clear() { calls.push({ clear: true }); },
    render(currentScene: THREE.Scene, currentCamera: THREE.Camera) {
      calls.push({ clear: false, target: currentCamera.layers.test(target.layers), context: currentCamera.layers.test(context.layers), override: currentScene.overrideMaterial });
    },
  };
  return { scene, camera, depth, calls, renderer, target, context };
}

test('faded anatomy draws a solid target then a context-only depth and color pass without clearing target depth', () => {
  const f = fixture();
  renderAnatomy(f.renderer, f.scene, f.camera, f.depth, true, .28);
  assert.deepEqual(f.calls, [
    { clear: true },
    { clear: false, target: true, context: false, override: null },
    { clear: false, target: false, context: true, override: f.depth },
    { clear: false, target: false, context: true, override: null },
  ]);
  assert.equal(f.target.material.opacity, 1);
  assert.equal(f.target.material.depthWrite, true);
  assert.equal(f.context.material.depthWrite, false);
  assert.equal(f.depth.colorWrite, false);
  assert.equal(f.depth.depthWrite, true);
  assert.equal(f.camera.layers.mask, 1 << 4);
  assert.deepEqual(f.camera.position.toArray(), [2, 3, 4]);
});

test('zero opacity skips context, while solid mode renders ordinary anatomical occlusion in one pass', () => {
  const zero = fixture();
  renderAnatomy(zero.renderer, zero.scene, zero.camera, zero.depth, true, 0);
  assert.equal(zero.calls.length, 2);
  assert.equal(zero.calls[1].context, false);
  const solid = fixture();
  renderAnatomy(solid.renderer, solid.scene, solid.camera, solid.depth, false, 1);
  assert.deepEqual(solid.calls, [{ clear: true }, { clear: false, target: true, context: true, override: null }]);
});

test('render state is restored if a context pass fails', () => {
  const f = fixture();
  let passes = 0;
  const renderer = { clear() {}, render() { if (++passes === 2) throw new Error('context failed'); } };
  assert.throws(() => renderAnatomy(renderer, f.scene, f.camera, f.depth, true, .28), /context failed/);
  assert.equal(f.scene.overrideMaterial, null);
  assert.equal(f.camera.layers.mask, 1 << 4);
});

test('opacity stays within its valid range and invalid input uses the readable default', () => {
  assert.equal(normalizeContextOpacity(-1), 0);
  assert.equal(normalizeContextOpacity(2), 1);
  assert.equal(normalizeContextOpacity(.45), .45);
  assert.equal(normalizeContextOpacity(NaN), DEFAULT_CONTEXT_OPACITY);
});
