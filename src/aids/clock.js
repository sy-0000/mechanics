// 教具五 時鐘輪系(兩級複合輪系)。打開背蓋的時鐘:分針軸上的小齒輪(銅橘)帶中間齒輪(黃),
// 中間齒輪和另一個小齒輪同軸(黃),再帶時針輪(綠)。時針輪和分針同心;機板深棕。
// 托盤有五組齒輪(齒數相加都是 60)。先碰機板上的「第一級 / 第二級」選位置,再碰托盤上的一組齒輪裝上去。
// 進階數學開啟時多一個背隙旋鈕:放大背隙,反轉時指針會先晃一下。
import * as THREE from 'three';
import { getKit, geo, SEM, N, codePlate, pitchR } from './kit.js';
import { createKnob, createButton } from './parts.js';
import { meshAngle } from '../kinematics/gears.js';
import { THRESHOLDS } from '../teach/thresholds.js';
import { sfx, motorStart, motorStop, motorSet } from '../audio/sfx.js';

const T = THRESHOLDS.clock;
const M = 2.5;                                   // 模數(mm):中心距 = 2.5 × 60 ÷ 2 = 75 mm
const C = new THREE.Vector2(-0.06, 0.215), ALPHA = Math.PI * 0.2;   // 中間軸在時鐘中心右上方
const A_DIST = (M * 60) / 2000;
const I = new THREE.Vector2(C.x + A_DIST * Math.cos(ALPHA), C.y + A_DIST * Math.sin(ALPHA));
const Z0 = -0.04, Z1 = Z0 + 0.03, Z2 = Z0 + 0.016, ZH = Z0 + 0.05;
const meshAt = (zA, zB, thA, dir) => dir + meshAngle(zA, zB, thA - dir);   // B 在 A 的 dir 方向

export async function createAid(ctx) {
  const kit = getKit();
  const root = new THREE.Group();
  const S = { pair1: [30, 30], pair2: [20, 40], active: 1, thM: 0, th2: null, th4: null, hourAcc: 0, lastH: null, fast: false, backlash: 0, lastMove: 0, dir: 0 };

  // ---------------- 靜態:機板、錶盤刻度、支柱、托盤 ----------------
  const st = kit.body('clockPlate');
  const plate = new THREE.Shape(); plate.absarc(0, 0, 0.145, 0, Math.PI * 2, false);
  st.add(geo.extrude(plate, 0.012, 0.002, 48), { color: SEM.frame, sw: 'wood', pos: [C.x, C.y, Z0 - 0.006] });
  st.add(geo.ring(0.142, 0.128, 0.004, 64), { color: N.cream, sw: 'plain', pos: [C.x, C.y, Z0 + 0.002] });
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; st.add(geo.box(0.004, i % 3 ? 0.008 : 0.013, 0.003, 0.001), { color: N.black, sw: 'rubber', pos: [C.x + Math.sin(a) * 0.135, C.y + Math.cos(a) * 0.135, Z0 + 0.004], rot: [0, 0, -a] }); }
  st.add(geo.box(0.05, C.y - 0.13, 0.03), { color: SEM.frame, sw: 'wood', pos: [C.x, (C.y - 0.13) / 2 + 0.012, Z0 - 0.02] });
  st.add(geo.box(0.26, 0.024, 0.13), { color: SEM.frame, sw: 'wood', pos: [C.x, 0.012, Z0 - 0.01] });
  for (const p of [C, I]) st.add(geo.cylZ(0.0035, 0.07, 12), { color: N.steel, sw: 'steel', pos: [p.x, p.y, Z0 + 0.03] });
  st.add(geo.box(0.39, 0.012, 0.11), { color: SEM.frame, sw: 'wood', pos: [0.02, 0.006, 0.215] });               // 齒輪托盤
  root.add(st.build());

  // ---------------- 齒輪組(依目前選的兩組重建)----------------
  const minuteG = new THREE.Group(), interG = new THREE.Group(), hourG = new THREE.Group();
  minuteG.position.set(C.x, C.y, 0); interG.position.set(I.x, I.y, 0); hourG.position.set(C.x, C.y, 0);
  root.add(minuteG, interG, hourG);
  const meshes = [];
  function gearPart(b, z, color, zpos, label, chalk) {
    b.add(geo.gear(M, z, 0.006, 0.003), { color, sw: 'paint', pos: [0, 0, zpos] });
    b.add(geo.cylZ(0.006, 0.012, 16), { color, sw: 'paint', pos: [0, 0, zpos] });
    if (label && z >= 30) { const p = codePlate(label, chalk, { w: 0.022, h: 0.014, px: 80 }); b.add(p.geo, { ...p, pos: [0, -pitchR(M, z) * 0.6, zpos + 0.0035] }); }
  }
  function buildTrain() {
    meshes.forEach(m => { m.parent.remove(m); m.geometry.dispose(); }); meshes.length = 0;
    const [z1, z2] = S.pair1, [z3, z4] = S.pair2;
    const bm = kit.body('minute');                       // 分針軸:第一級主動輪 + 分針(銅橘)
    gearPart(bm, z1, SEM.input, Z1, 'z_1', 'orange');
    bm.add(geo.box(0.11, 0.006, 0.003, 0.0015), { color: SEM.input, sw: 'paint', pos: [0, 0.045, ZH], rot: [0, 0, Math.PI / 2] });
    bm.add(geo.cylZ(0.008, 0.006, 16), { color: SEM.input, sw: 'paint', pos: [0, 0, ZH] });
    const bi = kit.body('inter');                        // 中間軸:z2 與 z3 同軸(黃)
    gearPart(bi, z2, SEM.coupler, Z1, 'z_2', 'yellow'); gearPart(bi, z3, SEM.coupler, Z2, 'z_3', 'yellow');
    bi.add(geo.cylZ(0.005, Z1 - Z2 + 0.006, 12), { color: SEM.coupler, sw: 'paint', pos: [0, 0, (Z1 + Z2) / 2] });
    const bh = kit.body('hour');                         // 時針輪 + 時針(綠),和分針同心
    gearPart(bh, z4, SEM.output, Z2, 'z_4', 'green');
    bh.add(geo.box(0.07, 0.009, 0.003, 0.002), { color: SEM.output, sw: 'paint', pos: [0, 0.028, ZH - 0.006], rot: [0, 0, Math.PI / 2] });
    bh.add(geo.cylZ(0.011, Math.abs(ZH - Z2), 16), { color: SEM.output, sw: 'paint', pos: [0, 0, (ZH + Z2) / 2 - 0.003] });
    const mM = bm.build(), mI = bi.build(), mH = bh.build();
    minuteG.add(mM); interG.add(mI); hourG.add(mH); meshes.push(mM, mI, mH);
    mM.userData.grabbable = { type: 'rotary', pivot: minuteG, onRotate: d => turn(d) };
    mM.userData.grabPoint = new THREE.Vector3(0, 0.08, ZH);
    S.th2 = S.th4 = null; S.hourAcc = 0; S.lastH = null;
    pose();
  }
  function ideal() {
    const [z1, z2] = S.pair1, [z3, z4] = S.pair2;
    const t2 = meshAt(z1, z2, S.thM, ALPHA);
    const t4 = meshAt(z3, z4, t2, ALPHA + Math.PI);
    return { t2, t4 };
  }
  /** 背隙:從動輪的角度跟著理想角度,但有 ±play/2 的空轉。 */
  const play = z => (S.backlash * 0.0006) / pitchR(M, z);
  function follow(cur, target, p) { if (cur === null) return target; if (target - cur > p / 2) return target - p / 2; if (cur - target > p / 2) return target + p / 2; return cur; }
  function pose() {
    const id = ideal();
    S.th2 = follow(S.th2, id.t2, play(S.pair1[1]));
    S.th4 = follow(S.th4, meshAt(S.pair2[0], S.pair2[1], S.th2, ALPHA + Math.PI), play(S.pair2[1]));
    minuteG.rotation.z = S.thM; interG.rotation.z = S.th2; hourG.rotation.z = S.th4;
    if (S.lastH !== null) S.hourAcc += Math.abs(S.th4 - S.lastH) / (2 * Math.PI);
    S.lastH = S.th4;
  }
  function turn(d) { S.thM += d; S.lastMove = performance.now(); pose(); }

  // ---------------- 第一級 / 第二級 選位置 ----------------
  const slots = [1, 2].map(k => {
    const b = kit.body(`slot${k}`);
    b.add(geo.box(0.06, 0.006, 0.026, 0.002), { color: N.cream, sw: 'plain' });
    const p = codePlate(k === 1 ? '第一級' : '第二級', 'white', { w: 0.05, h: 0.018, px: 144 }); b.add(p.geo, { ...p, pos: [0, 0.0035, 0], rot: [-Math.PI / 2, 0, 0] });
    const m = b.build(); m.position.set(0.17, 0.012, k === 1 ? -0.07 : -0.03); root.add(m);
    m.userData.touchable = { onTouch: () => { S.active = k; sfx.detent(); } };
    return m;
  });
  const marker = kit.body('marker'); marker.add(geo.cylY(0.006, 0.004, 3), { color: N.cream, sw: 'plain', rot: [0, 0, 0] });
  const markerMesh = marker.build({ cast: false }); root.add(markerMesh);

  // ---------------- 托盤上的五組齒輪(半尺寸陳列) ----------------
  const pairs = T.pairs.map((pair, i) => {
    const b = kit.body(`pair${i}`);
    const [za, zb] = pair, ra = pitchR(M, za) * 0.5, rb = pitchR(M, zb) * 0.5;
    b.add(geo.gear(M, za, 0.006, 0.003).clone().scale(0.5, 0.5, 1), { color: N.steel, sw: 'steel', pos: [-rb * 0.5, 0, 0] });
    b.add(geo.gear(M, zb, 0.006, 0.003).clone().scale(0.5, 0.5, 1), { color: N.steel, sw: 'steel', pos: [ra * 0.5 + rb * 0.5 + 0.004, 0, 0] });
    const p = codePlate(`${za}+${zb}`, 'white', { w: 0.036, h: 0.014, px: 112 }); b.add(p.geo, { ...p, pos: [0.004, -0.022, 0.0035] });
    const m = b.build({ cast: false }); m.rotation.x = -Math.PI / 2 + 0.35; m.position.set(-0.13 + i * 0.075, 0.03, 0.215); root.add(m);
    m.userData.touchable = { onTouch: () => install(pair) };
    return m;
  });
  function install(pair) {
    if (S.active === 1) S.pair1 = pair.slice(); else S.pair2 = pair.slice();
    S.active = S.active === 1 ? 2 : 1;
    sfx.snap(); ctx.feel('detent');
    buildTrain(); S.lastMove = performance.now();
  }

  // 快轉按鈕(像鐘錶匠的測試台馬達)
  const fastBtn = createButton({ color: N.steelDark, radius: 0.015, ctx, onPress: () => { S.fast = !S.fast; S.fast ? motorStart() : motorStop(); } });
  fastBtn.group.position.set(0.12, 0.024, 0.07); root.add(fastBtn.group);
  const pFast = kit.body('fastLabel'); const pf = codePlate('快轉', 'orange', { w: 0.036, h: 0.014, px: 112 });
  pFast.add(pf.geo, { ...pf, pos: [0.12, 0.0255, 0.105], rot: [-Math.PI / 2, 0, 0] }); pFast.add(geo.box(0.07, 0.012, 0.08), { color: SEM.frame, sw: 'wood', pos: [0.12, 0.018, 0.08] });
  root.add(pFast.build());

  // 背隙旋鈕(進階數學才出現)
  const knobBase = kit.body('backlashBase');
  const knob = createKnob({ label: '背隙', symbol: 'j', chalk: 'blue', color: N.steel, value: 0, min: 0, max: 5, step: 1, unit: '格', ctx, onChange: v => { S.backlash = v; S.th2 = S.th4 = null; pose(); } }, knobBase, [0.12, 0.024, -0.005]);
  const knobBaseMesh = knobBase.build(); root.add(knobBaseMesh); root.add(knob.group);
  knob.group.visible = knobBaseMesh.visible = false;

  buildTrain();
  return {
    root, defaultStage: 0, stages: ['時鐘'],
    setAdvanced(on) { knob.group.visible = knobBaseMesh.visible = on; if (!on) { S.backlash = 0; knob.set(0); S.th2 = S.th4 = null; pose(); } },
    update(dt) {
      if (S.fast) { turn(-dt * 2 * Math.PI * 1.6); motorSet(0.6, 0); }
      const target = S.active === 1 ? minuteG : interG;      // 選中的位置:小三角形標記
      markerMesh.position.set(S.active === 1 ? C.x + 0.045 : I.x + 0.045, (S.active === 1 ? C.y : I.y) + 0.04, Z1 + 0.012);
      markerMesh.rotation.set(Math.PI / 2, 0, Math.PI);
      slots.forEach((m, i) => (m.position.y = 0.012 + (S.active === i + 1 ? 0.004 : 0)));
      fastBtn.update(dt); knob.update(dt);
    },
    moving: () => S.fast || performance.now() - S.lastMove < 150,
    values: () => {
      const [z1, z2] = S.pair1, [z3, z4] = S.pair2, r1 = z2 / z1, r2 = z4 / z3, total = r1 * r2;
      return { z1, z2, z3, z4, r1: +r1.toFixed(2), r2: +r2.toFixed(2), total: +total.toFixed(2), ok: Math.abs(total - 12) < 1e-9 ? '✔' : '✘' };
    },
    snapshot: () => ({ pair1: S.pair1, pair2: S.pair2, total: (S.pair1[1] / S.pair1[0]) * (S.pair2[1] / S.pair2[0]), hourTurns: S.hourAcc }),
    dispose() { motorStop(); },
    debug: { S, install, turn },
  };
}
