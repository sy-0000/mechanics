// 曲柄滑塊(含偏位)運動學。純數學。
// 約定:曲柄軸 O2 在原點,滑塊沿 +X 方向的直線 y = e(偏位)移動。
// r2 = 曲柄、r3 = 連桿、e = 偏位(預設 0)。角度弧度。

export const DEG = Math.PI / 180;

/** 滑塊位置 x(θ2)。回傳 {x, phi, A} ;phi 為連桿相對滑動方向的傾角。 */
export function solve(r2, r3, theta2, e = 0) {
  const Ax = r2 * Math.cos(theta2);
  const Ay = r2 * Math.sin(theta2);
  const s = (Ay - e) / r3; // sin(phi)
  if (Math.abs(s) > 1) return { ok: false };
  const phi = Math.asin(s);
  const x = Ax + r3 * Math.cos(phi);
  return { ok: true, x, phi, A: { x: Ax, y: Ay }, B: { x, y: e } };
}

/** 行程:s = √((r3+r2)²−e²) − √((r3−r2)²−e²) */
export function stroke(r2, r3, e = 0) {
  const a = (r3 + r2) ** 2 - e * e;
  const b = (r3 - r2) ** 2 - e * e;
  if (a < 0 || b < 0) return NaN;
  return Math.sqrt(a) - Math.sqrt(b);
}

/** 滑塊極限位置 x_max / x_min */
export function limits(r2, r3, e = 0) {
  const xMax = Math.sqrt((r3 + r2) ** 2 - e * e);
  const xMin = Math.sqrt((r3 - r2) ** 2 - e * e);
  return { xMax, xMin };
}

/** 傳動角 μ(θ2) = 90° + asin((r2 sinθ2 − e)/r3)(教科書慣例,弧度) */
export function transmissionAngle(r2, r3, theta2, e = 0) {
  const s = (r2 * Math.sin(theta2) - e) / r3;
  if (Math.abs(s) > 1) return NaN;
  return Math.PI / 2 + Math.asin(s);
}

/** 最小 / 最大傳動角(發生在 θ2 = 270° / 90°) */
export function muExtremes(r2, r3, e = 0) {
  return {
    muMin: transmissionAngle(r2, r3, 1.5 * Math.PI, e),
    thetaAtMin: 1.5 * Math.PI,
    muMax: transmissionAngle(r2, r3, 0.5 * Math.PI, e),
    thetaAtMax: 0.5 * Math.PI,
  };
}

/** 死點曲柄角(曲柄與連桿共線)。e=0 時為 0 與 π。回傳 [θ_伸直, θ_折疊]。 */
export function deadCenterAngles(r2, r3, e = 0) {
  const tExt = Math.asin(e / (r2 + r3));            // 伸直(外死點)
  const tFold = Math.PI - Math.asin(e / (r3 - r2)); // 折疊(內死點)
  return [tExt, tFold];
}

/** 是否在死點附近(±tolRad) */
export function nearDeadCenter(r2, r3, theta2, e = 0, tolRad = 4 * DEG) {
  const norm = (a) => {
    let x = a % (2 * Math.PI);
    if (x < 0) x += 2 * Math.PI;
    return x;
  };
  const t = norm(theta2);
  return deadCenterAngles(r2, r3, e).some((d) => {
    const dd = Math.abs(norm(d) - t);
    return Math.min(dd, 2 * Math.PI - dd) <= tolRad;
  });
}

/** 引擎關卡預設尺寸(模型 mm):曲柄 15、連桿 50、偏位 0 → 行程 30 */
export const ENGINE_DEFAULT = Object.freeze({ r2: 15, r3: 50, e: 0 });
