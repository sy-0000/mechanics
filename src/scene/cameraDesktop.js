// 電腦預覽用環繞視角:拖曳旋轉與縮放,限制俯仰 15–70°、方位 ±70°、距離,看不到背面。
import * as THREE from 'three';
import { TABLE_HEIGHT } from './layout.js';

const DEG = Math.PI / 180;

export function createDesktopCamera(dom) {
  const camera = new THREE.PerspectiveCamera(50, 1, 0.05, 40);
  const target = new THREE.Vector3(0, TABLE_HEIGHT + 0.08, 0);

  const state = {
    azimuth: 0,            // 方位(0 = 正前)
    polar: 35 * DEG,       // 俯角(從水平往下算)
    dist: 1.05,
    dragging: false,
    lastX: 0, lastY: 0,
  };
  const LIM = {
    azMin: -70 * DEG, azMax: 70 * DEG,
    poMin: 15 * DEG, poMax: 70 * DEG,
    dMin: 0.45, dMax: 2.2,
  };

  function apply() {
    const { azimuth: az, polar: po, dist } = state;
    camera.position.set(
      target.x + dist * Math.cos(po) * Math.sin(az),
      target.y + dist * Math.sin(po),
      target.z + dist * Math.cos(po) * Math.cos(az),
    );
    camera.lookAt(target);
  }
  apply();

  /** 由互動層呼叫(拖曳空白處) */
  function rotate(dx, dy) {
    state.azimuth = THREE.MathUtils.clamp(state.azimuth - dx * 0.005, LIM.azMin, LIM.azMax);
    state.polar = THREE.MathUtils.clamp(state.polar + dy * 0.005, LIM.poMin, LIM.poMax);
    apply();
  }
  function zoom(delta) {
    state.dist = THREE.MathUtils.clamp(state.dist * (1 + delta * 0.001), LIM.dMin, LIM.dMax);
    apply();
  }
  function resize(w, h) {
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  if (dom) {
    dom.addEventListener('wheel', (e) => { e.preventDefault(); zoom(e.deltaY); }, { passive: false });
  }

  return { camera, rotate, zoom, resize, target, state };
}
