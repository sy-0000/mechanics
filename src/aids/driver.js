// 教具六 電動螺絲起子減速機(剖面示意)。直立擺放:上面是馬達與 10 齒小齒輪(銅橘),
// 中間軸是 50 齒 + 12 齒(黃),最下面 48 齒輸出輪 + 輸出軸 + 起子頭(綠)。外殼深棕半透明剖面。
// 兩級中心距都是 m(10+50)/2 = m(12+48)/2,所以輸出軸和馬達同軸(和時鐘一樣)。
// 按開關:螺絲慢慢鎖進木塊;旁邊兩根長條顯示馬達轉速與輸出力矩。真實產品多用行星齒輪,這裡是簡化示意。
import * as THREE from 'three';
import { getKit, geo, SEM, N, codePlate, pitchR } from './kit.js';
import { createButton } from './parts.js';
import { meshAngle } from '../kinematics/gears.js';
import { THRESHOLDS } from '../teach/thresholds.js';
import { sfx, motorStart, motorStop, motorSet } from '../audio/sfx.js';

const T = THRESHOLDS.driver;
const M = 1.6, A = (M * 60) / 2000;              // 中心距 48 mm
const AX = -0.06, Z0 = -0.05, SLOW = 4;          // 畫面放慢 4 倍(數字仍是真實轉速)
const [[z1, z2], [z3, z4]] = T.stages;
const H_MOTOR = 0.29, H1 = 0.235, H2 = 0.2, H_WOOD = 0.06;
const TILT = 0.28;                               // 整組往學生傾斜,方便看齒輪面

export async function createAid(ctx) {
  const kit = getKit();
  const root = new THREE.Group();
  const S = { on: false, spin: 0, thM: 0, screw: 0, done: false, lastMove: 0 };
  const body = new THREE.Group(); body.position.set(AX, 0, Z0); body.rotation.x = TILT; root.add(body);
  // 平放的齒輪:齒輪幾何的軸在 Z,轉成 Y 軸
  const flat = g => g.clone().rotateX(-Math.PI / 2);

  // ---------------- 靜態:木塊、支架、外殼背面(半透明)----------------
  const st = kit.body('driverFrame');
  st.add(geo.box(0.3, 0.02, 0.18), { color: '#CDBB9E', sw: 'wood', pos: [0.02, 0.01, Z0] });                      // 工作台(淺木,非語意色)
  st.add(geo.box(0.11, H_WOOD - 0.02, 0.09), { color: '#D8C7A8', sw: 'wood', pos: [AX, 0.02 + (H_WOOD - 0.02) / 2, Z0] }); // 木塊
  st.add(geo.box(0.03, H_MOTOR + 0.02, 0.03), { color: SEM.frame, sw: 'wood', pos: [AX - 0.1, (H_MOTOR + 0.02) / 2 + 0.01, Z0 - 0.06] });   // 支架
  st.add(geo.box(0.12, 0.02, 0.03), { color: SEM.frame, sw: 'wood', pos: [AX - 0.05, H_MOTOR - 0.01, Z0 - 0.06] });
  const pNote = codePlate('行星齒輪的簡化示意', 'white', { w: 0.11, h: 0.016, px: 288 }); st.add(pNote.geo, { ...pNote, pos: [0.02, 0.0205, Z0 + 0.075], rot: [-Math.PI / 2, 0, 0] });
  root.add(st.build());

  // 外殼:深棕、半透明、剖開(只留後半)
  const shellMat = new THREE.MeshStandardMaterial({ color: SEM.frame, transparent: true, opacity: 0.32, roughness: 0.5, side: THREE.DoubleSide, depthWrite: false });
  const shell = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.07, H_MOTOR - H2 + 0.06, 40, 1, true, Math.PI / 2, Math.PI), shellMat);
  shell.position.set(A / 2, (H_MOTOR + H2) / 2 - 0.0, 0); shell.renderOrder = 3; body.add(shell);

  // ---------------- 會轉的軸 ----------------
  const motor = new THREE.Group(); motor.position.set(0, 0, 0); body.add(motor);
  const bm = kit.body('motorShaft');
  bm.add(geo.cylY(0.026, 0.06, 28), { color: SEM.input, sw: 'paint', pos: [0, H_MOTOR + 0.03, 0] });                 // 馬達
  bm.add(geo.cylY(0.004, 0.06, 10), { color: N.steel, sw: 'steel', pos: [0, H1 + 0.02, 0] });
  bm.add(flat(geo.gear(M, z1, 0.008, 0.002)), { color: SEM.input, sw: 'paint', pos: [0, H1, 0] });
  const p1 = codePlate('10', 'orange', { w: 0.02, h: 0.012, px: 64 }); bm.add(p1.geo, { ...p1, pos: [0, H_MOTOR + 0.03, 0.0262] });
  const motorMesh = bm.build(); motor.add(motorMesh);
  const inter = new THREE.Group(); inter.position.set(A, 0, 0); body.add(inter);
  const bi = kit.body('interShaft');
  bi.add(flat(geo.gear(M, z2, 0.008, 0.002)), { color: SEM.coupler, sw: 'paint', pos: [0, H1, 0] });
  bi.add(flat(geo.gear(M, z3, 0.008, 0.002)), { color: SEM.coupler, sw: 'paint', pos: [0, H2, 0] });
  bi.add(geo.cylY(0.0035, H1 - H2 + 0.02, 10), { color: N.steel, sw: 'steel', pos: [0, (H1 + H2) / 2, 0] });
  inter.add(bi.build());
  const out = new THREE.Group(); body.add(out);
  const bo = kit.body('outputShaft');
  bo.add(flat(geo.gear(M, z4, 0.008, 0.002)), { color: SEM.output, sw: 'paint', pos: [0, H2, 0] });
  bo.add(geo.cylY(0.006, H2 - H_WOOD - 0.035, 14), { color: SEM.output, sw: 'paint', pos: [0, (H2 + H_WOOD + 0.035) / 2, 0] });
  bo.add(geo.cylY(0.0035, 0.025, 6), { color: N.steel, sw: 'steel', pos: [0, H_WOOD + 0.03, 0] });                  // 起子頭(十字)
  bo.add(geo.box(0.009, 0.006, 0.002, 0.0005), { color: N.steel, sw: 'steel', pos: [0, H_WOOD + 0.019, 0] });
  const outMesh = bo.build(); out.add(outMesh);
  // 螺絲(鋼):一邊轉一邊往下鎖進木塊
  const screw = new THREE.Group(); body.add(screw);
  const bs = kit.body('screw');
  bs.add(geo.cylY(0.0075, 0.003, 20), { color: N.steel, sw: 'steel', pos: [0, 0.028, 0] });
  bs.add(geo.cylY(0.0028, 0.03, 10, 0.0012), { color: N.steel, sw: 'steel', pos: [0, 0.012, 0] });
  for (let i = 0; i < 7; i++) bs.add(geo.torus(0.0034, 0.0007, 10, 4), { color: N.steel, sw: 'steel', pos: [0, 0.002 + i * 0.0035, 0], rot: [Math.PI / 2 + 0.12, 0, 0] });
  screw.add(bs.build());

  // ---------------- 開關 + 兩根長條 ----------------
  const btn = createButton({ color: '#3E6E8E', radius: 0.017, ctx, onPress: () => toggle() });
  btn.group.position.set(0.14, 0.02, 0.05); root.add(btn.group);
  const bars = [0, 1].map(i => {
    const b = kit.body(`bar${i}`); b.add(geo.box(0.02, 1, 0.012, 0.002).clone().translate(0, 0.5, 0), { color: N.steel, sw: 'steel' });
    const m = b.build({ cast: false }); m.position.set(0.1 + i * 0.045, 0.02, Z0 - 0.02); root.add(m); return m;
  });
  const lb = kit.body('barLabels');
  const pa = codePlate('馬達轉速', 'orange', { w: 0.04, h: 0.012, px: 128 }), pb = codePlate('輸出力矩', 'green', { w: 0.04, h: 0.012, px: 128 });
  lb.add(pa.geo, { ...pa, pos: [0.1, 0.0205, Z0 + 0.005], rot: [-Math.PI / 2, 0, 0] }); lb.add(pb.geo, { ...pb, pos: [0.145, 0.0205, Z0 + 0.005], rot: [-Math.PI / 2, 0, 0] });
  root.add(lb.build({ cast: false }));

  function toggle() {
    if (S.done) { S.screw = 0; S.done = false; }      // 再按一次:換一根新螺絲重來
    S.on = !S.on; S.on ? motorStart() : motorStop();
  }
  function pose() {
    const thI = meshAngle(z1, z2, S.thM);
    const thO = meshAngle(z3, z4, thI - Math.PI) + Math.PI;      // 第二級:輸出輪在中間軸的 −X 方向(與馬達同軸)
    motor.rotation.y = S.thM; inter.rotation.y = thI; out.rotation.y = thO;
    screw.rotation.y = thO;
    screw.position.y = H_WOOD - 0.004 - 0.026 * S.screw + 0.012 * (1 - Math.min(1, S.screw * 4));
  }
  pose();
  return {
    root, defaultStage: 0, stages: ['減速機'],
    setAdvanced() {},
    update(dt) {
      S.spin = THREE.MathUtils.damp(S.spin, S.on ? 1 : 0, 3, dt);
      if (S.spin > 0.001) {
        const motorRevPerSec = (T.motorRpm / 60) * S.spin / SLOW;
        S.thM += motorRevPerSec * 2 * Math.PI * dt;
        const outRev = motorRevPerSec / ((z2 / z1) * (z4 / z3));
        if (!S.done) {
          S.screw = Math.min(1, S.screw + (outRev * dt) / (T.screwTurns / SLOW * SLOW / 4));
          if (S.screw >= 1) { S.done = true; S.on = false; motorStop(); sfx.snap(); }
        }
        motorSet(0.4 + 0.5 * S.spin, S.screw > 0.6 ? 0.4 : 0.1);
        S.lastMove = performance.now();
        pose();
      }
      bars[0].scale.y = 0.004 + 0.12 * S.spin;          // 馬達轉速:高
      bars[1].scale.y = 0.004 + 0.12 * S.spin;          // 輸出力矩:也高(×20)
      bars[1].position.x = 0.145; bars[0].position.x = 0.1;
      btn.update(dt);
    },
    moving: () => S.spin > 0.01 || performance.now() - S.lastMove < 150,
    values: () => ({ motor: Math.round(T.motorRpm * S.spin), out: Math.round((T.motorRpm / 20) * S.spin) }),
    snapshot: () => ({ screwDone: S.done }),
    dispose() { motorStop(); },
    debug: { S, toggle },
  };
}
