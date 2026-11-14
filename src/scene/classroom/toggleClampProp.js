import * as THREE from 'three';
import { C } from '../../materials/palette.js';
import { toon } from '../../materials/toon.js';
import { metalMat } from '../../materials/metal.js';
import { rbox, cyl, mk, group, markNear, markDynamic, tube } from './util/geo.js';

// 水平式肘節夾鉗(彩蛋「壓罐機」入口)。灰色金屬、握把奶油色橡膠套。
// 底座朝 +X 以兩支 F 夾固定在桌邊,夾臂伸向 −X。回傳的群組本身就是掛載點 toggleEgg。
export function createToggleClamp(parent, pos) {
  const g = group(parent, 'toggleClamp', pos);
  g.userData.anchor = 'toggleEgg';
  const metal = metalMat(C.steel, true), dark = toon(C.steelDark), rubber = toon(C.rubberCream), pad = toon('#4A4E52');
  // 底座(L 形板)
  mk(g, rbox(0.075, 0.006, 0.045, 0.002), metal, { pos: [0, 0.003, 0] });
  for (const z of [-0.016, 0.016]) mk(g, rbox(0.05, 0.035, 0.004, 0.0015), metal, { pos: [0.005, 0.02, z] });
  // 樞軸
  for (const x of [-0.012, 0.022]) mk(g, cyl(0.004, 0.004, 0.04, 10), dark, { pos: [x, 0.032, 0], rot: [Math.PI / 2, 0, 0] });
  // 夾臂(水平伸出)+ 螺桿 + 橡膠壓頭
  const arm = group(g, 'arm', [-0.012, 0.032, 0]);
  for (const z of [-0.011, 0.011]) mk(arm, rbox(0.09, 0.012, 0.004, 0.0015), metal, { pos: [-0.04, 0.004, z] });
  mk(arm, cyl(0.0035, 0.0035, 0.06, 10), toon(C.steelBright), { pos: [-0.075, -0.012, 0] });
  for (const y of [0.012, -0.004]) mk(arm, cyl(0.006, 0.006, 0.004, 6), dark, { pos: [-0.075, y, 0] });
  mk(arm, cyl(0.009, 0.009, 0.01, 14), pad, { pos: [-0.075, -0.045, 0] });
  // 握把(往上翹)+ 奶油色橡膠套
  const handle = group(g, 'handle', [0.022, 0.032, 0], [0, 0, 0.35]);
  for (const z of [-0.009, 0.009]) mk(handle, rbox(0.05, 0.01, 0.004, 0.0015), metal, { pos: [0.025, 0, z] });
  mk(handle, cyl(0.0045, 0.0045, 0.06, 10), metal, { pos: [0.075, 0.003, 0], rot: [0, 0, Math.PI / 2] });
  mk(handle, cyl(0.0085, 0.0075, 0.09, 14), rubber, { pos: [0.115, 0.003, 0], rot: [0, 0, Math.PI / 2] });
  markNear(g); markDynamic(g);
  return g;
}

/** 三個空鐵罐(拉絲鋁色、無標籤)。每個罐子是一個掛載點 Object3D。 */
export function createCans(parent, positions) {
  const mat = metalMat(C.alu, true), rim = toon(C.steelBright);
  return positions.map((p, i) => {
    const g = group(parent, `can${i}`, p);
    g.userData.anchor = 'can';
    const h = 0.122, r = 0.033;
    mk(g, cyl(r, r, h - 0.012, 24), mat, { pos: [0, h / 2, 0] });
    mk(g, cyl(r * 0.92, r, 0.008, 24), rim, { pos: [0, h - 0.004, 0] });
    mk(g, cyl(r, r * 0.88, 0.008, 24), rim, { pos: [0, 0.004, 0] });
    mk(g, cyl(r * 0.8, r * 0.8, 0.002, 20), toon(C.steel), { pos: [0, h + 0.001, 0] });
    markNear(g); markDynamic(g);
    return g;
  });
}
