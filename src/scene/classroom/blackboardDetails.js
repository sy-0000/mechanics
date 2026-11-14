import * as THREE from 'three';
import { BOARD } from './layout.js';
import { std } from '../../materials/standard.js';
import { woodMat } from '../../materials/wood.js';
import { C } from '../../materials/palette.js';
import { makeCanvas, canvasTexture, rng } from '../../materials/canvasTex.js';
import { cyl, rbox, mk, group, instanced, extrude, tube } from './util/geo.js';

// 黑板細節(全部是小物,放在 details 群組,只在 high 模式顯示,不投影):
//  - 粉筆槽內長短不一的粉筆頭(實例化)與粉筆灰(低對比的大面積漸層)
//  - 板面幾顆磁鐵(只放在三區下方的空白處,不蓋住文字)
//  - 黑板左側牆上掛大型三角板與黑板圓規
export function createBlackboardDetails(details) {
  const [cx, cy, cz] = BOARD.center;
  const g = group(details, 'blackboardDetails');
  const trayY = cy - BOARD.h / 2 - 0.05 - 0.01 + 0.009, trayZ = cz + 0.06;
  const r = rng(31);

  // 粉筆頭:避開既有的整支粉筆(x −0.9…−0.2)與板擦(x 0.75)
  const xs = [-1.75, -1.62, -1.4, -1.33, -0.05, 0.12, 0.3, 0.55, 1.15, 1.3, 1.55, 1.8];
  const cols = ['#F4F1E8', '#F4F1E8', '#F4F1E8', '#E9BFA2', '#B2C8DC', '#EEE0A8'];
  instanced(g, cyl(0.0055, 0.0055, 0.04, 8), std('#ffffff', { roughness: 0.95 }), xs.map((x, i) => ({
    pos: [x, trayY + 0.0055, trayZ + (r() - 0.5) * 0.03], rot: [0, r() * 3, Math.PI / 2], scale: [1, 0.35 + r() * 0.65, 1], color: cols[i % cols.length],
  })), { name: 'chalkStubs' });

  // 粉筆灰:槽底一條很淡的白色漸層(透明貼片)
  const dc = makeCanvas(1024, 64), dg = dc.getContext('2d');
  for (let i = 0; i < 9; i++) {
    const x = r() * 1024, w = 120 + r() * 260;
    const grd = dg.createRadialGradient(x, 32, 0, x, 32, w);
    grd.addColorStop(0, `rgba(245,243,236,${0.18 + r() * 0.12})`); grd.addColorStop(1, 'rgba(245,243,236,0)');
    dg.fillStyle = grd; dg.fillRect(x - w, 0, w * 2, 64);
  }
  const dust = mk(g, new THREE.PlaneGeometry(BOARD.w + 0.04, 0.07), new THREE.MeshStandardMaterial({ map: canvasTexture(dc, { repeat: false }), transparent: true, depthWrite: false, roughness: 1 }), { pos: [cx, trayY + 0.0005, trayZ], rot: [-Math.PI / 2, 0, 0] });
  dust.renderOrder = 1;

  // 磁鐵:淺灰、藍灰、霧粉、白(避開語意色),只放在下緣空白處
  const mags = [[-1.92, 1.13], [-1.78, 1.13], [0.92, 1.13], [1.88, 1.13], [1.88, 1.32]];
  const mcol = ['#E9E7E1', '#A8B6C1', '#D8C0BA', '#C7CBCE', '#A8B6C1'];
  instanced(g, cyl(0.016, 0.016, 0.012, 16), std('#ffffff', { roughness: 0.4 }), mags.map(([x, y], i) => ({ pos: [x, y, cz + 0.018], rot: [Math.PI / 2, 0, 0], color: mcol[i] })), { name: 'boardMagnets' });

  // 大型三角板(木製,有握把)與黑板圓規,掛在黑板左側牆面
  const wallZ = -3.8 + 0.012;
  const tri = group(g, 'boardSetSquare', [-2.95, 1.95, wallZ + 0.01]); // 掛在掃具櫃上方
  const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(0.6, 0); s.lineTo(0, 0.6 * 0.58); s.closePath();
  const hole = new THREE.Path(); hole.moveTo(0.08, 0.05); hole.lineTo(0.36, 0.05); hole.lineTo(0.08, 0.21); hole.closePath(); s.holes.push(hole);
  mk(tri, extrude(s, 0.008, 0.001), woodMat('#DDC8A6', 'grain'), { rot: [0, 0, 0] });
  mk(tri, rbox(0.1, 0.022, 0.03, 0.008), woodMat(C.woodMid, 'grain'), { pos: [0.16, 0.1, 0.02] });
  mk(tri, cyl(0.004, 0.004, 0.03, 6), std(C.steel), { pos: [0.05, 0.3, -0.005], rot: [Math.PI / 2, 0, 0] });
  const comp = group(g, 'boardCompass', [-2.24, 2.88, wallZ + 0.02]); // 黑板左上方,腳尖高於黑板框
  const wood = woodMat('#D6C09C', 'grain');
  mk(comp, rbox(0.06, 0.06, 0.025, 0.008), wood, {});
  mk(comp, rbox(0.03, 0.08, 0.03, 0.01), wood, { pos: [0, 0.06, 0] });
  for (const sx of [-1, 1]) mk(comp, rbox(0.022, 0.5, 0.014, 0.004), wood, { pos: [sx * 0.07, -0.24, 0], rot: [0, 0, sx * 0.28] });
  mk(comp, cyl(0.002, 0.007, 0.04, 8), std(C.steelDark), { pos: [-0.14, -0.5, 0] });          // 吸盤腳
  mk(comp, cyl(0.009, 0.009, 0.05, 10), std('#7D8387', { roughness: 0.6 }), { pos: [0.14, -0.49, 0] });  // 粉筆夾
  mk(comp, cyl(0.0055, 0.0055, 0.03, 8), std('#F4F1E8', { roughness: 0.95 }), { pos: [0.14, -0.53, 0] });
  return g;
}
