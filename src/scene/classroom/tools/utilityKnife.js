import { C } from '../../../materials/palette.js';
import { std } from '../../../materials/standard.js';
import { rbox, mk, group } from '../util/geo.js';

// 美工刀:灰色塑膠握柄、金屬滑軌、伸出一小截刀片。沿本地 +X,平放。
export function createUtilityKnife(parent, { pos, rot } = {}) {
  const g = group(parent, 'utilityKnife', pos, rot);
  mk(g, rbox(0.15, 0.012, 0.022, 0.005), std('#9A9FA3', { roughness: 0.5 }), { pos: [0, 0.006, 0] });
  mk(g, rbox(0.11, 0.004, 0.012, 0.0015), std(C.steel), { pos: [0.01, 0.013, 0] });
  mk(g, rbox(0.012, 0.006, 0.009, 0.002), std('#4C5054', { roughness: 0.6 }), { pos: [-0.01, 0.016, 0] });
  mk(g, rbox(0.022, 0.0008, 0.009, 0.0002), std(C.steelBright, { roughness: 0.25, metalness: 1 }), { pos: [0.085, 0.006, 0], rot: [0, 0.15, 0] });
  return g;
}
