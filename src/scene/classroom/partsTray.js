import * as THREE from 'three';
import { C } from '../../materials/palette.js';
import { std } from '../../materials/standard.js';
import { rbox, cyl, mk, group, instanced } from './util/geo.js';
import { rng } from '../../materials/canvasTex.js';

// 零件盤:淺灰金屬方盤,三格,裝螺絲、螺帽、華司(實例化)。底面 y=0。
export function createPartsTray(parent, { pos, rot, seed = 1, w = 0.13, d = 0.085 } = {}) {
  const g = group(parent, 'partsTray', pos, rot);
  const tray = std(C.steel);
  const t = 0.0015, h = 0.022;
  mk(g, rbox(w, t, d, 0.0007), tray, { pos: [0, t / 2, 0] });
  for (const s of [-1, 1]) {
    mk(g, rbox(w, h, t, 0.0007), tray, { pos: [0, h / 2, s * (d / 2 - t / 2)] });
    mk(g, rbox(t, h, d, 0.0007), tray, { pos: [s * (w / 2 - t / 2), h / 2, 0] });
    mk(g, rbox(t, h * 0.8, d, 0.0007), tray, { pos: [s * w / 6, h * 0.4, 0] });
  }
  const r = rng(seed), cell = w / 3;
  const scatter = (cx, n, y0) => Array.from({ length: n }, () => ({ pos: [cx + (r() - 0.5) * cell * 0.7, y0 + r() * 0.004, (r() - 0.5) * d * 0.75], rot: [r() * 0.4, r() * 6, r() * 0.4] }));
  // 螺絲(平躺)
  const screws = Array.from({ length: 11 }, () => ({ pos: [-cell + (r() - 0.5) * cell * 0.7, 0.004 + r() * 0.003, (r() - 0.5) * d * 0.7], rot: [Math.PI / 2 + (r() - 0.5) * 0.3, 0, r() * 6] }));
  instanced(g, cyl(0.0018, 0.0018, 0.022, 6), std(C.steelBright), screws, { name: 'screws' });
  instanced(g, cyl(0.0038, 0.0038, 0.0025, 10), std(C.steelBright), screws.map(s => ({ pos: [s.pos[0], s.pos[1], s.pos[2]], rot: s.rot })), { name: 'screwHeads' });
  instanced(g, cyl(0.0042, 0.0042, 0.0032, 6), std(C.steel), scatter(0, 12, 0.003), { name: 'nuts' });
  instanced(g, new THREE.TorusGeometry(0.0045, 0.0013, 4, 14), std(C.alu), scatter(cell, 14, 0.003).map(t => ({ ...t, rot: [Math.PI / 2 + t.rot[0] * 0.3, 0, 0] })), { name: 'washers' });
  return g;
}
