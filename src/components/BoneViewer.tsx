import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { bindCameraControls, cameraControlInstructions, resizeCameraFraming } from '../cameraControls';

type Bone = 'femur' | 'humerus' | 'scapula';
type View = 'anterior' | 'posterior' | 'medial' | 'lateral';
type Landmark = { id: string; name: string; source: [number, number, number] };
type Props = { bone: Bone; view: View; labels: boolean; activeLandmark?: string; resetToken?: number; theme?: 'light' | 'dark'; onReady?: (status: 'loading' | 'ready' | 'error') => void; onLandmarkSelect?: (id: string) => void; onViewChange?: (view: string) => void };

// Hand-placed surface targets in the ORIGINAL BodyParts3D millimetre coordinates.
// The supplied specimens are the right bones; no reflections are used.
export const landmarks: Record<Bone, Landmark[]> = {
  femur: [
    { id: 'femur-head', name: 'Head', source: [-84, -101, 810] },
    { id: 'femur-neck', name: 'Neck', source: [-111, -94, 788] },
    { id: 'greater-trochanter', name: 'Greater trochanter', source: [-137, -91, 789] },
    { id: 'lesser-trochanter', name: 'Lesser trochanter', source: [-107, -57, 752] },
    { id: 'medial-condyle', name: 'Medial condyle', source: [-49, -102, 387] },
    { id: 'lateral-condyle', name: 'Lateral condyle', source: [-106, -101, 390] },
  ],
  humerus: [
    { id: 'humerus-head', name: 'Head', source: [-151, -88, 1320] },
    { id: 'greater-tubercle', name: 'Greater tubercle', source: [-177, -85, 1320] },
    { id: 'lesser-tubercle', name: 'Lesser tubercle', source: [-163, -98, 1301] },
    { id: 'deltoid-tuberosity', name: 'Deltoid tuberosity', source: [-207, -74, 1184] },
    { id: 'trochlea', name: 'Trochlea', source: [-210, -85, 1038] },
    { id: 'capitulum', name: 'Capitulum', source: [-232, -88, 1047] },
    { id: 'olecranon-fossa', name: 'Olecranon fossa', source: [-217, -55, 1063] },
  ],
  scapula: [
    { id: 'scapula-spine', name: 'Spine', source: [-112, -18, 1320] },
    { id: 'glenoid', name: 'Glenoid cavity', source: [-151, -59, 1299] },
    { id: 'acromion', name: 'Acromion', source: [-154, -74, 1344] },
    { id: 'coracoid', name: 'Coracoid process', source: [-139, -98, 1321] },
  ],
};

export function fitDistance(size: { x: number; y: number; z: number }, view: View, aspect: number, fieldOfView = 34): number {
  const sideView = view === 'medial' || view === 'lateral';
  const halfWidth = (sideView ? size.z : size.x) / 2;
  const halfDepth = (sideView ? size.x : size.z) / 2;
  const tangent = Math.tan(THREE.MathUtils.degToRad(fieldOfView / 2));
  return Math.max(size.y / (2 * tangent), halfWidth / (tangent * Math.max(aspect, 0.2))) * 1.08 + halfDepth;
}

export default function BoneViewer({ bone, view, labels, activeLandmark, resetToken = 0, theme = 'light', onReady, onLandmarkSelect, onViewChange }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const markers = useRef<Record<string, HTMLButtonElement | null>>({});
  const runtime = useRef<{ camera: THREE.PerspectiveCamera; controls: OrbitControls; fit: () => void } | null>(null);
  const state = useRef({ labels, activeLandmark, view, onViewChange, onReady });
  state.current = { labels, activeLandmark, view, onViewChange, onReady };
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [freeView, setFreeView] = useState(false);

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const dark = theme === 'dark';
    const report = (next: 'loading' | 'ready' | 'error') => { setStatus(next); state.current.onReady?.(next); };
    let disposed = false;
    let frame = 0;
    let observer: ResizeObserver | undefined;
    let markersDirty = true;
    let renderer: THREE.WebGLRenderer;
    let controls: OrbitControls | undefined;
    const resources: THREE.Object3D[] = [];
    report('loading'); setFreeView(false);
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' }); }
    catch { report('error'); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = dark ? 1.08 : 1.28;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(dark ? 0x171819 : 0xf0eee7, 0);
    renderer.domElement.setAttribute('aria-label', `Interactive ${state.current.labels ? bone : 'anatomical'} specimen. ${cameraControlInstructions}`);
    renderer.domElement.setAttribute('role', 'img');
    renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;touch-action:none';
    renderer.domElement.className = 'anatomy-canvas';
    renderer.domElement.tabIndex = 0;
    element.prepend(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.01, 100);
    const specimenSize = new THREE.Vector3(2, 5.3, 2);
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.minDistance = 3.4; controls.maxDistance = 15;
    controls.minPolarAngle = 0.08; controls.maxPolarAngle = Math.PI - 0.08;
    const markFreeView = () => {
      setFreeView(true);
      state.current.onViewChange?.('free');
    };
    controls.addEventListener('start', markFreeView);
    const unbindCameraControls = bindCameraControls(camera, controls, renderer.domElement, markFreeView);
    scene.add(new THREE.HemisphereLight(0xfffaf0, dark ? 0x252629 : 0x8f8f85, dark ? 1.6 : 2.3));
    const key = new THREE.DirectionalLight(0xfff6df, 3.3);
    key.position.set(-3.5, 5, 6); key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -4; key.shadow.camera.right = 4;
    key.shadow.camera.top = 4; key.shadow.camera.bottom = -4;
    key.shadow.normalBias = 0.05;
    key.shadow.bias = -0.0004;
    key.shadow.radius = 5;
    scene.add(key);
    const fill = new THREE.DirectionalLight(dark ? 0xcbd4e3 : 0xffffff, 1.2); fill.position.set(4, 1, -4); scene.add(fill);
    const faceLight = new THREE.DirectionalLight(0xffffff, 0.65); faceLight.position.set(0, 0, 8); scene.add(faceLight);
    let framingAspect = 1;
    let modelReady = false;
    const fit = () => {
      // Clear residual orbit damping before applying an exact anatomical preset.
      controls!.enableDamping = false;
      controls!.update();
      const aspect = Math.max(element.clientWidth, 1) / Math.max(element.clientHeight, 1);
      // Fit the frontmost bounding-box plane with a margin for pins and perspective.
      framingAspect = aspect;
      const distance = fitDistance(specimenSize, state.current.view, aspect, camera.fov);
      controls!.maxDistance = Math.max(15, distance * 1.6);
      const positions: Record<View, [number, number, number]> = { anterior: [0, 0, distance], posterior: [0, 0, -distance], medial: [distance, 0, 0], lateral: [-distance, 0, 0] };
      camera.position.set(...(positions[state.current.view] || positions.anterior));
      camera.up.set(0, 1, 0);
      controls!.target.set(0, 0, 0);
      controls!.update();
      controls!.enableDamping = true;
      markersDirty = true;
      setFreeView(false);
      state.current.onViewChange?.(state.current.view);
    };
    runtime.current = { camera, controls, fit };
    const resize = () => {
      const width = Math.max(element.clientWidth, 1), height = Math.max(element.clientHeight, 1);
      const aspect = width / height;
      if (modelReady && aspect !== framingAspect) resizeCameraFraming(camera, controls!,
        fitDistance(specimenSize, state.current.view, framingAspect, camera.fov), fitDistance(specimenSize, state.current.view, aspect, camera.fov));
      framingAspect = aspect;
      renderer.setSize(width, height, false);
      camera.aspect = aspect; camera.updateProjectionMatrix();
      markersDirty = true;
    };
    observer = new ResizeObserver(resize); observer.observe(element); resize(); fit();
    const markerPositions: Record<string, THREE.Vector3> = {};
    const markerNormals: Record<string, THREE.Vector3> = {};
    const meshes: THREE.Mesh[] = [];
    const raycaster = new THREE.Raycaster();
    const projected = new THREE.Vector3();
    const dir = new THREE.Vector3();
    const towardCamera = new THREE.Vector3();
    const lastPosition = new THREE.Vector3(Infinity, Infinity, Infinity);
    const lastQuaternion = new THREE.Quaternion();
    let lastLabels: boolean | undefined;
    let lastActiveLandmark: string | undefined;
    const draw = () => {
      if (disposed) return;
      controls!.update();
      const changed = markersDirty || !lastPosition.equals(camera.position) || !lastQuaternion.equals(camera.quaternion)
        || lastLabels !== state.current.labels || lastActiveLandmark !== state.current.activeLandmark;
      if (!changed) { frame = requestAnimationFrame(draw); return; }
      markersDirty = false;
      lastPosition.copy(camera.position); lastQuaternion.copy(camera.quaternion);
      lastLabels = state.current.labels; lastActiveLandmark = state.current.activeLandmark;
      renderer.render(scene, camera);
      for (const landmark of landmarks[bone]) {
        const button = markers.current[landmark.id];
        const point = markerPositions[landmark.id];
        if (!button || !point) continue;
        const enabled = state.current.labels || state.current.activeLandmark === landmark.id;
        if (!enabled) { button.style.display = 'none'; continue; }
        projected.copy(point).project(camera);
        const width = element.clientWidth, height = element.clientHeight;
        towardCamera.subVectors(camera.position, point).normalize();
        const facing = (markerNormals[landmark.id]?.dot(towardCamera) ?? 1) > -0.1;
        const distance = camera.position.distanceTo(point);
        dir.subVectors(point, camera.position).normalize();
        raycaster.set(camera.position, dir);
        const hits = raycaster.intersectObjects(meshes, false);
        const unoccluded = !hits.length || hits[0].distance >= distance - 0.09;
        const visible = projected.z < 1 && Math.abs(projected.x) < 0.96 && Math.abs(projected.y) < 0.95 && facing && unoccluded;
        button.style.display = visible ? 'flex' : 'none';
        button.style.left = `${(projected.x * 0.5 + 0.5) * width}px`;
        button.style.top = `${(-projected.y * 0.5 + 0.5) * height}px`;
      }
      frame = requestAnimationFrame(draw);
    };
    draw();
    new OBJLoader().load(`/models/${bone}.obj`, (object) => {
      if (disposed) { object.traverse(o => { if (o instanceof THREE.Mesh) o.geometry.dispose(); }); return; }
      // BP3D: x = patient-left; y = posterior; z = superior. A proper rotation
      // (no mirror) maps this to Three's Y-up coordinates: (x, z, -y).
      object.rotation.x = -Math.PI / 2;
      object.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(object);
      const center = bounds.getCenter(new THREE.Vector3());
      const size = bounds.getSize(new THREE.Vector3());
      const factor = 5.3 / Math.max(size.x, size.y, size.z);
      specimenSize.copy(size).multiplyScalar(factor);
      object.scale.setScalar(factor);
      object.position.copy(center).multiplyScalar(-factor);
      object.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return;
        if (!child.geometry.getAttribute('normal')) child.geometry.computeVertexNormals();
        child.material = new THREE.MeshStandardMaterial({ color: 0xd9cbb0, roughness: 0.77, metalness: 0 });
        child.castShadow = true; child.receiveShadow = true;
        meshes.push(child);
      });
      scene.add(object); resources.push(object); object.updateMatrixWorld(true);
      // Snap each target to an actual mesh vertex; preserve the corresponding normal.
      for (const landmark of landmarks[bone]) {
        const target = new THREE.Vector3(...landmark.source);
        let best = Infinity;
        let sourcePoint = new THREE.Vector3();
        let sourceNormal = new THREE.Vector3(0, 0, 1);
        for (const mesh of meshes) {
          const points = mesh.geometry.getAttribute('position');
          const normals = mesh.geometry.getAttribute('normal');
          for (let i = 0; i < points.count; i++) {
            const p = new THREE.Vector3().fromBufferAttribute(points, i);
            const d = p.distanceToSquared(target);
            if (d < best) { best = d; sourcePoint.copy(p); if (normals) sourceNormal.fromBufferAttribute(normals, i); }
          }
        }
        const worldPoint = sourcePoint.applyMatrix4(object.matrixWorld);
        const normal = sourceNormal.transformDirection(object.matrixWorld);
        markerPositions[landmark.id] = worldPoint.addScaledVector(normal, 0.035);
        markerNormals[landmark.id] = normal;
      }
      const ground = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), new THREE.ShadowMaterial({ color: dark ? 0x000000 : 0x7d7460, opacity: 0.16 }));
      ground.rotation.x = -Math.PI / 2; ground.position.y = -2.72; ground.receiveShadow = true;
      scene.add(ground); resources.push(ground);
      markersDirty = true;
      modelReady = true;
      fit();
      report('ready');
    }, undefined, () => { if (!disposed) report('error'); });
    const onContextLost = (event: Event) => { event.preventDefault(); report('error'); };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);
    return () => {
      disposed = true; cancelAnimationFrame(frame); observer?.disconnect(); controls?.dispose(); runtime.current = null;
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      unbindCameraControls();
      for (const object of resources) object.traverse(child => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          for (const material of Array.isArray(child.material) ? child.material : [child.material]) material.dispose();
        }
      });
      renderer.dispose(); renderer.domElement.remove();
    };
  }, [bone, theme]);

  useEffect(() => { runtime.current?.fit(); }, [view, resetToken]);
  useEffect(() => {
    host.current?.querySelector('canvas')?.setAttribute('aria-label', `Interactive ${labels ? bone : 'anatomical'} specimen. ${cameraControlInstructions}`);
  }, [bone, labels]);

  return <div ref={host} className={`bone-viewer${theme === 'dark' ? ' is-dark' : ''}`} style={{ position: 'absolute', inset: 0 }}>
    <style>{`
      .anatomy-canvas{outline:none}
      .anatomy-canvas:focus-visible{outline:2px solid #435f54;outline-offset:-4px;border-radius:8px}
      .anatomy-pin{position:absolute;z-index:3;align-items:center;justify-content:center;width:23px;height:23px;padding:0;border:1px solid rgba(255,255,255,.95);border-radius:50%;background:#435f54;color:white;box-shadow:0 0 0 4px rgba(67,95,84,.11);transform:translate(-50%,-50%);font:500 10px/1 Inter,system-ui,sans-serif;cursor:pointer;transition:background .15s,box-shadow .15s}
      .anatomy-pin:hover,.anatomy-pin:focus-visible,.anatomy-pin.is-active{background:#c27e56;box-shadow:0 0 0 5px rgba(194,126,86,.16);outline:none}
      .anatomy-pin .pin-tooltip{display:none;position:absolute;left:32px;top:50%;transform:translateY(-50%);white-space:nowrap;padding:6px 9px;background:#fffdf7;color:#414a43;border:1px solid #dcded4;border-radius:5px;font-size:11px;box-shadow:0 3px 12px #353b3010;pointer-events:none}
      .anatomy-pin:hover .pin-tooltip,.anatomy-pin:focus-visible .pin-tooltip,.anatomy-pin.is-active .pin-tooltip{display:block}
      .viewer-status{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;text-align:center;padding:40px;color:#68746b;font:13px/1.7 Inter,system-ui,sans-serif;background:#f0eee7}
      .free-view-note{position:absolute;bottom:82px;left:50%;transform:translateX(-50%);font:10px/1.4 Inter,system-ui,sans-serif;color:#7b8177;white-space:nowrap;pointer-events:none;letter-spacing:.04em}
      .bone-viewer.is-dark .viewer-status{background:#171819;color:#b7bbbf}
      .bone-viewer.is-dark .free-view-note{color:#8d939b}
      .bone-viewer.is-dark .anatomy-canvas:focus-visible{outline-color:#83b9ef}
      .bone-viewer.is-dark .anatomy-pin{background:#40454c;color:#e6e8ec;border-color:#858d98;box-shadow:0 0 0 4px #12141666}
      .bone-viewer.is-dark .anatomy-pin:hover,.bone-viewer.is-dark .anatomy-pin:focus-visible,.bone-viewer.is-dark .anatomy-pin.is-active{background:#83b9ef;border-color:#cce5ff;color:#142537;box-shadow:0 0 0 5px #83b9ef26,0 0 18px #83b9ef33}
      .bone-viewer.is-dark .pin-tooltip{background:#292d33;border-color:#424851;color:#e6e8ec;box-shadow:0 3px 12px #0004}
    `}</style>
    {landmarks[bone].map((landmark, index) => <button
      key={`${bone}-${landmark.id}`}
      ref={el => { markers.current[landmark.id] = el; }}
      className={`anatomy-pin ${activeLandmark === landmark.id ? 'is-active' : ''}`}
      style={{ display: 'none' }}
      aria-label={labels ? `Study ${landmark.name}` : 'Identify the marked structure'}
      aria-pressed={labels ? activeLandmark === landmark.id : undefined}
      onClick={() => onLandmarkSelect?.(landmark.id)}
    >{labels ? index + 1 : '?'}{labels && <span className="pin-tooltip">{landmark.name}</span>}</button>)}
    {status === 'loading' && <div className="viewer-status"><div>Preparing your specimen…<br /><span style={{ fontSize: 11, opacity: 0.7 }}>Loading the BodyParts3D anatomical mesh</span></div></div>}
    {status === 'error' && <div className="viewer-status"><div>The 3D specimen couldn’t be displayed.<br />Enable WebGL in your browser, or continue with the study notes and curriculum.</div></div>}
    {status === 'ready' && freeView && <span className="free-view-note">FREE VIEW · SELECT A VIEW TO REORIENT</span>}
  </div>;
}
