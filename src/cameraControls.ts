import { MathUtils, Spherical, Vector3, type PerspectiveCamera } from 'three';
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js';

type CameraKey = Pick<KeyboardEvent, 'key' | 'shiftKey' | 'altKey' | 'ctrlKey' | 'metaKey' | 'preventDefault'>;
type CameraControls = Pick<OrbitControls, 'enabled' | 'enablePan' | 'enableRotate' | 'enableZoom' | 'enableDamping' | 'target' | 'minDistance' | 'maxDistance' | 'minPolarAngle' | 'maxPolarAngle' | 'update'>;

export const cameraControlInstructions = 'Click or Tab to focus the model. Arrow keys pan; Shift + arrow keys rotate; plus and minus zoom. Drag to rotate; right-drag or Shift-drag to pan. On touch screens, use two fingers to pan and pinch to zoom.';

/** Apply a camera shortcut without changing the model or its anatomical coordinates. */
export function handleCameraKey(event: CameraKey, camera: PerspectiveCamera, controls: CameraControls): boolean {
  if (!controls.enabled || event.altKey || event.ctrlKey || event.metaKey) return false;
  const arrow = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key);
  const zoomIn = event.key === '+' || event.key === '=';
  const zoomOut = event.key === '-' || event.key === '_';
  if (!arrow && !zoomIn && !zoomOut) return false;
  if (arrow ? event.shiftKey ? !controls.enableRotate : !controls.enablePan : !controls.enableZoom) return false;

  event.preventDefault();
  // Finish any residual pointer motion before applying an exact keyboard step.
  const damping = controls.enableDamping;
  controls.enableDamping = false;
  controls.update();
  const offset = camera.position.clone().sub(controls.target);
  if (arrow && !event.shiftKey) {
    camera.updateMatrixWorld(true);
    // A fixed fraction of the visible height stays useful at every zoom level.
    const step = offset.length() * 2 * Math.tan(MathUtils.degToRad(camera.fov / 2)) / camera.zoom * .04;
    const horizontal = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0;
    const vertical = event.key === 'ArrowUp' ? 1 : event.key === 'ArrowDown' ? -1 : 0;
    const translation = new Vector3().setFromMatrixColumn(camera.matrixWorld, 0).multiplyScalar(horizontal * step)
      .addScaledVector(new Vector3().setFromMatrixColumn(camera.matrixWorld, 1), vertical * step);
    camera.position.add(translation);
    controls.target.add(translation);
  } else {
    const spherical = new Spherical().setFromVector3(offset);
    if (event.key === 'ArrowLeft') spherical.theta -= .12;
    if (event.key === 'ArrowRight') spherical.theta += .12;
    if (event.key === 'ArrowUp') spherical.phi -= .12;
    if (event.key === 'ArrowDown') spherical.phi += .12;
    if (zoomIn) spherical.radius /= 1.12;
    if (zoomOut) spherical.radius *= 1.12;
    spherical.phi = MathUtils.clamp(spherical.phi, controls.minPolarAngle, controls.maxPolarAngle);
    spherical.radius = MathUtils.clamp(spherical.radius, controls.minDistance, controls.maxDistance);
    camera.position.setFromSpherical(spherical).add(controls.target);
  }
  controls.update();
  controls.enableDamping = damping;
  return true;
}

export function bindCameraControls(camera: PerspectiveCamera, controls: OrbitControls, canvas: HTMLCanvasElement, onChange: () => void): () => void {
  controls.enablePan = true;
  controls.screenSpacePanning = true;
  controls.panSpeed = 1;
  const focus = () => canvas.focus({ preventScroll: true });
  const keydown = (event: KeyboardEvent) => {
    if (handleCameraKey(event, camera, controls)) onChange();
  };
  canvas.addEventListener('pointerdown', focus);
  canvas.addEventListener('keydown', keydown);
  return () => {
    canvas.removeEventListener('pointerdown', focus);
    canvas.removeEventListener('keydown', keydown);
  };
}

/** Adapt to a resized specimen pane without resetting the user's angle, pan, or relative zoom. */
export function resizeCameraFraming(camera: PerspectiveCamera, controls: CameraControls, previousFit: number, nextFit: number) {
  if (!(previousFit > 0 && nextFit > 0) || !Number.isFinite(previousFit + nextFit)) return;
  const damping = controls.enableDamping;
  controls.enableDamping = false;
  controls.update();
  const offset = camera.position.clone().sub(controls.target);
  controls.maxDistance = Math.max(controls.maxDistance, nextFit * 1.7);
  const distance = MathUtils.clamp(offset.length() * nextFit / previousFit, controls.minDistance, controls.maxDistance);
  offset.setLength(distance);
  camera.position.copy(controls.target).add(offset);
  controls.update();
  controls.enableDamping = damping;
}
