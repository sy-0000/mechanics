// 捲線滑輪 + 吊繩 + 重物(齒輪基礎關卡)。
// 滑輪裝在大齒輪軸上;userData.setLift(0–1) 控制重物高度與繩長。
import * as THREE from 'three';
import { bevelCylinder, bevelBox } from '../geo.js';
import { dullMetal } from '../../materials/metal.js';
import { addOutline } from '../../materials/outline.js';
import { toonMaterial, COLORS } from '../../materials/toon.js';

export function createWeightPulley({ drumR = 0.016, travel = 0.22 } = {}) {
  const group = new THREE.Group();
  group.name = 'weightPulley';
  group.userData.drumRadius = drumR;

  // 捲線滑輪(鼓輪,接在齒輪軸)
  const drum = new THREE.Mesh(bevelCylinder(drumR, 0.018, { seg: 26 }), dullMetal('#8F8C86'));
  drum.castShadow = true;
  addOutline(drum);
  group.add(drum);
  for (const z of [-0.011, 0.011]) {
    const flange = new THREE.Mesh(bevelCylinder(drumR + 0.005, 0.0025, { seg: 26, bevel: 0.0006 }), dullMetal('#7C7870'));
    flange.position.z = z;
    flange.castShadow = true;
    addOutline(flange, { thickness: 0.0007 });
    group.add(flange);
  }

  // 吊繩(細圓柱,長度動態)
  const ropeMat = toonMaterial('#CBBFA4');
  const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.0012, 0.0012, 1, 8), ropeMat);
  group.add(rope);

  // 重物(霧面灰方塊 + 吊環)
  const weight = new THREE.Group();
  const block = new THREE.Mesh(bevelBox(0.034, 0.042, 0.034, { corner: 0.004 }), toonMaterial(COLORS.grey));
  block.castShadow = true;
  addOutline(block);
  weight.add(block);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.005, 0.0012, 8, 16), dullMetal('#7C7870'));
  ring.position.y = 0.026;
  weight.add(ring);
  group.add(weight);
  group.userData.weight = weight;

  let lift = 0;
  group.userData.setLift = (t) => {
    lift = Math.min(1, Math.max(0, t));
    const len = travel * (1 - lift) + 0.03;
    rope.scale.y = len;
    rope.position.set(drumR, -len / 2, 0);
    weight.position.set(drumR, -len - 0.026, 0);
  };
  group.userData.getLift = () => lift;
  group.userData.setLift(0);
  return group;
}
