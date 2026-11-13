// 關卡三 齒輪基礎(主線:減速):弧長相等 → 角度與半徑成反比;力矩;取捨。
import * as THREE from 'three';
import { centerDistance, speedRatio, torqueRatio } from '../../kinematics/gears.js';
import { createGear, MM } from '../../assets/gears/gear.js';
import { createPinion } from '../../assets/gears/pinion.js';
import { createFrame } from '../../assets/linkage/frame.js';
import { createWeightPulley } from '../../assets/props/weightPulley.js';
import { createFan } from '../../assets/props/fan.js';
import { createNotebook } from '../../assets/props/notebook.js';
import { createGearTray } from '../../assets/controls/gearTray.js';
import { createScaleBar } from '../../assets/controls/scaleBar.js';
import { createLever } from '../../assets/controls/lever.js';
import { createTag } from '../../teach/tags.js';
import { createScroll } from '../../teach/scroll.js';
import { angleArc } from '../../modes/blueprint.js';
import { textPlane, T } from '../../teach/typeset.js';
import { sfx, motorStart, motorStop, motorSet } from '../../audio/sfx.js';
import { COLORS } from '../../materials/toon.js';

const M = 2.2; // 模數(模型 mm)

export async function createLevel(ctx) {
  const group = new THREE.Group();
  group.name = 'level-gearBasics';

  const S = {
    zA: 10, zB: 40,     // A 主動(銅橘)、B 從動(綠)
    thetaA: 0,
    stage: 0,            // 0 問題 / 1 弧長 / 2 力矩 / 3 取捨
    motorOn: false,
    mode: 'weight',      // weight | fan
    lift: 0,
    lastToothA: 0,
    demo: null,          // null | 'friction' | 'idler'
    slipT: 0,
  };

  const mech = new THREE.Group();
  const AXIS_Y = 0.16;
  mech.position.set(0.06, AXIS_Y, -0.1);
  group.add(mech);

  // 齒輪座
  const stand = createFrame(0.34, 0.05, 0.05, 0);
  stand.position.set(-0.05, -AXIS_Y + 0.025, -0.02);
  mech.add(stand);
  const post1 = createFrame(0.05, AXIS_Y - 0.03, 0.04, 0);
  post1.position.set(0, -AXIS_Y / 2 - 0.01, -0.02);
  const post2 = createFrame(0.05, AXIS_Y - 0.03, 0.04, 0);
  mech.add(post1, post2);

  // 齒輪(動態重建)
  let gearA = null, gearB = null, idler = null;
  const holderA = new THREE.Group(); // 小齒輪 + 馬達(位置固定在右)
  const holderB = new THREE.Group();
  mech.add(holderA, holderB);

  // 滑輪 + 重物(掛 B 軸)
  const pulley = createWeightPulley({ travel: 0.24 });
  pulley.position.z = -0.03;
  holderB.add(pulley);
  // 風扇備品
  const fan = createFan();
  fan.visible = false;
  fan.position.z = 0.03;
  holderB.add(fan);
  const fanOnTable = createFan();
  fanOnTable.position.set(-0.32, 0.03, 0.12);
  fanOnTable.rotation.y = 0.6;
  group.add(fanOnTable);
  fanOnTable.children[0].userData = fanOnTable.children[0].userData || {};
  // 碰風扇 = 換模式
  fanOnTable.traverse((o) => {
    if (o.isMesh) {
      o.userData.touchable = {
        kind: 'swap-fan',
        onTouch: () => { setMode(S.mode === 'weight' ? 'fan' : 'weight'); sfx.button(); },
      };
    }
  });

  function rebuild() {
    for (const [holder, old] of [[holderA, gearA], [holderB, gearB]]) {
      if (old) { holder.remove(old); }
    }
    if (idler) { mech.remove(idler); idler = null; }
    gearA = createPinion({ m: M, z: S.zA, withMotor: true, withHandle: true });
    gearB = createGear({ m: M, z: S.zB, color: COLORS.output, thickness: 0.014, withHandle: false });
    const a = centerDistance(M, S.zA, S.zB) * MM;
    if (S.demo === 'idler') {
      // 惰輪示範:A — 惰輪(12 齒,灰)— B
      idler = createGear({ m: M, z: 12, color: COLORS.grey, thickness: 0.012 });
      const ai = centerDistance(M, S.zA, 12) * MM;
      const bi = centerDistance(M, 12, S.zB) * MM;
      holderA.position.set(ai + bi - a + a, 0, 0); // 排成一直線:B 在左,惰輪中間
      holderA.position.set(bi + ai, 0, 0);
      idler.position.set(bi, 0, 0);
      mech.add(idler);
      holderB.position.set(0, 0, 0);
    } else {
      holderA.position.set(a, 0, 0);
      holderB.position.set(0, 0, 0);
    }
    post2.position.set(holderA.position.x, -AXIS_Y / 2 - 0.01, -0.02);
    holderA.add(gearA);
    holderB.add(gearB);
    // 抓取:小齒輪把手
    const grab = {
      type: 'rotary',
      pivot: holderA,
      onGrab: () => sfx.grab(),
      onRotate: (d) => rotateBy(d),
    };
    gearA.userData.gear.userData.handle.userData.grabbable = grab;
    gearA.userData.gear.traverse((o) => { if (o.isMesh && !o.userData.grabbable) o.userData.grabbable = grab; });
    pose();
  }

  function rotateBy(d) {
    S.thetaA += d;
    // 過齒喀聲(每過一齒)
    const tooth = Math.floor((S.thetaA / (2 * Math.PI)) * S.zA);
    if (tooth !== S.lastToothA) {
      S.lastToothA = tooth;
      sfx.toothClick();
      ctx.haptics?.pulse('both', 'tooth');
    }
    pose();
  }

  function pose() {
    if (!gearA || !gearB) return;
    gearA.userData.gear.rotation.z = S.thetaA;
    if (S.demo === 'friction' && S.mode === 'weight') {
      // 摩擦輪:吃重就打滑 → B 不動,A 轉(滑移音效)
      if (S.slipT <= 0) { sfx.slip(); S.slipT = 0.5; }
      return;
    }
    let thetaB;
    if (S.demo === 'idler') {
      // A → 惰輪 → B:轉向改變一次(總共同向 ×(−1)²),快慢由 zA/zB 決定
      const thetaI = Math.PI + Math.PI / 12 - (S.zA / 12) * S.thetaA;
      idler.rotation.z = thetaI;
      thetaB = Math.PI + Math.PI / S.zB - (12 / S.zB) * thetaI;
    } else {
      thetaB = Math.PI + Math.PI / S.zB - (S.zA / S.zB) * S.thetaA;
    }
    gearB.rotation.z = thetaB;
    // 重物 / 風扇
    if (S.mode === 'weight') {
      const drumR = pulley.userData.drumRadius;
      const lift = (-thetaB) * drumR / 0.24;
      S.lift = Math.min(1, Math.max(0, lift));
      pulley.userData.setLift(S.lift);
    } else {
      fan.userData.blades.rotation.z = thetaB * 3;
    }
    updateArcs(thetaB);
  }

  // ── stage 教具 ──
  const arcsG = new THREE.Group();
  mech.add(arcsG);
  const forcesG = new THREE.Group();
  mech.add(forcesG);
  let arcStartA = 0, arcStartB = 0;
  function updateArcs(thetaB) {
    arcsG.visible = S.stage === 1;
    forcesG.visible = S.stage === 2;
    if (S.stage === 1) {
      arcsG.clear();
      const rA = (M * S.zA * MM) / 2, rB = (M * S.zB * MM) / 2;
      const dA = S.thetaA - arcStartA;
      const sweep = Math.min(Math.abs(dA), Math.PI * 1.6) * Math.sign(dA || 1);
      // A 弧(銅橘)與 B 弧(綠):等弧長 rA·ΔθA = rB·ΔθB
      const a1 = angleArc(new THREE.Vector3(holderA.position.x, 0, 0.03), rA, Math.PI - sweep, Math.PI, { color: '#C08054' });
      const sweepB = sweep * (S.zA / S.zB);
      const a2 = angleArc(new THREE.Vector3(0, 0, 0.03), rB, 0, sweepB, { color: '#75A17B' });
      arcsG.add(a1, a2);
    }
    if (S.stage === 2 && forcesG.children.length === 0) {
      // 接觸點等大反向力箭頭 + 半徑線(力臂)
      const rA = (M * S.zA * MM) / 2, rB = (M * S.zB * MM) / 2;
      const contact = new THREE.Vector3(rB, 0, 0.035);
      const mkArrow = (dir, color) => {
        const ar = new THREE.ArrowHelper(dir, contact, 0.05, color, 0.016, 0.01);
        return ar;
      };
      forcesG.add(mkArrow(new THREE.Vector3(0, 1, 0), '#C08054'));
      forcesG.add(mkArrow(new THREE.Vector3(0, -1, 0), '#75A17B'));
      const lineMat = new THREE.LineBasicMaterial({ color: '#7A5A3A' });
      const mkLine = (from, to) => new THREE.Line(new THREE.BufferGeometry().setFromPoints([from, to]), lineMat);
      forcesG.add(mkLine(new THREE.Vector3(0, 0, 0.035), contact));
      forcesG.add(mkLine(new THREE.Vector3(holderA.position.x, 0, 0.035), contact));
    }
    if (S.stage !== 2) forcesG.clear();
  }

  // ── 托盤 ──
  const tray = createGearTray({
    teethList: [10, 15, 20, 30, 40], m: M,
    color: COLORS.grey,
  });
  tray.position.set(0.04, 0, 0.24);
  group.add(tray);
  // 托盤齒輪抓取:放到軸附近自動吸附
  for (const slot of tray.userData.slots) {
    const g = slot.gear;
    g.userData.grabbable = {
      type: 'carry',
      onGrab: () => sfx.grab(),
      onMove: (worldPos) => { g.parent.worldToLocal(g.position.copy(worldPos)); },
      onRelease: (worldPos) => {
        // 靠近 B 軸 → 換 B;靠近 A 軸 → 換 A
        const pB = new THREE.Vector3();
        holderB.getWorldPosition(pB);
        const pA = new THREE.Vector3();
        holderA.getWorldPosition(pA);
        const z = g.userData.teeth;
        if (worldPos.distanceTo(pB) < 0.09) { S.zB = z; swapDone(); }
        else if (worldPos.distanceTo(pA) < 0.07) { S.zA = z; swapDone(); }
        g.position.copy(g.userData.home); // 歸位
        sfx.release();
      },
    };
  }
  function swapDone() {
    sfx.lock();
    ctx.haptics?.pulse('both', 'detent');
    rebuild();
    updateBars();
  }

  // ── 轉速 / 力矩 長條 ──
  const barSpeed = createScaleBar({ label: '轉速', color: '#C9A86A' });
  barSpeed.position.set(-0.36, 0, 0.02);
  barSpeed.rotation.y = 0.35;
  const barTorque = createScaleBar({ label: '力矩', color: '#9FA8AD' });
  barTorque.position.set(-0.27, 0, 0.12);
  barTorque.rotation.y = 0.35;
  group.add(barSpeed, barTorque);
  function updateBars() {
    // 以 zA/zB 正規化:轉速比 zA/zB ∈ [0.25, 4] → log 映射 0..1
    const sr = speedRatio(S.zA, S.zB);
    const t = (Math.log2(sr) + 2) / 4;
    barSpeed.userData.setValue(t);
    barTorque.userData.setValue(1 - t);
  }
  updateBars();

  // ── 馬達開關 ──
  const motorLever = createLever({
    label: '馬達', positions: ['關', '開'], index: 0,
    onChange: (i) => {
      S.motorOn = i === 1;
      if (S.motorOn) motorStart(); else motorStop();
    },
  });
  motorLever.position.set(0.33, 0, 0.18);
  group.add(motorLever);

  // 示範切換(老師控):摩擦輪 / 惰輪(demo 由 setStage 擴充碼觸發:stage 10/11)
  // 道具
  const notebook = createNotebook();
  notebook.position.set(-0.3, 0, 0.0);
  group.add(notebook);

  // ── 代號標籤 ──
  const tagZ = createTag({
    symbol: [{ t: 'z', color: COLORS.input }],
    plain: '齒數:A 主動、B 從動',
    getValue: () => `A=${S.zA} 齒,B=${S.zB} 齒`,
  });
  tagZ.position.set(-0.18, 0.05, 0.16);
  const tagTau = createTag({
    symbol: [{ t: 'τ', color: COLORS.output }],
    plain: '力矩放大倍數 = zB ÷ zA',
    getValue: () => `× ${(torqueRatio(S.zA, S.zB)).toFixed(2)}`,
  });
  tagTau.position.set(0.22, 0.05, 0.16);
  group.add(tagZ, tagTau);

  // ── 卷軸 ──
  const scroll = createScroll({
    getPages: () => {
      const rA = (M * S.zA) / 2, rB = (M * S.zB) / 2;
      const ratio = S.zB / S.zA;
      return [
        {
          title: T('走過一樣長'),
          plain: T('兩輪在接觸點走過的弧長一樣'),
          formula: [{ t: 'r', sub: 'A', color: COLORS.input }, { t: ' × θ' }, { t: '', sub: 'A' }, { t: ' = ' }, { t: 'r', sub: 'B', color: COLORS.output }, { t: ' × θ' }, { t: '', sub: 'B' }],
          subst: [{ t: `${rA} × θA = ${rB} × θB(mm)` }],
          result: [{ t: `A 轉 1 圈,B 轉 ${(S.zA / S.zB).toFixed(2)} 圈`, color: COLORS.output }],
        },
        {
          title: T('換成齒數'),
          plain: T('齒距相同,齒數和半徑成正比'),
          formula: [{ t: 'z', sub: 'A', color: COLORS.input }, { t: ' × θ', sub: 'A' }, { t: ' = ' }, { t: 'z', sub: 'B', color: COLORS.output }, { t: ' × θ', sub: 'B' }],
          subst: [{ t: `${S.zA} × θA = ${S.zB} × θB` }],
          result: [{ t: `轉速變 ${S.zA}/${S.zB} 倍` }],
        },
        {
          title: T('力矩'),
          plain: T('接觸點的力一樣大,力臂長的輪子力矩大'),
          formula: [{ t: 'τ = F × r,τ', sub: 'B' }, { t: ' ÷ τ', sub: 'A' }, { t: ' = z', sub: 'B' }, { t: ' ÷ z', sub: 'A' }],
          subst: [{ t: `= ${S.zB} ÷ ${S.zA}` }],
          result: [{ t: `力矩變 ${ratio.toFixed(2)} 倍`, color: COLORS.output }],
        },
        {
          title: T('取捨'),
          plain: T('轉速 × 力矩 兩邊相等(不計損失)'),
          formula: T('轉速變幾分之一,力矩就變幾倍'),
          subst: [{ t: `${S.zA} 齒帶 ${S.zB} 齒:轉速 × ${(S.zA / S.zB).toFixed(2)},力矩 × ${ratio.toFixed(2)}` }],
          result: T('要快就沒力,要力就得慢'),
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
  function buildOverlay() {
    overlay.clear();
    const a = centerDistance(M, S.zA, S.zB);
    const panel = textPlane([
      { segments: [{ t: `模數 m = ${M} mm` }], size: 42 },
      { segments: [{ t: `d = m×z:dA = ${M * S.zA},dB = ${M * S.zB} mm` }], size: 42 },
      { segments: [{ t: 'a = ' }, { frac: { num: [{ t: 'm(zA + zB)' }], den: [{ t: '2' }] } }, { t: ` = ${a} mm` }], size: 42 },
      { segments: [{ t: `ωB/ωA = zA/zB = ${(S.zA / S.zB).toFixed(3)};τAωA = τBωB` }], size: 40 },
      { segments: [{ t: 'v = r·ω(接觸點速度相同)' }], size: 40 }], 0.34,
      { width: 1200, baseSize: 44, pad: 40, defaultColor: '#EAF2FF' });
    panel.position.set(0.06, 0.26, 0.1);
    overlay.add(panel);
    ctx.blueprint?.markOverlay(overlay);
  }
  buildOverlay();

  // ── stage ──
  function setStage(i) {
    // 10 = 摩擦輪示範、11 = 惰輪示範(控場小示範)
    if (i === 10) { S.demo = 'friction'; rebuild(); return; }
    if (i === 11) { S.demo = 'idler'; rebuild(); return; }
    S.demo = null;
    S.stage = Math.min(3, Math.max(0, i));
    arcStartA = S.thetaA;
    if (S.stage === 0) {
      // 問題:馬達直接連重物,轉不動
      S.motorOn = false;
      motorLever.userData.setIndex(0, true);
    }
    rebuild();
  }

  function setMode(m) {
    S.mode = m;
    pulley.visible = m === 'weight';
    fan.visible = m === 'fan';
    pose();
  }

  function update(dt) {
    if (S.slipT > 0) S.slipT -= dt;
    if (!ctx.isPaused?.()) {
      if (S.stage === 0) {
        // 轉不動:馬達吃力聲 + 震動
        motorSet(0.05, 1);
        if (Math.random() < dt * 2) ctx.haptics?.pulse('both', 'jam');
      } else if (S.motorOn) {
        const strain = S.mode === 'weight' ? Math.max(0, 1 - torqueRatio(S.zA, S.zB) / 3) : 0;
        const canLift = S.mode !== 'weight' || torqueRatio(S.zA, S.zB) >= 2.99;
        if (canLift) rotateBy(2.2 * dt);
        motorSet(speedRatio(S.zA, S.zB) / 4 + 0.3, canLift ? strain : 1);
        if (!canLift && Math.random() < dt * 2) ctx.haptics?.pulse('both', 'jam');
      }
    }
    tagZ.userData.update(dt);
    tagTau.userData.update(dt);
    scroll.userData.update(dt);
    barSpeed.userData.update(dt);
    barTorque.userData.update(dt);
    ctx.missions?.feed('gearBasics', {
      zA: S.zA, zB: S.zB, mode: S.mode, lift: S.lift, motorOn: S.motorOn,
    }, dt);
  }

  rebuild();
  setStage(0);
  return {
    group, update, setStage,
    dispose: () => motorStop(),
    scroll,
  };
}
