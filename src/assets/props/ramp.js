// 可調斜度坡道(腳踏車站):平路 / 爬坡 兩種。userData.setSlope(0|1)。
import * as THREE from 'three';
import { bevelBox } from '../geo.js';
import { lightWood } from '../../materials/wood.js';
import { addOutline } from '../../materials/outline.js';

export function createRamp(length = 0.5, width = 0.12) {
  const group = new THREE.Group();
  group.name = 'ramp';
  const board = new THREE.Mesh(bevelBox(length, 0.014, width, { corner: 0.006 }), lightWood());
  board.castShadow = true;
  board.receiveShadow = true;
  addOutline(board);
  group.add(board);

  // 支撐鉸鏈端
  const pivotY = 0.007;
  let target = 0, current = 0;
  group.userData.setSlope = (mode) => { target = mode ? 0.2 : 0; }; // 爬坡 ≈ 11.5°
  group.userData.update = (dt) => {
    current += (target - current) * Math.min(1, dt * 4);
    group.rotation.z = current;
  };
  group.userData.getSlope = () => target > 0.1 ? 1 : 0;
  group.position.y = pivotY;
  return group;
}
