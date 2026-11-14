// 手把震動。手部追蹤沒有震動硬體,所以每個震動事件都同時有畫面與聲音回饋(由教具負責)。
// 同一種震動至少間隔 25 ms。
const PATTERNS = {
  grab: [0.35, 20], button: [0.5, 25], detent: [0.3, 18], tooth: [0.12, 10],
  deadCenter: [1.0, 120], deadHum: [0.55, 40], ignite: [0.9, 90], knock: [0.7, 60],
  lock: [0.9, 60], jam: [0.6, 80], crush: [1.0, 160], stamp: [0.35, 40], limit: [0.5, 50],
};

export function createHaptics(renderer) {
  const last = new Map();
  /** hand:0 / 1 / 'both';kind:PATTERNS 的鍵;scale:強度倍率。 */
  function pulse(hand, kind, scale = 1) {
    const p = PATTERNS[kind]; if (!p) return;
    const key = `${hand}:${kind}`, now = performance.now();
    if (now - (last.get(key) ?? 0) < 25) return;
    last.set(key, now);
    const session = renderer?.xr?.getSession?.(); if (!session) return;
    let i = 0;
    for (const src of session.inputSources) {
      const act = src.gamepad?.hapticActuators?.[0];
      if ((hand === 'both' || hand === i) && act) { try { act.pulse(Math.min(1, p[0] * scale), p[1]); } catch { /* 不支援 */ } }
      i++;
    }
  }
  return { pulse };
}
