// 關卡一 雨刷(四連桿):結構→機構→機器 三步,曲柄搖桿,葛氏判斷。
import * as THREE from 'three';
import {
  DEG, solve, grashofType, rockerLimits, minTransmissionAngle, WIPER_DEFAULT,
} from '../../kinematics/fourBar.js';
import { createCrank } from '../../assets/linkage/crank.js';
import { createCoupler } from '../../assets/linkage/coupler.js';
import { createRocker, createWiperArm } from '../../assets/linkage/rocker.js';
import { createFrame } from '../../assets/linkage/frame.js';
import { createPin, createHexBolt } from '../../assets/linkage/pin.js';
import { createWindshield } from '../../assets/props/windshield.js';
import { createCaliper } from '../../assets/props/caliper.js';
import { createProtractor } from '../../assets/props/protractor.js';
import { createBoltSet } from '../../assets/props/boltSet.js';
import { createPencil } from '../../assets/props/pencil.js';
import { createNotebook } from '../../assets/props/notebook.js';
import { createSpareGear } from '../../assets/props/spareGear.js';
import { createKnob } from '../../assets/controls/knob.js';
import { createLever } from '../../assets/controls/lever.js';
import { createTag } from '../../teach/tags.js';
import { createScroll } from '../../teach/scroll.js';
import { dimensionLine, angleArc, centerLine } from '../../modes/blueprint.js';
import { textPlane, T } from '../../teach/typeset.js';
import { sfx, motorStart, motorStop, motorSet } from '../../audio/sfx.js';
import { COLORS } from '../../materials/toon.js';

const MM = 0.0025; // 模型 mm → 場景 m

export async function createLevel(ctx) {
  const group = new THREE.Group();
  group.name = 'level-wiper';

  const S = {
    ...WIPER_DEFAULT,       // r1, r2, r3, r4(模型 mm)
    theta2: 70 * DEG,
    omega: 0,
    stage: 0,               // 0 結構 / 1 機構 / 2 機器
    motorOn: false,
    revolutions: 0,
    lastTheta: 70 * DEG,
    coverage: 0,
    jamT: 0,
  };

  // ── 機構群(XY 直立面,O2 在左原點)──
  const mech = new THREE.Group();
  const PIVOT_Y = 0.13;
  mech.position.set(-(S.r1 * MM) / 2, PIVOT_Y, -0.06);
  group.add(mech);

  const frame = createFrame(S.r1 * MM + 0.12, 0.085, 0.05, 140);
  frame.position.set((S.r1 * MM) / 2, -0.012, -0.032);
  mech.add(frame);
  // 機架支柱
  const legFrame = createFrame(0.07, PIVOT_Y - 0.03, 0.05, 0);
  legFrame.position.set((S.r1 * MM) / 2, -(PIVOT_Y) / 2 - 0.028, -0.032);
  mech.add(legFrame);

  const crank = createCrank(S.r2 * MM);
  const coupler = createCoupler(S.r3 * MM);
  const rocker = createRocker(S.r4 * MM);
  const wiperArm = createWiperArm(0.15, 0.1);
  mech.add(crank, coupler, rocker, wiperArm);
  rocker.position.x = S.r1 * MM;
  wiperArm.position.x = S.r1 * MM;
  // 桿件分層避免穿模
  crank.position.z = 0.012;
  coupler.position.z = 0.022;
  rocker.position.z = 0.012;
  wiperArm.position.z = 0.03;

  // 銷釘(4 處)與鎖死螺栓(結構 stage)
  const pins = [], bolts = [];
  for (let i = 0; i < 4; i++) {
    const p = createPin();
    p.position.z = 0.03;
    const b = createHexBolt();
    b.position.z = 0.03;
    b.visible = false;
    mech.add(p, b);
    pins.push(p); bolts.push(b);
  }

  // 擋風玻璃(傾斜 15°,在機構後上方)
  const windshield = createWindshield(0.42, 0.26);
  // 玻璃置於搖桿軸 O4 上方(雨刷從玻璃下緣往上掃)
  windshield.position.set(S.r1 * MM - 0.06, 0.21, -0.065);
  windshield.rotation.x = -0.26;
  const GLASS_PIVOT = { x: 0.06, y: -0.21 }; // O4 在玻璃局部座標的位置
  mech.add(windshield);

  // ── 道具 ──
  const props = new THREE.Group();
  group.add(props);
  const notebook = createNotebook(); notebook.position.set(-0.3, 0, 0.08);
  const protractor = createProtractor(); protractor.position.set(-0.12, 0.004, 0.16); protractor.rotation.x = -Math.PI / 2 + 0.26;
  const caliper = createCaliper(); caliper.position.set(0.14, 0.004, 0.1); caliper.rotation.x = -Math.PI / 2; caliper.rotation.z = -0.3;
  const pencil = createPencil(); pencil.position.set(0.3, 0, 0.06); pencil.rotation.y = 0.5;
  const spare = createSpareGear(); spare.position.set(-0.33, 0, 0.18);
  const boltsProp = createBoltSet(); boltsProp.position.set(0.3, 0, -0.1);
  props.add(notebook, protractor, caliper, pencil, spare, boltsProp);

  // ── 控制物件:連桿/搖桿長度旋鈕、馬達開關 ──
  const knobCoupler = createKnob({
    label: '連桿', value: S.r3, min: 26, max: 146, step: 10,
    onChange: (v) => { S.r3 = v; rebuild(); },
  });
  knobCoupler.position.set(0.12, 0, 0.22);
  const knobRocker = createKnob({
    label: '搖桿', value: S.r4, min: 26, max: 136, step: 10,
    onChange: (v) => { S.r4 = v; rebuild(); },
  });
  knobRocker.position.set(0.24, 0, 0.22);
  const motorLever = createLever({
    label: '馬達', positions: ['關', '開'], index: 0,
    onChange: (i) => { setMotor(i === 1); },
  });
  motorLever.position.set(0.37, 0, 0.1);
  motorLever.rotation.y = -Math.PI / 2;
  group.add(knobCoupler, knobRocker, motorLever);

  // 電線(馬達 → 側邊開關)
  const wirePts = [
    new THREE.Vector3(-0.16 + S.r2 * MM * 0, PIVOT_Y - 0.02, -0.05),
    new THREE.Vector3(0.1, 0.03, 0.02),
    new THREE.Vector3(0.35, 0.02, 0.1),
  ];
  const wire = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(wirePts), 20, 0.0022, 6),
    new THREE.MeshToonMaterial({ color: '#6B655C' }),
  );
  group.add(wire);

  // ── 曲柄抓取契約 ──
  crank.userData.getMesh().userData.grabbable = mkCrankGrab();
  crank.userData.handle.userData.grabbable = mkCrankGrab();
  function mkCrankGrab() {
    return {
      type: 'rotary',
      pivot: crank,
      onGrab: () => sfx.grab(),
      onRotate: (d) => {
        if (S.stage === 0) {
          // 結構:推不動 → 輕微震動 + 喀
          jamFeedback(0.4);
          return;
        }
        tryRotate(d);
      },
    };
  }

  // ── 代號標籤 ──
  const tags = new THREE.Group();
  group.add(tags);
  const arcHighlight = new THREE.Group();
  mech.add(arcHighlight);
  const tagTheta = createTag({
    symbol: [{ t: 'θ', sub: '2', color: COLORS.input }],
    plain: '曲柄現在轉到的角度',
    getValue: () => `${Math.round(((S.theta2 / DEG) % 360 + 360) % 360)}°`,
    onFlip: (on) => drawThetaArc(on),
  });
  tagTheta.position.set(-0.24, 0.05, 0.14);
  const tagMu = createTag({
    symbol: [{ t: 'μ', color: '#7A5A3A' }],
    plain: '連桿與搖桿的夾角(傳動角)',
    getValue: () => {
      const s = solve(S.r1, S.r2, S.r3, S.r4, S.theta2);
      return s.ok ? `${Math.round(s.mu / DEG)}°` : '卡住';
    },
  });
  tagMu.position.set(0.3, 0.05, 0.14);
  tags.add(tagTheta, tagMu);
  function drawThetaArc(on) {
    arcHighlight.clear();
    if (!on) return;
    const arc = angleArc(new THREE.Vector3(0, 0, 0.035), 0.05, 0, S.theta2, { color: '#E2A14E' });
    arcHighlight.add(arc);
  }

  // ── 卷軸 ──
  const fmtG = () => {
    const ls = [S.r1, S.r2, S.r3, S.r4].sort((a, b) => a - b);
    return { s: ls[0], l: ls[3], p: ls[1], q: ls[2] };
  };
  const typeName = () => ({
    'crank-rocker': '曲柄搖桿', 'double-crank': '雙曲柄',
    'double-rocker': '雙搖桿(葛氏)', 'rocker-crank': '搖桿曲柄', 'triple-rocker': '參搖桿',
  }[grashofType(S.r1, S.r2, S.r3, S.r4).type]);
  const scroll = createScroll({
    getPages: () => {
      const g = fmtG();
      const ok = g.s + g.l <= g.p + g.q;
      const lim = rockerLimits(S.r1, S.r2, S.r3, S.r4);
      const swing = lim ? Math.round(lim.swing / DEG) : '—';
      return [
        {
          title: T('結構.機構.機器'),
          plain: T('鎖死不能動=結構;能動而且動法固定=機構'),
          formula: T('機構 + 動力(馬達)= 機器'),
          subst: T('試試三個步驟:推推看、轉轉看、開馬達'),
          result: T('雨刷機構把「轉圈」變成「來回擺」'),
        },
        {
          title: T('葛氏判斷'),
          plain: T('最短+最長 不超過 另外兩根相加,曲柄就能轉整圈'),
          formula: [{ t: '最短 + 最長 ≤ 另外兩根相加' }],
          subst: [{ t: `${g.s} + ${g.l} = ${g.s + g.l}`, color: COLORS.input }, { t: ` 比較 ${g.p} + ${g.q} = ${g.p + g.q}` }],
          result: [{ t: ok ? `${g.s + g.l} ≤ ${g.p + g.q},是葛氏:` : `${g.s + g.l} > ${g.p + g.q},不是葛氏:`, color: ok ? '#4A7A52' : '#A0522D' }, { t: typeName() }],
        },
        {
          title: T('擺動角度'),
          plain: T('拿量角器讀讀看,雨刷擺過幾度'),
          formula: T('擺角 = 最大角 − 最小角'),
          subst: lim ? [{ t: `${Math.round(lim.theta41 / DEG)}° 到 ${Math.round(lim.theta42 / DEG)}°` }] : T('目前卡住,轉不完整圈'),
          result: [{ t: `擺角約 ${swing}°`, color: COLORS.output }],
        },
      ];
    },
    onStateChange: (s) => ctx.onScrollChange?.(s),
  });
  scroll.position.set(-0.28, 0, 0.26);
  group.add(scroll);
  ctx.registerScroll?.(scroll);

  // ── 藍圖 overlay ──
  const overlay = new THREE.Group();
  mech.add(overlay);
  buildOverlay();
  ctx.blueprint?.markOverlay(overlay);
  function buildOverlay() {
    overlay.clear();
    const z = 0.045;
    const O2 = new THREE.Vector3(0, 0, z);
    const O4 = new THREE.Vector3(S.r1 * MM, 0, z);
    overlay.add(centerLine(new THREE.Vector3(-0.06, 0, z), new THREE.Vector3(S.r1 * MM + 0.06, 0, z)));
    overlay.add(dimensionLine(O2, O4, { offset: -0.045 }));
    const lim = rockerLimits(S.r1, S.r2, S.r3, S.r4);
    if (lim) {
      overlay.add(angleArc(O4, 0.07, lim.theta41, lim.theta42, { color: '#9FC2E8' }));
    }
    const muMin = Math.round(minTransmissionAngle(S.r1, S.r2, S.r3, S.r4) / DEG);
    const g = fmtG();
    const panel = textPlane([
      { segments: [{ t: 'r', sub: '1', color: '#EAF2FF' }, { t: ' + ' }, { t: 'r', sub: '4' }, { t: ' = ' }, { t: 'r', sub: '2' }, { t: ' + ' }, { t: 'r', sub: '3' }, { t: '(向量封閉式)' }], size: 44 },
      { segments: [{ t: `a=${S.r2}  b=${S.r3}  c=${S.r4}  d=${S.r1}(mm)` }], size: 40 },
      {
        segments: [{ t: 'cos μ = ' }, {
          frac: {
            num: [{ t: 'b' }, { t: '2', sup: '' }, { t: '²+c²−d²(θ)' }],
            den: [{ t: '2bc' }],
          },
        }, { t: `  μ_min = ${muMin}°` }], size: 40,
      },
      { segments: [{ t: `Grashof:${g.s}+${g.l} ${g.s + g.l <= g.p + g.q ? '≤' : '>'} ${g.p}+${g.q} → ${typeName()}` }], size: 40 },
      {
        segments: lim
          ? [{ t: 'θ', sub: '41' }, { t: ` = ${Math.round(lim.theta41 / DEG)}°  ` }, { t: 'θ', sub: '42' }, { t: ` = ${Math.round(lim.theta42 / DEG)}°  ψ = ${Math.round(lim.swing / DEG)}°` }]
          : [{ t: '無法整圈組裝' }],
        size: 40,
      },
    ], 0.34, { width: 1200, baseSize: 44, pad: 40, defaultColor: '#EAF2FF' });
    panel.position.set(-0.16, 0.34, 0.12);
    overlay.add(panel);
    ctx.blueprint?.markOverlay(overlay);
  }

  // ── 機構求解與繪製 ──
  function tryRotate(d) {
    const nt = S.theta2 + d;
    const sol = solve(S.r1, S.r2, S.r3, S.r4, nt);
    if (sol.ok) {
      if (!solve(S.r1, S.r2, S.r3, S.r4, S.theta2).ok) {
        // 從卡住狀態恢復
      }
      // 圈數統計(跨 2π)
      const beforeRev = Math.floor(S.theta2 / (2 * Math.PI));
      const afterRev = Math.floor(nt / (2 * Math.PI));
      if (afterRev !== beforeRev) S.revolutions += Math.abs(afterRev - beforeRev);
      S.theta2 = nt;
      pose();
    } else {
      jamFeedback(1);
    }
  }
  function jamFeedback(strength) {
    if (S.jamT > 0) return;
    S.jamT = 0.2;
    sfx.jam();
    ctx.haptics?.pulse('both', 'jam');
    mech.position.x += (Math.random() - 0.5) * 0.002 * strength;
  }

  function pose() {
    const sol = solve(S.r1, S.r2, S.r3, S.r4, S.theta2);
    if (!sol.ok) return;
    crank.rotation.z = S.theta2;
    coupler.position.set(sol.A.x * MM, sol.A.y * MM, coupler.position.z);
    coupler.rotation.z = sol.theta3;
    rocker.rotation.z = sol.theta4;
    wiperArm.rotation.z = sol.theta4;
    // 銷釘跟隨:O2、A、B、O4
    const pts = [
      [0, 0], [sol.A.x * MM, sol.A.y * MM],
      [sol.B.x * MM, sol.B.y * MM], [S.r1 * MM, 0],
    ];
    pts.forEach((p, i) => {
      pins[i].position.set(p[0], p[1], 0.03);
      bolts[i].position.set(p[0], p[1], 0.03);
    });
    // 玻璃擦拭扇形
    updateWipe(sol);
  }

  let sweepMin = Infinity, sweepMax = -Infinity;
  function updateWipe(sol) {
    sweepMin = Math.min(sweepMin, sol.theta4);
    sweepMax = Math.max(sweepMax, sol.theta4);
    windshield.userData.setWipe(GLASS_PIVOT, 0.24, sweepMin, sweepMax);
    S.coverage = windshield.userData.coverage();
  }
  // 目標區(固定,虛線扇形)
  windshield.userData.setTarget(GLASS_PIVOT, 0.235, 62 * DEG, 148 * DEG);

  function rebuild() {
    coupler.userData.setLength(S.r3 * MM);
    rocker.userData.setLength(S.r4 * MM);
    sweepMin = Infinity; sweepMax = -Infinity;
    sfx.detent();
    ctx.haptics?.pulse('both', 'detent');
    // 若當前角不可解,收斂到可解角
    if (!solve(S.r1, S.r2, S.r3, S.r4, S.theta2).ok) {
      for (let a = 0; a < 360; a += 5) {
        if (solve(S.r1, S.r2, S.r3, S.r4, a * DEG).ok) { S.theta2 = a * DEG; break; }
      }
    }
    buildOverlay();
    pose();
  }

  function setMotor(on) {
    if (S.stage !== 2) {
      S.motorOn = false;
      motorLever.userData.setIndex(0, true);
      return;
    }
    S.motorOn = on;
    if (on) { motorStart(); } else { motorStop(); }
  }

  // ── stage ──
  function setStage(i) {
    S.stage = Math.min(2, Math.max(0, i));
    const structural = S.stage === 0;
    pins.forEach((p) => { p.visible = !structural; });
    bolts.forEach((b) => { b.visible = structural; });
    motorLever.visible = S.stage === 2;
    wire.visible = S.stage === 2;
    if (S.stage !== 2) setMotor(false);
  }

  // ── 更新 ──
  function update(dt) {
    if (S.jamT > 0) S.jamT -= dt;
    if (!ctx.isPaused?.()) {
      if (S.motorOn && S.stage === 2) {
        const sol = solve(S.r1, S.r2, S.r3, S.r4, S.theta2 + 1.4 * dt);
        if (sol.ok) {
          tryRotate(1.4 * dt); // ~13rpm,柔和
          motorSet(0.5, 0);
        } else {
          motorSet(0.2, 1); // 吃力
          jamFeedback(0.5);
        }
      }
    }
    tagTheta.userData.update(dt);
    tagMu.userData.update(dt);
    if (tagTheta.userData.isFlipped()) drawThetaArc(true);
    scroll.userData.update(dt);
    // 任務
    ctx.missions?.feed('wiper', {
      r1: S.r1, r2: S.r2, r3: S.r3, r4: S.r4,
      coverage: S.coverage, revolutions: S.revolutions, motorOn: S.motorOn,
    }, dt);
  }

  pose();
  setStage(0);

  return {
    group,
    update,
    setStage,
    dispose: () => { motorStop(); },
    scroll,
  };
}
