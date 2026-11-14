import { C } from '../../../materials/palette.js';
import { std } from '../../../materials/standard.js';
import { woodMat } from '../../../materials/wood.js';
import { rbox, cyl, sphere, mk, group, lathe } from '../util/geo.js';

// 刨刀:木座 + 斜插的鋼刀片 + 楔木 + 淺木色把手。size: 'large' | 'small'。底面在 y=0,長度沿 +X。
export function createHandPlane(parent, { pos, rot, size = 'large' } = {}) {
  const s = size === 'large' ? 1 : 0.68;
  const g = group(parent, `plane-${size}`, pos, rot);
  const body = woodMat(C.woodMid, 'grain', 101), grip = woodMat(C.woodLight, 'grain', 103), steel = std(C.steelBright);
  const L = 0.28 * s, W = 0.065 * s, H = 0.055 * s;
  mk(g, rbox(L, H, W, 0.006), body, { pos: [0, H / 2, 0] });
  // 刀片與楔木(斜插)
  mk(g, rbox(0.004, 0.06 * s, W * 0.7, 0.001), steel, { pos: [-0.01 * s, H + 0.012 * s, 0], rot: [0, 0, 0.75] });
  mk(g, rbox(0.012, 0.055 * s, W * 0.55, 0.003), grip, { pos: [-0.022 * s, H + 0.012 * s, 0], rot: [0, 0, 0.75] });
  // 後把手與前握球
  mk(g, rbox(0.045 * s, 0.05 * s, 0.022 * s, 0.008), grip, { pos: [L * 0.32, H + 0.022 * s, 0], rot: [0, 0, -0.25] });
  mk(g, sphere(0.018 * s), grip, { pos: [-L * 0.36, H + 0.012 * s, 0] });
  return g;
}
