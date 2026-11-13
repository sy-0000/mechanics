import { describe, it, expect } from 'vitest';
import {
  DEG, grashofType, solve, effectiveMu, minTransmissionAngle,
  rockerLimits, crankRockerR1Range, classifyOverR1, WIPER_DEFAULT,
} from '../src/kinematics/fourBar.js';

describe('四連桿 Grashof(例 04-01:r2=12, r3=18, r4=24)', () => {
  const r2 = 12, r3 = 18, r4 = 24;

  it('曲柄搖桿時 r1 範圍 18 ≤ r1 ≤ 30', () => {
    const range = crankRockerR1Range(r2, r3, r4);
    expect(range.min).toBeCloseTo(18, 9);
    expect(range.max).toBeCloseTo(30, 9);
    // 掃描驗證
    for (const r1 of [18, 20, 24, 27, 30]) {
      expect(grashofType(r1, r2, r3, r4).type).toBe('crank-rocker');
    }
  });

  it('參搖桿(非葛氏)時 6 < r1 < 18 或 30 < r1 < 54', () => {
    for (const r1 of [6.5, 10, 17.9, 30.1, 40, 53.5]) {
      expect(grashofType(r1, r2, r3, r4).type).toBe('triple-rocker');
    }
    // 邊界外不是參搖桿
    expect(grashofType(18, r2, r3, r4).type).not.toBe('triple-rocker');
    expect(grashofType(30, r2, r3, r4).type).not.toBe('triple-rocker');
    // 掃描分段應呈現 (6,18) 與 (30,54) 兩段參搖桿
    const segs = classifyOverR1(r2, r3, r4, 1, 60, 0.05)
      .filter((s) => s.type === 'triple-rocker');
    expect(segs.length).toBe(2);
    expect(segs[0].from).toBeGreaterThan(6 - 0.06);
    expect(segs[0].to).toBeLessThan(18);
    expect(segs[1].from).toBeGreaterThan(30);
    expect(segs[1].to).toBeLessThan(54);
  });
});

describe('四連桿封閉解', () => {
  const cases = [
    { r1: 80, r2: 30, r3: 78, r4: 42 },
    { r1: 24, r2: 12, r3: 18, r4: 24 },
    { r1: 100, r2: 40, r3: 90, r4: 60 },
  ];

  it('隨機角度下長度約束誤差 < 1e-9', () => {
    let seed = 42;
    const rand = () => (seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;
    for (const { r1, r2, r3, r4 } of cases) {
      for (let i = 0; i < 200; i++) {
        const t2 = rand() * 2 * Math.PI;
        const s = solve(r1, r2, r3, r4, t2);
        if (!s.ok) continue; // 不可組裝角度(非葛氏時)
        const lenCoupler = Math.hypot(s.B.x - s.A.x, s.B.y - s.A.y);
        const lenRocker = Math.hypot(s.B.x - r1, s.B.y);
        const lenCrank = Math.hypot(s.A.x, s.A.y);
        expect(Math.abs(lenCoupler - r3)).toBeLessThan(1e-9);
        expect(Math.abs(lenRocker - r4)).toBeLessThan(1e-9);
        expect(Math.abs(lenCrank - r2)).toBeLessThan(1e-9);
      }
    }
  });

  it('傳動角公式與座標法算出的夾角一致', () => {
    const { r1, r2, r3, r4 } = cases[0];
    for (let i = 0; i < 36; i++) {
      const t2 = (i / 36) * 2 * Math.PI;
      const s = solve(r1, r2, r3, r4, t2);
      if (!s.ok) continue;
      // 座標法:B 點上 連桿方向(A−B)與 搖桿方向(O4−B)的夾角
      const v1 = [s.A.x - s.B.x, s.A.y - s.B.y];
      const v2 = [r1 - s.B.x, -s.B.y];
      const dot = v1[0] * v2[0] + v1[1] * v2[1];
      const muCoord = Math.acos(dot / (r3 * r4));
      expect(Math.abs(muCoord - s.mu)).toBeLessThan(1e-9);
    }
  });
});

describe('雨刷預設尺寸', () => {
  const { r1, r2, r3, r4 } = WIPER_DEFAULT;

  it('是葛氏曲柄搖桿', () => {
    const g = grashofType(r1, r2, r3, r4);
    expect(g.type).toBe('crank-rocker');
  });

  it('搖桿擺動角 80° 到 100°', () => {
    const lim = rockerLimits(r1, r2, r3, r4);
    const swingDeg = lim.swing / DEG;
    expect(swingDeg).toBeGreaterThanOrEqual(80);
    expect(swingDeg).toBeLessThanOrEqual(100);
  });

  it('最小傳動角 ≥ 40°', () => {
    const muMin = minTransmissionAngle(r1, r2, r3, r4) / DEG;
    expect(muMin).toBeGreaterThanOrEqual(40);
  });

  it('整圈皆可組裝、effectiveMu 一致', () => {
    for (let i = 0; i < 360; i += 5) {
      const s = solve(r1, r2, r3, r4, i * DEG);
      expect(s.ok).toBe(true);
      expect(effectiveMu(s.mu)).toBeGreaterThanOrEqual(40 * DEG - 1e-9);
    }
  });
});
