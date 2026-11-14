import { C } from '../../../materials/palette.js';
import { toon } from '../../../materials/toon.js';
import { woodMat } from '../../../materials/wood.js';
import { rbox, cyl, mk, group } from '../util/geo.js';

// 鐵鎚:木柄 + 鋼鎚頭(一端平面、一端羊角)。柄沿 +Y,鎚頭在頂端。
export function buildHammer(g) {
  const steel = toon(C.steel), handle = woodMat(C.woodLight, 'grain', 121);
  mk(g, cyl(0.011, 0.014, 0.3, 12), handle, { pos: [0, 0.15, 0], scale: [1, 1, 0.75] });
  mk(g, cyl(0.016, 0.016, 0.06, 14), steel, { pos: [0.035, 0.31, 0], rot: [0, 0, Math.PI / 2] });
  mk(g, rbox(0.03, 0.032, 0.025, 0.004), steel, { pos: [0, 0.31, 0] });
  mk(g, rbox(0.06, 0.012, 0.012, 0.003), steel, { pos: [-0.04, 0.318, 0], rot: [0, 0, -0.35] });
  return g;
}
export function createHammer(parent, { pos, rot } = {}) { return buildHammer(group(parent, 'hammer', pos, rot)); }
