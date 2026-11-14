// 所有任務判定門檻集中在這裡,方便之後調整(整合提示詞第 3 節「共通規則」)。
// 長度單位:公分;角度:度;時間:秒。

export const THRESHOLDS = Object.freeze({
  wiper: {
    // 四根桿的旋鈕範圍(每格 1 cm)
    ranges: { d: [8, 20], a: [3, 12], b: [8, 24], c: [5, 20] },
    // 預設尺寸搜尋條件:曲柄搖桿、擺動角 80°–90°、最小傳動角 ≥ 35°
    swingMin: 80, swingMax: 90, muMin: 35,
    fallback: { d: 18, a: 7, b: 17, c: 10 },
    coverage: 0.9,              // 「手動刷乾淨」「設計雨刷」的覆蓋率門檻
    // 玻璃目標區(雨刷臂的角度,0° = 水平向右,90° = 正上方)
    glassNarrow: [52, 128],     // 一般玻璃:76° 寬
    glassWide: [32, 148],       // 更寬的玻璃:116° 寬(預設尺寸刷不滿,必須重新設計)
    singular: 0.025,            // 變點機構:連桿與搖桿幾乎共線(sin 夾角 < 此值)時卡住
  },
  engine: {
    crank: 5, rod: 15,          // cm,行程 10 cm
    good: [0, 30],              // 點火在上死點後 0°–30°:推力最大
    early: [-40, 0],            // 太早:反推
    late: [30, 90],             // 太晚:推力很小
    kickGood: 2.2, kickLate: 0.6, kickEarly: -1.6, // 飛輪角速度變化(rad/s)
    maxOmega: 5.0,              // 飛輪角速度上限(rad/s)
    friction: 0.33,             // 黏滯摩擦(1/s)
    drag: 0.18,                 // 固定摩擦(rad/s²)
    runOmega: 0.8,              // 低於這個角速度就算「停了」(rad/s)
    runRevs: 10,                // 「發動引擎」:連續轉 10 圈不停
    deadTol: 5,                 // 「找到死點」:死點 ±5°
    deadHold: 1,                // 維持 1 秒
    stillOmega: 0.25,           // 「停在」:角速度低於此值(rad/s)
    strokeTol: 0.5,             // 「量行程」:誤差 ±0.5 cm
  },
  crusher: {
    crushBeta: 6,               // 連桿角 β ≤ 6° 才壓得扁
    lever: 2.5,                 // 握把槓桿比(握把長 ÷ 連桿長)
    cans: 3,                    // 「壓罐高手」:壓扁三個
    beta0: 38, betaLock: -3,    // 握把全開 / 越過中心後的止擋角
  },
  gears: {
    module: 4,                  // mm,所有齒輪同一模數
    tray: [10, 15, 20, 30, 40],
    liftRatio: 3,               // 減速比 ≥ 3 才拉得動重物
    fanBest: [40, 10],          // 「風扇最快」答案:A 40 齒帶 B 10 齒
    oneTwo: 2,                  // 「一圈變兩圈」:z_A ÷ z_B = 2
    turnsForOneTwo: 1,          // A 至少轉 1 圈
  },
  bike: {
    front: [34, 50], rear: [14, 21, 28],
    climbMaxRatio: 1.3,         // 爬坡模式:齒數比 ≤ 1.3 踏板才轉得動
    circumference: 2.1,         // 輪子周長(m,教材數字)
    pedalRevs: 1,               // 踏滿一圈才算
  },
  clock: {
    pairs: [[30, 30], [20, 40], [15, 45], [12, 48], [10, 50]],
    total: 12,                  // 分針 12 圈 = 時針 1 圈
    hourTurns: 1,
  },
  driver: {
    motorRpm: 1200, stages: [[10, 50], [12, 48]],
    screwTurns: 6,              // 螺絲鎖進木塊需要的輸出圈數(動畫)
  },
});
