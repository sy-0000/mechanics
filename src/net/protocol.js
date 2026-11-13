// 訊息協定(Worker 與前端共用)。純 JS,無相依。

export const PROTOCOL_VERSION = 1;
export const MAX_MESSAGE_BYTES = 4096;
export const MAX_NAME_LEN = 12;
export const RATE_LIMIT_PER_SEC = 10;
export const HEARTBEAT_MS = 15000;

export const LEVELS = ['wiper', 'sliderCrank', 'gearBasics', 'gearApps'];
export const BONUS_LEVEL = 'toggleClamp';
export const MODES = ['free', 'follow', 'pause'];

/** 名字清理:去除 HTML 與控制字元,最長 12 字 */
export function sanitizeName(raw) {
  if (typeof raw !== 'string') return '';
  const noTags = raw.replace(/<[^>]*>/g, '').replace(/[<>&"'`]/g, '');
  // eslint-disable-next-line no-control-regex
  const noCtrl = noTags.replace(/[\u0000-\u001f\u007f]/g, '');
  return [...noCtrl.trim()].slice(0, MAX_NAME_LEN).join('');
}

/** 編碼:加上 t 與 v,回傳 JSON 字串;超過 4KB 丟出錯誤 */
export function encode(t, payload = {}) {
  const s = JSON.stringify({ t, v: PROTOCOL_VERSION, ...payload });
  if (byteLength(s) > MAX_MESSAGE_BYTES) {
    throw new Error('message too large');
  }
  return s;
}

/** 解碼:回傳 {ok, msg} 或 {ok:false, error}。過大或非 JSON 都拒絕。 */
export function decode(raw) {
  if (typeof raw !== 'string') return { ok: false, error: 'not a string' };
  if (byteLength(raw) > MAX_MESSAGE_BYTES) return { ok: false, error: 'too large' };
  let msg;
  try {
    msg = JSON.parse(raw);
  } catch {
    return { ok: false, error: 'bad json' };
  }
  if (!msg || typeof msg !== 'object' || typeof msg.t !== 'string') {
    return { ok: false, error: 'bad shape' };
  }
  if (msg.v !== PROTOCOL_VERSION) return { ok: false, error: 'bad version' };
  return { ok: true, msg };
}

export function byteLength(s) {
  return new TextEncoder().encode(s).length;
}

/** 簡單令牌桶:每秒 RATE_LIMIT_PER_SEC 則 */
export class RateLimiter {
  constructor(perSec = RATE_LIMIT_PER_SEC) {
    this.perSec = perSec;
    this.tokens = perSec;
    this.last = 0;
  }
  /** now 毫秒。回傳 true = 允許 */
  allow(now) {
    const dt = Math.max(0, now - this.last) / 1000;
    this.last = now;
    this.tokens = Math.min(this.perSec, this.tokens + dt * this.perSec);
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }
    return false;
  }
}

// ── 訊息建構 ───────────────────────────────────────────
export const student = {
  hello: (clientId, name) => encode('hello', { clientId, name: sanitizeName(name) }),
  progress: (level, stage, badges) => encode('progress', { level, stage, badges }),
  ping: () => encode('ping'),
};

export const teacher = {
  hello: (pin) => encode('hello', { pin }),
  cmd: (cmd) => encode('cmd', cmd),
  rename: (clientId, name) => encode('rename', { clientId, name: sanitizeName(name) }),
  recenter: (target) => encode('recenter', { target }),
  clear: () => encode('clear'),
  export: () => encode('export'),
};

export const server = {
  state: (s) => encode('state', s),
  roster: (list) => encode('roster', { roster: list }),
  export: (csv) => encode('export', { csv }),
  error: (reason) => encode('error', { reason }),
};

/** 預設房間狀態 */
export function defaultState() {
  return {
    mode: 'free',
    level: 'wiper',
    stage: 0,
    scroll: { open: false, page: 0 },
    blueprint: false,
    volume: 0.8,
    muted: false,
    seq: 0,
  };
}
