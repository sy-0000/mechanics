import { createWorkbench } from './workbench.js';
import { group } from './util/geo.js';
import { OTHER_BENCHES } from './layout.js';
import { paperMat } from '../../materials/paper.js';
import { mk, rbox } from './util/geo.js';
import * as THREE from 'three';
import { woodMat } from '../../materials/wood.js';
import { createSteelRuler } from './tools/steelRuler.js';
import { createSandingBlock } from './tools/sandingBlock.js';
import { createTapeMeasure } from './tools/tapeMeasure.js';
import { createSetSquare } from './tools/setSquare.js';
import { createUtilityKnife } from './tools/utilityKnife.js';
import { buildGlueBottle } from './tools/glueBottle.js';
import { createPartsTray } from './partsTray.js';

// 學生左側另外兩張同款工作桌,桌上有少量作業中的小道具。
export function createOtherBenches(parent) {
  const g = group(parent, 'otherBenches');
  OTHER_BENCHES.forEach((c, i) => createWorkbench(g, c, { near: false, name: `otherBench${i}` }));
  // 第二張桌上只放一張圖紙
  const [x, y, z] = OTHER_BENCHES[1];
  mk(g, new THREE.PlaneGeometry(0.42, 0.297), paperMat(9), { pos: [x + 0.35, y + 0.002, z - 0.1], rot: [-Math.PI / 2, 0, 0.3] });
  // 其他桌上的小道具:圖紙、鋼尺、磨塊、木塊、白膠、捲尺、零件盤、三角板
  const [ax, ay, az] = OTHER_BENCHES[0];
  mk(g, new THREE.PlaneGeometry(0.42, 0.297), paperMat(11), { pos: [ax - 0.2, ay + 0.001, az + 0.05], rot: [-Math.PI / 2, 0, -0.15] });
  createSteelRuler(g, { pos: [ax - 0.15, ay + 0.0025, az + 0.25], rot: [0, 0.1, 0], length: 0.3 });
  createSandingBlock(g, { pos: [ax + 0.3, ay, az - 0.1], rot: [0, 0.4, 0] });
  const blockMat = woodMat('#D9C3A0', 'grain');
  mk(g, rbox(0.18, 0.04, 0.06, 0.003), blockMat, { pos: [ax + 0.45, ay + 0.02, az + 0.15], rot: [0, -0.3, 0] });
  mk(g, rbox(0.12, 0.04, 0.06, 0.003), blockMat, { pos: [ax + 0.47, ay + 0.06, az + 0.13], rot: [0, 0.2, 0] });
  buildGlueBottle(group(g, 'glue', [ax + 0.6, ay, az - 0.25]));
  createTapeMeasure(g, { pos: [ax - 0.55, ay, az - 0.25], rot: [0, 2.2, 0] });
  createPartsTray(g, { pos: [x - 0.5, y, z - 0.2], rot: [0, -0.2, 0], seed: 7 });
  createSetSquare(g, { pos: [x + 0.1, y + 0.001, z + 0.15], rot: [0, 0.6, 0], size: 0.2 });
  createUtilityKnife(g, { pos: [x + 0.35, y, z - 0.25], rot: [0, -0.5, 0] });
  createSandingBlock(g, { pos: [x - 0.25, y, z + 0.25], rot: [0, 1.2, 0] });
  return g;
}
