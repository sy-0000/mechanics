// 鉛筆(低飽和奶油木色,筆尖深棕)。
import * as THREE from 'three';
import { hexGeometry } from '../geo.js';
import { addOutline } from '../../materials/outline.js';
import { toonMaterial, COLORS } from '../../materials/toon.js';

export function createPencil(length = 0.085) {
  const group = new THREE.Group();
  group.name = 'pencil';
  const body = new THREE.Mesh(hexGeometry(0.0062, length), toonMaterial(COLORS.cream));
  body.rotation.y = Math.PI / 2; // 沿 X 橫放
  body.castShadow = true;
  addOutline(body, { thickness: 0.0007 });
  group.add(body);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.0033, 0.012, 12), toonMaterial(COLORS.woodLight));
  tip.rotation.z = -Math.PI / 2;
  tip.position.x = length / 2 + 0.006;
  tip.castShadow = true;
  addOutline(tip, { thickness: 0.0006 });
  group.add(tip);
  const lead = new THREE.Mesh(new THREE.ConeGeometry(0.0012, 0.004, 10), toonMaterial('#3F3B35'));
  lead.rotation.z = -Math.PI / 2;
  lead.position.x = length / 2 + 0.0115;
  group.add(lead);
  group.position.y = 0.004;
  return group;
}
