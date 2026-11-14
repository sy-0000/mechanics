import { C } from '../../../materials/palette.js';
import { toon } from '../../../materials/toon.js';
import { cyl, rbox, mk } from '../util/geo.js';

// 尖嘴鉗:灰黑包覆握把 + 鋼製細長鉗嘴(朝 +Y)。
export function buildPliers(g) {
  const grip = toon(C.gripGray), steel = toon(C.steel);
  for (const s of [-1, 1]) {
    mk(g, cyl(0.0065, 0.0055, 0.11, 8), grip, { pos: [s * 0.012, -0.06, 0], rot: [0, 0, s * 0.12] });
    mk(g, rbox(0.006, 0.065, 0.006, 0.002), steel, { pos: [s * 0.0025, 0.045, 0], rot: [0, 0, -s * 0.03] });
  }
  mk(g, cyl(0.009, 0.009, 0.012, 12), steel, { pos: [0, 0.005, 0], rot: [Math.PI / 2, 0, 0] });
  return g;
}
