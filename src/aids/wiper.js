// 教具一 雨刷(四連桿,曲柄搖桿)。
// 機構在 XY 直立面上(面向學生 +Z)。O4(搖桿軸、雨刷臂軸)固定;O2(曲柄軸 + 馬達)在機架滑軌上,隨機架長 d 左右移動。
// 四根桿各一個旋鈕(1 cm 一格)。擋風玻璃先立在旁邊,學生把它插進雨刷前方的卡槽才開始刷。
import * as THREE from 'three';
import { getKit, geo, SEM, N, codePlate } from './kit.js';
import { createKnob } from './parts.js';
import {
  DEG, solve, classify, assemblable, rockerLimits, searchWiperDefault, TYPE_NAMES,
} from '../kinematics/fourBar.js';
import { THRESHOLDS } from '../teach/thresholds.js';
import { sfx, motorStart, motorStop, motorSet } from '../audio/sfx.js';

const T = THRESHOLDS.wiper;
const CM = 0.01;
const PIV = 0.135;          // 軸心高度(桌面上)
const O4X = 0.075;          // 搖桿軸 x
const Z0 = -0.09;           // 機構面(最後一層桿件)
const ZG = 0.02;            // 玻璃面
const ARM = 0.155, BLADE_IN = 0.06; // 雨刷臂長、刷片內緣
const GLASS = { narrow: { w: 0.25, h: 0.18 }, wide: { w: 0.34, h: 0.18 } };

// 預設尺寸:依條件搜尋;找不到就用提示詞給的備案
export const WIPER_DIMS = searchWiperDefault(T) ?? { ...T.fallback };
const LIM0 = rockerLimits(WIPER_DIMS.d, WIPER_DIMS.a, WIPER_DIMS.b, WIPER_DIMS.c);
/** 雨刷臂相對搖桿的安裝角:讓預設尺寸的擺動範圍置中在正上方。 */
export const ARM_OFFSET = 90 * DEG - (LIM0.theta41 + LIM0.theta42) / 2;

export async function createAid(ctx) {
  const kit = getKit();
  const root = new THREE.Group();
  const _q = new THREE.Quaternion();
  const S = {
    ...WIPER_DIMS, theta: 200 * DEG, stage: 1, motor: false,
    glass: null, sweep: null, motorUsed: false, lastMove: -1, jamT: 0, shake: 0,
  };

  // ---------------- 靜態機架(木塊、滑軌、卡槽、旋鈕底座)----------------
  const st = kit.body('wiperFrame');
  const railX0 = O4X - 0.215, railX1 = O4X + 0.035;
  st.add(geo.box(railX1 - railX0, 0.03, 0.022), { color: SEM.frame, sw: 'wood', pos: [(railX0 + railX1) / 2, PIV, Z0 - 0.03] });          // 滑軌木條
  st.add(geo.box(railX1 - railX0 - 0.02, 0.008, 0.006, 0.002), { color: N.black, sw: 'rubber', pos: [(railX0 + railX1) / 2, PIV, Z0 - 0.0185] }); // 滑槽
  for (const px of [railX0 + 0.03, O4X]) st.add(geo.box(0.034, PIV - 0.015, 0.03), { color: SEM.frame, sw: 'wood', pos: [px, (PIV - 0.015) / 2, Z0 - 0.03] });
  st.add(geo.box(0.36, 0.022, 0.12), { color: SEM.frame, sw: 'wood', pos: [O4X - 0.09, 0.011, Z0 - 0.02] });                             // 底座木塊
  // 卡槽:雨刷前方的木條(上面一道溝)+ 兩支立柱
  const slotY = PIV - 0.03, slotW = 0.42;
  st.add(geo.box(slotW, 0.012, 0.022), { color: SEM.frame, sw: 'wood', pos: [O4X, slotY - 0.006, ZG] });
  st.add(geo.box(slotW - 0.02, 0.003, 0.007, 0.001), { color: N.black, sw: 'rubber', pos: [O4X, slotY + 0.0003, ZG] });
  for (const sx of [-1, 1]) st.add(geo.box(0.018, slotY - 0.012, 0.022), { color: SEM.frame, sw: 'wood', pos: [O4X + sx * (slotW / 2 - 0.009), (slotY - 0.012) / 2, ZG] });
  // 搖桿軸承座 + 軸
  st.add(geo.cylZ(0.016, 0.02, 24), { color: N.steelDark, sw: 'steel', pos: [O4X, PIV, Z0 - 0.012] });
  st.add(geo.cylZ(0.0045, ZG - Z0 - 0.002, 16), { color: N.steel, sw: 'steel', pos: [O4X, PIV, (ZG + Z0) / 2 - 0.004] });
  // 代號銅牌:機架 d
  const pd = codePlate('d', 'white'); st.add(pd.geo, { ...pd, pos: [O4X - 0.17, PIV - 0.025, Z0 - 0.0185] });
  // 玻璃架(放還沒插上的玻璃)
  st.add(geo.box(0.1, 0.012, 0.2), { color: SEM.frame, sw: 'wood', pos: [0.325, 0.006, -0.02] });

  // 四個旋鈕(機架 d、曲柄 a、連桿 b、搖桿 c)
  const knobs = {};
  const knobDefs = [
    ['d', '機架', SEM.frame, 'white', -0.24], ['a', '曲柄', SEM.input, 'orange', -0.1],
    ['b', '連桿', SEM.coupler, 'yellow', 0.04], ['c', '搖桿', SEM.output, 'green', 0.18],
  ];
  for (const [k, label, color, chalk, x] of knobDefs) {
    knobs[k] = createKnob({
      label, symbol: k, chalk, color, value: S[k], min: T.ranges[k][0], max: T.ranges[k][1], ctx,
      canSet: v => { const D = { ...S, [k]: v }; return assemblable(D.d, D.a, D.b, D.c); },   // 裝不起來就卡住
      onChange: v => { S[k] = v; relink(); },
    }, st, [x, 0, 0.215]);
    root.add(knobs[k].group);
  }
  const frameMesh = st.build(); root.add(frameMesh);

  // ---------------- 會動的零件 ----------------
  const mech = new THREE.Group(); root.add(mech);
  // 曲柄滑座 + 馬達(跟著 O2 移動)
  const carriage = new THREE.Group(); mech.add(carriage);
  const cb = kit.body('carriage');
  cb.add(geo.box(0.05, 0.05, 0.026), { color: SEM.frame, sw: 'wood', pos: [0, 0, Z0 - 0.03] });
  cb.add(geo.cylZ(0.024, 0.05, 28), { color: SEM.input, sw: 'paint', pos: [0, 0, Z0 - 0.068] });          // 馬達(銅橘)
  cb.add(geo.cylZ(0.025, 0.006, 28), { color: N.steelDark, sw: 'steel', pos: [0, 0, Z0 - 0.042] });
  cb.add(geo.cylZ(0.016, 0.02, 24), { color: N.steelDark, sw: 'steel', pos: [0, 0, Z0 - 0.012] });
  carriage.add(cb.build());
  const motorHit = carriage.children[0];
  motorHit.userData.touchable = { onTouch: () => { if (S.stage === 2) setMotor(!S.motor); else { sfx.jam(); } } };

  const crank = new THREE.Group(), coupler = new THREE.Group(), rocker = new THREE.Group(), arm = new THREE.Group();
  carriage.add(crank);
  mech.add(coupler, rocker, arm);
  rocker.position.set(O4X, PIV, Z0 + 0.016);
  arm.position.set(O4X, PIV, ZG - 0.012);
  crank.position.z = Z0 + 0.0;
  coupler.position.z = Z0 + 0.008;
  let crankMesh, couplerMesh, rockerMesh;
  const plates = { a: codePlate('a', 'orange'), b: codePlate('b', 'yellow'), c: codePlate('c', 'green'), th: codePlate('θ', 'blue', { w: 0.026 }) };
  function buildLinks() {
    for (const m of [crankMesh, couplerMesh, rockerMesh]) if (m) { m.parent.remove(m); m.geometry.dispose(); }
    const W = 0.018, Tk = 0.006;
    const c1 = kit.body('crank');
    c1.add(geo.bar(S.a * CM, W + 0.002, Tk), { color: SEM.input, sw: 'paint' });
    c1.add(geo.cylZ(0.006, 0.03, 16), { color: SEM.input, sw: 'paint', pos: [S.a * CM, 0, 0.02] });           // 把手
    c1.add(geo.cylZ(0.008, 0.012, 20), { color: N.cream, sw: 'plain', pos: [S.a * CM, 0, 0.038] });
    c1.add(plates.a.geo, { ...plates.a, pos: [S.a * CM * 0.5, 0, 0.0035] });
    crankMesh = c1.build(); crank.add(crankMesh);
    crankMesh.userData.grabbable = crankGrab; crankMesh.userData.grabPoint = new THREE.Vector3(S.a * CM, 0, 0.03);
    const c2 = kit.body('coupler');
    c2.add(geo.bar(S.b * CM, W, Tk), { color: SEM.coupler, sw: 'paint' });
    c2.add(plates.b.geo, { ...plates.b, pos: [S.b * CM * 0.5, 0, 0.0035] });
    couplerMesh = c2.build(); coupler.add(couplerMesh);
    const c3 = kit.body('rocker');
    c3.add(geo.bar(S.c * CM, W, Tk), { color: SEM.output, sw: 'paint' });
    c3.add(plates.c.geo, { ...plates.c, pos: [S.c * CM * 0.5, 0, 0.0035] });
    rockerMesh = c3.build(); rocker.add(rockerMesh);
  }
  // 雨刷臂 + 刷片(綠 + 黑橡膠)
  const ab = kit.body('wiperArm');
  ab.add(geo.cylZ(0.011, 0.012, 24), { color: SEM.output, sw: 'paint' });
  ab.add(geo.box(ARM, 0.009, 0.006, 0.002), { color: SEM.output, sw: 'paint', pos: [ARM / 2, 0, 0] });
  ab.add(geo.box(ARM - BLADE_IN + 0.004, 0.006, 0.01, 0.002), { color: N.rubber, sw: 'rubber', pos: [(ARM + BLADE_IN) / 2, 0, 0.007] });
  arm.add(ab.build());
  // 銷(O2、A、B、O4)與結構步驟的鎖死螺栓(六角頭)
  const pinB = kit.body('pin');
  pinB.add(geo.cylZ(0.0058, 0.006, 18), { color: N.steel, sw: 'steel' });
  pinB.add(geo.cylZ(0.0035, 0.03, 12), { color: N.steel, sw: 'steel', pos: [0, 0, -0.012] });
  const pins = pinB.instanced(4); mech.add(pins);
  const boltB = kit.body('bolt');
  boltB.add(new THREE.CylinderGeometry(0.0085, 0.0085, 0.007, 6).rotateX(Math.PI / 2), { color: N.steelDark, sw: 'steel' });
  boltB.add(geo.cylZ(0.011, 0.0015, 20), { color: N.steel, sw: 'steel', pos: [0, 0, -0.004] });
  const bolts = boltB.instanced(4); bolts.visible = false; mech.add(bolts);
  // θ 銅牌:釘在滑座前面(曲柄角)
  const thb = kit.body('thetaPlate'); thb.add(plates.th.geo, { ...plates.th, pos: [0, -0.034, Z0 - 0.0165] });
  carriage.add(thb.build({ cast: false }));

  // ---------------- 擋風玻璃(兩片:一般、更寬)----------------
  const glasses = {};
  for (const kind of ['narrow', 'wide']) glasses[kind] = makeGlass(kind);
  function makeGlass(kind) {
    const { w, h } = GLASS[kind];
    const cvs = document.createElement('canvas'); cvs.width = 512; cvs.height = Math.round(512 * h / w);
    const tex = new THREE.CanvasTexture(cvs); tex.colorSpace = THREE.SRGBColorSpace;
    const shape = new THREE.Shape(); const r = 0.018;
    shape.moveTo(-w / 2 + r, 0); shape.lineTo(w / 2 - r, 0); shape.quadraticCurveTo(w / 2, 0, w / 2, r); shape.lineTo(w / 2, h - r);
    shape.quadraticCurveTo(w / 2, h, w / 2 - r, h); shape.lineTo(-w / 2 + r, h); shape.quadraticCurveTo(-w / 2, h, -w / 2, h - r);
    shape.lineTo(-w / 2, r); shape.quadraticCurveTo(-w / 2, 0, -w / 2 + r, 0);
    const g = new THREE.ShapeGeometry(shape, 8);
    // ShapeGeometry 的 uv = 座標,換成 0..1
    const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) + w / 2) / w, uv.getY(i) / h);
    const mat = new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.08, metalness: 0, side: THREE.DoubleSide, depthWrite: false, envMapIntensity: 1.2 });
    const mesh = new THREE.Mesh(g, mat); mesh.renderOrder = 3; mesh.name = `glass-${kind}`;
    // 水滴(固定亂數),目標區是一個環形扇形
    let seed = kind === 'wide' ? 77 : 13; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const drops = Array.from({ length: kind === 'wide' ? 260 : 190 }, () => ({ x: rnd(), y: rnd(), r: 3 + rnd() * 7, s: rnd() }));
    const target = kind === 'wide' ? T.glassWide : T.glassNarrow;
    const G = { kind, w, h, mesh, tex, cvs, drops, target, home: kind === 'narrow' ? new THREE.Vector3(0.3, 0.012, 0.0) : new THREE.Vector3(0.345, 0.012, -0.03), inSlot: false };
    G.draw = () => drawGlass(G);
    G.draw();
    mesh.userData.grabbable = {
      type: 'carry',
      onGrab: () => { G.dragging = true; if (G.inSlot) { G.inSlot = false; if (S.glass === kind) { S.glass = null; resetSweep(); } } },
      onMove: p => { const l = root.worldToLocal(p.clone()); mesh.position.set(l.x, Math.max(0.012, l.y - h / 2), l.z); mesh.rotation.set(0, 0, 0); S.lastMove = performance.now(); },
      onRelease: () => {
        G.dragging = false;
        const near = Math.hypot(mesh.position.x - O4X, mesh.position.z - ZG) < 0.13;
        if (near) insert(kind); else goHome(G);
      },
      onClick: () => (G.inSlot ? goHome(G) : insert(kind)),
    };
    mesh.userData.grabPoint = new THREE.Vector3(0, h * 0.5, 0);
    root.add(mesh);
    goHome(G, true);
    return G;
  }
  function goHome(G, instant) {
    G.inSlot = false; if (S.glass === G.kind) { S.glass = null; resetSweep(); }
    G.anim = { to: G.home.clone(), rot: new THREE.Euler(-0.28, -1.05, 0, 'YXZ'), t: instant ? 1 : 0, from: G.mesh.position.clone(), q0: G.mesh.quaternion.clone() };
    if (instant) applyAnim(G, 1);
  }
  function insert(kind, instant = false) {
    for (const k in glasses) if (k !== kind && glasses[k].inSlot) goHome(glasses[k]);
    const G = glasses[kind];
    G.inSlot = true; S.glass = kind; resetSweep();
    G.anim = { to: new THREE.Vector3(O4X, PIV - 0.03 + 0.0005, ZG), rot: new THREE.Euler(0, 0, 0), t: 0, from: G.mesh.position.clone(), q0: G.mesh.quaternion.clone(), snap: true };
    if (instant) applyAnim(G, 1);
  }
  function applyAnim(G, k) {
    const a = G.anim, e = k * k * (3 - 2 * k);
    G.mesh.position.lerpVectors(a.from, a.to, e);
    if (!a.snap && k < 1) G.mesh.position.y += Math.sin(Math.PI * k) * 0.05;
    _q.setFromEuler(a.rot); G.mesh.quaternion.slerpQuaternions(a.q0, _q, e);
    if (k >= 1) { G.anim = null; if (a.snap) sfx.snap(); }
  }
  // 以擦過的角度範圍(環形扇形)畫出乾淨區域
  function drawGlass(G) {
    const g = G.cvs.getContext('2d'), W = G.cvs.width, H = G.cvs.height, px = W / G.w;
    g.clearRect(0, 0, W, H);
    g.fillStyle = 'rgba(210,226,232,0.16)'; g.fillRect(0, 0, W, H);
    const pivot = { x: W / 2, y: H - 0.03 * px };                    // O4 在玻璃下緣上方 3 cm
    const inWipe = (x, y) => {
      if (!G.inSlot || !S.sweep) return false;
      const dx = (x - pivot.x) / px, dy = (pivot.y - y) / px, r = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
      return r >= BLADE_IN - 0.004 && r <= ARM + 0.004 && a >= S.sweep[0] - 0.01 && a <= S.sweep[1] + 0.01;
    };
    for (const d of G.drops) {
      const x = d.x * W, y = d.y * H;
      if (inWipe(x, y)) continue;
      g.fillStyle = `rgba(232,242,246,${0.35 + d.s * 0.3})`; g.beginPath(); g.ellipse(x, y, d.r, d.r * 1.15, 0, 0, 7); g.fill();
      g.fillStyle = 'rgba(120,140,150,0.35)'; g.beginPath(); g.arc(x + d.r * 0.25, y + d.r * 0.35, d.r * 0.55, 0, 7); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.8)'; g.beginPath(); g.arc(x - d.r * 0.3, y - d.r * 0.35, d.r * 0.25, 0, 7); g.fill();
    }
    // 目標區的邊線(淡色虛線,不搶畫面)
    const [a0, a1] = G.target.map(v => v * DEG);
    g.strokeStyle = 'rgba(70,64,58,0.55)'; g.lineWidth = 2.5; g.setLineDash([9, 7]);
    g.beginPath(); g.arc(pivot.x, pivot.y, ARM * px, -a1, -a0); g.arc(pivot.x, pivot.y, BLADE_IN * px, -a0, -a1, true); g.closePath(); g.stroke();
    g.setLineDash([]);
    // 玻璃邊框的細白邊
    g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 4; g.strokeRect(2, 2, W - 4, H - 4);
    G.tex.needsUpdate = true;
  }
  function resetSweep() { S.sweep = null; S.motorUsed = S.motor; for (const k in glasses) glasses[k].draw?.(); }
  function coverage() {
    const G = S.glass && glasses[S.glass]; if (!G || !S.sweep) return 0;
    const [t0, t1] = G.target.map(v => v * DEG);
    return Math.max(0, Math.min(S.sweep[1], t1) - Math.max(S.sweep[0], t0)) / (t1 - t0);
  }

  // ---------------- 求解與擺姿 ----------------
  const _m4 = new THREE.Matrix4();
  let sol = null, armAngle = 0;
  function pose() {
    const O2x = O4X - S.d * CM;
    carriage.position.set(O2x, PIV, 0);
    crank.rotation.z = S.theta;
    sol = solve(S.d, S.a, S.b, S.c, S.theta);
    if (!sol.ok) return;
    coupler.position.set(O2x + sol.A.x * CM, PIV + sol.A.y * CM, Z0 + 0.008);
    coupler.rotation.z = sol.theta3;
    rocker.rotation.z = sol.theta4;
    armAngle = sol.theta4 + ARM_OFFSET;
    arm.rotation.z = armAngle;
    const P = [[O2x, PIV], [O2x + sol.A.x * CM, PIV + sol.A.y * CM], [O2x + sol.B.x * CM, PIV + sol.B.y * CM], [O4X, PIV]];
    const Z = [Z0 + 0.004, Z0 + 0.012, Z0 + 0.02, Z0 + 0.02];
    P.forEach(([x, y], i) => { _m4.makeTranslation(x, y, Z[i] + 0.002); pins.setMatrixAt(i, _m4); bolts.setMatrixAt(i, _m4); });
    pins.instanceMatrix.needsUpdate = bolts.instanceMatrix.needsUpdate = true;
    // 擦拭範圍(只在玻璃插好時累積)
    if (S.glass && glasses[S.glass].inSlot && !glasses[S.glass].anim) {
      const a = Math.atan2(Math.sin(armAngle), Math.cos(armAngle));
      const prev = S.sweep ? S.sweep.slice() : null;
      S.sweep = S.sweep ? [Math.min(S.sweep[0], a), Math.max(S.sweep[1], a)] : [a, a];
      if (!prev || Math.abs(prev[0] - S.sweep[0]) > 0.006 || Math.abs(prev[1] - S.sweep[1]) > 0.006) glasses[S.glass].draw();
    }
  }
  const okConfig = (theta) => {
    const s = solve(S.d, S.a, S.b, S.c, theta);
    if (!s.ok) return false;
    return Math.sin(s.mu) > T.singular;                 // 連桿與搖桿共線:卡住(變點、死點)
  };
  function rotateBy(d) {
    const steps = Math.ceil(Math.abs(d) / (2 * DEG)) || 1, inc = d / steps;
    for (let i = 0; i < steps; i++) {
      if (!okConfig(S.theta + inc)) { jam(); break; }
      S.theta += inc;
    }
    S.lastMove = performance.now();
    pose();
  }
  function jam() {
    if (S.jamT > 0) return;
    S.jamT = 0.22; S.shake = 0.2;
    sfx.jam(); ctx.feel('jam');
  }
  /** 改長度後:重建桿件;目前角度裝不起來就找最近可組裝的角度。 */
  function relink() {
    buildLinks();
    if (!okConfig(S.theta)) {
      for (let k = 1; k <= 180; k++) { if (okConfig(S.theta + k * DEG)) { S.theta += k * DEG; break; } if (okConfig(S.theta - k * DEG)) { S.theta -= k * DEG; break; } }
    }
    resetSweep(); pose();
    S.lastMove = performance.now();
  }

  // ---------------- 互動:曲柄把手 ----------------
  const crankGrab = {
    type: 'rotary', pivot: crank,
    onRotate: d => {
      if (S.stage === 0) { jam(); return; }        // 結構:螺栓鎖死,推不動
      if (S.motor) return;
      rotateBy(d);
    },
  };
  function setMotor(on) {
    S.motor = on && S.stage === 2;
    if (S.motor) { motorStart(); S.motorUsed = true; } else motorStop();
  }

  // ---------------- 藍圖:尺寸標註線 ----------------
  const dimGeo = new THREE.BufferGeometry(); dimGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(3 * 2 * 80), 3));
  const dims = new THREE.LineSegments(dimGeo, new THREE.LineBasicMaterial({ color: '#EAF2FF', transparent: true, opacity: 0, depthTest: false }));
  dims.renderOrder = 5; dims.frustumCulled = false; dims.visible = false; root.add(dims);
  function updateDims() {
    if (!dims.visible || !sol?.ok) return;
    const p = dimGeo.attributes.position.array; let n = 0;
    const seg = (x1, y1, x2, y2, z = ZG + 0.004) => { p.set([x1, y1, z, x2, y2, z], n * 6); n++; };
    const dimLine = (x1, y1, x2, y2, off) => {
      const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1, nx = -dy / L * off, ny = dx / L * off;
      seg(x1, y1, x1 + nx * 1.2, y1 + ny * 1.2); seg(x2, y2, x2 + nx * 1.2, y2 + ny * 1.2);
      seg(x1 + nx, y1 + ny, x2 + nx, y2 + ny);
      const ax = dx / L * 0.008, ay = dy / L * 0.008, px = -ay * 0.5, py = ax * 0.5;
      seg(x1 + nx, y1 + ny, x1 + nx + ax + px, y1 + ny + ay + py); seg(x1 + nx, y1 + ny, x1 + nx + ax - px, y1 + ny + ay - py);
      seg(x2 + nx, y2 + ny, x2 + nx - ax + px, y2 + ny - ay + py); seg(x2 + nx, y2 + ny, x2 + nx - ax - px, y2 + ny - ay - py);
    };
    const O2x = O4X - S.d * CM, A = [O2x + sol.A.x * CM, PIV + sol.A.y * CM], B = [O2x + sol.B.x * CM, PIV + sol.B.y * CM];
    dimLine(O2x, PIV, O4X, PIV, -0.045);
    dimLine(O2x, PIV, A[0], A[1], 0.018); dimLine(A[0], A[1], B[0], B[1], 0.018); dimLine(O4X, PIV, B[0], B[1], -0.018);
    seg(O2x - 0.03, PIV, O4X + 0.06, PIV);                         // 水平中心線
    const lim = rockerLimits(S.d, S.a, S.b, S.c);                  // 擺動角弧
    if (lim) {
      const r = 0.05, a0 = Math.min(lim.theta41, lim.theta42), a1 = Math.max(lim.theta41, lim.theta42);
      for (let i = 0; i < 16; i++) { const t0 = a0 + (a1 - a0) * i / 16, t1 = a0 + (a1 - a0) * (i + 1) / 16; seg(O4X + r * Math.cos(t0), PIV + r * Math.sin(t0), O4X + r * Math.cos(t1), PIV + r * Math.sin(t1)); }
    }
    const r2 = 0.03; for (let i = 0; i < 12; i++) { const t0 = S.theta * i / 12, t1 = S.theta * (i + 1) / 12; seg(O2x + r2 * Math.cos(t0), PIV + r2 * Math.sin(t0), O2x + r2 * Math.cos(t1), PIV + r2 * Math.sin(t1)); }
    for (let i = n; i < 80; i++) p.fill(0, i * 6, i * 6 + 6);
    dimGeo.attributes.position.needsUpdate = true;
  }

  buildLinks(); pose();
  if (!okConfig(S.theta)) relink();

  return {
    root, defaultStage: 1,
    stages: ['結構', '機構', '機器'],
    setStage(i) {
      S.stage = Math.max(0, Math.min(2, i));
      pins.visible = S.stage !== 0; bolts.visible = S.stage === 0;
      setMotor(S.stage === 2);
    },
    setAdvanced(on) { dims.visible = on; dims.material.opacity = on ? 0.95 : 0; for (const k in glasses) glasses[k].mesh.material.opacity = on ? 0.55 : 1; },
    update(dt) {
      if (S.jamT > 0) S.jamT -= dt;
      if (S.shake > 0) { S.shake -= dt; mech.position.x = Math.sin(S.shake * 120) * 0.0015 * (S.shake / 0.2); } else mech.position.x = 0;
      if (S.motor) {
        if (okConfig(S.theta + 1.3 * dt)) { rotateBy(1.3 * dt); motorSet(0.45, 0); } else { motorSet(0.15, 1); jam(); }
      }
      for (const k in glasses) {
        const G = glasses[k];
        if (G.anim) { G.anim.t = Math.min(1, G.anim.t + dt / 0.45); applyAnim(G, G.anim.t); S.lastMove = performance.now(); }
        // 更寬的玻璃:完成「手動刷乾淨」後才出現
        if (k === 'wide') G.mesh.visible = ctx.missionDone?.('wiper:hand-wipe') || G.inSlot || S.revealWide;
      }
      for (const k in knobs) knobs[k].update(dt);
      updateDims();
    },
    moving: () => performance.now() - S.lastMove < 120 || S.motor,
    values() {
      const g = classify(S.d, S.a, S.b, S.c);
      const lim = g.type === 'crank-rocker' ? rockerLimits(S.d, S.a, S.b, S.c) : null;
      return {
        s: g.s, l: g.l, p: g.p, q: g.q, ok: g.s + g.l <= g.p + g.q ? '✔' : '✘', type: TYPE_NAMES[g.type],
        swing: lim ? Math.round(lim.swing / DEG) : '–',
        d: S.d, a: S.a, b: S.b, c: S.c, theta: Math.round(((S.theta / DEG) % 360 + 360) % 360),
      };
    },
    snapshot: () => ({ d: S.d, a: S.a, b: S.b, c: S.c, glass: S.glass, coverage: coverage(), byHand: !S.motorUsed }),
    dispose() { motorStop(); },
    // 測試掛鉤
    debug: { S, glasses, insert, rotateBy, knobs, revealWide: () => (S.revealWide = true), coverage, setDims: o => { Object.assign(S, o); for (const k in knobs) knobs[k].set(S[k]); relink(); } },
  };
}
