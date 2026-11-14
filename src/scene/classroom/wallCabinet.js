import * as THREE from 'three';
import { C } from '../../materials/palette.js';
import { std } from '../../materials/standard.js';
import { woodMat } from '../../materials/wood.js';
import { rbox, mk, group } from './util/geo.js';

// 右牆(洞洞板與前牆之間)的壁掛收納:上方木製吊櫃(兩扇門),下方小零件抽屜盒(4 × 5 半透明抽屜,無標籤文字)。
// 本地 +Z 朝教室,整體轉向 −X。
export function createWallCabinet(parent) {
  const g = group(parent, 'wallCabinet', [3.25 - 0.005, 0, -2.85], [0, -Math.PI / 2, 0]);
  const body = woodMat('#D2BE9F', 'grain'), door = woodMat('#DCC6A2', 'grain');
  // 吊櫃 0.85 寬 × 0.6 高 × 0.32 深,底部離地 1.85
  const W = 0.85, H = 0.6, D = 0.32, y0 = 1.85;
  mk(g, rbox(W, H, D, 0.008), body, { pos: [0, y0 + H / 2, D / 2] });
  for (const s of [-1, 1]) {
    mk(g, rbox(W / 2 - 0.01, H - 0.02, 0.018, 0.004), door, { pos: [s * W / 4, y0 + H / 2, D + 0.009] });
    mk(g, rbox(0.012, 0.09, 0.018, 0.004), std(C.steel), { pos: [s * 0.05, y0 + H * 0.3, D + 0.028] });
  }
  // 抽屜盒 0.5 寬 × 0.45 高 × 0.16 深,底部離地 1.05
  const dw = 0.5, dh = 0.45, dd = 0.16, by = 1.05;
  mk(g, rbox(dw, dh, dd, 0.006), std('#B8BEC2', { roughness: 0.55 }), { pos: [0, by + dh / 2, dd / 2] });
  const drawer = new THREE.MeshStandardMaterial({ color: '#D9DEE0', transparent: true, opacity: 0.72, roughness: 0.25, metalness: 0 });
  const cols = 4, rows = 5, cw = (dw - 0.03) / cols, ch = (dh - 0.03) / rows;
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    const x = -dw / 2 + 0.015 + cw * (i + 0.5), y = by + 0.015 + ch * (j + 0.5);
    mk(g, rbox(cw - 0.006, ch - 0.006, 0.012, 0.002), drawer, { pos: [x, y, dd + 0.002] });
    mk(g, rbox(0.03, 0.006, 0.01, 0.002), std('#7D8387', { roughness: 0.5 }), { pos: [x, y - ch * 0.25, dd + 0.012] });
  }
  return g;
}
