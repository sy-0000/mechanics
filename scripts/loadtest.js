#!/usr/bin/env node
// 同步壓力測試:模擬 20 位學生連線、心跳與隨機徽章,
// 並以老師身分確認名冊人數和廣播延遲。
// 用法:npm run loadtest -- --url wss://xxx.workers.dev --room demo [--pin 1234] [--n 20]
import WebSocket from 'ws';

const args = Object.fromEntries(
  process.argv.slice(2).join(' ').split('--').filter(Boolean)
    .map((s) => { const [k, ...v] = s.trim().split(/\s+/); return [k, v.join(' ') || true]; }),
);
const BASE = (args.url || 'ws://localhost:8787').replace(/^http/, 'ws').replace(/\/$/, '');
const ROOM = args.room || 'loadtest';
const PIN = args.pin || process.env.TEACHER_PIN || '';
const N = Number(args.n) || 20;

const BADGE_IDS = ['wiper-engineer', 'grashof-detective', 'engine-ignite', 'deadpoint-hunter',
  'lock-master', 'strongman', 'tradeoff', 'gear-shifter', 'clockmaker'];
const LEVELS = ['wiper', 'engine', 'gears', 'bike', 'clock', 'driver'];
const V = 1;
const enc = (t, p = {}) => JSON.stringify({ t, v: V, ...p });

let rosterCount = 0;
let lastCmdSentAt = 0;
const latencies = [];
const students = [];
let fails = 0;

function studentClient(i) {
  const ws = new WebSocket(`${BASE}/ws?room=${ROOM}&role=student`);
  const badges = [];
  const client = { ws, i, states: 0 };
  ws.on('open', () => {
    ws.send(enc('hello', { clientId: `load-${i}`, name: `學生${i + 1}` }));
    client.hb = setInterval(() => ws.send(enc('ping')), 15000);
    client.act = setInterval(() => {
      if (Math.random() < 0.4 && badges.length < BADGE_IDS.length) {
        badges.push(BADGE_IDS[badges.length]);
      }
      ws.send(enc('progress', {
        level: LEVELS[Math.floor(Math.random() * LEVELS.length)],
        stage: Math.floor(Math.random() * 3),
        badges,
      }));
    }, 3000 + Math.random() * 4000);
  });
  ws.on('message', (data) => {
    const msg = JSON.parse(data);
    if (msg.t === 'state') {
      client.states++;
      if (lastCmdSentAt) latencies.push(Date.now() - lastCmdSentAt);
    }
  });
  ws.on('error', (e) => { fails++; console.error(`學生${i} 錯誤`, e.message); });
  students.push(client);
}

function teacherClient() {
  const ws = new WebSocket(`${BASE}/ws?room=${ROOM}&role=teacher`);
  ws.on('open', () => ws.send(enc('hello', { pin: PIN })));
  ws.on('message', (data) => {
    const msg = JSON.parse(data);
    if (msg.t === 'roster') rosterCount = msg.roster.length;
    if (msg.t === 'error') { console.error('老師登入失敗:', msg.reason, '(用 --pin 提供 PIN)'); }
  });
  // 每 5 秒廣播一個指令,量延遲
  setInterval(() => {
    lastCmdSentAt = Date.now();
    ws.send(enc('cmd', { mode: 'follow', level: LEVELS[Math.floor(Math.random() * 4)], stage: 0 }));
  }, 5000);
  return ws;
}

console.log(`連線 ${BASE} 房間 ${ROOM}:${N} 位學生 + 1 位老師,跑 30 秒…`);
for (let i = 0; i < N; i++) setTimeout(() => studentClient(i), i * 120);
const tws = PIN ? teacherClient() : (console.log('未提供 PIN,略過老師端'), null);

setTimeout(() => {
  const stateCounts = students.map((s) => s.states);
  const got = stateCounts.filter((c) => c > 0).length;
  latencies.sort((a, b) => a - b);
  const p = (q) => latencies[Math.floor(latencies.length * q)] ?? '-';
  console.log('── 結果 ──');
  console.log(`學生連線成功:${students.length - fails}/${N}(錯誤 ${fails})`);
  console.log(`收到老師廣播的學生:${got}/${N}`);
  console.log(`名冊人數(老師視角):${rosterCount}`);
  console.log(`廣播延遲 ms:p50=${p(0.5)} p90=${p(0.9)} max=${latencies[latencies.length - 1] ?? '-'}(樣本 ${latencies.length})`);
  const ok = fails === 0 && (!PIN || (rosterCount >= N && got === N));
  console.log(ok ? '✓ 通過' : '✗ 未達標');
  for (const s of students) { clearInterval(s.hb); clearInterval(s.act); s.ws.close(); }
  tws?.close();
  process.exit(ok ? 0 : 1);
}, 30000);
