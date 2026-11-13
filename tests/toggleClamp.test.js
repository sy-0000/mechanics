import { describe, it, expect } from 'vitest';
import {
  DEG, betaFromHandle, isLocked, linkAmplification, clampForceRatio,
  rubberCompression, springsBack, CLAMP_DEFAULT,
} from '../src/kinematics/toggleClamp.js';

describe('肘節夾鉗', () => {
  it('握把行程映射 β:0→β0、1→βLock', () => {
    expect(betaFromHandle(0)).toBeCloseTo(CLAMP_DEFAULT.beta0, 12);
    expect(betaFromHandle(1)).toBeCloseTo(CLAMP_DEFAULT.betaLock, 12);
    expect(betaFromHandle(0.5)).toBeCloseTo((CLAMP_DEFAULT.beta0 + CLAMP_DEFAULT.betaLock) / 2, 12);
  });

  it('過中心(β<0)才鎖死;沒過中心放手彈開', () => {
    expect(isLocked(5 * DEG)).toBe(false);
    expect(isLocked(-1 * DEG)).toBe(true);
    expect(springsBack(5 * DEG)).toBe(true);
    expect(springsBack(-1 * DEG)).toBe(false);
  });

  it('夾緊力 ≈ 手的力 ÷ (2 tanβ):β 越小放大越多', () => {
    expect(linkAmplification(45 * DEG)).toBeCloseTo(0.5, 9);
    expect(linkAmplification(30 * DEG)).toBeCloseTo(1 / (2 * Math.tan(30 * DEG)), 12);
    expect(linkAmplification(5 * DEG)).toBeGreaterThan(linkAmplification(10 * DEG));
    expect(linkAmplification(-1 * DEG)).toBe(Infinity);
    // 含握把槓桿
    expect(clampForceRatio(10 * DEG, 3)).toBeCloseTo(3 / (2 * Math.tan(10 * DEG)), 12);
  });

  it('橡膠壓縮單調且過中心後保持最大', () => {
    const c1 = rubberCompression(30 * DEG);
    const c2 = rubberCompression(10 * DEG);
    const c3 = rubberCompression(-2 * DEG);
    expect(c1).toBeLessThan(c2);
    expect(c2).toBeLessThan(1 + 1e-9);
    expect(c3).toBe(1);
    expect(rubberCompression(CLAMP_DEFAULT.beta0)).toBeCloseTo(0, 9);
  });
});
