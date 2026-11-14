import { BAND_SAW } from './layout.js';
import { C } from '../../materials/palette.js';
import { std } from '../../materials/standard.js';
import { metalMat } from '../../materials/metal.js';
import { rbox, cyl, sphere, mk, group } from './util/geo.js';
import { createSafetyTape } from './safetyTape.js';

// 帶鋸機(總高約 1.65 m,含落地底座)。本地 +Z 為正面,轉向朝教室。
// C 字形機身:上下鋸輪藏在有門的輪罩內;中間約 38 cm 見方的鑄鐵工作台(下方耳軸);可升降的鋸片護罩導柱;頂部張力旋鈕。
export function createBandSaw(parent) {
  const g = group(parent, 'bandSaw', BAND_SAW.base, [0, -Math.PI / 2, 0]);
  const cast = std(C.castIron), paint = std(C.machineCream), warm = std(C.machineWarm);
  const steel = metalMat(C.steelBright, true), dark = std(C.steelDark), knob = std(C.gripBlack);
  // 落地底座(梯形鋼架 + 封板)
  mk(g, rbox(0.5, 0.05, 0.45, 0.01), cast, { pos: [0, 0.025, 0] });
  mk(g, rbox(0.42, 0.6, 0.38, 0.015), warm, { pos: [0, 0.35, 0] });
  mk(g, rbox(0.3, 0.32, 0.01, 0.004), paint, { pos: [0, 0.38, 0.195] });
  mk(g, cyl(0.012, 0.012, 0.012, 10), dark, { pos: [0.11, 0.38, 0.203], rot: [Math.PI / 2, 0, 0] });
  // 下輪罩
  const fx = -0.05;
  mk(g, rbox(0.44, 0.34, 0.2, 0.05), paint, { pos: [fx, 0.83, 0] });
  mk(g, rbox(0.38, 0.28, 0.012, 0.03), warm, { pos: [fx, 0.83, 0.104] }); // 門
  mk(g, rbox(0.02, 0.06, 0.02, 0.006), knob, { pos: [fx + 0.17, 0.83, 0.115] });
  // 立柱(C 字背脊,偏左)
  mk(g, rbox(0.1, 0.5, 0.16, 0.03), paint, { pos: [fx - 0.15, 1.2, 0] });
  // 上輪罩
  mk(g, rbox(0.44, 0.34, 0.2, 0.05), paint, { pos: [fx, 1.43, 0] });
  mk(g, rbox(0.38, 0.28, 0.012, 0.03), warm, { pos: [fx, 1.43, 0.104] });
  mk(g, rbox(0.02, 0.06, 0.02, 0.006), knob, { pos: [fx + 0.17, 1.43, 0.115] });
  // 張力旋鈕(頂部)
  mk(g, cyl(0.006, 0.006, 0.06, 8), dark, { pos: [fx + 0.02, 1.63, 0] });
  mk(g, cyl(0.03, 0.03, 0.02, 16), knob, { pos: [fx + 0.02, 1.65, 0] });
  // 工作台 38 cm 見方 + 耳軸 + 鋸縫
  const ty = 1.05, tx = fx + 0.07;
  mk(g, rbox(0.38, 0.03, 0.38, 0.006), cast, { pos: [tx, ty, 0.04] });
  mk(g, rbox(0.004, 0.032, 0.17, 0.001), dark, { pos: [tx, ty, 0.15] });
  for (const s of [-1, 1]) mk(g, cyl(0.06, 0.06, 0.02, 20, false), cast, { pos: [tx, ty - 0.06, 0.04 + s * 0.07], rot: [Math.PI / 2, 0, 0], scale: [1, 1, 1] });
  mk(g, rbox(0.12, 0.04, 0.2, 0.008), cast, { pos: [tx, ty - 0.1, 0.04] });
  mk(g, cyl(0.006, 0.006, 0.08, 8), dark, { pos: [tx, ty - 0.08, 0.2], rot: [Math.PI / 2, 0, 0] });
  mk(g, sphere(0.014), knob, { pos: [tx, ty - 0.08, 0.24] });
  // 鋸片(可見段)+ 護罩導柱
  mk(g, rbox(0.012, 0.22, 0.0008, 0.0002), std(C.steelBright), { pos: [tx, ty + 0.12, 0.04], rot: [0, Math.PI / 2, 0] });
  mk(g, rbox(0.018, 0.23, 0.018, 0.004), steel, { pos: [tx, ty + 0.22, 0.02] });
  mk(g, rbox(0.04, 0.07, 0.035, 0.006), warm, { pos: [tx, ty + 0.12, 0.03] });
  mk(g, cyl(0.009, 0.009, 0.04, 10), knob, { pos: [tx - 0.04, ty + 0.3, 0.0], rot: [0, 0, Math.PI / 2] });
  // 開關盒(側面)
  mk(g, rbox(0.07, 0.1, 0.05, 0.008), std('#E2DED4'), { pos: [fx - 0.15, 1.15, 0.1] });
  mk(g, rbox(0.035, 0.022, 0.014, 0.004), std('#8A8F92'), { pos: [fx - 0.15, 1.17, 0.128] });
  createSafetyTape(g, 0.9, 1.0, [0, 0.12]);
  return g;
}
