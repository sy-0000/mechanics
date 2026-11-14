// 任務偵測:條件用運動學模組的數值判斷,不靠動畫。
// 關卡每幀把量化狀態丟進 missionTracker.feed(levelId, snapshot);
// 達成條件 → 發徽章(badges.js)+ 回報老師頁(net)。
import { grashofType, rockerLimits, DEG } from '../kinematics/fourBar.js';
import { nearDeadCenter, stroke } from '../kinematics/sliderCrank.js';
import { isLocked, springsBack } from '../kinematics/toggleClamp.js';
import { canClimb, isFastestGear } from '../kinematics/bicycle.js';
import { isCorrectClock } from '../kinematics/clock.js';

/**
 * 任務定義。check(s) 的 s 是關卡 snapshot(各關卡文件化在 levels/*.js)。
 * progressKey 用來累積跨幀條件(如「連轉三圈」)。
 */
export const MISSIONS = {
  wiper: [
    {
      id: 'wipe-clean', badge: 'wiper-engineer', name: '刷乾淨',
      check: (s, mem) => {
        // 覆蓋率 ≥90%、且本輪已完整轉一圈
        if (s.coverage >= 0.9) mem.coverOk = true;
        if (mem.coverOk && s.revolutions >= mem.revAtCover + 1) return true;
        if (mem.coverOk && mem.revAtCover === undefined) mem.revAtCover = s.revolutions;
        return false;
      },
    },
    {
      id: 'full-circle', badge: 'grashof-detective', name: '整圈不卡',
      check: (s, mem) => {
        if (!s.motorOn) { mem.startRev = undefined; return false; }
        const g = grashofType(s.r1, s.r2, s.r3, s.r4);
        if (g.type !== 'crank-rocker') { mem.startRev = undefined; return false; }
        if (mem.startRev === undefined) mem.startRev = s.revolutions;
        return s.revolutions >= mem.startRev + 3; // 連續轉三圈
      },
    },
    {
      id: 'double-rocker', badge: null, name: '找出雙搖桿(加分)',
      check: (s) => grashofType(s.r1, s.r2, s.r3, s.r4).type === 'double-rocker',
    },
  ],
  sliderCrank: [
    {
      id: 'engine-start', badge: 'engine-ignite', name: '引擎啟動',
      check: (s, mem) => {
        if (mem.rev0 === undefined) mem.rev0 = s.revolutions;
        return s.revolutions >= mem.rev0 + 1; // 轉一整圈 = 活塞一次來回
      },
    },
    {
      id: 'find-deadpoint', badge: 'deadpoint-hunter', name: '找到死點',
      check: (s, mem, dt) => {
        const near = nearDeadCenter(s.r2, s.r3, s.theta2, s.e, 4 * DEG);
        const still = Math.abs(s.omega) < 0.15;
        mem.hold = near && still ? (mem.hold || 0) + dt : 0;
        return mem.hold >= 1; // 停住 1 秒
      },
    },
    {
      id: 'measure-stroke', badge: null, name: '量行程',
      check: (s) => {
        const trueStroke = stroke(s.r2, s.r3, s.e);
        return s.caliperMm !== null && Math.abs(s.caliperMm - trueStroke) <= 2;
      },
    },
  ],
  toggleClamp: [
    {
      id: 'clamp-lock', badge: 'lock-master', name: '夾緊並鎖死',
      check: (s) => isLocked(s.beta) && !s.held,
    },
    {
      id: 'spring-back', badge: null, name: '發現沒過中心點會彈開',
      check: (s, mem) => {
        if (s.held && springsBack(s.beta) && s.beta < 12 * DEG) mem.armed = true;
        return !!(mem.armed && !s.held && s.beta > 25 * DEG); // 放手彈回
      },
    },
  ],
  gearBasics: [
    {
      id: 'lift-weight', badge: 'strongman', name: '舉起重物',
      check: (s) => s.mode === 'weight' && s.lift >= 0.99,
    },
    {
      id: 'fastest-fan', badge: 'tradeoff', name: '最快的風扇',
      check: (s) => s.mode === 'fan' && s.zA === 40 && s.zB === 10 && s.motorOn,
    },
    {
      id: 'one-two', badge: null, name: 'A 轉 1 圈,B 轉 2 圈',
      check: (s) => s.zA / s.zB === 2 && s.motorOn,
    },
  ],
  gearApps: [
    {
      id: 'climb-hill', badge: 'gear-shifter', name: '爬上坡',
      check: (s) => s.station === 'bike' && s.slope === 1
        && canClimb(s.front, s.rear) && s.pedalRevs >= 1,
    },
    {
      id: 'sprint', badge: null, name: '平路衝刺',
      check: (s) => s.station === 'bike' && s.slope === 0
        && isFastestGear(s.front, s.rear) && s.pedalRevs >= 1,
    },
    {
      id: 'clock-right', badge: 'clockmaker', name: '讓時鐘走對',
      check: (s) => s.station === 'clock' && s.pair1 && s.pair2
        && isCorrectClock(s.pair1, s.pair2) && s.minuteTurns >= 1,
    },
    {
      id: 'drive-screw', badge: null, name: '鎖進螺絲',
      check: (s) => s.station === 'driver' && s.screwDone,
    },
  ],
};

/**
 * @param {object} p {badges, onComplete(levelId, mission)}
 */
export function createMissionTracker({ badges, onComplete = null } = {}) {
  const done = new Set();
  const mem = new Map(); // `${level}:${id}` → {}

  function feed(levelId, snapshot, dt = 0.016) {
    const list = MISSIONS[levelId];
    if (!list) return [];
    const completedNow = [];
    for (const m of list) {
      const key = `${levelId}:${m.id}`;
      if (done.has(key)) continue;
      if (!mem.has(key)) mem.set(key, {});
      let ok = false;
      try { ok = m.check(snapshot, mem.get(key), dt); } catch { ok = false; }
      if (ok) {
        done.add(key);
        if (m.badge) badges?.award(m.badge);
        onComplete?.(levelId, m);
        completedNow.push(m);
      }
    }
    return completedNow;
  }

  return {
    feed,
    isDone: (levelId, id) => done.has(`${levelId}:${id}`),
    getDone: () => [...done],
    restore: (list) => { for (const k of list || []) done.add(k); },
  };
}
