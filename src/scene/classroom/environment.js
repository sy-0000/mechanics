import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { K2700 } from './lights.js';

// 環境貼圖(反射用)。預設以程序方式建一個「教室 HDRI」:奶油色房間、左側高亮的窗面(HDR 值 > 1)、
// 天花燈與暖色燈點,再用 PMREM 預過濾。不從網路下載任何檔案。
// 若提供 options.hdriUrl(本地 .hdr),則改用真實 HDRI。
function buildEnvScene() {
  // PMREM 從原點擷取;把整個房間往下移 1.2 m,等於在眼睛高度擷取(否則下半球是黑的)
  const s = new THREE.Scene(); const root = new THREE.Group(); root.position.y = -1.2; s.add(root);
  const box = new THREE.Mesh(new THREE.BoxGeometry(6.5, 3, 7.5), new THREE.MeshBasicMaterial({ color: '#B9B0A0', side: THREE.BackSide }));
  box.position.y = 1.5; root.add(box);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(6.5, 7.5), new THREE.MeshBasicMaterial({ color: '#6E6A62' }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = 0.01; root.add(floor);
  const win = new THREE.MeshBasicMaterial({ color: new THREE.Color('#FFF1D8').multiplyScalar(9) });
  for (const z of [-2.4, -0.2, 2.0]) {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.6), win);
    w.position.set(-3.2, 1.7, z); w.rotation.y = Math.PI / 2; root.add(w);
  }
  const lamp = new THREE.MeshBasicMaterial({ color: new THREE.Color(K2700).multiplyScalar(4) });
  for (const x of [-1.6, 1.6]) for (const z of [-2.4, 0, 2.4]) {
    const l = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 1.2), lamp);
    l.position.set(x, 2.98, z); l.rotation.x = Math.PI / 2; root.add(l);
  }
  return s;
}

export function createEnvironment(renderer, scene, { hdriUrl, intensity = 0.55 } = {}) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = buildEnvScene();
  let rt = pmrem.fromScene(envScene, 0.02, 0.1, 20);
  scene.environment = rt.texture;
  scene.environmentIntensity = intensity;
  envScene.traverse(o => { o.geometry?.dispose(); o.material?.dispose(); });
  if (hdriUrl) {
    new RGBELoader().load(hdriUrl, tex => {
      tex.mapping = THREE.EquirectangularReflectionMapping;
      const next = pmrem.fromEquirectangular(tex); tex.dispose();
      rt.dispose(); rt = next; scene.environment = rt.texture;
    });
  }
  return { get texture() { return rt.texture; }, setIntensity(v) { scene.environmentIntensity = v; }, dispose() { rt.dispose(); pmrem.dispose(); } };
}
