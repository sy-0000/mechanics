// 四連桿運動學(純數學,不依賴 three)
// 約定:機架 r1 沿 +X,O2 在原點(曲柄軸),O4 在 (r1, 0)(搖桿軸)。
// r2 = 曲柄(輸入)、r3 = 連桿、r4 = 搖桿(輸出)。角度一律弧度,從 +X 逆時針。

export const DEG = Math.PI / 180;

/** Grashof 分類。回傳 {grashof, type, s, l} */
export function grashofType(r1, r2, r3, r4) {
  const links = [
    { len: r1, name: 'ground' },
    { len: r2, name: 'input' },
    { len: r3, name: 'coupler' },
    { len: r4, name: 'output' },
  ];
  const sorted = [...links].sort((a, b) => a.len - b.len);
  const s = sorted[0], l = sorted[3];
  const pq = sorted[1].len + sorted[2].len;
  const grashof = s.len + l.len <= pq;
  let type;
  if (!grashof) type = 'triple-rocker';            // 參搖桿(非葛氏)
  else if (s.name === 'input') type = 'crank-rocker';   // 曲柄搖桿
  else if (s.name === 'ground') type = 'double-crank';  // 雙曲柄
  else if (s.name === 'coupler') type = 'double-rocker'; // 雙搖桿(葛氏)
  else type = 'rocker-crank'; // 最短為輸出桿:輸出可整圈(搖桿曲柄)
  return { grashof, type, s: s.len, l: l.len };
}

/** 給定 θ2 求解位置。branch=+1 開式 / −1 交叉式。
 * 回傳 {ok, A, B, theta3, theta4, mu, d} 或 {ok:false, d}(無法組裝 = 卡住)。 */
export function solve(r1, r2, r3, r4, theta2, branch = 1) {
  const Ax = r2 * Math.cos(theta2);
  const Ay = r2 * Math.sin(theta2);
  const dx = r1 - Ax, dy = -Ay;
  const d = Math.hypot(dx, dy); // A 到 O4
  if (d > r3 + r4 || d < Math.abs(r3 - r4) || d === 0) {
    return { ok: false, d };
  }
  // 圓(A, r3) 與 圓(O4, r4) 交點
  const a = (r3 * r3 - r4 * r4 + d * d) / (2 * d);
  const h2 = r3 * r3 - a * a;
  const h = Math.sqrt(Math.max(0, h2));
  const ux = dx / d, uy = dy / d;
  const Px = Ax + a * ux, Py = Ay + a * uy;
  const Bx = Px - branch * h * uy;
  const By = Py + branch * h * ux;
  const theta3 = Math.atan2(By - Ay, Bx - Ax);
  const theta4 = Math.atan2(By, Bx - r1);
  // 傳動角:連桿與搖桿在 B 點的夾角(餘弦定理,與座標法一致)
  const cosMu = (r3 * r3 + r4 * r4 - d * d) / (2 * r3 * r4);
  const mu = Math.acos(Math.min(1, Math.max(-1, cosMu)));
  return { ok: true, A: { x: Ax, y: Ay }, B: { x: Bx, y: By }, theta3, theta4, mu, d };
}

/** 有效傳動角(取 μ 與 180°−μ 的較小者),弧度 */
export function effectiveMu(mu) {
  return Math.min(mu, Math.PI - mu);
}

/** 曲柄整圈中的最小有效傳動角(極值發生在 θ2 = 0 與 180°) */
export function minTransmissionAngle(r1, r2, r3, r4) {
  const at = (theta2) => {
    const d2 = r1 * r1 + r2 * r2 - 2 * r1 * r2 * Math.cos(theta2);
    const d = Math.sqrt(d2);
    if (d > r3 + r4 || d < Math.abs(r3 - r4)) return -1; // 無法組裝
    const cosMu = (r3 * r3 + r4 * r4 - d2) / (2 * r3 * r4);
    return effectiveMu(Math.acos(Math.min(1, Math.max(-1, cosMu))));
  };
  const m0 = at(0), m180 = at(Math.PI);
  if (m0 < 0 || m180 < 0) return 0;
  return Math.min(m0, m180);
}

/** 搖桿兩個極限位置角 θ41、θ42(曲柄與連桿共線時)與擺動角。
 * 只對曲柄搖桿有意義。回傳弧度 {theta41, theta42, swing}。 */
export function rockerLimits(r1, r2, r3, r4) {
  // 伸直:O2 到 B 距離 = r2 + r3;折疊:|r3 − r2|
  const ang = (reach) => {
    // 三角形 O2–O4–B:邊 r1、r4、reach;求 O4 處內角 γ(對邊 reach)
    const cosG = (r1 * r1 + r4 * r4 - reach * reach) / (2 * r1 * r4);
    if (cosG < -1 || cosG > 1) return null;
    const g = Math.acos(cosG);
    return Math.PI - g; // O4→B 相對 +X 的角(B 在上半面)
  };
  const t1 = ang(r2 + r3);
  const t2 = ang(Math.abs(r3 - r2));
  if (t1 === null || t2 === null) return null;
  return { theta41: t1, theta42: t2, swing: Math.abs(t1 - t2) };
}

/** 曲柄搖桿時固定桿 r1 的可行範圍(解析)。
 * 條件:r2 為最短、葛氏(含等號)、四邊形可組裝。 */
export function crankRockerR1Range(r2, r3, r4) {
  // r2 必須是最短
  if (r2 > r3 || r2 > r4) return null;
  const lo = Math.max(r3, r4) === r4
    ? r2 + r4 - r3  // r4 為最長(r1 ≤ r4 時):s+l ≤ p+q → r2+r4 ≤ r3+r1
    : r2 + r3 - r4;
  const hi = r3 + r4 - r2; // r1 為最長時:r2 + r1 ≤ r3 + r4
  return { min: Math.max(lo, r2), max: hi };
}

/** 掃描 r1,回傳各分類的區間(供測試與教學用) */
export function classifyOverR1(r2, r3, r4, r1Min, r1Max, step = 0.001) {
  const out = [];
  let cur = null;
  for (let r1 = r1Min; r1 <= r1Max + 1e-12; r1 += step) {
    // 可組裝性:四邊形不等式
    const sides = [r1, r2, r3, r4].sort((a, b) => a - b);
    const feasible = sides[3] < sides[0] + sides[1] + sides[2];
    const t = feasible ? grashofType(r1, r2, r3, r4).type : 'infeasible';
    if (!cur || cur.type !== t) {
      if (cur) out.push(cur);
      cur = { type: t, from: r1, to: r1 };
    } else cur.to = r1;
  }
  if (cur) out.push(cur);
  return out;
}

/** 搜尋雨刷預設尺寸:葛氏曲柄搖桿、擺角 80–100°、最小傳動角 ≥ 40°。
 * 回傳 {r1,r2,r3,r4,swingDeg,muMinDeg,score} 取 μmin 最大者。單位:模型 mm。 */
export function searchDefaultDimensions() {
  let best = null;
  for (let r2 = 20; r2 <= 40; r2 += 2) {
    for (let r4 = 30; r4 <= 90; r4 += 2) {
      for (let r3 = 40; r3 <= 130; r3 += 2) {
        for (let r1 = 40; r1 <= 130; r1 += 2) {
          const g = grashofType(r1, r2, r3, r4);
          if (g.type !== 'crank-rocker') continue;
          // 避開變換點(等號邊界),留 2mm 裕度
          if (g.s + g.l > r1 + r2 + r3 + r4 - g.s - g.l - 2) continue;
          const lim = rockerLimits(r1, r2, r3, r4);
          if (!lim) continue;
          const swingDeg = lim.swing / DEG;
          if (swingDeg < 80 || swingDeg > 100) continue;
          const muMinDeg = minTransmissionAngle(r1, r2, r3, r4) / DEG;
          if (muMinDeg < 40) continue;
          const score = muMinDeg + Math.min(swingDeg - 80, 100 - swingDeg) * 0.1;
          if (!best || score > best.score) {
            best = { r1, r2, r3, r4, swingDeg, muMinDeg, score };
          }
        }
      }
    }
  }
  return best;
}

/** 雨刷關卡預設尺寸(由 searchDefaultDimensions() 求得,見 docs/decisions.md)
 * 曲柄搖桿;擺角 88.16°;最小傳動角 43.65°。單位:模型 mm。 */
export const WIPER_DEFAULT = Object.freeze({ r1: 130, r2: 32, r3: 126, r4: 46 });
