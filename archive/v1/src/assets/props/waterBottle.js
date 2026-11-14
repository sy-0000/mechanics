// 水壺(腳踏車站道具,低飽和奶油)。
import * as THREE from 'three';
import { bevelCylinder } from '../geo.js';
import { addOutline } from '../../materials/outline.js';
import { toonMaterial, COLORS } from '../../materials/toon.js';

export function createWaterBottle() {
  const group = new THREE.Group();
  group.name = 'waterBottle';
  const body = new THREE.Mesh(bevelCylinder(0.012, 0.05, { seg: 20 }), toonMaterial(COLORS.cream));
  body.rotation.x = -Math.PI / 2;
  body.position.y = 0.025;
  body.castShadow = true;
  addOutline(body);
  group.add(body);
  const cap = new THREE.Mesh(bevelCylinder(0.006, 0.01, { seg: 14 }), toonMaterial(COLORS.greyBlue));
  cap.rotation.x = -Math.PI / 2;
  cap.position.y = 0.055;
  cap.castShadow = true;
  addOutline(cap, { thickness: 0.0007 });
  group.add(cap);
  return group;
}
