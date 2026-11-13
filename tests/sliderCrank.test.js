import { describe, it, expect } from 'vitest';
import {
  DEG, solve, stroke, limits, transmissionAngle, muExtremes,
  deadCenterAngles, nearDeadCenter, ENGINE_DEFAULT,
} from '../src/kinematics/sliderCrank.js';

describe('偏位滑件曲柄(例 04-02:r2=200, r3=600, e=50)', () => {
  const r2 = 200, r3 = 600, e = 50;

  it('行程 401.57 mm', () => {
    expect(stroke(r2, r3, e)).toBeCloseTo(401.57, 2);
  });

  it('μ_min = 65.38°(θ2 = 270°)', () => {
    const { muMin, thetaAtMin } = muExtremes(r2, r3, e);
    expect(muMin / DEG).toBeCloseTo(65.38, 2);
    expect(thetaAtMin / DEG).toBeCloseTo(270, 9);
  });

  it('μ_max = 104.48°(θ2 = 90°)', () => {
    const { muMax, thetaAtMax } = muExtremes(r2, r3, e);
    expect(muMax / DEG).toBeCloseTo(104.48, 2);
    expect(thetaAtMax / DEG).toBeCloseTo(90, 9);
  });

  it('x(θ) 與極限位置一致:x_max − x_min = 行程', () => {
    const { xMax, xMin } = limits(r2, r3, e);
    expect(xMax - xMin).toBeCloseTo(stroke(r2, r3, e), 9);
    // 掃描驗證 x 不超出極限
    for (let i = 0; i < 360; i++) {
      const s = solve(r2, r3, i * DEG, e);
      expect(s.ok).toBe(true);
      expect(s.x).toBeLessThanOrEqual(xMax + 1e-9);
      expect(s.x).toBeGreaterThanOrEqual(xMin - 1e-9);
    }
  });

  it('連桿長度約束誤差 < 1e-9', () => {
    for (let i = 0; i < 360; i += 7) {
      const s = solve(r2, r3, i * DEG, e);
      const len = Math.hypot(s.B.x - s.A.x, s.B.y - s.A.y);
      expect(Math.abs(len - r3)).toBeLessThan(1e-9);
    }
  });
});

describe('引擎關卡預設(e=0)', () => {
  const { r2, r3, e } = ENGINE_DEFAULT;

  it('行程 = 2 × 曲柄長', () => {
    expect(stroke(r2, r3, e)).toBeCloseTo(2 * r2, 9);
  });

  it('死點在 0° 與 180°', () => {
    const [t1, t2] = deadCenterAngles(r2, r3, e);
    expect(t1 / DEG).toBeCloseTo(0, 9);
    expect(t2 / DEG).toBeCloseTo(180, 9);
    expect(nearDeadCenter(r2, r3, 2 * DEG, e)).toBe(true);
    expect(nearDeadCenter(r2, r3, 178 * DEG, e)).toBe(true);
    expect(nearDeadCenter(r2, r3, 357 * DEG, e)).toBe(true);
    expect(nearDeadCenter(r2, r3, 90 * DEG, e)).toBe(false);
    expect(nearDeadCenter(r2, r3, 174 * DEG, e)).toBe(false);
  });

  it('θ=90° 時 sin φ = 曲柄長 ÷ 連桿長(卷軸第 2 頁)', () => {
    const s = solve(r2, r3, 90 * DEG, e);
    expect(Math.sin(s.phi)).toBeCloseTo(r2 / r3, 9);
    expect(r2 / r3).toBeCloseTo(0.3, 9); // 15 ÷ 50 = 0.3
  });

  it('μ(θ) 在 0°/180° 死點處為 90°±asin(r2/r3) 範圍內的端值', () => {
    const mu0 = transmissionAngle(r2, r3, 0, e);
    expect(mu0 / DEG).toBeCloseTo(90, 9); // e=0、θ=0 → sin=−e/r3=0
  });
});
