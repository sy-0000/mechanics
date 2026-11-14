import * as THREE from 'three';
import { C } from '../../../materials/palette.js';
import { toon } from '../../../materials/toon.js';
import { rbox, torus, mk } from '../util/geo.js';
import { glassMat } from '../../../materials/glass.js';

// 護目鏡:灰色鏡框 + 鬆緊帶(下垂成弧)。透明鏡片另以一片淡透明平面繪製。
export function buildGoggles(g) {
  const frame = toon('#8D9295'), strap = toon('#6E7276');
  mk(g, rbox(0.16, 0.055, 0.03, 0.012), frame, { pos: [0, 0, 0.01] });
  mk(g, torus(0.075, 0.005, 6, 20, Math.PI), strap, { pos: [0, 0.0, 0.0], rot: [0, 0, Math.PI] , scale: [1, 1.1, 0.3] });
  return g;
}
export function gogglesLens() {
  const geo = new THREE.PlaneGeometry(0.14, 0.04);
  return { geo, mat: glassMat(0.25) };
}
