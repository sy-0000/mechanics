import { createWorkbench } from './workbench.js';
import { group } from './util/geo.js';
import { OTHER_BENCHES } from './layout.js';
import { paperMat } from '../../materials/paper.js';
import { mk, rbox } from './util/geo.js';
import * as THREE from 'three';

// 學生左側另外兩張同款工作桌(幾乎沒有散落物),屬遠景,不參與即時陰影。
export function createOtherBenches(parent) {
  const g = group(parent, 'otherBenches');
  OTHER_BENCHES.forEach((c, i) => createWorkbench(g, c, { near: false, name: `otherBench${i}` }));
  // 第二張桌上只放一張圖紙
  const [x, y, z] = OTHER_BENCHES[1];
  mk(g, new THREE.PlaneGeometry(0.42, 0.297), paperMat(9), { pos: [x + 0.35, y + 0.002, z - 0.1], rot: [-Math.PI / 2, 0, 0.3], outline: false });
  return g;
}
