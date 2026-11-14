import * as THREE from 'three';
import { C } from '../../materials/palette.js';
import { std } from '../../materials/standard.js';
import { printMat, atlasUV } from '../../materials/printAtlas.js';
import { rbox, cyl, lathe, mk, group } from './util/geo.js';
import { OTHER_BENCHES, WORKBENCH } from './layout.js';

// 桌面的使用痕跡(小物,details 群組,只在 high 顯示,不投影):攤開的課本、筆記本、鉛筆盒、水壺。
// 全部在教具掛載區外;學生桌只在右前角放一個水壺,不擋手。
function openBook(parent, pos, rot) {
  const g = group(parent, 'openTextbook', pos, rot);
  const W = 0.19, D = 0.26, cover = std('#9DAAB4', { roughness: 0.6 });
  mk(g, rbox(W * 2 + 0.01, 0.004, D + 0.008, 0.0015), cover, { pos: [0, 0.002, 0] });
  for (const s of [-1, 1]) {
    // 每邊一疊書頁,靠書脊處略為下凹、外側微微翹起
    mk(g, rbox(W, 0.009, D, 0.002), std('#F4F1E8', { roughness: 0.9 }), { pos: [s * W / 2, 0.009, 0], rot: [0, 0, -s * 0.035] });
    const page = new THREE.PlaneGeometry(W, D, 6, 1);
    const p = page.attributes.position;
    for (let i = 0; i < p.count; i++) { const u = (p.getX(i) / W + 0.5); p.setZ(i, Math.sin(u * Math.PI * 0.5) * 0.008); }
    page.rotateX(-Math.PI / 2); page.computeVertexNormals();
    // 跨頁貼圖:左頁取圖集左半,右頁取右半
    atlasUV(page, 'bookSpread', { landscape: true });
    const uv = page.attributes.uv, u0 = Math.min(...Array.from({ length: uv.count }, (_, k) => uv.getX(k))), u1 = Math.max(...Array.from({ length: uv.count }, (_, k) => uv.getX(k)));
    for (let k = 0; k < uv.count; k++) { const t = (uv.getX(k) - u0) / (u1 - u0); uv.setX(k, u0 + (s < 0 ? t * 0.5 : 0.5 + t * 0.5) * (u1 - u0)); }
    mk(g, page, printMat(), { pos: [s * W / 2, 0.0142, 0], rot: [0, 0, -s * 0.035] });
  }
  return g;
}
function notebook(parent, pos, rot) {
  const g = group(parent, 'notebook', pos, rot);
  mk(g, rbox(0.18, 0.012, 0.25, 0.003), std('#D8C0BA', { roughness: 0.6 }), { pos: [0, 0.006, 0] });
  mk(g, rbox(0.172, 0.0105, 0.247, 0.002), std('#F4F1E8', { roughness: 0.9 }), { pos: [0.005, 0.006, 0] });
  mk(g, rbox(0.012, 0.014, 0.25, 0.004), std('#7D8387', { roughness: 0.6 }), { pos: [-0.088, 0.007, 0] }); // 線圈邊
  mk(g, cyl(0.0035, 0.0035, 0.15, 6), std('#AFBCC6', { roughness: 0.6 }), { pos: [0.02, 0.016, 0.02], rot: [0, 0.5, Math.PI / 2] }); // 擱在上面的鉛筆
  return g;
}
function pencilCase(parent, pos, rot) {
  const g = group(parent, 'pencilCase', pos, rot);
  const body = new THREE.CapsuleGeometry(0.03, 0.15, 4, 10); body.rotateZ(Math.PI / 2); body.scale(1, 0.8, 1);
  mk(g, body, std('#8E9AA4', { roughness: 0.9 }), { pos: [0, 0.025, 0] });
  mk(g, rbox(0.16, 0.004, 0.006, 0.002), std('#5D6469', { roughness: 0.6 }), { pos: [0, 0.049, 0] });   // 拉鍊
  mk(g, rbox(0.012, 0.004, 0.02, 0.002), std(C.steel), { pos: [0.07, 0.05, 0.008] });                  // 拉鍊頭
  return g;
}
function waterBottle(parent, pos) {
  const g = group(parent, 'waterBottle', pos);
  mk(g, lathe([[0.001, 0], [0.033, 0], [0.035, 0.01], [0.035, 0.19], [0.028, 0.215], [0.022, 0.222], [0.001, 0.222]], 20), std(C.alu), {});
  mk(g, cyl(0.024, 0.024, 0.035, 16), std('#5D6469', { roughness: 0.6 }), { pos: [0, 0.24, 0] });
  mk(g, rbox(0.012, 0.008, 0.035, 0.003), std('#5D6469', { roughness: 0.6 }), { pos: [0, 0.262, 0] });
  return g;
}

export function createDeskBelongings(details) {
  const g = group(details, 'deskBelongings');
  const [ax, ay, az] = OTHER_BENCHES[0], [bx, by, bz] = OTHER_BENCHES[1];
  openBook(g, [ax - 0.5, ay + 0.0012, az + 0.16], [0, 0.18, 0]);
  pencilCase(g, [ax + 0.15, ay, az + 0.33], [0, -0.25, 0]);
  waterBottle(g, [ax + 0.66, ay, az + 0.3]);
  notebook(g, [bx - 0.48, by, bz + 0.3], [0, -0.3, 0]);
  waterBottle(g, [bx + 0.62, by, bz + 0.33]);
  waterBottle(g, [0.72, WORKBENCH.height, -0.2]);          // 學生桌右前角(掛載區外)
  return g;
}
