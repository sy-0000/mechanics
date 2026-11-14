// 滑塊 / 活塞(輸出件,綠):圓柱活塞 + 活塞銷座。
import * as THREE from 'three';
import { bevelCylinder } from '../geo.js';
import { anodizedAluminum } from '../../materials/metal.js';
import { addOutline } from '../../materials/outline.js';
import { COLORS } from '../../materials/toon.js';

/**
 * 活塞:軸向沿 +X(在汽缸內滑動),銷孔中心在原點。
 * @param {number} radius 活塞半徑 @param {number} length 活塞長
 */
export function createSlider(radius = 0.02, length = 0.045) {
  const group = new THREE.Group();
  group.name = 'slider';
  const body = new THREE.Mesh(
    bevelCylinder(radius, length, { seg: 28, bevel: 0.002 }),
    anodizedAluminum(COLORS.output),
  );
  body.rotation.y = Math.PI / 2; // 軸向轉到 +X
  body.position.x = length * 0.25;
  body.castShadow = true;
  addOutline(body);
  group.add(body);

  // 兩道活塞環刻槽(細深色環)
  for (const off of [-0.3, -0.42]) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(radius * 1.004, 0.0009, 8, 36),
      anodizedAluminum('#55704F'),
    );
    ring.rotation.y = Math.PI / 2;
    ring.position.x = length * 0.25 - length * off;
    group.add(ring);
  }
  return group;
}
