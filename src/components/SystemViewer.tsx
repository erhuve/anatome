import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { systemAssets, systemParts, type SystemId } from '../systemData';
import { fitDistance } from './BoneViewer';

type View = 'anterior' | 'posterior' | 'medial' | 'lateral';
type Props = { system: SystemId; view: View; selectedId?: string; isolate?: boolean; resetToken?: number; onSelect?: (id: string, name: string) => void; onViewChange?: (view: string) => void };

export default function SystemViewer({ system, view, selectedId, isolate = false, resetToken = 0, onSelect, onViewChange }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const state = useRef({ view, selectedId, isolate, onSelect, onViewChange });
  state.current = { view, selectedId, isolate, onSelect, onViewChange };
  const runtime = useRef<{ fit: () => void; select: () => void } | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [free, setFree] = useState(false);
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); }
    catch { setStatus('error'); return; }
    let disposed = false, frame = 0, dirty = true;
    setStatus('loading'); setFree(false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setClearColor(0xf0eee7, 0);
    const canvas = renderer.domElement;
    canvas.className = 'system-anatomy-canvas';
    canvas.style.cssText = 'display:block;width:100%;height:100%;touch-action:none';
    canvas.tabIndex = 0;
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', `Interactive ${systemAssets[system].label}. Arrow keys rotate; plus and minus zoom. Select structures using the adjacent list.`);
    element.prepend(canvas);
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xfffaf0, 0x88877e, 2.1));
    const key = new THREE.DirectionalLight(0xfff1db, 2.7); key.position.set(-4, 5, 7); scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 1.5); fill.position.set(4, 2, -5); scene.add(fill);
    const front = new THREE.DirectionalLight(0xffffff, .55); front.position.set(0, 0, 7); scene.add(front);
    const camera = new THREE.PerspectiveCamera(34, 1, .01, 150);
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true; controls.dampingFactor = .1;
    controls.enablePan = true; controls.minDistance = 3.4; controls.maxDistance = 20;
    controls.minPolarAngle = .08; controls.maxPolarAngle = Math.PI - .08;
    const markFree = () => { setFree(true); state.current.onViewChange?.('free'); };
    controls.addEventListener('start', markFree);
    const holder = new THREE.Group(); scene.add(holder);
    let model: THREE.Group | undefined;
    let partNodes: THREE.Object3D[] = [];
    let visibleMeshes: THREE.Mesh[] = [];
    const size = new THREE.Vector3(2, 5.3, 1);
    let lastIsolate = false;
    const fit = () => {
      controls.enableDamping = false; controls.update();
      const distance = fitDistance(size, state.current.view, Math.max(element.clientWidth, 1) / Math.max(element.clientHeight, 1), camera.fov);
      const directions: Record<View, [number, number, number]> = { anterior: [0, 0, distance], posterior: [0, 0, -distance], medial: [distance, 0, 0], lateral: [-distance, 0, 0] };
      camera.position.set(...directions[state.current.view]); camera.up.set(0, 1, 0);
      controls.target.set(0, 0, 0); controls.maxDistance = Math.max(15, distance * 1.7);
      controls.update(); controls.enableDamping = true;
      dirty = true; setFree(false); state.current.onViewChange?.(state.current.view);
    };
    const select = () => {
      if (!model) return;
      const chosen = partNodes.find(node => node.userData.partId === state.current.selectedId);
      const isolating = state.current.isolate && !!chosen;
      visibleMeshes = [];
      for (const node of partNodes) {
        const selected = node === chosen;
        node.visible = !isolating || selected;
        node.traverse(child => {
          if (!(child instanceof THREE.Mesh)) return;
          const material = child.material as THREE.MeshStandardMaterial;
          const kind = node.userData.kind;
          material.color.setHex(selected && !isolating ? (system === 'muscles' ? 0xd59a64 : 0xc68e59) : kind === 'muscle' ? 0xb16b60 : kind === 'disc' ? 0xa8b7b7 : kind === 'cartilage' ? 0xb6c9c5 : 0xd9cbb0);
          material.roughness = .8;
          child.userData.partId = node.userData.partId;
          if (node.visible) visibleMeshes.push(child);
        });
      }
      // Preserve original assembly coordinates. Move/scale only the common holder.
      if (isolating || lastIsolate !== isolating || holder.scale.x === 1) {
        holder.position.set(0, 0, 0); holder.scale.setScalar(1); holder.updateMatrixWorld(true);
        const bounds = new THREE.Box3().setFromObject(isolating ? chosen! : model);
        const sourceSize = bounds.getSize(new THREE.Vector3());
        const center = bounds.getCenter(new THREE.Vector3());
        const scale = 5.3 / Math.max(sourceSize.x, sourceSize.y, sourceSize.z);
        holder.scale.setScalar(scale); holder.position.copy(center).multiplyScalar(-scale);
        size.copy(sourceSize).multiplyScalar(scale); holder.updateMatrixWorld(true);
        fit();
      }
      lastIsolate = isolating;
      dirty = true;
    };
    runtime.current = { fit, select };
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
        renderer.render(scene, camera); lastPosition.copy(camera.position); lastQuaternion.copy(camera.quaternion); dirty = false;
      }
      frame = requestAnimationFrame(draw);
    };
    draw();
    new GLTFLoader().load(systemAssets[system].file, (gltf) => {
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
      select(); setStatus('ready');
    }, undefined, () => { if (!disposed) setStatus('error'); });
    const raycaster = new THREE.Raycaster();
    let pointerStart = new THREE.Vector2(-100, -100);
    const down = (event: PointerEvent) => { pointerStart.set(event.clientX, event.clientY); };
    const up = (event: PointerEvent) => {
      if (!state.current.onSelect || pointerStart.distanceTo(new THREE.Vector2(event.clientX, event.clientY)) > 5) return;
      const rect = canvas.getBoundingClientRect();
      raycaster.setFromCamera(new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1), camera);
      const hit = raycaster.intersectObjects(visibleMeshes, false)[0];
      if (!hit) return;
      const id = hit.object.userData.partId as string;
      const part = systemParts[system].find(p => p.id === id);
      if (part) state.current.onSelect(id, part.name);
    };
    const keydown = (event: KeyboardEvent) => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-', '_'].includes(event.key) || event.altKey || event.ctrlKey || event.metaKey) return;
      event.preventDefault(); controls.enableDamping = false; controls.update();
      const spherical = new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));
      const step = event.shiftKey ? .25 : .12;
      if (event.key === 'ArrowLeft') spherical.theta -= step;
      if (event.key === 'ArrowRight') spherical.theta += step;
      if (event.key === 'ArrowUp') spherical.phi -= step;
      if (event.key === 'ArrowDown') spherical.phi += step;
      if (event.key === '+' || event.key === '=') spherical.radius /= 1.12;
      if (event.key === '-' || event.key === '_') spherical.radius *= 1.12;
      spherical.phi = THREE.MathUtils.clamp(spherical.phi, controls.minPolarAngle, controls.maxPolarAngle);
      spherical.radius = THREE.MathUtils.clamp(spherical.radius, controls.minDistance, controls.maxDistance);
      camera.position.setFromSpherical(spherical).add(controls.target); controls.update(); controls.enableDamping = true; markFree();
    };
    const lost = (event: Event) => { event.preventDefault(); setStatus('error'); };
    canvas.addEventListener('pointerdown', down); canvas.addEventListener('pointerup', up); canvas.addEventListener('keydown', keydown); canvas.addEventListener('webglcontextlost', lost);
    return () => {
      disposed = true; cancelAnimationFrame(frame); observer.disconnect(); controls.dispose(); runtime.current = null;
      canvas.removeEventListener('pointerdown', down); canvas.removeEventListener('pointerup', up); canvas.removeEventListener('keydown', keydown); canvas.removeEventListener('webglcontextlost', lost);
      model?.traverse(child => { if (child instanceof THREE.Mesh) { child.geometry.dispose(); for (const material of Array.isArray(child.material) ? child.material : [child.material]) material.dispose(); } });
      renderer.dispose(); canvas.remove();
    };
  }, [system]);
  useEffect(() => { runtime.current?.fit(); }, [view, resetToken]);
  useEffect(() => { runtime.current?.select(); }, [selectedId, isolate]);
  return <div ref={host} style={{ position: 'absolute', inset: 0 }} className="system-viewer">
    <style>{`.system-anatomy-canvas{outline:none}.system-anatomy-canvas:focus-visible{outline:2px solid #435f54;outline-offset:-4px;border-radius:8px}.system-status{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:#f0eee7;text-align:center;padding:32px;font:13px/1.7 Inter,system-ui,sans-serif;color:#647365}.system-free-note{position:absolute;bottom:22px;left:50%;transform:translateX(-50%);font:10px/1.4 Inter,system-ui,sans-serif;letter-spacing:.04em;color:#7b8177;white-space:nowrap;pointer-events:none}`}</style>
    {status === 'loading' && <div className="system-status"><div>Preparing your {system === 'muscles' ? 'muscle' : 'skeletal'} collection…<br /><span style={{ fontSize: 11, opacity: .7 }}>Loading source anatomy in its original arrangement</span></div></div>}
    {status === 'error' && <div className="system-status">This collection couldn’t be displayed.<br />Check your connection and browser WebGL support.</div>}
    {status === 'ready' && free && <span className="system-free-note">FREE ROTATION · SELECT A VIEW TO REORIENT</span>}
  </div>;
}
