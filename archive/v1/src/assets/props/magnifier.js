// 放大鏡(時鐘站道具)。
import * as THREE from 'three';
import { bevelCylinder } from '../geo.js';
import { clearPlastic } from '../../materials/plastic.js';
import { addOutline } from '../../materials/outline.js';
import { toonMaterial, COLORS } from '../../materials/toon.js';

export function createMagnifier() {
  const group = new THREE.Group();
  group.name = 'magnifier';
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.003, 10, 30), toonMaterial(COLORS.wood));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.004;
  ring.castShadow = true;
  addOutline(ring, { thickness: 0.0007 });
  group.add(ring);
  const lens = new THREE.Mesh(bevelCylinder(0.018, 0.003, { seg: 30, bevel: 0.001 }), clearPlastic('#DFE9EC', 0.3));
  lens.rotation.x = -Math.PI / 2;
  lens.position.y = 0.004;
  group.add(lens);
  const handle = new THREE.Mesh(bevelCylinder(0.0035, 0.045, { seg: 12 }), toonMaterial(COLORS.wood));
  handle.rotation.z = Math.PI / 2;
  handle.rotation.x = -Math.PI / 2;
  handle.position.set(0.042, 0.004, 0);
  handle.rotation.set(0, 0, Math.PI / 2);
  handle.castShadow = true;
  addOutline(handle, { thickness: 0.0007 });
  group.add(handle);
  return group;
}
