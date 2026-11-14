// 時鐘兩級輪系運動學。純數學。
// 正確配置:分針軸 15 齒 → 45 齒;同軸 12 齒 → 48 齒時針輪。
// 分針轉 12 圈,時針轉 1 圈。

import { centerDistance, trainSpeedRatio } from './gears.js';

/** 托盤裡的五組齒輪對(driver + driven = 60,保證兩級中心距相等) */
export const GEAR_PAIRS = Object.freeze([
  [30, 30], [20, 40], [15, 45], [12, 48], [10, 50],
]);

export const CORRECT = Object.freeze({ stage1: [15, 45], stage2: [12, 48] });

/** 兩級輪系:時針轉速 / 分針轉速 = (z1d/z1n)×(z2d/z2n)
 * pair = [driver, driven] */
export function hourPerMinuteRatio(pair1, pair2) {
  return trainSpeedRatio([
    { driver: pair1[0], driven: pair1[1] },
    { driver: pair2[0], driven: pair2[1] },
  ]);
}

/** 總減速比(分針轉幾圈,時針轉 1 圈) */
export function totalReduction(pair1, pair2) {
  return 1 / hourPerMinuteRatio(pair1, pair2);
}

/** 時鐘走對:分針 12 圈 = 時針 1 圈 */
export function isCorrectClock(pair1, pair2) {
  return Math.abs(totalReduction(pair1, pair2) - 12) < 1e-9;
}

/** 兩級中心距是否相等(指針才能同軸)。m 為模數。 */
export function centerDistancesEqual(pair1, pair2, m = 1) {
  const a1 = centerDistance(m, pair1[0], pair1[1]);
  const a2 = centerDistance(m, pair2[0], pair2[1]);
  return Math.abs(a1 - a2) < 1e-9;
}

/** 給定分針角(弧度)求整個輪系每個輪的角度(含時針)。
 * 回傳 {minute, wheel1, hour}:wheel1 為中間複合齒輪軸角。 */
export function trainAngles(minuteAngle, pair1 = CORRECT.stage1, pair2 = CORRECT.stage2) {
  // 外嚙合一級反向:ω1 = −(z_d/z_n) ω_m
  const w1 = -(pair1[0] / pair1[1]) * minuteAngle;
  const hour = -(pair2[0] / pair2[1]) * w1; // 再反向一次 → 與分針同向
  return { minute: minuteAngle, wheel1: w1, hour };
}
