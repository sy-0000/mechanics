import { toon } from '../../../materials/toon.js';
import { rbox, mk, group } from '../util/geo.js';

// 橡皮擦:白色擦體套著霧粉色紙套(無文字)。
export function createEraser(parent, { pos, rot } = {}) {
  const g = group(parent, 'eraser', pos, rot);
  mk(g, rbox(0.045, 0.011, 0.02, 0.003), toon('#F6F4EE'), { pos: [0, 0.0055, 0] });
  mk(g, rbox(0.028, 0.0125, 0.0205, 0.001), toon('#D8C0BA'), { pos: [0.006, 0.0058, 0] });
  return g;
}
