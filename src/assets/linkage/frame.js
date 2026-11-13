// 機架(固定件,深棕木塊):螺絲孔、邊緣 mm 刻度。
import * as THREE from 'three';
import { bevelBox, bevelCylinder, rulerTexture } from '../geo.js';
import { frameWood } from '../../materials/wood.js';
import { dullMetal } from '../../materials/metal.js';
import { addOutline } from '../../materials/outline.js';
import { toonMaterial } from '../../materials/toon.js';

/**
 * 水平橫放的機架木塊(XY 面向使用者,沿 X 伸展)。
 * @param {number} w 寬(m) @param {number} h 高 @param {number} d 深
 * @param {number} rulerMm 邊緣刻度總長(模型 mm;0 = 不貼)
 */
export function createFrame(w = 0.36, h = 0.10, d = 0.06, rulerMm = 140) {
  const group = new THREE.Group();
  group.name = 'frame';

  const block = new THREE.Mesh(bevelBox(w, h, d, { corner: 0.006 }), frameWood());
  block.castShadow = true;
  block.receiveShadow = true;
  addOutline(block);
  group.add(block);

  // 螺絲孔(四角暗色圓)+ 螺絲頭
  const screwGeo = bevelCylinder(0.0035, 0.003, { seg: 14, bevel: 0.0008 });
  const screws = new THREE.InstancedMesh(screwGeo, dullMetal('#6E6A62'), 4);
  const m4 = new THREE.Matrix4();
  const dx = w / 2 - 0.018, dy = h / 2 - 0.016;
  [[-dx, -dy], [dx, -dy], [-dx, dy], [dx, dy]].forEach((p, i) => {
    m4.setPosition(p[0], p[1], d / 2 + 0.0008);
    screws.setMatrixAt(i, m4);
  });
  screws.castShadow = true;
  addOutline(screws);
  group.add(screws);

  // 上緣 mm 刻度貼條
  if (rulerMm > 0) {
    const stripH = 0.012;
    const tex = rulerTexture(rulerMm);
    const strip = new THREE.Mesh(
      new THREE.PlaneGeometry(w * 0.92, stripH),
      toonMaterial('#FFFFFF', { map: tex }),
    );
    strip.position.set(0, h / 2 - stripH / 2 - 0.004, d / 2 + 0.0015);
    group.add(strip);
  }
  return group;
}
