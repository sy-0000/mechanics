import { C } from '../../materials/palette.js';
import { toon } from '../../materials/toon.js';
import { rbox, cyl, mk, group, markDynamic } from './util/geo.js';

// 吊扇:吊桿、馬達殼、四片奶油白扇葉,緩慢轉動(可在設定中關閉)。
export function createCeilingFan(parent, pos) {
  const g = group(parent, 'ceilingFan', pos);
  const body = toon('#EDE8DC'), blade = toon('#F2EEE4'), metal = toon(C.steel);
  mk(g, cyl(0.07, 0.08, 0.04, 16), body, { pos: [0, -0.02, 0] });
  mk(g, cyl(0.012, 0.012, 0.35, 8), metal, { pos: [0, -0.2, 0] });
  const rotor = group(g, 'rotor', [0, -0.42, 0]);
  mk(rotor, cyl(0.1, 0.11, 0.1, 20), body, {});
  mk(rotor, cyl(0.04, 0.02, 0.04, 12), body, { pos: [0, -0.07, 0] });
  for (let i = 0; i < 4; i++) {
    const arm = group(rotor, 'blade', [0, 0, 0], [0, (i * Math.PI) / 2, 0]);
    mk(arm, rbox(0.12, 0.012, 0.03, 0.003), metal, { pos: [0.14, -0.01, 0] });
    mk(arm, rbox(0.5, 0.01, 0.13, 0.004), blade, { pos: [0.45, -0.015, 0], rot: [0.12, 0, 0] });
  }
  markDynamic(rotor);
  return { group: g, rotor };
}
