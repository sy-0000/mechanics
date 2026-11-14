import * as THREE from 'three';
import { C } from '../../../materials/palette.js';
import { woodMat } from '../../../materials/wood.js';
import { std } from '../../../materials/standard.js';
import { rbox, cyl, sphere, mk, group, extrude } from '../util/geo.js';

/** 木齒輪輪廓。 */
export function gearShape(r, teeth, depth = 0.008, holeR = 0.005) {
  const s = new THREE.Shape(), n = teeth * 4;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2, k = i % 4;
    const rr = k === 1 || k === 2 ? r : r - depth;
    const x = Math.cos(a) * rr, y = Math.sin(a) * rr;
    i ? s.lineTo(x, y) : s.moveTo(x, y);
  }
  const h = new THREE.Path(); h.absarc(0, 0, holeR, 0, Math.PI * 2, true); s.holes.push(h);
  return s;
}

// 三個咬合的木齒輪展示板,附手搖把。板子斜立在小支架上。
export function createGearBoard(parent, { pos, rot } = {}) {
  const g = group(parent, 'gearBoard', pos, rot);
  const board = group(g, 'board', [0, 0.13, 0], [-0.12, 0, 0]);
  mk(board, rbox(0.34, 0.24, 0.015, 0.004), woodMat(C.plywood, 'grain', 271), {});
  const gears = [[-0.09, -0.01, 0.06, 16, '#E0CBA8'], [0.03, 0.02, 0.045, 12, '#D4BE9A'], [0.115, -0.04, 0.035, 9, '#E6D6BC']];
  gears.forEach(([x, y, r, t, col], i) => {
    mk(board, extrude(gearShape(r, t), 0.01, 0.001), woodMat(col, 'grain', 273 + i), { pos: [x, y, 0.014], rot: [0, 0, i * 0.2] });
    mk(board, cyl(0.006, 0.006, 0.025, 10), std('#CFC3B0'), { pos: [x, y, 0.015], rot: [Math.PI / 2, 0, 0] });
  });
  // 手搖把
  mk(board, rbox(0.045, 0.01, 0.006, 0.003), woodMat(C.woodMid, 'grain', 279), { pos: [-0.07, -0.01, 0.03], rot: [0, 0, 0.3] });
  mk(board, cyl(0.006, 0.006, 0.03, 10), woodMat(C.woodMid, 'grain', 279), { pos: [-0.05, -0.0, 0.045], rot: [Math.PI / 2, 0, 0] });
  mk(g, rbox(0.3, 0.012, 0.08, 0.003), woodMat(C.woodMid, 'grain', 281), { pos: [0, 0.006, 0.0] });
  return g;
}
