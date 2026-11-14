import * as THREE from 'three';
import { makeCanvas, canvasTexture } from '../../materials/canvasTex.js';
import { WINDOWS, WORKBENCH } from './layout.js';

// 早晨淡黃窗光(唯一的即時陰影光)+ 奶油色環境補光 + 地面/桌面上的窗框光影(緩慢移動)。
export const SUN_DIR = new THREE.Vector3(-1, 0.62, 0.28).normalize(); // 指向光源

export function createLights(scene, quality = 'high') {
  const root = new THREE.Group(); root.name = 'lights';
  const hemi = new THREE.HemisphereLight('#FFF8E8', '#E9DFCC', 1.55);
  root.add(hemi);
  const amb = new THREE.AmbientLight('#FFF6E4', 0.35); root.add(amb);

  const sun = new THREE.DirectionalLight('#FFEFC9', 1.9);
  const target = new THREE.Object3D(); target.position.set(...WORKBENCH.center);
  sun.target = target; root.add(target);
  sun.position.copy(target.position).addScaledVector(SUN_DIR, 6);
  sun.castShadow = true;
  const s = sun.shadow;
  s.mapSize.set(quality === 'vr' ? 1024 : 2048, quality === 'vr' ? 1024 : 2048);
  // 陰影範圍只框住工作桌周圍
  Object.assign(s.camera, { left: -1.4, right: 1.4, top: 1.4, bottom: -1.4, near: 3, far: 9 });
  s.bias = -0.0006; s.normalBias = 0.02; s.radius = 3;
  root.add(sun);

  // 窗框光影:每扇窗投到地面一塊淡黃光斑(兩扇拉窗 + 中梃),以加法混色疊在地面上。
  const gobo = makeCanvas(512, 512), g = gobo.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, 512, 512);
  g.filter = 'blur(6px)';
  g.fillStyle = '#fff';
  const pad = 26, bar = 16;
  g.fillRect(pad, pad, 256 - pad - bar / 2, 512 - pad * 2);
  g.fillRect(256 + bar / 2, pad, 256 - pad - bar / 2, 512 - pad * 2);
  g.fillStyle = '#000'; g.fillRect(0, 250, 512, 10); // 橫向窗框
  const goboTex = canvasTexture(gobo, { repeat: false });
  const patchMat = new THREE.MeshBasicMaterial({
    map: goboTex, color: '#FFE9B8', transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending,
    depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2,
  });
  // 光斑投影:窗戶(x=-3.25, y 0.9~2.5)沿 -SUN_DIR 投到地面
  const patches = [];
  const t = (WINDOWS.sill + WINDOWS.h / 2) / SUN_DIR.y; // 窗中心到地面距離參數
  for (const zc of WINDOWS.centersZ) {
    const len = WINDOWS.h / SUN_DIR.y * Math.hypot(SUN_DIR.x, SUN_DIR.z) * 1.0;
    const geo = new THREE.PlaneGeometry(len, WINDOWS.w * 0.98);
    geo.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(geo, patchMat);
    m.userData.base = new THREE.Vector3(WINDOWS.x - SUN_DIR.x * t, 0.004, zc - SUN_DIR.z * t);
    m.position.copy(m.userData.base);
    m.rotation.y = Math.atan2(SUN_DIR.z, -SUN_DIR.x);
    m.renderOrder = 2; m.userData.dynamic = true; m.userData.outline = false;
    root.add(m); patches.push(m);
  }
  // 光束(極淡的體積光片)
  const shaftTex = makeCanvas(64, 256), sg = shaftTex.getContext('2d');
  const grad = sg.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, 'rgba(255,255,255,0.0)'); grad.addColorStop(0.2, 'rgba(255,255,255,0.9)');
  grad.addColorStop(0.8, 'rgba(255,255,255,0.6)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
  sg.fillStyle = grad; sg.fillRect(0, 0, 64, 256);
  const shaftMat = new THREE.MeshBasicMaterial({
    map: canvasTexture(shaftTex, { repeat: false }), color: '#FFF0C8', transparent: true, opacity: 0.06,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false,
  });
  const shafts = [];
  for (const zc of WINDOWS.centersZ) {
    for (const dz of [-0.45, 0.45]) {
      const L = 3.2;
      const geo = new THREE.PlaneGeometry(0.75, L);
      const m = new THREE.Mesh(geo, shaftMat);
      const start = new THREE.Vector3(WINDOWS.x + 0.05, WINDOWS.sill + WINDOWS.h * 0.55, zc + dz);
      const mid = start.clone().addScaledVector(SUN_DIR, -L / 2);
      m.position.copy(mid);
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), SUN_DIR);
      m.rotateY(Math.PI / 2);
      m.userData.dynamic = true; m.userData.outline = false; m.renderOrder = 3;
      root.add(m); shafts.push(m);
    }
  }
  scene.add(root);

  // 光影以極慢速度移動(約每分鐘 1.5 cm,並有微小呼吸)。
  function update(t) {
    const drift = Math.sin(t * 0.004) * 0.12;
    for (const p of patches) { p.position.x = p.userData.base.x + drift; p.position.z = p.userData.base.z + drift * 0.4; }
    sun.position.copy(target.position).addScaledVector(SUN_DIR, 6);
    sun.position.x += drift * 0.5; sun.position.z += drift * 0.2;
    shaftMat.opacity = 0.055 + Math.sin(t * 0.15) * 0.008;
  }
  function setQuality(q) {
    const size = q === 'vr' ? 1024 : 2048;
    if (s.mapSize.x !== size) { s.mapSize.set(size, size); s.map?.dispose(); s.map = null; }
  }
  return { root, sun, hemi, update, setQuality, dispose() { goboTex.dispose(); patchMat.dispose(); shaftMat.dispose(); } };
}
