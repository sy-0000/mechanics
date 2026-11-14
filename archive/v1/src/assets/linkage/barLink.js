// 桿件共用建構:圓頭金屬桿 + 描邊 + 陰影,樞紐孔 A 在原點、沿 +X。
// crank / coupler / rocker 各自引用(每零件仍獨立成檔、獨立 Mesh)。
import * as THREE from 'three';
import { barGeometry } from '../geo.js';
import { anodizedAluminum } from '../../materials/metal.js';
import { addOutline } from '../../materials/outline.js';

/**
 * @param {number} length 孔心距(場景單位 m)
 * @param {string} color 語意色
 * @returns {THREE.Group} group;group.userData.setLength(len) 可改長度
 */
export function buildBarLink(length, color, {
  width = 0.018,
  thickness = 0.007,
  holeR = 0.0034,
  name = 'link',
} = {}) {
  const group = new THREE.Group();
  group.name = name;
  let mesh = null;

  const build = (len) => {
    if (mesh) {
      mesh.geometry.dispose();
      group.remove(mesh);
    }
    const geo = barGeometry(len, width, thickness, holeR);
    geo.translate(len / 2, 0, 0); // 孔 A 移到原點
    mesh = new THREE.Mesh(geo, anodizedAluminum(color));
    mesh.name = `${name}-bar`;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    addOutline(mesh);
    group.add(mesh);
    group.userData.length = len;
  };
  build(length);

  group.userData.setLength = build;
  group.userData.getMesh = () => mesh;
  return group;
}
