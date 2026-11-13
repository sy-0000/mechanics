// 實體按鈕(手腕按鈕、減速機啟動鈕):按下有行程與回彈。
import * as THREE from 'three';
import { bevelCylinder } from '../geo.js';
import { addOutline } from '../../materials/outline.js';
import { toonMaterial, COLORS } from '../../materials/toon.js';
import { textPlane, T } from '../../teach/typeset.js';

/**
 * @param {object} p {label, radius, color, onPress}
 * 軸朝 +Y(從上按)。userData.press() 觸發;update(dt) 回彈。
 */
export function createButton({ label = '', radius = 0.012, color = COLORS.greyBlue, onPress = null } = {}) {
  const group = new THREE.Group();
  group.name = `button-${label}`;

  const rim = new THREE.Mesh(bevelCylinder(radius + 0.004, 0.006, { seg: 26 }), toonMaterial(COLORS.wood));
  rim.rotation.x = -Math.PI / 2;
  rim.position.y = 0.003;
  rim.castShadow = true;
  addOutline(rim, { thickness: 0.0008 });
  group.add(rim);

  const cap = new THREE.Mesh(bevelCylinder(radius, 0.008, { seg: 26 }), toonMaterial(color));
  cap.rotation.x = -Math.PI / 2;
  cap.position.y = 0.009;
  cap.castShadow = true;
  addOutline(cap, { thickness: 0.0008 });
  group.add(cap);
  cap.userData.touchable = { kind: 'button', group };

  if (label) {
    const plate = textPlane([{ segments: T(label), align: 'center' }], radius * 2.4,
      { width: 360, baseSize: 64, pad: 14 });
    plate.position.set(0, 0.0005, radius + 0.014);
    plate.rotation.x = -Math.PI / 2;
    group.add(plate);
  }

  let pressT = 0;
  group.userData.press = () => {
    if (pressT > 0) return false; // 防連點
    pressT = 0.18;
    onPress?.();
    return true;
  };
  group.userData.update = (dt) => {
    if (pressT > 0) {
      pressT = Math.max(0, pressT - dt);
      cap.position.y = 0.009 - 0.004 * Math.sin((pressT / 0.18) * Math.PI);
    }
  };
  group.userData.cap = cap;
  return group;
}
