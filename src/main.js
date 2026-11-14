// 學生端入口:2D 起始頁(名字、房間碼)→ 教室 + 教具(電腦預覽或 VR)。
// 網址參數:?room= 房間碼;?skip=1 略過起始頁(開發 / 截圖用);?aid= 教具;?quality=high|vr|vr-baked;
//          ?advanced=1 進階數學;?view=board;?debug=1 顯示 FPS / draw call / 三角形。
import { boot } from './boot.js';
import { resumeAudio } from './audio/sfx.js';

const params = new URLSearchParams(location.search);
const opts = {
  quality: ['vr', 'vr-baked'].includes(params.get('quality')) ? params.get('quality') : 'high',
  debug: params.get('debug') === '1',
  aid: params.get('aid') ?? undefined,
  advanced: params.get('advanced') === '1',
  view: params.get('view') ?? undefined,
  cam: params.get('cam') ?? undefined,
};
let clientId = null;
try { clientId = localStorage.getItem('wk-cid') || `c${Math.random().toString(36).slice(2, 10)}`; localStorage.setItem('wk-cid', clientId); } catch { clientId = `c${Math.random().toString(36).slice(2, 10)}`; }

if (params.get('skip') === '1') boot({ ...opts, name: 'dev', room: params.get('room') ?? '', clientId });
else startPage();

function startPage() {
  const el = document.createElement('div');
  el.id = 'start';
  el.innerHTML = `
    <h1>機構教室</h1>
    <p class="sub">把一個動作,變成我們想要的動作</p>
    <label>名字(必填)<input id="name" maxlength="12" placeholder="你的名字" autocomplete="off"></label>
    <label>房間碼<input id="room" placeholder="老師給的房間碼(可空白)" autocomplete="off"></label>
    <button id="enter" disabled>進入</button>
    <p class="hint" id="hint"></p>`;
  document.body.appendChild(el);
  const $ = s => el.querySelector(s);
  $('#room').value = params.get('room') || '';
  try { $('#name').value = localStorage.getItem('wk-name') || ''; } catch { /* 無痕模式 */ }
  let xr = false;
  const refresh = () => {
    $('#enter').textContent = xr ? '進入 VR' : '用滑鼠預覽';
    $('#hint').textContent = xr ? '戴上頭盔後,用左手把 Y 鍵(或左手掌心朝上)打開選單' : '這台裝置不支援 VR,用滑鼠也能完整操作;按 Y 打開選單';
    $('#enter').disabled = !$('#name').value.trim();
  };
  navigator.xr?.isSessionSupported?.('immersive-vr').then(ok => { xr = ok; refresh(); }).catch(refresh);
  $('#name').addEventListener('input', refresh); refresh();
  $('#enter').addEventListener('click', async () => {
    const name = $('#name').value.trim(); if (!name) return;
    try { localStorage.setItem('wk-name', name); } catch { /* 無痕模式 */ }
    resumeAudio();
    $('#enter').disabled = true; $('#enter').textContent = '載入中…';
    const room = $('#room').value.trim().toLowerCase();
    el.remove();
    await boot({ ...opts, name, room, clientId, enterXR: xr });
  });
}
