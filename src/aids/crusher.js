// 彩蛋 壓罐機(肘節)。直立式:上連桿從頂端固定樞軸 O 往下到膝點 K,下連桿從 K 接到壓板(沿垂直導軌滑動)。
// 握把(銅橘)和上連桿鎖在一起;往下壓握把,β(連桿和垂直線的夾角)變小,壓板往下。
// 放大倍率 = 槓桿比 ÷ (2 tan β)。只有 β ≤ 門檻(約 6°)時倍率才夠,鐵罐才會被壓扁;沒到門檻放手,罐子彈回原狀。
// 越過中心(β < 0)會「喀」一聲鎖住,放手也不會彈開。
import * as THREE from 'three';
import { getKit, geo, SEM, N, codePlate } from './kit.js';
import { THRESHOLDS } from '../teach/thresholds.js';
import { sfx } from '../audio/sfx.js';

const T = THRESHOLDS.crusher;
const DEG = Math.PI / 180;
const L = 0.1;                       // 上、下連桿長
const OX = -0.06, Z0 = -0.05;
const BASE_TOP = 0.03, GAP0 = 0.075; // β = 0 時壓板底到底座的距離
const OY = BASE_TOP + GAP0 + 2 * L;  // 頂端樞軸高度
const HANDLE = T.lever * L;          // 握把長 = 槓桿比 × 連桿長
const HANDLE_OFF = 70 * DEG;         // 握把相對上連桿的安裝角
const CAN_H = 0.1, CAN_R = 0.029;
/** 放大倍率(含槓桿比);β ≤ 0 時已鎖住。 */
export const gainAt = beta => (beta > 0 ? T.lever / (2 * Math.tan(beta)) : Infinity);
export const NEED = gainAt(T.crushBeta * DEG);

export async function createAid(ctx) {
  const kit = getKit();
  const root = new THREE.Group();
  const S = { beta: T.beta0 * DEG, held: false, locked: false, crushed: 0, lastMove: 0, shake: 0, slot: null };

  // ---------------- 靜態:底座、立柱、頂端樞軸座、導軌、砧板 ----------------
  const st = kit.body('crusherFrame');
  st.add(geo.box(0.4, BASE_TOP, 0.18), { color: SEM.frame, sw: 'wood', pos: [0.05, BASE_TOP / 2, Z0] });
  st.add(geo.box(0.05, OY + 0.03 - BASE_TOP, 0.04), { color: SEM.frame, sw: 'wood', pos: [OX - 0.075, (OY + 0.03 + BASE_TOP) / 2, Z0 - 0.045] });
  st.add(geo.box(0.12, 0.03, 0.04), { color: SEM.frame, sw: 'wood', pos: [OX - 0.035, OY + 0.015, Z0 - 0.045] });
  st.add(geo.box(0.03, 0.03, 0.05), { color: SEM.frame, sw: 'wood', pos: [OX, OY, Z0 - 0.02] });
  // 壓板導軌(兩根鋼柱)
  for (const sx of [-1, 1]) st.add(geo.cylY(0.005, OY - BASE_TOP - 0.02, 12), { color: N.steel, sw: 'steel', pos: [OX + sx * 0.05, (OY + BASE_TOP) / 2 - 0.01, Z0 - 0.02] });
  st.add(geo.box(0.12, 0.008, 0.06), { color: N.steelDark, sw: 'steel', pos: [OX, OY - 0.022, Z0 - 0.02] });
  st.add(geo.cylY(0.042, 0.006, 32), { color: N.steelDark, sw: 'steel', pos: [OX, BASE_TOP + 0.003, Z0] });                   // 砧板
  // 越過中心的止擋
  st.add(geo.box(0.012, 0.012, 0.012), { color: N.black, sw: 'rubber', pos: [OX - 0.02, OY - L - 0.01, Z0 - 0.02] });
  // 鐵罐的放置架與壓扁後的收集盤
  st.add(geo.box(0.2, 0.008, 0.075), { color: N.steelDark, sw: 'steel', pos: [0.15, BASE_TOP + 0.004, Z0 + 0.02] });
  st.add(geo.box(0.09, 0.006, 0.09), { color: N.steelDark, sw: 'steel', pos: [OX - 0.13, 0.003, 0.17] });
  const pb = codePlate('β', 'blue', { w: 0.026 }); st.add(pb.geo, { ...pb, pos: [OX - 0.035, OY + 0.015, Z0 - 0.024] });
  root.add(st.build());

  // ---------------- 會動的零件 ----------------
  const upper = new THREE.Group(); upper.position.set(OX, OY, Z0); root.add(upper);
  const ub = kit.body('upperLink');
  ub.add(geo.bar(L, 0.02, 0.008), { color: SEM.coupler, sw: 'paint' });
  ub.add(geo.bar(HANDLE, 0.018, 0.008), { color: SEM.input, sw: 'paint', rot: [0, 0, HANDLE_OFF], pos: [0, 0, 0.009] });           // 握把(銅橘)
  ub.add(geo.cylZ(0.011, 0.012, 20), { color: SEM.input, sw: 'paint', pos: [0, 0, 0.009] });
  ub.add(geo.cylZ(0.011, 0.07, 20), { color: N.rubber, sw: 'rubber', pos: [HANDLE * Math.cos(HANDLE_OFF), HANDLE * Math.sin(HANDLE_OFF), 0.04] });   // 握把套
  const upperMesh = ub.build(); upper.add(upperMesh);
  upperMesh.userData.grabPoint = new THREE.Vector3(HANDLE * Math.cos(HANDLE_OFF), HANDLE * Math.sin(HANDLE_OFF), 0.04);
  const lower = new THREE.Group(); lower.position.z = Z0 - 0.012; root.add(lower);
  const lb = kit.body('lowerLink'); lb.add(geo.bar(L, 0.02, 0.008), { color: SEM.coupler, sw: 'paint' });
  const pY = codePlate('L', 'yellow', { w: 0.022 }); lb.add(pY.geo, { ...pY, pos: [L * 0.5, 0, 0.0045] });
  lower.add(lb.build());
  const ram = new THREE.Group(); ram.position.set(OX, 0, Z0); root.add(ram);
  const rb = kit.body('ram');
  rb.add(geo.box(0.12, 0.014, 0.075), { color: SEM.output, sw: 'paint', pos: [0, -0.007, -0.0] });           // 壓板(綠)
  rb.add(geo.box(0.03, 0.03, 0.03), { color: SEM.output, sw: 'paint', pos: [0, 0.012, -0.012] });
  for (const sx of [-1, 1]) rb.add(geo.cylY(0.009, 0.02, 16), { color: N.steelDark, sw: 'steel', pos: [sx * 0.05, 0.0, -0.02] });
  ram.add(rb.build());
  const pinB = kit.body('pin'); pinB.add(geo.cylZ(0.0065, 0.04, 16), { color: N.steel, sw: 'steel' });
  const pins = pinB.instanced(3); root.add(pins);

  // ---------------- 三個鐵罐 ----------------
  const crumple = (() => { // 壓扁後的形狀:高度變矮、側面皺摺
    const g = new THREE.CylinderGeometry(CAN_R, CAN_R, CAN_H, 28, 10).toNonIndexed();
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(z, x), yy = y / CAN_H + 0.5;
      const fold = Math.sin(yy * Math.PI * 4 + a * 3) * 0.005 * Math.sin(yy * Math.PI), k = 1 + fold / CAN_R + 0.18 * Math.sin(yy * Math.PI);
      p.setXYZ(i, x * k, (y + CAN_H / 2) * 0.3 - CAN_H / 2 + 0.0, z * k);
    }
    g.computeVertexNormals(); return g;
  })();
  const cans = [0, 1, 2].map(i => {
    const g = new THREE.Group();
    const b1 = kit.body(`can${i}`);
    b1.add(geo.cylY(CAN_R, CAN_H - 0.008, 28), { color: N.steel, sw: 'steel', pos: [0, CAN_H / 2, 0] });
    for (const y of [0.004, CAN_H - 0.004]) b1.add(geo.cylY(CAN_R * 0.94, 0.008, 28, CAN_R), { color: '#D6D9DB', sw: 'steel', pos: [0, y, 0], rot: y > 0.05 ? [Math.PI, 0, 0] : [0, 0, 0] });
    const whole = b1.build(); g.add(whole);
    const b2 = kit.body(`crushed${i}`); b2.add(crumple, { color: N.steel, sw: 'steel', pos: [0, CAN_H / 2 - 0.0, 0] });
    const flat = b2.build(); flat.visible = false; g.add(flat);
    const home = new THREE.Vector3(0.085 + i * 0.065, BASE_TOP + 0.008, Z0 + 0.02);
    g.position.copy(home); root.add(g);
    const can = { i, g, whole, flat, home, state: 'ready', anim: null };
    whole.userData.touchable = { onTouch: () => placeCan(can) };
    whole.userData.grabbable = { type: 'carry', onMove: p => { if (can.state !== 'ready') return; const l = root.worldToLocal(p.clone()); g.position.set(l.x, Math.max(BASE_TOP + 0.008, l.y - CAN_H / 2), l.z); }, onRelease: () => { if (can.state !== 'ready') return; if (Math.hypot(g.position.x - OX, g.position.z - Z0) < 0.08) placeCan(can); else moveTo(can, can.home); }, onClick: () => placeCan(can) };
    return can;
  });
  function moveTo(can, to, after) { can.anim = { from: can.g.position.clone(), to: to.clone(), t: 0, after }; }
  function placeCan(can) {
    if (can.state !== 'ready') return;
    if (S.slot) { sfx.limit(); return; }
    if (gap() < CAN_H + 0.004) { sfx.limit(); return; }          // 壓板太低,放不進去
    can.state = 'slot'; S.slot = can;
    moveTo(can, new THREE.Vector3(OX, BASE_TOP + 0.006, Z0), () => sfx.snap());
  }

  // ---------------- 握把 ----------------
  upperMesh.userData.grabbable = {
    type: 'rotary', pivot: upper,
    onGrab: () => { S.held = true; },
    onRotate: d => {
      // 上連桿方向 φ = −90° + β(由 +X 量);往下壓 = 順時針 = β 變小
      const nb = THREE.MathUtils.clamp(S.beta + d, T.betaLock * DEG, T.beta0 * DEG);
      if (S.beta >= 0 && nb < 0) { sfx.lock(); ctx.feel('lock'); S.shake = 0.12; }   // 越過中心:喀
      if (S.beta < 0 && nb >= 0) sfx.release();
      S.beta = nb; S.locked = S.beta < 0; S.lastMove = performance.now();
    },
    onRelease: () => { S.held = false; },
  };
  const gap = () => OY - 2 * L * Math.cos(S.beta) - BASE_TOP - 0.006;     // 壓板底到砧板的距離

  const _m = new THREE.Matrix4();
  function pose() {
    upper.rotation.z = -Math.PI / 2 + S.beta;
    const K = new THREE.Vector2(OX + L * Math.sin(S.beta), OY - L * Math.cos(S.beta));
    const Py = OY - 2 * L * Math.cos(S.beta);
    lower.position.set(K.x, K.y, lower.position.z); lower.rotation.z = Math.atan2(Py - K.y, OX - K.x);
    ram.position.y = Py;
    [[OX, OY, Z0 + 0.0], [K.x, K.y, Z0 - 0.006], [OX, Py, Z0 - 0.012]].forEach(([x, y, z], i) => { _m.makeTranslation(x, y, z); pins.setMatrixAt(i, _m); });
    pins.instanceMatrix.needsUpdate = true;
  }

  pose();
  return {
    root, defaultStage: 0, stages: ['壓罐'],
    setAdvanced() {},
    update(dt) {
      // 沒過中心、沒抓住:回位彈簧把握把拉回張開
      if (!S.held && !S.locked && S.beta < T.beta0 * DEG) { S.beta = Math.min(T.beta0 * DEG, S.beta + dt * 1.6); S.lastMove = performance.now(); }
      pose();
      if (S.shake > 0) { S.shake -= dt; root.position.x = Math.sin(S.shake * 140) * 0.0015; } else root.position.x = 0;
      // 罐子:接觸後先彈性變形,倍率到門檻(β ≤ 6°)才壓扁(永久)
      const can = S.slot;
      if (can && can.state === 'slot' && !can.anim) {
        const gp = gap();
        if (gp < CAN_H) {
          if (S.beta <= T.crushBeta * DEG && S.beta > -1e-6 || (S.beta < 0)) {
            can.state = 'crushed'; S.crushed++;
            can.whole.visible = false; can.flat.visible = true; can.flat.scale.y = 1;
            sfx.crush(); ctx.feel('crush'); S.shake = 0.3;
          } else can.whole.scale.y = Math.max(0.6, gp / CAN_H);
        } else can.whole.scale.y = 1;
      }
      if (can && can.state === 'crushed' && gap() > CAN_H * 0.45 && !can.anim) {   // 壓扁的罐子在握把抬起後滑到收集盤
        S.slot = null; can.state = 'done';
        moveTo(can, new THREE.Vector3(OX - 0.15 + can.i * 0.018, 0.006 + can.i * 0.012, 0.17 - can.i * 0.01));
      }
      for (const c of cans) if (c.anim) {
        c.anim.t = Math.min(1, c.anim.t + dt / 0.4); const k = c.anim.t, e = k * k * (3 - 2 * k);
        c.g.position.lerpVectors(c.anim.from, c.anim.to, e); c.g.position.y += Math.sin(Math.PI * k) * 0.06;
        S.lastMove = performance.now();
        if (k >= 1) { const a = c.anim.after; c.anim = null; a?.(); }
      }
    },
    moving: () => performance.now() - S.lastMove < 150,
    values: () => ({
      gain: S.beta > 0 ? +gainAt(S.beta).toFixed(1) : '鎖住(很大)', need: +NEED.toFixed(1),
      beta: +(S.beta / DEG).toFixed(1), n: S.crushed,
    }),
    snapshot: () => ({ crushed: S.crushed, beta: S.beta / DEG, locked: S.locked }),
    dispose() { crumple.dispose(); },
    debug: { S, cans, placeCan, gap },
  };
}
