import * as THREE from 'three';
import { PEGBOARD } from './layout.js';
import { C } from '../../materials/palette.js';
import { toon } from '../../materials/toon.js';
import { woodMat } from '../../materials/wood.js';
import { makeCanvas, canvasTexture } from '../../materials/canvasTex.js';
import { rbox, cyl, mk, group, instanced } from './util/geo.js';
import { instanceTool } from './util/instanceTool.js';
import { createFile } from './tools/file.js';
import { createSteelRuler } from './tools/steelRuler.js';
import { createHandPlane } from './tools/handPlane.js';
import { createSaw } from './tools/saw.js';
import { buildHammer } from './tools/hammer.js';
import { createMallet } from './tools/mallet.js';
import { buildGoggles, gogglesLens } from './tools/goggles.js';
import { buildScrewdriver } from './tools/screwdriver.js';
import { buildGlueBottle } from './tools/glueBottle.js';
import { createHotGlueGun } from './tools/hotGlueGun.js';
import { buildScissors } from './tools/scissors.js';
import { createSolderingIron } from './tools/solderingIron.js';
import { createWireSpool } from './tools/wireSpool.js';
import { buildPliers } from './tools/pliers.js';
import { createBrassBrush } from './tools/brassBrush.js';
import { createCompass } from './tools/compass.js';

// 右牆洞洞板(淺木色、銀灰掛勾),每件工具後方有淡淡的輪廓描線(工具輪廓板)。
// 本地座標:x 沿牆(= 世界 +Z),y 向上(中心為 0),+z 朝向教室(= 世界 −X)。
const SLOTS = [];          // 輪廓描線 {x,y,w,h}
const slot = (x, y, w, h) => SLOTS.push({ x, y, w, h });

function boardTexture(W, H) {
  const ppm = 1024 / W, c = makeCanvas(1024, Math.round(H * ppm)), g = c.getContext('2d');
  g.fillStyle = '#f2f2f2'; g.fillRect(0, 0, c.width, c.height);
  const step = 0.025 * ppm;
  g.fillStyle = 'rgba(80,70,60,0.55)';
  for (let y = step / 2; y < c.height; y += step) for (let x = step / 2; x < c.width; x += step) { g.beginPath(); g.arc(x, y, 2.3, 0, Math.PI * 2); g.fill(); }
  g.strokeStyle = 'rgba(110,95,80,0.38)'; g.lineWidth = 2.5;
  for (const s of SLOTS) {
    const x = (s.x + W / 2 - s.w / 2) * ppm, y = (H / 2 - s.y - s.h / 2) * ppm;
    g.beginPath(); g.roundRect(x, y, s.w * ppm, s.h * ppm, Math.min(s.w, s.h) * ppm * 0.35); g.stroke();
  }
  return canvasTexture(c, { repeat: false });
}

export function createPegboard(parent) {
  const { x, zc, w: W, h: H, y0 } = PEGBOARD;
  const g = group(parent, 'pegboard', [x - 0.035, y0 + H / 2, zc], [0, -Math.PI / 2, 0]);
  const T = new THREE.Group(); g.add(T); T.position.z = 0.012; // 工具層
  const hooks = [];
  const hook = (hx, hy) => hooks.push({ pos: [hx, hy, 0.02], rot: [Math.PI / 2, 0, 0] });

  // 上排:三支銼刀
  ['flat', 'half', 'round'].forEach((type, i) => { const px = -1.05 + i * 0.075; createFile(T, { pos: [px, 0.08, 0.008], type }); hook(px, 0.4); slot(px, 0.24, 0.05, 0.34); });
  // 一字與十字起子(大中小)
  const sd = (type, x0) => {
    const sizes = [1.15, 1.0, 0.85];
    instanceTool(T, gg => buildScrewdriver(gg, type), sizes.map((s, i) => ({ pos: [x0 + i * 0.06, 0.12 - (s - 1) * 0.1, 0.016], scale: s })), { name: `screwdriver-${type}`, cast: false, receive: false });
    sizes.forEach((s, i) => { hook(x0 + i * 0.06, 0.14 + 0.24 * s); slot(x0 + i * 0.06, 0.12 + 0.12 * s, 0.045, 0.25 * s); });
  };
  sd('flat', -0.78); sd('phillips', -0.56);
  // 鋼尺 60 cm / 30 cm(橫掛)
  createSteelRuler(T, { pos: [0.28, 0.52, 0.004], rot: [Math.PI / 2, 0, 0], length: 0.6 }); slot(0.28, 0.52, 0.63, 0.05); hook(0.0, 0.535);
  createSteelRuler(T, { pos: [0.13, 0.45, 0.004], rot: [Math.PI / 2, 0, 0], length: 0.3 }); slot(0.13, 0.45, 0.33, 0.045); hook(0.0, 0.465);
  // 兩支鐵鎚 + 木槌
  instanceTool(T, buildHammer, [{ pos: [-0.28, -0.02, 0.02] }, { pos: [-0.17, -0.02, 0.02] }], { name: 'hammers' });
  [-0.28, -0.17].forEach(px => { hook(px - 0.025, 0.27); hook(px + 0.025, 0.27); slot(px, 0.13, 0.11, 0.36); });
  createMallet(T, { pos: [-0.04, -0.02, 0.03] }); hook(-0.08, 0.25); hook(0.0, 0.25); slot(-0.04, 0.14, 0.15, 0.36);
  // 夾背鋸、線鋸弓
  createSaw(T, { pos: [0.3, 0.22, 0.01], type: 'back' }); hook(0.3, 0.29); slot(0.38, 0.22, 0.44, 0.13);
  createSaw(T, { pos: [0.85, 0.24, 0.01], type: 'coping' }); hook(0.85, 0.36); slot(0.86, 0.22, 0.3, 0.26);
  // 銅刷、圓規
  createBrassBrush(T, { pos: [1.07, 0.18, 0.01] }); hook(1.07, 0.3); slot(1.07, 0.2, 0.04, 0.23);
  createCompass(T, { pos: [1.15, 0.12, 0.01] }); hook(1.15, 0.27); slot(1.15, 0.18, 0.06, 0.16);
  // 護目鏡 ×4(鏡片另以透明面繪製)
  const gx = [-1.06, -0.88, -0.7, -0.52];
  instanceTool(T, buildGoggles, gx.map(px => ({ pos: [px, -0.2, 0.02] })), { name: 'goggles' });
  const lens = gogglesLens();
  instanced(T, lens.geo, lens.mat, gx.map(px => ({ pos: [px, -0.2, 0.046] })), { name: 'gogglesLens' }).userData.outline = false;
  gx.forEach(px => { hook(px, -0.13); slot(px, -0.19, 0.18, 0.1); });
  // 剪刀 ×2、尖嘴鉗 ×2
  instanceTool(T, buildScissors, [{ pos: [-0.36, -0.12, 0.01] }, { pos: [-0.27, -0.12, 0.01] }], { name: 'scissors' });
  instanceTool(T, buildPliers, [{ pos: [-0.16, -0.12, 0.012] }, { pos: [-0.07, -0.12, 0.012] }], { name: 'pliers' });
  [-0.36, -0.27, -0.16, -0.07].forEach(px => { hook(px, -0.08); slot(px, -0.14, 0.07, 0.2); });
  // 熱熔膠槍(專用掛勾)
  createHotGlueGun(T, { pos: [-0.22, -0.36, 0.03] }); slot(-0.2, -0.4, 0.26, 0.16);
  // 線材橫桿:銅線、鋁線、焊錫、灰/黑電線
  const rod = mk(g, cyl(0.006, 0.006, 0.82, 10), toon(C.steel), { pos: [0.52, -0.06, 0.07], rot: [0, 0, Math.PI / 2] });
  for (const bx of [0.13, 0.91]) mk(g, rbox(0.012, 0.012, 0.075, 0.003), toon(C.steel), { pos: [bx, -0.06, 0.035] });
  [['copper', 0.2], ['aluminum', 0.33], ['solder', 0.46], ['wireGray', 0.62], ['wireBlack', 0.8]].forEach(([kind, px]) => createWireSpool(T, { pos: [px, -0.06 - (kind === 'solder' ? 0.025 : kind.startsWith('wire') ? 0.055 : 0.04), 0.058], kind }));
  // 下方層板:烙鐵架、大小刨刀、白膠 ×2
  const shelfY = -0.5;
  const shelfMat = woodMat(C.woodMid, 'grain', 151);
  mk(g, rbox(1.05, 0.02, 0.16, 0.004), shelfMat, { pos: [0.6, shelfY, 0.09] });
  for (const bx of [0.12, 1.08]) mk(g, rbox(0.02, 0.08, 0.14, 0.004), shelfMat, { pos: [bx, shelfY - 0.05, 0.08] });
  const sy = shelfY + 0.01;
  createSolderingIron(T, { pos: [0.22, sy, 0.07] });
  createHandPlane(T, { pos: [0.5, sy, 0.08], size: 'large' });
  createHandPlane(T, { pos: [0.76, sy, 0.08], size: 'small' });
  instanceTool(T, buildGlueBottle, [{ pos: [0.93, sy, 0.08] }, { pos: [1.01, sy, 0.06] }], { name: 'glue' });

  // 掛勾(實例化)
  instanced(g, cyl(0.0025, 0.0025, 0.04, 6), toon(C.steelBright), hooks, { name: 'pegHooks' }).userData.outline = false;
  // 洞洞板本體(帶輪廓描線)+ 外框
  mk(g, new THREE.PlaneGeometry(W, H), toon(C.woodLight, { map: boardTexture(W, H), key: 'pegboardTex' }), { pos: [0, 0, 0], outline: false });
  const fr = woodMat(C.woodMid, 'grain', 153);
  mk(g, rbox(W + 0.06, 0.03, 0.04, 0.006), fr, { pos: [0, H / 2 + 0.015, 0] });
  mk(g, rbox(W + 0.06, 0.03, 0.04, 0.006), fr, { pos: [0, -H / 2 - 0.015, 0] });
  mk(g, rbox(0.03, H, 0.04, 0.006), fr, { pos: [-W / 2 - 0.015, 0, 0] });
  mk(g, rbox(0.03, H, 0.04, 0.006), fr, { pos: [W / 2 + 0.015, 0, 0] });
  return g;
}
