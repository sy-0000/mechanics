import { C } from '../../../materials/palette.js';
import { std } from '../../../materials/standard.js';
import { cyl, mk, group, tube, lathe } from '../util/geo.js';

// 電烙鐵放在螺旋烙鐵架上:鑄鐵底座、鋼絲螺旋筒、灰色握把、細長烙鐵頭、電線。底面 y=0。
export function createSolderingIron(parent, { pos, rot } = {}) {
  const g = group(parent, 'solderingIron', pos, rot);
  const base = std(C.castIron), wire = std(C.steel), grip = std('#8E9396'), tip = std(C.steelDark);
  mk(g, cyl(0.05, 0.055, 0.016, 20), base, { pos: [0, 0.008, 0] });
  mk(g, cyl(0.034, 0.034, 0.008, 16), std('#D9D3C2'), { pos: [0.02, 0.018, 0.03] }); // 清潔海綿(奶油色)
  const pts = [];
  for (let i = 0; i <= 60; i++) { const a = i * 0.6, r = 0.014 + i * 0.0003; pts.push([Math.cos(a) * r, 0.03 + i * 0.0013, Math.sin(a) * r]); }
  const spiral = group(g, 'spiral', [-0.01, 0, 0], [0, 0, 0.5]);
  mk(spiral, tube(pts, 0.0012, 120, 4), wire, {});
  mk(spiral, cyl(0.003, 0.003, 0.04, 6), wire, { pos: [0, 0.02, 0] });
  // 烙鐵本體斜插在螺旋筒內
  const iron = group(spiral, 'iron', [0, 0.06, 0]);
  mk(iron, lathe([[0, 0], [0.011, 0.005], [0.013, 0.06], [0.01, 0.1], [0.006, 0.105], [0, 0.105]], 12), grip, { pos: [0, 0.03, 0] });
  mk(iron, cyl(0.004, 0.004, 0.07, 8), std(C.steelBright), { pos: [0, -0.005, 0] });
  mk(iron, cyl(0.0005, 0.002, 0.025, 6), tip, { pos: [0, -0.05, 0] });
  mk(iron, tube([[0, 0.135, 0], [0.02, 0.17, 0], [0.08, 0.1, 0.02], [0.12, 0.0, 0.03]], 0.0025, 20, 5), std(C.gripBlack), {});
  return g;
}
