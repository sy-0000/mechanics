import { DRILL_PRESS } from './layout.js';
import { C } from '../../materials/palette.js';
import { std } from '../../materials/standard.js';
import { metalMat } from '../../materials/metal.js';
import { rbox, cyl, sphere, torus, mk, group } from './util/geo.js';
import { createSafetyTape } from './safetyTape.js';

// 落地型鑽床(總高約 1.6 m)。本地 +Z 為機台正面,整體轉向讓正面朝教室(−X)。
// 由下往上:鑄鐵底座、拋光鋼立柱、可升降工作台(升降搖把、鎖緊把手)、機頭(馬達、皮帶輪、主軸套筒)、三支進給手柄、開關、夾頭、皮帶輪蓋。
export function createDrillPress(parent) {
  const g = group(parent, 'drillPress', DRILL_PRESS.base, [0, -Math.PI / 2, 0]);
  const cast = std(C.castIron), paint = std(C.machineWarm), cream = std(C.machineCream);
  const steel = metalMat(C.steelBright, true), dark = std(C.steelDark), knob = std(C.gripBlack);
  // 底座
  mk(g, rbox(0.42, 0.06, 0.55, 0.012), cast, { pos: [0, 0.03, 0.02] });
  mk(g, rbox(0.3, 0.012, 0.3, 0.004), std(C.steel), { pos: [0, 0.066, 0.08] });
  mk(g, cyl(0.07, 0.08, 0.04, 20), cast, { pos: [0, 0.08, -0.17] });
  // 立柱
  mk(g, cyl(0.036, 0.036, 1.3, 20), steel, { pos: [0, 0.75, -0.17] });
  // 工作台托架 + 齒條 + 搖把 + 鎖緊把手
  const ty = 0.78;
  mk(g, cyl(0.055, 0.055, 0.12, 18), paint, { pos: [0, ty - 0.06, -0.17] });
  mk(g, rbox(0.1, 0.06, 0.2, 0.01), paint, { pos: [0, ty - 0.04, -0.06] });
  mk(g, rbox(0.018, 0.9, 0.012, 0.003), dark, { pos: [0, 0.6, -0.12] });
  const crank = group(g, 'tableCrank', [0.07, ty - 0.06, -0.12]);
  mk(crank, cyl(0.006, 0.006, 0.06, 8), dark, { pos: [0.03, 0, 0], rot: [0, 0, Math.PI / 2] });
  mk(crank, rbox(0.012, 0.08, 0.01, 0.003), dark, { pos: [0.06, -0.035, 0] });
  mk(crank, cyl(0.009, 0.009, 0.04, 10), knob, { pos: [0.075, -0.07, 0], rot: [0, 0, Math.PI / 2] });
  mk(g, cyl(0.005, 0.005, 0.08, 8), dark, { pos: [-0.08, ty - 0.06, -0.17], rot: [0, 0, Math.PI / 2] });
  mk(g, sphere(0.012), knob, { pos: [-0.12, ty - 0.06, -0.17] });
  // 工作台(圓形鑄鐵,帶 T 型槽)
  mk(g, cyl(0.17, 0.16, 0.035, 32), cast, { pos: [0, ty, 0.05] });
  mk(g, rbox(0.3, 0.004, 0.018, 0.001), dark, { pos: [0, ty + 0.018, 0.05] });
  mk(g, rbox(0.018, 0.004, 0.3, 0.001), dark, { pos: [0, ty + 0.018, 0.05] });
  // 機頭
  const hy = 1.32;
  mk(g, rbox(0.24, 0.26, 0.42, 0.03), cream, { pos: [0, hy, -0.04] });
  mk(g, cyl(0.06, 0.06, 0.26, 18), cream, { pos: [0, hy - 0.06, -0.17] });
  // 皮帶輪蓋(頂部)
  mk(g, rbox(0.26, 0.11, 0.52, 0.04), paint, { pos: [0, hy + 0.185, -0.07] });
  mk(g, cyl(0.03, 0.03, 0.02, 14), dark, { pos: [0.0, hy + 0.25, 0.06] });
  // 馬達(後方)
  mk(g, cyl(0.075, 0.075, 0.22, 20), paint, { pos: [0, hy + 0.05, -0.38] });
  mk(g, cyl(0.06, 0.075, 0.03, 20), cast, { pos: [0, hy - 0.075, -0.38] });
  for (let i = 0; i < 5; i++) mk(g, torus(0.076, 0.004, 4, 24), cream, { pos: [0, hy + 0.0 + i * 0.03, -0.38], rot: [Math.PI / 2, 0, 0] });
  // 主軸套筒 + 夾頭
  mk(g, cyl(0.032, 0.032, 0.14, 16), steel, { pos: [0, hy - 0.18, 0.08] });
  mk(g, cyl(0.026, 0.018, 0.07, 16), std(C.steel), { pos: [0, hy - 0.285, 0.08] });
  mk(g, cyl(0.004, 0.003, 0.07, 8), dark, { pos: [0, hy - 0.355, 0.08] });
  // 進給手柄 ×3(右側輪轂)
  const hub = group(g, 'feedHub', [0.13, hy - 0.06, 0.02]);
  mk(hub, cyl(0.035, 0.035, 0.035, 16), dark, { rot: [0, 0, Math.PI / 2] });
  for (let i = 0; i < 3; i++) {
    const a = i * Math.PI * 2 / 3 + 0.4;
    const arm = group(hub, 'feedArm', [0.02, 0, 0], [a, 0, 0]);
    mk(arm, cyl(0.006, 0.006, 0.2, 8), steel, { pos: [0, 0.1, 0] });
    mk(arm, sphere(0.016), knob, { pos: [0, 0.205, 0] });
  }
  // 深度擋圈刻度環
  mk(g, cyl(0.03, 0.03, 0.02, 16), std(C.steel), { pos: [-0.13, hy - 0.06, 0.02], rot: [0, 0, Math.PI / 2] });
  // 開關(正面)
  mk(g, rbox(0.07, 0.1, 0.03, 0.008), std('#E2DED4'), { pos: [0.07, hy + 0.03, 0.19] });
  mk(g, rbox(0.03, 0.02, 0.012, 0.004), std('#8A8F92'), { pos: [0.07, hy + 0.05, 0.208] });
  mk(g, rbox(0.03, 0.02, 0.012, 0.004), std('#C9C2B8'), { pos: [0.07, hy + 0.01, 0.208] });
  // 夾頭鑰匙(掛在側邊)
  mk(g, cyl(0.004, 0.004, 0.05, 6), dark, { pos: [-0.125, hy + 0.05, 0.1] });
  createSafetyTape(g, 0.85, 0.9, [0, 0.05]);
  return g;
}
