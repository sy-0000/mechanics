// 老師控場頁(DOM 介面)。
import { decode, teacher, ALL_AIDS } from '../net/protocol.js';
import { BADGES } from '../teach/missions.js';

const LEVEL_LABELS = { wiper: '雨刷', engine: '引擎', gears: '齒輪', bike: '腳踏車', clock: '時鐘', driver: '電動起子', crusher: '壓罐機(彩蛋)' };
// 老師帶的步驟(stage 編號與教具模組一致)
const STAGE_LABELS = {
  wiper: [['① 結構', 0], ['② 機構', 1], ['③ 機器', 2]],
  gears: [['① 問題', 0], ['② 弧長', 1], ['③ 力矩', 2], ['④ 取捨', 3]],
};
const DEMOS = { gears: [['摩擦輪示範', 10], ['惰輪示範', 11]] };

const style = document.createElement('style');
style.textContent = `
  @font-face { font-family: "WorkshopTC"; src: url("${import.meta.env.BASE_URL}fonts/noto-tc-subset.woff2") format("woff2"); }
  * { margin: 0; box-sizing: border-box; font-family: "WorkshopTC", "Noto Sans TC", system-ui, sans-serif; }
  body { background: #FEFDF5; color: #5A3A28; padding: 16px; font-size: 18px; }
  h1 { font-size: 1.5rem; margin-bottom: 12px; }
  .card { background: #FFFDF2; border: 2px solid #E3D5B8; border-radius: 14px; padding: 16px; margin-bottom: 14px; }
  .row { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
  button { font-size: 1.15rem; padding: 10px 18px; border-radius: 10px; border: 2px solid #C8B795;
           background: #FFF8EC; color: #5A3A28; cursor: pointer; }
  button.primary { background: #C08054; border-color: #C08054; color: #FFF8EC; }
  button.active { background: #75A17B; border-color: #75A17B; color: #FFF8EC; }
  button.danger { background: #B5443C; border-color: #B5443C; color: #FFF8EC; }
  input { font-size: 1.15rem; padding: 10px 12px; border: 2px solid #C8B795; border-radius: 10px;
          background: #FFFDF2; color: #5A3A28; }
  table { width: 100%; border-collapse: collapse; font-size: 1.05rem; }
  th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid #E3D5B8; }
  td.name { cursor: pointer; text-decoration: underline dotted; }
  .dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 6px; }
  .on { background: #75A17B; } .off { background: #C8B795; }
  .badgewall { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 12px; }
  .student { border: 2px solid #E3D5B8; border-radius: 12px; padding: 10px; }
  .student h3 { font-size: 1.1rem; margin-bottom: 6px; }
  .coin { display: inline-block; background: #B8923E; color: #4A3312; border-radius: 50%;
          width: 40px; height: 40px; line-height: 40px; text-align: center; margin: 2px; font-size: 1.05rem; }
  .coin.dim { background: #EAE0C8; color: #BBA87E; }
  label.inline { display: flex; gap: 8px; align-items: center; font-size: 1.05rem; }
  #volume { width: 140px; }
  .hint { color: #8a6a4e; font-size: 0.95rem; }
`;
document.head.appendChild(style);

const app = document.createElement('div');
document.body.appendChild(app);

let ws = null;
let state = null;
let roster = [];
let confirmClear = false;

function login() {
  app.innerHTML = `
    <h1>老師控場</h1>
    <div class="card row">
      <input id="room" placeholder="房間碼" value="${localStorage.getItem('tk-room') || ''}">
      <input id="pin" type="password" placeholder="PIN">
      <button class="primary" id="go">登入</button>
      <span class="hint" id="err"></span>
    </div>`;
  app.querySelector('#go').onclick = connect;
  app.querySelector('#pin').addEventListener('keydown', (e) => { if (e.key === 'Enter') connect(); });
}

function connect() {
  const room = app.querySelector('#room').value.trim().toLowerCase();
  const pin = app.querySelector('#pin').value;
  const err = app.querySelector('#err');
  if (!room || !pin) { err.textContent = '請輸入房間碼與 PIN'; return; }
  localStorage.setItem('tk-room', room);
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  ws = new WebSocket(`${proto}://${location.host}/ws?room=${encodeURIComponent(room)}&role=teacher`);
  ws.onopen = () => ws.send(teacher.hello(pin));
  ws.onmessage = (ev) => {
    const { ok, msg } = decode(ev.data);
    if (!ok) return;
    if (msg.t === 'error') { err.textContent = 'PIN 錯誤'; return; }
    if (msg.t === 'state') { state = msg; render(); }
    if (msg.t === 'roster') { roster = msg.roster; render(); }
    if (msg.t === 'export') downloadCSV(msg.csv);
  };
  ws.onclose = () => {
    if (state) { state = null; login(); }
  };
}

function cmd(partial) { ws?.send(teacher.cmd(partial)); }

function render() {
  if (!state) return;
  const lv = state.level || 'wiper';
  const stages = STAGE_LABELS[lv] || [];
  const demos = DEMOS[lv] || [];
  app.innerHTML = `
    <h1>老師控場 <span class="hint">房間 ${localStorage.getItem('tk-room')} · 在線 ${roster.filter((r) => r.online).length} 人</span></h1>
    <div class="card row" id="modes">
      ${['free', 'follow', 'pause'].map((m) => `
        <button data-mode="${m}" class="${state.mode === m ? 'active' : ''}">
          ${{ free: '自由探索', follow: '全班跟隨', pause: '暫停(請看老師)' }[m]}
        </button>`).join('')}
      <span style="flex:1"></span>
      <button id="recenter">全員重新定位</button>
    </div>
    <div class="card row" id="levels">
      ${ALL_AIDS.map((l) => `
        <button data-level="${l}" class="${lv === l ? 'active' : ''}">${LEVEL_LABELS[l]}</button>`).join('')}
      <span style="width:16px"></span>
      ${stages.map(([s, i]) => `
        <button data-stage="${i}" class="${(state.stage ?? 0) === i ? 'active' : ''}">${s}</button>`).join('')}
      ${demos.map(([name, id]) => `<button data-stage="${id}">${name}</button>`).join('')}
    </div>
    <div class="card row">
      <button id="boardBtn" class="${state.view === 'board' ? 'active' : ''}">全員看黑板</button>
      <button id="benchBtn" class="${state.view !== 'board' ? 'active' : ''}">全員回到工作桌</button>
      <span style="width:16px"></span>
      <button id="advBtn" class="${state.advanced ? 'active' : ''}">進階數學 ${state.advanced ? '開' : '關'}</button>
      <span class="hint">(跟隨模式時全員同步)</span>
      <span style="flex:1"></span>
      <label class="inline">音量
        <input id="volume" type="range" min="0" max="1" step="0.05" value="${state.volume ?? 0.8}">
      </label>
      <button id="muteBtn" class="${state.muted ? 'active' : ''}">${state.muted ? '已靜音' : '靜音'}</button>
    </div>
    <div class="card">
      <div class="row" style="margin-bottom:8px">
        <h2 style="font-size:1.2rem">名冊</h2>
        <span style="flex:1"></span>
        <button id="wallBtn">徽章牆檢視</button>
        <button id="exportBtn">匯出 CSV</button>
        <button id="clearBtn" class="${confirmClear ? 'danger' : ''}">${confirmClear ? '再按一次確認清除!' : '清除資料'}</button>
      </div>
      <table>
        <thead><tr><th>名字</th><th>關卡</th><th>徽章</th><th>狀態</th></tr></thead>
        <tbody>
          ${roster.map((r) => `
            <tr>
              <td class="name" data-cid="${r.clientId}" title="點擊改名">${esc(r.name)}</td>
              <td>${LEVEL_LABELS[r.level] || r.level}</td>
              <td>${r.badges.length} 枚</td>
              <td><span class="dot ${r.online ? 'on' : 'off'}"></span>${r.online ? '在線' : '離線'}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>
    <div class="card" id="wall" style="display:none">
      <h2 style="font-size:1.3rem; margin-bottom:10px">徽章牆(投影用)</h2>
      <div class="badgewall">
        ${roster.map((r) => `
          <div class="student">
            <h3>${esc(r.name)}</h3>
            ${BADGES.map((b) => `
              <span class="coin ${r.badges.includes(b.id) ? '' : 'dim'}" title="${LEVEL_LABELS[b.aid]}・${b.mission}|${b.name}:${b.desc}">${b.icon}</span>`).join('')}
          </div>`).join('')}
      </div>
    </div>`;

  // 事件
  app.querySelectorAll('#modes [data-mode]').forEach((b) => {
    b.onclick = () => cmd({ mode: b.dataset.mode });
  });
  app.querySelector('#recenter').onclick = () => ws?.send(teacher.recenter('all'));
  app.querySelectorAll('[data-level]').forEach((b) => {
    const def = { wiper: 1, gears: 3 }[b.dataset.level] ?? 0;
    b.onclick = () => cmd({ level: b.dataset.level, stage: def });
  });
  app.querySelectorAll('[data-stage]').forEach((b) => {
    b.onclick = () => cmd({ stage: Number(b.dataset.stage) });
  });
  app.querySelector('#boardBtn').onclick = () => cmd({ view: 'board' });
  app.querySelector('#benchBtn').onclick = () => cmd({ view: 'bench' });
  app.querySelector('#advBtn').onclick = () => cmd({ advanced: !state.advanced });
  app.querySelector('#volume').oninput = (e) => cmd({ volume: Number(e.target.value) });
  app.querySelector('#muteBtn').onclick = () => cmd({ muted: !state.muted });
  app.querySelector('#wallBtn').onclick = () => {
    const w = app.querySelector('#wall');
    w.style.display = w.style.display === 'none' ? 'block' : 'none';
  };
  app.querySelector('#exportBtn').onclick = () => ws?.send(teacher.export());
  app.querySelector('#clearBtn').onclick = () => {
    if (confirmClear) {
      ws?.send(teacher.clear());
      confirmClear = false;
    } else {
      confirmClear = true;
      setTimeout(() => { confirmClear = false; render(); }, 4000);
    }
    render();
  };
  app.querySelectorAll('td.name').forEach((td) => {
    td.onclick = () => {
      const name = prompt('新名字(最長 12 字):', td.textContent);
      if (name) ws?.send(teacher.rename(td.dataset.cid, name));
    };
  });
}

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function downloadCSV(csv) {
  const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `workshop-${localStorage.getItem('tk-room')}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

login();
