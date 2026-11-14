// 小齒輪(動力件,銅橘)+ 小馬達殼。
import * as THREE from 'three';
import { createGear, MM } from './gear.js';
import { bevelCylinder } from '../geo.js';
import { dullMetal } from '../../materials/metal.js';
import { addOutline } from '../../materials/outline.js';
import { COLORS } from '../../materials/toon.js';

/** 馬達帶動的小齒輪:齒輪中心在原點,馬達殼在 −Z 後方。 */
export function createPinion({ m = 2.2, z = 10, thickness = 0.012, withMotor = true, withHandle = true } = {}) {
  const group = new THREE.Group();
  group.name = 'pinion';
  const gear = createGear({ m, z, color: COLORS.input, thickness, withHandle });
  group.add(gear);
  group.userData.gear = gear;
  group.userData.teeth = z;
  group.userData.pitchRadius = (m * z * MM) / 2;

  if (withMotor) {
    const motor = new THREE.Group();
    motor.name = 'motor';
    const body = new THREE.Mesh(bevelCylinder(0.02, 0.05, { seg: 28 }), dullMetal(COLORS.input));
    body.position.z = -0.038;
    body.castShadow = true;
    addOutline(body);
    motor.add(body);
    const cap = new THREE.Mesh(bevelCylinder(0.013, 0.012, { seg: 20 }), dullMetal('#7C7870'));
    cap.position.z = -0.068;
    cap.castShadow = true;
    addOutline(cap, { thickness: 0.0008 });
    motor.add(cap);
    group.add(motor);
    group.userData.motor = motor;
  }
  return group;
}
