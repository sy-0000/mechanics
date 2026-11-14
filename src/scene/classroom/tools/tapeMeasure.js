import { C } from '../../../materials/palette.js';
import { std } from '../../../materials/standard.js';
import { rbox, cyl, mk, group } from '../util/geo.js';

// 捲尺:灰色殼體 + 奶油色防滑側片 + 拉出一小段的鋼尺帶(無刻度文字)。底面 y=0。
export function createTapeMeasure(parent, { pos, rot } = {}) {
  const g = group(parent, 'tapeMeasure', pos, rot);
  mk(g, rbox(0.068, 0.068, 0.036, 0.014), std('#8B9094', { roughness: 0.45 }), { pos: [0, 0.034, 0], rot: [Math.PI / 2, 0, 0] });
  for (const s of [-1, 1]) mk(g, cyl(0.026, 0.026, 0.004, 24), std(C.rubberCream, { roughness: 0.8 }), { pos: [0, 0.034 + s * 0.0, s * 0.019], rot: [Math.PI / 2, 0, 0] });
  mk(g, rbox(0.012, 0.012, 0.02, 0.003), std('#4C5054', { roughness: 0.5 }), { pos: [0.02, 0.07, 0] });
  mk(g, rbox(0.09, 0.0015, 0.019, 0.0005), std('#D4D2C8', { roughness: 0.35, metalness: 0.6 }), { pos: [0.075, 0.003, 0] });
  mk(g, rbox(0.003, 0.01, 0.019, 0.001), std(C.steel), { pos: [0.12, 0.006, 0] });
  return g;
}
