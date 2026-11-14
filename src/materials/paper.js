import { makeCanvas, canvasTexture, rng } from './canvasTex.js';
import { toon } from './toon.js';

// A3 機構草圖:只有線條、圓、尺寸線與箭頭,沒有任何可讀文字。
export function sketchTexture(seed = 1) {
  const c = makeCanvas(724, 512), g = c.getContext('2d'), r = rng(seed);
  g.fillStyle = '#fbf8ef'; g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = 'rgba(120,122,125,0.9)'; g.lineWidth = 2;
  g.strokeRect(18, 18, c.width - 36, c.height - 36);
  g.strokeRect(c.width - 190, c.height - 70, 172, 52); // 標題欄(空白)
  g.lineWidth = 2.2;
  const pts = [];
  for (let i = 0; i < 4; i++) pts.push([120 + r() * 480, 120 + r() * 260]);
  g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.stroke();
  pts.forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 9, 0, Math.PI * 2); g.stroke(); });
  // 齒輪或曲柄
  const cx = 140 + r() * 420, cy = 140 + r() * 220, R = 40 + r() * 40;
  g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.stroke();
  g.setLineDash([10, 5, 2, 5]); g.beginPath(); g.moveTo(cx - R - 20, cy); g.lineTo(cx + R + 20, cy);
  g.moveTo(cx, cy - R - 20); g.lineTo(cx, cy + R + 20); g.stroke(); g.setLineDash([]);
  // 尺寸線與箭頭
  g.lineWidth = 1.2;
  const dim = (x1, y1, x2, y2) => {
    g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
    const a = Math.atan2(y2 - y1, x2 - x1);
    for (const [x, y, s] of [[x1, y1, 1], [x2, y2, -1]]) {
      g.beginPath(); g.moveTo(x, y);
      g.lineTo(x + s * 10 * Math.cos(a - 0.3), y + s * 10 * Math.sin(a - 0.3));
      g.lineTo(x + s * 10 * Math.cos(a + 0.3), y + s * 10 * Math.sin(a + 0.3)); g.closePath(); g.fill();
    }
  };
  g.fillStyle = 'rgba(120,122,125,0.9)';
  dim(pts[0][0], 440, pts[1][0], 440); dim(60, pts[0][1], 60, pts[2][1]);
  return canvasTexture(c, { repeat: false });
}
export function paperMat(seed) {
  return toon('#ffffff', { map: sketchTexture(seed), key: `paper|${seed}` });
}
