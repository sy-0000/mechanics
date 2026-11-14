import * as THREE from 'three';
import { C } from '../../materials/palette.js';
import { std } from '../../materials/standard.js';
import { woodMat } from '../../materials/wood.js';
import { rbox, cyl, sphere, mk, group, markNear } from './util/geo.js';

// 木工虎鉗:裝在桌面左端(朝 −X)。灰色鑄鐵鉗身、木製鉗口襯板、鋼製螺桿與 T 型手柄。
// 參數 pos 為桌面左端面中心(桌面上緣高度)。
export function createBenchVise(parent, pos) {
  const g = group(parent, 'benchVise', pos);
  const iron = std(C.machineWarm), dark = std(C.castIron), steel = std(C.steelBright), pad = woodMat(C.woodMid, 'grain', 51);
  // 固定鉗口(貼著桌端)
  mk(g, rbox(0.03, 0.11, 0.24, 0.006), iron, { pos: [-0.015, -0.055, 0] });
  mk(g, rbox(0.012, 0.09, 0.22, 0.003), pad, { pos: [-0.036, -0.045, 0] });
  // 活動鉗口(張開約 6 cm)
  const open = 0.06;
  mk(g, rbox(0.012, 0.09, 0.22, 0.003), pad, { pos: [-0.042 - open, -0.045, 0] });
  mk(g, rbox(0.035, 0.12, 0.25, 0.006), iron, { pos: [-0.066 - open, -0.06, 0] });
  // 導桿與螺桿
  for (const z of [-0.08, 0.08]) mk(g, cyl(0.009, 0.009, 0.26, 10), steel, { pos: [-0.06, -0.1, z], rot: [0, 0, Math.PI / 2] });
  mk(g, cyl(0.012, 0.012, 0.3, 12), steel, { pos: [-0.08, -0.1, 0], rot: [0, 0, Math.PI / 2] });
  // 手柄
  mk(g, cyl(0.018, 0.018, 0.03, 12), dark, { pos: [-0.135 - open, -0.1, 0], rot: [0, 0, Math.PI / 2] });
  mk(g, cyl(0.007, 0.007, 0.24, 8), steel, { pos: [-0.15 - open, -0.1, 0], rot: [0.5, 0, 0] });
  mk(g, sphere(0.013), dark, { pos: [-0.15 - open, -0.1 + Math.sin(0.5) * 0.12, Math.cos(0.5) * 0.12] });
  mk(g, sphere(0.013), dark, { pos: [-0.15 - open, -0.1 - Math.sin(0.5) * 0.12, -Math.cos(0.5) * 0.12] });
  // 鎖在桌底的托架
  mk(g, rbox(0.12, 0.02, 0.18, 0.004), dark, { pos: [0.05, -0.06, 0] });
  return markNear(g);
}
