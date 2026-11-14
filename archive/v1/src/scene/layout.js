// 共用底座與場景佈局:奶油色空間、木框底座、主光陰影、微塵、窗光。
import * as THREE from 'three';
import { bevelBox } from '../assets/geo.js';
import { lightWood, creamTop } from '../materials/wood.js';
import { addOutline } from '../materials/outline.js';
import { toonMaterial, COLORS } from '../materials/toon.js';

export const BASE_SIZE = 0.8;      // 底座邊長
export const TABLE_HEIGHT = 0.75;  // 桌面高(地面之上)

/** 建立整個共用場景。回傳 {scene, baseGroup, tabletop, keyLight, update}。 */
export function createLayout() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(COLORS.background);
  // 遠景淡出(地平線感,不是純白無邊界)
  scene.fog = new THREE.Fog('#FBF7E8', 5, 14);

  // 地面(柔和奶油,不受光照變暗)+ 陰影接收層(只畫影子)
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(12, 48),
    new THREE.MeshBasicMaterial({ color: '#F8F3E2' }),
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);
  const shadowCatcher = new THREE.Mesh(
    new THREE.CircleGeometry(3, 40),
    new THREE.ShadowMaterial({ opacity: 0.16, color: '#5A4a32' }),
  );
  shadowCatcher.rotation.x = -Math.PI / 2;
  shadowCatcher.position.y = 0.001;
  shadowCatcher.receiveShadow = true;
  scene.add(shadowCatcher);

  // 遠方地平線環(更深一點的奶油,給空間邊界感)
  const horizon = new THREE.Mesh(
    new THREE.CylinderGeometry(14, 14, 5, 48, 1, true),
    new THREE.MeshBasicMaterial({ color: '#F7F1DE', side: THREE.BackSide, fog: false }),
  );
  horizon.position.y = 2.2;
  scene.add(horizon);

  // ── 底座(木框 + 奶油桌面),桌面上緣在 y=TABLE_HEIGHT ──
  const baseGroup = new THREE.Group();
  baseGroup.name = 'base';
  scene.add(baseGroup);

  // 桌腳柱(四角,簡潔)
  const legGeo = bevelBox(0.05, TABLE_HEIGHT - 0.06, 0.05, { corner: 0.006 });
  const legMat = lightWood();
  for (const [x, z] of [[-0.33, -0.33], [0.33, -0.33], [-0.33, 0.33], [0.33, 0.33]]) {
    const leg = new THREE.Mesh(legGeo, legMat);
    leg.position.set(x, (TABLE_HEIGHT - 0.06) / 2, z);
    leg.castShadow = true;
    addOutline(leg);
    baseGroup.add(leg);
  }

  // 木框
  const frame = new THREE.Mesh(
    bevelBox(BASE_SIZE, 0.05, BASE_SIZE, { corner: 0.012 }),
    lightWood(),
  );
  frame.position.y = TABLE_HEIGHT - 0.045;
  frame.castShadow = true;
  frame.receiveShadow = true;
  addOutline(frame, { thickness: 0.002 });
  baseGroup.add(frame);

  // 奶油桌面(略小、嵌入框)
  const top = new THREE.Mesh(
    bevelBox(BASE_SIZE - 0.05, 0.016, BASE_SIZE - 0.05, { corner: 0.008 }),
    creamTop(),
  );
  top.position.y = TABLE_HEIGHT - 0.008;
  top.receiveShadow = true;
  top.castShadow = false;
  addOutline(top, { thickness: 0.0015 });
  baseGroup.add(top);

  // 桌面群組:關卡內容掛這裡(原點 = 桌面中心、y=0 是桌面)
  const tabletop = new THREE.Group();
  tabletop.name = 'tabletop';
  tabletop.position.y = TABLE_HEIGHT;
  baseGroup.add(tabletop);

  // ── 光 ──
  const ambient = new THREE.AmbientLight('#FFF4DF', 0.75);
  scene.add(ambient);
  const keyLight = new THREE.DirectionalLight('#FFF0C8', 2.2);
  keyLight.position.set(-1.6, 2.6, 1.2); // 左上斜照 → 長而柔和的影子
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(2048, 2048);
  keyLight.shadow.camera.left = -0.9;
  keyLight.shadow.camera.right = 0.9;
  keyLight.shadow.camera.top = 1.4;
  keyLight.shadow.camera.bottom = -0.4;
  keyLight.shadow.camera.near = 0.5;
  keyLight.shadow.camera.far = 7;
  keyLight.shadow.bias = -0.0004;
  keyLight.shadow.normalBias = 0.002;
  keyLight.shadow.radius = 4;
  keyLight.target.position.set(0, TABLE_HEIGHT, 0);
  scene.add(keyLight, keyLight.target);
  const fill = new THREE.DirectionalLight('#FFEFD9', 0.5);
  fill.position.set(1.8, 1.4, -0.8);
  scene.add(fill);

  // ── 微塵(InstancedMesh,緩慢漂浮)──
  const DUST_N = 60;
  const dustGeo = new THREE.SphereGeometry(0.0016, 6, 4);
  const dustMat = new THREE.MeshBasicMaterial({
    color: '#FFF6DC', transparent: true, opacity: 0.55, depthWrite: false,
  });
  const dust = new THREE.InstancedMesh(dustGeo, dustMat, DUST_N);
  dust.name = 'dust';
  const dustSeeds = [];
  let seed = 99;
  const rand = () => (seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;
  for (let i = 0; i < DUST_N; i++) {
    dustSeeds.push({
      x: (rand() - 0.5) * 1.1, y: TABLE_HEIGHT + rand() * 0.55,
      z: (rand() - 0.5) * 1.1, p: rand() * Math.PI * 2, s: 0.3 + rand() * 0.7,
    });
  }
  scene.add(dust);

  // 窗光光斑(桌面上一塊柔和亮區,輕微移動)
  const patchTex = makeWindowPatch();
  const patch = new THREE.Mesh(
    new THREE.PlaneGeometry(0.7, 0.5),
    new THREE.MeshBasicMaterial({
      map: patchTex, transparent: true, opacity: 0.18,
      depthWrite: false, blending: THREE.AdditiveBlending,
    }),
  );
  patch.rotation.x = -Math.PI / 2;
  patch.position.set(0.05, TABLE_HEIGHT + 0.002, -0.05);
  patch.rotation.z = 0.3;
  scene.add(patch);

  // ── 更新(dt 秒;isXR 時幅度更小)──
  let t = 0;
  const m4 = new THREE.Matrix4();
  function update(dt, isXR = false) {
    t += dt;
    const amp = isXR ? 0.4 : 1;
    // 微塵
    for (let i = 0; i < DUST_N; i++) {
      const d = dustSeeds[i];
      const y = d.y + Math.sin(t * 0.12 * d.s + d.p) * 0.03 * amp;
      const x = d.x + Math.sin(t * 0.07 * d.s + d.p * 2) * 0.02 * amp;
      const z = d.z + Math.cos(t * 0.09 * d.s + d.p * 3) * 0.02 * amp;
      m4.setPosition(x, y, z);
      dust.setMatrixAt(i, m4);
    }
    dust.instanceMatrix.needsUpdate = true;
    // 窗光(很慢;VR 中週期更長、幅度減半)
    const wT = t * (isXR ? 0.008 : 0.02);
    patch.position.x = 0.05 + Math.sin(wT) * 0.03 * amp;
    patch.material.opacity = 0.15 + Math.sin(wT * 1.7) * 0.03 * amp;
  }

  return {
    scene, baseGroup, tabletop, keyLight, update,
    envMeshes: { ground, horizon, patch, dust, shadowCatcher },
  };
}

/** 窗光光斑貼圖:斜格窗影 */
function makeWindowPatch() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(128, 128, 20, 128, 128, 128);
  grad.addColorStop(0, 'rgba(255,245,210,1)');
  grad.addColorStop(1, 'rgba(255,245,210,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  // 窗框影(兩條暗線)
  g.globalCompositeOperation = 'destination-out';
  g.fillStyle = 'rgba(0,0,0,0.6)';
  g.fillRect(120, 0, 14, 256);
  g.fillRect(0, 120, 256, 14);
  const tex = new THREE.CanvasTexture(c);
  return tex;
}
