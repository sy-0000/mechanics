import * as THREE from 'three';
import { rng } from './canvasTex.js';

// 程序產生的 PBR 貼圖組(不下載任何外部資源)。
// 每組輸出三張貼圖:map(sRGB 反照率,接近白色,由材質 color 上色)、normalMap、orm(R=AO、G=粗糙度、B=金屬度)。
// orm 同時指定給 aoMap / roughnessMap / metalnessMap,一組只佔三張貼圖,降低 Quest 3 的記憶體與取樣成本。

export const PBR_SIZE = { high: 1024, vr: 1024 };

function canvas(n) { const c = document.createElement('canvas'); c.width = c.height = n; return c; }

/** 由高度圖計算法線(Sobel)與凹陷 AO,組合 ORM。 */
function finish(n, albedoC, heightC, roughC, { normalStrength = 2, aoStrength = 0.6, metal = 0, metalC = null, repeat = true }) {
  const H = heightC.getContext('2d').getImageData(0, 0, n, n).data;
  const R = roughC.getContext('2d').getImageData(0, 0, n, n).data;
  const M = metalC ? metalC.getContext('2d').getImageData(0, 0, n, n).data : null;
  const h = new Float32Array(n * n);
  for (let i = 0; i < n * n; i++) h[i] = H[i * 4] / 255;
  // 模糊高度(盒狀,半徑 6)作為局部平均,用於凹陷 AO
  const blur = new Float32Array(n * n), tmp = new Float32Array(n * n), r = 6;
  for (let y = 0; y < n; y++) { let s = 0; for (let x = -r; x <= r; x++) s += h[y * n + ((x + n) % n)]; for (let x = 0; x < n; x++) { tmp[y * n + x] = s / (2 * r + 1); s += h[y * n + ((x + r + 1) % n)] - h[y * n + ((x - r + n) % n)]; } }
  for (let x = 0; x < n; x++) { let s = 0; for (let y = -r; y <= r; y++) s += tmp[((y + n) % n) * n + x]; for (let y = 0; y < n; y++) { blur[y * n + x] = s / (2 * r + 1); s += tmp[((y + r + 1) % n) * n + x] - tmp[((y - r + n) % n) * n + x]; } }
  const nc = canvas(n), oc = canvas(n);
  const nd = nc.getContext('2d').createImageData(n, n), od = oc.getContext('2d').createImageData(n, n);
  const at = (x, y) => h[((y + n) % n) * n + ((x + n) % n)];
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const i = y * n + x;
    const dx = (at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x - 1, y) - at(x - 1, y + 1)) * normalStrength;
    const dy = (at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x, y - 1) - at(x + 1, y - 1)) * normalStrength;
    let vx = -dx, vy = dy, vz = 1; const l = Math.hypot(vx, vy, vz); vx /= l; vy /= l; vz /= l;
    nd.data[i * 4] = (vx * 0.5 + 0.5) * 255; nd.data[i * 4 + 1] = (vy * 0.5 + 0.5) * 255; nd.data[i * 4 + 2] = (vz * 0.5 + 0.5) * 255; nd.data[i * 4 + 3] = 255;
    const cav = Math.min(0, h[i] - blur[i]);
    od.data[i * 4] = THREE.MathUtils.clamp(1 + cav * 4 * aoStrength, 0.25, 1) * 255;
    od.data[i * 4 + 1] = R[i * 4];
    od.data[i * 4 + 2] = M ? M[i * 4] : metal * 255;
    od.data[i * 4 + 3] = 255;
  }
  nc.getContext('2d').putImageData(nd, 0, 0); oc.getContext('2d').putImageData(od, 0, 0);
  const tex = (c, srgb) => {
    const t = new THREE.CanvasTexture(c);
    if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.anisotropy = 4; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter;
    return t;
  };
  return { map: tex(albedoC, true), normalMap: tex(nc, false), orm: tex(oc, false) };
}

function layers(n) {
  const a = canvas(n), h = canvas(n), r = canvas(n);
  return { a, h, r, ga: a.getContext('2d'), gh: h.getContext('2d'), gr: r.getContext('2d') };
}
const gray = v => `rgb(${v | 0},${v | 0},${v | 0})`;

// ---------------- 木材 ----------------
// kind: grain(一般木紋)、laminate(集成材拼板)、knotty(節眼多的實木板)。UV 1 = 1 m,木紋沿 U。
export function woodSet(kind = 'grain', n = 1024) {
  const { a, h, r, ga, gh, gr } = layers(n), rand = rng(kind === 'laminate' ? 13 : kind === 'knotty' ? 3 : 7);
  ga.fillStyle = gray(236); ga.fillRect(0, 0, n, n);
  gh.fillStyle = gray(150); gh.fillRect(0, 0, n, n);
  gr.fillStyle = gray(150); gr.fillRect(0, 0, n, n); // 粗糙度約 0.6(上過護木油)
  const s = n / 512;
  if (kind === 'laminate') {
    let y = 0;
    while (y < n) {
      const bh = (30 + rand() * 50) * s, v = 214 + rand() * 34;
      ga.fillStyle = gray(v); ga.fillRect(0, y, n, bh);
      gh.fillStyle = gray(60); gh.fillRect(0, y, n, 1.2 * s); // 拼板接縫
      y += bh;
    }
  }
  // 年輪線:同一條線用固定頻率,兩層正弦疊加,避免鋸齒
  const lines = kind === 'knotty' ? 110 : 140;
  for (let i = 0; i < lines; i++) {
    // 頻率取整數週期,左右可無縫重複;上下邊緣的線也在另一側補畫一次
    const y0 = rand() * n, amp = (2 + rand() * 6) * s, k1 = 1 + ((rand() * 4) | 0), k2 = k1 * 3 + 1, ph = rand() * 10;
    const dark = 0.035 + rand() * 0.1, w = (0.6 + rand() * 1.8) * s;
    for (const yy of [y0, y0 - n, y0 + n]) {
      if (yy < -20 || yy > n + 20) continue;
      const path = new Path2D();
      for (let x = 0; x <= n; x += 4) path.lineTo(x, yy + Math.sin(x / n * Math.PI * 2 * k1 + ph) * amp + Math.sin(x / n * Math.PI * 2 * k2 + ph * 2) * amp * 0.3);
      ga.strokeStyle = `rgba(110,85,60,${dark})`; ga.lineWidth = w; ga.stroke(path);
      gh.strokeStyle = `rgba(0,0,0,${dark * 1.4})`; gh.lineWidth = w; gh.stroke(path);
      gr.strokeStyle = `rgba(255,255,255,${dark * 0.7})`; gr.lineWidth = w; gr.stroke(path);
    }
  }
  // 導管細孔(短刻痕)
  for (let i = 0; i < 9000; i++) {
    const x = rand() * n, y = rand() * n, l = (2 + rand() * 7) * s;
    ga.fillStyle = `rgba(100,80,60,${0.03 + rand() * 0.05})`; ga.fillRect(x, y, l, 0.8 * s);
    gh.fillStyle = 'rgba(0,0,0,0.18)'; gh.fillRect(x, y, l, 0.8 * s);
  }
  const knots = kind === 'knotty' ? 5 : kind === 'grain' ? 1 : 0;
  for (let k = 0; k < knots; k++) {
    const x = rand() * n, y = rand() * n, R = (8 + rand() * 10) * s;
    for (let j = 7; j > 0; j--) {
      ga.strokeStyle = `rgba(95,70,50,${0.06 + j * 0.03})`; ga.lineWidth = 1.5 * s;
      ga.beginPath(); ga.ellipse(x, y, R * j / 4, R * j / 9, 0, 0, Math.PI * 2); ga.stroke();
    }
    ga.fillStyle = 'rgba(90,65,45,0.55)'; ga.beginPath(); ga.ellipse(x, y, R * 0.5, R * 0.25, 0, 0, Math.PI * 2); ga.fill();
    gh.fillStyle = 'rgba(0,0,0,0.5)'; gh.beginPath(); gh.ellipse(x, y, R * 0.5, R * 0.25, 0, 0, Math.PI * 2); gh.fill();
  }
  // 使用痕跡:淡淡刮痕(較亮、較粗糙)
  for (let i = 0; i < 60; i++) {
    const x = rand() * n, y = rand() * n, l = (10 + rand() * 60) * s, ang = (rand() - 0.5) * 0.8;
    gr.strokeStyle = 'rgba(255,255,255,0.35)'; gr.lineWidth = 0.8 * s;
    gr.beginPath(); gr.moveTo(x, y); gr.lineTo(x + Math.cos(ang) * l, y + Math.sin(ang) * l); gr.stroke();
  }
  return finish(n, a, h, r, { normalStrength: 1.1, aoStrength: 0.4 });
}

// ---------------- 磨石子地板(細微裂痕與髒污) ----------------
export function terrazzoSet(n = 1024) {
  const { a, h, r, ga, gh, gr } = layers(n), rand = rng(5);
  ga.fillStyle = gray(244); ga.fillRect(0, 0, n, n);
  gh.fillStyle = gray(160); gh.fillRect(0, 0, n, n);
  gr.fillStyle = gray(105); gr.fillRect(0, 0, n, n); // 打磨過:粗糙度約 0.41
  const cols = [[214, 211, 205], [196, 192, 186], [255, 255, 255], [222, 214, 203], [188, 192, 195], [216, 205, 196], [170, 170, 168]];
  for (let i = 0; i < 14000; i++) {
    const c = cols[(rand() * cols.length) | 0], x = rand() * n, y = rand() * n, sz = 1 + rand() * rand() * 7;
    ga.fillStyle = `rgb(${c})`;
    ga.beginPath(); ga.ellipse(x, y, sz, sz * (0.5 + rand() * 0.5), rand() * 3, 0, Math.PI * 2); ga.fill();
    gr.fillStyle = gray(80 + rand() * 30); gr.fill(); // 石粒較光滑
  }
  // 髒污:大片柔和的灰褐色斑塊(較粗糙)
  for (let i = 0; i < 26; i++) {
    const x = rand() * n, y = rand() * n, R = 40 + rand() * 160;
    const g1 = ga.createRadialGradient(x, y, 0, x, y, R); g1.addColorStop(0, `rgba(120,110,95,${0.05 + rand() * 0.08})`); g1.addColorStop(1, 'rgba(120,110,95,0)');
    ga.fillStyle = g1; ga.fillRect(x - R, y - R, R * 2, R * 2);
    const g2 = gr.createRadialGradient(x, y, 0, x, y, R); g2.addColorStop(0, 'rgba(255,255,255,0.25)'); g2.addColorStop(1, 'rgba(255,255,255,0)');
    gr.fillStyle = g2; gr.fillRect(x - R, y - R, R * 2, R * 2);
  }
  // 鞋印擦痕
  for (let i = 0; i < 40; i++) {
    const x = rand() * n, y = rand() * n;
    ga.strokeStyle = `rgba(90,85,80,${0.04 + rand() * 0.05})`; ga.lineWidth = 2 + rand() * 4;
    ga.beginPath(); ga.arc(x, y, 20 + rand() * 40, rand() * 6, rand() * 6 + 1); ga.stroke();
  }
  // 細微裂痕:隨機行走折線(深凹、暗、粗糙)
  for (let i = 0; i < 7; i++) {
    let x = rand() * n, y = rand() * n, ang = rand() * Math.PI * 2;
    const p = new Path2D(); p.moveTo(x, y);
    const steps = 20 + rand() * 50;
    for (let k = 0; k < steps; k++) {
      ang += (rand() - 0.5) * 0.9; x += Math.cos(ang) * 6; y += Math.sin(ang) * 6; p.lineTo(x, y);
      if (rand() < 0.04) { const bx = x, by = y; let ba = ang + (rand() - 0.5) * 2; const bp = new Path2D(); bp.moveTo(bx, by); let cx = bx, cy = by; for (let j = 0; j < 8; j++) { ba += (rand() - 0.5) * 0.8; cx += Math.cos(ba) * 5; cy += Math.sin(ba) * 5; bp.lineTo(cx, cy); } ga.strokeStyle = 'rgba(80,75,70,0.35)'; ga.lineWidth = 0.8; ga.stroke(bp); gh.strokeStyle = 'rgba(0,0,0,0.7)'; gh.lineWidth = 1; gh.stroke(bp); }
    }
    ga.strokeStyle = 'rgba(75,70,65,0.5)'; ga.lineWidth = 1.1; ga.stroke(p);
    gh.strokeStyle = 'rgba(0,0,0,0.9)'; gh.lineWidth = 1.4; gh.stroke(p);
    gr.strokeStyle = 'rgba(255,255,255,0.8)'; gr.lineWidth = 2; gr.stroke(p);
  }
  return finish(n, a, h, r, { normalStrength: 2.2, aoStrength: 0.8 });
}

// ---------------- 牆面乳膠漆 ----------------
export function wallSet(n = 512) {
  const { a, h, r, ga, gh, gr } = layers(n), rand = rng(17);
  ga.fillStyle = gray(246); ga.fillRect(0, 0, n, n);
  gh.fillStyle = gray(128); gh.fillRect(0, 0, n, n);
  gr.fillStyle = gray(225); gr.fillRect(0, 0, n, n); // 霧面
  for (let i = 0; i < 9000; i++) { // 橘皮紋
    const x = rand() * n, y = rand() * n, R = 1 + rand() * 3;
    gh.fillStyle = `rgba(${rand() < 0.5 ? '0,0,0' : '255,255,255'},${0.12 + rand() * 0.15})`;
    gh.beginPath(); gh.arc(x, y, R, 0, Math.PI * 2); gh.fill();
  }
  for (let i = 0; i < 18; i++) { // 不均勻的淡斑
    const x = rand() * n, y = rand() * n, R = 30 + rand() * 90;
    const g = ga.createRadialGradient(x, y, 0, x, y, R); g.addColorStop(0, `rgba(150,140,125,${0.025 + rand() * 0.03})`); g.addColorStop(1, 'rgba(150,140,125,0)');
    ga.fillStyle = g; ga.fillRect(x - R, y - R, R * 2, R * 2);
  }
  return finish(n, a, h, r, { normalStrength: 0.8, aoStrength: 0.2 });
}

// ---------------- 金屬 ----------------
// kind: brushed(拉絲鋼、鋁)、painted(烤漆機台,掉漆處露出金屬)、cast(鑄鐵)。磨損與刮痕都有。
export function metalSet(kind = 'brushed', n = 1024) {
  const { a, h, r, ga, gh, gr } = layers(n), rand = rng(kind === 'brushed' ? 21 : kind === 'painted' ? 23 : 29);
  const m = canvas(n), gm = m.getContext('2d');
  const base = { brushed: [240, 128, 85, 255], painted: [244, 128, 120, 0], cast: [230, 128, 175, 200] }[kind];
  ga.fillStyle = gray(base[0]); ga.fillRect(0, 0, n, n);
  gh.fillStyle = gray(base[1]); gh.fillRect(0, 0, n, n);
  gr.fillStyle = gray(base[2]); gr.fillRect(0, 0, n, n);
  gm.fillStyle = gray(base[3]); gm.fillRect(0, 0, n, n);
  if (kind === 'brushed') {
    for (let i = 0; i < 2600; i++) { // 拉絲
      const y = rand() * n, v = rand();
      gr.fillStyle = `rgba(${v < 0.5 ? '0,0,0' : '255,255,255'},${0.03 + rand() * 0.06})`; gr.fillRect(0, y, n, 0.7 + rand());
      gh.fillStyle = `rgba(${v < 0.5 ? '0,0,0' : '255,255,255'},0.12)`; gh.fillRect(0, y, n, 0.7);
      ga.fillStyle = `rgba(${v < 0.5 ? '200,200,200' : '255,255,255'},0.04)`; ga.fillRect(0, y, n, 0.7);
    }
  }
  if (kind === 'cast') {
    for (let i = 0; i < 26000; i++) { const x = rand() * n, y = rand() * n; gh.fillStyle = `rgba(${rand() < 0.5 ? '0,0,0' : '255,255,255'},0.35)`; gh.fillRect(x, y, 1.5, 1.5); ga.fillStyle = `rgba(80,80,80,${rand() * 0.15})`; ga.fillRect(x, y, 1.5, 1.5); }
  }
  if (kind === 'painted') {
    for (let i = 0; i < 5000; i++) { const x = rand() * n, y = rand() * n; gh.fillStyle = `rgba(${rand() < 0.5 ? '0,0,0' : '255,255,255'},0.15)`; gh.beginPath(); gh.arc(x, y, 1.5 + rand() * 2, 0, 7); gh.fill(); }
    // 掉漆:露出深灰金屬(金屬度 1、粗糙度低、高度凹陷)
    for (let i = 0; i < 70; i++) {
      const x = rand() * n, y = rand() * n, R = 2 + rand() * rand() * 14;
      const p = new Path2D(); for (let k = 0; k < 9; k++) { const ang = k / 9 * Math.PI * 2, rr = R * (0.5 + rand() * 0.7); p.lineTo(x + Math.cos(ang) * rr, y + Math.sin(ang) * rr); } p.closePath();
      ga.fillStyle = 'rgb(150,150,150)'; ga.fill(p); gm.fillStyle = 'rgb(255,255,255)'; gm.fill(p);
      gr.fillStyle = 'rgb(90,90,90)'; gr.fill(p); gh.fillStyle = 'rgb(70,70,70)'; gh.fill(p);
    }
  }
  // 刮痕(亮、光滑)與使用磨損斑(較光亮)
  for (let i = 0; i < (kind === 'cast' ? 40 : 160); i++) {
    const x = rand() * n, y = rand() * n, l = 8 + rand() * 70, ang = rand() * Math.PI;
    const p = new Path2D(); p.moveTo(x, y); p.quadraticCurveTo(x + Math.cos(ang) * l / 2 + rand() * 6, y + Math.sin(ang) * l / 2, x + Math.cos(ang) * l, y + Math.sin(ang) * l);
    ga.strokeStyle = 'rgba(255,255,255,0.35)'; ga.lineWidth = 0.7; ga.stroke(p);
    gr.strokeStyle = 'rgba(0,0,0,0.45)'; gr.lineWidth = 0.9; gr.stroke(p);
    gh.strokeStyle = 'rgba(0,0,0,0.4)'; gh.lineWidth = 0.7; gh.stroke(p);
    if (kind === 'painted') { gm.strokeStyle = 'rgba(255,255,255,0.8)'; gm.lineWidth = 0.7; gm.stroke(p); }
  }
  for (let i = 0; i < 14; i++) {
    const x = rand() * n, y = rand() * n, R = 30 + rand() * 80;
    const g = gr.createRadialGradient(x, y, 0, x, y, R); g.addColorStop(0, 'rgba(0,0,0,0.18)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    gr.fillStyle = g; gr.fillRect(x - R, y - R, R * 2, R * 2);
    const d = ga.createRadialGradient(x, y, 0, x, y, R); d.addColorStop(0, 'rgba(110,100,90,0.08)'); d.addColorStop(1, 'rgba(110,100,90,0)');
    ga.fillStyle = d; ga.fillRect(x - R, y - R, R * 2, R * 2);
  }
  return finish(n, a, h, r, { normalStrength: kind === 'cast' ? 2.5 : 1.0, aoStrength: 0.4, metalC: m });
}

// ---------------- 帆布 / 布料 ----------------
export function fabricSet(n = 256) {
  const { a, h, r, ga, gh, gr } = layers(n), rand = rng(11);
  ga.fillStyle = gray(240); ga.fillRect(0, 0, n, n);
  gh.fillStyle = gray(128); gh.fillRect(0, 0, n, n);
  gr.fillStyle = gray(240); gr.fillRect(0, 0, n, n);
  for (let i = 0; i < n; i += 2) {
    gh.fillStyle = 'rgba(255,255,255,0.35)'; gh.fillRect(0, i, n, 1); gh.fillStyle = 'rgba(0,0,0,0.25)'; gh.fillRect(i, 0, 1, n);
    ga.fillStyle = `rgba(0,0,0,${0.02 + rand() * 0.04})`; ga.fillRect(0, i, n, 1); ga.fillRect(i, 0, 1, n);
  }
  return finish(n, a, h, r, { normalStrength: 1.2, aoStrength: 0.4 });
}

// ---------------- 黑板石板 ----------------
export function slateRoughSet(n = 512) {
  const { a, h, r, ga, gh, gr } = layers(n), rand = rng(77);
  ga.fillStyle = gray(255); ga.fillRect(0, 0, n, n);
  gh.fillStyle = gray(128); gh.fillRect(0, 0, n, n);
  gr.fillStyle = gray(215); gr.fillRect(0, 0, n, n);
  for (let i = 0; i < 12000; i++) { gh.fillStyle = `rgba(${rand() < 0.5 ? '0,0,0' : '255,255,255'},0.2)`; gh.fillRect(rand() * n, rand() * n, 1, 1); }
  return finish(n, a, h, r, { normalStrength: 0.6, aoStrength: 0.1 });
}
