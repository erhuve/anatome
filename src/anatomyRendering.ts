import * as THREE from 'three';

export const DEFAULT_CONTEXT_OPACITY = .28;
export const CONTEXT_LAYER = 0;
export const TARGET_LAYER = 1;

export function normalizeContextOpacity(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : DEFAULT_CONTEXT_OPACITY;
}

type AnatomyRenderer = Pick<THREE.WebGLRenderer, 'clear' | 'render'>;

/**
 * Keep the target solid and blend just the nearest surrounding surface.
 * The shared depth buffer preserves whether that surface is in front of or
 * behind the target, without accumulating hundreds of internal muscle layers.
 */
export function renderAnatomy(
  renderer: AnatomyRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  contextDepth: THREE.Material,
  fadeContext: boolean,
  contextOpacity: number,
) {
  const previousMask = camera.layers.mask;
  const previousOverride = scene.overrideMaterial;
  renderer.clear();
  try {
    if (!fadeContext) {
      camera.layers.set(CONTEXT_LAYER);
      camera.layers.enable(TARGET_LAYER);
      renderer.render(scene, camera);
      return;
    }

    camera.layers.set(TARGET_LAYER);
    renderer.render(scene, camera);
    if (normalizeContextOpacity(contextOpacity) === 0) return;

    // The target's existing depth also protects its visible front surface.
    // Context in front contributes one translucent layer; deeper layers fail
    // the subsequent color pass's normal depth test.
    camera.layers.set(CONTEXT_LAYER);
    scene.overrideMaterial = contextDepth;
    renderer.render(scene, camera);
    scene.overrideMaterial = previousOverride;
    renderer.render(scene, camera);
  } finally {
    scene.overrideMaterial = previousOverride;
    camera.layers.mask = previousMask;
  }
}
