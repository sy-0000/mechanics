// 游標卡尺(可抓起來量行程):拋光鋼 + 刻度貼圖 + 可滑動游標。
import * as THREE from 'three';
import { bevelBox, rulerTexture } from '../geo.js';
import { polishedSteel } from '../../materials/metal.js';
import { addOutline } from '../../materials/outline.js';
import { toonMaterial } from '../../materials/toon.js';

/**
 * 主尺沿 +X,固定爪在 x=0。userData.setOpening(mm, scale) 開口距離。
 * userData.readingMm 目前讀數。
 */
export function createCaliper(lengthMm = 80, mm = 0.0016) {
  const group = new THREE.Group();
  group.name = 'caliper';
  group.userData.grabbable = { kind: 'prop' };

  const L = lengthMm * mm;
  const beam = new THREE.Mesh(bevelBox(L, 0.016, 0.004, { corner: 0.002 }), polishedSteel());
  beam.position.x = L / 2;
  beam.castShadow = true;
  addOutline(beam, { thickness: 0.0008 });
  group.add(beam);

  // 刻度
  const scaleStrip = new THREE.Mesh(
    new THREE.PlaneGeometry(L * 0.96, 0.009),
    toonMaterial('#FFFFFF', { map: rulerTexture(lengthMm, 10) }),
  );
  scaleStrip.position.set(L / 2, 0.002, 0.0022);
  group.add(scaleStrip);

  // 固定爪
  const jaw1 = new THREE.Mesh(bevelBox(0.006, 0.03, 0.004, { corner: 0.001 }), polishedSteel());
  jaw1.position.set(0.003, -0.021, 0);
  jaw1.castShadow = true;
  addOutline(jaw1, { thickness: 0.0007 });
  group.add(jaw1);

  // 游標 + 活動爪
  const slide = new THREE.Group();
  const vernier = new THREE.Mesh(bevelBox(0.022, 0.02, 0.0055, { corner: 0.002 }), polishedSteel());
  vernier.castShadow = true;
  addOutline(vernier, { thickness: 0.0007 });
  slide.add(vernier);
  const jaw2 = new THREE.Mesh(bevelBox(0.006, 0.03, 0.004, { corner: 0.001 }), polishedSteel());
  jaw2.position.set(-0.008, -0.021, 0);
  jaw2.castShadow = true;
  addOutline(jaw2, { thickness: 0.0007 });
  slide.add(jaw2);
  slide.position.x = 0.04;
  group.add(slide);
  slide.userData.grabbable = { kind: 'caliper-slide' };

  group.userData.readingMm = 25;
  group.userData.setOpening = (openMm) => {
    const v = Math.min(lengthMm, Math.max(0, openMm));
    slide.position.x = 0.011 + v * mm;
    group.userData.readingMm = v;
  };
  group.userData.setOpening(25);
  group.userData.slide = slide;
  return group;
}
