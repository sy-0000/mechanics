import { C } from '../../../materials/palette.js';
import { std } from '../../../materials/standard.js';
import { woodMat } from '../../../materials/wood.js';
import { rbox, cyl, sphere, mk, group, extrude } from '../util/geo.js';
import { gearShape } from '../works/gearBoard.js';

// 齒輪組模型(靜態擺設):木底座 + 直立背板,三個嚙合齒輪(淺木)與金屬軸,主動輪附手搖柄。本地 +Z 為正面。
export function createGearTrainModel(parent, { pos, rot } = {}) {
  const g = group(parent, 'gearTrainModel', pos, rot);
  const base = woodMat(C.woodMid, 'grain'), board = woodMat('#DCC6A2', 'laminate'), gw = woodMat('#E2CDA8', 'grain');
  mk(g, rbox(0.3, 0.02, 0.13, 0.004), base, { pos: [0, 0.01, 0] });
  mk(g, rbox(0.28, 0.2, 0.012, 0.004), board, { pos: [0, 0.12, -0.045] });
  const z = -0.045 + 0.012;
  // 齒輪:模數一致(齒數 16 / 10 / 13),中心距 = 半徑和
  const gears = [[-0.07, 0.12, 0.056, 16], [0.014, 0.12, 0.035, 10], [0.087, 0.12, 0.045, 13]]; // 中心距 = 節圓半徑和(半徑 − 齒高/2)
  gears.forEach(([x, y, r, t], i) => {
    mk(g, extrude(gearShape(r, t, 0.007, 0.004), 0.01, 0), gw, { pos: [x, y, z + 0.006], rot: [0, 0, i * 0.17] });
    mk(g, cyl(0.004, 0.004, 0.03, 10), std(C.steel), { pos: [x, y, z + 0.008], rot: [Math.PI / 2, 0, 0] });
    mk(g, cyl(0.009, 0.009, 0.004, 12), std(C.alu), { pos: [x, y, z + 0.022], rot: [Math.PI / 2, 0, 0] });
  });
  // 手搖柄
  const [hx, hy] = gears[0];
  mk(g, rbox(0.045, 0.01, 0.006, 0.003), woodMat(C.woodMid, 'grain'), { pos: [hx + 0.018, hy + 0.008, z + 0.027], rot: [0, 0, 0.4] });
  mk(g, cyl(0.006, 0.006, 0.025, 10), woodMat(C.woodMid, 'grain'), { pos: [hx + 0.036, hy + 0.016, z + 0.04], rot: [Math.PI / 2, 0, 0] });
  return g;
}
