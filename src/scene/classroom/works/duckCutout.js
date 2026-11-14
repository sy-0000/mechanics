import * as THREE from 'three';
import { C } from '../../../materials/palette.js';
import { toon } from '../../../materials/toon.js';
import { woodMat } from '../../../materials/wood.js';
import { extrude, cyl, rbox, mk, group, tube } from '../util/geo.js';

// 夾板線鋸切出的 2D 鴨子。pullToy=true 時加上輪子、拉線,以及由凸輪帶動拍動的鴨掌。
function duckShape() {
  const s = new THREE.Shape();
  s.moveTo(-0.07, 0.02);
  s.quadraticCurveTo(-0.09, 0.07, -0.05, 0.075);       // 尾巴
  s.quadraticCurveTo(-0.01, 0.06, 0.02, 0.065);
  s.quadraticCurveTo(0.02, 0.12, 0.05, 0.125);          // 頭
  s.quadraticCurveTo(0.08, 0.125, 0.08, 0.1);
  s.lineTo(0.105, 0.092); s.lineTo(0.08, 0.085);        // 嘴
  s.quadraticCurveTo(0.07, 0.07, 0.065, 0.055);
  s.quadraticCurveTo(0.07, 0.0, 0.0, 0.0);
  s.quadraticCurveTo(-0.06, 0.0, -0.07, 0.02);
  return s;
}
export function createDuck(parent, { pos, rot, pullToy = false } = {}) {
  const g = group(parent, pullToy ? 'duckPullToy' : 'duck', pos, rot);
  const ply = woodMat(C.plywood, 'grain', 231);
  const body = mk(g, extrude(duckShape(), 0.012, 0.0015), ply, { pos: [0, pullToy ? 0.035 : 0.012, 0] });
  // 極淡的彩繪:眼睛與翅膀線
  mk(g, cyl(0.004, 0.004, 0.014, 10), toon('#6D7174'), { pos: [0.06, (pullToy ? 0.035 : 0.012) + 0.105, 0], rot: [Math.PI / 2, 0, 0], outline: false });
  mk(g, rbox(0.05, 0.022, 0.014, 0.008), toon('#D7C9C2'), { pos: [-0.01, (pullToy ? 0.035 : 0.012) + 0.04, 0], rot: [0, 0, 0.2], outline: false });
  if (!pullToy) {
    mk(g, rbox(0.12, 0.012, 0.05, 0.003), woodMat(C.woodMid, 'grain', 233), { pos: [0, 0.006, 0] });
    return g;
  }
  // 拉線玩具底盤 + 四輪 + 凸輪軸 + 鴨掌
  const base = woodMat(C.woodMid, 'grain', 235), wheel = woodMat(C.woodLight, 'grain', 237);
  mk(g, rbox(0.15, 0.012, 0.06, 0.003), base, { pos: [0, 0.03, 0] });
  for (const x of [-0.05, 0.05]) for (const z of [-0.035, 0.035]) mk(g, cyl(0.022, 0.022, 0.008, 18), wheel, { pos: [x, 0.022, z], rot: [Math.PI / 2, 0, 0] });
  mk(g, cyl(0.016, 0.016, 0.006, 12), toon('#D8C9BE'), { pos: [0.0, 0.02, 0.0], rot: [Math.PI / 2, 0, 0], scale: [1.3, 1, 1] }); // 偏心凸輪
  for (const z of [-0.012, 0.012]) mk(g, rbox(0.03, 0.006, 0.018, 0.002), toon('#D8C0BA'), { pos: [0.01, 0.008, z], rot: [0, 0, z > 0 ? 0.25 : -0.15] });
  mk(g, tube([[0.075, 0.03, 0], [0.12, 0.012, 0.01], [0.17, 0.004, 0.04], [0.2, 0.003, 0.03]], 0.0012, 16, 4), toon('#E7E1D2'), { outline: false });
  return g;
}
