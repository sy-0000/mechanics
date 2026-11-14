// 夾鉗底下的橡膠塊(灰紫,可被壓扁)。userData.setCompression(0–1)。
import * as THREE from 'three';
import { bevelBox } from '../geo.js';
import { addOutline } from '../../materials/outline.js';
import { clampRubber } from '../../materials/rubber.js';

export function createRubberBlock(w = 0.05, h = 0.035, d = 0.05) {
  const group = new THREE.Group();
  group.name = 'rubberBlock';
  const block = new THREE.Mesh(bevelBox(w, h, d, { corner: 0.005 }), clampRubber());
  block.castShadow = true;
  block.receiveShadow = true;
  addOutline(block);
  group.add(block);

  group.userData.setCompression = (t) => {
    const c = Math.min(1, Math.max(0, t));
    const sy = 1 - 0.45 * c;
    const sxz = 1 + 0.22 * c; // 體積感:壓扁時向外鼓
    block.scale.set(sxz, sy, sxz);
    block.position.y = (h * (sy - 1)) / 2; // 底面貼地
  };
  group.userData.setCompression(0);
  return group;
}
