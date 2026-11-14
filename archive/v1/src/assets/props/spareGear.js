// 靜置的小齒輪(低飽和灰,暗示後續齒輪章節;平放桌上)。
import * as THREE from 'three';
import { createGear } from '../gears/gear.js';
import { COLORS } from '../../materials/toon.js';

export function createSpareGear() {
  const group = new THREE.Group();
  group.name = 'spareGear';
  const gear = createGear({ m: 2.2, z: 14, color: COLORS.grey, thickness: 0.008, hub: true });
  gear.rotation.x = -Math.PI / 2; // 平放
  gear.position.y = 0.006;
  group.add(gear);
  return group;
}
