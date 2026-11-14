// 搖桿(輸出件,綠)。樞紐在原點、沿 +X;可帶雨刷臂延伸。
import * as THREE from 'three';
import { buildBarLink } from './barLink.js';
import { barGeometry } from '../geo.js';
import { anodizedAluminum } from '../../materials/metal.js';
import { addOutline } from '../../materials/outline.js';
import { rubber } from '../../materials/rubber.js';
import { COLORS } from '../../materials/toon.js';

export function createRocker(length, opts = {}) {
  return buildBarLink(length, COLORS.output, { name: 'rocker', ...opts });
}

/**
 * 雨刷臂 + 橡膠刷片:接在搖桿樞紐,向外延伸 armLength,末端帶刷片。
 * 自成一個 group,角度與搖桿同步(由關卡程式設定 rotation.z)。
 */
export function createWiperArm(armLength, bladeLength) {
  const group = new THREE.Group();
  group.name = 'wiperArm';
  const arm = new THREE.Mesh(
    barGeometry(armLength, 0.012, 0.005, 0),
    anodizedAluminum(COLORS.output),
  );
  arm.geometry.translate(armLength / 2, 0, 0);
  arm.castShadow = true;
  addOutline(arm);
  group.add(arm);

  // 橡膠刷片(垂直於臂,貼玻璃)
  const blade = new THREE.Mesh(
    barGeometry(bladeLength, 0.008, 0.0045, 0),
    rubber(),
  );
  blade.position.x = armLength;
  blade.rotation.z = Math.PI / 2;
  blade.castShadow = true;
  addOutline(blade);
  group.add(blade);
  group.userData.blade = blade;
  return group;
}
