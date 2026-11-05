/** Render small static previews of every selectable quiz target.
 * Run against the local Vite server: node scripts/render-target-thumbnails.mjs
 * Uses only the shipped licensed meshes; no app auth, analytics, or live UI.
 * This is an offline asset renderer, not an interactive browser test.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { homedir } from 'node:os';

const runtime = process.env.ANATOME_BROWSER_RUNTIME ?? resolve(homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const { chromium } = await import(`${runtime}/playwright/index.mjs`);
const baseUrl = process.env.ANATOME_PREVIEW_URL ?? 'http://127.0.0.1:5173';
const executablePath = process.env.ANATOME_CHROMIUM ?? resolve(homedir(), 'Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing');
const output = resolve('public/targets');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath, headless: true, args: ['--enable-unsafe-swiftshader'] });
try {
  const page = await browser.newPage({ viewport: { width: 192, height: 128 }, deviceScaleFactor: 1 });
  page.on('pageerror', error => console.error(error.message));
  await page.route('**/__target-thumbnails', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><body style="margin:0;background:#202832"></body></html>' }));
  await page.goto(`${baseUrl}/__target-thumbnails`);
  const catalog = await page.evaluate(async () => {
    const { default: refresh } = await import('/@react-refresh');
    refresh.injectIntoGlobalHook(window);
    window.$RefreshReg$ = () => {};
    window.$RefreshSig$ = () => type => type;
    window.__vite_plugin_react_preamble_installed__ = true;
    const THREE = await import('/node_modules/.vite/deps/three.js');
    const { GLTFLoader } = await import('/node_modules/three/examples/jsm/loaders/GLTFLoader.js');
    const { MeshoptDecoder } = await import('/node_modules/three/examples/jsm/libs/meshopt_decoder.module.js');
    const { OBJLoader } = await import('/node_modules/three/examples/jsm/loaders/OBJLoader.js');
    const { modelPromptPools } = await import('/src/modelQuiz.ts');
    const { landmarks } = await import('/src/components/BoneViewer.tsx');
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(192, 128); renderer.setPixelRatio(1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.03;
    document.body.append(renderer.domElement);
    const scene = new THREE.Scene();
    const background = new THREE.Color('#202832');
    scene.background = background;
    const contextDepth = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: true, side: THREE.DoubleSide });
    const camera = new THREE.PerspectiveCamera(30, 192 / 128, .001, 100000);
    scene.add(camera);
    camera.add(new THREE.HemisphereLight(0xf4f4ff, 0x223043, 1));
    const key = new THREE.DirectionalLight(0xfff0de, 2.1); key.position.set(-4, 6, 8);
    const fill = new THREE.DirectionalLight(0xb5d7ff, .8); fill.position.set(5, 2, 4);
    const rim = new THREE.DirectionalLight(0x9bc7fa, .9); rim.position.set(3, 4, -5);
    camera.add(key, fill, rim);
    for (const light of [key, fill, rim]) camera.add(light.target);
    const models = {};
    const metadata = {};
    const gltfLoader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    for (const name of ['muscles', 'skeleton']) {
      const { scene: model } = await gltfLoader.loadAsync(`/models/${name}.glb`);
      model.rotation.x = -Math.PI / 2; model.updateMatrixWorld(true);
      const nodes = model.children.map(node => {
        const meshes = [];
        node.traverse(mesh => {
          if (!mesh.isMesh) return;
          mesh.material = new THREE.MeshStandardMaterial({ roughness: .65, metalness: 0, side: THREE.DoubleSide, forceSinglePass: true });
          meshes.push(mesh);
        });
        return { node, id: node.userData.partId, meshes, bounds: new THREE.Box3().setFromObject(node) };
      });
      models[name] = model; metadata[name] = nodes;
    }
    const objLoader = new OBJLoader();
    const snappedLandmarks = {};
    for (const name of ['femur', 'humerus', 'scapula']) {
      const model = await objLoader.loadAsync(`/models/${name}.obj`);
      model.rotation.x = -Math.PI / 2; model.updateMatrixWorld(true);
      const meshes = [];
      model.traverse(mesh => {
        if (!mesh.isMesh) return;
        if (!mesh.geometry.getAttribute('normal')) mesh.geometry.computeVertexNormals();
        mesh.material = new THREE.MeshStandardMaterial({ color: 0xe5d5b8, roughness: .74, metalness: 0, side: THREE.DoubleSide });
        meshes.push(mesh);
      });
      models[name] = model;
      metadata[name] = [{ node: model, meshes, bounds: new THREE.Box3().setFromObject(model) }];
      snappedLandmarks[name] = {};
      // Same source-vertex snapping as BoneViewer. Never invent locator sites.
      for (const landmark of landmarks[name]) {
        const target = new THREE.Vector3(...landmark.source);
        let best = Infinity, point = new THREE.Vector3(), normal = new THREE.Vector3();
        for (const mesh of meshes) {
          const positions = mesh.geometry.getAttribute('position'), normals = mesh.geometry.getAttribute('normal');
          for (let index = 0; index < positions.count; index++) {
            const vertex = new THREE.Vector3().fromBufferAttribute(positions, index);
            const distance = vertex.distanceToSquared(target);
            if (distance < best) { best = distance; point.copy(vertex).applyMatrix4(mesh.matrixWorld); normal.fromBufferAttribute(normals, index).transformDirection(mesh.matrixWorld); }
          }
        }
        snappedLandmarks[name][landmark.id] = { point, normal };
      }
    }
    const marker = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), new THREE.MeshStandardMaterial({ color: 0x69c8ff, emissive: 0x288bcb, emissiveIntensity: .6, roughness: .4, depthTest: false, depthWrite: false }));
    marker.visible = false; marker.renderOrder = 10; scene.add(marker);
    const prompts = Object.values(modelPromptPools).flat();
    const directions = { anterior: [-.22, .08, 1], posterior: [.22, .08, -1], medial: [1, .08, .15], lateral: [-1, .08, .15] };
    function fit(bounds, direction) {
      const center = bounds.getCenter(new THREE.Vector3());
      camera.position.copy(center).add(direction); camera.up.set(0, 1, 0); camera.lookAt(center); camera.updateMatrixWorld(true);
      const projected = new THREE.Box3();
      for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) projected.expandByPoint(new THREE.Vector3(x, y, z).applyMatrix4(camera.matrixWorldInverse));
      const extent = projected.getSize(new THREE.Vector3()), fov = camera.fov * Math.PI / 180;
      const distance = Math.max(extent.y / (2 * Math.tan(fov / 2)), extent.x / (2 * Math.tan(fov / 2) * camera.aspect)) * 1.23 + extent.z / 2;
      camera.position.copy(center).addScaledVector(direction, distance); camera.near = Math.max(.001, distance / 1000); camera.far = distance * 100;
      camera.updateProjectionMatrix(); camera.lookAt(center); camera.updateMatrixWorld(true);
      return distance;
    }
    window.renderTargetThumbnail = id => {
      const prompt = prompts.find(item => item.id === id);
      if (!prompt) throw Error(`Unknown target ${id}`);
      const name = prompt.collection === 'landmarks' ? prompt.bone : prompt.collection;
      for (const model of Object.values(models)) scene.remove(model);
      const model = models[name]; scene.add(model); marker.visible = false; scene.background = background;
      const records = metadata[name];
      let bounds, target;
      if (prompt.collection !== 'landmarks') {
        target = records.find(record => record.id === prompt.partId);
        if (!target) throw Error(`Missing geometry ${id}`);
        bounds = target.bounds.clone();
      } else {
        bounds = records[0].bounds.clone();
        if (prompt.landmark) {
          const size = bounds.getSize(new THREE.Vector3());
          const radius = Math.max(size.x, size.y, size.z) * .14;
          const point = snappedLandmarks[name][prompt.landmark].point;
          bounds.set(point.clone().addScalar(-radius), point.clone().addScalar(radius));
        }
      }
      const direction = new THREE.Vector3(...directions[prompt.view]).normalize();
      // Thin targets retain a little volume around the viewing axis but are
      // framed on their own geometry, rather than repeating a whole section.
      const distance = fit(bounds, direction);
      const nearby = bounds.clone().expandByScalar(bounds.getSize(new THREE.Vector3()).length() * .4);
      renderer.autoClear = true;
      if (prompt.collection !== 'landmarks') {
        for (const record of records) {
          record.node.visible = record !== target && nearby.intersectsBox(record.bounds);
          for (const mesh of record.meshes) {
            mesh.visible = true; mesh.material.color.set(0x8da1b5); mesh.material.emissive.set(0);
            mesh.material.transparent = true; mesh.material.opacity = .08; mesh.material.depthWrite = false;
          }
        }
        scene.overrideMaterial = contextDepth;
        renderer.render(scene, camera);
        scene.overrideMaterial = null; renderer.autoClear = false; scene.background = null;
        renderer.render(scene, camera);
        renderer.clearDepth();
        for (const record of records) record.node.visible = record === target;
        for (const mesh of target.meshes) {
          mesh.material.color.set(prompt.collection === 'muscles' ? 0x8bc9ec : 0xe9dac0);
          mesh.material.emissive.set(prompt.collection === 'muscles' ? 0x17374a : 0x110e09);
          mesh.material.emissiveIntensity = .18; mesh.material.transparent = false; mesh.material.opacity = 1; mesh.material.depthWrite = true;
        }
        renderer.render(scene, camera);
      } else {
        model.visible = true;
        if (prompt.landmark) {
          const snap = snappedLandmarks[name][prompt.landmark];
          const radius = distance * Math.tan(camera.fov * Math.PI / 360) * .065;
          marker.position.copy(snap.point).addScaledVector(snap.normal, radius * .35); marker.scale.setScalar(radius); marker.visible = true;
          // Keep the source-selected anatomical view. The marker is an overlay
          // locator, matching the app's annotation convention, not segmentation.
        }
        renderer.render(scene, camera);
      }
      for (const record of records) { record.node.visible = true; for (const mesh of record.meshes) mesh.visible = true; }
      return renderer.domElement.toDataURL('image/webp', .82);
    };
    return prompts.map(({ id, collection, answer, partId, bone, landmark, view }) => ({ id, collection, answer, partId, bone, landmark, view }));
  });
  let totalBytes = 0;
  for (const [index, target] of catalog.entries()) {
    const data = await page.evaluate(id => window.renderTargetThumbnail(id), target.id);
    const bytes = Buffer.from(data.split(',')[1], 'base64');
    await writeFile(resolve(output, `${target.id}.webp`), bytes); totalBytes += bytes.length;
    if ((index + 1) % 50 === 0) console.log(`Rendered ${index + 1}/${catalog.length}`);
  }
  await writeFile(resolve(output, 'catalog.json'), `${JSON.stringify({ width: 192, height: 128, targets: catalog }, null, 2)}\n`);
  console.log(`Rendered ${catalog.length} target thumbnails (${(totalBytes / 1024 / 1024).toFixed(2)} MiB).`);
} finally { await browser.close(); }
