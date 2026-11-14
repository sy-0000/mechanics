import * as THREE from 'three';
import { C } from '../../materials/palette.js';
import { std } from '../../materials/standard.js';
import { lathe, rbox, mk, group } from './util/geo.js';

// 角落的垃圾桶與回收桶:右牆吊櫃下方的空地,兩個有蓋方桶(大型物件,vr 保留,材質併入既有批次)。
// 蓋子關上。資源回收只用圖示(三箭頭環),無文字。
export const BINS = [[3.03, 0, -3.05, '#8F9599', 'trash'], [3.03, 0, -2.62, C.blueGray, 'recycle']];
export function createRecycleBins(main) {
  BINS.forEach(([x, y, z, color, kind]) => {
    const g = group(main, `bin-${kind}`, [x, y, z], [0, -Math.PI / 2, 0]);
    const body = std(color, { roughness: 0.6 });
    // 上寬下窄的方桶(以 4 段 lathe 做成方形斷面)
    mk(g, lathe([[0.001, 0], [0.15, 0], [0.18, 0.6], [0.001, 0.6]], 4), body, { rot: [0, Math.PI / 4, 0], scale: [1, 1, 0.82] });
    // 蓋子:關上
    mk(g, rbox(0.27, 0.02, 0.23, 0.008), std('#E3E3DE', { roughness: 0.6 }), { pos: [0, 0.61, 0] });
    if (kind === 'recycle') {
      // 回收圖示:三段箭頭環(淺色浮貼)
      for (let i = 0; i < 3; i++) mk(g, new THREE.TorusGeometry(0.045, 0.006, 4, 10, Math.PI * 0.5), std('#E3E3DE', { roughness: 0.6 }), { pos: [0, 0.34, 0.128], rot: [0.08, 0, i * Math.PI * 2 / 3] });
    }
  });
}
