// 關卡二 曲柄滑塊(引擎):行程=2×曲柄長、死點、量行程。含 3 秒過場。
import * as THREE from 'three';
import {
  DEG, solve, stroke, limits, nearDeadCenter, transmissionAngle, muExtremes, ENGINE_DEFAULT,
} from '../../kinematics/sliderCrank.js';
import { createCrank } from '../../assets/linkage/crank.js';
import { createCoupler } from '../../assets/linkage/coupler.js';
import { createSlider } from '../../assets/linkage/slider.js';
import { createRail } from '../../assets/linkage/rail.js';
import { createFrame } from '../../assets/linkage/frame.js';
import { createPin } from '../../assets/linkage/pin.js';
import { createCaliper } from '../../assets/props/caliper.js';
import { createBoltSet } from '../../assets/props/boltSet.js';
import { createPencil } from '../../assets/props/pencil.js';
import { createNotebook } from '../../assets/props/notebook.js';
import { createOilCan } from '../../assets/props/oilCan.js';
import { createKnob } from '../../assets/controls/knob.js';
import { createTag } from '../../teach/tags.js';
import { createScroll } from '../../teach/scroll.js';
import { dimensionLine, centerLine, angleArc } from '../../modes/blueprint.js';
import { textPlane, T } from '../../teach/typeset.js';
import { rulerTexture } from '../../assets/geo.js';
import { toonMaterial, COLORS } from '../../materials/toon.js';
import { sfx } from '../../audio/sfx.js';

const MM = 0.0025;

export async function createLevel(ctx) {
  const group = new THREE.Group();
  group.name = 'level-sliderCrank';

  const S = {
    ...ENGINE_DEFAULT,  // r2=15, r3=50, e=0(模型 mm)
    theta2: 45 * DEG,
    omega: 0,
    revolutions: 0,
    playing: false,
    deadT: 0,
    intro: ctx.fromLevel === 'wiper' ? 3 : 0, // 過場秒數
  };
  const K = { r2: S.r2 * MM * 2.2, r3: S.r3 * MM * 2.2 }; // 放大繪製(視覺比例)
  const DRAW = 2.2 * MM;

  const mech = new THREE.Group();
  const PIVOT_Y = 0.12;
  mech.position.set(0.1, PIVOT_Y, -0.08);
  group.add(mech);

  // 機架
  const frame = createFrame(0.14, 0.09, 0.05, 0);
  frame.position.set(0, -0.03, -0.035);
  mech.add(frame);
  const base2 = createFrame(0.4, 0.05, 0.05, 0);
  base2.position.set(-0.15, -PIVOT_Y + 0.025, -0.035);
  mech.add(base2);

  // 曲柄 + 飛輪
  const crank = createCrank(S.r2 * DRAW, { withDisc: true });
  crank.position.z = 0.012;
  mech.add(crank);
  // 連桿
  const rod = createCoupler(S.r3 * DRAW);
  rod.position.z = 0.022;
  mech.add(rod);
  // 活塞 + 汽缸(在左側,滑動方向 −X)
  const piston = createSlider(0.02, 0.05);
  piston.position.z = 0.012;
  mech.add(piston);
  const rail = createRail(0.023, 0.15);
  rail.position.set(-(S.r3 * DRAW) - 0.0 + 0.02, 0, 0.012);
  mech.add(rail);

  // mm 刻度尺(汽缸旁)
  const ruler = new THREE.Mesh(
    new THREE.PlaneGeometry(0.14, 0.014),
    toonMaterial('#FFFFFF', { map: rulerTexture(56, 14) }),
  );
  ruler.position.set(rail.position.x, 0.035, 0.03);
  mech.add(ruler);

  // 銷釘
  const pinA = createPin(), pinB = createPin();
  pinA.position.z = 0.03; pinB.position.z = 0.03;
  mech.add(pinA, pinB);

  // ── 道具 ──
  const caliper = createCaliper(60, 0.002);
  caliper.position.set(0.18, 0.004, 0.14);
  caliper.rotation.x = -Math.PI / 2;
  caliper.rotation.z = -0.25;
  const notebook = createNotebook(); notebook.position.set(-0.3, 0, 0.1);
  const pencil = createPencil(); pencil.position.set(-0.18, 0, 0.18); pencil.rotation.y = -0.4;
  const oil = createOilCan(); oil.position.set(0.32, 0, -0.05);
  const boltsProp = createBoltSet(); boltsProp.position.set(0.3, 0, 0.12);
  group.add(caliper, notebook, pencil, oil, boltsProp);

  // 游標卡尺讀數 → 任務:滑爪由玩家拖
  let caliperReading = null;
  caliper.userData.slide.userData.grabbable = {
    type: 'slide',
    pivot: caliper,
    onSlide: (x) => {
      const mm = Math.round((x - 0.011) / 0.002);
      caliper.userData.setOpening(mm);
      caliperReading = mm / (DRAW / MM) * (1 / MM) * 0 + mm; // 讀數即模型 mm(尺按繪製比例標)
    },
    onGrab: () => sfx.grab(),
  };

  // 偏位旋鈕(藍圖模式才出現)
  const knobOffset = createKnob({
    label: '偏位', value: 0, min: 0, max: 20, step: 5,
    onChange: (v) => { S.e = v; buildOverlay(); },
  });
  knobOffset.position.set(0.3, 0, 0.24);
  knobOffset.visible = false;
  group.add(knobOffset);

  // ── 曲柄抓取 ──
  const grab = {
    type: 'rotary',
    pivot: crank,
    onGrab: () => sfx.grab(),
    onRotate: (d) => rotateBy(d),
  };
  crank.userData.getMesh().userData.grabbable = grab;
  crank.userData.handle.userData.grabbable = grab;

  function rotateBy(d) {
    const before = Math.floor(S.theta2 / (2 * Math.PI));
    S.theta2 += d;
    const after = Math.floor(S.theta2 / (2 * Math.PI));
    if (after !== before) S.revolutions += Math.abs(after - before);
    pose();
  }

  // ── 代號標籤 ──
  const tagTheta = createTag({
    symbol: [{ t: 'θ', color: COLORS.input }],
    plain: '曲柄角度(0° 和 180° 是死點)',
    getValue: () => `${Math.round(((S.theta2 / DEG) % 360 + 360) % 360)}°`,
  });
  tagTheta.position.set(-0.05, 0.05, 0.16);
  const tagS = createTag({
    symbol: [{ t: 's', color: COLORS.output }],
    plain: '行程 = 活塞來回的距離',
    getValue: () => `${stroke(S.r2, S.r3, S.e).toFixed(0)} mm`,
  });
  tagS.position.set(0.05, 0.05, 0.16);
  group.add(tagTheta, tagS);

  // ── 卷軸 ──
  const scroll = createScroll({
    getPages: () => [
      {
        title: T('行程'),
        plain: T('活塞來回的距離,是曲柄長的兩倍'),
        formula: [{ t: '行程 = 2 × 曲柄長' }],
        subst: [{ t: `= 2 × ${S.r2}`, color: COLORS.input }],
        result: [{ t: `= ${2 * S.r2} mm`, color: COLORS.output }],
      },
      {
        title: T('連桿歪多少'),
        plain: T('θ=90° 時,曲柄、連桿和導軌是直角三角形'),
        formula: [{ t: '對邊 ÷ 斜邊 = 曲柄長 ÷ 連桿長' }],
        subst: [{ t: `= ${S.r2} ÷ ${S.r3}` }],
        result: [{ t: `= ${(S.r2 / S.r3).toFixed(1)}(連桿最多歪這麼多)`, color: COLORS.coupler }],
      },
      {
        title: T('死點'),
        plain: T('曲柄和連桿排成一直線時,推活塞也轉不動曲柄'),
        formula: T('死點在 θ = 0° 和 180°'),
        subst: [{ t: `現在 θ = ${Math.round(((S.theta2 / DEG) % 360 + 360) % 360)}°` }],
        result: T('引擎靠飛輪的慣性衝過死點'),
      },
    ],
    onStateChange: (s) => ctx.onScrollChange?.(s),
  });
  scroll.position.set(-0.28, 0, 0.26);
  group.add(scroll);
  ctx.registerScroll?.(scroll);

  // ── 藍圖 overlay ──
  const overlay = new THREE.Group();
  mech.add(overlay);
  function buildOverlay() {
    overlay.clear();
    const z = 0.05;
    const { xMax, xMin } = limits(S.r2, S.r3, S.e);
    overlay.add(centerLine(new THREE.Vector3(0.06, 0, z), new THREE.Vector3(-(xMax * DRAW) - 0.06, 0, z)));
    overlay.add(dimensionLine(
      new THREE.Vector3(-xMin * DRAW, 0.05, z), new THREE.Vector3(-xMax * DRAW, 0.05, z), { offset: 0.02 },
    ));
    overlay.add(angleArc(new THREE.Vector3(0, 0, z), 0.035, 0, S.theta2));
    const me = muExtremes(S.r2, S.r3, S.e);
    const sVal = stroke(S.r2, S.r3, S.e);
    const panel = textPlane([
      { segments: [{ t: 'x(θ) = r', sub: '2' }, { t: 'cosθ + ' }, { t: '√(r', sub: '3' }, { t: '² − (r', sub: '2' }, { t: 'sinθ − e)²)' }], size: 42 },
      {
        segments: [{ t: 's = √((r', sub: '3' }, { t: '+r', sub: '2' }, { t: ')² − e²) − √((r', sub: '3' }, { t: '−r', sub: '2' }, { t: ')² − e²)' }],
        size: 40,
      },
      { segments: [{ t: `e = ${S.e} mm → s = ${sVal.toFixed(2)} mm` }], size: 42 },
      { segments: [{ t: `μ_min = ${(me.muMin / DEG).toFixed(1)}°(θ=270°)  μ_max = ${(me.muMax / DEG).toFixed(1)}°(θ=90°)` }], size: 40 },
    ], 0.34, { width: 1200, baseSize: 44, pad: 40, defaultColor: '#EAF2FF' });
    panel.position.set(-0.1, 0.28, 0.1);
    overlay.add(panel);
    ctx.blueprint?.markOverlay(overlay);
  }
  buildOverlay();

  // ── 位姿 ──
  function pose() {
    const sol = solve(S.r2, S.r3, S.theta2, S.e);
    if (!sol.ok) return;
    crank.rotation.z = S.theta2 + Math.PI; // 滑塊在 −X 側
    const ax = -sol.A.x * DRAW, ay = -sol.A.y * DRAW; // 鏡像到 −X
    const bx = -sol.x * DRAW;
    rod.position.set(ax, ay, rod.position.z);
    rod.rotation.z = Math.atan2(-S.e * DRAW - ay, bx - ax);
    rod.userData.setLength(Math.hypot(bx - ax, -S.e * DRAW - ay)); // 長度固定,保險同步
    piston.position.set(bx, -S.e * DRAW, piston.position.z);
    pinA.position.set(ax, ay, 0.03);
    pinB.position.set(bx, -S.e * DRAW, 0.03);
  }

  function setStage() { /* 本關單一 stage */ }

  function update(dt) {
    // 過場:雨刷搖桿變長 → 直線(以文字化動畫簡化:汽缸淡入 + 連桿從弧形軌跡掃入)
    if (S.intro > 0) {
      S.intro -= dt;
      const k = 1 - Math.max(0, S.intro / 3);
      mech.scale.setScalar(0.9 + 0.1 * k);
      mech.rotation.z = (1 - k) * 0.15;
    }
    if (!ctx.isPaused?.() && S.playing) {
      rotateBy(1.6 * dt);
    }
    // 死點偵測 → 最強震動
    const near = nearDeadCenter(S.r2, S.r3, S.theta2, S.e);
    if (near && S.deadT <= 0) {
      sfx.deadCenter();
      ctx.haptics?.pulse('both', 'deadCenter');
      S.deadT = 0.6;
    }
    if (S.deadT > 0) S.deadT -= dt;

    tagTheta.userData.update(dt);
    tagS.userData.update(dt);
    scroll.userData.update(dt);
    knobOffset.visible = !!ctx.blueprint?.isOn;

    ctx.missions?.feed('sliderCrank', {
      r2: S.r2, r3: S.r3, e: S.e,
      theta2: S.theta2, omega: S.playing ? 1.6 : 0,
      revolutions: S.revolutions,
      caliperMm: caliperReading,
    }, dt);
  }

  // 播放/暫停由全域鍵控制
  function setPlaying(on) { S.playing = on; }

  pose();
  return { group, update, setStage, setPlaying, dispose: () => {}, scroll };
}
