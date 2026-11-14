import * as THREE from 'three';
import { createClassroom } from './scene/classroom/index.js';
import { setupVRButton } from './vrButton.js';

// VR 測試頁:固定 vr 檔位、開啟 debug 數據,並每 5 秒在主控台記錄 FPS / draw call / 三角形數(供 Quest 3 實機記錄)。
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.03, 200);
const classroom = createClassroom({ renderer, scene, camera, options: { quality: 'vr', debug: true } });
classroom.start();
classroom.menu.setItems([{ id: 'test', name: '測試教具' }]);
classroom.menu.onSelect(id => classroom.board.setZone('center', { title: '測試 Test', lines: [{ text: 'F = m a', chalk: 'orange' }, { text: '時間 {t} s', chalk: 'yellow', live: 't' }] }));
setInterval(() => classroom.board.updateValues({ t: Math.round(performance.now() / 1000) }), 1000);
setInterval(() => {
  const s = classroom.stats.samples.slice(-10);
  if (!s.length) return;
  const avg = k => s.reduce((a, b) => a + b[k], 0) / s.length;
  console.log(`[perf] xr=${renderer.xr.isPresenting} fps=${avg('fps').toFixed(1)} calls=${avg('calls').toFixed(0)} tris=${avg('tris').toFixed(0)}`);
}, 5000);
setupVRButton(renderer, document.getElementById('vr'));
window.classroom = classroom;
