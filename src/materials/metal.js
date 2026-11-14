import { makeCanvas, canvasTexture, rng } from './canvasTex.js';
import { toon } from './toon.js';

let brushed = null, file = null;
export function brushedTexture() {
  if (brushed) return brushed;
  const c = makeCanvas(256, 256), g = c.getContext('2d'), r = rng(3);
  g.fillStyle = '#efefef'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 400; i++) {
    const y = r() * 256, v = 200 + r() * 55;
    g.strokeStyle = `rgba(${v},${v},${v},0.5)`; g.beginPath(); g.moveTo(0, y); g.lineTo(256, y + r() * 2 - 1); g.stroke();
  }
  return (brushed = canvasTexture(c));
}
/** 銼刀細紋(交叉斜線)。 */
export function fileTexture() {
  if (file) return file;
  const c = makeCanvas(128, 128), g = c.getContext('2d');
  g.fillStyle = '#e8e8e8'; g.fillRect(0, 0, 128, 128);
  g.strokeStyle = 'rgba(70,70,70,0.45)';
  for (let i = -128; i < 256; i += 4) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 64, 128); g.stroke(); }
  g.strokeStyle = 'rgba(70,70,70,0.25)';
  for (let i = -128; i < 256; i += 5) { g.beginPath(); g.moveTo(i, 128); g.lineTo(i + 64, 0); g.stroke(); }
  return (file = canvasTexture(c));
}
export function metalMat(color, brushedFinish = false) {
  return brushedFinish ? toon(color, { map: brushedTexture(), key: `metalB|${color}` }) : toon(color);
}
