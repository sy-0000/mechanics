import * as THREE from 'three';
import { APRON_RACK } from './layout.js';
import { C } from '../../materials/palette.js';
import { fabricMat } from '../../materials/fabric.js';
import { woodMat } from '../../materials/wood.js';
import { rbox, cyl, sphere, mk, group, instanced } from './util/geo.js';

// 工作服:木掛勾橫板 + 4 件帆布工作圍裙(奶油色、淺灰藍,實例化並以 instanceColor 上色),自然下垂、有皺褶。
function apronGeometry() {
  const w = 0.5, h = 0.82, geo = new THREE.PlaneGeometry(w, h, 12, 18);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i); const y = p.getY(i), t = (h / 2 - y) / h; // 0 頂端 → 1 底部
    // 上窄(胸片)下寬
    const shape = t < 0.32 ? 0.45 + t * 0.6 : 1.0;
    x *= shape;
    // 掛點集中在頂端中央,往下自然展開;縱向皺褶
    const fold = Math.sin(x * 26 + t * 2) * 0.012 * t + Math.sin(x * 9) * 0.008;
    const sway = t * t * 0.03;
    p.setXYZ(i, x * (0.85 + 0.15 * t), y, fold + sway);
  }
  geo.translate(0, -h / 2, 0);
  geo.computeVertexNormals();
  return geo;
}

export function createApronRack(parent) {
  const { x, zc, y, count, spacing } = APRON_RACK;
  const g = group(parent, 'apronRack', [x - 0.012, y, zc], [0, -Math.PI / 2, 0]);
  const wood = woodMat(C.woodMid, 'grain', 161);
  const L = spacing * count + 0.12;
  mk(g, rbox(L, 0.09, 0.024, 0.006), wood, { pos: [0, 0, 0] });
  const pegs = [];
  for (let i = 0; i < count; i++) pegs.push({ pos: [(i - (count - 1) / 2) * spacing, 0, 0.05], rot: [Math.PI / 2 - 0.3, 0, 0] });
  instanced(g, cyl(0.011, 0.013, 0.08, 10), woodMat(C.woodLight, 'grain', 163), pegs, { name: 'apronPegs' });
  instanced(g, sphere(0.016), woodMat(C.woodLight, 'grain', 163), pegs.map(p => ({ pos: [p.pos[0], 0.012, 0.09] })), { name: 'pegKnobs' });
  const cols = [C.canvasCream, C.blueGray, C.canvasCream, '#B9C4CC'];
  const mat = fabricMat('#ffffff');
  const aprons = pegs.map((p, i) => ({ pos: [p.pos[0] + (i % 2 ? 0.01 : -0.01), 0.0, 0.045 + i * 0.012], rot: [0.03, (i - 1.5) * 0.08, (i % 2 ? 0.02 : -0.03)], color: cols[i] }));
  instanced(g, apronGeometry(), mat, aprons, { name: 'aprons' });
  // 頸帶
  const strap = new THREE.TorusGeometry(0.11, 0.006, 5, 20, Math.PI);
  instanced(g, strap, fabricMat('#CFC6B2'), pegs.map((p, i) => ({ pos: [p.pos[0], -0.085, 0.07 + i * 0.012], rot: [0, 0, 0] })), { name: 'apronStraps' });
  return g;
}
