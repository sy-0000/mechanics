import * as THREE from 'three';
import { C } from '../../../materials/palette.js';
import { std } from '../../../materials/standard.js';
import { rbox, torus, cyl, mk } from '../util/geo.js';

// 剪刀:灰黑握把(兩個指環)+ 鋼刃,刃尖朝 −Y(掛牆時刃朝下)。
export function buildScissors(g) {
  const grip = std(C.gripBlack), steel = std(C.steelBright);
  mk(g, torus(0.017, 0.005, 6, 16), grip, { pos: [-0.018, 0.03, 0] });
  mk(g, torus(0.017, 0.005, 6, 16), grip, { pos: [0.018, 0.03, 0.004] });
  mk(g, rbox(0.007, 0.1, 0.002, 0.0008), steel, { pos: [-0.004, -0.045, 0], rot: [0, 0, -0.07] });
  mk(g, rbox(0.007, 0.1, 0.002, 0.0008), steel, { pos: [0.004, -0.045, 0.003], rot: [0, 0, 0.07] });
  mk(g, cyl(0.004, 0.004, 0.007, 10), std(C.steelDark), { pos: [0, 0.0, 0.0015], rot: [Math.PI / 2, 0, 0] });
  return g;
}
