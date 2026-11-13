// 扳手(道具,拋光鋼)。
import * as THREE from 'three';
import { bevelBox, bevelCylinder } from '../geo.js';
import { polishedSteel } from '../../materials/metal.js';
import { addOutline } from '../../materials/outline.js';

export function createWrench(length = 0.07) {
  const group = new THREE.Group();
  group.name = 'wrench';
  const shaft = new THREE.Mesh(bevelBox(length, 0.009, 0.0035, { corner: 0.003 }), polishedSteel());
  shaft.rotation.x = -Math.PI / 2;
  shaft.position.y = 0.003;
  shaft.castShadow = true;
  addOutline(shaft, { thickness: 0.0007 });
  group.add(shaft);
  for (const s of [-1, 1]) {
    const head = new THREE.Mesh(bevelCylinder(0.009, 0.0035, { seg: 20, bevel: 0.0008 }), polishedSteel());
    head.rotation.x = -Math.PI / 2;
    head.position.set(s * (length / 2 + 0.004), 0.003, 0);
    head.castShadow = true;
    addOutline(head, { thickness: 0.0007 });
    group.add(head);
  }
  return group;
}
