import { C } from '../../../materials/palette.js';
import { toon } from '../../../materials/toon.js';
import { rbox, cyl, mk, group } from '../util/geo.js';
import * as THREE from 'three';

// 熱熔膠槍:灰白色槍身、灰色扳機、金屬噴嘴,掛在專用掛勾上;旁邊幾根透明膠條。本地平面 XY。
export function createHotGlueGun(parent, { pos, rot } = {}) {
  const g = group(parent, 'hotGlueGun', pos, rot);
  const body = toon('#E7E5DF'), gray = toon('#9DA1A4'), steel = toon(C.steelDark);
  mk(g, rbox(0.15, 0.05, 0.035, 0.014), body, { pos: [0, 0, 0] });
  mk(g, rbox(0.04, 0.11, 0.032, 0.012), body, { pos: [0.045, -0.07, 0], rot: [0, 0, -0.25] });
  mk(g, rbox(0.014, 0.05, 0.016, 0.005), gray, { pos: [0.005, -0.045, 0], rot: [0, 0, -0.2] });
  mk(g, cyl(0.004, 0.009, 0.03, 10), steel, { pos: [-0.088, 0, 0], rot: [0, 0, Math.PI / 2] });
  // 專用掛勾(環形托架)
  mk(g, rbox(0.06, 0.008, 0.04, 0.002), toon(C.steel), { pos: [-0.02, 0.03, -0.012] });
  // 膠條
  const stick = new THREE.MeshBasicMaterial({ color: '#F4F2EA', transparent: true, opacity: 0.55, depthWrite: false });
  for (let i = 0; i < 4; i++) {
    const m = mk(g, cyl(0.0055, 0.0055, 0.1, 10), stick, { pos: [0.12 + i * 0.014, -0.03, 0.006], outline: false });
    m.userData.dynamic = true;
  }
  return g;
}
