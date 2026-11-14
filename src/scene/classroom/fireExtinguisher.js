import { std } from '../../materials/standard.js';
import { C } from '../../materials/palette.js';
import { lathe, cyl, rbox, torus, tube, mk, group } from './util/geo.js';

// 滅火器(門口旁右牆,壁掛支架)。紅色壓低飽和,仍能一眼認出;大型物件,vr 模式保留。
export const EXTINGUISHER = { pos: [3.25 - 0.1, 0.36, 3.42] };
export function createFireExtinguisher(main) {
  const g = group(main, 'fireExtinguisher', EXTINGUISHER.pos, [0, -Math.PI / 2, 0]);
  const red = std('#A8443D', { roughness: 0.35 }), black = std('#2F3235', { roughness: 0.7 });
  mk(g, lathe([[0, 0], [0.07, 0], [0.076, 0.012], [0.076, 0.4], [0.07, 0.44], [0.035, 0.465], [0.02, 0.47], [0, 0.47]], 24), red, {});
  mk(g, cyl(0.02, 0.022, 0.03, 12), std(C.steelDark), { pos: [0, 0.485, 0] });
  mk(g, rbox(0.12, 0.012, 0.025, 0.004), std(C.steel), { pos: [0.03, 0.51, 0], rot: [0, 0, -0.15] }); // 握把
  mk(g, rbox(0.1, 0.01, 0.022, 0.004), std(C.steel), { pos: [0.03, 0.49, 0] });
  mk(g, cyl(0.016, 0.016, 0.008, 16), std('#F1EEE6', { roughness: 0.3 }), { pos: [-0.03, 0.485, 0.02], rot: [Math.PI / 2, 0, 0] }); // 壓力錶
  mk(g, tube([[0.03, 0.48, 0], [0.07, 0.45, 0.01], [0.085, 0.3, 0.02], [0.08, 0.15, 0.02]], 0.007, 16, 6), black, {});
  mk(g, cyl(0.009, 0.006, 0.04, 10), black, { pos: [0.08, 0.13, 0.02] });
  mk(g, rbox(0.06, 0.03, 0.002, 0.001), std('#E9E6DE', { roughness: 0.6 }), { pos: [0, 0.25, 0.077] }); // 檢查標籤(無字)
  // 壁掛支架
  mk(g, rbox(0.05, 0.16, 0.012, 0.003), std(C.steel), { pos: [0, 0.4, -0.085] });
  mk(g, torus(0.079, 0.006, 6, 24, Math.PI * 1.2), std(C.steel), { pos: [0, 0.36, 0], rot: [Math.PI / 2, 0, Math.PI * 0.9] });
  return g;
}
