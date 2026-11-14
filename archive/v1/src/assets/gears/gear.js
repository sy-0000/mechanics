// 正齒輪:由運動學模組的漸開線齒形擠出(幾何即數學,齒形正確)。
import * as THREE from 'three';
import { gearProfile } from '../../kinematics/gears.js';
import { polygonExtrude, bevelCylinder } from '../geo.js';
import { anodizedAluminum, polishedSteel } from '../../materials/metal.js';
import { addOutline } from '../../materials/outline.js';
import { toonMaterial, COLORS } from '../../materials/toon.js';

export const MM = 0.0025; // 模型 mm → 場景 m(docs/decisions.md D-004)

/**
 * 建立齒輪。齒 0 中心線沿 +X,繞 Z 轉,中心在原點。
 * @param {object} p {m, z, color, thickness(場景m), withHandle, hub}
 */
export function createGear({
  m = 2.2, z = 20, color = COLORS.grey,
  thickness = 0.012, withHandle = false, hub = true, scale = MM,
} = {}) {
  const group = new THREE.Group();
  group.name = `gear-${z}`;
  group.userData.teeth = z;
  group.userData.module = m;

  const pts = gearProfile(m, z).map(([x, y]) => [x * scale, y * scale]);
  const body = new THREE.Mesh(polygonExtrude(pts, thickness, { bevel: 0.0007 }), anodizedAluminum(color));
  body.castShadow = true;
  body.receiveShadow = true;
  addOutline(body, { thickness: 0.001 });
  group.add(body);

  const pr = (m * z * scale) / 2; // 節圓半徑(場景)
  group.userData.pitchRadius = pr;

  if (hub) {
    const hubMesh = new THREE.Mesh(
      bevelCylinder(Math.max(pr * 0.22, 0.006), thickness + 0.006, { seg: 24 }),
      polishedSteel(),
    );
    hubMesh.castShadow = true;
    addOutline(hubMesh, { thickness: 0.0008 });
    group.add(hubMesh);

    // 大齒輪加輻條
    if (z >= 28) {
      const spokeLen = pr * 0.62;
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        const spoke = new THREE.Mesh(
          bevelCylinder(thickness * 0.28, spokeLen, { seg: 10 }),
          anodizedAluminum(color),
        );
        spoke.rotation.x = Math.PI / 2;
        spoke.rotation.z = a + Math.PI / 2;
        spoke.position.set(Math.cos(a) * spokeLen * 0.58, Math.sin(a) * spokeLen * 0.58, 0);
        spoke.castShadow = true;
        addOutline(spoke, { thickness: 0.0008 });
        group.add(spoke);
      }
    }
  }

  if (withHandle) {
    const handle = new THREE.Mesh(
      bevelCylinder(0.0058, 0.024, { seg: 18 }),
      toonMaterial(COLORS.wood),
    );
    handle.position.set(pr * 0.7, 0, thickness / 2 + 0.013);
    handle.castShadow = true;
    addOutline(handle);
    handle.name = 'gear-handle';
    handle.userData.grabbable = { kind: 'gear-handle' };
    group.add(handle);
    group.userData.handle = handle;
  }
  return group;
}
