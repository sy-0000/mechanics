import { describe, it, expect } from 'vitest';
import {
  FRONT_TEETH, REAR_TEETH, gearRatio, wheelCircumference,
  distancePerPedalRev, allGears, canClimb, isFastestGear, WHEEL_DIAMETER_M,
} from '../src/kinematics/bicycle.js';

describe('腳踏車檔位', () => {
  it('各檔位齒數比', () => {
    expect(gearRatio(34, 28)).toBeCloseTo(34 / 28, 12);
    expect(gearRatio(34, 21)).toBeCloseTo(34 / 21, 12);
    expect(gearRatio(34, 14)).toBeCloseTo(34 / 14, 12);
    expect(gearRatio(50, 28)).toBeCloseTo(50 / 28, 12);
    expect(gearRatio(50, 21)).toBeCloseTo(50 / 21, 12);
    expect(gearRatio(50, 14)).toBeCloseTo(50 / 14, 12);
  });

  it('踏一圈前進距離 = 齒數比 × 輪周長', () => {
    const c = wheelCircumference();
    expect(c).toBeCloseTo(Math.PI * WHEEL_DIAMETER_M, 12);
    for (const f of FRONT_TEETH) {
      for (const r of REAR_TEETH) {
        expect(distancePerPedalRev(f, r)).toBeCloseTo((f / r) * c, 12);
      }
    }
    // 數值抽查:50/14 檔,0.66 m 輪:50/14 × π × 0.66 ≈ 7.405 m
    expect(distancePerPedalRev(50, 14)).toBeCloseTo((50 / 14) * Math.PI * 0.66, 3);
  });

  it('allGears 共 6 檔且由輕到重', () => {
    const gears = allGears();
    expect(gears.length).toBe(6);
    for (let i = 1; i < gears.length; i++) {
      expect(gears[i].ratio).toBeGreaterThan(gears[i - 1].ratio);
    }
  });

  it('爬坡:只有最低檔(34/28)踏得動', () => {
    expect(canClimb(34, 28)).toBe(true);
    expect(canClimb(34, 21)).toBe(false);
    expect(canClimb(50, 28)).toBe(false);
    expect(canClimb(50, 14)).toBe(false);
  });

  it('平路衝刺:最重檔是 50/14', () => {
    expect(isFastestGear(50, 14)).toBe(true);
    expect(isFastestGear(34, 14)).toBe(false);
  });
});
