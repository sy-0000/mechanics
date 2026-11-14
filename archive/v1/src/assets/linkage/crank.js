// 曲柄(動力件,銅橘):桿 + 下方帶鉚釘圓盤 + 末端把手(可抓)。
import * as THREE from 'three';
import { buildBarLink } from './barLink.js';
import { bevelCylinder } from '../geo.js';
import { dullMetal, polishedSteel } from '../../materials/metal.js';
import { addOutline } from '../../materials/outline.js';
import { COLORS, toonMaterial } from '../../materials/toon.js';

/**
 * 樞紐在原點,桿沿 +X,繞 Z 轉。
 * @param {number} length 曲柄孔心距(m)
 */
export function createCrank(length, { withDisc = true, handleLength = 0.028 } = {}) {
  const group = buildBarLink(length, COLORS.input, { name: 'crank', thickness: 0.008 });

  if (withDisc) {
    // 帶鉚釘的圓盤(曲柄下方)
    const disc = new THREE.Mesh(
      bevelCylinder(length * 0.55, 0.006, { seg: 40 }),
      dullMetal('#A08466'),
    );
    disc.position.z = -0.009;
    disc.castShadow = true;
    disc.receiveShadow = true;
    addOutline(disc);
    group.add(disc);
    // 鉚釘(InstancedMesh,相同小件)
    const rivetGeo = bevelCylinder(0.0022, 0.0035, { seg: 12, bevel: 0.0007 });
    const n = 8;
    const rivets = new THREE.InstancedMesh(rivetGeo, polishedSteel(), n);
    const m4 = new THREE.Matrix4();
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = length * 0.42;
      m4.setPosition(r * Math.cos(a), r * Math.sin(a), -0.0045);
      rivets.setMatrixAt(i, m4);
    }
    rivets.castShadow = true;
    addOutline(rivets);
    group.add(rivets);
  }

  // 末端把手(垂直於桿面,朝使用者 +Z),可抓取
  const handle = new THREE.Mesh(
    bevelCylinder(0.0062, handleLength, { seg: 20 }),
    toonMaterial(COLORS.wood),
  );
  handle.position.set(length, 0, handleLength / 2 + 0.004);
  handle.castShadow = true;
  addOutline(handle);
  handle.name = 'crank-handle';
  handle.userData.grabbable = { kind: 'crank-handle' };
  group.add(handle);
  group.userData.handle = handle;

  // 改長度時把手跟著移
  const setLen = group.userData.setLength;
  group.userData.setLength = (len) => {
    setLen(len);
    handle.position.x = len;
  };
  return group;
}
