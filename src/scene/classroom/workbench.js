import { C } from '../../materials/palette.js';
import { woodMat } from '../../materials/wood.js';
import { rbox, mk, group, markNear } from './util/geo.js';
import { WORKBENCH } from './layout.js';

// 工作桌:5 cm 厚櫸木集成材桌面(1.6 × 0.9 m)、四支方腳、下層橫撐與置物層板。沒有背板。
// center 為桌面中心(桌面上緣高度)。near=true 時參與即時陰影。
export function createWorkbench(parent, center = WORKBENCH.center, { near = true, name = 'workbench' } = {}) {
  const [cx, cy, cz] = center;
  const g = group(parent, name, [cx, 0, cz]);
  const { w, d, t } = WORKBENCH.top, L = WORKBENCH.leg;
  const top = woodMat(C.beech, 'laminate', 13), frame = woodMat(C.woodMid, 'grain', 17);
  mk(g, rbox(w, t, d, 0.008), top, { pos: [0, cy - t / 2, 0], name: 'benchTop' });
  // 桌面下的牙板
  const apronH = 0.09, inset = 0.07;
  mk(g, rbox(w - inset * 2, apronH, 0.025), frame, { pos: [0, cy - t - apronH / 2, -d / 2 + inset] });
  mk(g, rbox(w - inset * 2, apronH, 0.025), frame, { pos: [0, cy - t - apronH / 2, d / 2 - inset] });
  mk(g, rbox(0.025, apronH, d - inset * 2), frame, { pos: [-w / 2 + inset, cy - t - apronH / 2, 0] });
  mk(g, rbox(0.025, apronH, d - inset * 2), frame, { pos: [w / 2 - inset, cy - t - apronH / 2, 0] });
  // 四支方腳
  const legH = cy - t;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    mk(g, rbox(L, legH, L, 0.006), frame, { pos: [sx * (w / 2 - inset), legH / 2, sz * (d / 2 - inset)] });
  }
  // 下層橫撐(離地 15 cm)與左右側撐
  const sy = 0.15;
  for (const sz of [-1, 1]) mk(g, rbox(w - inset * 2, 0.045, 0.035), frame, { pos: [0, sy, sz * (d / 2 - inset)] });
  for (const sx of [-1, 1]) mk(g, rbox(0.035, 0.045, d - inset * 2), frame, { pos: [sx * (w / 2 - inset), sy, 0] });
  // 下層置物板(只鋪後半,讓腳可以伸進去)
  mk(g, rbox(w - inset * 2 - 0.04, 0.018, 0.3, 0.004), top, { pos: [0, sy + 0.032, -d / 2 + inset + 0.17] });
  if (near) markNear(g);
  return g;
}
