import * as THREE from 'three';
import { std } from '../../materials/standard.js';
import { rbox, mk, group, instanced } from './util/geo.js';

// 插座、電燈開關、沿牆線槽(全部是小物,details 群組,只在 high 模式顯示,不投影)。
// 牆面方向:f = 前牆(朝 +Z)、b = 後牆(朝 −Z)、r = 右牆(朝 −X)、l = 左牆(朝 +X)。
const FACE = {
  f: (a, y) => ({ pos: [a, y, -3.8 + 0.004], rot: [0, 0, 0] }),
  b: (a, y) => ({ pos: [a, y, 3.7 - 0.004], rot: [0, Math.PI, 0] }),
  r: (a, y) => ({ pos: [3.25 - 0.004, y, a], rot: [0, -Math.PI / 2, 0] }),
  l: (a, y) => ({ pos: [-3.25 + 0.019, y, a], rot: [0, Math.PI / 2, 0] }), // 左牆有 1.5 cm 護牆板
};
export const OUTLETS = [['f', -0.9, 0.32], ['f', 0.9, 0.32], ['f', -2.25, 0.32], ['r', -1.7, 0.32], ['r', -0.3, 0.32], ['r', 1.0, 1.1], ['b', 0.22, 0.32], ['l', -1.3, 0.32], ['l', 0.9, 0.32]];
export const SWITCHES = [['r', 3.6, 1.25], ['f', -3.1, 1.25]];

export function createWallFixtures(details) {
  const g = group(details, 'wallFixtures');
  const plate = std('#EEECE6', { roughness: 0.45 }), dark = std('#55595D', { roughness: 0.6 });
  const off = (t, dz) => { const o = new THREE.Object3D(); o.position.set(...t.pos); o.rotation.set(...t.rot); o.translateZ(dz); return o; };
  const T = (list, dz = 0, dy = 0) => list.map(([w, a, y]) => { const o = off(FACE[w](a, y + dy), dz); return { pos: o.position.toArray(), rot: [o.rotation.x, o.rotation.y, o.rotation.z] }; });
  // 插座:面板 + 兩個插孔
  instanced(g, rbox(0.075, 0.12, 0.008, 0.003), plate, T(OUTLETS, 0.004), { name: 'outletPlates' });
  instanced(g, rbox(0.03, 0.022, 0.004, 0.002), dark, [...T(OUTLETS, 0.008, 0.026), ...T(OUTLETS, 0.008, -0.026)], { name: 'outletSockets' });
  // 開關:面板 + 兩個並排翹板
  instanced(g, rbox(0.075, 0.12, 0.008, 0.003), plate, T(SWITCHES, 0.004), { name: 'switchPlates' });
  const rockers = [];
  for (const t of T(SWITCHES, 0.009)) for (const dx of [-0.016, 0.016]) {
    const o = new THREE.Object3D(); o.position.set(...t.pos); o.rotation.set(...t.rot); o.translateX(dx);
    rockers.push({ pos: o.position.toArray(), rot: t.rot });
  }
  instanced(g, rbox(0.022, 0.045, 0.008, 0.003), std('#E2E0D9', { roughness: 0.4 }), rockers, { name: 'switchRockers' });
  // 線槽(白色塑膠,4 × 2.2 cm 斷面,沿座標軸;合併成一批)
  const duct = std('#ECE9E1', { roughness: 0.5 });
  const fz = -3.8 + 0.011, rx = 3.25 - 0.011;
  const box = (sx, sy, sz, x, y, z) => mk(g, rbox(sx, sy, sz, 0.004), duct, { pos: [x, y, z] });
  box(5.4, 0.04, 0.022, (-3.2 + 2.2) / 2, 0.2, fz);          // 前牆水平線槽(到材料櫃前止)
  box(0.022, 0.04, 4.35, rx, 0.2, (-3.3 + 1.05) / 2);         // 右牆水平線槽
  box(0.022, 0.84, 0.04, rx, 0.62, 1.05);                     // 鑽床插座立管
  box(0.022, 1.66, 0.04, rx, 2.15, 3.6);                      // 門邊開關立管到天花板
  box(0.04, 1.66, 0.022, -3.1, 2.15, fz);                     // 前牆左角開關立管
  box(0.022, 0.38, 0.04, rx, 2.79, -0.48);                    // 冷氣冷媒管線槽
  return g;
}
