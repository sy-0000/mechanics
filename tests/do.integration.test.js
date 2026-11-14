// Durable Object 整合測試:需要 `npm run preview:worker`(wrangler dev)在
// localhost:8787 執行,且 .dev.vars 設 TEACHER_PIN=test1234。
// 伺服器不在時整組跳過(CI 無 wrangler 的情況)。
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import WebSocket from 'ws';

const BASE = process.env.DO_URL || 'ws://localhost:8787';
const PIN = process.env.DO_PIN || 'test1234';
const room = `t${Date.now().toString(36)}`;

let serverUp = false;
try {
  const res = await fetch(BASE.replace(/^ws/, 'http'), { signal: AbortSignal.timeout(2000) });
  serverUp = res.status < 600;
} catch { serverUp = false; }

const V = 1;
const enc = (t, p = {}) => JSON.stringify({ t, v: V, ...p });

function connect(role) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`${BASE}/ws?room=${room}&role=${role}`);
    const msgs = [];
    const waiters = [];
    ws.on('message', (d) => {
      const m = JSON.parse(d);
      msgs.push(m);
      for (let i = waiters.length - 1; i >= 0; i--) {
        if (waiters[i].pred(m)) { waiters[i].resolve(m); waiters.splice(i, 1); }
      }
    });
    ws.on('open', () => resolve({
      ws,
      msgs,
      send: (s) => ws.send(s),
      next: (pred, ms = 4000) => new Promise((res, rej) => {
        const hit = msgs.find(pred);
        if (hit) return res(hit);
        const timer = setTimeout(() => rej(new Error('timeout waiting message')), ms);
        waiters.push({ pred, resolve: (m) => { clearTimeout(timer); res(m); } });
      }),
      closed: new Promise((res) => ws.on('close', (code) => res(code))),
    }));
    ws.on('error', reject);
  });
}

describe.skipIf(!serverUp)('Durable Object(wrangler dev)', () => {
  let teacher, s1, s2;

  beforeAll(async () => {
    s1 = await connect('student');
    s1.send(enc('hello', { clientId: 'it-c1', name: '小明' }));
    s2 = await connect('student');
    s2.send(enc('hello', { clientId: 'it-c2', name: '小華' }));
    teacher = await connect('teacher');
    teacher.send(enc('hello', { pin: PIN }));
    await teacher.next((m) => m.t === 'roster');
  });

  afterAll(() => {
    for (const c of [teacher, s1, s2]) c?.ws.close();
  });

  it('學生 hello 後收到 state', async () => {
    const st = await s1.next((m) => m.t === 'state');
    expect(st.mode).toBe('free');
  });

  it('PIN 錯誤拒絕並關閉連線', async () => {
    const bad = await connect('teacher');
    bad.send(enc('hello', { pin: 'wrong' }));
    const code = await bad.closed;
    expect(code).toBe(4001);
  });

  it('老師指令廣播到所有學生', async () => {
    teacher.send(enc('cmd', { mode: 'follow', level: 'gears', stage: 1 }));
    const [a, b] = await Promise.all([
      s1.next((m) => m.t === 'state' && m.mode === 'follow'),
      s2.next((m) => m.t === 'state' && m.mode === 'follow'),
    ]);
    expect(a.level).toBe('gears');
    expect(b.stage).toBe(1);
  });

  it('名冊包含兩位學生,progress 更新徽章', async () => {
    s1.send(enc('progress', { level: 'wiper', stage: 2, badges: ['wiper-engineer'] }));
    const r = await teacher.next((m) => m.t === 'roster'
      && m.roster.some((x) => x.clientId === 'it-c1' && x.badges.length === 1));
    const names = r.roster.map((x) => x.name);
    expect(names).toContain('小明');
    expect(names).toContain('小華');
  });

  it('rename 與 export CSV', async () => {
    teacher.send(enc('rename', { clientId: 'it-c2', name: '<b>阿華</b>' }));
    await teacher.next((m) => m.t === 'roster' && m.roster.some((x) => x.name === '阿華'));
    teacher.send(enc('export'));
    const ex = await teacher.next((m) => m.t === 'export');
    expect(ex.csv).toContain('阿華');
    expect(ex.csv.startsWith('name,level,stage,badges,online')).toBe(true);
  });

  it('recenter 廣播給學生', async () => {
    teacher.send(enc('recenter', { target: 'all' }));
    await s1.next((m) => m.t === 'recenter');
    await s2.next((m) => m.t === 'recenter');
  });

  it('清除資料:名冊歸零、狀態還原', async () => {
    teacher.send(enc('clear'));
    const r = await teacher.next((m) => m.t === 'roster' && m.roster.length === 0);
    expect(r.roster.length).toBe(0);
    const st = await s1.next((m) => m.t === 'state' && m.mode === 'free');
    expect(st.level).toBe('wiper');
  });
});

if (!serverUp) {
  describe('Durable Object(wrangler dev)', () => {
    it.skip('伺服器未啟動,整組跳過(docs/progress.md 有說明)', () => {});
  });
}
