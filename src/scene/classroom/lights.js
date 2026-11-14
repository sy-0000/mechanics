import * as THREE from 'three';
import { WINDOWS, ROOM } from './layout.js';

// 寫實光照:
//  - 主光:暖色 DirectionalLight 從左側大窗斜射進來,唯一產生陰影的光源(PCFSoftShadowMap)。
//    陰影範圍涵蓋整片窗光落地區與工作桌,牆與窗框都投影,地板上出現清楚的窗格投影。
//  - 環境光 0.25:讓暗部真的暗下來。
//  - 室內三盞 2700K 暖色 PointLight 補光(不投影)。
//  - 寫實版不再使用假的光束面片,窗光完全由真實陰影形成;光中的微塵保留(dust.js)。
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

  scene.add(root);

  // 窗光極緩慢地移動(太陽位置正弦漂移,週期約 26 分鐘)
  let frozen = false;
  function update(t) {
    if (frozen) return; // 烘焙模式:陰影圖凍結,太陽不能再移動,否則陰影會錯位
    const drift = Math.sin(t * 0.004) * 0.06;
    sun.position.copy(target.position).addScaledVector(SUN_DIR, 9);
    sun.position.z += drift * 3; sun.position.y += drift;
  }
  function setQuality(q) {
    const sz = q === 'high' ? 2048 : 1024;
    if (s.mapSize.x !== sz) { s.mapSize.set(sz, sz); s.map?.dispose(); s.map = null; }
    // 烘焙模式:關掉補光燈,改以環境光補足亮度
    const baked = q === 'vr-baked';
    frozen = baked;
    points.forEach(p => (p.visible = !baked));
    amb.intensity = baked ? 0.45 : 0.25;
  }
  return { root, sun, amb, points, update, setQuality, dispose() {} };
}
