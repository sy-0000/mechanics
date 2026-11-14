import * as THREE from 'three';
import { makeCanvas, canvasTexture } from '../../../materials/canvasTex.js';
import { toon } from '../../../materials/toon.js';
import { rbox, mk, group } from '../util/geo.js';

// 鋼尺:拉絲鋼面 + 黑色刻度線(無數字)。沿本地 +X,length 30 或 60 cm。
const texCache = {};
function scaleTex(len) {
  if (texCache[len]) return texCache[len];
  const c = makeCanvas(1024, 64), g = c.getContext('2d');
  g.fillStyle = '#e4e6e7'; g.fillRect(0, 0, 1024, 64);
  for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * 0.3})`; g.fillRect(0, Math.random() * 64, 1024, 1); }
  const mm = len * 1000, px = 1024 / mm;
  g.fillStyle = '#2f3133';
  for (let m = 0; m <= mm; m++) {
    const h = m % 10 === 0 ? 22 : m % 5 === 0 ? 15 : 9;
    g.fillRect(m * px, 0, Math.max(0.7, px * 0.25), h);
  }
  return (texCache[len] = canvasTexture(c, { repeat: false }));
}
export function createSteelRuler(parent, { pos, rot, length = 0.3 } = {}) {
  const g = group(parent, `steelRuler${Math.round(length * 100)}`, pos, rot);
  const w = length > 0.4 ? 0.03 : 0.025;
  mk(g, rbox(length, 0.0012, w, 0.0005), toon('#C8CCCE'), { pos: [0, 0.0006, 0] });
  const face = mk(g, new THREE.PlaneGeometry(length, w), toon('#ffffff', { map: scaleTex(length), key: `ruler${length}` }), { pos: [0, 0.00125, 0], rot: [-Math.PI / 2, 0, 0], outline: false });
  // 吊孔
  mk(g, new THREE.CircleGeometry(0.003, 12), toon('#55585A'), { pos: [-length / 2 + 0.012, 0.0013, 0], rot: [-Math.PI / 2, 0, 0], outline: false });
  return g;
}
