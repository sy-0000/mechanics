import * as THREE from 'three';
import { C } from '../../../materials/palette.js';
import { toon } from '../../../materials/toon.js';
import { woodMat } from '../../../materials/wood.js';
import { rbox, cyl, mk, group, extrude, tube } from '../util/geo.js';

// 鋸子。type 'back'(夾背鋸:矩形鋼鋸片 + 頂部加強背 + 木柄)或 'coping'(線鋸弓:C 形鋼弓 + 細鋸條 + 木柄)。
// 本地平面為 XY(掛牆時面向 +Z)。
export function createSaw(parent, { pos, rot, type = 'back' } = {}) {
  const g = group(parent, `saw-${type}`, pos, rot);
  const steel = toon(C.steelBright), dark = toon(C.steelDark), handle = woodMat(C.woodLight, 'grain', 111);
  if (type === 'back') {
    mk(g, rbox(0.26, 0.075, 0.0012, 0.0004), steel, { pos: [0, 0, 0] });
    mk(g, rbox(0.265, 0.014, 0.006, 0.002), dark, { pos: [0, 0.04, 0] });
    // 開放式木柄(用擠出的握把輪廓)
    const s = new THREE.Shape();
    s.moveTo(0, 0.045); s.lineTo(0.03, 0.05); s.quadraticCurveTo(0.1, 0.03, 0.085, -0.05);
    s.lineTo(0.06, -0.06); s.quadraticCurveTo(0.05, -0.01, 0.025, -0.015); s.lineTo(0, -0.035); s.closePath();
    const hole = new THREE.Path(); hole.moveTo(0.035, 0.02); hole.quadraticCurveTo(0.06, 0.02, 0.06, -0.03); hole.lineTo(0.04, -0.02); hole.closePath();
    s.holes.push(hole);
    mk(g, extrude(s, 0.02, 0.003), handle, { pos: [0.125, 0, 0] });
  } else {
    mk(g, tube([[-0.13, -0.01, 0], [-0.13, 0.09, 0], [0, 0.11, 0], [0.13, 0.09, 0], [0.13, -0.01, 0]], 0.004, 30, 6), steel, {});
    mk(g, cyl(0.0006, 0.0006, 0.26, 4), dark, { pos: [0, -0.01, 0], rot: [0, 0, Math.PI / 2], outline: false });
    mk(g, cyl(0.012, 0.014, 0.1, 12), handle, { pos: [0.13, -0.065, 0] });
    mk(g, cyl(0.008, 0.008, 0.015, 10), dark, { pos: [0.13, -0.01, 0] });
  }
  return g;
}
