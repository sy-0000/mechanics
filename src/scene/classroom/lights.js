import * as THREE from 'three';
import { makeCanvas, canvasTexture } from '../../materials/canvasTex.js';
import { WINDOWS, ROOM } from './layout.js';

// 寫實光照:
//  - 主光:暖色 DirectionalLight 從左側大窗斜射進來,唯一產生陰影的光源(PCFSoftShadowMap)。
//    陰影範圍涵蓋整片窗光落地區與工作桌,牆與窗框都投影,地板上出現清楚的窗格投影。
//  - 環境光 0.25:讓暗部真的暗下來。
//  - 室內三盞 2700K 暖色 PointLight 補光(不投影)。
export const SUN_DIR = new THREE.Vector3(-1, 0.62, 0.28).normalize(); // 指向光源
export const K2700 = '#FFA757'; // 約 2700K 的色溫

export const POINT_LIGHTS = [[-1.2, 2.55, -1.4], [1.5, 2.55, 0.3], [-0.2, 2.55, 2.4]];

export function createLights(scene, quality = 'high') {
  const root = new THREE.Group(); root.name = 'lights';
  const amb = new THREE.AmbientLight('#FFF4E6', 0.25); root.add(amb);

  const sun = new THREE.DirectionalLight('#FFE2BC', 3.4);
  // 陰影相機涵蓋整間教室:牆面擋住的區域才不會被直射光漏照
  const target = new THREE.Object3D(); target.position.set(0, 1.0, 0);
  sun.target = target; root.add(target);
  sun.position.copy(target.position).addScaledVector(SUN_DIR, 9);
  sun.castShadow = true;
  const s = sun.shadow;
  const size = quality === 'high' ? 2048 : 1024;
  s.mapSize.set(size, size);
  Object.assign(s.camera, { left: -5.6, right: 5.6, top: 4.6, bottom: -4.6, near: 1, far: 22 });
  s.bias = -0.0004; s.normalBias = 0.025; s.radius = 4; s.blurSamples = 12;
  root.add(sun);

  const points = POINT_LIGHTS.map(p => {
    const l = new THREE.PointLight(K2700, 1.6, 7.5, 2);
    l.position.set(...p); l.castShadow = false; root.add(l); return l;
  });

  // 光束:極淡的加法混色光片(無後處理也能有體積感)
  const shaftTex = makeCanvas(64, 256), sg = shaftTex.getContext('2d');
  const grad = sg.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, 'rgba(255,255,255,0.0)'); grad.addColorStop(0.2, 'rgba(255,255,255,0.9)');
  grad.addColorStop(0.8, 'rgba(255,255,255,0.6)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
  sg.fillStyle = grad; sg.fillRect(0, 0, 64, 256);
  const shaftMat = new THREE.MeshBasicMaterial({
    map: canvasTexture(shaftTex, { repeat: false }), color: '#FFD9A8', transparent: true, opacity: 0.012,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false, toneMapped: false,
  });
  for (const zc of WINDOWS.centersZ) for (const dz of [-0.45, 0.45]) {
    const L = 3.2, m = new THREE.Mesh(new THREE.PlaneGeometry(0.75, L), shaftMat);
    const start = new THREE.Vector3(WINDOWS.x + 0.05, WINDOWS.sill + WINDOWS.h * 0.55, zc + dz);
    m.position.copy(start.clone().addScaledVector(SUN_DIR, -L / 2));
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), SUN_DIR); m.rotateY(Math.PI / 2);
    m.userData.dynamic = true; m.renderOrder = 3; m.castShadow = false;
    root.add(m);
  }
  scene.add(root);

  // 窗光極緩慢地移動(太陽位置正弦漂移,週期約 26 分鐘)
  function update(t) {
    const drift = Math.sin(t * 0.004) * 0.06;
    sun.position.copy(target.position).addScaledVector(SUN_DIR, 9);
    sun.position.z += drift * 3; sun.position.y += drift;
    shaftMat.opacity = 0.011 + Math.sin(t * 0.15) * 0.002;
  }
  function setQuality(q) {
    const sz = q === 'high' ? 2048 : 1024;
    if (s.mapSize.x !== sz) { s.mapSize.set(sz, sz); s.map?.dispose(); s.map = null; }
    // 烘焙模式:關掉補光燈,改以環境光補足亮度
    const baked = q === 'vr-baked';
    points.forEach(p => (p.visible = !baked));
    amb.intensity = baked ? 0.45 : 0.25;
  }
  return { root, sun, amb, points, update, setQuality, dispose() { shaftMat.dispose(); } };
}
