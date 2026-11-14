import * as THREE from 'three';
import { BOARD } from './layout.js';
import { C } from '../../materials/palette.js';
import { std } from '../../materials/standard.js';
import { woodMat } from '../../materials/wood.js';
import { makeCanvas, canvasTexture, rng } from '../../materials/canvasTex.js';
import { rbox, cyl, mk, group } from './util/geo.js';
import { ChalkZone, loadChalkFont } from './chalkWriter.js';

// 黑板(深炭灰,非綠色)+ 木框 + 粉筆槽(粉筆、板擦)+ 三個書寫分區。
const ZONE_STYLE = {
  left: { pad: 0.06, title: 0.075, line: 0.058, live: 0.058, gap: 0.03, wrap: true },
  center: { pad: 0.07, title: 0.095, line: 0.08, live: 0.075, gap: 0.04, wrap: false },
  right: { pad: 0.06, title: 0.075, line: 0.065, live: 0.062, gap: 0.035, wrap: false },
};

function slateTexture() {
  const c = makeCanvas(1024, 320), g = c.getContext('2d'), r = rng(77);
  g.fillStyle = C.board; g.fillRect(0, 0, 1024, 320);
  // 擦拭殘留:低對比、大面積的板擦掃痕(橫向長條漸層 + 幾道寬弧),只在板面底色上,不影響書寫層的文字
  for (let i = 0; i < 14; i++) {
    const y = r() * 320, h = 40 + r() * 80, x0 = r() * 600, w = 250 + r() * 500;
    const grd = g.createLinearGradient(x0, 0, x0 + w, 0);
    const a = 0.025 + r() * 0.03;
    grd.addColorStop(0, 'rgba(210,210,200,0)'); grd.addColorStop(0.3, `rgba(210,210,200,${a})`); grd.addColorStop(0.7, `rgba(210,210,200,${a * 0.8})`); grd.addColorStop(1, 'rgba(210,210,200,0)');
    g.fillStyle = grd; g.beginPath(); g.ellipse(x0 + w / 2, y, w / 2, h / 2, (r() - 0.5) * 0.12, 0, Math.PI * 2); g.fill();
  }
  for (let i = 0; i < 8; i++) {
    g.strokeStyle = `rgba(200,200,190,${0.012 + r() * 0.015})`; g.lineWidth = 40 + r() * 50;
    g.beginPath(); const x = r() * 1024, y = r() * 320;
    g.arc(x, y + 140, 160 + r() * 120, -Math.PI * 0.75, -Math.PI * 0.25); g.stroke();
  }
  for (let i = 0; i < 3000; i++) { g.fillStyle = `rgba(255,255,255,${r() * 0.015})`; g.fillRect(r() * 1024, r() * 320, 2, 2); }
  return canvasTexture(c, { repeat: false });
}

export function createBlackboard(parent) {
  const [cx, cy, cz] = BOARD.center, W = BOARD.w, H = BOARD.h;
  const g = group(parent, 'blackboard', [cx, cy, cz]);
  const frame = woodMat(C.woodFrame, 'grain', 71);
  // 板面
  const surface = mk(g, new THREE.PlaneGeometry(W, H), std('#ffffff', { map: slateTexture(), roughness: 0.88, key: 'slate' }), { pos: [0, 0, 0.012], name: 'boardSurface' });
  mk(g, rbox(W, H, 0.02, 0.004), std(C.board), { pos: [0, 0, 0] });
  // 木框
  const fw = 0.05;
  mk(g, rbox(W + fw * 2, fw, 0.04, 0.008), frame, { pos: [0, H / 2 + fw / 2, 0.01] });
  mk(g, rbox(W + fw * 2, fw, 0.04, 0.008), frame, { pos: [0, -H / 2 - fw / 2, 0.01] });
  mk(g, rbox(fw, H, 0.04, 0.008), frame, { pos: [-W / 2 - fw / 2, 0, 0.01] });
  mk(g, rbox(fw, H, 0.04, 0.008), frame, { pos: [W / 2 + fw / 2, 0, 0.01] });
  // 粉筆槽
  const tray = group(g, 'chalkTray', [0, -H / 2 - fw - 0.01, 0.06]);
  mk(tray, rbox(W + 0.06, 0.018, 0.09, 0.004), frame, { pos: [0, 0, 0] });
  mk(tray, rbox(W + 0.06, 0.035, 0.012, 0.003), frame, { pos: [0, 0.012, 0.045] });
  const chalkCols = ['#F4F1E8', '#F4F1E8', '#F4F1E8', '#E9BFA2', '#EEE0A8', '#B4D0B6', '#B2C8DC'];
  chalkCols.forEach((col, i) => {
    mk(tray, cyl(0.0055, 0.0055, 0.075 - (i % 3) * 0.015, 8), std(col), { pos: [-0.9 + i * 0.09 + (i > 3 ? 0.25 : 0), 0.015, (i % 2) * 0.012], rot: [0, 0.3 * (i % 3), Math.PI / 2] });
  });
  // 板擦:木背 + 灰色毛氈
  const eraser = group(tray, 'boardEraser', [0.75, 0.009, 0], [0, 0.15, 0]);
  mk(eraser, rbox(0.13, 0.025, 0.05, 0.005), woodMat(C.woodMid, 'grain', 73), { pos: [0, 0.03, 0] });
  mk(eraser, rbox(0.13, 0.018, 0.05, 0.004), std('#8C9094'), { pos: [0, 0.01, 0] });

  // 三分區(書寫層)
  const zones = {};
  const zoneRoot = group(g, 'chalkZones', [0, 0, 0.014]);
  for (const [name, z] of Object.entries(BOARD.zones)) {
    const zone = new ChalkZone(name, z.w, H, ZONE_STYLE[name]);
    const m = zone.mesh();
    m.position.set(z.x0 + z.w / 2 - 0 , 0, 0);
    zoneRoot.add(m);
    zones[name] = zone;
  }
  // 很淡的粉筆分隔線(略帶手繪抖動)
  const divTex = makeCanvas(16, 512), dg = divTex.getContext('2d'), dr = rng(5);
  for (let y = 0; y < 512; y += 2) { dg.fillStyle = `rgba(240,238,230,${0.25 + dr() * 0.25})`; dg.fillRect(6 + Math.sin(y / 60) * 1.5, y, 3, 2); }
  const divMat = new THREE.MeshBasicMaterial({ map: canvasTexture(divTex, { repeat: false }), transparent: true, depthWrite: false, opacity: 0.7 });
  for (const x of [BOARD.zones.center.x0, BOARD.zones.right.x0]) {
    const d = mk(zoneRoot, new THREE.PlaneGeometry(0.012, H * 0.94), divMat, { pos: [x, 0, 0.0005] });
    d.userData.dynamic = true; d.renderOrder = 2;
  }
  surface.userData.dynamic = true;
  loadChalkFont().then(() => Object.values(zones).forEach(z => (z.dirty = true)));
  return { group: g, surface, zones, size: { w: W, h: H } };
}
