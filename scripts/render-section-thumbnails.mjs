/** Render section-card images from the application's licensed anatomy meshes.
 * Run while Vite is serving the app: node scripts/render-section-thumbnails.mjs
 * Playwright is a development-only dependency supplied by the local runtime.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { homedir } from 'node:os';

const runtime = process.env.ANATOME_BROWSER_RUNTIME ?? resolve(homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const { chromium } = await import(`${runtime}/playwright/index.mjs`);
const baseUrl = process.env.ANATOME_PREVIEW_URL ?? 'http://127.0.0.1:5173';
const executablePath = process.env.ANATOME_CHROMIUM ?? resolve(homedir(), 'Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing');
const outputDirectory = resolve('public/sections');
await mkdir(outputDirectory, { recursive: true });
const browser = await chromium.launch({ executablePath, headless: true, args: ['--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 480, height: 300 }, deviceScaleFactor: 1 });
page.on('pageerror', error => console.error(error.message));
await page.route('**/__section-thumbnails', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><body style="margin:0;background:#202832"></body></html>' }));
await page.goto(`${baseUrl}/__section-thumbnails`);
const sectionIds = await page.evaluate(async () => {
  const { default: refresh } = await import('/@react-refresh');
  refresh.injectIntoGlobalHook(window);
  window.$RefreshReg$ = () => {};
  window.$RefreshSig$ = () => type => type;
  window.__vite_plugin_react_preamble_installed__ = true;
  const THREE = await import('/node_modules/.vite/deps/three.js');
  const { GLTFLoader } = await import('/node_modules/three/examples/jsm/loaders/GLTFLoader.js');
  const { MeshoptDecoder } = await import('/node_modules/three/examples/jsm/libs/meshopt_decoder.module.js');
  const { OBJLoader } = await import('/node_modules/three/examples/jsm/loaders/OBJLoader.js');
  const { studySections } = await import('/src/studySections.ts');
  const { modelPromptPools } = await import('/src/modelQuiz.ts');
  const { landmarks } = await import('/src/components/BoneViewer.tsx');
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(480, 300);
  renderer.setPixelRatio(1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  document.body.append(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#202832');
  const camera = new THREE.PerspectiveCamera(30, 480 / 300, 0.01, 100000);
  scene.add(camera);
  camera.add(new THREE.HemisphereLight(0xf4f4ff, 0x223043, 0.9));
  const key = new THREE.DirectionalLight(0xfff0de, 2.0);
  key.position.set(-4, 6, 8);
  const fill = new THREE.DirectionalLight(0xb5d7ff, 0.6);
  fill.position.set(5, 2, 4);
  const rim = new THREE.DirectionalLight(0x9bc7fa, 1.0);
  rim.position.set(3, 4, -5);
  camera.add(key, fill, rim);
  for (const light of [key, fill, rim]) camera.add(light.target);
  const gltfLoader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const models = {};
  for (const system of ['skeleton', 'muscles']) {
    const { scene: model } = await gltfLoader.loadAsync(`/models/${system}.glb`);
    model.rotation.x = -Math.PI / 2;
    model.updateMatrixWorld(true);
    model.traverse(child => {
      if (!child.isMesh) return;
      child.material = new THREE.MeshStandardMaterial({ roughness: 0.68, metalness: 0, side: THREE.DoubleSide });
    });
    models[system] = model;
  }
  const objLoader = new OBJLoader();
  for (const bone of ['femur', 'humerus', 'scapula']) {
    const model = await objLoader.loadAsync(`/models/${bone}.obj`);
    model.rotation.x = -Math.PI / 2;
    model.updateMatrixWorld(true);
    model.traverse(child => { if (child.isMesh) child.material = new THREE.MeshStandardMaterial({ color: 0xe5d6ba, roughness: .7, metalness: 0 }); });
    models[bone] = model;
  }
  const directions = {
    'skull-hyoid': [-.65, .1, 1], 'cervical-vertebrae': [-.65, .15, 1],
    'thoracic-vertebrae': [-.7, .1, -1], 'lumbar-sacrum': [-.6, .18, -1],
    'intervertebral-discs': [-1, .2, .7], 'ribs': [-.45, .18, 1], 'sternum-cartilage': [-.3, .1, 1],
    'scapula-details': [-.35, .1, -1], 'femur-details': [-.3, .1, 1], 'humerus-details': [-.3, .08, 1],
    'tarsals': [-.9, .9, .8], 'foot-bones': [-.65, .95, .7],
    'facial-muscles': [-.3, .08, 1], 'eye-muscles': [-.9, .1, 1],
    'mastication-muscles': [-1, .08, .4], 'tongue-pharynx-muscles': [-1, .1, .45],
    'posterior-neck-muscles': [-.35, .1, -1], 'intrinsic-back-muscles': [-.25, .05, -1],
    'pelvic-floor-muscles': [-.3, -.8, .65], 'scapular-muscles': [-.35, .1, -1],
    'shoulder-muscles': [-.55, .1, -1], 'posterior-forearm-muscles': [-.4, .1, -1],
    'hip-muscles': [-.6, .1, -1], 'posterior-thigh-muscles': [-.4, .1, -1],
    'posterior-leg-muscles': [-.45, .1, -1], 'foot-muscles': [-.7, -.6, 1]
  };
  const singleSideSections = new Set([
    'arm-bones', 'humerus-details', 'forearm-bones', 'carpals', 'hand-bones',
    'femur-bones', 'femur-details', 'knee-leg-bones', 'tarsals', 'foot-bones',
    'eye-muscles', 'mastication-muscles', 'shoulder-muscles', 'arm-muscles',
    'anterior-forearm-muscles', 'posterior-forearm-muscles', 'hand-muscles',
    'hip-muscles', 'anterior-medial-thigh-muscles', 'posterior-thigh-muscles',
    'anterior-lateral-leg-muscles', 'posterior-leg-muscles', 'foot-muscles'
  ]);
  const landmarkMarkers = new THREE.Group();
  scene.add(landmarkMarkers);
  const pinGeometry = new THREE.SphereGeometry(1, 16, 12);
  const pinMaterial = new THREE.MeshStandardMaterial({ color: 0x56b5ef, emissive: 0x3178a3, emissiveIntensity: .3, roughness: .4 });
  window.renderSection = sectionId => {
    landmarkMarkers.clear();
    const section = studySections.find(item => item.id === sectionId);
    const prompts = modelPromptPools[section.collection].filter(prompt => section.promptIds.includes(prompt.id));
    const model = models[section.collection === 'landmarks' ? prompts[0].bone : section.collection];
    for (const other of Object.values(models)) scene.remove(other);
    scene.add(model);
    let selected = prompts;
    if (singleSideSections.has(sectionId)) {
      const right = prompts.filter(prompt => prompt.side !== 'left' && !/\bleft\b/i.test(prompt.answer));
      if (right.length) selected = right;
    }
    const ids = new Set(selected.map(prompt => prompt.partId));
    const bounds = new THREE.Box3();
    const meshes = [];
    for (const node of model.children) {
      const target = section.collection === 'landmarks' || ids.has(node.userData.partId);
      if (target) bounds.union(new THREE.Box3().setFromObject(node));
      node.traverse(child => {
        if (!child.isMesh) return;
        child.userData.thumbnailTarget = target;
        child.material.color.set(target ? section.collection === 'muscles' ? 0x7bb4d6 : 0xe5d5b8 : 0x71869c);
        child.material.emissive.set(target ? section.collection === 'muscles' ? 0x122735 : 0x100e09 : 0x000000);
        child.material.emissiveIntensity = .1;
        meshes.push(child);
      });
    }
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const direction = new THREE.Vector3(...(directions[sectionId] ?? [-.35, .12, 1])).normalize();
    camera.position.copy(center).add(direction);
    camera.lookAt(center);
    camera.updateMatrixWorld(true);
    const inverse = camera.matrixWorldInverse;
    const projected = new THREE.Box3();
    for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) projected.expandByPoint(new THREE.Vector3(x, y, z).applyMatrix4(inverse));
    const extent = projected.getSize(new THREE.Vector3());
    const fov = camera.fov * Math.PI / 180;
    const distance = Math.max(extent.y / (2 * Math.tan(fov / 2)), extent.x / (2 * Math.tan(fov / 2) * camera.aspect)) * 1.13 + extent.z / 2;
    camera.position.copy(center).addScaledVector(direction, distance);
    camera.near = Math.max(.01, distance / 1000);
    camera.far = distance * 100;
    camera.updateProjectionMatrix();
    camera.lookAt(center);
    for (const mesh of meshes) {
      mesh.visible = !mesh.userData.thumbnailTarget;
      mesh.material.transparent = true;
      mesh.material.opacity = .065;
      mesh.material.depthWrite = false;
    }
    renderer.autoClear = true;
    renderer.render(scene, camera);
    renderer.autoClear = false;
    renderer.clearDepth();
    for (const mesh of meshes) {
      mesh.visible = mesh.userData.thumbnailTarget;
      mesh.material.transparent = false;
      mesh.material.opacity = 1;
      mesh.material.depthWrite = true;
    }
    renderer.render(scene, camera);
    if (section.collection === 'landmarks') {
      const bone = prompts[0].bone;
      for (const landmark of landmarks[bone]) {
        const source = new THREE.Vector3(landmark.source[0], landmark.source[2], -landmark.source[1]);
        let nearest = source;
        let minimumDistance = Infinity;
        for (const mesh of meshes) {
          const positions = mesh.geometry.getAttribute('position');
          for (let index = 0; index < positions.count; index++) {
            const vertex = new THREE.Vector3().fromBufferAttribute(positions, index).applyMatrix4(mesh.matrixWorld);
            const distance = vertex.distanceToSquared(source);
            if (distance < minimumDistance) { minimumDistance = distance; nearest = vertex; }
          }
        }
        const pin = new THREE.Mesh(pinGeometry, pinMaterial);
        pin.position.copy(nearest);
        pin.scale.setScalar(Math.max(size.x, size.y, size.z) * .013);
        landmarkMarkers.add(pin);
      }
      renderer.render(scene, camera);
    }
    // Restore all nodes before computing the next section's bounds.
    for (const mesh of meshes) mesh.visible = true;
    return renderer.domElement.toDataURL('image/webp', .86);
  };
  return studySections.map(section => section.id);
});
for (const id of sectionIds) {
  const data = await page.evaluate(id => window.renderSection(id), id);
  const buffer = Buffer.from(data.split(',')[1], 'base64');
  await writeFile(resolve(outputDirectory, `${id}.webp`), buffer);
  console.log(id);
}
await browser.close();
console.log(`Rendered ${sectionIds.length} section thumbnails.`);
