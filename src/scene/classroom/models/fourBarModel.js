import * as THREE from 'three';
import { C } from '../../../materials/palette.js';
import { std } from '../../../materials/standard.js';
import { woodMat } from '../../../materials/wood.js';
import { rbox, cyl, sphere, mk, group } from '../util/geo.js';

// 四連桿機構模型(靜態擺設):木底座 + 直立背板,曲柄、連桿、搖桿以鋁銷釘在背板上;曲柄有搖把。
// 姿態由實際的四連桿幾何計算(固定桿 0.2、曲柄 0.05、連桿 0.16、搖桿 0.09,曲柄角 60°)。
// 配色:淺木與金屬(不使用教具的語意色)。本地 +Z 為正面。
function circleIntersect(p0, r0, p1, r1) {
  const d = p0.distanceTo(p1), a = (r0 * r0 - r1 * r1 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, r0 * r0 - a * a));
  const m = p0.clone().add(p1.clone().sub(p0).multiplyScalar(a / d));
  const n = new THREE.Vector2(-(p1.y - p0.y) / d, (p1.x - p0.x) / d);
  return m.add(n.multiplyScalar(h)); // 取上方解
}
export function createFourBarModel(parent, { pos, rot } = {}) {
  const g = group(parent, 'fourBarModel', pos, rot);
  const base = woodMat(C.woodMid, 'grain'), board = woodMat('#DCC6A2', 'laminate'), link = woodMat('#E2CDA8', 'grain');
  const pin = std(C.alu), post = std(C.steel);
  mk(g, rbox(0.36, 0.02, 0.14, 0.004), base, { pos: [0, 0.01, 0] });
  mk(g, rbox(0.34, 0.22, 0.012, 0.004), board, { pos: [0, 0.13, -0.05] });
  const bz = -0.05 + 0.006;
  const A = new THREE.Vector2(-0.1, 0.07), D = new THREE.Vector2(0.1, 0.07);
  const ang = Math.PI / 3, B = A.clone().add(new THREE.Vector2(Math.cos(ang), Math.sin(ang)).multiplyScalar(0.05));
  const Cp = circleIntersect(B, 0.16, D, 0.09);
  const bar = (p, q, z, w = 0.014) => {
    const d = q.clone().sub(p), L = d.length();
    mk(g, rbox(L + w, w, 0.006, 0.003), link, { pos: [(p.x + q.x) / 2, 0.02 + (p.y + q.y) / 2, z], rot: [0, 0, Math.atan2(d.y, d.x)] });
  };
  // 固定樞軸座
  for (const p of [A, D]) mk(g, rbox(0.03, 0.02, 0.012, 0.003), post, { pos: [p.x, 0.02 + p.y - 0.012, bz + 0.006] });
  bar(A, B, bz + 0.008); bar(D, Cp, bz + 0.008); bar(B, Cp, bz + 0.016);
  for (const [p, z] of [[A, 0.012], [B, 0.02], [Cp, 0.02], [D, 0.012]]) mk(g, cyl(0.004, 0.004, 0.02, 10), pin, { pos: [p.x, 0.02 + p.y, bz + z], rot: [Math.PI / 2, 0, 0] });
  // 曲柄搖把
  mk(g, cyl(0.004, 0.004, 0.03, 8), pin, { pos: [A.x, 0.02 + A.y, bz + 0.03], rot: [Math.PI / 2, 0, 0] });
  mk(g, sphere(0.008), woodMat(C.woodMid, 'grain'), { pos: [A.x, 0.02 + A.y, bz + 0.047] });
  return g;
}
