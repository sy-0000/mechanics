// 一小罐機油(低飽和金屬罐 + 細嘴)。
import * as THREE from 'three';
import { bevelCylinder } from '../geo.js';
import { dullMetal } from '../../materials/metal.js';
import { addOutline } from '../../materials/outline.js';

export function createOilCan() {
  const group = new THREE.Group();
  group.name = 'oilCan';
  const body = new THREE.Mesh(bevelCylinder(0.016, 0.03, { seg: 24 }), dullMetal('#9A948A'));
  body.rotation.x = -Math.PI / 2;
  body.position.y = 0.015;
  body.castShadow = true;
  addOutline(body);
  group.add(body);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.014, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), dullMetal('#9A948A'));
  dome.position.y = 0.03;
  dome.castShadow = true;
  addOutline(dome, { thickness: 0.0008 });
  group.add(dome);
  const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.0012, 0.003, 0.035, 10), dullMetal('#857F75'));
  spout.position.set(0.012, 0.048, 0);
  spout.rotation.z = -0.5;
  spout.castShadow = true;
  group.add(spout);
  return group;
}
