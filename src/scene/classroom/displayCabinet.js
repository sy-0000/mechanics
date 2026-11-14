import * as THREE from 'three';
import { CABINET } from './layout.js';
import { C } from '../../materials/palette.js';
import { std } from '../../materials/standard.js';
import { woodMat } from '../../materials/wood.js';
import { glassMat } from '../../materials/glass.js';
import { rbox, cyl, mk, group } from './util/geo.js';
import { createDuck } from './works/duckCutout.js';
import { createRubberBandCar } from './works/rubberBandCar.js';
import { createScissorExtender } from './works/scissorExtender.js';
import { createWavingFigure } from './works/wavingFigure.js';
import { createGearBoard } from './works/gearBoard.js';
import { createWoodenGearClock } from './works/woodenGearClock.js';
import { createWaveBoat } from './works/waveBoat.js';
import { createBirdhouse } from './works/birdhouse.js';
import { createPenHolder } from './works/penHolder.js';

// 作品展示櫃(後牆右側):木框玻璃門、三層層板、櫃內柔和暖光(以暖色背板與層板下的發光燈條模擬,不增加即時光源)。
// 本地 +Z 為櫃子正面,整體轉 180° 讓正面朝向教室前方(−Z)。
export function createDisplayCabinet(parent) {
  const { x0, x1, z, depth: D, h: H, shelves } = CABINET;
  const W = x1 - x0;
  const g = group(parent, 'displayCabinet', [(x0 + x1) / 2, 0, z - D / 2 - 0.005], [0, Math.PI, 0]);
  const frame = woodMat(C.woodMid, 'grain', 331), inner = std('#F6E9D2'), shelfMat = woodMat(C.woodLight, 'laminate', 333);
  const t = 0.025;
  // 櫃體
  mk(g, rbox(W, 0.1, D, 0.006), frame, { pos: [0, 0.05, 0] });
  mk(g, rbox(W + 0.03, 0.04, D + 0.03, 0.008), frame, { pos: [0, H - 0.02, 0] });
  for (const s of [-1, 1]) mk(g, rbox(t, H, D, 0.005), frame, { pos: [s * (W / 2 - t / 2), H / 2, 0] });
  mk(g, rbox(W, H, 0.012, 0.003), inner, { pos: [0, H / 2, -D / 2 + 0.006] });
  // 暖光:背板上半帶淡淡的暖光暈(發光面)
  const glow = std('#FFF1D6', { emissive: '#FFE7BE', emissiveIntensity: 1.6, key: 'cabGlow' });
  // 層板 + 層板下方的燈條
  const levels = [0.1, ...shelves];
  shelves.forEach(y => mk(g, rbox(W - 2 * t, 0.018, D - 0.03, 0.004), shelfMat, { pos: [0, y, 0.005] }));
  [...shelves, H - 0.04].forEach(y => mk(g, rbox(W - 0.2, 0.008, 0.02, 0.003), glow, { pos: [0, y - 0.014, D / 2 - 0.06] }));
  // 玻璃門(兩扇,木框)
  const dw = (W - 2 * t) / 2;
  for (const s of [-1, 1]) {
    const dg = group(g, 'cabDoor', [s * dw / 2, H / 2 + 0.03, D / 2 + 0.012]);
    const fh = H - 0.16;
    mk(dg, rbox(dw, 0.04, 0.02, 0.004), frame, { pos: [0, fh / 2, 0] });
    mk(dg, rbox(dw, 0.04, 0.02, 0.004), frame, { pos: [0, -fh / 2, 0] });
    mk(dg, rbox(0.04, fh, 0.02, 0.004), frame, { pos: [-dw / 2 + 0.02, 0, 0] });
    mk(dg, rbox(0.04, fh, 0.02, 0.004), frame, { pos: [dw / 2 - 0.02, 0, 0] });
    const gl = mk(dg, new THREE.PlaneGeometry(dw - 0.08, fh - 0.04), glassMat(0.1), {});
    gl.renderOrder = 1;
    mk(dg, cyl(0.007, 0.007, 0.08, 8), std(C.steel), { pos: [-s * (dw / 2 - 0.05), 0, 0.02] });
  }
  // 作品(全部自然木色,僅極淡彩繪)
  const y1 = levels[0] + 0.0, y2 = shelves[0] + 0.009, y3 = shelves[1] + 0.009, y4 = shelves[2] + 0.009;
  // 底層:海浪小船、鳥屋、木齒輪時鐘
  createWaveBoat(g, { pos: [-0.55, y1 + 0.0, 0.02], rot: [0, 0.15, 0] });
  createBirdhouse(g, { pos: [0.05, y1, 0.0], rot: [0, -0.3, 0] });
  createWoodenGearClock(g, { pos: [0.55, y1, 0.0], rot: [0, -0.1, 0] });
  // 第二層:三齒輪展示板、揮手小木人、筆筒
  createGearBoard(g, { pos: [-0.5, y2, -0.02], rot: [0, 0.1, 0] });
  createWavingFigure(g, { pos: [0.1, y2, 0.0], rot: [0, -0.25, 0] });
  createPenHolder(g, { pos: [0.55, y2, 0.02] });
  // 第三層:兩台橡皮筋小車、伸縮夾
  createRubberBandCar(g, { pos: [-0.6, y3, 0.02], rot: [0, 0.4, 0] });
  createRubberBandCar(g, { pos: [-0.3, y3, -0.02], rot: [0, -0.2, 0], tint: '#C9D2D8' });
  createScissorExtender(g, { pos: [0.35, y3, 0.0], rot: [0, -0.1, 0] });
  // 頂層:兩隻 2D 鴨子(其一為拉線玩具)
  createDuck(g, { pos: [-0.35, y4, 0.0], rot: [0, 0.25, 0] });
  createDuck(g, { pos: [0.2, y4, 0.02], rot: [0, -0.3, 0], pullToy: true });
  return g;
}
