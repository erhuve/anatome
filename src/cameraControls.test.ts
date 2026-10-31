import test from 'node:test';
import assert from 'node:assert/strict';
import { PerspectiveCamera, Spherical, Vector3 } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { bindCameraControls, handleCameraKey } from './cameraControls';

function setup(offset = new Vector3(0, 0, 10)) {
  const camera = new PerspectiveCamera(34, 1.7, .01, 150);
  const controls = new OrbitControls(camera);
  controls.target.set(2, -1, 3);
  camera.position.copy(controls.target).add(offset);
  controls.enableDamping = true;
  controls.minDistance = 3.4; controls.maxDistance = 20;
  controls.minPolarAngle = .08; controls.maxPolarAngle = Math.PI - .08;
  controls.update();
  return { camera, controls };
}

function key(key: string, modifiers: Partial<Pick<KeyboardEvent, 'shiftKey' | 'altKey' | 'ctrlKey' | 'metaKey'>> = {}) {
  const event = { key, shiftKey: false, altKey: false, ctrlKey: false, metaKey: false, prevented: false,
    preventDefault() { this.prevented = true; }, ...modifiers };
  return event;
}

function near(actual: number, expected: number) { assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`); }
function sameVector(actual: Vector3, expected: Vector3) { assert.ok(actual.distanceTo(expected) < 1e-9, `${actual.toArray()} != ${expected.toArray()}`); }

test('all four arrow keys translate the camera and orbit target together without rotating or zooming', () => {
  for (const direction of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']) {
    const { camera, controls } = setup();
    const position = camera.position.clone(), target = controls.target.clone(), orientation = camera.quaternion.clone();
    const event = key(direction);
    assert.equal(handleCameraKey(event, camera, controls), true);
    assert.equal(event.prevented, true);
    const moved = camera.position.clone().sub(position);
    assert.ok(moved.length() > 0);
    sameVector(controls.target.clone().sub(target), moved);
    sameVector(camera.position.clone().sub(controls.target), position.sub(target));
    near(1 - Math.abs(camera.quaternion.dot(orientation)), 0);
    assert.equal(controls.enableDamping, true);
    if (direction === 'ArrowLeft') assert.ok(moved.x < 0);
    if (direction === 'ArrowRight') assert.ok(moved.x > 0);
    if (direction === 'ArrowUp') assert.ok(moved.y > 0);
    if (direction === 'ArrowDown') assert.ok(moved.y < 0);
  }
});

test('panning a rotated view follows screen axes and keeps the same orbit offset', () => {
  const { camera, controls } = setup(new Vector3(6, 5, 7));
  camera.updateMatrixWorld(true);
  const screenRight = new Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
  const screenUp = new Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
  const offset = camera.position.clone().sub(controls.target);
  let before = camera.position.clone();
  handleCameraKey(key('ArrowRight'), camera, controls);
  const right = camera.position.clone().sub(before);
  near(right.clone().normalize().dot(screenRight), 1);
  near(right.dot(screenUp), 0);
  before = camera.position.clone();
  handleCameraKey(key('ArrowUp'), camera, controls);
  const up = camera.position.clone().sub(before);
  near(up.clone().normalize().dot(screenUp), 1);
  near(up.length(), right.length());
  sameVector(camera.position.clone().sub(controls.target), offset);
});

test('pan speed scales with the visible height at the current distance and field of view', () => {
  const first = setup(), second = setup(new Vector3(0, 0, 5)), wider = setup();
  wider.camera.fov = 60;
  const pan = ({ camera, controls }: ReturnType<typeof setup>) => {
    const before = camera.position.clone();
    handleCameraKey(key('ArrowRight'), camera, controls);
    return camera.position.distanceTo(before);
  };
  const originalStep = pan(first);
  near(pan(second), originalStep / 2);
  assert.ok(pan(wider) > originalStep);
});

test('Shift arrows orbit around the panned target and zoom preserves that target', () => {
  const { camera, controls } = setup();
  handleCameraKey(key('ArrowRight'), camera, controls);
  handleCameraKey(key('ArrowUp'), camera, controls);
  const target = controls.target.clone();
  const distance = camera.position.distanceTo(target);
  const before = new Spherical().setFromVector3(camera.position.clone().sub(target));
  handleCameraKey(key('ArrowRight', { shiftKey: true }), camera, controls);
  const after = new Spherical().setFromVector3(camera.position.clone().sub(target));
  assert.ok(after.theta > before.theta);
  near(camera.position.distanceTo(target), distance);
  sameVector(controls.target, target);
  handleCameraKey(key('+'), camera, controls);
  near(camera.position.distanceTo(target), distance / 1.12);
  sameVector(controls.target, target);
  handleCameraKey(key('-'), camera, controls);
  near(camera.position.distanceTo(target), distance);
});

test('zoom and orbit shortcuts respect distance and polar limits', () => {
  const { camera, controls } = setup();
  for (let index = 0; index < 120; index++) handleCameraKey(key('='), camera, controls);
  near(camera.position.distanceTo(controls.target), controls.minDistance);
  for (let index = 0; index < 120; index++) handleCameraKey(key('_'), camera, controls);
  near(camera.position.distanceTo(controls.target), controls.maxDistance);
  for (let index = 0; index < 40; index++) handleCameraKey(key('ArrowUp', { shiftKey: true }), camera, controls);
  near(new Spherical().setFromVector3(camera.position.clone().sub(controls.target)).phi, controls.minPolarAngle);
  for (let index = 0; index < 40; index++) handleCameraKey(key('ArrowDown', { shiftKey: true }), camera, controls);
  near(new Spherical().setFromVector3(camera.position.clone().sub(controls.target)).phi, controls.maxPolarAngle);
});

test('unrelated keys and browser modifier shortcuts remain available', () => {
  const { camera, controls } = setup();
  const before = camera.position.clone();
  for (const event of [key('Tab'), key('1'), key('ArrowLeft', { altKey: true }), key('ArrowUp', { ctrlKey: true }), key('+', { metaKey: true })]) {
    assert.equal(handleCameraKey(event, camera, controls), false);
    assert.equal(event.prevented, false);
  }
  sameVector(camera.position, before);
});

test('binding focuses only its canvas, reports handled keys, and removes both listeners', () => {
  const { camera, controls } = setup();
  let focused = 0, changed = 0;
  class Canvas extends EventTarget {
    focus(options: FocusOptions) { assert.equal(options.preventScroll, true); focused++; }
  }
  const canvas = new Canvas();
  controls.enablePan = false;
  const unbind = bindCameraControls(camera, controls, canvas as unknown as HTMLCanvasElement, () => changed++);
  assert.equal(controls.enablePan, true);
  assert.equal(controls.screenSpacePanning, true);
  canvas.dispatchEvent(new Event('pointerdown'));
  const handled = Object.assign(new Event('keydown', { cancelable: true }), { key: 'ArrowUp', shiftKey: false, altKey: false, ctrlKey: false, metaKey: false });
  canvas.dispatchEvent(handled);
  assert.equal(handled.defaultPrevented, true);
  assert.equal(focused, 1); assert.equal(changed, 1);
  unbind();
  canvas.dispatchEvent(new Event('pointerdown'));
  canvas.dispatchEvent(handled);
  assert.equal(focused, 1); assert.equal(changed, 1);
});
