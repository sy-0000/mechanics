import { makeCanvas, canvasTexture, rng } from './canvasTex.js';
import { toon } from './toon.js';
import * as THREE from 'three';

let canvasWeave = null;
export function weaveTexture() {
  if (canvasWeave) return canvasWeave;
  const c = makeCanvas(128, 128), g = c.getContext('2d'), r = rng(11);
  g.fillStyle = '#f2f2f2'; g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 128; i += 2) {
    g.fillStyle = `rgba(0,0,0,${0.02 + r() * 0.03})`; g.fillRect(0, i, 128, 1); g.fillRect(i, 0, 1, 128);
  }
  return (canvasWeave = canvasTexture(c));
}
export function fabricMat(color) {
  return toon(color, { map: weaveTexture(), side: THREE.DoubleSide, key: `fabric|${color}` });
}
