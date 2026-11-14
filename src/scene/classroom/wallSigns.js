import * as THREE from 'three';
import { std } from '../../materials/standard.js';
import { printMat, atlasUV } from '../../materials/printAtlas.js';
import { rbox, mk, group } from './util/geo.js';
import { LUMBER_RACK } from './layout.js';

// 逃生路線圖(門口旁右牆)與安全守則海報(後牆木料架上方,只用圖示)。
// 平面小物:details 群組,只在 high 模式顯示。貼圖都在印刷品圖集裡。
export function createWallSigns(details) {
  const g = group(details, 'wallSigns');
  const frame = std('#C9CCCE', { roughness: 0.4, metalness: 0 });
  // 逃生路線圖 0.42 × 0.3,鋁框
  const ev = group(g, 'evacuationMap', [3.25 - 0.006, 1.68, 3.26], [0, -Math.PI / 2, 0]);
  mk(ev, rbox(0.44, 0.32, 0.01, 0.003), frame, { pos: [0, 0, 0.005] });
  mk(ev, atlasUV(new THREE.PlaneGeometry(0.42, 0.3), 'evacMap', { landscape: true }), printMat(), { pos: [0, 0, 0.0105] });
  // 安全守則海報 0.45 × 0.62(直式)
  const ps = group(g, 'safetyPoster', [(LUMBER_RACK.x0 + LUMBER_RACK.x1) / 2, 2.42, 3.7 - 0.004], [0, Math.PI, 0]);
  mk(ps, atlasUV(new THREE.PlaneGeometry(0.45, 0.62), 'safetyPoster', { landscape: false }), printMat(), { pos: [0, 0, 0.002] });
  return g;
}
