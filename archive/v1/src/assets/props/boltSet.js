// 散落的六角螺栓與墊片(InstancedMesh)。
import * as THREE from 'three';
import { hexGeometry, bevelCylinder } from '../geo.js';
import { polishedSteel } from '../../materials/metal.js';
import { addOutline } from '../../materials/outline.js';

export function createBoltSet(positions = [[0, 0], [0.02, 0.012], [0.035, -0.006]]) {
  const group = new THREE.Group();
  group.name = 'boltSet';
  const n = positions.length;

  const bolts = new THREE.InstancedMesh(hexGeometry(0.009, 0.004), polishedSteel(), n);
  const washers = new THREE.InstancedMesh(bevelCylinder(0.0062, 0.0014, { seg: 20, bevel: 0.0004 }), polishedSteel(), n);
  const m4 = new THREE.Matrix4();
  const e = new THREE.Euler();
  positions.forEach((p, i) => {
    e.set(0, 0, i * 1.3);
    m4.makeRotationFromEuler(e);
    m4.setPosition(p[0], 0.002, p[1]);
    m4.multiply(new THREE.Matrix4().makeRotationX(-Math.PI / 2));
    bolts.setMatrixAt(i, m4);
    const m2 = m4.clone();
    m2.setPosition(p[0] + 0.009, 0.0008, p[1] + 0.007);
    washers.setMatrixAt(i, m2);
  });
  for (const mesh of [bolts, washers]) {
    mesh.castShadow = true;
    addOutline(mesh, { thickness: 0.0006 });
    group.add(mesh);
  }
  return group;
}
