import * as THREE from 'three';
import { std } from '../../materials/standard.js';
import { WINDOWS } from './layout.js';
import { lathe, cyl, mk, group, instanced } from './util/geo.js';
import { rng } from '../../materials/canvasTex.js';

// 窗台盆栽(小物,details 群組,只在 high 顯示,不投影):奶油色與淺灰陶盆,種灰藍綠色的多肉植物
// (蓮座型與虎尾蘭型)。顏色刻意偏灰藍,遠離教具的輸出件綠。葉片實例化。
const POTS = [
  { z: -2.95, kind: 'rosette', pot: '#E8E2D4', s: 1 },
  { z: -1.98, kind: 'rosette', pot: '#BFC3C4', s: 0.8 },
  { z: 0.35, kind: 'snake', pot: '#E8E2D4', s: 1 },
  { z: 2.55, kind: 'rosette', pot: '#D8C0BA', s: 0.9 },
];
export function createWindowPlants(details) {
  const g = group(details, 'windowPlants');
  const r = rng(73), x = WINDOWS.x + 0.1, y = WINDOWS.sill + 0.005;
  const leaves = [], blades = [];
  const leafMat = std('#A3B3AB', { roughness: 0.6 }), soil = std('#5B5A58', { roughness: 0.9 });
  POTS.forEach(({ z, kind, pot, s }) => {
    const pg = group(g, 'pot', [x, y, z]);
    mk(pg, lathe([[0.001, 0], [0.045, 0], [0.058, 0.085], [0.062, 0.09], [0.06, 0.095], [0.001, 0.095]], 18), std(pot, { roughness: 0.6 }), { scale: s });
    mk(pg, cyl(0.054 * s, 0.054 * s, 0.006, 16), soil, { pos: [0, 0.088 * s, 0] });
    if (kind === 'rosette') {
      for (let ring = 0; ring < 3; ring++) for (let i = 0; i < 7 - ring; i++) {
        const a = i / (7 - ring) * Math.PI * 2 + ring * 0.4, rad = (0.03 - ring * 0.009) * s;
        leaves.push({ pos: [x + Math.cos(a) * rad, y + (0.098 + ring * 0.012) * s, z + Math.sin(a) * rad], rot: [0, -a, 0.5 + ring * 0.35], scale: [s * (1 - ring * 0.2), s * (1 - ring * 0.2), s * (1 - ring * 0.2)] });
      }
    } else {
      for (let i = 0; i < 7; i++) {
        const a = r() * Math.PI * 2, rad = r() * 0.025;
        blades.push({ pos: [x + Math.cos(a) * rad, y + 0.09, z + Math.sin(a) * rad], rot: [(r() - 0.5) * 0.25, r() * 3, (r() - 0.5) * 0.25], scale: [1, 0.7 + r() * 0.5, 1] });
      }
    }
  });
  // 多肉葉片:扁橢球
  const leafGeo = new THREE.SphereGeometry(0.02, 8, 5); leafGeo.scale(1.2, 0.35, 0.6); leafGeo.translate(0.018, 0, 0);
  instanced(g, leafGeo, leafMat, leaves, { name: 'succulentLeaves' });
  // 虎尾蘭葉片:細長尖葉
  const bladeGeo = new THREE.ConeGeometry(0.012, 0.28, 4, 1); bladeGeo.scale(1, 1, 0.3); bladeGeo.translate(0, 0.14, 0);
  instanced(g, bladeGeo, std('#98A9A2', { roughness: 0.6 }), blades, { name: 'snakePlantBlades' });
  return g;
}
