import { C } from '../../../materials/palette.js';
import { woodMat } from '../../../materials/wood.js';
import { std } from '../../../materials/standard.js';
import { rbox, cyl, mk, group } from '../util/geo.js';

// 筆筒:四片木板拼成的方筒,插著幾支筆。
export function createPenHolder(parent, { pos, rot } = {}) {
  const g = group(parent, 'penHolder', pos, rot);
  const w = woodMat(C.woodLight, 'grain', 321);
  const s = 0.08, h = 0.1, t = 0.008;
  mk(g, rbox(s, t, s, 0.002), w, { pos: [0, t / 2, 0] });
  mk(g, rbox(s, h, t, 0.002), w, { pos: [0, h / 2, s / 2 - t / 2] });
  mk(g, rbox(s, h, t, 0.002), w, { pos: [0, h / 2, -s / 2 + t / 2] });
  mk(g, rbox(t, h, s - 2 * t, 0.002), w, { pos: [s / 2 - t / 2, h / 2, 0] });
  mk(g, rbox(t, h, s - 2 * t, 0.002), w, { pos: [-s / 2 + t / 2, h / 2, 0] });
  [['#AFBCC6', 0.012, 0.15], ['#D8C0BA', -0.015, 0.13], ['#C9CDD0', 0.0, 0.14]].forEach(([c, x, len], i) =>
    mk(g, cyl(0.004, 0.004, len, 6), std(c), { pos: [x, len / 2 + 0.01, (i - 1) * 0.012], rot: [0.08 * (i - 1), 0, 0.1 * (i - 1)] }));
  return g;
}
