// 教具四 腳踏車傳動。踏板曲柄 + 前齒盤 34 / 50(銅橘)、鍊條(黃)、車架(深棕)、後齒輪 14 / 21 / 28 + 後輪(綠)。
// 整組架在可切換平路 / 爬坡的小坡道上。撥桿換檔;爬坡時齒數比 > 1.3 踏板就踩不動。
import * as THREE from 'three';
import { getKit, geo, SEM, N, codePlate } from './kit.js';
import { gearRatio } from '../kinematics/bicycle.js';
import { THRESHOLDS } from '../teach/thresholds.js';
import { sfx } from '../audio/sfx.js';

const T = THRESHOLDS.bike;
const PITCH = 0.0062;                         // 模型鍊條節距(公尺)
const rOf = z => (z * PITCH) / (2 * Math.PI);
const BB = new THREE.Vector2(0.1, 0.13), RA = new THREE.Vector2(-0.13, 0.13);
const Z0 = -0.03, TILT = 9 * Math.PI / 180;
const WHEEL_R = 0.115;

/** 外公切線的開口皮帶路徑:回傳一個函式 s → {x, y, ang}(s 為弧長) 與總長。 */
function chainPath(F, rf, R, rr) {
  const d = F.clone().sub(R), D = d.length(), base = Math.atan2(d.y, d.x);
  const phi = Math.acos((rf - rr) / D);       // 公切點相對連心線的角度
  // 上方切線:前齒盤 base+phi、後齒輪 base+phi;下方:base−phi
  const fTop = base + phi, fBot = base - phi;
  const segs = [];
  const P = (c, r, a) => new THREE.Vector2(c.x + r * Math.cos(a), c.y + r * Math.sin(a));
  // 1. 前齒盤上的弧(從上切點順時針繞到下切點,經過前方)
  segs.push({ type: 'arc', c: F, r: rf, a0: fTop, a1: fBot, dir: -1 });
  // 2. 下方直線:前 → 後
  segs.push({ type: 'line', p0: P(F, rf, fBot), p1: P(R, rr, fBot) });
  // 3. 後齒輪上的弧(從下切點繞到上切點,經過後方)
  segs.push({ type: 'arc', c: R, r: rr, a0: fBot, a1: fTop - 2 * Math.PI, dir: -1 });
  // 4. 上方直線:後 → 前
  segs.push({ type: 'line', p0: P(R, rr, fTop), p1: P(F, rf, fTop) });
  for (const s of segs) s.len = s.type === 'line' ? s.p0.distanceTo(s.p1) : Math.abs(((s.a0 - s.a1) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI)) * s.r;
  const total = segs.reduce((a, s) => a + s.len, 0);
  return {
    total,
    at(s) {
      s = ((s % total) + total) % total;
      for (const g of segs) {
        if (s > g.len) { s -= g.len; continue; }
        if (g.type === 'line') { const k = s / g.len; return { x: g.p0.x + (g.p1.x - g.p0.x) * k, y: g.p0.y + (g.p1.y - g.p0.y) * k, ang: Math.atan2(g.p1.y - g.p0.y, g.p1.x - g.p0.x) }; }
        const a = g.a0 - s / g.r;
        return { x: g.c.x + g.r * Math.cos(a), y: g.c.y + g.r * Math.sin(a), ang: a - Math.PI / 2 };
      }
      return { x: 0, y: 0, ang: 0 };
    },
  };
}

export async function createAid(ctx) {
  const kit = getKit();
  const root = new THREE.Group();
  const S = { front: 34, rear: 21, slope: 'flat', tilt: 0, pedal: 0, chainS: 0, wheel: 0, pedalRevs: 0, lastMove: 0, jamT: 0 };

  // ---------------- 底座(不動)+ 可傾斜的坡道 ----------------
  const st = kit.body('bikeBase');
  st.add(geo.box(0.5, 0.02, 0.2), { color: SEM.frame, sw: 'wood', pos: [-0.01, 0.01, Z0] });
  st.add(geo.cylZ(0.008, 0.2, 16), { color: N.steelDark, sw: 'steel', pos: [-0.25, 0.026, Z0] });         // 坡道鉸鏈
  // 撥桿座
  st.add(geo.box(0.12, 0.012, 0.06), { color: N.steelDark, sw: 'steel', pos: [0.2, 0.006, 0.17] });
  const pF = codePlate('前', 'orange', { w: 0.024, h: 0.016, px: 72 }), pR = codePlate('後', 'green', { w: 0.024, h: 0.016, px: 72 });
  st.add(pF.geo, { ...pF, pos: [0.17, 0.0125, 0.198], rot: [-Math.PI / 2, 0, 0] });
  st.add(pR.geo, { ...pR, pos: [0.23, 0.0125, 0.198], rot: [-Math.PI / 2, 0, 0] });
  // 平路 / 爬坡 切換座
  st.add(geo.box(0.07, 0.03, 0.04), { color: N.steelDark, sw: 'steel', pos: [-0.24, 0.015, 0.16] });
  root.add(st.build());
  const slopeBtn = kit.body('slopeBtn');
  const pS = codePlate('平路/爬坡', 'blue', { w: 0.06, h: 0.016, px: 176 });
  slopeBtn.add(geo.box(0.066, 0.006, 0.036, 0.002), { color: N.cream, sw: 'plain', pos: [0, 0.033, 0] });
  slopeBtn.add(pS.geo, { ...pS, pos: [0, 0.0365, 0], rot: [-Math.PI / 2, 0, 0] });
  const slopeMesh = slopeBtn.build(); slopeMesh.position.set(-0.24, 0, 0.16); root.add(slopeMesh);
  slopeMesh.userData.touchable = { onTouch: () => { S.slope = S.slope === 'flat' ? 'climb' : 'flat'; S.pedalRevs = 0; sfx.snap(); } };

  const tiltG = new THREE.Group(); tiltG.position.set(-0.25, 0.026, 0); root.add(tiltG);   // 繞左端鉸鏈抬起
  const inner = new THREE.Group(); inner.position.set(0.25, -0.026, 0); tiltG.add(inner);
  const fr = kit.body('bikeFrame');
  fr.add(geo.box(0.48, 0.012, 0.16), { color: N.cream, sw: 'plain', pos: [-0.01, 0.026, Z0] });                 // 坡道板(路面)
  fr.add(geo.box(0.46, 0.003, 0.03, 0.001), { color: N.black, sw: 'rubber', pos: [-0.01, 0.0335, Z0 + 0.0] });  // 路面上的胎痕帶
  // 車架(深棕):下叉(鍊條下方)、座管、上叉
  const tube = (a, b, r = 0.007, z = Z0 - 0.022) => {
    const d = new THREE.Vector2(b[0] - a[0], b[1] - a[1]), L = d.length();
    fr.add(geo.cylY(r, L, 14), { color: SEM.frame, sw: 'paint', pos: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, z], rot: [0, 0, Math.atan2(d.y, d.x) - Math.PI / 2] });
  };
  tube([BB.x, BB.y], [RA.x, RA.y]); tube([BB.x, BB.y], [BB.x - 0.04, BB.y + 0.15]); tube([RA.x, RA.y], [BB.x - 0.04, BB.y + 0.15]);
  tube([BB.x - 0.04, BB.y + 0.15], [BB.x + 0.12, BB.y + 0.16]); tube([BB.x + 0.12, BB.y + 0.16], [BB.x + 0.12, 0.04]);
  fr.add(geo.box(0.05, 0.012, 0.03), { color: SEM.frame, sw: 'paint', pos: [BB.x - 0.04, BB.y + 0.16, Z0 - 0.022] });       // 座墊座
  for (const [x, y] of [[BB.x, BB.y], [RA.x, RA.y]]) fr.add(geo.cylZ(0.012, 0.03, 20), { color: SEM.frame, sw: 'paint', pos: [x, y, Z0 - 0.022] });
  // 支架:把後輪架離路面一點,讓輪子可以轉(訓練台)
  fr.add(geo.box(0.02, RA.y - 0.035, 0.02), { color: N.steelDark, sw: 'steel', pos: [RA.x, (RA.y + 0.035) / 2, Z0 - 0.045] });
  fr.add(geo.box(0.02, 0.08, 0.02), { color: N.steelDark, sw: 'steel', pos: [BB.x + 0.12, 0.072, Z0 - 0.045] });
  inner.add(fr.build());

  // ---------------- 前齒盤 + 曲柄(銅橘)----------------
  const crank = new THREE.Group(); crank.position.set(BB.x, BB.y, Z0); inner.add(crank);
  const cb = kit.body('chainrings');
  cb.add(geo.gear(4.2, 50, 0.004, 0.006).clone().scale(rOf(50) / (4.2 * 50 / 2000), rOf(50) / (4.2 * 50 / 2000), 1), { color: SEM.input, sw: 'paint', pos: [0, 0, -0.004] });
  cb.add(geo.gear(4.2, 34, 0.004, 0.006).clone().scale(rOf(34) / (4.2 * 34 / 2000), rOf(34) / (4.2 * 34 / 2000), 1), { color: SEM.input, sw: 'paint', pos: [0, 0, 0.004] });
  cb.add(geo.bar(0.075, 0.016, 0.007), { color: SEM.input, sw: 'paint', pos: [0, 0, 0.012] });
  cb.add(geo.bar(0.075, 0.016, 0.007), { color: SEM.input, sw: 'paint', pos: [0, 0, -0.03], rot: [0, 0, Math.PI] });
  for (const [x, z] of [[0.075, 0.03], [-0.075, -0.048]]) cb.add(geo.box(0.03, 0.01, 0.026, 0.002), { color: N.black, sw: 'rubber', pos: [x, 0, z] });   // 踏板
  const pCh = codePlate('前齒盤', 'orange', { w: 0.04, h: 0.014, px: 128 });
  const crankMesh = cb.build(); crank.add(crankMesh);
  crankMesh.userData.grabPoint = new THREE.Vector3(0.075, 0, 0.03);
  // ---------------- 後齒輪 + 後輪(綠)----------------
  const wheel = new THREE.Group(); wheel.position.set(RA.x, RA.y, Z0); inner.add(wheel);
  const wb = kit.body('rearWheel');
  [14, 21, 28].forEach((z, i) => wb.add(geo.gear(4.2, z, 0.003, 0.004).clone().scale(rOf(z) / (4.2 * z / 2000), rOf(z) / (4.2 * z / 2000), 1), { color: SEM.output, sw: 'paint', pos: [0, 0, 0.006 - i * 0.005] }));
  wb.add(geo.torus(WHEEL_R - 0.008, 0.009, 64, 10), { color: N.rubber, sw: 'rubber', pos: [0, 0, -0.035] });    // 輪胎
  wb.add(geo.torus(WHEEL_R - 0.019, 0.004, 64, 6), { color: SEM.output, sw: 'paint', pos: [0, 0, -0.035] });   // 輪圈(綠)
  for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; wb.add(geo.cylY(0.0011, WHEEL_R - 0.024, 4), { color: N.steel, sw: 'steel', pos: [Math.cos(a) * (WHEEL_R - 0.024) / 2, Math.sin(a) * (WHEEL_R - 0.024) / 2, -0.035 + (i % 2 ? 0.006 : -0.006)], rot: [0, 0, a - Math.PI / 2] }); }
  wb.add(geo.cylZ(0.012, 0.05, 16), { color: N.steel, sw: 'steel', pos: [0, 0, -0.02] });
  wheel.add(wb.build());
  // 代號銅牌(釘在車架上,不轉)
  const plates = kit.body('bikePlates');
  plates.add(pCh.geo, { ...pCh, pos: [BB.x + 0.06, BB.y - 0.06, Z0 - 0.005] });
  const pRear = codePlate('後齒輪', 'green', { w: 0.04, h: 0.014, px: 128 });
  plates.add(pRear.geo, { ...pRear, pos: [RA.x + 0.07, RA.y + 0.035, Z0 - 0.007] });
  inner.add(plates.build({ cast: false }));

  // ---------------- 鍊條(黃,InstancedMesh)----------------
  const lb = kit.body('chainLink');
  lb.add(geo.box(PITCH * 1.25, 0.0042, 0.003, 0.0012), { color: SEM.coupler, sw: 'paint', pos: [0, 0, 0.0025] });
  lb.add(geo.box(PITCH * 1.25, 0.0042, 0.003, 0.0012), { color: SEM.coupler, sw: 'paint', pos: [0, 0, -0.0025] });
  lb.add(geo.cylZ(0.0016, 0.008, 6), { color: N.steel, sw: 'steel', pos: [PITCH / 2, 0, 0] });
  const MAXL = 160;
  const chain = lb.instanced(MAXL); inner.add(chain);
  let path = null;
  function rebuildChain() { path = chainPath(BB, rOf(S.front), RA, rOf(S.rear)); }
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _z = new THREE.Vector3(0, 0, 1), _p = new THREE.Vector3(), _one = new THREE.Vector3(1, 1, 1);
  function poseChain() {
    const n = Math.min(MAXL, Math.round(path.total / PITCH)), step = path.total / n;
    const zf = S.front === 34 ? 0.004 : -0.004, zr = 0.006 - [14, 21, 28].indexOf(S.rear) * 0.005;
    for (let i = 0; i < n; i++) {
      const q = path.at(S.chainS + i * step);
      const k = (q.x - RA.x) / (BB.x - RA.x);
      _p.set(q.x, q.y, Z0 + zr + (zf - zr) * THREE.MathUtils.clamp(k, 0, 1)); _q.setFromAxisAngle(_z, q.ang);
      chain.setMatrixAt(i, _m.compose(_p, _q, _one));
    }
    chain.count = n; chain.instanceMatrix.needsUpdate = true;
  }

  // ---------------- 撥桿(前 / 後變速)----------------
  function lever(x, chalk, color, onFlip) {
    const g = new THREE.Group(); g.position.set(x, 0.012, 0.17); root.add(g);
    const b = kit.body('lever'); b.add(geo.cylY(0.005, 0.05, 12), { color, sw: 'paint', pos: [0, 0.025, 0] }); b.add(geo.sphere(0.011, 14), { color: N.black, sw: 'rubber', pos: [0, 0.052, 0] });
    const m = b.build(); g.add(m);
    m.userData.touchable = { onTouch: () => { onFlip(); sfx.detent(); ctx.feel('detent'); kick = 0.25; } };
    let kick = 0;
    return { g, m, update(dt, idx, count) { if (kick > 0) kick -= dt; m.rotation.z = -0.5 + idx / Math.max(1, count - 1) * 1.0 + Math.sin(kick * 25) * 0.05; } };
  }
  const levF = lever(0.17, 'orange', SEM.input, () => { S.front = S.front === 34 ? 50 : 34; shifted(); });
  const levR = lever(0.23, 'green', SEM.output, () => { const R = T.rear, i = R.indexOf(S.rear); S.rear = R[(i + 1) % R.length]; shifted(); });
  function shifted() { rebuildChain(); poseChain(); S.pedalRevs = 0; S.lastMove = performance.now(); }

  // ---------------- 踩踏板 ----------------
  const ratio = () => gearRatio(S.front, S.rear);
  crankMesh.userData.grabbable = {
    type: 'rotary', pivot: crank,
    onRotate: d => {
      const fwd = -d;                                   // 順時針(由學生看)= 往前踩
      if (fwd > 0 && S.slope === 'climb' && ratio() > T.climbMaxRatio) { // 爬坡用高速檔:踩不動
        if (S.jamT <= 0) { S.jamT = 0.25; sfx.jam(); ctx.feel('jam'); }
        return;
      }
      pedal(fwd);
    },
  };
  function pedal(fwd) {
    S.pedal += fwd;
    if (fwd > 0) S.pedalRevs += fwd / (2 * Math.PI);
    S.chainS -= fwd * rOf(S.front);
    S.wheel += fwd * ratio();
    S.lastMove = performance.now();
  }

  rebuildChain();
  return {
    root, defaultStage: 0, stages: ['腳踏車'],
    setAdvanced() {},
    update(dt) {
      if (S.jamT > 0) { S.jamT -= dt; crank.position.x = BB.x + Math.sin(S.jamT * 100) * 0.0012; } else crank.position.x = BB.x;
      S.tilt = THREE.MathUtils.damp(S.tilt, S.slope === 'climb' ? TILT : 0, 5, dt);
      tiltG.rotation.z = S.tilt;
      crank.rotation.z = -S.pedal; wheel.rotation.z = -S.wheel;
      poseChain();
      levF.update(dt, S.front === 34 ? 0 : 1, 2); levR.update(dt, T.rear.indexOf(S.rear), 3);
    },
    moving: () => performance.now() - S.lastMove < 150 || Math.abs(S.tilt - (S.slope === 'climb' ? TILT : 0)) > 0.002,
    values: () => ({ front: S.front, rear: S.rear, ratio: +ratio().toFixed(2), dist: +(ratio() * T.circumference).toFixed(1) }),
    snapshot: () => ({ front: S.front, rear: S.rear, slope: S.slope, pedalRevs: S.pedalRevs }),
    debug: { S, pedal, shift: { front: () => levF.m.userData.touchable.onTouch(), rear: () => levR.m.userData.touchable.onTouch() } },
  };
}
