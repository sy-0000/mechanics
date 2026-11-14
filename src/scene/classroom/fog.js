import * as THREE from 'three';
import { C } from '../../materials/palette.js';
import { syncOutlineFog } from '../../materials/outline.js';

// 以 THREE.Fog 取代後處理景深的遠景模糊:4 m 起霧、10 m 全霧。窗外物件 fog=false,自帶大氣色。
export const FOG_PRESETS = {
  default: { near: 4, far: 10 },
  bench: { near: 3.0, far: 9.0 },   // 電腦工作桌近景:霧較濃,大氣透視
  board: { near: 5.5, far: 14 },    // 黑板視角:霧變淡
};
export function createFog(scene) {
  const fog = new THREE.Fog(C.fog, FOG_PRESETS.default.near, FOG_PRESETS.default.far);
  scene.fog = fog; scene.background = new THREE.Color(C.fog);
  syncOutlineFog(fog);
  let from = { ...FOG_PRESETS.default }, to = from, t0 = 0, dur = 0;
  return {
    fog,
    set(name, duration = 0, now = performance.now() / 1000) {
      from = { near: fog.near, far: fog.far }; to = FOG_PRESETS[name] ?? FOG_PRESETS.default; t0 = now; dur = duration;
      if (!duration) { fog.near = to.near; fog.far = to.far; syncOutlineFog(fog); }
    },
    update(now) {
      if (!dur) return;
      const k = Math.min(1, (now - t0) / dur), e = k * k * (3 - 2 * k);
      fog.near = from.near + (to.near - from.near) * e; fog.far = from.far + (to.far - from.far) * e;
      syncOutlineFog(fog); if (k >= 1) dur = 0;
    },
  };
}
