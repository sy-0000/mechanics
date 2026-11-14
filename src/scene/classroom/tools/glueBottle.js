import { C } from '../../../materials/palette.js';
import { std } from '../../../materials/standard.js';
import { lathe, cyl, mk } from '../util/geo.js';

// 白膠:白色瓶身、灰色尖嘴瓶蓋,無標籤文字。底面 y=0。
export function buildGlueBottle(g) {
  mk(g, lathe([[0, 0], [0.028, 0], [0.03, 0.006], [0.03, 0.1], [0.024, 0.115], [0.012, 0.12], [0, 0.12]], 18), std(C.glueWhite), {});
  mk(g, cyl(0.013, 0.014, 0.018, 14), std('#9A9EA1'), { pos: [0, 0.128, 0] });
  mk(g, cyl(0.002, 0.008, 0.025, 10), std('#9A9EA1'), { pos: [0, 0.15, 0] });
  return g;
}
