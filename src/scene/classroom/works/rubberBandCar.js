import { C } from '../../../materials/palette.js';
import { toon } from '../../../materials/toon.js';
import { woodMat } from '../../../materials/wood.js';
import { rbox, cyl, mk, group } from '../util/geo.js';

// 木製橡皮筋動力小車:木車架、木輪、後軸纏繞橡皮筋。
export function createRubberBandCar(parent, { pos, rot, tint = null } = {}) {
  const g = group(parent, 'rubberBandCar', pos, rot);
  const frame = woodMat(C.woodLight, 'grain', 241), wheel = woodMat(C.woodMid, 'grain', 243);
  for (const z of [-0.03, 0.03]) mk(g, rbox(0.18, 0.012, 0.012, 0.002), frame, { pos: [0, 0.03, z] });
  mk(g, rbox(0.03, 0.01, 0.07, 0.002), frame, { pos: [0.07, 0.036, 0] });
  if (tint) mk(g, rbox(0.06, 0.018, 0.05, 0.004), toon(tint), { pos: [-0.01, 0.045, 0] });
  for (const x of [-0.07, 0.07]) {
    mk(g, cyl(0.003, 0.003, 0.1, 8), toon(C.steel), { pos: [x, 0.025, 0], rot: [Math.PI / 2, 0, 0] });
    for (const z of [-0.048, 0.048]) mk(g, cyl(x < 0 ? 0.03 : 0.022, x < 0 ? 0.03 : 0.022, 0.008, 18), wheel, { pos: [x, x < 0 ? 0.03 : 0.022, z], rot: [Math.PI / 2, 0, 0] });
  }
  mk(g, cyl(0.007, 0.007, 0.03, 10), toon('#C7C0B5'), { pos: [-0.07, 0.025, 0], rot: [Math.PI / 2, 0, 0] });
  mk(g, rbox(0.13, 0.003, 0.004, 0.001), toon('#C7C0B5'), { pos: [0.0, 0.034, 0], rot: [0, 0, 0.08], outline: false });
  return g;
}
