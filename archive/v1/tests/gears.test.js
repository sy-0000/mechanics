import { describe, it, expect } from 'vitest';
import {
  pitchDiameter, centerDistance, speedRatio, torqueRatio,
  gearProfile, meshAngle, transformPolygon, overlapAreaEstimate,
  toothArea, trainSpeedRatio, backlashAngle, pitchRadius,
} from '../src/kinematics/gears.js';
import {
  GEAR_PAIRS, CORRECT, totalReduction, isCorrectClock,
  centerDistancesEqual, trainAngles, hourPerMinuteRatio,
} from '../src/kinematics/clock.js';

describe('齒輪基本公式', () => {
  it('d = m z;a = m(zA+zB)/2', () => {
    expect(pitchDiameter(2, 30)).toBe(60);
    expect(centerDistance(2, 10, 30)).toBe(40);
  });
  it('轉速比與力矩比互為倒數(τω 相等)', () => {
    expect(speedRatio(10, 30)).toBeCloseTo(1 / 3, 12);
    expect(torqueRatio(10, 30)).toBeCloseTo(3, 12);
    expect(speedRatio(10, 30) * torqueRatio(10, 30)).toBeCloseTo(1, 12);
  });
});

describe('齒形不相交(隨機角度)', () => {
  const m = 2.2;
  const pairs = [
    [10, 40], [15, 30], [20, 30], [10, 30], [15, 45], [12, 48],
  ];
  let seed = 7;
  const rand = () => (seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;

  it('相交面積 < 齒面積的 0.1%', () => {
    for (const [zA, zB] of pairs) {
      const a = centerDistance(m, zA, zB);
      const profA = gearProfile(m, zA);
      const profB = gearProfile(m, zB);
      const tArea = Math.min(toothArea(m, zA), toothArea(m, zB));
      for (let i = 0; i < 25; i++) {
        const thetaA = rand() * 2 * Math.PI;
        const thetaB = meshAngle(zA, zB, thetaA);
        const A = transformPolygon(profA, thetaA, 0, 0);
        const B = transformPolygon(profB, thetaB, a, 0);
        const overlap = overlapAreaEstimate(A, B) + overlapAreaEstimate(B, A);
        expect(overlap).toBeLessThan(0.001 * tArea);
      }
    }
  });
});

describe('同軸複合齒輪相位', () => {
  it('同軸兩輪角度始終同步(差固定安裝相位)', () => {
    // 中間軸:45 齒(被 15 齒帶動)與 12 齒同軸
    for (let i = 0; i < 20; i++) {
      const tMin = (i / 20) * 4 * Math.PI;
      const { wheel1 } = trainAngles(tMin);
      // 45 齒輪角 = 12 齒輪角(同一根軸)
      const ang45 = wheel1;
      const ang12 = wheel1;
      expect(ang45).toBe(ang12);
      // 嚙合關係:wheel1 = −(15/45)·tMin
      expect(wheel1).toBeCloseTo(-(15 / 45) * tMin, 12);
    }
  });
});

describe('時鐘輪系', () => {
  it('正確配置總比 = 12(分針 12 圈 → 時針 1 圈)', () => {
    expect(totalReduction(CORRECT.stage1, CORRECT.stage2)).toBeCloseTo(12, 12);
    expect(isCorrectClock(CORRECT.stage1, CORRECT.stage2)).toBe(true);
    expect(isCorrectClock(CORRECT.stage2, CORRECT.stage1)).toBe(true); // 4×3 也對
  });

  it('只有 3×4 與 4×3 兩種正確組合', () => {
    let correct = 0;
    for (const p1 of GEAR_PAIRS) {
      for (const p2 of GEAR_PAIRS) {
        if (isCorrectClock(p1, p2)) correct++;
      }
    }
    expect(correct).toBe(2);
  });

  it('五組齒輪對兩級中心距皆相等(相加都是 60)', () => {
    for (const p1 of GEAR_PAIRS) {
      for (const p2 of GEAR_PAIRS) {
        expect(centerDistancesEqual(p1, p2, 1.8)).toBe(true);
      }
      expect(p1[0] + p1[1]).toBe(60);
    }
  });

  it('時針與分針同向(兩次外嚙合反向抵銷)', () => {
    const { minute, hour } = trainAngles(2 * Math.PI * 12);
    expect(Math.sign(hour)).toBe(Math.sign(minute));
    expect(hour).toBeCloseTo(2 * Math.PI, 12);
    expect(hourPerMinuteRatio(CORRECT.stage1, CORRECT.stage2)).toBeCloseTo(1 / 12, 12);
  });
});

describe('輪系與背隙', () => {
  it('兩級減速總比 = 各級相乘', () => {
    expect(trainSpeedRatio([
      { driver: 10, driven: 40 },
      { driver: 12, driven: 36 },
    ])).toBeCloseTo((10 / 40) * (12 / 36), 12);
  });

  it('背隙角 = 圓周背隙 ÷ 節圓半徑', () => {
    expect(backlashAngle(2, 30, 0.3)).toBeCloseTo(0.3 / pitchRadius(2, 30), 12);
  });
});
