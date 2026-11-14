import * as THREE from 'three';
import { rng } from './canvasTex.js';
import { std } from './standard.js';

// 印刷品圖集(2048 × 2048,4 × 4 格,每格 512):桌上的機構草圖、佈告欄的課表 / 公告 / 手繪圖、
// 逃生路線圖、安全守則海報全部畫在同一張貼圖上,共用一個材質 → 合併後只佔一個 draw call。
// 所有「文字」都是無法閱讀的筆畫線條(場景規格:除黑板粉筆字外不出現可讀文字);安全守則只用圖示。
const N = 2048, CELL = 512;
const CELLS = ['sketch1', 'sketch2', 'sketch3', 'sketch4', 'sketch9', 'sketch11', 'timetable', 'notice1',
  'notice2', 'drawFourBar', 'drawGear', 'drawCam', 'evacMap', 'safetyPoster', 'spare1', 'spare2'];
const INK = 'rgba(95,98,102,0.9)';

let canvas = null, tex = null, mat = null;

function scribbleLines(g, x, y, w, h, rows, r, color = 'rgba(110,112,116,0.75)') {
  // 假文字:長短不一的細波浪線,遠看像一行行字,近看無法閱讀
  g.strokeStyle = color; g.lineWidth = 1.6;
  const lh = h / rows;
  for (let i = 0; i < rows; i++) {
    const len = w * (0.55 + r() * 0.45), yy = y + lh * (i + 0.6);
    g.beginPath();
    for (let xx = 0; xx < len; xx += 3) g.lineTo(x + xx, yy + Math.sin(xx * 0.9 + i) * 1.2 + (r() - 0.5) * 0.8);
    g.stroke();
  }
}
function arrowDim(g, x1, y1, x2, y2) {
  g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
  const a = Math.atan2(y2 - y1, x2 - x1);
  for (const [x, y, s] of [[x1, y1, 1], [x2, y2, -1]]) {
    g.beginPath(); g.moveTo(x, y);
    g.lineTo(x + s * 9 * Math.cos(a - 0.3), y + s * 9 * Math.sin(a - 0.3));
    g.lineTo(x + s * 9 * Math.cos(a + 0.3), y + s * 9 * Math.sin(a + 0.3)); g.closePath(); g.fill();
  }
}

/** A3 機構草圖(橫式,w×h 區域)。 */
function sketch(g, w, h, seed) {
  const r = rng(seed);
  g.fillStyle = '#fbf8ef'; g.fillRect(0, 0, w, h);
  g.strokeStyle = INK; g.fillStyle = INK; g.lineWidth = 1.6;
  g.strokeRect(12, 12, w - 24, h - 24); g.strokeRect(w - 135, h - 50, 123, 38);
  const pts = []; for (let i = 0; i < 4; i++) pts.push([85 + r() * (w - 200), 85 + r() * (h - 190)]);
  g.lineWidth = 1.8; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.stroke();
  pts.forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 6.5, 0, Math.PI * 2); g.stroke(); });
  const cx = 100 + r() * (w - 220), cy = 100 + r() * (h - 220), R = 28 + r() * 28;
  g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.stroke();
  g.setLineDash([8, 4, 2, 4]); g.beginPath(); g.moveTo(cx - R - 14, cy); g.lineTo(cx + R + 14, cy); g.moveTo(cx, cy - R - 14); g.lineTo(cx, cy + R + 14); g.stroke(); g.setLineDash([]);
  g.lineWidth = 1; arrowDim(g, pts[0][0], h - 60, pts[1][0], h - 60); arrowDim(g, 42, pts[0][1], 42, pts[2][1]);
}
function timetable(g, w, h, r) {
  g.fillStyle = '#FBFAF4'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#C9D3DA'; g.fillRect(14, 14, w - 28, 34);            // 表頭底色(淡藍灰)
  scribbleLines(g, w * 0.3, 18, w * 0.4, 26, 1, r, 'rgba(80,84,90,0.8)');
  const cols = 6, rows = 8, x0 = 14, y0 = 56, cw = (w - 28) / cols, ch = (h - y0 - 14) / rows;
  const tints = ['#EEE6D8', '#E3E8EC', '#EFE2E0', '#F3F1EA'];
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    if (i > 0 && j > 0 && r() < 0.55) { g.fillStyle = tints[(r() * tints.length) | 0]; g.fillRect(x0 + i * cw + 1, y0 + j * ch + 1, cw - 2, ch - 2); }
    if ((i === 0 || j === 0) || r() < 0.7) scribbleLines(g, x0 + i * cw + 6, y0 + j * ch + 4, cw - 14, ch - 8, 1, r);
  }
  g.strokeStyle = 'rgba(100,104,110,0.8)'; g.lineWidth = 1.2;
  for (let i = 0; i <= cols; i++) { g.beginPath(); g.moveTo(x0 + i * cw, y0); g.lineTo(x0 + i * cw, h - 14); g.stroke(); }
  for (let j = 0; j <= rows; j++) { g.beginPath(); g.moveTo(x0, y0 + j * ch); g.lineTo(w - 14, y0 + j * ch); g.stroke(); }
}
function notice(g, w, h, r, band) {
  g.fillStyle = '#FCFBF6'; g.fillRect(0, 0, w, h);
  g.fillStyle = band; g.fillRect(0, 0, w, 54);
  scribbleLines(g, w * 0.18, 12, w * 0.64, 30, 1, r, 'rgba(60,64,70,0.85)');
  scribbleLines(g, 30, 80, w - 60, h * 0.5, 11, r);
  g.strokeStyle = 'rgba(120,124,128,0.6)'; g.lineWidth = 1.2; g.strokeRect(30, h * 0.66, w - 60, h * 0.18);
  scribbleLines(g, 40, h * 0.67, w - 80, h * 0.16, 3, r);
  scribbleLines(g, w * 0.55, h - 60, w * 0.35, 30, 2, r);
}
function drawing(g, w, h, r, kind) {
  g.fillStyle = '#FAF7EE'; g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(85,88,92,0.85)'; g.fillStyle = 'rgba(85,88,92,0.85)'; g.lineWidth = 2;
  const cx = w / 2, cy = h / 2 + 10;
  if (kind === 'fourBar') {
    const A = [cx - 120, cy + 60], B = [cx - 70, cy - 50], Cc = [cx + 80, cy - 70], D = [cx + 110, cy + 60];
    g.beginPath(); g.moveTo(...A); g.lineTo(...B); g.lineTo(...Cc); g.lineTo(...D); g.stroke();
    for (const p of [A, D]) { g.beginPath(); g.moveTo(p[0] - 14, p[1] + 16); g.lineTo(p[0] + 14, p[1] + 16); g.lineTo(p[0], p[1]); g.closePath(); g.stroke(); for (let k = -14; k < 14; k += 5) { g.beginPath(); g.moveTo(p[0] + k, p[1] + 16); g.lineTo(p[0] + k - 5, p[1] + 22); g.stroke(); } }
    for (const p of [A, B, Cc, D]) { g.beginPath(); g.arc(p[0], p[1], 5, 0, 7); g.fillStyle = '#FAF7EE'; g.fill(); g.stroke(); }
    g.setLineDash([5, 5]); g.beginPath(); g.arc(A[0], A[1], 121, -1.9, -0.9); g.stroke(); g.setLineDash([]);
  } else if (kind === 'gear') {
    const gear = (x, y, R, t) => { g.beginPath(); for (let i = 0; i <= t * 4; i++) { const a = i / (t * 4) * Math.PI * 2, rr = (i % 4 === 1 || i % 4 === 2) ? R : R - 8; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.stroke(); g.beginPath(); g.arc(x, y, 6, 0, 7); g.stroke(); };
    gear(cx - 55, cy, 70, 18); gear(cx + 62, cy - 4, 46, 12);
    g.setLineDash([6, 4]); g.beginPath(); g.arc(cx - 55, cy, 62, 0, 7); g.arc(cx + 62, cy - 4, 38, 0, 7); g.stroke(); g.setLineDash([]);
  } else {
    g.beginPath(); g.ellipse(cx, cy + 40, 70, 52, 0.3, 0, 7); g.stroke(); g.beginPath(); g.arc(cx - 15, cy + 40, 6, 0, 7); g.stroke();
    g.strokeRect(cx - 10, cy - 120, 20, 110); g.beginPath(); g.arc(cx, cy - 8, 9, 0, 7); g.stroke();
    g.setLineDash([5, 5]); g.beginPath(); g.moveTo(cx, cy - 140); g.lineTo(cx, cy + 110); g.stroke(); g.setLineDash([]);
  }
  g.lineWidth = 1; arrowDim(g, 40, h - 46, w - 40, h - 46);
  scribbleLines(g, 24, 18, w * 0.4, 22, 1, r);
}
function evacMap(g, w, h, r) {
  g.fillStyle = '#F8F7F2'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#55606A'; g.fillRect(0, 0, w, 48);                    // 深藍灰標題列(無字,只放圖示)
  g.fillStyle = '#F8F7F2';
  g.beginPath(); g.arc(34, 24, 9, 0, 7); g.fill(); g.fillRect(28, 32, 12, 4);   // 人形圖示(頭)
  g.beginPath(); g.moveTo(60, 24); g.lineTo(90, 24); g.lineTo(90, 16); g.lineTo(104, 26); g.lineTo(90, 36); g.lineTo(90, 28); g.lineTo(60, 28); g.fill();
  // 平面圖:教室、走廊、樓梯
  g.strokeStyle = '#5E656B'; g.lineWidth = 3;
  g.strokeRect(40, 80, w - 80, h - 150);
  g.lineWidth = 2;
  for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(40 + i * (w - 80) / 4, 80); g.lineTo(40 + i * (w - 80) / 4, h - 170); g.stroke(); }
  g.beginPath(); g.moveTo(40, h - 170); g.lineTo(w - 40, h - 170); g.stroke();
  g.fillStyle = '#E5E2D8'; g.fillRect(w - 110, h - 168, 68, 96);            // 樓梯
  for (let k = 0; k < 8; k++) { g.beginPath(); g.moveTo(w - 108, h - 160 + k * 11); g.lineTo(w - 44, h - 160 + k * 11); g.stroke(); }
  g.fillStyle = '#7C8A96'; g.beginPath(); g.arc(40 + (w - 80) * 0.62, h - 200, 10, 0, 7); g.fill();  // 你在這裡(藍灰圓點)
  // 逃生路線(深藍灰粗箭頭,刻意不用綠色)
  g.strokeStyle = '#4E5C69'; g.lineWidth = 7; g.setLineDash([16, 9]);
  g.beginPath(); g.moveTo(40 + (w - 80) * 0.62, h - 200); g.lineTo(40 + (w - 80) * 0.62, h - 130); g.lineTo(w - 120, h - 130); g.stroke(); g.setLineDash([]);
  g.fillStyle = '#4E5C69'; g.beginPath(); g.moveTo(w - 120, h - 145); g.lineTo(w - 96, h - 130); g.lineTo(w - 120, h - 115); g.fill();
  // 圖例(只有圖示)
  g.fillStyle = '#9C5B55'; g.fillRect(52, h - 52, 14, 24);                 // 滅火器圖示
  g.fillStyle = '#7C8A96'; g.beginPath(); g.arc(110, h - 40, 9, 0, 7); g.fill();
  scribbleLines(g, 140, h - 58, w * 0.4, 30, 2, r);
}
function safetyPoster(g, w, h) {
  g.fillStyle = '#F7F5EE'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#5A6B78'; g.fillRect(0, 0, w, 70);
  // 標題列放一個大的「!」三角形圖示
  g.fillStyle = '#F7F5EE'; g.beginPath(); g.moveTo(w / 2, 12); g.lineTo(w / 2 + 28, 60); g.lineTo(w / 2 - 28, 60); g.closePath(); g.fill();
  g.fillStyle = '#5A6B78'; g.fillRect(w / 2 - 3, 28, 6, 18); g.fillRect(w / 2 - 3, 50, 6, 6);
  const icons = [
    g2 => { g2.beginPath(); g2.ellipse(-18, 0, 16, 12, 0, 0, 7); g2.ellipse(18, 0, 16, 12, 0, 0, 7); g2.stroke(); g2.beginPath(); g2.moveTo(-2, 0); g2.lineTo(2, 0); g2.stroke(); }, // 護目鏡
    g2 => { g2.beginPath(); g2.arc(0, -4, 22, Math.PI, 0); g2.lineTo(22, 6); g2.lineTo(-22, 6); g2.closePath(); g2.stroke(); g2.beginPath(); g2.moveTo(-26, 8); g2.lineTo(26, 8); g2.stroke(); }, // 安全帽/耳罩
    g2 => { g2.beginPath(); g2.moveTo(-14, 22); g2.lineTo(-14, -6); g2.quadraticCurveTo(-14, -22, 0, -22); g2.quadraticCurveTo(14, -22, 14, -6); g2.lineTo(14, 22); g2.stroke(); for (const x of [-7, 0, 7]) { g2.beginPath(); g2.moveTo(x, -22); g2.lineTo(x, -30); g2.stroke(); } }, // 手套
    g2 => { g2.beginPath(); g2.arc(0, 0, 24, 0, 7); g2.stroke(); g2.beginPath(); g2.moveTo(-17, -17); g2.lineTo(17, 17); g2.stroke(); g2.beginPath(); g2.moveTo(-6, 10); g2.lineTo(0, -12); g2.lineTo(6, 10); g2.stroke(); }, // 禁止(奔跑)
    g2 => { g2.beginPath(); for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, rr = i % 2 ? 16 : 22; g2.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } g2.closePath(); g2.stroke(); g2.beginPath(); g2.arc(0, 0, 6, 0, 7); g2.stroke(); }, // 旋轉機械
    g2 => { g2.beginPath(); g2.moveTo(-20, 18); g2.lineTo(0, -20); g2.lineTo(20, 18); g2.closePath(); g2.stroke(); g2.beginPath(); g2.moveTo(-4, -4); g2.lineTo(4, 2); g2.lineTo(-2, 4); g2.lineTo(5, 12); g2.stroke(); }, // 電氣危險
  ];
  icons.forEach((draw, i) => {
    const x = 90 + (i % 2) * (w - 180), y = 130 + Math.floor(i / 2) * 120;
    g.save(); g.translate(x, y);
    g.fillStyle = '#E3E8EC'; g.beginPath(); g.arc(0, 0, 44, 0, 7); g.fill();
    g.strokeStyle = '#4E5C69'; g.lineWidth = 4; g.lineCap = 'round'; draw(g); g.restore();
    g.fillStyle = 'rgba(120,124,128,0.35)'; g.fillRect(x + (i % 2 ? -150 : 60), y - 6, 90, 4); g.fillRect(x + (i % 2 ? -150 : 60), y + 6, 60, 4);
  });
}

function build() {
  canvas = document.createElement('canvas'); canvas.width = canvas.height = N;
  const g = canvas.getContext('2d');
  g.fillStyle = '#FBF8EF'; g.fillRect(0, 0, N, N);
  const r = rng(91);
  CELLS.forEach((name, i) => {
    const x = (i % 4) * CELL, y = Math.floor(i / 4) * CELL;
    g.save(); g.translate(x, y); g.beginPath(); g.rect(0, 0, CELL, CELL); g.clip();
    if (name.startsWith('sketch')) sketch(g, CELL, 362, +name.slice(6));
    else if (name === 'timetable') timetable(g, CELL, 362, r);
    else if (name === 'notice1') notice(g, 362, CELL, r, '#D8DFE4');
    else if (name === 'notice2') notice(g, 362, CELL, r, '#E6D9D5');
    else if (name === 'drawFourBar') drawing(g, CELL, 362, r, 'fourBar');
    else if (name === 'drawGear') drawing(g, CELL, 362, r, 'gear');
    else if (name === 'drawCam') drawing(g, 362, CELL, r, 'cam');
    else if (name === 'evacMap') evacMap(g, CELL, 362, r);
    else if (name === 'safetyPoster') safetyPoster(g, 362, CELL);
    g.restore();
  });
  // 極淡的紙張泛黃漸層(大面積、低對比)
  const grd = g.createLinearGradient(0, 0, N, N);
  grd.addColorStop(0, 'rgba(200,180,140,0.0)'); grd.addColorStop(1, 'rgba(200,180,140,0.05)');
  g.fillStyle = grd; g.fillRect(0, 0, N, N);
  tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
}

/** 共用的印刷品材質(雙面、霧面紙)。 */
export function printMat() {
  if (!mat) {
    build();
    mat = std('#ffffff', { map: tex, roughness: 0.9, side: THREE.DoubleSide, key: 'printAtlas' });
  }
  return mat;
}

/**
 * 把幾何的 uv(0..1)重新對應到圖集中的某一格。
 * landscape:內容是橫式(512×362)或直式(362×512);rotate:把橫式內容轉 90° 貼到直式紙上。
 */
export function atlasUV(geo, cell, { landscape = true, rotate = false } = {}) {
  const i = CELLS.indexOf(cell); if (i < 0) throw new Error(`atlas cell ${cell}`);
  const cw = landscape ? 512 : 362, ch = landscape ? 362 : 512;
  const u0 = (i % 4) * CELL / N, v1 = 1 - Math.floor(i / 4) * CELL / N; // canvas 上緣 = v 1
  const du = cw / N, dv = ch / N;
  const uv = geo.attributes.uv;
  for (let k = 0; k < uv.count; k++) {
    let u = uv.getX(k), v = uv.getY(k);
    if (rotate) [u, v] = [v, 1 - u];
    uv.setXY(k, u0 + u * du, v1 - dv + v * dv);
  }
  uv.needsUpdate = true;
  return geo;
}
