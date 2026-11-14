import * as THREE from 'three';
import { WINDOWS } from './layout.js';
import { C } from '../../materials/palette.js';
import { std } from '../../materials/standard.js';
import { glassMat } from '../../materials/glass.js';
import { fabricMat } from '../../materials/fabric.js';
import { rbox, mk, group, lathe } from './util/geo.js';

// 左牆三扇鋁框橫拉窗(大面透明玻璃)與收起綁好的米色窗簾。
export function createWindows(parent) {
  const g = group(parent, 'windows');
  const alu = std(C.aluFrame), glass = glassMat(0.06), sill = std('#EEE9DD');
  const curtain = fabricMat(C.curtain), tie = fabricMat('#D9CFB8');
  const { x, w, h, sill: sy } = WINDOWS;
  const fw = 0.045;
  // 收起的窗簾:上窄、中間綁帶、下方展開的旋轉體,表面加縱向褶皺
  const curtainGeo = lathe([[0.001, 0], [0.11, 0.02], [0.12, 0.35], [0.075, 0.95], [0.055, 1.05], [0.08, 1.2], [0.09, 1.75], [0.06, 1.95], [0.001, 1.96]], 18);
  {
    const p = curtainGeo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const a = Math.atan2(p.getZ(i), p.getX(i)), k = 1 + Math.sin(a * 7) * 0.12;
      p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k * 0.6);
    }
    curtainGeo.computeVertexNormals();
  }
  WINDOWS.centersZ.forEach((zc, i) => {
    const wg = group(g, `window${i}`, [x, sy, zc]);
    // 外框
    mk(wg, rbox(0.1, fw, w), alu, { pos: [0, fw / 2, 0] });
    mk(wg, rbox(0.1, fw, w), alu, { pos: [0, h - fw / 2, 0] });
    mk(wg, rbox(0.1, h, fw), alu, { pos: [0, h / 2, -w / 2 + fw / 2] });
    mk(wg, rbox(0.1, h, fw), alu, { pos: [0, h / 2, w / 2 - fw / 2] });
    // 兩扇拉窗(前後錯開),各有窗框與玻璃
    [[-0.025, -w / 4 + 0.02], [0.025, w / 4 - 0.02]].forEach(([dx, dz], k) => {
      const sw = w / 2 + 0.03, sh = h - fw * 2;
      const s = group(wg, 'sash', [dx, h / 2, dz]);
      mk(s, rbox(0.03, 0.03, sw), alu, { pos: [0, sh / 2 - 0.015, 0] });
      mk(s, rbox(0.03, 0.03, sw), alu, { pos: [0, -sh / 2 + 0.015, 0] });
      mk(s, rbox(0.03, sh, 0.03), alu, { pos: [0, 0, -sw / 2 + 0.015] });
      mk(s, rbox(0.03, sh, 0.03), alu, { pos: [0, 0, sw / 2 - 0.015] });
      const gp = mk(s, new THREE.PlaneGeometry(sw - 0.05, sh - 0.05), glass, { rot: [0, Math.PI / 2, 0] });
      gp.renderOrder = 1;
      // 拉手
      mk(s, rbox(0.02, 0.12, 0.012), std(C.steelDark), { pos: [0.02, 0, k ? -sw / 2 + 0.05 : sw / 2 - 0.05] });
    });
    // 室內窗台板
    mk(wg, rbox(0.2, 0.03, w + 0.12, 0.008), sill, { pos: [0.08, -0.01, 0] });
    // 窗簾:左右各一束,綁帶
    for (const side of [-1, 1]) {
      const cz = side * (w / 2 + 0.16);
      if (zc + cz > 3.55 || zc + cz < -3.65) continue;
      mk(wg, curtainGeo, curtain, { pos: [0.16, -0.25 + 0.0, cz], scale: [1, 1, 1] });
      mk(wg, new THREE.TorusGeometry(0.07, 0.012, 6, 16), tie, { pos: [0.16, 0.77, cz], rot: [Math.PI / 2, 0, 0] });
    }
  });
  // 窗簾軌道
  mk(g, rbox(0.03, 0.03, 7.3, 0.005), std(C.alu), { pos: [x + 0.16, sy + h + 0.15, -0.05] });
  return g;
}
