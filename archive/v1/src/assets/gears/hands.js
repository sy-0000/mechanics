// 時鐘指針:時針(輸出件 綠)與分針(低飽和深灰)。同軸,指針沿 +Y(12 點)為零位。
import * as THREE from 'three';
import { bevelBox, bevelCylinder } from '../geo.js';
import { addOutline } from '../../materials/outline.js';
import { toonMaterial, COLORS } from '../../materials/toon.js';

function hand(length, width, color) {
  const g = new THREE.Group();
  const blade = new THREE.Mesh(
    bevelBox(width, length, 0.003, { corner: width * 0.3, bevel: 0.0006 }),
    toonMaterial(color),
  );
  blade.position.y = length / 2 - width;
  blade.castShadow = true;
  addOutline(blade, { thickness: 0.0008 });
  g.add(blade);
  const cap = new THREE.Mesh(bevelCylinder(width * 0.8, 0.004, { seg: 16 }), toonMaterial(color));
  cap.castShadow = true;
  addOutline(cap, { thickness: 0.0008 });
  g.add(cap);
  return g;
}

/** 回傳 {group, minuteHand, hourHand};rotation.z = −角度(順時針走) */
export function createHands() {
  const group = new THREE.Group();
  group.name = 'hands';
  const hourHand = hand(0.085, 0.011, COLORS.output);
  hourHand.position.z = 0.052;
  const minuteHand = hand(0.125, 0.008, '#6B655C');
  minuteHand.position.z = 0.058;
  group.add(hourHand, minuteHand);
  return { group, minuteHand, hourHand };
}
