// 小風扇(「最快的風扇」任務;換掉重物時裝上)。
import * as THREE from 'three';
import { bevelCylinder } from '../geo.js';
import { dullMetal } from '../../materials/metal.js';
import { addOutline } from '../../materials/outline.js';
import { toonMaterial, COLORS } from '../../materials/toon.js';

export function createFan() {
  const group = new THREE.Group();
  group.name = 'fan';
  const hub = new THREE.Mesh(bevelCylinder(0.008, 0.014, { seg: 18 }), dullMetal('#8F8C86'));
  hub.castShadow = true;
  addOutline(hub, { thickness: 0.0008 });
  group.add(hub);

  const blades = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const blade = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0015, 0.0015, 0.045, 8),
      toonMaterial(COLORS.cream),
    );
    // 槳葉:扁橢圓(壓扁的 box 感)
    blade.geometry = new THREE.SphereGeometry(0.023, 12, 8);
    blade.scale.set(1, 0.35, 0.08);
    blade.position.x = 0.026;
    const arm = new THREE.Group();
    arm.add(blade);
    arm.rotation.z = (i / 4) * Math.PI * 2;
    blade.castShadow = true;
    addOutline(blade, { thickness: 0.0007 });
    blades.add(arm);
  }
  blades.rotation.z = 0.3;
  group.add(blades);
  group.userData.blades = blades;
  group.userData.spin = (dTheta) => { blades.rotation.z += dTheta; };
  return group;
}
