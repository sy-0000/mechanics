import * as THREE from 'three';
import { C } from '../../materials/palette.js';

// 寫實模式只保留很淡的大氣霧(7–30 m),避免室內泛白。窗外物件 fog=false,自帶大氣色。
export const FOG_PRESETS = {
  default: { near: 7, far: 30 },
  bench: { near: 5, far: 24 },      // 電腦工作桌近景:淡淡的大氣透視
  board: { near: 9, far: 34 },      // 黑板視角:幾乎無霧
};
export function createFog(scene) {
  const fog = new THREE.Fog('#CFC8BA', FOG_PRESETS.default.near, FOG_PRESETS.default.far);
  scene.fog = fog; scene.background = new THREE.Color(C.fog);
  let from = { ...FOG_PRESETS.default }, to = from, t0 = 0, dur = 0;
  return {
    fog,
    set(name, duration = 0, now = performance.now() / 1000) {
      from = { near: fog.near, far: fog.far }; to = FOG_PRESETS[name] ?? FOG_PRESETS.default; t0 = now; dur = duration;
      if (!duration) { fog.near = to.near; fog.far = to.far }
    },
    update(now) {
      if (!dur) return;
      const k = Math.min(1, (now - t0) / dur), e = k * k * (3 - 2 * k);
      fog.near = from.near + (to.near - from.near) * e; fog.far = from.far + (to.far - from.far) * e;
      if (k >= 1) dur = 0;
    },
  };
}
