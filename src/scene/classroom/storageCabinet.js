import { C } from '../../materials/palette.js';
import { std } from '../../materials/standard.js';
import { rbox, cyl, mk, group } from './util/geo.js';

// 前牆右側的落地鋼製材料櫃(淺灰藍烤漆、兩扇門、通風孔、把手),櫃頂放兩個無字紙箱。
export const STORAGE_CABINET = { center: [2.7, 0, -3.56], w: 0.9, d: 0.45, h: 1.9 };
export function createStorageCabinet(parent) {
  const { center, w, d, h } = STORAGE_CABINET;
  const g = group(parent, 'storageCabinet', center);
  const paint = std(C.blueGray, { set: 'metal:painted', roughness: 0.9, metalness: 1 });
  mk(g, rbox(w, h, d, 0.01), paint, { pos: [0, h / 2, 0] });
  mk(g, rbox(w - 0.02, 0.06, d - 0.04, 0.006), std('#6F777C', { roughness: 0.7 }), { pos: [0, 0.03, 0.01] });
  for (const s of [-1, 1]) {
    mk(g, rbox(w / 2 - 0.015, h - 0.1, 0.012, 0.004), paint, { pos: [s * (w / 4), h / 2 + 0.03, d / 2 + 0.005] });
    mk(g, rbox(0.016, 0.16, 0.02, 0.005), std(C.steelDark), { pos: [s * 0.04, h * 0.52, d / 2 + 0.02] });
    for (let i = 0; i < 6; i++) mk(g, rbox(0.12, 0.006, 0.004, 0.002), std('#5D6469', { roughness: 0.7 }), { pos: [s * (w / 4), h - 0.2 - i * 0.022, d / 2 + 0.012] });
  }
  const kraft = std('#C9B79C', { roughness: 0.95 }), tape = std('#DCD4C4', { roughness: 0.7 });
  mk(g, rbox(0.42, 0.26, 0.34, 0.006), kraft, { pos: [-0.18, h + 0.13, 0] });
  mk(g, rbox(0.06, 0.262, 0.342, 0.002), tape, { pos: [-0.18, h + 0.13, 0] });
  mk(g, rbox(0.32, 0.18, 0.3, 0.006), kraft, { pos: [0.22, h + 0.09, 0.02], rot: [0, 0.12, 0] });
  return g;
}
