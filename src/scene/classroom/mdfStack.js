import { MDF } from './layout.js';
import { C } from '../../materials/palette.js';
import { woodMat } from '../../materials/wood.js';
import { std } from '../../materials/standard.js';
import { rbox, group, instanced, mk } from './util/geo.js';
import { rng } from '../../materials/canvasTex.js';

// 平放疊放的十幾片大密集板(2.44 × 1.22 m,9~18 mm),最上面幾片稍微錯位。實例化。
// 板材深度方向 1.22 m 超出層架深度,疊在底層托樑與地面墊木上,向前凸出(真實木料架常見)。
export function createMdfStack(parent, [x, y, z]) {
  const g = group(parent, 'mdfStack');
  const r = rng(13), sheets = [];
  let h = y + 0.04;
  // 墊木
  for (const dx of [-0.9, 0, 0.9]) mk(g, rbox(0.07, 0.07, 1.2, 0.005), woodMat(C.woodFrame, 'grain', 201), { pos: [x + dx, y - 0.005 + 0.0, z - 0.29] });
  for (let i = 0; i < MDF.count; i++) {
    const t = [0.009, 0.012, 0.015, 0.018][(r() * 4) | 0];
    const top = i >= MDF.count - 3;
    sheets.push({
      pos: [x + (top ? (r() - 0.5) * 0.08 : (r() - 0.5) * 0.008), h + t / 2, z - 0.29 + (top ? (r() - 0.5) * 0.06 : (r() - 0.5) * 0.006)],
      rot: [0, top ? (r() - 0.5) * 0.04 : 0, 0], scale: [1, t / 0.015, 1],
      color: i % 2 ? '#F2F2F2' : '#E4E4E4',
    });
    h += t;
  }
  instanced(g, rbox(MDF.w, 0.015, MDF.d, 0.002), woodMat(C.mdf, 'grain', 203), sheets, { name: 'mdfSheets' });
  return g;
}
