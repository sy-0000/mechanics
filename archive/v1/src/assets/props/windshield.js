// 擋風玻璃:傾斜透明塑膠板 + 水滴 + 「擦乾淨」扇形遮罩 + 目標區標線。
import * as THREE from 'three';
import { roundedRectShape } from '../geo.js';
import { clearPlastic } from '../../materials/plastic.js';
import { addOutline } from '../../materials/outline.js';
import { toonMaterial } from '../../materials/toon.js';

/**
 * 玻璃本體在局部 XY 面(由關卡負責傾斜擺放)。
 * userData.setWipe(centerAngle, halfAngle, radius, pivot):更新乾淨扇形。
 * userData.setTarget(a0, a1, r):畫出目標扇形邊線。
 * userData.coverage(t40, t41):回傳目前擦拭範圍對目標的覆蓋率。
 */
export function createWindshield(w = 0.42, h = 0.26) {
  const group = new THREE.Group();
  group.name = 'windshield';

  const glassGeo = new THREE.ExtrudeGeometry(roundedRectShape(w, h, 0.03), {
    depth: 0.004, bevelEnabled: true, bevelThickness: 0.001, bevelSize: 0.001, bevelSegments: 1, curveSegments: 12,
  });
  glassGeo.translate(0, 0, -0.002);
  const glass = new THREE.Mesh(glassGeo, clearPlastic('#D7E4E8', 0.18));
  addOutline(glass, { thickness: 0.001, color: '#7A8B90' });
  group.add(glass);

  // 水滴層:canvas 貼圖(水滴小圓),乾淨扇形用 canvas 擦除呈現
  const C = 512;
  const canvas = document.createElement('canvas');
  canvas.width = C; canvas.height = Math.round(C * h / w);
  const g = canvas.getContext('2d');
  let seed = 12345;
  const rand = () => (seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;
  const drops = [];
  for (let i = 0; i < 90; i++) {
    drops.push({ x: rand() * canvas.width, y: rand() * canvas.height, r: 2 + rand() * 5 });
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const dropsMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(w * 0.98, h * 0.98),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }),
  );
  dropsMesh.position.z = 0.0035;
  group.add(dropsMesh);

  const state = { wipe: null, target: null };

  function redraw() {
    g.clearRect(0, 0, canvas.width, canvas.height);
    // 水滴
    g.fillStyle = 'rgba(190, 215, 225, 0.85)';
    g.strokeStyle = 'rgba(120, 150, 160, 0.9)';
    g.lineWidth = 1;
    const inWipe = (x, y) => {
      if (!state.wipe) return false;
      const { px, py, r, a0, a1 } = state.wipe;
      const dx = x - px, dy = py - y; // canvas y 向下
      const rr = Math.hypot(dx, dy);
      if (rr > r) return false;
      let a = Math.atan2(dy, dx);
      const lo = Math.min(a0, a1), hi = Math.max(a0, a1);
      return a >= lo && a <= hi;
    };
    for (const d of drops) {
      if (inWipe(d.x, d.y)) continue;
      g.beginPath();
      g.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      g.fill();
      g.stroke();
    }
    // 目標區扇形邊線(深棕虛線)
    if (state.target) {
      const { px, py, r, a0, a1 } = state.target;
      g.save();
      g.strokeStyle = '#4A382A';
      g.lineWidth = 3;
      g.setLineDash([10, 7]);
      g.beginPath();
      g.arc(px, py, r, -a1, -a0);
      g.stroke();
      for (const a of [a0, a1]) {
        g.beginPath();
        g.moveTo(px, py);
        g.lineTo(px + r * Math.cos(-a) * 1, py + r * Math.sin(-a));
        g.stroke();
      }
      g.restore();
    }
    tex.needsUpdate = true;
  }

  /** 座標轉換:玻璃局部 (x,y) m → canvas px */
  const toPx = (x, y) => ({
    x: ((x + w / 2) / w) * canvas.width,
    y: ((h / 2 - y) / h) * canvas.height,
  });
  const rPx = (r) => (r / w) * canvas.width;

  group.userData.setWipe = (pivot, radius, a0, a1) => {
    const p = toPx(pivot.x, pivot.y);
    state.wipe = { px: p.x, py: p.y, r: rPx(radius), a0, a1 };
    redraw();
  };
  group.userData.setTarget = (pivot, radius, a0, a1) => {
    const p = toPx(pivot.x, pivot.y);
    state.target = { px: p.x, py: p.y, r: rPx(radius), a0, a1 };
    redraw();
  };
  /** 覆蓋率:擦拭角範圍 ∩ 目標角範圍 / 目標角範圍 */
  group.userData.coverage = () => {
    if (!state.wipe || !state.target) return 0;
    const lo = Math.max(Math.min(state.wipe.a0, state.wipe.a1), Math.min(state.target.a0, state.target.a1));
    const hi = Math.min(Math.max(state.wipe.a0, state.wipe.a1), Math.max(state.target.a0, state.target.a1));
    const tgt = Math.abs(state.target.a1 - state.target.a0);
    const rOk = state.wipe.r >= state.target.r * 0.95;
    return tgt > 0 && rOk ? Math.max(0, hi - lo) / tgt : 0;
  };
  redraw();
  return group;
}
