// 手把震動(手勢模式無硬體,靜默略過)。同一種震動至少間隔 25ms。
const PATTERNS = {
  grab: { intensity: 0.4, duration: 20 },
  button: { intensity: 0.5, duration: 25 },
  tooth: { intensity: 0.15, duration: 10 },
  deadCenter: { intensity: 1.0, duration: 120 },
  lock: { intensity: 0.9, duration: 60 },
  jam: { intensity: 0.6, duration: 80 },
  stamp: { intensity: 0.35, duration: 40 },
  detent: { intensity: 0.3, duration: 18 },
};

export function createHaptics(renderer) {
  const last = new Map(); // `${hand}:${kind}` → time
  function pulse(hand, kind) {
    const p = PATTERNS[kind];
    if (!p) return;
    const key = `${hand}:${kind}`;
    const now = performance.now();
    if (now - (last.get(key) || 0) < 25) return; // 25ms 節流
    last.set(key, now);
    const session = renderer?.xr?.getSession?.();
    if (!session) return;
    const sources = session.inputSources;
    let i = 0;
    for (const src of sources) {
      if ((hand === 'both' || i === hand) && src.gamepad?.hapticActuators?.[0]) {
        try { src.gamepad.hapticActuators[0].pulse(p.intensity, p.duration); } catch { /* 不支援 */ }
      }
      i++;
    }
  }
  return { pulse };
}
