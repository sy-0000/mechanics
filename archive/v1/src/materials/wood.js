// 木材材質:程序產生細木紋 canvas 貼圖 + toon。
import * as THREE from 'three';
import { toonMaterial, COLORS } from './toon.js';

const cache = new Map();

/** 程序木紋貼圖 */
export function woodTexture(base = '#B99B74', streak = '#99794F', size = 256) {
  const key = `${base}|${streak}`;
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  g.fillStyle = base;
  g.fillRect(0, 0, size, size);
  // 縱向木紋條
  let seed = 7;
  const rand = () => (seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;
  g.strokeStyle = streak;
  for (let i = 0; i < 28; i++) {
    g.globalAlpha = 0.08 + rand() * 0.1;
    g.lineWidth = 1 + rand() * 2.5;
    const x = rand() * size;
    g.beginPath();
    g.moveTo(x, 0);
    for (let y = 0; y <= size; y += 16) {
      g.lineTo(x + Math.sin(y * 0.05 + i) * 3 + rand() * 2, y);
    }
    g.stroke();
  }
  g.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  cache.set(key, tex);
  return tex;
}

/** 深棕機架木(語意:機架) */
export function frameWood() {
  return toonMaterial('#FFFFFF', { map: woodTexture(COLORS.frame, '#43291B') });
}

/** 一般淺木(底座框、徽章牆、托盤) */
export function lightWood() {
  return toonMaterial('#FFFFFF', { map: woodTexture(COLORS.wood, '#99794F') });
}

/** 奶油桌面(細微紙感噪點) */
export function creamTop() {
  return toonMaterial(COLORS.cream);
}
