// 撥桿:兩檔或多檔(馬達開關、前後變速、坡道切換)。
import * as THREE from 'three';
import { bevelBox, bevelCylinder } from '../geo.js';
import { dullMetal } from '../../materials/metal.js';
import { addOutline } from '../../materials/outline.js';
import { toonMaterial, COLORS } from '../../materials/toon.js';
import { textPlane, T } from '../../teach/typeset.js';

/**
 * @param {object} p {label, positions:['關','開'], index, onChange}
 * 底座沿 X,撥桿前後(±30°)撥動。
 */
export function createLever({ label = '', positions = ['關', '開'], index = 0, onChange = null } = {}) {
  const group = new THREE.Group();
  group.name = `lever-${label}`;

  const base = new THREE.Mesh(bevelBox(0.05, 0.012, 0.03, { corner: 0.004 }), toonMaterial(COLORS.wood));
  base.position.y = 0.006;
  base.castShadow = true;
  base.receiveShadow = true;
  addOutline(base);
  group.add(base);

  const stick = new THREE.Group();
  const rod = new THREE.Mesh(bevelCylinder(0.0035, 0.045, { seg: 12 }), dullMetal('#8F8C86'));
  rod.rotation.x = Math.PI / 2;
  rod.position.z = 0; rod.position.y = 0.0225;
  rod.rotation.set(Math.PI / 2, 0, 0);
  // 轉成直立
  rod.rotation.set(0, 0, 0);
  rod.geometry.rotateX(Math.PI / 2);
  stick.add(rod);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.0075, 18, 12), toonMaterial(COLORS.greyBlue));
  ball.position.y = 0.047;
  ball.castShadow = true;
  addOutline(ball, { thickness: 0.0008 });
  stick.add(ball);
  rod.castShadow = true;
  addOutline(rod, { thickness: 0.0007 });
  stick.position.y = 0.01;
  group.add(stick);
  ball.userData.grabbable = { kind: 'lever', group };
  stick.userData.ball = ball;

  const mkLabel = (i) => [{ segments: [...T(label ? `${label}:` : ''), ...T(positions[i], '#7A5A3A')], align: 'center' }];
  const plate = textPlane(mkLabel(index), 0.05, { width: 420, baseSize: 58, pad: 14, bg: '#EFE6CF' });
  plate.position.set(0, 0.0128, 0.0155);
  plate.rotation.x = -Math.PI / 2.6;
  group.add(plate);

  const n = positions.length;
  const span = Math.PI / 3; // 總擺角 60°
  const state = { index };
  const angleFor = (i) => -span / 2 + (n === 1 ? 0 : (i / (n - 1)) * span);
  group.userData.getIndex = () => state.index;
  group.userData.setIndex = (i, silent = false) => {
    state.index = Math.min(n - 1, Math.max(0, i));
    stick.rotation.x = angleFor(state.index);
    plate.userData.redraw(mkLabel(state.index));
    if (!silent) onChange?.(state.index);
  };
  /** 碰一下 = 切到下一檔 */
  group.userData.toggle = () => {
    group.userData.setIndex((state.index + 1) % n);
    return state.index;
  };
  group.userData.setIndex(index, true);
  return group;
}
