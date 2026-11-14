import { C } from '../../../materials/palette.js';
import { std } from '../../../materials/standard.js';
import { lathe, cyl, rbox, mk } from '../util/geo.js';

// 螺絲起子(一字/十字):奶油色半透明感握把 + 鋼桿。握把在下、刀頭朝 +Y。大中小以實例縮放。
export function buildScrewdriver(g, type = 'flat') {
  const grip = std(type === 'flat' ? C.rubberCream : '#E6E2D6'), steel = std(C.steelBright), band = std(C.gripGray);
  mk(g, lathe([[0, 0], [0.013, 0.003], [0.015, 0.03], [0.014, 0.08], [0.011, 0.1], [0.004, 0.105], [0, 0.105]], 12), grip, {});
  mk(g, cyl(0.0152, 0.0152, 0.008, 12), band, { pos: [0, 0.03, 0] });
  mk(g, cyl(0.003, 0.003, 0.12, 8), steel, { pos: [0, 0.16, 0] });
  if (type === 'flat') mk(g, rbox(0.007, 0.012, 0.0016, 0.0005), steel, { pos: [0, 0.224, 0] });
  else mk(g, cyl(0.0003, 0.003, 0.01, 4), steel, { pos: [0, 0.225, 0] });
  return g;
}
