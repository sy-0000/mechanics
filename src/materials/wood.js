import { makeCanvas, canvasTexture, rng } from './canvasTex.js';
import { toon } from './toon.js';

// 程序木紋:淡色條紋 + 少量節眼。貼圖為灰階明度,色彩由材質 color 決定。UV 以公尺計,1 張 = 1 m。
const texCache = {};
export function woodTexture(kind = 'grain', seed = 7) {
  const key = kind + seed;
  if (texCache[key]) return texCache[key];
  const c = makeCanvas(512, 512), g = c.getContext('2d'), r = rng(seed);
  g.fillStyle = '#f4f4f4'; g.fillRect(0, 0, 512, 512);
  if (kind === 'laminate') {
    // 集成材:一條條寬度不同的拼板
    let y = 0;
    while (y < 512) {
      const h = 28 + r() * 40, v = 228 + r() * 24;
      g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(0, y, 512, h); y += h;
    }
  }
  for (let i = 0; i < 70; i++) {
    const y0 = r() * 512, amp = 2 + r() * 6, a = 0.04 + r() * 0.08;
    g.strokeStyle = `rgba(90,80,70,${a})`; g.lineWidth = 0.6 + r() * 1.6;
    g.beginPath();
    for (let x = 0; x <= 512; x += 16) g.lineTo(x, y0 + Math.sin(x / (40 + r() * 30) + i) * amp);
    g.stroke();
  }
  const knots = kind === 'knotty' ? 4 : kind === 'laminate' ? 0 : 1;
  for (let k = 0; k < knots; k++) {
    const x = r() * 512, y = r() * 512;
    for (let j = 6; j > 0; j--) {
      g.strokeStyle = `rgba(80,70,60,${0.05 + j * 0.02})`; g.lineWidth = 1;
      g.beginPath(); g.ellipse(x, y, j * 5, j * 2.2, 0, 0, Math.PI * 2); g.stroke();
    }
  }
  return (texCache[key] = canvasTexture(c));
}
export function woodMat(color, kind = 'grain', seed = 7) {
  return toon(color, { map: woodTexture(kind, seed), key: `wood|${color}|${kind}|${seed}` });
}
