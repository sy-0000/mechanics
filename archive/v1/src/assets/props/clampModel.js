// 彩蛋入口:底座角落的小夾鉗模型(低飽和灰,可碰觸切換關卡)。
import * as THREE from 'three';
import { bevelBox, bevelCylinder } from '../geo.js';
import { addOutline } from '../../materials/outline.js';
import { toonMaterial, COLORS } from '../../materials/toon.js';

export function createClampModel() {
  const group = new THREE.Group();
  group.name = 'clampModel';
  group.userData.touchable = { kind: 'bonus-entry' };

  const base = new THREE.Mesh(bevelBox(0.045, 0.008, 0.03, { corner: 0.003 }), toonMaterial(COLORS.grey));
  base.position.y = 0.004;
  base.castShadow = true;
  addOutline(base, { thickness: 0.0007 });
  group.add(base);
  const post = new THREE.Mesh(bevelBox(0.008, 0.03, 0.012, { corner: 0.002 }), toonMaterial(COLORS.grey));
  post.position.set(-0.01, 0.022, 0);
  post.castShadow = true;
  addOutline(post, { thickness: 0.0007 });
  group.add(post);
  const handle = new THREE.Mesh(bevelCylinder(0.0028, 0.035, { seg: 10 }), toonMaterial(COLORS.greyBlue));
  handle.rotation.x = Math.PI / 2;
  handle.rotation.z = 0.7;
  handle.position.set(0.006, 0.042, 0);
  handle.castShadow = true;
  addOutline(handle, { thickness: 0.0006 });
  group.add(handle);
  const arm = new THREE.Mesh(bevelBox(0.03, 0.006, 0.01, { corner: 0.002 }), toonMaterial(COLORS.grey));
  arm.position.set(0.008, 0.03, 0);
  arm.castShadow = true;
  addOutline(arm, { thickness: 0.0006 });
  group.add(arm);
  return group;
}
