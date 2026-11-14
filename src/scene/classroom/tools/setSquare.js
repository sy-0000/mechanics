import * as THREE from 'three';
import { extrude, mk, group } from '../util/geo.js';

// 三角板:淡煙灰透明壓克力,中間鏤空。平放(本地 XZ 平面)。
export function createSetSquare(parent, { pos, rot, size = 0.2 } = {}) {
  const g = group(parent, 'setSquare', pos, rot);
  const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(size, 0); s.lineTo(0, size * 0.58); s.closePath();
  const h = new THREE.Path(); const k = 0.28; h.moveTo(size * 0.12, size * 0.07); h.lineTo(size * (0.12 + k * 1.2), size * 0.07); h.lineTo(size * 0.12, size * (0.07 + k * 0.7)); h.closePath(); s.holes.push(h);
  const mat = new THREE.MeshStandardMaterial({ color: '#C9D1D4', transparent: true, opacity: 0.45, roughness: 0.15, metalness: 0, depthWrite: false });
  mk(g, extrude(s, 0.002, 0.0005), mat, { rot: [-Math.PI / 2, 0, 0], pos: [0, 0.0015, 0] });
  return g;
}
