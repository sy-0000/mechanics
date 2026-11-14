import * as THREE from 'three';
import { TRASH_BIN } from './layout.js';
import { C } from '../../materials/palette.js';
import { std } from '../../materials/standard.js';
import { woodMat } from '../../materials/wood.js';
import { lathe, torus, rbox, mk, group, instanced } from './util/geo.js';
import { rng } from '../../materials/canvasTex.js';

// 灰色大垃圾桶,桶口露出木屑與碎木片。
export function createTrashBin(parent) {
  const { pos, r, h } = TRASH_BIN;
  const g = group(parent, 'trashBin', pos);
  const gray = std(C.trashGray);
  mk(g, lathe([[0, 0], [r * 0.82, 0], [r * 0.85, 0.02], [r, h], [r * 0.96, h], [r * 0.8, 0.03], [0, 0.03]], 28), gray, {});
  gray.side = THREE.DoubleSide;
  mk(g, torus(r + 0.004, 0.012, 6, 32), gray, { pos: [0, h, 0], rot: [Math.PI / 2, 0, 0] });
  // 木屑表面(淺木色、略起伏)
  const shav = new THREE.CircleGeometry(r * 0.94, 24);
  shav.rotateX(-Math.PI / 2);
  const p = shav.attributes.position, rr = rng(3);
  for (let i = 0; i < p.count; i++) p.setY(i, rr() * 0.02);
  shav.computeVertexNormals();
  mk(g, shav, std('#E2D2B6'), { pos: [0, h - 0.07, 0] });
  // 碎木片(實例化)
  const bits = [];
  for (let i = 0; i < 9; i++) bits.push({ pos: [(rr() - 0.5) * r, h - 0.05 + rr() * 0.05, (rr() - 0.5) * r], rot: [rr() * 0.8, rr() * 3, rr() * 0.8], scale: [0.6 + rr(), 1, 0.6 + rr()] });
  instanced(g, rbox(0.12, 0.012, 0.035, 0.002), woodMat(C.woodLight, 'grain', 221), bits, { name: 'scrapBits' });
  return g;
}
