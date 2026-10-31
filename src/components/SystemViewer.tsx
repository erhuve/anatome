import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { systemAssets, systemParts, type SystemId } from '../systemData';
import { fitDistance } from './BoneViewer';
import { bindCameraControls, cameraControlInstructions } from '../cameraControls';
import { CONTEXT_LAYER, DEFAULT_CONTEXT_OPACITY, normalizeContextOpacity, renderAnatomy, TARGET_LAYER } from '../anatomyRendering';

type View = 'anterior' | 'posterior' | 'medial' | 'lateral';
type Props = { system: SystemId; view: View; selectedId?: string; isolate?: boolean; resetToken?: number; theme?: 'light' | 'dark'; focusSelected?: boolean; focusContextIds?: readonly string[]; ghostOthers?: boolean; contextOpacity?: number; onReady?: (status: 'loading' | 'ready' | 'error') => void; onSelect?: (id: string, name: string) => void; onViewChange?: (view: string) => void };

export default function SystemViewer({ system, view, selectedId, isolate = false, resetToken = 0, theme = 'light', focusSelected = false, focusContextIds, ghostOthers = false, contextOpacity = DEFAULT_CONTEXT_OPACITY, onReady, onSelect, onViewChange }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const opacity = normalizeContextOpacity(contextOpacity);
  const state = useRef({ view, selectedId, isolate, focusSelected, focusContextIds, ghostOthers, opacity, onSelect, onViewChange, onReady });
  state.current = { view, selectedId, isolate, focusSelected, focusContextIds, ghostOthers, opacity, onSelect, onViewChange, onReady };
  const runtime = useRef<{ fit: () => void; select: () => void; appearance: () => void } | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [free, setFree] = useState(false);
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const dark = theme === 'dark';
    const muscle = system === 'muscles';
    const report = (next: 'loading' | 'ready' | 'error') => { setStatus(next); state.current.onReady?.(next); };
    report('loading'); setFree(false);
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); }
    catch { report('error'); return; }
    let disposed = false, frame = 0, dirty = true;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = muscle ? .95 : dark ? 1.05 : 1.15;
    renderer.autoClear = false;
    renderer.setClearColor(dark ? 0x171819 : 0xf0eee7, 0);
    const canvas = renderer.domElement;
    canvas.className = 'system-anatomy-canvas';
    canvas.style.cssText = 'display:block;width:100%;height:100%;touch-action:none';
    canvas.tabIndex = 0;
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', `Interactive ${systemAssets[system].label}. ${cameraControlInstructions}`);
    element.prepend(canvas);
    const scene = new THREE.Scene();
    const contextDepth = new THREE.MeshDepthMaterial({ colorWrite: false, depthWrite: true, depthTest: true, side: THREE.FrontSide });
    const camera = new THREE.PerspectiveCamera(34, 1, .01, 150);
    scene.add(camera);
    // Broad studio reflections reveal the source contours without painted-on
    // anatomical detail. Keep the light rig relative to the inspection camera.
    let environment: THREE.WebGLRenderTarget | undefined;
    if (muscle) {
      const room = new RoomEnvironment();
      const pmrem = new THREE.PMREMGenerator(renderer);
      environment = pmrem.fromScene(room, .04);
      scene.environment = environment.texture;
      scene.environmentIntensity = .24;
      room.dispose(); pmrem.dispose();
    }
    const lightRig = muscle ? camera : scene;
    const hemi = new THREE.HemisphereLight(muscle ? 0xfff4e8 : 0xfffaf0, dark ? muscle ? 0x202837 : 0x252629 : 0x88877e, muscle ? .6 : dark ? 1.6 : 2.1);
    const key = new THREE.DirectionalLight(muscle ? 0xffead8 : dark ? 0xfffaf4 : 0xfff1db, muscle ? 2.2 : dark ? 3 : 2.7); key.position.set(-4, 5, 7);
    const fill = new THREE.DirectionalLight(muscle ? 0xcbdcff : dark ? 0xcbd4e3 : 0xffffff, muscle ? .5 : 1.5); fill.position.set(...(muscle ? [4, 1, 3] : [4, 2, -5]) as [number, number, number]);
    const rim = new THREE.DirectionalLight(muscle ? 0xdce9ff : 0xffffff, muscle ? 1.8 : .55); rim.position.set(...(muscle ? [3, 4, -5] : [0, 0, 7]) as [number, number, number]);
    for (const light of [hemi, key, fill, rim]) { light.layers.enable(1); lightRig.add(light); }
    if (muscle) for (const light of [key, fill, rim]) camera.add(light.target);
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true; controls.dampingFactor = .1;
    controls.minDistance = 3.4; controls.maxDistance = 20;
    controls.minPolarAngle = .08; controls.maxPolarAngle = Math.PI - .08;
    const markFree = () => { setFree(true); state.current.onViewChange?.('free'); };
    controls.addEventListener('start', markFree);
    const unbindCameraControls = bindCameraControls(camera, controls, canvas, markFree);
    const holder = new THREE.Group(); scene.add(holder);
    let model: THREE.Group | undefined;
    let partNodes: THREE.Object3D[] = [];
    let visibleMeshes: THREE.Mesh[] = [];
    let hasTarget = false;
    const size = new THREE.Vector3(2, 5.3, 1);
    const framingSize = size.clone();
    const cameraTarget = new THREE.Vector3();
    let lastIsolate = false;
    const fit = () => {
      controls.enableDamping = false; controls.update();
      const distance = fitDistance(framingSize, state.current.view, Math.max(element.clientWidth, 1) / Math.max(element.clientHeight, 1), camera.fov);
      const directions: Record<View, [number, number, number]> = { anterior: [0, 0, distance], posterior: [0, 0, -distance], medial: [distance, 0, 0], lateral: [-distance, 0, 0] };
      camera.position.set(...directions[state.current.view]).add(cameraTarget); camera.up.set(0, 1, 0);
      controls.target.copy(cameraTarget); controls.maxDistance = Math.max(15, distance * 1.7);
      controls.minDistance = state.current.focusSelected && !state.current.isolate ? .6 : 3.4;
      controls.update(); controls.enableDamping = true;
      dirty = true; setFree(false); state.current.onViewChange?.(state.current.view);
    };
    const appearance = () => {
      if (!model) return;
      const chosen = partNodes.find(node => node.userData.partId === state.current.selectedId);
      const isolating = state.current.isolate && !!chosen;
      hasTarget = !!chosen;
      visibleMeshes = [];
      for (const node of partNodes) {
        const selected = node === chosen;
        node.visible = !isolating || selected;
        node.traverse(child => {
          if (!(child instanceof THREE.Mesh)) return;
          const kind = node.userData.kind;
          const faded = state.current.ghostOthers && !!chosen && !selected && !isolating;
          for (const material of (Array.isArray(child.material) ? child.material : [child.material]) as THREE.MeshStandardMaterial[]) {
            material.color.setHex(muscle ? selected ? 0x409bd5 : 0x8f3e37 : dark && selected ? 0x83b9ef : selected && !isolating ? 0xc68e59 : kind === 'disc' ? 0xa8b7b7 : kind === 'cartilage' ? 0xb6c9c5 : 0xd9cbb0);
            if (!muscle && dark && chosen && !selected && !isolating) material.color.multiplyScalar(.68);
            material.emissive.setHex(selected ? 0x1b5275 : 0x000000);
            material.emissiveIntensity = selected ? muscle ? .035 : dark ? .32 : 0 : 0;
            const ghosted = faded && state.current.opacity < 1;
            if (material.transparent !== ghosted) material.needsUpdate = true;
            material.transparent = ghosted;
            material.opacity = faded ? state.current.opacity : 1;
            material.depthWrite = !faded;
            material.forceSinglePass = true;
            material.roughness = muscle ? selected ? .48 : .57 : .8;
            material.metalness = 0;
          }
          child.layers.set(selected ? TARGET_LAYER : CONTEXT_LAYER);
          child.userData.partId = node.userData.partId;
          if (node.visible && (!faded || state.current.opacity > 0)) visibleMeshes.push(child);
        });
      }
      dirty = true;
    };
    const select = () => {
      if (!model) return;
      appearance();
      const chosen = partNodes.find(node => node.userData.partId === state.current.selectedId);
      const isolating = state.current.isolate && !!chosen;
      // Preserve original assembly coordinates. Move/scale only the common holder.
      if (isolating || lastIsolate !== isolating || holder.scale.x === 1) {
        holder.position.set(0, 0, 0); holder.scale.setScalar(1); holder.updateMatrixWorld(true);
        const bounds = new THREE.Box3().setFromObject(isolating ? chosen! : model);
        const sourceSize = bounds.getSize(new THREE.Vector3());
        const center = bounds.getCenter(new THREE.Vector3());
        const scale = 5.3 / Math.max(sourceSize.x, sourceSize.y, sourceSize.z);
        holder.scale.setScalar(scale); holder.position.copy(center).multiplyScalar(-scale);
        size.copy(sourceSize).multiplyScalar(scale); holder.updateMatrixWorld(true);
      }
      const wasFocused = cameraTarget.lengthSq() > 0;
      cameraTarget.set(0, 0, 0); framingSize.copy(size);
      if (state.current.focusSelected && chosen && !isolating) {
        const bounds = new THREE.Box3().setFromObject(chosen);
        for (const node of partNodes) {
          if (node !== chosen && state.current.focusContextIds?.includes(node.userData.partId)) bounds.union(new THREE.Box3().setFromObject(node));
        }
        bounds.getCenter(cameraTarget); bounds.getSize(framingSize).multiplyScalar(2);
        framingSize.max(new THREE.Vector3(.35, .35, .35));
      }
      if (isolating || lastIsolate !== isolating || state.current.focusSelected || wasFocused || holder.scale.x === 1) fit();
      lastIsolate = isolating;
      dirty = true;
    };
    runtime.current = { fit, select, appearance };
    const resize = () => {
      const width = Math.max(element.clientWidth, 1), height = Math.max(element.clientHeight, 1);
      renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix(); dirty = true;
    };
    const observer = new ResizeObserver(resize); observer.observe(element); resize(); fit();
    const lastPosition = new THREE.Vector3(Infinity, Infinity, Infinity), lastQuaternion = new THREE.Quaternion();
    const draw = () => {
      if (disposed) return;
      controls.update();
      if (dirty || !lastPosition.equals(camera.position) || !lastQuaternion.equals(camera.quaternion)) {
        renderAnatomy(renderer, scene, camera, contextDepth, state.current.ghostOthers && hasTarget && !state.current.isolate, state.current.opacity);
        lastPosition.copy(camera.position); lastQuaternion.copy(camera.quaternion); dirty = false;
      }
      frame = requestAnimationFrame(draw);
    };
    draw();
    new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).load(systemAssets[system].file, (gltf) => {
      if (disposed) { gltf.scene.traverse(child => { if (child instanceof THREE.Mesh) child.geometry.dispose(); }); return; }
      model = gltf.scene;
      // glTF shares four source materials; selection needs independent part colours.
      const sourceMaterials = new Set<THREE.Material>();
      model.traverse(child => {
        if (!(child instanceof THREE.Mesh)) return;
        if (Array.isArray(child.material)) {
          child.material = child.material.map(material => { sourceMaterials.add(material); return material.clone(); });
        } else {
          sourceMaterials.add(child.material); child.material = child.material.clone();
        }
      });
      for (const material of sourceMaterials) material.dispose();
      model.rotation.x = -Math.PI / 2;
      holder.add(model); holder.updateMatrixWorld(true);
      partNodes = model.children.filter(node => !!node.userData.partId);
      select(); fit(); report('ready');
    }, undefined, () => { if (!disposed) report('error'); });
    const raycaster = new THREE.Raycaster();
    raycaster.layers.enable(TARGET_LAYER);
    const activePointers = new Set<number>();
    let selectionPointer: { id: number; x: number; y: number } | null = null;
    const down = (event: PointerEvent) => {
      activePointers.add(event.pointerId);
      selectionPointer = activePointers.size === 1 && event.isPrimary && event.button === 0 && !event.shiftKey && !event.altKey && !event.ctrlKey && !event.metaKey
        ? { id: event.pointerId, x: event.clientX, y: event.clientY } : null;
    };
    const move = (event: PointerEvent) => {
      if (selectionPointer?.id === event.pointerId && Math.hypot(event.clientX - selectionPointer.x, event.clientY - selectionPointer.y) > 5) selectionPointer = null;
    };
    const cancel = (event: PointerEvent) => { activePointers.delete(event.pointerId); selectionPointer = null; };
    const up = (event: PointerEvent) => {
      const candidate = selectionPointer;
      selectionPointer = null;
      activePointers.delete(event.pointerId);
      if (!state.current.onSelect || !candidate || candidate.id !== event.pointerId || activePointers.size || !event.isPrimary || event.button !== 0
        || event.shiftKey || event.altKey || event.ctrlKey || event.metaKey || Math.hypot(event.clientX - candidate.x, event.clientY - candidate.y) > 5) return;
      const rect = canvas.getBoundingClientRect();
      raycaster.setFromCamera(new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1), camera);
      const hit = raycaster.intersectObjects(visibleMeshes, false)[0];
      if (!hit) return;
      const id = hit.object.userData.partId as string;
      const part = systemParts[system].find(p => p.id === id);
      if (part) state.current.onSelect(id, part.name);
    };
    const lost = (event: Event) => { event.preventDefault(); report('error'); };
    canvas.addEventListener('pointerdown', down); canvas.addEventListener('pointermove', move); canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', cancel); canvas.addEventListener('lostpointercapture', cancel); canvas.addEventListener('webglcontextlost', lost);
    return () => {
      disposed = true; cancelAnimationFrame(frame); observer.disconnect(); controls.dispose(); runtime.current = null;
      unbindCameraControls();
      canvas.removeEventListener('pointerdown', down); canvas.removeEventListener('pointermove', move); canvas.removeEventListener('pointerup', up);
      canvas.removeEventListener('pointercancel', cancel); canvas.removeEventListener('lostpointercapture', cancel); canvas.removeEventListener('webglcontextlost', lost);
      model?.traverse(child => { if (child instanceof THREE.Mesh) { child.geometry.dispose(); for (const material of Array.isArray(child.material) ? child.material : [child.material]) material.dispose(); } });
      contextDepth.dispose(); environment?.dispose(); renderer.dispose(); canvas.remove();
    };
  }, [system, theme]);
  useEffect(() => { runtime.current?.fit(); }, [view, resetToken]);
  useEffect(() => { runtime.current?.select(); }, [selectedId, isolate, focusSelected, focusContextIds]);
  useEffect(() => { runtime.current?.appearance(); }, [ghostOthers, opacity]);
  return <div ref={host} style={{ position: 'absolute', inset: 0 }} className={`system-viewer${theme === 'dark' ? ' is-dark' : ''}`}>
    <style>{`.system-anatomy-canvas{outline:none}.system-anatomy-canvas:focus-visible{outline:2px solid #435f54;outline-offset:-4px;border-radius:8px}.system-status{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:#f0eee7;text-align:center;padding:32px;font:13px/1.7 Inter,system-ui,sans-serif;color:#647365}.system-free-note{position:absolute;bottom:22px;left:50%;transform:translateX(-50%);font:10px/1.4 Inter,system-ui,sans-serif;letter-spacing:.04em;color:#7b8177;white-space:nowrap;pointer-events:none}.system-viewer.is-dark .system-status{background:#171819;color:#b7bbbf}.system-viewer.is-dark .system-free-note{color:#8d939b}.system-viewer.is-dark .system-anatomy-canvas:focus-visible{outline-color:#83b9ef}`}</style>
    {status === 'loading' && <div className="system-status"><div>Preparing your {system === 'muscles' ? 'muscle' : 'skeletal'} collection…<br /><span style={{ fontSize: 11, opacity: .7 }}>Loading source anatomy in its original arrangement</span></div></div>}
    {status === 'error' && <div className="system-status">This collection couldn’t be displayed.<br />Check your connection and browser WebGL support.</div>}
    {status === 'ready' && free && <span className="system-free-note">FREE VIEW · SELECT A VIEW TO REORIENT</span>}
  </div>;
}
