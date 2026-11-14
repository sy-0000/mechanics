import { LUMBER_RACK } from './layout.js';
import { C } from '../../materials/palette.js';
import { std } from '../../materials/standard.js';
import { woodMat } from '../../materials/wood.js';
import { rbox, mk, group } from './util/geo.js';
import { createMdfStack } from './mdfStack.js';
import { createTimberStrips } from './timberStrips.js';

// 木料架(後牆左側):淺灰鋼架三層。底層平放密集板,中層實木板,上層短木塊與夾板邊料;旁邊斜靠角材。
export function createLumberRack(parent) {
  const { x0, x1, z, depth, levels } = LUMBER_RACK;
  const g = group(parent, 'lumberRack');
  const steel = std('#B4B8BA'), zc = z - depth / 2 - 0.01;
  const W = x1 - x0;
  // 立柱
  for (const x of [x0 + 0.02, x0 + W / 2, x1 - 0.02]) for (const dz of [-depth / 2 + 0.02, depth / 2 - 0.02])
    mk(g, rbox(0.04, 2.0, 0.04, 0.004), steel, { pos: [x, 1.0, zc + dz] });
  // 層架橫樑 + 層板(中、上層為木層板,底層只有托樑)
  levels.forEach((y, i) => {
    for (const dz of [-depth / 2 + 0.02, depth / 2 - 0.02]) mk(g, rbox(W, 0.05, 0.03, 0.004), steel, { pos: [(x0 + x1) / 2, y - 0.025, zc + dz] });
    for (let k = 0; k < 4; k++) mk(g, rbox(0.03, 0.03, depth - 0.04, 0.004), steel, { pos: [x0 + 0.05 + k * (W - 0.1) / 3, y - 0.02, zc] });
    if (i > 0) mk(g, rbox(W - 0.02, 0.018, depth - 0.02, 0.004), woodMat(C.plywood, 'laminate', 171), { pos: [(x0 + x1) / 2, y + 0.009, zc] });
  });
  createMdfStack(g, [(x0 + x1) / 2 + 0.06, levels[0], zc]);
  // 中層:實木板(3~4 cm 厚,長短不一,有木紋與節眼)
  const mid = levels[1] + 0.018;
  const boards = [[1.6, 0.2, 0.04, 0.0], [1.2, 0.18, 0.035, 0.03], [1.9, 0.22, 0.03, -0.02], [0.9, 0.16, 0.04, 0.05], [1.4, 0.19, 0.035, -0.04]];
  let y = mid;
  boards.forEach(([L, w, t, dx], i) => {
    const row = i % 2;
    mk(g, rbox(L, t, w, 0.004), woodMat(i % 2 ? C.woodMid : '#D2BE9F', 'knotty', 180 + i), { pos: [(x0 + x1) / 2 + dx + (row ? 0.2 : -0.15), y + t / 2, zc + (row ? 0.13 : -0.12)] });
    if (row) y += t;
  });
  // 上層:短木塊與夾板邊料
  const top = levels[2] + 0.018;
  const scraps = [[0.3, 0.08, 0.05, -0.8, 0], [0.25, 0.06, 0.06, -0.45, 0.1], [0.45, 0.012, 0.25, 0.1, 0.0], [0.4, 0.012, 0.2, 0.12, 0.012], [0.18, 0.05, 0.05, 0.6, -0.1], [0.22, 0.04, 0.09, 0.75, 0.12], [0.5, 0.009, 0.15, -0.2, -0.15]];
  scraps.forEach(([L, t, w, dx, dz], i) => mk(g, rbox(L, t, w, 0.003), woodMat(i % 3 === 0 ? C.plywood : C.woodLight, 'grain', 190 + i), { pos: [(x0 + x1) / 2 + dx, top + t / 2 + (i === 3 ? 0.012 : 0), zc + dz], rot: [0, (i % 2 ? 0.1 : -0.06), 0] }));
  createTimberStrips(g);
  return g;
}
