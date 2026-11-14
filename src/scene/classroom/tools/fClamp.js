import { C } from '../../../materials/palette.js';
import { toon } from '../../../materials/toon.js';
import { woodMat } from '../../../materials/wood.js';
import { metalMat } from '../../../materials/metal.js';
import { rbox, cyl, mk, group } from '../util/geo.js';

// F 型夾:鋼製扁軌、固定鉗爪、滑動鉗爪、螺桿與木柄(淺木色,非黃色)。
// 本地座標:軌道沿 +Y,鉗爪朝 +X,開口 opening(公尺)。
export function createFClamp(parent, { pos, rot, opening = 0.12, len = 0.3 } = {}) {
  const g = group(parent, 'fClamp', pos, rot);
  const steel = metalMat(C.steel, true), dark = toon(C.steelDark), handle = woodMat(C.woodLight, 'grain', 61);
  mk(g, rbox(0.006, len, 0.018, 0.0015), steel, { pos: [0, len / 2, 0] });
  // 固定鉗爪(頂端)
  mk(g, rbox(0.08, 0.016, 0.02, 0.003), dark, { pos: [0.04, len - 0.008, 0] });
  mk(g, cyl(0.008, 0.008, 0.004, 10), toon('#4A4E52'), { pos: [0.07, len - 0.018, 0] });
  // 滑動鉗爪
  const y = len - 0.016 - opening;
  mk(g, rbox(0.075, 0.018, 0.022, 0.003), dark, { pos: [0.036, y, 0] });
  mk(g, cyl(0.004, 0.004, 0.07, 8), toon(C.steelBright), { pos: [0.07, y + 0.01, 0] });
  mk(g, cyl(0.008, 0.008, 0.004, 10), toon('#4A4E52'), { pos: [0.07, y + 0.044, 0] });
  // 木柄
  mk(g, cyl(0.012, 0.014, 0.075, 12), handle, { pos: [0.07, y - 0.048, 0] });
  return g;
}
