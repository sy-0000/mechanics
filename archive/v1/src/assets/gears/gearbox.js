// 減速機(電動螺絲起子剖面):馬達小齒輪 → 兩級減速 → 輸出軸 + 螺絲。
// 外殼半透明剖開;馬達端銅橘、中間齒輪黃、外殼深棕、輸出軸綠。
import * as THREE from 'three';
import { createGear } from './gear.js';
import { bevelCylinder, bevelBox } from '../geo.js';
import { clearPlastic } from '../../materials/plastic.js';
import { frameWood } from '../../materials/wood.js';
import { dullMetal, polishedSteel, anodizedAluminum } from '../../materials/metal.js';
import { addOutline } from '../../materials/outline.js';
import { toonMaterial, COLORS } from '../../materials/toon.js';
import { centerDistance } from '../../kinematics/gears.js';

const M = 1.6;         // 模數(模型 mm)
const SCALE = 0.0018;  // 縮尺
export const STAGES = [
  { driver: 8, driven: 24 },  // 第一級 1/3
  { driver: 8, driven: 32 },  // 第二級 1/4 → 總 1/12
];

/**
 * 水平橫放,馬達在右(+X),輸出螺絲在左(−X)。
 * userData.setMotorAngle(theta) 帶動全部輪與螺絲。
 */
export function createGearbox() {
  const group = new THREE.Group();
  group.name = 'gearbox';

  // 殼(剖開:後半實體深棕、前半透明)
  const shellBack = new THREE.Mesh(bevelBox(0.28, 0.1, 0.035, { corner: 0.02 }), frameWood());
  shellBack.position.z = -0.028;
  shellBack.receiveShadow = true;
  shellBack.castShadow = true;
  addOutline(shellBack);
  group.add(shellBack);
  const shellFront = new THREE.Mesh(bevelBox(0.28, 0.1, 0.03, { corner: 0.02 }), clearPlastic('#CFD8D2', 0.12));
  shellFront.position.z = 0.012;
  group.add(shellFront);

  // 馬達(右端)
  const motor = new THREE.Mesh(bevelCylinder(0.026, 0.07, { seg: 28 }), dullMetal(COLORS.input));
  motor.rotation.y = Math.PI / 2;
  motor.position.set(0.135, 0, 0);
  motor.castShadow = true;
  addOutline(motor);
  group.add(motor);

  // 齒輪系(直立 XY 面)
  const a1 = centerDistance(M, STAGES[0].driver, STAGES[0].driven) * SCALE;
  const a2 = centerDistance(M, STAGES[1].driver, STAGES[1].driven) * SCALE;
  const x0 = 0.085;
  const gearsG = new THREE.Group();
  gearsG.position.z = 0;
  group.add(gearsG);

  const gM = createGear({ m: M, z: STAGES[0].driver, color: COLORS.input, thickness: 0.008, scale: SCALE, hub: false });
  gM.position.set(x0, 0, 0);
  const mid = new THREE.Group();
  mid.position.set(x0 - 0.02, -a1 * 0.9, 0); // 稍微斜下(視覺上錯開)
  // 實際嚙合以垂直距離 a1 為準:直接放正下方
  mid.position.set(x0, -a1, 0);
  const gMid1 = createGear({ m: M, z: STAGES[0].driven, color: COLORS.coupler, thickness: 0.008, scale: SCALE, hub: false });
  const gMid2 = createGear({ m: M, z: STAGES[1].driver, color: COLORS.coupler, thickness: 0.008, scale: SCALE, hub: false });
  gMid2.position.z = 0.012;
  mid.add(gMid1, gMid2);
  const gOut = createGear({ m: M, z: STAGES[1].driven, color: COLORS.output, thickness: 0.008, scale: SCALE, hub: false });
  gOut.position.set(x0, -a1 + a2, 0.012);
  gearsG.add(gM, mid, gOut);

  // 輸出軸(綠)與螺絲
  const shaft = new THREE.Mesh(bevelCylinder(0.007, 0.16, { seg: 16 }), anodizedAluminum(COLORS.output));
  shaft.rotation.y = Math.PI / 2;
  shaft.position.set(x0 - 0.1, -a1 + a2, 0.012);
  shaft.castShadow = true;
  addOutline(shaft);
  group.add(shaft);

  // 螺絲(鋼色,慢慢鎖進木塊;z 軸即 X)
  const screw = new THREE.Group();
  const screwBody = new THREE.Mesh(bevelCylinder(0.0045, 0.05, { seg: 14 }), polishedSteel());
  screwBody.rotation.y = Math.PI / 2;
  const thread = new THREE.Mesh(
    new THREE.TorusGeometry(0.005, 0.0012, 6, 10, Math.PI * 1.6),
    polishedSteel(),
  );
  thread.rotation.y = Math.PI / 2;
  screw.add(screwBody, thread);
  screw.position.set(x0 - 0.21, -a1 + a2, 0.012);
  screw.castShadow = true;
  group.add(screw);

  // 木塊(螺絲鎖入的對象)
  const wood = new THREE.Mesh(bevelBox(0.05, 0.07, 0.07, { corner: 0.005 }), toonMaterial(COLORS.woodLight));
  wood.position.set(x0 - 0.27, -a1 + a2, 0.012);
  wood.castShadow = true;
  wood.receiveShadow = true;
  addOutline(wood);
  group.add(wood);

  const ratio1 = STAGES[0].driver / STAGES[0].driven;
  const ratio2 = STAGES[1].driver / STAGES[1].driven;
  group.userData.totalRatio = ratio1 * ratio2; // 輸出/馬達 = 1/12

  group.userData.setMotorAngle = (theta) => {
    gM.rotation.z = theta;
    const tMid = -ratio1 * theta + Math.PI / STAGES[0].driven;
    mid.rotation.z = tMid;
    gOut.rotation.z = -ratio2 * tMid + Math.PI / STAGES[1].driven;
    shaft.rotation.x = -gOut.rotation.z; // 軸轉
    screw.rotation.x = -gOut.rotation.z;
    // 螺絲前進:每轉進 0.8mm,最多 25mm
    const depth = Math.min(0.025, Math.max(0, (-gOut.rotation.z / (2 * Math.PI)) * 0.0008 * 10));
    screw.position.x = x0 - 0.21 - depth;
  };
  return group;
}
