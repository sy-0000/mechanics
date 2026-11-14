import * as THREE from 'three';
import { C } from '../../../materials/palette.js';
import { toon } from '../../../materials/toon.js';
import { fileTexture } from '../../../materials/metal.js';
import { woodMat } from '../../../materials/wood.js';
import { lathe, cyl, mk, group, extrude } from '../util/geo.js';

// 銼刀(平、半圓、圓):木柄 + 灰鋼銼面(細紋)。本地 +Y 為銼刀尖端(掛在牆上時柄朝下)。
export function createFile(parent, { pos, rot, type = 'flat' } = {}) {
  const g = group(parent, `file-${type}`, pos, rot);
  const handle = woodMat(C.woodLight, 'grain', 91), steel = toon(C.steel, { map: fileTexture(), key: 'fileSteel' });
  mk(g, lathe([[0, 0], [0.011, 0.004], [0.014, 0.05], [0.012, 0.1], [0.008, 0.108], [0, 0.11]], 14), handle, {});
  mk(g, cyl(0.009, 0.009, 0.01, 12), toon(C.steelDark), { pos: [0, 0.112, 0] });
  const L = 0.2, y0 = 0.117;
  if (type === 'round') {
    mk(g, cyl(0.0015, 0.004, L, 10), steel, { pos: [0, y0 + L / 2, 0] });
  } else {
    const s = new THREE.Shape();
    if (type === 'flat') { s.moveTo(-0.009, 0); s.lineTo(0.009, 0); s.lineTo(0.006, L); s.lineTo(-0.006, L); }
    else { s.moveTo(-0.01, 0); s.lineTo(0.01, 0); s.lineTo(0.005, L); s.lineTo(-0.005, L); }
    s.closePath();
    const blade = extrude(s, type === 'flat' ? 0.003 : 0.0045, 0.0007);
    mk(g, blade, steel, { pos: [0, y0, 0] });
    if (type === 'half') mk(g, cyl(0.0035, 0.007, L * 0.95, 10, false), steel, { pos: [0, y0 + L * 0.475, 0.0015], scale: [1, 1, 0.45] });
  }
  return g;
}
