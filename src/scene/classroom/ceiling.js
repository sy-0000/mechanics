import { CEILING_LIGHTS, ROOM } from './layout.js';
import { C } from '../../materials/palette.js';
import { toon } from '../../materials/toon.js';
import { rbox, mk, group, instanced } from './util/geo.js';

// 天花板嵌入式燈具(兩排,柔和發光,不是主光源)與通風口。
export function createCeiling(parent) {
  const g = group(parent, 'ceilingFixtures');
  const { xs, zs, w, d } = CEILING_LIGHTS;
  const list = [];
  for (const x of xs) for (const z of zs) list.push({ pos: [x, ROOM.height - 0.006, z] });
  instanced(g, rbox(w + 0.06, 0.02, d + 0.06, 0.004), toon('#E9E5DB'), list, { name: 'lightFrames' });
  const panel = toon('#FFFBF0', { emissive: '#FFF6E2', emissiveIntensity: 0.55, key: 'ceilLight' });
  const panels = instanced(g, rbox(w, 0.012, d, 0.003), panel, list.map(l => ({ pos: [l.pos[0], l.pos[1] - 0.009, l.pos[2]] })), { name: 'lightPanels' });
  panels.userData.outline = false;
  // 通風口
  mk(g, rbox(0.4, 0.01, 0.4, 0.003), toon('#E6E2D8'), { pos: [0, ROOM.height - 0.005, 3.0] });
  return g;
}
