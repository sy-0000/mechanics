// 肘節夾鉗運動學。純數學。
// 模型:兩根連桿近乎共線時,β 為連桿偏離作用線的夾角。
// 夾緊力 ≈ 手的力 ÷ (2 tan β) × 握把槓桿比。

export const DEG = Math.PI / 180;

/** 握把行程 h ∈ [0,1] → β(弧度)。h=0 張開(β=β0),h=1 全壓(β=βLock<0,過中心)。 */
export function betaFromHandle(h, beta0 = 35 * DEG, betaLock = -3 * DEG) {
  const c = Math.min(1, Math.max(0, h));
  return beta0 + (betaLock - beta0) * c;
}

/** 過中心即鎖死(β < 0) */
export function isLocked(beta) {
  return beta < 0;
}

/** 連桿端的力放大倍率 1/(2 tanβ)。β→0 時趨近無限大;β≤0 回傳 Infinity(已鎖死,靠止擋承力)。 */
export function linkAmplification(beta) {
  if (beta <= 0) return Infinity;
  return 1 / (2 * Math.tan(beta));
}

/** 含握把槓桿的總放大倍率:F_clamp ≈ F_hand × (L_handle / L_link) × 1/(2 tanβ) */
export function clampForceRatio(beta, handleLever = 3) {
  const a = linkAmplification(beta);
  return a === Infinity ? Infinity : a * handleLever;
}

/** 橡膠塊壓縮量(0–1):由 β 的幾何決定,β 越小壓得越扁。
 * 夾臂端位移 ∝ (cosβ − cosβ0) 正規化。 */
export function rubberCompression(beta, beta0 = 35 * DEG, betaLock = -3 * DEG) {
  const c0 = Math.cos(beta0);
  const span = Math.cos(0) - c0; // β=0 時最大壓縮(過中心後止擋維持)
  const c = (Math.cos(Math.min(beta, 0) === beta ? 0 : beta) - c0) / span;
  // 過中心後保持最大壓縮(止擋)
  return Math.min(1, Math.max(0, beta <= 0 ? 1 : (Math.cos(beta) - c0) / span));
}

/** 放手後是否彈開:沒過中心(β>0)就彈開 */
export function springsBack(beta) {
  return beta > 0;
}

export const CLAMP_DEFAULT = Object.freeze({
  beta0: 35 * DEG,
  betaLock: -3 * DEG,
  handleLever: 3,
});
