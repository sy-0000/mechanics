import { makeCanvas, canvasTexture, rng } from './canvasTex.js';
import { toon } from './toon.js';

// 磨石子:淺奶油灰底 + 細小石粒(灰、白、淡褐)。1 張 = 1 m。
let tex = null;
export function terrazzoTexture() {
  if (tex) return tex;
  const c = makeCanvas(1024, 1024), g = c.getContext('2d'), r = rng(5);
  g.fillStyle = '#f6f4ef'; g.fillRect(0, 0, 1024, 1024);
  const cols = ['#d8d5cf', '#c7c3bc', '#ffffff', '#e1d8cc', '#bfc2c4', '#d9cfc6'];
  for (let i = 0; i < 9000; i++) {
    g.fillStyle = cols[(r() * cols.length) | 0];
    const x = r() * 1024, y = r() * 1024, s = 1 + r() * 3.5;
    g.beginPath(); g.ellipse(x, y, s, s * (0.5 + r() * 0.5), r() * 3, 0, Math.PI * 2); g.fill();
  }
  return (tex = canvasTexture(c));
}
export function terrazzoMat(color) {
  return toon(color, { map: terrazzoTexture(), key: 'terrazzo' });
}
