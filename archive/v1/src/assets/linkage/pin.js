// 銷釘:鋼色墊片 + 青銅圓頂螺栓 + 紅色定位點。
// 「結構」stage 時換成鎖死的六角螺栓(createHexBolt)。
import * as THREE from 'three';
import { bevelCylinder, hexGeometry } from '../geo.js';
import { polishedSteel, bronze } from '../../materials/metal.js';
import { addOutline } from '../../materials/outline.js';
import { toonMaterial, COLORS } from '../../materials/toon.js';

/** 旋轉銷(沿 +Z 疊:墊片、圓頂、紅點) */
export function createPin() {
  const group = new THREE.Group();
  group.name = 'pin';

  const washer = new THREE.Mesh(bevelCylinder(0.0065, 0.0016, { seg: 24, bevel: 0.0004 }), polishedSteel());
  washer.position.z = 0.0048;
  washer.castShadow = true;
  addOutline(washer, { thickness: 0.0008 });
  group.add(washer);

  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(0.0042, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    bronze(),
  );
  dome.position.z = 0.0056;
  dome.rotation.x = Math.PI / 2;
  dome.castShadow = true;
  addOutline(dome, { thickness: 0.0008 });
  group.add(dome);

  const dot = new THREE.Mesh(
    bevelCylinder(0.0011, 0.0012, { seg: 10, bevel: 0.0003 }),
    toonMaterial(COLORS.red),
  );
  dot.position.z = 0.0098;
  group.add(dot);
  return group;
}

/** 鎖死六角螺栓(「結構」stage) */
export function createHexBolt() {
  const group = new THREE.Group();
  group.name = 'hexBolt';
  const head = new THREE.Mesh(hexGeometry(0.011, 0.0045), polishedSteel());
  head.position.z = 0.0062;
  head.castShadow = true;
  addOutline(head, { thickness: 0.0008 });
  group.add(head);
  const washer = new THREE.Mesh(bevelCylinder(0.0075, 0.0016, { seg: 24, bevel: 0.0004 }), polishedSteel());
  washer.position.z = 0.0032;
  addOutline(washer, { thickness: 0.0008 });
  group.add(washer);
  return group;
}
