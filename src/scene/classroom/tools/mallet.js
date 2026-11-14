import { C } from '../../../materials/palette.js';
import { woodMat } from '../../../materials/wood.js';
import { rbox, cyl, mk, group } from '../util/geo.js';

// 木槌:全木。柄沿 +Y,方形槌頭在頂端。
export function createMallet(parent, { pos, rot } = {}) {
  const g = group(parent, 'mallet', pos, rot);
  mk(g, cyl(0.012, 0.014, 0.28, 12), woodMat(C.woodLight, 'grain', 131), { pos: [0, 0.14, 0] });
  mk(g, rbox(0.13, 0.065, 0.055, 0.008), woodMat(C.woodMid, 'grain', 133), { pos: [0, 0.3, 0] });
  return g;
}
