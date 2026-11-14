// 教具三 齒輪基礎(減速)。小馬達帶 A 齒輪(銅橘),咬合 B 齒輪(綠),B 軸上的捲線滑輪吊著重物。
// 全部齒輪模數相同;換齒輪後,B 軸沿滑槽移到中心距 a = m(z_A + z_B) ÷ 2,保證咬合。
// 老師的四個步驟:0 問題(馬達直接連重物,轉不動)、1 弧長、2 力矩、3 取捨。示範:10 摩擦輪打滑、11 惰輪。
import * as THREE from 'three';
import { getKit, geo, SEM, N, codePlate, pitchR } from './kit.js';
import { createButton } from './parts.js';
import { meshAngle, centerDistance } from '../kinematics/gears.js';
import { THRESHOLDS } from '../teach/thresholds.js';
import { sfx, motorStart, motorStop, motorSet } from '../audio/sfx.js';

const T = THRESHOLDS.gears;
const M = T.module;
const AX = -0.17, AY = 0.2, Z0 = -0.05;
const PULLEY_R = 0.02, ROPE_TOP = AY - 0.0, LIFT = 0.115;
const DISPLAY = 0.5; // 托盤裡的備用齒輪以一半大小陳列

export async function createAid(ctx) {
  const kit = getKit();
  const root = new THREE.Group();
  const S = { zA: 10, zB: 30, thA: 0, stage: 3, motor: false, load: 'weight', lift: 0, turnsA: 0, lastMove: 0, demo: 0, slip: 0, strain: 0, toothAcc: 0 };

  // ---------------- 靜態:底座、立板、滑槽、馬達 ----------------
  const st = kit.body('gearFrame');
  st.add(geo.box(0.46, 0.024, 0.16), { color: SEM.frame, sw: 'wood', pos: [-0.01, 0.012, Z0 - 0.01] });
  st.add(geo.box(0.42, AY + 0.07, 0.022), { color: SEM.frame, sw: 'wood', pos: [-0.01, (AY + 0.07) / 2 + 0.012, Z0 - 0.05] });      // 齒輪座立板
  st.add(geo.box(0.26, 0.012, 0.006, 0.002), { color: N.black, sw: 'rubber', pos: [AX + 0.17, AY, Z0 - 0.038] });                   // B 軸滑槽
  st.add(geo.cylZ(0.024, 0.055, 28), { color: SEM.input, sw: 'paint', pos: [AX, AY, Z0 - 0.09] });                                  // 馬達(銅橘)
  st.add(geo.cylZ(0.025, 0.006, 28), { color: N.steelDark, sw: 'steel', pos: [AX, AY, Z0 - 0.063] });
  st.add(geo.cylZ(0.004, 0.06, 12), { color: N.steel, sw: 'steel', pos: [AX, AY, Z0 - 0.02] });
  const pm = codePlate('m = 4', 'white', { w: 0.04, h: 0.016, px: 128 }); st.add(pm.geo, { ...pm, pos: [0.13, AY + 0.055, Z0 - 0.0385] });
  // 托盤(放備用齒輪)
  st.add(geo.box(0.36, 0.014, 0.11), { color: SEM.frame, sw: 'wood', pos: [0.03, 0.007, 0.2] });
  // 重物的地板墊 + 風扇座
  st.add(geo.box(0.07, 0.006, 0.07), { color: N.steelDark, sw: 'steel', pos: [0.25, 0.003, -0.02] });
  const ign = createButton({ color: '#3E6E8E', radius: 0.016, ctx, onPress: () => setMotor(!S.motor) });
  ign.group.position.set(-0.27, 0, 0.1); root.add(ign.group);
  const pBtn = codePlate('馬達', 'orange', { w: 0.04, h: 0.016, px: 128 }); st.add(pBtn.geo, { ...pBtn, pos: [-0.27, 0.0015, 0.14], rot: [-Math.PI / 2, 0, 0] });
  root.add(st.build());

  // ---------------- 齒輪(依齒數建立,齒合併成一個幾何) ----------------
  function makeGear(z, color, handle = false) {
    const b = kit.body(`gear${z}`);
    b.add(geo.gear(M, z, 0.009, 0.004), { color, sw: 'paint' });
    b.add(geo.cylZ(Math.max(0.008, pitchR(M, z) * 0.22), 0.016, 24), { color, sw: 'paint' });
    if (handle) { const r = pitchR(M, z) * 0.62; b.add(geo.cylZ(0.0055, 0.03, 14), { color: N.cream, sw: 'plain', pos: [r, 0, 0.018] }); }
    const p = codePlate(`z = ${z}`, color === SEM.input ? 'orange' : 'green', { w: 0.032, h: 0.016, px: 112 });
    if (z >= 15) b.add(p.geo, { ...p, pos: [0, -pitchR(M, z) * 0.55, 0.005] });
    const mesh = b.build(); mesh.userData.z = z; return mesh;
  }
  const shaftA = new THREE.Group(); shaftA.position.set(AX, AY, Z0); root.add(shaftA);
  const shaftB = new THREE.Group(); shaftB.position.set(AX, AY, Z0); root.add(shaftB);
  let gearA = null, gearB = null;
  // B 軸的軸承塊(跟著中心距移動)+ 捲線滑輪(綠)
  const carB = kit.body('carB');
  carB.add(geo.box(0.03, 0.03, 0.012), { color: SEM.frame, sw: 'wood', pos: [0, 0, -0.035] });
  carB.add(geo.cylZ(0.004, 0.06, 12), { color: N.steel, sw: 'steel', pos: [0, 0, -0.012] });
  const carBMesh = carB.build(); root.add(carBMesh);
  const pulley = new THREE.Group(); root.add(pulley);
  const pb = kit.body('pulley');
  pb.add(geo.cylZ(PULLEY_R, 0.012, 28), { color: SEM.output, sw: 'paint' });
  for (const z of [-0.008, 0.008]) pb.add(geo.cylZ(PULLEY_R + 0.007, 0.003, 28), { color: SEM.output, sw: 'paint', pos: [0, 0, z] });
  pulley.add(pb.build());
  // 重物(灰鋼砝碼)與繩
  const weight = new THREE.Group(); root.add(weight);
  const wb = kit.body('weight');
  wb.add(geo.cylY(0.022, 0.05, 28), { color: N.steelDark, sw: 'steel', pos: [0, -0.03, 0] });
  wb.add(geo.torus(0.007, 0.0018, 16, 6), { color: N.steel, sw: 'steel', pos: [0, 0.0, 0] });
  weight.add(wb.build());
  const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.0012, 0.0012, 1, 6).translate(0, -0.5, 0), new THREE.MeshStandardMaterial({ color: '#D9D2C2', roughness: 0.9 }));
  root.add(rope);
  // 小風扇(換掉重物時裝在 B 軸前面)
  const fan = new THREE.Group(); root.add(fan);
  const fb = kit.body('fan');
  for (let i = 0; i < 4; i++) fb.add(geo.box(0.07, 0.022, 0.003, 0.004), { color: N.cream, sw: 'plain', pos: [0.04 * Math.cos(i * Math.PI / 2), 0.04 * Math.sin(i * Math.PI / 2), 0], rot: [0.35, 0, i * Math.PI / 2] });
  fb.add(geo.cylZ(0.01, 0.02, 20), { color: N.steelDark, sw: 'steel' });
  fan.add(fb.build());
  // 風扇的收納座:碰一下 = 換負載
  const swapB = kit.body('loadSwap');
  swapB.add(geo.box(0.06, 0.05, 0.03), { color: N.steelDark, sw: 'steel', pos: [0, 0.025, 0] });
  const pSwap = codePlate('換負載', 'white', { w: 0.05, h: 0.016, px: 144 }); swapB.add(pSwap.geo, { ...pSwap, pos: [0, 0.03, 0.0155] });
  const swapMesh = swapB.build(); swapMesh.position.set(0.25, 0, 0.09); root.add(swapMesh);
  swapMesh.userData.touchable = { onTouch: () => { S.load = S.load === 'weight' ? 'fan' : 'weight'; S.lift = 0; sfx.snap(); } };

  // ---------------- 托盤上的備用齒輪(半尺寸陳列) ----------------
  const tray = [10, 15, 20, 30, 40].map((z, i) => ({ z, i, mesh: null, home: new THREE.Vector3(-0.115 + i * 0.07, 0.016, 0.2) }));
  function fillTraySlot(slot) {
    slot.mesh = makeGear(slot.z, SEM.output === undefined ? N.steel : N.steel);
    slot.mesh.castShadow = false;
    slot.mesh.scale.setScalar(DISPLAY); slot.mesh.rotation.x = -Math.PI / 2; slot.mesh.position.copy(slot.home);
    slot.mesh.userData.grabbable = trayGrab(slot);
    root.add(slot.mesh);
  }
  function trayGrab(slot) {
    return {
      type: 'carry',
      onMove: p => { const l = root.worldToLocal(p.clone()); slot.mesh.position.copy(l); slot.mesh.rotation.set(0, 0, 0); slot.mesh.scale.setScalar(0.75); },
      onRelease: () => {
        const p = slot.mesh.position, dA = Math.hypot(p.x - AX, p.y - AY), bx = shaftB.position.x, dB = Math.hypot(p.x - bx, p.y - AY);
        if (Math.min(dA, dB) < 0.12) install(slot, dA < dB ? 'A' : 'B'); else resetSlot(slot);
      },
      onClick: () => install(slot, 'B'),
    };
  }
  function resetSlot(slot) { slot.mesh.scale.setScalar(DISPLAY); slot.mesh.rotation.set(-Math.PI / 2, 0, 0); slot.mesh.position.copy(slot.home); }
  /** 把托盤上的齒輪裝到 A 或 B 軸;拆下來的齒輪回到托盤的同一格。 */
  function install(slot, which) {
    if (S.stage === 0) { sfx.limit(); resetSlot(slot); return; }
    const old = which === 'A' ? S.zA : S.zB;
    root.remove(slot.mesh); slot.mesh.geometry.dispose();
    if (which === 'A') S.zA = slot.z; else S.zB = slot.z;
    slot.z = old; fillTraySlot(slot);
    buildPair(); sfx.snap(); ctx.feel('detent');
    S.turnsA = 0; S.lift = 0; S.lastMove = performance.now();
  }
  function buildPair() {
    for (const g of [gearA, gearB]) if (g) { g.parent.remove(g); g.geometry.dispose(); }
    gearA = makeGear(S.zA, SEM.input, true); shaftA.add(gearA);
    gearB = makeGear(S.zB, SEM.output); shaftB.add(gearB);
    gearA.userData.grabbable = handGrab;
    gearA.userData.grabPoint = new THREE.Vector3(pitchR(M, S.zA) * 0.62, 0, 0.02);
    shaftB.position.x = AX + centerDistance(M, S.zA, S.zB) / 1000;
    pose();
  }
  tray.forEach(fillTraySlot);

  // 示範用:惰輪(20 齒)與摩擦輪(兩個光滑圓盤)
  const idler = makeGear(20, SEM.coupler); idler.visible = false; root.add(idler);
  const discs = new THREE.Group(); discs.visible = false; root.add(discs);

  // ---------------- 手轉 A ----------------
  const handGrab = {
    type: 'rotary', pivot: shaftA,
    onRotate: d => { if (S.motor) return; turnA(d); },
  };
  function canLift() { return S.load !== 'weight' || S.stage === 0 ? S.stage !== 0 : S.zB / S.zA >= T.liftRatio; }
  function turnA(d) {
    // 往「拉起重物」的方向轉時,減速比不夠就轉不動
    const liftDir = -Math.sign(d) * (S.demo === 11 ? -1 : 1);             // B 反轉(惰輪示範時同向)
    if (S.load === 'weight' && liftDir > 0 && !canLift() && S.lift <= 0.001 + 0 || (S.load === 'weight' && liftDir > 0 && !canLift())) {
      S.strain = 0.25; ctx.feel('jam', 0.5); if (Math.random() < 0.1) sfx.jam(); return false;
    }
    S.thA += d; S.turnsA += Math.abs(d) / (2 * Math.PI);
    S.toothAcc += Math.abs(d) * S.zA / (2 * Math.PI);
    if (S.toothAcc >= 1) { S.toothAcc -= 1; sfx.tooth(); ctx.feel('tooth'); }
    S.lastMove = performance.now();
    return true;
  }
  function setMotor(on) { S.motor = on; if (on) motorStart(); else motorStop(); }

  // ---------------- 擺姿 ----------------
  function thetaB() {
    if (S.stage === 0) return S.thA;
    const base = meshAngle(S.zA, S.zB, S.thA);
    return S.demo === 11 ? -base + 2 * Math.PI / S.zB : base;            // 惰輪:轉向反過來
  }
  let ropeLen = 0;
  function pose() {
    shaftA.rotation.z = S.thA;
    const tb = thetaB();
    shaftB.rotation.z = tb;
    carBMesh.position.set(shaftB.position.x, AY, Z0);
    // 負載的位置:第 0 步(問題)直接接在馬達軸上
    const lx = S.stage === 0 ? AX : shaftB.position.x;
    pulley.position.set(lx, AY, Z0 + 0.03); pulley.rotation.z = S.stage === 0 ? S.thA : tb;
    fan.position.set(lx, AY, Z0 + 0.04); fan.rotation.z = (S.stage === 0 ? S.thA : tb) * 1;
    // 捲線:B 往「拉起」方向轉的角度 → 繩子變短
    const wy = 0.06 + S.lift * LIFT;
    weight.position.set(lx + PULLEY_R, wy, Z0 + 0.03);
    rope.position.set(lx + PULLEY_R, ROPE_TOP, Z0 + 0.03); ropeLen = ROPE_TOP - wy; rope.scale.y = ropeLen;
    const showWeight = S.load === 'weight';
    weight.visible = rope.visible = showWeight; fan.visible = !showWeight;
    gearA.visible = gearB.visible = S.stage !== 0 && S.demo !== 10;
    discs.visible = S.demo === 10;
    idler.visible = S.demo === 11;
    if (S.demo === 11) { idler.position.set((AX + shaftB.position.x) / 2, AY + 0.06, Z0); }
  }

  // ---------------- 教學疊圖:弧長、力箭頭、半徑線(一個 LineSegments,頂點色) ----------------
  const MAXV = 400;
  const ovGeo = new THREE.BufferGeometry();
  ovGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAXV * 3), 3));
  ovGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(MAXV * 3), 3));
  const overlay = new THREE.LineSegments(ovGeo, new THREE.LineBasicMaterial({ vertexColors: true, depthTest: false, transparent: true }));
  overlay.renderOrder = 6; overlay.frustumCulled = false; root.add(overlay);
  const cOr = new THREE.Color('#E9BFA2'), cGr = new THREE.Color('#B4D0B6'), cWh = new THREE.Color('#F2EFE6'), cBl = new THREE.Color('#B2C8DC');
  let arcStartA = 0;
  function drawOverlay() {
    const P = ovGeo.attributes.position.array, C = ovGeo.attributes.color.array; let n = 0;
    const seg = (x1, y1, x2, y2, c) => { if (n >= MAXV - 2) return; P.set([x1, y1, Z0 + 0.012, x2, y2, Z0 + 0.012], n * 3); C.set([c.r, c.g, c.b, c.r, c.g, c.b], n * 3); n += 2; };
    const arc = (cx, cy, r, a0, a1, c) => { const k = Math.max(2, Math.ceil(Math.abs(a1 - a0) / 0.08)); for (let i = 0; i < k; i++) seg(cx + r * Math.cos(a0 + (a1 - a0) * i / k), cy + r * Math.sin(a0 + (a1 - a0) * i / k), cx + r * Math.cos(a0 + (a1 - a0) * (i + 1) / k), cy + r * Math.sin(a0 + (a1 - a0) * (i + 1) / k), c); };
    const rA = pitchR(M, S.zA), rB = pitchR(M, S.zB), bx = shaftB.position.x, cx = AX + rA;
    if (S.stage === 1 && gearA.visible) {
      // 弧長:接觸點兩側走過的弧一樣長(最多 1.2 圈的 A)
      const dA = Math.max(-2.4 * Math.PI, Math.min(2.4 * Math.PI, S.thA - arcStartA)), s = dA * rA;
      arc(AX, AY, rA + 0.004, 0, Math.min(Math.abs(dA), 2 * Math.PI) * -Math.sign(dA), cOr);
      arc(bx, AY, rB + 0.004, Math.PI, Math.PI + (Math.abs(s) / rB) * Math.sign(dA), cGr);
      // 扇形的兩條半徑
      seg(AX, AY, AX + rA, AY, cOr); seg(bx, AY, bx - rB, AY, cGr);
    }
    if (S.stage === 2 && gearA.visible) {
      // 力矩:接觸點兩個等長、反向的力 + 兩條半徑(力臂)
      const f = 0.05;
      seg(cx, AY, cx, AY + f, cWh); seg(cx, AY + f, cx - 0.006, AY + f - 0.01, cWh); seg(cx, AY + f, cx + 0.006, AY + f - 0.01, cWh);
      seg(cx + 0.004, AY, cx + 0.004, AY - f, cWh); seg(cx + 0.004, AY - f, cx - 0.002, AY - f + 0.01, cWh); seg(cx + 0.004, AY - f, cx + 0.01, AY - f + 0.01, cWh);
      seg(AX, AY, cx, AY, cOr); seg(bx, AY, cx, AY, cGr);
      arc(AX, AY, 0.012, 0, 1.2, cBl); arc(bx, AY, 0.016, Math.PI, Math.PI - 1.2, cBl);
    }
    for (let i = n; i < MAXV; i++) P[i * 3] = P[i * 3 + 1] = P[i * 3 + 2] = 0;
    ovGeo.attributes.position.needsUpdate = ovGeo.attributes.color.needsUpdate = true;
    ovGeo.setDrawRange(0, n);
  }

  // ---------------- 取捨:轉速、力矩兩根實體長條(底座側面) ----------------
  const bars = [SEM.input, SEM.output].map((c, i) => {
    const b = kit.body(`bar${i}`); b.add(geo.box(0.022, 1, 0.012, 0.002).clone().translate(0, 0.5, 0), { color: i ? N.steel : N.steel, sw: 'steel' });
    const m = b.build({ cast: false }); m.position.set(0.17 + i * 0.04, 0.024, Z0 + 0.05); root.add(m); return m;
  });
  const barLabels = kit.body('barLabels');
  const pSp = codePlate('轉速', 'white', { w: 0.034, h: 0.014, px: 112 }), pTq = codePlate('力矩', 'white', { w: 0.034, h: 0.014, px: 112 });
  barLabels.add(pSp.geo, { ...pSp, pos: [0.17, 0.03, Z0 + 0.075], rot: [-Math.PI / 2, 0, 0] });
  barLabels.add(pTq.geo, { ...pTq, pos: [0.21, 0.03, Z0 + 0.075], rot: [-Math.PI / 2, 0, 0] });
  const barLabelMesh = barLabels.build({ cast: false }); root.add(barLabelMesh);

  buildPair();
  return {
    root, defaultStage: 3, stages: ['問題', '弧長', '力矩', '取捨'],
    setStage(i) {
      S.demo = i >= 10 ? i : 0; S.stage = i >= 10 ? 3 : Math.max(0, Math.min(3, i));
      arcStartA = S.thA; S.lift = 0; S.turnsA = 0;
      if (S.demo === 10) { // 摩擦輪:兩個光滑圓盤,節圓大小
        discs.clear();
        for (const [x, z, c] of [[AX, S.zA, SEM.input], [shaftB.position.x, S.zB, SEM.output]]) { const b = kit.body('disc'); b.add(geo.cylZ(pitchR(M, z), 0.009, 48), { color: c, sw: 'paint' }); const m = b.build(); m.position.set(x, AY, Z0); discs.add(m); }
      }
      const bars3 = S.stage === 3; bars.forEach(b => (b.visible = bars3)); barLabelMesh.visible = bars3;
      pose();
    },
    setAdvanced() {},
    update(dt) {
      if (S.motor) {
        const ok = canLift() || S.load !== 'weight';
        if (S.demo === 10 && S.load === 'weight') { // 摩擦輪:重物一重就打滑
          S.slip += dt; discs.children[0] && (discs.children[0].rotation.z += 3 * dt);
          if (S.slip > 0.4) { S.slip = 0; sfx.slip(); }
          motorSet(0.6, 0.3);
        } else if (ok) { turnA(-2.2 * dt); motorSet(0.55, S.load === 'weight' ? 0.4 : 0); }
        else { S.strain = 0.2; motorSet(0.12, 1); if (Math.random() < dt * 4) sfx.jam(); ctx.feel('jam', 0.4); }
      }
      if (S.strain > 0) { S.strain -= dt; shaftA.rotation.z = S.thA + Math.sin(performance.now() / 18) * 0.012; }
      // 重物高度:由 B 軸「拉起」方向轉過的角度決定
      if (S.load === 'weight' && S.stage !== 0 && S.demo !== 10) {
        const dB = (S.demo === 11 ? 1 : -1) * (S.zA / S.zB);
        S.lift = Math.max(0, Math.min(1, S.lift + 0)); // 由 turnA 推動(下面)
        S._dB = dB;
      }
      const tb0 = S._prevThA ?? S.thA;
      const dA = S.thA - tb0; S._prevThA = S.thA;
      if (S.load === 'weight' && S.stage !== 0 && S.demo !== 10) S.lift = Math.max(0, Math.min(1, S.lift + (-dA * (S.demo === 11 ? -1 : 1)) * (S.zA / S.zB) * PULLEY_R / LIFT));
      pose(); drawOverlay();
      if (S.stage === 3) {
        bars[0].scale.y = 0.03 * (S.zA / S.zB) * 2 + 0.004;     // 轉速(B / A)
        bars[1].scale.y = 0.03 * (S.zB / S.zA) * 0.75 + 0.004;  // 力矩(B / A)
      }
      ign.update(dt);
    },
    moving: () => S.motor || performance.now() - S.lastMove < 150,
    values: () => {
      const ratio = S.zB / S.zA;
      return { zA: S.zA, zB: S.zB, thetaB: Math.round(360 * S.zA / S.zB), ratio: +ratio.toFixed(2), nA: +S.turnsA.toFixed(1), nB: +(S.turnsA * S.zA / S.zB).toFixed(1) };
    },
    snapshot: () => ({ zA: S.zA, zB: S.zB, load: S.load, lift: S.lift, motorOn: S.motor, turnsA: S.turnsA }),
    dispose() { motorStop(); },
    debug: { S, install, tray, turnA, setMotor },
  };
}
