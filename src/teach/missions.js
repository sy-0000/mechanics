// 任務定義與偵測。條件只用各教具 snapshot() 的運動學數值判斷,不靠動畫;門檻都在 thresholds.js。
import { THRESHOLDS as T } from './thresholds.js';
import { classify } from '../kinematics/fourBar.js';
import { gearRatio } from '../kinematics/bicycle.js';

const angDist = (a, b) => { const d = (((a - b) % 360) + 540) % 360 - 180; return Math.abs(d); };

/**
 * MISSIONS[aidId] = [{ id, name, badge, bonus?, optional?, check(s, mem, dt) }]
 * 徽章(badge)名稱寫「學會了什麼」。
 */
export const MISSIONS = {
  wiper: [
    {
      id: 'hand-wipe', name: '手動刷乾淨', badge: { name: '雨刷工程師', desc: '知道雨刷是曲柄搖桿', icon: '刷' },
      check: s => s.glass === 'narrow' && s.coverage >= T.wiper.coverage && s.byHand,
    },
    {
      id: 'design-wiper', name: '設計雨刷', badge: { name: '葛氏偵探', desc: '會用葛氏條件設計曲柄搖桿', icon: '葛' },
      check: s => s.glass === 'wide' && s.coverage >= T.wiper.coverage && classify(s.d, s.a, s.b, s.c).type === 'crank-rocker',
    },
    {
      id: 'double-rocker', name: '雙搖桿(加分)', bonus: true, badge: { name: '雙搖桿發現者', desc: '知道最短桿當連桿會變雙搖桿', icon: '雙' },
      check: s => classify(s.d, s.a, s.b, s.c).type === 'double-rocker',
    },
  ],
  engine: [
    {
      id: 'start-engine', name: '發動引擎', badge: { name: '引擎點火', desc: '知道要在上死點剛過時點火', icon: '引' },
      check: s => s.runRevs >= T.engine.runRevs,
    },
    {
      id: 'dead-center', name: '找到死點', badge: { name: '死點獵人', desc: '找到推不動的位置', icon: '死' },
      check: (s, mem, dt) => {
        const near = angDist(s.theta, 0) <= T.engine.deadTol || angDist(s.theta, 180) <= T.engine.deadTol;
        mem.hold = near && Math.abs(s.omega) < T.engine.stillOmega ? (mem.hold ?? 0) + dt : 0;
        return mem.hold >= T.engine.deadHold;
      },
    },
    {
      id: 'measure-stroke', name: '量行程(選做)', optional: true, badge: { name: '量測員', desc: '知道行程是曲柄長的兩倍', icon: '量' },
      check: s => s.caliperSet && Math.abs(s.caliper - s.stroke) <= T.engine.strokeTol,
    },
  ],
  crusher: [
    {
      id: 'crush-three', name: '壓罐高手', badge: { name: '壓罐高手', desc: '知道連桿越直力越大', icon: '壓' },
      check: s => s.crushed >= T.crusher.cans,
    },
  ],
  gears: [
    {
      id: 'lift', name: '拉到頂', badge: { name: '大力士', desc: '知道減速可以增加力矩', icon: '力' },
      check: s => s.load === 'weight' && s.lift >= 0.999 && s.zB / s.zA >= T.gears.liftRatio,
    },
    {
      id: 'fan', name: '風扇最快', badge: { name: '速度與力氣', desc: '知道兩者要取捨', icon: '衡' },
      check: s => s.load === 'fan' && s.motorOn && s.zA === T.gears.fanBest[0] && s.zB === T.gears.fanBest[1],
    },
    {
      id: 'one-two', name: '一圈變兩圈', badge: { name: '齒數比', desc: '會用齒數算出轉幾圈', icon: '比' },
      check: s => s.zA / s.zB === T.gears.oneTwo && s.turnsA >= T.gears.turnsForOneTwo,
    },
  ],
  bike: [
    {
      id: 'climb', name: '爬坡', badge: { name: '換檔高手', desc: '知道爬坡用低速檔', icon: '檔' },
      check: s => s.slope === 'climb' && gearRatio(s.front, s.rear) <= T.bike.climbMaxRatio && s.pedalRevs >= T.bike.pedalRevs,
    },
    {
      id: 'sprint', name: '平路衝刺', badge: { name: '衝刺手', desc: '知道平路用高速檔', icon: '衝' },
      check: s => s.slope === 'flat' && s.front === Math.max(...T.bike.front) && s.rear === Math.min(...T.bike.rear) && s.pedalRevs >= T.bike.pedalRevs,
    },
  ],
  clock: [
    {
      id: 'clockmaker', name: '鐘錶匠', badge: { name: '鐘錶匠', desc: '會用兩級齒輪做出 12 倍減速', icon: '鐘' },
      check: s => !!s.pair1 && !!s.pair2 && Math.abs(s.total - T.clock.total) < 1e-9 && s.hourTurns >= T.clock.hourTurns,
    },
  ],
  driver: [
    {
      id: 'watch-driver', name: '看完鎖螺絲', badge: { name: '減速機', desc: '知道減速讓馬達變有力', icon: '起' },
      check: s => s.screwDone,
    },
  ],
};

/** 所有徽章(老師頁徽章牆用)。id = `${aid}:${mission}`。 */
export const BADGES = Object.entries(MISSIONS).flatMap(([aid, list]) =>
  list.map(m => ({ id: `${aid}:${m.id}`, aid, mission: m.name, bonus: !!m.bonus, optional: !!m.optional, ...m.badge })));

export function createMissionTracker({ onComplete } = {}) {
  const done = new Set(), mem = new Map();
  function feed(aid, snap, dt) {
    const list = MISSIONS[aid]; if (!list || !snap) return [];
    const now = [];
    for (const m of list) {
      const key = `${aid}:${m.id}`;
      if (done.has(key)) continue;
      if (!mem.has(key)) mem.set(key, {});
      let ok = false;
      try { ok = !!m.check(snap, mem.get(key), dt); } catch (e) { ok = false; }
      if (ok) { done.add(key); now.push(m); onComplete?.(aid, m, key); }
    }
    return now;
  }
  return {
    feed,
    isDone: key => done.has(key),
    list: () => [...done],
    restore: keys => keys?.forEach(k => done.add(k)),
    resetMemory: aid => { for (const k of [...mem.keys()]) if (k.startsWith(`${aid}:`)) mem.delete(k); },
  };
}
