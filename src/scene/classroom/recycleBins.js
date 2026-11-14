import * as THREE from 'three';
import { C } from '../../materials/palette.js';
import { std } from '../../materials/standard.js';
import { lathe, rbox, mk, group, instanced } from './util/geo.js';
import { rng } from '../../materials/canvasTex.js';

// 角落的垃圾桶與回收桶:右牆吊櫃下方的空地,兩個有蓋方桶(大型物件,vr 保留,材質併入既有批次)。
// 桶口的紙團與寶特瓶(小物,實例化)放在 details 群組。資源回收只用圖示(三箭頭環),無文字。
export const BINS = [[3.03, 0, -3.05, '#8F9599', 'trash'], [3.03, 0, -2.62, C.blueGray, 'recycle']];
export function createRecycleBins(main, details) {
  const r = rng(57);
  BINS.forEach(([x, y, z, color, kind]) => {
    const g = group(main, `bin-${kind}`, [x, y, z], [0, -Math.PI / 2, 0]);
    const body = std(color, { roughness: 0.6 });
    // 上寬下窄的方桶(以 4 段 lathe 做成方形斷面)
    mk(g, lathe([[0.001, 0], [0.15, 0], [0.18, 0.6], [0.001, 0.6]], 4), body, { rot: [0, Math.PI / 4, 0], scale: [1, 1, 0.82] });
    // 蓋子:鉸鏈在靠牆側,掀開約 65°,看得到桶內
    const lid = group(g, 'lid', [0, 0.61, -0.115], [-(kind === 'trash' ? 1.15 : 0.95), 0, 0]);
    mk(lid, rbox(0.27, 0.02, 0.23, 0.008), std('#E3E3DE', { roughness: 0.6 }), { pos: [0, 0.01, 0.115] });
    if (kind === 'recycle') {
      // 回收圖示:三段箭頭環(淺色浮貼)
      for (let i = 0; i < 3; i++) mk(g, new THREE.TorusGeometry(0.045, 0.006, 4, 10, Math.PI * 0.5), std('#E3E3DE', { roughness: 0.6 }), { pos: [0, 0.34, 0.128], rot: [0.08, 0, i * Math.PI * 2 / 3] });
    }
    // 桶口內容(小物)
    const top = group(details, `binContents-${kind}`, [x, y, z], [0, -Math.PI / 2, 0]);
    if (kind === 'trash') {
      instanced(top, new THREE.IcosahedronGeometry(0.035, 0), std('#F1EFE8', { roughness: 0.9 }),
        Array.from({ length: 6 }, () => ({ pos: [(r() - 0.5) * 0.2, 0.56 + r() * 0.03, (r() - 0.5) * 0.14], rot: [r() * 3, r() * 3, r() * 3], scale: 0.8 + r() * 0.5 })), { name: 'paperBalls' });
    } else {
      const bottle = new THREE.MeshStandardMaterial({ color: '#DCE3E6', transparent: true, opacity: 0.55, roughness: 0.15 });
      instanced(top, lathe([[0.001, 0], [0.03, 0], [0.032, 0.14], [0.012, 0.19], [0.012, 0.21], [0.001, 0.21]], 10), bottle,
        [0, 1, 2].map(i => ({ pos: [-0.07 + i * 0.07, 0.48, (r() - 0.5) * 0.1], rot: [0.4 + r() * 0.8, r() * 3, 0.5 * (i - 1)] })), { name: 'petBottles' });
    }
  });
}
