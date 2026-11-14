import { C } from '../../../materials/palette.js';
import { toon } from '../../../materials/toon.js';
import { woodMat } from '../../../materials/wood.js';
import { rbox, mk, group } from '../util/geo.js';

// 銅刷:木柄 + 暗金屬色刷毛(灰褐,非銅橘)。柄朝 −Y,刷頭在上。
export function createBrassBrush(parent, { pos, rot } = {}) {
  const g = group(parent, 'brassBrush', pos, rot);
  mk(g, rbox(0.022, 0.2, 0.012, 0.005), woodMat(C.woodLight, 'grain', 141), { pos: [0, 0, 0] });
  mk(g, rbox(0.024, 0.06, 0.014, 0.002), toon('#8F887E'), { pos: [0, 0.07, 0.012] });
  return g;
}
