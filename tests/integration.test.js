// 整合版新增的純邏輯測試:四連桿分類(含變點機構)、雨刷預設尺寸、課本定義解析、任務門檻、肘節倍率、時鐘答案。
import { describe, it, expect } from 'vitest';
import { classify, searchWiperDefault, rockerLimits, minTransmissionAngle, DEG, assemblable } from '../src/kinematics/fourBar.js';
import { THRESHOLDS as T } from '../src/teach/thresholds.js';
import { parseDefinitions, BOARD } from '../src/teach/boardContent.js';
import { MISSIONS, BADGES, createMissionTracker } from '../src/teach/missions.js';
import { gearRatio } from '../src/kinematics/bicycle.js';
import { centerDistance } from '../src/kinematics/gears.js';

describe('四連桿分類(整合提示詞 3.1)', () => {
  it('五種分類都正確', () => {
    expect(classify(18, 7, 17, 10).type).toBe('crank-rocker');   // 最短是曲柄
    expect(classify(18, 12, 17, 7).type).toBe('crank-rocker');   // 最短是搖桿
    expect(classify(5, 12, 14, 11).type).toBe('double-crank');   // 最短是機架
    expect(classify(14, 12, 5, 11).type).toBe('double-rocker');  // 最短是連桿
    expect(classify(10, 5, 10, 5).type).toBe('change-point');    // s + l = p + q
    expect(classify(20, 12, 8, 9).type).toBe('triple-rocker');   // s + l > p + q
  });
  it('變點機構不算曲柄搖桿也不算雙搖桿', () => {
    const t = classify(14, 6, 10, 10).type; // 6+14 = 10+10
    expect(t).toBe('change-point');
  });
  it('裝不起來:最長桿 ≥ 其他三根的和', () => {
    expect(assemblable(15, 3, 8, 5)).toBe(true);
    expect(assemblable(16, 3, 8, 5)).toBe(false); // 16 = 3+8+5
    expect(assemblable(19, 3, 8, 9)).toBe(true);
    expect(assemblable(24, 3, 8, 13)).toBe(false); // 24 ≥ 3+8+13
  });
});

describe('雨刷預設尺寸', () => {
  const best = searchWiperDefault(T.wiper);
  it('在範圍內找得到整數公分的曲柄搖桿,擺動角 80–90°、最小傳動角 ≥ 35°', () => {
    expect(best).not.toBeNull();
    for (const k of ['d', 'a', 'b', 'c']) {
      expect(Number.isInteger(best[k])).toBe(true);
      expect(best[k]).toBeGreaterThanOrEqual(T.wiper.ranges[k][0]);
      expect(best[k]).toBeLessThanOrEqual(T.wiper.ranges[k][1]);
    }
    expect(classify(best.d, best.a, best.b, best.c).type).toBe('crank-rocker');
    const lim = rockerLimits(best.d, best.a, best.b, best.c);
    expect(lim.swing / DEG).toBeGreaterThanOrEqual(80);
    expect(lim.swing / DEG).toBeLessThanOrEqual(90);
    expect(minTransmissionAngle(best.d, best.a, best.b, best.c) / DEG).toBeGreaterThanOrEqual(35);
  });
  it('備案尺寸也符合條件(擺動角約 89°、最小傳動角約 38°)', () => {
    const f = T.wiper.fallback;
    expect(classify(f.d, f.a, f.b, f.c).type).toBe('crank-rocker');
    expect(rockerLimits(f.d, f.a, f.b, f.c).swing / DEG).toBeCloseTo(89, 0);
    expect(minTransmissionAngle(f.d, f.a, f.b, f.c) / DEG).toBeCloseTo(38, 0);
  });
});

describe('黑板內容', () => {
  it('七個教具都有中區與右區,中區公式不超過四行 + 一行即時數值', () => {
    for (const id of ['wiper', 'engine', 'crusher', 'gears', 'bike', 'clock', 'driver']) {
      const c = BOARD[id].center;
      expect(c.title).toMatch(/:/);
      const live = c.lines.filter(l => l.live);
      expect(live.length).toBe(1);
      expect(c.lines.at(-1).live).toBeTruthy();
      expect(c.lines.length - 2).toBeLessThanOrEqual(4); // 去掉觀念一行與現在的數字一行
      expect(BOARD[id].right.lines.length).toBeGreaterThan(0);
    }
  });
  it('課本定義:三個詞都有才採用,否則用預設', () => {
    expect(parseDefinitions('')).toBeNull();
    expect(parseDefinitions('結構:只有一句')).toBeNull();
    const md = '# 課本定義\n- **結構**:甲\n- 機構:乙\n- 機器:丙\n';
    const d = parseDefinitions(md);
    expect(d.lines.map(l => l.text)).toEqual(['結構:甲', '機構:乙', '機器:丙']);
  });
});

describe('任務門檻(thresholds.js)', () => {
  const run = (aid, id, snap, dt = 0.1, n = 1) => {
    const tr = createMissionTracker(); let done = [];
    for (let i = 0; i < n; i++) done = done.concat(tr.feed(aid, snap, dt).map(m => m.id));
    return done.includes(id);
  };
  it('雨刷:覆蓋率 ≥ 90%;設計雨刷要曲柄搖桿;雙搖桿加分(三搖桿不算)', () => {
    expect(run('wiper', 'hand-wipe', { d: 20, a: 6, b: 19, c: 9, glass: 'narrow', coverage: 0.9, byHand: true })).toBe(true);
    expect(run('wiper', 'hand-wipe', { d: 20, a: 6, b: 19, c: 9, glass: 'narrow', coverage: 0.89, byHand: true })).toBe(false);
    expect(run('wiper', 'design-wiper', { d: 8, a: 4, b: 8, c: 5, glass: 'wide', coverage: 0.95 })).toBe(true);
    expect(run('wiper', 'design-wiper', { d: 10, a: 5, b: 10, c: 5, glass: 'wide', coverage: 1 })).toBe(false); // 變點
    expect(run('wiper', 'double-rocker', { d: 14, a: 12, b: 5, c: 11 })).toBe(true);
    expect(run('wiper', 'double-rocker', { d: 20, a: 12, b: 8, c: 9 })).toBe(false);
  });
  it('引擎:連續 10 圈;死點 ±5° 停 1 秒;行程 ±0.5 cm', () => {
    expect(run('engine', 'start-engine', { runRevs: 10, theta: 100, omega: 3 })).toBe(true);
    expect(run('engine', 'start-engine', { runRevs: 9.9, theta: 100, omega: 3 })).toBe(false);
    expect(run('engine', 'dead-center', { theta: 184, omega: 0, runRevs: 0 }, 0.1, 11)).toBe(true);
    expect(run('engine', 'dead-center', { theta: 186, omega: 0, runRevs: 0 }, 0.1, 30)).toBe(false);
    expect(run('engine', 'dead-center', { theta: 2, omega: 0, runRevs: 0 }, 0.1, 9)).toBe(false);
    expect(run('engine', 'measure-stroke', { caliperSet: true, caliper: 10.4, stroke: 10 })).toBe(true);
    expect(run('engine', 'measure-stroke', { caliperSet: true, caliper: 10.6, stroke: 10 })).toBe(false);
  });
  it('齒輪:減速比 ≥ 3 才拉到頂;風扇最快是 40 帶 10;一圈變兩圈', () => {
    expect(run('gears', 'lift', { zA: 10, zB: 30, load: 'weight', lift: 1 })).toBe(true);
    expect(run('gears', 'lift', { zA: 15, zB: 40, load: 'weight', lift: 1 })).toBe(false);
    expect(run('gears', 'fan', { zA: 40, zB: 10, load: 'fan', motorOn: true })).toBe(true);
    expect(run('gears', 'one-two', { zA: 30, zB: 15, turnsA: 1 })).toBe(true);
  });
  it('腳踏車:爬坡只有 34 / 28 符合;平路最遠是 50 / 14', () => {
    const ok = [];
    for (const f of T.bike.front) for (const r of T.bike.rear) if (gearRatio(f, r) <= T.bike.climbMaxRatio) ok.push([f, r]);
    expect(ok).toEqual([[34, 28]]);
    expect(run('bike', 'sprint', { front: 50, rear: 14, slope: 'flat', pedalRevs: 1 })).toBe(true);
    expect(run('bike', 'climb', { front: 34, rear: 21, slope: 'climb', pedalRevs: 1 })).toBe(false);
  });
  it('時鐘:只有 3 × 4 或 4 × 3 是 12;五組齒數和都是 60(中心距相等)', () => {
    const answers = [];
    for (const p1 of T.clock.pairs) for (const p2 of T.clock.pairs) if ((p1[1] / p1[0]) * (p2[1] / p2[0]) === 12) answers.push([p1, p2]);
    expect(answers).toEqual([[[15, 45], [12, 48]], [[12, 48], [15, 45]]]);
    for (const p of T.clock.pairs) expect(centerDistance(2.5, ...p)).toBeCloseTo(75, 9);
  });
  it('每個任務都有徽章(名稱寫學會了什麼)', () => {
    expect(BADGES.length).toBe(Object.values(MISSIONS).flat().length);
    for (const b of BADGES) { expect(b.name).toBeTruthy(); expect(b.desc).toMatch(/知道|會|找到/); }
  });
});

describe('壓罐機倍率', () => {
  it('β = 6° 的門檻倍率 = 槓桿比 ÷ (2 tan 6°)', async () => {
    const lever = T.crusher.lever, need = lever / (2 * Math.tan(6 * DEG));
    expect(need).toBeCloseTo(11.89, 1);
    // 右區範例:β = 5° → tan 5° ≈ 0.087,約 5.7 倍
    expect(Math.tan(5 * DEG)).toBeCloseTo(0.087, 3);
    expect(1 / (2 * Math.tan(5 * DEG))).toBeCloseTo(5.7, 1);
  });
});
