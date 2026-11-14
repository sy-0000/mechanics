import * as THREE from 'three';
import { std } from '../../../materials/standard.js';
import { cyl, mk, group } from '../util/geo.js';

// 鉛筆:六角筆桿(淡藍灰)、削尖的木色筆尖、石墨芯。沿本地 +X。
export function createPencil(parent, { pos, rot } = {}) {
  const g = group(parent, 'pencil', pos, rot);
  mk(g, cyl(0.0038, 0.0038, 0.16, 6), std('#AFBCC6'), { rot: [0, 0, Math.PI / 2] });
  mk(g, cyl(0.0008, 0.0038, 0.02, 6), std('#E3D2B4'), { pos: [0.09, 0, 0], rot: [0, 0, -Math.PI / 2] });
  mk(g, cyl(0.0001, 0.0009, 0.005, 6), std('#55585A'), { pos: [0.1015, 0, 0], rot: [0, 0, -Math.PI / 2] });
  mk(g, cyl(0.0039, 0.0039, 0.012, 10), std('#C9CDD0'), { pos: [-0.086, 0, 0], rot: [0, 0, Math.PI / 2] });
  return g;
}
