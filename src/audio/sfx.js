// Web Audio 即時合成音效,不下載外部檔案。
// 如果 assets/audio/ 裡有使用者提供的同名音檔(例如 ignite.mp3),該音效改用音檔播放。
// 第一次點擊 / 進入 VR 時建立 AudioContext(resumeAudio)。
let ctx = null, master = null, motorNode = null;
let volume = 0.8, muted = false;

// 使用者音檔:assets/audio/<名稱>.(mp3|ogg|wav|m4a);沒有檔案時 glob 為空
const FILES = import.meta.glob('/assets/audio/*.{mp3,ogg,wav,m4a}', { eager: true, query: '?url', import: 'default' });
const fileUrl = Object.fromEntries(Object.entries(FILES).map(([p, url]) => [p.split('/').pop().replace(/\.\w+$/, ''), url]));
const buffers = new Map();

export function initAudio() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain(); master.gain.value = muted ? 0 : volume; master.connect(ctx.destination);
  for (const [name, url] of Object.entries(fileUrl)) {
    fetch(url).then(r => r.arrayBuffer()).then(b => ctx.decodeAudioData(b)).then(buf => buffers.set(name, buf)).catch(() => {});
  }
  return ctx;
}
export function resumeAudio() { initAudio(); if (ctx?.state === 'suspended') ctx.resume(); }
export function applyAudioState(v, m) {
  volume = Math.min(1, Math.max(0, v)); muted = !!m;
  if (master) master.gain.setTargetAtTime(muted ? 0 : volume, ctx.currentTime, 0.05);
}
export const audioFiles = () => Object.keys(fileUrl);

function playFile(name, gain = 1) {
  const buf = buffers.get(name); if (!buf) return false;
  const src = ctx.createBufferSource(), g = ctx.createGain(); src.buffer = buf; g.gain.value = gain;
  src.connect(g).connect(master); src.start(); return true;
}
function env(node, t0, attack, decay, peak = 1) {
  node.gain.setValueAtTime(0.0001, t0);
  node.gain.linearRampToValueAtTime(peak, t0 + attack);
  node.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + decay);
}
function blip(freq, { type = 'sine', attack = 0.004, decay = 0.08, peak = 0.3, bend = 0, at = 0 } = {}) {
  const t0 = ctx.currentTime + at, osc = ctx.createOscillator(), g = ctx.createGain();
  osc.type = type; osc.frequency.setValueAtTime(freq, t0);
  if (bend) osc.frequency.exponentialRampToValueAtTime(Math.max(25, freq + bend), t0 + attack + decay);
  env(g, t0, attack, decay, peak); osc.connect(g).connect(master); osc.start(t0); osc.stop(t0 + attack + decay + 0.05);
}
let noiseBuf = null;
function noise(dur, { peak = 0.2, lp = 2000, hp = 0, at = 0 } = {}) {
  if (!noiseBuf) { noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
  const t0 = ctx.currentTime + at, src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp;
  const g = ctx.createGain(); env(g, t0, 0.003, dur, peak);
  let node = src.connect(f);
  if (hp) { const h = ctx.createBiquadFilter(); h.type = 'highpass'; h.frequency.value = hp; node = node.connect(h); }
  node.connect(g).connect(master); src.start(t0); src.stop(t0 + dur + 0.1);
}

// 具名音效:有同名音檔就播音檔,否則即時合成
const SYNTH = {
  button: () => blip(660, { type: 'triangle', decay: 0.06, peak: 0.16 }),
  grab: () => blip(380, { decay: 0.05, peak: 0.1 }),
  release: () => blip(300, { decay: 0.05, peak: 0.07 }),
  detent: () => blip(1150, { type: 'square', attack: 0.001, decay: 0.025, peak: 0.07 }),          // 旋鈕每格「喀」
  limit: () => { blip(220, { type: 'triangle', decay: 0.12, peak: 0.16 }); blip(185, { type: 'triangle', decay: 0.16, peak: 0.12, at: 0.09 }); }, // 旋鈕卡住提示音
  tooth: () => blip(1500, { type: 'square', attack: 0.001, decay: 0.015, peak: 0.035 }),
  jam: () => { noise(0.08, { peak: 0.2, lp: 900 }); blip(140, { decay: 0.12, peak: 0.18 }); },
  deadCenter: () => { blip(92, { decay: 0.35, peak: 0.3 }); noise(0.12, { peak: 0.07, lp: 300 }); },
  ignite: () => { noise(0.45, { peak: 0.5, lp: 260 }); blip(62, { decay: 0.5, peak: 0.45, bend: -25 }); },        // 低沉的「轟」
  knock: () => { blip(310, { type: 'square', attack: 0.001, decay: 0.05, peak: 0.16 }); blip(290, { type: 'square', attack: 0.001, decay: 0.05, peak: 0.14, at: 0.07 }); noise(0.06, { peak: 0.12, lp: 2500, hp: 600 }); }, // 敲擊聲
  spark: () => { noise(0.02, { peak: 0.16, lp: 8000, hp: 2500 }); blip(2400, { type: 'square', attack: 0.001, decay: 0.012, peak: 0.05 }); }, // 火星塞「答」
  lock: () => { blip(560, { type: 'square', attack: 0.001, decay: 0.04, peak: 0.2 }); blip(270, { decay: 0.09, peak: 0.14 }); },           // 越過中心「喀」
  crush: () => { noise(0.35, { peak: 0.38, lp: 3200, hp: 300 }); blip(180, { type: 'sawtooth', decay: 0.3, peak: 0.12, bend: -90 }); noise(0.12, { peak: 0.2, lp: 6000, hp: 1500, at: 0.18 }); },
  stamp: () => { blip(1320, { decay: 0.4, peak: 0.18 }); blip(1660, { decay: 0.5, peak: 0.1 }); noise(0.04, { peak: 0.08, lp: 3000 }); },
  slip: () => noise(0.25, { peak: 0.09, lp: 1200 }),
  snap: () => { blip(820, { type: 'triangle', decay: 0.05, peak: 0.12 }); noise(0.03, { peak: 0.08, lp: 4000 }); },
  whoosh: () => noise(0.5, { peak: 0.06, lp: 900, hp: 200 }),
};
export const sfx = new Proxy({}, {
  get: (_, name) => (opts) => {
    if (!ctx || muted) return;
    if (playFile(name, opts?.gain)) return;
    SYNTH[name]?.(opts);
  },
});

// ── 連續的馬達聲(轉速 → 音高;吃力 → 變低變粗)──
export function motorStart() {
  if (!ctx || motorNode) return;
  const osc = ctx.createOscillator(), osc2 = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
  osc.type = 'sawtooth'; osc2.type = 'sine'; osc.frequency.value = 70; osc2.frequency.value = 140;
  f.type = 'lowpass'; f.frequency.value = 500; g.gain.value = 0;
  osc.connect(f); osc2.connect(f); f.connect(g).connect(master); osc.start(); osc2.start();
  g.gain.setTargetAtTime(0.05, ctx.currentTime, 0.1);
  motorNode = { osc, osc2, g, f };
}
export function motorSet(speed01, strain01 = 0) {
  if (!motorNode) return;
  const base = 50 + speed01 * 170 - strain01 * 35, t = ctx.currentTime;
  motorNode.osc.frequency.setTargetAtTime(Math.max(28, base), t, 0.08);
  motorNode.osc2.frequency.setTargetAtTime(Math.max(56, base * 2), t, 0.08);
  motorNode.f.frequency.setTargetAtTime(400 + speed01 * 700 + strain01 * 500, t, 0.1);
  motorNode.g.gain.setTargetAtTime(0.04 + strain01 * 0.05, t, 0.1);
}
export function motorStop() {
  if (!motorNode) return;
  const { osc, osc2, g } = motorNode; motorNode = null;
  g.gain.setTargetAtTime(0, ctx.currentTime, 0.08);
  setTimeout(() => { try { osc.stop(); osc2.stop(); } catch { /* 已停止 */ } }, 400);
}
