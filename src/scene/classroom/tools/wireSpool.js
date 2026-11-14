import { C } from '../../../materials/palette.js';
import { toon } from '../../../materials/toon.js';
import { cyl, mk, group } from '../util/geo.js';

// 線軸/線捆:兩片灰色側盤 + 中間捲線。kind: copper | aluminum | solder | wireGray | wireBlack。軸線沿本地 Z(掛在橫桿上)。
const SPEC = {
  copper: { wire: C.copperMuted, flange: null, r: 0.045, w: 0.03 },   // 銅線捆(無側盤,壓低飽和)
  aluminum: { wire: '#D9DCDD', flange: null, r: 0.05, w: 0.03 },
  solder: { wire: '#C3C7CA', flange: '#8E9396', r: 0.03, w: 0.03 },
  wireGray: { wire: '#9EA2A5', flange: null, r: 0.06, w: 0.04 },
  wireBlack: { wire: '#45494C', flange: null, r: 0.06, w: 0.04 },
};
export function createWireSpool(parent, { pos, rot, kind = 'copper' } = {}) {
  const s = SPEC[kind], g = group(parent, `spool-${kind}`, pos, rot);
  const wire = toon(s.wire);
  if (s.flange) {
    const f = toon(s.flange);
    for (const z of [-s.w / 2, s.w / 2]) mk(g, cyl(s.r + 0.008, s.r + 0.008, 0.004, 20), f, { pos: [0, 0, z], rot: [Math.PI / 2, 0, 0] });
    mk(g, cyl(s.r * 0.9, s.r * 0.9, s.w - 0.004, 20), wire, { rot: [Math.PI / 2, 0, 0] });
  } else {
    // 線捆:環狀,外圈加幾道細環表現捲繞
    mk(g, cyl(s.r, s.r, s.w, 22, true), wire, { rot: [Math.PI / 2, 0, 0] });
    mk(g, cyl(s.r * 0.62, s.r * 0.62, s.w, 18, true), wire, { rot: [Math.PI / 2, 0, 0] });
    mk(g, cyl(s.r, s.r, 0.002, 22), wire, { pos: [0, 0, s.w / 2], rot: [Math.PI / 2, 0, 0] });
  }
  return g;
}
