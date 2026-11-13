// 左手腕上的兩顆實體小按鈕:「播放/暫停」與「進階數學」。
// 看手腕才淡入(0.3s),不閃爍。由 xr.js 掛在左手/手把空間。
import * as THREE from 'three';
import { createButton } from './button.js';
import { COLORS } from '../../materials/toon.js';

/** 回傳 {group, update(dt, visibleTarget), buttons} */
export function createWristButtons({ onPlayPause, onBlueprint } = {}) {
  const group = new THREE.Group();
  group.name = 'wristButtons';

  const b1 = createButton({ label: '播放', radius: 0.009, color: COLORS.greyBlue, onPress: onPlayPause });
  b1.position.set(-0.012, 0, 0);
  const b2 = createButton({ label: '數學', radius: 0.009, color: '#C9A86A', onPress: onBlueprint });
  b2.position.set(0.012, 0, 0);
  group.add(b1, b2);

  let alpha = 0;
  const mats = [];
  group.traverse((o) => { if (o.material) mats.push(o.material); });
  for (const m of mats) { m.transparent = true; }

  const update = (dt, visibleTarget) => {
    const speed = dt / 0.3;
    alpha += (visibleTarget ? 1 : -1) * speed;
    alpha = Math.min(1, Math.max(0, alpha));
    group.visible = alpha > 0.02;
    for (const m of mats) m.opacity = alpha * (m.userData.baseOpacity ?? 1);
    b1.userData.update(dt);
    b2.userData.update(dt);
  };
  return { group, update, buttons: [b1, b2] };
}
