import * as THREE from 'three';
import { C } from '../../../materials/palette.js';
import { woodMat } from '../../../materials/wood.js';
import { std } from '../../../materials/standard.js';
import { rbox, cyl, mk, group, extrude } from '../util/geo.js';

// 海浪小船凸輪玩具盒:木盒、側邊手搖把、頂板上的木製波浪與小船(極淡藍灰彩繪)、盒內可見凸輪。
export function createWaveBoat(parent, { pos, rot } = {}) {
  const g = group(parent, 'waveBoat', pos, rot);
  const box = woodMat(C.woodMid, 'grain', 301), lt = woodMat(C.woodLight, 'grain', 303);
  const W = 0.2, D = 0.09, H = 0.09;
  mk(g, rbox(W, 0.01, D, 0.003), box, { pos: [0, 0.005, 0] });
  mk(g, rbox(W, 0.01, D, 0.003), box, { pos: [0, H, 0] });
  for (const s of [-1, 1]) mk(g, rbox(0.01, H, D, 0.003), box, { pos: [s * (W / 2 - 0.005), H / 2, 0] });
  mk(g, rbox(W, H, 0.006, 0.002), box, { pos: [0, H / 2, -D / 2 + 0.003] });
  // 凸輪與軸
  mk(g, cyl(0.003, 0.003, W + 0.03, 8), std(C.steel), { pos: [0, 0.04, 0], rot: [0, 0, Math.PI / 2] });
  for (let i = 0; i < 3; i++) mk(g, cyl(0.018, 0.018, 0.008, 14), lt, { pos: [-0.05 + i * 0.05, 0.04 + (i - 1) * 0.004, 0], rot: [0, 0, Math.PI / 2], scale: [1, 1, 1.3] });
  mk(g, rbox(0.01, 0.04, 0.008, 0.002), lt, { pos: [W / 2 + 0.02, 0.025, 0] });
  mk(g, cyl(0.006, 0.006, 0.025, 8), lt, { pos: [W / 2 + 0.032, 0.008, 0], rot: [0, 0, Math.PI / 2] });
  // 波浪板(淡藍灰)
  const wave = new THREE.Shape(); wave.moveTo(-W / 2, 0);
  for (let i = 0; i <= 20; i++) { const x = -W / 2 + (i / 20) * W; wave.lineTo(x, 0.025 + Math.sin(i * 0.9) * 0.012); }
  wave.lineTo(W / 2, 0); wave.closePath();
  mk(g, extrude(wave, 0.008, 0.001), std('#BCC7CE'), { pos: [0, H + 0.005, 0.02] });
  mk(g, extrude(wave, 0.008, 0.001), std('#CAD3D8'), { pos: [0.01, H + 0.005, -0.015], scale: [1, 0.8, 1] });
  // 小船
  const hull = new THREE.Shape(); hull.moveTo(-0.035, 0.015); hull.lineTo(0.035, 0.015); hull.lineTo(0.025, 0); hull.lineTo(-0.025, 0); hull.closePath();
  const boat = group(g, 'boat', [0, H + 0.035, 0.0], [0, 0, 0.08]);
  mk(boat, extrude(hull, 0.02, 0.001), lt, {});
  mk(boat, cyl(0.002, 0.002, 0.05, 6), lt, { pos: [0, 0.04, 0] });
  const sail = new THREE.Shape(); sail.moveTo(0, 0); sail.lineTo(0.025, 0); sail.lineTo(0, 0.04); sail.closePath();
  mk(boat, extrude(sail, 0.002, 0), std('#F1ECE1'), { pos: [0.002, 0.02, 0] });
  return g;
}
