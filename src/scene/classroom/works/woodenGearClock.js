import { C } from '../../../materials/palette.js';
import { woodMat } from '../../../materials/wood.js';
import { toon } from '../../../materials/toon.js';
import { rbox, cyl, mk, group, extrude } from '../util/geo.js';
import { gearShape } from './gearBoard.js';

// 小型木齒輪時鐘:鏤空木框、前後層齒輪、鐘擺、指針(無數字)。
export function createWoodenGearClock(parent, { pos, rot } = {}) {
  const g = group(parent, 'woodenGearClock', pos, rot);
  const frame = woodMat(C.woodMid, 'grain', 291), gear = woodMat('#E2CFAE', 'grain', 293);
  mk(g, rbox(0.16, 0.012, 0.07, 0.003), frame, { pos: [0, 0.006, 0] });
  for (const s of [-1, 1]) mk(g, rbox(0.012, 0.3, 0.012, 0.003), frame, { pos: [s * 0.06, 0.15, -0.015] });
  mk(g, rbox(0.14, 0.012, 0.012, 0.003), frame, { pos: [0, 0.3, -0.015] });
  mk(g, extrude(gearShape(0.055, 24, 0.006, 0.004), 0.006, 0.0008), gear, { pos: [0, 0.2, 0.0] });
  mk(g, extrude(gearShape(0.03, 12, 0.005, 0.003), 0.006, 0.0008), gear, { pos: [0.045, 0.13, -0.01] });
  mk(g, extrude(gearShape(0.025, 30, 0.003, 0.003), 0.005, 0.0008), gear, { pos: [-0.03, 0.115, -0.006] });
  mk(g, rbox(0.006, 0.05, 0.004, 0.0015), toon('#8E8578'), { pos: [0, 0.22, 0.008], rot: [0, 0, 0.6] });
  mk(g, rbox(0.004, 0.07, 0.004, 0.0015), toon('#8E8578'), { pos: [0.02, 0.215, 0.01], rot: [0, 0, -0.9] });
  // 鐘擺
  mk(g, rbox(0.004, 0.12, 0.003, 0.001), frame, { pos: [0, 0.1, 0.012], rot: [0, 0, 0.08] });
  mk(g, cyl(0.016, 0.016, 0.006, 16), gear, { pos: [-0.004, 0.045, 0.012], rot: [Math.PI / 2, 0, 0] });
  return g;
}
