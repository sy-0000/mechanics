// 3D 啟動:建立教室(唯一的 renderer / scene / 燈光),再接上教具整合層與老師同步。
import * as THREE from 'three';
import { createClassroom } from './scene/classroom/index.js';
import { setupVRButton } from './vrButton.js';
import { createApp } from './app/app.js';
import { createSync } from './net/sync.js';
import { parseDefinitions, DEFAULT_DEFINITIONS } from './teach/boardContent.js';
import { resumeAudio } from './audio/sfx.js';

// 課本定義(使用者提供);檔案不存在或是空的就用場景預設三句
const DEFS = import.meta.glob('/docs/textbook-definitions.md', { query: '?raw', import: 'default', eager: true });
export const textbookDefinitions = parseDefinitions(Object.values(DEFS)[0] ?? '');

export async function boot({ name = '', room = '', clientId, quality, debug = false, aid, advanced = false, view, cam, enterXR = false, perfLog = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  document.body.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.03, 200);
  const classroom = createClassroom({
    renderer, scene, camera,
    options: { quality, debug, leftZone: textbookDefinitions ?? DEFAULT_DEFINITIONS },
  });

  let sync = null;
  const app = createApp({ renderer, scene, camera, classroom, onProgress: () => sync?.sendProgress(app.state.currentId, app.state.stage ?? 0, app.badges()) });
  if (room) {
    sync = createSync({
      room, name, clientId,
      onState: s => app.applyServerState(s),
      onConnChange: online => { offline.style.display = online ? 'none' : 'block'; },
    });
  }
  const offline = document.createElement('div');
  Object.assign(offline.style, { position: 'fixed', left: '50%', top: '10px', transform: 'translateX(-50%)', font: '14px system-ui,sans-serif', color: '#5A4C38', background: 'rgba(254,253,245,0.85)', padding: '4px 12px', borderRadius: '999px', zIndex: 5, display: room ? 'none' : 'none' });
  offline.textContent = '單機模式';
  document.body.appendChild(offline);

  // 主迴圈:教室 update → 教具 update → render(WebXR 相容)
  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.05), now = performance.now() / 1000;
    classroom.update();
    app.update(dt, now);
    classroom.render();
  });
  addEventListener('resize', classroom.onResize); classroom.onResize();
  renderer.domElement.addEventListener('pointerdown', resumeAudio);
  setupVRButton(renderer, document.getElementById('vr'));

  await app.select(aid ?? 'wiper');
  if (advanced) app.setAdvanced(true);
  if (view === 'board') setTimeout(() => classroom.views.goTo('board'), 300);
  if (cam) { const v = cam.split(',').map(Number); setTimeout(() => classroom.debugSetCamera(v.slice(0, 3), v.slice(3, 6)), 200); }
  if (enterXR) {
    try {
      const session = await navigator.xr.requestSession('immersive-vr', { requiredFeatures: ['local-floor'], optionalFeatures: ['hand-tracking'] });
      await renderer.xr.setSession(session);
    } catch (e) { console.warn('VR 進入失敗,改用滑鼠預覽', e); }
  }
  if (perfLog) {
    setInterval(() => {
      const s = classroom.stats?.samples.slice(-10); if (!s?.length) return;
      const avg = k => s.reduce((a, b) => a + b[k], 0) / s.length;
      console.log(`[perf] xr=${renderer.xr.isPresenting} quality=${classroom.quality} aid=${app.state.currentId} fps=${avg('fps').toFixed(1)} calls=${avg('calls').toFixed(0)} tris=${avg('tris').toFixed(0)}`);
    }, 5000);
  }
  // 除錯 / 自動化測試掛鉤
  window.__app = { app, classroom, renderer, scene, camera, THREE };
  return { app, classroom, renderer };
}
