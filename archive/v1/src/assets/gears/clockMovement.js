// 時鐘機芯:打開背蓋的時鐘,兩級複合齒輪 + 同軸指針軸。
// 機板(深棕)、分針軸小齒輪(動力件 銅橘)、中間複合齒輪(黃)、時針輪(綠)。
import * as THREE from 'three';
import { createGear } from './gear.js';
import { bevelCylinder, bevelBox } from '../geo.js';
import { frameWood } from '../../materials/wood.js';
import { addOutline } from '../../materials/outline.js';
import { toonMaterial, COLORS } from '../../materials/toon.js';
import { centerDistance } from '../../kinematics/gears.js';

export const CLOCK_MM = 0.0018; // 時鐘專用縮尺(齒多、要塞進 Ø0.3m 鐘殼)
const M = 2.0; // 時鐘模數(模型 mm)

/**
 * 直立面向使用者(XY 面,+Z 朝使用者)。
 * 分針軸在原點;中間軸在下方(中心距由齒數決定)。
 * 齒輪對可抽換:userData.setPairs([d1,n1],[d2,n2])。
 */
export function createClockMovement() {
  const group = new THREE.Group();
  group.name = 'clockMovement';

  // 機板(圓形深棕,帶四柱)
  const plate = new THREE.Mesh(bevelCylinder(0.15, 0.008, { seg: 48 }), frameWood());
  plate.position.z = -0.03;
  plate.receiveShadow = true;
  addOutline(plate);
  group.add(plate);
  for (const [x, y] of [[-0.1, -0.1], [0.1, -0.1], [-0.1, 0.1], [0.1, 0.1]]) {
    const post = new THREE.Mesh(bevelCylinder(0.004, 0.05, { seg: 12 }), toonMaterial(COLORS.wood));
    post.position.set(x, y, -0.005);
    post.castShadow = true;
    addOutline(post, { thickness: 0.0008 });
    group.add(post);
  }

  // 鐘殼外圈(低飽和奶油)
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(0.155, 0.012, 12, 48),
    toonMaterial(COLORS.cream),
  );
  rim.position.z = -0.02;
  rim.castShadow = true;
  addOutline(rim);
  group.add(rim);

  const wheels = new THREE.Group();
  group.add(wheels);

  const state = { pair1: null, pair2: null, parts: [] };

  /** 裝上兩級齒輪對(pair=[driver, driven];null = 空位) */
  function setPairs(pair1, pair2) {
    for (const p of state.parts) wheels.remove(p);
    state.parts = [];
    state.pair1 = pair1;
    state.pair2 = pair2;

    if (pair1) {
      // 分針軸小齒輪(driver1,銅橘)在原點
      const g1 = createGear({ m: M, z: pair1[0], color: COLORS.input, thickness: 0.007, scale: CLOCK_MM, hub: false });
      wheels.add(g1);
      // 中間軸:driven1(黃)與 driver2(黃)同軸,位於下方中心距處
      const a1 = centerDistance(M, pair1[0], pair1[1]) * CLOCK_MM;
      const mid = new THREE.Group();
      mid.position.set(0, -a1, 0);
      const g2 = createGear({ m: M, z: pair1[1], color: COLORS.coupler, thickness: 0.007, scale: CLOCK_MM, hub: false });
      mid.add(g2);
      state.parts.push(g1);
      state.mid = mid;
      state.g1 = g1;
      state.g2 = g2;
      if (pair2) {
        const g3 = createGear({ m: M, z: pair2[0], color: COLORS.coupler, thickness: 0.007, scale: CLOCK_MM, hub: false });
        g3.position.z = 0.012;
        mid.add(g3);
        // 時針輪(driven2,綠)與分針軸同心(中心距相等才可能!)
        const g4 = createGear({ m: M, z: pair2[1], color: COLORS.output, thickness: 0.007, scale: CLOCK_MM, hub: false });
        g4.position.z = 0.012;
        wheels.add(g4);
        state.parts.push(g4);
        state.g3 = g3;
        state.g4 = g4;
      }
      wheels.add(mid);
      state.parts.push(mid);
    }
    // 中央指針軸(同軸雙軸管)
    const axle = new THREE.Mesh(bevelCylinder(0.0035, 0.07, { seg: 14 }), toonMaterial(COLORS.grey));
    axle.position.z = 0.015;
    axle.castShadow = true;
    wheels.add(axle);
    state.parts.push(axle);
  }

  /** 依分針角更新所有輪(由關卡用 clock.js trainAngles 算好傳入) */
  function setAngles({ minute, wheel1, hour }) {
    if (state.g1) state.g1.rotation.z = minute;
    if (state.mid) state.mid.rotation.z = wheel1 + Math.PI / (state.pair1?.[1] || 1); // 嚙合相位
    if (state.g4) state.g4.rotation.z = hour + Math.PI / (state.pair2?.[1] || 1);
  }

  group.userData.setPairs = setPairs;
  group.userData.setAngles = setAngles;
  group.userData.state = state;
  return group;
}
