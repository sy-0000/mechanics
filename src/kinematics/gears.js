// 正齒輪(漸開線)運動學與齒形。純數學。
// 單位:模型 mm。壓力角 20°。

export const DEG = Math.PI / 180;
export const PRESSURE_ANGLE = 20 * DEG;

/** 節圓直徑 d = m z */
export function pitchDiameter(m, z) { return m * z; }
/** 節圓半徑 */
export function pitchRadius(m, z) { return (m * z) / 2; }
/** 中心距 a = m (zA + zB) / 2 */
export function centerDistance(m, zA, zB) { return (m * (zA + zB)) / 2; }
/** 轉速比:B 的角速度 = A 的角速度 × zA/zB(外嚙合反向) */
export function speedRatio(zA, zB) { return zA / zB; }
/** 力矩比:τB / τA = zB / zA(不計損失) */
export function torqueRatio(zA, zB) { return zB / zA; }
/** 接觸點(節點)線速度 v = r ω */
export function pitchLineSpeed(m, z, omega) { return pitchRadius(m, z) * omega; }

/** 漸開線函數 inv(x) = tan x − x */
export function involute(x) { return Math.tan(x) - x; }

/**
 * 產生整個齒輪的齒形多邊形(局部座標,齒 0 的中心線沿 +X)。
 * backlash 為節圓上的圓周背隙(mm),雙側平分。
 * 回傳 [[x,y], ...](逆時針)。
 */
export function gearProfile(m, z, {
  backlash = 0.08 * m,
  flankSteps = 8,
  tipSteps = 3,
  rootSteps = 3,
  alpha = PRESSURE_ANGLE,
} = {}) {
  const r = (m * z) / 2;
  const rb = r * Math.cos(alpha);
  const ra = r + m;             // 齒頂圓
  const rf = Math.max(r - 1.25 * m, 0.2 * r); // 齒根圓
  const halfP = (Math.PI * m / 2 - backlash) / (2 * r); // 節圓上半齒厚角
  const invA = involute(alpha);
  // 漸開線上半徑 R 處相對齒中心線的極角
  const flankAngle = (R) => {
    const phi = Math.acos(Math.min(1, rb / R));
    return halfP + invA - involute(phi);
  };
  const pitchAng = (2 * Math.PI) / z;
  const pts = [];
  const rStart = Math.max(rf, rb);
  for (let k = 0; k < z; k++) {
    const c = k * pitchAng; // 齒中心
    // 齒根弧(從前一齒的齒間中心到本齒左側根部)
    const rootFrom = c - pitchAng / 2;
    const rootTo = c - flankAngle(rStart);
    for (let i = 0; i <= rootSteps; i++) {
      const a = rootFrom + ((rootTo - rootFrom) * i) / rootSteps;
      pts.push([rf * Math.cos(a), rf * Math.sin(a)]);
    }
    // 左側齒腹(由根到頂;極角為 c − flankAngle(R))
    for (let i = 0; i <= flankSteps; i++) {
      const R = rStart + ((ra - rStart) * i) / flankSteps;
      const a = c - flankAngle(R);
      pts.push([R * Math.cos(a), R * Math.sin(a)]);
    }
    // 齒頂弧
    const tipFrom = c - flankAngle(ra);
    const tipTo = c + flankAngle(ra);
    for (let i = 1; i < tipSteps; i++) {
      const a = tipFrom + ((tipTo - tipFrom) * i) / tipSteps;
      pts.push([ra * Math.cos(a), ra * Math.sin(a)]);
    }
    // 右側齒腹(由頂到根)
    for (let i = flankSteps; i >= 0; i--) {
      const R = rStart + ((ra - rStart) * i) / flankSteps;
      const a = c + flankAngle(R);
      pts.push([R * Math.cos(a), R * Math.sin(a)]);
    }
    // 若 rb > rf,補一點回到齒根圓
    if (rStart > rf + 1e-9) {
      const a = c + flankAngle(rStart);
      pts.push([rf * Math.cos(a), rf * Math.sin(a)]);
    }
  }
  return pts;
}

/**
 * 嚙合相位:A 在原點(齒 0 中心線在 θA=0 時指向 +X,即指向 B),
 * B 在 (a, 0)。回傳 B 的角度,使齒正確互嵌:
 * θB = π + π/zB − (zA/zB)·θA + phase
 */
export function meshAngle(zA, zB, thetaA, phase = 0) {
  return Math.PI + Math.PI / zB - (zA / zB) * thetaA + phase;
}

/** 同軸複合齒輪:同一根軸上的兩個齒輪角度相同(相位差固定為安裝相位) */
export function compoundAngle(thetaShaft, mountPhase = 0) {
  return thetaShaft + mountPhase;
}

/** 多級輪系總比:stages = [{driver, driven}, ...];回傳 輸出轉速/輸入轉速 */
export function trainSpeedRatio(stages) {
  return stages.reduce((acc, s) => acc * (s.driver / s.driven), 1);
}

/** 把多邊形旋轉 + 平移到世界座標 */
export function transformPolygon(pts, theta, tx = 0, ty = 0) {
  const c = Math.cos(theta), s = Math.sin(theta);
  return pts.map(([x, y]) => [c * x - s * y + tx, s * x + c * y + ty]);
}

/** 射線法:點是否在多邊形內 */
export function pointInPolygon(p, poly) {
  let inside = false;
  const [px, py] = p;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if ((yi > py) !== (yj > py) &&
        px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/** 點到多邊形邊界的最短距離 */
export function distToPolygon(p, poly) {
  let best = Infinity;
  const [px, py] = p;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [x1, y1] = poly[j];
    const [x2, y2] = poly[i];
    const dx = x2 - x1, dy = y2 - y1;
    const L2 = dx * dx + dy * dy || 1e-12;
    let t = ((px - x1) * dx + (py - y1) * dy) / L2;
    t = Math.min(1, Math.max(0, t));
    const qx = x1 + t * dx, qy = y1 + t * dy;
    best = Math.min(best, Math.hypot(px - qx, py - qy));
  }
  return best;
}

/** 多邊形面積(鞋帶公式,取絕對值) */
export function polygonArea(poly) {
  let a = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    a += poly[j][0] * poly[i][1] - poly[i][0] * poly[j][1];
  }
  return Math.abs(a) / 2;
}

/**
 * 估計兩齒輪齒形的相交面積:沿 A 邊界取樣,落在 B 內的點以
 * 穿透深度 × 邊界弧長 估計面積(上界近似)。
 */
export function overlapAreaEstimate(polyA, polyB) {
  let area = 0;
  const n = polyA.length;
  for (let i = 0; i < n; i++) {
    const p = polyA[i];
    const q = polyA[(i + 1) % n];
    if (pointInPolygon(p, polyB)) {
      const depth = distToPolygon(p, polyB);
      const ds = Math.hypot(q[0] - p[0], q[1] - p[1]);
      area += depth * ds;
    }
  }
  return area;
}

/** 單一齒的面積估計:齒形多邊形面積 − 齒根圓面積,除以齒數 */
export function toothArea(m, z, opts) {
  const poly = gearProfile(m, z, opts);
  const rf = Math.max((m * z) / 2 - 1.25 * m, 0.2 * ((m * z) / 2));
  const total = polygonArea(poly) - Math.PI * rf * rf;
  return Math.max(total / z, 1e-9);
}

/** 背隙造成的從動輪遲滯(弧度):反轉時從動輪先停 j 角再動 */
export function backlashAngle(m, z, backlashMm) {
  return backlashMm / pitchRadius(m, z);
}
