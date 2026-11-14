import { C } from '../../materials/palette.js';
import { std } from '../../materials/standard.js';
import { woodMat } from '../../materials/wood.js';
import { rbox, cyl, mk, group, tube } from './util/geo.js';

// 掃具櫃:前牆左側角落的窄鋼櫃(淺灰藍烤漆,與材料櫃同材質 → 併入同一批次),大型物件,vr 保留。
// 旁邊斜靠一支掃把、地上一個畚箕(小物,details 群組,只在 high 顯示)。
export const BROOM_CABINET = { center: [-2.68, 0, -3.59], w: 0.5, d: 0.4, h: 1.75 };
export function createBroomCabinet(main, details) {
  const { center, w, d, h } = BROOM_CABINET;
  const g = group(main, 'broomCabinet', center);
  const paint = std(C.blueGray, { set: 'metal:painted', roughness: 0.9, metalness: 1 });
  mk(g, rbox(w, h, d, 0.01), paint, { pos: [0, h / 2, 0] });
  mk(g, rbox(w - 0.03, h - 0.08, 0.012, 0.004), paint, { pos: [0, h / 2 + 0.02, d / 2 + 0.005] });          // 門
  mk(g, rbox(0.016, 0.14, 0.02, 0.005), std(C.steelDark), { pos: [w / 2 - 0.06, h * 0.55, d / 2 + 0.02] }); // 把手
  for (let i = 0; i < 5; i++) mk(g, rbox(0.16, 0.006, 0.004, 0.002), std('#5D6469', { roughness: 0.7 }), { pos: [0, h - 0.18 - i * 0.022, d / 2 + 0.012] });
  for (let i = 0; i < 5; i++) mk(g, rbox(0.16, 0.006, 0.004, 0.002), std('#5D6469', { roughness: 0.7 }), { pos: [0, 0.2 + i * 0.022, d / 2 + 0.012] });
  mk(g, rbox(w - 0.02, 0.05, d - 0.03, 0.006), std('#6F777C', { roughness: 0.7 }), { pos: [0, 0.025, 0.01] });

  // 掃把(斜靠在櫃子右側)與畚箕
  const s = group(details, 'broomSet', [center[0] + w / 2 + 0.06, 0, center[2] + 0.05]);
  const br = group(s, 'broom', [0, 0, 0], [0.12, 0.3, -0.08]);
  mk(br, cyl(0.012, 0.012, 1.15, 10), woodMat(C.woodLight, 'grain'), { pos: [0, 0.68, 0] });
  mk(br, rbox(0.26, 0.05, 0.05, 0.01), std('#8E949A', { roughness: 0.6 }), { pos: [0, 0.1, 0] });
  mk(br, rbox(0.25, 0.08, 0.035, 0.008), std('#C9BFA8', { roughness: 0.9 }), { pos: [0, 0.04, 0] });   // 掃把毛
  const pan = group(s, 'dustpan', [0.1, 0, 0.22], [0, -0.4, 0]);
  mk(pan, rbox(0.24, 0.006, 0.2, 0.003), std('#8E949A', { roughness: 0.6 }), { pos: [0, 0.003, 0] });
  mk(pan, rbox(0.24, 0.06, 0.006, 0.003), std('#8E949A', { roughness: 0.6 }), { pos: [0, 0.03, -0.1] });
  mk(pan, rbox(0.03, 0.02, 0.18, 0.006), std('#8E949A', { roughness: 0.6 }), { pos: [0, 0.07, -0.18], rot: [0.5, 0, 0] });
  return g;
}
