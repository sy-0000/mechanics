import { C } from '../../../materials/palette.js';
import { woodMat } from '../../../materials/wood.js';
import { toon } from '../../../materials/toon.js';
import { rbox, cyl, sphere, mk, group } from '../util/geo.js';

// 轉動曲柄就會揮手的小木人(曲柄搖桿玩具):木盒底座、側邊曲柄、連桿穿出頂板帶動手臂。
export function createWavingFigure(parent, { pos, rot } = {}) {
  const g = group(parent, 'wavingFigure', pos, rot);
  const box = woodMat(C.woodMid, 'grain', 261), lt = woodMat(C.woodLight, 'grain', 263);
  mk(g, rbox(0.12, 0.08, 0.08, 0.004), box, { pos: [0, 0.04, 0] });
  mk(g, cyl(0.004, 0.004, 0.11, 8), toon(C.steel), { pos: [0, 0.04, 0], rot: [Math.PI / 2, 0, 0] });
  mk(g, rbox(0.01, 0.035, 0.006, 0.002), lt, { pos: [0, 0.055, 0.058] });
  mk(g, cyl(0.005, 0.005, 0.02, 8), lt, { pos: [0, 0.07, 0.066], rot: [Math.PI / 2, 0, 0] });
  // 小人
  mk(g, rbox(0.035, 0.06, 0.02, 0.008), lt, { pos: [0, 0.115, 0] });
  mk(g, sphere(0.018, 12, 10), lt, { pos: [0, 0.165, 0] });
  mk(g, rbox(0.03, 0.006, 0.006, 0.002), toon('#D8C0BA'), { pos: [0, 0.188, 0], outline: false });
  for (const s of [-1, 1]) mk(g, rbox(0.01, 0.03, 0.01, 0.003), lt, { pos: [s * 0.008, 0.08 + 0.0, 0] });
  mk(g, rbox(0.008, 0.045, 0.008, 0.003), lt, { pos: [0.03, 0.15, 0], rot: [0, 0, -0.7] });
  mk(g, rbox(0.008, 0.04, 0.008, 0.003), lt, { pos: [-0.024, 0.12, 0], rot: [0, 0, 0.3] });
  return g;
}
