// 教具二 曲柄滑塊(簡化的汽油引擎)。汽缸直立,上死點 θ = 0°,順著轉動方向為正。
// 點火只在上死點剛過(0°–30°)推得最有力;其他時候靠飛輪的慣性轉。飛輪有摩擦,不點火會慢慢停。
// 從雨刷切換過來時播放約 3 秒的過場:搖桿越變越長,端點畫的圓弧越來越平,最後換成直線導軌上的滑塊。
import * as THREE from 'three';
import { getKit, geo, SEM, N, codePlate, FONT } from './kit.js';
import { createButton } from './parts.js';
import { solve as scSolve, stroke as scStroke } from '../kinematics/sliderCrank.js';
import { THRESHOLDS } from '../teach/thresholds.js';
import { sfx } from '../audio/sfx.js';

const T = THRESHOLDS.engine;
const CM = 0.01, DEG = Math.PI / 180;
const CX = -0.07, CY = 0.1, Z0 = -0.04;       // 曲柄軸心
const R2 = T.crank * CM, R3 = T.rod * CM;
const PISTON_H = 0.04, BORE = 0.034;
const CYL_Y0 = CY + R3 - R2 - PISTON_H / 2 - 0.006, CYL_Y1 = CY + R3 + R2 + PISTON_H / 2 + 0.008;
const norm180 = a => ((((a / DEG) + 180) % 360 + 360) % 360) - 180;

export async function createAid(ctx) {
  const kit = getKit();
  const root = new THREE.Group();
  const S = { theta: 0.35, omega: 0, handOmega: 0, held: false, runRevs: 0, lastMove: 0, caliper: 2, caliperSet: false, flash: 0, flashCol: 0, deadPulse: 0, intro: null };

  // ---------------- 靜態:底座、汽缸座、導軌、刻度尺、按鈕座 ----------------
  const st = kit.body('engineFrame');
  st.add(geo.box(0.3, 0.024, 0.16), { color: SEM.frame, sw: 'wood', pos: [CX + 0.03, 0.012, Z0 - 0.01] });
  st.add(geo.box(0.05, CY - 0.012, 0.03), { color: SEM.frame, sw: 'wood', pos: [CX, (CY + 0.012) / 2, Z0 - 0.05] });       // 曲柄軸承座
  st.add(geo.cylZ(0.014, 0.03, 24), { color: N.steelDark, sw: 'steel', pos: [CX, CY, Z0 - 0.045] });
  // 汽缸座(深棕):兩側立柱夾住透明汽缸,上蓋
  for (const sx of [-1, 1]) st.add(geo.box(0.014, CYL_Y1 - 0.024, 0.05), { color: SEM.frame, sw: 'wood', pos: [CX + sx * (BORE / 2 + 0.014), (CYL_Y1 + 0.024) / 2, Z0 - 0.0] });
  st.add(geo.box(BORE + 0.06, 0.016, 0.054), { color: SEM.frame, sw: 'wood', pos: [CX, CYL_Y1 + 0.008, Z0] });
  st.add(geo.box(BORE + 0.06, 0.012, 0.054), { color: SEM.frame, sw: 'wood', pos: [CX, CYL_Y0 - 0.006, Z0] });
  // 火星塞(瓷白 + 鋼)
  st.add(geo.cylY(0.006, 0.026, 16), { color: N.cream, sw: 'plain', pos: [CX, CYL_Y1 + 0.03, Z0] });
  st.add(new THREE.CylinderGeometry(0.0085, 0.0085, 0.008, 6), { color: N.steel, sw: 'steel', pos: [CX, CYL_Y1 + 0.019, Z0] });
  st.add(geo.cylY(0.0025, 0.01, 8), { color: N.steel, sw: 'steel', pos: [CX, CYL_Y1 + 0.047, Z0] });
  // 刻度尺(cm,和黑板一致):貼在右邊立柱前面,0 對齊下死點的活塞頂
  const rulerCell = kit.label(64, 256, { rough: 0.7 });
  const RULER_LEN = 0.14;
  rulerCell.draw((g, w, h) => {
    g.fillStyle = '#EDE6D6'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#2E2B28'; g.font = `15px ${FONT}`; g.textAlign = 'left'; g.textBaseline = 'middle';
    const pxPerMm = h / (RULER_LEN * 1000);
    for (let mm = 0; mm <= RULER_LEN * 1000; mm++) {
      const y = h - mm * pxPerMm, L = mm % 10 === 0 ? 22 : mm % 5 === 0 ? 14 : 8;
      g.fillRect(0, y - 0.6, L, 1.2);
      if (mm % 10 === 0 && mm > 0 && mm < 140) g.fillText(String(mm / 10), 26, y);
    }
  });
  const pistonTopAtBDC = CY + (R3 - R2) + PISTON_H / 2;
  st.add(new THREE.PlaneGeometry(0.016, RULER_LEN), { rect: rulerCell.rect, keep: 1, pos: [CX + BORE / 2 + 0.03, pistonTopAtBDC + RULER_LEN / 2 - 0.0, Z0 + 0.0255] });
  // 飛輪的上死點指針(固定)
  st.add(geo.box(0.004, 0.014, 0.004, 0.001), { color: N.cream, sw: 'plain', pos: [CX, CY + 0.076, Z0 - 0.02] });
  // 代號銅牌:θ(角度,藍)、x(活塞位置,綠)
  const pTh = codePlate('θ', 'blue', { w: 0.026 }); st.add(pTh.geo, { ...pTh, pos: [CX - 0.05, CY - 0.06, Z0 - 0.034] });
  const pX = codePlate('x', 'green', { w: 0.026 }); st.add(pX.geo, { ...pX, pos: [CX + BORE / 2 + 0.03, CYL_Y1 + 0.03, Z0 + 0.0255] });

  // ---------------- 會動的零件 ----------------
  const crank = new THREE.Group(); crank.position.set(CX, CY, Z0); root.add(crank);
  const cb = kit.body('flywheel');
  cb.add(geo.ring(0.07, 0.054, 0.016, 48), { color: SEM.input, sw: 'paint', pos: [0, 0, -0.024] });           // 小飛輪(銅橘)
  cb.add(geo.cylZ(0.056, 0.006, 40), { color: SEM.input, sw: 'paint', pos: [0, 0, -0.024] });
  cb.add(geo.cylZ(0.015, 0.03, 24), { color: SEM.input, sw: 'paint', pos: [0, 0, -0.02] });
  cb.add(geo.box(0.006, 0.012, 0.004, 0.001), { color: N.cream, sw: 'plain', pos: [0, 0.064, -0.015] });     // 上死點記號
  cb.add(geo.bar(R2, 0.022, 0.007), { color: SEM.input, sw: 'paint', rot: [0, 0, Math.PI / 2], pos: [0, 0, 0] });                 // 曲柄
  cb.add(geo.cylZ(0.016, 0.007, 24), { color: SEM.input, sw: 'paint', pos: [0, -0.012, 0] });                // 配重
  cb.add(geo.cylZ(0.0055, 0.034, 14), { color: SEM.input, sw: 'paint', pos: [0.062 * Math.sin(2.4), 0.062 * Math.cos(2.4), 0.0] });  // 飛輪上的把手
  cb.add(geo.cylZ(0.0075, 0.014, 18), { color: N.cream, sw: 'plain', pos: [0.062 * Math.sin(2.4), 0.062 * Math.cos(2.4), 0.022] });
  const pA = codePlate('r_2', 'orange', { w: 0.026 }); cb.add(pA.geo, { ...pA, pos: [-0.034, 0.03, -0.0205], rot: [0, 0, 0] });
  const flyMesh = cb.build(); crank.add(flyMesh);
  // 把手在飛輪局部 (x,y) = 0.062·(sin 2.4, cos 2.4);曲柄沿局部 +Y(θ=0 時朝上 = 上死點)
  flyMesh.userData.grabPoint = new THREE.Vector3(0.062 * Math.sin(2.4), 0.062 * Math.cos(2.4), 0.02);
  const rod = new THREE.Group(); rod.position.z = Z0 + 0.009; root.add(rod);
  const rb = kit.body('conrod');
  rb.add(geo.bar(R3, 0.016, 0.006), { color: SEM.coupler, sw: 'paint' });
  const pR = codePlate('r_3', 'yellow', { w: 0.024 }); rb.add(pR.geo, { ...pR, pos: [R3 * 0.45, 0, 0.0035] });
  rod.add(rb.build());
  const piston = new THREE.Group(); piston.position.set(CX, 0, Z0); root.add(piston);
  const pb = kit.body('piston');
  pb.add(geo.cylY(BORE / 2 - 0.0008, PISTON_H, 32), { color: SEM.output, sw: 'paint' });
  for (const y of [0.012, 0.004]) pb.add(geo.cylY(BORE / 2 - 0.0002, 0.0025, 32), { color: N.steelDark, sw: 'steel', pos: [0, y, 0] });
  pb.add(geo.cylZ(0.0045, BORE - 0.004, 12), { color: N.steel, sw: 'steel', pos: [0, -0.008, 0] });
  piston.add(pb.build());
  const pinB = kit.body('pin'); pinB.add(geo.cylZ(0.0055, 0.022, 16), { color: N.steel, sw: 'steel' });
  const pins = pinB.instanced(2); root.add(pins);

  // 透明汽缸(另一個材質)+ 發光套筒(點火的暖光、死點的邊框亮起)
  const cylMat = new THREE.MeshStandardMaterial({ color: N.glass, transparent: true, opacity: 0.22, roughness: 0.05, metalness: 0, depthWrite: false, side: THREE.DoubleSide });
  const cyl = new THREE.Mesh(new THREE.CylinderGeometry(BORE / 2 + 0.002, BORE / 2 + 0.002, CYL_Y1 - CYL_Y0, 32, 1, true), cylMat);
  cyl.position.set(CX, (CYL_Y0 + CYL_Y1) / 2, Z0); cyl.renderOrder = 3; root.add(cyl);
  const glowMat = new THREE.MeshBasicMaterial({ color: '#FFB46A', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
  const glow = new THREE.Mesh(new THREE.CylinderGeometry(BORE / 2 + 0.0035, BORE / 2 + 0.0035, CYL_Y1 - CYL_Y0, 32, 1, true), glowMat);
  glow.position.copy(cyl.position); glow.renderOrder = 4; glow.visible = false; root.add(glow);

  // 點火按鈕(右前)
  const ign = createButton({ color: '#B5443C', radius: 0.018, ctx, onPress: () => ignite() });
  ign.group.position.set(0.17, 0.0, 0.17); root.add(ign.group);
  st.add(geo.box(0.07, 0.012, 0.07), { color: N.steelDark, sw: 'steel', pos: [0.17, 0.006, 0.17] });
  // 按鈕旁的閃電代號牌
  const pIg = codePlate('點火', 'orange', { w: 0.04, h: 0.016, px: 128 }); st.add(pIg.geo, { ...pIg, pos: [0.17, 0.0125, 0.215], rot: [-Math.PI / 2, 0, 0] });

  // ---------------- 游標卡尺(選做:量行程)----------------
  // 直立在汽缸左邊:固定爪在下死點的活塞頂高度,活動爪可上下拉。開口 = 讀數。
  const CAL_X = CX - BORE / 2 - 0.045, CAL_Z = Z0 + 0.03;
  st.add(geo.box(0.012, 0.17, 0.004, 0.001), { color: N.steel, sw: 'steel', pos: [CAL_X, pistonTopAtBDC + 0.07, CAL_Z] });   // 主尺
  st.add(geo.box(0.03, 0.006, 0.005, 0.001), { color: N.steel, sw: 'steel', pos: [CAL_X + 0.012, pistonTopAtBDC - 0.003, CAL_Z] });   // 固定爪
  const calCell = kit.label(48, 256, { metal: 0.6, rough: 0.35 });
  calCell.draw((g, w, h) => {
    g.fillStyle = '#C9CDD0'; g.fillRect(0, 0, w, h); g.fillStyle = '#2E2B28'; g.font = `13px ${FONT}`; g.textBaseline = 'middle';
    const pxmm = h / 160; for (let mm = 0; mm <= 160; mm++) { const y = h - mm * pxmm; const L = mm % 10 === 0 ? 18 : mm % 5 === 0 ? 12 : 6; g.fillRect(0, y - 0.5, L, 1); if (mm % 10 === 0 && mm && mm < 160) g.fillText(String(mm / 10), 21, y); }
  });
  st.add(new THREE.PlaneGeometry(0.011, 0.16), { rect: calCell.rect, keep: 1, pos: [CAL_X, pistonTopAtBDC + 0.08, CAL_Z + 0.0022] });
  const jaw = new THREE.Group(); jaw.position.set(CAL_X, 0, CAL_Z); root.add(jaw);
  const jb = kit.body('caliperJaw');
  jb.add(geo.box(0.02, 0.014, 0.008, 0.001), { color: N.steel, sw: 'steel' });
  jb.add(geo.box(0.03, 0.005, 0.005, 0.001), { color: N.steel, sw: 'steel', pos: [0.012, 0.009, 0] });
  jb.add(geo.box(0.014, 0.004, 0.003, 0.001), { color: N.black, sw: 'rubber', pos: [-0.004, 0, 0.005] });
  const jawMesh = jb.build(); jaw.add(jawMesh);
  const slidePivot = new THREE.Object3D(); slidePivot.rotation.z = Math.PI / 2; slidePivot.position.set(CAL_X, 0, CAL_Z); root.add(slidePivot);
  jawMesh.userData.grabbable = {
    type: 'slide', pivot: slidePivot,
    onSlide: x => { S.caliper = Math.min(15, Math.max(0, (x - pistonTopAtBDC) / CM)); S.lastMove = performance.now(); placeJaw(); },
    onGrab: () => { S.caliperSet = false; },
    onRelease: () => { S.caliperSet = true; sfx.detent(); },
  };
  const placeJaw = () => { jaw.position.y = pistonTopAtBDC + S.caliper * CM + 0.007; };
  placeJaw();
  const staticMesh = st.build(); root.add(staticMesh);

  // ---------------- 手轉飛輪 ----------------
  let lastHandT = 0;
  flyMesh.userData.grabbable = {
    type: 'rotary', pivot: crank,
    onGrab: () => { S.held = true; S.omega = 0; S.handOmega = 0; lastHandT = performance.now(); },
    onRotate: d => {
      // 畫面上逆時針為 rotation.z 正向;θ 取順時針(由學生看)為正,讓飛輪順著時鐘轉
      const now = performance.now(), dt = Math.max(1, now - lastHandT) / 1000; lastHandT = now;
      S.theta -= d; S.handOmega = THREE.MathUtils.lerp(S.handOmega, -d / dt, 0.3); S.lastMove = now;
    },
    onRelease: () => { S.held = false; S.omega = THREE.MathUtils.clamp(S.handOmega, -T.maxOmega, T.maxOmega); },
  };

  // ---------------- 點火 ----------------
  function ignite() {
    sfx.spark();
    if (S.intro) return;
    const a = norm180(S.theta);
    if (a >= T.good[0] && a <= T.good[1]) {
      S.omega = Math.min(T.maxOmega, S.omega + T.kickGood); flash(1, '#FFB46A'); sfx.ignite(); ctx.feel('ignite');
    } else if (a >= T.early[0] && a < T.early[1]) {
      S.omega += T.kickEarly; flash(0.45, '#FF8A5A'); sfx.knock(); ctx.feel('knock');
    } else if (a > T.late[0] && a <= T.late[1]) {
      S.omega = Math.min(T.maxOmega, S.omega + T.kickLate); flash(0.35, '#FFB46A'); sfx.ignite({ gain: 0.4 }); ctx.feel('ignite', 0.4);
    }
  }
  function flash(k, col) { S.flash = k; glowMat.color.set(col); }

  // ---------------- 擺姿 ----------------
  const _m = new THREE.Matrix4();
  function pose() {
    crank.rotation.z = -S.theta;
    const s = scSolve(R2, R3, S.theta);          // 運動學 x 軸 = 汽缸軸(向上)
    const Ax = CX + R2 * Math.sin(S.theta), Ay = CY + R2 * Math.cos(S.theta);
    const Py = CY + s.x;
    rod.position.set(Ax, Ay, rod.position.z);
    rod.rotation.z = Math.atan2(Py - Ay, CX - Ax);
    piston.position.y = Py + 0.008;
    _m.makeTranslation(Ax, Ay, Z0 + 0.011); pins.setMatrixAt(0, _m);
    _m.makeTranslation(CX, Py, Z0 + 0.0); pins.setMatrixAt(1, _m); pins.instanceMatrix.needsUpdate = true;
    return s;
  }

  // ---------------- 過場:搖桿越來越長 → 直線導軌 ----------------
  if (ctx.from === 'wiper') startIntro();
  function startIntro() {
    const g = new THREE.Group(); root.add(g);
    const board = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.42), new THREE.MeshStandardMaterial({ color: '#EDE6D6', roughness: 0.9 }));
    board.position.set(CX + 0.12, 0.23, Z0 - 0.075); g.add(board);                 // 過場期間暫時加回的背板
    const rk = kit.body('introRocker'); rk.add(geo.box(1, 0.012, 0.006, 0.002), { color: SEM.output, sw: 'paint', pos: [0.5, 0, 0] });
    const rocker = rk.build(); rocker.position.z = Z0 + 0.018; g.add(rocker);
    const arcGeo = new THREE.BufferGeometry(); arcGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(64 * 3), 3));
    const arc = new THREE.Line(arcGeo, new THREE.LineBasicMaterial({ color: '#3B3631' })); g.add(arc);
    S.intro = { g, rocker, arc, t: 0 };
    piston.visible = cyl.visible = false;
    sfx.whoosh();
  }
  function updateIntro(dt) {
    const I = S.intro; I.t += dt;
    const k = Math.min(1, I.t / 3);
    const L = 0.09 * Math.pow(12, Math.min(1, k / 0.85));                 // 搖桿長度 9 cm → 108 cm
    S.theta += dt * 2.2;
    const Ax = CX + R2 * Math.sin(S.theta), Ay = CY + R2 * Math.cos(S.theta);
    const yMid = CY + Math.sqrt(R3 * R3 - R2 * R2);
    const O4 = new THREE.Vector2(CX + L, yMid);                            // 搖桿軸在右方 L 處,端點經過汽缸軸
    // B:以 O4 為圓心、半徑 L 的圓,與以 A 為圓心、半徑 R3 的圓的交點(取上方)
    const dx = O4.x - Ax, dy = O4.y - Ay, d = Math.hypot(dx, dy);
    const a = (R3 * R3 - L * L + d * d) / (2 * d), h = Math.sqrt(Math.max(0, R3 * R3 - a * a));
    const px = Ax + a * dx / d, py = Ay + a * dy / d;
    const B = new THREE.Vector2(px - h * dy / d, py + h * dx / d);
    rod.position.set(Ax, Ay, rod.position.z); rod.rotation.z = Math.atan2(B.y - Ay, B.x - Ax);
    crank.rotation.z = -S.theta;
    I.rocker.position.set(B.x, B.y, Z0 + 0.018); I.rocker.scale.x = Math.min(L, 0.42); I.rocker.rotation.z = Math.atan2(O4.y - B.y, O4.x - B.x);
    const p = I.arc.geometry.attributes.position.array;
    for (let i = 0; i < 64; i++) { const t = (i / 63 - 0.5) * 0.16 / L; p.set([O4.x - L * Math.cos(t), O4.y + L * Math.sin(t), Z0 + 0.02], i * 3); }
    I.arc.geometry.attributes.position.needsUpdate = true;
    _m.makeTranslation(Ax, Ay, Z0 + 0.011); pins.setMatrixAt(0, _m); _m.makeTranslation(B.x, B.y, Z0 + 0.011); pins.setMatrixAt(1, _m); pins.instanceMatrix.needsUpdate = true;
    if (k > 0.85) { I.rocker.visible = false; piston.visible = cyl.visible = true; I.arc.material.opacity = 1 - (k - 0.85) / 0.15; I.arc.material.transparent = true; }
    S.lastMove = performance.now();
    if (k >= 1) {                                                          // 結束:移除過場物件(含背板),開始講解
      root.remove(I.g);
      I.g.traverse(o => { o.geometry?.dispose(); if (o.material && o.material !== kit.material) o.material.dispose(); });
      S.intro = null; S.omega = 0; S.theta = 0.35;
    }
  }

  let prevNear = false;
  pose();
  return {
    root, defaultStage: 0, stages: ['引擎'],
    setAdvanced() {},
    update(dt) {
      if (S.intro) { updateIntro(dt); return; }
      if (!S.held) {
        const before = S.theta;
        S.omega -= (T.friction * S.omega + T.drag * Math.sign(S.omega)) * dt;
        if (Math.abs(S.omega) < 0.05) S.omega = 0;
        S.theta += S.omega * dt;
        if (S.omega !== 0) S.lastMove = performance.now();
        // 連續運轉圈數:低於門檻就歸零
        if (Math.abs(S.omega) >= T.runOmega) S.runRevs += Math.abs(S.theta - before) / (2 * Math.PI); else S.runRevs = 0;
      } else { S.runRevs = 0; S.handOmega *= Math.exp(-dt * 6); }
      const s = pose();
      // 死點:曲柄與連桿排成一直線(θ = 0° 或 180°)→ 震動最強 + 汽缸邊框亮起 + 悶響
      const a = norm180(S.theta), dist = Math.min(Math.abs(a), Math.abs(Math.abs(a) - 180));
      const near = dist <= T.deadTol;
      if (near && !prevNear && S.held) { sfx.deadCenter(); ctx.feel('deadCenter'); }
      if (S.held && dist < 20) ctx.feel('deadHum', 1 - dist / 20);
      prevNear = near;
      const deadGlow = near ? 0.55 * (1 - dist / T.deadTol) + 0.25 : 0;
      S.flash = Math.max(0, S.flash - dt * 2.2);
      const gk = Math.max(S.flash, deadGlow);
      glow.visible = gk > 0.01; glowMat.opacity = gk * 0.6;
      if (S.flash < 0.01 && near) glowMat.color.set('#DDE8F2');
      ign.update(dt);
      S.x = s.x;
    },
    moving: () => !!S.intro || performance.now() - S.lastMove < 150,
    values() {
      return { r2: T.crank, stroke: scStroke(T.crank, T.rod), theta: Math.round(((S.theta / DEG) % 360 + 360) % 360), x: +((S.x ?? 0.2) / CM).toFixed(1), rpm: Math.round(Math.abs(S.omega) * 60 / (2 * Math.PI)) };
    },
    snapshot: () => ({ theta: ((S.theta / DEG) % 360 + 360) % 360, omega: S.held ? S.handOmega : S.omega, runRevs: S.runRevs, caliper: S.caliper, caliperSet: S.caliperSet, stroke: scStroke(T.crank, T.rod) }),
    dispose() {},
    debug: { S, ignite },
  };
}
