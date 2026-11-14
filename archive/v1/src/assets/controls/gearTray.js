// 齒輪托盤:淺木盤 + 槽位,備用齒輪直立插放,可抓取替換。
import * as THREE from 'three';
import { bevelBox } from '../geo.js';
import { lightWood } from '../../materials/wood.js';
import { addOutline } from '../../materials/outline.js';
import { createGear } from '../gears/gear.js';
import { textPlane, T } from '../../teach/typeset.js';
import { COLORS } from '../../materials/toon.js';

/**
 * @param {object} p
 *  teethList: [10,15,20,30,40] 或 配對 [[30,30],...](時鐘)
 *  m: 模數;scale: 齒輪縮尺;labels: 槽位下方文字
 * 回傳 group;userData.slots = [{gear, teeth, home}]。
 */
export function createGearTray({
  teethList = [10, 15, 20, 30, 40], m = 2.2, scale, color = COLORS.grey,
  width = 0.36, depth = 0.12, labelFn = (t) => `${t} 齒`,
  displayScale = 0.45, // 托盤內縮小陳列;抓起/裝上時由關卡用原尺寸重建
} = {}) {
  const group = new THREE.Group();
  group.name = 'gearTray';

  const tray = new THREE.Mesh(bevelBox(width, 0.014, depth, { corner: 0.008 }), lightWood());
  tray.position.y = 0.007;
  tray.receiveShadow = true;
  tray.castShadow = true;
  addOutline(tray);
  group.add(tray);

  const n = teethList.length;
  const slots = [];
  teethList.forEach((item, i) => {
    const x = (i - (n - 1) / 2) * (width / n);
    const isPair = Array.isArray(item);
    const slot = new THREE.Group();
    slot.position.set(x, 0.014, 0);
    // 插槽(凹槽視覺:深色窄縫)
    const groove = new THREE.Mesh(bevelBox(width / n * 0.6, 0.004, 0.012, { corner: 0.002, bevel: 0.0006 }), lightWood());
    groove.material = groove.material.clone();
    groove.material.color?.multiplyScalar?.(0.7);
    groove.position.y = 0.001;
    slot.add(groove);

    const holder = new THREE.Group(); // 齒輪掛點(直立)
    holder.position.y = 0.004;
    slot.add(holder);
    const place = (teeth) => {
      const g = createGear({ m, z: teeth, color, thickness: 0.01, ...(scale ? { scale } : {}) });
      g.scale.setScalar(displayScale);
      g.position.y = (g.userData.pitchRadius + m * (scale ?? 0.0025)) * displayScale + 0.002;
      g.userData.grabbable = { kind: 'tray-gear', teeth, slotIndex: i, pair: isPair ? item : null };
      holder.add(g);
      return g;
    };
    let gear = null;
    if (isPair) {
      // 齒輪對:兩枚並排小間距
      const g1 = place(item[0]);
      g1.position.z = -0.008;
      const g2 = place(item[1]);
      g2.position.z = 0.008;
      gear = [g1, g2];
    } else {
      gear = place(item);
    }
    const label = textPlane(
      [{ segments: T(isPair ? `${item[0]}+${item[1]}` : labelFn(item)), align: 'center' }],
      width / n * 0.8, { width: 300, baseSize: 66, pad: 12, bg: '#EFE6CF' },
    );
    label.rotation.x = -Math.PI / 2.4;
    label.position.set(0, 0.004, depth / 2 - 0.012);
    slot.add(label);

    // 記錄歸位位置(放開未吸附時回到原位)
    for (const g of Array.isArray(gear) ? gear : [gear]) {
      g.userData.home = g.position.clone();
    }
    group.add(slot);
    slots.push({ slot, holder, gear, item });
  });
  group.userData.slots = slots;
  return group;
}
