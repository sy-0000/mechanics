import { C } from '../../../materials/palette.js';
import { woodMat } from '../../../materials/wood.js';
import { toon } from '../../../materials/toon.js';
import { rbox, cyl, mk, group } from '../util/geo.js';

// 鳥屋:木盒、斜屋頂、圓形入口、棲木。
export function createBirdhouse(parent, { pos, rot } = {}) {
  const g = group(parent, 'birdhouse', pos, rot);
  const wall = woodMat(C.woodLight, 'grain', 311), roof = woodMat(C.woodMid, 'grain', 313);
  mk(g, rbox(0.12, 0.13, 0.11, 0.004), wall, { pos: [0, 0.065, 0] });
  for (const s of [-1, 1]) mk(g, rbox(0.095, 0.01, 0.14, 0.003), roof, { pos: [s * 0.035, 0.155, 0], rot: [0, 0, -s * 0.72] });
  mk(g, cyl(0.018, 0.018, 0.004, 18), toon('#5E6266'), { pos: [0, 0.085, 0.056], rot: [Math.PI / 2, 0, 0], outline: false });
  mk(g, cyl(0.003, 0.003, 0.03, 6), roof, { pos: [0, 0.05, 0.065], rot: [Math.PI / 2, 0, 0] });
  return g;
}
