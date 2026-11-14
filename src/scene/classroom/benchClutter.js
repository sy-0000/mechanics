import * as THREE from 'three';
import { paperMat } from '../../materials/paper.js';
import { group, markNear } from './util/geo.js';
import { WORKBENCH } from './layout.js';
import { createPencil } from './tools/pencil.js';
import { createEraser } from './tools/eraser.js';
import { createSteelRuler } from './tools/steelRuler.js';
import { createFClamp } from './tools/fClamp.js';
import { createCClamp } from './tools/cClamp.js';

// 工作桌掛載區外的散落物。掛載區為 x∈[-0.4,0.4]、z∈[-1.0,-0.2](桌面座標),所有物件都留在兩側條帶內。
const Y = WORKBENCH.height;

/** 微微捲邊的 A3 圖紙(直式 0.297 × 0.42)。 */
function curledPaper(seed, lift = 0.012) {
  const geo = new THREE.PlaneGeometry(0.297, 0.42, 8, 10);
  geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) / 0.1485, z = p.getZ(i) / 0.21;
    const e = Math.max(0, Math.abs(z) - 0.6) / 0.4, s = Math.max(0, Math.abs(x) - 0.75) / 0.25;
    p.setY(i, lift * (e * e * (z > 0 ? 1 : 0.6) + s * s * 0.35));
  }
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, paperMat(seed));
  m.material.side = THREE.DoubleSide;
  m.userData.outline = false;
  return m;
}

export function createBenchClutter(parent) {
  const g = group(parent, 'benchClutter');
  // 左側三張交疊的圖紙 + 右側一張
  const papers = [
    { x: -0.62, z: -0.48, r: 0.08, s: 1 },
    { x: -0.6, z: -0.62, r: -0.05, s: 2 },
    { x: -0.63, z: -0.7, r: 0.14, s: 3 },
    { x: 0.6, z: -0.37, r: -0.06, s: 4 },
  ];
  papers.forEach((pp, i) => {
    const m = curledPaper(pp.s);
    m.position.set(pp.x, Y + 0.0008 + i * 0.0007, pp.z); m.rotation.y = pp.r;
    if (i === 3) m.position.y = Y + 0.0008;
    g.add(m);
  });
  const top = Y + 0.004;
  createPencil(g, { pos: [-0.58, top + 0.0038, -0.55], rot: [0, 0.9, 0] });
  createEraser(g, { pos: [-0.69, top, -0.4], rot: [0, -0.4, 0] });
  createSteelRuler(g, { pos: [-0.465, Y + 0.0045, -0.56], rot: [0, Math.PI / 2 + 0.02, 0], length: 0.3 });
  // F 夾:一支夾在桌子後緣(鉗爪跨過桌面),一支平放在左前角
  createFClamp(g, { pos: [-0.6, Y - 0.27, -1.05 + 0.03], rot: [0, Math.PI / 2, 0], opening: 0.1, len: 0.3 });
  createFClamp(g, { pos: [-0.75, Y + 0.012, -0.2], rot: [-Math.PI / 2, 0, -Math.PI / 2 + 0.1], opening: 0.09, len: 0.25 });
  // C 夾平放在左後方
  createCClamp(g, { pos: [-0.7, Y + 0.009, -0.96], rot: [-Math.PI / 2, 0, 0.6] });
  return markNear(g);
}
