import { TIMBER, LUMBER_RACK } from './layout.js';
import { C } from '../../materials/palette.js';
import { woodMat } from '../../materials/wood.js';
import { group, instanced, rbox } from './util/geo.js';

// 斜靠著後牆豎立的長角材(約 2.4 m,比人高)。實例化。
export function createTimberStrips(parent) {
  const g = group(parent, 'timberStrips');
  const lean = 0.17; // 傾角(弧度)
  const H = TIMBER.len * Math.cos(lean), off = TIMBER.len * Math.sin(lean);
  const zWall = LUMBER_RACK.z - 0.05;
  const list = [];
  for (let i = 0; i < TIMBER.count; i++) {
    const x = TIMBER.x + (i - 2) * 0.05 + (i % 2) * 0.01;
    list.push({ pos: [x, H / 2, zWall - off / 2 - (i % 2) * 0.03], rot: [lean, (i - 2) * 0.02, (i - 2) * 0.006], scale: [1, 1, i % 2 ? 0.75 : 1] });
  }
  instanced(g, rbox(0.045, TIMBER.len, 0.045, 0.003), woodMat(C.woodLight, 'grain', 211), list, { name: 'timber' });
  return g;
}
