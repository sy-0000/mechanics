// 關卡四 齒輪應用:站一 腳踏車 / 站二 時鐘 / 站三 減速機(電動螺絲起子)。
import * as THREE from 'three';
import {
  FRONT_TEETH, REAR_TEETH, gearRatio, distancePerPedalRev, wheelCircumference, canClimb,
} from '../../kinematics/bicycle.js';
import { GEAR_PAIRS, isCorrectClock, totalReduction, trainAngles, centerDistancesEqual } from '../../kinematics/clock.js';
import { createSprocket, sprocketRadius } from '../../assets/gears/sprocket.js';
import { createChain } from '../../assets/gears/chain.js';
import { createBikeWheel } from '../../assets/props/bikeWheel.js';
import { createRamp } from '../../assets/props/ramp.js';
import { createWaterBottle } from '../../assets/props/waterBottle.js';
import { createWrench } from '../../assets/props/wrench.js';
import { createClockMovement } from '../../assets/gears/clockMovement.js';
import { createHands } from '../../assets/gears/hands.js';
import { createWindKey } from '../../assets/props/windKey.js';
import { createMagnifier } from '../../assets/props/magnifier.js';
import { createGearbox } from '../../assets/gears/gearbox.js';
import { createGearTray } from '../../assets/controls/gearTray.js';
import { createLever } from '../../assets/controls/lever.js';
import { createButton } from '../../assets/controls/button.js';
import { createScaleBar } from '../../assets/controls/scaleBar.js';
import { createKnob } from '../../assets/controls/knob.js';
import { createPlaque } from '../../assets/controls/plaque.js';
import { createCrank } from '../../assets/linkage/crank.js';
import { createScroll } from '../../teach/scroll.js';
import { createTag } from '../../teach/tags.js';
import { textPlane, T } from '../../teach/typeset.js';
import { sfx, motorStart, motorStop, motorSet } from '../../audio/sfx.js';
import { backlashAngle } from '../../kinematics/gears.js';
import { COLORS } from '../../materials/toon.js';

const STATIONS = ['bike', 'clock', 'driver'];

export async function createLevel(ctx) {
  const group = new THREE.Group();
  group.name = 'level-gearApps';

  const S = {
    station: 'bike',
    // 腳踏車
    frontIdx: 0, rearIdx: 0, slope: 0, pedalAngle: 0, pedalRevs: 0,
    // 時鐘
    pair1: [15, 45], pair2: [12, 48], minuteAngle: 0, minuteTurns: 0,
    backlashT: 0, lastMinuteDir: 1, backlashKnob: 0,
    // 減速機
    driverOn: false, motorAngle: 0, screwDone: false,
  };

  // ════ 站一 腳踏車 ════
  const bike = new THREE.Group();
  bike.name = 'station-bike';
  group.add(bike);

  const ramp = createRamp(0.55, 0.14);
  ramp.position.set(0, 0.007, -0.08);
  bike.add(ramp);
  const onRamp = new THREE.Group(); // 車體(跟著坡道轉)
  onRamp.position.y = 0.014;
  ramp.add(onRamp);

  // 前齒盤 + 踏板曲柄(銅橘)
  const frontG = new THREE.Group();
  frontG.position.set(-0.1, 0.1, 0);
  onRamp.add(frontG);
  let frontSprocket = null;
  const pedal = createCrank(0.055, { withDisc: false, handleLength: 0.03 });
  pedal.position.z = 0.016;
  frontG.add(pedal);
  const pedal2 = createCrank(0.055, { withDisc: false, handleLength: 0.03 });
  pedal2.position.z = -0.016;
  pedal2.rotation.z = Math.PI;
  frontG.add(pedal2);

  // 後齒輪 + 後輪(綠)
  const rearG = new THREE.Group();
  rearG.position.set(0.14, 0.1, 0);
  onRamp.add(rearG);
  let rearSprocket = null;
  const wheel = createBikeWheel(0.082);
  wheel.position.z = -0.018;
  rearG.add(wheel);

  // 車架(深棕簡化三角)
  const frameMat = new THREE.MeshToonMaterial({ color: COLORS.frame });
  const frameGeo = new THREE.CylinderGeometry(0.004, 0.004, 0.25, 8);
  const frameBar = new THREE.Mesh(frameGeo, frameMat);
  frameBar.rotation.z = Math.PI / 2;
  frameBar.position.set(0.02, 0.1, -0.006);
  frameBar.castShadow = true;
  onRamp.add(frameBar);

  let chain = null;
  function rebuildDrivetrain() {
    const zf = FRONT_TEETH[S.frontIdx];
    const zr = REAR_TEETH[S.rearIdx];
    if (frontSprocket) frontG.remove(frontSprocket);
    if (rearSprocket) rearG.remove(rearSprocket);
    if (chain) onRamp.remove(chain);
    frontSprocket = createSprocket({ z: zf, color: COLORS.input });
    rearSprocket = createSprocket({ z: zr, color: COLORS.output });
    frontG.add(frontSprocket);
    rearG.add(rearSprocket);
    chain = createChain(
      { x: -0.1, y: 0.1 }, sprocketRadius(zf),
      { x: 0.14, y: 0.1 }, sprocketRadius(zr),
    );
    onRamp.add(chain);
    poseBike();
  }

  function poseBike() {
    const zf = FRONT_TEETH[S.frontIdx], zr = REAR_TEETH[S.rearIdx];
    frontG.rotation.z = 0;
    frontSprocket.rotation.z = -S.pedalAngle;
    pedal.rotation.z = -S.pedalAngle;
    pedal2.rotation.z = -S.pedalAngle + Math.PI;
    const wheelAngle = -S.pedalAngle * gearRatio(zf, zr);
    rearSprocket.rotation.z = wheelAngle;
    wheel.rotation.z = wheelAngle;
    chain?.userData.advance(0); // 版面由 advance 控
  }

  // 踏板抓取
  const pedalGrab = {
    type: 'rotary',
    pivot: frontG,
    onGrab: () => sfx.grab(),
    onRotate: (d) => {
      // 爬坡 + 檔位太重 → 踏不動
      if (S.slope === 1 && !canClimb(FRONT_TEETH[S.frontIdx], REAR_TEETH[S.rearIdx]) && d < 0) {
        sfx.jam();
        ctx.haptics?.pulse('both', 'jam');
        return;
      }
      const before = Math.floor(-S.pedalAngle / (2 * Math.PI));
      S.pedalAngle -= d; // 踏板向前踩 = 順時針
      const after = Math.floor(-S.pedalAngle / (2 * Math.PI));
      if (after > before) S.pedalRevs += after - before;
      chain?.userData.advance(-d * sprocketRadius(FRONT_TEETH[S.frontIdx]));
      poseBike();
    },
  };
  pedal.userData.handle.userData.grabbable = pedalGrab;
  pedal2.userData.handle.userData.grabbable = pedalGrab;

  // 變速撥桿 + 坡道撥桿
  const frontLever = createLever({
    label: '前變速', positions: FRONT_TEETH.map((t) => `${t}齒`), index: 0,
    onChange: (i) => { S.frontIdx = i; S.pedalRevs = 0; rebuildDrivetrain(); },
  });
  frontLever.position.set(0.1, 0, 0.2);
  const rearLever = createLever({
    label: '後變速', positions: REAR_TEETH.map((t) => `${t}齒`), index: 0,
    onChange: (i) => { S.rearIdx = i; S.pedalRevs = 0; rebuildDrivetrain(); },
  });
  rearLever.position.set(0.21, 0, 0.2);
  const slopeLever = createLever({
    label: '坡道', positions: ['平路', '爬坡'], index: 0,
    onChange: (i) => { S.slope = i; S.pedalRevs = 0; ramp.userData.setSlope(i); },
  });
  slopeLever.position.set(0.32, 0, 0.2);
  bike.add(frontLever, rearLever, slopeLever);

  const bottle = createWaterBottle(); bottle.position.set(-0.31, 0, 0.12);
  const wrench = createWrench(); wrench.position.set(-0.25, 0, 0.2); wrench.rotation.y = 0.8;
  bike.add(bottle, wrench);

  // ════ 站二 時鐘 ════
  const clock = new THREE.Group();
  clock.name = 'station-clock';
  group.add(clock);

  const movement = createClockMovement();
  movement.position.set(0, 0.2, -0.12);
  clock.add(movement);
  const hands = createHands();
  hands.group.position.set(0, 0.2, -0.12);
  clock.add(hands.group);
  movement.userData.setPairs(S.pair1, S.pair2);

  // 分針旋鈕把手(轉分針)
  const minuteKnob = createCrank(0.05, { withDisc: false, handleLength: 0.024 });
  minuteKnob.position.set(0, 0.2, -0.05);
  clock.add(minuteKnob);
  const minuteGrab = {
    type: 'rotary',
    pivot: minuteKnob,
    onGrab: () => sfx.grab(),
    onRotate: (d) => {
      const dir = Math.sign(d) || 1;
      if (dir !== S.lastMinuteDir) {
        // 反轉:背隙 → 指針先晃一下
        S.backlashT = backlashAngle(2, 48, 0.3 + S.backlashKnob * 2) * 8;
        S.lastMinuteDir = dir;
      }
      const before = Math.floor(Math.abs(S.minuteAngle) / (2 * Math.PI));
      S.minuteAngle += d;
      const after = Math.floor(Math.abs(S.minuteAngle) / (2 * Math.PI));
      if (after > before) S.minuteTurns += after - before;
      poseClock();
    },
  };
  minuteKnob.userData.handle.userData.grabbable = minuteGrab;

  function poseClock() {
    minuteKnob.rotation.z = S.minuteAngle;
    const ang = trainAngles(S.minuteAngle, S.pair1, S.pair2);
    movement.userData.setAngles(ang);
    const lag = S.backlashT > 0 ? Math.sin(S.backlashT * 30) * S.backlashT * 0.3 : 0;
    hands.minuteHand.rotation.z = -S.minuteAngle;
    hands.hourHand.rotation.z = -(ang.hour + lag);
  }

  // 時鐘托盤:五組齒輪對
  const clockTray = createGearTray({
    teethList: GEAR_PAIRS.map((p) => [...p]), m: 2.0, scale: 0.0018,
    color: COLORS.coupler, width: 0.4, depth: 0.1, displayScale: 0.4,
  });
  clockTray.position.set(0, 0, 0.2);
  clock.add(clockTray);
  // 齒輪對放置:兩個槽位(第一級 / 第二級)
  const slotPlaques = [];
  ['第一級', '第二級'].forEach((name, i) => {
    const p = createPlaque(name, { w: 0.06, h: 0.04, kind: 'clock-slot', id: i });
    p.position.set(-0.12 + i * 0.24, 0.03, 0.1);
    clock.add(p);
    slotPlaques.push(p);
    p.traverse((o) => {
      if (o.userData.touchable) {
        o.userData.touchable.onTouch = () => {
          // 碰槽位銘牌 = 把「最近抓起的齒輪對」裝入(簡化:循環選組)
        };
      }
    });
  });
  for (const slot of clockTray.userData.slots) {
    const gears = Array.isArray(slot.gear) ? slot.gear : [slot.gear];
    for (const g of gears) {
      g.userData.grabbable = {
        type: 'carry',
        onGrab: () => sfx.grab(),
        onMove: (worldPos) => { g.parent.worldToLocal(g.position.copy(worldPos)); },
        onRelease: (worldPos) => {
          const p1 = new THREE.Vector3();
          slotPlaques[0].getWorldPosition(p1);
          const p2 = new THREE.Vector3();
          slotPlaques[1].getWorldPosition(p2);
          const pair = slot.item;
          if (worldPos.distanceTo(p1) < 0.1) { S.pair1 = [...pair]; applyPairs(); }
          else if (worldPos.distanceTo(p2) < 0.1) { S.pair2 = [...pair]; applyPairs(); }
          g.position.copy(g.userData.home); // 歸位
          sfx.release();
        },
      };
    }
  }
  function applyPairs() {
    movement.userData.setPairs(S.pair1, S.pair2);
    S.minuteTurns = 0;
    sfx.lock();
    poseClock();
  }

  // 背隙旋鈕(藍圖才出現)
  const backlashKnob = createKnob({
    label: '背隙', value: 0, min: 0, max: 10, step: 2,
    onChange: (v) => { S.backlashKnob = v / 10; },
  });
  backlashKnob.position.set(0.3, 0, 0.24);
  backlashKnob.visible = false;
  clock.add(backlashKnob);

  const windKey = createWindKey(); windKey.position.set(-0.32, 0, 0.1);
  const magnifier = createMagnifier(); magnifier.position.set(0.28, 0, 0.1); magnifier.rotation.y = -0.5;
  clock.add(windKey, magnifier);

  // ════ 站三 減速機 ════
  const driver = new THREE.Group();
  driver.name = 'station-driver';
  group.add(driver);

  const gearbox = createGearbox();
  gearbox.position.set(0.02, 0.16, -0.08);
  driver.add(gearbox);

  const startBtn = createButton({
    label: '啟動', radius: 0.018, color: '#C9A86A',
    onPress: () => {
      S.driverOn = !S.driverOn;
      if (S.driverOn) motorStart(); else motorStop();
    },
  });
  startBtn.position.set(0.1, 0, 0.22);
  driver.add(startBtn);

  const barMotor = createScaleBar({ label: '馬達轉速', color: '#C9A86A' });
  barMotor.position.set(-0.36, 0, 0.02);
  barMotor.rotation.y = 0.35;
  const barOut = createScaleBar({ label: '輸出力矩', color: '#9FA8AD' });
  barOut.position.set(-0.27, 0, 0.12);
  barOut.rotation.y = 0.35;
  driver.add(barMotor, barOut);

  // ════ 站別銘牌(自由模式碰一下切站)════
  const stationPlaques = new THREE.Group();
  const stationNames = { bike: '腳踏車', clock: '時鐘', driver: '減速機' };
  STATIONS.forEach((id, i) => {
    const p = createPlaque(stationNames[id], { w: 0.06, h: 0.04, kind: 'station', id });
    p.position.set((i - 1) * 0.09, 0.025, 0.315);
    p.rotation.x = -0.18;
    p.traverse((o) => {
      if (o.userData.touchable) {
        o.userData.touchable.onTouch = () => {
          if (ctx.canSwitch?.() !== false) setStation(id);
          sfx.button();
        };
      }
    });
    stationPlaques.add(p);
  });
  group.add(stationPlaques);

  // ── 代號標籤 ──
  const tagRatio = createTag({
    symbol: [{ t: 'i', color: COLORS.input }],
    plain: '齒數比 = 前齒盤 ÷ 後齒輪',
    getValue: () => {
      if (S.station === 'bike') return `${FRONT_TEETH[S.frontIdx]}/${REAR_TEETH[S.rearIdx]} = ${gearRatio(FRONT_TEETH[S.frontIdx], REAR_TEETH[S.rearIdx]).toFixed(2)}`;
      if (S.station === 'clock') return `總減速 ${totalReduction(S.pair1, S.pair2).toFixed(1)} 倍`;
      return '減速 12 倍';
    },
  });
  tagRatio.position.set(-0.22, 0.05, 0.16);
  group.add(tagRatio);

  // ── 卷軸(依站別切頁組)──
  const scroll = createScroll({
    getPages: () => {
      if (S.station === 'bike') {
        const f = FRONT_TEETH[S.frontIdx], r = REAR_TEETH[S.rearIdx];
        const ratio = gearRatio(f, r);
        const dist = distancePerPedalRev(f, r);
        return [
          {
            title: T('齒數比'),
            plain: T('踏一圈,後輪轉幾圈'),
            formula: T('齒數比 = 前齒盤 ÷ 後齒輪'),
            subst: [{ t: `= ${f} ÷ ${r}`, color: COLORS.input }],
            result: [{ t: `= ${ratio.toFixed(2)} 圈`, color: COLORS.output }],
          },
          {
            title: T('踏一圈走多遠'),
            plain: T('前進距離 = 後輪轉的圈數 × 輪子周長'),
            formula: [{ t: 'd = 齒數比 × πD' }],
            subst: [{ t: `= ${ratio.toFixed(2)} × ${wheelCircumference().toFixed(2)} m` }],
            result: [{ t: `= ${dist.toFixed(2)} m`, color: COLORS.output }],
          },
          {
            title: T('鍊條'),
            plain: T('鍊條讓前後齒輪同方向轉,不需要惰輪'),
            formula: T('同向:鍊條;反向:兩齒輪直接咬合'),
            subst: T('看看前後齒輪轉的方向'),
            result: T('爬坡用小前盤配大後盤(低速檔)'),
          },
        ];
      }
      if (S.station === 'clock') {
        const r1 = S.pair1[1] / S.pair1[0], r2 = S.pair2[1] / S.pair2[0];
        const total = r1 * r2;
        return [
          {
            title: T('兩級減速'),
            plain: T('總減速比 = 第一級比 × 第二級比'),
            formula: [{ t: '總比 = ' }, { frac: { num: [{ t: `${S.pair1[1]}` }], den: [{ t: `${S.pair1[0]}` }] } }, { t: ' × ' }, { frac: { num: [{ t: `${S.pair2[1]}` }], den: [{ t: `${S.pair2[0]}` }] } }],
            subst: [{ t: `= ${r1.toFixed(2)} × ${r2.toFixed(2)}` }],
            result: [{ t: `= ${total.toFixed(2)}${Math.abs(total - 12) < 1e-9 ? ',時鐘走對了!' : '(要 12 才對)'}`, color: Math.abs(total - 12) < 1e-9 ? '#4A7A52' : '#A0522D' }],
          },
          {
            title: T('為什麼相加都是 60'),
            plain: T('兩級的中心距要相等,指針才能同軸(詳見藍圖)'),
            formula: T('鐘錶齒輪的間隙(背隙)做得很小'),
            subst: [{ t: `${S.pair1[0]}+${S.pair1[1]}=60,${S.pair2[0]}+${S.pair2[1]}=60` }],
            result: T('反轉分針,看時針先晃一下(藍圖裡可放大背隙)'),
          },
        ];
      }
      return [
        {
          title: T('減速機'),
          plain: T('馬達很快但沒力;經過減速,變慢但有力'),
          formula: T('兩級減速:總比 = 第一級 × 第二級'),
          subst: [{ t: '= 3 × 4' }],
          result: [{ t: '= 12 倍力矩,把螺絲鎖進木塊', color: COLORS.output }],
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
  group.add(overlay);
  function buildOverlay() {
    overlay.clear();
    let lines;
    if (S.station === 'bike') {
      lines = [
        { segments: [{ t: `i = z前/z後 = ${FRONT_TEETH[S.frontIdx]}/${REAR_TEETH[S.rearIdx]}` }], size: 44 },
        { segments: [{ t: `d = i × πD = ${distancePerPedalRev(FRONT_TEETH[S.frontIdx], REAR_TEETH[S.rearIdx]).toFixed(2)} m` }], size: 44 },
      ];
    } else if (S.station === 'clock') {
      const eq = centerDistancesEqual(S.pair1, S.pair2);
      lines = [
        { segments: [{ t: 'a', sub: '1' }, { t: ` = m(${S.pair1[0]}+${S.pair1[1]})/2,` }, { t: 'a', sub: '2' }, { t: ` = m(${S.pair2[0]}+${S.pair2[1]})/2` }], size: 42 },
        { segments: [{ t: `相加都是 60 → a1 = a2 ${eq ? '✓ 指針同軸' : ''}` }], size: 42 },
        { segments: [{ t: '背隙 j:反轉時從動輪先停 j/r 弧度再動' }], size: 40 },
      ];
    } else {
      lines = [
        { segments: [{ t: '總比 = (24/8) × (32/8) = 3 × 4 = 12' }], size: 44 },
        { segments: [{ t: 'τ輸出 = 12 × τ馬達(不計損失);ω輸出 = ω馬達/12' }], size: 42 },
      ];
    }
    const panel = textPlane(lines, 0.34, { width: 1200, baseSize: 44, pad: 40, defaultColor: '#EAF2FF' });
    panel.position.set(0, 0.42, -0.05);
    overlay.add(panel);
    ctx.blueprint?.markOverlay(overlay);
  }

  // ── 站別切換(= stage)──
  function setStation(id) {
    if (!STATIONS.includes(id)) id = STATIONS[0];
    S.station = id;
    bike.visible = id === 'bike';
    clock.visible = id === 'clock';
    driver.visible = id === 'driver';
    if (id !== 'driver' && S.driverOn) { S.driverOn = false; motorStop(); }
    buildOverlay();
    scroll.userData.scroll.renderPage?.();
  }
  function setStage(i) { setStation(STATIONS[Math.min(2, Math.max(0, i))]); }

  function update(dt) {
    ramp.userData.update(dt);
    if (S.backlashT > 0) { S.backlashT -= dt; poseClock(); }
    if (!ctx.isPaused?.() && S.driverOn) {
      S.motorAngle += 14 * dt;
      gearbox.userData.setMotorAngle(S.motorAngle);
      motorSet(0.9, 0.1);
      barMotor.userData.setValue(0.9);
      barOut.userData.setValue(0.8);
      if (S.motorAngle > 14 * 6) S.screwDone = true; // 約 6 秒動畫
    } else {
      barMotor.userData.setValue(S.driverOn ? 0.9 : 0);
      barOut.userData.setValue(S.driverOn ? 0.8 : 0);
    }
    barMotor.userData.update(dt);
    barOut.userData.update(dt);
    backlashKnob.visible = !!ctx.blueprint?.isOn && S.station === 'clock';
    tagRatio.userData.update(dt);
    scroll.userData.update(dt);

    ctx.missions?.feed('gearApps', {
      station: S.station,
      front: FRONT_TEETH[S.frontIdx], rear: REAR_TEETH[S.rearIdx],
      slope: S.slope, pedalRevs: S.pedalRevs,
      pair1: S.pair1, pair2: S.pair2, minuteTurns: S.minuteTurns,
      screwDone: S.screwDone,
    }, dt);
  }

  rebuildDrivetrain();
  poseClock();
  setStation('bike');
  return { group, update, setStage, dispose: () => motorStop(), scroll };
}
