// 腳踏車傳動運動學。純數學。

export const FRONT_TEETH = [34, 50];       // 前齒盤
export const REAR_TEETH = [14, 21, 28];    // 後齒輪(飛輪)
export const WHEEL_DIAMETER_M = 0.66;      // 教學用實車尺寸(26 吋輪 ≈ 0.66 m)

/** 齒數比 = 前齒盤 ÷ 後齒輪(踏一圈,後輪轉幾圈) */
export function gearRatio(front, rear) {
  return front / rear;
}

/** 輪子周長(m) */
export function wheelCircumference(diameter = WHEEL_DIAMETER_M) {
  return Math.PI * diameter;
}

/** 踏一圈前進距離(m)= 齒數比 × 輪子周長 */
export function distancePerPedalRev(front, rear, diameter = WHEEL_DIAMETER_M) {
  return gearRatio(front, rear) * wheelCircumference(diameter);
}

/** 所有檔位組合(由輕到重排序) */
export function allGears() {
  const out = [];
  for (const f of FRONT_TEETH) {
    for (const r of REAR_TEETH) {
      out.push({ front: f, rear: r, ratio: gearRatio(f, r) });
    }
  }
  return out.sort((a, b) => a.ratio - b.ratio);
}

/** 爬坡所需:齒數比 ≤ 此值,踏板才轉得動(教學簡化模型) */
export const CLIMB_MAX_RATIO = 1.4;
/** 爬坡模式下該檔位是否踏得動 */
export function canClimb(front, rear) {
  return gearRatio(front, rear) <= CLIMB_MAX_RATIO;
}

/** 平路衝刺:是否為踏一圈前進最遠的檔位 */
export function isFastestGear(front, rear) {
  const ratios = allGears();
  const max = ratios[ratios.length - 1];
  return front === max.front && rear === max.rear;
}

/** 鍊條速度(m/s)踏頻 cad(rev/s):v_chain = 前齒盤節圓周速 */
export function chainSpeed(front, cadence, module = 0.0127) {
  // 鍊條節距 1/2" = 12.7 mm;節圓周長 = 齒數 × 節距
  return front * module * cadence;
}
