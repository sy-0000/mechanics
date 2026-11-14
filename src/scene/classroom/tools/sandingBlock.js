import { std } from '../../../materials/standard.js';
import { rbox, mk, group } from '../util/geo.js';

// 砂紙磨塊:軟木塊 + 包覆的灰色砂紙。底面 y=0。
export function createSandingBlock(parent, { pos, rot } = {}) {
  const g = group(parent, 'sandingBlock', pos, rot);
  mk(g, rbox(0.11, 0.028, 0.065, 0.006), std('#CDB896', { roughness: 0.95 }), { pos: [0, 0.018, 0] });
  mk(g, rbox(0.112, 0.004, 0.067, 0.0015), std('#8E8C86', { roughness: 1 }), { pos: [0, 0.002, 0] });
  return g;
}
