// 發條鑰匙(時鐘站道具,青銅)。
import * as THREE from 'three';
import { bevelCylinder, bevelBox } from '../geo.js';
import { bronze } from '../../materials/metal.js';
import { addOutline } from '../../materials/outline.js';

export function createWindKey() {
  const group = new THREE.Group();
  group.name = 'windKey';
  const stem = new THREE.Mesh(bevelCylinder(0.0035, 0.035, { seg: 12 }), bronze());
  stem.rotation.x = Math.PI / 2;
  stem.position.y = 0.0035;
  stem.castShadow = true;
  addOutline(stem, { thickness: 0.0007 });
  group.add(stem);
  for (const s of [-1, 1]) {
    const wing = new THREE.Mesh(bevelBox(0.016, 0.008, 0.003, { corner: 0.003 }), bronze());
    wing.position.set(s * 0.009, 0.0035, 0.02);
    wing.castShadow = true;
    addOutline(wing, { thickness: 0.0006 });
    group.add(wing);
  }
  return group;
}
