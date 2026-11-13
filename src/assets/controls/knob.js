// 滾花旋鈕:每格 1 cm(模型尺寸)的 detent 旋鈕,下方小銘牌。
// 抓住旋轉(角度增量),每格「喀」一聲由關卡接 onChange。
import * as THREE from 'three';
import { bevelCylinder } from '../geo.js';
import { dullMetal } from '../../materials/metal.js';
import { addOutline } from '../../materials/outline.js';
import { toonMaterial, COLORS } from '../../materials/toon.js';
import { textPlane, T } from '../../teach/typeset.js';

/**
 * @param {object} p {label, value, min, max, step=10(模型mm), onChange}
 * 直立圓柱旋鈕,軸朝 +Y(從上方抓)。
 */
export function createKnob({ label = '', value = 50, min = 20, max = 120, step = 10, onChange = null } = {}) {
  const group = new THREE.Group();
  group.name = `knob-${label}`;

  const base = new THREE.Mesh(bevelCylinder(0.02, 0.008, { seg: 28 }), toonMaterial(COLORS.wood));
  base.rotation.x = -Math.PI / 2;
  base.position.y = 0.004;
  base.receiveShadow = true;
  base.castShadow = true;
  addOutline(base, { thickness: 0.0008 });
  group.add(base);

  const knob = new THREE.Group();
  const body = new THREE.Mesh(bevelCylinder(0.016, 0.02, { seg: 28 }), dullMetal('#8F8C86'));
  body.rotation.x = -Math.PI / 2;
  body.castShadow = true;
  addOutline(body);
  knob.add(body);
  // 滾花(短柱環繞,InstancedMesh)
  const kGeo = new THREE.BoxGeometry(0.0016, 0.018, 0.003);
  const knurls = new THREE.InstancedMesh(kGeo, dullMetal('#7C7870'), 18);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), a);
    m4.compose(new THREE.Vector3(Math.cos(a) * 0.0158, 0, Math.sin(a) * 0.0158), q, new THREE.Vector3(1, 1, 1));
    knurls.setMatrixAt(i, m4);
  }
  knurls.castShadow = true;
  knob.add(knurls);
  // 指標點
  const dot = new THREE.Mesh(bevelCylinder(0.0018, 0.0022, { seg: 10, bevel: 0.0004 }), toonMaterial(COLORS.red));
  dot.rotation.x = -Math.PI / 2;
  dot.position.set(0.011, 0.0105, 0);
  knob.add(dot);
  knob.position.y = 0.019;
  group.add(knob);
  knob.userData.grabbable = { kind: 'knob', group };

  // 銘牌(label + 數值)
  const plate = textPlane(
    [{ segments: [...T(label), ...T(` ${value}`, '#7A5A3A'), ...T(' mm')], align: 'center' }],
    0.052, { width: 400, baseSize: 60, pad: 16, bg: '#EFE6CF' },
  );
  plate.position.set(0, 0.002, 0.030);
  plate.rotation.x = -Math.PI / 3;
  group.add(plate);

  const state = { value, accum: 0 };
  group.userData.getValue = () => state.value;
  group.userData.setValue = (v) => {
    state.value = Math.min(max, Math.max(min, v));
    knob.rotation.y = -((state.value - min) / step) * (Math.PI / 6);
    plate.userData.redraw([{ segments: [...T(label), ...T(` ${state.value}`, '#7A5A3A'), ...T(' mm')], align: 'center' }]);
  };
  /** 由互動層呼叫:旋轉角增量(弧度)→ detent 累積,跨格才改值 */
  group.userData.rotateBy = (dAngle) => {
    state.accum += dAngle;
    const detent = Math.PI / 6; // 每格 30°
    let changed = 0;
    while (state.accum <= -detent) { state.accum += detent; changed += step; }
    while (state.accum >= detent) { state.accum -= detent; changed -= step; }
    if (changed !== 0) {
      const nv = Math.min(max, Math.max(min, state.value + changed));
      if (nv !== state.value) {
        group.userData.setValue(nv);
        onChange?.(nv);
        return true; // 有跨格(喀聲)
      }
    }
    knob.rotation.y = -((state.value - min) / step) * (Math.PI / 6) - state.accum;
    return false;
  };
  group.userData.setValue(value);
  group.userData.knob = knob;
  return group;
}
