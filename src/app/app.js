// 教室 + 教具的整合核心:選單、教具載入 / 卸載、黑板三區、進階數學、任務、老師同步、vr-baked 陰影。
import * as THREE from 'three';
import { getKit, contactShadow, FONT } from '../aids/kit.js';
import { createInteractionManager } from '../interact.js';
import { createInput } from './input.js';
import { createHaptics } from '../audio/haptics.js';
import { sfx, motorStop, applyAudioState } from '../audio/sfx.js';
import { BOARD } from '../teach/boardContent.js';
import { MISSIONS, createMissionTracker } from '../teach/missions.js';
import { ALL_AIDS } from '../net/protocol.js';

export const AIDS = {
  wiper: { name: '雨刷', icon: '刷', load: () => import('../aids/wiper.js') },
  engine: { name: '引擎', icon: '引', load: () => import('../aids/engine.js') },
  gears: { name: '齒輪', icon: '齒', load: () => import('../aids/gears.js') },
  bike: { name: '腳踏車', icon: '車', load: () => import('../aids/bike.js') },
  clock: { name: '時鐘', icon: '鐘', load: () => import('../aids/clock.js') },
  driver: { name: '電動起子', icon: '起', load: () => import('../aids/driver.js') },
  crusher: { name: '壓罐機(彩蛋)', icon: '壓', load: () => import('../aids/crusher.js') },
};
const ADV_ID = '__advanced';

export function createApp({ renderer, scene, camera, classroom, onProgress }) {
  const kit = getKit();
  const interact = createInteractionManager();
  const haptics = createHaptics(renderer);
  const anchor = classroom.anchors.teachingAid;

  const G = { mode: 'free', paused: false, advanced: false, current: null, currentId: null, prevId: null, busy: false, stage: null, viewSeq: 0 };
  const missions = createMissionTracker({ onComplete: (aid, m, key) => onMission(aid, m, key) });

  // 教具互動在暫停時停用
  const input = createInput({ renderer, camera, classroom, interact, haptics, enabled: () => !G.paused });

  // ---------------- 共用 ctx(傳給每個教具) ----------------
  const ctx = {
    kit, sfx, classroom, renderer,
    isPaused: () => G.paused,
    feel: (kind, scale) => haptics.pulse(input.activeHand(), kind, scale),
    feelBoth: (kind, scale) => haptics.pulse('both', kind, scale),
    refreshInteract: () => interact.refresh([anchor, ...eggTargets]),
    missionDone: key => missions.isDone(key),
    get from() { return G.prevId; },
    get advanced() { return G.advanced; },
  };

  // ---------------- 選單 ----------------
  function menuItems() {
    return [
      ...ALL_AIDS.map(id => ({ id, name: AIDS[id].name, icon: AIDS[id].icon })),
      { id: ADV_ID, name: G.advanced ? '進階數學:關閉' : '進階數學:開啟', icon: '∑' },
    ];
  }
  classroom.menu.setItems(menuItems());
  classroom.menu.onSelect(id => {
    if (id === ADV_ID) { if (G.mode === 'free') setAdvanced(!G.advanced); else sfx.limit(); return; }
    if (G.mode !== 'free') { sfx.limit(); return; }  // 跟隨 / 暫停模式由老師決定教具
    select(id);
  });

  // ---------------- 彩蛋入口:教室桌邊的肘節夾鉗與鐵罐 ----------------
  const eggTargets = [classroom.anchors.toggleEgg, ...classroom.anchors.cans].filter(Boolean);
  for (const t of eggTargets) {
    t.traverse(o => { if (o.isMesh) o.userData.touchable = { onTouch: () => { if (G.mode === 'free' && G.currentId !== 'crusher') select('crusher'); } }; });
  }

  // ---------------- 「請看老師」木牌(暫停模式時從桌前升起) ----------------
  const pauseSign = makePauseSign();
  classroom.anchors.teachingAid.parent.add(pauseSign);
  pauseSign.position.set(0, 0.85 - 0.12, -0.6 + 0.47);

  // ---------------- 任務卡(每個教具桌面左前角) ----------------
  let card = null;
  function buildCard(id) {
    const list = MISSIONS[id] ?? [];
    const cell = kit.label(256, 40 + list.length * 46, { rough: 0.85 });
    const draw = () => cell.draw((g, w, h) => {
      g.fillStyle = '#F6F1E4'; g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(80,70,60,0.25)'; g.lineWidth = 2; g.strokeRect(3, 3, w - 6, h - 6);
      g.fillStyle = '#3B3631'; g.font = `26px ${FONT}`; g.textBaseline = 'middle'; g.fillText(`任務・${AIDS[id].name}`, 14, 22);
      list.forEach((m, i) => {
        const y = 62 + i * 46, done = missions.isDone(`${id}:${m.id}`);
        g.strokeStyle = '#3B3631'; g.lineWidth = 2.5; g.strokeRect(14, y - 13, 26, 26);
        if (done) { // 黃銅徽章章印
          g.fillStyle = '#B9A27A'; g.beginPath(); g.arc(27, y, 16, 0, 7); g.fill();
          g.fillStyle = '#5A4C38'; g.font = `20px ${FONT}`; g.textAlign = 'center'; g.fillText(m.badge.icon, 27, y + 1); g.textAlign = 'left';
        }
        g.fillStyle = done ? '#6E675E' : '#3B3631'; g.font = `24px ${FONT}`; g.fillText(m.name, 52, y);
      });
    });
    draw();
    const W = 0.15, H = W * cell.h / cell.w;
    const b = kit.body('missionCard');
    b.add(new THREE.PlaneGeometry(W, H), { rect: cell.rect, color: '#ffffff', keep: 1 });
    b.add(new THREE.BoxGeometry(W + 0.008, H + 0.008, 0.003), { color: '#B9A98C', sw: 'wood', pos: [0, 0, -0.0018], keep: 1 });
    const mesh = b.build({ cast: false });
    mesh.rotation.x = -Math.PI / 2 + 0.25; mesh.position.set(-0.315, 0.012, 0.31); mesh.rotation.z = 0.12;
    return { mesh, draw };
  }

  // ---------------- 教具載入 / 卸載 ----------------
  const shadow = contactShadow(0.7, 0.55);
  anchor.add(shadow);
  async function select(id, { stage } = {}) {
    if (!AIDS[id] || G.busy) return;
    if (G.currentId === id && G.current) { if (stage !== undefined) setStage(stage); return; }
    G.busy = true;
    try {
      const prev = G.currentId;
      unload();
      G.prevId = prev;
      classroom.board.clearZones(['center', 'right']);
      const mod = await AIDS[id].load();
      const aid = await mod.createAid(ctx);
      aid.root.name = `aid:${id}`;
      anchor.add(aid.root);
      card = buildCard(id); aid.root.add(card.mesh);
      G.current = aid; G.currentId = id;
      missions.resetMemory(id);
      setStage(stage ?? aid.defaultStage ?? 0);
      aid.setAdvanced?.(G.advanced);
      // 擦完中右區後寫入新內容(clearZones 的擦拭約 0.32 秒)
      setTimeout(() => {
        if (G.currentId !== id) return;
        lastValues = '';
        pushValues(true);
        classroom.board.setZone('center', BOARD[id].center);
        if (G.advanced) classroom.board.setZone('right', BOARD[id].right);
      }, 350);
      // 彩蛋:教室桌邊的三個空鐵罐「搬」到壓罐機上
      classroom.anchors.cans?.forEach(c => (c.visible = id !== 'crusher'));
      ctx.refreshInteract();
      onProgress?.();
    } finally { G.busy = false; }
  }
  function unload() {
    const aid = G.current; if (!aid) return;
    input.cancelAll();
    aid.dispose?.(); motorStop();
    anchor.remove(aid.root);
    const disposed = new Set();
    aid.root.traverse(o => {
      o.geometry?.dispose();
      for (const m of [o.material].flat().filter(Boolean)) {
        if (m === kit.material || disposed.has(m)) continue;
        disposed.add(m);
        for (const k of ['map', 'alphaMap', 'emissiveMap']) if (m[k] && !m.userData.sharedMap) m[k].dispose();
        m.dispose();
      }
    });
    kit.resetLabels();
    G.current = null; G.currentId = null; card = null;
    restoreShadowCasting();
  }
  function setStage(i) { G.stage = i; G.current?.setStage?.(i); }

  // ---------------- 進階數學 ----------------
  function setAdvanced(on) {
    G.advanced = !!on;
    kit.setBlueprint(G.advanced);
    G.current?.setAdvanced?.(G.advanced);
    if (G.currentId) classroom.board.setAdvanced(G.advanced, BOARD[G.currentId].right);
    classroom.menu.setItems(menuItems());
  }

  // ---------------- 任務完成 ----------------
  const stamps = [];
  function onMission(aid, m, key) {
    sfx.stamp(); ctx.feelBoth('stamp');
    if (aid === G.currentId && card) {
      card.draw();
      // 蓋章動畫:黃銅小圓章從上方落到任務卡
      const b = kit.body('stamp'); b.add(new THREE.CylinderGeometry(0.012, 0.012, 0.004, 24), { color: '#B9A27A', sw: 'steel', keep: 1 });
      const coin = b.build({ cast: false }); card.mesh.parent.add(coin);
      coin.position.copy(card.mesh.position).add(new THREE.Vector3(-0.055, 0.12, 0.0));
      stamps.push({ coin, t: 0, y0: coin.position.y, y1: card.mesh.position.y + 0.01 });
    }
    onProgress?.();
  }

  // ---------------- vr-baked:凍結陰影 + 運動中的接觸陰影 ----------------
  let csActive = false, stillT = 0, saved = null;
  function restoreShadowCasting() {
    if (saved) { saved.forEach((v, o) => (o.castShadow = v)); saved = null; }
    if (csActive) { csActive = false; classroom.refreshShadows(); }
    shadow.visible = false; shadow.material.opacity = 0;
  }
  function updateShadows(dt) {
    if (classroom.quality !== 'vr-baked' || !G.current) { if (csActive || saved) restoreShadowCasting(); return; }
    const moving = !!G.current.moving?.();
    if (moving) {
      stillT = 0;
      if (!csActive) {
        csActive = true; saved = new Map();
        G.current.root.traverse(o => { if (o.isMesh) { saved.set(o, o.castShadow); o.castShadow = false; } });
        classroom.refreshShadows();                 // 凍結的陰影圖先拿掉教具的舊影子,改用接觸陰影
      }
    } else if (csActive && (stillT += dt) > 0.5) {
      restoreShadowCasting();                       // 停止超過 0.5 秒:教具陰影烘回陰影圖(只呼叫一次)
    }
    shadow.visible = csActive || shadow.material.opacity > 0.01;
    shadow.material.opacity = THREE.MathUtils.damp(shadow.material.opacity, csActive ? 0.75 : 0, 10, dt);
  }

  // ---------------- 即時數值(每 0.25 秒檢查,數值沒變就不送;教室每秒最多套用一次) ----------------
  let lastValues = '', valueT = 0;
  function pushValues(force) {
    const v = G.current?.values?.(); if (!v) return;
    const s = JSON.stringify(v);
    if (force || s !== lastValues) { lastValues = s; classroom.board.updateValues(v); }
  }

  // ---------------- 老師同步(伺服器狀態) ----------------
  function applyServerState(s) {
    if (s.t === 'recenter') { classroom.views.goTo(classroom.views.current); return; }
    G.mode = s.mode ?? 'free';
    G.paused = G.mode === 'pause';
    pauseSign.userData.raise(G.paused);
    if (G.paused) { input.cancelAll(); }
    applyAudioState(s.volume ?? 0.8, !!s.muted);
    if (G.mode !== 'free') {
      if (s.level && s.level !== G.currentId) select(s.level, { stage: s.stage });
      else if (s.stage !== undefined && s.stage !== G.stage) setStage(s.stage);
      if (s.advanced !== undefined && !!s.advanced !== G.advanced) setAdvanced(s.advanced);
    }
    if (s.viewSeq !== undefined && s.viewSeq !== G.viewSeq) {
      const first = G.viewSeq === 0 && s.view === 'bench';
      G.viewSeq = s.viewSeq;
      if (!first && (s.view === 'board' || s.view === 'bench')) classroom.views.goTo(s.view);
    }
  }

  // ---------------- 每幀 ----------------
  function update(dt, now) {
    kit.update(dt);
    input.update(now);
    pauseSign.userData.update(dt);
    if (G.current) {
      if (!G.paused) G.current.update(dt);
      missions.feed(G.currentId, G.current.snapshot?.(), dt);
      if ((valueT += dt) >= 0.25) { valueT = 0; pushValues(false); }
    }
    for (let i = stamps.length - 1; i >= 0; i--) {
      const s = stamps[i]; s.t += dt * 2.5;
      const k = Math.min(1, s.t);
      s.coin.position.y = s.y0 + (s.y1 - s.y0) * (k * k);
      if (s.t > 1.6) { s.coin.parent?.remove(s.coin); s.coin.geometry.dispose(); stamps.splice(i, 1); }
    }
    updateShadows(dt);
  }

  return {
    select, setStage, setAdvanced, update, applyServerState, interact, input, kit, missions,
    get state() { return G; },
    get current() { return G.current; },
    badges: () => missions.list(),
  };
}

/** 「請看老師」木牌:暫停模式時從桌前緣升起(場景內物件,不是彈窗,不閃爍)。 */
function makePauseSign() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 160;
  const g = c.getContext('2d');
  const draw = () => {
    g.fillStyle = '#C9B08E'; g.fillRect(0, 0, 512, 160);
    g.fillStyle = 'rgba(90,70,50,0.12)'; for (let y = 0; y < 160; y += 7) g.fillRect(0, y, 512, 2);
    g.fillStyle = '#3B3631'; g.font = `84px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('請看老師', 256, 84);
  };
  draw(); document.fonts?.ready?.then(() => { draw(); tex.needsUpdate = true; });
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.094, 0.012), [
    ...Array(4).fill(new THREE.MeshStandardMaterial({ color: '#B39A78', roughness: 0.8 })),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 }), new THREE.MeshStandardMaterial({ color: '#B39A78', roughness: 0.8 })]);
  m.name = 'pauseSign'; m.visible = false; m.castShadow = true;
  let up = 0, target = 0;
  const base = () => m.userData.baseY ?? (m.userData.baseY = m.position.y);
  m.userData.raise = on => { target = on ? 1 : 0; base(); };
  m.userData.update = dt => {
    up = THREE.MathUtils.damp(up, target, 4, dt);
    m.visible = up > 0.01;
    m.position.y = base() + up * 0.2;
  };
  return m;
}
