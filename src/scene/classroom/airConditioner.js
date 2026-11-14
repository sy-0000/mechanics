import { std } from '../../materials/standard.js';
import { rbox, cyl, mk, group } from './util/geo.js';
import { PEGBOARD } from './layout.js';

// 壁掛冷氣(分離式室內機):掛在右牆洞洞板正上方。本地 +Z 朝教室。大型物件,vr 模式保留。
export const AC = { z: PEGBOARD.zc, y: 2.6, w: 0.95, h: 0.3, d: 0.23 };
export function createAirConditioner(main) {
  const g = group(main, 'airConditioner', [3.25 - 0.004, AC.y, AC.z], [0, -Math.PI / 2, 0]);
  const body = std('#EEECE6', { roughness: 0.4 }), trim = std('#DCDAD3', { roughness: 0.45 }), dark = std('#4C5054', { roughness: 0.5 });
  const { w, h, d } = AC;
  mk(g, rbox(w, h, d * 0.8, 0.04), body, { pos: [0, 0.02, d * 0.4] });
  mk(g, rbox(w - 0.02, h * 0.62, 0.02, 0.012), trim, { pos: [0, 0.06, d * 0.8 + 0.006] });           // 前面板
  mk(g, rbox(w - 0.06, 0.05, d * 0.5, 0.02), body, { pos: [0, -h / 2 + 0.035, d * 0.55], rot: [0.35, 0, 0] }); // 下方弧形出風口罩
  for (let i = 0; i < 2; i++) mk(g, rbox(w - 0.12, 0.012, 0.05, 0.004), trim, { pos: [0, -h / 2 + 0.03 - i * 0.012, d * 0.7 + i * 0.01], rot: [0.5, 0, 0] }); // 導風板
  mk(g, rbox(w - 0.1, 0.012, 0.02, 0.004), dark, { pos: [0, -h / 2 + 0.06, d * 0.62] });            // 出風口陰影
  mk(g, rbox(0.06, 0.016, 0.006, 0.003), dark, { pos: [w * 0.32, -0.02, d * 0.8 + 0.017] });       // 狀態顯示窗
  mk(g, cyl(0.004, 0.004, 0.004, 8), std('#9FB3C2', { roughness: 0.35 }), { pos: [w * 0.4, -0.02, d * 0.8 + 0.019], rot: [Math.PI / 2, 0, 0] });
  return g;
}
