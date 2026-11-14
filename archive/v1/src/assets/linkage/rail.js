// 導軌(機架,深棕)+ 透明汽缸。沿 +X。
import * as THREE from 'three';
import { bevelBox, bevelCylinder } from '../geo.js';
import { frameWood } from '../../materials/wood.js';
import { clearPlastic } from '../../materials/plastic.js';
import { addOutline } from '../../materials/outline.js';

/**
 * 汽缸座 + 透明汽缸管。
 * @param {number} innerR 汽缸內半徑 @param {number} length 汽缸長
 */
export function createRail(innerR = 0.022, length = 0.14) {
  const group = new THREE.Group();
  group.name = 'rail';

  // 座(兩個支撐塊)
  for (const x of [-length * 0.32, length * 0.32]) {
    const base = new THREE.Mesh(bevelBox(0.03, 0.05, 0.05, { corner: 0.004 }), frameWood());
    base.position.set(x, -innerR - 0.023, 0);
    base.castShadow = true;
    base.receiveShadow = true;
    addOutline(base);
    group.add(base);
  }

  // 透明汽缸(開口圓管:CylinderGeometry openEnded)
  const tube = new THREE.Mesh(
    new THREE.CylinderGeometry(innerR + 0.003, innerR + 0.003, length, 36, 1, true),
    clearPlastic(),
  );
  tube.rotation.z = Math.PI / 2;
  tube.castShadow = false;
  group.add(tube);

  // 兩端金屬箍環
  for (const x of [-length / 2, length / 2]) {
    const ring = new THREE.Mesh(
      bevelCylinder(innerR + 0.0048, 0.008, { seg: 32, bevel: 0.0012 }),
      frameWood(),
    );
    ring.rotation.y = Math.PI / 2;
    ring.position.x = x;
    ring.castShadow = true;
    addOutline(ring);
    group.add(ring);
  }
  return group;
}
