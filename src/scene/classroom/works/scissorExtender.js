import { C } from '../../../materials/palette.js';
import { woodMat } from '../../../materials/wood.js';
import { std } from '../../../materials/standard.js';
import { rbox, cyl, mk, group } from '../util/geo.js';

// 木製伸縮夾(剪刀式連桿):交叉的木條、圓木銷,前端一對夾爪,後端兩支握把。站立展示在小座上。
export function createScissorExtender(parent, { pos, rot } = {}) {
  const g = group(parent, 'scissorExtender', pos, rot);
  const slat = woodMat(C.woodLight, 'grain', 251), pin = std('#D9CDBB');
  const n = 4, L = 0.09, a = 0.55, dx = L * Math.cos(a);
  for (let i = 0; i < n; i++) {
    const x = -0.15 + i * dx;
    mk(g, rbox(L + 0.01, 0.012, 0.004, 0.002), slat, { pos: [x + dx / 2, 0.1, 0.004], rot: [0, 0, a] });
    mk(g, rbox(L + 0.01, 0.012, 0.004, 0.002), slat, { pos: [x + dx / 2, 0.1, -0.004], rot: [0, 0, -a] });
    mk(g, cyl(0.004, 0.004, 0.014, 8), pin, { pos: [x + dx / 2, 0.1, 0], rot: [Math.PI / 2, 0, 0] });
  }
  const xe = -0.15 + n * dx;
  for (const s of [-1, 1]) mk(g, rbox(0.04, 0.01, 0.004, 0.002), slat, { pos: [xe + 0.02, 0.1 + s * 0.03, 0], rot: [0, 0, -s * 0.2] });
  for (const s of [-1, 1]) mk(g, rbox(0.06, 0.014, 0.004, 0.002), slat, { pos: [-0.17, 0.1 + s * 0.03, 0], rot: [0, 0, s * 0.3] });
  mk(g, rbox(0.12, 0.012, 0.05, 0.003), woodMat(C.woodMid, 'grain', 253), { pos: [0, 0.006, 0] });
  mk(g, rbox(0.012, 0.09, 0.012, 0.002), woodMat(C.woodMid, 'grain', 253), { pos: [0, 0.055, 0] });
  return g;
}
