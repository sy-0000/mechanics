// 學生端啟動:2D 起始頁(名字、房間碼)→ 3D 工作坊(電腦預覽或 VR)。
import * as THREE from 'three';
import { createLayout, TABLE_HEIGHT } from './scene/layout.js';
import { createDesktopCamera } from './scene/cameraDesktop.js';
import { createInteractionManager } from './scene/interact.js';
import { setupXR } from './scene/xr.js';
import { createSceneManager } from './scene/sceneManager.js';
import { createBlueprint } from './modes/blueprint.js';
import { createBadgeWall } from './teach/badges.js';
import { createMissionTracker } from './teach/missions.js';
import { loadFonts } from './teach/typeset.js';
import { createHaptics } from './audio/haptics.js';
import { resumeAudio, applyAudioState } from './audio/sfx.js';
import { initMetalEnv } from './materials/metal.js';
import { createSync } from './net/sync.js';
import { LEVELS } from './net/protocol.js';

// ───────────────────────── 起始頁(2D,允許文字)─────────────────────────
const params = new URLSearchParams(location.search);
const style = document.createElement('style');
style.textContent = `
  @font-face { font-family: "WorkshopTC"; src: url("${import.meta.env.BASE_URL}fonts/noto-tc-subset.woff2") format("woff2"); }
  * { margin: 0; box-sizing: border-box; }
  body { background: #FEFDF5; color: #5A3A28; font-family: "WorkshopTC", "Noto Sans TC", system-ui, sans-serif; }
  #start { min-height: 100vh; display: flex; flex-direction: column; align-items: center;
           justify-content: center; gap: 1.2rem; padding: 2rem; }
  #start h1 { font-size: 2rem; letter-spacing: 0.1em; }
  #start p.sub { color: #8a6a4e; }
  #start label { display: flex; flex-direction: column; gap: 0.4rem; width: min(320px, 80vw);
                 font-size: 1.05rem; }
  #start input { font-size: 1.3rem; padding: 0.6rem 0.9rem; border: 2px solid #C8B795;
                 border-radius: 10px; background: #FFFDF2; color: #5A3A28; outline: none; }
  #start input:focus { border-color: #C08054; }
  #start button { font-size: 1.35rem; padding: 0.8rem 2.4rem; border: none; border-radius: 12px;
                  background: #C08054; color: #FFF8EC; cursor: pointer; }
  #start button:disabled { background: #D8C3A0; cursor: not-allowed; }
  #start .hint { font-size: 0.95rem; color: #8a6a4e; }
  canvas.gl { position: fixed; inset: 0; width: 100%; height: 100%; display: block; }
  #hud { position: fixed; right: 14px; bottom: 14px; display: flex; gap: 10px; z-index: 5; }
  #hud button { width: 46px; height: 46px; border-radius: 50%; border: 2px solid #C8B795;
                background: #FFFDF2cc; color: #5A3A28; font-size: 1.2rem; cursor: pointer; }
  #debug { position: fixed; left: 10px; top: 10px; font: 12px monospace; color: #5A3A28;
           background: #fffdf2cc; padding: 4px 8px; border-radius: 6px; z-index: 5; white-space: pre; }
  #offline { position: fixed; left: 50%; top: 10px; transform: translateX(-50%); font-size: 0.9rem;
             color: #8a6a4e; background: #fffdf2cc; padding: 4px 12px; border-radius: 999px; z-index: 5; }
`;
document.head.appendChild(style);

const start = document.createElement('div');
start.id = 'start';
start.innerHTML = `
  <h1>機構學微縮工作坊</h1>
  <p class="sub">把一個動作,變成我們想要的動作</p>
  <label>名字(必填)<input id="name" maxlength="12" placeholder="你的名字"></label>
  <label>房間碼<input id="room" placeholder="老師給的房間碼"></label>
  <button id="enter" disabled>進入 VR</button>
  <p class="hint" id="xrhint"></p>
`;
document.body.appendChild(start);

const nameInput = start.querySelector('#name');
const roomInput = start.querySelector('#room');
const enterBtn = start.querySelector('#enter');
const xrHint = start.querySelector('#xrhint');
roomInput.value = params.get('room') || '';
nameInput.value = localStorage.getItem('wk-name') || '';

let xrSupported = false;
if (navigator.xr?.isSessionSupported) {
  navigator.xr.isSessionSupported('immersive-vr').then((ok) => {
    xrSupported = ok;
    refreshEnter();
  }).catch(() => refreshEnter());
} else refreshEnter();

function refreshEnter() {
  enterBtn.textContent = xrSupported ? '進入 VR' : '用滑鼠預覽';
  xrHint.textContent = xrSupported ? '' : '這台裝置不支援 VR,用滑鼠也能完整操作';
  enterBtn.disabled = nameInput.value.trim().length === 0;
}
nameInput.addEventListener('input', refreshEnter);
refreshEnter();

enterBtn.addEventListener('click', async () => {
  const name = nameInput.value.trim();
  if (!name) return;
  localStorage.setItem('wk-name', name);
  resumeAudio();
  enterBtn.disabled = true;
  enterBtn.textContent = '載入中…';
  await boot(name, roomInput.value.trim(), xrSupported);
});

// ───────────────────────── 3D 應用 ─────────────────────────
async function boot(name, room, useXR) {
  await loadFonts();

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping; // 背景須保持 #FEFDF5(§4)
  renderer.domElement.className = 'gl';
  await initMetalEnv(renderer);

  const { scene, baseGroup, tabletop, update: updateLayout, envMeshes } = createLayout();
  const desktop = createDesktopCamera(renderer.domElement);
  desktop.resize(innerWidth, innerHeight);
  const interact = createInteractionManager();
  const haptics = createHaptics(renderer);
  const blueprint = createBlueprint({ scene, tabletop, envMeshes });

  // 徽章牆(左後角)
  const net = { send: null };
  const badges = createBadgeWall({
    haptics,
    onAward: () => reportProgress(),
  });
  badges.group.position.set(-0.33, 0.13, -0.33);
  badges.group.rotation.y = 0.35;
  tabletop.add(badges.group);

  const missions = createMissionTracker({ badges, onComplete: () => reportProgress() });

  // 全域狀態(老師同步)
  const G = {
    mode: 'free', paused: false, playing: true,
    level: 'wiper', stage: 0,
  };

  let activeScroll = null;
  const ctx = {
    tabletop, interact, haptics, badges, missions, blueprint,
    isPaused: () => G.paused || !G.playing,
    canSwitch: () => G.mode === 'free',
    registerScroll: (s) => { activeScroll = s; },
    onScrollChange: () => {},
    onLevelChanged: () => { interact.refresh(tabletop); reportProgress(); },
    fromLevel: null,
  };
  const manager = createSceneManager(ctx);

  // 銘牌 touchable 的行為(自由模式才可切換)
  for (const [id, plaque] of manager.plaques) {
    plaque.traverse((o) => {
      if (o.userData.touchable?.kind === 'level') {
        o.userData.touchable.onTouch = () => {
          if (G.mode !== 'free') return;
          ctx.fromLevel = manager.currentId;
          G.level = id;
          manager.load(id, 0);
        };
      }
    });
  }
  manager.bonusEntry.traverse((o) => {
    if (o.isMesh) {
      o.userData.touchable = {
        kind: 'bonus',
        onTouch: () => {
          if (G.mode !== 'free') return;
          ctx.fromLevel = manager.currentId;
          manager.load('toggleClamp', 0);
        },
      };
    }
  });

  // ── 同步 ──
  const clientId = localStorage.getItem('wk-cid')
    || `c${Math.random().toString(36).slice(2, 10)}`;
  localStorage.setItem('wk-cid', clientId);
  const offlineBadge = document.createElement('div');
  offlineBadge.id = 'offline';
  offlineBadge.textContent = '單機模式';
  offlineBadge.style.display = 'none';
  document.body.appendChild(offlineBadge);

  const sync = room ? createSync({
    room, name, clientId,
    onState: applyServerState,
    onConnChange: (online) => { offlineBadge.style.display = online ? 'none' : 'block'; },
  }) : null;
  if (!room) offlineBadge.style.display = 'block';

  function reportProgress() {
    sync?.sendProgress(manager.currentId || G.level, G.stage, badges.getEarned());
  }

  function applyServerState(s) {
    if (s.t === 'recenter') { xr?.recenter(); return; }
    G.mode = s.mode;
    manager.setFreeMode(G.mode === 'free');
    G.paused = s.mode === 'pause';
    manager.setPaused(G.paused);
    applyAudioState(s.volume ?? 0.8, !!s.muted);
    if (G.mode === 'follow' || G.mode === 'pause') {
      if (s.level && s.level !== manager.currentId) {
        G.level = s.level; G.stage = s.stage ?? 0;
        manager.load(s.level, G.stage);
      } else if (s.stage !== undefined && s.stage !== G.stage) {
        G.stage = s.stage;
        manager.current?.setStage?.(s.stage);
      }
      if (s.blueprint !== undefined && s.blueprint !== blueprint.isOn) blueprint.toggle(s.blueprint);
      if (s.scroll && activeScroll) activeScroll.userData.scroll.applyRemote(s.scroll);
    }
  }

  // ── 全域控制(電腦:角落極簡圖示)──
  const hud = document.createElement('div');
  hud.id = 'hud';
  const playBtn = document.createElement('button');
  playBtn.textContent = '⏸';
  playBtn.title = '播放/暫停';
  playBtn.onclick = () => { togglePlay(); };
  const bpBtn = document.createElement('button');
  bpBtn.textContent = '📐';
  bpBtn.title = '進階數學';
  bpBtn.onclick = () => blueprint.toggle();
  hud.append(playBtn, bpBtn);
  document.body.appendChild(hud);
  function togglePlay() {
    G.playing = !G.playing;
    playBtn.textContent = G.playing ? '⏸' : '▶';
    manager.current?.setPlaying?.(G.playing);
  }

  // ── XR ──
  const xr = setupXR({
    renderer, scene, baseGroup, interact, haptics,
    onPlayPause: togglePlay,
    onBlueprint: () => blueprint.toggle(),
  });

  // ── 滑鼠互動 ──
  const mouse = { down: false, grab: null, lastX: 0, lastY: 0, moved: 0 };
  const rc = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  function setRay(e) {
    ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    rc.setFromCamera(ndc, desktop.camera);
  }
  renderer.domElement.addEventListener('pointerdown', (e) => {
    resumeAudio();
    mouse.down = true; mouse.moved = 0;
    mouse.lastX = e.clientX; mouse.lastY = e.clientY;
    setRay(e);
    const hit = interact.pickByRay(rc.ray.origin, rc.ray.direction);
    if (hit) {
      if (hit.obj.userData.touchable) {
        hit.obj.userData.touchable.onTouch?.(hit.obj);
      } else if (hit.obj.userData.grabbable) {
        mouse.grab = interact.startGrab(hit.obj, hit.point, 'mouse');
        mouse.grab.carryDist = hit.distance;
      }
    }
  });
  renderer.domElement.addEventListener('pointermove', (e) => {
    if (!mouse.down) return;
    const dx = e.clientX - mouse.lastX, dy = e.clientY - mouse.lastY;
    mouse.lastX = e.clientX; mouse.lastY = e.clientY;
    mouse.moved += Math.abs(dx) + Math.abs(dy);
    if (mouse.grab) {
      setRay(e);
      const p = new THREE.Vector3();
      interact.rayToPlanePoint(mouse.grab, rc.ray.origin, rc.ray.direction, p);
      interact.moveGrab(mouse.grab, p);
    } else {
      desktop.rotate(dx, dy); // 拖曳空白處旋轉視角
    }
  });
  addEventListener('pointerup', (e) => {
    if (mouse.grab) {
      setRay(e);
      const p = new THREE.Vector3();
      interact.rayToPlanePoint(mouse.grab, rc.ray.origin, rc.ray.direction, p);
      interact.endGrab(mouse.grab, p);
      mouse.grab = null;
    }
    mouse.down = false;
  });
  addEventListener('resize', () => {
    renderer.setSize(innerWidth, innerHeight);
    desktop.resize(innerWidth, innerHeight);
  });

  // ── debug(?debug=1):小型除錯資訊 + 測試掛鉤,正式畫面不顯示 ──
  let debugEl = null;
  if (params.get('debug') === '1') {
    debugEl = document.createElement('div');
    debugEl.id = 'debug';
    document.body.appendChild(debugEl);
    window.__app = {
      manager, blueprint, G, badges, desktop,
      load: (id, stage) => { ctx.fromLevel = manager.currentId; return manager.load(id, stage); },
      setStage: (i) => { manager.current?.setStage?.(i); },
      openScroll: (page = 0) => activeScroll?.userData.scroll.applyRemote({ open: true, page }),
      renderer,
    };
  }

  // ── 啟動 ──
  start.remove();
  document.body.appendChild(renderer.domElement);
  await manager.load('wiper', 0);
  manager.setFreeMode(true);
  interact.refresh(tabletop);

  if (useXR) {
    try {
      await xr.enterVR();
    } catch (err) {
      console.warn('VR 進入失敗,改用滑鼠預覽', err);
    }
  }

  // ── 主迴圈 ──
  let fps = 0, fpsT = 0, fpsN = 0;
  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const dt = Math.min(0.05, clock.getDelta());
    const inXR = renderer.xr.isPresenting;
    updateLayout(dt, inXR);
    manager.update(dt);
    blueprint.update(dt);
    badges.group.userData.update(dt);
    xr.update(dt);
    renderer.render(scene, desktop.camera); // XR 時 three 會自動改用頭盔相機
    if (debugEl) {
      fpsN++; fpsT += dt;
      if (fpsT >= 0.5) {
        fps = Math.round(fpsN / fpsT); fpsN = 0; fpsT = 0;
        debugEl.textContent = `fps ${fps}\ndraw ${renderer.info.render.calls}\ntri ${renderer.info.render.triangles}`;
      }
    }
  });
}
