import * as THREE from 'three';
import { createClassroom } from './scene/classroom/index.js';
import { setupVRButton } from './vrButton.js';

// 電腦預覽頁:建立場景,並示範教具專案如何使用 board / menu / views API(?demo=0 可關閉示範內容)。
const params = new URLSearchParams(location.search);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.03, 200);

const classroom = createClassroom({
  renderer, scene, camera,
  options: {
    debug: params.get('debug') === '1',
    fans: params.get('fans') !== '0',
    quality: ['vr', 'vr-baked'].includes(params.get('quality')) ? params.get('quality') : 'high',
    onSelectTeachingAid: id => demoSelect(id),
  },
});
classroom.start();
setupVRButton(renderer, document.getElementById('vr'));
window.classroom = classroom; window.__scene = scene; // 方便在主控台測試 API

// ---------------- 示範內容(教具專案會取代這段) ----------------
const DEMO = {
  fourBar: {
    center: {
      title: '四連桿機構 Four-bar Linkage',
      lines: [
        { text: '格拉索夫條件:s + l ≤ p + q', chalk: 'white' },
        { text: '曲柄 r_{2} 轉一圈,搖桿 r_{4} 來回擺動', chalk: 'orange' },
        { text: '傳動角 μ = 180° − θ_{3} + θ_{4}', chalk: 'blue' },
        { text: '輸出角速度 ω_{4} = \\frac{r_{2} sin(θ_{3}−θ_{2})}{r_{4} sin(θ_{3}−θ_{4})} ω_{2}', chalk: 'green' },
        { text: '現在:θ_{2} = {theta2}°  ω_{4} = {omega4} rad/s', chalk: 'yellow', live: 'theta2' },
      ],
    },
    right: {
      title: '進階:向量迴路',
      lines: [
        { text: 'r_{2}e^{iθ_2} + r_{3}e^{iθ_3} = r_{1} + r_{4}e^{iθ_4}', chalk: 'white' },
        { text: '對時間微分得速度方程', chalk: 'white' },
        { text: 'K_{1}cosθ_{4} − K_{2}cosθ_{2} + K_{3} = cos(θ_{2}−θ_{4})', chalk: 'blue' },
      ],
    },
  },
  gears: {
    center: {
      title: '齒輪組 Gear Train',
      lines: [
        { text: '轉速比 \\frac{n_{2}}{n_{1}} = \\frac{T_{1}}{T_{2}}', chalk: 'white' },
        { text: '主動輪 T_{1} = 12 齒', chalk: 'orange' },
        { text: '從動輪 T_{2} = 36 齒', chalk: 'green' },
        { text: '現在:n_{1} = {n1} rpm  n_{2} = {n2} rpm', chalk: 'yellow', live: 'n1' },
      ],
    },
  },
};
let current = null, t0 = performance.now();
function demoSelect(id) {
  current = DEMO[id];
  if (!current) return;
  classroom.board.setZone('center', current.center);
  classroom.board.setAdvanced(!!current.right && params.get('advanced') !== '0', current.right);
}
if (params.get('demo') !== '0') {
  classroom.menu.setItems([{ id: 'fourBar', name: '四連桿' }, { id: 'gears', name: '齒輪組' }]);
  demoSelect(params.get('aid') ?? 'fourBar');
  setInterval(() => {
    const t = (performance.now() - t0) / 1000;
    const th = (t * 36) % 360;
    classroom.board.updateValues({ theta2: Math.round(th), omega4: 1.2 * Math.sin(th * Math.PI / 180) + 0.3, n1: 60, n2: 20 });
  }, 250);
  if (params.get('view') === 'board') setTimeout(() => classroom.views.goTo('board'), 300);
  if (params.get('cam')) { const v = params.get('cam').split(',').map(Number); setTimeout(() => classroom.debugSetCamera(v.slice(0, 3), v.slice(3, 6)), 200); }
  if (params.get('menu') === '1') setTimeout(() => classroom.menu.open(), 500);
}
