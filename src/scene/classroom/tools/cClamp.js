import { C } from '../../../materials/palette.js';
import { toon } from '../../../materials/toon.js';
import { rbox, cyl, sphere, torus, mk, group } from '../util/geo.js';

// C 型夾:鑄鐵 C 形弓身(灰)、螺桿、T 型滑桿。
export function createCClamp(parent, { pos, rot } = {}) {
  const g = group(parent, 'cClamp', pos, rot);
  const iron = toon(C.machineWarm), steel = toon(C.steelBright);
  mk(g, torus(0.042, 0.009, 8, 20, Math.PI * 1.25), iron, { rot: [0, 0, Math.PI * 0.375] });
  mk(g, rbox(0.024, 0.014, 0.02, 0.003), iron, { pos: [-0.03, 0.03, 0] });
  mk(g, cyl(0.004, 0.004, 0.09, 8), steel, { pos: [-0.03, -0.02, 0] });
  mk(g, cyl(0.008, 0.008, 0.004, 10), toon('#4A4E52'), { pos: [-0.03, 0.022, 0] });
  mk(g, cyl(0.003, 0.003, 0.06, 8), steel, { pos: [-0.03, -0.065, 0], rot: [0, 0, Math.PI / 2] });
  for (const x of [-0.06, 0]) mk(g, sphere(0.005), steel, { pos: [x, -0.065, 0] });
  return g;
}
