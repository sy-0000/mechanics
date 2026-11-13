// Web Audio 合成音效(無外部音檔)。第一次點擊/進 VR 時建立 AudioContext。
let ctx = null;
let master = null;
let motorNode = null;

export function initAudio() {
  if (ctx) return ctx;
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  master = ctx.createGain();
  master.gain.value = 0.8;
  master.connect(ctx.destination);
  return ctx;
}
export function resumeAudio() {
  initAudio();
  if (ctx.state === 'suspended') ctx.resume();
}
export function setVolume(v) { if (master) master.gain.value = Math.min(1, Math.max(0, v)); }
export function setMuted(m) { if (master) master.gain.value = m ? 0 : 0.8; }
let volume = 0.8, muted = false;
export function applyAudioState(v, m) {
  volume = v; muted = m;
  if (master) master.gain.setTargetAtTime(muted ? 0 : volume, ctx.currentTime, 0.05);
}

function env(node, t0, attack, decay, peak = 1) {
  node.gain.setValueAtTime(0, t0);
  node.gain.linearRampToValueAtTime(peak, t0 + attack);
  node.gain.exponentialRampToValueAtTime(0.001, t0 + attack + decay);
}

function blip(freq, { type = 'sine', attack = 0.004, decay = 0.08, peak = 0.3, bend = 0 } = {}) {
  if (!ctx) return;
  const t0 = ctx.currentTime;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (bend) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + bend), t0 + attack + decay);
  env(g, t0, attack, decay, peak);
  osc.connect(g).connect(master);
  osc.start(t0);
  osc.stop(t0 + attack + decay + 0.02);
}

function noise(dur, { peak = 0.2, lp = 2000 } = {}) {
  if (!ctx) return;
  const t0 = ctx.currentTime;
  const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = lp;
  const g = ctx.createGain();
  env(g, t0, 0.003, dur, peak);
  src.connect(f).connect(g).connect(master);
  src.start(t0);
}

// ── 具名音效 ──
export const sfx = {
  button: () => blip(660, { type: 'triangle', decay: 0.06, peak: 0.18 }),
  grab: () => blip(380, { type: 'sine', decay: 0.05, peak: 0.12 }),
  release: () => blip(300, { type: 'sine', decay: 0.05, peak: 0.08 }),
  toothClick: () => blip(1400, { type: 'square', attack: 0.001, decay: 0.018, peak: 0.045 }),
  detent: () => blip(900, { type: 'square', attack: 0.002, decay: 0.03, peak: 0.1 }),
  deadCenter: () => { blip(95, { type: 'sine', decay: 0.3, peak: 0.3 }); noise(0.12, { peak: 0.08, lp: 300 }); },
  lock: () => { blip(520, { type: 'square', attack: 0.001, decay: 0.05, peak: 0.22 }); blip(260, { decay: 0.1, peak: 0.15 }); },
  jam: () => { noise(0.08, { peak: 0.22, lp: 900 }); blip(140, { type: 'sine', decay: 0.12, peak: 0.2 }); },
  stamp: () => {
    blip(1320, { type: 'sine', decay: 0.4, peak: 0.2 });
    blip(1660, { type: 'sine', decay: 0.5, peak: 0.12 });
    noise(0.05, { peak: 0.1, lp: 3000 });
  },
  springBack: () => blip(500, { type: 'triangle', decay: 0.12, peak: 0.12, bend: -300 }),
  slip: () => noise(0.25, { peak: 0.1, lp: 1200 }),
};

// ── 馬達運轉聲(連續;轉速→音高,吃力→變低+粗)──
export function motorStart() {
  if (!ctx || motorNode) return;
  const osc = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = 'sawtooth';
  osc2.type = 'sine';
  osc.frequency.value = 70;
  osc2.frequency.value = 140;
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = 500;
  g.gain.value = 0;
  osc.connect(f);
  osc2.connect(f);
  f.connect(g).connect(master);
  osc.start(); osc2.start();
  g.gain.setTargetAtTime(0.06, ctx.currentTime, 0.1);
  motorNode = { osc, osc2, g, f };
}
export function motorSet(speed01, strain01 = 0) {
  if (!motorNode) return;
  const base = 50 + speed01 * 160 - strain01 * 35;
  motorNode.osc.frequency.setTargetAtTime(Math.max(28, base), ctx.currentTime, 0.08);
  motorNode.osc2.frequency.setTargetAtTime(Math.max(56, base * 2), ctx.currentTime, 0.08);
  motorNode.f.frequency.setTargetAtTime(400 + speed01 * 700 + strain01 * 500, ctx.currentTime, 0.1);
  motorNode.g.gain.setTargetAtTime(0.05 + strain01 * 0.06, ctx.currentTime, 0.1);
}
export function motorStop() {
  if (!motorNode) return;
  const { osc, osc2, g } = motorNode;
  g.gain.setTargetAtTime(0, ctx.currentTime, 0.1);
  setTimeout(() => { try { osc.stop(); osc2.stop(); } catch { /* 已停止 */ } }, 400);
  motorNode = null;
}
