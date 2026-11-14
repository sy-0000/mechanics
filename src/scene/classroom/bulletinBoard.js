import * as THREE from 'three';
import { C } from '../../materials/palette.js';
import { std, wallMat } from '../../materials/standard.js';
import { woodMat } from '../../materials/wood.js';
import { printMat, atlasUV } from '../../materials/printAtlas.js';
import { rbox, cyl, sphere, mk, group, instanced } from './util/geo.js';
import { CABINET } from './layout.js';

// 佈告欄:掛在後牆展示櫃上方的空白牆面。軟木板 + 木框;貼課表、兩張公告、三張機構手繪圖。
// 紙張角度略歪、部分紙角翹起;圖釘(小物,實例化)放在 details 群組,只在 high 模式顯示。
// 材質:軟木用牆面 PBR 組(橘皮紋),木框用木材組,紙張用印刷品圖集 → 都併入既有的合併批次。
export const BULLETIN = { center: [(CABINET.x0 + CABINET.x1) / 2, 2.4, CABINET.z], w: 1.6, h: 0.9 };

function paperGeo(w, h, cell, landscape, curl) {
  const g = new THREE.PlaneGeometry(w, h, 5, 5);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) / (w / 2), y = p.getY(i) / (h / 2); // −1..1
    let z = 0.0006 * (1 - x * x) * (1 - y * y);              // 紙張中央微微鼓起
    if (curl) { const [cx, cy] = curl; const d = Math.max(0, 1 - Math.hypot(x - cx, y - cy) / 0.9); z += d * d * 0.022; } // 翹起的紙角
    p.setZ(i, z);
  }
  g.computeVertexNormals();
  return atlasUV(g, cell, { landscape });
}

export function createBulletinBoard(main, details) {
  const { center, w: W, h: H } = BULLETIN;
  const g = group(main, 'bulletinBoard', [center[0], center[1], center[2] - 0.004], [0, Math.PI, 0]);
  const cork = wallMat('#CDB596');           // 軟木:低飽和的淺褐(遠離銅橘)
  const frame = woodMat(C.woodMid, 'grain');
  mk(g, rbox(W, H, 0.015, 0.003), cork, { pos: [0, 0, 0.0075] });
  const fw = 0.035;
  mk(g, rbox(W + fw * 2, fw, 0.03, 0.006), frame, { pos: [0, H / 2 + fw / 2, 0.015] });
  mk(g, rbox(W + fw * 2, fw, 0.03, 0.006), frame, { pos: [0, -H / 2 - fw / 2, 0.015] });
  mk(g, rbox(fw, H, 0.03, 0.006), frame, { pos: [-W / 2 - fw / 2, 0, 0.015] });
  mk(g, rbox(fw, H, 0.03, 0.006), frame, { pos: [W / 2 + fw / 2, 0, 0.015] });

  const paper = printMat(), pins = [];
  const sheets = [
    // [cell, 寬, 高, 橫式?, x, y, 旋轉, 翹角(紙面座標 −1..1)]
    ['timetable', 0.42, 0.297, true, -0.48, 0.17, -0.025, null],
    ['notice1', 0.21, 0.297, false, 0.02, 0.2, 0.04, [1, -1]],
    ['notice2', 0.21, 0.297, false, 0.27, 0.16, -0.06, null],
    ['drawFourBar', 0.297, 0.21, true, 0.6, 0.22, 0.03, [-1, -1]],
    ['drawGear', 0.297, 0.21, true, -0.52, -0.23, 0.05, [1, -1]],
    ['drawCam', 0.21, 0.297, false, 0.5, -0.2, -0.035, null],
  ];
  sheets.forEach(([cell, w, h, land, x, y, rot, curl], i) => {
    const m = mk(g, paperGeo(w, h, cell, land, curl), paper, { pos: [x, y, 0.0155 + i * 0.0004], rot: [0, 0, rot] });
    // 圖釘:上緣兩角(有翹角的那張只釘一角)
    const c = Math.cos(rot), s = Math.sin(rot);
    const corners = curl ? [[-(curl[0]) * (w / 2 - 0.02), h / 2 - 0.02]] : [[-w / 2 + 0.02, h / 2 - 0.02], [w / 2 - 0.02, h / 2 - 0.02]];
    if (!curl && i % 2) corners.push([0, -h / 2 + 0.02]);
    for (const [px, py] of corners) pins.push([x + px * c - py * s, y + px * s + py * c]);
  });
  // 一張課表下方的小便條(用公告格的下半部)
  // 圖釘:釘頭(淺色系,避開語意色)+ 針身,實例化
  const pg = group(details, 'bulletinPins', [center[0], center[1], center[2] - 0.004], [0, Math.PI, 0]);
  const cols = ['#F1EEE6', '#A8B6C1', '#D8C0BA', '#C7CBCE', '#E9E2D2'];
  instanced(pg, cyl(0.0055, 0.0055, 0.007, 10), std('#ffffff', { roughness: 0.35 }), pins.map(([x, y], i) => ({ pos: [x, y, 0.024], rot: [Math.PI / 2, 0, 0], color: cols[i % cols.length] })), { name: 'pinHeads' });
  instanced(pg, sphere(0.0042, 8, 6), std('#ffffff', { roughness: 0.35 }), pins.map(([x, y], i) => ({ pos: [x, y, 0.029], color: cols[i % cols.length] })), { name: 'pinTops' });
  return g;
}
