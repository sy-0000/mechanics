import { C } from '../../../materials/palette.js';
import { toon } from '../../../materials/toon.js';
import { cyl, rbox, mk, group } from '../util/geo.js';

// 金屬繪圖圓規:頂部握柄、樞紐、兩支腳(針腳與鉛芯腳)。
export function createCompass(parent, { pos, rot } = {}) {
  const g = group(parent, 'compass', pos, rot);
  const steel = toon(C.steelBright), dark = toon(C.steelDark);
  mk(g, cyl(0.003, 0.003, 0.025, 8), dark, { pos: [0, 0.125, 0] });
  mk(g, rbox(0.022, 0.012, 0.008, 0.003), steel, { pos: [0, 0.108, 0] });
  for (const s of [-1, 1]) mk(g, rbox(0.006, 0.12, 0.004, 0.0015), steel, { pos: [s * 0.012, 0.05, 0], rot: [0, 0, s * 0.2] });
  mk(g, cyl(0.0004, 0.0015, 0.012, 6), dark, { pos: [-0.024, -0.012, 0] });
  mk(g, cyl(0.0012, 0.0012, 0.012, 6), toon('#55585A'), { pos: [0.024, -0.012, 0] });
  return g;
}
