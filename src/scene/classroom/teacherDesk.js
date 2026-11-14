import * as THREE from 'three';
import { TEACHER_DESK } from './layout.js';
import { C } from '../../materials/palette.js';
import { toon } from '../../materials/toon.js';
import { woodMat } from '../../materials/wood.js';
import { rbox, cyl, mk, group, lathe, torus } from './util/geo.js';

// 講桌:木製,1.2 × 0.6 × 1.0 m,前方(朝學生)有面板。桌上:粉筆盒、闔起的教師手冊(封面無字)、馬克杯。
export function createTeacherDesk(parent) {
  const { center, w, d, h } = TEACHER_DESK;
  const g = group(parent, 'teacherDesk', center);
  const body = woodMat(C.woodMid, 'grain', 81), top = woodMat(C.beech, 'laminate', 83), trim = woodMat(C.woodFrame, 'grain', 85);
  mk(g, rbox(w, 0.04, d, 0.008), top, { pos: [0, h - 0.02, 0] });
  // 前面板(朝 +Z,學生方向)與兩側板
  mk(g, rbox(w - 0.04, h - 0.1, 0.025, 0.006), body, { pos: [0, (h - 0.04) / 2 + 0.03, d / 2 - 0.03] });
  for (const s of [-1, 1]) mk(g, rbox(0.03, h - 0.04, d - 0.04, 0.006), body, { pos: [s * (w / 2 - 0.035), (h - 0.04) / 2, 0] });
  mk(g, rbox(w - 0.02, 0.06, 0.03, 0.006), trim, { pos: [0, 0.03, d / 2 - 0.035] });
  // 前面板裝飾框線
  mk(g, rbox(w - 0.3, h * 0.55, 0.01, 0.003), trim, { pos: [0, h * 0.5, d / 2 - 0.013] });
  mk(g, rbox(w - 0.34, h * 0.55 - 0.04, 0.012, 0.003), body, { pos: [0, h * 0.5, d / 2 - 0.01] });
  // 抽屜(教師側)
  mk(g, rbox(w - 0.1, 0.12, 0.02, 0.004), body, { pos: [0, h - 0.12, -d / 2 + 0.02] });
  mk(g, rbox(0.1, 0.015, 0.02, 0.004), toon(C.steelDark), { pos: [0, h - 0.12, -d / 2 + 0.005] });

  const y = h;
  // 粉筆盒(灰白紙盒,蓋子半開)
  const box = group(g, 'chalkBox', [-0.35, y, 0.05], [0, 0.3, 0]);
  mk(box, rbox(0.1, 0.06, 0.07, 0.003), toon('#E8E4DA'), { pos: [0, 0.03, 0] });
  for (let i = 0; i < 5; i++) mk(box, cyl(0.0055, 0.0055, 0.06, 8), toon(i === 2 ? '#B2C8DC' : '#F4F1E8'), { pos: [-0.03 + i * 0.015, 0.066, 0], rot: [Math.PI / 2, 0, 0] });
  mk(box, rbox(0.1, 0.004, 0.07, 0.0015), toon('#DCD7CB'), { pos: [0, 0.075, -0.05], rot: [-1.1, 0, 0] });
  // 教師手冊:淡藍灰封面,無字
  const book = group(g, 'teacherBook', [0.1, y, -0.02], [0, -0.12, 0]);
  mk(book, rbox(0.21, 0.025, 0.297, 0.004), toon(C.blueGray), { pos: [0, 0.0125, 0] });
  mk(book, rbox(0.2, 0.021, 0.29, 0.002), toon('#F6F2E7'), { pos: [0.006, 0.0125, 0] });
  // 馬克杯:霧粉色
  const mug = group(g, 'mug', [0.42, y, 0.08]);
  mk(mug, lathe([[0, 0], [0.04, 0], [0.042, 0.005], [0.042, 0.095], [0.038, 0.095], [0.036, 0.008], [0, 0.008]], 24), toon(C.mistPink), {});
  mk(mug, torus(0.026, 0.0065, 8, 16, Math.PI * 1.2), toon(C.mistPink), { pos: [0.045, 0.05, 0], rot: [0, 0, -Math.PI * 0.6] });
  mk(mug, cyl(0.036, 0.036, 0.002, 20), toon('#9C8676'), { pos: [0, 0.075, 0], outline: false });
  return g;
}
