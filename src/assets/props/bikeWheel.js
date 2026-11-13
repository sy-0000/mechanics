// 腳踏車後輪(輸出件,綠):輪圈 + 輻條 + 橡膠胎。
import * as THREE from 'three';
import { bevelCylinder } from '../geo.js';
import { anodizedAluminum } from '../../materials/metal.js';
import { rubber } from '../../materials/rubber.js';
import { addOutline } from '../../materials/outline.js';
import { COLORS } from '../../materials/toon.js';

export function createBikeWheel(radius = 0.08) {
  const group = new THREE.Group();
  group.name = 'bikeWheel';
  group.userData.radius = radius;

  const tire = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.008, 12, 40), rubber('#6B655C'));
  tire.castShadow = true;
  addOutline(tire, { thickness: 0.001 });
  group.add(tire);

  const rim = new THREE.Mesh(new THREE.TorusGeometry(radius - 0.009, 0.0035, 10, 40), anodizedAluminum(COLORS.output));
  rim.castShadow = true;
  addOutline(rim, { thickness: 0.0007 });
  group.add(rim);

  const hub = new THREE.Mesh(bevelCylinder(0.009, 0.02, { seg: 18 }), anodizedAluminum(COLORS.output));
  hub.castShadow = true;
  addOutline(hub, { thickness: 0.0007 });
  group.add(hub);

  // 輻條(InstancedMesh)
  const n = 12;
  const spokeGeo = new THREE.CylinderGeometry(0.0007, 0.0007, radius - 0.012, 6);
  const spokes = new THREE.InstancedMesh(spokeGeo, anodizedAluminum('#8FB295'), n);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    q.setFromAxisAngle(new THREE.Vector3(0, 0, 1), a);
    m4.compose(
      new THREE.Vector3(Math.cos(a + Math.PI / 2) * (radius - 0.012) / 2, Math.sin(a + Math.PI / 2) * (radius - 0.012) / 2, 0),
      q, new THREE.Vector3(1, 1, 1),
    );
    spokes.setMatrixAt(i, m4);
  }
  spokes.castShadow = true;
  group.add(spokes);
  return group;
}
