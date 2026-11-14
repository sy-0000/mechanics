// 木牌:關卡銘牌(底座前緣一排)、暫停牌「請看老師」、站別銘牌。
import * as THREE from 'three';
import { bevelBox } from '../geo.js';
import { lightWood } from '../../materials/wood.js';
import { addOutline } from '../../materials/outline.js';
import { textPlane, T } from '../../teach/typeset.js';

/** 小木牌,正面文字,碰一下切換關卡。 */
export function createPlaque(label, { w = 0.07, h = 0.045, kind = 'level', id = null, active = false } = {}) {
  const group = new THREE.Group();
  group.name = `plaque-${id ?? label}`;

  const board = new THREE.Mesh(bevelBox(w, h, 0.008, { corner: 0.005 }), lightWood());
  board.castShadow = true;
  board.receiveShadow = true;
  addOutline(board);
  group.add(board);
  board.userData.touchable = { kind, id, group };

  const face = textPlane([{ segments: T(label), align: 'center' }], w * 0.9,
    { width: 420, baseSize: 96, pad: 24 });
  face.position.z = 0.0055;
  group.add(face);

  // 立起的小腳
  const foot = new THREE.Mesh(bevelBox(w * 0.5, 0.006, 0.02, { corner: 0.002 }), lightWood());
  foot.position.set(0, -h / 2 - 0.001, -0.008);
  addOutline(foot, { thickness: 0.0007 });
  group.add(foot);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(Math.min(w, h) * 0.62, 0.0022, 8, 32),
    new THREE.MeshBasicMaterial({ color: '#C08054' }),
  );
  ring.position.z = 0.006;
  ring.visible = active;
  group.add(ring);
  group.userData.setActive = (on) => { ring.visible = on; }; // 恆亮框,不閃爍
  return group;
}

/** 暫停牌「請看老師」:從底座前緣下方升起。userData.setRaised(bool)、update(dt)。 */
export function createPausePlaque() {
  const group = new THREE.Group();
  group.name = 'pausePlaque';
  const board = new THREE.Mesh(bevelBox(0.22, 0.12, 0.01, { corner: 0.008 }), lightWood());
  board.castShadow = true;
  addOutline(board);
  group.add(board);
  const face = textPlane([{ segments: T('請看老師'), align: 'center' }], 0.2,
    { width: 640, baseSize: 128, pad: 40 });
  face.position.z = 0.0065;
  group.add(face);

  let target = -0.16, cur = -0.16;
  group.userData.setRaised = (on) => { target = on ? 0.08 : -0.16; };
  group.userData.update = (dt) => {
    cur += (target - cur) * Math.min(1, dt * 5);
    group.position.y = cur;
    group.visible = cur > -0.155;
  };
  group.position.y = cur;
  group.visible = false;
  return group;
}
